#!/bin/bash
# ══ 靄 MOYA 回帰テスト ══════════════════════════════════════
#  ⭐ 見ているのは「落ちない」ではなく【素材ごとに調整していないか】
#     ・奥行きひとつで かすみ・ぼけ・色あせ が まとめて 変わる
#     ・灯を動かすと 置いた素材が全部いっしょに 変わる（＝焼き込んでいない）
#     ・切り抜きを消すと 1画素も同じに 戻る（＝元の写真を削っていない）
#
#  ══ 使い方（2026-09-01・2段にした）══════════════════════════
#   bash moya/_test/run.sh              … ぜんぶ（384本・実測 9分23秒）★push の前は必ずこれ
#   bash moya/_test/run.sh --list       … 章の一覧（番号・本数・見出し）
#   bash moya/_test/run.sh 筆           … 芯 ＋「筆」を含む章だけ（速い束）
#   bash moya/_test/run.sh パス マスク    … 言葉はいくつでも（どれかに当たる章ぜんぶ）
#   bash moya/_test/run.sh --n 12,13    … 番号で選ぶ
#   bash moya/_test/run.sh --core       … 芯だけ（51本）
#
#  🔴 なぜ2段にしたか（実測）
#   ・384本ぜんぶで 9分23秒。そのうち **387回の待ち＝245秒（43%）** はただの sleep。
#   ・小さな直し1つのたびに 9分待っていた＝待ち時間が仕事より長かった。
#  ⭐ 速い束でも【芯（①〜⑨・51本）】と【JSエラーが出ない】は必ず流す。
#     ＝関係ない所を壊したらそこで落ちる。
#  🔴🔴 速い束が通っても【直したことにはならない】。push の前は引数なしで全部流す。
#     → feedback_regression_test_before_push
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${PORT:-8479}"

# ── 章の一覧を見るだけなら、サーバもブラウザも要らない ──
if [ "${1:-}" = "--list" ]; then
  node "$ROOT/moya/_test/pick.mjs" --list
  exit 0
fi

# ── 引数があれば【選んだ章だけ】を組み直した使い捨ての1本を作る ──
#    ⚠️ 直すのはいつも check.mjs の方（.pick.mjs は毎回捨てて作り直す）
TARGET="$ROOT/moya/_test/check.mjs"
if [ "$#" -gt 0 ]; then
  TARGET="$(node "$ROOT/moya/_test/pick.mjs" "$@")" || exit 1
else
  echo "· ぜんぶ流す（384本・9分ほど）　※章だけなら  bash moya/_test/run.sh --list"
fi

STARTED=0
if ! curl -sf "http://localhost:$PORT/moya/index.html" | grep -q 'id="r_haze"'; then
  echo "· 確認用サーバを $PORT で立てる"
  # ⚠️ 前に落とし損ねた同じポートの居残りが居ると bind に失敗する（＝つながらない）。
  #    ポートを名指しで片付けてから立てる → feedback_kill_by_port_not_by_pattern
  pkill -f "http.server $PORT" >/dev/null 2>&1
  (cd "$ROOT" && python3 -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 &)
  STARTED=1
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    curl -sf "http://localhost:$PORT/moya/index.html" >/dev/null 2>&1 && break
    sleep 0.5
  done
fi
node "$TARGET" "http://localhost:$PORT/moya/"
CODE=$?
[ "$STARTED" = "1" ] && pkill -f "http.server $PORT" >/dev/null 2>&1
exit $CODE
