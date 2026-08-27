#!/bin/bash
# ⭐ 蝕 SHOKU の回帰テスト ── 直したら push の前にこれを流す。
# ⚠️ 本体は1バイトも触らない＝コピーを作り、別ポートで立てて headless の実物に当てる。
# 🔴 決め打ちのポートは【別セッションのサーバ】で埋まっていることがある（2026-08-14 に踏んだ）。
#    ⭐ 空きポートを探し、立てたあと【本当に蝕か】を確かめてから始める。
#
# 使い方: bash shoku/_test/run.sh
set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
WORK="$(mktemp -d)"
SRV=""
cleanup(){ [ -n "$SRV" ] && kill "$SRV" 2>/dev/null; rm -rf "$WORK"; }
trap cleanup EXIT

mkdir -p "$WORK/site"
cp -R "$HERE" "$WORK/site/shoku"

PORT=""
for p in $(seq 8440 8480); do
  if ! lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then PORT="$p"; break; fi
done
if [ -z "$PORT" ]; then echo "🔴 空いているポートが無い"; exit 1; fi

python3 -m http.server "$PORT" --directory "$WORK/site" >/dev/null 2>&1 &
SRV=$!
for i in $(seq 1 20); do
  curl -sf "http://localhost:$PORT/shoku/" >/dev/null 2>&1 && break
  sleep 0.3
done
if ! curl -sf "http://localhost:$PORT/shoku/" | grep -q '蝕 SHOKU'; then
  echo "🔴 立てた画面が蝕ではない（ポート $PORT）。テストを始めない"; exit 1
fi
echo "（${PORT} で立てた）"
echo

NG=0
echo "── ① つまみ総当たり／渡り／出す／⌘Z"
node "$HERE/_test/knobs.mjs" "http://localhost:$PORT" || NG=1
echo
echo "── ② 版面のかたちと、出る大きさ"
node "$HERE/_test/paper.mjs" "http://localhost:$PORT" || NG=1
echo
echo "── ③ モバイルの掴み手（道具ぜんぶ横断のテストを1本に当てる）"
node "$ROOT/_test/sheet.mjs" "http://localhost:$PORT" shoku || NG=1

echo
[ "$NG" = 0 ] && echo "✅ 全部通った" || echo "🔴 落ちたものがある（上を見る）"
exit "$NG"
