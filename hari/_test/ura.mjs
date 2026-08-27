/* ⭐⭐ 紙を裏返して書く（2026-08-27）
   木下＝「また紙を裏返して書くこともできるようにして。表面に書いていると、裏面にひっくり返すと
   本物の紙のようにうっすらと表面が見えている。リアルさをさらに求めよう」

   見るのは「落ちない」ではなく、**紙として辻褄が合っているか**：
     ⭐⭐ 裏で引いた線が【指を置いた所】に出る（＝返し忘れ・二重に返すが一発で落ちる）
     ⭐ 表に戻すと、その線は【左右が入れ替わった所】に、うっすら見える（本物の紙と同じ）
     ⚠️ 透けているだけの物は【掴めない・消しゴムも効かない】（紙の向こう側）
     ⭐ 透ける濃さ 0＝反対の面は見えない／控え（JSON）の往復で面が戻る
     ⚠️ 表を見ている間は、これまでと同じ絵（別スクリプトで画素まで突き合わせる）
   ⚠️ pointerup は window に付いている（cv ではない）。
   ⚠️ 直す前の版には #bFace が無いので落ちる。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage(); let err=0;
p.on('pageerror', e => { err++; console.log('🔴', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[3] || path.join(HERE, '..', 'index.html');
await p.goto('file://' + decodeURIComponent(FILE), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3500));

const R = await p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  if(!document.getElementById('bFace')) return { 無し:'紙を裏返す（#bFace）が無い' };
  const cv = document.querySelector('canvas');
  const box = () => cv.getBoundingClientRect();
  const ev = (t,x,y) => cv.dispatchEvent(new PointerEvent(t,
    { clientX:x, clientY:y, button:0, buttons:1, bubbles:true, pointerId:1, pointerType:'mouse' }));
  /* ⭐ 版面の物が【画面のどこに見えているか】。ここが試験の物差し
     ＝本体が描くときに使うのと同じ道（paper の projectToView）から取る。 */
  const seenAt = pc => {
    const g = artItems().find(c => c.data && c.data.piece === pc.id);
    if(!g) return null;
    /* 🔴 paper の bounds は【親の座標系】＝入れ物（inner）に掛けた返しが入っていない。
       ⭐ 親から global へ持ち上げてから画面へ落とす＝本体が絵を出すのと同じ道。 */
    const c0 = g.parent ? g.parent.localToGlobal(g.bounds.center) : g.bounds.center;
    const v = paper.view.projectToView(c0);
    const r = box();
    return { x: r.left + v.x, y: r.top + v.y };
  };
  /* 盤の上を左から右へ引く。返り値＝引いた線のまん中の【画面座標】 */
  const draw = async (fx, fy) => {
    const r = box();
    const y = r.top + r.height*fy;
    const x0 = r.left + r.width*fx, x1 = r.left + r.width*(fx + 0.18);
    ev('pointerdown', x0, y);
    for(let i=1;i<=12;i++){ ev('pointermove', x0 + (x1-x0)*i/12, y); await wait(16); }
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, pointerId:1 }));
    await wait(420);
    return { x:(x0+x1)/2, y };
  };

  /* ══ ① 表＝いままでどおり ══ */
  out.はじめは表 = (S.face|0) === 0;

  /* ══ ② U で裏になる（道具立ての印も一緒に変わる） ══ */
  document.dispatchEvent(new KeyboardEvent('keydown', { key:'u', bubbles:true }));
  await wait(250);
  const bf = document.getElementById('bFace');
  out.Uで裏 = { face:S.face|0, 印:bf.classList.contains('on'),
                字:(bf.querySelector('.fc')||{}).textContent,
                段:!!document.querySelector('#segFace button[data-v="1"].on') };

  /* ══ ③⭐⭐ 裏で引いた線が【指を置いた所】に出る ══ */
  document.getElementById('bPen').click(); await wait(200);
  const 引いた = await draw(0.28, 0.30);
  const pcU = S.pieces[S.pieces.length-1];
  const 見え = pcU ? seenAt(pcU) : null;
  out.裏で引く = { ura:pcU ? (pcU.ura|0) : -1,
                   ずれ: 見え ? Math.round(Math.hypot(見え.x-引いた.x, 見え.y-引いた.y)) : -1 };

  /* ══ ④ 表に戻すと【左右が入れ替わった所】にうっすら見える ══ */
  document.dispatchEvent(new KeyboardEvent('keydown', { key:'u', bubbles:true }));
  await wait(300);
  const 見え表 = pcU ? seenAt(pcU) : null;
  const r0 = box(), 盤中央 = r0.left + r0.width/2;
  out.表から見る = {
    face:S.face|0,
    /* ⭐ 版面の中心をはさんで【反対側】に居る（＝紙をめくったのと同じ） */
    反対側: !!(見え表 && 見え && (見え.x - 盤中央) * (見え表.x - 盤中央) < 0),
    /* ⭐ 中心からの距離は同じ（ひっくり返っただけで動いていない） */
    距離差: 見え表 && 見え
      ? Math.round(Math.abs(Math.abs(見え表.x-盤中央) - Math.abs(見え.x-盤中央))) : -1,
    高さ差: 見え表 && 見え ? Math.round(Math.abs(見え表.y - 見え.y)) : -1 };

  /* ══ ⑤ 透けている物は掴めない（クリックしても選ばれない） ══ */
  document.getElementById('bPen').click(); await wait(150);      // 選ぶに戻す
  S.sel = { kind:null, i:null };
  /* ⚠️ そのままだと【手前に居る行】が先に当たって、透けた図まで届かない
     ＝ locked を外しても落ちない試験になる（狼少年）。
     ⭐ 他をぜんぶ隠して、狙った物だけが居る状態を先に作る。 */
  const hid0 = S.lines.map(l => !!l.hide);
  S.lines.forEach(l => { l.hide = true; });
  S.pieces.forEach(x => { if(!pcU || x.id !== pcU.id) x.hide = true; });
  render(); await wait(200);
  if(見え表){ ev('pointerdown', 見え表.x, 見え表.y);
              window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, pointerId:1 })); }
  await wait(200);
  const 選ばれた = S.sel.kind;
  S.lines.forEach((l,i) => { l.hide = hid0[i]; });
  S.pieces.forEach(x => { x.hide = false; });
  render(); await wait(150);
  /* ⚠️ 「何も選ばれない」では甘い＝その場所に別の行が居ることがある。
     ⭐ 見たいのは【透けている、その物が選ばれない】こと。 */
  out.透けは掴めない = (選ばれた == null);
  out.かわりに選ばれた = 選ばれた;

  /* ══ ⑥ 消しゴムも効かない（鉛筆の線を裏に引いて、表からこすってみる） ══ */
  document.dispatchEvent(new KeyboardEvent('keydown', { key:'u', bubbles:true })); await wait(200);
  document.getElementById('bPen').click(); await wait(150);
  { const sel = document.getElementById('feel');
    sel.value = 'enpitsu'; sel.dispatchEvent(new Event('change', { bubbles:true })); await wait(150); }
  await draw(0.30, 0.52);
  const pcE = S.pieces[S.pieces.length-1];
  const 濃さ0 = pcE && pcE.pen && pcE.pen.q ? pcE.pen.q.reduce((a,b)=>a+b,0) : -1;
  document.dispatchEvent(new KeyboardEvent('keydown', { key:'u', bubbles:true })); await wait(250);
  const 見えE = pcE ? seenAt(pcE) : null;
  document.dispatchEvent(new KeyboardEvent('keydown', { key:'e', bubbles:true })); await wait(150);
  if(見えE){
    ev('pointerdown', 見えE.x, 見えE.y);
    for(let i=0;i<8;i++){ ev('pointermove', 見えE.x - 20 + i*5, 見えE.y); await wait(20); }
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, pointerId:1 }));
  }
  await wait(300);
  const 濃さ1 = pcE && pcE.pen && pcE.pen.q ? pcE.pen.q.reduce((a,b)=>a+b,0) : -2;
  out.透けは消せない = { 前:Math.round(濃さ0*100)/100, 後:Math.round(濃さ1*100)/100 };
  /* ⚠️ 同じ場所を【裏に戻って】こすれば、ちゃんと減る（＝この試験が本当に効いている証明） */
  document.dispatchEvent(new KeyboardEvent('keydown', { key:'u', bubbles:true })); await wait(250);
  const 見えE2 = pcE ? seenAt(pcE) : null;
  if(見えE2){
    ev('pointerdown', 見えE2.x, 見えE2.y);
    for(let i=0;i<8;i++){ ev('pointermove', 見えE2.x - 20 + i*5, 見えE2.y); await wait(20); }
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, pointerId:1 }));
  }
  await wait(300);
  out.同じ面なら消せる = { 後:Math.round((pcE && pcE.pen && pcE.pen.q
    ? pcE.pen.q.reduce((a,b)=>a+b,0) : -3)*100)/100 };
  document.dispatchEvent(new KeyboardEvent('keydown', { key:'v', bubbles:true })); await wait(150);

  /* ══ ⑦ 透ける濃さ ══ */
  document.dispatchEvent(new KeyboardEvent('keydown', { key:'u', bubbles:true })); await wait(250);
  const shot = () => { const c = document.createElement('canvas');
    c.width = 300; c.height = 300;
    c.getContext('2d').drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, 300, 300);
    return c.getContext('2d').getImageData(0,0,300,300).data; };
  const diff = (a,c) => { let n=0; for(let i=0;i<a.length;i+=4){
    if(Math.abs(a[i]-c[i])+Math.abs(a[i+1]-c[i+1])+Math.abs(a[i+2]-c[i+2]) > 12) n++; } return n; };
  const A = shot();
  const sl = document.getElementById('uraSee');
  sl.value = '0'; sl.dispatchEvent(new Event('input', { bubbles:true })); await wait(300);
  const B = shot();
  out.濃さで変わる = diff(A, B);
  sl.value = '45'; sl.dispatchEvent(new Event('input', { bubbles:true })); await wait(300);
  out.濃くもできる = diff(B, shot());
  sl.value = '18'; sl.dispatchEvent(new Event('input', { bubbles:true })); await wait(250);

  /* ══ ⑧ 一覧に「裏」の札が出る・反対の面は薄い ══ */
  out.一覧の札 = document.querySelectorAll('#lineList .li .fx').length;
  out.一覧で薄い = document.querySelectorAll('#lineList .li.offface').length;

  /* ══ ⑪⭐ 裏の絵は【紙の目の向こう側】に居る（本物の紙と同じ重なり） ══
     ⚠️ 紙（地に）を先に敷いてしまうと、裏の絵が紙の手前に浮いて「透けて」見えない。 */
  kamiSet('on', 'zara', 'kamiU'); kamiSet('amt', 70, 'kamiU');
  render(); await wait(400);
  {
    const inner = paper.project.layers.find(l => l.children &&
      l.children.some(c => c.data && c.data.inner));
    const box2 = inner ? inner.children.find(c => c.data && c.data.inner && !c.data.ghost) : null;
    const cs = box2 ? box2.children : [];
    const iK = cs.findIndex(c => c.data && c.data.kami);
    const items = cs.map((c,i) => ({ i, pc:c.data && c.data.piece, ln:c.data && c.data.line }))
                    .filter(x => x.pc !== undefined || x.ln !== undefined);
    const face = o => (o && o.ura ? 1 : 0) === (S.face ? 1 : 0);
    const of = x => x.pc !== undefined ? S.pieces.find(p => p.id === x.pc)
                                       : S.lines.find(l => l.id === x.ln);
    out.紙の向こう = {
      紙の位置: iK,
      紙より下は全部裏: items.filter(x => x.i < iK).every(x => !face(of(x))),
      紙より上は全部表: items.filter(x => x.i > iK).every(x =>  face(of(x))),
      下の数: items.filter(x => x.i < iK).length };
  }
  kamiSet('on', 'none', 'kamiU'); render(); await wait(250);

  /* ══ ⑨ 選んでいるものを反対の面へ移す ══ */
  S.sel = { kind:'line', i:0 }; syncPanel(); await wait(120);
  const ura0 = S.lines[0].ura|0;
  document.getElementById('toFace').click(); await wait(250);
  out.移せる = { 前:ura0, 後:S.lines[0].ura|0 };
  document.getElementById('toFace').click(); await wait(250);

  /* ══ ⑩ 控え（JSON）の往復 ══ */
  /* ⚠️ 数えるのは【控えに入る図】だけ（2026-08-27 から消しカスも控えに入る）。 */
  out.控え前 = { face:S.face|0,
                 裏の数:S.pieces.filter(x => x.ura && (x.src || x.pen || (x.kasu && x.kasu.length))).length,
                 行:S.lines.length, 図:S.pieces.filter(x => x.src || x.pen || (x.kasu && x.kasu.length)).length };
  return out;
});

