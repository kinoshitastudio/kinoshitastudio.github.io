# Siren — Figma Community 掲載文面（正本）

作成 2026-07-24。**初回公開用**。scratchpad は消えるのでここが正本。Kaibou と同じ型。
実装の根拠：12分布（STEP/BURST/FIELD/ASSEMBLE/FLOW/ORBIT/MORPH/SPIRAL/WAVE/BLOOM/LINK/RIPPLE）、自分のSVGを粒に（`readShape`→clipPath）、タイムラインで分布をクリップとして繋ぐ、出力＝**Figmaへ SVG配置＋連番（ベクター各フレーム）**。⚠️動画/GIFはWeb版限定＝プラグインは静止SVG＋連番まで。

---

## Name（`manifest.json` の `name` ＝ 掲載名）

現在：`Siren`
**提案（Kaibou と同じ型「Name — 何をするか」）**：
1. `Siren — a drum machine for your marks`（推し。"自分のマークを鳴らすドラムマシン"そのまま）
2. `Siren — play your marks as a rhythm`
→ **木下が選ぶ**。決めたら `manifest.json` に反映。

## Tagline（100字・一覧に出る一行）

**推し**：`Scatter your own mark on a beat — 12 distributions, arranged on a timeline.`

## Support contact

`99letters99@gmail.com`

## Network access

なし（`allowedDomains: ["none"]`）。

---

## Description — EN

Siren (鳴物, "sounding thing") plays your own mark like an instrument. Bring a shape — your logo, an icon, any part — and Siren scatters it on a beat.

12 distributions
STEP · BURST · FIELD · ASSEMBLE · FLOW · ORBIT · MORPH · SPIRAL · WAVE · BLOOM · LINK · RIPPLE — each one a different way of throwing your mark across the frame.

Groove, not noise
Not a random seed. Swing, accent, and a pulsing envelope give the scatter a feel — the same thing that makes a drum machine sound alive.

A timeline, not a mixer
Arrange the distributions as clips on a timeline and decide when each one plays. One thing sounds at a time, so it never turns to mud.

Into Figma
Place the current frame as an SVG, or export 連番 — a numbered sequence, vector on every frame — straight into your file. Take the frames on to a GIF or a video elsewhere.

Everything runs locally. The plugin has no network access and sends your work nowhere.

Named after a track on *Kaibou Zukan* (解剖図鑑), an album by 99LETTERS. Siren is the first stage of the signal; run its output through Kaibou to finish it. From SHIAN 志庵, the design and plugin studio of Kinoshita Studio.

---

## Description — JA

Siren（鳴物）は、自分のマークを楽器のように鳴らすプラグインです。形をひとつ持ち込めば — ロゴでも、アイコンでも、どんな部品でも — Siren がそれを拍に乗せて撒きます。

■ 12の分布
STEP・BURST・FIELD・ASSEMBLE・FLOW・ORBIT・MORPH・SPIRAL・WAVE・BLOOM・LINK・RIPPLE。それぞれが、あなたのマークを画面に投げる別々のやり方です。

■ 乱数ではなく、グルーヴ
ただのシード値ではありません。swing・アクセント・脈動のエンベロープが撒き方に「ノリ」を与えます。ドラムマシンが生きて聞こえるのと同じ仕組みです。

■ ミキサーではなく、タイムライン
分布をクリップとしてタイムラインに並べ、いつ鳴らすかを決めます。同時に鳴るのは基本ひとつ＝濁りません。

■ Figmaへ
現フレームを SVG として配置、または **連番**（各フレームがベクターの番号付き連番）をそのままファイルへ書き出し。連番は外で GIF や動画に繋げます。

すべて端末内で動きます。ネットワーク接続はなく、作ったものはどこにも送られません。

名前は 99LETTERS のアルバム『解剖図鑑 / Kaibou Zukan』の曲名から。Siren は信号の最初の段。出力を Kaibou に通せば仕上がります。SHIAN 志庵（木下スタジオのデザイン／プラグインスタジオ）より。

---

## カテゴリー / タグ

- カテゴリー：**デザインツール › 編集とエフェクト**（Kaibou と同じ想定。※"生成/イラスト"寄りでも可。実機で確認）
- タグ（5個・英語でカスタム）：`generative` `animation` `pattern` `particles` `motion`
  - 代替候補：`svg` `logo animation` `sequencer`

## 掲載画像

| | ファイル | 状態 |
|---|---|---|
| アイコン 128×128 | `icon-128.png` | ✅ |
| カバー 1920×1080 | `cover-1920x1080.png` | ✅ |
| カルーセル | — | ❌ 未。プラグイン実機で分布を配置したスクショ／連番→動く様子（before=部品→after=撒かれた場）|

## 公開手順（Kaibou の実績ベース）

1. `manifest.json` の `id` を **Figma 発行の実ID** に差し替え（デスクトップ → Plugins → Development → New plugin…）
2. Publish → Name / Tagline / Description / Category / Tags / Icon / Cover / Carousel
3. データセキュリティ：Q1 バックエンド無 / Q2 通信無 / Q3 認証無 / **Q4 ローカル保存**（確認済み＝`code.js` が生成フレームに `setPluginData(KEY, ...)` で設定を保存。外部送信なし）/ Q5 ソロ
4. Support contact ＝ `99letters99@gmail.com`
5. 公開後：サイト `shian/siren.html` の CTA「近日公開」を実URLへ差し替え
6. ⚠️ 新規プラグイン＝**初回は Figma 審査あり**（Kaibou で確認済み）。承認後に一般公開＆サイト差替。
