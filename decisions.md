# 決定事項 (Architecture Decisions)

アーキテクチャレベルで実装に影響する決定を記録する。各エントリは軽量ADR形式
（背景 / 決定 / 根拠 / 影響）。未確定の論点は `tbd.md` を参照。

---

## D-01: 言語は TypeScript

- 背景: `docs/system.md` がクリーンアーキテクチャ・80%カバレッジ・結合/E2Eを要求。
- 決定: 実装言語は **TypeScript**。
- 根拠: ドメイン/サービス層を型で保護でき、層境界（インターフェース）を明示できる。
  vitest/Playwright/Vite と親和性が高い。
- 影響: ビルドに型チェックを含める。全層で型定義を整備。

## D-02: ビルド/開発サーバは Vite

- 背景: 全てJS/HTML層で完結、静的アセットとして Apache に配信する要求。
- 決定: **Vite** を採用。
- 根拠: vitest と統合容易、`vite build` で静的アセット（`dist/`）を生成でき本番要件に合致。
- 影響: 設定は `vite.config.ts`。E2Eはビルド/プレビュー or dev サーバに対して実行。

## D-03: クリーンアーキテクチャの層構成

- 背景: ゲームロジックとUIの分離（サービス層）が要求。
- 決定: **domain / application(サービス層) / infrastructure / presentation** の4層、依存は内向き。
- 根拠: ゲーム規則を domain の純粋関数に閉じ込め、UIは状態の写像に徹することで、
  ゲームデザイン拡張がUIに引きずられない。
- 影響: presentation は `GameService` だけに依存。domain は外部ライブラリ非依存・副作用なし。

## D-04: 六角座標系は pointy-top / axial(+cube)

- 背景: AGENTS.md が Hexagonal Point Top を指定。
- 決定: 内部座標は **axial `(q,r)`**、距離・回転は **cube** に変換して計算。pointy-top のピクセル変換式を使用。
- 根拠: axial は格納が簡潔、cube は距離・近傍計算が明快。実績ある定式（redblobgames 系）に準拠。
- 影響: `domain/hex` に純粋関数として集約し、ユニットテストで網羅。

## D-05: マップ描画は Canvas 2D（暫定確定）

- 背景: 多数の六角セルの描画とインタラクション。
- 決定: **Canvas 2D** で hex グリッドを描画、HUDはDOMオーバーレイ。
- 根拠: 多セル描画・再描画に有利。pixel↔hex 変換で入力を扱える。
- 影響: presentation層のみ。`tbd.md` T-02 で SVG 案と比較余地を残す。

## D-06: 決定的乱数（SeededRng）の全面採用

- 背景: テスト安定化・バグ再現・デバッグ容易化。
- 決定: マップ生成・敵AIなど確率的処理はすべて**注入された `SeededRng`** を経由する。
- 根拠: 同シードで局面を完全再現でき、結合テストとQAが安定する。
- 影響: domain/application は乱数を直接生成せず注入で受け取る（純粋性の維持）。

## D-07: ローカル本番相当確認は Apache(httpd) コンテナ（暫定確定）

- 背景: デプロイ先が Ubuntu 24.04 + Apache 2。
- 決定: Docker Compose に `dev`(Vite) と `web`(httpd:2.4 で `dist/` 配信) を用意し profiles で切替。
- 根拠: 本番（Apache）に近い静的配信をローカルで再現でき、乖離を早期に発見できる。
- 影響: Compose 構成・`deploy/` の設定例。`tbd.md` T-03 参照。

## D-08: GameState はシリアライズ可能な純データ

- 背景: セーブ/ロード・結合テスト・再現性。
- 決定: `GameState` を関数やクラスインスタンスを持たない**純データ**として設計。
- 根拠: スナップショット比較・永続化・再現が容易になり、サービス層の検証が単純化する。
- 影響: 振る舞いは domain/application の関数側に置き、状態はデータに保つ。
  ターン内の残移動力・行動済みは `turnState` として GameState 内に保持する。

## D-09: ドメインイベントの配信経路は subscribe に一本化

- 背景: `GameService.dispatch` の戻り値と `subscribe` の双方からイベントが流れると、敵相（プレイヤーの
  コマンドを伴わない自動進行）のイベントの扱いが曖昧になり、UI側で二重適用バグを招く。
- 決定: **全ドメインイベントは `subscribe` 経由でのみ配信**。`dispatch` の戻り値（`CommandResult`）は
  適用の**成否と拒否理由のみ**を返し、イベントは含めない。
- 根拠: 配信経路を単一化することで、敵相を含む全イベントを一貫した順序で扱え、重複適用を防げる。
- 影響: UIは subscribe で差分更新、または getState() で全体再描画する。`EndTurn` 起因の敵相イベントも
  すべて subscribe から流れる。

## D-10: カバレッジ閾値の対象範囲

- 背景: `docs/system.md` の「カバレッジ80%以上」をどの範囲に課すか。presentation を含めると E2E 分が
  Vitest のカバレッジに算入されず未達になりやすい。
- 決定: Vitest coverage の **include は `src/domain` と `src/application`**。閾値80%はこの範囲に強制する。
  `src/presentation`・`src/infrastructure` のアダプタは閾値対象外とし **E2E（Playwright）で担保**する。
- 根拠: ゲーム規則の中核（domain/application）を確実に高カバレッジで守りつつ、UI起因のCI赤化を避ける。
- 影響: `vitest.config.ts` の coverage include/exclude 設定。E2Eで presentation の主要経路を網羅する。

## D-11: 決定性の規律（生成・敵相・再試行）

- 背景: D-06 の「同シード→同結果」を、マップ生成のリトライや敵相の複数ユニット処理にまで一貫させる必要。
- 決定:
  - マップ生成の到達可能性リトライは **seed を派生させず同一 RNG ストリームを継続消費**し、上限超過時は
    決定的フォールバック（通路を彫る）を適用する。
  - 敵相は **`id` 昇順**で処理し、同距離の対象/方向は**近傍6方向の固定優先順位**でタイブレークする。
- 根拠: 「同シード・同コマンド列 → 同 GameState」をゴールデンテストで検証可能にする。
- 影響: MapGenerator・敵AI・結合テスト（決定性ゴールデンテスト）。
