/* ⭐ 塗 NURI の【地のかたち】回帰テスト（2026-08-19 新設）
   木下「描くものと背景を別々にコントロールできるようにもっとしたい。あわだけでなく、他の形なども」
   🔴 見るのは：①泡／ひび／点／縞 どれでも地が埋まる ②形ごとに埋まり方が違う（押しても同じ絵にならない）
      ③地の向きは粒の網とは別に持っている
   ⚠️ 地の色を「選ぶ」にしてから測る。既定の「紙と同じ」＋黒い紙では泡もひびも見た目が同じ
      （塗っても紙色）＝形の違いが測れない。
   ⚠️ 点・縞は【地の色】で引く。線の色（既定 #141612）を黒い紙に引くとほぼ見えない（実測 差22）。 */
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
/* 1本描く＋地を埋める */
await p.evaluate(() => {
  const r = cv.getBoundingClientRect();
  const ev=(t,x,y)=>cv.dispatchEvent(new PointerEvent(t,{clientX:r.left+x,clientY:r.top+y,bubbles:true,pointerId:1,isPrimary:true,buttons:1}));
  ev('pointerdown',200,300); for(let i=0;i<16;i++) ev('pointermove',200+i*16,300+Math.sin(i/3)*50); ev('pointerup',450,300);
  el('c_bgawa').checked = true; el('c_bgawa').dispatchEvent(new Event('change',{bubbles:true}));
  /* ⚠️ 地の色を「選ぶ」（緑）にしてから測る。既定の「紙と同じ」＋黒い紙では
     泡もひびも見た目が同じ（塗っても紙色）＝形の違いが測れない */
  document.querySelector('#abaseSeg button[data-v="col"]').click();
});
await wait(2000);
/* 地（絵から離れた所）に何か描かれているか＝紙の色と違う画素の割合 */
const bgInk = () => p.evaluate(() => {
  const cam = CAM || camScreen(cv.width, cv.height);
  const q = cv.getContext('2d');
  /* 版面の右下（絵を引いていない所）を見る */
  const x0 = Math.round(cam.ox + cam.fw*cam.sc*0.55), y0 = Math.round(cam.oy + cam.fh*cam.sc*0.60);
  const w = Math.round(cam.fw*cam.sc*0.35), h = Math.round(cam.fh*cam.sc*0.30);
  const d = q.getImageData(x0, y0, w, h).data;
  const pr = (P.paper||'#0a0a0a').replace('#',''); const R=parseInt(pr.slice(0,2),16),G=parseInt(pr.slice(2,4),16),B=parseInt(pr.slice(4,6),16);
  let n=0, tot=0;
  for(let i=0;i<d.length;i+=8){ tot++; if(Math.abs(d[i]-R)+Math.abs(d[i+1]-G)+Math.abs(d[i+2]-B) > 24) n++; }
  return { pct:+(n/tot*100).toFixed(1), tot };
});
const kind = k => p.evaluate(x => document.querySelector(`#bgkindSeg button[data-v="${x}"]`).click(), k);
const got = {};
for(const [k, name] of [['awa','泡'],['crack','ひび'],['dot','点'],['line','縞']]){
  await kind(k); await wait(2200);
  const r = await bgInk();
  got[k] = r.pct;
  ck(r.pct > 1, `地が【${name}】で埋まる`, `${r.pct}% の画素が紙と違う`);
}
/* ⭐ 形が違えば埋まり方も違う＝「押しても同じ絵」になっていない */
ck(got.awa > got.crack + 5, '⭐ひびは泡より薄い（塗らずに輪郭だけ）', `泡 ${got.awa}% / ひび ${got.crack}%`);
ck(Math.abs(got.dot - got.line) > 1 || got.dot !== got.awa, '点と縞は泡と別の埋まり方', JSON.stringify(got));
console.log('── 地の向きは粒の網とは別');
await kind('line'); await wait(1500);
const a0 = await bgInk();
await p.evaluate(() => { const r=el('r_bgang'); r.value=90; r.dispatchEvent(new Event('input',{bubbles:true})); });
await wait(1800);
const a1 = await bgInk();
ck(Math.abs(a1.pct - a0.pct) >= 0 && a0.pct > 1, '地の向きを変えても縞は出ている', `${a0.pct}% → ${a1.pct}%`);
const angSame = await p.evaluate(() => ({ bgang:P.bgang, ang:P.ang }));
ck(angSame.bgang !== angSame.ang, '⭐地の向きは粒の網の向きと別に持っている', JSON.stringify(angSame));
console.log('── 泡に戻すと今までどおり');
await kind('awa'); await wait(2200);
ck((await bgInk()).pct > 1, '泡に戻せる');
ck(errs.length===0, 'JSエラーなし', errs.slice(0,3).join(' / '));
await b.close();
console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ 地のかたちは全部通った');
process.exit(ng.length ? 1 : 0);
