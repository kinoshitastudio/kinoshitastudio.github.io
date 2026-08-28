/* ⭐ 盤の上で回す ── 作字SAKUJI 2026-08-28
   木下＝「選択してボード上でオブジェクトの角度を変えれるようにして」
   見るのは：① 角の【少し外】を掴むと回る ② 掴み手そのものは今までどおり拡大縮小
            ③ ⇧ で 15°刻み ④ 中心は選んだもの全体の真ん中（位置が飛ばない）
            ⑤ 押す前に「回す所」の合図が出る */
import path from 'node:path'; import { fileURLToPath } from 'node:url';
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || 'file://' + decodeURIComponent(path.join(HERE, '..', 'index.html'));
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1300, height:900 });
await p.goto(FILE, { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,3200));
let NG=0; const ok=(c,n,x)=>{ console.log((c?'  ✅ ':'  🔴 ')+n+(x!=null?' → '+x:'')); if(!c) NG=1; };

const setup = () => p.evaluate(() => {
  artLayer.removeChildren();
  const q = new paper.Path.Rectangle({ point:[400,300], size:[300,200], fillColor:'#111' });
  q.name = 'R'; q.selected = true; setTool('select'); guides(); paper.view.update();
});
const box = () => p.evaluate(() => {
  const it = artLayer.children[0], b = it.bounds;
  return { w:Math.round(b.width), h:Math.round(b.height),
           cx:Math.round(b.center.x), cy:Math.round(b.center.y),
           /* 傾きは1辺の向きで見る（bounds は回すと大きくなるだけなので） */
           ang: Math.round(Math.atan2(it.segments[1].point.y - it.segments[0].point.y,
                                      it.segments[1].point.x - it.segments[0].point.x) * 180 / Math.PI) };
});
const toScreen = (x,y) => p.evaluate(([a,b]) => {
  const v = paper.view.projectToView(new paper.Point(a,b));
  const r = document.querySelector('canvas').getBoundingClientRect();
  return { x:r.left + v.x, y:r.top + v.y };
}, [x,y]);

await setup();
const b0 = await box();

/* ⑤ 合図（角の少し外に置く） */
const outp = await toScreen(400 - 14, 300 - 14);   /* 左上の角の外 */
await p.mouse.move(outp.x, outp.y);
await new Promise(r=>setTimeout(r,300));
const hint = await p.evaluate(() => uiLayer.children.filter(c => c.data && c.data.rotHint).length);
ok(hint >= 2, '角の少し外に来ると「回す」の合図が出る', hint + ' 個');

/* ① 回る */
const cen = await toScreen(550, 400);
await p.mouse.down();
await p.mouse.move(cen.x, cen.y - 200, { steps:10 });   /* 真上へ＝約 90° 回す */
await p.mouse.up();
await new Promise(r=>setTimeout(r,300));
const b1 = await box();
ok(b1.ang !== b0.ang, '角の外を掴むと回る', `${b0.ang}° → ${b1.ang}°`);
ok(Math.abs(b1.cx - b0.cx) < 3 && Math.abs(b1.cy - b0.cy) < 3,
   '真ん中を軸に回る（位置が飛ばない）', `(${b0.cx},${b0.cy}) → (${b1.cx},${b1.cy})`);

/* ② 掴み手そのものは拡大縮小のまま */
await setup();
const h = await toScreen(700, 500);            /* 右下の掴み手ちょうど */
await p.mouse.move(h.x, h.y); await p.mouse.down();
await p.mouse.move(h.x + 100, h.y + 60, { steps:6 }); await p.mouse.up();
await new Promise(r=>setTimeout(r,300));
const b2 = await box();
ok(b2.ang === b0.ang && (b2.w > b0.w || b2.h > b0.h),
   '掴み手そのものは今までどおり拡大縮小', `${b0.w}×${b0.h} → ${b2.w}×${b2.h} / ${b2.ang}°`);

/* ③ ⇧ で 15°刻み */
await setup();
const o2 = await toScreen(400 - 14, 300 - 14);
await p.mouse.move(o2.x, o2.y);
await p.keyboard.down('Shift');
await p.mouse.down();
await p.mouse.move(o2.x + 40, o2.y - 12, { steps:8 });
await p.mouse.up();
await p.keyboard.up('Shift');
await new Promise(r=>setTimeout(r,300));
const b3 = await box();
ok(Math.abs(b3.ang % 15) < 2, '⇧ で 15°刻みになる', b3.ang + '°');
ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close(); process.exit(NG);
