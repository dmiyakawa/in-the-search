# 作業記録: 攻撃後の敵 HP 遷移表示と Undo 表示クリア（タスク `20260621_019`）

- 実施日時: 2026-06-21
- 使用モデル: GPT-5 Codex
- 作業カテゴリ: implement

## 指示の要旨

- 自ユニットから敵ユニットへ攻撃した際、敵ステータスに HP 遷移の説明がなく、引き算後の結果だけが表示されている。
- その状態で Undo したときに、自ユニットからの矢印と HP 減少表示が残っている。

## 実装内容

- `EnemyListPanel` に直近プレイヤー攻撃 `AttackIndicator` を渡し、対象敵には `HP before/max -> after/max` を表示するようにした。
- `ActionMenu` の Undo ボタンと `InputController` の U キーで Undo 成功時に直近プレイヤー攻撃表示をクリアするようにした。
- `main.ts` で敵パネルへ直近攻撃状態を渡し、Undo クリアコールバックを接続した。
- `design.md` と `todos.md` を実装後の挙動へ追従更新。
- E2E に、攻撃後の敵 HP 遷移表示と Undo 後の表示復帰を追加。

## 検証

- `npm run format:check`: pass
- `npm run lint`: pass
- `npm run build`: pass
- `npm run test`: pass
- `npm run e2e`: pass

## 状態

- 実装と検証は完了。
- 変更は未コミット。
