# 作業記録: 20260621_004 開発サイクル工程のスキル化

実施日時: 2026-06-21 11:19 JST / 使用モデル: Claude Opus 4.8

## 指示概要

AGENTS.md に記載された開発サイクルの工程 **design / implement / review / consolidate** を、Claude Code のスキルとして整備する。
`skill-creator` スキルが順当なら使用してよい、との指示。

## 方針

- これらは出力が主観的な「プロセス系」スキルのため、skill-creator の**スキル構造・記述原則**に従って作成し、
  定量ベンチマーク / eval ループ（subagent 並列実行）は本用途に過剰として省いた（本プロジェクト自体のコスト最小化方針とも整合）。
- スキル名は組み込みの `/review`・`/init` との衝突を避けるため、ユーザー確認のうえ **`its-` プレフィックス**（in-the-search 由来）を採用。

## 成果物

`.claude/skills/` 配下にプロジェクトスキルを 4 件新設（各 `SKILL.md`）:

- `its-design` … design.md / todos.md の作成・更新、必要に応じ tbd.md・decisions.md 更新。todos.md を軽量モデルが早期停止せず実装できる粒度で書くことを主眼に。実装可能性検証のための軽量サブエージェント起動にも言及。
- `its-implement` … todos.md に沿った実装と format/lint/build/test/test:cov/e2e の実行・修正。**早期停止ポリシー**を前面に。読むコンテキストとスコープを絞る指針。
- `its-review` … 実装を design.md / docs/rule.md / decisions.md / todos.md 完了条件に照らして確認。指摘を重大度別に、乖離は consolidate へ引き継ぐ。
- `its-consolidate` … design.md / todos.md をソースと突き合わせて整頓。完了タスクのチェック、直近の状況の最新化、再設計はしない（design / tbd へ送る）。

各スキルに共通の規約として、タスクID（`YYYYMMDD_NNN`）採番と `logs/<タスクID>_<slug>.result.md` への作業記録（冒頭に実施日時・モデル）を組み込み、`its-design` の SKILL.md 末尾に「作業記録の共通規約」を集約して他3スキルから参照させる構成にした。

## 設計上の判断・補足

- 4 工程を 1 スキルのモード切替ではなく**独立した 4 スキル**にした。AGENTS.md が各工程に異なるモデル規模（design > review > implement、consolidate は整頓）を想定しており、工程ごとに別個に起動できる方が運用方針に合うため。
- description は triggering を意識し、日本語の代表的な依頼フレーズを列挙。
- スキル本文は AGENTS.md の方針に加え、実ファイル（design.md / todos.md の様式「対象/API/要点/テスト/完了/参照」、decisions.md の D-11 決定性規律・D-10 カバレッジ閾値、package.json の npm スクリプト、record-guideline.md の作業記録規約）に沿わせた。

## 動作確認

- 4 スキルとも Skill ツールの利用可能一覧に登録されたことを system-reminder で確認（frontmatter は正常にパースされている）。

## 次のステップ（任意）

- 実運用で各工程を起動し、todos.md の粒度や早期停止判断が想定どおり機能するか確認。必要なら skill-creator の description 最適化ループで triggering を調整する。
