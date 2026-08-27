#!/bin/bash
# ══ 貼 HARI 回帰テスト ══════════════════════════════════════
#  使い方：bash hari/_test/run.sh
#  ⭐ 本体（hari/index.html）を触ったら、渡す前にこれを流す。
#  ⭐ 見ているのは
#       ・立ち上がって例が版面に載るか／例外が出ていないか
#       ・⭐選んでいる間だけ取っ手が出るか（選択と無関係に枠が出ると「いつも選ばれている」意味になる）
#       ・行を足す・複製・削除と ⌘Z が【一回で】戻るか
#       ・版面の大きさが UI に書いた数字どおりに効くか
#       ・4つの型（積む・巡る・下部・帯）が全部当たるか／振る→振る前に戻す
#       ・控え（JSON）の往復／PNG の縦横比と中身／SVG に字か形が入っているか
#       ・版面の外「薄く見せる／隠す」が絵に効くか
#       ・⭐左の道具立て（選ぶ／描く）が見えていて、どこから押しても印が揃うか
#       ・⭐書き心地が【引いている最中から】見えるか・【あとから】掛け直せるか
#       ・⭐紙の質感が重なるか（なしなら1画素も変わらないか・PNG/SVG にも出るか）
#       ・⭐⭐紙を裏返して書けるか（裏で引いた線が指の所に出る／表からは左右が入れ替わって透ける）
#       ・⭐傾けた行の【端】を掴んで幅が変わるか（触れるのに効かない、を残さない）
#       ・⭐⭐消しカスが控えに入るか（開き直すと同じカスが戻る）・まとめて捨てられるか・⌘Zで戻るか
#       ・⭐固定したら掴めないか・ガイドが濃い絵の上でも見えるか・紙の目のアイコンが押すたび変わるか
#       ・モバイルで横に伸びないか・掴み手が出るか・盤を引いてページが動かないか
#  ⚠️ file:// では写真が読めず、ダウンロードも起きない。必ずサーバ越しに見る。
#  ⚠️ 落ちないテストは意味がない。最後に「わざと壊したら落ちるか」の検算あり。
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"        # 名称未設定/
PORT="${PORT:-8098}"
STARTED=0

if ! curl -s -o /dev/null "http://localhost:$PORT/hari/index.html"; then
  echo "· 確認用サーバを $PORT で立てる"
  (cd "$ROOT" && python3 -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 &)
  STARTED=1
  sleep 1.5
fi

PORT="$PORT" node "$ROOT/hari/_test/test.mjs"
CODE=$?

if [ "$STARTED" = "1" ]; then
  pkill -f "http.server $PORT" >/dev/null 2>&1
fi

# ⭐ ✒️ 描く（2026-08-26）
echo
echo "── ✒️ 描く（書き心地つき）"
node "$(cd "$(dirname "$0")" && pwd)/pen.mjs" || PENNG=1

# ⭐ 左の道具立て（2026-08-26）
echo
node "$(cd "$(dirname "$0")" && pwd)/tools.mjs" || TOOLNG=1

# ⭐ 書き心地（引いている最中から見える／あとから掛け直す）（2026-08-26）
echo
node "$(cd "$(dirname "$0")" && pwd)/feel.mjs" || FEELNG=1

# ⭐ 紙の質感（2026-08-26）
echo
node "$(cd "$(dirname "$0")" && pwd)/kami.mjs" || KAMING=1

# ⭐⭐ 紙を裏返して書く（2026-08-27）
echo
node "$(cd "$(dirname "$0")" && pwd)/ura.mjs" || URANG=1

# ⭐ 傾けた行の端を掴んで幅を変える（2026-08-27 に見つけた古い不具合）
echo
node "$(cd "$(dirname "$0")" && pwd)/boxend.mjs" || BOXNG=1

# ⭐⭐ 消しカスを控える／まとめて捨てる（2026-08-27）
echo
node "$(cd "$(dirname "$0")" && pwd)/kasu.mjs" || KASUNG=1

# ⭐ パネルまわり（固定・ガイド・紙の目・版面の比）2026-08-27
echo
node "$(cd "$(dirname "$0")" && pwd)/panel.mjs" || PANELNG=1

# ⭐⭐ 複数選択・スペースで版面・掴んだ反対側から（2026-08-27）
echo
node "$(cd "$(dirname "$0")" && pwd)/multi.mjs" "http://localhost:$PORT" || MULTING=1

# ⭐ 「直す前と1画素も変わっていない」は same.mjs（前の版を渡して使う）
#    例： git show HEAD:hari/index.html > /tmp/old.html && node hari/_test/same.mjs /tmp/old.html

if [ "${PENNG:-0}" = "1" ] || [ "${TOOLNG:-0}" = "1" ] || [ "${FEELNG:-0}" = "1" ] || [ "${KAMING:-0}" = "1" ] || [ "${URANG:-0}" = "1" ] || [ "${BOXNG:-0}" = "1" ] || [ "${KASUNG:-0}" = "1" ] || [ "${PANELNG:-0}" = "1" ] || [ "${MULTING:-0}" = "1" ]; then exit 1; fi
exit $CODE
