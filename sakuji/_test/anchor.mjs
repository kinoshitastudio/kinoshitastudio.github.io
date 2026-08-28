/* ⭐⭐ アンカーを扱う（ダイレクト選択）── 作字SAKUJI 2026-08-28
   木下＝「選択ツールでアンカーをダブルタップすると消して、線の途中でポチッとおすと
           アンカーを追加できるようにしたい」「シフトキーを押しながらだと複数選択できるように」
           「線の途中でも選択をしてペンツールでそのアンカーの続きから書くとつなげてかけるように」
   🔴 直す前は `item.selected = true` を立てるだけで【どの点を選んでいるかを持っていなかった】。
   見るのは：① 点を選べる ② ⇧で複数 ③ まとめて動く ④ 線の上で足す ⑤ ダブルクリックで消す
            ⑥ ペンが選んだ点の続きから描く
   使い方: node sakuji/_test/anchor.mjs <URL> */
import path from 'node:path'; import { fileURLToPath } from 'node:url';
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || 'file://' + decodeURIComponent(path.join(HERE, '..', 'index.html'));
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1500, height:950 });
await p.goto(FILE, { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,3200));
let NG=0; const ok=(c,n,x)=>{ console.log((c?'  ✅ ':'  🔴 ')+n+(x!=null?' … '+x:'')); if(!c) NG=1; };

/* ⚠️ paper.js は MouseEvent を見る（PointerEvent では拾わない） */
const at = (x,y,mods={}) => p.evaluate(([a,b,m]) => {
  const cv = document.querySelector('canvas');
  const mk = (t) => cv.dispatchEvent(new MouseEvent(t, Object.assign(
    { clientX:a, clientY:b, button:0, buttons:1, bubbles:true }, m)));
  mk('mousedown'); mk('mouseup');
}, [x,y,mods]);
const dragTo = (x1,y1,x2,y2) => p.evaluate(([a,b,c,d]) => {
  const cv = document.querySelector('canvas');
  const ev = (t,x,y) => cv.dispatchEvent(new MouseEvent(t,{clientX:x,clientY:y,button:0,buttons:1,bubbles:true}));
  ev('mousedown',a,b);
  for(let i=1;i<=8;i++) ev('mousemove', a+(c-a)*i/8, b+(d-b)*i/8);
  ev('mouseup',c,d);
}, [x1,y1,x2,y2]);

/* 版面の座標 → 画面の座標 */
const toScreen = (x,y) => p.evaluate(([a,b]) => {
  const v = paper.view.projectToView(new paper.Point(a,b));
  const r = document.querySelector('canvas').getBoundingClientRect();
  return { x: r.left + v.x, y: r.top + v.y };
}, [x,y]);

/* 開いた線を1本（4点） */
await p.evaluate(() => {
  artLayer.removeChildren();
  const q = new paper.Path({ segments:[[300,300],[500,300],[700,300],[900,300]],
                             strokeColor:'#111', strokeWidth:8 });
  q.name = 'L'; guides(); paper.view.update();
  setTool('direct');
});
const info = () => p.evaluate(() => {
  const it = artLayer.children[0];
  return { 点:it.segments.length, 選:selSegs().length,
           y:it.segments.map(s=>Math.round(s.point.y)) };
});

/* ① 点を選ぶ */
let s1 = await toScreen(300,300);
await at(s1.x, s1.y); await new Promise(r=>setTimeout(r,250));
ok((await info()).選 === 1, 'アンカーを押すと1点だけ選べる', JSON.stringify(await info()));

/* ② ⇧ で足す ── ⚠️ 実物と同じく【キーを押しながら】押す */
let s2 = await toScreen(500,300);
await p.keyboard.down('Shift');
await at(s2.x, s2.y, { shiftKey:true }); await new Promise(r=>setTimeout(r,250));
ok((await info()).選 === 2, '⇧ で複数選べる', (await info()).選 + ' 点');
/* ⇧ でもう一度押すと外れる */
await at(s2.x, s2.y, { shiftKey:true }); await new Promise(r=>setTimeout(r,250));
ok((await info()).選 === 1, '⇧ でもう一度押すと外れる', (await info()).選 + ' 点');
await at(s2.x, s2.y, { shiftKey:true }); await new Promise(r=>setTimeout(r,200));
await p.keyboard.up('Shift');

