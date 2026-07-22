---
name: retrace-generate
description: retrace の学習データに章立てと意図の解説を生成する。「retrace の解説を生成」「retrace のデータを作って」「<owner>/<repo> の解説を書いて」「章立てを作って」で発動。抽出済み JSON(data/<owner>__<repo>/)に chapters.json と各コミットの explanation を追記する。機械抽出だけ(diff/PR 取得)なら generator/extract.mjs を直接叩けばよく、このスキルは不要。
---

# retrace-generate — コミット履歴に「意図の解説」を付与する

抽出済みの retrace データ(`data/<owner>__<repo>/`)に対して、LLM でしか作れない2つを付与する:

1. **章立て**(`chapters.json`)— コミット列を意味のあるまとまりに分割する
2. **各コミットの意図の解説**(各 `commits/*.json` の `explanation`)— 何を/なぜ/読みどころ を根拠付きで書く

機械抽出(diff・tree・PR/issue 紐付け)は `generator/extract.mjs` の仕事で、このスキルはやらない。抽出済みデータが前提。

**このスキルの成否は解説の誠実さで決まる。** 憶測を事実として書いた瞬間に学習ツールとしての価値が消える。以下の「反ハルシネーション規律」は本スキルの中核であり、逸脱してはならない。

## 前提と入力

- 引数: `<owner>/<repo>`(例 `nakabonne/ali`)
- データセット ID は `<owner>__<repo>`、データは `data/<owner>__<repo>/`
- スキーマの正は `DESIGN.md`。フィールド名・型はそこから逸脱しない

## 手順

### 0. 抽出済みか確認(未抽出なら extract を実行)

`data/<owner>__<repo>/index.json` が無ければ先に機械抽出する:

```bash
node generator/extract.mjs --repo <owner>/<repo>
```

`gh` は認証済み前提。数百コミットで数分かかる。完了後 `node generator/validate.mjs --repo <owner>/<repo>` でスキーマ検証しておく。

### 1. 章立て(chapters.json)

`index.json` を読み、`entries[]` の `subject`(コミット件名)と `prNumber` の並びを俯瞰する。PR タイトルは各 `commits/*.json` の `pr.title` にある。これを**1回の判断**で 10〜25 章に分割する。

- 章の切れ目は「テーマの転換点」で引く(基盤構築 → 主要機能 → リファクタ → CI 整備 …)。コミット数の機械的な等分ではない
- 各章は連続する `seq` 範囲(`startSeq`〜`endSeq`)。範囲は隙間なく・重複なく全 `seq` を覆う(1 から mainlineCount まで)
- `summary` は日本語 1〜2 文。その時期に「何が起きたか」を具体的に(「初期化した」でなく「CLI の骨格と attacker の原型を作った」のように)

`data/<owner>__<repo>/chapters.json` を **DESIGN.md のスキーマ通り**に書く:

```json
{ "chapters": [
  { "id": 1, "title": "プロジェクトの立ち上げ", "summary": "…", "startSeq": 1, "endSeq": 18 }
] }
```

書いたら簡易検証: 章が seq を隙間なく覆っているか(先頭章の startSeq=1、末尾章の endSeq=mainlineCount、隣接章が連続)を目視で確認する。

### 2. 解説(各コミットの explanation)を sonnet サブエージェントに委譲

`explanation` が `null` のコミットだけを対象にする(再開可能性のため)。対象を**約10件ずつのバッチ**に分け、各バッチを1つの **`retrace-explainer` サブエージェント**(Agent ツール, `subagent_type: retrace-explainer`。定義 `.claude/agents/retrace-explainer.md` に規律・スキーマを内蔵)に委譲する。バッチは並列に投げてよい。retrace-explainer が未ロードのセッション(定義追加直後など)では、一般実行系 + `model: sonnet` で代替し、以下の指示と規律全文を渡す。

各サブエージェントへの指示に必ず含めるもの:

- 担当する **commit JSON の絶対パス一覧**(例 `data/nakabonne__ali/commits/0021-xxxxxxx.json` … 10件)
- 「各ファイルを読み、`explanation` フィールド(現在 `null`)を埋めて**同じファイルに書き戻せ**。他のフィールドは一切変更するな」
- **反ハルシネーション規律の全文**(下記)
- explanation のスキーマ(下記)
- 「書き戻したら、対象 JSON が正しい JSON のままか(パースできるか)を確認せよ」
  (なお `data/*/commits/*.json` への書き込みは PostToolUse フック `.claude/hooks/check-commit-json.mjs` でも自動検証され、壊れた書き込みは即座に指摘が返る)

サブエージェントが埋める `explanation` のスキーマ(DESIGN.md 準拠):

```json
{
  "what": "何をしたか(1〜3文、日本語)",
  "why": "なぜそうしたか。根拠があれば引用しつつ、なければ『おそらく〜』と推測を明示",
  "highlights": [{ "file": "attacker/attacker.go", "note": "読みどころの短い注記" }],
  "langNotes": [{ "topic": "goroutine", "note": "言語固有概念の短い解説(1〜3文)" }],
  "diagram": { "mermaid": "flowchart LR\n  A[\"CLI\"] --> B[\"attacker\"]", "caption": "図の1行説明" },
  "evidence": "pr | issue | message | inferred",
  "refs": [{ "type": "pr", "number": 12, "url": "…" }],
  "model": "claude-sonnet-5",
  "generatedAt": "<ISO8601>"
}
```

