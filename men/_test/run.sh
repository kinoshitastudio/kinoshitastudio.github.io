#!/bin/bash
# 面 MEN の回帰テスト
#   bash men/_test/run.sh [URL]
# ⚠️ 8092 で 名称未設定/ を配っていること（python3 -m http.server 8092）
# ⚠️ 偽のカメラで回す＝顔は写らない。顔が要る所（目・マス目・輪郭）は別に人手で見る。
set -u
U="${1:-http://localhost:8092/men/}"
cd "$(dirname "$0")/.."
ng=0
for t in rec masu; do
  echo "══ $t"
  node "_test/$t.mjs" "$U" || ng=1
done
echo
[ $ng -eq 0 ] && echo "✅ 全部通った" || echo "🔴 落ちたものがある"
exit $ng
