# 作業リスト: 最初のプレイアブルデモ (MVP)

## 直近の状況

- 2026-06-20: タスク `20260620_001` で MVP の設計（`design.md`）・ルール正典（`docs/rule.md`）・
  作業リスト（本ファイル）・未決論点（`tbd.md`）・確定決定（`decisions.md`）を作成。**実コード/設定ファイルは未作成**。
- 2026-06-21: 同タスクの追加指示で、軽量モデル（Haiku 等）が早期停止せず実装できるよう本ファイルを詳細化。
  併せて共有参照 `docs/hex-reference.md`（hex 式の正典）・`docs/types-reference.md`（型・定数の正典）を新設。
- 2026-06-21: タスク `20260621_001` で Phase 0（プロジェクト基盤）を実装。
  `npm run build` / `npm run test` / `npm run test:cov` / `npm run lint` / `npm run format:check` / `npm run e2e` がすべて成功。
  サブエージェントレビューの指摘を反映（`.gitignore` 整備・coverage `all:true`・`@types/node` 追加・`src/domain/resource/` 骨格作成など）。
- 2026-06-21: タスク `20260621_002` で Phase 1（ドメイン層）を実装。36 テスト green、domain/application カバレッジ 98.79%。
- 2026-06-21: タスク `20260621_003` で Phase 2（サービス層）を実装。67 テスト green、domain/application カバレッジ 96.93%。
  `GameService` の `newGame` は簡易実装（Phase 3 で `MapGenerator` と統合）。
- 次の着手は Phase 3（インフラ層: `SeededRng` / `MapGenerator`）から。`tbd.md` の T-01〜T-03（基盤論点）は暫定案のまま進行可能。
  ただし **G-02（プレイヤー本体/ポッド/ロボットの関係）は MVP 着手前に指示者確認が望ましい優先論点**。

## 本リストの読み方（実装担当エージェント向け・重要）

- 各タスクは **対象 / API / 要点 / テスト / 完了 / 参照** で記す。**API のシグネチャと参照先の式・型を
  そのまま実装してよい**。関数本体の細部は擬似コードを参考に書く。
- **早期停止ポリシー**（AGENTS.md）: 記述に矛盾がある・参照先と食い違う・このリストと保持コンテクストだけでは
  実装方法が一意に定まらない、と判断したら**実装を止めて論点を報告**すること。勝手な仕様補完はしない。
- 共有の前提:
  - hex の式・近傍・cube丸め・pixel変換・座標キー → **`docs/hex-reference.md`**。
  - 型・数値定数（HP/視界/コスト等）→ **`docs/types-reference.md`**（数値の出所は `rule.md §7.1`）。
  - ルールの正典 → **`docs/rule.md`**、設計意図 → `design.md`、確定決定 → `decisions.md`。
  - 座標キーは必ず `key()/parseKey()` を使う。マジックナンバーは `types-reference §5` の定数を参照する。
- **決定性の規律（D-11）**: 乱数は注入 `SeededRng` のみ。生成リトライは seed を派生させず同一ストリーム継続。
  敵相は `id` 昇順、同距離タイブレークは `HEX_DIRECTIONS` の index 順。

## Phase 間の依存（並行作業時の事故防止）

- Phase 1（ドメイン）→ Phase 2（サービス層/ターンエンジン）→ Phase 3（インフラ: MapGenerator）→
  Phase 4（プレゼン/統合）の順に依存。Phase 0（基盤）は全ての前提。
- Phase 4 末の「MVPループ成立確認」は Phase 2・Phase 3 の完成が前提。
- Phase 5（ロボット/資源）は Phase 2 の `GameService`・コマンド基盤に依存。
- Phase 1 の各ルール関数は**純粋関数**（入力不変・新オブジェクト返却）で実装し、状態保持は Phase 2 が担う。

---

## Phase 0: プロジェクト基盤（scaffolding）

