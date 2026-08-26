/* ⭐⭐ SVG を種にする（2026-08-26）
   木下＝「以前にSakujiで書き出ししたsvgデータをHori2に読み込ませるようなことができた。
   このようなことは今後道具の間でも必要だと感じている。Nijimiにもsvgを入れ込みすると
   それらが作品としてNijimiの中で浮かび上げることはできるか？」

   ⭐⭐ できた。新しい仕組みは1つも要らなかった＝この道具は【場を直に入れる道】
      (restoreField) を控えの読み書きでもう持っていた。SVG を白黒に焼いて種にするだけ。

   見るのは：
     ① SVG を置くと絵が変わる（種が入った）
     ② 置いた直後は【形がそのまま残っている】（種として立っている）
     ③ 育つ を入にすると滲みが効く（＝作品になっていく）
   ⚠️ この道具は preserveDrawingBuffer:false ＝画面からは読めない。PNG を出して比べる。
   ⚠️ 直す前の版には #f-svg が無いので落ちる。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SVG  = path.join(HERE, 'sample_sakuji.svg');
const FILE = process.argv[2] || path.join(HERE, '..', 'index.html');
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); let err = 0;
p.on('pageerror', e => { err++; console.log('🔴 JSエラー:', e.message); });
await p.setViewport({ width:1200, height:900, deviceScaleFactor:1 });
await p.goto('file://' + decodeURIComponent(FILE), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 4000));

let ng = [];
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng.push(name); };
if(!(await p.$('#f-svg'))){ console.log('  🔴 SVG を読む入口（#f-svg）が無い'); await b.close(); process.exit(1); }

await p.evaluate(() => { window.__grab = [];
  const o = URL.createObjectURL.bind(URL);
  URL.createObjectURL = bb => { window.__grab.push(bb); return o(bb); }; });
const shot = () => p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  window.__grab.length = 0;
  document.getElementById('b-export').click();
  for(let i=0;i<80 && !window.__grab.length;i++) await wait(200);
  const bb = window.__grab[window.__grab.length-1]; if(!bb) return null;
  const bmp = await createImageBitmap(bb);
  const c = document.createElement('canvas'); c.width=bmp.width; c.height=bmp.height;
  c.getContext('2d').drawImage(bmp,0,0);
  const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  const o=[]; let ink=0;
  for(let i=0;i<d.length;i+=4*23){ o.push(d[i]); if(d[i]>140) ink++; }
  return { sig:o, ink, n:o.length };
});
const diff=(A,B)=>{let n=0;for(let i=0;i<Math.min(A.length,B.length);i++) if(Math.abs(A[i]-B[i])>8) n++; return n;};

const a1 = await shot(); await new Promise(r=>setTimeout(r,1200)); const a2 = await shot();
const yure = diff(a1.sig, a2.sig);
await (await p.$('#f-svg')).uploadFile(SVG);
await new Promise(r => setTimeout(r, 3000));
const s1 = await shot();
ok(diff(a2.sig, s1.sig) > yure*3 + 500, 'SVG を置くと絵が変わる（種が入った）',
   `${diff(a2.sig,s1.sig)}画素（揺らぎ ${yure}）`);
ok(s1.ink / s1.n > 0.02 && s1.ink / s1.n < 0.6, '置いた直後は形がそのまま残っている（種として立つ）',
   `明るい所 ${(s1.ink/s1.n*100).toFixed(1)}%`);
await p.evaluate(() => { const b = document.querySelector('#seg-grow button[data-v="1"]'); if(b) b.click(); });
await new Promise(r => setTimeout(r, 6000));
const s2 = await shot();
ok(diff(s1.sig, s2.sig) > yure*3 + 500, '育つ を入にすると滲みが効く（作品になっていく）',
   `${diff(s1.sig,s2.sig)}画素`);
ok(err === 0, 'JSエラーが出ない', err + '件');
await b.close();
process.exit(ng.length ? 1 : 0);
