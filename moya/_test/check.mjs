/* ⭐⭐ 靄 MOYA の回帰テスト ── 2026-08-30
   🔴 見るのは【この道具の芯が動いているか】：
     ⭐⭐ ① 奥行きひとつで、かすみ・ぼけ・色あせが【まとめて】変わる（素材ごとに直していない）
     ⭐⭐ ② 灯を動かすと【置いた素材が全部いっしょに】変わる（＝焼き込んでいない）
     ⭐⭐ ③ 切り抜いても元の写真は残っている＝【消したら1画素も同じに戻る】
     ⭐  ④ 色で抜く／筆で消す／筆で戻す／囲って抜く が本当に効く
     ⑤ 空気（寒暖・にじみ・粒・まわり）は版面のもの＝素材が何枚でも1回だけ
     ⑥ 奥の物は手前の物より後ろに出る（並ぶ順は奥行きが決める）
     ⑦ PNG が本当に落ちる／地なしPNGは形で切り抜かれている
     ⑧ モバイルで横に伸びない・掴み手が出る
   使い方: node moya/_test/check.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL_ = process.argv[2] || 'http://localhost:8460/moya/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1400, height:900 });
await p.goto(URL_, { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 2500));
let NG = 0;
const ok = (c, n, x) => { console.log((c ? '  ✅ ' : '  🔴 ') + n + (x != null ? ' … ' + x : '')); if(!c) NG = 1; };
const wait = ms => new Promise(r => setTimeout(r, ms));

/* 出す物を横取りする */
await p.evaluate(() => { window.__got = [];
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(x){ window.__got.push({ size:x.size, type:x.type }); return oc.call(URL, x); }; });

/* 盤の指紋（画素をとびとびに読む） */
await p.evaluate(() => {
  window.__shot = () => { const d = g.getImageData(0,0,cv.width,cv.height).data;
    const o = []; for(let i = 0; i < d.length; i += 4*7) o.push(d[i], d[i+3]); return o; };
  window.__diff = (A,B) => { let n = 0;
    for(let i = 0; i < Math.min(A.length,B.length); i++) if(Math.abs(A[i]-B[i]) > 8) n++; return n; };
});
const shot = () => p.evaluate(() => window.__shot());
const diff = (A,B) => { let n = 0;
  for(let i = 0; i < Math.min(A.length,B.length); i++) if(Math.abs(A[i]-B[i]) > 8) n++; return n; };

console.log('── 靄 MOYA（置いた素材が版面の空気を着る）');
const A0 = await p.evaluate(() => ({ n:LAYERS.length, meter:el('meter').textContent }));
ok(A0.n >= 3, '① 開くと見本が入っている（空の画面から始めない）', A0.n + ' 枚');

/* ⭐⭐ 奥行きひとつで「まとめて」変わる */
const D = await p.evaluate(async () => {
  const L = LAYERS.find(x => x.d < 0.2) || LAYERS[0];
  const before = look(L.d);
  const k0 = look(0), k1 = look(1);
  return {
    手前: { かすみ:+k0.haze.toFixed(3), ぼけ:+k0.blur.toFixed(2), 彩度:+k0.sat.toFixed(3) },
    奥:   { かすみ:+k1.haze.toFixed(3), ぼけ:+k1.blur.toFixed(2), 彩度:+k1.sat.toFixed(3) },
  };
});
ok(D.奥.かすみ > D.手前.かすみ && D.奥.ぼけ > D.手前.ぼけ && D.奥.彩度 < D.手前.彩度,
   '⭐⭐ ② 奥行きひとつで【かすみ・ぼけ・色あせ】がまとめて変わる',
   JSON.stringify(D));

const S0 = await shot();
await p.evaluate(async () => {
  const L = LAYERS.find(x => x.d < 0.2) || LAYERS[0];
  L.d = 1.0; L._key = ''; COARSE = 0; render();
});
await wait(300);
const S1 = await shot();
ok(diff(S0, S1) > 200, '⭐ 奥行きを変えると絵が変わる', diff(S0, S1) + ' 点');
await p.evaluate(async () => {
  const L = LAYERS.find(x => x.d >= 0.99 && x.name.indexOf('影') >= 0) || LAYERS[0];
  L.d = 0.0; L._key = ''; COARSE = 0; render();
});
await wait(300);

