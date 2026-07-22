# retrace

OSS のコミット履歴を最初から順に、**差分 + LLM による意図の解説**付きで追体験する自分専用のローカル学習ツール。設計の正は [DESIGN.md](DESIGN.md)。

## クイックスタート

```bash
# 0. 前提: Node 20+ / git / gh(認証済み)
gh auth status

# 1. 題材 OSS を機械抽出(diff・tree・PR/issue 紐付け → data/ に JSON)
node generator/extract.mjs --repo nakabonne/ali
node generator/validate.mjs --repo nakabonne/ali

# 2. 章立てと解説の生成(Claude Code 内で)
#    → skill「retrace-generate」を実行。新規追加は「retrace-add-repo」で 1〜3 を一括実行

# 3. 閲覧
cd viewer && npm install && npm run dev
```

## 構成

| パス | 役割 |
|---|---|
| `generator/` | 機械抽出(Node 標準のみ・LLM 不使用・再開可能) |
| `data/<owner>__<repo>/` | 生成データ(git 管理外・再生成可能) |
| `.claude/` | ハーネス(skills / agents / rules / hooks)。LLM を使う工程はここ経由 |
| `viewer/` | Vite + React の静的 SPA。既読・再開位置は localStorage |
