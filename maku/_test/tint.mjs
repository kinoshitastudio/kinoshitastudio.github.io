/* ⭐⭐ 画像の版（SVG）の【見え】── 2026-08-26
   木下＝「Maku は svg 入れたがこのとおり、見えも変更したが【画像で選択しているのに
   　　　　文字が変化しているね】」

   直したのは2つ：
     🔴 ①「見え」の段は body.img-mode で隠す作りだったが、そのクラスは誰も付けていない
        （版が入ったとき sheet-image に変わっていた）＝画像の版を選んでいても触れて、
        押すと【字の版】が変わっていた。
     ⭐ ② 白を抜くと黒い線だけが残る＝黒い地では見えない。【線の色】を足した。
     🔴 ③ 控え・⌘Z から戻すと【生の画像】を貼っていた＝白を抜くが外れて白い板が戻っていた。

   見るのは「落ちない」ではなく、**画面に出ているか・画素が変わるか**：
     ・画像の版を選んでいる間、見えの段は【出ていない】／字の版に戻すと【出る】
     ・線の色を塗ると、その色の画素が【増える】（0 → たくさん）
     ・控えの往復で「白を抜く／線の色」が残る
   ⚠️ 直す前の版には #tint が無いので落ちる。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const SVG  = path.join(ROOT, 'hori2', '_test', 'sample_sakuji.svg');
const FILE = process.argv[2] || path.join(ROOT, 'maku', 'index.html');
if(!fs.existsSync(SVG)){ console.log('🔴 見本の SVG が無い:', SVG); process.exit(1); }

const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); let err = 0;
p.on('pageerror', e => { err++; console.log('🔴 JSエラー:', e.message); });
await p.setViewport({ width:1200, height:900, deviceScaleFactor:1 });
await p.goto('file://' + decodeURIComponent(FILE), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 4000));

const has = id => p.evaluate(i => !!document.getElementById(i), id);
if(!(await has('tint'))){ console.log('── 画像の版の見え'); console.log('  🔴 線の色（#tint）が無い'); await b.close(); process.exit(1); }

/* SVG を入れる（画像の版が増える） */
const input = await p.$('#imgFile');
await input.uploadFile(SVG);
await new Promise(r => setTimeout(r, 2500));

/* 赤い画素の数＝線に色が乗ったかを【画素で】見る */
const redCount = () => p.evaluate(() => {
  const cv = document.querySelector('canvas');
  const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
  c.getContext('2d').drawImage(cv, 0, 0);
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for(let i = 0; i < d.length; i += 4)
    if(d[i] > 170 && d[i+1] < 90 && d[i+2] < 90 && d[i+3] > 40) n++;
  return n;
});

const R = { };
R.画像の版になった = await p.evaluate(() => document.body.classList.contains('sheet-image'));
R.見えは出ていない = await p.evaluate(() =>
  [...document.querySelectorAll('.only-text')].every(e => getComputedStyle(e).display === 'none'));
R.理由が出ている = await p.evaluate(() =>
  [...document.querySelectorAll('.sheet-image-only')].some(e => getComputedStyle(e).display !== 'none'));
R.白を抜いている = await p.evaluate(() => (S_() || {}).knock || 0);
R.塗る前の赤 = await redCount();

/* 線の色を赤にする（⭐ 塗る強さ 0 のままでも押して何も起きない、にはしない） */
await p.evaluate(() => { const c = document.getElementById('tintC');
  c.value = '#ff0000'; c.dispatchEvent(new Event('input', { bubbles:true })); });
await new Promise(r => setTimeout(r, 1200));
R.塗ったあとの赤 = await redCount();
R.塗る強さ = await p.evaluate(() => (S_() || {}).tint || 0);

/* 控えの往復（白を抜く・線の色が残るか）＝⌘Z と同じ道を通す */
R.往復 = await p.evaluate(async () => {
  const o = JSON.parse(JSON.stringify(stateToJSON(true)));
  await new Promise(r => applyState(o, r));
  await new Promise(r => setTimeout(r, 900));
  const s = S_();
  return { knock:s.knock, tint:s.tint, tintc:s.tintc, kind:s.kind };
});
R.往復のあとの赤 = await redCount();

/* 字の版に戻すと、見えの段は出る */
R.字に戻すと出る = await p.evaluate(async () => {
  const i = SHEETS.findIndex(s => s.kind === 'text');
  if(i < 0) return 'text 版が無い';
  curSheet = i; refreshSheets();
  await new Promise(r => setTimeout(r, 400));
  return [...document.querySelectorAll('.only-text')].some(e => getComputedStyle(e).display !== 'none');
});
if(process.argv[3]) await p.screenshot({ path: process.argv[3] });
await b.close();

let ng = 0;
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng++; };
console.log('── 画像の版の見え（SVG を入れたとき）');
ok(err === 0, 'JSエラーが出ない', err + '件');
ok(R.画像の版になった, 'SVG を入れると【画像の版】が選ばれる');
ok(R.白を抜いている >= 50, '⭐ SVG は白を抜いた状態から始まる', '白を抜く ' + R.白を抜いている);
ok(R.見えは出ていない, '🔴 画像の版を選んでいる間、見え（字の段）は出ていない');
ok(R.理由が出ている, '⭐ なぜ空なのかが画面に出ている（黙って消さない）');
ok(R.塗る前の赤 < 200, '塗る前は赤い画素がほぼ無い', String(R.塗る前の赤));
ok(R.塗ったあとの赤 > R.塗る前の赤 + 500, '⭐ 線の色を塗ると【画素が】赤くなる',
   `${R.塗る前の赤} → ${R.塗ったあとの赤}`);
ok(R.塗る強さ === 100, '⚠️ 色だけ選んでも効く（塗る強さ 0 のまま放置しない）', String(R.塗る強さ));
ok(R.往復.knock >= 50 && R.往復.tint === 100 && R.往復.tintc === '#ff0000',
   '🔴 控えの往復で【白を抜く・線の色】が残る', JSON.stringify(R.往復));
ok(R.往復のあとの赤 > R.塗る前の赤 + 500, '⭐ 往復のあとも赤いまま（絵が戻っている）',
   String(R.往復のあとの赤));
ok(R.字に戻すと出る === true, '⭐ 字の版に戻すと、見えの段は出る');
process.exit(ng ? 1 : 0);