/* ══ 控えの往復は本体の書き出し／読み込みをそのまま通す ══ */
const R2 = await p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  /* ⚠️ ダウンロードは起きないので、書き出しの中身を横取りする */
  let json = null;
  const dl0 = window.dl;
  window.dl = (blob, name) => { if(/json$/.test(name)) json = blob; };
  document.getElementById('eJSON').click();
  await wait(300);
  window.dl = dl0;
  if(!json) return { 無し:'控えが出なかった' };
  const txt = await json.text();
  const d = JSON.parse(txt);
  const 控え = { face:d.face|0, uraSee:d.uraSee,
                 裏の図:(d.pieces||[]).filter(x=>x.ura).length,
                 裏の行:(d.lines||[]).filter(x=>x.ura).length };
  /* 読み直す＝面まで戻るか */
  const f = new File([txt], 'hari.json', { type:'application/json' });
  const dt = new DataTransfer(); dt.items.add(f);
  const inp = document.getElementById('fJSON');
  inp.files = dt.files;
  inp.dispatchEvent(new Event('change', { bubbles:true }));
  await wait(1200);
  return { 控え, 読み直し:{ face:S.face|0,
                            裏の図:S.pieces.filter(x => x.ura && (x.src || x.pen || (x.kasu && x.kasu.length))).length,
                            図:S.pieces.filter(x => x.src || x.pen || (x.kasu && x.kasu.length)).length, 行:S.lines.length } };
});

