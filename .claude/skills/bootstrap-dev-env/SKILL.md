---
name: bootstrap-dev-env
description: 何もツールが入っていない新しいUbuntu 24.04環境（特にWSL）に、in-the-searchプロジェクトの開発に必要なgit・GitHub CLI(gh)・Docker・Node.js(nvm経由)・Playwrightのブラウザ依存ライブラリを導入し、npm run lint/test/build/e2eが通る状態まで持っていく。「このマシンに開発環境を整えて」「新しいVM/WSLディストリビューションをセットアップして」「まっさらなUbuntuに必要なツールを入れて」「Dockerやghが入っていないので導入して」「Playwrightの依存が足りないので入れて」のような依頼で必ず使うこと。sudoが必要なapt操作は、root所有のラッパースクリプトに対する最小権限のsudoers設定をユーザーに一度だけ依頼する設計になっているため、その手順も必ずこのスキルの指示に従うこと。
---

# 開発環境ブートストラップ

## 解決する問題

このプロジェクトのソースコードしかない新しいLinux（Ubuntu 24.04 / WSL想定）に、開発・テスト・E2Eに必要なツール一式を導入する。コーディングエージェント（Claude Code等）自体は導入済みという前提に立ち、その先の git / gh / Docker / Node.js / Playwright 周りを整える。

## 設計方針（なぜこうなっているか）

apt経由のパッケージインストールにはsudoが要るが、エージェントに無制限のsudo権限を渡すのは過大であり、毎回ユーザーにパスワード入力を頼むのも煩雑。そこで、固定の4操作（`apt-bootstrap` / `install-gh` / `install-docker` / `playwright-deps`）だけを行うroot所有・ユーザー書き込み不可のラッパースクリプト `scripts/dev-bootstrap-install.sh` を用意し、そのスクリプトの各サブコマンドだけをNOPASSWDで許可するsudoers設定を、ユーザーに一度だけ設定してもらう。これにより以後は確認なしで安全に進められる。

Node.jsはnvmでユーザー権限導入する（`scripts/install_node_nvm.sh`、sudo不要）。Node自体をaptで入れないことで、sudoが必要な範囲を最小化している。

## 全体の流れ

1. `scripts/detect_env.sh` で現状確認
2. （未設定の場合のみ）sudoers初期セットアップをユーザーに依頼
3. apt系ツール導入（git, gh, Docker）
4. Node.js導入（nvm、sudo不要）
5. プロジェクト依存関係とPlaywright導入
6. GitHub認証（ユーザー本人のみ）
7. 検証（lint/test/build/e2e）
8. 結果をチェックリストで報告

## Step 1: 状態確認

```
bash .claude/skills/bootstrap-dev-env/scripts/detect_env.sh
```

読み取り専用で何も変更しない。出力の `[MISS]` を見て、以降どのステップが必要かを判断する。全部 `[OK]` なら何もせず完了報告でよい。

## Step 2: sudoers初期セットアップ（未設定の場合のみ、ユーザー対応が必須）

`detect_env.sh` で `dev-bootstrap-install.sh が未配置` または sudoersの4行のいずれかが `[MISS]` だった場合、これはエージェント自身では完結できない（root所有ファイルの配置や `/etc/sudoers.d/` への書き込みにはroot権限が要るため）。ユーザーに次を依頼する。

1. `scripts/dev-bootstrap-install.sh` 冒頭の `PROJECT_DIR` を、このマシン上での実際のプロジェクトパスに書き換えてもらう（ズレていると `playwright-deps` サブコマンドだけ失敗する）。
2. `assets/sudoers-dev-bootstrap.template` の冒頭コメントをそのまま見せて、このsudoers設定が許可する範囲（4つの固定操作のみで `sudo bash` のような汎用root shellではないこと）と、apt経由のパッケージ管理自体が本質的に強い権限であることの両方を説明する。納得を得てから次に進む。
3. 以下をユーザー自身に `!` プレフィックス（このセッションでユーザーが直接実行する操作）で実行してもらう。パスワード入力が必要なのはこの一度だけ。

   ```
   sudo install -o root -g root -m 0755 .claude/skills/bootstrap-dev-env/scripts/dev-bootstrap-install.sh /usr/local/sbin/dev-bootstrap-install.sh
   sed "s/__USERNAME__/$(whoami)/g" .claude/skills/bootstrap-dev-env/assets/sudoers-dev-bootstrap.template | sudo visudo -cf -
   sed "s/__USERNAME__/$(whoami)/g" .claude/skills/bootstrap-dev-env/assets/sudoers-dev-bootstrap.template | sudo tee /etc/sudoers.d/dev-bootstrap-install >/dev/null
   sudo chmod 440 /etc/sudoers.d/dev-bootstrap-install
   ```

   2行目の `visudo -cf -` は構文チェックのみで実際には書き込まない。これが通らない場合は3行目以降を実行しない。