- [x] **`package.json` / `tsconfig.json`** — TypeScript + Vite
  - 依存（devDependencies）: `typescript` `vite` `vitest` `@vitest/coverage-v8` `@playwright/test` `@types/node`
    `eslint` `@typescript-eslint/parser` `@typescript-eslint/eslint-plugin` `prettier` `eslint-config-prettier`。
  - scripts: `dev`=vite / `build`=`tsc --noEmit && vite build` / `preview`=vite preview /
    `test`=vitest run / `test:cov`=`vitest run --coverage` / `e2e`=playwright test / `lint` / `format`。
  - tsconfig: `strict:true`・`noUncheckedIndexedAccess:true`（Record アクセス安全化）・`target:"ES2020"`・
    `module:"ESNext"`・`moduleResolution:"Bundler"`・`include:["src","tests"]`。
  - 完了: `npm i` が通り、空 `src/main.ts` で `npm run build` が成功する。
- [x] **Vite 初期化** — `index.html` / `src/main.ts`
  - `index.html` に `<canvas id="game">` と HUD 用 `<div id="hud">`、`<script type="module" src="/src/main.ts">`。
  - `vite.config.ts`: `base: './'`（サブパス配信耐性、`design.md §14.2`）、`preview.port: 4173`。
  - 完了: `npm run dev` でページが表示され、`main.ts` の `console.log` がブラウザに出る。
- [x] **Vitest 設定** — `vitest.config.ts`
  - `test.environment:'node'`（domain/application はDOM不要）、e2e ディレクトリを exclude。
  - `coverage`: `provider:'v8'`・`all:true`・`include:['src/domain/**','src/application/**']`・
    `thresholds:{ lines:80, functions:80, branches:80, statements:80 }`（D-10）。
  - 完了: ダミーテスト1件で `npm run test:cov` が走り、include 範囲だけ計測される。
- [x] **Playwright 設定** — `playwright.config.ts`
  - `testDir:'tests/e2e'`・`use.baseURL:'http://localhost:4173'`・`webServer`={ `command:'npm run build && npm run preview'`, `port:4173`, `reuseExistingServer:!CI`, `timeout:120000` }。
  - 完了: `tests/e2e/smoke.spec.ts` で `npm run e2e` がブラウザ起動・テスト成功まで到達する。
- [x] **Lint/Format** — ESLint + Prettier
  - `@typescript-eslint` recommended + prettier 競合無効化。`format` は prettier --write。
  - config ファイルも型付き lint 対象にするため `tsconfig.eslint.json` を新設。
  - 完了: `npm run lint` / `npm run format:check` が既存コードで pass。
- [x] **レイヤ骨格** — `design.md §4` のディレクトリ構成
  - `src/{domain/{hex,map,units,resource,rules},application,infrastructure,presentation}` と
    `tests/{unit,integration,e2e}` を作成（各々 `index.ts` か空ファイルで存在させる）。

## Phase 1: ドメイン層（純粋ロジック）

- [x] **`domain/hex`** — `docs/hex-reference.md` の §0〜6 を**そのまま実装**（§8 `hexLine` も含む）
  - 対象: `src/domain/hex/index.ts`（`Hex`/`Cube`/`axialToCube`/`cubeToAxial`/`HEX_DIRECTIONS`/`add`/
    `neighbors`/`equals`/`distance`/`cubeRound`/`axialRound`/`hexToPixel`/`pixelToHex`/`key`/`parseKey`/`hexLine`）。
  - 要点: 式・近傍順・cube丸め補正は hex-reference を一字一句踏襲。`-0` 正規化を追加。
  - テスト: `tests/unit/hex.test.ts` は hex-reference §7 のリスト + `hexLine`。
  - 完了: hex-reference §4 の数値例3件と §7 を含む全テスト green。
- [x] **`domain/map`** — Tile / GameMap とヘルパ
  - 対象: `src/domain/map/`（`types.ts` + `index.ts`）。型は `types-reference §1`。API:
    `coordsInRadius` / `createEmptyMap` / `inBounds` / `getTile` / `setTile` / `tilesWithin`。
  - 要点: `coordsInRadius` は `for q in -R..R: for r in max(-R,-q-R)..min(R,-q+R)`。キーは `key()`。
  - テスト: `tests/unit/map.test.ts`。`coordsInRadius(R).length === 3R²+3R+1`、`inBounds` 境界、`set→get` 往復、`tilesWithin` の距離条件。
  - 完了: 上記テスト green。
- [x] **`domain/units`** — ファクトリと定数
  - 対象: `src/domain/units/`（`types.ts` / `stats.ts` / `index.ts`）。型・定数は `types-reference §1,§5`。API:
    `createPlayer` / `createEnemy` / `createScout` / `createNest` / `isPlayerSide`。
  - テスト: `tests/unit/units.test.ts`。各ファクトリが `types-reference §5` の数値・`hp===maxHp`・`isPlayerSide` の真偽。
