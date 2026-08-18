/* ⭐ 版（重ねる）の回帰テスト（2026-08-18 新設）
   ① スペースだけの版でも置ける（木下「文字を入れないでもグラフィックで追加したいから」）
   ② 版のチップを横にドラッグ＝重なりの順が変わる
   ③ ただ押しただけでは並びは変わらない（版を選ぶだけ）
   ⚠️ 字は【input】で入る（change では入らない＝ここで1回落とした）。
   ⚠️ 画面の見た目は headless の screenshot では拾えないことがある＝数で見る。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL0 = process.argv[2] || 'http://localhost:8092/tsubu/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
p.on('pageerror', e => console.log('🔴 pageerror', e.message));
await p.setViewport({ width:1400, height:1000, deviceScaleFactor:1 });
await p.goto(URL0 + '?v=' + Date.now(), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 2200));
const wait = ms => new Promise(r => setTimeout(r, ms));
const ng = [];
const check = (ok, name, note) => { console.log(`  ${ok ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!ok) ng.push(name); };

/* ⭐ 素の状態から始める（JSON に依存しない）。マス目を出しておく＝空白の版でも粒が出る形に */
await p.evaluate(() => {
  const set = (id, v) => { const r = document.getElementById(id); if(!r) return;
    r.value = v; r.dispatchEvent(new Event('input', { bubbles:true })); };
  set('masu', 3);
  document.querySelector('#masufill button[data-v="1"]').click();
});
await wait(1200);

console.log('── ① スペースだけの版');
await p.evaluate(() => document.getElementById('addLayer').click());
await wait(900);
const before = await p.evaluate(() => dots.length);
await p.evaluate(() => { const t = document.getElementById('txt');
  t.value = '　　　　'; t.dispatchEvent(new Event('input', { bubbles:true })); });
await wait(1000);
/* ⚠️ 同じ場所に重なった粒は1つにまとめられる＝ずらしてから数える（これで1回誤検出した） */
await p.evaluate(() => { const r = document.getElementById('ly');
  r.value = -80; r.dispatchEvent(new Event('input', { bubbles:true })); });
await wait(1400);
const after = await p.evaluate(() => ({ dots:dots.length, layers:P.layers.length, W, H,
  txt:P.layers[P.cur].txt }));
check(after.layers === 2, '版は2枚のまま', JSON.stringify(after));
check(after.dots > before, '⭐空白だけの版でも粒が増える（マス目が出る）', `${before} → ${after.dots}`);

console.log('\n── ② 版をドラッグして重なりを入れ替える');
const order0 = await p.evaluate(() => P.layers.map(l => (l.txt || '').trim().slice(0,3) || '空'));
const box = await p.evaluate(() => {
  const k = document.getElementById('layerChips').children;
  const a = k[0].getBoundingClientRect(), b2 = k[1].getBoundingClientRect();
  return { ax:a.x + a.width/2, ay:a.y + a.height/2, bx:b2.x + b2.width/2, by:b2.y + b2.height/2 };
});
await p.mouse.move(box.bx, box.by);
await p.mouse.down();
await p.mouse.move(box.bx - 10, box.by, { steps:3 });
await p.mouse.move(box.ax - 4, box.ay, { steps:8 });
await p.mouse.up();
await wait(1200);
const order1 = await p.evaluate(() => P.layers.map(l => (l.txt || '').trim().slice(0,3) || '空'));
check(JSON.stringify(order0) !== JSON.stringify(order1), '並びが入れ替わる', `${order0} → ${order1}`);
const cur = await p.evaluate(() => ({ cur:P.cur, txt:(P.layers[P.cur].txt||'').trim().slice(0,3) || '空' }));
check(cur.txt === '空', '選んでいた版がそのまま選ばれている', JSON.stringify(cur));

console.log('\n── ③ ただ押しただけでは並びが変わらない（版を選ぶだけ）');
await p.mouse.click(box.ax, box.ay);
await wait(900);
const order2 = await p.evaluate(() => P.layers.map(l => (l.txt || '').trim().slice(0,3) || '空'));
check(JSON.stringify(order1) === JSON.stringify(order2), '押しただけなら並びは変わらない', `${order2}`);
check(await p.evaluate(() => P.cur) === 0, '押した版が選ばれる');
await b.close();
console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ 版まわりは全部通った');
process.exit(ng.length ? 1 : 0);
