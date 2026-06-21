# 20260621_012 予見可能性: アンドゥと敵相プレビューの実装（implement）

## 概要・目的

決定的予見可能ポリシー（`decisions.md` D-13・`rule.md §7.2`）を**操作面で実現**する。プレイヤーがそのターンの行動を確定する前に、
そのターンの敵の行動と結果まで予見でき、行動を修正（アンドゥ）できる状態を MVP 最終目標として整える。確定方針は
`decisions.md` **D-16**、設計は `design.md` §6.1・§7。`its-implement` 工程として実施する。

## 依存（重要）

- **`20260621_011`（G-02 反映: ポッド/敗北モデル）の完了を前提とする。** 敵相の被ダメ宛先（プレイヤーがポッドに重なっていれば
  ポッドHPへ）が**試算（プレビュー）にも反映**されるため、先に 011 を入れてから着手すること（順序を守らないと二度手間・不整合）。
  011 未完なら本タスクは着手せず停止して報告する。

## 作業対象（todos.md の該当セクションが一次指示）

**`todos.md` の「予見可能性タスク: アンドゥと敵相プレビュー（MVP最終目標・`decisions.md` D-16）」を正典の作業リストとする。**
実施順（todos.md 記載どおり）:

1. **敵相を「試算（純・emit なし）」と「適用（emit あり）」に分離** — `src/application/turn/turnEngine.ts`
   - `simulateEnemyPhase(state): EnemyPhasePrediction`（副作用なし・clone 上で予測のみ返す）を抽出。適用版はその結果を使って
     state 更新＋emit。**試算と適用の結果が一致**することを担保（決定性 D-06/D-11）。
2. **`GameService.undo()`** — プレイヤー相のコマンド適用直前に `structuredClone(state)` をスタックへ push、`undo()` で pop 復元、
   EndTurn（敵相開始）でスタックをクリア。Command 体系は増やさない（UI 操作）。
3. **`GameService.previewEnemyPhase()`** — 現 state から `simulateEnemyPhase` を呼び予測を返す（state 不変）。
4. **UI: 敵相プレビュー描画と Undo 操作** — `src/presentation/{CanvasRenderer,InputController,Hud}.ts`。暫定移動/アンドゥのたびに
   再試算して敵の移動先（ゴースト）・被ダメ予測を薄く重畳。Undo はキー（例 `U`）かボタン。表示粒度は実装時調整（D-16）。

## 前提・参照（読むべき正典）

- 確定決定: `decisions.md` **D-16**・D-13（予見可能ポリシー）・D-08（純データ）・D-09（emit は subscribe 一本化）・D-11（決定性）。
- 設計: `design.md` **§6.1**（アンドゥ/プレビュー）・§7（`undo()` / `previewEnemyPhase()` の I/F）・§11（敵AI）・§15。
- ルール: `docs/rule.md` §7.2（決定的予見可能性）。

## 完了条件

- todos.md「予見可能性タスク」の各チェックを満たし、ユニットテストを追加:
  - `simulateEnemyPhase` の予測 == 適用後の state 差分（一致・決定的）。
  - 移動→`undo()` で座標・移動力が直前へ復帰／EndTurn 後はスタック空で `undo()` が `false`。
  - `previewEnemyPhase()` は同一 state で複数回呼んでも同結果（純粋）。
- E2E（Phase 6 と整合）で「移動→敵プレビュー表示→Undo で戻る→別行動」を確認（最低1本）。
- `npm run format:check` / `lint` / `build` / `test` / `test:cov`（80%・D-10）/ `e2e` が全て green。
- 完了後 todos.md の該当チェック更新・「直近の状況」最新化。

## 進め方の注意（early-stop ポリシー）

- 「試算と適用の一致」が崩れる実装（試算が乱数を別途消費する等）は決定性違反。`simulateEnemyPhase` は state を変更せず、
  乱数を使う場合も適用側と同一の引き方になるよう設計する。一意に定められない場合は**停止して報告**。
- アンドゥのスコープは**プレイヤー相内のみ**（敵相をまたがない）。EndTurn でのクリアを忘れない。
- 作業記録は `logs/20260621_012_impl_foreseeability.result.md` に残す（冒頭に実施日時・使用モデル）。
