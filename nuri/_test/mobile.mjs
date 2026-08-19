/* ⭐ 塗 NURI の【モバイル】回帰テスト（2026-08-19 新設）
   木下「モバイルだが、スライダー部分が左右に操作中にずれる」
   🔴 正体は2つ：
     ① スライダーに touch-action が無く、横に引く指を【画面のパン】と解釈されていた → pan-y
        ⚠️ none にしてはいけない（縦スクロールが止まる＝18本の道具で踏んだ型）
     ② 見出し（label.h）は【パネルの余白を打ち消して全幅にする】細工（margin:0 -16px）だが、
        モバイルの余白は 14px なので【左右に 2px ずつはみ出して】いた
   ⚠️ headless の合成タッチではスライダーの値が動かない＝値の検査はしない（実機で見る）。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL0 = process.argv[2] || 'http://localhost:8092/nuri/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
const errs=[]; p.on('pageerror', e => errs.push(e.message));
/* iPhone 相当 */
await p.setViewport({ width:390, height:844, deviceScaleFactor:3, isMobile:true, hasTouch:true });
await p.goto(URL0 + '?v='+Date.now(), { waitUntil:'networkidle0' });
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(2500);
const ng=[]; const ck=(o,n,x)=>{console.log(`  ${o?'✅':'🔴'} ${n}${x?'  '+x:''}`); if(!o)ng.push(n);};
const st = await p.evaluate(() => {
  const r = document.getElementById('r_bsize');
  const cs = getComputedStyle(r);
  const bs = getComputedStyle(document.body);
  const pn = document.getElementById('panel'), ps = getComputedStyle(pn);
  return { touchAction:cs.touchAction, bodyOverflowX:bs.overflowX,
           パネルのoverflowX:ps.overflowX, パネルの横はみ出し:pn.scrollWidth - pn.clientWidth,
           横にはみ出し:document.documentElement.scrollWidth - document.documentElement.clientWidth,
           スクロール位置:window.scrollX };
});
console.log('  ', JSON.stringify(st));
ck(st.touchAction === 'pan-y', 'スライダーは pan-y（縦スクロールは通す・横は取る）', st.touchAction);
ck(st.横にはみ出し <= 0, '画面が横にはみ出していない', String(st.横にはみ出し));
ck(st.パネルの横はみ出し <= 0, '⭐パネルが横にはみ出していない（ここがズレの元）', String(st.パネルの横はみ出し));
ck(st.パネルのoverflowX === 'hidden', 'パネルは横に動かない', st.パネルのoverflowX);
/* 指でスライダーを横に引いて、画面がずれないか */
const before = await p.evaluate(() => ({ x:window.scrollX, v:+document.getElementById('r_bsize').value }));
const box = await p.evaluate(() => { const r=document.getElementById('r_bsize').getBoundingClientRect();
  return { x:r.x + r.width*0.3, y:r.y + r.height/2, w:r.width }; });
await p.touchscreen.touchStart(box.x, box.y);
await p.touchscreen.touchMove(box.x + box.w*0.4, box.y);
await p.touchscreen.touchEnd();
await wait(800);
const after = await p.evaluate(() => ({ x:window.scrollX, v:+document.getElementById('r_bsize').value }));
ck(after.x === before.x, '⭐指で引いても画面が左右にずれない', `scrollX ${before.x} → ${after.x}`);
/* ⚠️ headless の合成タッチではスライダーの値が動かない＝ここでは測らない（実機で見る） */
ck(errs.length===0, 'JSエラーなし', errs.slice(0,2).join(' / '));
await b.close();
console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ モバイルは全部通った');
process.exit(ng.length ? 1 : 0);
