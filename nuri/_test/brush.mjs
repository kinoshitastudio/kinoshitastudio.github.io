/* ⭐ 塗 NURI の【あとから筆を変える】回帰テスト（2026-08-19 新設）
   木下「一度書いてみないと太さがわからないのではなく、すでに書いているもの・
         自分が選んでいるものに対しては後からでもこの辺りは調整できるように。色も同じく」
   🔴 見るのは：①つまみを動かしただけでは絵は変わらない（誤爆しない）
      ②「この版を今の筆にする」で太くなる ③元に戻すと【元の面積に戻る】（往復できる）
      ④色は線ごとに保たれる＝1枚の中の塗り分けが消えない（この道具の芯）⑤⌘Zで戻せる */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL0 = process.argv[2] || 'http://localhost:8092/nuri/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
const errs=[]; p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1400, height:1000, deviceScaleFactor:1 });
await p.goto(URL0 + '?v=' + Date.now(), { waitUntil:'networkidle0' });
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(2500);
const ng=[]; const ck=(o,n,x)=>{console.log(`  ${o?'✅':'🔴'} ${n}${x?'  '+x:''}`); if(!o)ng.push(n);};
const set=(id,v)=>p.evaluate(o=>{const r=el(o.id);r.value=o.v;r.dispatchEvent(new Event('input',{bubbles:true}));},{id,v});
const draw = (y) => p.evaluate(yy => {
  const r = cv.getBoundingClientRect();
  const ev=(t,x,y2)=>cv.dispatchEvent(new PointerEvent(t,{clientX:r.left+x,clientY:r.top+y2,bubbles:true,pointerId:1,isPrimary:true,buttons:1}));
  ev('pointerdown',200,yy); for(let i=0;i<16;i++) ev('pointermove',200+i*16,yy); ev('pointerup',450,yy);
}, y);
/* 塗った面積（濃さの合計）＝太さの目安 */
const ink = () => p.evaluate(() => { const L=curLay(); let s=0; for(let i=0;i<L.A.length;i++) s+=L.A[i]; return Math.round(s); });

/* ⚠️ 2026-08-19 ──「動かしたらすぐ効かせる」が既定オンになった。
   このテストは【押したときだけ効く】側を見るので、まずチェックを外す。
   ⭐ すぐ効く側は live.mjs が見る（入口が2つ・中身は1つ）。 */
await p.evaluate(() => { const c = el('c_live'); if(c && c.checked){ c.checked = false; c.dispatchEvent(new Event('change', { bubbles:true })); } });
await wait(400);

console.log('── ① 細い筆で引く → 太い筆で引き直す');
await set('r_bsize', 20); await wait(400);
await draw(300); await wait(1200);
const i0 = await ink();
const n0 = await p.evaluate(() => (curLay().S||[]).length);
ck(n0 === 1, '引いた線が控えに1本入る', String(n0));
ck(i0 > 0, '塗った面積がある', String(i0));
await set('r_bsize', 90); await wait(400);
const iMid = await ink();
ck(iMid === i0, '⭐つまみを動かしただけでは絵は変わらない', `${i0} → ${iMid}`);
await p.evaluate(() => el('b_layBrush').click());
await wait(1500);
const i1 = await ink();
ck(i1 > i0 * 2, '⭐「この版を今の筆にする」で太くなる', `${i0} → ${i1}`);
console.log('  ' + await p.evaluate(() => (document.getElementById('stat')||document.querySelector('.stat')||{}).textContent || ''));

console.log('── ② 細く戻せる（往復できる）');
await set('r_bsize', 20); await wait(300);
await p.evaluate(() => el('b_layBrush').click());
await wait(1500);
const i2 = await ink();
ck(Math.abs(i2 - i0) < i0 * 0.02, '⭐元の太さに戻すと元の面積に戻る', `${i0} → ${i1} → ${i2}`);

console.log('── ③ 色は線ごとに保たれる（1枚の中の塗り分けが消えない）');
await p.evaluate(() => { const c=el('c_pick'); c.value='#ff0000'; c.dispatchEvent(new Event('input',{bubbles:true})); });
await wait(400);
await draw(500); await wait(1200);
const cols = () => p.evaluate(() => { const L=curLay(); let r=0,b2=0;
  for(let i=0;i<L.A.length;i++){ if(L.A[i]<0.2) continue; if(L.C.CR[i]>L.C.CB[i]+40) r++; if(L.C.CB[i]>L.C.CR[i]+40) b2++; }
  return { 赤:r, 青:b2 }; });
const c0 = await cols();
ck(c0.赤 > 100 && c0.青 > 100, '2色が載っている', JSON.stringify(c0));
await set('r_bsize', 60); await wait(300);
await p.evaluate(() => el('b_layBrush').click());
await wait(1500);
const c1 = await cols();
ck(c1.赤 > 100 && c1.青 > 100, '⭐引き直しても2色のまま', JSON.stringify(c1));

console.log('── ④ ⌘Z で戻せる');
const i3 = await ink();
await p.evaluate(() => el('b_undo').click());
await wait(1200);
const i4 = await ink();
ck(i4 !== i3, '戻すと引き直す前に戻る', `${i3} → ${i4}`);
ck(errs.length === 0, 'JSエラーなし', errs.slice(0,3).join(' / '));
await b.close();
console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ あとから筆を変えるは全部通った');
process.exit(ng.length ? 1 : 0);
