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

if [ "${PENNG:-0}" = "1" ]; then exit 1; fi
exit $CODE
