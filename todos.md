# 作業リスト: マウス操作メニューと状況可視化（タスク `20260621_016`）

## 直近の状況

- 2026-06-21: MVP（Phase 0–8）は実装・テスト完了済み。六角マップ探索・霧・戦闘・勝敗・資源採取・scout 建造・
  アンドゥ・敵相プレビュー・Docker Compose（dev/web）・README・E2E まで通っている（後述「完了済み」要約）。
- 2026-06-21: 手動プレイで判明した UX 課題（採取/建造の可否や敵状況が画面から読み取れない）を受け、
  **タスク `20260621_016`「操作可能ユニット・行動選択肢の明示とマウス操作メニュー」**を最優先で着手する。
  設計は `design.md §12`（プレゼンテーション層を 12.1〜12.5 に詳細化）、UI 方式の確定は `decisions.md` D-17、
  敵 HP 遷移表示の将来論点は `tbd.md` G-11。リクエスト原文は `logs/20260621_016_mouse_menu.request.md`。
- 2026-06-21: タスク `20260621_016` の T-1〜T-8 を実装完了。`Selection`、左右情報パネル、行動メニュー、
  マス文脈クエリ、E2E UI フローを追加し、`npm run format:check && npm run lint && npm run build && npm run test &&
  npm run e2e` が green。
- 2026-06-21: タスク `20260621_017` として、攻撃可能な敵クリックは敵選択ではなく攻撃を優先するよう変更。
  プレイヤー攻撃と敵相プレビューを攻撃元→対象の矢印＋HP減少値で表示し、複数攻撃時のみ対象上に合計減少を併記する。
  `npm run format:check && npm run lint && npm run build && npm run test && npm run e2e` が green。
- 2026-06-21: タスク `20260621_018` として、プレイヤー側攻撃矢印と HP 減少表示を上方向へ持ち上げ、
  敵側攻撃予告矢印との重なりを軽減した。
- 確定済み方針（指示者判断）:
  - **UI は素の TS + DOM を継続**（フレームワーク非導入・D-17）。presentation を小モジュールに分割する。
  - **操作はハイブリッド**（design.md §12.5）。隣接の有効マスは移動/攻撃、行動対象でない空マスのクリックで選択解除。
- 直近の未コミット: タスク `20260621_018` の実装差分が未コミット。作業記録は
  `logs/20260621_018_attack_arrow_lane.result.md`。

## 本リストの読み方（実装担当エージェント向け・重要）

- 各タスクは **対象 / API / 要点 / テスト** で記す。**API のシグネチャと参照先の式・型をそのまま実装してよい**。
  関数本体の細部は要点を参考に書く。
- **早期停止ポリシー**（AGENTS.md）: 記述に矛盾がある・参照先と食い違う・このリストと保持コンテクストだけでは
  実装方法が一意に定まらない、と判断したら**実装を止めて論点を報告**すること。勝手な仕様補完はしない。
- 共有の前提:
  - hex の式・近傍・cube丸め・pixel変換・座標キー → **`docs/hex-reference.md`**。
  - 型・数値定数（HP/視界/コスト等）→ **`docs/types-reference.md`**（数値の出所は `rule.md §7.1`）。
  - ルールの正典 → **`docs/rule.md`**、設計意図 → **`design.md §12`**、確定決定 → `decisions.md`（特に D-17）。
  - 座標キーは必ず `key()/parseKey()` を使う。マジックナンバーは `types-reference §5` の定数を参照する。
- **境界の死守（D-03）**: presentation は `GameService` のスナップショット＋クエリの写像に徹し、ゲーム規則を持たない。
  選択状態（`own`/`enemy`/`none`）は presentation の UI 状態として保持し、`GameState` には入れない（design.md §12.2）。
- **カバレッジ閾値の対象は domain/application のみ（D-10）**。presentation の追加は E2E（Playwright）で担保し、
  純粋なクエリ追加（T-1）はユニットテストを書く。

---

## 完了済み: タスク `20260621_016`（実装順 T-1 → T-8）

> ゴール: 「自/敵ユニットの状況（HP・ターン終了時の HP 遷移・残行動）が常に画面で読め、
> 選択ユニットで可能な操作をマウスのメニューから決定でき、理屈上の可否とそのターンの可否を同時に表現する」。
> 既存のキーボード操作（G/B/U/E/矢印/Tab）は等価に維持する。