/* ⭐⭐ 灯を動かすと「全部いっしょに」変わる＝焼き込んでいない */
const LIT = await p.evaluate(async () => {
  const before = window.__shot();
  const plates = LAYERS.map(L => L._key);
  const keep = { lx:P.lx, ly:P.ly };
  P.lx = 0.12; P.ly = 0.85; COARSE = 0; render();
  await new Promise(r => setTimeout(r, 200));
  const after = window.__shot();
  const changed = LAYERS.filter((L, i) => L._key !== plates[i]).length;
  P.lx = keep.lx; P.ly = keep.ly; COARSE = 0; render();
  await new Promise(r => setTimeout(r, 200));
  return { 変わった画素: window.__diff(before, after), 作り直された素材: changed, 枚数: LAYERS.length,
           戻った: window.__diff(before, window.__shot()) };
});
ok(LIT.変わった画素 > 300, '⭐⭐ ③ 灯を動かすと絵が変わる', LIT.変わった画素 + ' 点');
ok(LIT.作り直された素材 === LIT.枚数,
   '⭐⭐ 【置いた素材が全部いっしょに】光の向きを変える（焼き込んでいない）',
   LIT.作り直された素材 + ' / ' + LIT.枚数 + ' 枚');
ok(LIT.戻った === 0, '⚠️ 灯を戻すと1画素も同じに戻る', LIT.戻った + ' 点');

/* ⭐⭐ 空気からのズレ（2026-08-30 木下＝「最後に一枚かけるだけで統一させるにしても
   それぞれの素材の調整は必要だと思っている」）
   🔴 見るのは「効くか」だけでなく【灯を動かしてもズレが保たれるか】。
      ここが崩れると、その素材だけ空気から取り残される＝フォトショと同じ重さに戻る。 */
const ADJ = await p.evaluate(async () => {
  /* ⚠️ 見本の「手前の影」はほぼ黒＝**彩度を動かしても画素が変わらない**（測れない素材）。
     ⭐ 測りたいものだけが動くように、色のある素材を入れてから測る。 */
  const c = document.createElement('canvas'); c.width = 400; c.height = 400;
  const cx = c.getContext('2d');
  const gr = cx.createLinearGradient(0, 0, 400, 400);
  gr.addColorStop(0, '#ff3b30'); gr.addColorStop(0.5, '#34c759'); gr.addColorStop(1, '#0a84ff');
  cx.fillStyle = gr; cx.fillRect(0, 0, 400, 400);
  const img = new Image();
  await new Promise(res => { img.onload = res; img.src = c.toDataURL(); });
  LAYERS = []; addImage(img, '色のためし', 0.15);
  const L = LAYERS[0];
  const out = { 空気どおり: !hasAdj(L) };
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 200));
  const A = window.__shot();
  /* つまみを触る道から入れる（値を直に入れない） */
  const s = (id, v) => { const r = document.getElementById(id); r.value = v;
    r.dispatchEvent(new Event('input', { bubbles:true })); };
  SEL = LAYERS.indexOf(L); syncSel();
  const each = {};
  for(const [id, k] of [['r_abri','bri'],['r_asat','sat'],['r_acon','con'],
                        ['r_atmp','tmp'],['r_ablur','blur'],['r_ahaze','haze']]){
    s(id, 80); COARSE = 0; render(); await new Promise(r => setTimeout(r, 200));
    each[k] = window.__diff(A, window.__shot());
    s(id, 0); COARSE = 0; render(); await new Promise(r => setTimeout(r, 150));
  }
  out.つまみごと = each;
  out.戻る = window.__diff(A, window.__shot());
  /* ⭐⭐ ズレを入れたまま灯を動かす＝ズレは保たれたままついてくるか */
  s('r_abri', 70); s('r_atmp', -60);
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 200));
  out.ズレている = hasAdj(L);
  const B = window.__shot();
  const keep = { lx:P.lx, ly:P.ly };
  P.lx = 0.15; P.ly = 0.8; COARSE = 0; render(); await new Promise(r => setTimeout(r, 200));
  out.灯で変わる = window.__diff(B, window.__shot());
  out.ズレは残っている = hasAdj(L) && Math.abs(L.adj.bri - 0.7) < 1e-9 && Math.abs(L.adj.tmp + 0.6) < 1e-9;
  P.lx = keep.lx; P.ly = keep.ly;
  document.getElementById('b_adj0').click();
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 200));
  out.ズレを消したら戻る = window.__diff(A, window.__shot());
  out.印 = document.getElementById('o_adj').value;
  return out;
});
ok(ADJ.空気どおり, '⭐ ズレの既定は【ぜんぶ 0 ＝空気どおり】（いままでの絵）');
{
  const dead = Object.entries(ADJ.つまみごと).filter(([k, v]) => v < 60).map(([k]) => k);
  ok(dead.length === 0, '⭐⭐ ズレのつまみが6本とも効く（死んでいるつまみが無い）',
     JSON.stringify(ADJ.つまみごと));
}
ok(ADJ.戻る === 0, '⚠️ 0 に戻すと1画素も同じに戻る', ADJ.戻る + ' 点');
ok(ADJ.灯で変わる > 300, '⭐ ズレを入れたままでも灯は効く', ADJ.灯で変わる + ' 点');
ok(ADJ.ズレは残っている,
   '⭐⭐ 灯を動かしても【ズレは保たれたままついてくる】（絶対値で持っていない）');
