# 20260621_012 予見可能性: アンドゥと敵相プレビューの実装（result）

- 実施日時: 2026-06-21 18:16 JST
- 使用モデル: GPT-5 Codex

## 実施内容

- `src/application/turn/turnEngine.ts`
  - 敵相処理を内部 `processEnemyPhase` に集約。
  - `simulateEnemyPhase(state): EnemyPhasePrediction` を追加。`structuredClone(state)` 上で処理し、元stateを変更しない。
  - `runEnemyPhaseAndAdvance` は同じコア処理を本stateへ適用し、従来どおり `emit` する。
  - `EnemyPhasePrediction` は敵ごとの `move` / `attack` / `wait`、被ダメ集計（player/pod/robots）、処理後の status/turn/phase を持つ。
- `src/application/GameService.ts`
  - `undo()` を追加。プレイヤー相の成功する `MoveUnit` / `AttackUnit` 適用直前に `GameState` スナップショットを積み、popで復元。
  - `EndTurn` でUndoスタックをクリア。
  - `previewEnemyPhase()` を追加し、現在stateから敵相試算を返す。
- UI
  - `CanvasRenderer.render(..., prediction)` で敵移動先ゴースト、攻撃予測リング、被ダメ数値を薄く重畳。
  - `Hud` に `Incoming HP -x / Pod -y` を追加。
  - `InputController` に `U` キーUndoを追加。Undoはドメインイベントを発生させないため、入力側から再描画コールバックを呼ぶ。
  - `main.ts` で描画ごとに `previewEnemyPhase()` を取得してCanvas/HUDへ渡す。

## テスト

- `tests/unit/turnEngine.test.ts`
  - `simulateEnemyPhase` が元stateを変更せず、実適用時の予測と一致することを確認。
- `tests/unit/gameService.test.ts`
  - 移動後 `undo()` で座標・移動力が戻ることを確認。
  - `EndTurn` 後は `undo()` が `false` になることを確認。
  - `previewEnemyPhase()` の複数回呼び出しが同一結果で、stateを変更しないことを確認。
- `tests/e2e/smoke.spec.ts`
  - HUDの敵相プレビュー表示（`Incoming HP`）と `U` キー入力後の基本表示維持を確認。

## 検証結果

- `npm run format:check`: pass
- `npm run lint`: pass
- `npm run build`: pass
- `npm run test`: pass（15 files / 91 tests）
- `npm run test:cov`: pass（All files 96.03%、application 93.83%、domain系 94%以上）
- `npm run e2e`: pass（chromium 1 test）

## 備考

- E2Eは軽量smokeとして「表示とUndoキー入力」を確認。実際に敵ゴーストのcanvasピクセル差分や、移動→Undo→別行動の詳細な視覚検証は未追加。
- 敵相の試算と適用は同一内部関数を使うため、乱数消費差や分岐差は現時点では発生しない。
