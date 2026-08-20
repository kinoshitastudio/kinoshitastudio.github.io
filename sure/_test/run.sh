#!/bin/bash
# ⭐ 擦 SURE の回帰テスト。使い方: bash projects/sure_tk/_test/run.sh
# ⚠️ 本体は触らずコピーを立てて当てる。
# ⚠️ 試作は projects/sure_tk/、公開したら別のフォルダ名になる＝入っている場所から名前を取る。
set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"
NAME="$(basename "$HERE")"
WORK="$(mktemp -d)"; SRV=""
cleanup(){ [ -n "$SRV" ] && kill "$SRV" 2>/dev/null; rm -rf "$WORK"; }
trap cleanup EXIT

mkdir -p "$WORK/site"
cp -R "$HERE" "$WORK/site/$NAME"

PORT=""
for p in $(seq 8510 8550); do
  lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1 || { PORT="$p"; break; }
done
[ -z "$PORT" ] && { echo "🔴 空いているポートが無い"; exit 1; }

python3 -m http.server "$PORT" --directory "$WORK/site" >/dev/null 2>&1 &
SRV=$!
for i in $(seq 1 20); do curl -sf "http://localhost:$PORT/$NAME/" >/dev/null 2>&1 && break; sleep 0.3; done
if ! curl -sf "http://localhost:$PORT/$NAME/" | grep -q 'id="r_rough"'; then
  echo "🔴 立てた画面が SURE ではない（ポート ${PORT}）。テストを始めない"; exit 1
fi
echo "（${PORT} で立てた）"

node "$HERE/_test/check.mjs" "http://localhost:$PORT/$NAME/"
