/* ⭐ 直す前と後で【画面の見えが変わっていない】か（共通）。
   ⚠️ 滲みの蓄積で毎回わずかに違う道具があるので、同じ版を2回撮って【揺らぎ】を先に測り、
      それより前後差が小さいかで見る。
   使い方： node _test/same_screen.mjs <道具名> <直す前のファイル> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const tool = process.argv[2], HEAD = process.argv[3];
if(!tool || !HEAD){ console.log('使い方: node _test/same_screen.mjs <道具名> <直す前のファイル>'); process.exit(1); }
const NOW = path.join(ROOT, tool, 'index.html');

async function shots(file){
  const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless:'new', args:['--no-sandbox','--allow-file-access-from-files','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage(); let err = 0;
  p.on('pageerror', e => { err++; console.log('🔴 JSエラー:', e.message); });
  await p.setViewport({ width:1200, height:800, deviceScaleFactor:1 });
  await p.goto('file://' + decodeURIComponent(file), { waitUntil:'networkidle0' });
  await new Promise(r => setTimeout(r, 4000));
  const out = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const el = [...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0];
    const grab = () => { const c=document.createElement('canvas'); c.width=el.width; c.height=el.height;
      c.getContext('2d').drawImage(el,0,0);
      return c.getContext('2d').getImageData(0,0,c.width,c.height).data; };
    const diff = (A,B)=>{let n=0;for(let i=0;i<A.length;i+=4*5) if(Math.abs(A[i]-B[i])>8) n++; return n;};
    const a=grab(); await wait(700); const b2=grab(); await wait(700); const c2=grab();
    const thin = D => { const o=[]; for(let i=0;i<D.length;i+=4*7) o.push(D[i]); return o; };
    return { 揺らぎ:[diff(a,b2), diff(b2,c2)], sig:thin(c2) };
  });
  await b.close();
  return { ...out, err };
}
const A = await shots(HEAD), B = await shots(NOW);
const d = (X,Y)=>{let n=0;for(let i=0;i<Math.min(X.length,Y.length);i++) if(Math.abs(X[i]-Y[i])>8) n++; return n;};
const yure = Math.max(...A.揺らぎ, ...B.揺らぎ);
const sa = d(A.sig, B.sig);
console.log(`── ${tool} の見え`);
console.log(`  同じ版を2回撮った揺らぎ  直す前 ${A.揺らぎ.join(' / ')}  直した後 ${B.揺らぎ.join(' / ')}`);
console.log(`  直す前と後のちがい  ${sa}（見た画素 ${A.sig.length}）`);
const ok = sa <= Math.max(yure, 20) && A.err === 0 && B.err === 0;
console.log(ok ? `  ✅ 見えは変わっていない（${sa} ≦ ${Math.max(yure,20)}）`
               : `  🔴 変わったかもしれない（${sa} > ${Math.max(yure,20)}）`);
process.exit(ok ? 0 : 1);
