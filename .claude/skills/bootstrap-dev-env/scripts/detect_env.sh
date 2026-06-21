#!/usr/bin/env bash
# detect_env.sh
# 現在のマシンの状態を一覧で出力するだけの読み取り専用スクリプト。
# 何かをインストール・変更することはしない。

set -uo pipefail

section() { printf '\n## %s\n' "$1"; }
ok()   { printf '  [OK]   %s\n' "$1"; }
miss() { printf '  [MISS] %s\n' "$1"; }
info() { printf '  [INFO] %s\n' "$1"; }

section "OS"
if [ -r /etc/os-release ]; then
  . /etc/os-release
  info "NAME=${NAME:-?} VERSION=${VERSION_ID:-?}"
  if [ "${VERSION_ID:-}" != "24.04" ]; then
    info "想定は Ubuntu 24.04 だが ${VERSION_ID:-不明} を検出。手順が一部合わない可能性あり"
  fi
else
  miss "/etc/os-release が読めない（Ubuntu以外の可能性）"
fi

if grep -qi microsoft /proc/version 2>/dev/null || [ -n "${WSL_DISTRO_NAME:-}" ]; then
  info "WSL環境を検出 (WSL_DISTRO_NAME=${WSL_DISTRO_NAME:-unknown})"
  IS_WSL=1
else
  IS_WSL=0
fi

if [ -d /run/systemd/system ]; then
  ok "systemd 稼働中"
else
  miss "systemd 未稼働（WSLなら /etc/wsl.conf で systemd=true を有効化して wsl --shutdown するとサービス管理が安定する）"
fi

section "ユーザー権限ブートストラップ（sudoers）"
HELPER=/usr/local/sbin/dev-bootstrap-install.sh
if [ -x "${HELPER}" ]; then
  OWNER=$(stat -c '%U:%G %a' "${HELPER}" 2>/dev/null || echo "?")
  ok "${HELPER} が存在 (owner/mode: ${OWNER})"
  case "${OWNER}" in
    root:root\ 7[0-7]5) ok "root所有・想定パーミッション" ;;
    *) miss "owner/modeが想定(root:root 755)と異なる。書き込み権限を確認すること" ;;
  esac
else
  miss "${HELPER} が未配置（初回セットアップが必要）"
fi

for sub in apt-bootstrap install-gh install-docker playwright-deps; do
  if sudo -n -l "${HELPER}" "${sub}" >/dev/null 2>&1; then
    ok "sudoers: ${sub} はパスワード無しで許可されている"
  else
    miss "sudoers: ${sub} はまだ許可されていない（visudoでの設定が必要）"
  fi
done

section "コマンドの有無"
for cmd in git gh docker curl; do
  if command -v "${cmd}" >/dev/null 2>&1; then
    ok "${cmd}: $(${cmd} --version 2>&1 | head -n1)"
  else
    miss "${cmd} が見つからない"
  fi
done

if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    ok "docker compose plugin: $(docker compose version 2>&1 | head -n1)"
  else
    miss "docker compose plugin が見つからない"
  fi
  if groups "$(whoami)" | grep -qw docker; then
    ok "現在のユーザーは docker グループに所属"
  else
    miss "現在のユーザーは docker グループに未所属（sudoなしでdockerを使うには再ログインが必要な場合あり）"
  fi
fi

section "Node.js / nvm"
if [ -s "${HOME}/.nvm/nvm.sh" ]; then
  ok "nvm 導入済み (${HOME}/.nvm)"
  # shellcheck disable=SC1091
  source "${HOME}/.nvm/nvm.sh" >/dev/null 2>&1
  if command -v node >/dev/null 2>&1; then
    ok "node: $(node --version), npm: $(npm --version)"
  else
    miss "nvmはあるがnodeが導入されていない"
  fi
else
  miss "nvm 未導入"
fi

section "GitHub CLI 認証"
if command -v gh >/dev/null 2>&1; then
  if gh auth status >/dev/null 2>&1; then
    ok "gh auth 済み"
  else
    miss "gh auth 未済（対話操作が必要、エージェントは代行できない）"
  fi
fi

section "プロジェクト依存関係"
PROJECT_DIR="$(cd "$(dirname "$0")/../../../.." && pwd)"
info "PROJECT_DIR=${PROJECT_DIR}"
if [ -d "${PROJECT_DIR}/node_modules" ]; then
  ok "node_modules が存在"
else
  miss "node_modules が無い（npm ci が必要）"
fi
if [ -d "${PROJECT_DIR}/node_modules/.bin" ] && command -v node >/dev/null 2>&1; then
  if [ -d "${HOME}/.cache/ms-playwright" ] && find "${HOME}/.cache/ms-playwright" -mindepth 1 -maxdepth 1 2>/dev/null | grep -q .; then
    ok "Playwrightブラウザ導入済みの形跡あり (${HOME}/.cache/ms-playwright)"
  else
    miss "Playwrightブラウザ/依存ライブラリが未導入の可能性（npx playwright install --with-deps相当が必要）"
  fi
fi
