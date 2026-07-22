# retrace

<!-- このプロジェクトで作業する Claude への常設メモリ。毎セッション全文読み込まれる「助言」。
     強制したいルールは .claude/hooks/ と settings.json の hooks で担保する。 -->

## プロジェクト概要

- 種別: 自分専用ローカル学習ツール(OSS のコミット履歴を最初から順に LLM 解説付きで追体験する)。認証・ホスティングなし
- スタック: generator = Node 20+ 標準モジュールのみ(npm 依存なし)/ viewer = Vite + React + TypeScript(npm)
- 構成:
  - `generator/` — 機械抽出(clone→mainline→diff/tree/PR 紐付け→JSON)。**LLM は使わない**
  - `data/<owner>__<repo>/` — 生成データ(**git 管理**。解説の生成コスト保全のため。2026-07-22〜)
  - `.claude/skills/` — LLM を使うのはここだけ(章立て・解説生成)
  - `viewer/` — 静的 SPA。`data/` を fetch するだけ。進捗は localStorage
- **設計・データスキーマの正は `DESIGN.md`**。迷ったら DESIGN.md に従い、矛盾を見つけたら DESIGN.md 側を直してから実装を追従させる

## セットアップ・実行

```bash
make dev                            # ビューア起動(初回は自動 npm install。data/ も配信)
make extract REPO=<owner>/<repo>    # 機械抽出(再開可能・冪等)
make validate REPO=<owner>/<repo>   # スキーマ検証+統計
make test                           # generator のユニットテスト
make build / make fixture           # ビューアビルド / fixture 生成
```

(実体は Makefile 参照。生スクリプトは generator/*.mjs と viewer/ の npm scripts)

前提: `gh auth status` が通っていること(PR/issue 取得に使用)。

## タスク→資産の対応表

| 依頼 | 使うもの |
|---|---|
| 新しい OSS を題材に追加(「<owner>/<repo> を追加して」) | skill `retrace-add-repo` — **この対応は無条件。手動でコマンドを繋がない** |
| 章立て・解説の生成/再生成 | skill `retrace-generate` |
| 解説バッチの実行 | agent `retrace-explainer`(retrace-generate から委譲) |
| データスキーマの変更 | `rules/data-schema-sync.md` のチェックリストに従う |

## プロジェクト規約

- **常に論理単位で commit + push する**(Conventional Commits・日本語件名。ユーザー方針 2026-07-22)
- generator/ に LLM 依存の処理を入れない。決定的処理はスクリプトに落とす
- 解説の反ハルシネーション規律(evidence 4段階・推測は「おそらく」明示)の正は `.claude/skills/retrace-generate/SKILL.md`
- テスト(generator/lib.test.mjs)があるので generator 変更後は必ず実行する
- viewer に lint/format 設定は未導入。tsc(strict)がゲート。`npm run build` を通すこと

## マルチエージェント時の effort / model 方針

- 実装・設計・検証: opus / high(ユーザー方針)
- 探索・調査・解説バッチ: sonnet / low〜medium。解説バッチは agent `retrace-explainer`(sonnet)へ
- 独立した調査・生成は単一メッセージで並列 dispatch し、メインには結論だけ戻す

## 注意・ハマりどころ

- viewer の本番ビルド(`dist/`)は `data/` を含まない。閲覧は dev/preview サーバ前提(vite.config.ts の serveData ミドルウェアが repo ルート `data/` を配信)
- `.cache/` は git 管理外。`data/` は git 管理(解説生成後は忘れずコミットする)
- mainline は first-parent。コミット総数(GitHub API)と mainline 件数は一致しない(ali: 280 vs 202)
- 新規 agent / skill は原則次回セッションから有効(skill は同一セッション内で認識される場合もある)
- `.claude/commands/` に README や説明用 .md を置かない — **全 `*.md` がスラッシュコマンドとして登録される**(/README 事故の実績あり)。説明は skills/README.md か本ファイルに書く
