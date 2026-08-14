#!/bin/bash
# ══ 網 AMI 回帰テスト ══════════════════════════════════════
#  使い方：bash ami/_test/run.sh
#  ⭐ 本体（ami/index.html）を触ったら、渡す前にこれを流す。
#  ⭐ 見ているのは
#       ・層（画像・文字）が【絵に】効くか（内部の値だけ見ると「置けたのに見えない」を見逃す）
#       ・動きが継ぎ目なくループするか（位相0と位相1が1粒も違わないか）
#       ・10種の網が全部刷れるか
#       ・控え（JSON）と 戻す（⌘Z）の往復
#       ・動画（mp4 / PNG連番）が実際に出るか
#  ⚠️ 落ちないテストは意味がない。最後に「わざと端数の位相を入れたら落ちるか」の検算あり。
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"        # 名称未設定/
PORT="${PORT:-8092}"
STARTED=0

if ! curl -s -o /dev/null "http://localhost:$PORT/ami/index.html"; then
  echo "· 確認用サーバを $PORT で立てる"
  (cd "$ROOT" && python3 -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 &)
  STARTED=1
  sleep 1.5
fi

PORT="$PORT" node "$ROOT/ami/_test/test.mjs"
CODE=$?

if [ "$STARTED" = "1" ]; then
  pkill -f "http.server $PORT" >/dev/null 2>&1
fi
exit $CODE
