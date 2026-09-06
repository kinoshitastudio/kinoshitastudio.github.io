# -*- coding: utf-8 -*-
# 閃SEN に「筆」を足す。
# ⭐ HA の「通すもの（刃／管／升）」と同じ考え方 ── 骨は同じ、通す物を替える。
# 🔴 ペン側の式は1文字も触らない（木下の既存プリセットの見え方を変えないため）。
import sys, io, re

SRC = sys.argv[1]; DST = sys.argv[2]
s = io.open(SRC, encoding='utf-8').read()
n = 0
def rep(old, new, why):
    global s, n
    if old not in s:
        raise SystemExit("✗ 空振り: " + why)
    c = s.count(old)
    if c != 1:
        raise SystemExit("✗ %d か所ある（1つに絞れない）: %s" % (c, why))
    s = s.replace(old, new); n += 1
    print("  ✓", why)

# ───────────────────────────── ① 状態に「通すもの」と「連綿」を足す
rep("pen : { w:96, taper:62, miter:22, round:74, link:62, sweep:80, straight:88, vary:26, jit:7, warp:52 },",
    "pen : { tool:'fude', w:96, taper:62, miter:22, round:74, link:62, sweep:80, straight:88, vary:26, jit:7, warp:52,\n"
    "          fw:88, fvary:74, ftaper:86, renmen:58, bow:26 },",
    "状態に tool と筆のつまみを足す")

# ───────────────────────────── ② penOutline を分岐させる
rep("  const ovOut = ovIn + (P.sweep/100) * w * 5.0;",
    "  /* \u26a0\ufe0f ペンの伸ばし量（w×5）を筆に使うと、払いが全部【下に垂れる】。\n"
    "     筆は毛が持ち上がって離れるので、伸びる長さはずっと短い。 */\n"
    "  const ovOut = ovIn + (P.sweep/100) * w * ((P.tool==='fude') ? 1.5 : 5.0);",
    "筆の払いは短く（ペンの伸ばし量だと下に垂れる）")

# 速さ v[] をいったん配列に貯める（今は即座に幅にしている）
rep("""  const vk = P.vary/100, raw = new Array(n);""",
    """  const isF = (P.tool === 'fude');
  const vk = (isF ? P.fvary : P.vary)/100, raw = new Array(n);
  const vs = new Array(n);""",
    "筆かどうかで振れ幅のつまみを切り替える")

rep("""    const v = Math.max(0.06, vCurv * (0.35 + 0.65*vLog));
    /* 幅＝速さの逆（速い＝細い）。vk で効き具合 */
    raw[i] = 1 + vk*((1/Math.max(0.25,v) - 1.0)*0.55 - 0.18 + wob(i+97)*0.35);
  }""",
    """    const v = Math.max(0.06, vCurv * (0.35 + 0.65*vLog));
    vs[i] = v;
    /* 幅＝速さの逆（速い＝細い）。vk で効き具合 */
    raw[i] = 1 + vk*((1/Math.max(0.25,v) - 1.0)*0.55 - 0.18 + wob(i+97)*0.35);
  }
  /* ══⭐⭐ 筆 ── ペンとの違いは【振れ幅】。ペンは 1〜1.4倍しか変わらない。
     筆は「いちばん遅い所を満幅」にして、速い所を比で細らせる＝針まで行く。
     ⚠️ 乱数ではなく速さの比。だから同じ骨なら同じ所が細る（筆に見える）。 */
  if(isF){
    /* ⚠️ 最初これを「いちばん遅い1点だけ満幅」の式にしたら、字が全部針になった。
       ⭐ 速さの【幅ぜんぶ】を 満幅→毛先 に割り当てる。だから太い所は必ず太い。 */
    let vmin = Infinity, vmax = 0;
    for(let i=0;i<n;i++){ if(vs[i]<vmin) vmin=vs[i]; if(vs[i]>vmax) vmax=vs[i]; }
    const span = Math.max(1e-6, vmax - vmin);
    const thin = Math.pow(0.10, vk);          /* つまみ0＝一定、100＝10%まで細る */
    for(let i=0;i<n;i++){
      const u = (vs[i] - vmin) / span;        /* 0＝いちばん遅い（太い）／1＝いちばん速い（細い） */
      raw[i] = (1 - (1-thin)*Math.pow(u, 0.85)) * (1 + wob(i+97)*0.08*vk);
    }
  }""",
    "筆の幅＝速さの比（針まで細る）")

