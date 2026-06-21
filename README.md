# In the Search

Webブラウザで動く、六角形タイルマップのターン制探索ゲームです。プレイヤーは未知の惑星を探索し、敵を避けながらゴールの宇宙船を目指します。MVPでは資源採取と探索用ロボット `scout` の建造もできます。

## 起動

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:5173/` を開きます。

シードを固定する場合:

```text
http://localhost:5173/?seed=20260621
```

## 操作

- クリック: 選択中ユニットを隣接hexへ移動、または隣接敵/巣を攻撃
- 自ユニットをクリック: 操作対象を選択
- 矢印キー: 選択中ユニットを隣接方向へ移動/攻撃
- `Tab`: 自ユニット切替
- `G`: 選択中ユニットで資源採取
- `B`: pod上のプレイヤー本体から `scout` を建造
- `U`: プレイヤー相内の直前操作をUndo
- `E`: ターン終了

## Docker Compose

開発サーバ:

```bash
docker compose --profile dev up --build dev
```

本番相当の静的配信:

```bash
docker compose --profile web up --build web
```

- dev: `http://localhost:5173/`
- web: `http://localhost:8080/`

## テスト

```bash
npm run format:check
npm run lint
npm run build
npm run test
npm run test:cov
npm run e2e
```

`npm run e2e` は Playwright の webServer 起動込みのため、環境によって1〜3分程度かかります。