ユーザーが「sudoersは設定したくない、毎回パスワードを入力する」を選んだ場合は、Step 3のコマンドを `/usr/local/sbin/dev-bootstrap-install.sh` 経由にせず、内容を見ながら直接 `sudo apt-get install ...` 等を `!` 付きでユーザーに打ってもらう形に切り替えて構わない。どちらの方式を採るかはユーザーの判断であり、エージェントが無断で決めない。

## Step 3: apt系ツール導入

sudoers設定済みなら、エージェントが直接（パスワード入力なしで通るはず）：

```
sudo /usr/local/sbin/dev-bootstrap-install.sh apt-bootstrap
sudo /usr/local/sbin/dev-bootstrap-install.sh install-gh
sudo /usr/local/sbin/dev-bootstrap-install.sh install-docker
```

`install-docker` はDocker Engine + Compose pluginを導入し、実行ユーザーを `docker` グループに追加する。グループ追加はそのログインセッションには反映されないため、ユーザーに再ログイン（WSLなら `wsl --shutdown` 後の再起動、もしくは `newgrp docker`）が必要な旨を報告に含める。

WSLでsystemdが無効な場合、`dev-bootstrap-install.sh` は `service docker start` にフォールバックするが、再起動ごとに手動起動が必要になる。`detect_env.sh` が「systemd 未稼働」を報告した場合は、`/etc/wsl.conf` に `[boot]\nsystemd=true` を追記して `wsl --shutdown` する方法（Windows側操作が必要、エージェントは代行できない）をユーザーに案内する。

## Step 4: Node.js導入（sudo不要）

```
bash .claude/skills/bootstrap-dev-env/scripts/install_node_nvm.sh
```

nvm経由でNode.js LTSを導入する。再実行しても安全（既に導入済みなら何もしない）。

## Step 5: プロジェクト依存関係とPlaywright

```
source ~/.nvm/nvm.sh
npm ci --prefix <PROJECT_DIR>
sudo /usr/local/sbin/dev-bootstrap-install.sh playwright-deps
npx --prefix <PROJECT_DIR> playwright install
```

ブラウザ本体のダウンロード（`playwright install`）はsudo不要、システムライブラリ導入（`install-deps`相当）だけがsudoを要する。両者を分けているのは、sudoers側を素の `apt-get` 全許可に広げずに、playwright-deps という固定操作だけで済ませるため。

## Step 6: GitHub認証（ユーザー本人のみ）

`gh auth login` はブラウザでのデバイス認証フローが必要で、エージェントは代行できない。`detect_env.sh` が未認証を報告した場合、ユーザーに `! gh auth login` の実行を促す。

## Step 7: 検証

```
npm run lint --prefix <PROJECT_DIR>
npm run test --prefix <PROJECT_DIR>
npm run build --prefix <PROJECT_DIR>
npm run e2e --prefix <PROJECT_DIR>
```

失敗した場合、「ツール不足が原因」か「プロジェクトコード側の問題」かを切り分けて報告する。本スキルの責任範囲は環境を整えることであり、テスト失敗そのものの修正は別タスクとして扱う。

## Step 8: 結果報告

チェックリスト形式で、完了したこと・ユーザー対応待ちのこと（`gh auth login`、dockerグループ反映のための再ログイン、WSLのsystemd有効化など）を明示して終える。

## 早期停止が必要な場合

- `detect_env.sh` が Ubuntu以外、または24.04以外を検出した場合、パッケージ名やリポジトリURLが変わる可能性があるため、無理に進めずユーザーに確認する
- `PROJECT_DIR` が `dev-bootstrap-install.sh` 内の設定と一致しない場合、`playwright-deps` だけが失敗するはずなので、エラーメッセージをそのまま見せてユーザーに編集を依頼する
- このスキルが想定する4操作以外に新たなsudo操作が必要になった場合（新しい依存ツールの追加等）、`dev-bootstrap-install.sh` と `sudoers-dev-bootstrap.template` の両方をユーザー確認の上で更新する。黙って `NOPASSWD: ALL` のような広い権限に変更しない
