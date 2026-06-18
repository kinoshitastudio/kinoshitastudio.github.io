# Mothership

> 設計の原本（JSON）を、**編集可能な本物のFigmaノード**と**本番コード**へ翻訳する。
> AIと人が互いに刺激しあうための、母艦。 — Kinoshita Studio

*（名は Dance Gavin Dance のアルバム "Mothership" より）*

---

## これは何か

ひとつの **Mothership JSON** を「設計の唯一の原本（source of truth）」にして、そこから複数のターゲットへ"発進"させる:

```
mothership.json  ← Claude Code が "コードを書くのと同じやり方" で編集
   ├─► Figma     … プラグインがネイティブノードを生成（テキスト/オートレイアウトのまま編集可）
   ├─► コード     … HTML / React（予定）
   └─► SVG        … イラスト用の補助出力（予定）
```

- **SVG貼り付けと違い**、Figma側は本物の編集可能なレイヤーになる（強いFigmaユーザーがそのまま触れる）。
- **MCPを使わない**。原本がただのファイルなので、Claude Code が直接書ける。
- ローカル / 自分の所有物。SaaSに預けない。

---

## 使い方

### A. 手動モード（まず動かす）

1. Figma デスクトップ → メニュー → **Plugins → Development → Import plugin from manifest…**
2. この `mothership/manifest.json` を選ぶ。
3. プラグイン **Mothership** を実行 → JSONを貼り付け（既定で例が入っている）→ **「Figmaに生成 →」**。
   → キャンバスにネイティブのフレーム/テキスト/ボタンが生成される。

### B. ライブモード（Claude Code 連携）★本命

1. ターミナルで中継を起動:
   ```bash
   cd mothership
   node relay.js        # → http://localhost:4575 で mothership.json を見張る
   ```
2. Figmaで Mothership を開き、**「接続」** を押す（relay URL は既定 `http://localhost:4575`）。
3. あとは **`mothership.json` を保存するたびに Figma が自動更新**される。

→ つまり Claude Code チャットで「ログイン画面を作って」と頼む → Claude Code が `mothership.json` を書く → **Figmaに直接デザインが積まれる**。

> ※ Figmaの仕様上、プラグインを開いて「接続」しておく必要がある（外部からプラグインは起動できないため）。relay起動とJSON生成は Claude Code 側が全部やれる。

---

## Claude Code との往復ループ

```
あなた（チャット）：「カードをもう一段濃く、角丸も大きく」
   → Claude Code が mothership.json を編集
   → relay が検知 → Figma が即更新
   → あなたが見て「これじゃない」/「いい」
   → 繰り返す
```

判断はあなた、翻訳は Claude Code。手は最初から動かさない。

---

## Mothership JSON フォーマット

```jsonc
{
  "tokens": { "colors": { "accent": "#a89060" }, "text": { "h1": 26 } },
  "root": {
    "type": "frame",            // frame | text | rect | ellipse | line | image
    "name": "Screen",           // → Figmaのレイヤー名
    "w": 390, "h": 720,
    "fill": "@colors.bg",       // "@..." で tokens を参照
    "radius": 14,
    "layout": {                 // frame に付けるとオートレイアウト
      "mode": "vertical",       // vertical | horizontal
      "gap": 20,
      "padding": 28,            // 数値 or { top,right,bottom,left }
      "align": "stretch",       // 交差軸: start | center | end | stretch
      "justify": "start"        // 主軸: start | center | end | between
    },
    "children": [
      { "type": "text", "text": "見出し", "fill": "@colors.ink", "font": { "size": "@text.h1", "weight": 700, "lineHeight": 22 } },
      { "type": "rect", "h": 120, "fill": "#2a2a28", "radius": 12, "stretch": true },
      { "type": "image", "src": "https://…", "w": 300, "h": 180, "radius": 10 }
    ]
  }
}
```

- 子要素の `"stretch": true` … オートレイアウト内で交差軸いっぱいに伸ばす
- 子要素の `"grow": true` … 主軸方向に伸びて余白を埋める
- `x` / `y` … オートレイアウト外での絶対座標
- フォントは Inter（weight → スタイルへ自動マップ）

---

## 既存との違い（正直に）

「AIがFigcomaに描く」自体は既にある（Figma公式Dev Mode MCP、OSSの *Cursor Talk to Figma* 等）。Mothership が狙う未占有の角度:

1. **No-MCP**：原本がただのファイル。Claude Code がネイティブに編集。
2. **1フォーマット → Figmaネイティブ ＋ コード の両出力**（既存は大体どちらか片方）。
3. **ローカル / 所有物**。ベンダーロックなし。
4. 木下スタジオの思想（設計=コード=Figma は同じ成果物 / 体験翻訳）に乗る。

---

## ロードマップ

- [x] Mothership JSON フォーマット v0
- [x] Figmaプラグイン（ネイティブノード生成・オートレイアウト・トークン参照）
- [x] ローカル relay（mothership.json 監視 → ライブ更新）
- [ ] コード出力（HTML/React）を同じJSONから
- [ ] Figma → JSON の逆翻訳（往復）
- [ ] コンポーネント / バリアント対応
- [ ] ビジュアル編集ボード（既存OSSキャンバスに乗る検討）
