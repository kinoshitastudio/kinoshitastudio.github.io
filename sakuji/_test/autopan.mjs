/* ⭐ 盤が付いてくる（オートパン）── 作字SAKUJI 2026-08-28
   木下＝「ボードをかいているときやマウスでその先をいくときも、その先も一緒にボードがうごくように」
   見るのは：① 引きながら縁へ寄ると盤が動く ② 離すと止まる
            ③ 縁から離れていれば動かない ④ スペース（手のひら）中は動かない
            ⑤ 図形の座標は1つも書き換わらない（動くのは見る所だけ） */
import path from 'node:path'; import { fileURLToPath } from 'node:url';
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || 'file://' + decodeURIComponent(path.join(HERE, '..', 'index.html'));
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1200, height:800 });
await p.goto(FILE, { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,3200));
let NG=0; const ok=(c,n,x)=>{ console.log((c?'  ✅ ':'  🔴 ')+n+(x!=null?' … '+x:'')); if(!c) NG=1; };

const center = () => p.evaluate(() => ({ x:Math.round(paper.view.center.x), y:Math.round(paper.view.center.y) }));
/* ⚠️ 引いている道具なので線は増える＝【もとから在る1本】の座標だけ見る
   （増えた本数まで見ると「動いた」と誤って落ちる） */
const shapes = () => p.evaluate(() => Math.round(artLayer.children[0].bounds.x));
await p.evaluate(() => {
  artLayer.removeChildren();
  new paper.Path({ segments:[[300,300],[500,300]], strokeColor:'#111', strokeWidth:6 });
  setTool('stroke'); guides(); paper.view.update();
});
const c0 = await center(), s0 = await shapes();

/* ③ 真ん中で押しても動かない */
await p.mouse.move(600, 400);
await p.mouse.down();
await new Promise(r=>setTimeout(r,400));
const c1 = await center();
ok(c1.x === c0.x && c1.y === c0.y, '縁から離れていれば動かない', JSON.stringify(c1));

/* ① 縁へ寄せると動く */
await p.mouse.move(1180, 400, { steps:4 });
await new Promise(r=>setTimeout(r,700));
const c2 = await center();
ok(c2.x > c1.x + 5, '右の縁へ寄せると盤が右へ滑る', `${c1.x} → ${c2.x}`);

/* ② 離すと止まる */
await p.mouse.up();
await new Promise(r=>setTimeout(r,500));
const c3 = await center();
await new Promise(r=>setTimeout(r,500));
const c4 = await center();
ok(c3.x === c4.x, '離すと止まる', `${c3.x} → ${c4.x}`);

/* ⑤ 図形は動いていない */
ok((await shapes()) === s0, '図形の座標は動かない（動くのは見る所だけ）', s0 + ' → ' + (await shapes()));

/* ④ スペース（手のひら）中は【こちらは】動かさない
   ⚠️ 本体のスペースパンは動く＝それと区別するために、押しっぱなしで止まっているときに見る
      （オートパンなら縁に居るだけで滑り続ける）。 */
await p.evaluate(() => { S.spaceDown = true; });
await p.mouse.move(1180, 400); await p.mouse.down();
await new Promise(r=>setTimeout(r,300));
const c5 = await center();
await new Promise(r=>setTimeout(r,600));
const c6 = await center();
await p.mouse.up();
await p.evaluate(() => { S.spaceDown = false; });
ok(c6.x === c5.x, 'スペース（手のひら）中はオートパンしない（滑り続けない）', `${c5.x} → ${c6.x}`);
ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close(); process.exit(NG);
