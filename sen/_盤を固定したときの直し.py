# -*- coding: utf-8 -*-
# モバイルで「スクロールすると盤が見えなくなる」を直す。
#
# 🔴 木下＝「モバイルサイドパネル部分は自分で伸び縮めできるはずなのに、
#            今だとスクロールするとボードが固定化されていないので見えなくなる」
#
# 🔴 公開版（hari 版）には `body{overflow:auto; height:auto}` が入っていた＝ページごと流れる。
#    HA 版でそこは消えたが、**`html` に overflow:hidden が無い**ままだった。
#    ⚠️ headless では「流れない」と出る。iOS は html を動かせるので、そこで初めて出る不具合。
#      （見えない不具合＝条件を変えないと出ない）
#
# ⭐ HA と同じ形にする：html と body の両方を止め、送るのは【パネルの中だけ】。
import sys, io
SRC, DST = sys.argv[1], sys.argv[2]
s = io.open(SRC, encoding='utf-8').read()
n = 0
def rep(old, new, why):
    global s, n
    if old not in s: raise SystemExit("✗ 空振り: " + why)
    if s.count(old) != 1: raise SystemExit("✗ %d か所ある: %s" % (s.count(old), why))
    s = s.replace(old, new); n += 1; print("  ✓", why)

# ① html も止める（HA と同じ）。ここが抜けていた
rep("html,body{height:100%}",
    """/* 🔴 html も止める。body だけ止めても iOS は html を動かせるので、
   ページごと流れて盤が画面の外に出る（＝木下が見た「ボードが見えなくなる」）。
   ⚠️ headless では再現しない。HA が両方止めているのはこのため。 */
html,body{height:100%;overflow:hidden;overscroll-behavior:none}""",
    "html と body の両方を止める")

# ② パネルの中だけを送る。端まで行っても外へ伝えない
rep("""#panel{flex:none;width:var(--panelW);background:var(--panel);
  -webkit-backdrop-filter:blur(28px) saturate(1.7);backdrop-filter:blur(28px) saturate(1.7);
  border-left:1px solid var(--line);overflow:auto;padding:14px 13px 60px;position:relative}""",
    """/* ⭐ 送るのはここだけ。⚠️ overscroll-behavior:contain が無いと、
   パネルの端まで送った勢いがページへ伝わって盤が動く（iOS の連鎖スクロール）。 */
#panel{flex:none;width:var(--panelW);background:var(--panel);
  -webkit-backdrop-filter:blur(28px) saturate(1.7);backdrop-filter:blur(28px) saturate(1.7);
  border-left:1px solid var(--line);overflow-y:auto;overflow-x:hidden;
  overscroll-behavior:contain;-webkit-overflow-scrolling:touch;
  padding:14px 13px 60px;position:relative}""",
    "パネルの中だけを送る（外へ伝えない）")

# ③ 盤は縮まないように。⚠️ min-height:0 が無いと flex の子は中身より縮まない
rep("#stage{flex:1;position:relative;overflow:hidden;background:var(--paper)}",
    """/* ⚠️ flex の子は既定で中身より縮まない。min-height:0 が無いと
   パネルを高くしたときに盤が押し出されて画面の外へ出る。 */
#stage{flex:1 1 auto;min-height:0;min-width:0;position:relative;overflow:hidden;background:var(--paper)}""",
    "盤が押し出されないようにする")

# ④ 盤の中では指でページを動かさない（描くときだけでなく、常に）
rep("""#cv{position:absolute;left:0;top:0;transform-origin:0 0;box-shadow:0 6px 30px rgba(0,0,0,.10);background:#fff}""",
    """/* ⚠️ 盤の上で指を滑らせたときにページが動かないようにする。
   （描く／描かないに関係なく、盤は「送る所」ではない） */
#cv{position:absolute;left:0;top:0;transform-origin:0 0;box-shadow:0 6px 30px rgba(0,0,0,.10);
  background:#fff;touch-action:none}
#stage{touch-action:none}""",
    "盤の上で指を滑らせてもページが動かないようにする")

# ⑤ 掴み棒は盤とパネルの境目に置く。⚠️ 高さを変えたら盤も描き直す
rep("""    const d=(drag.y-e.clientY)/innerHeight*100; if(Math.abs(d)>1) drag.moved=true; setH(drag.h+d); });""",
    """    const d=(drag.y-e.clientY)/innerHeight*100; if(Math.abs(d)>1) drag.moved=true; setH(drag.h+d);
      /* ⭐ 高さが変わると盤の大きさも変わる。合わせ直さないと、
         描いた骨と指の位置がずれる（盤の座標は「見えている箱」から出しているため）。 */
      try{ layout(); fit(); }catch(_){} });""",
    "シートを動かしたら盤を合わせ直す")

rep("""      try{ localStorage.setItem(KEY, String(Math.round(curH()*10)/10)); }catch(_){}
      drag=null; };""",
    """      try{ localStorage.setItem(KEY, String(Math.round(curH()*10)/10)); }catch(_){}
      try{ layout(); fit(); }catch(_){}
      drag=null; };""",
    "手を離したときも盤を合わせ直す")


# ⑦ モバイルで倍率の升と説明が重なっていた（実測：どちらも bottom:12px、説明は左端から全幅）
rep("""  #note{ bottom:12px; right:14px }
  #zoom{ bottom:12px }""",
    """  /* ⚠️ 倍率の升と説明がどちらも bottom:12px で、説明が全幅だと升の下に潜る。
     ⭐ HA の #stat と同じで、説明は【右寄せ】にして升に場所を譲る。 */
  #note{ left:auto; right:14px; bottom:12px; max-width:50%; text-align:right }
  #zoom{ bottom:12px; left:12px }""",
    "倍率の升と説明の重なりを解く")

io.open(DST, 'w', encoding='utf-8').write(s)
print("\n%d か所 直した → %s" % (n, DST))
