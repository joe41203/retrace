# Asset inventory — retrace

retrace は公開 URL を持たないローカルツールのため、本番サイトの capture は行っていない。
ビジュアル基準は実在する LP-A（Terminal 案, `viewer/public/lp/a/index.html`）の HTML と、
その実表示スクリーンショット（ブラウザ撮影・記録用途）。

動画の主要ビジュアル（ターミナル風 diff・解説カード）は、拡大とアニメーションの自由度のため
動画内で HTML フレームとして**再構築**する。スクショはトーン・配色・実在感の照合用リファレンス。

## 実画面リファレンス（撮影済み・記録）

- LP-A ヒーロー — ダーク背景(#0a0e14) + うっすらグリッド、緑アクセント見出し
  「OSS を 最初のコミット から 読み解く、追体験ツール。」、CTA「リポジトリを選んで始める」、
  ターミナル風カード（信号機ドット + `retrace — nakabonne/ali · commit #6`）。
- LP-A ターミナル diff デモ — `$ retrace open nakabonne/ali --seq 6` / コメント行 / 「何を:」「なぜ:」
  の解説（amber ラベル）/ `- func Attack(...)`（赤）→ `+ func Attack(ctx context.Context, ...)`（緑）。
- LP-A THE PROBLEM — 「完成したコードは読める。でも『どう育ったか』は見えない。」+ 赤ラベルの課題カード3枚。
- RepoPicker（実アプリ `/`）— 収録リポジトリのカード一覧（ali/aconfig/httprouter/conc/kong/godotenv 等）、
  各カードに言語バッジ(Go・青ドット)・コミット数・進捗バー、上部に「前回の続きから」再開バナー。

## 配色トークン（tokens.json と一致）

- 背景: #0a0e14 / #0f151f / #070a0f、境界: #1c2530 / #2a3a4a
- 前景: #d6deeb / muted #7d8ba0 / dim #4a5568
- 緑(主アクセント): #3fb950 / bright #56d364、cyan: #39c5cf、amber(ラベル): #d29922、赤(del): #f85149
- フォント: JetBrains Mono（等幅・全面）

## ロゴ／マーク

- 専用ロゴ画像はなし。ワードマークは `>_ Retrace` + 点滅カーソル（緑の矩形）。動画でも同じ表現で扱う。
