# -*- coding: utf-8 -*-
# 閃SEN に「なぞる（描く）」と「直す（あとから線を調整）」を足す。
#
# 🔴 木下＝「自分でペンでかけないじゃん」── そのとおりで、SEN には触る所が1つも無かった。
# 🔴 木下＝「描けるようにもして、しかもそれをあとから線を調整できるように」
# 🔴 木下＝「今のタイポしたやつはやつで置いておいて」→ 打った字は消さない。手の骨は【足される】。
#
# ⭐ HA と同じ2本立て（引く／直す）にする。木下がもう手に持っている操作だから。
# ⭐ 打った字を薄く下に敷けるので、字の形を覚えていなくていい。
#    置くのは骨だけ。速さ・太さ・払い・連綿は筆が作る。
import sys, io

SRC = sys.argv[1]; DST = sys.argv[2]
s = io.open(SRC, encoding='utf-8').read()
n = 0
def rep(old, new, why):
    global s, n
    if old not in s: raise SystemExit("✗ 空振り: " + why)
    c = s.count(old)
    if c != 1: raise SystemExit("✗ %d か所ある: %s" % (c, why))
    s = s.replace(old, new); n += 1
    print("  ✓", why)

# ───────────────────────────── ① 状態
rep("  view: 'run',",
    "  view: 'run',\n"
    "  mode : 'type',      /* type＝打つ／draw＝手で置く */\n"
    "  hand : 'pen',       /* draw の中で pen＝引く／edit＝直す（HA と同じ2本立て） */\n"
    "  typed: 'guide',     /* 打った字の出し方 solid＝濃く／guide＝薄く敷く／hide＝隠す */\n"
    "  draw : [],          /* 手で置いた骨。盤の座標のまま持つ */\n"
    "  sel  : -1,          /* 直す時に選んでいる画 */",
    "状態に mode / hand / typed / draw / sel を足す")

# ───────────────────────────── ② 手の骨を筆に通す
rep("""function paint(g, W, H, opt){""",
    """/* ══⭐⭐ 手で置いた骨を、打った字と【同じ筆】に通す ══
   ⭐ 太さは字の大きさに合わせる＝太さのつまみの意味が「打つ」時と揃う。
   ⚠️ warp（骨をゆがめる）は掛けない。手で置いた骨には、もう人のゆらぎが入っている。
     （[[手書きは点が置けない]]＝崩し量は「元がどこから来たか」で変える） */
function drawnRings(){
  const P = S.pen, out = [];
  const w = (P.tool === 'fude' ? P.fw : P.w) * (S.run.size/1000);
  S.draw.forEach((st, i) => {
    if(st.length < 2) return;
    const ring = penOutline(st.map(p => [p[0], p[1]]), w, 9176 + i*131);
    if(ring) out.push(ring);
  });
  /* 連綿＝画と画のあいだ（打つ時と同じ考え方） */
  if(P.tool === 'fude' && P.renmen > 0){
    const kR = P.renmen/100;
    for(let i=0;i<S.draw.length-1;i++){
      const a = S.draw[i], b = S.draw[i+1];
      if(a.length < 2 || b.length < 2) continue;
      const A = a[a.length-1], B = b[0];
      const d = Math.hypot(B[0]-A[0], B[1]-A[1]);
      if(d > S.run.size * (0.30 + 1.60*kR)) continue;
      const rw = rnd(7717 + i*613);
      const ring = renmenRing(A, B, w * (0.10 + 0.26*kR), (P.bow/100)*0.42*(rw()*2-1));
      if(ring) out.push(ring);
    }
  }
  return out;
}

function paint(g, W, H, opt){""",
    "手で置いた骨を筆に通す")

