#!/bin/bash
# ══ 膜 MAKU 回帰テスト ══════════════════════════════════════
#  使い方：bash maku/_test/run.sh
#  ⭐ 本体（maku/index.html）を触ったら push の前にこれを流す。
#  ⭐ 見ているのは「歪み（ワープ・辺ごと・3層）が版ごとに効き、他の版を巻き込まないか」。
#     実際に headless Chrome で描かせて【画素】で確かめる＝内部の値だけでは
#     「GLに届いていない」壊れ方を見逃す。
#  ⚠️ 落ちないテストは意味がない。測り方を変えたら、わざと壊した版で
#     落ちることを必ず確かめてから直す（2026-08-06 に2回すり抜けた）。
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"     # 名称未設定/
PORT="${PORT:-8093}"
STARTED=0

if ! curl -s -o /dev/null "http://localhost:$PORT/maku/index.html"; then
  echo "· 確認用サーバを $PORT で立てる"
  (cd "$ROOT" && python3 -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 &)
  STARTED=1
  sleep 1
fi

PORT="$PORT" node "$ROOT/maku/_test/test.mjs"
CODE=$?

if [ "$STARTED" = "1" ]; then
  pkill -f "http.server $PORT" >/dev/null 2>&1
fi
exit $CODE
