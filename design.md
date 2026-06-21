# 設計: 最初のプレイアブルデモ (MVP)

本ドキュメントは「最初のプレイアブルデモ」を実装するためのソフトウェア設計を示す。
ソースコード未着手の現時点における**目標設計**であり、実装の進行に合わせて
ソースコードと突き合わせて更新する（AGENTS.md の design フェーズの成果物）。

関連: `docs/story.md`（世界観）/ `docs/system.md`（技術要求）/ **`docs/rule.md`（ルールの正典）** /
`tbd.md`（未決のゲームデザイン論点）/ `decisions.md`（確定したアーキテクチャ決定）/ `todos.md`（作業リスト）。

> ゲーム仕様（勝敗・ターン進行・移動・戦闘・資源/建造のルール）の一次定義は **`docs/rule.md`** にある。
> 本ドキュメントはそれを実装に落とす設計を示し、ルールと設計が食い違う場合はゲーム仕様として rule.md を優先する。

---

## 1. 目的とスコープ

### 1.1 このデモで達成したいこと

- ゲームの骨子（六角マップを探索し、敵を凌ぎながらゴール＝宇宙船を目指す）を**最小限**満たす、
  ローカル（Docker Compose）で遊べるWebアプリケーションを成立させる。
- クリーンアーキテクチャ（ゲームロジック＝サービス層とUIの分離）を最初から骨格として確立し、
  以降のゲームデザイン拡張がUIに引きずられないようにする。
- 将来のゲームデザインで決めるべき要素を実装を通じて洗い出し、`tbd.md` に集約する。

### 1.2 MVPに**含める**最小ループ

1. 六角タイルマップ（pointy-top）の生成。一部は霧（未探索）で隠れている。
2. プレイヤー（脱出ポッド／プレイヤー本体）がターン制でマップを移動する。
3. 移動に伴い視界内の霧が晴れ、マップが少しずつ判明する。
4. マップ上に敵・敵の巣・ゴール（宇宙船）が存在する。
5. 敵タイルへは移動できず、隣接した敵を「攻撃」して戦闘が発生する。敵相では敵が隣接自ユニットを攻撃する。
6. **勝利条件**: ゴール（宇宙船）タイルに到達する。**敗北条件**: プレイヤー本体のHPが0になる（rule.md §4.1 の優先順位に従う）。
7. ロボットの最小スライス: 資源を消費して探索用ロボットを1種類だけ建造でき、
   それを動かして探索範囲を広げられる（骨子の「ロボットを駆使して探索」を最小再現）。

### 1.3 MVPで**あえて外す**もの（将来 `tbd.md` で詳細化）

- 多様な地形・地形コスト・移動制約、視線遮蔽（LoS）。
- 複雑な戦闘（攻撃/防御ステータス、射程、武器、命中判定）。
- 豊富なロボット種別・レシピツリー・資源経済。
- 敵AIの高度な経路探索・巣からの動的湧き・難易度調整。
- 宇宙船の「修理」サブゴール、時間制限、スコア、セーブ/ロード。
- 音声・本格的アート・i18n・アクセシビリティ。

> MVPは「**歩いて・探索して・敵を避け／凌いで・ゴールに着く**」が成立すれば合格とする。
> ロボット/資源は骨子上重要なため最小スライスのみ含め、それ以外は段階的に拡張する。

---

## 2. 技術スタック

`docs/system.md` の要求（全てJS/HTML層で完結・クリーンアーキテクチャ・vitest・playwright・
Docker Compose・デプロイ先 Ubuntu 24.04 + Apache 2）から、以下を採用する（根拠は `decisions.md`）。

