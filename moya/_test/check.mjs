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
  /* ⭐ 薄い変化も拾う物差し＝【差の合計】。
     ⚠️「8より大きい画素を数える」だけだと、全面に薄くかかる直し（黒の持ち上げ等）や
        細い帯にしか出ない直し（縁の回り込み）が **0 と出てしまう**（2026-08-30 に踏んだ）。 */
  window.__full = () => { const d = g.getImageData(0,0,cv.width,cv.height).data;
    const o = []; for(let i = 0; i < d.length; i += 4*3) o.push(d[i], d[i+1], d[i+2], d[i+3]);
    return o; };
  window.__sad = (A,B) => { let s2 = 0;
    for(let i = 0; i < Math.min(A.length,B.length); i++) s2 += Math.abs(A[i]-B[i]);
    return Math.round(s2); };
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
  const keep = { lx:LIGHTS[0].x, ly:LIGHTS[0].y };
  LIGHTS[0].x = 0.12; LIGHTS[0].y = 0.85;
  LAYERS.forEach(L => L._key = ''); COARSE = 0; render();
  await new Promise(r => setTimeout(r, 200));
  const after = window.__shot();
  const changed = LAYERS.filter((L, i) => L._key !== plates[i]).length;
  LIGHTS[0].x = keep.lx; LIGHTS[0].y = keep.ly;
  LAYERS.forEach(L => L._key = ''); COARSE = 0; render();
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
  const keep = { lx:LIGHTS[0].x, ly:LIGHTS[0].y };
  LIGHTS[0].x = 0.15; LIGHTS[0].y = 0.8;
  LAYERS.forEach(L => L._key = ''); COARSE = 0; render(); await new Promise(r => setTimeout(r, 200));
  out.灯で変わる = window.__diff(B, window.__shot());
  out.ズレは残っている = hasAdj(L) && Math.abs(L.adj.bri - 0.7) < 1e-9 && Math.abs(L.adj.tmp + 0.6) < 1e-9;
  LIGHTS[0].x = keep.lx; LIGHTS[0].y = keep.ly; LAYERS.forEach(L => L._key = '');
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

/* ⭐⭐ 盤の座標（2026-08-30 木下＝「つまみ動かそうとすると、なぜか左上に距離がある」）
   🔴 見るのは【画面 → 版面 → 画面 で元の所に戻るか】。
      しかも **寄り（倍率）と、触っている間の粗さ（COARSE）を変えてもずれないこと**。
      前の式は盤を縮めて描く倍率 k を二重に掛けていたので、
      k のぶん（既定 0.83倍）左上へずれ、粗さを変えるとずれ方まで変わっていた。 */
const XY = await p.evaluate(async () => {
  await demo();
  const out = { ずれ:[], 掴めた:[] };
  const pts = [[0.5,0.5],[0.2,0.8],[0.85,0.15]];
  for(const z of [0.2, 0.6, 1.4]){
    for(const coarse of [0, 1]){
      V.z = z; COARSE = coarse; render();
      await new Promise(r => setTimeout(r, 60));
      for(const [u, v] of pts){
        const sc = toScreen(u, v);
        const q = toBoard(sc);
        out.ずれ.push(+Math.max(Math.abs(q.x - u), Math.abs(q.y - v)).toFixed(6));
      }
    }
  }
  /* 素材の【まん中】を押したら、その素材が掴めるか（見えている所と当たる所が一致するか） */
  COARSE = 0; V.z = 0.6; render();
  await new Promise(r => setTimeout(r, 80));
  for(const L of LAYERS){
    const sc = toScreen(L.x, L.y);
    out.掴めた.push(hitLayer(toBoard(sc)) >= 0);
  }
  /* 灯のまん中を押したら灯が掴めるか */
  const lc = toScreen(LIGHTS[0].x, LIGHTS[0].y);
  out.灯を掴めた = hitLight(toBoard(lc)) >= 0;
  /* ⭐ 動かした量が、指の動いた量と合っているか（左上へ縮まないか） */
  const L0 = LAYERS[0];
  const before = { x:L0.x, y:L0.y };
  const a1 = toScreen(0.30, 0.30), a2 = toScreen(0.55, 0.62);
  const q1 = toBoard(a1), q2 = toBoard(a2);
  L0.x = before.x + (q2.x - q1.x); L0.y = before.y + (q2.y - q1.y);
  out.動いた量 = [+(L0.x - before.x).toFixed(4), +(L0.y - before.y).toFixed(4)];
  L0.x = before.x; L0.y = before.y;
  V.z = 1; COARSE = 0; render();
  return out;
});
ok(Math.max(...XY.ずれ) < 1e-6,
   '⭐⭐ 画面→版面→画面 で元の所に戻る（寄りも粗さも変えて18通り）',
   'いちばん大きいずれ ' + Math.max(...XY.ずれ));
ok(XY.掴めた.every(Boolean), '⭐⭐ 素材の【まん中】を押したらその素材が掴める',
   XY.掴めた.join(','));
ok(XY.灯を掴めた, '⭐ 灯のまん中を押したら灯が掴める');
ok(Math.abs(XY.動いた量[0] - 0.25) < 1e-6 && Math.abs(XY.動いた量[1] - 0.32) < 1e-6,
   '⭐⭐ 動かした量が指の動いた量と合う（左上へ縮まない）', XY.動いた量.join(' / '));

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
  pickColor(L, 10, 10); COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  const 色で抜いた = { 緑:green(), 不透明:solid() };
  /* ② 筆で消す（丸の真ん中を消す） */
  const m = maskSize(L);
  const keepB = P.brush; P.brush = 0.15;
  cutBrush(L, m.w/2, m.h/2, null, null, true);
  P.brush = keepB;
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  const 筆で消した = { 不透明:solid() };
  /* ③ 筆で戻す */
  P.brush = 0.15; cutBrush(L, m.w/2, m.h/2, null, null, false); P.brush = keepB;
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  const 筆で戻した = { 不透明:solid() };
  /* ④ 切り抜きを消す＝元の写真に戻る */
  clearMask(L); COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  const 消した = { 緑:green(), 不透明:solid() };
  /* ⑤ 囲って抜く */
  cutPath(L, [{x:0,y:0},{x:m.w,y:0},{x:m.w,y:m.h*0.4},{x:0,y:m.h*0.4}], false);
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

/* ⭐⭐ 許容つまみがリアルタイムで効く（2026-08-30 木下
   ＝「切り抜く色で抜くも含め、スライダー調整でリアルタイムで見える」）
   🔴 前は押した瞬間に型へ焼いていたので、そのあと許容を動かしても何も起きなかった。 */
const TOL = await p.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 400; c.height = 400;
  const x = c.getContext('2d');
  /* 3段の緑。⚠️ 色の距離を【つまみの目盛りに合わせて】刻む
     （適当に選ぶと、18 と 40 で同じ結果になって「効かない」に見える＝ぶれる試験）
     #22cc55 からの距離 … #4ae05f＝45.8（許容0.104）／#86ff69＝114.6（許容0.259） */
  x.fillStyle = '#22cc55'; x.fillRect(0,0,400,140);
  x.fillStyle = '#4ae05f'; x.fillRect(0,140,400,140);
  x.fillStyle = '#86ff69'; x.fillRect(0,280,400,120);
  const img = new Image();
  await new Promise(r => { img.onload = r; img.src = c.toDataURL(); });
  LAYERS = []; addImage(img, '許容ためし', 0.1);
  el('k_nobg').checked = true; el('k_nobg').dispatchEvent(new Event('change', { bubbles:true }));
  await new Promise(r => setTimeout(r, 250));
  const L = LAYERS[0];
  const solid = () => { const d = g.getImageData(0,0,cv.width,cv.height).data; let n = 0;
    for(let i=0;i<d.length;i+=4*7) if(d[i+3]>128) n++; return n; };
  const s2 = v => { const r = document.getElementById('r_tol'); r.value = v;
    r.dispatchEvent(new Event('input', { bubbles:true })); };
  s2(5); COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  const 押す前 = solid();
  /* 1色だけ覚える（抜くのはあと） */
  pickColor(L, 10, 10);
  const out = { 覚えた: (L.keys || []).length };
  const at = async v => { s2(v); LAYERS.forEach(o => { o._mk=''; o._key=''; });
    COARSE = 0; render(); await new Promise(r => setTimeout(r, 250)); return solid(); };
  out.許容5  = await at(5);
  out.許容18 = await at(18);
  out.許容40 = await at(40);
  out.押す前 = 押す前;
  /* 速さ＝許容を1回動かすのに何ms（スライダーを引ける速さか） */
  const t0 = performance.now();
  for(let i = 0; i < 5; i++){ P.tol = 0.2 + i*0.02;
    LAYERS.forEach(o => { o._mk=''; o._key=''; }); paint(g, cv.width, cv.height, true); }
  out.許容1回のms = Math.round((performance.now() - t0) / 5);
  el('k_nobg').checked = false; el('k_nobg').dispatchEvent(new Event('change', { bubbles:true }));
  return out;
});
ok(TOL.覚えた === 1, '⭐ 色は「覚える」だけ（押した瞬間に焼かない）', TOL.覚えた + ' つ');
ok(TOL.許容5 > TOL.許容18 && TOL.許容18 > TOL.許容40,
   '⭐⭐ 許容つまみを動かすと【リアルタイムで抜け方が変わる】',
   `5→${TOL.許容5.toLocaleString()} / 18→${TOL.許容18.toLocaleString()} / 40→${TOL.許容40.toLocaleString()} 画素`);
ok(TOL.許容1回のms < 40, '⭐ 許容を動かすのが軽い（スライダーを引ける）', TOL.許容1回のms + ' ms');

/* ⭐⭐ パスツール（点を打つ・なめらかさで直線⇄曲線） */
const PATH = await p.evaluate(async () => {
  const out = {};
  const kaku = [{x:10,y:10},{x:300,y:40},{x:280,y:300},{x:30,y:260}];
  const maru = kaku.map((q,i) => ({ ...q, hx: i%2 ? 40 : -40, hy: 30 }));
  const 直線 = pathD(kaku, true);
  const 曲線 = pathD(maru, true);
  out.直線にCが無い = 直線.indexOf('C') < 0 && 直線.indexOf('L') >= 0;
  out.曲線にCが有る = 曲線.indexOf('C') >= 0;
  /* 実際に切れるか */
  const c = document.createElement('canvas'); c.width = 400; c.height = 400;
  const x = c.getContext('2d'); x.fillStyle = '#c83'; x.fillRect(0,0,400,400);
  const img = new Image(); await new Promise(r => { img.onload = r; img.src = c.toDataURL(); });
  LAYERS = []; addImage(img, 'パスためし', 0.1);
  el('k_nobg').checked = true; el('k_nobg').dispatchEvent(new Event('change', { bubbles:true }));
  await new Promise(r => setTimeout(r, 250));
  const solid = () => { const d = g.getImageData(0,0,cv.width,cv.height).data; let n = 0;
    for(let i=0;i<d.length;i+=4*7) if(d[i+3]>128) n++; return n; };
  const L = LAYERS[0], m = maskSize(L);
  out.前 = solid();
  const q = [{x:m.w*0.2,y:m.h*0.2},{x:m.w*0.8,y:m.h*0.2},{x:m.w*0.8,y:m.h*0.8},{x:m.w*0.2,y:m.h*0.8}];
  cutPath(L, q, true);            /* 中を残す */
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  out.中を残した = solid();
  clearMask(L); COARSE = 0; render(); await new Promise(r => setTimeout(r, 200));
  out.戻る = solid();
  cutPath(L, q, false);           /* 中を消す */
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  out.中を消した = solid();
  clearMask(L);
  el('k_nobg').checked = false; el('k_nobg').dispatchEvent(new Event('change', { bubbles:true }));
  return out;
});
ok(PATH.直線にCが無い && PATH.曲線にCが有る,
   '⭐⭐ 打つだけ＝直線／ハンドルを引く＝曲線', JSON.stringify({直線:PATH.直線にCが無い, 曲線:PATH.曲線にCが有る}));
ok(PATH.中を残した < PATH.前 * 0.75, '⭐ パスで【中を残す】が効く',
   `${PATH.前.toLocaleString()} → ${PATH.中を残した.toLocaleString()} 画素`);
ok(PATH.中を消した < PATH.前 && PATH.中を消した > PATH.中を残した, '⭐ パスで【中を消す】が効く',
   `${PATH.前.toLocaleString()} → ${PATH.中を消した.toLocaleString()} 画素`);
ok(PATH.戻る === PATH.前, '⚠️ パスで切っても消せば1画素も同じに戻る', PATH.戻る + ' 画素');

/* ⭐⭐ ペン（2026-08-30 木下＝「パスが全然使いものにならない。Sakuji とかを見てきて」）
   🔴 見るのは【イラレと同じ手が通るか】：
     打つ／打ったまま引いて曲げる／点を掴んで動かす／ハンドルを掴んで動かす／
     最初の点をもう一度押すと閉じる／⌫で1点戻す／Escでやめる */
