/* ⭐⭐ 紙の質感（2026-08-26）
   木下＝「HARI に紙の質感を増やしてほしい。そして Figma でいうオーバーレイでの
   質感の紙の上に載せるのをやると、より紙らしくなるのでは？」

   見るのは「落ちない」ではなく **重なっているか・作品を壊していないか**：
     ・なし＝いままでの絵と【1画素も変わらない】（分岐ごと通さない）
     ・質感を入れると画素が変わる／重ね方を変えると変わる
     ・同じ種なら【1画素も同じ】（振らない限り化けない）／種を変えると変わる
     ・⚠️ 作品の物にならない＝図の数は増えない・掴む一覧に出ない
     ・⭐ PNG にも焼かれる（画面と焼いた絵が一致する）
     ・⭐ SVG では mix-blend-mode で重ねている
   ⚠️ 直す前の版には #segKami が無いので落ちる。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage(); let err=0;
p.on('pageerror', e => { err++; console.log('🔴', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[3] || path.join(HERE, '..', 'index.html');
await p.goto('file://' + decodeURIComponent(FILE), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3500));
const R = await p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  if(!document.getElementById('segKami')) return { 無し:'紙の質感（#segKami）が無い' };
  const cv = document.querySelector('canvas');
  /* ⚠️ 版面の中だけを見る（外の影や道具立ては見ない） */
  const shot = () => { const c = document.createElement('canvas');
    c.width = cv.width; c.height = cv.height;
    c.getContext('2d').drawImage(cv, 0, 0);
    return c.getContext('2d').getImageData(0, 0, c.width, c.height).data; };
  const diff = (a, b2) => { let n = 0;
    for(let i = 0; i < a.length; i += 4) if(Math.abs(a[i]-b2[i]) > 3) n++;
    return n; };
  const set = async o => { Object.entries(o).forEach(([k,v]) => kamiSet(k, v)); await wait(450); };

  await wait(200);
  const 図0 = S.pieces.length, 物0 = artItems().length;
  const base = shot();
  /* ① なし＝1画素も変わらない（強さだけ入れても、なしなら通らない） */
  await set({ amt:80 });
  out.なしのまま = diff(base, shot());
  /* ② 入れると変わる */
  await set({ on:'zara', blend:'multiply', amt:60, sc:50, seed:7 });
  const zara = shot();
  out.入れると変わる = diff(base, zara);
  /* ③ 同じ種なら1画素も同じ／種を変えると変わる */
  await set({ seed:8 }); const s8 = shot();
  await set({ seed:7 }); const s7 = shot();
  out.種を変えると変わる = diff(zara, s8);
  out.同じ種なら同じ = diff(zara, s7);
  /* ④ 重ね方を変えると変わる */
  await set({ blend:'overlay' });
  out.重ね方で変わる = diff(zara, shot());
  /* ⑤ 作品の物にならない */
  out.図の数 = [図0, S.pieces.length];
  out.掴む一覧 = [物0, artItems().length];
  out.掴めない = !!(artLayer.getItems({ recursive:true, match:it => it.data && it.data.kami })
                    .every(it => it.locked));
  /* ⑥ PNG にも焼かれている（同じ render を通っているか） */
  const pngOn = await bakeCanvas();
  const g = pngOn.getContext('2d');
  const mid = g.getImageData(Math.round(pngOn.width*0.2), Math.round(pngOn.height*0.2),
                             200, 200).data;
  let lo = 255, hi = 0;
  for(let i = 0; i < mid.length; i += 4){ lo = Math.min(lo, mid[i]); hi = Math.max(hi, mid[i]); }
  out.PNGのむら = hi - lo;                      /* 質感が焼かれていれば地の中に濃淡がある */
  await set({ on:'none' });
  const pngOff = await bakeCanvas();
  const g2 = pngOff.getContext('2d');
  const mid2 = g2.getImageData(Math.round(pngOff.width*0.2), Math.round(pngOff.height*0.2),
                               200, 200).data;
  let lo2 = 255, hi2 = 0;
  for(let i = 0; i < mid2.length; i += 4){ lo2 = Math.min(lo2, mid2[i]); hi2 = Math.max(hi2, mid2[i]); }
  out.PNGなしのむら = hi2 - lo2;
  /* ⑦ SVG に mix-blend-mode が入る */
  await set({ on:'mura', blend:'overlay', amt:50 });
  const svg = artLayer.exportSVG({ asString:true,
    bounds:new paper.Rectangle(0,0,S.board.w,S.board.h) });
  out.SVGに紙がある = /id="kami"/.test(svg);
  out.SVGの重ね方 = /<image[^>]*id="kami"/.test(svg);
  /* ⑧ つまみの出し分け（向きは簾目と繊維だけ） */
  await set({ on:'zara' });
  out.向きは出さない = getComputedStyle(document.getElementById('rowKAng')).display === 'none';
  await set({ on:'me' });
  out.向きを出す = getComputedStyle(document.getElementById('rowKAng')).display !== 'none';
  await set({ on:'none' });
  out.なしなら畳む = getComputedStyle(document.getElementById('kamiUI')).display === 'none';

  /* ══⭐⭐ 2枚（2026-08-27 木下「乗算やオーバーレイなど、どれかしか選べなくない？」
     「一番上にオーバーレイで乗せると【オブジェクトにも】加工がきそう」）
     見るのは **下は物に掛からない／上は物にも掛かる**＝木下が見ていた違和感そのもの。 */
  const setU = async o => { Object.entries(o).forEach(([k,v]) => kamiSet(k, v, 'kamiU')); await wait(450); };
  await set({ on:'none' }); await setU({ on:'none' });
  const b0 = shot();
  /* 字の画素（暗い所）と紙の画素（明るい所）を分けて、動いた量を測る */
  const ink = [], pap = [];
  for(let i = 0; i < b0.length; i += 4){ if(b0[i+3] < 200) continue;
    if(b0[i] < 90) ink.push(i); else if(b0[i] > 200) pap.push(i); }
  const moved = (a, idx) => Math.round(idx.reduce((s,i) => s + Math.abs(a[i]-b0[i]), 0)
                                       / Math.max(1, idx.length) * 10) / 10;
  await setU({ on:'zara', blend:'multiply', amt:60, sc:50, seed:3 });
  { const a = shot(); out.下だけ = { 字:moved(a, ink), 紙:moved(a, pap) }; }
  await setU({ on:'none' });
  await set({ on:'zara', blend:'overlay', amt:60, sc:50, seed:3 });
  { const a = shot(); out.上だけ = { 字:moved(a, ink), 紙:moved(a, pap) }; }
  /* 2枚同時＝重ね方を2つ持てる（乗算の紙＋オーバーレイの刷り） */
  await setU({ on:'zara', blend:'multiply', amt:60, sc:50, seed:3 });
  { const a = shot(); out.二枚 = { 字:moved(a, ink), 紙:moved(a, pap) }; }
  out.重ね方は別々 = { 下:(S.kamiU||{}).blend, 上:(S.kami||{}).blend };
  out.紙は2枚 = artLayer.getItems({ recursive:true, match:it => it.data && it.data.kami }).length;
  await set({ on:'none' }); await setU({ on:'none' });
  out.両方なしで戻る = (() => { let n = 0; const a = shot();
    for(let i = 0; i < a.length; i += 4) if(Math.abs(a[i]-b0[i]) > 3) n++; return n; })();
  return out;
});
if(process.argv[2]) await p.screenshot({ path: process.argv[2] });
await b.close();
let ng = 0;
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng++; };
console.log('── 紙の質感');
if(R.無し){ console.log('  🔴 ' + R.無し); process.exit(1); }
ok(err === 0, 'JSエラーが出ない', err + '件');
ok(R.なしのまま === 0, '⭐ なし＝いままでの絵と1画素も変わらない', R.なしのまま + '画素');
ok(R.入れると変わる > 20000, '質感を入れると絵が変わる', R.入れると変わる + '画素');
ok(R.種を変えると変わる > 5000, '種を変えると紙が変わる（振れる）', R.種を変えると変わる + '画素');
ok(R.同じ種なら同じ === 0, '⭐ 同じ種なら1画素も同じ（化けない）', R.同じ種なら同じ + '画素');
ok(R.重ね方で変わる > 20000, '重ね方（乗算／オーバーレイ）で変わる', R.重ね方で変わる + '画素');
ok(R.図の数[0] === R.図の数[1], '⚠️ 作品の図は増えない', R.図の数.join(' → '));
ok(R.掴む一覧[0] === R.掴む一覧[1], '⚠️ 掴む一覧に出ない', R.掴む一覧.join(' → '));
ok(R.掴めない, '⚠️ 紙は掴めない（locked）');
ok(R.PNGのむら > 12 && R.PNGなしのむら <= 12, '⭐ PNG にも焼かれる（画面と焼いた絵が一致）',
   `質感あり ${R.PNGのむら} ／ なし ${R.PNGなしのむら}`);
