/* ⭐ 枠を外したら升目も出さない ── 作字SAKUJI 2026-08-28
   木下＝「枠のパネルを外すと全体が白いボードになるが、常に真ん中にこれがあるのはやだな」 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || 'file://' + decodeURIComponent(path.join(HERE, '..', 'index.html'));
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1500, height:950 });
await p.goto(FILE, { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,3200));
let NG=0; const ok=(c,n,x)=>{ console.log((c?'  ✅ ':'  🔴 ')+n+(x!=null?' … '+x:'')); if(!c) NG=1; };
/* ⭐ 数えるのは【線として引かれた升目】だけ。
   ⚠️ 枠を外すと「画面ぜんぶが地」の白い面が1枚 gridLayer に入る＝これは残ってよいもの。
      数に入れると「消えていない」に見える（実測で1本残って落ちた）。 */
const grid = () => p.evaluate(() => gridLayer.children.filter(c => c.strokeColor).length);

await p.evaluate(() => { S.abOn = true; S.grid = true; abSync(); paper.view.update(); });
await new Promise(r=>setTimeout(r,400));
const 枠あり = await grid();
ok(枠あり > 0, '枠を出していれば升目は出る（今までどおり）', 枠あり + ' 本');

await p.evaluate(() => { S.abOn = false; abSync(); paper.view.update(); });
await new Promise(r=>setTimeout(r,400));
ok(await grid() === 0, '枠を外すと升目も消える', (await grid()) + ' 本');
ok(await p.evaluate(() => S.grid === true), 'つまみ（升目を出す）は書き換えていない');

await p.evaluate(() => { S.abOn = true; abSync(); paper.view.update(); });
await new Promise(r=>setTimeout(r,400));
ok(await grid() === 枠あり, '枠を戻すと同じ升目がそのまま戻る', (await grid()) + ' vs ' + 枠あり + ' 本');

/* 盤の上の「枠」ボタンからでも同じ道を通る */
await p.evaluate(() => document.getElementById('abBtn').click());
await new Promise(r=>setTimeout(r,400));
ok(await grid() === 0, '盤の上の【枠】ボタンからでも消える');
ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close();
process.exit(NG);
