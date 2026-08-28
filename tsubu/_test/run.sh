#!/bin/bash
# ⭐ 粒 TSUBU の回帰テスト ── 直したら push の前にこれを流す。
# ⚠️ 本体は1バイトも触らない＝コピーを作り、別ポートで立てて headless の実物に当てる。
#
# ⭐ 比べるのは【落ちてきた実物】。画面の表示ではなく、出した PNG / zip の中身を測る。
# ⭐⭐ ①だけは【直前のコミットの tsubu】も一緒に立てて、
#     「既定（画面ぜんぶ＋4x）の絵が1画素も変わっていないか」をハッシュで突き合わせる。
#     ⚠️ コミット済みで中身が同じときは比べようがないので、そう言って飛ばす（黙って通さない）。
#
# 使い方: bash tsubu/_test/run.sh
set -u
ng=0
HERE="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
WORK="$(mktemp -d)"
SRV=""
cleanup(){ if [ -n "$SRV" ]; then kill "$SRV" 2>/dev/null; wait "$SRV" 2>/dev/null; fi; rm -rf "$WORK"; }
trap cleanup EXIT

mkdir -p "$WORK/site/tsubu"
cp "$HERE/index.html" "$WORK/site/tsubu/index.html"

# ── 直前のコミットの本体（あれば）＝①の突き合わせ相手 ──
PREV="none"
if git -C "$ROOT" rev-parse HEAD >/dev/null 2>&1; then
  mkdir -p "$WORK/site/tsubu_prev"
  if git -C "$ROOT" show HEAD:tsubu/index.html > "$WORK/site/tsubu_prev/index.html" 2>/dev/null; then
    if cmp -s "$WORK/site/tsubu_prev/index.html" "$HERE/index.html"; then
      PREV="same"      # コミット済み＝比べても必ず一致する＝比べない
    else
      PREV="/tsubu_prev/"
    fi
  fi
fi

# ── 空いているポートを探す（他のセッションのサーバを踏まない） ──
PORT=""
for p in $(seq 8400 8440); do
  if ! lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then PORT="$p"; break; fi
done
if [ -z "$PORT" ]; then echo "🔴 空いているポートが無い"; exit 1; fi

python3 -m http.server "$PORT" --directory "$WORK/site" >/dev/null 2>&1 &
SRV=$!
for i in $(seq 1 20); do
  curl -sf "http://localhost:$PORT/tsubu/" >/dev/null 2>&1 && break
  sleep 0.3
done

# ── 本当に粒が出ているか確かめてから始める ──
if ! curl -sf "http://localhost:$PORT/tsubu/" | grep -q 'id="tvGo"'; then
  echo "🔴 立てたはずの画面が粒ではない（ポート $PORT）。テストを始めない"; exit 1
fi
echo "（${PORT} で立てた・${WORK}）"

NG=0
echo
echo "── ① 版面・大きさ（PNG と動画の共通）"
node "$HERE/_test/paper.mjs" "http://localhost:$PORT" "/tsubu/" "$PREV" || NG=1
echo
echo "── ② 版（重ねる）＝空白の版・ドラッグで重なりを変える"
node "$HERE/_test/layer.mjs" "http://localhost:$PORT/tsubu/" || NG=1
echo
echo "── ③ マス目（塗り・枠）が版ごとに効く"
node "$HERE/_test/masu.mjs" "http://localhost:$PORT/tsubu/" || NG=1
echo
echo "── ④ JSON を読む／読んだあと書き出せる"
node "$HERE/_test/json.mjs" "http://localhost:$PORT/tsubu/" || NG=1
echo
echo "── ⑤ 漂う＝秒を伸ばすほど先へ進む・粒の見え方は壊れない"
node "$HERE/_test/drift.mjs" "http://localhost:$PORT/tsubu/" || NG=1
echo
echo "── ⑥ 動画（落ちる・集まる・漂う）＝最初の字・なめらかさ・撤収まで"
node "$HERE/_test/anivideo.mjs" "http://localhost:$PORT/tsubu/" || NG=1

echo
echo "── ⑦ 写真から形を作る（しきい・反転・字に戻す）"
node "$HERE/_test/photo.mjs" "http://localhost:$PORT/tsubu/" || NG=1

echo
[ "$NG" = 0 ] && echo "✅ 全部通った" || echo "🔴 落ちたものがある（上を見る）"

# ⭐ SVG を読み込めるか（2026-08-26 木下「Maku と Tsubu で svg 読み込みを確認しないとだね」）
echo
echo "── SVG を読み込む（作字SAKUJI のパス）"
node "$(cd "$(dirname "$0")/../.." && pwd)/_test/svgin.mjs" tsubu || SVGNG=1

if [ "${SVGNG:-0}" = "1" ]; then exit 1; fi
exit "$NG"
