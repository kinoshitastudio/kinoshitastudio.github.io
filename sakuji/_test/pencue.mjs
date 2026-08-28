/* ⭐ 続きから描ける所の合図 ── 作字SAKUJI 2026-08-28
   木下＝「ここからペンで描くとき、続きのアンカーからかけるという合図をパス上でみせて」
   見るのは：① ペンを持つと開いたパスの端に印が出る ② 閉じたパスには出ない
            ③ 近づくと ＋ が出る ④ 描き始めたら消える ⑤ 他の道具では出ない */
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
const cue = () => p.evaluate(() => uiLayer.children.filter(c => c.data && c.data.endcue).length);

await p.evaluate(() => {
  artLayer.removeChildren();
  /* 開いた線1本（端は2つ）＋ 閉じた形1つ（端は無い） */
  new paper.Path({ segments:[[300,300],[500,300],[700,300]], strokeColor:'#111', strokeWidth:6 });
  new paper.Path.Rectangle({ point:[300,500], size:[200,150], strokeColor:'#111', strokeWidth:6 });
  setTool('select'); guides(); paper.view.update();
});
ok(await cue() === 0, '選択ツールでは出ない', (await cue()) + ' 個');

await p.evaluate(() => { setTool('pen'); guides(); });
await new Promise(r=>setTimeout(r,250));
ok(await cue() === 2, 'ペンを持つと開いたパスの端2つに出る（閉じた形には出ない）', (await cue()) + ' 個');

/* ③ 近づくと ＋（線が2本）が増える */
await p.evaluate(() => { mousePt = new paper.Point(700,300); guides(); });
await new Promise(r=>setTimeout(r,250));
ok(await cue() >= 4, '近づくと ＋ が出る', (await cue()) + ' 個');

/* ④ 描き始めたら消える */
await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  const v = paper.view.projectToView(new paper.Point(900,700));
  const r = cv.getBoundingClientRect();
  const ev = t => cv.dispatchEvent(new MouseEvent(t,{clientX:r.left+v.x, clientY:r.top+v.y, button:0, buttons:1, bubbles:true}));
  ev('mousedown'); ev('mouseup');
});
await new Promise(r=>setTimeout(r,250));
ok(await cue() === 0, '描き始めたら消える（そこからは別の合図がある）', (await cue()) + ' 個');
ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close(); process.exit(NG);