ok(ADJ.ズレを消したら戻る === 0, '⭐ ズレを消すと空気どおりに戻る', ADJ.ズレを消したら戻る + ' 点');
ok(ADJ.印 === '空気どおり', '⭐ いまズレているかを画面に出す', ADJ.印);

/* ⭐⭐ 切り抜き ── 効く・元は残っている */
const CUT = await p.evaluate(async () => {
  /* 無地の地に丸を描いた素材を入れる（色で抜けるはず） */
  const c = document.createElement('canvas'); c.width = 400; c.height = 400;
  const x = c.getContext('2d');
  x.fillStyle = '#22cc55'; x.fillRect(0,0,400,400);
  x.fillStyle = '#ffdd88'; x.beginPath(); x.arc(200,200,120,0,6.2831853); x.fill();
  const img = new Image();
  await new Promise(res => { img.onload = res; img.src = c.toDataURL(); });
  LAYERS = []; addImage(img, 'ためし', 0.1);
  el('k_nobg').checked = true; el('k_nobg').dispatchEvent(new Event('change', { bubbles:true }));
  await new Promise(r => setTimeout(r, 250));
  const green = () => { const d = g.getImageData(0,0,cv.width,cv.height).data; let n = 0;
    for(let i=0;i<d.length;i+=4*7) if(d[i+3]>128 && d[i+1]>d[i]+30 && d[i+1]>d[i+2]+30) n++; return n; };
  const solid = () => { const d = g.getImageData(0,0,cv.width,cv.height).data; let n = 0;
    for(let i=0;i<d.length;i+=4*7) if(d[i+3]>128) n++; return n; };
  const 前 = { 緑:green(), 不透明:solid() };
  const L = LAYERS[0];
  /* ① 色で抜く */
  cutColor(L, 10, 10); COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  const 色で抜いた = { 緑:green(), 不透明:solid() };
  /* ② 筆で消す（丸の真ん中を消す） */
  const m = maskOf(L);
  const keepB = P.brush; P.brush = 0.15;
  cutBrush(L, m.width/2, m.height/2, null, null, true);
  P.brush = keepB;
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  const 筆で消した = { 不透明:solid() };
  /* ③ 筆で戻す */
  P.brush = 0.15; cutBrush(L, m.width/2, m.height/2, null, null, false); P.brush = keepB;
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  const 筆で戻した = { 不透明:solid() };
  /* ④ 切り抜きを消す＝元の写真に戻る */
  clearMask(L); COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  const 消した = { 緑:green(), 不透明:solid() };
  /* ⑤ 囲って抜く */
  cutPoly(L, [{x:0,y:0},{x:m.width,y:0},{x:m.width,y:m.height*0.4},{x:0,y:m.height*0.4}], false);
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  const 囲って抜いた = { 不透明:solid() };
  clearMask(L);
  el('k_nobg').checked = false; el('k_nobg').dispatchEvent(new Event('change', { bubbles:true }));
  return { 前, 色で抜いた, 筆で消した, 筆で戻した, 消した, 囲って抜いた };
});
ok(CUT.色で抜いた.緑 < CUT.前.緑 * 0.02,
   '⭐⭐ ④ 色で抜く＝押した色がほぼ消える',
   `緑 ${CUT.前.緑.toLocaleString()} → ${CUT.色で抜いた.緑.toLocaleString()} 画素`);
ok(CUT.色で抜いた.不透明 < CUT.前.不透明 * 0.6, '⭐ 抜いた分だけ地が透ける',
   `${CUT.前.不透明.toLocaleString()} → ${CUT.色で抜いた.不透明.toLocaleString()}`);
ok(CUT.筆で消した.不透明 < CUT.色で抜いた.不透明, '⭐ 筆で消せる',
   `${CUT.色で抜いた.不透明.toLocaleString()} → ${CUT.筆で消した.不透明.toLocaleString()}`);
ok(CUT.筆で戻した.不透明 > CUT.筆で消した.不透明, '⭐ 筆で戻せる',
   `${CUT.筆で消した.不透明.toLocaleString()} → ${CUT.筆で戻した.不透明.toLocaleString()}`);
ok(CUT.囲って抜いた.不透明 < CUT.消した.不透明, '⭐ 囲って抜ける',
   `${CUT.消した.不透明.toLocaleString()} → ${CUT.囲って抜いた.不透明.toLocaleString()}`);
