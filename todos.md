# 作業リスト: 最初のプレイアブルデモ (MVP)

## 直近の状況

- 2026-06-21: Phase 0〜3 を実装完了（基盤／ドメイン／サービス層／インフラ）。`SeededRng`・`MapGenerator`・
  `StoragePort` 実装、`GameService.newGame` を決定的マップ生成へ統合。79 テスト green、domain/application カバレッジ ~97%。
- 2026-06-21: タスク `20260621_007` で Phase 4（プレゼンテーション層と統合）の主要実装を完了。
  Canvas描画、クリック/キー入力、HUD、`main.ts` 起動配線、E2E smoke 更新まで実施。**手動MVPループ確認は未実施**。
- 2026-06-21: タスク `20260621_008` で指示者の tbd 回答を資料へ反映（design 工程）。
  確定: T-01(UIフレームワークは必要時導入=D-15)・T-02(Canvas 2D 確定=D-05)・T-03(Compose 一貫確認=D-07, 前倒し方針)・
  **G-02(可動ユニット/固定建造物の分離・ポッド破壊で敗北=D-12)**・G-03/G-07/G-01/G-08(将来方針=D-14)・
  G-05(敵接近は視界内限定・攻撃優先 player>pod>robot)・予見可能ポリシー(D-13)。`tbd.md` は T-04/G-04/G-06/G-09 のみに整理。
  併せて本リストの完了済みタスク詳細を削除して整頓（consolidate）。`logs/20260621_008_tbd.result.md` 参照。
- 2026-06-21: タスク `20260621_011` で **G-02 反映タスク**を実装完了。
  `GameState.pod`、ポッド破壊敗北、pod重なり時の被弾宛先、敵AIの player>pod>robot 優先度、HUDのポッドHP表示、
  `AttackUnit` のフレンドリーファイア防止を反映。`logs/20260621_011_impl_g02_pod_model.result.md` 参照。
- **Docker Compose 前倒し方針（D-07）**: Phase 7 の Compose 準備は前倒しで完了。`dev`/`web` とも実起動と
  HTTP 応答確認済み（`logs/20260621_009_impl_phase7_compose.result.md` 参照）。ブラウザでの手動通しプレイは
  Phase 4 残タスクまたは Phase 6 E2E で継続確認する。
- 2026-06-21: `web` コンテナ（`http://localhost:8080`）でマウス操作による手動通しプレイを確認（移動→ゴール到達=勝利）。
  併せてタスク `20260621_012` で**アンドゥ＋敵相プレビュー（決定的予見可能性の操作実装）**を実装完了。
  `simulateEnemyPhase`、`GameService.undo()` / `previewEnemyPhase()`、Canvas/HUDプレビュー、`U`キーUndoを追加。
  `logs/20260621_012_impl_foreseeability.result.md` 参照。
- 2026-06-21: タスク `20260621_013` で **Phase 5（ロボット/資源の最小スライス）**を実装完了。
  `GatherResource` / `BuildRobot`、scout建造、翌ターンのscout操作、Tabでの自ユニット切替、G採取/B建造を追加。
  `logs/20260621_013_impl_phase5_resource_robot.result.md` 参照。
- `tbd.md` の T-04・G-04・G-06・G-09 は暫定案のまま進行可能。

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
  Phase 4（プレゼン/統合）の順に依存。Phase 0（基盤）は全ての前提。**Phase 0〜3 は実装完了**。
- Phase 4 末の「MVPループ成立確認」は Phase 2・Phase 3 の完成が前提。
- Phase 5（ロボット/資源）は Phase 2 の `GameService`・コマンド基盤に依存。

---

## 完了済み（Phase 0–4 主要部）

実装・テスト済み。詳細仕様は実コード・`design.md`・`docs/types-reference.md`・各 `logs/2026062*_*.result.md` を正とする。

