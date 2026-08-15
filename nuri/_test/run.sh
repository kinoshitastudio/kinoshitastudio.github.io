#!/bin/bash
# ⭐ 塗 NURI の回帰テスト。使い方: bash nuri/_test/run.sh
# ⚠️ 本体は触らずコピーを立てて当てる。
# 🔴 決め打ちのポートは【別のセッションのサーバ】で埋まっていることがある（2026-08-14 に踏んだ）。
#    ①空きポートを探し ②立てたあと【本当に TEN か】を確かめてから始める。
set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"; SRV=""
cleanup(){ [ -n "$SRV" ] && kill "$SRV" 2>/dev/null; rm -rf "$WORK"; }
trap cleanup EXIT

mkdir -p "$WORK/site"
NAME="$(basename "$HERE")"
cp -R "$HERE" "$WORK/site/$NAME"

PORT=""
for p in $(seq 8340 8380); do
  lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1 || { PORT="$p"; break; }
done
[ -z "$PORT" ] && { echo "🔴 空いているポートが無い"; exit 1; }

python3 -m http.server "$PORT" --directory "$WORK/site" >/dev/null 2>&1 &
SRV=$!
for i in $(seq 1 20); do curl -sf "http://localhost:$PORT/$NAME/" >/dev/null 2>&1 && break; sleep 0.3; done
if ! curl -sf "http://localhost:$PORT/$NAME/" | grep -q 'id="b_png"'; then
  echo "🔴 立てた画面が TEN ではない（ポート ${PORT}）。テストを始めない"; exit 1
fi
echo "（${PORT} で立てた）"
echo
node "$HERE/_test/check.mjs" "http://localhost:$PORT/$NAME/"
