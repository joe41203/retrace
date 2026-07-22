---
format: 1920x1080
duration: 40s
message: "OSS を最初のコミットから、diff と LLM 解説付きで追体験する"
arc: Hook → Problem → Solution → Proof(Commit Lane) → Library → CTA
audience: "コードを読んで学びたいエンジニア（OSS の設計が育つ過程を知りたい層）"
mode: collaborative
music: calm minimal developer underscore — low, unobtrusive, loopable; muted-friendly (LP 埋め込み・自動再生)
---

## Video direction

この動画は**ナレーションなしの字幕動画**。reveal のペーシングは "spoken cue" ではなく
**「オンスクリーンテキストの読み順（視線が要素を追う順）」**に合わせる。front-load 厳禁：
t=0 では最初に読む1要素だけを出し、以降の行・カード・ノードは読み順に沿って後半 ~50% に配分する。

- **palette system**（frame.md 由来・dark-first）: 地は常に navy `#0a0e14` ＋ うっすら緑グリッド。
  文字は cream `#d6deeb`（弱い文字 muted `#7d8ba0` / dim `#4a5568`）。主 voltage = **緑 `#3fb950`/`#56d364`**
  （retrace の名・CTA・進捗・diff の +追加行）。診断色は役割固定: amber `#d29922`=「何を/なぜ/読みどころ」ラベル、
  cyan `#39c5cf`=メタ（sha・ファイル数）、red `#f85149`=diff の -削除行・課題。緑以外の accent を主役にしない。
- **motion grammar + reveal model**: 長い尾を引く decel（`power3` 既定・smooth over bouncy、overshoot 禁止）。
  各要素は読み順に**逐次 reveal**（per-word staggered reveal / cluster→outward / count-up / type-on）。
  hold 中に許すのは低振幅 **subtle jitter**（`sine-wave-loop` 低振幅）とキャレット点滅（`context-sensitive-cursor`）のみ。
  lazy breathing・後半の pan/push 禁止。全編で1つのターミナル的トーンを保つ。
- **rhythm / held-frame allocation**: 見せ場 Frame 4（Commit Lane）は"流れ続ける"動きが主役、
  Frame 3（Solution）と Frame 5 の後半・Frame 7 は**意図的な hold（breather）**。忙しさを均一にしない。
  Frame 4 の commit lane は一定速度の縦スクロール（一本道が流れる）＝ズームやカメラ酔いを避けた素直な並進。
- **negative list**: 明るい SaaS 風・白背景・丸アバター・ポップ効果音・紫青の "AI" グラデ・ボケ玉は使わない。
  モーション失敗の両極（slideshow=front-load して凍る / screensaver=全要素が独立に漂う）を禁止。
  誇張しない（retrace は「LLM が解説を書く」ツール。「AI がコードを書く」ではない）。
- **caption band**: 字幕は無効化（音声なし）だが下 ~17% は空けて重心を上 83% に置く（LP 埋め込みでの下端安定）。

### v2 ダイナミック強化（2026-07-23 追記・要望反映）

上品な土台は保ちつつ、テンポとカメラワークを1段引き上げる。retrace の世界観（ダーク端末・緑・
JetBrains Mono）と seek-safe 規律（fromTo・paused GSAP・no repeat/yoyo・no random/wall-clock・
CSS animation 不可）は厳守。以下を各フレームに効かせる:

- **カメラワークを足す**: フレーム root（または .stage）に軽い push-in / pull-back / 横スライドを
  1フレームにつき1つ入れて"生きた画"にする（`multi-phase-camera` 系。振幅は控えめ・power3。ただし
  カメラ酔い回避のため後半 ~40% で新たな push を始めない＝doctrine 準拠）。Frame 4 の commit lane は
  従来の等速縦スクロールに、最後 seq 6 へ寄る軽い zoom-to-target を足して締める。
- **reveal のテンポUP**: 各 reveal の到達を少し速く・キレよく（entrance は `expo.out`/`power4.out` 可、
  overshoot は依然禁止）。要素間の stagger を詰めて"畳みかける"。ただし front-load はしない
  （読み順は維持、間を詰めるだけ）。
- **diff / コードのタイピング演出を強調**: Frame 1 の `git log --reverse`、Frame 5 の diff（- 旧 → + 新）は
  カーソル付き type-on を"見える速さ"でキビキビ。行確定時に軽いフラッシュ（`asr-keyword-glow` 短い envelope）。
