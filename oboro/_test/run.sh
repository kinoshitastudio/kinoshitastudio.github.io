#!/bin/bash
# ⭐ 朦 OBORO の回帰テスト ── 直したら push の前にこれを流す。
# ⚠️ 本体は1バイトも触らない＝コピーを作り、別ポートで立てて headless の実物に当てる。
# ⭐ 「直す前（HEAD）」も一緒に立てて、絵が変わっていないことを画素で突き合わせる。
# 🔴 決め打ちのポートは別セッションのサーバで埋まっていることがある＝空きを探して身元を確かめる。
#
# 使い方: bash oboro/_test/run.sh
set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
S1=""; S2=""
cleanup(){ [ -n "$S1" ] && kill "$S1" 2>/dev/null; [ -n "$S2" ] && kill "$S2" 2>/dev/null; rm -rf "$WORK"; }
trap cleanup EXIT

mkdir -p "$WORK/new" "$WORK/old/oboro"
cp -R "$HERE" "$WORK/new/oboro"
# ⭐ 直す前（HEAD）── 写真も一緒に置く（無いと版面が違って「変わった」と誤検出する）
git -C "$HERE/.." show HEAD:oboro/index.html > "$WORK/old/oboro/index.html" 2>/dev/null \
  && cp "$HERE"/*.jpg "$WORK/old/oboro/" 2>/dev/null

freeport(){
  for p in $(seq "$1" "$(( $1 + 40 ))"); do
    if ! lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then echo "$p"; return; fi
  done
}
P1="$(freeport 8500)"; P2="$(freeport 8560)"
if [ -z "$P1" ] || [ -z "$P2" ]; then echo "🔴 空いているポートが無い"; exit 1; fi

python3 -m http.server "$P1" --directory "$WORK/new" >/dev/null 2>&1 & S1=$!
python3 -m http.server "$P2" --directory "$WORK/old" >/dev/null 2>&1 & S2=$!
for i in $(seq 1 20); do curl -sf "http://localhost:$P1/oboro/" >/dev/null 2>&1 && break; sleep 0.3; done
if ! curl -sf "http://localhost:$P1/oboro/" | grep -q 'OBORO'; then
  echo "🔴 立てた画面が朦ではない（ポート $P1）。テストを始めない"; exit 1
fi
OLDURL=""
curl -sf "http://localhost:$P2/oboro/" | grep -q 'OBORO' && OLDURL="http://localhost:$P2/oboro/"
echo "（新 ${P1} / 旧 ${P2:-なし} で立てた）"
echo

# ⭐ HEIC の見本は毎回その場で作る（リポジトリに置かない）
HEIC="$WORK/test.heic"
sips -s format heic -Z 900 "$HERE/1.jpg" --out "$HEIC" >/dev/null 2>&1

NG=0
echo "── ① 動画で出す（秒で・継ぎ目のないループ）"
node "$HERE/_test/movie.mjs" "http://localhost:$P1/oboro/" "$OLDURL" || NG=1
echo
echo "── ② 余白（額）── 0 なら1画素も変わらない／上げると中の絵が縮む"
node "$HERE/_test/mat.mjs" "http://localhost:$P1/oboro/" "$OLDURL" || NG=1
echo
if [ -f "$HEIC" ]; then
  echo "── ③ HEIC（iPhone の写真）を読む"
  node "$HERE/_test/heic.mjs" "http://localhost:$P1/oboro/" "$HEIC" || NG=1
else
  echo "⚠️ HEIC の見本が作れなかった（sips）＝③は飛ばした"
fi

echo
[ "$NG" = 0 ] && echo "✅ 全部通った" || echo "🔴 落ちたものがある（上を見る）"
exit "$NG"