- [x] **`domain/rules/movement`** — 移動妥当性（純粋・判定のみ）
  - 対象: `src/domain/rules/movement.ts`。API:
    `checkMove(map, from, to, occupantAt): null | MoveRejection`。
  - 要点: `distance(from,to)!==1`→not-adjacent / `!inBounds`→out-of-bounds / `tile.terrain==='blocked'`→
    blocked-terrain / `occupantAt(to)` 在り→occupied。状態は変更しない。
  - テスト: `tests/unit/movement.test.ts`。4種の拒否 + 正常（隣接 passable 空き）で null。
- [x] **`domain/rules/fog`** — 視界更新（純粋）
  - 対象: `src/domain/rules/fog.ts`。API:
    `updateVisibility(map, playerUnits): { map, nowVisible }`。
  - 要点: 前ターン visible → 今ターン discovered 降格 → 自ユニット視界内を visible に更新。`nowVisible` は新規可視タイル。
  - テスト: `tests/unit/fog.test.ts`。視界内が visible・範囲外の既知が discovered に降格・unknown は範囲外なら据え置き・
    複数ユニットの和集合・`nowVisible` に新規可視タイルが含まれる。`rule.md §3`。
- [x] **`domain/rules/combat`** — ダメージ解決（純粋）
  - 対象: `src/domain/rules/combat.ts`。API:
    `resolveAttack(attacker, targetHp): { damage, targetHpAfter, destroyed }`。
  - 要点: `damage=attacker.attack`（確定・乱数なし）、`targetHpAfter=max(0,targetHp-damage)`、
    `destroyed = targetHpAfter===0`。隣接判定は呼び出し側（Phase 2）。`rule.md §6`。
  - テスト: `tests/unit/combat.test.ts`。通常ダメージ・超過で0止まり・撃破フラグ。
- [x] **`domain/rules/victory`** — 勝敗判定（純粋）
  - 対象: `src/domain/rules/victory.ts`。API:
    `evaluateStatus({ goalReached, playerAlive }): 'playing' | 'won' | 'lost'`。
  - 要点: `goalReached`→`'won'`（**勝利優先**）/ それ以外で `!playerAlive`→`'lost'` / 他は `'playing'`。
    優先順位は `rule.md §4.1`。
  - テスト: `tests/unit/victory.test.ts`。競合時（両 true）に won・敗北のみ・継続。

## Phase 2: サービス層（application）

- [x] **`GameState` / コマンド / イベント型** — `types-reference §2,§3` を配置
  - 対象: `src/application/state.ts` `commands.ts` `events.ts`。型をそのまま定義。`GameStatus` は `domain/rules/victory` から再利用。
  - 完了: 型がコンパイルでき、全テストで使用済み。
- [x] **共有ヘルパ** — `src/application/util.ts` に `minBy` / `occupantAt` を実装。
- [x] **敵AI** — 1体ぶんの行動決定（純粋・決定的）
  - 対象: `src/application/turn/enemyAi.ts`。API:
    `EnemyAction` / `decideEnemyAction(state, enemy)`。
  - 前提: `minBy`/`occupantAt` は `application/util.ts`。**1タイル1ユニット**なので進行先に敵味方問わず占有者がいれば入れない。
  - 要点: 隣接自ユニットがいれば id 昇順で攻撃 → 視界内の最近自ユニットへ HEX_DIRECTIONS 順で最も近づくマスへ移動。
  - テスト: `tests/unit/enemyAi.test.ts`。攻撃・接近・方向タイブレーク・wait を確認。
- [x] **ターンエンジン** — 敵相の実行と前進
  - 対象: `src/application/turn/turnEngine.ts`。API:
    `runEnemyPhaseAndAdvance(state, emit)`。
  - 規約: 敵 id 列をループ前に確定・各反復で生存確認・勝利判定は行わず敗北判定のみ・turnState を自ユニットから作り直す。
  - テスト: `tests/unit/turnEngine.test.ts`。接近/攻撃・プレイヤー死亡 lost・turnState 再構築・id 昇順ブロック・霧更新。