### [x] T-1: GameService に「マス文脈」クエリを追加（domain/application・ユニットテスト対象）

- 対象: `src/application/GameService.ts`
- API（既存 `canMove/canAttack/canGather/canBuildRobot/canEndTurn/canUndo` に**追加**。副作用なし・phase 非依存）:
  ```ts
  isOnResourceTile(unitId: string): boolean   // 選択ユニットの乗るタイルが resourceAmount>0
  isPlayerOnPod(): boolean                      // プレイヤー本体('player')の coord が pod.coord と一致
  ```
- 要点: 「理屈上できること（メニュー項目の**表示条件**）」を返す。`canGather`/`canBuildRobot` は「そのターン実際にできるか
  （**有効条件**）」。この2系統で design.md §12.4 の二重表現（表示する/有効にする）を作る。
  `isOnResourceTile` は `getTile(state.map, unit.coord)?.resourceAmount > 0`、ユニット不在なら false。
  `isPlayerOnPod` は `equals(player.coord, state.pod.coord)`（`player` 不在なら false）。
- テスト: `tests/unit/gameService.test.ts`。資源マス上のユニットで `isOnResourceTile=true`／資源 0 マスで false、
  pod 上のプレイヤーで `isPlayerOnPod=true`／pod 外で false。

### [x] T-2: 選択モデル（`Selection`）を presentation に導入（main.ts 配線）

- 対象: `src/main.ts`、（型は `src/presentation/CanvasRenderer.ts` か新規 `src/presentation/selection.ts` に置く）
- API:
  ```ts
  export type Selection = { kind: 'own' | 'enemy' | 'none'; id?: string };
  ```
- 要点: 既存の `selectedUnitId: string`（既定 `'player'`）を `Selection` に置換する。`main.ts` が `selection` を保持。
  - **normalize**: 毎描画前に整合を取る。`own` なら `id` が自ユニット（`isPlayerSide`）で実在することを保証し、
    失われていれば先頭自ユニットへ。`enemy` なら `id` の敵が実在かつ**そのタイルが `visible`** であることを保証し、
    外れたら `{ kind:'none' }` に戻す。`none` はそのまま。
  - `computeHudActions` 等は `selection.kind==='own' ? selection.id : undefined` を対象に算出する。
  - `render` / 情報パネル / `ActionMenu` に `selection` と `view` を渡す。
- テスト: ロジックは E2E（T-8）で担保。`main.ts` は薄く保つ。

### [x] T-3: InputController をハイブリッド入力へ（design.md §12.5）

- 対象: `src/presentation/InputController.ts`
- API 変更: コールバックを選択モデルへ拡張する。
  ```ts
  getSelection: () => Selection
  setSelection: (s: Selection) => void
  ```
  （現行 `getSelectedUnitId/setSelectedUnitId` を置換。`main.ts` 側も更新）
- 要点（onClick の優先順位・§12.5 の 1〜5）:
  1. クリック hex に**自ユニット**（`isPlayerSide` かつ coord 一致）→ `setSelection({kind:'own', id})`。
  2. クリック hex に**可視の敵**（`kind==='enemy'` かつ そのタイル `visibility==='visible'`）→ `setSelection({kind:'enemy', id})`。
  3. `own` 選択中で対象が**隣接の可視敵/巣**（`findVisibleTargetId` かつ距離1）→ `AttackUnit`。
  4. `own` 選択中で対象が**隣接の通行可タイル**（距離1・`passable`）→ `MoveUnit`。
  5. いずれでもない → `setSelection({kind:'none'})`。
  - 既存ヘルパ（`findVisibleTargetId`/`findPlayerSideUnitId`/`dispatchForTarget`）を流用する。
  - キーボードは現状維持（矢印/`Tab`/`G`/`B`/`U`/`E`）。`Tab` は `own` 選択を自ユニット間で回す。
    `G`/`B`/矢印 は `own` 選択中ユニット（無ければ先頭自ユニット）を対象にする。
- テスト: E2E（T-8）。クリック分岐は §12.5 表のとおり。

### [x] T-4: 自ユニット情報パネル（左下 DOM・design.md §12.3）

