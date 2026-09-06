# -*- coding: utf-8 -*-
# 閃SEN にモバイルの版面を足す。
# 🔴 実測（390×844）＝ @media が0個で、body{display:flex} ＋ #panel{width:400px} のため
#    盤が幅110pxまで潰れ、説明文が【1文字ずつ改行】していた。倍率も 1%。
# ⭐ 820px より狭かったら、盤を上・パネルを下に落とす（横に並べない）。
import sys, io
SRC, DST = sys.argv[1], sys.argv[2]
s = io.open(SRC, encoding='utf-8').read()
n = 0
def rep(old, new, why):
    global s, n
    if old not in s: raise SystemExit("✗ 空振り: " + why)
    if s.count(old) != 1: raise SystemExit("✗ %d か所ある: %s" % (s.count(old), why))
    s = s.replace(old, new); n += 1; print("  ✓", why)

CSS = """
/* ══⭐⭐ モバイル ── 横に並べない ══
   🔴 2026-09-06 実測：@media が無く、390px 幅で盤が110pxまで潰れて
     説明文が1文字ずつ改行していた（倍率1%）。
   ⭐ 盤を上・パネルを下。指で触るので当たりも大きくする。 */
@media (max-width: 820px){
  body{ flex-direction:column; overflow:auto; height:auto; }
  #stage{ flex:0 0 auto; height:56svh; min-height:320px; width:100%; }
  #panel{ width:100%; flex:1 1 auto; border-left:none;
          border-top:1px solid var(--grid); padding:18px 16px 64px; overflow-y:visible; }
  /* ⚠️ 横並びを前提に right:420px が入っている＝縦積みでは幅が負になる */
  #note{ right:16px; bottom:56px; font-size:12px; }
  /* 指で押す物は大きく（44px は Apple の最小） */
  .seg button{ padding:11px 8px; font-size:13px; }
  .btn{ padding:13px; font-size:14px; }
  input[type=range]{ height:30px; }
  textarea{ font-size:16px; }   /* ⚠️ 16px 未満だと iOS が勝手に拡大する */
}
@media (max-width: 420px){
  #stage{ height:48svh; min-height:260px; }
  #panel{ padding:14px 12px 56px; }
}
"""

rep("</style>", CSS + "</style>", "モバイルの版面を足す")

# 盤の大きさが変わったら合わせ直す（縦積みだと高さが変わる）
rep("addEventListener('resize', () => { fit(); });",
    "addEventListener('resize', () => { fit(); });\n"
    "/* ⭐ 縦積みだと画面の回転・アドレスバーの出入りで高さが変わる。合わせ直す。 */\n"
    "addEventListener('orientationchange', () => setTimeout(fit, 250));",
    "回転したら版面を合わせ直す")

io.open(DST, 'w', encoding='utf-8').write(s)
print("\n%d か所 直した → %s" % (n, DST))
