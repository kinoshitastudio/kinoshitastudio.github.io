#!/bin/bash
# ══ 貌 BOU 回帰テスト ══════════════════════════════════════
#  使い方：bash bou/_test/run.sh
#  ⭐ 見ているのは「落ちない」ではなく【ビットになっているか】
#     ・色数を下げると使われている色が実際に減る（ビット感の正体）
#     ・散らす＝2色のまま網になる／地を透かすと穴があく
#     ・段の表が1枚ずつ違う絵になり、版面が列×段になる
#     ・PNG／SVG が本当に落ちる・モバイルで横に伸びない
#  ⚠️ file:// では見本（/assets/...）が読めない＝必ずサーバ越しに見る。
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${PORT:-8477}"
STARTED=0
if ! curl -sf "http://localhost:$PORT/bou/index.html" | grep -q 'id="r_grid"'; then
  echo "· 確認用サーバを $PORT で立てる"
  (cd "$ROOT" && python3 -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 &)
  STARTED=1
  sleep 1.2
fi
node "$ROOT/bou/_test/bit.mjs" "http://localhost:$PORT/bou/"
CODE=$?
[ "$STARTED" = "1" ] && pkill -f "http.server $PORT" >/dev/null 2>&1
exit $CODE