rep("""    PL.forEach(p => drawGlyph(g, p.ch, p.x, p.y, p.size, p.rot, S.col.col, p.i, svg, M0));""",
    """    /* ⭐ 打った字は【消さない】。出し方だけ選ぶ。
       solid＝そのまま作品の一部／guide＝薄く下に敷く（なぞる下敷き）／hide＝隠す
       ⚠️ 薄い下敷きは書き出しに入れない（下敷きだから） */
    const tp = (S.mode === 'draw') ? S.typed : 'solid';
    if(tp === 'solid'){
      PL.forEach(p => drawGlyph(g, p.ch, p.x, p.y, p.size, p.rot, S.col.col, p.i, svg, M0));
    } else if(tp === 'guide' && !svg){
      g.save(); g.globalAlpha = 0.16;
      PL.forEach(p => drawGlyph(g, p.ch, p.x, p.y, p.size, p.rot, S.col.col, p.i, null, M0));
      g.restore();
    }
    /* 手で置いた骨は、いつでも濃く出る（足される） */
    if(S.draw.length){
      const dr = drawnRings();
      if(dr.length){
        g.beginPath();
        dr.forEach(r => { g.moveTo(r[0][0], r[0][1]);
          for(let j=1;j<r.length;j++) g.lineTo(r[j][0], r[j][1]); g.closePath(); });
        g.fillStyle = S.col.col; g.fill();
        if(svg) svg.push('<path d="' + dr.map(r =>
          'M' + r.map(p => p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L') + 'Z').join('') +
          '" fill="' + (S.col.grad ? 'url(#sg)' : S.col.col) + '"/>');
      }
    }""",
    "打った字は残す／手の骨を足す")

# 字をまたぐ渡りは「打った字」が濃く出ている時だけ
rep("""    if(S.pen.tool === 'fude' && S.pen.renmen > 0){""",
    """    if((S.mode !== 'draw' || S.typed === 'solid') && S.pen.tool === 'fude' && S.pen.renmen > 0){""",
    "字をまたぐ渡りは打った字が出ている時だけ")

# ───────────────────────────── ③ 掴み手を描く（⚠️ 書き出しには入らない）
rep("""function render(){
  const [W,H] = boardSize();
  paint(cx, W, H, {});""",
    """/* ══⭐ 掴み手は【paint の外】で描く ══
   書き出しは別の canvas に paint() を呼ぶので、ここで描いた物は PNG/SVG に焼き付かない。
   （[[見せるだけの画は別の層に]]） */
function drawHandles(g){
  if(S.mode !== 'draw' || S.hand !== 'edit') return;
  const [BW] = boardSize(), r = Math.max(BW*0.006, 9/Math.max(0.05, Z));   /* ⭐ 引いて見ても指で見える */
  S.draw.forEach((st, i) => {
    if(st.length < 2) return;
    const on = (i === S.sel);
    g.beginPath(); g.moveTo(st[0][0], st[0][1]);
    for(let j=1;j<st.length;j++) g.lineTo(st[j][0], st[j][1]);
    g.strokeStyle = on ? 'rgba(255,106,52,.95)' : 'rgba(255,106,52,.35)';
    g.lineWidth = Math.max(1, BW*0.0015); g.stroke();
    if(!on) return;
    st.forEach((p, j) => {
      g.beginPath(); g.arc(p[0], p[1], r, 0, 6.2832);
      g.fillStyle = (j===0) ? '#ff6a34' : '#fff';
      g.fill(); g.strokeStyle = '#ff6a34'; g.lineWidth = Math.max(1, BW*0.0016); g.stroke();
    });
  });
}

function render(){
  const [W,H] = boardSize();
  paint(cx, W, H, {});
  drawHandles(cx);""",
    "掴み手を描く（書き出しには入らない）")

