#!/usr/bin/env bash
# install_node_nvm.sh
# sudoを一切使わず、ユーザー権限でnvmとNode.js LTSを導入する。
# 既に導入済みなら何もしない（再実行安全）。

set -euo pipefail

NVM_VERSION="v0.40.1"
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

if [ -s "${NVM_DIR}/nvm.sh" ]; then
  echo "nvm はすでに ${NVM_DIR} に導入済みです"
else
  echo "nvm ${NVM_VERSION} を導入します"
  curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
fi

# shellcheck disable=SC1090
\. "${NVM_DIR}/nvm.sh"

if command -v node >/dev/null 2>&1; then
  echo "node はすでに導入済みです: $(node --version)"
else
  echo "Node.js LTS を導入します"
  nvm install --lts
  nvm alias default 'lts/*'
fi

echo "node: $(node --version)"
echo "npm:  $(npm --version)"
echo
echo "新しいシェルでも自動的にnvm/nodeを使えるようにするには、 ~/.bashrc に以下が"
echo "含まれていることを確認してください（nvmインストーラが通常自動追記します）:"
echo '  export NVM_DIR="$HOME/.nvm"'
echo '  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"'
