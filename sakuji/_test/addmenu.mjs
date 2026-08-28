/* ⭐ 入れる（ドロップダウン）── 作字SAKUJI 2026-08-28
   見るのは：① 盤の上に入口がある ② 押すと4つ出る ③ 押すと【今までの入口】が本当に開く
   （＝ファイル選択の窓が呼ばれる／段が畳んでいても効く） ④ 外を触ると閉じる */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1500, height:950 });
/* ⚠️ 既定は【この道具の index.html を直に】読む（feel.mjs と同じ作法）。
   URL を渡せばそちらを見る（コピーを立てて当てるとき用）。 */
const FILE = process.argv[2] || 'file://' + decodeURIComponent(
  (await import('node:path')).default.join(
    (await import('node:path')).default.dirname(
      (await import('node:url')).fileURLToPath(import.meta.url)), '..', 'index.html'));
await p.goto(FILE, { waitUntil:'networkidle0' });
await p.evaluate(() => { try{ localStorage.clear(); }catch(_){} });
await p.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,3000));
let NG=0; const ok=(c,n,x)=>{ console.log((c?'  ✅ ':'  🔴 ')+n+(x!=null?' … '+x:'')); if(!c) NG=1; };

/* どの file input が開かれたかを横取りする（本当にその道が呼ばれたか） */
await p.evaluate(() => {
  window.__opened = [];
  document.querySelectorAll('input[type=file]').forEach(i => {
    const o = i.click.bind(i);
    i.click = function(){ window.__opened.push(i.id); };
  });
});

ok(await p.evaluate(() => !!document.getElementById('addBtn')), '盤の上に【＋ 入れる】がある');
const pos = await p.evaluate(() => {
  const v = document.getElementById('pvBtn').getBoundingClientRect();
  const a = document.getElementById('addBtn').getBoundingClientRect();
  return { パス右:Math.round(v.right), 入れる左:Math.round(a.left), 同じ高さ:Math.round(v.top)===Math.round(a.top) };
});
ok(pos.入れる左 >= pos.パス右 && pos.入れる左 - pos.パス右 < 20 && pos.同じ高さ, 'パスの右にきれいに並ぶ', JSON.stringify(pos));
ok(await p.evaluate(() => !document.getElementById('addMenu').classList.contains('open')), 'はじめは閉じている');

await p.click('#addBtn'); await new Promise(r=>setTimeout(r,300));
const items = await p.evaluate(() => [...document.querySelectorAll('#addMenu button[data-add]')].map(b => b.textContent.trim()));
ok(await p.evaluate(() => document.getElementById('addMenu').classList.contains('open')), '押すと開く');
ok(items.length === 4, '4つ出る', items.join(' / '));

/* ⭐ 中身が【今までの入口】に本当に届くか（畳んだ段の中でも効くか） */
const 期待 = { bImgLoad:'fileImg', bSVGin:'fileSVG', bRefLoad:'fileRef', bTrLoad:'fileTr' };
for(const [id, want] of Object.entries(期待)){
  await p.evaluate(() => { window.__opened = []; });
  await p.evaluate(() => document.getElementById('addBtn').click());
  await new Promise(r=>setTimeout(r,150));
  await p.evaluate(i => document.querySelector('#addMenu button[data-add="'+i+'"]').click(), id);
  await new Promise(r=>setTimeout(r,250));
  const got = await p.evaluate(() => window.__opened.slice());
  ok(got.includes(want), id + ' → ' + want + ' が開く', got.join(',') || '(何も開かない)');
  ok(await p.evaluate(() => !document.getElementById('addMenu').classList.contains('open')), '　選んだら閉じる');
}
/* 外を触ると閉じる */
await p.evaluate(() => document.getElementById('addBtn').click());
await new Promise(r=>setTimeout(r,200));
await p.mouse.click(700, 600);
await new Promise(r=>setTimeout(r,250));
ok(await p.evaluate(() => !document.getElementById('addMenu').classList.contains('open')), '盤を触ると閉じる');
ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close();
process.exit(NG);
