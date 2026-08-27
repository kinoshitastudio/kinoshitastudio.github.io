/* ⭐ 傾けた行の【端】を掴んで幅を変える（2026-08-27 に見つけた古い不具合）
   🔴 掴む処理の中で `const pt` に代入し直していた＝
      「傾けた行の端を掴む」と Assignment to constant variable. で止まり、
      **触れるのに何も起きない**（幅が1ミリも動かない）状態だった。
      ⚠️ 例外は画面に出ないので、木下からは「効かない」としか見えない。
   ⭐ 見るのは「落ちない」ではなく【幅が実際に変わるか】。
   ⚠️ 直す前の版に当てると落ちる（＝この試験は効いている）。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[3] || path.join(HERE, '..', 'index.html');
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto('file://' + decodeURIComponent(path.resolve(FILE)), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3500));

const R = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const cv = document.querySelector('canvas');
  const ev = (t,x,y) => cv.dispatchEvent(new PointerEvent(t,
    { clientX:x, clientY:y, button:0, buttons:1, bubbles:true, pointerId:1, pointerType:'mouse' }));
  /* 端を掴んで、左へ引く。返り値＝幅がいくつになったか */
  const pull = async rot => {
    S.sel = { kind:'line', i:0 };
    S.lines[0].kind = 'haru';
    S.lines[0].box = { x:20, y:50, w:60, rot };
    syncPanel(); render(); await w(400);
    const h = uiLayer.children.filter(c => c.data && c.data.boxEnd !== undefined);
    if(!h.length) return { 無し:'箱の端の掴み手が出ていない' };
    const q = h.find(c => c.data.boxEnd === 1) || h[0];
    /* ⚠️ 掴み手は入れ物ごと返っていることがある＝親から global へ持ち上げる */
    const c0 = q.parent ? q.parent.localToGlobal(q.bounds.center) : q.bounds.center;
    const v = paper.view.projectToView(c0);
    const r = cv.getBoundingClientRect();
    const X = r.left + v.x, Y = r.top + v.y;
    ev('pointerdown', X, Y);
    for(let i=1;i<=6;i++){ ev('pointermove', X - 12*i, Y); await w(30); }
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, pointerId:1 }));
    await w(300);
    return { 前:60, 後:Math.round(S.lines[0].box.w * 100)/100 };
  };
  out.まっすぐ = await pull(0);
  out.傾けた   = await pull(22);
  return out;
});
await b.close();

let ng = 0;
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng++; };
console.log('── ⭐ 傾けた行の端を掴んで幅を変える');
ok(errs.length === 0, 'JSエラーが出ない', errs.length + '件' + (errs[0] ? ' → ' + errs[0] : ''));
ok(R.まっすぐ && R.まっすぐ.後 < 58, 'まっすぐな行＝端を引くと幅が縮む', JSON.stringify(R.まっすぐ));
ok(R.傾けた && R.傾けた.後 < 58,
   '🔴 傾けた行でも幅が縮む（触れるのに効かない、を残さない）', JSON.stringify(R.傾けた));
process.exit(ng ? 1 : 0);
