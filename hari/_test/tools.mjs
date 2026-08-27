/* ⭐⭐ 左の道具立て（2026-08-26）
   木下＝「Hari にはそもそも描くのがないのでツールなどをつくった方がよいかもね」
   ＝ ✒️描く は前の晩に入っていたのに、右パネルの段の中に埋もれて見つからなかった。

   見るのは「落ちない」ではなく **探しにくる場所に道具が有るか・どこから押しても印が揃うか**：
     ・版面の左に道具立てが【見えている】（大きさを持って画面の中にある）
     ・浮かぶレイヤーと【重なっていない】＝どちらも掴める
     ・✒️を押す＝描くに入る／▶を押す＝選ぶに戻る（右パネルの印も同時に変わる）
     ・キー P／V でも同じ／⚠️ ⌘V（貼る）は道具を変えない
     ・道具立てから入って、実際に線が引ける（図が増える）
   ⚠️ pointerup は window に付いている（cv ではない）。
   ⚠️ 直す前の版には #tools が無いので落ちる。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage(); let err=0;
p.on('pageerror', e => { err++; console.log('🔴', e.message); });
/* ⚠️ 縦を【わざと低く】する＝道具立ては画面の中央に置くので、
   　　背の低い窓のときだけ浮かぶレイヤーと当たる。高い窓で測ると重なりの試験が効かない。 */
await p.setViewport({ width:1400, height:660, deviceScaleFactor:1 });
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[3] || path.join(HERE, '..', 'index.html');
await p.goto('file://' + decodeURIComponent(FILE), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3500));
const R = await p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const tools = document.getElementById('tools');
  if(!tools) return { 無し:'左の道具立て（#tools）が無い' };
  const btn = t => tools.querySelector(`button[data-tool="${t}"]`);
  const r = tools.getBoundingClientRect();
  out.見えている = r.width > 20 && r.height > 20 &&
    r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight &&
    getComputedStyle(tools).display !== 'none';
  out.道具の数 = tools.querySelectorAll('button[data-tool]').length;
  /* ⚠️ 幾何で外す＝重なっていたら、どちらも掴めない */
  const lp = document.getElementById('layPanel').getBoundingClientRect();
  out.レイヤーと重ならない = !(r.left < lp.right && lp.left < r.right &&
                               r.top < lp.bottom && lp.top < r.bottom);
  /* ── 押した場所がどこでも印が揃うか ── */
  const mark = () => ({ pen: btn('pen').classList.contains('on'),
                        sel: btn('select').classList.contains('on'),
                        右: document.getElementById('bPen').classList.contains('on'),
                        中: PEN.on });
  btn('pen').click(); await wait(120);  out.描くを押した = mark();
  btn('select').click(); await wait(120); out.選ぶを押した = mark();
  const key = (k, meta) => document.body.dispatchEvent(
    new KeyboardEvent('keydown', { key:k, metaKey:!!meta, bubbles:true }));
  key('p'); await wait(120); out.Pキー = mark();
  key('v', true); await wait(120); out.metaVでは変わらない = mark();   /* ⚠️ 貼るを横取りしない */
  key('v'); await wait(120); out.Vキー = mark();
  /* ── 道具立てから入って本当に線が引けるか ── */
  const cv = document.querySelector('canvas');
  const cr = cv.getBoundingClientRect();
  const ev = (t,x,y) => cv.dispatchEvent(new PointerEvent(t,
    { clientX:x, clientY:y, button:0, buttons:1, bubbles:true, pointerId:1, pointerType:'mouse' }));
  out.描く前の図 = S.pieces.length;
  btn('pen').click(); await wait(150);
  ev('pointerdown', cr.left + cr.width*0.34, cr.top + cr.height*0.40);
  for(let i=1;i<=14;i++){ ev('pointermove', cr.left + cr.width*(0.34+0.30*i/14),
    cr.top + cr.height*(0.40 + Math.sin(i*0.5)*0.035)); await wait(20); }
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, pointerId:1 }));
  await wait(500);
  out.描いたあとの図 = S.pieces.length;
  return out;
});
if(process.argv[2]) await p.screenshot({ path: process.argv[2] });
await b.close();
let ng = 0;
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng++; };
console.log('── 左の道具立て');
if(R.無し){ console.log('  🔴 ' + R.無し); process.exit(1); }
ok(err === 0, 'JSエラーが出ない', err + '件');
ok(R.見えている, '版面の左に【見えている】（画面の中に大きさを持っている）');
/* ⚠️ 2026-08-27 に【消しゴム】が入って3つになった（増やすのはモードになるものだけ） */
ok(R.道具の数 === 3, '道具は3つ（選ぶ／描く／消しゴム）', R.道具の数 + 'つ');
ok(R.レイヤーと重ならない, '浮かぶレイヤーと重なっていない');
ok(R.描くを押した.中 && R.描くを押した.pen && R.描くを押した.右 && !R.描くを押した.sel,
   '✒️を押す＝描くに入る（右パネルの印も同時に点く）', JSON.stringify(R.描くを押した));
ok(!R.選ぶを押した.中 && R.選ぶを押した.sel && !R.選ぶを押した.右,
   '▶を押す＝選ぶに戻る', JSON.stringify(R.選ぶを押した));
ok(R.Pキー.中 && R.Pキー.pen, 'P キーでも描くに入る', JSON.stringify(R.Pキー));
ok(R.metaVでは変わらない.中, '⚠️ ⌘V（貼る）は道具を変えない', JSON.stringify(R.metaVでは変わらない));
ok(!R.Vキー.中 && R.Vキー.sel, 'V キーで選ぶに戻る', JSON.stringify(R.Vキー));
ok(R.描いたあとの図 - R.描く前の図 === 1, '道具立てから入って線が引ける（図が1つ増える）',
   `${R.描く前の図} → ${R.描いたあとの図}`);
process.exit(ng ? 1 : 0);
