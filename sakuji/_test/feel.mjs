/* ⭐⭐ 書き心地の切り替え（2026-08-26）
   木下＝「sakuji はすでにあるが、その中に sure や、Ha、nijimi のような
   道具の書き心地も切り替えて使えるように」

   見るのは「落ちない」ではなく、**他の道具の芯が出ているか**を形で見る：
     ・そのまま  … 均一な線（いままで／線のまま）
     ・刃 HA     … 平ペンの帯＝【閉じた塗り】になる（角度で太さが変わる）
     ・擦 SURE   … 升目に丸めた段＝点が増えて縦横に折れる
     ・滲 NIJIMI … 縁が揺れた輪郭＝【閉じた塗り】で点が多い
     ・要るつまみだけ出る（触れるのに効かないつまみを出さない）
   ⚠️ paper.js は MouseEvent を見る（PointerEvent では拾わない）。
   ⚠️ 直す前の版には #feel が無いので落ちる。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage(); let err=0;
p.on('pageerror', e => { err++; console.log('🔴', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || path.join(HERE, '..', 'index.html');
await p.goto('file://' + decodeURIComponent(FILE), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3500));
const R = await p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const cv = document.querySelector('canvas');
  const r = cv.getBoundingClientRect();
  /* ⚠️ paper.js は MouseEvent を見る（PointerEvent では拾わない） */
  const ev = (t,x,y) => cv.dispatchEvent(new MouseEvent(t,
    { clientX:x, clientY:y, button:0, buttons:1, bubbles:true }));
  let row = 0;
  const draw = async () => {
    document.querySelector('[data-tool="stroke"]').click(); await wait(200);
    const y0 = 0.20 + row*0.19; row++;
    ev('mousedown', r.left + r.width*0.30, r.top + r.height*y0);
    for(let i=1;i<=16;i++){ ev('mousemove', r.left + r.width*(0.30+0.36*i/16),
      r.top + r.height*(y0 + Math.sin(i*0.45)*0.05)); await wait(20); }
    ev('mouseup', r.left + r.width*0.66, r.top + r.height*y0);
    await wait(500);
  };
  const info = () => { const items = paper.project.activeLayer.children.filter(x => x.className === 'Path');
    const last = items[items.length-1];
    return last ? { 点:last.segments.length, 閉じ:!!last.closed,
                    塗り:!!last.fillColor, 線:!!last.strokeColor } : null; };
  if(!document.getElementById('feel')) return { 無し:'書き心地の入口（#feel）が無い' };
  for(const f of ['plain','ha','sure','nijimi']){
    const sel = document.getElementById('feel');
    sel.value = f; sel.dispatchEvent(new Event('change', { bubbles:true }));
    await wait(200);
    await draw();
    out[f] = info();
  }
  out.つまみの出し分け = [...document.querySelectorAll('.feel-ha,.feel-sure,.feel-nijimi')]
    .map(e => e.className + ':' + (e.style.display === 'none' ? '隠' : '出'));
  return out;
});
await b.close();
let ng = 0;
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng++; };
console.log('── 書き心地の切り替え');
if(R.無し){ console.log('  🔴 ' + R.無し); process.exit(1); }
ok(err === 0, 'JSエラーが出ない', err + '件');
ok(R.plain && R.plain.線 && !R.plain.閉じ, 'そのまま＝いままでどおり【線】のまま', JSON.stringify(R.plain));
ok(R.ha && R.ha.閉じ && R.ha.塗り, '刃 HA＝平ペンの帯（閉じた塗りになる）', JSON.stringify(R.ha));
ok(R.sure && R.sure.点 > (R.plain ? R.plain.点 : 0) * 2,
   '擦 SURE＝升目に丸めた段（点が増えて縦横に折れる）', JSON.stringify(R.sure));
ok(R.nijimi && R.nijimi.閉じ && R.nijimi.点 > 100,
   '滲 NIJIMI＝縁が揺れた輪郭', JSON.stringify(R.nijimi));
const shown = R.つまみの出し分け.filter(x => x.endsWith('出')).length;
ok(shown === 1, '要るつまみだけ出る（触れるのに効かないつまみを出さない）',
   R.つまみの出し分け.join(' / '));
process.exit(ng ? 1 : 0);
