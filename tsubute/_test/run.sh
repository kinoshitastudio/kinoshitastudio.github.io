#!/bin/bash
# ⭐ 礫 TSUBUTE の回帰テスト ── 直したら push の前にこれを流す。
# ⚠️ 本体は1バイトも触らない＝コピーを作り、別ポートで立てて headless の実物に当てる。
# ⚠️ この道具は <script type="module">＝中の値を外から読めない。画素で測る。
#
# 使い方: bash tsubute/_test/run.sh
set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
SRV=""
cleanup(){ if [ -n "$SRV" ]; then kill "$SRV" 2>/dev/null; wait "$SRV" 2>/dev/null; fi; rm -rf "$WORK"; }
trap cleanup EXIT

mkdir -p "$WORK/site/tsubute"
cp "$HERE/index.html" "$WORK/site/tsubute/index.html"

# ── 空いているポートを探す（他のセッションのサーバを踏まない） ──
PORT=""
for p in $(seq 8500 8540); do
  if ! lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then PORT="$p"; break; fi
done
if [ -z "$PORT" ]; then echo "🔴 空いているポートが無い"; exit 1; fi

python3 -m http.server "$PORT" --directory "$WORK/site" >/dev/null 2>&1 &
SRV=$!
for i in $(seq 1 20); do
  curl -sf "http://localhost:$PORT/tsubute/" >/dev/null 2>&1 && break
  sleep 0.3
done
if ! curl -sf "http://localhost:$PORT/tsubute/" | grep -q 'id="bPh"'; then
  echo "🔴 立てたはずの画面が礫ではない（ポート $PORT）。テストを始めない"; exit 1
fi
echo "（${PORT} で立てた・${WORK}）"

NG=0
echo
echo "── 写真から形を作る（しきい・反転・字に戻す）"
node "$HERE/_test/photo.mjs" "http://localhost:$PORT/tsubute/" || NG=1

echo
[ "$NG" = 0 ] && echo "✅ 全部通った" || echo "🔴 落ちたものがある（上を見る）"
exit "$NG"