- [x] **`GameService`** — 状態保持・コマンド適用・イベント配信
  - 対象: `src/application/GameService.ts`。API: `newGame(seed)` / `getState()` / `dispatch(cmd)` / `subscribe(listener)`。
  - 要点: イベントは `subscribe` に一本化（D-09）。`dispatch` は `CommandResult` のみ返す。`getState` は `structuredClone` でスナップショット。
    `MoveUnit`/`AttackUnit`/`EndTurn` を実装。`GatherResource`/`BuildRobot` は Phase 5 まで保留（`{ ok: true }` を返す）。
  - `newGame` は簡易実装（半径3、中心に player、`(R,0)` に goal）。Phase 3 で `MapGenerator` と統合予定。
  - テスト: `tests/unit/gameService.test.ts`。各拒否理由・正常移動・ゴール勝利・subscribe 解除・不変スナップショット・EndTurn。
- [x] **不正コマンド拒否の網羅テスト** — `tests/unit/gameService.test.ts` で `RejectReason` を各1件以上確認。

## Phase 3: インフラ層

- [ ] **`SeededRng`** — mulberry32（決定的）
  - 対象: `src/infrastructure/rng/SeededRng.ts`。API は `types-reference §4`。実装擬似:
    ```
    createRng(seedOrState): let a = seedOrState>>>0
      const step = () => { a=(a+0x6D2B79F5)|0; let t=Math.imul(a^a>>>15,1|a);
        t=(t+Math.imul(t^t>>>7,61|t))^t; return (t^t>>>14)>>>0; }   // 0..2^32-1
      return { nextU32:()=>step(), nextFloat:()=>step()/4294967296,
               nextInt:(m)=>step()%m, getState:()=>a>>>0 }
    ```
  - テスト: 同 seed で系列一致・`getState()` から再生成して以降が一致・`nextFloat` が [0,1)・`nextInt(m)` が 0..m-1。
- [ ] **`MapGenerator`** — 決定的生成 + 到達可能性保証
  - 対象: `src/infrastructure/mapgen/MapGenerator.ts`。`GenResult` 型・`sampleN` は `types-reference §6`、
    定数（`MAP_RADIUS`/`BLOCKED_RATE`/…/`MAP_GEN_MAX_RETRY`）は `types-reference §5`、`hexLine` は `hex-reference §8`。
    API: `generateMap(seed: number): GenResult`、内部 `attempt(rng: SeededRng): GenResult`。
  - 要点（擬似コード、`design.md §9`）。**散布は1つのプールから順に非復元抽出**（決定的に乱数を消費）:
    ```
    attempt(rng): -> GenResult
      map = createEmptyMap(R=MAP_RADIUS); pod = {q:0,r:0}     // 中心固定
      for c in coordsInRadius(R): if !equals(c,pod) && rng.nextFloat()<BLOCKED_RATE: set c blocked
      set pod tile passable, feature 'pod'
      cands = coordsInRadius(R).filter(c => passable(c) && distance(c,pod)>=MIN_POD_GOAL_DISTANCE)
      goal = cands[rng.nextInt(cands.length)]; set goal passable, feature 'goal'
      pool = coordsInRadius(R).filter(c => passable(c) && !eq(pod) && !eq(goal))   // 配置候補
      nestCoords = sampleN(pool, NEST_COUNT, rng);            pool = pool.filter(not in nestCoords)
      enemyCoords = sampleN(pool, ENEMY_COUNT, rng);          pool = pool.filter(not in enemyCoords)
      resCoords  = sampleN(pool, RESOURCE_NODE_COUNT, rng)
      nests   = nestCoords.map((c,i)=>createNest(`n${i}`,c));  set those tiles feature 'nest'
      enemies = enemyCoords.map((c,i)=>createEnemy(`e${i}`,c))
      for c in resCoords: getTile(map,c).resourceAmount = GATHER_AMOUNT
      return { map, podCoord:pod, goalCoord:goal, enemies, nests }
    generateMap(seed):
      rng = createRng(seed); res = attempt(rng)
      for i in 1..MAP_GEN_MAX_RETRY:
        if bfsReachable(res.map, res.podCoord, res.goalCoord): return res
        res = attempt(rng)                              // ★ seed を派生させず同一ストリーム継続（D-11）
      if !bfsReachable(...): carveCorridor(res.map, res.podCoord, res.goalCoord)  // 決定的フォールバック
      return res
    ```
  - 補助関数の擬似コード:
    ```
    sampleN(arr, n, rng): copy=arr.slice(); for i in 0..copy.len-1: j=i+rng.nextInt(copy.len-i); swap(copy[i],copy[j])
                          return copy.slice(0, n)         // Fisher-Yates（rng のみ・Math.random 不可）
    bfsReachable(map,a,b): BFS from a over neighbors() where inBounds && terrain==='passable'; true if b 到達
    carveCorridor(map,a,b): for c of dedupeByKey(hexLine(a,b)): if inBounds(map,c) getTile(map,c).terrain='passable'
                            （feature は維持。hexLine は hex-reference §8）
    ```
  - テスト: **決定性=`JSON.stringify(generateMap(s))` が2回呼び出しで完全一致**（再試行・フォールバック込み）・
    pod は `{0,0}`・goal は距離条件を満たす・pod→goal が `bfsReachable`・blocked 率が概ね `BLOCKED_RATE`・
    敵/巣/資源の座標が互いに重複せず pod/goal と重ならず passable 上・id が `e0..`/`n0..` で採番。