- 対象: 新規 `src/presentation/UnitListPanel.ts`、`index.html`（`#unit-panel` 追加）、CSS
- API 例:
  ```ts
  renderUnitList(
    root: HTMLElement,
    state: GameState,
    prediction: EnemyPhasePrediction | undefined,
    selection: Selection,
    actionsByUnit: (id: string) => HudActions   // 残行動の判定に使う
  ): void
  ```
- 要点: 自ユニット（`isPlayerSide`）の各行＋**ポッド行**を縦に並べる。各行に:
  - 種別/ID、現在 HP `hp/maxHp`。
  - **ターン終了時 HP 遷移**: `prediction.damage` を引いた値。player→`damage.player`、pod→`damage.pod`、
    robot→`damage.robots[id]`。引いた結果 ≤0 なら「DOWN」を明示。`prediction` 無し（won/lost 等）は遷移非表示。
  - **残行動**: 残移動力 `state.turnState.movementLeft[id]` と、移動以外の行動可否（`!hasActed[id]`）。
  - **枯渇表示**: 残移動力 0 かつ `hasActed[id]` の自ユニット行は CSS でグレーアウト（`.exhausted` 等）。
  - 行クリックで `own` 選択（`root` 側で `data-unit-id` を持たせ、main.ts が委譲ハンドラで `setSelection`）。
  - 選択中（`selection.kind==='own' && id` 一致）の行は強調。ポッド行はクリック対象外（選択不可）。
- テスト: ロジックは E2E（T-8）。任意で `renderUnitList` のユニットテスト（DOM 文字列/クラス）。

### [x] T-5: 敵ユニット情報パネル（右下 DOM・双方向強調・§12.3）

- 対象: 新規 `src/presentation/EnemyListPanel.ts`、`index.html`（`#enemy-panel` 追加）、CSS
- API 例: `renderEnemyList(root, state, selection): void`
- 要点: **可視タイル上の敵のみ**（`kind==='enemy'` かつ そのタイル `visibility==='visible'`）を列挙。各行に ID・現在 HP。
  **ターン終了時 HP 遷移は MVP では 0**（現在 HP のみ。理由は `tbd.md` G-11）。
  行クリックで `enemy` 選択。`selection.kind==='enemy' && id` 一致の行を強調（マップ側の強調＝T-6 と双方向で一致させる）。
- テスト: E2E（T-8）。可視敵クリック→該当行強調、マップの可視敵クリック→同じ行が強調。

### [x] T-6: 行動メニュー（DOM オーバーレイ・§12.4）

- 対象: 新規 `src/presentation/ActionMenu.ts`、`index.html`（`#action-menu` 追加）、CSS（不透明・`position:absolute`）
- API 例:
  ```ts
  renderActionMenu(
    root: HTMLElement,
    service: GameService,
    state: GameState,
    view: View,
    selection: Selection
  ): void
  ```
- 要点:
  - `selection.kind!=='own'` または `state.status!=='playing'` のときは**非表示**（`hidden`）。
  - 表示時、選択ユニットの **screen 座標**を `hexToPixel(unit.coord, view.size, view.origin)` で求め、**右上に少しオフセット**して配置。
  - 項目は design.md §12.4 の表に従う。**表示条件で出すか決め、有効条件で `disabled` を決める**:
    | 項目 | 表示条件 | 有効条件 | キー |
    |------|------|------|------|
    | Gather | `service.isOnResourceTile(id)` | `service.canGather(id)` | G |
    | Build scout | `service.isPlayerOnPod()`（id が `'player'`） | `service.canBuildRobot()` | B |
    | Attack | `service.canAttack(id)`（隣接対象がある＝理屈上も） | `service.canAttack(id)` | — |
    | End Turn | 常時 | `service.canEndTurn()` | E |
    | Undo | 常時 | `service.canUndo()` | U |
  - 各ボタン文言にショートカットを `(G)` 形式で併記。クリックで対応 dispatch/undo（キー操作と等価）→ 再描画。
    Gather/Build の対象は `unitId`。Build は `{type:'BuildRobot', robotKind:'scout'}`。
  - メニューはクリックを受けるので `pointer-events:auto`、Canvas は下層のまま（T-7 の CSS）。
- テスト: E2E（T-8）。資源マス上で Gather 表示＋有効、資源を持たず pod 上で Build 表示だが資源不足で `disabled` 等。

### [x] T-7: レイアウト/CSS と Canvas 選択強調（§12.1）

