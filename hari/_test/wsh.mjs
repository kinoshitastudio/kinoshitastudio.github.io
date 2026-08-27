/* ⭐⭐ 字ごとに横長・縦長をずらす（2026-08-28）
   木下＝「同じような感じで書体の横長をずらすのができるようになりたい。縦長も」
   参考＝THE PUBLIC.（字ごとに幅が違う組み方）

   ⭐ 〔分ける〕が「**字の種類**で変える」なら、こちらは「**何字目か**で変える」。
     ・振れ＝字ごとにばらつかせる（種で振れる）／並び＝先頭から末尾へ少しずつ変える
   ⭐⭐ 見るのは **字の幅がばらつくこと** と、**字送りも同じだけ変わること**
     （送りが元のままだと、細くしたのに隙間が空く＝この道具で何度も踏んだ型）。
   ⚠️ 0 のときは1つも通らない＝これまでと1画素も変わらない。
   使い方: node hari/_test/wsh.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1300, height:900, deviceScaleFactor:1 });
await p.goto(process.argv[2], { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3800));
const R = await p.evaluate(async () => {
  const w = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  const L = S.lines[0];
  S.sel = { kind:'line', i:0 };
  L.kind='narabu'; L.text='PUBLIC'; L.box={x:10,y:50,w:80,rot:0};
  syncPanel(); render(); await w(500);
  const widths = () => { const g = artItems().find(c => c.data && c.data.line === L.id);
    return g.children.map(it => Math.round(it.bounds.width)); };
  const gaps = () => { const g = artItems().find(c => c.data && c.data.line === L.id);
    const xs = g.children.map(it => it.bounds.left).sort((a,b)=>a-b);
    return xs.slice(1).map((x,i)=> Math.round(x - xs[i]));
  };
  const heights = () => { const g = artItems().find(c => c.data && c.data.line === L.id);
    return g.children.map(it => Math.round(it.bounds.height)); };
  out.はじめ = { 幅:widths(), 高さ:heights() };
  const set = async (id, v) => { const r = document.getElementById(id);
    r.value = String(v); r.dispatchEvent(new Event('input',{bubbles:true})); await w(400); };
  await set('wshX', 40);
  out.幅の振れ = { 幅:widths(), 送り:gaps() };
  await set('wshX', 0); await set('wshXR', 60);
  out.幅の並び = { 幅:widths() };
  await set('wshXR', 0); await set('wshY', 40);
  out.高さの振れ = { 高さ:heights() };
  await set('wshY', 0);
  out.戻る = { 幅:widths() };
  return out;
});
await b.close();
let ng = 0;
const ok = (c,n,note)=>{ console.log(`  ${c?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!c) ng++; };
const spread = a => Math.max(...a) - Math.min(...a);
console.log('── ⭐⭐ 字ごとに横長・縦長をずらす');
ok(errs.length === 0, 'JSエラーが出ない', errs.length + '件' + (errs[0] ? ' → ' + errs[0] : ''));
ok(JSON.stringify(R.幅の振れ.幅) !== JSON.stringify(R.はじめ.幅),
   '⭐⭐ 幅の振れ＝字ごとに幅がばらつく', JSON.stringify(R.幅の振れ.幅));
ok(spread(R.幅の振れ.送り) > 3,
   '⭐⭐ 【字送りも同じだけ変わる】（細くしたのに隙間が空く、を起こさない）',
   JSON.stringify(R.幅の振れ.送り));
ok(R.幅の並び.幅[5] > R.幅の並び.幅[0],
   '⭐ 幅の並び＝先頭から末尾へだんだん広くなる', JSON.stringify(R.幅の並び.幅));
ok(JSON.stringify(R.高さの振れ.高さ) !== JSON.stringify(R.はじめ.高さ),
   '⭐ 高さの振れ＝字ごとに高さがばらつく（縦長も）',
   JSON.stringify(R.はじめ.高さ) + ' → ' + JSON.stringify(R.高さの振れ.高さ));
ok(JSON.stringify(R.戻る.幅) === JSON.stringify(R.はじめ.幅),
   '⚠️ 0 に戻せば元どおり（分岐ごと通らない）', JSON.stringify(R.戻る.幅));
process.exit(ng ? 1 : 0);
