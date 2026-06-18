# デニムのジーン — Jean of Denim

大人のためのデニム入門書。歴史・素材・アイテム・メーカー・着こなし・用語を、一気通貫で読める静的サイト。

Built as a quiet field guide. — kinoshita studio, 2026.

---

## 構成

```
/projects/jean_of_denim/
├── index.html           00 はじめに（ランディング・派手KV付き）
├── app.html             アプリ版（単一ページ / タブ・ドロワー・検索）
├── history.html         01 History / 歴史
├── material/
│   ├── weight.html      02-1 オンス（重さ）- インタラクティブスライダー
│   ├── weave.html       02-2 織り（構造）
│   └── indigo.html      02-3 インディゴ染め
├── items/
│   ├── jeans.html       03-1 ジーンズ
│   ├── shirts.html      03-2 シャツ
│   └── jackets.html     03-3 ジャケット（Gジャン）
├── makers.html          04 Makers / メーカー
├── styling.html         05 Styling / 着こなし
├── glossary.html        06 Glossary / 用語集
├── README.md
└── assets/
    ├── css/style.css    共通スタイル（ライト/ダーク両対応）
    ├── js/main.js       テーマ切替・フェードイン・スライダー・ヒーロー演出
    └── svg/
        ├── logo.svg           アイコン（開いた本＋セルヴィッジ赤線）
        ├── jean-normal.svg    ジーン（通常表情）
        ├── jean-happy.svg     ジーン（笑顔）
        ├── jean-thinking.svg  ジーン（思考）
        └── jean-surprised.svg ジーン（驚き）
```

## ふたつの体裁

- **書籍版**（`index.html` / 各章HTML）
  紙の教科書のように、左に固定目次・右に本文。
  PCで読むのに最適。章ページは前後リンクで順送りに読めます。
- **アプリ版**（`app.html`）
  iOSアプリ風のシングルページ。底タブ＋ドロワー＋検索シート。
  モバイルで片手で読めるようにチューニング。
  すべての章を1ファイル（JS内データ）に内蔵。

どちらも同じCSSトークン（`assets/css/style.css`）を共有しているので、
テーマ切替（ライト/ダーク）は相互に影響します（`localStorage` 経由）。

## デザイン原則

- **Notionの静けさ × おさるのジョージの癖**
  情報設計はNotion寄り（整った余白・表・カード）、
  挿絵だけ手描きのサル＝ジーンで、ほんの少し外す。
- **色のトークン**
  `--paper` / `--ink` / `--indigo` / `--selvedge`（赤耳の赤）。
  派手な色・グラデ・ネオンは使わない。
- **モーション**
  本文はフェードインのみ。
  index.html のヒーローだけ、複数レイヤーのアニメーションを許容（ジーン表情切替・浮遊・同心円・ふきだし）。
  `prefers-reduced-motion` を尊重。

## 使い方

静的ファイルなので、そのままブラウザで開けます。

```bash
# 例：ローカルサーバーで開く
cd projects/jean_of_denim
python3 -m http.server 8787
# → http://localhost:8787/
```

## コンテンツの追加手順

### 書籍版に章を追加

1. 既存章（例：`history.html`）をコピー。
2. `<title>`、`<main class="chapter">` の中身、サイドバー `<aside class="toc">` のリンク、
   そして footer の prev/next を更新。
3. 他ページのサイドバーTOCにも、新章へのリンクを追加。

### アプリ版に章を追加

`app.html` 内の `const CHAPTERS = [...]` に同じ形式で
オブジェクトを1つ足すだけ。
タブは `tab: 'history' | 'weight' | 'jeans' | 'glossary'` で所属を指定。
ドロワーのグループに入れたい場合は `buildDrawer()` の `groups` 配列も更新。

### ジーンの表情を増やす

`assets/svg/` に `jean-xxx.svg` を追加して、
JS側（`app.html` 内 `JEAN_SVG`）と index.html のヒーロー `.hero-idx-jean-wrap` に参照を追記。

## 拡張のアイディア

- 図解（綾織り・ロープ染色）をSVGで追加
- Gジャン Type I/II/III の見分けインフォグラフィック
- 章ごとの「10問クイズ」コーナー
- Service Worker 追加で、アプリ版を完全オフライン化＋インストール対応

## クレジット

Concept / Design / Code: kinoshita studio
© 2026 JEAN OF DENIM — All illustrations drawn in-house.
