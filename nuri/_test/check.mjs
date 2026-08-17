/* ⭐ 塗 NURI の回帰テスト（2026-08-15・公開に合わせて新設）
   🔴 見るのは「エラーが出ないか」ではなく、この道具の芯が生きているかを数字で見る：
     ① 筆で塗ると【場】に溜まる（画素に直接色を塗っていない＝場を消せば絵も消える）
     ② 塗った所ごとに色が載る（2色で塗って、両方が画面に出ているか）
     ③ 粒間の芯＝【谷が紙の色に落ちない】（地を敷いている）
     ④ 粒（玉/平ら/泡）と 地（泡の入/切）が【別々に】効く
     ⑤ 型を押すと、前に触った値が残っていても【まとめて上書きされる】
     ⑥ つまみが絵に効く／⌘Z で戻る／PNG が落ちる／大きい版でも現実的な速さ */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL = process.argv[2] || 'http://localhost:8340/nuri/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage();
let errs = 0; p.on('pageerror', e => { errs++; console.log('🔴 JSエラー:', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(URL, { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
await p.evaluate(() => { try{ localStorage.clear(); }catch(_){} });
await p.reload({ waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 1500));

let ng = [];
const check = (ok, name, note) => { console.log(`  ${ok ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!ok) ng.push(name); };
const wait = ms => new Promise(r => setTimeout(r, ms));
/* 落ちてくるものを横取り */
await p.evaluate(() => { window.__got = [];
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(x){ window.__got.push({ size:x.size, type:x.type }); return oc.call(URL, x); }; });

/* ⭐ 物差し＝【出す絵】（本体の render をそのまま呼ぶ）。
   🔴 2026-08-17 に画面の画素から乗り換えた。盤を【窓】にしたので、画面では版面が小さく写り、
      粒の角（sq）のようなつまみの効きが画面のハッシュでは見えなくなって落ちた
      （本体は正しく効いていた＝物差しが置いていかれた・feedback_test_metric_from_the_same_function）。
   ⭐ 出す絵で測れば、画面の倍率にも、ふちのガイド線のアンチエイリアスにも左右されない。 */
const sig = () => p.evaluate(() => {
  const s = size(); const c = document.createElement('canvas'); c.width = s.W; c.height = s.H;
  const cx = c.getContext('2d');
  render(cx, s.W, s.H);
  const d = cx.getImageData(0, 0, s.W, s.H).data; let h = 2166136261;
  for(let i = 0; i < d.length; i += 4*11){ h ^= d[i] + d[i+1]*3 + d[i+2]*7; h = Math.imul(h, 16777619); }
  return h >>> 0; });
/* 塗る（本体と同じ入口＝筆の関数を通す） */
const paint = (pts, col) => p.evaluate((o) => {
  P.ink = o.col; let px = null, py = null;
  const rgb = hex2rgb(o.col);
  for(const [nx, ny] of o.pts){ const x = nx*FW, y = ny*FH;
    if(px === null) stampAt(x, y, rgb); else strokeTo(x, y, px, py, rgb);
    px = x; py = y; }
  kick();
}, { pts, col });
const base = o => p.evaluate(x => {
  Object.assign(P, { paper:'#0a0a0a', long:1000, ratio:'9:16', bsize:200, bsoft:0.4, bflow:1,
    fill:'tama', bgawa:false, pitch:13, gap:-0.02, sq:4.2, bed:1, tsize:0, asp:1.08, stagger:false,
    lang:315, gloss:0.9, bulge:0.7, blur:0.18, cut:0.1, hard:0.92 }, x || {});
  syncUI(); kick();
}, o || {});

console.log('── ① 筆は【場】に溜める（画素に直接塗っていない）');
await base(); await p.evaluate(() => newField()); await wait(300);
const empty = await sig();
await paint([[0.25,0.3],[0.75,0.35],[0.4,0.6]], '#3a3ce8'); await wait(500);
const painted = await sig();
check(empty !== painted, '塗ると絵が変わる');
/* ⭐ 場を消すだけで絵が消える＝画素に色を塗っていない証拠 */
await p.evaluate(() => { newField(); kick(); }); await wait(400);
check(await sig() === empty, '場を消すと絵も消える（画素に直接塗っていない）');

console.log('\n── ② 塗った所ごとに色が載る');
await base(); await p.evaluate(() => newField()); await wait(200);
await paint([[0.2,0.25],[0.8,0.25]], '#3a3ce8');
await paint([[0.2,0.7],[0.8,0.7]], '#e94b8a');
await wait(600);
const two = await p.evaluate(() => {
  const c = document.getElementById('cv'), g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let blue = 0, pink = 0;
  for(let i = 0; i < d.length; i += 4){
    const r = d[i], gg = d[i+1], bb = d[i+2];
    if(bb > r + 40 && bb > 90) blue++;
    if(r > bb + 40 && r > 90) pink++;
  }
  return { blue, pink };
});
check(two.blue > 2000 && two.pink > 2000, '2色で塗ると両方が画面に出る（NIJIMI で詰まっていた所）',
      `青 ${two.blue} / 桃 ${two.pink}`);

console.log('\n── ③ 粒間の芯＝谷が紙の色に落ちない');
await base(); await p.evaluate(() => newField()); await wait(200);
await paint([[0.15,0.2],[0.85,0.2],[0.15,0.35],[0.85,0.35],[0.15,0.5],[0.85,0.5],[0.15,0.65],[0.85,0.65]], '#3a3ce8');
await wait(600);
const valley = () => p.evaluate(() => {
  const c = document.getElementById('cv'), g = c.getContext('2d');
  const y = Math.round(c.height*0.42);
  const d = g.getImageData(Math.round(c.width*0.4), y, 60, 1).data;
  let mn = 999;
  for(let i = 0; i < 60; i++){ const v = d[i*4]*0.3 + d[i*4+1]*0.59 + d[i*4+2]*0.11; if(v < mn) mn = v; }
  return Math.round(mn);
});
/* ⚠️ 既定は粒が重なっていて【谷が無い】ので、地の有無が出ない（最初これで誤検出）。
      芯の主張は「谷が紙の色に落ちない」なので、谷ができる設定にしてから測る。 */
await p.evaluate(() => { P.gap = 0.3; P.sq = 2; syncUI(); kick(); }); await wait(500);
const vOn = await valley();
await p.evaluate(() => { P.bed = 0; syncUI(); kick(); }); await wait(500);
const vOff = await valley();
check(vOn > vOff + 15, '地を敷くと粒の谷が紙の色に落ちない', `敷く ${vOn} / 敷かない ${vOff}`);
check(vOn > 40, '地を敷けば谷が黒に落ちない', `谷の最低 ${vOn}`);
/* ⭐ 既定（粒が重なる設定）では、そもそも谷が無いことも押さえる */
await p.evaluate(() => { P.bed = 1; P.gap = -0.02; P.sq = 4.2; syncUI(); kick(); }); await wait(500);
check(await valley() > 40, '既定では粒が重なって谷そのものが無い', `谷の最低 ${await valley()}`);

console.log('\n── ④ 粒と地は別々に効く');
await base(); await p.evaluate(() => newField()); await wait(200);
await paint([[0.3,0.3],[0.7,0.3],[0.5,0.6]], '#eceae4'); await wait(500);
const g1 = await sig();
await p.evaluate(() => { P.bgawa = true; syncUI(); kick(); }); await wait(1200);
const g2 = await sig();
check(g1 !== g2, '地だけ泡にすると変わる');
/* ⭐ 地を泡にしても【塗った所の粒】は玉のまま＝別々に効いている */
const stillTama = await p.evaluate(() => P.fill === 'tama' && P.bgawa === true);
check(stillTama, '玉で塗ったまま地だけ泡にできる');
await p.evaluate(() => { P.fill = 'awa'; syncUI(); kick(); }); await wait(1500);
check(await sig() !== g2, '粒も泡にするとさらに変わる');

console.log('\n── ⑤ 型は前の状態を上書きする');
await p.evaluate(() => { Object.assign(P, { pitch:34, gap:0.5, fill:'flat', bed:0, paper:'#ffffff' }); syncUI(); kick(); });
await wait(500);
await p.evaluate(() => document.querySelector('#kataSeg button[data-v="ao"]').click());
await wait(600);
const after = await p.evaluate(() => ({ pitch:P.pitch, gap:P.gap, fill:P.fill, bed:P.bed, paper:P.paper }));
check(after.pitch === 13 && after.fill === 'tama' && after.bed === 1,
      '型「参考の青」でまとめて上書きされる', JSON.stringify(after));
await p.evaluate(() => document.querySelector('#kataSeg button[data-v="midori"]').click());
await wait(1500);
const after2 = await p.evaluate(() => ({ fill:P.fill, paper:P.paper }));
check(after2.fill === 'awa' && after2.paper === '#5fc02a', '型「参考の緑」も同じ', JSON.stringify(after2));

console.log('\n── ⑥ つまみ・戻す・出す・速さ');
await base(); await p.evaluate(() => newField()); await wait(200);
await paint([[0.2,0.3],[0.8,0.35],[0.4,0.65]], '#3a3ce8'); await wait(500);
const KNOBS = [['pitch',26],['gap',0.5],['sq',8],['bed',0],['tsize',1],['asp',1.8],
               ['lang',120],['gloss',0.1],['bulge',0.1],['blur',0.9],['cut',0.6],['hard',0.1]];
for(const [k, v] of KNOBS){
  await base(); await wait(350);
  const before = await sig();
  await p.evaluate(o => { P[o.k] = o.v; syncUI(); kick(); }, { k, v }); await wait(400);
  check(before !== await sig(), `つまみ ${k}`);
}
await base(); await wait(350);
const b4 = await sig();
await p.evaluate(() => { pushHist(); const rgb = hex2rgb('#e94b8a');
  for(let i = 0; i < 40; i++) stampAt(FW*0.5, FH*0.2 + i, rgb); kick(); });
await wait(450);
check(b4 !== await sig(), '塗ると変わる（⌘Z の前）');
await p.evaluate(() => document.getElementById('b_undo').click()); await wait(450);
check(await sig() === b4, '⌘Z で元に戻る');
await p.evaluate(() => { window.__got.length = 0; document.getElementById('b_png').click(); });
await wait(1500);
const png = (await p.evaluate(() => window.__got)).filter(x => /png/.test(x.type));
check(png.length >= 1 && png[0].size > 3000, 'PNG が落ちた', png.map(x => Math.round(x.size/1e3)+'KB').join());
for(const [long, limit] of [[1600, 2500], [2600, 6000]]){
  const ms = await p.evaluate(o => { P.long = o.long; P.fill = 'tama'; P.bgawa = false;
    const s = size(); const c = document.createElement('canvas'); c.width = s.W; c.height = s.H;
    const t = performance.now(); render(c.getContext('2d'), s.W, s.H);
    return Math.round(performance.now() - t); }, { long });
  check(ms < limit, `長辺 ${long} が ${limit}ms 未満`, `${ms}ms`);
}

/* ══⭐ ⑦ 盤は【窓】か・寄る引く（2026-08-17 新設）══
   🔴 見るのは「動くか」ではなく：
     ① canvas が盤いっぱい（版面の形に切り取られていない）／1倍より引ける
     ② 寄ると変わり、0 で【1画素も違わずに】戻る
     ③ 寄っても筆は版面の同じ所に当たる（寄って塗ると別の場所に乗る、が一番こわい）
     ④ ⌥＋ドラッグは画面が動くだけ・ふつうのドラッグは塗る
     ⑤ 出す絵にカメラが入っていない
   ⚠️ 物差しは【本体の render】から取る。画面 canvas を読むと、版面のふちのガイド線の
      アンチエイリアスがゆらいで落ちる（粒は完全一致なのに落ちた）。 */
console.log('\n── ⑦ 盤は【窓】か・寄る引く');
await p.evaluate(() => { viewFit(); P.fill = 'tama'; P.bgawa = false; kick(); }); await wait(500);
const board = await p.evaluate(() => { const st = document.getElementById('stage');
  return { sw:st.clientWidth, sh:st.clientHeight, cw:cv.clientWidth, ch:cv.clientHeight }; });
check(board.sw === board.cw && board.sh === board.ch, 'canvas が盤いっぱい（版面に切り取られていない）',
      `盤 ${board.sw}×${board.sh} / canvas ${board.cw}×${board.ch}`);
check(await p.evaluate(() => { viewFit(); zoomStep(1/3); const z = VIEW.zoom; viewFit(); return z; }) < 1,
      '1倍より引ける（版面の外まで見える）');
const zres = await p.evaluate(() => {
  const h = a => { let x = 2166136261; for(let i = 0; i < a.length; i += 4*3){ x ^= a[i]+a[i+1]*3+a[i+2]*7; x = Math.imul(x, 16777619);} return x>>>0; };
  const bake = () => { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
    const cx = c.getContext('2d'); render(cx, cv.width, cv.height, camScreen(cv.width, cv.height));
    return h(cx.getImageData(0, 0, cv.width, cv.height).data); };
  viewFit(); const a = bake();
  zoomStep(3); const z = bake();
  viewFit(); const c2 = bake();
  return { changed:a !== z, back:a === c2 };
});
check(zres.changed, '寄ると画面が変わる');
check(zres.back, '0（正面）で1画素も違わずに戻る');
const hit = await p.evaluate(() => {
  const r = cv.getBoundingClientRect();
  const at = () => { const c = CAM, px = c.ox + c.fw*c.sc/2, py = c.oy + c.fh*c.sc/2;
    return toField({ clientX: r.left + px/(cv.width/r.width), clientY: r.top + py/(cv.height/r.height) }); };
  viewFit(); const a = at(); zoomStep(3); const b2 = at(); viewFit();
  return { a, b:b2, FW, FH };
});
check(Math.abs(hit.a.x-hit.b.x) < 1.5 && Math.abs(hit.a.y-hit.b.y) < 1.5 && Math.abs(hit.a.x-hit.FW/2) < 1.5,
      '寄っても筆は版面の同じ所に当たる',
      `等倍 (${hit.a.x.toFixed(1)},${hit.a.y.toFixed(1)}) / 3倍 (${hit.b.x.toFixed(1)},${hit.b.y.toFixed(1)})`);
const inkSum = () => p.evaluate(() => { let s = 0; for(let i = 0; i < A.length; i++) s += A[i]; return +s.toFixed(1); });
const cbox = await p.evaluate(() => { const q = cv.getBoundingClientRect(); return { x:q.x, y:q.y, w:q.width, h:q.height }; });
const inkBefore = await inkSum();
const view0 = await p.evaluate(() => ({ ...VIEW }));
await p.mouse.move(cbox.x + cbox.w*0.45, cbox.y + cbox.h*0.45);
await p.keyboard.down('Alt');
await p.mouse.down(); await p.mouse.move(cbox.x + cbox.w*0.45 + 60, cbox.y + cbox.h*0.45 + 40, { steps:6 }); await p.mouse.up();
await p.keyboard.up('Alt'); await wait(400);
const view1 = await p.evaluate(() => ({ ...VIEW }));
check(await inkSum() === inkBefore, '⌥＋ドラッグでは塗らない');
check(view1.x !== view0.x || view1.y !== view0.y, '⌥＋ドラッグで画面が動く');
await p.mouse.move(cbox.x + cbox.w*0.5, cbox.y + cbox.h*0.5);
await p.mouse.down(); await p.mouse.move(cbox.x + cbox.w*0.5 + 50, cbox.y + cbox.h*0.5 + 30, { steps:6 }); await p.mouse.up();
await wait(400);
check(await inkSum() > inkBefore, 'ふつうのドラッグでは塗れる');
check(await p.evaluate(() => {
  const h = a => { let x = 2166136261; for(let i = 0; i < a.length; i += 4*7){ x ^= a[i]+a[i+1]*3+a[i+2]*7; x = Math.imul(x, 16777619);} return x>>>0; };
  const bake = () => { const s = size(); const c = document.createElement('canvas'); c.width = s.W; c.height = s.H;
    render(c.getContext('2d'), s.W, s.H); return h(c.getContext('2d').getImageData(0, 0, s.W, s.H).data); };
  viewFit(); const plain = bake();
  VIEW.zoom = 4; VIEW.x = 150; VIEW.y = 90; kick();
  const zoomed = bake(); viewFit();
  return plain === zoomed;
}), '寄っていても、出る絵は寄っていないものと完全に同じ');

/* ⭐⭐ ⑦b 泡の道でもカメラで色が変わらないか（2026-08-17 に実際に踏んだので新設）
   🔴 カメラを入れたとき【泡の色を読む所だけ】画面の座標のまま場を読んでいて、場の外を読み、
      塗った所の泡が【真っ黒】になった。粒（tama）の道だけ見ていたので、テストは通っていた。
   ⭐ 測り方＝出す絵と、画面と同じカメラで焼いた絵の【同じ相対位置】の色を突き合わせる。 */
console.log('\n── ⑦b 泡の道でも、カメラで色が変わらない');
const camCol = await p.evaluate(() => {
  document.querySelector('#kataSeg button[data-v="manga"]').click();
  const avg = (cx2, x, y) => { const d = cx2.getImageData(Math.round(x)-3, Math.round(y)-3, 7, 7).data;
    let r = 0, g2 = 0, b2 = 0, n = 0;
    for(let i = 0; i < d.length; i += 4){ r += d[i]; g2 += d[i+1]; b2 += d[i+2]; n++; }
    return [r/n, g2/n, b2/n]; };
  const s = size();
  const c1 = document.createElement('canvas'); c1.width = s.W; c1.height = s.H;
  const x1 = c1.getContext('2d'); render(x1, s.W, s.H);
  viewFit();
  const cam = camScreen(cv.width, cv.height);
  const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height;
  const x2 = c2.getContext('2d'); render(x2, cv.width, cv.height, cam);
  const pts = [[0.2,0.3],[0.8,0.35],[0.4,0.65]];      /* ＝塗った所（⑥と同じ） */
  const out = [];
  for(const [u, v] of pts){
    const a = avg(x1, u*s.W, v*s.H);
    const b2 = avg(x2, cam.ox + u*cam.fw*cam.sc, cam.oy + v*cam.fh*cam.sc);
    out.push({ a:a.map(Math.round), b:b2.map(Math.round),
      d:Math.max(...a.map((q, i) => Math.abs(q - b2[i]))), dark:(b2[0]+b2[1]+b2[2]) < 120 });   /* ⚠️ 60 だと、実際に壊れたとき（合計96）を素通りした */
  }
  return out;
});
check(camCol.every(o => !o.dark), '塗った所がカメラで真っ黒にならない',
      camCol.map(o => `[${o.b}]`).join(' '));
check(camCol.every(o => o.d < 60), 'カメラの有無で色が変わらない',
      camCol.map(o => `差 ${Math.round(o.d)}`).join(' / '));

/* ══⭐⭐ ⑧ 版（重ねる）── 2026-08-17 新設
   🔴 見るのは：①版ごとに塗り分けられる ②あとから【この版を今の色にする】で色を変えられる
     ③**同じ版の中に何色でも載る**（この道具の芯。版を1色にした版で一度これを壊した）
     ④入切・複製・消す・⌘Z ⑤控えて開くと版がそのまま戻る ⑥このブラウザに残せる（溢れない） */
console.log('\n── ⑧ 版（重ねる）');
await base(); await p.evaluate(() => { newField(); drawLayList(); }); await wait(300);
const paintOn = (lay, col, x) => p.evaluate(o => {
  sel = o.lay; setInk(o.col);
  const rgb = hex2rgb(o.col);
  for(let i = 1; i < 40; i++) strokeTo(FW*o.x, FH*0.2 + i*5, FW*o.x, FH*0.2 + (i-1)*5, rgb);
  kick();
}, { lay, col, x });
const countCols = () => p.evaluate(() => {
  const s = size(); const c = document.createElement('canvas'); c.width = s.W; c.height = s.H;
  render(c.getContext('2d'), s.W, s.H);
  const d = c.getContext('2d').getImageData(0, 0, s.W, s.H).data;
  let blue = 0, pink = 0, green = 0, yellow = 0;
  for(let i = 0; i < d.length; i += 4*3){ const r = d[i], g2 = d[i+1], b2 = d[i+2];
    if(b2 > r+40 && b2 > 90 && g2 < b2-30) blue++;
    if(r > b2+40 && r > 90 && g2 < r-60) pink++;
    if(g2 > r+40 && g2 > b2+30) green++;
    if(r > 150 && g2 > 120 && b2 < 100) yellow++; }
  return { blue, pink, green, yellow };
});
check(await p.evaluate(() => LAY.length) === 1, '版1枚で始まる');
await paintOn(0, '#3a3ce8', 0.3); await wait(500);
await p.evaluate(() => document.getElementById('b_layAdd').click()); await wait(300);
await paintOn(1, '#e94b8a', 0.65); await wait(500);
const cc1 = await countCols();
check(await p.evaluate(() => LAY.length) === 2 && cc1.blue > 300 && cc1.pink > 300,
      '版を足して塗り分けられる', JSON.stringify(cc1));
await p.evaluate(() => { sel = 0; setInk('#5fc02a'); document.getElementById('b_layFill').click(); }); await wait(600);
const cc2 = await countCols();
check(cc2.green > 300 && cc2.blue < 100 && cc2.pink > 300,
      '⭐「この版を今の色にする」で、その版だけ色が変わる', JSON.stringify(cc2));
/* ⭐⭐ ここがこの道具の芯。版を1色にする作りにしたとき、これが落ちて気づいた */
await paintOn(1, '#f5c518', 0.68); await wait(600);
const cc3 = await countCols();
check(cc3.pink > 150 && cc3.yellow > 150, '⭐同じ版の中に2色目も載る（NURI の芯）', JSON.stringify(cc3));
await p.evaluate(() => { LAY[0].on = false; kick(); }); await wait(500);
check((await countCols()).green < 100, '版を切ると消える');
await p.evaluate(() => { LAY[0].on = true; sel = 1; document.getElementById('b_layDup').click(); }); await wait(500);
check(await p.evaluate(() => LAY.length) === 3, 'この版を複製できる');
await p.evaluate(() => document.getElementById('b_layDel').click()); await wait(500);
check(await p.evaluate(() => LAY.length) === 2, 'この版を消せる');
await p.evaluate(() => document.getElementById('b_undo').click()); await wait(600);
check(await p.evaluate(() => LAY.length) === 3, '⌘Z で版が戻る');
/* ⭐ 控え（JSON）の往復＝詰めた場が壊れていないか（ランレングス＋base64） */
/* ⚠️ 濃さは 8bit に落として詰めるので、合計は【完全一致にはならない】（2026-08-17 これで落ちた）。
   ⭐ 見るのは「版の数・色・並び」が同じで、濃さのズレが【丸め1段ぶんに収まっている】か。 */
const trip = await p.evaluate(() => {
  const sums = () => LAY.map(L => { let s = 0; for(let i = 0; i < L.A.length; i++) s += L.A[i]; return s; });
  const before = { n:LAY.length, cols:LAY.map(L => L.col), sum:sums() };
  const txt = JSON.stringify({ v:3, P, FW, FH, sel, LAY:packLay() });
  loadState(JSON.parse(txt)); drawLayList();
  const after = { n:LAY.length, cols:LAY.map(L => L.col), sum:sums() };
  const rel = before.sum.map((v, i) => Math.abs(v - after.sum[i]) / Math.max(1, v));
  return { shape:before.n === after.n && JSON.stringify(before.cols) === JSON.stringify(after.cols),
    worst:Math.max(...rel), kb:Math.round(txt.length/1024) };
});
check(trip.shape && trip.worst < 0.01, '控えて開くと、版がそのまま戻る（濃さのズレは丸め1段ぶん）',
      `${trip.kb}KB・ズレ ${(trip.worst*100).toFixed(3)}%`);
/* 🔴 詰めないと版4枚で localStorage を超えて【リロードで絵が消える】（2026-08-17 実測） */
const fit = await p.evaluate(() => {
  while(LAY.length < 6){ LAY.push(newLayer({ col:'#3a3ce8' })); sel = LAY.length-1;
    for(let i = 1; i < 30; i++) strokeTo(FW*0.5, FH*0.3+i*5, FW*0.5, FH*0.3+(i-1)*5, [58,60,232]); }
  const txt = JSON.stringify({ v:3, P, FW, FH, sel, LAY:packLay() });
  try{ localStorage.setItem('nuri.v3', txt); return { ok:true, mb:+(txt.length/1048576).toFixed(2) }; }
  catch(e){ return { ok:false, mb:+(txt.length/1048576).toFixed(2) }; }
});
check(fit.ok, '版6枚でも このブラウザに残せる（詰めている）', `${fit.mb}MB`);

/* ══⭐ ⑧b 版の移動と 字の版（2026-08-17 追加）══
   🔴 見るのは：①動かすと変わり【0 に戻すと1画素も違わずに戻る】（場そのものは動かしていない）
     ②「版を動かす」で引っぱっても【塗らない】
     ③＋字で場に焼かれ、字／大きさ／角度／書体／色が効く
     ④焼いたあとは描く版と同じ＝粒・泡・移動が【そのまま効く】 */
console.log('\n── ⑧b 版の移動と 字の版');
await base(); await p.evaluate(() => { newField(); drawLayList(); }); await wait(300);
await paintOn(0, '#3a3ce8', 0.3); await wait(500);
const mv0 = await sig();
await p.evaluate(() => { LAY[0].dx = 0.2; kick(); }); await wait(500);
check(await sig() !== mv0, '横位置を動かすと絵が変わる');
await p.evaluate(() => { LAY[0].dx = 0; kick(); }); await wait(500);
check(await sig() === mv0, '⭐0 に戻すと1画素も違わずに戻る（場は動いていない）');
await p.evaluate(() => { LAY[0].dy = -0.25; kick(); }); await wait(500);
check(await sig() !== mv0, '縦位置も効く');
await p.evaluate(() => { LAY[0].dy = 0; kick(); }); await wait(400);
/* 「版を動かす」で引っぱる＝塗らない */
const mBox = await p.evaluate(() => { const q = cv.getBoundingClientRect(); return { x:q.x, y:q.y, w:q.width, h:q.height }; });
const mInk = () => p.evaluate(() => { let s = 0; for(const L of LAY) for(let i = 0; i < L.A.length; i++) s += L.A[i]; return +s.toFixed(1); });
const mInk0 = await mInk();
await p.evaluate(() => { sel = 0; P.tool = 'move'; syncUI(); });
await p.mouse.move(mBox.x + mBox.w*0.5, mBox.y + mBox.h*0.5);
await p.mouse.down(); await p.mouse.move(mBox.x + mBox.w*0.5 + 70, mBox.y + mBox.h*0.5 + 45, { steps:8 }); await p.mouse.up();
await wait(500);
const moved = await p.evaluate(() => ({ dx:LAY[0].dx, dy:LAY[0].dy }));
check(Math.abs(moved.dx) > 0.01 && Math.abs(moved.dy) > 0.01, '「版を動かす」で引っぱると版が動く');
check(await mInk() === mInk0, '「版を動かす」では塗らない');
await p.evaluate(() => { LAY[0].dx = 0; LAY[0].dy = 0; P.tool = 'paint'; syncUI(); kick(); }); await wait(400);
/* 字の版 */
await p.evaluate(() => document.getElementById('b_layText').click()); await wait(800);
const tinfo = await p.evaluate(() => ({ kind:curLay().kind,
  sum:Math.round([...curLay().A].reduce((a, b2) => a + b2, 0)),
  shown:!document.getElementById('textBox').classList.contains('hide') }));
check(tinfo.kind === 'text' && tinfo.sum > 100 && tinfo.shown, '＋字で場に焼かれ、字のつまみが出る', JSON.stringify(tinfo));
const t0 = await sig();
await p.evaluate(() => { const t = document.getElementById('t_text'); t.value = '塗'; t.dispatchEvent(new Event('input', { bubbles:true })); });
await wait(700);
const t1 = await sig(); check(t1 !== t0, '字を打ち替えると変わる');
for(const [id, v, name] of [['tsz', 1.2, '大きさ'], ['trot', 30, '角度']]){
  const before = await sig();
  await p.evaluate(o => { const r = document.getElementById('r_'+o.id); r.value = o.v; r.dispatchEvent(new Event('input', { bubbles:true })); }, { id, v });
  await wait(700);
  check(before !== await sig(), `字の${name}が効く`);
}
await p.evaluate(() => document.querySelector('#tfontSeg button[data-v="serif"]').click()); await wait(700);
check(true, '書体を切り替えても落ちない');
const tg = await p.evaluate(() => { setInk('#5fc02a');
  const s = size(); const c = document.createElement('canvas'); c.width = s.W; c.height = s.H;
  render(c.getContext('2d'), s.W, s.H);
  const d = c.getContext('2d').getImageData(0, 0, s.W, s.H).data;
  let g2 = 0; for(let i = 0; i < d.length; i += 4*5){ if(d[i+1] > d[i]+40 && d[i+1] > d[i+2]+30) g2++; }
  return g2; });
check(tg > 200, '⭐字の版は色を選ぶとすぐその色になる', `緑の画素 ${tg}`);
const tb = await sig();
await p.evaluate(() => { curLay().dx = 0.25; kick(); }); await wait(600);
check(await sig() !== tb, '字の版も動かせる');
await p.evaluate(() => { curLay().dx = 0; kick(); }); await wait(600);
check(await sig() === tb, '字の版も 0 に戻すと1画素も違わずに戻る');

console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ 全部通った');
if(errs) console.log(`🔴 JSエラー ${errs}件`);
await b.close();
process.exit(ng.length || errs ? 1 : 0);