- [ ] **`StoragePort` + localStorage 実装** — `types-reference §4`
  - 対象: `src/infrastructure/storage/`。`save`=`localStorage.setItem(slot, JSON.stringify(state))`、
    `load`=`JSON.parse(...)`（無ければ null）。MVP は最小。
  - テスト: 保存→読込で `GameState` が深く等価（jsdom か `localStorage` モックで）。

## Phase 4: プレゼンテーション層と統合

- [ ] **`CanvasRenderer`** — pointy-top hex 描画
  - 対象: `src/presentation/CanvasRenderer.ts`。API:
    ```ts
    type View = { size: number; origin: Point };
    render(ctx: CanvasRenderingContext2D, state: GameState, view: View): void;
    ```
  - 要点（`design.md §12`）: 各タイルを `hexToPixel(coord,size,origin)` 中心の六角形で塗る。色は
    `unknown`=描画スキップ（背景）/`discovered`=減光/`visible`=通常。`feature`（pod/goal/nest）と資源を重畳。
    ユニット: 自ユニットは常時描画、**敵はそのタイルが `visible` のときだけ描画**（`design.md §8`）。
  - テスト: ロジックは薄いので E2E（Phase 6）で担保。任意で hex 頂点計算のユニットテスト。
- [ ] **`InputController`** — クリック→コマンド
  - 対象: `src/presentation/InputController.ts`。要点: canvas クリックの client 座標を canvas 内座標へ補正し
    `pixelToHex(px,py,size,origin)`→対象 hex。対象に敵がいて自選択ユニットに隣接なら `AttackUnit`、
    隣接 passable なら `MoveUnit`、それ以外は無視。キーボード（隣接移動・`E`=EndTurn）を補助。
    「現在操作中の自ユニット」の選択方法（クリック選択 or 既定でプレイヤー本体）は本タスクで**プレイヤー本体を
    既定選択**とし、ロボット操作の選択 UI は Phase 5 で拡張する旨を明記。
  - テスト: pixel→hex 変換の妥当性はユニット、操作系は E2E。
- [ ] **`Hud`** — 状態表示
  - 対象: `src/presentation/Hud.ts`。`#hud` にターン数・プレイヤーHP・資源在庫・`status`・操作ヒントを描画。
  - 完了: `render(state)` で DOM テキストが更新される。
- [ ] **`main.ts` 統合** — 起動と配線
  - 対象: `src/main.ts`。要点: `?seed=` を読み（無ければ `Date.now()` 由来の固定化値か既定 seed）、
    `GameService.newGame(seed)`、`subscribe` で再描画（イベント受信→`getState`→`render`）、入力を接続。
    **`?seed=` 指定で固定マップを決定的に再現**できること（E2E 安定化、`tbd.md G-10`）。
  - 完了: ブラウザで移動→霧が晴れ→ゴールで勝利表示／敗北表示まで手動で通る。
- [ ] **手動 MVP ループ確認** — Phase 2/3 完成前提。移動→霧→ゴール勝利／死亡敗北を手で確認。

## Phase 5: ロボット/資源の最小スライス