- **Phase 0（基盤）**: package/tsconfig/Vite/Vitest/Playwright/ESLint・Prettier・レイヤ骨格。
- **Phase 1（ドメイン）**: `domain/hex`・`domain/map`・`domain/units`・`domain/rules/{movement,fog,combat,victory}`。
- **Phase 2（サービス層）**: `GameState`/コマンド/イベント型・`util`（minBy/occupantAt）・敵AI・ターンエンジン・`GameService`。
- **Phase 3（インフラ）**: `SeededRng`（mulberry32）・`MapGenerator`（決定的生成+到達可能性保証）・`StoragePort`。
- **Phase 4（プレゼン/統合）**: `CanvasRenderer`・`InputController`・`Hud`・`main.ts` 統合（`?seed=` 再現対応）。

> ⚠ 上記のうち victory / GameService / turnEngine / enemyAi / MapGenerator 周りは、下記「G-02 反映タスク」で
> ポッド/敗北モデルへ追従更新する必要がある。

---

## Phase 4 残: 手動確認

- [ ] **手動 MVP ループ確認** — 移動→霧→ゴール勝利／死亡敗北を手で確認（G-02 反映後の挙動で確認するのが望ましい）。
  - 2026-06-21: `web` コンテナ（`http://localhost:8080`）でマウス操作により移動→**ゴール到達=勝利**まで確認済み（指示者）。
    未確認は敗北（死亡／ポッド破壊）経路と、G-02 反映後・予見可能性（プレビュー/Undo）反映後の挙動。

## Phase 5: ロボット/資源の最小スライス

- [x] **`GatherResource` ハンドラ** — `GameService.dispatch`
  - 要点: 自ユニットが乗るタイルの `resourceAmount>0` 否なら `no-resource-here`。可なら
    `inventory.resource += GATHER_AMOUNT`、当該タイル `resourceAmount=0`、`hasActed[unit]=true`、
    emit `ResourceGathered`。`rule.md §7`。
  - テスト: 採取で在庫加算・タイル枯渇・資源なしで拒否・採取後そのユニットは行動終了。
- [x] **`BuildRobot` ハンドラ** — pod 上のプレイヤー本体のみ
  - ✅ **前提確定**: 建造ルールは `decisions.md` D-12（ポッドは固定建造物・建造は pod 上のプレイヤー本体のみ）で確定。
    「pod 上か」の判定は **プレイヤー本体の `coord` が `GameState.pod.coord` と一致するか**で行う（feature タイルではなく pod 構造体で判定）。
  - 要点（`rule.md §7`・D-12）: プレイヤー本体が pod タイル上か否（否なら
    `not-on-pod`）→`inventory.resource>=SCOUT_COST` 否なら `insufficient-resource`→`HEX_DIRECTIONS` 順で
    最初の passable・在界・空き（`occupantAt` で判定）タイルに `createScout` を配置。生成 scout の id は
    `r0,r1,...`（既存ロボット数で採番）、当ターンは `movementLeft=0`・`hasActed=true`→
    `inventory.resource-=SCOUT_COST`、`hasActed[player]=true`、emit `RobotBuilt`。
  - テスト: 建造で scout 追加・コスト減算・pod 外で拒否・資源不足で拒否・配置先が空きマス・id 採番。
- [x] **ロボット操作と霧拡張** — scout の高視界/高移動を確認
  - 要点: 次ターン以降 scout も `turnState` に入り操作可（視界4/移動3）。InputController に自ユニット切替を追加。
  - テスト（結合）: scout 建造→翌ターン scout 移動で霧が本体より広く晴れる。
- [x] **資源/建造の結合テスト** — `tests/integration/` で採取→建造→探索の一連を `GameService` 駆動で検証。

## Phase 6: テスト整備

- [ ] **結合テスト（通しプレイ）** — `tests/integration/playthrough.test.ts`
  - 要点: 固定 seed で `newGame`→コマンド列を `dispatch`→`won`/`lost` に至る2シナリオ。`subscribe` で
    集めたイベント列も検証。
