/* ⭐⭐ 消しカスを控えて、まとめて捨てる（2026-08-27）
   木下＝「鉛筆のカスも保存できるようにしておこう。不要な時は消しゴムのカスを削除などを用意して」

   見るのは「落ちない」ではなく **開き直したときに同じカスが戻るか**：
     ⭐⭐ 保存 → 開き直し で【粒の数も、絵も】そのまま戻る（＝1粒ずつ控えている証明）
     ⭐ 「消しカスを捨てる」で【カスだけ】消える（鉛筆の線は残る）／⌘Z で戻る
     ⭐ ボタンに数が出る／カスが無いときは押せない（触れるのに効かない、を作らない）
     ⭐ 一覧で「消しカス n粒」と分かる（前は「SVG」と出ていて何なのか分からなかった）
   ⚠️ pointerup は window に付いている（cv ではない）。
   ⚠️ 直す前の版では、開き直すとカスが消える＝落ちる。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[3] || path.join(HERE, '..', 'index.html');
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage(); let err=0;
p.on('pageerror', e => { err++; console.log('🔴', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto('file://' + decodeURIComponent(path.resolve(FILE)), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3500));

const R = await p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  if(!document.getElementById('clearKasu')) return { 無し:'「消しカスを捨てる」が無い' };
  const cv = document.querySelector('canvas');
  const ev = (t,x,y) => cv.dispatchEvent(new PointerEvent(t,
    { clientX:x, clientY:y, button:0, buttons:1, bubbles:true, pointerId:1, pointerType:'mouse' }));
  const shot = () => { const c = document.createElement('canvas'); c.width = 340; c.height = 340;
    c.getContext('2d').drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, 340, 340);
    return c.getContext('2d').getImageData(0,0,340,340).data; };
  const diff = (a,c) => { let n=0; for(let i=0;i<a.length;i+=4){
    if(Math.abs(a[i]-c[i])+Math.abs(a[i+1]-c[i+1])+Math.abs(a[i+2]-c[i+2]) > 10) n++; } return n; };
  const 粒 = () => S.pieces.filter(x => x.kasu && x.kasu.length)
                          .reduce((a,x) => a + x.kasu.length, 0);
  const こすり = () => S.pieces.filter(x => x.kasu && x.kasu.length).length;

  /* ══ ① カスが無いうちはボタンが押せない ══ */
  out.はじめは押せない = !!document.getElementById('clearKasu').disabled;

  /* ══ ② 鉛筆で1本引いて、こする ══ */
  const r = cv.getBoundingClientRect();
  document.getElementById('bPen').click(); await wait(200);
  { const sel = document.getElementById('feel');
    sel.value = 'enpitsu'; sel.dispatchEvent(new Event('change', { bubbles:true })); await wait(200); }
  const y = r.top + r.height*0.42;
  ev('pointerdown', r.left + r.width*0.26, y);
  for(let i=1;i<=16;i++){ ev('pointermove', r.left + r.width*(0.26 + 0.32*i/16), y); await wait(16); }
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, pointerId:1 }));
  await wait(500);
  const 線の数 = S.pieces.filter(x => x.pen).length;

  document.dispatchEvent(new KeyboardEvent('keydown', { key:'e', bubbles:true })); await wait(200);
  /* ⚠️ 消しカスは【出るか出ないか】が乱数なので、何度もこすって必ず出す */
  for(let k=0;k<4;k++){
    ev('pointerdown', r.left + r.width*0.30, y);
    for(let i=1;i<=14;i++){ ev('pointermove', r.left + r.width*(0.30 + 0.22*i/14), y); await wait(16); }
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, pointerId:1 }));
    await wait(200);
  }
  document.dispatchEvent(new KeyboardEvent('keydown', { key:'v', bubbles:true })); await wait(200);
  S.sel = { kind:null, i:null }; syncPanel(); render(); await wait(250);
  out.カスが出る = { こすり:こすり(), 粒:粒(), 線:線の数 };
  out.ボタンに数 = (document.getElementById('clearKasu').textContent || '').replace(/\s/g,'');
  out.一覧の名 = [...document.querySelectorAll('#lineList .li .t')].map(e => e.textContent)
                  .filter(t => /消しカス/.test(t)).length;
  const 前の絵 = shot();

  /* ══ ③⭐⭐ 保存 → 開き直し で同じカスが戻る ══ */
  let json = null;
  const dl0 = window.dl;
  window.dl = (blob, name) => { if(/json$/.test(name)) json = blob; };
  document.getElementById('eJSON').click(); await wait(400);
  window.dl = dl0;
  if(!json) return Object.assign(out, { 控え無し:true });
  const txt = await json.text();
  const d = JSON.parse(txt);
  out.控えの中 = { カスの図:(d.pieces||[]).filter(x => x.kasu && x.kasu.length).length,
                   控えた粒:(d.pieces||[]).reduce((a,x) => a + ((x.kasu||[]).length), 0) };
  const f = new File([txt], 'hari.json', { type:'application/json' });
  const dt = new DataTransfer(); dt.items.add(f);
  const inp = document.getElementById('fJSON');
  inp.files = dt.files;
  inp.dispatchEvent(new Event('change', { bubbles:true }));
  await wait(1400);
  S.sel = { kind:null, i:null }; syncPanel(); render(); await wait(300);
  out.開き直し = { こすり:こすり(), 粒:粒(), 線:S.pieces.filter(x => x.pen).length };
  out.絵のちがい = diff(前の絵, shot());

  /* ══ ④ まとめて捨てる＝カスだけ消える（線は残る） ══ */
  document.getElementById('clearKasu').click(); await wait(400);
  out.捨てたあと = { 粒:粒(), 線:S.pieces.filter(x => x.pen).length,
                     押せない:!!document.getElementById('clearKasu').disabled };
  /* ══ ⑤ ⌘Z で戻る ══ */
  document.dispatchEvent(new KeyboardEvent('keydown', { key:'z', metaKey:true, bubbles:true }));
  await wait(500);
  out.戻せる = { 粒:粒(), 線:S.pieces.filter(x => x.pen).length };

  /* ══ ⑥ 「選んだ図を消す」も ⌘Z で戻る（消す道は2つ・しまう置き場は1つ） ══ */
  { const i = S.pieces.findIndex(x => x.pen);
    S.sel = { kind:'piece', i }; syncPanel(); await wait(150);
    document.getElementById('delPiece').click(); await wait(350);
    const 消えた = S.pieces.filter(x => x.pen).length;
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'z', metaKey:true, bubbles:true }));
    await wait(500);
    out.図も戻る = { 消えた, 戻った:S.pieces.filter(x => x.pen).length }; }
  return out;
});
if(process.argv[2]) await p.screenshot({ path: process.argv[2] });
await b.close();

