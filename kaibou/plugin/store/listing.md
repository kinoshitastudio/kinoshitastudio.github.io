# Kaibou — Figma Community 掲載文面（正本）

作成 2026-07-24。**初回公開用**。scratchpad は消えるのでここが正本。
数字の根拠：チェーン11段（expo / eq / dec / amp / rev / echo / filt / reg / util / tint / noise。＋Master）、プリセット**17**（Kaibou, Film, Bloom, Chrome, Grain, Xerox, Halftone, Riso, Newsprint, VHS, Editorial, Duotone, Mirror, Paper, Concrete, Toner, Clean）。

---

## Name（`manifest.json` の `name` ＝ 掲載名）

**確定：`Kaibou — texture chain for your material`**（2026-07-24 木下決定・`manifest.json` 反映済み）
OtO の `OtO — listen to your layout` と同じ型。"texture" が名前に入るので検索にも効く。

## Support contact

`99letters99@gmail.com`

## Network access

なし（`allowedDomains: ["none"]`）。データセキュリティ設問はすべて「バックエンド無し／ネットワーク無し」で通る。

---

## Description — EN

Kaibou (解剖, "anatomy") runs your material through a texture chain. It is not a filter you stack on top. It is a mix, and the artwork goes through it.

Eleven stages, borrowed straight from a music chain — Exposure, Hi-Cut, Crush, Drive, Bloom, Echo, Low-Pass, Registration, Width, Duotone, Noise — with one Master dry/wet over all of it.

At around 20% Master it is a texture, not an effect. At 100% it is a piece. One chain, swinging both ways.

Your layers survive
• Whole layer — the result is placed above and the original is kept, hidden and locked. Select the result again and every knob comes back where you left it. Restore puts it back.
• Paint only — the chain runs over the frame's fill and the children are untouched. Auto layout and text survive.

LIVE is a fitting, not a decision
LIVE pushes to the canvas the moment you let go of a slider. Switch LIVE off, or press Restore, and everything you tried on peels away. Only Apply commits.

17 presets
Kaibou · Film · Bloom · Chrome · Grain · Xerox · Halftone · Riso · Newsprint · VHS · Editorial · Duotone · Mirror · Paper · Concrete · Toner · Clean

Run every asset in a project through the same chain and they all look like they came off the same hand. That is the part nobody has a tool for.

Everything runs locally. The plugin has no network access and sends your artwork nowhere.

Named after *Kaibou Zukan* (解剖図鑑) — an anatomical picture book — an album by 99LETTERS. From SHIAN 志庵, the design and plugin studio of Kinoshita Studio.

---

## Description — JA

Kaibou（解剖）は、素材をあなたの質感チェーンに通すプラグインです。上に重ねるフィルタではありません。**通す**ためのミックスです。

11段のチェーンは、音のチェーンをそのまま画像に翻訳したもの — Exposure / Hi-Cut / Crush / Drive / Bloom / Echo / Low-Pass / Registration / Width / Duotone / Noise。その全体に Master（dry/wet）が1つ掛かります。

**Master 20% あたりなら効果ではなく質感になり、100% まで回すと作品になります。** 同じチェーンで、振れ幅が両側にあります。

■ レイヤーは壊れません
・**レイヤー全体** — 結果は元の上に置かれ、**元のレイヤーは隠して残ります**（ロック付き）。結果をもう一度選べば、つまみは全部そのままの位置で戻ってきます。「元に戻す」で完全復元。
・**背景だけ** — フレームの塗りだけがチェーンを通り、**中のレイヤーは無傷**。Auto Layout もテキストも生きたままです。

■ LIVE は試着であって、決定ではありません
LIVE を押すと、スライダーを離した瞬間にキャンバスへ反映されます。LIVE を切る、または「元に戻す」を押せば、試着したものは全部剥がれます。**確定するのは「適用」だけ。**

■ プリセット17種
Kaibou・Film・Bloom・Chrome・Grain・Xerox・Halftone・Riso・Newsprint・VHS・Editorial・Duotone・Mirror・Paper・Concrete・Toner・Clean

プロジェクトの全アセットを同じチェーンに通せば、**全部が同じ手を通ったように見えます**。トーン＆マナーの統一を、デザイナーは毎回手作業でやっている。そこに道具がありません。

すべて端末内で動きます。ネットワーク接続はなく、作ったものはどこにも送られません。

名前は 99LETTERS のアルバム『解剖図鑑 / Kaibou Zukan』から。SHIAN 志庵（木下スタジオのデザイン／プラグインスタジオ）より。

---

## Tags（候補・Figma は12個まで）

texture, grain, noise, halftone, riso, duotone, print, film, dither, poster, retro, image effects

## 掲載画像

| | ファイル | 状態 |
|---|---|---|
| アイコン 128×128 | `icon-128.png` | ✅ |
| カバー 1920×960 | `cover-1920x960.png` | ✅ |
| カルーセル | — | ❌ 未。before → after が一発で分かる実機スクショ／GIF が要る |

## 公開手順（OtO の実績ベース）

1. `manifest.json` の `id` を **Figma 発行の実ID** に差し替え（デスクトップ → Plugins → Development → New plugin…）
2. Figma デスクトップで Publish → Name / Icon / Cover / Description / Tags / Category
3. データセキュリティ設問＝バックエンド無し・ネットワーク無し・データ送信無し
4. Support contact ＝ `99letters99@gmail.com`
5. 公開後：サイト `shian/kaibou.html` の CTA「近日公開」を実URLへ差し替え
