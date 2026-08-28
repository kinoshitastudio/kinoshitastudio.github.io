# Midjourney で「貼る場所」を作る（日本の地下鉄・街中）

⭐⭐ **この道具に要るのは「作品が入る前の、空っぽの掲示面」**。
きれいな風景写真ではなく、**貼る場所が正面を向いていて、空いていて、光が乗っている**ことがすべて。

## 必ず入れる6語（これが無いと使えない写真になる）

| 入れる語 | なぜ |
|---|---|
| `blank empty poster` / `plain white paper inside the frame` | ⭐⭐ **面が空いていないと、作品を乗せても下の絵が透ける** |
| `no text, no letters, no logo, no watermark` | 文字が入ると他社の看板に見える／企業案件に出せない |
| `straight-on frontal view, camera perpendicular to the wall` | ⭐ **正面**だと四隅を合わせるのが一手で済む |
| `soft reflections on the glass, subtle glare` | ⭐⭐ **借りるものを作る**（この道具は光と影を借りる）。<br>のっぺりした面は、何を乗せても「貼っただけ」になる |
| `no people` | 人が写ると肖像の話になる。企業案件で出しにくい |
| `photorealistic, 35mm, natural lighting` | 絵になりすぎると、モックアップとして信用されない |

⚠️ **ポスターの比を先に決める**。日本の掲示は **B1（728×1030mm＝およそ 1:1.414）** が基本。
　 `--ar 3:4` の写真の中に、その比の枠が立っているのが理想。作品も同じ比で作れば余白が出ない。

---

## 1. 地下鉄の構内・白タイルの壁（いちばん使う）

```
Japanese subway station corridor, old white square ceramic tile wall, a single empty poster
frame mounted on the wall, black metal frame, blank plain white paper inside, no text,
overhead fluorescent light, soft reflection on the tiles, slightly worn grout lines,
straight-on frontal view, camera perpendicular to the wall, no people, photorealistic, 35mm
--ar 3:4 --style raw
```

## 2. 地下鉄の車内（銀のアルミ枠）

```
Tokyo metro train car interior, brushed stainless steel wall panel, an empty advertising
frame with thin silver aluminium border, blank plain white paper inside, no text,
stainless handrail in the foreground, cool even lighting, faint reflection on the frame glass,
straight-on frontal view, no people, photorealistic, 35mm --ar 4:5 --style raw
```

## 3. 駅の柱・ライトボックス（内側から光る枠）

```
Japanese train station platform pillar, backlit advertising light box, blank white glowing
panel, no text, evening platform, tiled floor, soft bloom around the light box edges,
straight-on frontal view, no people, photorealistic, 35mm --ar 3:4 --style raw
```

## 4. 街なかの掲示板（木の枠・屋外）

```
Japanese neighborhood public notice board, weathered wooden frame with a small roof,
one blank white sheet pinned inside, no text, narrow residential street, overcast daylight,
slight paper curl and pin shadows, straight-on frontal view, no people,
photorealistic, 35mm --ar 4:3 --style raw
```

## 5. 商店街のシャッター横・貼り紙

```
Japanese shopping street at dusk, closed metal shutter, a single blank white poster taped
flat on the concrete wall beside it, no text, slightly peeling corner, warm streetlight from
the left, wet asphalt reflection, straight-on frontal view, no people,
photorealistic, 35mm --ar 3:4 --style raw
```

## 6. バス停の広告枠（ガラス越し）

```
Japanese bus stop shelter at night, illuminated advertising panel behind glass, blank white
panel, no text, rain droplets on the glass, reflection of street lights, straight-on frontal
view, no people, photorealistic, 35mm --ar 3:4 --style raw
```

---

## 生成したあと（3手）

1. 気に入った1枚を **長辺 1600px 前後の jpg** にして `mock/` に置く
2. `list.json` に1行足す（`file` と `name` だけでいい）
3. 道具で開いて、**盤の四隅を掴んでポスター面に合わせる → 「いまの四隅を写す」** →
   コピーされた `faces` を `list.json` に貼る

⚠️ **Midjourney は面をわずかに歪ませる**（完全な長方形にならない）。
　 四隅は手で合わせるので、多少の歪みはむしろ本物らしくてよい。

⚠️ **面に何か描かれてしまった写真は使わない**。作品を比のまま収めると余白が出て、
　 そこに下の絵が見えてしまう。生成し直す方が早い。

## 権利

Midjourney で作った画像は、**有料プランなら商用利用できる**（生成物の権利は木下のもの）。
⭐ ここに置く写真の中でいちばん安全な出どころ ── 他社のロゴも、他人の顔も、最初から入らない。