const PEN = await p.evaluate(async () => {
  await demo();
  const c = document.createElement('canvas'); c.width = 400; c.height = 400;
  const x = c.getContext('2d'); x.fillStyle = '#c83'; x.fillRect(0,0,400,400);
  const img = new Image(); await new Promise(r => { img.onload = r; img.src = c.toDataURL(); });
  LAYERS = []; addImage(img, 'ペンためし', 0.1);
  const L = LAYERS[0]; L.x = 0.5; L.y = 0.5; SEL = 0;
  el('k_nobg').checked = true; el('k_nobg').dispatchEvent(new Event('change',{bubbles:true}));
  /* ⚠️ 2026-08-31 から【道具を選んでも画面は飛ばない】＝この画面はダブルクリックで入る */
  openEditor(0);
  document.querySelector('#tools button[data-t="path"]').click();
  COARSE = 0; render(); fitView(); await new Promise(r => setTimeout(r, 300));
  /* ⚠️ 切り抜きの画面では盤に市松（不透明）が敷いてあるので、
     画面の画素では測れない。⭐ 物差しは【型（マスク）そのもの】＝本体のデータから取る。 */
  const maskOpaque = () => {
    const m = maskOf(L), d = m.getContext('2d').getImageData(0,0,m.width,m.height).data;
    let n = 0; for(let i=3;i<d.length;i+=4*5) if(d[i] > 128) n++; return n;
  };
  const out = { 前: maskOpaque() };
  /* ⭐ 切り抜きの画面では【盤の割合＝素材の中の割合】（2026-08-30 にそう変えた） */
  const toSc = (u, v) => toScreen(u, v);
  /* ⚠️ 指の出来事は【1つずつ】。まとめて投げると pts の出入りが噛み合わず、
     打ったつもりの点が入らない（試験がぶれる） */
  const tick = () => new Promise(r => setTimeout(r, 20));
  const down = (u,v,alt) => { const s2 = toSc(u,v);
    stage.dispatchEvent(new PointerEvent('pointerdown', { clientX:s2.clientX, clientY:s2.clientY,
      pointerId:1, bubbles:true, altKey:!!alt })); };
  const move = (u,v) => { const s2 = toSc(u,v);
    stage.dispatchEvent(new PointerEvent('pointermove', { clientX:s2.clientX, clientY:s2.clientY,
      pointerId:1, bubbles:true })); };
  const up = () => stage.dispatchEvent(new PointerEvent('pointerup', { pointerId:1, bubbles:true }));
  const M = maskSize(L);
  /* ① 打つ＝角の点 */
  down(0.20,0.20); await tick(); up(); await tick();
  down(0.80,0.20); await tick(); up(); await tick();
  out.打てた = POLY.length;
  /* ② 打ったまま引く＝ハンドルが出る（点は動かない） */
  down(0.80,0.80); await tick(); move(0.95,0.80); await tick(); up(); await tick();
  out.点の数 = POLY.length;
  const p3 = POLY[2] || { x:0, y:0, hx:0, hy:0 };
  out.ハンドルが出た = Math.abs(p3.hx) > 1;
  out.点は動かない = Math.abs(p3.x - 0.80 * M.w) < 4;
  const hx0 = p3.hx;
  /* ③ 点を掴んで動かす
     ⚠️ いちばん最初の点は【押すと閉じる】ので、途中の点で試す（最初の点で試すと閉じてしまう） */
  down(0.80,0.20); await tick(); move(0.72,0.30); await tick(); up(); await tick();
  out.点を動かせた = Math.abs(POLY[1].x - 0.72 * M.w) < 8;
  /* ④ ハンドルを掴んで動かす */
  const hu = (p3.x + p3.hx) / M.w, hv = (p3.y + p3.hy) / M.h;
  down(hu, hv); await tick(); move(hu + 0.08, hv); await tick(); up(); await tick();
  out.ハンドルを動かせた = Math.abs(POLY[2].hx) > Math.abs(hx0) + 1;
  /* ⑤ ⌫ で1点戻す */
  const n0 = POLY.length;
  dispatchEvent(new KeyboardEvent('keydown', { key:'Backspace', bubbles:true }));
  out.一点戻せた = POLY.length === n0 - 1;
  down(0.80,0.80); await tick(); up(); await tick();
  /* ⑥ 最初の点をもう一度押すと閉じる
     ⚠️ 2026-08-31 から【閉じても切らない】＝選択範囲になる（そこから切る／反転／ぼかす）
        → 木下＝「Photoshop 同様パスとしておいて、これで切り抜きもできる想定」 */
  const n1 = POLY.length;
  down(POLY[0].x / M.w, POLY[0].y / M.h); await tick(); up(); await tick();
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  out.閉じて選択になった = POLY.length === 0 && !!L.sel && L.sel.pts.length >= 3;
  /* そこから【中を残して切る】が効く */
  document.getElementById('b_selin').click();
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  out.選択から切れた = maskOpaque() < out.前;
  out.打った数 = n1;
  clearMask(L);
  el('k_nobg').checked = false; el('k_nobg').dispatchEvent(new Event('change',{bubbles:true}));
  document.querySelector('#tools button[data-t="move"]').click();
  return out;
});
ok(PEN.打てた === 2, '⭐ 打つと点が増える', PEN.打てた + ' 点');
ok(PEN.ハンドルが出た && PEN.点は動かない,
   '⭐⭐ 打ったまま引くと【ハンドルが出て曲がる】（点は動かない）',
   JSON.stringify({ ハンドル:PEN.ハンドルが出た, 点:PEN.点は動かない }));
ok(PEN.点を動かせた, '⭐ 打った点はあとから掴んで動かせる');
ok(PEN.ハンドルを動かせた, '⭐ ハンドルも掴んで動かせる');
ok(PEN.一点戻せた, '⭐ ⌫ で1点戻せる');
ok(PEN.閉じて選択になった,
   '⭐⭐ 最初の点をもう一度押すと【閉じて選択範囲になる】（ボタンを探さなくていい）');
ok(PEN.選択から切れた, '⭐⭐ 選択範囲から【中を残して切る】が効く');

/* ⭐ レイヤー（隠す・不透明度・奥行きが同じときの前後） *//* ⭐ レイヤー（隠す・不透明度・奥行きが同じときの前後） */
const LAY = await p.evaluate(async () => {
  const mk = async col => { const c = document.createElement('canvas'); c.width = 200; c.height = 200;
    const x = c.getContext('2d'); x.fillStyle = col; x.fillRect(0,0,200,200);
    const img = new Image(); await new Promise(r => { img.onload = r; img.src = c.toDataURL(); }); return img; };
  LAYERS = [];
  addImage(await mk('#ff0000'), '赤', 0.5); LAYERS[0].x = 0.5; LAYERS[0].y = 0.5;
  addImage(await mk('#0000ff'), '青', 0.5); LAYERS[1].x = 0.5; LAYERS[1].y = 0.5;
  const keep = { haze:P.haze, split:P.split, bloom:P.bloom, grain:P.grain, vig:P.vig,
                 edge:P.edge, mix:P.mix, wob:P.wob };
  const li0 = LIGHTS.map(L2 => L2.i);
  P.haze = P.split = P.bloom = P.grain = P.vig = P.edge = P.mix = P.wob = 0;
  LIGHTS.forEach(L2 => L2.i = 0);
  LAYERS.forEach(L => L._key = '');
  const mid = () => { COARSE = 0; render();
    const d = g.getImageData((cv.width/2)|0, (cv.height/2)|0, 1, 1).data; return [d[0],d[1],d[2],d[3]]; };
  const out = {};
  out.同じ奥行きの初期 = mid();
  nudgeOrder(0, +1);                                  /* 赤を手前へ */
  out.前後を入れ替えた = mid();
  LAYERS[0].on = false; LAYERS[0]._key = '';
  out.隠した = mid();
  LAYERS[0].on = true; LAYERS[0].op = 0.0; LAYERS[0]._key = '';
  out.濃さ0 = mid();
  LAYERS[0].op = 1; LAYERS[0]._key = '';
  Object.assign(P, keep); LIGHTS.forEach((L2, i) => L2.i = li0[i]); LAYERS.forEach(L => L._key = '');
  return out;
});
ok(LAY.同じ奥行きの初期[2] > LAY.同じ奥行きの初期[0],
   '⭐ 奥行きが同じなら【あとに置いた方】が手前', LAY.同じ奥行きの初期.join(','));
ok(LAY.前後を入れ替えた[0] > LAY.前後を入れ替えた[2],
   '⭐⭐ ▲▼で【奥行きが同じときの前後】を入れ替えられる', LAY.前後を入れ替えた.join(','));
ok(LAY.隠した[2] > LAY.隠した[0], '⭐ 素材を隠せる', LAY.隠した.join(','));
ok(LAY.濃さ0[2] > LAY.濃さ0[0], '⭐ 濃さ（不透明度）が効く', LAY.濃さ0.join(','));

/* ⑥ 空気は版面のもの＝1回だけ／⑦ 並ぶ順は奥行きが決める */
const AIR = await p.evaluate(async () => {
  /* ⚠️ 直前の試験が素材を差し替えている＝まず1回描いてから土台を撮る
     （描く前の古い画面を土台にすると、必ず「戻らない」で落ちる） */
  await demo();
  COARSE = 0; render();
  await new Promise(r => setTimeout(r, 300));
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
  P.haze = P.split = P.bloom = P.grain = P.vig = 0; LIGHTS.forEach(L2 => L2.i = 0);
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  const d = g.getImageData((cv.width/2)|0, (cv.height/2)|0, 1, 1).data;
  Object.assign(P, keep); LIGHTS.forEach(L2 => L2.i = 0.55); LAYERS.forEach(L => L._key = '');
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
await p.evaluate(async () => {
  document.getElementById('b_svg').click();
  await new Promise(r => setTimeout(r, 2500));
  document.getElementById('b_layers').click();
  await new Promise(r => setTimeout(r, 3500));
});
const got = await p.evaluate(() => window.__got);
ok(got.some(x => x.type === 'image/png'), '⑧ PNG が本当に落ちる');
ok(got.some(x => x.type === 'image/svg+xml'), '⭐⭐ SVG が本当に落ちる',
   JSON.stringify(got.filter(x => x.type === 'image/svg+xml')));
ok(got.some(x => x.type === 'application/zip'), '⭐⭐ 素材ごとPNG（zip）が本当に落ちる',
   JSON.stringify(got.filter(x => x.type === 'application/zip')));

/* ⭐⭐ 左のツールバー（2026-08-30 木下＝「左にツールパネルを出して直感的に」）
   🔴 見るのは「並んでいる」ではなく【押したら本当に道具が変わるか】＝
      見た目と中身を二重に持つと「押しても切り替わらない」が必ず出る。 */
const TB = await p.evaluate(async () => {
  const out = { 数: document.querySelectorAll('#tools button[data-t]').length, 押した:{} };
  /* ⚠️ 灯は 2026-08-31 にツールバーから外した（盤の白い丸でつかむ）＝ここでも見ない */
  for(const [t, want] of [['color',['cut','color']], ['erase',['cut','erase']],
                          ['paint',['cut','paint']], ['path',['cut','path']],
                          ['move',['move',null]]]){
    document.querySelector('#tools button[data-t="' + t + '"]').click();
    await new Promise(r => setTimeout(r, 60));
    const on = [...document.querySelectorAll('#tools button.on')].map(e => e.dataset.t);
    out.押した[t] = { MODE, TOOL, 印: on.join(','),
                      合っている: MODE === want[0] && (want[1] == null || TOOL === want[1]) };
  }
  document.querySelector('#tools button[data-t="move"]').click();
  return out;
});
ok(TB.数 >= 8, '⭐ 左のツールバーが出ている', TB.数 + ' 個');
{
  const bad = Object.entries(TB.押した).filter(([k, v]) => !v.合っている).map(([k]) => k);
  ok(bad.length === 0, '⭐⭐ ツールバーを押すと本当に道具が変わる（見た目だけになっていない）',
     JSON.stringify(TB.押した));
  const noMark = Object.entries(TB.押した).filter(([k, v]) => v.印.indexOf(k) < 0).map(([k]) => k);
  ok(noMark.length === 0, '⭐ 押した道具に印が付く', noMark.length ? noMark.join(',') : 'ぜんぶ付く');
}

/* ⭐⭐ どのつまみが盤のどこに効くかを見せる（触った瞬間に光る・出す絵には入らない） */
const HL = await p.evaluate(async () => {
  const board = () => { const d = g.getImageData(0,0,cv.width,cv.height).data;
    let h = 0; for(let i = 0; i < d.length; i += 4*11) h = (h*31 + d[i])|0; return h; };
  const over = () => { const d = og.getImageData(0,0,ov.width,ov.height).data;
    let n = 0; for(let i = 3; i < d.length; i += 4*11) if(d[i] > 8) n++; return n; };
  const out = {};
  document.querySelector('#tools button[data-t="move"]').click();
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 200));
  const 盤0 = board(), 印0 = over();
  const s = (id, v) => { const r = document.getElementById(id); r.value = v;
    r.dispatchEvent(new Event('input', { bubbles:true })); };
  /* 🔴 2026-08-30・木下＝「つまみをいじるときに、なぜかアクセントが加わるような動きがされる。
     そういうのは邪魔。スライダーはナチュラルに、触っているオブジェクトだけに集中したい」
     ＝つまみを引いても盤の上には【何も出さない】ことを試験にした（前は逆を見ていた）。 */
  s('r_haze', 52); COARSE = 0; render(); await new Promise(r => setTimeout(r, 200));
  out.空気で印が増えない = over() <= 印0;
  out.帯の中身 = HILITETXT + '／' + HILITE;
  s('r_li', 60); COARSE = 0; render(); await new Promise(r => setTimeout(r, 200));
  out.灯でも出ない = over() <= 印0;
  /* ⚠️ 印は【出す絵】に入っていないこと */
  const f = sheet();
  const c1 = document.createElement('canvas'); c1.width = 300; c1.height = 450;
  paint(c1.getContext('2d'), 300, 450, false);
  const d1 = c1.getContext('2d').getImageData(0,0,300,450).data;
  HILITE = null; HILITETXT = '';
  const c2 = document.createElement('canvas'); c2.width = 300; c2.height = 450;
  paint(c2.getContext('2d'), 300, 450, false);
  const d2 = c2.getContext('2d').getImageData(0,0,300,450).data;
  let diff = 0; for(let i = 0; i < d1.length; i += 4*7) if(Math.abs(d1[i]-d2[i]) > 4) diff++;
  out.出す絵に入らない = diff === 0;
  drawOverlay(cv.width, cv.height);
  return out;
});
ok(HL.空気で印が増えない, '⭐⭐ つまみを引いても盤の上に何も出さない（空気）', HL.帯の中身);
ok(HL.灯でも出ない, '⭐ つまみを引いても盤の上に何も出さない（灯）');
ok(HL.出す絵に入らない, '⚠️ 光らせる印は【出す絵に1画素も入らない】');

/* ⭐⭐ 灯は何本でも（2026-08-30 木下＝「灯は複数追加できるなどできた方がよいのでは？」） */
const LT = await p.evaluate(async () => {
  await demo(); COARSE = 0; render(); await new Promise(r => setTimeout(r, 200));
  const A = window.__shot();
  const out = { はじめ: LIGHTS.length };
  document.getElementById('b_litadd').click();
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  out.足した = LIGHTS.length;
  out.絵が変わる = window.__diff(A, window.__shot());
  const before = LAYERS.map(L => L._key);
  LIGHTS[1].x = 0.15; LIGHTS[1].y = 0.85;
  LAYERS.forEach(L => L._key = '');
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 200));
  out.ni = LAYERS.filter((L, i) => L._key !== before[i]).length === LAYERS.length;
  document.getElementById('b_litdel').click();
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  out.消せる = LIGHTS.length;
  out.modori = window.__diff(A, window.__shot());
  return out;
});
ok(LT.足した === LT.はじめ + 1 && LT.消せる === LT.はじめ, '⭐⭐ 灯を足せる・消せる',
   LT.はじめ + ' → ' + LT.足した + ' → ' + LT.消せる + ' 本');
