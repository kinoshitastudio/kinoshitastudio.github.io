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
const slide = (id, v) => p.evaluate(o => { const r = document.getElementById(o.id);
  r.value = o.v; r.dispatchEvent(new Event('input', { bubbles:true })); }, { id, v });
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
console.log('\n── ④ ⌥＋ドラッグ＝選んでいる版だけが動く');
/* ⚠️ 前の項目で並び替えているので、ここで版を1枚足して【素の状態】から測る
   （前の状態を引きずったまま測って1回誤検出した 2026-08-18） */
await p.evaluate(() => document.getElementById('addLayer').click());
await wait(1200);
/* ⭐ 測るのは【画面の上での位置】。世界の座標は版を動かすと原点ごとずれるので使えない */
const pos = () => p.evaluate(() => {
  const scr = li => { const a = dots.filter(d => d.li === li);
    if(!a.length) return null;
    const x = Math.min(...a.map(d => d.x)), y = Math.min(...a.map(d => d.y));
    return [Math.round(cam.s*x*P.cell + cam.x), Math.round(cam.s*y*P.cell + cam.y)]; };
  return { cur:P.cur, lx:+document.getElementById('lx').value, ly:+document.getElementById('ly').value,
           camX:Math.round(cam.x), camY:Math.round(cam.y),
           mine:scr(P.cur), other:scr(P.cur === 0 ? 1 : 0) };
});
const q0 = await pos();
await p.mouse.move(400, 400);
await p.keyboard.down('Alt');
await p.mouse.down();
await p.mouse.move(520, 470, { steps:6 });
await p.mouse.up();
await p.keyboard.up('Alt');
await wait(1200);
const q1 = await pos();
const same = (a2, b2) => JSON.stringify(a2) === JSON.stringify(b2);
check(q1.lx !== q0.lx || q1.ly !== q0.ly, '⌥ドラッグで選んでいる版の位置つまみが動く',
      `${q0.lx},${q0.ly} → ${q1.lx},${q1.ly}`);
check(q1.camX === q0.camX && q1.camY === q0.camY, '⭐画面（カメラ）は動かない',
      `${q0.camX},${q0.camY} → ${q1.camX},${q1.camY}`);
check(!same(q0.mine, q1.mine), '選んでいる版は画面の上で動いた', `${JSON.stringify(q0.mine)} → ${JSON.stringify(q1.mine)}`);
check(same(q0.other, q1.other), '⭐選んでいない版は画面の上で動かない', `${JSON.stringify(q0.other)} → ${JSON.stringify(q1.other)}`);

console.log('\n── ⑤ 解像・太さも版ごと');
await p.evaluate(() => { const c = document.getElementById('layerChips').children; c[c.length-1].click(); });
await wait(800);
const rf = () => p.evaluate(() => ({ res:+document.getElementById('res').value, fat:+document.getElementById('fat').value,
  layers:P.layers.map(l => [l.res, l.fat]) }));
const r0 = await rf();
await slide('res', 12); await slide('fat', 6); await wait(1500);
const r1 = await rf();
check(r1.res === 12 && r1.fat === 6, '選んでいる版の解像・太さが変わる', JSON.stringify(r1.layers));
check(r1.layers[0][0] !== 12 || r1.layers[0][1] !== 6, '⭐もう片方の版は変わらない', JSON.stringify(r1.layers));
await p.evaluate(() => document.getElementById('layerChips').children[0].click());
await wait(900);
const r2 = await rf();
check(r2.res === r1.layers[0][0] && r2.fat === r1.layers[0][1], '版を選び直すとつまみもその版の値に戻る',
      `${r2.res},${r2.fat}`);

await b.close();
console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ 版まわりは全部通った');
process.exit(ng.length ? 1 : 0);
