# 20260621_009 Phase 7 Docker Compose 前倒し実装 作業記録

- 実施日時: 2026-06-21
- 使用モデル: GPT-5 Codex

## 指示

Phase 7 の Docker Compose 関連タスクを実施し、手動検証を Docker 環境上で出来るところまで実装する。
サブエージェントでのセルフレビューとその反映も含める。

## 実施内容

- `Dockerfile` を追加。
  - Node 20 build stage で `npm ci` と `npm run build` を実行。
  - `httpd:2.4` stage に `dist/` をコピーして配信。
- `docker-compose.yml` を追加。
  - `dev` profile: `node:20-bookworm-slim` で Vite dev server を `0.0.0.0:5173` 起動。
  - `web` profile: Dockerfile の `web` target を build し、Apache を `localhost:8080` で公開。
- `.dockerignore` を追加。
- `deploy/README.md` を追加。
  - dev/web の起動手順。
  - HMR・静的配信・固定seedでの手動確認観点。
  - SPA fallback 不要、`mod_rewrite` 既定無効、`base` と公開パス整合の注意。
  - Ubuntu + Apache への配置手順。
- `deploy/apache-static.example.conf` を追加。
- `todos.md` の Phase 7 を更新。

## 検証

- `docker compose --profile dev config`: 成功。
- `docker compose --profile web config`: 成功。
- `npm run build`: 成功。
- `npm test`: 成功。15 files / 79 tests passed。

## Docker 実起動について

`docker compose --profile web up --build -d web` は以下の理由で未完了。

```text
permission denied while trying to connect to the docker API at unix:///var/run/docker.sock
```

確認した環境状態:

- `docker --version`: Docker version 29.6.0
- `docker compose version`: Docker Compose version v5.1.4
- `/var/run/docker.sock`: `root:docker` の `srw-rw----`
- 現在ユーザー `dmiya` は `docker` group 未所属
- `sudo -n docker compose ...` は password required で実行不可

そのため Docker 環境上でのブラウザ手動検証は、ユーザーを `docker` group に追加する等の権限調整後に実施する必要がある。

## 追加検証（権限調整後）

ユーザーから「Phase 7 の途中で docker の権限不足で一部コマンドが実行できなかった」と共有を受けた後、同日中に Docker API への接続が可能になっていたため、実起動確認を再実施した。

- `docker ps`: 成功。
- `docker compose --profile web up --build -d web`: 成功。
  - Dockerfile の multi-stage build 内で `npm ci` と `npm run build` が成功。
  - `http://localhost:8080/`: HTTP 200。
  - `http://localhost:8080/?seed=manual-web-check`: HTTP 200。固定 seed 付き URL でも `index.html` を取得できることを確認。
  - `http://localhost:8080/assets/index-*.js`: HTTP 200。ビルド済み JS アセットが配信されることを確認。
  - 確認後 `docker compose --profile web down` で停止。
- `docker compose --profile dev up --build -d dev`: 成功。
  - 初回起動で named volume `node_modules` を作成し、コンテナ内 `npm ci` が成功。
  - Vite dev server が `0.0.0.0:5173` で起動。
  - `http://localhost:5173/`: HTTP 200。
  - `http://localhost:5173/?seed=manual-dev-check`: HTTP 200。
  - `http://localhost:5173/src/main.ts`: HTTP 200。
  - `http://localhost:5173/@vite/client`: GET で HMR クライアント実体を取得できることを確認。
  - 確認後 `docker compose --profile dev down` で停止。

備考:

- Apache 起動ログに `ServerName` 未設定の `AH00558` 警告が出るが、公式 `httpd:2.4` 既定設定での通常警告であり、今回の静的配信確認には影響なし。
- `npm ci` で既存依存に対する audit 警告（5 vulnerabilities）が出る。今回の Compose 起動確認とは別論点として扱う。
- ブラウザでファイルを一時変更しての HMR 目視確認、および Docker `web` 上での手動通しプレイは未実施。HTTP レベルの dev/web 起動確認は完了。

## サブエージェントセルフレビュー

レビュー専任のサブエージェントを起動し、今回追加した Docker Compose 関連ファイルを確認した。

主な指摘:

- `web` の手動検証手順が具体性不足。
- `dev` の HMR 確認手順が不足。
- Apache 配置手順が不足。
- Compose `web` は公式 httpd 既定設定で、設定例はコンテナに反映していないことを明記した方がよい。
- 全サービスが profile 配下なので `--profile` 必須であることを明記した方がよい。

反映:

- `deploy/README.md` に上記の手順・注意を追記した。

## 残作業

- Phase 4 残タスクまたは Phase 6 E2E として、ブラウザ上での手動 MVP ループ確認を実施する。
- 必要に応じて、`deploy/README.md` の HMR 目視確認手順に沿って一時的な表示変更で HMR を確認する。
