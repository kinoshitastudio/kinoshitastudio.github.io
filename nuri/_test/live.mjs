/* ⭐ 塗 NURI の【動かしたらすぐ効かせる】回帰テスト（2026-08-19 新設）
   木下「これを押さないといけないのは調整むずかしいな、リアルタイムで調整できないと」
   🔴 見るのは：①押さずに、つまみを動かすだけでもう描いた線が変わる
      ②チェックを外すと動かしても変わらない（次に引く線の太さだけ決めたいとき）
      ③外した状態でも、押せば効く（入口は2つ・中身は1つ） */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL0 = process.argv[2] || 'http://localhost:8092/nuri/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
const errs=[]; p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1300, height:1000, deviceScaleFactor:1 });
await p.goto(URL0, { waitUntil:'networkidle0' });
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(2500);
const ng=[]; const ck=(o,n,x)=>{console.log(`  ${o?'✅':'🔴'} ${n}${x?'  '+x:''}`); if(!o)ng.push(n);};
const ink = () => p.evaluate(() => { const L=curLay(); let s=0; for(let i=0;i<L.A.length;i++) s+=L.A[i]; return Math.round(s); });
await p.evaluate(() => {
  const setr=(id,v)=>{const r=el(id); r.value=v; r.dispatchEvent(new Event('input',{bubbles:true}));};
  setr('r_bsize', 30);
  const rc = cv.getBoundingClientRect();
  const ev=(t,x,y)=>cv.dispatchEvent(new PointerEvent(t,{clientX:rc.left+x,clientY:rc.top+y,bubbles:true,pointerId:1,isPrimary:true,buttons:1}));
  ev('pointerdown',250,300); for(let i=0;i<40;i++) ev('pointermove',250+i*9,300+Math.sin(i/5)*70); ev('pointerup',600,300);
});
await wait(2000);
const i0 = await ink();
console.log('── 動かしたらすぐ効く');
await p.evaluate(() => { const r=el('r_bsize'); r.value=110; r.dispatchEvent(new Event('input',{bubbles:true})); });
await wait(700);
const i1 = await ink();
ck(i1 > i0*2, '⭐押さずに、つまみを動かすだけで太くなる', `${i0} → ${i1}`);
/* 1コマの重さ（連続で動かす） */
const ms = await p.evaluate(async () => {
  const out=[]; const r=el('r_bsize');
  for(let v=110; v<=190; v+=16){
    const t0=performance.now();
    r.value=v; r.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(x=>requestAnimationFrame(x));
    out.push(Math.round(performance.now()-t0));
  }
  return out;
});
console.log('  つまみを動かす1コマ:', JSON.stringify(ms), 'ms（線1本・40点）');
console.log('── 切れば押したときだけ');
await p.evaluate(() => { const c=el('c_live'); c.checked=false; c.dispatchEvent(new Event('change',{bubbles:true})); });
const i2 = await ink();
await p.evaluate(() => { const r=el('r_bsize'); r.value=30; r.dispatchEvent(new Event('input',{bubbles:true})); });
await wait(700);
ck(await ink() === i2, 'チェックを外すと動かしても変わらない', `${i2}`);
await p.evaluate(() => el('b_brushNow').click());
await wait(900);
ck(await ink() < i2*0.6, '押せば効く', `${i2} → ${await ink()}`);
ck(errs.length===0, 'JSエラーなし', errs.slice(0,3).join(' / '));
await b.close();
console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ すぐ効かせるは全部通った');
process.exit(ng.length ? 1 : 0);
