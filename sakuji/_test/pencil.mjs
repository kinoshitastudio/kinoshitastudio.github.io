/* ⭐⭐ 下描き（鉛筆・消しゴム）── 作字SAKUJI 2026-08-28
   木下＝「Sakuji にも鉛筆や消しゴムなどの機能も追加できそう？」→「おけ、それら進めて」
   🔴 鉛筆は【紙に焼いた画像】なので作品の層には混ぜられない（SVG にも .ttf にも出せなくなる）。
      だから【下描きの層】に置き、書き出しには入れない。
   見るのは：
     ① 鉛筆で引くと下描きの層に1本増える（作品の層は増えない）
     ② 何度も引くと濃くなる（1粒は薄い）
     ③ 消しゴムでこすると薄くなるが【全部は消えない】（跡が残る）／消しカスが出る
     ④ 書き出しに入らない（withCleanView の間だけ層が隠れる）
     ⑤ 「下描きを図にする」で作品の層へ移る
     ⑥ ⌘Z が下描きに効く
   使い方: node sakuji/_test/pencil.mjs <URL> */
import path from 'node:path'; import { fileURLToPath } from 'node:url';
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

/* ⚠️ paper.js は MouseEvent を見る（PointerEvent では拾わない） */
const draw = (x1,y1,x2,y2,steps=14) => p.evaluate(([a,b,c,d,n]) => {
  const cv = document.querySelector('canvas');
  const ev = (t,x,y) => cv.dispatchEvent(new MouseEvent(t, { clientX:x, clientY:y, button:0, buttons:1, bubbles:true }));
  ev('mousedown', a, b);
  for(let i=1;i<=n;i++) ev('mousemove', a+(c-a)*i/n, b+(d-b)*i/n);
  ev('mouseup', c, d);
}, [x1,y1,x2,y2,steps]);

const st = () => p.evaluate(() => ({
  下描き: sketchLayer.children.length,
  作品: artLayer.children.length,
  /* ⭐ 濃さの物差しは【骨の消し量 q の合計】＝本体が焼くときに見ているのと同じ値。
     ⚠️ 焼いた紙の画素を読むと「読むこと自体が canvas の描き方を変える」ので使わない
        （[[feedback_reading_pixels_changes_how_it_draws]]）。 */
  濃さ: sketchLayer.children.filter(c => c.data && c.data.enp)
          .reduce((s, c) => s + (c.data.enp.q || []).reduce((a,b)=>a+b, 0), 0),
  焼けている: sketchLayer.children.filter(c => c.data && c.data.enp)
          .every(c => !!(c.image || c.canvas) && c.bounds.width > 1),
  カス: sketchLayer.children.filter(c => c.data && c.data.kasu).reduce((n,g)=>n+g.children.length,0),
}));

await p.evaluate(() => { setTool('pencil'); });
await draw(500, 400, 760, 520);
await new Promise(r=>setTimeout(r,500));
const A = await st();
ok(A.下描き === 1, '鉛筆で引くと下描きが1本', JSON.stringify(A));
ok(A.作品 === 0, '作品の層は増えない（ラフは作品に混ざらない）', A.作品 + ' 個');
ok(A.焼けている && A.濃さ > 0, '紙に焼けている', A.濃さ);

/* ② 同じ所をもう一度引くと濃くなる（1本ずつ増えて重なる） */
await draw(500, 400, 760, 520);
await new Promise(r=>setTimeout(r,500));
const B = await st();
ok(B.下描き === 2, 'もう一度引くともう1本（重ねて濃くする道具）', B.下描き + ' 本');

/* ③ 消しゴム */
await p.evaluate(() => { setTool('eraser'); });
await draw(600, 445, 660, 473, 10);
await new Promise(r=>setTimeout(r,600));
const C = await st();
ok(C.濃さ < B.濃さ, '消しゴムでこすると薄くなる', B.濃さ + ' → ' + C.濃さ);
ok(C.濃さ > 0, '⭐ 全部は消えない（跡が残る）', C.濃さ);
ok(C.カス > 0, '消しカスが出る', C.カス + ' 粒');
const q = await p.evaluate(() => {
  const d = sketchLayer.children.find(c => c.data && c.data.enp).data.enp;
  const q = d.q || []; return { 最小:Math.min(...q), 最大:Math.max(...q) };
});
ok(q.最小 > 0 && q.最小 < 1, 'こすった所だけ薄い（消し量が点ごとに入る）', JSON.stringify(q));

/* ④ 書き出しに入らない */
const hid = await p.evaluate(() => new Promise(res => {
  withCleanView(done => { const v = sketchLayer.visible; done(); res({ 書き出し中:v, 戻ったか:sketchLayer.visible }); });
}));
ok(hid.書き出し中 === false && hid.戻ったか === true, '書き出しの間だけ下描きが隠れる', JSON.stringify(hid));

/* ⑥ ⌘Z が下描きに効く */
await p.evaluate(() => undo());
await new Promise(r=>setTimeout(r,400));
const D = await st();
ok(D.下描き !== C.下描き || D.カス !== C.カス, '⌘Z が下描きに効く', `${C.下描き}本/${C.カス}粒 → ${D.下描き}本/${D.カス}粒`);

/* ⑤ 下描きを図にする */
await p.evaluate(() => document.getElementById('enpToArt').click());
await new Promise(r=>setTimeout(r,500));
const E = await st();
ok(E.下描き === 0 && E.作品 > 0, '「下描きを図にする」で作品の層へ移る', `下描き ${E.下描き} / 作品 ${E.作品}`);

ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close();
process.exit(NG);
