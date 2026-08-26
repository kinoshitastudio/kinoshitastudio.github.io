/* ⭐⭐ 書き心地を【引いている最中から見せる】＋【あとから掛け直す】（2026-08-26）
   木下＝「まず書き心地を選択したあと、描く、描いた後でしか反映がみれない。これはいたい。
   選択したのから書いている時点から反映してほしい。また描き終わった後に関しても後から
   線の太さやその他もろもろ調整できるようにしてほしい」（貼HARI と同じ注文）

   見るのは「落ちない」ではなく **見えているか・掛け直せているか**：
     ・引いている最中に、刃HA の帯が【案内の層】に出ている（作品には混ざらない）
     ・離すまで図形は増えない／離すと1つ増える
     ・引いた骨を控えている＝あとから太さ・書き心地を掛け直せる
     ・⚠️ 掛け直しても図形は増えない／⚠️ 動かした場所から動かない
     ・✏️ を押すとフライアウトが開き、選ぶと ✓ が動く
   ⚠️ paper.js は MouseEvent を見る（PointerEvent では拾わない）。
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
const FILE = process.argv[2] || path.join(HERE, '..', 'index.html');
await p.goto('file://' + decodeURIComponent(FILE), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3500));
const R = await p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  if(!document.getElementById('feelMenu')) return { 無し:'書き心地のフライアウト（#feelMenu）が無い' };
  const cv = document.querySelector('canvas');
  const r = cv.getBoundingClientRect();
  const ev = (t,x,y) => cv.dispatchEvent(new MouseEvent(t,
    { clientX:x, clientY:y, button:0, buttons:1, bubbles:true }));
  const fmBtn = f => document.querySelector(`#feelMenu button[data-f="${f}"]`);
  const nArt = () => artLayer.children.length;
  const uiBands = () => uiLayer.getItems({ recursive:true }).filter(i => i.closed && i.fillColor).length;

  /* ── ① フライアウト ── */
  document.querySelector('#tools button[data-tool="stroke"]').click(); await wait(150);
  out.押すと開く = document.getElementById('feelMenu').classList.contains('open');
  fmBtn('ha').click(); await wait(200);
  out.選ぶと印が動く = fmBtn('ha').classList.contains('on') && !fmBtn('plain').classList.contains('on');
  out.閉じる = !document.getElementById('feelMenu').classList.contains('open');

  /* ── ② 引いている最中に見えるか ── */
  out.引く前 = nArt();
  ev('mousedown', r.left + r.width*0.28, r.top + r.height*0.30);
  for(let i=1;i<=16;i++){ ev('mousemove', r.left + r.width*(0.28+0.34*i/16),
    r.top + r.height*(0.30 + Math.sin(i*0.45)*0.05)); await wait(20); }
  await wait(150);                              // ⚠️ 下見は1コマに1回
  out.引いている最中の帯 = uiBands();
  out.引いている最中の図形 = nArt();
  ev('mouseup', r.left + r.width*0.62, r.top + r.height*0.30);
  await wait(400);
  out.離したあと = nArt();

  /* ── ③ あとから掛け直せるか ── */
  const it0 = artLayer.children[artLayer.children.length-1];
  out.骨を控えている = !!(it0.data && it0.data.pen && it0.data.pen.pts && it0.data.pen.pts.length > 1);
  out.選ばれている = !!it0.selected;
  const w0 = it0.bounds.height;
  const sw = document.getElementById('sw');
  sw.value = 90; sw.dispatchEvent(new Event('input', { bubbles:true }));
  await wait(300);
  const it1 = artLayer.children[artLayer.children.length-1];
  out.太さが効く = { 前:Math.round(w0), 後:Math.round(it1.bounds.height), 控え:it1.data.pen.w };
  out.掛け直しで増えない = nArt();

  /* ── ④ 動かしてから掛け直しても、その場所に居るか ── */
  it1.translate(new paper.Point(160, 90));
  const c0 = it1.bounds.center;
  fmBtn('nijimi').click(); await wait(350);
  const it2 = artLayer.children[artLayer.children.length-1];
  const c1 = it2.bounds.center;
  out.動かした場所に残る = { ずれ:Math.round(c0.getDistance(c1)),
                            閉じ:!!it2.closed, 点:it2.segments ? it2.segments.length : -1 };
  out.最後 = nArt();
  fmBtn('plain').click(); await wait(300);
  const it3 = artLayer.children[artLayer.children.length-1];
  out.そのままに戻る = { 線:!!it3.strokeColor, 閉じ:!!it3.closed, 幅:it3.strokeWidth };
  return out;
});
if(process.argv[3]) await p.screenshot({ path: process.argv[3] });
await b.close();
let ng = 0;
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng++; };
console.log('── 書き心地（引いている最中／あとから掛け直す）');
if(R.無し){ console.log('  🔴 ' + R.無し); process.exit(1); }
ok(err === 0, 'JSエラーが出ない', err + '件');
ok(R.押すと開く, '✏️ を押すと書き心地が右に開く');
ok(R.選ぶと印が動く, '選ぶと ✓ が動く');
ok(R.閉じる, '選んだら閉じる（開きっぱなしにしない）');
ok(R.引いている最中の帯 >= 1, '⭐ 引いている最中から刃HAの帯が見えている', '帯 ' + R.引いている最中の帯);
ok(R.引いている最中の図形 === R.引く前 + 1,
   '⚠️ 下見は作品に混ざらない（増えるのは引いている線1本だけ）',
   `${R.引く前} → ${R.引いている最中の図形}`);
ok(R.離したあと === R.引く前 + 1, '離すと図形が1つ増える', `${R.引く前} → ${R.離したあと}`);
ok(R.骨を控えている, '⭐ 引いた骨を控えている（あとから作り直せる）');
ok(R.選ばれている, '引いた線は選ばれたまま（そのまま調整に入れる）');
ok(R.太さが効く.後 > R.太さが効く.前 && R.太さが効く.控え === 90,
   '⭐ あとから【太さ】を変えられる（刃HAの帯が太る）', JSON.stringify(R.太さが効く));
ok(R.掛け直しで増えない === R.離したあと, '⚠️ 掛け直しても図形は増えない', String(R.掛け直しで増えない));
ok(R.動かした場所に残る.ずれ <= 24 && R.動かした場所に残る.閉じ,
   '⭐⭐ 動かしてから掛け直しても、動かした場所に居る', JSON.stringify(R.動かした場所に残る));
ok(R.そのままに戻る.線 && !R.そのままに戻る.閉じ && R.そのままに戻る.幅 === 90,
   '⭐ あとから【そのまま】に戻せる（太さも控えのまま）', JSON.stringify(R.そのままに戻る));
process.exit(ng ? 1 : 0);