- [ ] **決定性ゴールデンテスト** — 同 seed・同コマンド列 →同 `GameState` スナップショット
  - 要点: `structuredClone`/JSON で最終状態を固定スナップショットと比較（`toMatchSnapshot` 可）。D-11 の保証を担保。
- [ ] **E2E（Playwright）** — `tests/e2e/`
  - 要点: `?seed=<固定>` で起動→既知の連続クリックで移動→ゴール到達で勝利表示を assert。固定マップ前提。
- [ ] **カバレッジ80%確認** — `npm run test:cov` が domain/application include で80%以上（D-10）。

## Phase 7: Docker Compose / デプロイ確認（D-07: 可能なら前倒し）

- [x] **`Dockerfile`（ビルド用）** — Node でビルドし `dist/` を生成（multi-stage 可）。
- [x] **`docker-compose.yml`** — `dev`=Vite(HMR) / `web`=`httpd:2.4` で `dist/` を docroot 配信、profiles 切替（D-07）。
- [x] **`dev` 起動確認** — `docker compose --profile dev up` で開発サーバが動く。
  - 2026-06-21: `docker compose --profile dev up --build -d dev` で起動し、`http://localhost:5173/`・
    `/src/main.ts`・`/@vite/client` の HTTP 応答を確認。HMR クライアント配信は確認済み。ファイル一時変更による
    ブラウザ HMR 目視確認は未実施。
- [x] **`web` 配信確認** — ビルド成果物を Apache で配信し本番相当で通しプレイ。`design.md §14.2` の
  SPA フォールバック不要・`mod_rewrite` 既定無効の注意を `deploy/` に記録。
  - 2026-06-21: `docker compose --profile web up --build -d web` で起動し、`http://localhost:8080/` と
    `http://localhost:8080/?seed=manual-web-check`、ビルド済み JS アセットの HTTP 200 を確認。ブラウザでの通しプレイは未実施。
- [x] **`deploy/`** — Apache 設定例・配置手順（docroot・`base` 整合）。

## Phase 8: ドキュメント整備（consolidate）

- [ ] **`README.md`** — 概要・起動方法（dev/web・`?seed=`・テスト実行）。
- [ ] **`docs/rule.md` 更新** — 実装で確定した数値・挙動に合わせる（`types-reference §5` と同期）。
- [ ] **`design.md` 更新** — 実装と突き合わせ（consolidate）。`hex-reference`/`types-reference` との乖離も解消。
- [ ] **`tbd.md` 更新** — 実装で判明した論点を反映。

---

## G-02 反映タスク: ポッド/敗北モデルの実装更新（design タスク `20260621_008`・最優先）

`decisions.md` D-12 確定に伴い、既完了の Phase 1〜3 の一部をモデル変更へ追従させる。可動ユニット（units）と
固定建造物（pod）を分離し、敗北条件に「ポッド破壊」を追加する。**型・定数は `types-reference §1,§2,§5,§6` に追加済み**
（`PodStructure` / `GameState.pod` / `POD_HP=20` / `POD_DEFENSE=0`）。早期停止ポリシー: 既存実装と矛盾を感じたら停止して報告。

- [x] **`GameState.pod` の導入と `newGame` 構築** — `src/application/GameService.ts`・`state.ts`
  - 要点: `GameState` に `pod: PodStructure` を追加。`newGame` は `MapGenerator` の `podCoord` から
    `{ id:'pod', coord:podCoord, hp:POD_HP, maxHp:POD_HP, defense:POD_DEFENSE }` を構築して格納。`pod` は `units` に入れない。
    プレイヤー本体は従来どおり pod 上（または近傍）に配置（既存の中心/pod 配置を踏襲）。`getState` のスナップショットにも含める。
  - テスト: `tests/unit/gameService.test.ts`。`newGame` 後 `state.pod` が `POD_HP`・`podCoord` と一致。