| 区分 | 採用 | 補足 |
|------|------|------|
| 言語 | **TypeScript** | ドメイン/サービス層を型で守る。クリーンアーキテクチャと相性が良い |
| ビルド/開発サーバ | **Vite** | vitest と統合しやすく、静的アセットへビルド可能 |
| UIフレームワーク | **なし（素のTS + DOM）** | MVPのHUDは軽量。サービス層との分離を崩さないため当面フレームワーク非依存 |
| マップ描画 | **Canvas 2D** | 多数の六角セル描画に有利。HUDはDOMオーバーレイ |
| ユニットテスト | **Vitest** | カバレッジ計測（c8/v8）。80%以上を維持 |
| 結合テスト | **Vitest**（サービス層駆動） | UI無しでGameServiceをコマンド列で駆動 |
| E2E | **Playwright** | ブラウザで実プレイ経路を検証 |
| ローカル実行 | **Docker Compose** | dev（Vite）と web（Apache でビルド成果物配信）の2系統 |
| 本番配信 | **Apache 2 / 静的アセット** | `dist/` を docroot に配置（SPA） |

---

## 3. アーキテクチャ全体像（クリーンアーキテクチャ）

依存方向は常に**内向き**（外側が内側に依存し、内側は外側を知らない）。

```
┌─────────────────────────────────────────────────────────┐
│ presentation (UI)   描画・入力・HUD                       │  ← ブラウザ依存
│   - CanvasRenderer / InputController / Hud                │
│        ↓ コマンド発行 / 状態購読                          │
├─────────────────────────────────────────────────────────┤
│ application (サービス層)  ユースケース・ゲーム進行         │  ← フレームワーク非依存
│   - GameService（状態保持・コマンド適用・イベント発行）    │
│   - commands / use-cases / turn engine                    │
│        ↓ 純粋関数で規則を適用                              │
├─────────────────────────────────────────────────────────┤
│ domain (ドメイン層)  エンティティ・値オブジェクト・規則    │  ← 純粋・副作用なし
│   - Hex / Tile / GameMap / Unit / Nest / Resource         │
│   - rules: movement / fog / combat / victory              │
├─────────────────────────────────────────────────────────┤
│ infrastructure (アダプタ)  乱数・永続化・マップ生成        │  ← 環境依存を隔離
│   - SeededRng / MapGenerator / StoragePort(localStorage)  │
└─────────────────────────────────────────────────────────┘
```

- **domain**: 外部ライブラリに依存しない純粋TS。すべて決定的（乱数は注入）。
- **application**: domain を組み合わせてユースケースを実現し、`GameState` を保持・更新する
  「サービス層」。UIには**状態スナップショット**と**ドメインイベント**だけを公開する。
- **infrastructure**: 乱数・マップ生成・永続化など環境依存をポート/アダプタで隔離。
- **presentation**: GameService を呼び、返ってきた状態を Canvas/HUD に描く。**ゲーム規則を持たない**。

---

## 4. ディレクトリ構成（予定）

> 実ファイルは本タスクでは作成しない。実装フェーズで段階的に作る。

```
in-the-search/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── Dockerfile
├── docker-compose.yml
├── deploy/                      # Apache 設定例・手順（.htaccess 等）
├── public/                      # 静的アセット
├── src/
│   ├── main.ts                  # エントリ（presentationを起動）
│   ├── domain/
│   │   ├── hex/                 # 座標系（axial/cube・近傍・距離・ピクセル変換）
│   │   ├── map/                 # Tile / GameMap / 可視性
│   │   ├── units/              # Player / Robot / Enemy / Nest
│   │   ├── resource/            # Resource 値オブジェクト
│   │   └── rules/               # movement / fog / combat / victory（純粋関数）
│   ├── application/
│   │   ├── GameService.ts       # 状態保持・コマンド適用・イベント発行
│   │   ├── commands.ts          # コマンド型（move / build / endTurn 等）
│   │   ├── events.ts            # ドメインイベント型
│   │   └── turn/                # ターンエンジン（プレイヤー相→敵相→解決）
│   ├── infrastructure/
│   │   ├── rng/SeededRng.ts
│   │   ├── mapgen/MapGenerator.ts
│   │   └── storage/             # StoragePort + localStorage 実装
│   └── presentation/
│       ├── CanvasRenderer.ts
│       ├── InputController.ts
│       └── Hud.ts
└── tests/
    ├── unit/                    # domain/application のユニットテスト
    ├── integration/             # GameService をコマンド列で駆動
    └── e2e/                     # Playwright
```

