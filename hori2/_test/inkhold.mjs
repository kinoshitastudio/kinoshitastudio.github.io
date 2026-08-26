/* ⭐⭐ 地の色を変えてもオブジェクトの色が動かない（2026-08-26）
   木下＝「地の色を変えるとオブジェクト自体も変わってしまう」

   🔴 正体＝いちばん下が mix(地, 字, インク量) なので、インク量が 1 未満の所は【地が透ける】。
   ⭐ 直し＝〔地から離す HOLD〕を上げると、絵のある所だけ下に敷く色を【字の色】に差し替える。

   見るのは：
     ① 離す 0＝いままでどおり（地を変えると絵も動く）＝直したことで今までの絵が変わっていない
     ② 離す100＋【手で決める】＝地を黒・ベージュ・青にしても絵の色が1も動かない
   ⚠️ 直す前の版には inkHold が無いので、この試験は落ちる。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || path.join(HERE, '..', 'index.html');
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); let err = 0;
p.on('pageerror', e => { err++; console.log('🔴 JSエラー:', e.message); });
await p.setViewport({ width:1200, height:800, deviceScaleFactor:1 });
await p.goto('file://' + decodeURIComponent(FILE), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3500));

const R = await p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const cv0 = [...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0];
  /* ⚠️ 時間で動くものを止める＝測りたいものだけが動く状態を先に作る */
  for(const k of ['tape','bleed']){ const u = document.querySelector(`[data-unit="${k}"]`);
    if(u && !u.classList.contains('off')) u.querySelector('.unit-head').click(); }
  await wait(400);
  const t = document.getElementById('typeText'); if(t) t.value = '彫';
  document.getElementById('btn-type').click();
  await wait(1800);
  /* 四隅の色＝地。地と違う画素を「絵」とみなして平均を取る */
  const stat = () => {
    const c = document.createElement('canvas'); c.width = cv0.width; c.height = cv0.height;
    c.getContext('2d').drawImage(cv0, 0, 0);
    const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    const bg = [d[0], d[1], d[2]];
    let r=0,g=0,bb=0,n=0;
    for(let i=0;i<d.length;i+=4*11){
      if(Math.abs(d[i]-bg[0])+Math.abs(d[i+1]-bg[1])+Math.abs(d[i+2]-bg[2]) > 40){
        r+=d[i]; g+=d[i+1]; bb+=d[i+2]; n++; }
    }
    return n ? [Math.round(r/n), Math.round(g/n), Math.round(bb/n)] : null;
  };
  const setBg = hex => { const c = document.getElementById('toneBgC') || document.querySelector('#rack input[type=color]');
    c.value = hex; c.dispatchEvent(new Event('input', { bubbles:true })); };
  const knob = (k, v) => { const r = document.querySelector('[data-p="'+k+'"]');
    if(r){ r.value = v; r.dispatchEvent(new Event('input', { bubbles:true })); } };
  const out = {};
  /* ① 離す 0（既定）＝いままでどおり */
  setBg('#101010'); await wait(1000); const a1 = stat();
  setBg('#1030f0'); await wait(1000); const a2 = stat();
  out.既定 = { 黒:a1, 青:a2 };
  /* ② INK を点け、手で決める＋離す100 */
  const ink = document.querySelector('[data-unit="ink"]');
  if(ink && ink.classList.contains('off')) ink.querySelector('.unit-head').click();
  await wait(800);
  const man = document.querySelector('.seg[data-seg="inkAuto"] button[data-v="0"]'); if(man) man.click();
  knob('inkSat', 70); knob('inkVal', 80); knob('inkHold', 100);
  await wait(1200);
  setBg('#101010');  await wait(1000); const b1 = stat();
  setBg('#f0e8d0');  await wait(1000); const b2 = stat();
  setBg('#1030f0');  await wait(1000); const b3 = stat();
  out.離す100 = { 黒:b1, ベージュ:b2, 青:b3 };
  return out;
});
await b.close();
let ng = 0;
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng++; };
const dist = (a,b) => (!a||!b) ? 999 : Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]);
console.log('── 地の色を変えてもオブジェクトが動かない');
ok(err === 0, 'JSエラーが出ない', err + '件');
const d0 = dist(R.既定.黒, R.既定.青);
ok(d0 > 60, '（前提）離す 0 では今までどおり地に引っぱられる',
   `黒 ${R.既定.黒} ／ 青 ${R.既定.青}  ちがい ${d0}`);
const d1 = dist(R.離す100.黒, R.離す100.青), d2 = dist(R.離す100.黒, R.離す100.ベージュ);
ok(d1 <= 6 && d2 <= 6, '離す100＋手で決める＝地を変えても絵の色が動かない',
   `黒 ${R.離す100.黒} ／ ベージュ ${R.離す100.ベージュ} ／ 青 ${R.離す100.青}  ちがい ${d2}/${d1}`);
process.exit(ng ? 1 : 0);