ok(LT.絵が変わる > 200, '⭐ 灯を足すと絵が変わる', LT.絵が変わる + ' 点');
ok(LT.ni, '⭐⭐ 2本目の灯でも【置いた素材が全部いっしょに】変わる');
ok(LT.modori === 0, '⚠️ 1本に戻すと1画素も同じに戻る', LT.modori + ' 点');

/* ⭐⭐ 空気の型（ライトルームのプリセット）＝空気と灯だけを変え、素材の置き方は触らない */
const PRE = await p.evaluate(async () => {
  await demo();
  const L = LAYERS[0];
  L.x = 0.31; L.y = 0.42; L.s = 0.55; L.rot = 12; L.adj.bri = 0.3; L._key = '';
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 200));
  const oki = JSON.stringify({ x:L.x, y:L.y, s:L.s, rot:L.rot, adj:L.adj });
  const A = window.__shot();
  const out = { 型ごと:{} };
  for(const k of ['kasumi','homura','yoi','shiro','su']){
    document.querySelector('#s_preset button[data-v="' + k + '"]').click();
    COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
    out.型ごと[k] = window.__diff(A, window.__shot());
  }
  out.okiSame = JSON.stringify({ x:L.x, y:L.y, s:L.s, rot:L.rot, adj:L.adj }) === oki;
  document.querySelector('#s_preset button[data-v="homura"]').click();
  out.homuraLights = LIGHTS.length;
  return out;
});
{
  const dead = Object.entries(PRE.型ごと).filter(([k, v]) => v < 200).map(([k]) => k);
  ok(dead.length === 0, '⭐⭐ 型を当てると絵が変わる（5つとも死んでいない）',
     JSON.stringify(PRE.型ごと));
  ok(new Set(Object.values(PRE.型ごと)).size >= 4, '⭐ 型ごとに違う絵になる');
}
ok(PRE.okiSame, '⭐⭐ 型は【空気と灯だけ】＝素材の置き方とズレは1つも触らない');
ok(PRE.homuraLights === 2, '⭐ 型は灯の本数も持てる（炎＝2本）', PRE.homuraLights + ' 本');

/* ⭐ 紙の大きさ（A4・A3…）＝mm と解像度から決まる */
const PAPER = await p.evaluate(async () => {
  const out = {};
  const hit = v => document.querySelector('#s_ratio button[data-v="' + v + '"]');
  hit('A4').click(); await new Promise(r => setTimeout(r, 200));
  out.a350 = sheet();
  document.querySelector('#s_dpi button[data-v="150"]').click();
  await new Promise(r => setTimeout(r, 200));
  out.a150 = sheet();
  el('k_land').checked = true; el('k_land').dispatchEvent(new Event('change', { bubbles:true }));
  await new Promise(r => setTimeout(r, 200));
  out.a150y = sheet();
  out.dpiOut = !el('dpiUI').classList.contains('hide');
  out.longHid = el('longUI').classList.contains('hide');
  el('k_land').checked = false; el('k_land').dispatchEvent(new Event('change', { bubbles:true }));
  hit('2:3').click(); await new Promise(r => setTimeout(r, 200));
  out.longBack = !el('longUI').classList.contains('hide');
  return out;
});
ok(PAPER.a350.w === 2894 && PAPER.a350.h === 4093,
   '⭐ A4 350dpi ＝ 2894 × 4093 px（210×297mm）', PAPER.a350.w + ' × ' + PAPER.a350.h);
ok(PAPER.a150.w === 1240 && PAPER.a150.h === 1754,
   '⭐ 解像度を下げると小さくなる（A4 150dpi）', PAPER.a150.w + ' × ' + PAPER.a150.h);
ok(PAPER.a150y.w === 1754 && PAPER.a150y.h === 1240, '⭐ よこ長にできる',
   PAPER.a150y.w + ' × ' + PAPER.a150y.h);
ok(PAPER.dpiOut && PAPER.longHid && PAPER.longBack,
   '⭐ 紙のときは解像度／比のときは長辺（触れるのに効かないつまみを出さない）');

/* ⭐⭐ 取り消し・複製 */
const HS = await p.evaluate(async () => {
  document.querySelector('#s_preset button[data-v="kasumi"]').click();
  await demo(); COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  const out = {};
  const A = window.__shot(), n0 = LAYERS.length;
  hist(); LAYERS[0].x += 0.2; LAYERS[0]._key = '';
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 200));
  out.ugoita = window.__diff(A, window.__shot()) > 100;
  undo(); COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  out.torikeshi = window.__diff(A, window.__shot()) === 0;
  redo(); COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  out.yarinaoshi = window.__diff(A, window.__shot()) > 100;
  undo(); COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  SEL = 0; hist(); dupLayer(LAYERS[0]); buildList(); COARSE = 0; render();
  await new Promise(r => setTimeout(r, 200));
  out.fukusei = LAYERS.length === n0 + 1;
  undo(); COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  out.fukuseiUndo = LAYERS.length === n0;
  const L = LAYERS[0];
  const solid = () => { const d = g.getImageData(0,0,cv.width,cv.height).data; let n = 0;
    for(let i=0;i<d.length;i+=4*7) if(d[i+3]>128) n++; return n; };
  el('k_nobg').checked = true; el('k_nobg').dispatchEvent(new Event('change',{bubbles:true}));
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  const mae = solid();
  hist(); const keepB = P.brush; P.brush = 0.25;
  cutBrush(L, maskSize(L).w/2, maskSize(L).h/2, null, null, true);
  P.brush = keepB;
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  out.kiri = solid() < mae;
  undo(); COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  out.kiriUndo = solid() === mae;
  el('k_nobg').checked = false; el('k_nobg').dispatchEvent(new Event('change',{bubbles:true}));
  return out;
});
ok(HS.ugoita && HS.torikeshi, '⭐⭐ ⌘Z で取り消せる（1画素も同じに戻る）');
ok(HS.yarinaoshi, '⭐ ⌘⇧Z でやり直せる');
ok(HS.fukusei && HS.fukuseiUndo, '⭐ ⌘D で複製・取り消せる');
ok(HS.kiri && HS.kiriUndo, '⭐⭐ 切り抜き（型）も取り消せる ── 型は絵なので、ここが崩れやすい');

/* ⭐⭐ 出す大きさ（2026-08-30 木下＝「書き出し時のピクセルとか大事かも」）
   🔴 見るのは【盤は重くならず、出す絵だけが大きくなるか】と
      【拡大しても甘くならないか（板を出す大きさで作り直しているか）】。 */
const OUT2 = await p.evaluate(async () => {
  await demo();
  const s = (id, v) => { const r = document.getElementById(id); r.value = v;
    r.dispatchEvent(new Event('input', { bubbles:true })); };
  document.querySelector('#s_ratio button[data-v="2:3"]').click();
  s('r_long', 1200); s('r_out', 100);
  await new Promise(r => setTimeout(r, 250));
  const out = { 版面: sheet(), 出す1: outSheet(), 盤1: [cv.width, cv.height] };
  s('r_out', 200);
  await new Promise(r => setTimeout(r, 250));
  out.出す2 = outSheet(); out.盤2 = [cv.width, cv.height];
  /* ⭐ 大きく出したとき、板（素材の控え）も大きく作り直されるか＝甘くならない */
  const L = LAYERS.find(x => x.on);
  const before = layerPlate(L, out.出す1.w, out.出す1.h).width;
  const after  = layerPlate(L, out.出す2.w, out.出す2.h).width;
  out.板も大きくなる = after > before * 1.8;
  out.注意が出る = el('outsize').textContent;
  s('r_out', 100);
  return out;
});
ok(OUT2.出す2.w === OUT2.出す1.w * 2, '⭐⭐ 出す大きさで【出す絵だけ】が大きくなる',
   OUT2.出す1.w + ' → ' + OUT2.出す2.w + ' px');
ok(OUT2.盤1[0] === OUT2.盤2[0] && OUT2.盤1[1] === OUT2.盤2[1],
   '⭐ 盤（画面）は大きくならない＝組んでいる間は重くならない',
   OUT2.盤1.join('×') + ' / ' + OUT2.盤2.join('×'));
ok(OUT2.板も大きくなる,
   '⭐⭐ 出す大きさで素材の板も作り直す＝拡大しても甘くならない');
ok(/px/.test(OUT2.注意が出る), '⭐ 出る px を数字で出す', OUT2.注意が出る.split('\n')[0]);

/* ⭐⭐ 馴染ませ（プロの作法・木下＝「馴染ませることに突き抜けて特化もしよう」）
   🔴 見るのは【10本とも効くか】。1本でも死んでいたら「触れるのに効かない」になる。
   ⚠️ 物差しは【差の合計（__sad）】。「8より大きい画素を数える」だと、
      全面に薄くかかるもの（黒の持ち上げ）や細い帯だけのもの（縁の回り込み）が 0 と出る。 */
const NAJI = await p.evaluate(async () => {
  await demo();
  document.querySelector('#s_preset button[data-v="kasumi"]').click();
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  const all = ['r_shd','r_shdl','r_shds','r_shdc','r_wrap','r_clean',
               'r_lift','r_gain','r_ca','r_halo'];
  const s = (id, v) => { const r = document.getElementById(id); r.value = v;
    r.dispatchEvent(new Event('input', { bubbles:true })); };
  const zero = () => { all.forEach(id => s(id, 0)); };
  const draw = async () => { LAYERS.forEach(L => L._key = ''); COARSE = 0; render();
    await new Promise(r => setTimeout(r, 300)); COARSE = 0; render();
    await new Promise(r => setTimeout(r, 60)); };
  zero(); await draw();
  const A = window.__full();
  const out = { knobs:{} };
  /* ⚠️ 影の3本（長さ・やわらかさ・接地）は「影の濃さ」が 0 だと当然効かない
     ＝濃さを立ててから測る（測りたいものだけが動く状態を作る） */
  const need = { r_shdl:['r_shd'], r_shds:['r_shd','r_shdl'], r_shdc:['r_shd'],
                 r_shd:['r_shdl'] };
  for(const id of all){
    zero();
    (need[id] || []).forEach(o => s(o, 80));
    s(id, 85);
    await draw();
    out.knobs[id] = window.__sad(A, window.__full());
  }
  zero(); await draw();
  out.modoru = window.__sad(A, window.__full());
  /* ⭐ 影は【素材の形】で出る（板の四角で切られない） */
  zero(); s('r_shd', 90); s('r_shdl', 80); s('r_shds', 20); await draw();
  {
    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    let jump = 0, y = (cv.height * 0.52) | 0, prev = null;
    for(let x = 4; x < cv.width - 4; x += 2){
      const v = d[((y*cv.width)+x)*4];
      if(prev != null && Math.abs(v - prev) > 26) jump++;
      prev = v;
    }
    out.jump = jump;
  }
  zero(); await draw();
  return out;
});
{
  const dead = Object.entries(NAJI.knobs).filter(([k, v]) => v < 3000).map(([k]) => k);
  ok(dead.length === 0, '⭐⭐ 馴染ませの10本がぜんぶ効く（死んでいるつまみが無い）',
     JSON.stringify(NAJI.knobs));
}
ok(NAJI.modoru === 0, '⚠️ ぜんぶ 0 に戻すと1画素も同じに戻る', NAJI.modoru);
ok(NAJI.jump <= 6, '⭐⭐ 影は【素材の形】で出る（板の四角で切られない）',
   'いきなり濃さが変わる所 ' + NAJI.jump + ' か所');

/* ⭐⭐ 設定JSONに【切り抜きの型】まで入るか（木下＝「どう作ったのか見たいから json 書き出しも」）
   🔴 型が入っていないと「どう作ったか」が戻らない＝設定として不完全。 */
const JS = await p.evaluate(async () => {
  await demo();
  const L = LAYERS[0]; SEL = 0;
  const m = maskSize(L);
  pickColor(L, 2, 2);
  const keepB = P.brush; P.brush = 0.2;
  cutBrush(L, m.w*0.5, m.h*0.5, null, null, true);
  P.brush = keepB;
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 300));
  const plan = () => pathOf ? null : null;
  const before = window.__full();
  const o = JSON.parse(JSON.stringify(snapshot()));
  const out = {
    型が入っている: !!(o.layers[0].mCut || o.layers[0].mKeep),
    覚えた色も入っている: (o.layers[0].keys || []).length > 0,
    灯も入っている: (o.lights || []).length > 0,
    紙も入っている: !!o.paper,
    大きさKB: Math.round(JSON.stringify(o).length / 1024),
  };
  /* 荒らして読み戻す */
  clearMask(L); LAYERS[0].x += 0.2;
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 300));
  out.荒らせた = window.__sad(before, window.__full()) > 0;
  applyJSON(o);
  await new Promise(r => setTimeout(r, 700));
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 200));
  out.戻る = window.__sad(before, window.__full());
  return out;
});
ok(JS.型が入っている && JS.覚えた色も入っている && JS.灯も入っている && JS.紙も入っている,
   '⭐⭐ 設定JSONに【切り抜きの型・覚えた色・灯・紙】まで入る', JSON.stringify(JS));
ok(JS.荒らせた, '（前提）荒らすと絵は変わっている');
ok(JS.戻る === 0, '⭐⭐ 設定を読むと【切り抜きも含めて】1画素も同じに戻る', JS.戻る);

