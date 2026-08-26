/* ⭐⭐ 書き心地を【引いている最中から見せる】＋【引いたあとに掛け直す】（2026-08-26）
   木下＝「まず書き心地を選択したあと、描く、描いた後でしか反映がみれない。これはいたい。
   　　　　選択したのから書いている時点から反映してほしい。また描き終わった後に関しても
   　　　　後から線の太さやその他もろもろ調整できるようにしてほしい」

   見るのは「落ちない」ではなく **見えているか・掛け直せているか**：
     ・引いている最中（まだ離していない）に、刃HA の【閉じた塗り】が盤に居る
     ・離すまでは図（piece）を増やさない＝下見は作品に混ざらない
     ・引いたあと、太さのつまみを動かすと【その線】が太くなる（図は増えない）
     ・引いたあと、書き心地を変えると【その線】の形が変わる（線→閉じた塗り）
     ・骨は変えない＝掛け直しても線の長さ（外形）はほぼ同じ場所にある
     ・✒️ を押すとフライアウトが開き、選ぶと ✓ が動く
   ⚠️ pointerup は window に付いている（cv ではない）。
   ⚠️ 直す前の版には #feelMenu が無いので落ちる。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage(); let err=0;
p.on('pageerror', e => { err++; console.log('🔴', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[3] || path.join(HERE, '..', 'index.html');
await p.goto('file://' + decodeURIComponent(FILE), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3500));
const R = await p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  if(!document.getElementById('feelMenu')) return { 無し:'書き心地のフライアウト（#feelMenu）が無い' };
  const cv = document.querySelector('canvas');
  const r = cv.getBoundingClientRect();
  const ev = (t,x,y) => cv.dispatchEvent(new PointerEvent(t,
    { clientX:x, clientY:y, button:0, buttons:1, bubbles:true, pointerId:1, pointerType:'mouse' }));
  const up = () => window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, pointerId:1 }));
  const fmBtn = f => document.querySelector(`#feelMenu button[data-f="${f}"]`);
  const penBtn = document.querySelector('#tools button[data-tool="pen"]');
  /* 盤に居る「閉じた塗り」の数＝刃HA の帯が出ているか（下見も本番も同じ形） */
  const closedFills = () => paper.project.layers
    .reduce((n,L)=> n + L.getItems({ recursive:true }).filter(i=>i.closed && i.fillColor).length, 0);

  /* ── ① 引いている最中に見えるか ── */
  penBtn.click(); await wait(120);            // ✒️＝描く＋フライアウトが開く
  out.押すと開く = document.getElementById('feelMenu').classList.contains('open');
  fmBtn('ha').click(); await wait(150);       // 刃 HA を選ぶ
  out.選ぶと印が動く = fmBtn('ha').classList.contains('on') && !fmBtn('plain').classList.contains('on');
  out.閉じる = !document.getElementById('feelMenu').classList.contains('open');
  const before = closedFills();
  out.引く前の図 = S.pieces.length;
  ev('pointerdown', r.left + r.width*0.30, r.top + r.height*0.30);
  for(let i=1;i<=12;i++){ ev('pointermove', r.left + r.width*(0.30+0.28*i/12),
    r.top + r.height*(0.30 + Math.sin(i*0.5)*0.03)); await wait(20); }
  await wait(120);                            // ⚠️ 下見は1コマに1回なので、1コマ待つ
  out.引いている最中の帯 = closedFills() - before;
  out.引いている最中の図 = S.pieces.length;   // ⚠️ まだ離していない＝図は増えていないはず
  up(); await wait(400);
  out.離したあとの図 = S.pieces.length;
  out.離したあとの帯 = closedFills() - before;

  /* ── ② 引いたあとに掛け直せるか ── */
  const pc = S.pieces[S.pieces.length-1];
  out.骨を控えている = !!(pc && pc.pen && pc.pen.pts && pc.pen.pts.length > 1);
  const w0 = pc.item.bounds.width, h0 = pc.item.bounds.height;
  fmBtn('plain').click(); await wait(250);    // 書き心地を「そのまま」に掛け直す
  out.掛け直し後の図 = S.pieces.length;       // ⚠️ 増やさない＝同じ線を作り直しただけ
  out.そのままに戻る = { 閉じ: !!pc.item.closed, 塗り: !!pc.item.fillColor,
                        線: !!pc.item.strokeColor };
  out.外形は保つ = Math.abs(pc.item.bounds.width - w0) < w0*0.35 &&
                   Math.abs(pc.item.bounds.height - h0) < Math.max(40, h0*1.2);
  const wr = document.getElementById('penW');
  wr.value = 60; wr.dispatchEvent(new Event('input', { bubbles:true }));
  await wait(250);
  out.太さが効く = { 線幅: pc.item.strokeWidth, 控え: pc.pen.w };
  fmBtn('nijimi').click(); await wait(300);
  out.滲に掛け直す = { 閉じ: !!pc.item.closed, 点: pc.item.segments ? pc.item.segments.length : -1 };
  out.最後の図 = S.pieces.length;
  return out;
});
if(process.argv[2]) await p.screenshot({ path: process.argv[2] });
await b.close();
let ng = 0;
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng++; };
console.log('── 書き心地（引いている最中／あとから掛け直す）');
if(R.無し){ console.log('  🔴 ' + R.無し); process.exit(1); }
ok(err === 0, 'JSエラーが出ない', err + '件');
ok(R.押すと開く, '✒️ を押すと書き心地が右に開く');
ok(R.選ぶと印が動く, '選ぶと ✓ が動く');
ok(R.閉じる, '選んだら閉じる（開きっぱなしにしない）');
ok(R.引いている最中の帯 >= 1, '⭐ 引いている最中から刃HAの帯が見えている', '帯 ' + R.引いている最中の帯);
ok(R.引いている最中の図 === R.引く前の図, '⚠️ 下見は作品に混ざらない（離すまで図は増えない）',
   `${R.引く前の図} → ${R.引いている最中の図}`);
ok(R.離したあとの図 - R.引く前の図 === 1, '離すと図が1つ増える', `${R.引く前の図} → ${R.離したあとの図}`);
ok(R.骨を控えている, '⭐ 引いた骨を控えている（あとから作り直せる）');
ok(R.掛け直し後の図 === R.離したあとの図, '⚠️ 掛け直しても図は増えない', String(R.掛け直し後の図));
ok(R.そのままに戻る.線 && !R.そのままに戻る.閉じ, '⭐ あとから【そのまま】に掛け直せる',
   JSON.stringify(R.そのままに戻る));
ok(R.外形は保つ, '⭐ 骨は変わらない（掛け直しても同じ所に同じ長さで居る）');
ok(R.太さが効く.線幅 === 60 && R.太さが効く.控え === 60, '⭐ あとから【太さ】を変えられる',
   JSON.stringify(R.太さが効く));
ok(R.滲に掛け直す.閉じ && R.滲に掛け直す.点 > 50, '⭐ あとから【滲 NIJIMI】に掛け直せる',
   JSON.stringify(R.滲に掛け直す));
ok(R.最後の図 === R.離したあとの図, '⚠️ 何度掛け直しても図は1つのまま', String(R.最後の図));
process.exit(ng ? 1 : 0);
