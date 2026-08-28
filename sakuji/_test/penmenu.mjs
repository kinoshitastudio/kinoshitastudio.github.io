/* ⭐ 鉛筆・消しゴムのフライアウト ── 作字SAKUJI 2026-08-28
   木下＝「鉛筆に合わせるとこのように設定できるように」「消しゴムも同様に」
   ⭐⭐ 見るのは【値の持ち主が1つか】＝丸を押すと右パネルの欄まで動き、
      右パネルを触るとフライアウトも合う（同じ値が2箇所に住まない）。 */
import path from 'node:path'; import { fileURLToPath } from 'node:url';
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1400, height:900 });
const FILE = process.argv[2] || 'file://' + decodeURIComponent(path.join(HERE, '..', 'index.html'));
await p.goto(FILE, { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,3200));
let NG=0; const ok=(c,n,x)=>{ console.log((c?'  ✅ ':'  🔴 ')+n+(x!=null?' … '+x:'')); if(!c) NG=1; };
const open = id => p.evaluate(i => document.getElementById(i).classList.contains('open'), id);

ok(!(await open('penMenu')), 'はじめは閉じている');
await p.click('#tools button[data-tool="pencil"]'); await new Promise(r=>setTimeout(r,300));
ok(await open('penMenu'), '鉛筆を押すと開く');
ok(await p.evaluate(() => S.tool === 'pencil'), '道具も鉛筆になっている');
ok(await p.evaluate(() => document.querySelectorAll('#penW3 button').length === 3), 'WIDTH の丸が3つ');

/* 丸を押すと【右パネルの欄】まで動く＝値の持ち主は1つ */
await p.evaluate(() => document.querySelectorAll('#penW3 button')[2].click());
await new Promise(r=>setTimeout(r,250));
const v = await p.evaluate(() => ({ 欄:+document.getElementById('enpW').value, 写し:+document.getElementById('mPenW').value }));
ok(v.欄 === 22 && v.写し === 22, '丸を押すと右パネルの欄まで動く', JSON.stringify(v));

/* 右パネルを触ってもフライアウトが追いかける（食い違わない） */
await p.evaluate(() => { const a = document.getElementById('enpW'); a.value = 40; a.dispatchEvent(new Event('input',{bubbles:true})); });
await new Promise(r=>setTimeout(r,250));
ok(await p.evaluate(() => +document.getElementById('mPenW').value === 40), '右パネルを触るとフライアウトも合う');

/* 消しゴムに切り替えると、鉛筆のは閉じて消しゴムのが開く */
await p.click('#tools button[data-tool="eraser"]'); await new Promise(r=>setTimeout(r,300));
ok(!(await open('penMenu')) && await open('eraMenu'), '消しゴムに移ると入れ替わる');
/* 他の道具を押したら閉じる */
await p.click('#tools button[data-tool="select"]'); await new Promise(r=>setTimeout(r,300));
ok(!(await open('penMenu')) && !(await open('eraMenu')), '他の道具を押すと閉じる');
/* ⭐ カーソル（木下「鉛筆の時のマウスのカーソルもエンプツにして」「消しゴムも同様に」）
   🔴 色は「#000」と素で書く＝%23 と書くと二重に包まれて色が無効になる（2026-08-03 に踏んだ型） */
for(const [t, want] of [['pencil','3 21'], ['eraser','4 21']]){
  await p.evaluate(x => setTool(x), t);
  await new Promise(r=>setTimeout(r,150));
  const c = await p.evaluate(() => document.getElementById('cv').style.cursor);
  ok(/^url\(/.test(c) && !/%25/.test(c) && c.includes(') ' + want),
     t + ' のカーソルが絵になっている（芯の先が当たる所）', (c.match(/\) (\d+ \d+)/)||[])[1] || c.slice(0,20));
}
ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close(); process.exit(NG);