- **ノード点灯にリズム**: Frame 4/6 の各ノード・カードの着地に、着地の瞬間だけ短い発光（bloom）を重ねて
  "点いた"感を出す（finite tween）。
- **見せ場を持ち上げる**: Frame 4（Commit Lane）と Frame 5（解説）は本動画のピーク。ここは動きの密度を
  最も高くしてよい（lane の流速に緩急、diff の畳みかけ、寄りで締める）。
- 依然 **禁止**: bouncy/overshoot 既定、lazy breathing、全要素の独立ドリフト、repeat/yoyo、無限モーション、
  Math.random/Date.now。「ダイナミック」は"速さと締まり"であって"うるささ"ではない。

## Frame 1 — Hook: git log --reverse

- scene: 暗いターミナルに `$ git log --reverse` がライブでタイプされ、キャレット点滅から `>_ Retrace` のワードマークへ切り替わる
- duration: 5s
- poster: 3.5s
- transition_in: cut
- status: animated
- voiceover: ""
- src: compositions/frames/01-hook.html
- type: hook
- persuasion: Direct address（開発者の日常動作＝git log をそのまま入口にする）
- beat: curiosity
- blueprint: typewriter-reveal (Reproduce)
- focal: なし（純タイポ）
- roles: —

オンスクリーン: `$ git log --reverse` がタイプされ、続けて `# 最初のコミットから、順に。` がコメント色(dim)で現れる。
一拍おいて全体が緑の `>_ Retrace` ワードマーク（点滅カーソル）に収束。音なしで「これは開発者のためのツールだ」を最初の1秒で掴ませる。
narrativeRole: 開発者の手癖（git log）を入口にして引き込む。冒頭3〜5秒で1つの緊張＝好奇心。
keyMessage: retrace は「最初のコミットから順に読む」ツール。

Reproduce: typewriter-reveal の signature（type-on → collapse → brand pop）をそのまま。confirmed sketch のレイアウト維持。
Scene 1 (0.0–1.8s): navy 地＋緑グリッドのみ。中央左に `$` (緑) が点り、`git log --reverse` が **type-on with caret**（`discrete-text-sequence` + `context-sensitive-cursor` 緑キャレット点滅）で1文字ずつ。他は何も出さない。Centered、~55% 幅。
Scene 2 (1.8–2.8s): コマンド確定の直後、下に `# 最初のコミットから、順に。` が dim で **per-word staggered reveal**（`dynamic-content-sequencing`, power3）。コマンド行はそのまま静止。
Scene 3 (2.8–5.0s): コマンド＋コメントが素早く上へ退き（velocity-matched、`cut-catalog.md` inverse zoom-through 系の軽い並進）、`>_ Retrace`（緑・大）が **spring-pop entrance**（`spring-pop-entrance`, 長い尾の settle・overshoot なし）で着地、末尾に点滅キャレット。以後 hold、キャレット点滅のみ。

## Frame 2 — Problem: 完成コードは読める、でも育ち方は見えない

- scene: 中央に完成した Go の関数ブロックが静止。「読める」→しかし履歴（育ち方）はグレーアウトして霞み、「どう育ったか」だけが赤く残る
- duration: 6s
- transition_in: zoom-through
- status: animated
- voiceover: ""
- src: compositions/frames/02-problem.html
- type: pain_point
- persuasion: Negative contrast（最新コードは読める／プロセスは見えない、の対比）
- beat: frustration
- blueprint: kinetic-type-beats (Reproduce)
- focal: なし（純タイポ＋カード）
- roles: —

