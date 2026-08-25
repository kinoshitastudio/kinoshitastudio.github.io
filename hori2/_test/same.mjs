/* ⭐ 直す前（HEAD）と後で【画面の見えが変わっていない】かを見る。
   ⚠️⚠️ この道具は滲みの蓄積で毎回わずかに絵が違う。
      だから「0画素でないと駄目」では判定にならない ──
      ⭐ 同じ版を2回撮って【揺らぎ】を先に測り、それより前後差が小さいかで見る。
   使い方： node _test/same.mjs <直す前のファイル> [直した後のファイル] */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const HEAD = process.argv[2];
const NOW  = process.argv[3] || new URL('../index.html', import.meta.url).pathname;
if(!HEAD){ console.log('使い方: node _test/same.mjs <直す前のファイル>'); process.exit(1); }

async function shots(file){
  const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless:'new', args:['--no-sandbox','--allow-file-access-from-files','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage(); let err = 0;
  p.on('pageerror', e => { err++; console.log('🔴 JSエラー:', e.message); });
  await p.setViewport({ width:1200, height:800, deviceScaleFactor:1 });
  await p.goto('file://' + decodeURIComponent(file), { waitUntil:'networkidle0' });
  await new Promise(r => setTimeout(r, 4500));
  const out = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    /* ⚠️ 手で引くと揺らぐので【字を置く】で毎回同じ形にする */
    const t = document.querySelector('[data-p="typeText"]') || document.querySelector('#typeText');
    const put = [...document.querySelectorAll('button')].find(x => /字を置く/.test(x.textContent));
    if(put){ if(t) t.value = '夏'; put.click(); await wait(1500); }
    const el = [...document.querySelectorAll('canvas')]
      .sort((a, b) => b.width * b.height - a.width * a.height)[0];
    const grab = () => {
      const c = document.createElement('canvas'); c.width = el.width; c.height = el.height;
      c.getContext('2d').drawImage(el, 0, 0);
      return c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    };
    const diff = (A, B) => { let n = 0; for(let i = 0; i < A.length; i += 4*5) if(Math.abs(A[i]-B[i]) > 8) n++; return n; };
    const a = grab(); await wait(700); const b2 = grab(); await wait(700); const c2 = grab();
    /* ⭐ 先頭だけ見ると弱い（絵は真ん中にある）。画面ぜんぶから等間隔に間引いて渡す。 */
    const thin = D => { const o = []; for(let i = 0; i < D.length; i += 4*7) o.push(D[i]); return o; };
    return { 揺らぎ:[diff(a,b2), diff(b2,c2)], 画素:c2.length, sig:thin(c2) };
  });
  await b.close();
  return { ...out, err };
}
const A = await shots(HEAD), B = await shots(NOW);
const d = (X, Y) => { let n = 0; for(let i = 0; i < Math.min(X.length, Y.length); i++) if(Math.abs(X[i]-Y[i]) > 8) n++; return n; };
const yure = Math.max(...A.揺らぎ, ...B.揺らぎ);
const sa   = d(A.sig, B.sig);
console.log('── 直す前と後（画面の見え）');
console.log(`  同じ版を2回撮ったときの揺らぎ  直す前 ${A.揺らぎ.join(' / ')}  直した後 ${B.揺らぎ.join(' / ')}`);
console.log(`  直す前と後のちがい  ${sa}（見た画素 ${A.sig.length}）`);
/* ⭐ 揺らぎより小さければ「変わっていない」。同じ版でもこれだけは揺れるという下限がある。 */
const ok = sa <= yure && A.err === 0 && B.err === 0;
console.log(ok ? `  ✅ 見えは変わっていない（ちがい ${sa} ≦ 揺らぎ ${yure}）`
               : `  🔴 変わったかもしれない（ちがい ${sa} > 揺らぎ ${yure}）`);
process.exit(ok ? 0 : 1);
