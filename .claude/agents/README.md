# agents/ — プロジェクト固有サブエージェント

`<name>.md`(YAML frontmatter + システムプロンプト)。`description` を見て Claude が委譲を判断する。単一責務・最小権限 tools が原則。**追加は次回セッションから**有効。name はツリー全体(`~/.claude/agents/` 含む)で一意にすること — 衝突すると片方が黙って捨てられる。

新規作成はメタエージェント `agent-architect` に頼むのが楽。

frontmatter:
- `name`(必須・一意)/ `description`(必須・いつ起動するか+使わない場面)
- `tools`(省略時は全継承。必要最小限に絞る)
- `model`(`haiku` / `sonnet` / `opus` / `inherit`)
