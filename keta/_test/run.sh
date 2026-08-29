#!/bin/bash
# ══ 桁 KETA 回帰テスト ══════════════════════════════════════
#  使い方：bash keta/_test/run.sh
#  ⭐ 見ているのは「落ちない」ではなく【この道具の芯が動いているか】
#     ・桁を動かしても【絵（塗るマス）は1マスも変わらない】のに、出る絵は変わる
#     ・ならす＝ぴったり一様（ただのドット絵に戻せる）／振れは端まで効く
#     ・盤の境目をつまむと隣り合う2本だけが動き、合計は 1 のまま
#     ・設定の往復で【道が1文字も違わずに】戻る（手で直した桁も）
#  ⚠️ file:// では書体が読めない＝必ずサーバ越しに見る。
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${PORT:-8478}"
STARTED=0
if ! curl -sf "http://localhost:$PORT/keta/index.html" | grep -q 'id="r_wamp"'; then
  echo "· 確認用サーバを $PORT で立てる"
  (cd "$ROOT" && python3 -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 &)
  STARTED=1
  sleep 1.2
fi
node "$ROOT/keta/_test/check.mjs" "http://localhost:$PORT/keta/"
CODE=$?
[ "$STARTED" = "1" ] && pkill -f "http.server $PORT" >/dev/null 2>&1
exit $CODE
