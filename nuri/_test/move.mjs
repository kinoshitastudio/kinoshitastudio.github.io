/* ⭐ 塗 NURI の【流す・動画】の回帰テスト（2026-08-19 新設）
   木下「うごきがほしい、再生ボタンなどで」「当然のごとく書き出しサイズ選択や動画書き出しも」
   🔴 見るのは：①再生で位相が進む ②再生中は粗く刷っている（軽い）③止めると本番に戻る
      ④位相を1周ぶん戻すと【1画素も同じ絵に戻る】＝継ぎ目のないループ ⑤動画が版面の形で出る
   ⚠️ 位相は必ず 0 に戻してから基準を測る（再生で進んだままだと基準にならない＝1回誤検出した）
   ⚠️ 焼くのは本番の道（render）＝粗い刷りは通らない。 */
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
await p.evaluate(() => { window.__got=[]; const oc=URL.createObjectURL;
  URL.createObjectURL=function(x){ if(x instanceof Blob) window.__got.push(x); return oc.call(URL,x); }; });
/* 1本描く */
await p.evaluate(() => {
  const r = cv.getBoundingClientRect();
  const ev=(t,x,y)=>cv.dispatchEvent(new PointerEvent(t,{clientX:r.left+x,clientY:r.top+y,bubbles:true,pointerId:1,isPrimary:true,buttons:1}));
  ev('pointerdown',200,300); for(let i=0;i<18;i++) ev('pointermove',200+i*16,300+Math.sin(i/3)*60); ev('pointerup',480,300);
});
await wait(1800);
ck(errs.length===0, '描いてもJSエラーなし', errs.slice(0,2).join(' / '));

console.log('── 引いている間は粗く刷る（軽い操作性）');
const dr = await p.evaluate(() => {
  const rc = cv.getBoundingClientRect();
  const ev=(t,x,y)=>cv.dispatchEvent(new PointerEvent(t,{clientX:rc.left+x,clientY:rc.top+y,bubbles:true,pointerId:1,isPrimary:true,buttons:1}));
  ev('pointerdown',300,500);
  const on = DRAFT;
  ev('pointermove',340,500);
  ev('pointerup',340,500);
  return { 引いている間:on, 離したあと:DRAFT, 泡の控え:BUBSAVE, にじみの控え:BLURHOLD };
});
ck(dr.引いている間 === 1, '⭐引いている間は粗く刷っている（実測 227ms→23ms）', JSON.stringify({on:dr.引いている間}));
ck(dr.離したあと === 0 && dr.泡の控え === null && dr.にじみの控え === null,
   '⭐手を離したら控えを捨てて本番に戻る', JSON.stringify({off:dr.離したあと}));
await wait(1200);

console.log('── 流す（再生）');
const ph0 = await p.evaluate(() => FLOWPH);
await p.evaluate(() => el('b_play').click());
await wait(1500);
const st = await p.evaluate(() => ({ ph:FLOWPH, play:PLAY, draft:DRAFT, label:el('b_play').textContent }));
ck(st.play===1 && st.ph!==ph0, '再生すると位相が進む', JSON.stringify(st));
ck(st.draft===1, '再生中は粗く刷っている（軽い）');
await p.evaluate(() => el('b_play').click());
await wait(900);
const st2 = await p.evaluate(() => ({ play:PLAY, draft:DRAFT, label:el('b_play').textContent }));
ck(st2.play===0 && st2.draft===0, '止めると本番に戻る', JSON.stringify(st2));

console.log('── 流すと絵が変わる（粒だけ・地は止まったまま）');
const shot = () => p.evaluate(() => { const c=document.createElement('canvas'); c.width=300; c.height=300;
  const q=c.getContext('2d'); q.drawImage(cv,0,0,300,300);
  const d=q.getImageData(0,0,300,300).data; let h=0; for(let i=0;i<d.length;i+=17) h=(h*31+d[i])>>>0; return h; });
/* ⚠️ 再生で位相が進んだままだと基準にならない＝必ず 0 に戻してから測る（1回これで誤検出した） */
await p.evaluate(() => { FLOWPH = 0; kick(); });
await wait(900);
const a0 = await shot();
await p.evaluate(() => { FLOWPH = 0.5; kick(); });
await wait(900);
const a1 = await shot();
ck(a0 !== a1, '位相を進めると絵が変わる', `${a0} → ${a1}`);
await p.evaluate(() => { FLOWPH = 0; kick(); });
await wait(900);
ck(await shot() === a0, '⭐位相を1周ぶん戻すと元の絵に戻る（ループが閉じる）');

console.log('── 動画（PNG連番で1本焼く）');
await p.evaluate(() => {
  document.querySelector('#mvFmt button[data-v="png"]').click();
  const r=el('r_long'); r.value=600; r.dispatchEvent(new Event('input',{bubbles:true}));
  const f=el('r_fps'); f.value=8; f.dispatchEvent(new Event('input',{bubbles:true}));
  const s2=el('r_flow'); s2.value=200; s2.dispatchEvent(new Event('input',{bubbles:true}));
});
await wait(1500);
console.log('  出る大きさ:', await p.evaluate(() => el('mvSize').textContent));
await p.evaluate(() => { window.__got.length=0; el('b_mv').click(); });
for(let i=0;i<80;i++){ await wait(1000);
  if(await p.evaluate(() => el('b_mv').textContent === '動画を出す' && !MV.on)) break; }
const zip = await p.evaluate(async () => {
  const z = window.__got.find(x => /zip/.test(x.type)); if(!z) return null;
  const u = new Uint8Array(await z.arrayBuffer());
  for(let i=0;i<u.length-16;i++) if(u[i]===73&&u[i+1]===72&&u[i+2]===68&&u[i+3]===82){
    const g2=o=>(u[i+4+o]<<24)|(u[i+5+o]<<16)|(u[i+6+o]<<8)|u[i+7+o];
    return { w:g2(0), h:g2(4), kb:Math.round(z.size/1024) }; }
  return { err:'zipの中にPNGが無い' };
});
ck(!!zip && !zip.err, '動画（PNG連番）が出る', JSON.stringify(zip));
ck(!!zip && zip.h > zip.w, 'コマが版面の形（9:16）', zip ? `${zip.w}×${zip.h}` : '-');
ck(errs.length===0, '最後までJSエラーなし', errs.slice(0,3).join(' / '));
await b.close();
console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ 流す・動画は全部通った');
process.exit(ng.length ? 1 : 0);
