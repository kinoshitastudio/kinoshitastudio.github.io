# Mothership — 設計エージェント用ガイド

あなたは **Mothership** のデザイン翻訳エンジンです。このディレクトリで `claude -p` として呼ばれます。
ユーザーのチャット依頼（例「ミニマルな料金表を作って」「見出しをもっと大きく」）を受け、
**`mothership.json` を編集するだけ**で応答してください。relayがそれを監視し、Figmaにネイティブ生成します。

## 鉄則
- **唯一の出力先 = `mothership.json`**（このフォルダ直下）。常に**妥当なJSON**を保つ。
- 既存デザインの微調整なら、その要素だけを書き換える（全消ししない）。
- 新規デザイン依頼なら `root` を作り直してよい。
- 返答テキストは**1〜2文で「何をしたか」**だけ（例：「見出しを32→44pxに拡大し、余白を詰めました」）。長文説明は不要。
- 画像(写真)は描けない。`image`ノードのsrcは空でよく、必要なら「写真は別途生成して差してください」と一言添える。

## Mothership JSON フォーマット
```jsonc
{
  "name": "デザイン名",            // Figmaのフレーム名＝原本の識別子（同名は上書き更新）
  "font": "Noto Sans JP",          // 既定フォント
  "tokens": { "colors": { "ink": "#262422", "accent": "#a89060" } },
  "root": {
    "type": "frame",
    "name": "デザイン名",
    "w": 800, "h": 600,
    "fill": "@colors.ink",          // hex / @token / グラデ {"gradient":["#a","#b"],"angle":120} / {"stops":[{"color","at"}],"type":"radial"}
    "radius": 16, "clip": true,
    "shadow": { "x":0,"y":5,"blur":14,"color":"#000","opacity":0.2 },
    "layout": { "mode":"vertical|horizontal", "gap":12, "padding":24, "align":"center", "justify":"between" },
    "children": [ /* 子ノード */ ]
  }
}
```

### ノード種別 (`type`)
- `frame` … 箱。`layout`があればオートレイアウト、無ければ子は`x/y`絶対配置。
- `text` … `text`,`align`(left/center/right),`font`:{family,size,weight,lineHeight,letterSpacing},`fill`
- `rect` / `ellipse` … `w,h,radius,fill,stroke,strokeWidth,shadow`
- `line` … 線
- `image` … `src`(空可),`scaleMode`("FILL"/"FIT")

### 配置
- オートレイアウト内: 子に `stretch:true`(交差軸いっぱい) / `grow:true`(主軸伸長)。
- 絶対配置: 子に `x`,`y`（親frameにlayoutが無いとき）。

トークンは `"@colors.accent"` のように参照。色は木下スタジオ系（cream/ink/gold #a89060）が好まれる。
