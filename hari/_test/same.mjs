/* ⭐⭐ 「見え方を変えていない」を【画素で】示す（型＝feedback_prove_no_change_by_pixels）
   使い方： node hari/_test/same.mjs <前の版.html> [いまの版.html]

   ⭐ 直す前の版と、直したあとの版を2つ立てて、版面の絵をそのまま突き合わせる。
     「テストが通った」は答えではない ── 木下が見るのは絵なので、絵で示す。
   ⚠️ 比べるのは【立ち上がったままの姿】＝既定の作品。ここが1画素でも動いていたら、
     足した物が「何もしないはずの場面」で効いてしまっている。
   ⚠️ 紙の質感は種で振れるので、既定（なし）のまま比べる。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OLD = process.argv[2];
const NEW = process.argv[3] || path.join(HERE, '..', 'index.html');
if(!OLD){ console.log('  🔴 前の版を渡す： node hari/_test/same.mjs <前の版.html>'); process.exit(1); }

const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files'] });

async function shot(file, act){
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
  await p.goto('file://' + decodeURIComponent(path.resolve(file)), { waitUntil:'networkidle0' });
  await new Promise(r => setTimeout(r, 3800));
  if(act) await p.evaluate(act);
  const d = await p.evaluate(() => {
    const cv = document.querySelector('canvas');
    const c = document.createElement('canvas'); c.width = 420; c.height = 420;
    c.getContext('2d').drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, 420, 420);
    return [...c.getContext('2d').getImageData(0,0,420,420).data];
  });
  await p.close();
  return { d, errs };
}
const diff = (a, c) => { let n = 0;
  for(let i=0;i<a.length;i+=4){
    if(Math.abs(a[i]-c[i]) + Math.abs(a[i+1]-c[i+1]) + Math.abs(a[i+2]-c[i+2]) > 6) n++;
  }
  return n; };

let ng = 0;
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng++; };
console.log('── ⭐ 直す前と1画素も変わっていないか（表の面）');

const A = await shot(OLD);
const B = await shot(NEW);
ok(B.errs.length === 0, 'いまの版で例外が出ていない', B.errs.length + '件' + (B.errs[0] ? ' ' + B.errs[0] : ''));
const d0 = diff(A.d, B.d);
ok(d0 === 0, '⭐⭐ 立ち上がったままの絵が【1画素も】変わっていない', d0 + '画素');

/* ⚠️ 検算 ── この物差しが本当に絵を見ているか（見ていなければ、上の 0 に意味がない） */
const C = await shot(NEW, () => { S.lines[0].size = (S.lines[0].size || 46) * 1.6; render(); });
const d1 = diff(B.d, C.d);
ok(d1 > 200, '⚠️ 検算：字を大きくすれば絵は変わる（画素を実際に見ている）', d1 + '画素');

/* ⭐ 裏返すと絵が変わる（＝足した物はちゃんと効いている） */
const D = await shot(NEW, () => { if(typeof setFace === 'function') setFace(1); });
const d2 = diff(B.d, D.d);
ok(d2 > 200, '⭐ 裏返せば絵が変わる（足した物は効いている）', d2 + '画素');

await b.close();
process.exit(ng ? 1 : 0);