- [ ] **`GatherResource` ハンドラ** — `GameService.dispatch`
  - 要点: 自ユニットが乗るタイルの `resourceAmount>0` 否なら `no-resource-here`。可なら
    `inventory.resource += GATHER_AMOUNT`、当該タイル `resourceAmount=0`、`hasActed[unit]=true`、
    emit `ResourceGathered`。`rule.md §7`。
  - テスト: 採取で在庫加算・タイル枯渇・資源なしで拒否・採取後そのユニットは行動終了。
- [ ] **`BuildRobot` ハンドラ** — pod 上のプレイヤー本体のみ
  - ⚠ **前提確認**: 建造ルールは `tbd.md G-02` の暫定確定線（ポッド固定拠点・建造は pod 上のプレイヤー本体のみ）に
    依存する。Phase 5 着手前に G-02 が指示者により別案へ変更されていないか確認すること（変われば本タスクを停止・再設計）。
  - 要点（`rule.md §7`・G-02 暫定確定線）: プレイヤー本体が `feature==='pod'` タイル上か否（否なら
    `not-on-pod`）→`inventory.resource>=SCOUT_COST` 否なら `insufficient-resource`→`HEX_DIRECTIONS` 順で
    最初の passable・在界・空き（`occupantAt` で判定）タイルに `createScout` を配置。生成 scout の id は
    `r0,r1,...`（既存ロボット数で採番）、当ターンは `movementLeft=0`・`hasActed=true`→
    `inventory.resource-=SCOUT_COST`、`hasActed[player]=true`、emit `RobotBuilt`。
  - テスト: 建造で scout 追加・コスト減算・pod 外で拒否・資源不足で拒否・配置先が空きマス・id 採番。
- [ ] **ロボット操作と霧拡張** — scout の高視界/高移動を確認
  - 要点: 次ターン以降 scout も `turnState` に入り操作可（視界4/移動3）。InputController に自ユニット切替を追加。
  - テスト（結合）: scout 建造→翌ターン scout 移動で霧が本体より広く晴れる。
- [ ] **資源/建造の結合テスト** — `tests/integration/` で採取→建造→探索の一連を `GameService` 駆動で検証。

## Phase 6: テスト整備

- [ ] **結合テスト（通しプレイ）** — `tests/integration/playthrough.test.ts`
  - 要点: 固定 seed で `newGame`→コマンド列を `dispatch`→`won`/`lost` に至る2シナリオ。`subscribe` で
    集めたイベント列も検証。
- [ ] **決定性ゴールデンテスト** — 同 seed・同コマンド列 →同 `GameState` スナップショット
  - 要点: `structuredClone`/JSON で最終状態を固定スナップショットと比較（`toMatchSnapshot` 可）。D-11 の保証を担保。
- [ ] **E2E（Playwright）** — `tests/e2e/`
  - 要点: `?seed=<固定>` で起動→既知の連続クリックで移動→ゴール到達で勝利表示を assert。固定マップ前提。
- [ ] **カバレッジ80%確認** — `npm run test:cov` が domain/application include で80%以上（D-10）。

## Phase 7: Docker Compose / デプロイ確認

- [ ] **`Dockerfile`（ビルド用）** — Node でビルドし `dist/` を生成（multi-stage 可）。
- [ ] **`docker-compose.yml`** — `dev`=Vite(HMR) / `web`=`httpd:2.4` で `dist/` を docroot 配信、profiles 切替（D-07）。
- [ ] **`dev` 起動確認** — `docker compose --profile dev up` で開発サーバが動く。
- [ ] **`web` 配信確認** — ビルド成果物を Apache で配信し本番相当で通しプレイ。`design.md §14.2` の
  SPA フォールバック不要・`mod_rewrite` 既定無効の注意を `deploy/` に記録。
- [ ] **`deploy/`** — Apache 設定例・配置手順（docroot・`base` 整合）。

## Phase 8: ドキュメント整備（consolidate）

- [ ] **`README.md`** — 概要・起動方法（dev/web・`?seed=`・テスト実行）。
- [ ] **`docs/rule.md` 更新** — 実装で確定した数値・挙動に合わせる（`types-reference §5` と同期）。
- [ ] **`design.md` 更新** — 実装と突き合わせ（consolidate）。`hex-reference`/`types-reference` との乖離も解消。
- [ ] **`tbd.md` 更新** — 実装で判明した論点を反映。
