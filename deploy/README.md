# Docker Compose / Apache 配信確認

## 開発サーバ

Vite の開発サーバを Docker Compose 上で起動する。
すべてのサービスが Compose profiles 配下にあるため、`--profile dev` または `--profile web` を必ず指定する。

```sh
docker compose --profile dev up --build dev
```

ブラウザでは `http://localhost:5173/` を開く。初回起動時はコンテナ内の named volume に `npm ci` を実行する。

手動検証では以下を確認する。

- 初期画面が表示され、ブラウザの開発者ツール Network で JS/CSS が 404 になっていない。
- `src/` 配下の表示テキストまたはスタイルを一時変更し、ブラウザの手動リロードなしで反映される（HMR確認）。
- 変更を戻して再度反映される。

## 本番相当の静的配信

`Dockerfile` の build stage で `npm run build` を実行し、生成した `dist/` を `httpd:2.4` の docroot
(`/usr/local/apache2/htdocs/`) から配信する。

```sh
docker compose --profile web up --build web
```

ブラウザでは `http://localhost:8080/` を開く。
Compose の `web` は公式 `httpd:2.4` の既定設定で `dist/` を配信する簡易的な本番相当確認であり、
`apache-static.example.conf` はデプロイ先Apache向けの設定例として別に扱う。

手動検証では以下を確認する。

- 初期画面が表示され、ブラウザの開発者ツール Network で JS/CSS が 404 になっていない。
- ページをリロードしても同じ画面が表示される。
- `?seed=manual-web-check` など任意の固定seedで起動し、ロボットの移動・ターン進行・HUD更新を最低数ターン確認する。
- 可能な範囲でゴール到達または敗北まで通し、終了状態の表示を確認する。

## Apache 配置時の注意

- 現時点のアプリはクライアントルーティングを持たないため、任意URLを `index.html` に戻す SPA fallback は不要。
- `vite.config.ts` の `base` は `./`。サブパス配信に移す場合は、配信先パスと `base` の整合を確認する。
- `httpd:2.4` 公式イメージでは `mod_rewrite` は既定で有効化されていない。将来 SPA fallback や `.htaccess`
  を使う場合は、`mod_rewrite` の有効化と `AllowOverride` の設定を明示する。

## Apache 設定例

単純な静的配信では公式イメージの既定設定で足りる。専用 VirtualHost を置く場合の最小例は
`apache-static.example.conf` を参照する。

Ubuntu + Apache へ配置する場合の流れは以下。

```sh
npm ci
npm run build
sudo mkdir -p /var/www/in-the-search
sudo rsync -a --delete dist/ /var/www/in-the-search/
sudo cp deploy/apache-static.example.conf /etc/apache2/sites-available/in-the-search.conf
sudo a2ensite in-the-search.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

`DocumentRoot` を変更する場合は、`apache-static.example.conf` 内の `DocumentRoot` と `<Directory>` を同じパスへ更新する。
サブパス配信にする場合は、ビルド前に `vite.config.ts` の `base` と公開URLを合わせる。