# ───────────────────────────── ④ 触る
rep("""addEventListener('resize', () => { fit(); });""",
    """/* ══⭐⭐ 盤を直に触る ══
   ⭐ 画面の座標 → 盤の座標 は canvas の【見えている箱】から比で出す。
     拡大率も位置も自分で持たなくていい（寄せる所は1か所）。 */
function toBoardPt(e){
  const r = cv.getBoundingClientRect(), [BW,BH] = boardSize();
  return [ (e.clientX - r.left) * BW / r.width,
           (e.clientY - r.top ) * BH / r.height ];
}
/* ⭐ 引いた線は点が多すぎて掴めない。形を保ったまま間引く（Douglas-Peucker）。 */
function simplify(pts, tol){
  if(pts.length < 3) return pts.slice();
  const keep = new Array(pts.length).fill(false);
  keep[0] = keep[pts.length-1] = true;
  const stack = [[0, pts.length-1]];
  while(stack.length){
    const [a,b] = stack.pop();
    let best = -1, bd = tol;
    const ax=pts[a][0], ay=pts[a][1], bx=pts[b][0], by=pts[b][1];
    const dx=bx-ax, dy=by-ay, L=Math.hypot(dx,dy)||1;
    for(let i=a+1;i<b;i++){
      const d = Math.abs((pts[i][0]-ax)*dy - (pts[i][1]-ay)*dx)/L;
      if(d > bd){ bd = d; best = i; }
    }
    if(best > 0){ keep[best] = true; stack.push([a,best],[best,b]); }
  }
  const out = pts.filter((_,i) => keep[i]);
  /* ⚠️ 少なすぎると折れ線に見える。3点は必ず残す */
  return out.length >= 3 ? out : pts.filter((_,i) => i%Math.ceil(pts.length/3)===0 || i===pts.length-1);
}
/* ⭐ 戻すは1か所で拾う。つまみごとに足すと必ず漏れる。 */
const HIST = [];
function snap(){ HIST.push(JSON.stringify(S.draw)); if(HIST.length > 80) HIST.shift(); }
function undo(){ if(!HIST.length) return;
  S.draw = JSON.parse(HIST.pop());
  if(S.sel >= S.draw.length) S.sel = -1;
  draw(); syncNote(); }

let act = null;   /* {kind:'draw'|'point'|'move', ...} */

/* ⭐ 当たりの広さは【指の大きさ】から決める。
   引いて見ている（Z が小さい）ほど、盤の単位では広く取らないと掴めない。
   ⚠️ 盤の比だけで決めると、モバイルで永久に掴めない。 */
function grabR(k){
  const [BW] = boardSize();
  return Math.min(BW*0.05, Math.max(BW*k, 24/Math.max(0.05, Z)));   /* ⚠️ 広げすぎると全部に当たる */
}
function hitPoint(p){
  const r = grabR(0.010);
  if(S.sel < 0) return -1;
  const st = S.draw[S.sel]; if(!st) return -1;
  for(let j=0;j<st.length;j++)
    if(Math.hypot(st[j][0]-p[0], st[j][1]-p[1]) < r) return j;
  return -1;
}
/* ⚠️ 「当たった中で最後の1本」を返すと、引いて見た時（当たりが広い時）に
     指の下にない線を掴む。⭐ いちばん【近い】1本を返す。
     2026-09-06 モバイル幅で実測＝1本目を押したのに2本目が選ばれた。 */
function hitStroke(p){
  const r = grabR(0.014);
  let best = -1, bd = r;
  for(let i=0;i<S.draw.length;i++){
    const st = S.draw[i];
    for(let j=0;j<st.length-1;j++){
      const a=st[j], b=st[j+1];
      const dx=b[0]-a[0], dy=b[1]-a[1], L2=dx*dx+dy*dy;
      let t = L2 ? ((p[0]-a[0])*dx + (p[1]-a[1])*dy)/L2 : 0;
      t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(p[0]-(a[0]+dx*t), p[1]-(a[1]+dy*t));
      if(d < bd){ bd = d; best = i; }
    }
  }
  return best;
}

/* ⚠️ touchAction:none を出しっぱなしにすると、【打つ】時にも指で画面を送れなくなる。
   なぞる時だけ止める（止めないと1画引くたびにページが動く）。 */
function syncTouch(){ cv.style.touchAction = (S.mode === 'draw') ? 'none' : ''; }
cv.addEventListener('pointerdown', e => {
  if(S.mode !== 'draw') return;
  e.preventDefault();
  /* ⚠️ setPointerCapture は「その id の実ポインタが無い」と例外を投げる。
     投げると以降の処理ごと死ぬ＝1画も引けなくなる。掴めなくても描けるので、守る。 */
  try{ cv.setPointerCapture(e.pointerId); }catch(_){}
  const p = toBoardPt(e);
  if(S.hand === 'pen'){
    snap(); const st = [p]; S.draw.push(st); S.sel = S.draw.length-1;
    act = { kind:'draw', st, raw:[p] }; draw(); return;
  }
  /* 直す ── ①⇧＝線ごと移す ②点を掴む ③線を掴んで選ぶ ④何も無ければ選択を外す
     ⚠️ 点が少ない画（直線は3〜4点）は【線のほぼ全部が掴み手】になる。
       だから「線ごと移す」を点掴みの後ろに置くと、永久に入れない。⇧で先に分ける。 */
  if(e.shiftKey){
    const im = hitStroke(p);
    if(im >= 0){ snap(); S.sel = im; act = { kind:'move', i:im, last:p }; draw(); syncNote(); return; }
  }
  const j = hitPoint(p);
  if(j >= 0){ snap(); act = { kind:'point', i:S.sel, j }; return; }
  const i = hitStroke(p);
  if(i >= 0){ snap(); S.sel = i; act = { kind:'move', i, last:p }; draw(); syncNote(); return; }
  S.sel = -1; act = null; draw(); syncNote();
});
cv.addEventListener('pointermove', e => {
  if(!act || S.mode !== 'draw') return;
  const p = toBoardPt(e);
  if(act.kind === 'draw'){
    const q = act.raw[act.raw.length-1];
    if(Math.hypot(p[0]-q[0], p[1]-q[1]) < 2.5) return;
    act.raw.push(p); act.st.length = 0; act.raw.forEach(v => act.st.push(v)); draw();
  } else if(act.kind === 'point'){
    S.draw[act.i][act.j] = p; draw();
  } else if(act.kind === 'move'){
    const dx = p[0]-act.last[0], dy = p[1]-act.last[1];
    S.draw[act.i] = S.draw[act.i].map(v => [v[0]+dx, v[1]+dy]);
    act.last = p; draw();
  }
});
const upHand = () => {
  if(!act) return;
  if(act.kind === 'draw'){
    const [BW] = boardSize();
    if(act.raw.length < 2){ S.draw.pop(); S.sel = -1; }
    else {
      /* ⭐ 引き終わりに間引く＝あとで掴める数にする。形は splineで戻る */
      const sm = simplify(act.raw, BW*0.004);
      S.draw[S.draw.length-1] = sm.length > 28 ? sm.filter((_,i)=> i%Math.ceil(sm.length/28)===0 || i===sm.length-1) : sm;
    }
  }
  act = null; draw(); syncNote();
};
cv.addEventListener('pointerup', upHand);
cv.addEventListener('pointercancel', upHand);

addEventListener('keydown', e => {
  const t = e.target.tagName;
  if(t === 'INPUT' || t === 'TEXTAREA') return;      /* 文字入力の邪魔をしない */
  if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z'){ e.preventDefault(); undo(); return; }
  if(S.mode !== 'draw') return;
  if((e.key === 'Backspace' || e.key === 'Delete') && S.sel >= 0){
    e.preventDefault(); snap(); S.draw.splice(S.sel,1); S.sel = -1; draw(); syncNote(); return;
  }
  if(e.key === 'b' || e.key === 'B'){ S.hand='pen';  handUI(); }
  if(e.key === 'v' || e.key === 'V'){ S.hand='edit'; handUI(); }
});

function modeUI(){
  segOn('segMode', S.mode);
  const d = (S.mode === 'draw');
  const b = $('drawBox'); if(b) b.style.display = d ? '' : 'none';
  handUI();
}
function handUI(){
  segOn('segHand', S.hand);
  segOn('segTyped', S.typed);
  cv.style.cursor = (S.mode==='draw') ? (S.hand==='pen' ? 'crosshair' : 'default') : 'default';
  syncTouch();
  draw(); syncNote();
}
function syncNote(){
  const el = $('note'); if(!el) return;
  if(S.mode !== 'draw') return;
  const nm = {solid:'打った字は濃いまま', guide:'打った字を薄く下に敷いている', hide:'打った字は隠している'}[S.typed];
  el.textContent = '手で置いた骨 ' + S.draw.length + ' 画'
    + (S.sel>=0 ? '（' + (S.sel+1) + '画目を選択中・' + S.draw[S.sel].length + '点）' : '')
    + ' ── ' + nm
    + ' ／ ' + (S.hand==='pen' ? '引く（B）' : '直す（V）：点を掴んで動かす・線を掴んで移す・⌫で消す')
    + ' ⚠️ 手の骨には「骨をゆがめる」は掛けない（もう人のゆらぎが入っているため）';
}
document.querySelectorAll('#segMode button').forEach(b => b.onclick = () => {
  S.mode = b.dataset.v; modeUI(); });
document.querySelectorAll('#segHand button').forEach(b => b.onclick = () => {
  S.hand = b.dataset.v; handUI(); });
document.querySelectorAll('#segTyped button').forEach(b => b.onclick = () => {
  S.typed = b.dataset.v; handUI(); });

addEventListener('resize', () => { fit(); });""",
    "盤を触れるようにする（引く・直す・戻す）")