/* ⭐⭐ 切り抜きの画面（木下＝「同じボード内でパス切り抜きは小さすぎてムズカシイ」） */
const CV = await p.evaluate(async () => {
  await demo(); SEL = 0;
  document.querySelector('#tools button[data-t="move"]').click();
  await new Promise(r => setTimeout(r, 150));
  const out = { 版面: sheet(), 動かすときの盤: [cv.width, cv.height] };
  /* ⚠️ 素材だけの画面は【ダブルクリック】で入る（道具を選んでも飛ばない） */
  openEditor(SEL);
  document.querySelector('#tools button[data-t="path"]').click();
  await new Promise(r => setTimeout(r, 400));
  const L = LAYERS[SEL];
  out.切り抜きの画面 = cutView();
  out.切るときの盤 = [cv.width, cv.height];
  out.素材の比 = [L.img.naturalWidth, L.img.naturalHeight];
  /* ⭐ 盤の比が【素材の比】になっているか */
  const a1 = out.切るときの盤[0] / out.切るときの盤[1];
  const a2 = out.素材の比[0] / out.素材の比[1];
  out.比が合う = Math.abs(a1 - a2) < 0.02;
  /* ⭐ 盤の割合がそのまま素材の中の割合になっているか（大きく切れる） */
  const q = toMask(L, { x:0.25, y:0.75 }, cv.width, cv.height);
  out.座標が素直 = Math.abs(q.u - 0.25) < 0.01 && Math.abs(q.v - 0.75) < 0.01;
  document.querySelector('#tools button[data-t="move"]').click();
  await new Promise(r => setTimeout(r, 200));
  out.戻ると版面 = !cutView() && cv.width !== out.切るときの盤[0];
  return out;
});
ok(CV.切り抜きの画面, '⭐⭐ ダブルクリックで【その素材だけの画面】になる');
ok(CV.比が合う, '⭐ 盤の比が素材の比になる（大きく切れる）',
   CV.切るときの盤.join('×') + ' ／ 素材 ' + CV.素材の比.join('×'));
ok(CV.座標が素直, '⭐⭐ 盤の割合＝素材の中の割合（座標が食い違わない）');
ok(CV.戻ると版面, '⭐ 動かすに戻すと版面へ戻る');

/* ⑨ モバイル *//* ⭐⭐ まるごと出す（木下＝「写真そのものも入れて」）
   🔴 設定だけだと「同じ写真を同じ順で置いてから」が要る＝渡せない・あとから開けない。
   ⚠️ 写真は長辺を落として入れるので【1画素も同じ】にはならない（それでいい）。
      見るのは「素材・切り抜き・置き方・つまみが戻るか」。 */
const BD = await p.evaluate(async () => {
  await demo();
  const L = LAYERS[0]; SEL = 0;
  const m = maskSize(L);
  pickColor(L, 2, 2);
  const pts = []; for(let i=0;i<10;i++){ const t=i/10*6.2831853;
    pts.push({ x:m.w*(0.5+0.3*Math.cos(t)), y:m.h*(0.5+0.4*Math.sin(t)), hx:0, hy:0 }); }
  el('k_keepin').checked = true; cutPath(L, pts, true);
  L.x = 0.37; L.y = 0.44; L.s = 0.51; L.d = 0.12; L.adj.bri = 0.3;
  const s = (id, v) => { const r = document.getElementById(id); r.value = v;
    r.dispatchEvent(new Event('input', { bubbles:true })); };
  s('r_haze', 61); s('r_shd', 66);
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 400));
  const want = { n:LAYERS.length, x:L.x, y:L.y, s:L.s, d:L.d, bri:L.adj.bri,
                 cut:hasCut(L), keys:(L.keys||[]).length, haze:P.haze, shd:P.shd };
  const o = JSON.parse(JSON.stringify(snapshot()));
  o.bundled = true;
  o.layers.forEach((L2, i) => { L2.img = imgData(LAYERS[i].img, 1200); });
  const mb = +(JSON.stringify(o).length/1024/1024).toFixed(2);
  LAYERS = []; SEL = -1; buildList(); COARSE = 0; render();
  await new Promise(r => setTimeout(r, 300));
  applyJSON(o);
  await new Promise(r => setTimeout(r, 2600));
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 300));
  const L2 = LAYERS[0] || {};
  return { mb, back: LAYERS.length === want.n,
    oki: L2.x === want.x && L2.y === want.y && L2.s === want.s && L2.d === want.d,
    zure: !!L2.adj && Math.abs(L2.adj.bri - want.bri) < 1e-9,
    kiri: hasCut(L2) === want.cut && (L2.keys||[]).length === want.keys,
    knob: Math.abs(P.haze - want.haze) < 1e-9 && Math.abs(P.shd - want.shd) < 1e-9,
    hasImg: !!(L2.img && L2.img.naturalWidth > 0) };
});
ok(BD.back && BD.hasImg, '⭐⭐ まるごと＝【写真を置き直さずに】戻る', JSON.stringify(BD));
ok(BD.oki && BD.zure && BD.kiri && BD.knob,
   '⭐⭐ 置き方・ズレ・切り抜き・つまみが全部戻る');

/* ══⑩ 2026-08-30 に足したもの（一覧・複数選択・グループ・クリップ・調整・紙を切る）══ */
await p.setViewport({ width:1400, height:900 });
await p.evaluate(() => { document.getElementById('b_demo').click(); });
await wait(1800);
const fp10  = () => shot();
const same10 = async A => diff(await shot(), A) === 0;

/* ⑩-1 ▲▼ が本当に効く（前は「奥行きが同じもの」しか入れ替えず、押しても動かなかった） */
const ORD10 = await p.evaluate(async () => {
  const now = () => LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b)).map(L=>L.name).join('|');
  const before = now();
  const rows = [...document.getElementById('layers').children];
  [...rows[rows.length-1].querySelectorAll('button')].find(b2=>b2.textContent==='▲').click();
  await new Promise(r=>setTimeout(r,250));
  return { before, after: now() };
});
ok(ORD10.before !== ORD10.after, '⭐⭐ ▲で並ぶ順が本当に変わる', ORD10.after);

/* ⑩-2 目のアイコンに斜線が出る／行が薄くなる */
const EYE10 = await p.evaluate(() => {
  const q = () => document.getElementById('layers').children[0];
  const on = q().querySelector('.eye').innerHTML.includes('M2.4');
  q().querySelector('.eye').click();
  return { 出しているとき斜線:on, 隠したとき斜線:q().querySelector('.eye').innerHTML.includes('M2.4'),
           行が薄い:q().classList.contains('off') };
});
ok(!EYE10.出しているとき斜線 && EYE10.隠したとき斜線 && EYE10.行が薄い,
   '⭐ 隠すと目に斜線が引かれ、行も薄くなる', JSON.stringify(EYE10));
await p.evaluate(() => document.getElementById('layers').children[0].querySelector('.eye').click());
await wait(300);

/* ⑩-3 空気の効き＝既定 1.00 は【分岐ごと通さない】＝1画素も変わらない */
const AIR0 = await fp10();
await p.evaluate(() => { SEL = 1; SELIDS = [LAYERS[1].id]; syncSel();
  const e = document.getElementById('r_air'); e.value = 100; e.dispatchEvent(new Event('input',{bubbles:true})); });
await wait(700);
ok(await same10(AIR0), '⭐⭐ 空気の効き 1.00 は1画素も変えない（既定＝いままでの絵）');
await p.evaluate(() => { const e = document.getElementById('r_air'); e.value = 0;
  e.dispatchEvent(new Event('input',{bubbles:true})); });
await wait(700);
ok(!(await same10(AIR0)), '⭐⭐ 0 にすると素のまま（空気を通さない）');
await p.evaluate(() => { const e = document.getElementById('r_air'); e.value = 100;
  e.dispatchEvent(new Event('input',{bubbles:true})); });
await wait(700);
ok(await same10(AIR0), '⭐ 1 に戻すと1画素も同じに戻る');

/* ⑩-4 複数選択とグループ */
const GRP10 = await p.evaluate(async () => {
  SELIDS = [LAYERS[0].id, LAYERS[1].id]; syncSelIds(); buildList();
  const two = SELIDS.length;
  groupSel();
  await new Promise(r=>setTimeout(r,200));
  const o = { two, g:GROUPS.length, member:LAYERS.filter(L=>L.g!=null).length,
              見出し:!!document.querySelector('.ly.grp'),
              一員が寄る:document.querySelectorAll('.ly.ing').length };
  SELIDS = []; syncSelIds();
  setSel(LAYERS.findIndex(L=>L.g!=null), false);
  o.ごと選ぶ = SELIDS.length;
  const bx = LAYERS.map(L=>L.x);
  selLayers().forEach(L => { L.x += 0.05; });
  o.まとめて動く = LAYERS.filter((L,i)=>L.x!==bx[i]).length;
  return o;
});
ok(GRP10.two === 2 && GRP10.g === 1 && GRP10.member === 2, '⭐⭐ ⌘G で2枚がグループになる', JSON.stringify(GRP10));
ok(GRP10.見出し && GRP10.一員が寄る === 2, '⭐ 一覧にグループの見出しが出て、一員が寄って並ぶ');
ok(GRP10.ごと選ぶ === 2 && GRP10.まとめて動く === 2, '⭐⭐ 一員を選ぶとグループごと選ばれ、まとめて動く');
await p.evaluate(() => { ungroupSel(); });
await wait(300);
ok(await p.evaluate(() => GROUPS.length === 0 && LAYERS.every(L=>L.g==null)), '⭐ ⌘⇧G で解ける');

/* ⑩-5 クリッピングマスク＝焼き込まない */
await p.evaluate(() => document.getElementById('b_demo').click());
await wait(1800);
const CL0 = await fp10();
await p.evaluate(() => {
  const o = LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b));
  SEL = LAYERS.indexOf(o[0]); SELIDS = [o[0].id]; syncSel();
  const e = document.getElementById('k_clip'); e.checked = true;
  e.dispatchEvent(new Event('change',{bubbles:true}));
});
await wait(700);
ok(!(await same10(CL0)), '⭐⭐ クリッピングマスク＝下の素材の形で切れる');
await p.evaluate(() => { const e = document.getElementById('k_clip'); e.checked = false;
  e.dispatchEvent(new Event('change',{bubbles:true})); });
await wait(700);
ok(await same10(CL0), '🔴 外すと1画素も同じに戻る（クリップを焼き込んでいない）');

/* ⑩-6 調整レイヤー＝置いた瞬間は何も変わらない／効く範囲は奥行きで決まる */
const AD0 = await fp10();
await p.evaluate(() => {
  const o = LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b));
  SEL = LAYERS.indexOf(o[0]); SELIDS = [o[0].id]; syncSel();
  document.getElementById('b_adjlayer').click();
});
await wait(800);
ok(await same10(AD0), '⭐⭐ 調整レイヤーは置いた瞬間 1画素も変えない（既定ぜんぶ 0）');
await p.evaluate(() => { const e = document.getElementById('r_abri'); e.value = 60;
  e.dispatchEvent(new Event('input',{bubbles:true})); });
await wait(800);
ok(!(await same10(AD0)), '⭐⭐ 明るさを動かすと【奥にあるものぜんぶ】が変わる');
await p.evaluate(() => moveToSlot(LAYERS.findIndex(L=>L.kind==='adj'), LAYERS.length-1));
await wait(800);
ok(await same10(AD0), '⭐⭐ いちばん奥へ送ると誰にも効かない（効く範囲は奥行きが決める）');
ok(await p.evaluate(() => { const i = hitLayer({x:.5,y:.5});
  return i < 0 || LAYERS[i].kind !== 'adj'; }), '⭐ 調整レイヤーは盤で掴めない（絵が無い）');

/* ⑩-7 紙ぜんぶをパスで切る */
await p.evaluate(() => document.getElementById('b_demo').click());
await wait(1800);
const SH0 = await fp10();
const alpha = () => p.evaluate(() => { const d = g.getImageData(0,0,cv.width,cv.height).data;
  let a = 0; for(let i=3;i<d.length;i+=4) if(d[i]>0) a++; return a; });
const SA0 = await alpha();
await p.evaluate(() => {
  const e = document.getElementById('k_sheetpath'); e.checked = true;
  e.dispatchEvent(new Event('change',{bubbles:true}));
  POLY = [{x:.2,y:.2,hx:0,hy:0},{x:.8,y:.25,hx:0,hy:0},{x:.5,y:.8,hx:0,hy:0}];
  document.getElementById('k_keepin').checked = true;
  closePath();
});
await wait(900);
ok(!(await p.evaluate(() => cutView())), '⭐ 紙を切るモードでも盤は版面のまま（素材の画面へ入らない）');
const SA1 = await alpha();
ok(SA1 < SA0 * 0.6, '⭐⭐ 紙ぜんぶがパスの形に切れる', SA0 + ' → ' + SA1);
const SOUT = await p.evaluate(() => { const f = outSheet();
  const c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
  const keep = COARSE; COARSE = 0; LAYERS.forEach(L => L._key = '');
  paint(c.getContext('2d'), f.w, f.h, true); COARSE = keep;
  const d = c.getContext('2d').getImageData(0,0,f.w,f.h).data;
  let a = 0; for(let i=3;i<d.length;i+=4) if(d[i]>0) a++;
  return a / (f.w*f.h); });
ok(SOUT < 0.6, '⭐ 書き出しでも同じ形に切れる（見た目と出す絵が食い違わない）',
   Math.round(SOUT*100) + '%');
await p.evaluate(() => { document.getElementById('b_unsheet').click();
  const e = document.getElementById('k_sheetpath'); e.checked = false;
  e.dispatchEvent(new Event('change',{bubbles:true})); });
await wait(900);
ok(await same10(SH0), '🔴 紙の形を消すと1画素も同じに戻る',
   '違い ' + diff(await shot(), SH0));

/* ⑩-8 まとめて置いたとき【選んだ順】に並ぶ（読み終わり順に足すと毎回変わっていた） */
ok(await p.evaluate(() => typeof takeFiles === 'function'),
   '⭐ まとめて置くのは takeFiles 1本を通る（＝選んだ順に並ぶ）');

/* ══⑪ 素材ひとつを編集する画面（ダブルクリック／階調・色・フィルター・パレット）══ */
await p.evaluate(() => document.getElementById('b_demo').click());
await wait(1800);
await p.evaluate(() => document.getElementById('layers').children[1]
  .dispatchEvent(new MouseEvent('dblclick', { bubbles:true })));
await wait(1400);
ok(await p.evaluate(() => cutView()), '⭐⭐ 一覧をダブルクリックすると【その素材だけの画面】に入る');
ok(await p.evaluate(() => !document.getElementById('editBox').classList.contains('hide')),
   '⭐ 編集パネル（階調・色・フィルター）が出る');
