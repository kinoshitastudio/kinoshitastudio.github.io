#!/bin/bash
# ══ 嵌 KAN 回帰テスト ══════════════════════════════════════
#  使い方：bash kan/_test/run.sh
#  ⭐ 見ているのは【嵌まっているか】＝四隅を動かすとその形に貼られるか・街を壊していないか。
#  ⚠️ file:// では見本（/assets/...）が読めない＝必ずサーバ越しに見る。
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${PORT:-8483}"
STARTED=0
if ! curl -sf "http://localhost:$PORT/kan/index.html" | grep -q 'id="b_city"'; then
  echo "· 確認用サーバを $PORT で立てる"
  (cd "$ROOT" && python3 -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 &)
  STARTED=1
  sleep 1.2
fi
node "$ROOT/kan/_test/kan.mjs" "http://localhost:$PORT/kan/"
CODE=$?
[ "$STARTED" = "1" ] && pkill -f "http.server $PORT" >/dev/null 2>&1
exit $CODE