- [x] **敗北判定にポッド破壊を追加** — `src/domain/rules/victory.ts`
  - 要点: `evaluateStatus({ goalReached, playerAlive, podAlive })` に**第3入力 `podAlive` を追加**。
    `goalReached`→`'won'`（勝利優先）/ `(!playerAlive || !podAlive)`→`'lost'` / 他は `'playing'`（`rule.md §4.1`）。
  - 影響: 呼び出し側（`turnEngine`・`GameService` の勝敗評価）は `podAlive = state.pod.hp > 0` を渡すよう更新。
  - テスト: `tests/unit/victory.test.ts` に「ポッド破壊で lost」「ゴール到達はポッド破壊より優先で won」を追加。既存テストは `podAlive:true` 補完。
- [x] **重なり時の被弾はポッドへ** — `src/application/turn/turnEngine.ts`（敵相のダメージ適用箇所）
  - 要点: 敵がプレイヤー本体を攻撃する際、**プレイヤーが pod に重なっている（`player.coord` == `pod.coord`）なら
    ダメージは `pod.hp` に入れる**（プレイヤーHPは減らさない）。pod.hp が 0 になったら敗北判定対象。
    重なっていなければ従来どおりプレイヤーHPへ。`CombatResolved` の `targetId` は被弾対象（`'pod'` or player id）を反映。
  - テスト: `tests/unit/turnEngine.test.ts`。pod 上のプレイヤーが攻撃されると pod.hp が減りプレイヤーHPは不変／pod 0 で lost。
- [x] **敵の攻撃/接近対象にポッドを含め優先度を適用** — `src/application/turn/enemyAi.ts`
  - 要点: 敵の対象候補に**プレイヤー（可動）とポッド（pod.coord）**を含める。同条件で複数狙えるときの優先は
    **プレイヤー > ポッド > ロボット**（`rule.md §6`）。接近対象は従来どおり**視界内**に限定、視界内に対象なしなら待機。
    タイブレークは距離→優先度→`HEX_DIRECTIONS` index 順。`occupantAt`（可動のみ）に pod を混ぜない（移動は pod 上にも乗れる）。
  - テスト: `tests/unit/enemyAi.test.ts`。プレイヤーとポッドが同距離ならプレイヤーを狙う／プレイヤー不在ならポッドへ接近・攻撃。
- [x] **描画/HUD のポッド対応** — `src/presentation/CanvasRenderer.ts`・`Hud.ts`
  - 要点: ポッドを固定建造物として描画（feature 'pod' は既存）。HUD に**ポッドHP**を表示（プレイヤーHPと並記）。
    敗北表示はプレイヤー死亡・ポッド破壊の双方で出ること。E2E（Phase 6）で担保。
  - テスト: ロジックは薄いので E2E。任意で Hud のユニットテスト。

---

## 予見可能性タスク: アンドゥと敵相プレビュー（MVP最終目標・`decisions.md` D-16）

決定的予見可能ポリシー（D-13・`rule.md §7.2`）を操作面で実現する。「行動を確定する前に、そのターンの敵の行動と
結果まで予見でき、修正（アンドゥ）できる」状態を MVP 最終時点で満たす。実装順は下記（試算分離 → アンドゥ → UI）。

- [x] **敵相を「試算（純）」と「適用（emit あり）」に分離** — `src/application/turn/turnEngine.ts`
  - 要点: 現行 `runEnemyPhaseAndAdvance(state, emit)` の行動決定ロジックを、**副作用なし・emit なしで予測を返す純関数**
    `simulateEnemyPhase(state): EnemyPhasePrediction` として抽出する（clone した state 上で敵AI/ターンエンジンを走らせる）。
    `EnemyPhasePrediction` は各敵の移動先・攻撃対象・被ダメ（プレイヤー/ポッド/ロボット別）を含む。適用版は試算結果を使って
    state 更新＋emit する形に整理し、**試算と適用で結果が一致**することを担保する（決定性 D-06/D-11）。
  - テスト: `tests/unit/turnEngine.test.ts`。`simulateEnemyPhase` の予測が、実際に適用した後の state 差分と一致する。
