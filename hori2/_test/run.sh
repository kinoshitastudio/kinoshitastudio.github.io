#!/bin/bash
# 彫 HORI2 ── 書き出しの回帰テスト（2026-08-24）
# ⭐ 木下が実際に踏んだ2つを、そのまま試験にした：
#   ① 4:5 の版面にしているのに動画だけ 9:16 で出た
#   ② 「動画で出す」を押すと、回す（SPIN）を消していても回ってしまう
# ⚠️ どちらも【直す前の版で必ず落ちること】を確かめてある（落ちない試験は意味がない）。
cd "$(dirname "$0")"
ng=0
echo "── ① 版面の形と動画の形が一致するか"
node tvshape.mjs || ng=1
echo
echo "── ② 回す を切ったら動画も回らないか"
node tvspin.mjs  || ng=1
echo
echo "── ③ 地なしPNG（オブジェクトだけ切り抜き）"
node nobg.mjs    || ng=1
echo
echo "── ④ SVG を置く（SAKUJI のパスが立体になるか）"
node svgin.mjs   || ng=1
echo
echo "── ⑤ SPIN は再生を押して初めて動く"
node play.mjs    || ng=1
echo
echo "── ⑥ 控え（JSON）の往復で位置がずれない"
node save.mjs    || ng=1
echo
[ $ng -eq 0 ] && echo "✅ ぜんぶ通った" || echo "🔴 落ちたものがある"
# ⭐ 見えが変わっていないかは、直す前のファイルを渡して別に流す：
#    git show HEAD:hori2/index.html > /tmp/hori2_head.html
#    node hori2/_test/same.mjs /tmp/hori2_head.html
exit $ng
