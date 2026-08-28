/* ⭐⭐ フリーハンドも続きから引ける・繋がる ── 作字SAKUJI 2026-08-28
   木下＝「途中のパスに対してフリーハンドもおなじように続けてかけるところや、
           最後の繋げれるところまできたら + などが出たら嬉しい」「ペンはできるがフリーハンドはできていない」
   見るのは：① 端から引き始めると1本になる ② 引き終わりが別の端なら1本になる
            ③ 両側なら3本が1本 ④ 端から離れた所なら別の線のまま ⑤ 合図が出る */
import path from 'node:path'; import { fileURLToPath } from 'node:url';
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || 'file://' + decodeURIComponent(path.join(HERE, '..', 'index.html'));
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1400, height:900 });
await p.goto(FILE, { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,3200));
let NG=0; const ok=(c,n,x)=>{ console.log((c?'  ✅ ':'  🔴 ')+n+(x!=null?' … '+x:'')); if(!c) NG=1; };

const toScreen = (x,y) => p.evaluate(([a,b]) => {
  const v = paper.view.projectToView(new paper.Point(a,b));
  const r = document.querySelector('canvas').getBoundingClientRect();
  return { x:r.left + v.x, y:r.top + v.y };
}, [x,y]);
const drawFrom = async (pts) => {
  const s0 = await toScreen(pts[0][0], pts[0][1]);
  await p.mouse.move(s0.x, s0.y);
  await p.mouse.down();
  for(let i=1;i<pts.length;i++){
    const s = await toScreen(pts[i][0], pts[i][1]);
    await p.mouse.move(s.x, s.y, { steps:6 });
  }
  await p.mouse.up();
  await new Promise(r=>setTimeout(r,400));
};
const n = () => p.evaluate(() => artLayer.children.length);
const setup = (extra) => p.evaluate(x => {
  artLayer.removeChildren();
  new paper.Path({ segments:[[300,300],[500,300]], strokeColor:'#111', strokeWidth:6, name:'A' });
  if(x) new paper.Path({ segments:[[900,300],[1100,300]], strokeColor:'#111', strokeWidth:6, name:'B' });
  S.feel = 'plain'; setTool('stroke'); guides(); paper.view.update();
}, !!extra);

/* ① 端から引き始める＝1本になる */
await setup(false);
await drawFrom([[500,300],[600,360],[700,420]]);
ok(await n() === 1, '端から引き始めると1本になる（線が増えない）', (await n()) + ' 本');

/* ② 引き終わりが別の端＝1本になる */
await setup(true);
await drawFrom([[600,500],[750,420],[900,300]]);
ok(await n() === 2, '引き終わりが別の端なら、その2本が1本になる', (await n()) + ' 本（A・B＋引いた線→2本）');

/* ③ 両側＝3本が1本 */
await setup(true);
await drawFrom([[500,300],[700,420],[900,300]]);
ok(await n() === 1, '両側に繋ぐと3本が1本になる', (await n()) + ' 本');

/* ④ 端から離れていれば別の線のまま */
await setup(true);
await drawFrom([[600,600],[700,660],[800,700]]);
ok(await n() === 3, '端から離れていれば別の線のまま', (await n()) + ' 本');

/* ⑤ 合図＝フリーハンドを持つだけで端に印、引いている最中も出る */
await setup(true);
await new Promise(r=>setTimeout(r,200));
const cue0 = await p.evaluate(() => { guides(); return uiLayer.children.filter(c => c.data && c.data.endcue).length; });
ok(cue0 === 4, 'フリーハンドを持つと開いた端4つに印が出る', cue0 + ' 個');
const s = await toScreen(600,300);
await p.mouse.move(s.x, s.y); await p.mouse.down();
/* ⚠️ 繋がる圏は 14px（版面）＝それより近くまで寄せる（20 離れていて当たらなかった） */
const s2 = await toScreen(893,300);
await p.mouse.move(s2.x, s2.y, { steps:8 });
await new Promise(r=>setTimeout(r,300));
const cue1 = await p.evaluate(() => uiLayer.children.filter(c => c.data && c.data.endcue).length);
await p.mouse.up();
ok(cue1 > cue0, '引いている最中、繋がる所まで来ると ＋ が出る', `${cue0} → ${cue1} 個`);
ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close(); process.exit(NG);
