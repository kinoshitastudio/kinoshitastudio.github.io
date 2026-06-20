# Mothership — Figma Community 公開準備 (#14)

> このファイル＝Community掲載のコピー＆手順の正本。掲載フォームにそのまま貼れる形でまとめてある。
> 方針：まず **B案（Org内・私的公開／審査不要）でテスト → A案（Community本公開）**。
> 対象＝**パワーユーザー**（Claude Code Pro/Max ＋ Figma ＋ Node ＋ relay 起動が前提）。

---

## 1. アセット（作成済み・ドラフト）
| 用途 | 仕様 | パス | 状態 |
|---|---|---|---|
| アイコン | 128×128 PNG | `assets/community/icon.png` | ✅ 近黒角丸＋金∞ |
| カバー | 1920×960 PNG | `assets/community/cover.png` | ✅ ∞＋MOTHERSHIP＋tagline |
| （元データ） | SVG | `assets/community/icon.svg` / `cover.svg` | 編集用。再書き出しは下記コマンド |

**再書き出しコマンド**（mac標準qlmanage）:
```sh
cd assets/community
qlmanage -t -s 128  -o . icon.svg  && mv icon.svg.png icon.png
qlmanage -t -s 1920 -o . cover.svg && sips -c 960 1920 cover.svg.png --out cover.png && rm cover.svg.png
```
※カバーSVGは 1920×1920 正方canvasの中央960バンドに描画→中央クロップ（qlmanageの正方パディング対策）。
※**本番はMothership自身でFigmaボード生成→書き出しが映える**（CLAUDE.md方針）。今のPNGは審査を通せる品質のドラフト。

---

## 2. 掲載コピー（EN ＝ 主 / JP ＝ 副）

### Name
`Mothership`

### Tagline（1行・〜なるべく短く）
- **EN:** Chat your way to real, editable Figma nodes.
- **JP:** チャットから、編集できる本物のFigmaノードへ。

### Description（本文）

**EN**
> **Mothership turns one source-of-truth JSON into real, editable Figma nodes — driven by Claude Code, no MCP.**
>
> Talk to it in plain language and your design gets built: text, auto layout, corner radii, gradients, tokens — all as native layers you can keep editing. Not a pasted SVG blob.
>
> **How it works**
> A tiny zero-dependency relay (`node relay.js`) watches a single `mothership.json`. Claude Code (Pro or Max) edits that file; this plugin renders it natively into Figma and keeps it in sync. The intelligence is your Claude Code subscription — no separate API key, no extra billing.
>
> **Three faces, one panel**
> • Chat — generate and revise by talking.
> • Polish (studio) — overlay a reference image and nail whitespace & type by the numbers.
> • Library — store polished patterns and pour them back into Figma.
>
> **You need**
> Claude Code (Pro or Max) · Figma · Node.js. Setup is ~3 minutes (steps below).
>
> *Judgment is human. Translation is AI.*  — Kinoshita Studio

**JP**
> **設計の唯一の原本(JSON)を、編集できる本物のFigmaノードへ。Claude Codeが翻訳、MCP不要。**
>
> 普通の言葉で話しかけるとデザインが建つ——テキスト・オートレイアウト・角丸・グラデ・トークンまで、すべて編集可能なネイティブレイヤーで。SVG貼り付けの“塊”ではありません。
>
> **仕組み**：依存ゼロの小さなrelay(`node relay.js`)が `mothership.json` を監視。Claude Code(Pro/Max)がそのファイルを編集し、本プラグインがFigmaにネイティブ生成して同期し続けます。頭脳はあなたのClaude Codeサブスク＝別APIキー不要・追加課金なし。
>
> **ひとつのパネルに3つの面**：チャット（話して生成・修正）／詰める studio（参照画像を重ねて余白とタイポを数値で詰める）／ライブラリ（詰めたパターンを貯めてFigmaへ流し込む）。
>
> **必要なもの**：Claude Code(Pro/Max)・Figma・Node.js。セットアップ約3分。
>
> *判断は人、翻訳はAI。* — 木下スタジオ

### Setup（掲載本文末尾 or 最初のコメントに）
```
1) Figma → Plugins → Development → Import plugin from manifest… → mothership/manifest.json
2) Terminal:  cd mothership && node relay.js   ( → http://localhost:4575 )
3) Run the plugin → press “Connect” next to http://localhost:4575
4) Type: “make a simple 3-plan pricing table.”  → it builds natively in Figma.
```

### Category（候補）
`Productivity` または `Design tools`（AI/automation寄り）。

### Tags（候補）
`AI` `automation` `design systems` `JSON` `auto layout` `Claude` `generative` `productivity` `developer`

### Support contact
`https://kinoshita.studio/#contact`

### Website
`https://kinoshita.studio/mothership/`

---

## 3. networkAccess（審査ポイント・判断材料）
- 現状 `allowedDomains: ["*"]`。reasoning を EN+JP で明確化済み（manifest.json）。
- **絞れない理由**：画像ノードがユーザー任意のURLを `createImageAsync` で読む機能があるため、`*` を外すと画像差し込みが壊れる。
- **絞る場合の選択肢（要・機能トレードオフ判断）**：
  - (a) 画像URL機能を当面オフにし、`allowedDomains: ["http://localhost:4575"]` に限定 → 審査は最も軽いが画像が差せない。
  - (b) `*` 維持＋reasoning明記（現状）→ パワーユーザー向けには妥当。多くのAI系プラグインがこの形で通過。
- **推奨：(b) 維持**。画像はMothershipの売りの一部。審査で指摘されたら(a)へ縮退も可能。

---

## 4. 提出チェックリスト
- [x] アイコン128×128 PNG
- [x] カバー1920×960 PNG
- [x] EN+JP 説明文・tagline
- [x] サポート/サイトURL
- [x] manifest reasoning 明確化（EN+JP）
- [ ] **本番アイコン/カバーをMothership自身でFigma生成→差し替え**（任意・品質UP）
- [ ] manifest の `id` 最終確認（現 `mothership-kinoshita-studio`）
- [ ] **B案：Org内 private publish でテスト**（審査不要・実機確認）
- [ ] **A案：Community publish**（上記コピー貼付・カテゴリ/タグ選択・送信）
- [ ] 公開後：world.html/guide.html の「申請中」バッジを「公開済み＋導入リンク」に差し替え

---

## メモ
- 公開後のアップデートはバージョンを上げて再Publish（初回審査が最重・以降は軽い）。
- Bundle/manifest 以外の `library/` 等は公開バンドルに不要なら同梱しない（Figmaはmanifestで参照されるファイルのみ取り込む）。
