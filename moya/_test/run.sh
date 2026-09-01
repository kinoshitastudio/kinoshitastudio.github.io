#!/bin/bash
# ══ 靄 MOYA 回帰テスト ══════════════════════════════════════
#  ⭐ 見ているのは「落ちない」ではなく【素材ごとに調整していないか】
#     ・奥行きひとつで かすみ・ぼけ・色あせ が まとめて 変わる
#     ・灯を動かすと 置いた素材が全部いっしょに 変わる（＝焼き込んでいない）
#     ・切り抜きを消すと 1画素も同じに 戻る（＝元の写真を削っていない）
#
#  ══ 使い方（2026-09-01・2段にした）══════════════════════════
#   bash moya/_test/run.sh              … ぜんぶ（392本・実測 9分半ほど）★push の前は必ずこれ
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
#  ✅ 全章を1つずつ単独で流して確かめてある（bash moya/_test/verify-chapters.sh）。
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
# 🔴🔴 名前のかぶりは【流す前に】弾く（かぶると SyntaxError で1本も走らない）
#    2026-09-02 に `const SW` を二重に作って、9分待った末に全部死んだ。
node "$ROOT/moya/_test/pick.mjs" --dup || exit 1

TARGET="$ROOT/moya/_test/check.mjs"
if [ "$#" -gt 0 ]; then
  TARGET="$(node "$ROOT/moya/_test/pick.mjs" "$@")" || exit 1
else
  echo "· ぜんぶ流す（392本・9分半ほど）　※章だけなら  bash moya/_test/run.sh --list"
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
# 🔴🔴 ✅の数だけ見て「通った」と読まない（2026-09-02 に私がやった）。
#    章をまたぐ物差しが消えて **ok() が1本も 🔴 にならずにプロセスごと死ぬ** ことがある。
#    ＝最後に必ず一言で言う。読むのはここ。
if [ "$CODE" = "0" ]; then
  if [ "$#" -gt 0 ]; then
    echo "── ✅ 通った（ただし【選んだ章だけ】）── push の前に  bash moya/_test/run.sh  で全部流す"
  else
    echo "── ✅ ぜんぶ通った"
  fi
else
  # ⚠️ 全角の（）が変数名に食われるので ${} で囲む（2026-09-02 に踏んだ）
  echo "── 🔴 落ちた（終了コード ${CODE}）── ✅ の数が多くても【通っていない】。上の Error を読む"
  # 🔴🔴 2026-09-02：速い束の 🔴 が【本物とは限らない】と分かった。
  #   「角の丸み」「文字の上のバー」「地の色が覆われている」の3本が速い束では落ちたのに、
  #   全部流したら 401本ぜんぶ通った。＝その章は【前の章が残した画面の状態】を当てにしていて、
  #   変数の名前を辿るだけでは拾えない（章を単独で流すと通るので、章ごとの確認でも出ない）。
  #   ⭐ だから速い束の 🔴 は【全部流して確かめてから直す】。逆向きの間違いを防ぐ。
  [ "$#" -gt 0 ] && echo "   ⚠️ これは【選んだ章だけ】の結果。章の選び方の都合で落ちることがある。" \
    && echo "      直す前に  bash moya/_test/run.sh  で全部流して、本物か確かめる。"
fi
exit $CODE
