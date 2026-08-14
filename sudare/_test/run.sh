#!/bin/bash
# ⭐ 簾 SUDARE の回帰テスト ── 直したら push の前にこれを流す。
# ⚠️ 本体は1バイトも触らない＝コピーを作り、別ポートで立てて headless の実物に当てる。
#    （自分の直しが別の場所を壊すのが1日3回ある。落ちないテストは意味がない）
#
# 🔴 2026-08-14 に踏んだ ── 決め打ちのポートが【別のセッションのサーバ】で埋まっていて、
#    そちらの別プロダクトの画面に当たっていた。エラーは「SHEETS is not defined」＝
#    一見するとこちらのコードが壊れたように見える。
#    ⭐ だから ①空いているポートを探す ②立てたあと【本当に簾が出ているか】を確かめてから始める。
#
# 使い方: bash sudare/_test/run.sh
set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
SRV=""
cleanup(){ [ -n "$SRV" ] && kill "$SRV" 2>/dev/null; rm -rf "$WORK"; }
trap cleanup EXIT

mkdir -p "$WORK/site"
cp -R "$HERE" "$WORK/site/sudare"

# ── ① 空いているポートを探す（他のセッションのサーバを踏まない） ──
PORT=""
for p in $(seq 8300 8340); do
  if ! lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then PORT="$p"; break; fi
done
if [ -z "$PORT" ]; then echo "🔴 空いているポートが無い"; exit 1; fi

python3 -m http.server "$PORT" --directory "$WORK/site" >/dev/null 2>&1 &
SRV=$!
for i in $(seq 1 20); do
  curl -sf "http://localhost:$PORT/sudare/masu/" >/dev/null 2>&1 && break
  sleep 0.3
done

# ── ② 本当に簾が出ているか確かめてから始める ──
if ! curl -sf "http://localhost:$PORT/sudare/masu/" | grep -q 'id="tvGo"'; then
  echo "🔴 立てたはずの画面が簾ではない（ポート $PORT）。テストを始めない"; exit 1
fi
# ⚠️ 全角の「）」は変数名の一部として読まれる＝必ず ${} で閉じる（unbound variable で止まる）
echo "（${PORT} で立てた・${WORK}）"

NG=0
echo
echo "── ① つまみ総当たり（本体・板と輪郭から）"
node "$HERE/_test/knobs.mjs" "http://localhost:$PORT/sudare/" || NG=1
echo
echo "── ② つまみ総当たり（masu・板と輪郭からとマス）"
node "$HERE/_test/knobs.mjs" "http://localhost:$PORT/sudare/masu/" || NG=1
echo
echo "── ③ 動画で出す（masu・PNG連番で実際に1本焼く）"
node "$HERE/_test/video.mjs" "http://localhost:$PORT/sudare/masu/" || NG=1

echo
[ "$NG" = 0 ] && echo "✅ 全部通った" || echo "🔴 落ちたものがある（上を見る）"
exit "$NG"