---

## 5. ドメインモデル

### 5.1 六角座標系（Hex）

> 実装で使う式・擬似コード・近傍方向・cube丸め・ピクセル変換・座標キーの**正典は `docs/hex-reference.md`**。
> 本節は設計上の要約であり、コードは hex-reference に従う。

- **pointy-top** を採用。内部座標は **axial `(q, r)`**、距離・回転計算は **cube `(x, y, z)`** に変換して行う
  （`x=q, z=r, y=-x-z`）。
- 近傍6方向（axial 差分・pointy-top）:
  `(+1,0) (+1,-1) (0,-1) (-1,0) (-1,+1) (0,+1)`
- 距離: `dist = (|q| + |q+r| + |r|) / 2`（cube のマンハッタン距離の半分）。
- ピクセル変換（hex半径 `size`）:
  - hex→pixel: `x = size·(√3·q + √3/2·r)`, `y = size·(3/2·r)`
  - pixel→hex: `q = (√3/3·px − 1/3·py)/size`, `r = (2/3·py)/size` → **cube丸め**で最近接hexへ。
- **cube丸めの注意**: 3成分（x,y,z）をそれぞれ丸めた後、誤差（丸め前との差）が最大の成分を
  `x+y+z=0` を満たすよう補正する（単純な四捨五入だけでは境界付近で誤った隣接hexを選ぶ）。
- これらは `domain/hex` に純粋関数として実装し、ユニットテストで網羅する
  （往復変換・近傍・距離の性質に加え、**ピクセル境界付近の点が正しいhexへ丸められる**ケースを含む）。

### 5.2 タイルとマップ

- `Tile`:
  - `coord: Hex`
  - `terrain: 'passable' | 'blocked'`（MVPは2種。将来拡張）
  - `visibility: 'unknown' | 'discovered' | 'visible'`（霧の3状態）
  - `resourceAmount: number`（資源ノード。0なら無し）
  - `feature?: 'pod' | 'goal' | 'nest'`（特別タイル）
- `GameMap`: `Tile` の集合。**シリアライズ可能性（D-08）のため `Map` ではなく
  `Record<CoordKey, Tile>`（プレーンオブジェクト）で保持**する。キーは `` `${q},${r}` `` 形式の文字列に統一する
  （負値も含め例: `"-1,2"`。`hex-reference.md` の `key()`/`parseKey()` に集約）。境界は半径 `R` の六角形領域。
- 共有する**厳密な型定義（Tile/GameMap/Unit/GameState/Command/DomainEvent 等）と数値定数の正典は
  `docs/types-reference.md`**。本節は意図の説明であり、コードは types-reference に従う。

### 5.3 ユニット

- 共通 `Unit`: `id` / `kind`（`player|robot|enemy`）/ `coord` / `hp` / `maxHp` /
  `vision`（視界半径）/ `movement`（1ターンの移動力）/ `attack`。
- **Player**: 脱出ポッド外のプレイヤー本体。耐久・攻撃は控えめ（骨子: 単独では敵に弱い）。
- **Robot**: MVPでは「探索用」1種類。`vision`/`movement` がプレイヤーより高い。資源で建造。
  将来は防御用・武装などを追加（`tbd.md`）。
- **Enemy**: 先住生命体。MVPは単純AI（後述）。
- `Nest`（敵の巣）: 破壊対象になり得る固定 `feature`。MVPでは静的（湧きは将来）。

### 5.4 資源

- `Resource`: MVPでは単一種の数量（`amount`）。タイルから採取して在庫に加算し、
  ポッドでロボット建造に消費する。将来は複数種・レシピ（`tbd.md`）。

### 5.5 ゲーム状態（GameState）

