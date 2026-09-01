#!/bin/bash
# ══⭐⭐ 速い束が【嘘をつかないか】を1章ずつ確かめる ══ 2026-09-01
#  🔴 なぜ要るか：章を選んで流すと、その章が前の章の作った状態を当てにしていた場合、
#     「直したせいで落ちた」のか「素材が無いだけ」なのか見分けが付かない。
#     ＝ぶれる試験は、落ちない試験よりもっと悪い（feedback_regression_test_before_push）。
#  ⭐ だから【1章ずつ単独で流して、ぜんぶ通ることを1回証明しておく】。
#     通らない章＝前の章が要る章 → その章の見出しに @下地 を付けて解く。
#  使い方: bash moya/_test/verify-chapters.sh
#  ⚠️ 1章ずつ順に流す（重ねて走らせない → feedback_kill_by_port_not_by_pattern）。
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${PORT:-8479}"
OUT="${1:-/tmp/moya-chapters.txt}"

# サーバは【1回だけ】立てて使い回す（毎章 立て直すと 53回ぶん無駄）
pkill -f "http.server $PORT" >/dev/null 2>&1
(cd "$ROOT" && python3 -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 &)
for _ in 1 2 3 4 5 6 7 8 9 10; do
  curl -sf "http://localhost:$PORT/moya/index.html" >/dev/null 2>&1 && break
  sleep 0.5
done

N=$(node "$ROOT/moya/_test/pick.mjs" --list | grep -c '^  *[0-9]')
: > "$OUT"
echo "· 章 $N 個を1つずつ単独で流す（$OUT に書く）"
for k in $(seq 1 "$N"); do
  NAME=$(node "$ROOT/moya/_test/pick.mjs" --list | awk -v k="$k" '$1==k{$1="";$2="";print}' | sed 's/^ *//')
  T0=$(date +%s)
  F=$(node "$ROOT/moya/_test/pick.mjs" --n "$k" 2>/dev/null) || { echo "$k	組めない	$NAME" >> "$OUT"; continue; }
  LOG=$(node "$F" "http://localhost:$PORT/moya/" 2>&1)
  CODE=$?
  T=$(( $(date +%s) - T0 ))
  OKN=$(printf '%s' "$LOG" | grep -c '^  ✅')
  NGN=$(printf '%s' "$LOG" | grep -c '^  🔴')
  if [ "$CODE" = "0" ]; then S="✅"; else S="🔴"; fi
  printf '%s\t%s\t%s本OK\t%s本NG\t%s秒\t%s\n' "$k" "$S" "$OKN" "$NGN" "$T" "$NAME" >> "$OUT"
  printf '  %s %2s  %3s本OK %2s本NG %4s秒  %s\n' "$S" "$k" "$OKN" "$NGN" "$T" "$NAME"
  # 落ちた章は、その中の🔴の文だけ残す（あとで @下地 が要るか読む）
  [ "$CODE" != "0" ] && printf '%s' "$LOG" | grep '^  🔴' | sed 's/^/	/' >> "$OUT"
done
pkill -f "http.server $PORT" >/dev/null 2>&1
echo "── 落ちた章 ──"; grep -c '	🔴	' "$OUT" || true
