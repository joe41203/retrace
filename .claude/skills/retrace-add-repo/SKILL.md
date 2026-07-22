---
name: retrace-add-repo
description: 新しい OSS リポジトリを retrace の題材として追加する一連のパイプライン(規模確認→機械抽出→スキーマ検証→章立て・解説生成→閲覧開始)を一括実行する。「<owner>/<repo> を追加して」「新しい OSS を読みたい」「題材を増やして」「このリポジトリを retrace に入れて」で発動。既存データセットの解説だけ再生成するなら retrace-generate、機械抽出だけなら generator/extract.mjs 直接実行で足りるので、この skill は使わない。
---

# retrace-add-repo — 新規題材 OSS の追加パイプライン

引数: `<owner>/<repo>`(例: `nakabonne/ali`)。GitHub URL で渡されたら owner/repo に読み替える。未指定ならユーザーに確認する。

以下を番号順に実行する。**各ステップの完了判定を満たしてから次へ進む**。途中で失敗しても extract / 解説生成はどちらも再開可能・冪等なので、失敗ステップから再実行すればよい(迷ったら最後に成功したステップの次から再開)。

## 手順

### 0. 前提確認

```bash
gh auth status
```

完了判定: 認証済み。失敗したらユーザーに「`! gh auth login` を実行してください」と案内して停止する。

### 1. 規模と適性の確認

```bash
gh api "repos/<owner>/<repo>/commits?per_page=1" -i 2>/dev/null | grep -i '^link:'
```

`rel="last"` のページ番号 = 総コミット数。数値で分岐する:

- **〜3,000 件**: そのまま次へ
- **3,001〜10,000 件**: 抽出に時間がかかり解説バッチも多くなる旨を伝え、続行するか確認
- **10,001 件〜**: DESIGN.md の選定基準(初期から PR 駆動の中小規模 OSS)に反する。より小さい題材の検討を促す。それでもユーザーが続行を選んだら進む

言語や PR 文化の確認(`gh api repos/<owner>/<repo> --jq '{language, created_at}'`)も添えると判断材料になる。

### 2. 機械抽出

```bash
node generator/extract.mjs --repo <owner>/<repo>
```

完了判定: 終了コード 0、かつ `data/<owner>__<repo>/index.json` が存在すること。

### 3. スキーマ検証

```bash
node generator/validate.mjs --repo <owner>/<repo>
```

完了判定: エラー 0。mainline 件数・PR 紐付け率・diff 切り詰め件数をユーザーに報告する。

### 4. 章立て・解説の生成

retrace-generate skill(`.claude/skills/retrace-generate/SKILL.md`)を読み込んで、その手順に従い chapters.json と各コミットの explanation を生成する。**この読み込みは無条件**。「解説も生成しますか?」とユーザーに聞き直さない — この skill への依頼自体が生成の指示である。

完了判定: retrace-generate の手順が最後(hasExplanation 更新)まで完了。

### 5. 最終検証

```bash
node generator/validate.mjs --repo <owner>/<repo>
```

完了判定: エラー 0、かつ hasExplanation が全件 true。差分があれば retrace-generate の再開手順(explanation: null のみ再処理)で埋める。

### 6. 閲覧開始

```bash
cd viewer && npm run dev
```

(初回のみ先に `npm install`)。起動した URL をユーザーに案内し、ヘッダのデータセット切替に新しいリポジトリが現れることを確認して完了。

## 完了報告(全手順完了後にユーザーへ返す)

```
追加完了: <owner>/<repo>
- mainline: N 件(章: M 章) / PR 紐付け率: x% / diff 切り詰め: k 件
- evidence 内訳: pr=a, issue=b, message=c, inferred=d / diagram付き: e 件
- 閲覧: http://localhost:<port>(ヘッダのデータセット切替で選択)
```

## 使わない場面

- 既存データセットの解説の再生成・続きだけ → retrace-generate を直接使う
- ビューアを起動したいだけ → `cd viewer && npm run dev`
- 抽出結果の検証だけ → `node generator/validate.mjs --repo <owner>/<repo>`