if(process.argv[2]) await p.screenshot({ path: process.argv[2] });
await b.close();

let ng = 0;
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng++; };
console.log('── ⭐⭐ 紙を裏返して書く');
if(R.無し){ console.log('  🔴 ' + R.無し); process.exit(1); }
ok(err === 0, 'JSエラーが出ない', err + '件');
ok(R.はじめは表, '⚠️ はじめは【表】（既定は今までの絵）');
ok(R.Uで裏.face === 1 && R.Uで裏.印 && R.Uで裏.字 === '裏' && R.Uで裏.段,
   '⭐ U で裏返る（道具立ての印も右の段も一緒に変わる）', JSON.stringify(R.Uで裏));
ok(R.裏で引く.ura === 1, '⭐ 裏で引いた線は【裏の面】に入る', JSON.stringify(R.裏で引く));
ok(R.裏で引く.ずれ >= 0 && R.裏で引く.ずれ < 14,
   '⭐⭐ 裏で引いた線が【指を置いた所】に出る（返し忘れ／二重返しが落ちる）',
   `ずれ ${R.裏で引く.ずれ}px`);
ok(R.表から見る.face === 0 && R.表から見る.反対側,
   '⭐⭐ 表に戻すと【左右が入れ替わった所】に見える（紙をめくったのと同じ）',
   JSON.stringify(R.表から見る));