ok(R.SVGに紙がある && R.SVGの重ね方, '⭐ SVG にも紙が1枚出る（mix-blend-mode で重ねる）');
ok(R.向きは出さない, '⚠️ ざらでは【向き】を出さない（触れるのに効かない、を残さない）');
ok(R.向きを出す, '⭐ 簾目では【向き】が出る');
ok(R.なしなら畳む, '⚠️ なしのときはつまみを畳む');
console.log('── 紙は2枚（地に／ぜんぶに）');
ok(R.下だけ.字 < 1.5 && R.下だけ.紙 > 6,
   '⭐⭐ 下（地に）＝紙だけが荒れて【字には掛からない】', JSON.stringify(R.下だけ));
ok(R.上だけ.字 > 2.5, '⭐⭐ 上（ぜんぶに）＝【字にも掛かる】', JSON.stringify(R.上だけ));
ok(R.二枚.字 > 2.5 && R.二枚.紙 > R.上だけ.紙,
   '⭐ 2枚同時＝紙は深く・字にも乗る', JSON.stringify(R.二枚));
ok(R.重ね方は別々.下 === 'multiply' && R.重ね方は別々.上 === 'overlay',
   '⭐⭐ 重ね方を【2つ同時に】持てる（乗算の紙＋オーバーレイの刷り）',
   JSON.stringify(R.重ね方は別々));
ok(R.紙は2枚 === 2, '紙は2枚とも版面に乗る', R.紙は2枚 + '枚');
ok(R.両方なしで戻る === 0, '⚠️ 両方なしに戻すと1画素も変わらない', R.両方なしで戻る + '画素');
process.exit(ng ? 1 : 0);
