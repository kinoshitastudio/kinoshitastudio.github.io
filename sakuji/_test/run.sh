#!/bin/bash
# SAKUJI 回帰テスト ── 本体を触らず、コピーにテストを差し込んで headless Chrome で読む
#   使い方:  bash run_test.sh
#   ⚠️ 本体 index.html は1行も変えない。テスト用のコピーは毎回作り直して最後に消す。
set -u
SRC="/Users/kinoshitatakahiro/Desktop/GitHub-clone/名称未設定/sakuji/index.html"
DIR="$(dirname "$SRC")"
SP="$DIR/_test"
TMP="$DIR/__test.html"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# 1) コピーを作り、</body> の直前にテストを差し込む
python3 - "$SRC" "$DIR/_test/regression.js" "$TMP" <<'PY'
import sys
src, test, out = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(src, encoding='utf-8').read()
t = open(test, encoding='utf-8').read()
i = s.rfind('</body>')
if i < 0: i = s.rfind('</html>')
open(out, 'w', encoding='utf-8').write(s[:i] + '\n<script>\n' + t + '\n</script>\n' + s[i:])
PY

# 2) 配信中のサーバ経由で読む（file:// だと CDN と localStorage が使えない）
PORT=8090
curl -s -o /dev/null "http://localhost:$PORT/__test.html" || { echo "🔴 localhost:$PORT が動いていない"; rm -f "$TMP"; exit 1; }

rm -rf /tmp/_chrtest && mkdir -p /tmp/_chrtest
"$CHROME" --headless=new --disable-gpu --no-sandbox --user-data-dir=/tmp/_chrtest \
  --virtual-time-budget=6000 --dump-dom "http://localhost:$PORT/__test.html" \
  > /tmp/_test_dom.html 2>/tmp/_test_err.txt &
CHPID=$!
# --virtual-time-budget が効かない場合に備えて自前で待つ
for i in $(seq 1 30); do
  sleep 1
  grep -q "__ALL_PASS__\|__HAS_FAIL__" /tmp/_test_dom.html 2>/dev/null && break
  kill -0 $CHPID 2>/dev/null || break
done
kill $CHPID 2>/dev/null; wait $CHPID 2>/dev/null

# 3) 結果を取り出す
python3 - <<'PY'
import re, html
try:
    s = open('/tmp/_test_dom.html', encoding='utf-8').read()
except Exception:
    print('🔴 DOM が取れなかった'); raise SystemExit(1)
m = re.search(r'<pre id="__RESULT">(.*?)</pre>', s, re.S)
if not m:
    print('🔴 テスト結果が見つからない（起動時に落ちた可能性）')
    for pat in ('Uncaught', 'ReferenceError', 'TypeError'):
        for h in re.findall(pat + r'[^<\n]{0,120}', s)[:3]: print('   ', h)
    raise SystemExit(1)
print(html.unescape(m.group(1)).strip())
PY
RC=$?

rm -f "$TMP"           # ⚠️ 公開フォルダなので必ず消す

# ⭐ 書き心地の切り替え（2026-08-26）
echo
echo "── 書き心地（刃HA／擦SURE／滲NIJIMI）"
node "$(cd "$(dirname "$0")" && pwd)/feel.mjs" || FEELNG=1

# ⭐ 書き心地を引いている最中から見せる／あとから掛け直す（2026-08-26 夜）
echo
node "$(cd "$(dirname "$0")" && pwd)/feel2.mjs" || FEEL2NG=1

# ⭐ 盤の上のショートカット（2026-08-28）＝パスの出し入れ／入れるドロップダウン
echo
echo "── パスを出す／出さない（H）"
node "$(cd "$(dirname "$0")" && pwd)/pathview.mjs" || PVNG=1
echo
echo "── 入れる（画像・SVG のドロップダウン）"
node "$(cd "$(dirname "$0")" && pwd)/addmenu.mjs" || ADDNG=1

echo
echo "── 枠を外したら升目も出さない"
node "$(cd "$(dirname "$0")" && pwd)/gridoff.mjs" || GRIDNG=1
echo
echo "── 見出しの帯（両方の明るさで測る）"
node "$(cd "$(dirname "$0")" && pwd)/head.mjs" || HEADNG=1

echo
echo "── 下描き（鉛筆・消しゴム）"
node "$(cd "$(dirname "$0")" && pwd)/pencil.mjs" || PENNG=1
echo
echo "── 鉛筆・消しゴムのフライアウトとカーソル"
node "$(cd "$(dirname "$0")" && pwd)/penmenu.mjs" || PMNG=1
echo
echo "── 手のゆらぎ（調整できる・開いた線を閉じない）"
node "$(cd "$(dirname "$0")" && pwd)/wobble.mjs" || WBNG=1
echo
echo "── アンカーを扱う（選ぶ・⇧で複数・足す・消す・続きから描く）"
node "$(cd "$(dirname "$0")" && pwd)/anchor.mjs" || ANNG=1
echo
echo "── 続きから描ける所の合図（ペン）"
node "$(cd "$(dirname "$0")" && pwd)/pencue.mjs" || CUENG=1
echo
echo "── 盤が付いてくる（オートパン）"
node "$(cd "$(dirname "$0")" && pwd)/autopan.mjs" || PANNG=1
echo
echo "── 盤の上で回す"
node "$(cd "$(dirname "$0")" && pwd)/rotate.mjs" || ROTNG=1
echo
echo "── フリーハンドも続きから引ける・繋がる"
node "$(cd "$(dirname "$0")" && pwd)/brushjoin.mjs" || BJNG=1

if [ "${FEELNG:-0}" = "1" ] || [ "${FEEL2NG:-0}" = "1" ] \
   || [ "${PVNG:-0}" = "1" ] || [ "${ADDNG:-0}" = "1" ] \
   || [ "${GRIDNG:-0}" = "1" ] || [ "${HEADNG:-0}" = "1" ] \
   || [ "${PENNG:-0}" = "1" ] || [ "${PMNG:-0}" = "1" ] || [ "${WBNG:-0}" = "1" ] || [ "${ANNG:-0}" = "1" ] || [ "${CUENG:-0}" = "1" ] \
   || [ "${PANNG:-0}" = "1" ] || [ "${ROTNG:-0}" = "1" ] || [ "${BJNG:-0}" = "1" ]; then exit 1; fi
exit $RC