rep("  const vary = vv.map(x => Math.max(0.14, x));",
    "  const vary = vv.map(x => Math.max(isF ? 0.015 : 0.14, x));   /* ⭐ 筆は 1.5% まで細れる＝毛先 */",
    "筆は下限を 14% → 1.5% に下げる")

# 角を折るのは【ペンだけ】。筆は丸まる
rep("    if(kM > 0 && i > 0 && i < n-1){",
    "    if(kM > 0 && !isF && i > 0 && i < n-1){   /* ⭐ 角を折るのはペンだけ。筆は毛が回るので丸まる */",
    "筆では角を折らない")

# 入り抜きの形
rep("""    const eIn = Math.min(1, t*8), eOut = Math.min(1, (1-t)*2.0);
    const e = Math.min(eIn, eOut);
    const wid = w * vary[i] * (1 - kT*(1 - Math.pow(e, 0.80))) * 0.5;""",
    """    let wid;
    if(isF){
      /* ══⭐⭐ 筆の入り抜き ── 左右で全く違う ══
         入り＝【打ち込み】。押し当てるので短くて鈍い。
         抜き＝【払い】。持ち上げながら走るので長く、先は毛1本まで行く。
         🔴 ここが参考と一番違っていた所。ペンは先が 38% で止まっていた。 */
      const kF = P.ftaper/100;
      const eIn  = Math.min(1, t*6.0);
      const eOut = Math.min(1, (1-t)*1.15);
      const tipIn  = 0.42 + 0.30*(1-kF);            /* 入りは鈍い */
      const tipOut = 0.28*(1-kF)*(1-kF);            /* 抜きは針（つまみ100で 0） */
      const sIn  = tipIn  + (1-tipIn )*Math.pow(eIn , 0.50);
      const sOut = tipOut + (1-tipOut)*Math.pow(eOut, 1.70);
      wid = w * vary[i] * Math.min(sIn, sOut) * 0.5;
    } else {
      const eIn = Math.min(1, t*8), eOut = Math.min(1, (1-t)*2.0);
      const e = Math.min(eIn, eOut);
      wid = w * vary[i] * (1 - kT*(1 - Math.pow(e, 0.80))) * 0.5;
    }""",
    "筆の入り抜き（打ち込みは鈍く・払いは針）")

# 筆は太さのつまみを別に持つ
rep("""    const ring = penOutline(pts, P.w, S.run.seed*7919 + i*131 + bi*17);""",
    """    const ring = penOutline(pts, (P.tool==='fude' ? P.fw : P.w), S.run.seed*7919 + i*131 + bi*17);""",
    "筆は太さを別のつまみで持つ")

# ───────────────────────────── ③ 連綿 ── 字と字をつなぐ
rep("""  const out = [];
  bones.forEach((b, bi) => {""",
    """  /* ⭐ 連綿のために、この字の【書き始め】と【書き終わり】を控える（骨の座標のまま） */
  const first = bones[0], last = bones[bones.length-1];
  glyphEnds.set(key, {
    a: [first[0][0]*1000, first[0][1]*1000],
    b: [last[last.length-1][0]*1000, last[last.length-1][1]*1000] });
  const out = [];
  bones.forEach((b, bi) => {""",
    "字の書き始め／書き終わりを控える")

rep("""  if(glyphCache.size > 600) glyphCache.clear();""",
    """  if(glyphCache.size > 600){ glyphCache.clear(); glyphEnds.clear(); }""",
    "控えも一緒に捨てる")

