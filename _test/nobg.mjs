/* ⭐⭐ 地なしPNG の共通試験（2026-08-25）
   木下＝「今後はオブジェクトだけを切り抜いて背景なしpng書き出しも増えそう。
   理由は 貼HARI でそれらでポスターを作るから」

   見るのは「落ちない」ではなく、切り抜きとして成立しているかを【画素で数える】：
     ① 地ありでは透明な所が無い（＝いままでの出し方は変わっていない）
     ② 地なしでは外が透ける
     ③ 地なしでも物体の所は残る（形が抜け落ちていない）
     ④ 絵のあるところだけに切り詰まっている
        🔴 切り詰めないと、貼HARI で広げたとき透明な余白ごと引き伸ばして粗くなる
           （彫HORI2 で実測＝絵は面積の 15% しか無く、そのぶん粗かった）
     ⑤ 撮ったあと画面が地なしのまま残らない

   使い方： node _test/nobg.mjs <道具名> [見に行くファイル]
   ⚠️ 道具ごとに違うのは【押すボタンの id】だけなので、そこだけ表に持つ。
   ⚠️ --virtual-time-budget では createImageBitmap などの非同期が進まないので puppeteer を使う。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

/* 道具ごと＝【地ありのボタン】と【地なしのボタン】の id。
   pre＝測る前の下ごしらえ（⚠️ 起動直後が【空】の道具は切り抜くものが無く、
   「地なしが全部透明」になって不具合に見える。先に何か描いておく）。 */
const HOW = {
  kasa:   { on:'b_png', off:'b_png2' },
  nijimi: { on:'b-export', off:'b-export2', pre:`
    /* ⚠️ 起動直後は滲みが育っていない＝切り抜くものが無い。少し待って育てる。 */
    await wait(3000);
  ` },
  nuri: { on:'b_png', off:'b_png2', pre:`
    /* ⚠️ この道具は起動直後【何も塗っていない】＝切り抜くものが無い。先に筆でなぞる。 */
    const cv0 = [...document.querySelectorAll('canvas')]
      .sort((a,b)=>b.width*b.height-a.width*a.height)[0];
    const r = cv0.getBoundingClientRect();
    const ev = (t,x,y) => cv0.dispatchEvent(new PointerEvent(t,
      { clientX:x, clientY:y, button:0, buttons:1, bubbles:true, pointerId:1, pointerType:'mouse' }));
    ev('pointerdown', r.left + r.width*0.34, r.top + r.height*0.42);
    for(let i=1;i<=16;i++){
      ev('pointermove', r.left + r.width*(0.34 + 0.32*i/16),
                        r.top + r.height*(0.42 + Math.sin(i*0.4)*0.10));
      await wait(28);
    }
    ev('pointerup', r.left + r.width*0.66, r.top + r.height*0.42);
    await wait(1200);
  ` },
  hori: { on:'btn-png', off:'btn-png2', pre:`
    /* ⚠️ この道具は起動直後に線が1本も無い（字を置く が無く、手で引くだけ）。
       ⭐ 木下と同じく【盤をなぞって】線を引いてから測る。 */
    const cv0 = [...document.querySelectorAll('canvas')]
      .sort((a,b)=>b.width*b.height-a.width*a.height)[0];
    const r = cv0.getBoundingClientRect();
    const ev = (t,x,y) => cv0.dispatchEvent(new PointerEvent(t,
      { clientX:x, clientY:y, button:0, buttons:1, bubbles:true, pointerId:1, pointerType:'mouse' }));
    for(const k of [0,1]){
      const y0 = r.top + r.height*(0.36 + k*0.22);
      ev('pointerdown', r.left + r.width*0.30, y0);
      for(let i=1;i<=14;i++){
        ev('pointermove', r.left + r.width*(0.30 + 0.40*i/14),
                          y0 + Math.sin(i*0.5)*r.height*0.06);
        await wait(24);
      }
      ev('pointerup', r.left + r.width*0.70, y0);
      await wait(200);
    }
    await wait(900);
  ` },
};
const tool = process.argv[2];
if(!tool || !HOW[tool]){ console.log('使い方: node _test/nobg.mjs <道具名>  （表にあるのは '+Object.keys(HOW).join('/')+'）'); process.exit(1); }
const FILE = process.argv[3] || path.join(ROOT, tool, 'index.html');

