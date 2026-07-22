# retrace

OSS のコミット履歴を最初から順に、**差分 + LLM による意図の解説**付きで追体験する自分専用のローカル学習ツール。設計の正は [DESIGN.md](DESIGN.md)。

## クイックスタート

```bash
# 前提: Node 20+ / git / gh(認証済み)。コマンド一覧は `make` で表示
make dev                            # 閲覧開始(初回は自動で npm install)

# 新しい題材 OSS を足すとき
make extract REPO=<owner>/<repo>    # 1. 機械抽出(diff・tree・PR/issue 紐付け)
make validate REPO=<owner>/<repo>   # 2. スキーマ検証
#                                     3. 章立て・解説生成は Claude Code 内で
#                                        skill「retrace-add-repo」が 1〜3 を一括実行
```

## 構成

| パス | 役割 |
|---|---|
| `generator/` | 機械抽出(Node 標準のみ・LLM 不使用・再開可能) |
| `data/<owner>__<repo>/` | 生成データ(git 管理。解説はトークンコストがかかるため保全) |
| `.claude/` | ハーネス(skills / agents / rules / hooks)。LLM を使う工程はここ経由 |
| `viewer/` | Vite + React の静的 SPA。既読・再開位置は localStorage |
