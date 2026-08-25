#!/bin/bash
# ══ 卓 TAKU 回帰テスト ══════════════════════════════════════
#  使い方：bash taku/_test/run.sh
#  ⭐ 本体（taku/index.html）を触ったら、渡す前にこれを流す。
#  ⭐ 見ているのは
#       ・例が机に載るか／札の高さが【実測】されているか
#       ・枠（章）が幾何で決まるか ── 離しても付いてくる／重ねても二重に数えない
#       ・並びがそのまま文章になるか（章の順・段落数・読む順のつまみ・余り）
#       ・⭐画面の版面と刷り上がりの版面が【同じ行で折れる】か（版下の道具の本丸）
#       ・地4種の刷り直し／升目の入切／捨てる→⌘Zが一回で戻るか
#       ・控え（JSON）の往復／PNG の中身と倍率
#  ⚠️ file:// では写真が読めず、ダウンロードも起きない。必ずサーバ越しに見る。
#  ⚠️ 落ちないテストは意味がない。最後に「わざと壊したら落ちるか」の検算あり。
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"        # 名称未設定/
PORT="${PORT:-8094}"
STARTED=0

if ! curl -s -o /dev/null "http://localhost:$PORT/taku/index.html"; then
  echo "· 確認用サーバを $PORT で立てる"
  (cd "$ROOT" && python3 -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 &)
  STARTED=1
  sleep 1.5
fi

PORT="$PORT" node "$ROOT/taku/_test/test.mjs"
CODE=$?

if [ "$STARTED" = "1" ]; then
  pkill -f "http.server $PORT" >/dev/null 2>&1
fi
exit $CODE
