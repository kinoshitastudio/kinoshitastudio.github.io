# Onore — Figma Community 掲載文面（正本）

作成 2026-07-24。**初回公開用**。scratchpad は消えるのでここが正本。Kaibou/Siren と同じ型。
実装の根拠：**7つのオシレータ**（波形 / 倍音 / 持続 / FM / デチューン / PWM / S&H）＋素材エンジン（Liquid / **Metal(MatCap)** / 3D / Pinwheel / Disc / Contour / Ribbon）。出力＝Figmaへ **SVG（ベクター）配置**、または金属/液体はラスターPNG配置（`code.js` の `generate` / `generateRaster`）。**保存なし＝生成専用**（`setPluginData`/`clientStorage` 不使用＝データセキュリティQ4は「No, does not store」）。

---

## Name（`manifest.json` の `name` ＝ 掲載名）

**確定：`Onore — a synth for surfaces`**（2026-07-24 木下決定・`manifest.json` 反映済み）。持続音のシンセ＝面を生む。

## Tagline（100字）

**推し**：`Turn waves into surfaces — 7 oscillators, liquid metal, all vector.`

## Support contact

`99letters99@gmail.com`

## Network access

なし（`allowedDomains: ["none"]`・2026-07-24 に manifest へ追記）。

---

## Description — EN

Onore (己, "self") is a synth for surfaces. Instead of sound, its oscillators shape a graphic — sustained tones become a continuous, flowing surface.

Seven oscillators
Waveform · Harmonics · Sustain · FM · Detune · PWM · Sample & Hold — the same controls a synth gives you, moving colour and form instead of pitch.

Material engines
Layer the oscillators through Liquid, Metal (a real MatCap — light read off surface normals), 3D, Pinwheel, Disc, Contour, or Ribbon. One patch, many materials.

Out as vector
The result goes into your file as an SVG — a real, editable surface. Metal and liquid, being per-pixel, come across as a clean high-resolution image.

Everything runs locally. The plugin has no network access and sends your work nowhere.

Named after a track on *Kaibou Zukan* (解剖図鑑), an album by 99LETTERS. Onore is the middle stage of the signal — Siren scatters the marks, Onore grows the surfaces, Kaibou gives them texture. From SHIAN 志庵, the design and plugin studio of Kinoshita Studio.

---

## Description — JA

Onore（己）は、面のためのシンセです。音の代わりに、オシレータがグラフィックを形づくる — 持続音が、連続した流れる面になります。

■ 7つのオシレータ
波形・倍音・持続・FM・デチューン・PWM・S&H。シンセと同じつまみが、音程ではなく色と形を動かします。

■ 素材エンジン
オシレータを Liquid・Metal（本物の MatCap＝法線から光を読む金属）・3D・Pinwheel・Disc・Contour・Ribbon に通します。ひとつのパッチ、いくつもの素材。

■ ベクターで出る
結果は SVG としてファイルへ＝そのまま編集できる面。金属・液体はピクセル単位なので、高解像度のきれいな画像として渡ります。

すべて端末内で動きます。ネットワーク接続はなく、作ったものはどこにも送られません。

名前は 99LETTERS のアルバム『解剖図鑑 / Kaibou Zukan』の曲名から。Onore は信号の真ん中の段 — Siren が点を撒き、Onore が面を育て、Kaibou が質感を与える。SHIAN 志庵（木下スタジオのデザイン／プラグインスタジオ）より。

---

## カテゴリー / タグ

- カテゴリー：**デザインツール › 編集とエフェクト**（Kaibou/Siren と同じ想定。実機で確認）
- タグ（5個・英語でカスタム）：`generative` `gradient` `abstract` `holographic` `svg`
  - 代替候補：`background` `texture` `metal` `blob`

## 掲載画像

| | ファイル | 状態 |
|---|---|---|
| アイコン 128×128 | `icon-128.png`（ブランドマーク＝波＋オレンジ節）| ✅ |
| カバー 1920×1080 | `cover-1920x1080.png`（波→継ぎ目→金属面。Kaibou/Siren揃え）| ✅ |
| カルーセル | — | ❌ 未。実機で面を配置したスクショ（各素材エンジンの例）|

## 公開手順（Kaibou/Siren の実績ベース）

1. `manifest.json` の `id` を **Figma 発行の実ID** に差し替え（デスクトップ → Plugins → Development → New plugin…）
2. Publish → Name / Tagline / Description / Category / Tags / Icon / Cover / Carousel
3. データセキュリティ：Q1 バックエンド無 / Q2 通信無 / Q3 認証無 / **Q4 保存しない（No）** / Q5 ソロ
4. Support contact ＝ `99letters99@gmail.com`
5. 公開後：サイト `shian/onore.html` の CTA「近日公開」を実URLへ差し替え
6. ⚠️ 新規プラグイン＝**初回は Figma 審査あり**（Kaibou/Siren で確認済み）。承認後に一般公開＆サイト差替。

## メモ（生成器）

- カバーの金属球＝`_metal.html`（`onore/lab/onore-lab-metal2.html` の UI を消しただけのコピー）を 1080² で撮った `_metal-source.png` を、`render.html` が右半分に合成。**面は本物の Onore MatCap 出力**。
- `_metal.html` / `_metal-source.png` は生成用の中間物（公開素材ではない）。
