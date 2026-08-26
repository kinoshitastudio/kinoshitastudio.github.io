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
ng=0
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"     # 名称未設定/
STARTED=0

# 🔴 2026-08-15 に踏んだ ── 決め打ちの 8093 は【別セッションの MASU のサーバ】で埋まっていて、
#    そちらのページに当たり「SHEETS が無い」で落ちた（＝本体が壊れたように見える）。
#    ⭐ 空きポートを探し、立てたあと【本当に MAKU か】を確かめてから始める。
if [ -z "${PORT:-}" ]; then
  for p in $(seq 8460 8500); do
    if ! lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then PORT="$p"; break; fi
  done
fi
[ -z "${PORT:-}" ] && { echo "🔴 空いているポートが無い"; exit 1; }

if ! curl -sf "http://localhost:$PORT/maku/index.html" | grep -q 'id="anGo"'; then
  echo "· 確認用サーバを $PORT で立てる"
  (cd "$ROOT" && python3 -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 &)
  STARTED=1
  sleep 1
fi

if ! curl -sf "http://localhost:$PORT/maku/index.html" | grep -q 'id="anGo"'; then
  echo "🔴 立てた画面が MAKU ではない（ポート ${PORT}）。テストを始めない"; exit 1
fi
echo "（${PORT} で流す）"
PORT="$PORT" node "$ROOT/maku/_test/test.mjs"
CODE=$?

if [ "$STARTED" = "1" ]; then
  pkill -f "http.server $PORT" >/dev/null 2>&1
fi

# ⭐ SVG を読み込めるか（2026-08-26 木下「Maku と Tsubu で svg 読み込みを確認しないとだね」）
echo
echo "── SVG を読み込む（作字SAKUJI のパス）"
node "$(cd "$(dirname "$0")/../.." && pwd)/_test/svgin.mjs" maku || SVGNG=1

# ⭐ 画像の版の見え（2026-08-26 木下「画像で選択しているのに文字が変化しているね」）
echo
node "$(cd "$(dirname "$0")" && pwd)/tint.mjs" || TINTNG=1

if [ "${SVGNG:-0}" = "1" ] || [ "${TINTNG:-0}" = "1" ]; then exit 1; fi
exit $CODE