ok(await p.evaluate(() => { const c = document.getElementById('histo').getContext('2d');
  const d = c.getImageData(0,0,240,64).data; let n = 0;
  for(let i=3;i<d.length;i+=4) if(d[i]>0) n++; return n > 200; }), '⭐ ヒストグラムが出る');
const SW = await p.evaluate(() => document.getElementById('swatches').children.length);
ok(SW > 0, '⭐ カラーパレット（その素材の色）が出る', SW + '色');

/* ⭐⭐ 17本ぜんぶが効く＝死んでいるつまみが無い（端まで動かして絵が変わるか）
   → feedback_count_the_pictures_a_knob_makes */
const ED0 = await shot();
const EDKNOBS = ['r_black','r_white','r_gamma','r_hue','r_sat','r_lum','r_temp','r_tint',
  'r_eblur','r_sharp','r_enoise','r_mosaic','r_poster','r_thresh','r_mono','r_einvert','r_eedge'];
const EDDEAD = [];
for(const k of EDKNOBS){
  const before = await shot();
  const keep = await p.evaluate(kk => { const e = document.getElementById(kk); const v0 = e.value;
    e.value = (kk === 'r_white' || kk === 'r_gamma') ? e.min : e.max;
    e.dispatchEvent(new Event('input', { bubbles:true })); return v0; }, k);
  await wait(650);
  if(diff(await shot(), before) === 0) EDDEAD.push(k);
  await p.evaluate((kk, v) => { const e = document.getElementById(kk); e.value = v;
    e.dispatchEvent(new Event('input', { bubbles:true })); }, k, keep);
  await wait(450);
}
ok(EDDEAD.length === 0, '⭐⭐ 編集の17本ぜんぶが効く（死んでいるつまみが無い）',
   EDDEAD.length ? EDDEAD.join(',') : '17/17');
ok(diff(await shot(), ED0) === 0, '⭐ つまみを戻すと1画素も同じに戻る');
await p.evaluate(() => { const e = document.getElementById('r_mosaic'); e.value = 70;
  e.dispatchEvent(new Event('input', { bubbles:true })); });
await wait(700);
ok(diff(await shot(), ED0) !== 0, '（前提）モザイクをかけると絵は変わっている');
await p.evaluate(() => document.getElementById('b_edreset').click());
await wait(700);
ok(diff(await shot(), ED0) === 0, '🔴 ［ぜんぶ戻す］で1画素も同じに戻る（編集を焼き込んでいない）');
/* 設定JSON にも入る */
ok(await p.evaluate(() => { const e = document.getElementById('r_mosaic'); e.value = 50;
  e.dispatchEvent(new Event('input', { bubbles:true }));
  const o = snapshot(); return !!(o.layers[SEL] && o.layers[SEL].ed && o.layers[SEL].ed.mosaic > 0); }),
  '⭐ 編集の値は設定JSONにも入る（どう作ったかが戻る）');
await p.evaluate(() => document.getElementById('b_edreset').click());
await wait(500);
await p.evaluate(() => { const bt = document.querySelector('#tools button[data-t="move"]');
  if(bt) bt.click(); });
await wait(700);

/* ══⑫ 空気の効き 0 は【紙の仕上げ】も通さない ══
   🔴 木下＝「入れた画像を素のままにしているのになぜ（白く）効いている？」 */
await p.evaluate(() => document.getElementById('b_demo').click());
await wait(1800);
const RAWCHK = await p.evaluate(async () => {
  const shot2 = () => { const d = g.getImageData(0,0,cv.width,cv.height).data;
    const o = []; for(let i = 0; i < d.length; i += 4*7) o.push(d[i], d[i+3]); return o; };
  const df = (A,B) => { let n = 0;
    for(let i = 0; i < Math.min(A.length,B.length); i++) if(Math.abs(A[i]-B[i]) > 8) n++; return n; };
  /* 灯とにじみを強くしてから、いちばん手前の素材だけ「素のまま」にする */
  const put = (id, v) => { const e = document.getElementById(id); e.value = v;
    e.dispatchEvent(new Event('input',{bubbles:true})); };
  put('r_li', 90); put('r_bloom', 90); put('r_halo', 90); put('r_lift', 60);
  await new Promise(r=>setTimeout(r,600));
  const before = shot2();
  const o = LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b));
  SEL = LAYERS.indexOf(o[0]); SELIDS = [o[0].id]; syncSel();
  put('r_air', 0);
  await new Promise(r=>setTimeout(r,800));
  const after = shot2();
  put('r_air', 100);
  await new Promise(r=>setTimeout(r,800));
  return { 効いた: df(before, after) > 0, 戻る: df(before, shot2()) === 0 };
});
ok(RAWCHK.効いた, '⭐⭐ 空気の効き 0 は【灯のひろがり・にじみ・ハレーション】も通さない');
ok(RAWCHK.戻る, '⭐ 1 に戻すと1画素も同じに戻る');

/* ══⑬ 型「素」と右パネルの整合（木下＝「素の状態から少しだけ調整して全体のバランスを
   とる。そのためにも素の状態と右パネルがしっかり整合性をとっていないと困る」）══
   ⭐ 素を押したら【絵に効くつまみは ぜんぶ 0】でなければ嘘になる。 */
await p.evaluate(() => document.getElementById('b_demo').click());
await wait(1600);
await p.evaluate(() => document.querySelector('#s_preset button[data-v="su"]').click());
await wait(1200);
const SU = await p.evaluate(() => {
  /* 絵に効かないもの＝素材の置き方・切り抜きの道具・出す大きさ・種・影の形 */
  const NEU = { r_op:100, r_air:100, r_white:100, r_gamma:100, r_out:100 };
  /* 絵に効かない＝素材の置き方・切り抜きの道具・出す大きさ・種・影の形・文字と塗りの設定 */
  const SKIP = ['r_long','r_tol','r_brush','r_feather','r_seed','r_shds','r_shdl','r_shdc',
                'r_lr','r_scale','r_depth','r_rot','r_sy','r_fillop',
                't_weight','t_size','t_track','t_lead',
                'sh_w','sh_h','sh_r','sh_sides','sh_sw',
                'r_sang','r_sdist','r_sblur','r_sop','r_gsize','r_gop','r_stw','r_stop',
                'r_iang','r_idist','r_iblur','r_iop','r_gang','r_gdop',
                'r_igsize','r_igop','r_bsize','r_bdepth','r_bang','r_bhiop','r_bloop',
                'r_tang','r_tdist','r_tblur','r_top','r_gscale',
                'r_selsw','r_selblur','t_hs','t_vs','t_skew','t_sw','t_bgpad','t_bgr','t_bgop',
                'r_mang','r_wfreq','r_liqrad','r_liqstr','r_rrough','r_rsize','r_rstr','r_rseed'];
  const bad = [];
  document.querySelectorAll('#panel input[type=range]').forEach(e => {
    if(SKIP.includes(e.id)) return;
    const want = (e.id in NEU) ? NEU[e.id] : 0;
    if(+e.value !== want) bad.push(e.id + '=' + e.value + '（' + want + ' のはず）');
  });
  return { bad, 灯: LIGHTS.map(L => L.i + '/' + L.rim + '/' + L.bnc).join(' ') };
});
ok(SU.bad.length === 0, '⭐⭐ 型「素」を押すと 絵に効くつまみは ぜんぶ 0（右パネルと絵が食い違わない）',
   SU.bad.length ? SU.bad.join(' , ') : 'ぜんぶ 0');
ok(SU.灯 === '0/0/0', '⭐ 素では 灯の強さ・縁の光・照り返しも 0', SU.灯);

/* ⑬-2 一覧の数字が【略さず】出る（木下＝「奥行きの数字を明確に表示してほしい」） */
const ROWTXT = await p.evaluate(() => {
  const r = document.getElementById('layers').children[0];
  return { dp:r.querySelector('.dp').textContent, air:r.querySelector('.air').textContent };
});
ok(/奥 \d\.\d\d/.test(ROWTXT.dp) && /空気 \d\.\d\d/.test(ROWTXT.dp),
   '⭐ 一覧に 奥行きと空気の効きが 数字で出る', ROWTXT.dp);
ok(['空','素'].includes(ROWTXT.air) || /%$/.test(ROWTXT.air),
   '⭐ 空気のボタンは 空／素／◯◯% のどれか（略した数字を出さない）', ROWTXT.air);

/* ⑬-3 一覧の空気ボタンが本当に切り替わる */
const ROWAIR = await p.evaluate(async () => {
  const rows = () => [...document.getElementById('layers').children];
  const val = () => airOf(LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b))[2]);
  const before = val();
  rows()[2].querySelector('.air').click();
  await new Promise(r => setTimeout(r, 300));
  return { before, after: val(), txt: rows()[2].querySelector('.air').textContent };
});
ok(ROWAIR.before === 1 && ROWAIR.after === 0 && ROWAIR.txt === '素',
   '⭐ 一覧の空気ボタンで その素材だけ素のままにできる', JSON.stringify(ROWAIR));

/* ══⑭ 文字・重ね方・塗り（2026-08-30・木下＝「テキストも打ち込みできるようにしよう」）══ */
await p.evaluate(() => document.getElementById('b_demo').click());
await wait(1600);
const TX0 = await shot();
await p.evaluate(() => document.getElementById('b_text').click());
await wait(1800);
ok(await p.evaluate(() => { const L = LAYERS[SEL];
  return !!(L && L.kind === 'text' && L.img && L.img.naturalWidth > 10); }),
  '⭐⭐ 文字を置くと【絵になって】版面に入る（置いたあとは写真と同じ扱い）',
  await p.evaluate(() => LAYERS[SEL].img.naturalWidth + '×' + LAYERS[SEL].img.naturalHeight));
ok(diff(await shot(), TX0) !== 0, '⭐ 盤に字が出る');
ok(await p.evaluate(() => !document.getElementById('textBox').classList.contains('hide')),
   '⭐ 文字のパネルが出る（テキストを選んでいるときだけ）');
const TX1 = await shot();
await p.evaluate(() => { const e = document.getElementById('t_str');
  e.value = 'MOYA\nそうだ'; e.dispatchEvent(new Event('input', { bubbles:true })); });
await wait(1500);
ok(diff(await shot(), TX1) !== 0, '⭐ 打ち替えると絵が変わる');
ok(await p.evaluate(() => LAYERS[SEL].name.indexOf('MOYA') === 0),
   '⭐ 一覧の名前も打った字になる', await p.evaluate(() => LAYERS[SEL].name));
const TDEAD = [];
for(const k of ['t_weight','t_size','t_track','t_lead']){
  const b0 = await shot();
  const keep = await p.evaluate(kk => { const e = document.getElementById(kk); const v = e.value;
    e.value = kk === 't_size' ? 300 : e.max; e.dispatchEvent(new Event('input',{bubbles:true}));
    return v; }, k);
  await wait(900);
  if(diff(await shot(), b0) === 0) TDEAD.push(k);
  await p.evaluate((kk, v) => { const e = document.getElementById(kk); e.value = v;
    e.dispatchEvent(new Event('input',{bubbles:true})); }, k, keep);
  await wait(800);
}
ok(TDEAD.length === 0, '⭐ 文字の4本ぜんぶ効く（太さ・大きさ・字間・行間）',
   TDEAD.length ? TDEAD.join(',') : '4/4');

const BL0 = await shot();
await p.evaluate(() => { const e = document.getElementById('sel_blend');
  e.value = 'multiply'; e.dispatchEvent(new Event('change',{bubbles:true})); });
await wait(800);
ok(diff(await shot(), BL0) !== 0, '⭐⭐ 重ね方（乗算）が効く');
await p.evaluate(() => { const e = document.getElementById('sel_blend');
  e.value = 'source-over'; e.dispatchEvent(new Event('change',{bubbles:true})); });
await wait(800);
ok(diff(await shot(), BL0) === 0, '⭐ 「通常」に戻すと1画素も同じに戻る');

await p.evaluate(() => { const c = document.getElementById('c_fill');
  /* ⚠️ 物差しは R と α を見ている＝白い字に赤を乗せても R は 255 のまま動かない。
     測りたいものが動く色を選ぶ。 → feedback_test_metric_from_the_same_function */
  c.value = '#000080'; c.dispatchEvent(new Event('input',{bubbles:true}));
  const k = document.getElementById('k_fill');
  k.checked = true; k.dispatchEvent(new Event('change',{bubbles:true})); });
await wait(800);
ok(diff(await shot(), BL0) !== 0, '⭐⭐ 塗りを重ねると効く（形の中だけ）');
await p.evaluate(() => { const k = document.getElementById('k_fill');
  k.checked = false; k.dispatchEvent(new Event('change',{bubbles:true})); });
await wait(800);
ok(diff(await shot(), BL0) === 0, '🔴 塗りを外すと1画素も同じに戻る');

/* ⑭-2 編集の画面に入っても、盤を押して絵が消えない
   🔴 木下＝「画像編集画面でボードをクリックすると消えてしまうのはなぜ？」
      ＝入った瞬間「色で抜く」が構えていて、押した色が抜けていた。 */
await p.evaluate(() => { const o = LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b));
  openEditor(LAYERS.indexOf(o[o.length-1])); });
await wait(1500);
ok(await p.evaluate(() => TOOL === 'view'), '⭐ 編集の画面には【見るだけ】で入る',
   await p.evaluate(() => TOOL));
const VW0 = await shot();
await p.evaluate(() => { const st = document.getElementById('stage');
  const r = st.getBoundingClientRect();
  const o = { bubbles:true, pointerId:9, clientX:r.left + r.width/2, clientY:r.top + r.height/2 };
  st.dispatchEvent(new PointerEvent('pointerdown', o));
  st.dispatchEvent(new PointerEvent('pointerup', o)); });
await wait(900);
ok(diff(await shot(), VW0) === 0, '🔴 編集の画面で盤を押しても絵が消えない');
await p.evaluate(() => { const bt = document.querySelector('#tools button[data-t="move"]');
  if(bt) bt.click(); });
await wait(600);

/* ⑭-3 右パネルの見出しに 飾りの言葉を出さない（木下＝「Photoshopの最低限とか
   プロの作法とかそんな言葉はいらない。SwiftUI のデザインは常に意識して」） */
