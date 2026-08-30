#!/bin/bash
# ══ 靄 MOYA 回帰テスト ══════════════════════════════════════
#  使い方：bash moya/_test/run.sh
#  ⭐ 見ているのは「落ちない」ではなく【素材ごとに調整していないか】
#     ・奥行きひとつで かすみ・ぼけ・色あせ が まとめて 変わる
#     ・灯を動かすと 置いた素材が全部いっしょに 変わる（＝焼き込んでいない）
#     ・切り抜きを消すと 1画素も同じに 戻る（＝元の写真を削っていない）
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${PORT:-8479}"
STARTED=0
if ! curl -sf "http://localhost:$PORT/moya/index.html" | grep -q 'id="r_haze"'; then
  echo "· 確認用サーバを $PORT で立てる"
  (cd "$ROOT" && python3 -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 &)
  STARTED=1
  sleep 1.2
fi
node "$ROOT/moya/_test/check.mjs" "http://localhost:$PORT/moya/"
CODE=$?
[ "$STARTED" = "1" ] && pkill -f "http.server $PORT" >/dev/null 2>&1
exit $CODE
