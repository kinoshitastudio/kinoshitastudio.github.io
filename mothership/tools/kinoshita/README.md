# 木下の道具（Claude Code から Figma に出す）

⭐ **再開の合言葉：「Mothershipの続き」**

## 使い方

```bash
cd ~/Desktop/GitHub-clone/名称未設定/mothership

# ① relay が動いているか
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4575/
# 動いていなければ： node relay.js

# ② サイトを1セクションずつ library/*.json に落とす
node tools/kinoshita/site2figma.mjs "https://example.com/" "接頭辞"

# ③ セクションを実測する（オートレイアウトで建て直すとき用）⭐ここから始める
node tools/kinoshita/measure-sec.mjs "https://example.com/" 1 [幅=1440]
#   → _out/sec1.json（入れ子・flex・余白・角丸・線・写真URL・書体 ＋ ⭐疑似要素）
#   → _out/sec1.png （2倍スクショ。⚠️ 必ず目で見る）

# ④ 取りこぼしを数える
node tools/kinoshita/gap.mjs

# ⑤ Figma に出す（1ボードだけ）
cp "library/<名前>.json" mothership.json
```

## 🔴 必ず先に読む

- `../../CLAUDE.md` … **JSON の全仕様と「URLからサイトを再現する」手順**
- ⚠️ **推測で書かない。**仕様書に「やってはいけないこと」が書いてある

## ⚠️ 分かっている落とし穴

- **webp/avif は Figma が描けない** → JPEG に変換してから
- **300KB超の画像は relay が切り捨てる** → 1ファイルを軽くする
- **`<br>` 入りの見出しは「子要素0個」判定だと落ちる**
- **ヘッダーは `<section>` の外**（position:fixed）→ 先頭セクションに合成
- **背景 transparent** → 親をさかのぼって実際の色を取る
- **clip-path の斜めカット** → 🔴 自動では出せない

## ✅ 済：`uniform-net — 02 ユニフォームを探す`（オートレイアウト版）

**ノード46 / 絶対配置 0 / オートレイアウト 26 / 写真4枚とも焼き込み済み。**
⭐ 座標はサイト実測と**全部 1.5px 以内**で一致（組み上がりを計算で突合して確認）。

⭐ 建て方（そのまま他のセクションにも使える型）──
```
root 1440×1192 縦AL pad{180,0,90,180}
└ セクションカード 1260×922 縦AL gap45 pad{90,0,90,90}
  ├ 見出しとカード列 1170 縦AL gap90     ← gapが2種類あるので束ねて入れ子にする
  │ ├ 見出し 縦AL gap3（h2 42/50 ＋ sub 24/29）
  │ └ カード列 1170×435 横AL gap30
  │   └ カード 255 縦AL gap19 ×4
  │     ├ 写真枠 255×320 r30 border1 縦AL pad{16,20,16,20} → 写真 215×288 FIT
  │     └ 見出しと本文 255 縦AL gap18 pad{0,15,0,15}
  │       ├ 見出し行 225×32 横AL gap15 align:center justify:between
  │       │ ├ 見出し 18/22（w入れない＝hug）
  │       │ └ 丸ボタン 24×24 r12 横AL center/center → 矢印svg 5×8
  │       └ 本文 225 14/23
  └ ボタン 360×90 r90 横AL gap15 center/center（文字＝hug ＋ 白丸 8×8）
```

## 🔴 建て直しで分かったこと（丸写し版の取りこぼし3つ）

| 取りこぼし | 正体 |
|---|---|
| 🔴 **黒いボタンの面が無かった** | `a.m_btn` の bg/radius を拾えていなかった（文字だけ出ていた） |
| 🔴 **丸の中の白い矢印が無かった** | `span::before` の 8×8 背景SVG。**疑似要素は DOM に出ない** |
| 🔴 **ボタン右の白い丸が無かった** | `span.m_btn__text::after` 8×8（absolute left:220.875） |
| 🔴 **偽の改行が入っていた** | `<br class="pc_hidden">` は PC で `display:none`。**PCは1行** |

⭐⭐ **疑似要素（`::before` / `::after`）を測らないと、飾りが丸ごと落ちる。**
⭐ `getComputedStyle(el,'::before')` は `position/left/top/width/backgroundImage/transform` まで返す。
⭐ `<br>` は **`display` を見てから**改行にする（`textContent` だけだと嘘の改行になる）。

## ⚠️ 書体は寄せる前に「折り返しが変わらないか」測る

⭐ 本文 14px を 225px 幅に入れて **2/1/2/2行**＝サイト（TazuganeGothic）と Noto Sans JP で同じ。
🔴 ただし**ボタンの文字は Noto のほうが 3.7px 広い**（205.9 → 209.6）。
　→ **短いラベルに `w` を入れると折り返して壊れる。hug（`w` を書かない）にする。**
　→ 長い本文は `w` 必須（仕様書どおり）。**使い分ける。**

## 🔜 次にやること

**残りをこの型で建て直す**（01・03〜08、H-7 5件、site 15件）。
⚠️ ヘッダーは `position:fixed` で **02 の中身ではない**（01 に合成する）。