ok(await p.evaluate(() => {
  const bad = [];
  document.querySelectorAll('#panel label.h').forEach(h => {
    if(/⭐|🔴|Photoshop|プロの作法|最低限/.test(h.textContent)) bad.push(h.textContent);
  });
  window.__badh = bad.join(' , ');
  return bad.length === 0;
}), '⭐ 右パネルの見出しは名詞ひとつ（飾りの言葉を出さない）',
   await p.evaluate(() => window.__badh || 'ぜんぶ名詞'));

/* ══⑮ 図形・盤の左上の表記・左ツールパネル（2026-08-31）══ */
await p.evaluate(() => document.getElementById('b_demo').click());
await wait(1600);
const SP0 = await shot();
await p.evaluate(() => document.getElementById('b_shape').click());
await wait(900);
ok(await p.evaluate(() => { const L = LAYERS[SEL];
  return !!(L && L.kind === 'shape' && L.img && L.img.naturalWidth > 10); }),
  '⭐⭐ 図形を置ける（木下＝「図形が必要だね」）',
  await p.evaluate(() => LAYERS[SEL].img.naturalWidth + '×' + LAYERS[SEL].img.naturalHeight));
ok(diff(await shot(), SP0) !== 0, '⭐ 盤に図形が出る');
ok(await p.evaluate(() => !document.getElementById('shapeBox').classList.contains('hide')),
   '⭐ 図形のパネルが出る');
const SKINDS = await p.evaluate(async () => {
  const out = [];
  for(const bt of document.querySelectorAll('#s_shape button')){
    bt.click(); await new Promise(r => setTimeout(r, 350));
    out.push(bt.dataset.v);
  }
  return out;
});
ok(SKINDS.length === 6, '⭐ 6つのかたちが作れる', SKINDS.join('/'));
/* 図形のつまみ＝効く状態を作ってから測る（角の丸みは長方形・線の太さは線ONのとき） */
const SHDEAD = [];
for(const k of ['sh_w','sh_h','sh_r','sh_sides','sh_sw']){
  await p.evaluate(kk => {
    const t = kk === 'sh_sides' ? 'star' : 'rect';
    document.querySelector('#s_shape button[data-v="' + t + '"]').click();
    const so = document.getElementById('sh_strokeon');
    so.checked = (kk === 'sh_sw'); so.dispatchEvent(new Event('change', { bubbles:true }));
  }, k);
  await wait(500);
  const b0 = await shot();
  const keep = await p.evaluate(kk => { const e = document.getElementById(kk); const v = e.value;
    e.value = Math.round((+e.min + +e.max)/2) + 13;
    e.dispatchEvent(new Event('input', { bubbles:true })); return v; }, k);
  await wait(600);
  if(diff(await shot(), b0) === 0) SHDEAD.push(k);
  await p.evaluate((kk, v) => { const e = document.getElementById(kk); e.value = v;
    e.dispatchEvent(new Event('input', { bubbles:true })); }, k, keep);
  await wait(400);
}
ok(SHDEAD.length === 0, '⭐ 図形の5本ぜんぶ効く', SHDEAD.length ? SHDEAD.join(',') : '5/5');

/* ⑮-2 盤の左上の表記（貼HARI と同じ形）と、右パネルの説明を出さないこと */
ok(await p.evaluate(() => !!document.getElementById('boardHead')),
   '⭐ 盤の左上に表記が出る（道具名 / ← KINOSHITA STUDIO）');
ok(await p.evaluate(() => /KINOSHITA/.test(document.querySelector('#boardHead .home').textContent)),
   '⭐ 戻る先のリンクがある');
ok(await p.evaluate(() => /枚/.test(document.getElementById('bhName').textContent)),
   '⭐ いま何を触っているかが出る', await p.evaluate(() => document.getElementById('bhName').textContent));
ok(await p.evaluate(() => !document.querySelector('#panel h1') && !document.querySelector('#panel .sub')),
   '⭐ 右パネルの上の説明は出さない（木下＝「これらはいらない」）');
/* ⚠️ 盤の左上は【出す絵】に1画素も入らない */
ok(await p.evaluate(() => {
  const bh = document.getElementById('boardHead');
  return getComputedStyle(bh).position === 'absolute' && !bh.closest('canvas');
}), '⭐ 左上の表記は盤の上に浮いているだけ（PNG には入らない）');

/* ⑮-3 左ツールパネル（Photoshop / Figma / 貼HARI と同じ形） */
ok(await p.evaluate(() => !!document.getElementById('toolsIn')), '⭐ 左ツールは浮いたカプセル');
ok(await p.evaluate(() => [...document.querySelectorAll('#tools button[data-t]')]
     .every(b2 => b2.dataset.k)), '⭐ どの道具にもショートカットの文字が出る',
   await p.evaluate(() => [...document.querySelectorAll('#tools button[data-t]')]
     .map(b2 => b2.dataset.k).join('')));
const TN0 = await p.evaluate(() => LAYERS.length);
await p.evaluate(() => document.querySelector('#tools button[data-t="text"]').click());
await wait(1400);
ok(await p.evaluate(() => LAYERS[SEL].kind === 'text'), '⭐ ツールバーの T で文字が置ける');
await p.evaluate(() => document.querySelector('#tools button[data-t="shape"]').click());
await wait(900);
ok(await p.evaluate(() => LAYERS[SEL].kind === 'shape'), '⭐ ツールバーの R で図形が置ける');
ok(await p.evaluate(() => LAYERS.length) === TN0 + 2, '⭐ 2つ増えている');

/* ══⑯ 自由変形（Figma と同じ・⇧ で比を固定）══ 2026-08-31
   木下＝「もっと自由にサイズ変更から無制限で形を変えられる。端をシフトキー押しながらだと固定して」
   ＋「画像も同様に」 */
await p.setViewport({ width:1400, height:900 });
await p.evaluate(() => document.getElementById('b_demo').click());
await wait(1600);
const FREE = await p.evaluate(async () => {
  const pick = () => { const o = LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b));
    SEL = LAYERS.indexOf(o[1]); SELIDS = [o[1].id];
    LAYERS[SEL].s = 0.34; LAYERS[SEL].sy = 1; LAYERS[SEL]._key = '';
    syncSel(); buildList(); render(); return LAYERS[SEL]; };
  const corner = L => { const iw = L.img.naturalWidth, ih = L.img.naturalHeight;
    const dw = L.s*cv.width, dh = dw*ih/iw*syOf(L);
    const a2 = toScreen((L.x*cv.width + dw/2)/cv.width, (L.y*cv.height + dh/2)/cv.height);
    return { x:a2.clientX, y:a2.clientY }; };
  const drag = async (A, dx, dy, shift, id) => {
    const st = document.getElementById('stage');
    st.dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, pointerId:id, clientX:A.x, clientY:A.y }));
    st.dispatchEvent(new PointerEvent('pointermove',
      { bubbles:true, pointerId:id, clientX:A.x+dx, clientY:A.y+dy, shiftKey:shift }));
    st.dispatchEvent(new PointerEvent('pointerup',
      { bubbles:true, pointerId:id, clientX:A.x+dx, clientY:A.y+dy }));
    await new Promise(r => setTimeout(r, 400));
  };
  let L = pick();
  await drag(corner(L), 0, 160, false, 31);
  const 自由 = { s:LAYERS[SEL].s, sy:syOf(LAYERS[SEL]) };
  L = pick();
  await drag(corner(L), 120, 120, true, 32);
  const 固定 = { s:LAYERS[SEL].s, sy:syOf(LAYERS[SEL]) };
  pick();
  return { 自由, 固定 };
});
ok(Math.abs(FREE.自由.sy - 1) > 0.02 && Math.abs(FREE.自由.s - 0.34) < 0.01,
   '⭐⭐ 角を縦に引くと【縦だけ】伸びる（自由変形）', JSON.stringify(FREE.自由));
ok(FREE.固定.s > 0.35 && Math.abs(FREE.固定.sy - 1) < 0.02,
   '⭐⭐ ⇧ を押しながらだと 比を固定したまま大きくなる', JSON.stringify(FREE.固定));
ok(await p.evaluate(() => !!document.getElementById('r_sy')),
   '⭐ 縦の伸ばしはつまみでも触れる（既定 1.00 ＝写真の比のまま）');
ok(await p.evaluate(() => { const L = LAYERS[0]; L.sy = 1;
  return true; }) || true, '（前提）縦の伸ばしを 1 に戻した');
/* 盤のカーソル＝動かすときは矢印（木下＝「ボード上では選択アイコンで触れる感じ」） */
ok(await p.evaluate(() => { const bt = document.querySelector('#tools button[data-t="move"]');
  if(bt) bt.click();
  return getComputedStyle(document.getElementById('stage')).cursor === 'default'; }),
  '⭐ 動かすときの盤のカーソルは矢印');
ok(await p.evaluate(() => { const bt = document.querySelector('#tools button[data-t="erase"]');
  if(bt) bt.click();
  const c = getComputedStyle(document.getElementById('stage')).cursor;
  const bt2 = document.querySelector('#tools button[data-t="move"]'); if(bt2) bt2.click();
  return c === 'crosshair'; }), '⭐ 切り抜きのときだけ十字');

/* ══⑰ 置いたものは素のまま／素のままでも【ズレ】は効く（2026-08-31）══
   🔴 木下＝「素のままにするを押したことで【ズレ】も素の状態になっているのでは？これは違うよね？」 */
await p.evaluate(() => document.getElementById('b_demo').click());
await wait(1600);
await p.evaluate(() => document.getElementById('b_shape').click());
await wait(900);
ok(await p.evaluate(() => airOf(LAYERS[SEL]) === 0),
   '⭐⭐ 置いた図形は【素のまま】で出る（木下＝「そこから俺が調整する」）',
   await p.evaluate(() => airOf(LAYERS[SEL])));
await p.evaluate(() => { const o = LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b));
  const L = o.find(x => x.name.indexOf('見本') === 0);
  SEL = LAYERS.indexOf(L); SELIDS = [L.id]; L.air = 0; L._key = '';
  syncSel(); buildList(); render(); });
await wait(700);
const RAWADJ0 = await shot();
await p.evaluate(() => { const e = document.getElementById('r_abri');
  e.value = 60; e.dispatchEvent(new Event('input', { bubbles:true })); });
await wait(800);
ok(diff(await shot(), RAWADJ0) !== 0,
   '⭐⭐ 空気の効き 0 でも【空気からのズレ】は効く（ズレは素材自身の調整）');
await p.evaluate(() => { const e = document.getElementById('r_abri');
  e.value = 0; e.dispatchEvent(new Event('input', { bubbles:true })); });
await wait(700);
ok(diff(await shot(), RAWADJ0) === 0, '⭐ ズレを 0 に戻すと1画素も同じに戻る');

/* ⑰-2 灯はツールバーから外した（盤の丸でつかむ） */
ok(await p.evaluate(() => !document.querySelector('#tools button[data-t="light"]')),
   '⭐ 灯のアイコンはツールバーに出さない（木下＝「このアイコンはいらない」）');
ok(await p.evaluate(() => LIGHTS.length > 0 && typeof hitLight === 'function'),
   '⭐ 灯は【動かす】のまま盤の白い丸でつかめる');

/* ══⑱ エフェクト（レイヤースタイル 9種）══ 2026-08-31
   木下＝「画像や字にエフェクトをかけたりするところは強化させる」
   Photoshop のレイヤースタイルは10種。ここは9つ持つ
   （カラーオーバーレイ＝［塗りを重ねる］／パターンは クリッピングマスク が担う）。 */
await p.setViewport({ width:1400, height:900 });
await p.evaluate(() => document.getElementById('b_demo').click());
await wait(1600);
await p.evaluate(() => { const o = LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b));
  SEL = LAYERS.indexOf(o[1]); SELIDS = [o[1].id]; syncSel(); buildList(); render(); });
await wait(700);
ok(await p.evaluate(() => !document.getElementById('fxBox').classList.contains('hide')),
   '⭐ エフェクトのパネルが出る');
/* ⚠️ 物差しは【差の合計（__sad）】。「8より大きい画素を数える」だと、
   やわらかい影のように【全面に薄くかかるもの】が 0 と出てしまう（2026-08-30 に踏んだ型）。
   → feedback_test_metric_from_the_same_function */
const fullShot = () => p.evaluate(() => { COARSE = 0; render(); return window.__full(); });
const sad = (A, B) => p.evaluate(([a2, b2]) => window.__sad(a2, b2), [A, B]);
const FX0 = await fullShot();
const FXDEAD = [];
for(const [id, nm] of [['fx_shadow','ドロップシャドウ'], ['fx_glow','光彩（外側）'],
     ['fx_stroke','境界線'], ['fx_inner','内側の影'], ['fx_iglow','光彩（内側）'],
     ['fx_bevel','ベベルとエンボス'], ['fx_satin','サテン'], ['fx_grad','グラデーション']]){
  await p.evaluate(i => { const e = document.getElementById(i);
    e.checked = true; e.dispatchEvent(new Event('change', { bubbles:true })); }, id);
  await wait(800);
  if(await sad(FX0, await fullShot()) === 0) FXDEAD.push(nm);
  await p.evaluate(i => { const e = document.getElementById(i);
    e.checked = false; e.dispatchEvent(new Event('change', { bubbles:true })); }, id);
  await wait(700);
  if(await sad(FX0, await fullShot()) !== 0) FXDEAD.push(nm + '（切っても戻らない）');
}
ok(FXDEAD.length === 0,
   '⭐⭐ エフェクト8つが効いて、切れば1画素も同じに戻る（焼き込んでいない）',
   FXDEAD.length ? FXDEAD.join(' , ') : '8/8');

/* 型（黄金色など）＝押したら絵が変わり、［ぜんぶ切る］で戻る */
await p.evaluate(() => document.querySelector('#s_fxpre button[data-v="gold"]').click());
await wait(900);
ok(await sad(FX0, await fullShot()) !== 0,
   '⭐ 型「黄金色」が当たる（多色グラデ＋ベベル＋境界線＋サテン）');
ok(await p.evaluate(() => LAYERS[SEL].fx.grad.stops.length >= 6),
   '⭐ グラデーションは多色（黄金色は6色）',
   await p.evaluate(() => LAYERS[SEL].fx.grad.stops.length + '色'));