オンスクリーン（ビートで順に）: 「完成したコードは読める。」→「でも "どう育ったか" は見えない。」→
小さく3つの失敗パターンが刻む「git log を追っても」「完成品から逆算しても」「写経しても」。最後の「見えない。」を赤(#f85149)で強調。
narrativeRole: 視聴者の痛み（プロセスが履歴に埋もれる）を言語化。retrace はまだ出さない。
keyMessage: 完成品からは「なぜその設計になったか」が辿れない。

Reproduce: kinetic-type-beats の signature（statement がビートで build しつつ payoff 語を強調）。confirmed sketch のレイアウト維持。
Scene 1 (0.0–1.0s): navy 地。上に kicker `THE PROBLEM`（dim・トラッキング広め）が **per-word staggered reveal**、続いて1行目「完成したコードは読める。」が chunk 単位で reveal。「読める」は最初 cream、直後に dim へ velocity-matched に沈む（`css-marker-patterns` 不要、色 tween）。
Scene 2 (1.0–2.4s): 2行目「でも "どう育ったか" は」が **hard-cut / per-word reveal** で刻み、最後に「見えない。」が赤 `#f85149` で **kinetic beat-slam**（`kinetic-beat-slam`, power3・overshoot なし）＋ **keyword glow**（`asr-keyword-glow` 赤・控えめ）。
Scene 3 (2.4–4.6s): 見出しはそのまま、下に失敗カード3枚が**左→右で逐次** `cluster→outward` ではなく順次フェード＆上げ（`dynamic-content-sequencing`, stagger, power3）。各カードの赤ラベル → 本文の順で読ませる。
Scene 4 (4.6–6.0s): 全要素 resolved、hold。赤の「見えない。」に低振幅 subtle jitter（`sine-wave-loop` 低）だけ残す。pan/push なし。

## Frame 3 — Solution: 1コミットずつ、意図ごと

- scene: 課題の霞が晴れ、ターミナルカード（信号機ドット + `retrace — nakabonne/ali · commit #6`）が一枚せり上がる。retrace の一行定義が落ち着いて着地
- duration: 5s
- transition_in: blur-crossfade
- status: animated
- voiceover: ""
- src: compositions/frames/03-solution.html
- type: product_intro
- persuasion: Friction reduction（機械抽出＝diff/tree/PR に、LLM 解説を重ねるだけ）
- beat: clarity
- blueprint: titlecard-reveal (Reproduce)
- focal: ターミナルカード（信号機ドット＋パス）
- roles: ターミナルカード = 主役サーフェス

オンスクリーン: `>_ Retrace` の下に「機械抽出した diff・ツリー・PR に、LLM が書いた意図の解説を重ねる。」
その下に「1コミットずつ、"何を・なぜ・読みどころ" を辿る。」緑アクセントは1点（retrace の名）に集約。
narrativeRole: 痛みへの解＝retrace を静かに提示。決定的抽出と意図の言語化を分離、という設計思想を一言で。
keyMessage: retrace = 機械抽出された履歴 × LLM の意図解説。

Reproduce: titlecard-reveal の signature（1枚のカードを ONE restrained move で出して hold）。**意図的な breather**。confirmed sketch 維持。
Scene 1 (0.0–1.4s): navy 地。中央にターミナルカードが **slide-up + crossfade**（`spring-pop-entrance` の穏やかな register, power3）で1枚せり上がる。タイトルバー（信号機ドット＋`retrace — nakabonne/ali · commit #6`）が先に定着。
Scene 2 (1.4–2.8s): カード内で `>_ Retrace`（緑）→ lead「機械抽出した diff・ツリー・PR に、LLM が書いた "意図の解説" を重ねる。」が **per-word staggered reveal**（読み順、power3）。
Scene 3 (2.8–5.0s): sub「1コミットずつ、"何を・なぜ・読みどころ" を辿る。」が最後に静かに reveal。以後 hold（low motion is the payload）。カードは静止、`>_ Retrace` のキャレット点滅のみ。

## Frame 4 — Proof: Commit Lane（見せ場）

- scene: 画面中央を縦に流れる commit の一本道（first-parent）。ノードが下から上へ次々通過し、各ノードで sha・subject・`+追加/-削除` のバッジが灯る。seq が 1 → 6 → … と増える
- duration: 9s
- poster: 5s
- transition_in: crossfade
- status: animated
- voiceover: ""
- src: compositions/frames/04-commit-lane.html
- type: feature_showcase
- persuasion: Show-don't-tell proof（"一本道を最初から順に" を実際に流して見せる）
- beat: aspiration
- blueprint: transcript-scroll-artifact-reveal (Adapt)
- focal: 縦の commit lane（一本道＋ノード＋カード）
- roles: レーン＆ノード = 主役 · コミットカード = 逐次コンテンツ

オンスクリーン: 左に縦のレーン線＋丸ノード。各ノードに `seq N` `sha7` `subject`（例: Initial commit / Enable to attack / Add tests…）と `+84 -36` のような add/del バッジ。
流れは下→上に一定速度。上部に薄く「mainline を、Initial commit から古い順に」。retrace の核体験そのもの。
narrativeRole: retrace を使うと何が起きるかを"動き"で証明。一本道＝迷わず背骨だけ追える、を体感させる。
keyMessage: first-parent の一本道を、最初のコミットから順番に追える。

Adapt: signature（1本の長いサーフェスを縦 traversal で読む）を保持。ただし artifact-reveal のクリック pivot は使わず、
"一定速度で流れ続ける一本道" 自体を payoff にする（ズーム・カメラ酔いを避けた素直な並進）。見せ場＝動きが主役。
Scene 1 (0.0–1.2s): navy 地。上部に「mainline を、Initial commit から古い順に。」が **per-word staggered reveal**。中央やや左に緑の縦レーン線が下から上へ **svg self-draw**（`svg-path-draw`, power3）で1本引かれる。
Scene 2 (1.2–3.0s): レーン上に丸ノードが**下から順に**点灯（`dynamic-content-sequencing`, stagger）、各ノードの右にコミットカードが velocity-matched に横入り。seq/sha(cyan)/subject が読める。最下段は `seq 1 · Initial commit`。
Scene 3 (3.0–7.5s): lane 全体が**一定速度で上方向へスクロール**（`viewport-change` または root の等速並進 — ease ではなく linear に近い定速、カメラ酔い回避）。新しいノード（seq が増える）が下から供給され上へ抜ける。中央付近のノードは cream で鮮明、上下端は dim へフェード（`depth-of-field-blur` 端のみ）。add/del バッジの緑/赤が流れの中で明滅せず素直に読める。
Scene 4 (7.5–9.0s): スクロールが減速して静止し、中央に `seq 6 · Enable to attack` が来た所で hold（次フレームの寄りへ繋ぐ）。緑レーンの流れ感だけ低振幅 jitter で残す。back-half の余計な push なし。

## Frame 5 — Proof: 何を・なぜ・読みどころ

- scene: Commit Lane の1ノードにフォーカスが寄り、解説カードが展開。上段に「何を/なぜ/読みどころ」（amber ラベル）、下段に diff の `- 旧` → `+ 新`（赤→緑）。右肩に evidence バッジ
- duration: 8s
- transition_in: zoom-through
- status: animated
- voiceover: ""
- src: compositions/frames/05-explanation.html
- type: feature_showcase
- persuasion: Feature-to-benefit translation（diff だけでは分からない "なぜ" を LLM が言語化）
- beat: confidence
- blueprint: panel-edit-live-sync (Adapt)
- focal: 解説カード（何を/なぜ/読みどころ＋diff）
- roles: 解説カード = 主役 · diff = live-sync ターゲット

オンスクリーン: `何を:` periodic 関数を削除し attacker.Attack を呼ぶ goroutine へ置換。
`なぜ:` 実際に負荷生成できる状態にするのが目的（PR/コミットメッセージが根拠）。
`読みどころ:` Attack のシグネチャ変更。diff: `- func Attack(target string, resCh chan *Result) *Metrics {` → `+ func Attack(ctx context.Context, target string, ...) {`。
右肩に evidence バッジ（PR 根拠あり／推測は「おそらく」明示、の規律を1語で示す）。
narrativeRole: 見せ場の"中身"。diff＋PR に意図の解説が重なる価値を具体で見せる。
keyMessage: 各コミットに「何を・なぜ・読みどころ」。根拠付き（反ハルシネーション）。

Adapt: signature（上段の説明が下段の diff と "対で" 読める＝解説⇄コードの結び付き）を保持。Frame 4 の1ノードから寄る導入。
Scene 1 (0.0–1.2s): Frame 4 のノードから **inverse zoom-through**（`cut-catalog.md`）で解説カードへ寄る（"arriving at" の payoff feel）。タイトルバー＋`✓ PR 根拠あり` evidence バッジが先に定着（緑・pill）。
Scene 2 (1.2–3.4s): `何を:` → `なぜ:` → `読みどころ:` の順に **per-word staggered reveal**（amber ラベル → cream 本文の順、読み順）。1行ずつ、power3。ここは front-load せず1ラベルずつ。
Scene 3 (3.4–6.2s): カード下段の diff が **type-on**（`discrete-text-sequence`）。まず `- func Attack(...)`（赤）が入り、直下に `+ func Attack(ctx context.Context, ...)`（緑）が続く。緑の追加行が入った瞬間 evidence バッジと `読みどころ` の "ctx" に軽い **keyword glow**（`asr-keyword-glow` 緑・控えめ）。
Scene 4 (6.2–8.0s): 全要素 resolved、hold（confidence を読ませる breather）。カード静止、キャレット点滅のみ。push/breathing なし。

## Frame 6 — Library: 収録されている OSS

- scene: 収録リポジトリのカードが下からスタッガで積み上がる。各カードに owner/name・Go の言語ドット・コミット数・進捗バー
- duration: 5s
- transition_in: push-slide UP
- status: animated
- voiceover: ""
- src: compositions/frames/06-library.html
- type: social_proof
- persuasion: Authority by association（実在の有名 Go OSS を題材に選定）
- beat: trust
- blueprint: grid-card-assemble (Reproduce)
- focal: リポジトリカードのグリッド
- roles: 6リポカード = 逐次アセンブルするコンテンツ

オンスクリーン: `ali` `kong` `httprouter` `aconfig` `conc` `godotenv` のカードが積み上がり、上部に「7 リポジトリ・1,500+ コミットを収録」。
CLI・ルーター・設定・並行処理——設計の型が学べる実プロジェクト、を一言添える。
narrativeRole: 「絵に描いた餅ではなく実在の OSS」を示し信頼を与える。
keyMessage: 実在の Go OSS を厳選収録（設計の型が学べる）。

Reproduce: grid-card-assemble の signature（N枚が staggered cascade で grid に self-assemble して hold）。confirmed sketch 維持。
Scene 1 (0.0–1.2s): navy 地。kicker（緑）「LIBRARY · 7 リポジトリ・1,500+ コミット」→ 見出し「実在の Go OSS を、厳選収録。」が **per-word staggered reveal**。sub は少し遅れて dim で。
Scene 2 (1.2–3.6s): カード6枚が**行→列の順に staggered cascade**で下から上げ＆フェード（`center-outward-expansion` ではなく素直な stagger-up, power3）。各カード内は owner → name → 言語ドット＋コミット数 の順。
Scene 3 (3.6–5.0s): 全カード着地後、`ali` と `godotenv` の進捗バーが緑で **stat bar fill**（`stat-bars-and-fills`, 左→右）して "既読の痕跡" を示し hold。他は静止。back-half push なし。

## Frame 7 — CTA: 最初のコミットから

- scene: カードが晴れ、`>_ Retrace`（点滅カーソル）が中央に据わり、下に一行 CTA。緑の一本道がフレーム下から立ち上がり Frame 1 の冒頭へループ接続する余韻
- duration: 4s
- poster: 2.5s
- transition_in: blur-crossfade
- status: animated
- voiceover: ""
- src: compositions/frames/07-cta.html
- type: cta
- persuasion: Future pacing（"さあ、最初のコミットから" ＝次の一歩を促す）
- beat: motivation
- blueprint: logo-assemble-lockup (Reproduce)
- focal: `>_ Retrace` ロックアップ
- roles: ワードマーク = 主役 · ループライン = 導線

オンスクリーン: `>_ Retrace` ＋「さあ、最初のコミットから。」。小さく「読みたい OSS を選んで追体験を始めよう」。
末尾の緑ラインが上（＝次のループの冒頭ターミナル）へ繋がる意識で、静かに閉じる。
narrativeRole: 追体験への一歩を促し、ループの冒頭へ戻す。
keyMessage: 最初のコミットから、追体験を始めよう。

Reproduce: logo-assemble-lockup の signature（要素がクリアされ、mark が中央に定着してロックアップ完成）。confirmed sketch 維持。**最終フレームなので exit あり**。
Scene 1 (0.0–1.0s): navy 地。中央に緑の ambient glow が **glow bloom**（`ambient-glow-bloom`）で静かに立ち、`>_ Retrace`（大・緑）が **spring-pop entrance**（power3, overshoot なし）で定着＋末尾キャレット点滅。
Scene 2 (1.0–2.4s): 下に「さあ、最初のコミットから。」→ sub「読みたい OSS を選んで、追体験を始めよう。」が **per-word staggered reveal**（読み順, power3）。
Scene 3 (2.4–4.0s): フレーム下端から緑のループラインが上へ **svg self-draw**（`svg-path-draw`）で立ち上がり、Frame 1 冒頭の `$`（画面上方）へ視線を送る＝ループ接続の余韻。ここで全体をわずかにフェード（最終フレームの exit）。以後 hold＋キャレットのみ。
