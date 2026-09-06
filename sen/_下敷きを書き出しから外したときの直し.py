# -*- coding: utf-8 -*-
# 木下＝「最初に描くにしても、打ち込まれたテキストが薄く残っている」
#
# 🔴 ① 下敷きが【書き出しにも焼き付いていた】。実測：PNG の画素 隠す=0 / 薄く敷く=1735。
#      SVG は入っていなかったので、`!svg` で分けたのが間違い。
#      ⭐ 分ける軸は「SVGかどうか」ではなく【画面か・書き出しか】。
#      下敷きは "見るだけの画"。書き出しに入ってはいけない。
#
# 🔴 ② 「自分で置く」に切り替えた時、既定で下敷きが出ていた。
#      最初から自分で描きたい時は邪魔になる。
#      ⭐ 既定を【隠す】にする。なぞりたい時に「薄く敷く」を押す。
#      ⚠️ 勝手に切り替えない（選んだ値は守る）。変えるのは【最初の値】だけ。
import sys, io
SRC, DST = sys.argv[1], sys.argv[2]
s = io.open(SRC, encoding='utf-8').read()
n = 0
def rep(old, new, why):
    global s, n
    if old not in s: raise SystemExit("✗ 空振り: " + why)
    if s.count(old) != 1: raise SystemExit("✗ %d か所ある: %s" % (s.count(old), why))
    s = s.replace(old, new); n += 1; print("  ✓", why)

# ① 画面と書き出しを分ける
rep("""    } else if(tp === 'guide' && !svg){
      g.save(); g.globalAlpha = 0.16;""",
    """    } else if(tp === 'guide' && opt && opt.live){
      /* 🔴 ここは `!svg` で分けていた＝PNG（svg でない書き出し）に焼き付いていた。
         実測：PNG の画素 隠す=0 / 薄く敷く=1735。
         ⭐ 分ける軸は「SVGか」ではなく【画面か・書き出しか】。下敷きは見るだけの画。 */
      g.save(); g.globalAlpha = 0.16;""",
    "下敷きを書き出しから外す（画面のときだけ描く）")

rep("""function render(){
  const [W,H] = boardSize();
  paint(cx, W, H, {});
  drawHandles(cx);""",
    """function render(){
  const [W,H] = boardSize();
  paint(cx, W, H, {live:true});   /* ⭐ live＝画面。下敷きと掴み手はここだけ */
  drawHandles(cx);""",
    "画面のときだけ live を渡す")

# ② 既定を「隠す」に
rep("  typed: 'guide',     /* 打った字の出し方 solid＝濃く／guide＝薄く敷く／hide＝隠す */",
    """  typed: 'hide',      /* 打った字の出し方 solid＝濃く／guide＝薄く敷く／hide＝隠す
                         ⭐ 既定は【隠す】。最初から自分で描く人の邪魔をしない。
                         なぞりたい時に「薄く敷く」を押す（ボタンはすぐ下に出ている）。 */""",
    "既定を「隠す」にする")

rep("""      <button data-v="solid">濃いまま</button>
      <button data-v="guide" class="on">薄く敷く</button>
      <button data-v="hide">隠す</button>""",
    """      <button data-v="solid">濃いまま</button>
      <button data-v="guide">薄く敷く</button>
      <button data-v="hide" class="on">隠す</button>""",
    "画面の印も「隠す」に合わせる")

# ③ 言い方を実際に合わせる（下敷きは既定で出ない）
rep("""    <p class="lead">打った字を<b>薄く下に敷ける</b>ので、字の形を覚えていなくていい。
    <b>置くのは骨だけ。</b>速さ・太さ・払い・連綿は筆が作る。</p>""",
    """    <p class="lead"><b>置くのは骨だけ。</b>速さ・太さ・払い・連綿は筆が作る。<br>
    打った字は<b>隠してある</b>。なぞりたいときは下の<b>薄く敷く</b>を押す
    （<b>下敷きは書き出しに入らない</b>）。</p>""",
    "言い方を実際に合わせる")

io.open(DST, 'w', encoding='utf-8').write(s)
print("\n%d か所 直した → %s" % (n, DST))