let ng = 0;
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng++; };
console.log('── ⭐⭐ 消しカスを控える／まとめて捨てる');
if(R.無し){ console.log('  🔴 ' + R.無し); process.exit(1); }
ok(err === 0, 'JSエラーが出ない', err + '件');
ok(R.はじめは押せない, '⭐ カスが無いうちは押せない（触れるのに効かない、を作らない）');
ok(R.カスが出る.粒 > 0, '⭐ こすると消しカスが出る', JSON.stringify(R.カスが出る));
ok(/（\d+）/.test(R.ボタンに数) || /\(\d+\)/.test(R.ボタンに数),
   '⭐ ボタンに【何個消えるか】が出る', R.ボタンに数);
ok(R.一覧の名 > 0, '⭐ 一覧で「消しカス n粒」と分かる', R.一覧の名 + '件');
if(R.控え無し){ ok(false, '控えが出なかった'); }
else {
  ok(R.控えの中.控えた粒 === R.カスが出る.粒 && R.控えの中.カスの図 === R.カスが出る.こすり,
     '⭐⭐ 控え（JSON）に粒がそのまま入る', JSON.stringify(R.控えの中));
  ok(R.開き直し.粒 === R.カスが出る.粒 && R.開き直し.こすり === R.カスが出る.こすり,
     '⭐⭐ 開き直すと【同じ数のカス】が戻る',
     JSON.stringify(R.カスが出る) + ' → ' + JSON.stringify(R.開き直し));
  ok(R.絵のちがい < 60, '⭐⭐ 開き直した【絵】も同じ（粒が1つも動いていない）', R.絵のちがい + '画素');
  ok(R.捨てたあと.粒 === 0 && R.捨てたあと.線 === R.開き直し.線,
     '⭐ まとめて捨てると【カスだけ】消える（鉛筆の線は残る）', JSON.stringify(R.捨てたあと));
  ok(R.捨てたあと.押せない, '⚠️ 捨てたあとは押せなくなる');
  ok(R.戻せる.粒 === R.開き直し.粒, '⭐ ⌘Z で戻る', JSON.stringify(R.戻せる));
  ok(R.図も戻る && R.図も戻る.消えた === 0 && R.図も戻る.戻った === 1,
     '⭐⭐ 「選んだ図を消す」も ⌘Z で戻る（前は戻らなかった）', JSON.stringify(R.図も戻る));
}
process.exit(ng ? 1 : 0);
