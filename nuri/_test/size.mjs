/* ⭐ 塗 NURI の【出す大きさ・粗い刷りのずれ】回帰テスト（2026-08-19 新設）
   木下「出す大きさをいじるとオブジェクトが破綻する」
        「スライダーを調整するたびになぜかボードが右下にかたっとなる」
   🔴 ①出す大きさを変えても【場を作り直さない】＝塗った絵が消えない
      （fieldSize の min(1,…) のせいで長辺を下げると場が変わり、絵が丸ごと消えていた）
      ②粗い刷りと本番で【絵の位置が1画素も違わない】
      （camScreen(dw,dh) は寄り・パン VIEW.x/y が縮まないので、引き伸ばすと右下にずれた） */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL0 = process.argv[2] || 'http://localhost:8092/nuri/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
const errs=[]; p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1400, height:1000, deviceScaleFactor:1 });
await p.goto(URL0, { waitUntil:'networkidle0' });
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(2500);
const ng=[]; const ck=(o,n,x)=>{console.log(`  ${o?'✅':'🔴'} ${n}${x?'  '+x:''}`); if(!o)ng.push(n);};
const ink = () => p.evaluate(() => { let s=0; for(const L of LAY) for(let i=0;i<L.A.length;i++) s+=L.A[i]; return Math.round(s); });
/* 1本描く */
await p.evaluate(() => {
  const rc = cv.getBoundingClientRect();
  const ev=(t,x,y)=>cv.dispatchEvent(new PointerEvent(t,{clientX:rc.left+x,clientY:rc.top+y,bubbles:true,pointerId:1,isPrimary:true,buttons:1}));
  ev('pointerdown',300,300); for(let i=0;i<18;i++) ev('pointermove',300+i*14,300+Math.sin(i/3)*50); ev('pointerup',560,300);
});
await wait(2000);
const i0 = await ink(), f0 = await p.evaluate(() => [FW, FH]);
console.log('── ① 出す大きさを変えても絵が消えない');
for(const v of [2740, 600, 4096, 1000]){
  await p.evaluate(x => { const r=el('r_long'); r.value=x; r.dispatchEvent(new Event('input',{bubbles:true})); }, v);
  await wait(900);
  const i1 = await ink(), f1 = await p.evaluate(() => [FW, FH]);
  ck(i1 === i0, `長辺 ${v}px で絵が残る`, `塗った量 ${i0} → ${i1}／場 ${f1}`);
}
console.log('── ② 粗い刷りでも絵がずれない（寄り・パンあり）');
const shift = await p.evaluate(async () => {
  VIEW.zoom = 1.6; VIEW.x = 90; VIEW.y = -60;
  DRAFT = 0; BUBSAVE=null; BLURHOLD=null; kick();
  await new Promise(r=>requestAnimationFrame(r)); await new Promise(r=>setTimeout(r,600));
  const grab = () => { const q=cv.getContext('2d'); const d=q.getImageData(0,0,cv.width,cv.height).data;
    let x0=1e9,y0=1e9,x1=-1,y1=-1;
    for(let y=0;y<cv.height;y+=3) for(let x=0;x<cv.width;x+=3){ const i=(y*cv.width+x)*4;
      if(d[i]+d[i+1]+d[i+2]>90){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
    return [x0,y0,x1,y1]; };
  const honban = grab();
  DRAFT = 1; kick();
  await new Promise(r=>requestAnimationFrame(r)); await new Promise(r=>setTimeout(r,600));
  const arai = grab();
  DRAFT = 0; BUBSAVE=null; BLURHOLD=null; kick();
  return { honban, arai };
});
const d = shift.honban.map((v,i)=>Math.abs(v-shift.arai[i]));
ck(Math.max(...d) <= 6, '⭐粗い刷りと本番で絵の位置が同じ（ずれない）', `ずれ ${d} px`);
ck(errs.length===0, 'JSエラーなし', errs.slice(0,3).join(' / '));
await b.close();
console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ 出す大きさ・ずれは全部通った');
process.exit(ng.length ? 1 : 0);