ok(R.表から見る.距離差 >= 0 && R.表から見る.距離差 < 6 && R.表から見る.高さ差 < 6,
   '⭐ 中心からの距離と高さは同じ（返っただけで物は動いていない）',
   `横 ${R.表から見る.距離差}px ／ 縦 ${R.表から見る.高さ差}px`);
ok(R.透けは掴めない, '⚠️ 透けている物は掴めない（紙の向こう側）',
   'そこで選ばれたもの＝' + (R.かわりに選ばれた || 'なし'));
ok(R.透けは消せない.後 >= R.透けは消せない.前 - 0.001,
   '⚠️ 透けている鉛筆は消しゴムでも減らない', JSON.stringify(R.透けは消せない));
ok(R.同じ面なら消せる.後 < R.透けは消せない.前 - 0.05,
   '⭐ 同じ面に回れば、ちゃんと消える（＝上の試験が効いている証明）',
   JSON.stringify(R.同じ面なら消せる));
ok(R.濃さで変わる > 200, '⭐ 透ける濃さ 0＝反対の面が見えなくなる', R.濃さで変わる + '画素');
ok(R.濃くもできる > 200, '⭐ 濃くもできる', R.濃くもできる + '画素');
ok(R.一覧の札 > 0, '⭐ 一覧に【裏】の札が出る', R.一覧の札 + '個');
ok(R.一覧で薄い > 0, '⭐ 反対の面の物は一覧でも薄い', R.一覧で薄い + '個');
ok(R.移せる.前 !== R.移せる.後, '⭐ 選んだものを【反対の面へ】移せる', JSON.stringify(R.移せる));
ok(R.紙の向こう && R.紙の向こう.紙の位置 > 0 && R.紙の向こう.下の数 > 0 &&
   R.紙の向こう.紙より下は全部裏 && R.紙の向こう.紙より上は全部表,
   '⭐⭐ 反対の面の絵は【紙の目の向こう側】に居る（紙ごしに透ける）',
   JSON.stringify(R.紙の向こう));
if(R2.無し){ ok(false, '控えの往復', R2.無し); }
else {
  ok(R2.控え.裏の図 > 0, '⭐ 控えに【どちらの面か】が入る', JSON.stringify(R2.控え));
  ok(R2.読み直し.face === R.控え前.face && R2.読み直し.裏の図 === R.控え前.裏の数,
     '⭐ 読み直すと面ごと戻る',
     '控え前 ' + JSON.stringify(R.控え前) + ' → 読み直し ' + JSON.stringify(R2.読み直し));
}
process.exit(ng ? 1 : 0);
