/* ⭐ 見出しを帯にする ── 作字SAKUJI 2026-08-28
   木下＝「HARI のサイドパネルのようにセクションごとの大きなタイトル背景は黒にし、みやすくさせたり」
   ⭐⭐ 帯は【地の反対側】に置く（HARI で決めたこと）＝色を固定すると、どちらかの明るさで必ず沈む。
   見るのは：① 両方の明るさで帯と文字の差が十分あるか ② 透かしていないか ③ 節ぜんぶに効いているか
   ⚠️ 見た目の直しも【実測】する。テーマは両方測る。 */
import path from 'node:path'; import { fileURLToPath } from 'node:url';
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || 'file://' + decodeURIComponent(path.join(HERE, '..', 'index.html'));
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1500, height:950 });
await p.goto(FILE, { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,3000));
let NG=0; const ok=(c,n,x)=>{ console.log((c?'  ✅ ':'  🔴 ')+n+(x!=null?' … '+x:'')); if(!c) NG=1; };

const read = () => p.evaluate(() => {
  const lum = c => { const m=/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(c)||[];
    return (+m[1]*0.2126 + +m[2]*0.7152 + +m[3]*0.0722)/255; };
  const hs = [...document.querySelectorAll('#panel h2')];
  const c = getComputedStyle(hs[0]);
  const panel = getComputedStyle(document.getElementById('panel')).backgroundColor;
  return { 節の数:hs.length,
           帯:lum(c.backgroundColor), 文字:lum(c.color), 地:lum(panel),
           透かし:c.backdropFilter,
           /* 節ぜんぶが同じ帯か（1つだけ違う＝直し漏れ） */
           ぜんぶ同じ: hs.every(h => getComputedStyle(h).backgroundColor === c.backgroundColor) };
});

for(const [name, light] of [['ダーク', false], ['ライト', true]]){
  if(light) await p.evaluate(() => document.body.classList.add('ui-light'));
  await new Promise(r=>setTimeout(r,300));
  const R = await read();
  ok(Math.abs(R.帯 - R.文字) > 0.5, name + '：帯と文字がはっきり分かれる',
     `帯 ${R.帯.toFixed(2)} / 文字 ${R.文字.toFixed(2)}`);
  ok(Math.abs(R.帯 - R.地) > 0.35, name + '：帯が地から浮いている（沈んでいない）',
     `帯 ${R.帯.toFixed(2)} / 地 ${R.地.toFixed(2)}`);
  ok(R.透かし === 'none', name + '：透かしていない（下の字が透けると帯に見えない）', R.透かし);
  ok(R.ぜんぶ同じ, name + '：節ぜんぶに効いている', R.節の数 + ' 節');
}
ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close();
process.exit(NG);
