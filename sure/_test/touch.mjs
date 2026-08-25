/* 摩 SURE ── モバイルで盤を描いたときに【ページ／パネルが動かない】かを実測する
   使い方： node sure-touch.mjs [url]   （既定＝ローカルのファイル） */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const URL = process.argv[2] ||
  'file:///Users/kinoshitatakahiro/Desktop/GitHub-clone/%E5%90%8D%E7%A7%B0%E6%9C%AA%E8%A8%AD%E5%AE%9A/sure/index.html';
const L=[]; const ok=(n,c,d)=>L.push((c?'OK  ':'NG  ')+n+(d!=null?'   ['+d+']':''));

const b = await puppeteer.launch({
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox'] });
const p = await b.newPage();
/* iPhone くらいの窓＋指の端末として開く */
await p.emulate({ viewport:{ width:390, height:844, isMobile:true, hasTouch:true, deviceScaleFactor:2 },
  userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' });
await p.goto(URL, { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,800));

const info = await p.evaluate(()=>{
  const st=document.getElementById('stage'), pa=document.getElementById('panel');
  return { stageTouch:getComputedStyle(st).touchAction,
           bodyOv:getComputedStyle(document.body).overflowY,
           panelOv:getComputedStyle(pa).overflowY,
           panelChain:getComputedStyle(pa).overscrollBehaviorY,
           scrollH:document.scrollingElement.scrollHeight,
           clientH:document.scrollingElement.clientHeight };
});
ok('盤は指の動きを全部受け取る（touch-action:none）', info.stageTouch==='none', info.stageTouch);
ok('ページ自体は巻かない', info.bodyOv==='hidden', info.bodyOv);
ok('パネルは内側で巻く', info.panelOv==='auto'||info.panelOv==='scroll', info.panelOv);
ok('パネルの端で親へ渡さない', info.panelChain==='contain', info.panelChain);
ok('ページに巻く余地が無い', info.scrollH<=info.clientH+1, info.scrollH+' / '+info.clientH);

/* 指で盤をなぞる＝ページとパネルが動かないか／ちゃんと描けるか */
/* 盤の絵の指紋（触って絵が変わったか＝指が盤に届いているか） */
const ink = ()=>p.evaluate(()=>{
  const c=document.getElementById('cv'), g=c.getContext('2d');
  const d=g.getImageData(0,0,c.width,c.height).data;
  let h=2166136261; for(let i=0;i<d.length;i+=4){ h^=d[i]; h=Math.imul(h,16777619); }
  return (h>>>0).toString(16); });
const inkBefore = await ink();
const before = await p.evaluate(()=>({
  y: document.scrollingElement.scrollTop,
  panelTop: document.getElementById('panel').getBoundingClientRect().top }));
const box = await p.evaluate(()=>{ const r=document.getElementById('stage').getBoundingClientRect();
  return {x:r.x,y:r.y,w:r.width,h:r.height}; });
const cx = box.x + box.w*0.5, cy = box.y + box.h*0.5;
await p.touchscreen.touchStart(cx-60, cy-40);
for(let i=1;i<=8;i++) await p.touchscreen.touchMove(cx-60+i*14, cy-40+i*9);
await p.touchscreen.touchEnd();
await new Promise(r=>setTimeout(r,400));
const after = await p.evaluate(()=>({
  y: document.scrollingElement.scrollTop,
  panelTop: document.getElementById('panel').getBoundingClientRect().top }));
ok('なぞってもページが動かない', after.y===before.y, before.y+' → '+after.y);
ok('なぞってもパネルが動かない', Math.abs(after.panelTop-before.panelTop)<0.5,
   before.panelTop.toFixed(1)+' → '+after.panelTop.toFixed(1));

/* ⭐ 指を全部受け取るようにして【描けなくなっていない】か＝盤の画素を前後で比べる
   ⚠️ 「暗い画素がある」だけでは地の質感で必ず通る＝なぞる前と比べる */
const inkAfter = await ink();
ok('指の動きが盤に届いている（絵が変わる）', inkAfter !== inkBefore, inkBefore+' → '+inkAfter);

console.log(L.join('\n'));
await b.close();
process.exit(/^NG/m.test(L.join('\n')) ? 1 : 0);