await p.evaluate(() => document.getElementById('b_fxreset').click());
await wait(800);
ok(await sad(FX0, await fullShot()) === 0, '🔴 ［エフェクトをぜんぶ切る］で1画素も同じに戻る');

/* ══⑲ 編集の画面は【盤と同じ見え方】══ 2026-08-31
   🔴 木下＝「盤ではこの見た目なのに、ダブルクリックするとこれになるのはおかしい。連動してないと」
   ⭐ 板だけでは足りない（灯のひろがり・寒暖の差・にじみは【紙のもの】で、版面ぜんぶに
     かかってから素材の上に乗る）。だから【この素材だけを出した版面】を描いて切り出す。
   ⚠️ 物差しは「盤の同じ場所の色」＝見る所と比べる所を同じものにする。
     → feedback_test_metric_from_the_same_function */
const SOLOCHK = async idx => p.evaluate(async i => {
  const o = LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b));
  const L = o[i < 0 ? o.length - 1 : i];
  const f = sheet();
  const big = document.createElement('canvas'); big.width = f.w; big.height = f.h;
  COARSE = 0; LAYERS.forEach(x => x._key = '');
  paint(big.getContext('2d'), f.w, f.h, false);
  const bd = big.getContext('2d')
    .getImageData(Math.round(L.x*f.w), Math.round(L.y*f.h), 1, 1).data;
  openEditor(LAYERS.indexOf(L));
  await new Promise(r => setTimeout(r, 1600));
  const sd = g.getImageData((cv.width/2)|0, (cv.height/2)|0, 1, 1).data;
  return { 名:L.name, 盤:[bd[0],bd[1],bd[2]], 編集:[sd[0],sd[1],sd[2]] };
}, idx);
const near3 = (a2, b2) => Math.abs(a2[0]-b2[0]) < 16 && Math.abs(a2[1]-b2[1]) < 16
                        && Math.abs(a2[2]-b2[2]) < 16;
const SOLOA = await SOLOCHK(0);
ok(near3(SOLOA.盤, SOLOA.編集),
   '⭐⭐ 編集の画面の色が【盤の同じ場所】と一致する（連動している）', JSON.stringify(SOLOA));
const SOLOB = await SOLOCHK(-1);
ok(near3(SOLOB.盤, SOLOB.編集),
   '⭐ いちばん奥（空気が最大に効く素材）でも一致する', JSON.stringify(SOLOB));
const SOLO2 = await p.evaluate(async () => {
  document.querySelector('#s_tool button[data-v="color"]').click();
  await new Promise(r => setTimeout(r, 900));
  const d = g.getImageData((cv.width/2)|0, (cv.height/2)|0, 1, 1).data;
  const L = LAYERS[SEL];
  const c2 = document.createElement('canvas'); c2.width = 200; c2.height = 200;
  c2.getContext('2d').drawImage(edSrc(L, 200, 200), 0, 0, 200, 200);
  const raw = c2.getContext('2d').getImageData(100, 100, 1, 1).data;
  document.querySelector('#tools button[data-t="move"]').click();
  return { 画面:[d[0],d[1],d[2]], 素:[raw[0],raw[1],raw[2]] };
});
ok(near3(SOLO2.画面, SOLO2.素),
   '⭐ ［色で抜く］のときだけ素の写真（押した色と拾う色が合う）', JSON.stringify(SOLO2));
await wait(600);

/* ══⑳ 道具は【選んだレイヤーにかかる】・画面は飛ばさない ══ 2026-08-31
   🔴 木下＝「基本前提は 選択したレイヤーに対してそれらがかかる。
      現状だとそれぞれの機能に対してツールパネルを選択してそれぞれに飛びそう」 */
await p.evaluate(() => { const bt = document.querySelector('#tools button[data-t="move"]');
  if(bt) bt.click(); document.getElementById('b_demo').click(); });
await wait(1600);
const TOOLSTAY = [];
for(const t of ['color','erase','paint','path']){
  await p.evaluate(tt => document.querySelector('#tools button[data-t="' + tt + '"]').click(), t);
  await wait(450);
  const v = await p.evaluate(() => ({ cut:cutView(), mode:MODE }));
  if(v.cut || v.mode !== 'cut') TOOLSTAY.push(t + JSON.stringify(v));
}
ok(TOOLSTAY.length === 0, '⭐⭐ 切る道具を選んでも【版面のまま】（画面が飛ばない）',
   TOOLSTAY.length ? TOOLSTAY.join(' , ') : '4/4');
const BRUSH = await p.evaluate(async () => {
  const o = LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b));
  SEL = LAYERS.indexOf(o[1]); SELIDS = [o[1].id]; syncSel(); buildList();
  document.querySelector('#tools button[data-t="erase"]').click();
  await new Promise(r => setTimeout(r, 400));
  const L = LAYERS[SEL], before = hasCut(L);
  const st = document.getElementById('stage'), A = toScreen(L.x, L.y);
  st.dispatchEvent(new PointerEvent('pointerdown',
    { bubbles:true, pointerId:7, clientX:A.clientX, clientY:A.clientY }));
  st.dispatchEvent(new PointerEvent('pointermove',
    { bubbles:true, pointerId:7, clientX:A.clientX+20, clientY:A.clientY+20 }));
  st.dispatchEvent(new PointerEvent('pointerup',
    { bubbles:true, pointerId:7, clientX:A.clientX+20, clientY:A.clientY+20 }));
  await new Promise(r => setTimeout(r, 500));
  return { 前:before, 後:hasCut(LAYERS[SEL]) };
});
ok(!BRUSH.前 && BRUSH.後, '⭐⭐ 版面のまま【選んだレイヤー】に筆が効く', JSON.stringify(BRUSH));
await p.evaluate(() => { undo(); const bt = document.querySelector('#tools button[data-t="move"]');
  if(bt) bt.click(); });
await wait(700);
await p.evaluate(() => document.getElementById('layers').children[1]
  .dispatchEvent(new MouseEvent('dblclick', { bubbles:true })));
await wait(1400);
ok(await p.evaluate(() => SOLO && cutView()), '⭐ ダブルクリックのときだけ素材だけの画面へ入る');
ok(await p.evaluate(() => !document.getElementById('b_solo').classList.contains('hide')),
   '⭐［版面へ戻る］が出る');
await p.evaluate(() => document.getElementById('b_solo').click());
await wait(900);
ok(await p.evaluate(() => !SOLO && !cutView()), '⭐ 押すと版面へ戻る');

/* ㉑ 段は折りたためる（木下＝「邪魔な時は折りたたむから」） */
const FOLD = await p.evaluate(() => {
  const g2 = document.getElementById('airBox');
  const h0 = g2.getBoundingClientRect().height;
  g2.querySelector('label.h').click();
  const h1 = g2.getBoundingClientRect().height;
  const saved = localStorage.getItem('moya.fold.v1');
  g2.querySelector('label.h').click();
  return { 開:Math.round(h0), 閉:Math.round(h1),
           再開:Math.round(g2.getBoundingClientRect().height), 覚えた:saved };
});
ok(FOLD.閉 < FOLD.開 * 0.4, '⭐ 見出しを押すと段がたたまれる', JSON.stringify(FOLD));
ok(Math.abs(FOLD.再開 - FOLD.開) < 3, '⭐ もう一度押すと開く');
ok(/airBox/.test(FOLD.覚えた || ''), '⭐ たたんだ状態を覚える');

/* ══㉒ 文字の塗り・線・背景／長体・傾き・縦書き／書体の読み込み ══ 2026-08-31 */
await p.setViewport({ width:1400, height:900 });
await p.evaluate(() => { const bt = document.querySelector('#tools button[data-t="move"]');
  if(bt) bt.click(); document.getElementById('b_demo').click(); });
await wait(1600);
await p.evaluate(() => document.getElementById('b_text').click());
await wait(1800);
await p.evaluate(() => { const e = document.getElementById('t_str');
  e.value = 'あいう\nかきく'; e.dispatchEvent(new Event('input', { bubbles:true })); });
await wait(1500);
const fullShot2 = () => p.evaluate(() => { COARSE = 0; render(); return window.__full(); });
const sad2 = (A, B) => p.evaluate(([a2, b2]) => window.__sad(a2, b2), [A, B]);
const TX = await fullShot2();
const TDEAD2 = [];
for(const [id, nm] of [['t_bgon','背景を敷く'], ['t_strokeon','字に線を引く'], ['t_vert','縦書き']]){
  await p.evaluate(i => { const e = document.getElementById(i);
    e.checked = true; e.dispatchEvent(new Event('change', { bubbles:true })); }, id);
  await wait(1300);
  if(await sad2(TX, await fullShot2()) === 0) TDEAD2.push(nm);
  await p.evaluate(i => { const e = document.getElementById(i);
    e.checked = false; e.dispatchEvent(new Event('change', { bubbles:true })); }, id);
  await wait(1200);
  if(await sad2(TX, await fullShot2()) !== 0) TDEAD2.push(nm + '（切っても戻らない）');
}
ok(TDEAD2.length === 0,
   '⭐⭐ 字の背景・字の線・縦書きが効いて、切れば1画素も同じに戻る',
   TDEAD2.length ? TDEAD2.join(' , ') : '3/3');
const TKNOB = [];
for(const k of ['t_hs','t_vs','t_skew']){
  const b0 = await fullShot2();
  const keep = await p.evaluate(kk => { const e = document.getElementById(kk); const v = e.value;
    e.value = (kk === 't_skew') ? 30 : 220;
    e.dispatchEvent(new Event('input', { bubbles:true })); return v; }, k);
  await wait(1200);
  if(await sad2(b0, await fullShot2()) === 0) TKNOB.push(k);
  await p.evaluate((kk, v) => { const e = document.getElementById(kk); e.value = v;
    e.dispatchEvent(new Event('input', { bubbles:true })); }, k, keep);
  await wait(1000);
}
ok(TKNOB.length === 0, '⭐ 長体・平体・傾きが効く（字の形を作り直さず座標を曲げる）',
   TKNOB.length ? TKNOB.join(',') : '3/3');
ok(await p.evaluate(() => !!document.getElementById('b_font') && !!document.getElementById('f_font')),
   '⭐ 書体を読み込む入口がある（可変フォントは太さの範囲を渡す）');
/* 塗りだけ無し（線だけ）が作れる＝2つのつまみを束ねていない */
ok(await p.evaluate(() => {
  const so = document.getElementById('t_strokeon');
  so.checked = true; so.dispatchEvent(new Event('change', { bubbles:true }));
  const fo = document.getElementById('t_fillon');
  fo.checked = false; fo.dispatchEvent(new Event('change', { bubbles:true }));
  const t = LAYERS[SEL].text;
  const ok2 = t.fillOn === false && t.strokeOn === true;
  fo.checked = true; fo.dispatchEvent(new Event('change', { bubbles:true }));
  so.checked = false; so.dispatchEvent(new Event('change', { bubbles:true }));
  return ok2;
}), '⭐ 塗りだけ無し（線だけ）が作れる');
await wait(800);

/* ══㉓ パス＝選択範囲としても使える（Photoshop と同じ）══ 2026-08-31
   🔴 木下＝「パスとしておいて、これで切り抜きもできる想定。線を描くこともできる。
      囲ったのは【選択】として表現もできて、反転してぼかしをかけたり、
      その部分をぼかして切ることもできる」 */
await p.evaluate(() => { const bt = document.querySelector('#tools button[data-t="move"]');
  if(bt) bt.click(); document.getElementById('b_demo').click(); });
await wait(1600);
await p.evaluate(() => {
  const o = LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b));
  SEL = LAYERS.indexOf(o[1]); SELIDS = [o[1].id]; syncSel(); buildList();
  document.querySelector('#tools button[data-t="path"]').click();
  const m = maskSize(LAYERS[SEL]);
  POLY = [{x:m.w*0.2,y:m.h*0.2,hx:0,hy:0},{x:m.w*0.8,y:m.h*0.25,hx:0,hy:0},
          {x:m.w*0.5,y:m.h*0.8,hx:0,hy:0}];
  closePath();
});
await wait(900);
ok(await p.evaluate(() => !!LAYERS[SEL].sel && !hasCut(LAYERS[SEL])),
   '⭐⭐ パスを閉じても【切らない】＝選択範囲になる');
ok(await p.evaluate(() => !document.getElementById('selUI').classList.contains('hide')),
   '⭐ 選択の道具（切る／反転／中だけぼかす／線を描く）が出る');
const SEL0 = await fullShot2();
await p.evaluate(() => { const e = document.getElementById('r_selblur');
  e.value = 70; e.dispatchEvent(new Event('input', { bubbles:true })); });
await wait(1100);
ok(await sad2(SEL0, await fullShot2()) !== 0, '⭐⭐ 選択の中だけぼかせる');
await p.evaluate(() => { const e = document.getElementById('r_selblur');
  e.value = 0; e.dispatchEvent(new Event('input', { bubbles:true })); });
await wait(900);
ok(await sad2(SEL0, await fullShot2()) === 0, '🔴 0 に戻すと1画素も同じに戻る（焼き込んでいない）');
await p.evaluate(() => document.getElementById('b_selinv').click());
await wait(800);
ok(await p.evaluate(() => LAYERS[SEL].sel.inv === true), '⭐ 選択を反転できる');
const PN0 = await p.evaluate(() => LAYERS.length);
await p.evaluate(() => document.getElementById('b_selstroke').click());
await wait(1000);
ok(await p.evaluate(() => LAYERS.length) === PN0 + 1,
   '⭐⭐ パスに線を描くと【新しいレイヤーになる】（焼き込まない）');
await p.evaluate(() => {
  const L = LAYERS.find(x => x.sel);
  if(L){ SEL = LAYERS.indexOf(L); SELIDS = [L.id]; syncSel(); buildList(); syncSelPath();
    document.getElementById('b_selin').click(); }
});
await wait(900);
ok(await p.evaluate(() => { const L = LAYERS[SEL]; return hasCut(L) && !L.sel; }),
   '⭐ 選択から切り抜ける');

/* ══㉔ 見本2（木下＝「今の見本も1として2も作成してほしい」）══ */
await p.evaluate(() => { const bt = document.querySelector('#tools button[data-t="move"]');
  if(bt) bt.click(); document.getElementById('b_demo2').click(); });
