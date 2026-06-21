# 作業記録: 複数攻撃矢印と Undo 逆順表示（タスク `20260621_021`）

- 実施日時: 2026-06-21
- 使用モデル: GPT-5 Codex
- 作業カテゴリ: implement

## 指示の要旨

- 複数のユニットで一つの敵ユニットを攻撃予定とした場合、そのすべてのユニットから矢印が伸びている必要がある。
- 右下パネルの HP 減は減少の合計を表す。
- Undo においても描画は指示と逆順で巻き戻るのが期待動作。

## 実装内容

- `main.ts` のプレイヤー攻撃表示状態を単一 `AttackIndicator` から `AttackIndicator[]` に変更。
- 攻撃実行ごとに表示履歴へ追加し、Undo 成功時は末尾 1 件だけを削除するようにした。
- `CanvasRenderer` はプレイヤー攻撃履歴の矢印をすべて描画するようにした。
- `EnemyListPanel` は同一敵への攻撃履歴を集計し、右下 HP 遷移を合計ダメージで表示するようにした。
- E2E 用に `?__scenario=ui-multi-attack&__test=1` を追加し、player + scout が同一敵を攻撃するケースを検証。
- E2E で、2 本の攻撃後に `HP 3/4 -> 0/4` と撃破予定が表示され、Undo 1 回で `HP 3/4 -> 1/4`、さらに Undo で `HP 3/4` に戻ることを確認。
- `design.md` と `todos.md` を実装後の挙動へ追従更新。

## 検証

- `npm run format:check`: pass
- `npm run lint`: pass
- `npm run build`: pass
- `npm run test`: pass
- `npm run e2e`: pass

## 状態

- 実装と検証は完了。
- 変更は未コミット。