```
GameState {
  map: GameMap
  units: Unit[]            // player / robots / enemies
  nests: Nest[]
  inventory: { resource: number }
  turn: number
  phase: 'player' | 'enemy'
  status: 'playing' | 'won' | 'lost'
  // ターン内の一時状態（プレイヤー相で進行を保持）
  turnState: {
    movementLeft: Record<UnitId, number>   // 各自ユニットの残移動力
    hasActed: Record<UnitId, boolean>      // 移動以外の行動でそのターン終了したか
  }
  rngState: ...            // 決定的再現用（infraのRNGが保持）
}
```

- `GameState` は**シリアライズ可能**（純データ）に保ち、セーブ/ロードと結合テストを容易にする。
- ターン内の残移動力・行動済みフラグは `turnState` に保持し、プレイヤー相の途中状態も完全に復元可能にする。

---

## 6. ゲームループとターン構造

MVPは「**1ターン = プレイヤー相 → 敵相 → 解決 → 勝敗判定**」の単純構造とする
（ルールの正典は rule.md §4。本節はその設計上の表現）。

1. **プレイヤー相**: プレイヤーは自ユニット（プレイヤー本体・各ロボット）を操作する。
   各自ユニットは**移動力ポイント**を持ち、1歩の移動で1消費する（残量は `turnState.movementLeft`）。
   移動以外の行動（隣接敵への攻撃 / 資源採取 / ポッド上での建造）は**そのユニットのそのターンの行動を終了**
   させる（`turnState.hasActed`）。複数の自ユニットを順に操作できる。「ターン終了」を発行すると敵相へ進む。
   - **プレイヤー相でゴール到達した瞬間に即 `won`** とし、敵相をスキップしてゲームを終了する（rule.md §4.1）。
2. **敵相**: 各敵が単純AIで1ステップ行動する（§11）。
3. **解決**: 戦闘ダメージを確定、HP0のユニットを除去。
4. **勝敗判定**: 敵相解決後にプレイヤー本体が死亡していれば `lost`。
   同一解決内で勝敗が同時成立し得る場合は**勝利を優先**する。
5. `turn` をインクリメントし、`turnState` をリセット、視界（霧）を再計算してプレイヤー相へ戻る。

> 移動力ポイント制と「移動以外＝そのユニットの行動終了」の簡易ルールで MVP の操作を成立させる。
> 詳細バランス・複数ユニット操作のUXは `tbd.md` G-07。

---

## 7. サービス層 API（application）

UIは `GameService` だけに依存する。概略インターフェース:

```ts
interface GameService {
  newGame(seed: number, options?): GameState
  getState(): Readonly<GameState>           // スナップショット取得
  dispatch(cmd: Command): CommandResult       // 適用の成否と拒否理由のみを返す（イベントは返さない）
  subscribe(listener: (e: DomainEvent) => void): Unsubscribe   // 全ドメインイベントの唯一の配信経路
}

type Command =
  | { type: 'MoveUnit'; unitId: string; to: Hex }
  | { type: 'AttackUnit'; attackerId: string; targetId: string }
  | { type: 'GatherResource'; unitId: string }
  | { type: 'BuildRobot'; robotKind: 'scout' }
  | { type: 'EndTurn' }

type DomainEvent =
  | { type: 'UnitMoved'; ... } | { type: 'FogRevealed'; ... }
  | { type: 'CombatResolved'; ... } | { type: 'RobotBuilt'; ... }
  | { type: 'GameWon' } | { type: 'GameLost' }
```

- `dispatch` は **不正コマンドを拒否**（移動不能先・行動力超過・敵タイルへの移動など）し、`CommandResult` で
  成否と拒否理由を返す。**ドメインイベントは戻り値に含めない**。
- **イベントの配信経路は `subscribe` に一本化**する。`EndTurn` で誘発される敵相の処理（プレイヤーのコマンドを
  伴わない自動進行）で発生するイベントも含め、すべて `subscribe` 経由で配信する。二重配信による
  UI 側の重複適用を避けるため、dispatch 戻り値からはイベントを返さない（ADR D-09）。