- 対象: `index.html`（または `src/style.css`）、`src/presentation/CanvasRenderer.ts`、`src/main.ts`
- 要点:
  - パネル/メニューの配置: `#hud`（既存・左上）、`#unit-panel`（左下）、`#enemy-panel`（右下）、`#action-menu`（オーバーレイ）。
    Canvas は最背面、UI は前面で `pointer-events`: パネル/メニューは `auto`、それ以外のオーバーレイ余白は `none`
    （マップクリックを塞がないこと）。
  - `CanvasRenderer.render` の選択強調を `Selection` 対応に拡張: `own` は自ユニット、`enemy` は敵ユニットにリングを描く
    （現状 `selectedUnitId` の自ユニットのみ→敵にも）。引数は `selectedUnitId?: string` を `selection?: Selection` へ変更可
    （呼び出し元 `main.ts` も更新）。
  - `main.ts` の `resize()`/`redraw()` で全パネル・メニューを再描画する（既存の `renderHud` と同様に毎回呼ぶ）。
- テスト: E2E（T-8）。UI がマップクリックを妨げない（移動が従来どおり成立する）こと。

### [x] T-8: テスト整備

- 対象: `tests/unit/gameService.test.ts`（T-1 のクエリ）、`tests/e2e/`（UI フロー）
- 要点（E2E・Playwright、`?seed=<固定>` か `?__scenario=win`）:
  - 自ユニットクリック→**行動メニュー表示**、空マスクリック→**メニュー非表示（none）**。
  - 資源マス到達後にメニューの **Gather が有効**、採掘で在庫が増える。
  - pod 上で資源不足のとき **Build が表示されるが無効（disabled）**。
  - 可視敵クリック→**右下パネルの該当行が強調**。
  - 行動枯渇した自ユニット行が**グレーアウト**。
  - 既存の「クリックで移動→ゴール勝利」E2E が**引き続き通る**（UI 追加で操作が壊れていない）。
- 完了基準: `npm run format:check && npm run lint && npm run build && npm run test && npm run e2e` が全て green。

---

## 完了済み（Phase 0–8 / MVP 本体）

実装・テスト済み。詳細仕様は実コード・`design.md`・`docs/types-reference.md`・各 `logs/2026062*_*.result.md` を正とする。

- **Phase 0（基盤）**: package/tsconfig/Vite/Vitest/Playwright/ESLint・Prettier・レイヤ骨格。
- **Phase 1（ドメイン）**: `domain/hex`・`domain/map`・`domain/units`・`domain/rules/{movement,fog,combat,victory}`。
- **Phase 2（サービス層）**: `GameState`/コマンド/イベント型・`util`（minBy/occupantAt）・敵AI・ターンエンジン・`GameService`。
- **Phase 3（インフラ）**: `SeededRng`（mulberry32）・`MapGenerator`（決定的生成+到達可能性保証）・`StoragePort`。
- **Phase 4（プレゼン/統合）**: `CanvasRenderer`・`InputController`・`Hud`・`main.ts` 統合（`?seed=` 再現対応）。
- **Phase 5（ロボット/資源）**: `GatherResource` / `BuildRobot`、`scout` 建造・操作・Tab 切替・G採取/B建造。
- **G-02 反映**: 可動ユニット/固定建造物の分離・ポッド破壊で敗北・重なり時の被弾宛先・敵優先度 player>pod>robot。
- **予見可能性（D-16）**: `simulateEnemyPhase`、`GameService.undo()` / `previewEnemyPhase()`、Canvas/HUD プレビュー、U キー Undo。
- **Phase 6（テスト整備）**: 通しプレイ・決定性ゴールデン・E2Eクリック勝利、カバレッジ 80%（domain/application）。
- **Phase 7（Docker Compose / デプロイ確認）**: `dev`/`web`（Apache 静的配信）、`deploy/`。profile は撤去し `docker compose up` で同時起動。
- **Phase 8（ドキュメント整備）**: README、rule/design/tbd 同期。
- **HUD 可視化の暫定実装（タスク `20260621_015` 相当）**: `Actions:` 行・採取/建造可否の true/false 表示（本タスク T-4〜T-6 で
  パネル/メニューへ発展させる。`canMove/canAttack/canGather/canBuildRobot/canEndTurn/canUndo` クエリは実装済みで T-1/T-6 が流用）。

> `tbd.md` の T-04・G-04・G-06・G-09・G-11 は暫定案のまま進行可能。