# render() の説明文が「なぞる」を上書きしないように
rep("""  const n = runChars().length;
  $('note').textContent = S.view === 'sheet'""",
    """  const n = runChars().length;
  if(S.mode === 'draw'){ return; }      /* ⭐ なぞっている間の表示は syncNote が持つ */
  $('note').textContent = S.view === 'sheet'""",
    "なぞっている間の説明文を奪わない")

# ───────────────────────────── ⑤ UI
rep("""  <div class="sec">③ 通すもの ── 骨に着せる</div>""",
    """  <div class="sec">② 骨 ── 打つか、自分で置くか</div>
  <div class="seg" id="segMode">
    <button data-v="type" class="on">打つ</button>
    <button data-v="draw">自分で置く</button>
  </div>
  <div id="drawBox">
    <p class="note">打った字を<b>薄く下に敷ける</b>ので、字の形を覚えていなくていい。その上を盤で直になぞる。<br>
    <b>置くのは骨だけ。</b>速さ・太さ・払い・連綿は筆が作る。<b>打った字は消えない</b>（手の骨は足される）。</p>
    <div class="seg" id="segHand">
      <button data-v="pen" class="on">引く（B）</button>
      <button data-v="edit">直す（V）</button>
    </div>
    <p class="note"><b>直す</b>＝線を掴むと点が出る。<b>点を掴んで動かす</b>／<b>⇧ドラッグで線ごと移す</b>／
    <b>⌫ で1画消す</b>。<b>⌘Z</b> でどれも戻る。</p>
    <div class="row"><span class="n">打った字の出し方</span></div>
    <div class="seg" id="segTyped">
      <button data-v="solid">濃いまま</button>
      <button data-v="guide" class="on">薄く敷く</button>
      <button data-v="hide">隠す</button>
    </div>
    <div class="row" style="gap:6px;margin-top:8px">
      <button class="btn" id="dUndo">1手 戻す</button>
      <button class="btn" id="dClear">手の骨を全部消す</button>
    </div>
  </div>

  <div class="sec">③ 通すもの ── 骨に着せる</div>""",
    "「打つ／自分で置く」と「引く／直す」を画面に出す")

rep("""document.querySelectorAll('#segTool button').forEach(b => b.onclick = () => {""",
    """$('dUndo').onclick = () => undo();
$('dClear').onclick = () => { snap(); S.draw = []; S.sel = -1; draw(); syncNote(); };
document.querySelectorAll('#segTool button').forEach(b => b.onclick = () => {""",
    "戻す・全部消す を繋ぐ")

rep("syncAll(); toolUI(); layout(); fit(); draw();",
    "syncAll(); toolUI(); modeUI(); layout(); fit(); draw();",
    "起動時に画面を合わせる")

rep("ひらがな・カタカナ・漢字を、打てばそのまま走る。",
    "ひらがな・カタカナ・漢字を、打てばそのまま走る。<b>自分で置いた骨も、同じ筆で走る。</b>",
    "説明文に「自分で置く」を足す")

io.open(DST, 'w', encoding='utf-8').write(s)
print("\n%d か所 直した → %s" % (n, DST))