- [x] **`GameService.undo()` 追加（プレイヤー相内スナップショットスタック）** — `src/application/GameService.ts`
  - 要点: プレイヤー相のコマンド適用直前に `structuredClone(state)` をスタックへ push。`undo()` は pop して直前状態へ戻し、
    戻せたら `true`。EndTurn 適用（敵相開始）でスタックを**クリア**（アンドゥはそのターンのプレイヤー相内に限る・D-16）。
    `getState()` のスナップショットと整合させる。Command 体系は増やさない（UI 操作）。
  - テスト: `tests/unit/gameService.test.ts`。移動→`undo()` で座標・移動力が直前へ復帰／EndTurn 後はスタック空で `undo()` が `false`。
- [x] **`GameService.previewEnemyPhase()` 公開** — `src/application/GameService.ts`
  - 要点: 現在の `state` から `simulateEnemyPhase` を呼び、`EnemyPhasePrediction` を返す（state は変更しない）。
  - テスト: 同一 state で複数回呼んでも同結果（純粋・決定的）。
- [x] **UI: 敵相プレビュー描画と Undo 操作** — `src/presentation/CanvasRenderer.ts`・`InputController.ts`・`Hud.ts`
  - 要点: プレイヤーの暫定移動／アンドゥのたびに `previewEnemyPhase()` を再取得し、敵の移動先（ゴースト）・被ダメ予測を薄く重畳描画。
    Undo はキー（例: `U`）かボタンで `undo()` を呼び再描画。表示粒度は実装時に調整（D-16）。
  - テスト: E2E（Phase 6）で「移動→敵プレビュー表示→Undo で戻る→別行動」を確認。任意で描画ロジックの軽いユニットテスト。

---

## レビュー指摘（Phase 2 / タスク `20260621_005`）

`logs/20260621_005_review_phase2.result.md` 参照。重大度順。解決済みの項目は削除済み。

- [x] **[必須] `AttackUnit` のフレンドリーファイア防止** — `src/application/GameService.ts:137-144`
  - 問題: 対象 id が**自軍ユニット（player/robot）でも攻撃が成立**する。`unitTarget` を `state.units.find(id===targetId)`
    で取るだけで `isPlayerSide` 判定がなく、隣接する自分の `scout` 等を攻撃できてしまう（`rule.md §6`「敵を攻撃する」に反する）。
    `target-not-enemy` という拒否理由が用意済みなのに、現状は「対象が存在しない」場合にしか使われていない。
  - 現状の影響: `newGame` の自ユニットは `player` 1体のみ・自分自身は距離0で `target-not-adjacent` 拒否されるため**今は顕在化しない**が、
    **Phase 5 でロボットが増えた瞬間に live になる**。Phase 5 着手前までに修正すること。
  - 修正案: `unitTarget` が見つかった場合に `isPlayerSide(unitTarget)` なら `{ ok:false, reason:'target-not-enemy' }`。
    自分自身（`targetId===attackerId`）も同拒否でよい。`nestTarget` は従来どおり攻撃可（任意破壊）。
  - テスト追加: `tests/unit/gameService.test.ts` に「隣接する自軍ユニットへの `AttackUnit` が `target-not-enemy` で拒否」ケース。
- [ ] **[軽微] 二桁以上の id でのソート順** — `src/application/turn/turnEngine.ts:20`（`.sort()`）/ `src/application/util.ts`（`minBy`）
  - 文字列辞書順のため、敵が10体以上になると `e10 < e2` となり「id 昇順=数値順」の意図とずれる。`ENEMY_COUNT=5`（`types-reference §5`）
    の現状は問題なし（`types-reference §6` も桁が揃う前提を明記）。将来 `ENEMY_COUNT` を二桁以上に上げる際は**ゼロ埋め採番**等で対処すること。
- [ ] **[軽微/好み] `dispatch` の到達不能 default** — `src/application/GameService.ts:88` `return cmd;`
  - exhaustive 後の `never` を返す形。型は通るが意味が曖昧。`assertNever(cmd)` か `{ ok:false, ... }` の方が意図が明確。