const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); let err = 0;
p.on('pageerror', e => { err++; console.log('🔴 JSエラー:', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto('file://' + decodeURIComponent(FILE), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3000));

const R = await p.evaluate(async ids => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  if(ids.pre) await (new Function('wait', 'return (async()=>{' + ids.pre + '})()'))(wait);
  /* ⚠️ ダウンロードは headless では落ちないので、Blob を作る所で横取りする */
  const grabbed = [];
  const o = URL.createObjectURL.bind(URL);
  URL.createObjectURL = bb => { grabbed.push(bb); return o(bb); };
  const push = async id => {
    grabbed.length = 0;
    const el = document.getElementById(id);
    if(!el) return { 無し:'ボタンが無い' };
    el.click();
    for(let i=0;i<80 && !grabbed.length;i++) await wait(200);
    const bb = grabbed[grabbed.length-1];
    if(!bb) return { 無し:'出なかった' };
    const bmp = await createImageBitmap(bb);
    const c = document.createElement('canvas'); c.width=bmp.width; c.height=bmp.height;
    c.getContext('2d').drawImage(bmp,0,0);
    const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let clear=0, opaque=0, n=0;
    for(let i=3;i<d.length;i+=4*13){ n++; if(d[i]<8) clear++; else if(d[i]>247) opaque++; }
    return { w:bmp.width, h:bmp.height, 透明:+(clear/n*100).toFixed(1), 不透明:+(opaque/n*100).toFixed(1) };
  };
  const screen = () => {
    const el = [...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0];
    const c = document.createElement('canvas'); c.width=el.width; c.height=el.height;
    c.getContext('2d').drawImage(el,0,0);
    const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let clear=0,n=0; for(let i=3;i<d.length;i+=4*13){ n++; if(d[i]<8) clear++; }
    return +(clear/n*100).toFixed(1);
  };
  /* ⚠️ 道具によっては画面の canvas がもともと透明を持っている（紙を塗らない所がある）。
     ⭐ だから「透明か」ではなく【撮る前と後で変わっていないか】で見る。 */
  const before = screen();
  const A = await push(ids.on); await wait(600);
  const B = await push(ids.off); await wait(900);
  return { 地あり:A, 地なし:B, 画面前:before, 画面後:screen() };
}, HOW[tool]);
await b.close();

let ng = 0;
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng++; };
const A = R.地あり, B = R.地なし;
console.log('── 地なしPNG ' + tool);
ok(err === 0, 'JSエラーが出ない', err + '件');
ok(!A.無し && A.透明 < 1, '地ありで撮ると透明な所が無い（いままでの出し方は不変）',
   A.無し || `${A.透明}%  ${A.w}×${A.h}`);
ok(!B.無し && B.透明 > 5, '地なしで撮ると外が透ける', B.無し || `${B.透明}%  ${B.w}×${B.h}`);
ok(!B.無し && B.不透明 > 10, '地なしでも物体の所は残る（形が抜け落ちていない）', B.無し || `${B.不透明}%`);
/* ⭐ 切り詰まっている、または【元から絵が端まで届いている】（＝切り詰める余地が無い）。
   ⚠️ 滲NIJIMI のように絵が版面いっぱいに散らばる道具では、切り詰まらないのが正しい。
      だから「小さくなったか」だけで見ると嘘の🔴が出る。 */
ok(!A.無し && !B.無し && (B.w < A.w || B.h < A.h || B.透明 < 80),
   '絵のあるところだけに切り詰まっている（散らばる道具は元から端まで）',
   (A.無し||B.無し) || `${A.w}×${A.h} → ${B.w}×${B.h}  透明 ${B.透明}%`);
ok(Math.abs(R.画面後 - R.画面前) < 1, '撮ったあと画面が地なしのまま残らない',
   `撮る前 ${R.画面前}% → 撮った後 ${R.画面後}%`);
process.exit(ng ? 1 : 0);