rep("""function glyph(ch, i){
  const P = S.pen;""",
    """const glyphEnds = new Map();
function glyphKey(ch, i){
  const P = S.pen;
  return ch + '|' + S.fam + '|' + [P.w,P.taper,P.miter,P.round,P.link,P.sweep,P.straight,P.vary,P.jit,P.warp,S.run.seed,i].join(',');
}
/* ══⭐⭐ 連綿 ── 字と字を【細い渡り】でつなぐ ══
   ⭐ 参考が「一筆で書いた」ように見えるのは、字の中だけでなく
     【字をまたいで】宙を通った跡が残っているから。
   ⚠️ 両端は 0 まで絞る。太いまま繋ぐと「棒でつないだ」ようにしか見えない。 */
function renmenRing(a, b, w, bow){
  const dx = b[0]-a[0], dy = b[1]-a[1], d = Math.hypot(dx,dy);
  if(d < 1e-3) return null;
  const nx = -dy/d, ny = dx/d, N = 26, L = [], R = [];
  for(let i=0;i<=N;i++){
    const t = i/N, sn = Math.sin(t*Math.PI);
    const cx = a[0] + dx*t + nx*bow*d*sn, cy = a[1] + dy*t + ny*bow*d*sn;
    const wid = w * 0.5 * Math.pow(sn, 0.62);
    L.push([cx + nx*wid, cy + ny*wid]);
    R.push([cx - nx*wid, cy - ny*wid]);
  }
  return L.concat(R.reverse());
}
function glyph(ch, i){
  const P = S.pen;""",
    "連綿の帯を作る関数を足す")

# paint に連綿を描かせる
rep("""    place().forEach(p => drawGlyph(g, p.ch, p.x, p.y, p.size, p.rot, S.col.col, p.i, svg, M0));""",
    """    const PL = place();
    /* ⭐ 先に渡りを描く（字がその上に乗る）。筆のときだけ。 */
    if(S.pen.tool === 'fude' && S.pen.renmen > 0){
      const toBoard = (p, q) => {
        const k = q.size/1000, c = q.size/2, rd = (q.rot||0)*Math.PI/180;
        let X = p[0]*k*(S.run.wide/100), Y = p[1]*k*(S.run.tall/100);
        if(q.rot){ const ax=X-c, ay=Y-c;
          X = c + ax*Math.cos(rd) - ay*Math.sin(rd); Y = c + ax*Math.sin(rd) + ay*Math.cos(rd); }
        return [q.x+X, q.y+Y];
      };
      const kR = S.pen.renmen/100, rings = [];
      for(let i=0;i<PL.length-1;i++){
        const p0 = PL[i], p1 = PL[i+1];
        glyph(p0.ch, p0.i); glyph(p1.ch, p1.i);          /* 控えを作らせる */
        const e0 = glyphEnds.get(glyphKey(p0.ch, p0.i));
        const e1 = glyphEnds.get(glyphKey(p1.ch, p1.i));
        if(!e0 || !e1) continue;
        const A = toBoard(e0.b, p0), B = toBoard(e1.a, p1);
        const d = Math.hypot(B[0]-A[0], B[1]-A[1]);
        /* ⚠️ 遠すぎる所を繋ぐと字が読めなくなる。つなぐ距離はつまみで決まる */
        if(d > p0.size * (0.30 + 1.60*kR)) continue;\n        /* ⚠️ 上限は当てずっぽうで決めない。実測＝隣り合う字の間は 0.64〜1.40×字の大きさ\n           （フ→ァ 247／ー→ス 144／ス→ト 315、字の大きさ 225）。\n           一度 0.20+0.70kR にしたら上限 136 になり【1本も繋がらなかった】。 */
        const rw = rnd(S.run.seed*7717 + i*613);
        const bow = (S.pen.bow/100) * 0.42 * (rw()*2-1);
        const ring = renmenRing(A, B, (S.pen.fw) * (p0.size/1000) * (0.10 + 0.26*kR), bow);
        if(ring) rings.push(ring);
      }
      if(rings.length){
        g.beginPath();
        rings.forEach(r => { g.moveTo(r[0][0], r[0][1]);
          for(let j=1;j<r.length;j++) g.lineTo(r[j][0], r[j][1]); g.closePath(); });
        g.fillStyle = S.col.col; g.fill();
        if(svg) svg.push('<path d="' + rings.map(r =>
          'M' + r.map(p => p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L') + 'Z').join('') +
          '" fill="' + (S.col.grad ? 'url(#sg)' : S.col.col) + '"/>');
      }
    }
    PL.forEach(p => drawGlyph(g, p.ch, p.x, p.y, p.size, p.rot, S.col.col, p.i, svg, M0));""",
    "字と字をまたぐ渡りを描く")