ok(CUT.消した.緑 === CUT.前.緑 && CUT.消した.不透明 === CUT.前.不透明,
   '⭐⭐ ⑤ 切り抜きを消すと【1画素も同じに】戻る（元の写真を削っていない）',
   `${CUT.前.不透明.toLocaleString()} → ${CUT.消した.不透明.toLocaleString()} 画素`);

/* ⑥ 空気は版面のもの＝1回だけ／⑦ 並ぶ順は奥行きが決める */
const AIR = await p.evaluate(async () => {
  await new Promise(r => setTimeout(r, 100));
  const out = {};
  const s = (id, v) => { const r = document.getElementById(id); r.value = v;
    r.dispatchEvent(new Event('input', { bubbles:true })); };
  const A = window.__shot();
  s('r_grain', 90); COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  out.粒 = window.__diff(A, window.__shot());
  s('r_grain', 28); COARSE = 0; render(); await new Promise(r => setTimeout(r, 200));
  s('r_vig', 95); COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  out.まわり = window.__diff(A, window.__shot());
  s('r_vig', 35); COARSE = 0; render(); await new Promise(r => setTimeout(r, 200));
  s('r_split', 95); COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  out.寒暖 = window.__diff(A, window.__shot());
  s('r_split', 45); COARSE = 0; render(); await new Promise(r => setTimeout(r, 200));
  out.戻った = window.__diff(A, window.__shot());
  return out;
});
ok(AIR.粒 > 100 && AIR.まわり > 100 && AIR.寒暖 > 100,
   '⑥ 空気のつまみ（粒・まわり・寒暖）がぜんぶ効く', JSON.stringify(AIR));
ok(AIR.戻った === 0, '⚠️ 戻すと1画素も同じに戻る', AIR.戻った + ' 点');

const ORD = await p.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 300; c.height = 300;
  const x = c.getContext('2d');
  x.fillStyle = '#ff0000'; x.fillRect(0,0,300,300);
  const red = new Image(); await new Promise(r => { red.onload = r; red.src = c.toDataURL(); });
  x.fillStyle = '#0000ff'; x.fillRect(0,0,300,300);
  const blue = new Image(); await new Promise(r => { blue.onload = r; blue.src = c.toDataURL(); });
  LAYERS = [];
  addImage(red, '赤', 1.0);  LAYERS[0].x = 0.5; LAYERS[0].y = 0.5;
  addImage(blue, '青', 0.0); LAYERS[1].x = 0.5; LAYERS[1].y = 0.5;
  /* かすみ・空気を切って、素直に色だけ見る */
  const keep = { haze:P.haze, split:P.split, bloom:P.bloom, grain:P.grain, vig:P.vig, li:P.li };
  P.haze = P.split = P.bloom = P.grain = P.vig = P.li = 0;
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  const d = g.getImageData((cv.width/2)|0, (cv.height/2)|0, 1, 1).data;
  Object.assign(P, keep);
  return { 手前が上: d[2] > d[0], 画素:[d[0],d[1],d[2]] };
});
ok(ORD.手前が上, '⑦ 並ぶ順は【奥行きが決める】（手前の物が上に出る）', ORD.画素.join(','));

/* ⑧ 出す */
await p.evaluate(async () => {
  await demo();
  const s = (id, v) => { const r = document.getElementById(id); r.value = v;
    r.dispatchEvent(new Event('input', { bubbles:true })); };
  s('r_long', 700);
  document.getElementById('b_png').click();
  await new Promise(r => setTimeout(r, 1200));
});
const got = await p.evaluate(() => window.__got);
ok(got.some(x => x.type === 'image/png'), '⑧ PNG が本当に落ちる', JSON.stringify(got));

/* ⑨ モバイル */
await p.setViewport({ width:390, height:844, isMobile:true, hasTouch:true });
await wait(900);
const MB = await p.evaluate(() => ({
  幅: document.documentElement.scrollWidth + '/' + innerWidth,
  横に伸びない: document.documentElement.scrollWidth <= innerWidth + 1,
  掴み手: !!document.getElementById('sheetGrip'),
  盤は指を取る: getComputedStyle(document.getElementById('stage')).touchAction === 'none',
}));
ok(MB.横に伸びない, '⑨ モバイルで横に伸びない', MB.幅);
ok(MB.掴み手, '⑨ モバイルでパネルの掴み手が出る');
ok(MB.盤は指を取る, '⑨ 盤を引いてもページが動かない（touch-action:none）');

ok(errs.length === 0, 'JSエラーが出ない', errs.join(' | '));
await b.close();
process.exit(NG ? 1 : 0);
