# 20260621_014 todos.md 残タスク実施（result）

- 実施日時: 2026-06-21 19:34 JST
- 使用モデル: GPT-5 Codex

## 実施内容

- Phase 6（テスト整備）を実施。
  - `tests/integration/playthrough.test.ts` を追加し、ゴール到達勝利とプレイヤー死亡敗北を `GameService` 駆動で検証。
  - `tests/integration/determinism.test.ts` を追加し、同 seed・同コマンド列で同一 `GameState` になることを検証。
  - `tests/e2e/smoke.spec.ts` にCanvasクリックでゴール到達勝利するE2Eを追加。
  - E2E安定化用に `?__scenario=win&__test=1` のテスト専用シナリオと `window.__ITS_TEST__` の最小フックを追加。
- レビュー軽微指摘を対応。
  - `idRank` / `compareRank` を追加し、敵ID処理順と `enemyAi` の同順位ID比較を自然順（例: `e2 < e10`）に更新。
  - `GameService.dispatch` の到達不能 default を `assertNever(cmd)` に変更。
- Phase 8（ドキュメント整備）を実施。
  - `README.md` を追加し、概要、起動、操作、Docker Compose、テスト手順を記載。
  - `docs/rule.md` に `scout` 建造後の配置・次ターン操作を補足。
  - `design.md` に実装済みUI操作、HUD表示、E2Eテスト専用シナリオを反映。
  - `tbd.md` の関連決定番号誤記（D-15 → D-14）を修正。
- `todos.md` の残チェックを更新。

## 検証結果

- `npm run format:check`: pass
- `npm run lint`: pass
- `npm run build`: pass
- `npm run test`: pass（18 files / 104 tests）
- `npm run test:cov`: pass（All files 96.63%、application 96.16%）
- `npm run e2e`: pass（chromium 2 tests）

## 備考

- `npm run e2e` は完了まで約2.3分。Playwright webServer の `NO_COLOR` / `FORCE_COLOR` 警告が出たがテストは成功。
- Phase 4 の手動確認項目は、既存の指示者によるwebコンテナ勝利確認に加え、今回の自動テストで死亡敗北・ポッド破壊敗北・
  予見/Undo・Canvasクリック勝利を補完したため完了扱いにした。
