# skills/ — プロジェクト固有スキル

`<name>/SKILL.md` を作ると `/<name>` で呼べ、`description` が合致すれば Claude が自動で読み込む。**呼ばれた時だけ**本文が読まれるので、長い手順を置いても普段の context を食わない。

このリポジトリの現役スキル:

| skill | 役割 |
|---|---|
| `retrace-add-repo` | 新規 OSS 題材の追加パイプライン一括実行(抽出→検証→解説生成→閲覧) |
| `retrace-generate` | 抽出済みデータへの章立て・解説生成(LLM を使う唯一の工程) |

frontmatter:
- `description`(必須・トリガー条件。使わない場面も書く)
- `disable-model-invocation: true`(自動起動を止め手動 `/<name>` 専用に)

`<name>/` には `scripts/`(決定的処理)や `references/`(かさばる資料)も置ける。
