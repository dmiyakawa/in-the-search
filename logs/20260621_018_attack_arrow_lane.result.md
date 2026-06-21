# 作業記録: 攻撃矢印レーンの重なり軽減（タスク `20260621_018`）

- 実施日時: 2026-06-21
- 使用モデル: GPT-5 Codex
- 作業カテゴリ: implement

## 指示の要旨

自ユニットと敵ユニットの攻撃が同じターンで起こる際、双方の矢印位置が重なってしまうため、
自ユニット側から伸びる矢印と HP 減少表示をやや上に移動して重なりを避ける。

## 実装内容

- `CanvasRenderer` の攻撃矢印描画で、`side === 'player'` の `AttackIndicator` だけ画面上方向へ固定オフセットするようにした。
- `design.md` に、プレイヤー側攻撃矢印は敵側攻撃予告矢印と重なりにくいよう上方向へ持ち上げる旨を追記。

## 検証

- `npm run format:check`: pass
- `npm run lint`: pass
- `npm run build`: pass
- `npm run test`: pass
- `npm run e2e`: pass

## 状態

- 実装と検証は完了。
- 変更は未コミット。