# ───────────────────────────── ④ UI
rep("""  <div class="sec">③ ペン ── 骨に着せる</div>""",
    """  <div class="sec">③ 通すもの ── 骨に着せる</div>
  <div class="seg" id="segTool">
    <button data-v="fude" class="on">筆</button>
    <button data-v="pen">ペン</button>
  </div>
  <div id="fudeBox">
    <div class="row"><span class="n">太さ</span><output id="o_fw">88</output></div>
    <input type="range" id="fw" min="4" max="260" value="88">
    <div class="row"><span class="n">かすれるほど細く（速さ）</span><output id="o_fvary">74</output></div>
    <input type="range" id="fvary" min="0" max="100" value="74">
    <div class="row"><span class="n">払いの鋭さ（毛先まで）</span><output id="o_ftaper">86</output></div>
    <input type="range" id="ftaper" min="0" max="100" value="86">
    <div class="row"><span class="n">連綿（字と字をつなぐ）</span><output id="o_renmen">58</output></div>
    <input type="range" id="renmen" min="0" max="100" value="58">
    <div class="row"><span class="n">渡りのふくらみ</span><output id="o_bow">26</output></div>
    <input type="range" id="bow" min="0" max="100" value="26">
  </div>
  <div id="penBox">""",
    "筆のつまみを画面に出す")

rep("""  <div class="row"><span class="n">震え（手のブレ）</span><output id="o_jit">7</output></div>
  <input type="range" id="jit" min="0" max="100" value="7">""",
    """  <div class="row"><span class="n">震え（手のブレ）</span><output id="o_jit">7</output></div>
  <input type="range" id="jit" min="0" max="100" value="7">
  </div>""",
    "ペンのつまみを箱で囲う（閉じ）")

rep("""[['w','pen'],['taper','pen'],['miter','pen'],['round','pen'],['link','pen'],['warp','pen'],['sweep','pen'],['straight','pen'],['vary','pen'],['jit','pen']]""",
    """[['w','pen'],['taper','pen'],['miter','pen'],['round','pen'],['link','pen'],['warp','pen'],['sweep','pen'],['straight','pen'],['vary','pen'],['jit','pen'],
 ['fw','pen'],['fvary','pen'],['ftaper','pen'],['renmen','pen'],['bow','pen']]""",
    "筆のつまみを繋ぐ")

rep("""document.querySelectorAll('#segFam button').forEach(b => b.onclick = () => {""",
    """/* ⭐ 通すものを替える＝骨は同じまま、着せる物だけ替わる（HA と同じ考え方） */
function toolUI(){
  segOn('segTool', S.pen.tool);
  const f = (S.pen.tool === 'fude');
  const fb = $('fudeBox'), pb = $('penBox');
  if(fb) fb.style.display = f ? '' : 'none';
  if(pb) pb.style.display = f ? 'none' : '';
}
document.querySelectorAll('#segTool button').forEach(b => b.onclick = () => {
  S.pen.tool = b.dataset.v; toolUI(); glyphCache.clear(); glyphEnds.clear(); draw(); });
document.querySelectorAll('#segFam button').forEach(b => b.onclick = () => {""",
    "通すものの切り替え")

# 起動時に一度呼ぶ
rep("syncAll(); layout(); fit(); draw();",
    "syncAll(); toolUI(); layout(); fit(); draw();",
    "起動時に画面を合わせる（立ち上げの1か所だけ）")

# 説明文（「筆ではなくペン」はもう嘘になる）
rep("筆ではなく<b>ペン</b>。角は丸めず<b>折る</b>、払いは<b>まっすぐ長く</b>。",
    "通すものを替える。<b>筆</b>＝毛先まで細って字がつながる／<b>ペン</b>＝角を折る。",
    "説明文を直す（「筆ではなくペン」はもう嘘）")

io.open(DST, 'w', encoding='utf-8').write(s)
print("\n%d か所 直した → %s" % (n, DST))