/* ③ まとめて動く */
const 前 = await info();
await dragTo(s2.x, s2.y, s2.x, s2.y - 60); await new Promise(r=>setTimeout(r,300));
const 後 = await info();
const 動いた = 前.y.filter((v,i) => v !== 後.y[i]).length;
ok(動いた === 2, '選んだ2点がまとめて動く', `${前.y} → ${後.y}`);

/* ④ ⭐ 規則は1つ＝【ダブルクリック】。線の上なら足す・アンカーの上なら消す */
const dbl = (x,y) => p.evaluate(([a,b]) => {
  const cv = document.querySelector('canvas');
  cv.dispatchEvent(new MouseEvent('dblclick', { clientX:a, clientY:b, bubbles:true }));
}, [x,y]);
const n0 = (await info()).点;
let s3 = await toScreen(800,300);
await dbl(s3.x, s3.y); await new Promise(r=>setTimeout(r,300));
const n1 = (await info()).点;
ok(n1 === n0 + 1, '線の上をダブルクリックするとアンカーが1つ増える', `${n0} → ${n1} 点`);

/* シングルでは増えない（選ぼうとしただけで増えると驚く） */
let s3b = await toScreen(600,300);
await at(s3b.x, s3b.y); await new Promise(r=>setTimeout(r,250));
ok((await info()).点 === n1, 'シングルでは増えない（選ぶだけ）', (await info()).点 + ' 点');

/* ⑤ アンカーの上をダブルクリックで消す */
await dbl(s3.x, s3.y);
await new Promise(r=>setTimeout(r,300));
const n2 = (await info()).点;
ok(n2 === n1 - 1, 'アンカーの上をダブルクリックすると消える', `${n1} → ${n2} 点`);

/* ⭐ 押す前に合図（＋／−）が出る */
/* ⚠️ 合図は【本物のマウス移動】で出す。dispatch した MouseEvent は paper が拾わない
   （実測：mousePt が更新されず、合図が0に見えた） */
const hint = async (x,y) => { await p.mouse.move(x, y);
  await new Promise(r=>setTimeout(r,250));
  return p.evaluate(() => uiLayer.children.filter(c => c.data && c.data.pvHint).length); };
/* ⚠️ 前の段で点を動かしている＝まっさらな線を1本置き直してから合図を見る */
await p.evaluate(() => {
  artLayer.removeChildren();
  const q = new paper.Path({ segments:[[300,300],[900,300]], strokeColor:'#111', strokeWidth:6 });
  q.selected = true; setTool('direct'); guides(); paper.view.update();
});
const mid = await toScreen(600,300);
const hAdd = await hint(mid.x, mid.y);
ok(hAdd >= 3, '線の上に来ると ＋ の合図が出る（丸＋たて＋よこ）', hAdd + ' 個');
const end = await toScreen(300,300);
const hDel = await hint(end.x, end.y);
ok(hDel >= 2 && hDel < hAdd, 'アンカーの上に来ると − の合図に変わる（線が1本になる）', hDel + ' 個');

/* ⑥ ペンが「選んだ点の続き」から描く（端の点＝1本のまま伸びる） */
await p.evaluate(() => {
  artLayer.removeChildren();
  const q = new paper.Path({ segments:[[300,600],[500,600],[700,600]], strokeColor:'#111', strokeWidth:8 });
  q.segments[2].selected = true; q.selected = true;
  setTool('pen'); guides(); paper.view.update();
});
/* ⚠️ 1回目のクリックは【続きモードに入る】だけ（既存の端点クリックと同じ）。
   点が増えるのは2回目から＝そこまで通して見る。 */
const e0 = await toScreen(700,600);
await at(e0.x, e0.y); await new Promise(r=>setTimeout(r,250));
const e1 = await toScreen(900,700);
await at(e1.x, e1.y); await new Promise(r=>setTimeout(r,300));
const R = await p.evaluate(() => ({ 図:artLayer.children.length, 点:artLayer.children[0].segments.length }));
ok(R.図 === 1 && R.点 === 4, '選んだ端の点の続きから描ける（線は増えない）', JSON.stringify(R));

ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close(); process.exit(NG);