- 規則判定は domain の純粋関数（`rules/movement` 等）に委譲し、`GameService` は**調整役**に徹する。
- UIは `subscribe` のイベントで差分更新するか、`getState()` のスナップショットで全体再描画する
  （どちらの場合もイベントの出所は単一）。

---

## 8. 霧（Fog of War）と視界

- 各タイルの `visibility` を `unknown → discovered → visible` の3状態で管理する。
- 各プレイヤー側ユニット（プレイヤー・ロボット）の `vision` 半径内（hex距離 ≤ vision）のタイルを
  毎ターン `visible` にする。視界から外れた既知タイルは `discovered`（地形は記憶、敵位置は非表示）に戻す。
- MVPは**視線遮蔽なし**（半径内は素通しで可視）。LoS（地形/巣による遮蔽）は将来検討（`tbd.md`）。
- **ユニットの可視判定**: 地形/特別タイルは `discovered` 以上で記憶表示するが、**敵ユニットは
  そのタイルが `visible` のときだけ表示**する（`discovered` では地形のみで敵位置は出さない）。
  この判定はレンダリング規則として §12 に反映する。
- 実装は `domain/rules/fog.ts` の純粋関数（入力: マップ＋自ユニット群、出力: 可視性更新）。

---

## 9. マップ生成（infrastructure/mapgen）

- **決定的**: シード（`seed`）から `SeededRng` を生成し、同シードで同一マップになること。
  これによりテストとデバッグを安定させる。
- MVPの生成手順（暫定）:
  1. 半径 `R` の六角領域を全 `passable` で初期化。
  2. 一定割合のタイルを `blocked`（障害物）に変える。
  3. 開始タイル（`pod`）を配置し、そこから十分離れた到達可能タイルに `goal`（宇宙船）を配置。
  4. 巣（`nest`）と敵を散布。資源ノードを散布。
  5. **到達可能性保証**: pod→goal が `passable` のみで連結であることを検証（BFS）。不成立なら再試行する。
- **決定性の規律**: 再試行は seed を派生させず、**同一 RNG ストリームを継続消費**して行う。これにより
  「同シード → 同マップ（再試行を含めて同一）」を保証する（D-06）。試行回数の上限を設け、超過時は
  確実に連結なフォールバック（pod-goal 間に通路を彫る）を決定的に適用する。
- 生成パラメータ（`R`・障害物率・敵/資源数）は将来チューニング対象（`tbd.md` G-09）。

---

## 10. 戦闘と勝敗条件（domain/rules/combat, victory）

- MVPの戦闘は最小限: **敵タイルへは移動不可**。隣接する敵へ「攻撃」コマンド（`AttackUnit`）で `attack` 値ぶんの
  確定ダメージ。敵相では敵が隣接プレイヤー側ユニットへ同様にダメージ。HP0で除去。命中は確定（乱数なし）。
- **勝利**: 自ユニットのいずれかが `goal` タイルへ到達。プレイヤー相で到達した瞬間に即勝利（敵相をスキップ）。
- **敗北**: プレイヤー本体（`player`）が死亡。ロボットは失っても継続可能。
- **勝敗の競合**: 同一解決内で勝敗が同時成立し得る場合は**勝利を優先**（rule.md §4.1）。
- 「巣の破壊」はMVPでは任意要素（攻撃で破壊可だが必須ではない）。詳細は `tbd.md`。

---

## 11. 敵AI（MVP）

- 各敵は毎ターン: 視界内に自ユニットがいれば最も近い対象へ1歩近づく（`passable` のみ、貪欲法）。
  隣接していれば攻撃。対象が無ければ待機（または軽いランダム移動）。
- **決定性のための処理順とタイブレーク**（rule.md §6.1）:
  - 敵は **`id` 昇順**で1体ずつ処理する（先に動いた敵の位置がその後の敵に影響する）。
  - 接近対象が同距離で複数 / 進む隣接方向が同距離で複数の場合は、**近傍6方向の固定優先順位**でタイブレーク。
  - ランダム移動など確率的分岐が必要なら `SeededRng`（同一ストリーム）経由とし再現性を保つ。
