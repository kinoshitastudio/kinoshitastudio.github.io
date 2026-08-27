/* ⭐ パネルまわり 5件（2026-08-27・木下が触って見つけたもの）
   ① 「パネルで固定しても触れるという」→ 固定＝掴めない（Figma の錠と同じ意味に）
   ② 固定中の札が【黒地に黒】で読めなかった（var(--paper) は定義していない変数だった）
   ③ 「ガイドが見えない」→ 白と黒の互い違いで引く（濃い絵の上でも必ずどちらかが立つ）
   ④ 「紙の目のアイコンが、表示に戻しても斜線のまま」
      🔴 一覧を描き直していなかった＝【押しても隠れない】ところまで壊れていた
   ⑤ 「4:5のサイズも入れて」→ 版面に 4:5 と 9:16
   ⚠️ 直す前の版では ①③④⑤ が落ちる（確かめてある）。
   使い方: node hari/_test/panel.mjs [URL] */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[3] || path.join(HERE, '..', 'index.html');
const URL0 = /^https?:|^file:/.test(FILE) ? FILE : 'file://' + decodeURIComponent(path.resolve(FILE));
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage(); let err=0;
p.on('pageerror', e => { err++; console.log('🔴', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(URL0, { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3500));

const R = await p.evaluate(async () => {
  const wait = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  const cv = document.querySelector('canvas');
  const ev = (t,x,y) => cv.dispatchEvent(new PointerEvent(t,
    { clientX:x, clientY:y, button:0, buttons:1, bubbles:true, pointerId:1, pointerType:'mouse' }));
  /* ⚠️ 図の掴み手は data.pieceHandle（行のとは名前が違う）＝両方を数える */
  const handles = () => uiLayer.children.filter(c => c.data &&
    (c.data.vertex !== undefined || c.data.lineCorner !== undefined ||
     c.data.inset || c.data.pieceHandle !== undefined)).length;

  /* ══ ① 固定＝掴めない ══
     ⚠️ 狙うのは【面で当たる図】＝行は字の隙間が多くて、狙いが外れたのか固定が効いたのか分からない。 */
  document.getElementById('bPen').click(); await wait(200);
  const r = cv.getBoundingClientRect();
  const y = r.top + r.height*0.42;
  ev('pointerdown', r.left + r.width*0.30, y);
  for(let i=1;i<=14;i++){ ev('pointermove', r.left + r.width*(0.30+0.26*i/14), y); await wait(16); }
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, pointerId:1 }));
  await wait(500);
  document.dispatchEvent(new KeyboardEvent('keydown', { key:'v', bubbles:true })); await wait(200);
  const pc = S.pieces[S.pieces.length-1];
  const g = artItems().find(c => c.data && c.data.piece === pc.id);
  const c0 = g.parent ? g.parent.localToGlobal(g.bounds.center) : g.bounds.center;
  const v = paper.view.projectToView(c0);
  const X = r.left + v.x, Y = r.top + v.y;
  const grab = async () => {
    S.sel = { kind:null, i:null }; syncPanel(); render(); await wait(180);
    ev('pointerdown', X, Y);
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, pointerId:1 }));
    await wait(220);
    return S.sel.kind;
  };
  out.固定前 = await grab();
  pc.lock = true; renderList(); render(); await wait(250);
  out.固定後 = await grab();
  S.sel = { kind:'piece', i:S.pieces.length-1 }; syncPanel(); render(); await wait(250);
  out.固定中の掴み手 = handles();
  pc.lock = false; renderList(); render();
  S.sel = { kind:'piece', i:S.pieces.length-1 }; syncPanel(); render(); await wait(250);
  out.外すと掴み手 = handles();

  /* ══ ② 固定中の札が読めるか（地と字が別の色か） ══ */
  pc.lock = true; renderList(); await wait(200);
  const lk = document.querySelector('#lineList .lk.on');
  const cs = lk ? getComputedStyle(lk) : null;
  const rgb = t => (t.match(/\d+/g)||[]).map(Number).slice(0,3);
  out.札 = cs ? { 文:lk.textContent.trim(),
    差: Math.abs(rgb(cs.color).reduce((a,b)=>a+b,0) - rgb(cs.backgroundColor).reduce((a,b)=>a+b,0)) } : null;
  pc.lock = false; renderList(); render(); await wait(150);

  /* ══ ③ ガイドが【白と黒の2色】で引かれる ══ */
  S.guide = { on:'third', margin:11, grid:6 }; render(); await wait(300);
  const cols = uiLayer.children.filter(c => c.strokeColor).map(c => c.strokeColor.toCSS(true));
  out.ガイド = { 白:cols.filter(c=>c==='#ffffff').length, 黒:cols.filter(c=>c==='#000000').length,
                 破線:uiLayer.children.filter(c => c.dashArray && c.dashArray.length).length };
  S.guide = { on:0, margin:8, grid:6 }; render(); await wait(200);

  /* ══ ④ 紙の目のアイコンが、押すたびに変わる ══ */
  document.querySelector('#segKami button[data-v="zara"]').click(); await wait(450);
  const row = () => [...document.querySelectorAll('#lineList .li.kami')][0];
  const shut = () => !!row().querySelector('.hd.on');
  out.紙 = { 出した:{ 斜線:shut(), on:kamiOf('kami').on } };
  row().querySelector('.hd').click(); await wait(450);
  out.紙.隠した = { 斜線:shut(), on:kamiOf('kami').on };
  row().querySelector('.hd').click(); await wait(450);
  out.紙.戻した = { 斜線:shut(), on:kamiOf('kami').on };
  document.querySelector('#segKami button[data-v="none"]').click(); await wait(300);

  /* ══ ⑤ 版面に 4:5 と 9:16 ══ */
  const hit = t => [...document.querySelectorAll('#panel button.btn')].find(b => b.textContent.trim() === t);
  out.比 = {};
  for(const t of ['4:5','9:16']){
    const btn = hit(t);
    if(!btn){ out.比[t] = null; continue; }
    btn.click(); await wait(350);
    out.比[t] = { w:S.board.w, h:S.board.h, 比:+(S.board.w/S.board.h).toFixed(4),
                  欄:+document.getElementById('bh').value };
  }
  hit('A比 縦').click(); await wait(250);
  out.戻せる = { w:S.board.w, h:S.board.h };
  return out;
});
await b.close();

