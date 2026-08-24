#!/bin/bash
# 連 REN 回帰テスト ── 本体を触らず、コピーに試験を差し込んで headless Chrome で読む
#   使い方:  bash ren/_test/run.sh          … 判定を出す
#            bash ren/_test/run.sh shot     … 並べた1コマの絵を撮る（_out.png）
# ⚠️ 本体 index.html は1行も変えない。試験用のコピーは毎回作り直して最後に消す。
# 🔴 REN の中身は <script type="module"> なので、別の <script> からは中が【見えない】。
#    だから </body> の前ではなく【モジュールの中（frameAt(0); の直後）】に差し込む。
set -u
DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$DIR/index.html"
MODE="${1:-test}"
JS="$DIR/_test/narabe.js"; OUT="__test.html"
[ "$MODE" = "shot" ] && { JS="$DIR/_test/shot.js"; OUT="__shot.html"; }
TMP="$DIR/$OUT"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT=8092

python3 - "$SRC" "$JS" "$TMP" <<'PY'
import sys
src, test, out = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(src, encoding='utf-8').read()
t = open(test, encoding='utf-8').read()
m = 'frameAt(0);\n</script>'
if m not in s:
    print('🔴 差し込む目印（frameAt(0); の直後）が見つからない'); raise SystemExit(1)
open(out, 'w', encoding='utf-8').write(s.replace(m, 'frameAt(0);\n' + t + '\n</script>', 1))
PY
[ -f "$TMP" ] || exit 1

# ⚠️ file:// だと CDN も localStorage も使えないので、必ず配信して読む
curl -s -o /dev/null "http://localhost:$PORT/$OUT" || {
  echo "🔴 localhost:$PORT が ren を配信していない"
  echo "   別の窓で:  python3 -m http.server $PORT --directory \"$DIR\""
  rm -f "$TMP"; exit 1; }

if [ "$MODE" = "shot" ]; then
  "$CHROME" --headless=new --disable-gpu --window-size=1500,1000 \
    --virtual-time-budget=9000 --screenshot="$DIR/_test/_out.png" \
    "http://localhost:$PORT/$OUT" 2>/dev/null
  echo "撮った → ren/_test/_out.png"
  rm -f "$TMP"; exit 0
fi

# ⚠️ 窓の大きさを渡さないと盤が数十pxまで潰れる＝掴み手の位置が実機とかけ離れる
"$CHROME" --headless=new --disable-gpu --window-size=1500,1000 --virtual-time-budget=20000 \
  --dump-dom "http://localhost:$PORT/$OUT" > /tmp/_ren_dom.html 2>/dev/null

python3 - <<'PY'
import re, html
s = open('/tmp/_ren_dom.html', encoding='utf-8').read()
m = re.search(r'<pre id="__RESULT">(.*?)</pre>', s, re.S)
if not m:
    print('🔴 結果が見つからない（起動時に落ちた可能性）')
    for pat in ('Uncaught','ReferenceError','TypeError'):
        for h in re.findall(pat + r'[^<\n]{0,120}', s)[:3]: print('   ', h)
    raise SystemExit(1)
print(html.unescape(m.group(1)).strip())
PY
RC=$?
rm -f "$TMP"          # ⚠️ 公開フォルダなので必ず消す
exit $RC