- 経路探索は近傍貪欲で十分（A\*等は将来）。

---

## 12. プレゼンテーション層

- **CanvasRenderer**: `GameState` を受け取り、pointy-top hex を Canvas 2D に描画。
  可視性で色分け（unknown=非表示/暗、discovered=減光、visible=通常）。
  **レンダリング規則**: 地形・特別タイル（pod/goal/nest）は `discovered` 以上で記憶表示するが、
  **敵ユニットは `visible` タイル上のときだけ描画**する。自ユニットは常に描画する。
- **InputController**: クリック座標 → pixel→hex 変換 → 対象hexへの妥当なコマンドを `GameService` に発行。
  キーボード（移動・ターン終了）も補助的に対応。
- **Hud**: ターン数・プレイヤーHP・資源在庫・状態（playing/won/lost）・操作ヒントをDOMで表示。
- 描画はゲーム規則を持たず、**状態の写像**に徹する（クリーンアーキテクチャの境界を守る）。

---

## 13. テスト戦略

`docs/system.md` の要求（カバレッジ80%以上・結合・E2E）に対応。

- **ユニット（Vitest）**: domain を重点的に網羅。
  - hex 数学（往復変換・近傍・距離の性質）
  - 霧/視界の更新、移動妥当性、戦闘解決、勝敗判定
  - マップ生成の決定性（同シード→同マップ）と到達可能性
- **結合（Vitest）**: `GameService` をコマンド列で駆動し、UI無しで**ミニ通しプレイ**を再現
  （新規開始→数ターン移動→ゴール到達で `won`／敵に倒されて `lost`）。
- **E2E（Playwright）**: ページ起動 → クリックで移動 → ゴール到達で勝利表示、までを検証。
- **カバレッジ閾値の対象範囲**（ADR D-10）: Vitest の coverage は `src/domain` と `src/application` を
  **include 対象**として80%以上を強制する。`src/presentation` と `src/infrastructure` の薄いアダプタは
  閾値の対象外とし、E2E（Playwright）で担保する（E2Eのカバレッジは Vitest 閾値に算入されないため、
  presentation を閾値対象に含めると未達でCIが赤化する事故を避ける）。

---

## 14. ローカル開発環境とデプロイ

### 14.1 Docker Compose（ローカル）

- `dev` サービス: Node イメージで Vite 開発サーバ（HMR）。普段の開発用。
- `web` サービス: 本番相当確認用。`dist/` をビルドし、**Apache (httpd:2.4)** で配信して
  デプロイ先（Ubuntu 24.04 + Apache 2）に近い構成を再現する。
- 切り替えは Compose の profiles で行う（`dev` / `web`）。

### 14.2 本番デプロイ（想定）

- `vite build` で `dist/`（静的アセット）を生成し、Apache の docroot に配置。
- **クライアントルーティングは持たない**ため SPA フォールバック（任意URL→index.html の rewrite）は**不要**。
  サブパス配信時のみ Vite の `base` を合わせる（`vite.config.ts` の `base`）。
- 注意: `httpd:2.4` 公式イメージは `mod_rewrite` がデフォルト無効。将来フォールバックや `.htaccess` を使う場合は
  `mod_rewrite` 有効化と `AllowOverride` 設定が必要になる点を `deploy/` の課題として記録する。
- 配置手順とApache設定例は `deploy/` に置く（実装フェーズで作成）。

---

## 15. 乱数と再現性

- すべての確率的処理（マップ生成・敵AIの分岐）は注入された `SeededRng` を経由する。
- `seed` を保存すれば局面を完全再現でき、テスト・バグ報告・デバッグを安定化させる。

---

## 16. 今後の拡張ポイント

MVPの先で詳細化が必要なゲームデザイン/技術論点は `tbd.md` に集約する
（戦闘・ロボット種別/レシピ・資源経済・敵AI・地形/LoS・宇宙船修理・セーブ/難易度 等）。
確定したアーキテクチャ判断は `decisions.md` に追記していく。