let ng = 0;
const ok = (c,n,note)=>{ console.log(`  ${c?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!c) ng++; };
console.log('── ⭐ パネルまわり（固定・ガイド・紙の目・版面の比）');
ok(err === 0, 'JSエラーが出ない', err + '件');
ok(R.固定前 === 'piece', '⭐ 固定していなければ版面で掴める（＝この試験が効いている証明）', String(R.固定前));
ok(R.固定後 == null, '⭐⭐ 固定したら【掴めない】（木下「固定しても触れるという」）', String(R.固定後));
ok(R.固定中の掴み手 === 0 && R.外すと掴み手 > 0,
   '⭐ 固定中は掴み手も出ない／外せば戻る', `固定中 ${R.固定中の掴み手} → 外すと ${R.外すと掴み手}`);
ok(R.札 && R.札.文 === '固定中' && R.札.差 > 200,
   '🔴 固定中の札が読める（地と字が別の色）', JSON.stringify(R.札));
ok(R.ガイド.白 > 0 && R.ガイド.黒 > 0 && R.ガイド.破線 > 0,
   '⭐⭐ ガイドが【白と黒の互い違い】で引かれる（濃い絵の上でも見える）', JSON.stringify(R.ガイド));
ok(R.紙.出した.斜線 === false && R.紙.出した.on === 'zara',
   '⭐ 紙を出したら、目は【開いている】', JSON.stringify(R.紙.出した));
ok(R.紙.隠した.斜線 === true && R.紙.隠した.on === 'none',
   '🔴 目を押すと【本当に隠れる】（前は押しても隠れていなかった）', JSON.stringify(R.紙.隠した));
ok(R.紙.戻した.斜線 === false && R.紙.戻した.on === 'zara',
   '⭐⭐ もう一度押すと戻る＝斜線も消える（木下「車線がついたまま」）', JSON.stringify(R.紙.戻した));
ok(R.比['4:5'] && Math.abs(R.比['4:5'].比 - 0.8) < 0.001 && R.比['4:5'].欄 === R.比['4:5'].h,
   '⭐ 版面に【4:5】がある（数字の欄も一緒に変わる）', JSON.stringify(R.比['4:5']));
ok(R.比['9:16'] && Math.abs(R.比['9:16'].比 - 0.5625) < 0.001,
   '⭐ 縦の投稿用に【9:16】も', JSON.stringify(R.比['9:16']));
ok(R.戻せる.w === 1000 && R.戻せる.h === 1414, '⚠️ A比 縦に戻せる', JSON.stringify(R.戻せる));
process.exit(ng ? 1 : 0);
