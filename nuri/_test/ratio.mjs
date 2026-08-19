/* ⭐ 塗 NURI の【版面の比を変えても絵が消えない】回帰テスト（2026-08-19 新設）
   🔴 木下「サイズを変えるとさっきまであったオブジェクトがどこかに消えた」
      版面の比を変えると場の形が変わり、newField が作り直して絵が丸ごと消えていた
      （実測：塗った量 22948 → 0）。
   ⭐ 新しい場へ【中央合わせで写す】＝引き伸ばさない（形が歪まない）。
   ⚠️ 狭くなる比では、はみ出した分は切れる＝そこは正直に言う（stat に出す）。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL0 = process.argv[2] || 'http://localhost:8092/nuri/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
const errs=[]; p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1200, height:1000, deviceScaleFactor:1 });
await p.goto(URL0 + '?v='+Date.now(), { waitUntil:'networkidle0' });
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(2500);
const ng=[]; const ck=(o,n,x)=>{console.log(`  ${o?'✅':'🔴'} ${n}${x?'  '+x:''}`); if(!o)ng.push(n);};
const ink = () => p.evaluate(() => { let s=0; for(const L of LAY) for(let i=0;i<L.A.length;i++) s+=L.A[i]; return Math.round(s); });
await p.evaluate(() => {
  const rc = cv.getBoundingClientRect();
  const ev=(t,x,y)=>cv.dispatchEvent(new PointerEvent(t,{clientX:rc.left+x,clientY:rc.top+y,bubbles:true,pointerId:1,isPrimary:true,buttons:1}));
  ev('pointerdown',540,400); for(let i=0;i<16;i++) ev('pointermove',540+Math.sin(i/3)*60,400+i*14); ev('pointerup',540,620);
});
await wait(2000);
const i0 = await ink(), f0 = await p.evaluate(()=>[FW,FH]);
console.log('  はじめ（9:16）:', i0, f0);
for(const r of ['1:1','16:9','4:5','9:16']){
  await p.evaluate(x => document.querySelector(`#ratioSeg button[data-v="${x}"]`).click(), r);
  await wait(1200);
  const i1 = await ink(), f1 = await p.evaluate(()=>[FW,FH]);
  ck(i1 > i0*0.35, `${r} にしても絵が残る`, `塗った量 ${i0} → ${i1}／場 ${f1}`);
}
const back = await ink();
ck(back > i0*0.35, '9:16 に戻しても残っている', `${i0} → ${back}`);
ck(errs.length===0, 'JSエラーなし', errs.slice(0,2).join(' / '));
await b.close();
console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ 版面の比を変えても絵は残る');
process.exit(ng.length ? 1 : 0);
