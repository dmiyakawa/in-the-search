# 20260621_013 Phase 5: ロボット/資源の最小スライス（result）

- 実施日時: 2026-06-21 19:24 JST
- 使用モデル: GPT-5 Codex

## 実施内容

- `GameService.dispatch` の `GatherResource` を実装。
  - 自ユニットのみ採取可能。
  - `resourceAmount > 0` のタイルで `inventory.resource += GATHER_AMOUNT`、タイル資源を 0 にし、対象ユニットを `hasActed=true` にする。
  - `ResourceGathered` を emit。
  - 成功時はUndoスタックへ適用前stateを積む。
- `GameService.dispatch` の `BuildRobot` を実装。
  - プレイヤー本体が `GameState.pod.coord` 上にいる場合のみ建造可能。
  - `SCOUT_COST` を消費し、`HEX_DIRECTIONS` 順で最初の passable・in-bounds・空きタイルへ `scout` を配置。
  - id は既存ロボット数から `r0,r1,...` で採番。
  - 建造ターンのscoutは `movementLeft=0` / `hasActed=true`、プレイヤー本体も `hasActed=true`。
  - `RobotBuilt` と必要に応じて `FogRevealed` を emit。
  - 成功時はUndoスタックへ適用前stateを積む。
- UI入力を拡張。
  - `Tab`: 自ユニット切替。
  - 自ユニットをクリック: そのユニットを選択。
  - `G`: 選択中ユニットで資源採取。
  - `B`: scout建造。
  - 移動/攻撃は選択中ユニットで実行。
- HUD/Canvasを拡張。
  - HUDに選択中ユニットと移動力を表示。
  - Canvasに選択中ユニットのリング表示を追加。

## テスト

- `tests/unit/gameService.test.ts`
  - 採取成功、在庫加算、タイル枯渇、行動終了、イベントemit。
  - 資源なし拒否、行動済み拒否。
  - scout建造成功、コスト消費、pod外拒否、資源不足拒否、配置先スキップ、id採番。
- `tests/integration/phase5ResourceRobot.test.ts`
  - 採取→Undo→採取→ターン進行→scout建造→次ターンscout移動→遠方タイルの霧解放を `GameService` 駆動で確認。
- 既存E2E smokeはHUD文言変更後も成功。

## 検証結果

- `npm run format:check`: pass
- `npm run lint`: pass
- `npm run build`: pass
- `npm run test`: pass（16 files / 99 tests）
- `npm run test:cov`: pass（All files 96.79%、application 96.65%）
- `npm run e2e`: pass（chromium 1 test）

## 備考

- `npm run e2e` は完了まで約2.3分。Playwright webServer の `NO_COLOR` / `FORCE_COLOR` 警告が出たがテストは成功。
- UIはMVP最小操作としてキーボード中心（Tab/G/B）で実装。ボタンUIは未追加。
