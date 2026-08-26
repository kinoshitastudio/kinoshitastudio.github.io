/* ⭐⭐ ✒️ 描く（2026-08-26）
   木下＝「Hari と sakuji に✒️で描けるように。sure や Ha、nijimi のような
   道具の書き心地も切り替えて使えるように」

   見るのは「落ちない」ではなく、**引いた線が図として入り、書き心地で形が変わるか**：
     ・描くと【図（piece）】が増える＝レイヤーに出て、動かす・回す・書き出しが効く
     ・そのまま＝線のまま／刃HA＝閉じた塗り／擦SURE＝点が増えて縦横に折れる／滲NIJIMI＝閉じて点が多い
     ・もう一度押すと【選ぶ】に戻る（描きっぱなしにしない）
   ⚠️ pointerup は window に付いている（cv ではない）。
   ⚠️ 直す前の版には #bPen が無いので落ちる。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage(); let err=0;
p.on('pageerror', e => { err++; console.log('🔴', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[3] || path.join(HERE, '..', 'index.html');
await p.goto('file://' + decodeURIComponent(FILE), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3500));
const R = await p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  if(!document.getElementById('bPen')) return { 無し:'✒️ 描く が無い' };
  const cv = document.querySelector('canvas');
  const r = cv.getBoundingClientRect();
  const ev = (t,x,y) => cv.dispatchEvent(new PointerEvent(t,
    { clientX:x, clientY:y, button:0, buttons:1, bubbles:true, pointerId:1, pointerType:'mouse' }));
  const nPieces = () => (typeof S !== 'undefined' && S.pieces) ? S.pieces.length : -1;
  out.描く前の図 = nPieces();
  document.getElementById('bPen').click(); await wait(200);
  let row = 0;
  const draw = async () => {
    const y0 = 0.28 + row*0.14; row++;
    ev('pointerdown', r.left + r.width*0.34, r.top + r.height*y0);
    for(let i=1;i<=14;i++){ ev('pointermove', r.left + r.width*(0.34+0.30*i/14),
      r.top + r.height*(y0 + Math.sin(i*0.5)*0.035)); await wait(20); }
    /* ⚠️ pointerup は window に付いている */
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, pointerId:1 }));
    await wait(500);
  };
  for(const f of ['plain','ha','sure','nijimi']){
    const sel = document.getElementById('feel');
    sel.value = f; sel.dispatchEvent(new Event('change', { bubbles:true }));
    await wait(150);
    await draw();
    const pc = S.pieces[S.pieces.length-1];
    out[f] = pc ? { 点: pc.item.segments ? pc.item.segments.length : -1,
                    閉じ: !!pc.item.closed, 塗り: !!pc.item.fillColor } : null;
  }
  out.描いたあとの図 = nPieces();
  document.getElementById('bPen').click(); await wait(150);
  out.切に戻せる = !document.getElementById('bPen').classList.contains('on');
  return out;
});
if(process.argv[2]) await p.screenshot({ path: process.argv[2], clip:{x:100,y:60,width:900,height:760} });
await b.close();
let ng = 0;
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng++; };
console.log('── ✒️ 描く（書き心地つき）');
if(R.無し){ console.log('  🔴 ' + R.無し); process.exit(1); }
ok(err === 0, 'JSエラーが出ない', err + '件');
ok(R.描いたあとの図 - R.描く前の図 === 4, '引いた線が【図】として入る（4本描いて4つ増える）',
   `${R.描く前の図} → ${R.描いたあとの図}`);
ok(R.plain && !R.plain.閉じ && !R.plain.塗り, 'そのまま＝線のまま', JSON.stringify(R.plain));
ok(R.ha && R.ha.閉じ && R.ha.塗り, '刃 HA＝平ペンの帯（閉じた塗り）', JSON.stringify(R.ha));
ok(R.sure && R.sure.点 > (R.plain ? R.plain.点 : 0) * 2, '擦 SURE＝段（点が増える）', JSON.stringify(R.sure));
ok(R.nijimi && R.nijimi.閉じ && R.nijimi.点 > 100, '滲 NIJIMI＝縁が揺れた輪郭', JSON.stringify(R.nijimi));
ok(R.切に戻せる, 'もう一度押すと【選ぶ】に戻る（描きっぱなしにしない）');
process.exit(ng ? 1 : 0);
