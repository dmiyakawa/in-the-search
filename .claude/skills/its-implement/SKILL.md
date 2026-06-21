---
name: its-implement
description: in-the-search（六角タイル探索ゲーム）の implement 工程を実行する。todos.md の作業リストに従って実装を進め、format/lint/build/test/test:cov/e2e を通し、失敗を修正する。「Phase N を実装して」「todos の○○を実装して」「作業リストに沿って進めて」「このタスクを実装して」「実装を進めましょう」のような依頼で必ず使うこと。記述が矛盾・不足して実装方法が一意に定まらないときは勝手に仕様を補完せず、早期停止して論点を報告する（早期停止ポリシー）。軽量モデルでの実行を前提に、読むコンテキストとスコープを絞る。
---

# its-implement: 実装工程

## この工程の役割

`todos.md` の個々のタスクを実装し、複数レイヤのテストを通す工程。
軽量モデルで安く回すことを前提とし、**読むコンテキストとスコープを意図的に絞る**。
広い設計判断は design 工程に委ねられているので、ここでは「書かれた段取りを正確に実装する」ことに集中する。

## 早期停止ポリシー（この工程の肝）

implement 担当は、**実装方法が一意に定まらないと判断したら、勝手に仕様を補完せず作業を止めて論点を報告する**。
止めるべき典型:

- todos.md / design.md / docs の記述どうしが矛盾している、または参照先と食い違う
- API シグネチャや参照（式・型・定数）が不足していて、保持コンテキストだけでは実装が一意に決まらない
- 完了条件（どうなれば「完了」か）が読み取れない

早期停止は欠陥ではなくこの工程の設計上の機能。止めて報告することが、誤実装による手戻りより安い。

## 進め方

### 1. 対象タスクと前提を絞り込む

- 対象 Phase / タスクと**タスクID**を確認する。`todos.md` の該当タスク（**対象 / API / 要点 / テスト / 完了 / 参照**）を読む。
- 参照に挙がっているものだけを読む。共有の前提:
  - hex の式・近傍・cube 丸め・pixel 変換・座標キー → **`docs/hex-reference.md`**
  - 型・数値定数（HP/視界/コスト等）→ **`docs/types-reference.md`**
  - ルール → **`docs/rule.md`**、設計意図 → `design.md`、確定決定 → `decisions.md`
- 全体を読み直さない。タスクが依存する Phase（例: domain → application → infrastructure → presentation の順）が未完なら、その点を報告する。

### 2. 実装する

- **API のシグネチャと参照先の式・型はそのまま実装してよい**。関数本体は要点の擬似コードに沿って書く。
- 座標キーは必ず `key()/parseKey()`、マジックナンバーは `types-reference §5` の定数を使う。
- 決定性の規律（D-11）: 乱数は注入 `SeededRng` のみ。生成リトライは seed を派生させず同一ストリーム継続。タイブレークは `id` 昇順 →`HEX_DIRECTIONS` の index 順。
- domain は純粋関数（入力不変・新オブジェクト返却）で、状態保持は application 層が担う、という層境界を崩さない。

### 3. テストを通す

`package.json` のスクリプトで、おおむね次の順に確認し、失敗を修正する:

```bash
npm run format        # 整形
npm run lint          # eslint
npm run format:check  # 整形差分がないこと
npm run build         # tsc --noEmit && vite build（型エラーもここで出る）
npm run test          # vitest
npm run test:cov      # カバレッジ（thresholds 80% / D-10）
npm run e2e           # playwright（presentation/統合に関わる場合）
```

- 新規ロジックにはタスクの「テスト」欄に沿ったユニットテストを `tests/` に追加する。
- カバレッジ閾値（lines/functions/branches/statements 80%）を割らないようにする。

### 4. 完了の記録

- `todos.md` の完了したタスクに**チェックを付ける**。冒頭「直近の状況」に今回の進捗と次の着手点を1〜数行で追記する。
- タスクIDがあれば `logs/<タスクID>_<slug>.result.md` に作業記録を残す。
  推奨構成: **指示概要 / 前提把握 / 実装内容（ファイル別）/ 動作確認結果（実行したコマンドと結果・カバレッジ）/ 設計との乖離・補足 / 次のステップ**。
  冒頭に実施日時と使用モデルを書く（共通規約は `its-design` の SKILL.md 末尾参照）。
- 設計と実装に乖離が生じた点（簡易実装・保留・仕様補足など）は乖離として明記し、review / consolidate に渡す。
