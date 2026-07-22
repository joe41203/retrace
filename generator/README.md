# generator/

OSS リポジトリの mainline コミット履歴を機械抽出し、`data/<owner>__<repo>/` に JSON として焼くスクリプト群。**LLM は使わない**(章立て・解説の付与は `.claude/skills/retrace-generate/` の役割)。

依存は **Node 20+ 標準モジュール(動作確認は v26)+ `git` + `gh` CLI のみ**。npm パッケージは使わない。

## 前提

- `gh auth status` で GitHub CLI が認証済みであること(PR / issue の取得に使う)
- `git` が使えること

## 使い方

### 抽出

```bash
node generator/extract.mjs --repo <owner>/<repo> [--force]
```

- `.cache/repos/<owner>__<repo>` に clone(既存なら `git fetch` で更新)
- mainline(`git rev-list --reverse --first-parent <defaultBranch>`)を古い順に走査
- 各コミットについて diff / tree / files / PR 紐付け / linked issue を抽出し
  `data/<owner>__<repo>/commits/<seq4桁>-<sha7桁>.json` に出力
- `index.json` / `repo.json` を生成し、`data/datasets.json` を **upsert**(既存の他データセットは残す)

**再開可能**: 既存の `commits/*.json` はスキップする。`--force` で全件上書き。

例:

```bash
node generator/extract.mjs --repo nakabonne/ali
```

### 検証

```bash
node generator/validate.mjs --repo <owner>/<repo>
# データセット ID(ディレクトリ名)を直接指定することもできる:
node generator/validate.mjs --id <dataset-id>
```

DESIGN.md のスキーマに照らして全 JSON を検証し、統計(PR 紐付け率・linkedIssues 数・diffTruncated 数・explanation 数と evidence 内訳・data サイズ)を出力する。スキーマ違反があれば非ゼロ終了。`--id` は owner/repo と異なる命名(fixture 等)のディレクトリを検証する用。

### テスト

```bash
node --test generator/lib.test.mjs
```

`lib.mjs` の純粋関数(diff 切り詰め・ファイル名生成・引数パース)のユニットテスト。

## 出力の要点(詳細は DESIGN.md「データスキーマ」が正)

- `commits/*.json` の `explanation` は**必ず `null`**(スキルが後から埋める)
- diff は全体で **300KB または 4,000 行**を超えると、大きいファイルの hunk を
  `[retrace: このファイルの diff は省略されました]` に置換し `diffTruncated: true`
  (ファイルヘッダ `diff --git` / `---` / `+++` は残す)
- root コミットは空ツリー(`4b825dc…`)との diff
- rename / copy は `-M` 検出。`files[].oldPath` に旧パスを記録
- binary ファイル(numstat が `-`)は `files[].binary: true`、additions/deletions は 0
- PR は `commits/{sha}/pulls` の先頭 1 件。PR body 中の `#n` から issue を最大 3 件取得
  (レスポンスに `pull_request` があるものは PR なのでスキップ)。403/429 は指数バックオフでリトライ

## ファイル

| ファイル | 役割 |
|---|---|
| `extract.mjs` | 機械抽出の本体(CLI) |
| `validate.mjs` | スキーマ検証・統計出力(CLI) |
| `lib.mjs` | 共有ユーティリティ(git/gh 実行・diff 切り詰め等) |
| `lib.test.mjs` | `lib.mjs` の純粋関数テスト |
