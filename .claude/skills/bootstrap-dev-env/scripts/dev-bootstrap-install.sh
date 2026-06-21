#!/usr/bin/env bash
# dev-bootstrap-install.sh
#
# root所有・rootグループのみ書き込み可（例: chown root:root, chmod 755）で
# /usr/local/sbin/dev-bootstrap-install.sh に配置することを前提としたスクリプト。
# 一般ユーザーから書き込めない場所に置くことで、sudoers で個々のサブコマンドだけを
# NOPASSWD 許可しても「スクリプトを書き換えてrootで何でも実行する」という迂回が
# できないようにしている。これが本スクリプトの安全性の前提なので、配置場所と
# 所有者・パーミッションは絶対に変更しないこと。
#
# 呼び出し方法（すべて sudo 経由、サブコマンドに追加引数は取らない）:
#   sudo /usr/local/sbin/dev-bootstrap-install.sh apt-bootstrap
#   sudo /usr/local/sbin/dev-bootstrap-install.sh install-gh
#   sudo /usr/local/sbin/dev-bootstrap-install.sh install-docker
#   sudo /usr/local/sbin/dev-bootstrap-install.sh playwright-deps
#
# playwright-deps は対象プロジェクトのパスを引数として受け取らない。
# 引数経由でパスを渡せるようにすると「このスクリプトが許可されたサブコマンド以外の
# 任意のパスに対してrootで処理を行える」という抜け道になるため、下の PROJECT_DIR を
# 配置時に直接書き換えて固定する運用にしている。

set -euo pipefail

# ここをこのマシンでの実際のプロジェクトパスに書き換えてから配置すること。
PROJECT_DIR="/home/CHANGE_ME/src/in-the-search"

ACTION="${1:-}"

INVOKING_USER="${SUDO_USER:-}"
if [ -z "${INVOKING_USER}" ]; then
  echo "error: このスクリプトは sudo 経由で実行してください（SUDO_USER が必要）" >&2
  exit 1
fi

USER_HOME=$(getent passwd "${INVOKING_USER}" | cut -d: -f6)
if [ -z "${USER_HOME}" ] || [ ! -d "${USER_HOME}" ]; then
  echo "error: ${INVOKING_USER} のホームディレクトリを特定できません" >&2
  exit 1
fi

apt_bootstrap() {
  apt-get update
  apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    build-essential \
    git
}

install_gh() {
  if command -v gh >/dev/null 2>&1; then
    echo "gh はすでに導入済みです: $(gh --version | head -n1)"
    return 0
  fi
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    -o /etc/apt/keyrings/githubcli-archive-keyring.gpg
  chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
  ARCH="$(dpkg --print-architecture)"
  echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    > /etc/apt/sources.list.d/github-cli.list
  apt-get update
  apt-get install -y gh
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    echo "docker はすでに導入済みです: $(docker --version)"
  else
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    ARCH="$(dpkg --print-architecture)"
    CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME}")"
    echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable" \
      > /etc/apt/sources.list.d/docker.list
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  fi

  usermod -aG docker "${INVOKING_USER}"

  if [ -d /run/systemd/system ]; then
    systemctl enable --now docker
  else
    # WSLでsystemdが無効な場合のフォールバック。再起動すると毎回必要になるため、
    # SKILL.md側で /etc/wsl.conf による systemd 有効化をユーザーへ案内する。
    service docker start || (dockerd > /var/log/dockerd-wsl.log 2>&1 &)
  fi

  echo "docker グループへの追加が反映されるのは次回ログイン以降です。"
}

playwright_deps() {
  if [ ! -d "${PROJECT_DIR}" ]; then
    echo "error: PROJECT_DIR (${PROJECT_DIR}) が存在しません。スクリプト先頭の設定を確認してください。" >&2
    exit 1
  fi
  NODE_BIN_DIR=$(sudo -u "${INVOKING_USER}" -H bash -lc '
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    command -v node >/dev/null 2>&1 && dirname "$(command -v node)"
  ')
  if [ -z "${NODE_BIN_DIR}" ]; then
    echo "error: 招待ユーザーの nvm/node が見つかりません。先に install_node_nvm.sh を実行してください。" >&2
    exit 1
  fi
  PATH="${NODE_BIN_DIR}:${PATH}" "${NODE_BIN_DIR}/npx" --prefix "${PROJECT_DIR}" playwright install-deps
}

case "${ACTION}" in
  apt-bootstrap)
    apt_bootstrap
    ;;
  install-gh)
    install_gh
    ;;
  install-docker)
    install_docker
    ;;
  playwright-deps)
    playwright_deps
    ;;
  *)
    echo "usage: $0 {apt-bootstrap|install-gh|install-docker|playwright-deps}" >&2
    exit 1
    ;;
esac
