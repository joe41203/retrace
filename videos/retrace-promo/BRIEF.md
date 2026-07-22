---
workflow: product-launch-video
flow: automation
storyboard: yes
message: "OSS を最初のコミットから、diff と LLM 解説付きで追体験する"
destination: embed
aspect: 1920x1080
language: ja
audience: "コードを読んで学びたいエンジニア（OSS の設計が育つ過程を知りたい層）"
length: 30-45s
angle: "完成コードは読める。でも『どう育ったか』は見えない — retrace はそれを1コミットずつ追体験させる"
---

## Intent

retrace（OSS のコミット履歴を最初から順に LLM 解説付きで追体験する自分専用ローカル学習ツール）
の紹介動画。LP（`viewer/public/lp/`）のヒーロー付近に埋め込む前提。自動再生・ループ・ミュート想定
なので**音声ナレーションは入れない**（字幕・オンスクリーンテキストで伝える）。BGM は用意する。

トーンは LP-A（Terminal 案）の世界観に寄せる：ダークな端末風、等幅フォント、緑アクセント、
diff の add/del 配色。「静かに動く開発者のターミナル」の落ち着き＋知的な高揚感。

sell（promo）を主軸にしつつ、LP-A の実画面（ターミナル風 diff + 解説カード）という
"見せ場" も織り込むハイブリッド。

### 採用コンセプト: Commit Lane（ピッチ工程で選択）

retrace の核「最初のコミットから一本道で追体験」を、**画面を縦に流れる commit lane
（first-parent の一本道）**として見せる。各ノードで diff と「何を/なぜ」解説カードが
せり上がり、seq 1 → N へ視線が進む。ターミナルカード（信号機ドット +
`retrace — <owner>/<repo> · commit #N`）を象徴として使う。ループが自然に繋がる構成。

## Assets

- viewer/public/lp/a/index.html — LP-A（Terminal 案）。動画の配色・フォント・diff 表現の基準。
  実画面スクリーンショットを撮って「実際の画面」カットに使う候補。

## Customizations

- 字幕・テキストのみ（音声ナレーションなし）。LP 自動再生・ミュート・ループ前提。
- BGM を用意する（落ち着いた開発者向けの低刺激なトラック。LP 埋め込みで邪魔しない音量感）。
- 30〜45秒に凝縮。ループしても不自然でない構成（終端 → 冒頭が繋がる意識）。

## Notes

- retrace は公開 URL のないローカルツール。capture 対象の本番サイトはない。
  ビジュアル基準は実在する LP-A の HTML（no-capture パス + LP スクショ）。
- 収録リポジトリ例: nakabonne/ali, alecthomas/kong, julienschmidt/httprouter,
  cristalhq/aconfig, sourcegraph/conc, joho/godotenv（Go 中心・7リポジトリ・1,500+コミット）。
- 反ハルシネーション: 誇張しない。retrace は「LLM が解説を書く」ツールであって
  「AI がコードを書く」ツールではない点を取り違えない。
