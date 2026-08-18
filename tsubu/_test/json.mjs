/* 🔴 JSON が読めなくなった件の回帰テスト（2026-08-18 新設）
   木下「JSON読み込みできなくなったんだが」「書き出しもか」

   正体＝マス目を版ごとにしたとき、`pullFromLayer` が【版が持っていないキーまで P へ写して
   undefined にしていた】。古い JSON（版にマス目の設定が無い）を読むと P.masuN などが消え、
   色のランプが空配列になって draw が毎フレーム落ちた＝画面も書き出しも死んだ。

   🔴 見るのは：
     ① 版がマス目の設定を持っていない【古い形】の JSON を読んでも JSエラーが出ない
     ② 読んだあと PNG が出る（書き出しが生きている）
     ③ 出した JSON を読み直しても同じ（往復できる）
   ⚠️ 手持ちのファイルに頼らない＝古い形をこのテストの中で組み立てる。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL0 = process.argv[2] || 'http://localhost:8092/tsubu/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1200, height:900, deviceScaleFactor:1 });
await p.goto(URL0 + '?v=' + Date.now(), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 2200));
const wait = ms => new Promise(r => setTimeout(r, ms));
const ng = [];
const check = (ok, name, note) => { console.log(`  ${ok ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!ok) ng.push(name); };

await p.evaluate(() => { window.__got = [];
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(x){ if(x instanceof Blob) window.__got.push(x); return oc.call(URL, x); }; });

console.log('── ① 古い形の JSON（版がマス目の設定を持っていない）を読む');
const old = await p.evaluate(() => {
  /* いまの状態から【版のマス目のキーを全部そぎ落とした】もの＝マス目が版ごとになる前の形 */
  const d = snapshot();
  d.P.masuN = 3; d.P.masuC1 = '#20d0a0'; d.P.masufill = 1; d.P.masu = 3;
  d.P.layers.forEach(L => { M_KEYS.forEach(k => delete L[k]); L.masu = 3; L.masufill = 1; });
  return JSON.parse(JSON.stringify(d));
});
const err1 = await p.evaluate(d => { try{ applyJSON(d); return null; }catch(e){ return e.message; } }, old);
await wait(1800);
check(!err1, '読み込みで例外が出ない', err1 || '');
const st = await p.evaluate(() => ({ masuN:P.masuN, c1:P.masuC1, dots:dots.length,
  layerHas: P.layers[0].masuN }));
check(st.masuN === 3 && st.c1 === '#20d0a0', '⭐盤の値が消えない（undefined で上書きしない）', JSON.stringify(st));
check(st.layerHas === 3, '古い JSON の値が版へ配られる', String(st.layerHas));
check(st.dots > 0, '粒がある', String(st.dots));
check(errs.length === 0, 'JSエラーが1つも出ていない', errs.slice(0,2).join(' / '));

console.log('\n── ② 読んだあと書き出せる');
const before = errs.length;
await p.evaluate(() => { window.__got.length = 0; document.getElementById('exPng').click(); });
for(let i = 0; i < 30; i++){ await wait(500);
  if(await p.evaluate(() => window.__got.some(x => /png/.test(x.type)))) break; }
const png = await p.evaluate(async () => {
  const bl = window.__got.find(x => /png/.test(x.type)); if(!bl) return null;
  const bmp = await createImageBitmap(bl); return { w:bmp.width, h:bmp.height, kb:Math.round(bl.size/1024) };
});
check(!!png && png.w > 100, 'PNG が出る', png ? `${png.w}×${png.h}（${png.kb}KB）` : '出てこない');
check(errs.length === before, '書き出しでもエラーが出ない', errs.slice(before).join(' / '));

console.log('\n── ③ 出した JSON を読み直せる（往復）');
const round = await p.evaluate(() => {
  const d = JSON.parse(JSON.stringify(snapshot()));
  try{ applyJSON(d); }catch(e){ return { err:e.message }; }
  return { masuN:P.masuN, c1:P.masuC1, layers:P.layers.length };
});
await wait(1200);
check(!round.err && round.masuN === 3 && round.c1 === '#20d0a0', '出して読み直しても同じ', JSON.stringify(round));
check(errs.length === 0, '往復してもJSエラーなし', errs.slice(0,2).join(' / '));

console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ JSON の読み書きは全部通った');
await b.close();
process.exit(ng.length ? 1 : 0);
