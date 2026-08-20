#!/bin/bash
# ⭐⭐ 道具ぜんぶの「モバイルで掴んで伸ばすパネル」を通しで見る（2026-08-21 新設）
#   使い方: bash _test/run.sh          （掴み手が入っている道具を自動で拾う）
#           bash _test/run.sh hori chu （道具を指定する）
#
# 🔴 2026-08-14 に踏んだ ── 決め打ちのポートが【別のセッションのサーバ】で埋まっていて、
#    そちらの別プロダクトに当たっていた。⭐ 空きポートを探し、身元を確かめてから始める。
set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"

# ── ① 掴み手が入っている道具を拾う（指定が無いとき） ──
if [ "$#" -gt 0 ]; then
  TOOLS="$*"
else
  TOOLS="$(grep -rl 'sheetGrip' "$HERE" --include=index.html \
    | sed "s|^$HERE/||; s|/index.html$||" | sort | tr '\n' ' ')"
fi
if [ -z "$TOOLS" ]; then echo "🔴 掴み手の入った道具が1つも無い"; exit 1; fi
echo "対象（$(echo "$TOOLS" | wc -w | tr -d ' ') 本）: $TOOLS"

# ── ② 空いているポートを探す ──
PORT=""
for p in $(seq 8390 8430); do
  if ! lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then PORT="$p"; break; fi
done
if [ -z "$PORT" ]; then echo "🔴 空いているポートが無い"; exit 1; fi

python3 -m http.server "$PORT" --directory "$HERE" >/dev/null 2>&1 &
SRV=$!
cleanup(){ kill "$SRV" 2>/dev/null; }
trap cleanup EXIT
for i in $(seq 1 20); do
  curl -sf "http://localhost:$PORT/" >/dev/null 2>&1 && break
  sleep 0.3
done

# ── ③ 本当にこのサイトか確かめてから始める ──
FIRST="$(echo "$TOOLS" | awk '{print $1}')"
if ! curl -sf "http://localhost:$PORT/${FIRST}/" | grep -q 'sheetGrip'; then
  echo "🔴 立てた画面に掴み手が無い（ポート $PORT）。テストを始めない"; exit 1
fi
echo "（${PORT} で立てた）"
echo

node "$HERE/_test/sheet.mjs" "$PORT" $TOOLS
