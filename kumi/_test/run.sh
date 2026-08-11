#!/bin/bash
# ══ 組 KUMI 回帰テスト ══════════════════════════════════════
#  使い方：bash kumi/_test/run.sh
#  ⭐ 本体（kumi/index.html）を触ったら push の前にこれを流す。
#  ⭐ 見ているのは「NURI のつまみが【実際に絵を変えるか】」。UI から動かすので
#     "完成しているのに入口が死ぬ" 型（到達できない）も同時に捕まる。
#  🔴 KUMI は IKI（呼吸・揺れ）と GRAIN で毎フレーム絵が動く＝そのままでは
#     画面の指紋を比べても意味がない。まず時間を止めて【静止】を確かめてから測る。
#  ⚠️ 落ちないテストは意味がない。中で「黒の幅0のとき黒の位置は効かないはず」を
#     わざと測って、落ちる側も見えていることを確かめている。
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"     # 名称未設定/
PORT="${PORT:-8097}"
STARTED=0

if ! curl -s -o /dev/null "http://localhost:$PORT/kumi/index.html"; then
  echo "· 確認用サーバを $PORT で立てる"
  (cd "$ROOT" && python3 -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 &)
  STARTED=1
  sleep 1
fi

PORT="$PORT" node "$ROOT/kumi/_test/knobs.mjs"
CODE=$?

if [ "$STARTED" = "1" ]; then
  pkill -f "http.server $PORT" >/dev/null 2>&1
fi
exit $CODE