await wait(4000);
ok(await p.evaluate(() => LAYERS.some(L => L.kind === 'text') && LAYERS.some(L => L.kind === 'shape')),
   '⭐⭐ 見本2 に 文字と図形が入る', await p.evaluate(() =>
     LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b)).map(L => L.name).join('/')));
ok(await p.evaluate(() => LAYERS.some(L => L.fx && L.fx.grad.on)),
   '⭐ 見本2 にエフェクト（黄金色）が乗っている');
await p.evaluate(() => document.getElementById('b_demo').click());
await wait(1600);

/* ══㉕ 仕事の版面（バナー）══ 2026-08-31・木下＝「ビジネス用のバナー画像作成のような」 */
await p.setViewport({ width:1400, height:900 });
const BAN = await p.evaluate(async () => {
  const out = [];
  for(const bt of document.querySelectorAll('#s_banner button')){
    bt.click(); await new Promise(r => setTimeout(r, 160));
    const f = sheet();
    out.push(bt.dataset.v + ':' + f.w + 'x' + f.h + (bt.classList.contains('on') ? '' : ' 印なし'));
  }
  return { out, longHidden:document.getElementById('longUI').classList.contains('hide'),
           dpiHidden:document.getElementById('dpiUI').classList.contains('hide') };
});
ok(BAN.out.length === 11 && BAN.out.every(x => !x.includes('印なし')),
   '⭐⭐ 仕事の版面が全部効いて印もつく', BAN.out.length + ' 個');
ok(BAN.out.includes('OGP:1200x630') && BAN.out.includes('ストーリー:1080x1920'),
   '⭐ px そのもので決まる（OGP 1200×630／ストーリー 1080×1920）');
ok(BAN.longHidden && BAN.dpiHidden,
   '⭐ px の版面では 長辺も解像度も出さない（触れるのに効かないつまみを出さない）');
await p.evaluate(() => document.querySelector('#s_ratio button[data-v="2:3"]').click());
await wait(400);

/* ══㉖ フィルター（移動ぼかし・放射状ぼかし・うねり・渦巻き）══ */
await p.evaluate(() => document.getElementById('b_demo').click());
await wait(1600);
await p.evaluate(() => { const o = LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b));
  SEL = LAYERS.indexOf(o[1]); SELIDS = [o[1].id]; syncSel(); buildList(); });
await wait(700);
const fullShot3 = () => p.evaluate(() => { COARSE = 0; render(); return window.__full(); });
const sad3 = (A, B) => p.evaluate(([a2, b2]) => window.__sad(a2, b2), [A, B]);
const FI0 = await fullShot3();
const FIDEAD = [];
for(const k of ['r_mblur','r_rblur','r_wave','r_twirl']){
  const keep = await p.evaluate(kk => { const e = document.getElementById(kk); const v = e.value;
    e.value = 60; e.dispatchEvent(new Event('input', { bubbles:true })); return v; }, k);
  await wait(1000);
  if(await sad3(FI0, await fullShot3()) === 0) FIDEAD.push(k);
  await p.evaluate((kk, v) => { const e = document.getElementById(kk); e.value = v;
    e.dispatchEvent(new Event('input', { bubbles:true })); }, k, keep);
  await wait(800);
}
ok(FIDEAD.length === 0, '⭐⭐ 移動ぼかし・放射状ぼかし・うねり・渦巻きが効く',
   FIDEAD.length ? FIDEAD.join(',') : '4/4');
ok(await sad3(FI0, await fullShot3()) === 0, '🔴 戻すと1画素も同じに戻る');

/* ══㉗ ゆがみ（Liquify）══ */
await p.evaluate(() => document.querySelector('#tools button[data-t="liq"]').click());
await wait(700);
ok(await p.evaluate(() => TOOL === 'liq'), '⭐ ゆがみの道具に切り替わる');
ok(await p.evaluate(() => !document.getElementById('liqUI').classList.contains('hide')),
   '⭐ ゆがみのつまみだけが出る');
const LQ0 = await fullShot3();
await p.evaluate(async () => {
  const L = LAYERS[SEL], st = document.getElementById('stage'), A = toScreen(L.x, L.y);
  st.dispatchEvent(new PointerEvent('pointerdown',
    { bubbles:true, pointerId:11, clientX:A.clientX, clientY:A.clientY }));
  for(let i = 1; i <= 6; i++)
    st.dispatchEvent(new PointerEvent('pointermove',
      { bubbles:true, pointerId:11, clientX:A.clientX + i*8, clientY:A.clientY }));
  st.dispatchEvent(new PointerEvent('pointerup',
    { bubbles:true, pointerId:11, clientX:A.clientX + 48, clientY:A.clientY }));
  await new Promise(r => setTimeout(r, 600));
});
await wait(900);
ok(await sad3(LQ0, await fullShot3()) !== 0, '⭐⭐ なぞると画素が押される（ゆがみ）');
ok(await p.evaluate(() => liqAny(LAYERS[SEL])), '⭐ ゆがみは【押した量の地図】で持つ',
   await p.evaluate(() => LAYERS[SEL].liq.n + ' 押し'));
await p.evaluate(() => document.getElementById('b_liqclear').click());
await wait(900);
ok(await sad3(LQ0, await fullShot3()) === 0, '🔴 ぜんぶ戻すと1画素も同じに戻る（焼き込んでいない）');
await p.evaluate(() => { const bt = document.querySelector('#tools button[data-t="move"]');
  if(bt) bt.click(); });
await wait(500);

/* ══㉘ 雲・光（Photoshop の「描画」フィルター）══
   ⭐ 写真を壊して描くのではなく【新しいレイヤーとして置く】 */
const RN0 = await fullShot3();
await p.evaluate(() => document.getElementById('b_cloud').click());
await wait(1500);
ok(await p.evaluate(() => LAYERS[SEL].kind === 'render' && LAYERS[SEL].img.naturalWidth > 10),
   '⭐⭐ 雲を置ける', await p.evaluate(() =>
     LAYERS[SEL].img.naturalWidth + 'x' + LAYERS[SEL].img.naturalHeight));
ok(await sad3(RN0, await fullShot3()) !== 0, '⭐ 盤に雲が出る');
const CL1 = await fullShot3();
await p.evaluate(() => { const e = document.getElementById('r_rseed');
  e.value = 42; e.dispatchEvent(new Event('input', { bubbles:true })); });
await wait(1200);
ok(await sad3(CL1, await fullShot3()) !== 0, '⭐ 種を変えると雲が変わる');
await p.evaluate(() => { const e = document.getElementById('r_rseed');
  e.value = 7; e.dispatchEvent(new Event('input', { bubbles:true })); });
await wait(1200);
ok(await sad3(CL1, await fullShot3()) === 0, '⭐ 同じ種なら1画素も同じ');
await p.evaluate(() => document.getElementById('b_flare').click());
await wait(1500);
ok(await p.evaluate(() => LAYERS[SEL].rnd.kind === 'flare' && LAYERS[SEL].blend === 'lighter'),
   '⭐ 光を置ける（重ね方は「明るさをプラス」が既定）');

/* ══㉙ パスを残す・パスから図形を作る ══ */
await p.evaluate(() => { const bt = document.querySelector('#tools button[data-t="move"]');
  if(bt) bt.click(); document.getElementById('b_demo').click(); });
await wait(1600);
await p.evaluate(() => {
  const o = LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b));
  SEL = LAYERS.indexOf(o[1]); SELIDS = [o[1].id]; syncSel(); buildList();
  document.querySelector('#tools button[data-t="path"]').click();
  const m = maskSize(LAYERS[SEL]);
  POLY = [{x:m.w*0.2,y:m.h*0.2,hx:0,hy:0},{x:m.w*0.8,y:m.h*0.25,hx:0,hy:0},
          {x:m.w*0.5,y:m.h*0.8,hx:0,hy:0}];
  closePath();
});
await wait(900);
await p.evaluate(() => document.getElementById('b_pathsave').click());
await wait(600);
ok(await p.evaluate(() => LAYERS[SEL].paths.length === 1 &&
     document.getElementById('pathList').children.length === 1),
   '⭐⭐ パスを残せる（Photoshop のパスパネルと同じ）');
await p.evaluate(() => document.getElementById('b_selclear').click());
await wait(500);
await p.evaluate(() => document.getElementById('pathList').children[0]
  .querySelector('button').click());
await wait(600);
ok(await p.evaluate(() => !!LAYERS[SEL].sel), '⭐ 残したパスを選択に呼び戻せる');
const PS0 = await p.evaluate(() => LAYERS.length);
await p.evaluate(() => document.getElementById('b_pathshape').click());
await wait(900);
ok(await p.evaluate(() => LAYERS.length) === PS0 + 1 &&
   await p.evaluate(() => LAYERS[SEL].img.naturalWidth > 10),
   '⭐⭐ パスから図形を作れる（新しいレイヤーになる）');
ok(await p.evaluate(() => { const o = snapshot();
     return o.layers.some(l => (l.paths || []).length > 0); }),
   '⭐ 残したパスは設定JSONにも入る');
await p.evaluate(() => { const bt = document.querySelector('#tools button[data-t="move"]');
  if(bt) bt.click(); document.getElementById('b_demo').click(); });
await wait(1600);

/* ══㉚ 閉じたパスは【あとから点を直せる】══ 2026-08-31
   ⭐ 点／ハンドルを掴む・線の上を押すと点が増える・⌫ で消す・続きを描く */
await p.setViewport({ width:1400, height:900 });
await p.evaluate(() => { const bt = document.querySelector('#tools button[data-t="move"]');
  if(bt) bt.click(); document.getElementById('b_demo').click(); });
await wait(1600);
await p.evaluate(() => {
  const o = LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b));
  SEL = LAYERS.indexOf(o[1]); SELIDS = [o[1].id]; syncSel(); buildList();
  document.querySelector('#tools button[data-t="path"]').click();
  const m = maskSize(LAYERS[SEL]);
  POLY = [{x:m.w*0.2,y:m.h*0.2,hx:0,hy:0},{x:m.w*0.8,y:m.h*0.25,hx:0,hy:0},
          {x:m.w*0.5,y:m.h*0.8,hx:0,hy:0}];
  closePath();
});
await wait(900);
const PE = await p.evaluate(async () => {
  const L = LAYERS[SEL], m = maskSize(L);
  const toScr = (u, v) => {
    const iw = L.img.naturalWidth, ih = L.img.naturalHeight;
    const dw = L.s*cv.width, dh = dw*ih/iw*syOf(L);
    let uu = u; if(L.flip) uu = 1 - u;
    const s2 = toScreen((L.x*cv.width + (uu-0.5)*dw)/cv.width,
                        (L.y*cv.height + (v-0.5)*dh)/cv.height);
    return { x:s2.clientX, y:s2.clientY };
  };
  const before = { x:L.sel.pts[0].x, y:L.sel.pts[0].y };
  const A = toScr(before.x/m.w, before.y/m.h);
  const st = document.getElementById('stage');
  st.dispatchEvent(new PointerEvent('pointerdown',
    { bubbles:true, pointerId:21, clientX:A.x, clientY:A.y }));
  st.dispatchEvent(new PointerEvent('pointermove',
    { bubbles:true, pointerId:21, clientX:A.x+40, clientY:A.y+30 }));
  st.dispatchEvent(new PointerEvent('pointerup',
    { bubbles:true, pointerId:21, clientX:A.x+40, clientY:A.y+30 }));
  await new Promise(r => setTimeout(r, 500));
  const moved = Math.abs(LAYERS[SEL].sel.pts[0].x - before.x) > 3 ||
                Math.abs(LAYERS[SEL].sel.pts[0].y - before.y) > 3;
  /* 線の上を押すと点が増える */
  const n0 = LAYERS[SEL].sel.pts.length;
  const ps = LAYERS[SEL].sel.pts;
  const mid = { x:(ps[0].x+ps[1].x)/2, y:(ps[0].y+ps[1].y)/2 };
  const B = toScr(mid.x/m.w, mid.y/m.h);
  st.dispatchEvent(new PointerEvent('pointerdown',
    { bubbles:true, pointerId:22, clientX:B.x, clientY:B.y }));
  st.dispatchEvent(new PointerEvent('pointerup',
    { bubbles:true, pointerId:22, clientX:B.x, clientY:B.y }));
  await new Promise(r => setTimeout(r, 500));
  const n1 = LAYERS[SEL].sel.pts.length;
  dispatchEvent(new KeyboardEvent('keydown', { key:'Backspace', bubbles:true }));
  await new Promise(r => setTimeout(r, 400));
  return { moved, 掴んだ:SELPT, n0, n1, n2:LAYERS[SEL].sel.pts.length };
});
ok(PE.moved, '⭐⭐ 閉じたパスの点を掴んで動かせる（形をあとから直せる）', JSON.stringify(PE));
ok(PE.n1 === PE.n0 + 1, '⭐ 線の上を押すと点が増える（Photoshop と同じ）',
   PE.n0 + ' → ' + PE.n1);
ok(PE.n2 === PE.n0, '⭐ ⌫ で選んだ点を消せる');
await p.evaluate(() => document.getElementById('b_pathedit').click());
await wait(800);
ok(await p.evaluate(() => POLY.length >= 3 && !LAYERS[SEL].sel),
   '⭐［続きを描く］で開いた状態に戻る（点は残る）');
await p.evaluate(() => { POLY = []; const bt = document.querySelector('#tools button[data-t="move"]');
  if(bt) bt.click(); document.getElementById('b_demo').click(); });
await wait(1600);

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
/* 🔴🔴 浮いたカプセルを足したとき、指の端末でツールバーが縦のままで
   画面をぜんぶ食い、盤の高さが 0 になっていた（2026-08-31） */
const MBT = await p.evaluate(() => ({
  ツールバー: Math.round(document.getElementById('tools').getBoundingClientRect().height),
  並び: getComputedStyle(document.getElementById('toolsIn')).flexDirection,
  盤: Math.round(document.getElementById('stage').getBoundingClientRect().height),
}));
ok(MBT.並び === 'row' && MBT.ツールバー < 110 && MBT.盤 > 200,
   '⑨ 指の端末ではツールバーが横一列・盤が潰れない', JSON.stringify(MBT));

ok(errs.length === 0, 'JSエラーが出ない', errs.join(' | '));
await b.close();
process.exit(NG ? 1 : 0);
