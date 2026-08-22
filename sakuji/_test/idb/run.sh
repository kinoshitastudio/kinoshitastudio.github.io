#!/bin/bash
# ══ 読み込んだ書体が【リロードを越えて残るか】 ══════════════════════════════
#   使い方:  bash sakuji/_test/idb/run.sh   （localhost:8090 が動いていること）
#
# ⭐ 回帰テスト（_test/run.sh）では測れない。1枚の画面では「開き直す」が作れないため。
#    ここでは【同じプロファイルで Chrome を2回開く】＝それが本物のリロード。
#
# 🔴🔴 --virtual-time-budget は使わない。あれは【時計を止める】ので
#    IndexedDB が返らず、performance.now() も 0 になり、rAF も回らない。
#    （2026-08-21〜22 に「headless では IDB が見られない」と誤って結論した原因がこれ）
# ⚠️ そのぶん --dump-dom が読み込み直後に吐いてしまうので、
#    結果は下の小さな口（127.0.0.1）へ POST して受け取る。
#
# ⚠️ 本体 index.html は1行も変えない。差し込んだコピーは毎回消す。
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
DIR="$(cd "$HERE/../.." && pwd)"          # = sakuji/
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT=8090
LOGPORT=8919
PROF=/tmp/_chr_idb
LOG=/tmp/_idb_log.txt

cleanup(){ kill $SRVPID 2>/dev/null; rm -f "$DIR/__idb_write.html" "$DIR/__idb_read.html"; }
trap cleanup EXIT

curl -s -o /dev/null "http://localhost:$PORT/index.html" || { echo "🔴 localhost:$PORT が動いていない"; exit 1; }

rm -f "$LOG"; touch "$LOG"
python3 "$HERE/logsrv.py" $LOGPORT "$LOG" &
SRVPID=$!
sleep 1
rm -rf "$PROF"; mkdir -p "$PROF"          # ⭐ まっさらから始める（残り物で通ってしまわないように）

pass () {   # $1=差し込むテスト  $2=名前
  TMP="$DIR/__idb_$2.html"
  python3 - "$DIR/index.html" "$1" "$TMP" <<'PY'
import sys
src, test, out = sys.argv[1], sys.argv[2], sys.argv[3]
s=open(src,encoding='utf-8').read(); t=open(test,encoding='utf-8').read()
i=s.rfind('</body>')
if i<0: i=s.rfind('</html>')
open(out,'w',encoding='utf-8').write(s[:i]+'\n<script>\n'+t+'\n</script>\n'+s[i:])
PY
  echo "--- $2 ---" >> "$LOG"
  # ⚠️ 1回目の印が残っているので【印が増えたか】で見る（そうしないと2回目が即抜ける）
  BEFORE=$(grep -c "__ALL_PASS__\|__HAS_FAIL__" "$LOG" 2>/dev/null | tr -d ' \n')
  "$CHROME" --headless=new --disable-gpu --no-sandbox --user-data-dir="$PROF" \
    --window-size=1200,800 "http://localhost:$PORT/__idb_$2.html" >/dev/null 2>&1 &
  PID=$!
  for i in $(seq 1 40); do
    sleep 1
    NOW=$(grep -c "__ALL_PASS__\|__HAS_FAIL__" "$LOG" 2>/dev/null | tr -d ' \n')
    [ "${NOW:-0}" -gt "${BEFORE:-0}" ] && break
    kill -0 $PID 2>/dev/null || break
  done
  sleep 1
  kill $PID 2>/dev/null; wait $PID 2>/dev/null
  rm -f "$TMP"
}

pass "$HERE/write.js" write
pass "$HERE/read.js"  read
echo "════ 結果 ════"
cat "$LOG"
echo "════"
grep -q "__HAS_FAIL__" "$LOG" && exit 1
exit 0