- `highlights` は 0〜3 件。diff の中で「まず読むべき箇所」を指す。無理に埋めない
- `langNotes` は 0〜4 件。**読者像: プログラミング歴10年・対象言語/フレームワークは初心者**(2026-07-22 ユーザー指定)。言語・フレームワーク・エコシステム固有のイディオム・API・慣習が**初登場する/重要な役割を果たす**コミットで、topic(概念名、コード上の呼び名)と note(1〜3文)を書く。一般的なプログラミング概念の初歩解説は書かない。該当なしは `[]`
- 解説は**可能な限り充実させる**。why は背景・設計判断まで踏み込む(2〜5文)。ただし充実の手段は根拠の深掘りであって推測の水増しではない(反ハルシネーション規律が優先)
- `refs` は根拠にしたリンク(PR / issue)。`inferred` の場合は空配列でよい
- `generatedAt` は生成時刻(ISO8601)
- **`diagram` は任意**。該当しないコミットは **`null`**(大多数はこれ)。次の「diagram の指針」に従う

#### diagram の指針(サブエージェントに渡す)

- **図が構造理解を実際に助けるコミットのみ**に付ける。目安は**全体の 1〜2 割**。アーキテクチャ変更・データフローの導入・状態遷移・コンポーネント間の新しい依存関係など。該当しなければ迷わず `null`
- 単なるファイル追加・バグ修正・リファクタ・依存更新には**付けない**(図が増えても理解は深まらない)
- 形式は **`flowchart` / `sequenceDiagram` を中心**に。**10 ノード以下**に収める
- **ラベルは必ずダブルクォートで囲む**(`A["CLI"]` のように)。Mermaid の構文エラー予防。角括弧の中に括弧・スペース・記号があっても壊れないようにする
- `caption` は図の 1 行説明(日本語)
- **図のために事実を捏造しない**。diff / PR / issue から読み取れる関係だけを図にする。存在しないコンポーネントや呼び出しを描かない。反ハルシネーション規律は diagram にも等しく適用される
- 図が正確でも「構造理解を助けない」なら不要。**無理に作らない**

### 3. index.json の hasExplanation を更新

全バッチ完了後、`explanation` を埋めたコミットに対応する `index.json` の `entries[].hasExplanation` を `true` にする。`node generator/validate.mjs --repo <owner>/<repo>` を実行し、`index.hasExplanation=true` の数と実 explanation 数が一致すること・スキーマ OK を確認する。

### 4. 中断・再開

途中で止まっても、再実行時は手順1で `chapters.json` の有無を見て未生成なら作り、手順2で `explanation: null` のものだけを再度バッチ委譲すればよい。既に埋まったものは対象外。**冪等**に設計されている。

## 反ハルシネーション規律(サブエージェントに必ず渡す・逸脱厳禁)

意図の解説は「もっともらしさ」でなく「根拠」で書く。根拠の強さに応じて `evidence` を選び、書き方を変える:

1. **PR がある**(`pr` が非 null)→ PR body / title を根拠に `why` を書く。`evidence: "pr"`。`refs` に PR リンク
2. **linked issue がある**(`linkedIssues` が非空)→ issue の記述を根拠にできる。`evidence: "issue"`。`refs` に issue リンク
   - PR と issue の両方があるときは、動機の根拠として強い方を選ぶ(通常は「なぜ」を語る issue、「何を」を語る PR。実態で判断)
3. **根拠がコミットメッセージのみ**(PR/issue なし、message は具体的)→ message を根拠に書く。`evidence: "message"`
4. **根拠なしの動機推測**(PR/issue/message いずれも動機を語らない)→ `why` は必ず **「おそらく」で始める**か推測と分かる形にする。`evidence: "inferred"`。**断定は禁止**

追加の規律:

- **`what`(何をしたか)は diff / files / tree という一次事実から書く**。ここは推測ではなく観察。ファイル・関数・型の増減を具体的に
- **`why`(なぜ)だけが推測を含みうる**。根拠がないのに「パフォーマンスのため」「ユーザー要望で」等と断定しない。分からなければ `inferred` で正直に「おそらく」と書く
- **日本語で書く。ただしコード識別子(関数名・型名・ファイルパス・パッケージ名)は原文のまま**訳さない
- PR body / issue body を引用するときは**捏造しない**。書かれていないことを「PR にこうある」と書かない
- diff にないコード・存在しないファイルに言及しない。`highlights` の `file` は必ずその commit の `files[]` か `tree` に実在するパスにする
- 誇張しない。「劇的に改善」「大幅な」等の評価語は、根拠(ベンチ結果が PR にある等)がある時だけ
- **`diagram` にも同じ規律が及ぶ**。図に描くノード・矢印は diff/PR/issue から読み取れる実在の関係だけ。存在しないコンポーネントや呼び出しを図示しない。確信が持てないなら `diagram: null`

この規律を守れているかは、後から `evidence` バッジと `refs` を突き合わせれば検証できる。`evidence: "pr"` なのに `refs` が空、`why` が断定なのに `evidence: "inferred"` といった不整合を作らないこと。

## 完了の定義

- `chapters.json` が存在し、seq を隙間なく覆っている
- 全コミットの `explanation` が埋まっている(`index.json` の全 `hasExplanation` が `true`)
- `validate.mjs` がスキーマ OK を返し、警告(index と実データの不整合)が無い
