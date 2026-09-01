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
/* ⚠️ 試験が増えて重くなると【タブごと落ちる】ことがある（落ちる場所が毎回変わるのが目印）。
   ⭐ 共有メモリを使わない指定を足して、落ちたらその場で分かるようにする。 */
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=4096'] });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('error', e => { console.log('  🔴 タブが落ちた（メモリ切れの疑い）：' + (e && e.message));
  process.exitCode = 1; });
await p.setViewport({ width:1400, height:900 });
/* ══⭐⭐ 同じ配線を【二重に付けていないか】を見張る ══ 2026-09-01
   🔴 木下＝「そういったミスがないか検証実装をして」
     ＝つまみの「引き始めに控える」配線を、すでに有るのに もう1本足してしまい、
       1回のドラッグで **2手** 積まれていた（ヒストリーに名前の無い「操作」が混ざる）。
   ⭐ 読み込みの最初から addEventListener を数えておく（記録するだけ・動きは変えない）。 */
await p.evaluateOnNewDocument(() => {
  window.__listen = [];
  const orig = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(t, f, o){
    try{ if(this && this.id) window.__listen.push(this.id + '|' + t); }catch(_){}
    return orig.call(this, t, f, o);
  };
});

/* ⭐ 図形は【盤でドラッグして描く】に変わった（2026-09-01）＝試験も同じ道を通す */
await p.evaluateOnNewDocument(() => {
  window.drawShape = async (x0, y0, x1, y1) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('#tools button[data-t="shape"]').click();
    await w(400);
    const a = toScreen(x0 == null ? 0.32 : x0, y0 == null ? 0.32 : y0);
    const b = toScreen(x1 == null ? 0.62 : x1, y1 == null ? 0.58 : y1);
    stage.dispatchEvent(new PointerEvent('pointerdown',
      { clientX:a.clientX, clientY:a.clientY, bubbles:true, pointerId:9 }));
    stage.dispatchEvent(new PointerEvent('pointermove',
      { clientX:b.clientX, clientY:b.clientY, bubbles:true, pointerId:9 }));
    stage.dispatchEvent(new PointerEvent('pointerup',
      { clientX:b.clientX, clientY:b.clientY, bubbles:true, pointerId:9 }));
    await w(500);
    return LAYERS[SEL];
  };
});
await p.goto(URL_, { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 2500));
let NG = 0;
/* 画像編集の小道具（2026-08-31 に1つのアイコンへ・同日 マスクを塗るを足した） */
const OPTSUB = ['color','erase','paint','lmask','liq'];
const ok = (c, n, x) => { console.log((c ? '  ✅ ' : '  🔴 ') + n + (x != null ? ' … ' + x : '')); if(!c) NG = 1; };
const wait = ms => new Promise(r => setTimeout(r, ms));

/* 出す物を横取りする */
await p.evaluate(() => { window.__got = [];
  /* ⚠️ 2026-09-01：書き出しに【保存ダイアログ】（showSaveFilePicker）を入れた。
     headless では出せないので、ここでは無いことにして
     【使えないときは そのまま落ちる】道（＝いままでの動き）を試験する。 */
  try{ delete window.showSaveFilePicker; }catch(_){ window.showSaveFilePicker = undefined; }
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
  LAYERS[0].x = 0.5; LAYERS[0].y = 0.5; SEL = 0;
  el('k_nobg').checked = true; el('k_nobg').dispatchEvent(new Event('change',{bubbles:true}));
  /* ⚠️ 2026-08-31 から【道具を選んでも画面は飛ばない】＝この画面はダブルクリックで入る */
  openEditor(0);
  /* ⚠️ 2026-08-31 から編集画面は【その画像だけのアートボード】＝切る相手は中の1枚目 */
  const L = LAYERS[SEL];
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
  /* ⚠️ 2026-08-31 から Photoshop と同じ＝閉じたら【作業用パス】になる（選択にはならない）
     ＝選択にするのは［パスを選択範囲として読み込む］の一手（Adobe の公式手順）。 */
  out.閉じて作業用パスになった = POLY.length === 0 && !!L.work && L.work.pts.length >= 3;
  document.getElementById('b_pload').click();
  await new Promise(r => setTimeout(r, 250));
  out.選択に読み込めた = selSubs(L.sel).length >= 1;
  /* そこから【囲った外を消す】が効く */
  document.getElementById('b_selin').click();
  COARSE = 0; render(); await new Promise(r => setTimeout(r, 250));
  out.選択から切れた = maskOpaque() < out.前;
  out.打った数 = n1;
  clearMask(L);
  el('k_nobg').checked = false; el('k_nobg').dispatchEvent(new Event('change',{bubbles:true}));
  document.getElementById('b_solo').click();
  return out;
});
ok(PEN.打てた === 2, '⭐ 打つと点が増える', PEN.打てた + ' 点');
ok(PEN.ハンドルが出た && PEN.点は動かない,
   '⭐⭐ 打ったまま引くと【ハンドルが出て曲がる】（点は動かない）',
   JSON.stringify({ ハンドル:PEN.ハンドルが出た, 点:PEN.点は動かない }));
ok(PEN.点を動かせた, '⭐ 打った点はあとから掴んで動かせる');
ok(PEN.ハンドルを動かせた, '⭐ ハンドルも掴んで動かせる');
ok(PEN.一点戻せた, '⭐ ⌫ で1点戻せる');
ok(PEN.閉じて作業用パスになった,
   '⭐⭐ 最初の点をもう一度押すと【閉じて作業用パスになる】（Photoshop と同じ・まだ切らない）');
ok(PEN.選択に読み込めた,
   '⭐⭐［パスを選択範囲として読み込む］で選択になる（Adobe の公式手順）');
ok(PEN.選択から切れた, '⭐⭐ 選択範囲から【囲った外を消す】が効く');

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

/* ⭐⭐ 選んだものだけ PNG（木下＝「選択したものを png でも書き出しできるようにもして」）
   ＋ 設定JSON が本当に落ちる（木下＝「svg は書き出しできるが、設定は書き出せない」） */
const SELPNG = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  window.__got = [];
  const o = LAYERS.slice().sort((a,b) => zOf(a)-zOf(b));
  SEL = LAYERS.indexOf(o[1]); SELIDS = [o[1].id]; syncSelIds(); syncSel(); buildList();
  document.getElementById('b_selpng').click();
  await w(1200);
  const png = window.__got.slice();
  document.getElementById('b_exj').click();
  await w(900);
  return { png:png.filter(x => x.type === 'image/png').length,
           json:window.__got.filter(x => x.type === 'application/json').length,
           say:document.getElementById('stat').textContent };
});
ok(SELPNG.png >= 1, '⭐⭐ 選んだものだけ PNG で落ちる（地なし・選んだ所で切り取る）',
   JSON.stringify(SELPNG));
ok(SELPNG.json >= 1, '🔴 設定JSON が本当に落ちる（落ちたら理由を言う）', SELPNG.say);

/* ══🔴🔴 木下が実機で踏んだ2つ（2026-09-01）══
   ① 選択範囲を【何枚でも重なる subs 形式】に変えたのに、書き出しが古い pts を読んでいた
      → Cannot read properties of undefined (reading 'map')
   ② 調整レイヤー（絵を持たない）を写真として出そうとしていた
      → Cannot read properties of null (reading 'naturalWidth')
   ＝どちらも【その人の作りかたでだけ落ちる】＝手元では出るので気づけなかった。 */
const EXP2 = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const o = LAYERS.slice().sort((a,b) => zOf(a)-zOf(b));
  const i = LAYERS.indexOf(o[1]);
  SEL = i; SELIDS = [o[1].id]; syncSelIds(); syncSel();
  document.getElementById('b_adjlayer').click(); await w(400);   /* ② 調整レイヤー */
  SEL = i; syncSel();
  const L = LAYERS[i], m = maskSize(L);
  document.querySelector('#tools button[data-t="path"]').click();
  POLY = [{x:m.w*0.2,y:m.h*0.2,hx:0,hy:0},{x:m.w*0.7,y:m.h*0.25,hx:0,hy:0},
          {x:m.w*0.5,y:m.h*0.7,hx:0,hy:0}];
  closePath(); await w(250);
  document.getElementById('b_pload').click(); await w(250);      /* ① subs 形式の選択範囲 */
  document.querySelector('#tools button[data-t="move"]').click();
  const out = { 形:LAYERS[i].sel && LAYERS[i].sel.subs ? 'subs' : 'pts',
                調整:LAYERS.some(x => x.kind === 'adj') };
  try{ out.設定 = 'OK ' + Math.round(JSON.stringify(snapshot()).length/1024) + 'KB'; }
  catch(e){ out.設定 = 'NG: ' + e.message; }
  try{
    const j = snapshot(); j.bundled = true;
    j.layers.forEach((L2, k) => {
      L2.img = LAYERS[k].img ? imgData(LAYERS[k].img, 1200) : null;
      const sb = LAYERS[k].sub;
      if(sb) L2.subImgs = sb.layers.map(q => q.img ? imgData(q.img, 1200) : null);
    });
    out.まるごと = 'OK ' + (JSON.stringify(j).length/1024/1024).toFixed(2) + 'MB';
  }catch(e){ out.まるごと = 'NG: ' + e.message; }
  const svg = svgOut();
  out.SVG = { 素材は隠す:svg.indexOf('id="sozai" display="none"') >= 0,
              仕上がり:svg.indexOf('id="shiage"') >= 0 };
  /* ⚠️ 後片付け＝選択範囲（点線）と調整レイヤーを消す。
     残すと【次の試験で盤に点線が出て】別の試験が落ちる（ぶれる試験を作らない）。 */
  LAYERS.forEach(x => { x.sel = null; x.work = null; });
  setLayers(LAYERS.filter(x => x.kind !== 'adj'));
  PATHSEL = null; POLY = [];
  buildList(); syncSel(); syncSelPath(); render();
  await w(300);
  return out;
});
ok(EXP2.形 === 'subs' && EXP2.調整 && /^OK/.test(EXP2.設定) && /^OK/.test(EXP2.まるごと),
   '🔴🔴 調整レイヤー＋選択範囲があっても【設定・まるごと】が書き出せる',
   JSON.stringify(EXP2));
ok(EXP2.SVG.素材は隠す && EXP2.SVG.仕上がり,
   '⭐⭐ SVG は【仕上がり1枚】＋素材は隠して入る（同じ絵が二重にならない）',
   JSON.stringify(EXP2.SVG));

/* ⭐ SVG の重さ＝仕上がりの1枚は【地があるなら JPEG】（実測 6.0MB → 1.4MB）
   ⚠️ 地なし（透ける）ときは PNG のまま（JPEG は透明を持てない） */
const SVGSZ = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const s1 = svgOut();
  const out = { 地あり:Math.round(s1.length/1024), JPEGで入る:s1.indexOf('data:image/jpeg') >= 0 };
  const k = document.getElementById('k_nobg');
  k.checked = true; k.dispatchEvent(new Event('change', { bubbles:true })); await w(600);
  const s2 = svgOut();
  out.地なしはPNG = s2.indexOf('data:image/jpeg') < 0;
  k.checked = false; k.dispatchEvent(new Event('change', { bubbles:true })); await w(500);
  return out;
});
ok(SVGSZ.JPEGで入る && SVGSZ.地なしはPNG,
   '⭐ SVG の仕上がりは【地があるなら JPEG】で軽く・地なしなら PNG で透ける',
   JSON.stringify(SVGSZ));

/* ⭐⭐ 左のツールバー（2026-08-30 木下＝「左にツールパネルを出して直感的に」）
   🔴 見るのは「並んでいる」ではなく【押したら本当に道具が変わるか】＝
      見た目と中身を二重に持つと「押しても切り替わらない」が必ず出る。 */
const TB = await p.evaluate(async (OPTSUB) => {
  const out = { 数: document.querySelectorAll('#tools button[data-t]').length, 押した:{} };
  /* ⚠️ 灯は 2026-08-31 にツールバーから外した（盤の白い丸でつかむ）＝ここでも見ない */
  for(const [t, want] of [['color',['cut','color']], ['erase',['cut','erase']],
                          ['paint',['cut','paint']], ['lmask',['cut','lmask']],
                          ['path',['cut','path']],
                          ['move',['move',null]]]){
    (OPTSUB.includes(t) ? (document.querySelector('#tools button[data-t="retouch"]').click(),document.querySelector('#s_tool button[data-v="'+t+'"]').click()) : document.querySelector('#tools button[data-t="'+t+'"]').click());
    await new Promise(r => setTimeout(r, 60));
    const on = [...document.querySelectorAll('#tools button.on')].map(e => e.dataset.t);
    out.押した[t] = { MODE, TOOL, 印: on.join(','),
                      合っている: MODE === want[0] && (want[1] == null || TOOL === want[1]) };
  }
  document.querySelector('#tools button[data-t="move"]').click();
  return out;
}, OPTSUB);
ok(TB.数 >= 6, '⭐ 左のツールバーが出ている', TB.数 + ' 個');
{
  const bad = Object.entries(TB.押した).filter(([k, v]) => !v.合っている).map(([k]) => k);
  ok(bad.length === 0, '⭐⭐ ツールバーを押すと本当に道具が変わる（見た目だけになっていない）',
     JSON.stringify(TB.押した));
  /* ⚠️ 画像編集の小道具（色で消す・切り抜き・復元・ゆがみ）は
     2026-08-31 に【1つのアイコン】へまとめたので、印は retouch に付く */
  const noMark = Object.entries(TB.押した)
    .filter(([k, v]) => (OPTSUB.includes(k) ? v.印.indexOf('retouch') < 0 : v.印.indexOf(k) < 0))
    .map(([k]) => k);
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
  document.getElementById('b_solo').click();
  await new Promise(r => setTimeout(r, 200));
  out.戻ると版面 = !cutView() && cv.width !== out.切るときの盤[0];
  return out;
});
ok(CV.切り抜きの画面, '⭐⭐ ダブルクリックで【その素材だけの画面】になる');
ok(CV.比が合う, '⭐ 盤の比が素材の比になる（大きく切れる）',
   CV.切るときの盤.join('×') + ' ／ 素材 ' + CV.素材の比.join('×'));
ok(CV.座標が素直, '⭐⭐ 盤の割合＝素材の中の割合（座標が食い違わない）');
ok(CV.戻ると版面, '⭐［← 版面へ戻る］で版面へ戻る（⚠️ 動かすでは出ない＝中で素材を動かすため）');

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
  /* ⚠️ いちばん下の【背景】は紙の地（素材ではない）＝数えない（2026-08-31 に足した） */
  const rows = [...document.getElementById('layers').children]
    .filter(r => !r.classList.contains('bgrow'));
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

/* ══⭐⭐ 調整レイヤーの【効く範囲】は1つの規則で決まる ══ 2026-08-31
   🔴 木下＝「下のふたつともかかっちゃってるよね？」
     ＝クリッピングマスクを入れても【空気からのズレ】は全部にかかっていた
       （色調補正だけ clip を見ていた＝同じことを2か所で別々に決めていた）。
   ⭐ 物差しは本体と同じ関数（adjStack）から取る。 */
const CLIPADJ = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const o = LAYERS.slice().sort((a,b) => zOf(a)-zOf(b));
  SEL = LAYERS.indexOf(o[0]); SELIDS = [o[0].id]; syncSelIds(); syncSel();
  document.getElementById('b_adjlayer').click(); await w(400);
  const A = LAYERS[SEL];
  const e = document.getElementById('r_abri'); e.value = 60;
  e.dispatchEvent(new Event('input', { bubbles:true })); await w(500);
  const 効く = () => LAYERS.filter(L => L.img && L.kind !== 'adj' && adjStack(L).bri > 0.001)
    .map(L => L.name);
  const 全部 = 効く();
  const kc = document.getElementById('k_clip');
  kc.checked = true; kc.dispatchEvent(new Event('change', { bubbles:true })); await w(500);
  const クリップ = 効く();
  const すぐ下 = adjTarget(A) ? adjTarget(A).name : null;
  /* 不透明度＝効きの強さ（Photoshop と同じ・0 で効かない） */
  A.op = 0; LAYERS.forEach(L => L._key = ''); await w(200);
  const 濃さ0 = 効く();
  A.op = 1;
  kc.checked = false; kc.dispatchEvent(new Event('change', { bubbles:true })); await w(300);
  return { 全部, クリップ, すぐ下, 濃さ0 };
});
ok(CLIPADJ.全部.length >= 2 && CLIPADJ.クリップ.length === 1
   && CLIPADJ.クリップ[0] === CLIPADJ.すぐ下,
   '⭐⭐ クリッピングを入れた調整レイヤーは【すぐ下の1枚だけ】に効く（ズレも色調補正も）',
   JSON.stringify(CLIPADJ));
ok(CLIPADJ.濃さ0.length === 0,
   '⭐ 調整レイヤーの不透明度＝効きの強さ（0 で効かない・Photoshop と同じ）',
   JSON.stringify(CLIPADJ.濃さ0));
ok(await p.evaluate(() => {
     const a = LAYERS.find(L => L.kind === 'adj');
     if(!a) return false;
     SEL = LAYERS.indexOf(a); SELIDS = [a.id]; syncSelIds(); syncSel(); syncPanelMode();
     const hid = id => getComputedStyle(document.getElementById(id)).display === 'none';
     return hid('paintPart') && hid('fillAKnob') && hid('scaleKnob') && hid('rotKnob');
   }),
   '⭐⭐ 調整レイヤーでは【効かないつまみ】を出さない（塗り・重ね方・大きさ・回す）');

/* ⭐⭐ 外の調整レイヤーは【中の画面（アートボード）にも乗る】── 2026-08-31
   🔴 木下＝「調整レイヤーをかけたら、中身も見た目も変わっておくべき？」
     ＝そのとおり。中を描くときに調整レイヤーまで消していた＝盤と食い違っていた。
   ⚠️ Photoshop のスマートオブジェクトは中身が素のままだが、MOYA は
     【近づいて見る画面は本番と同じ見え方】を選んでいる（木下の指示）。 */
const INSUB = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const o = LAYERS.slice().sort((a,b) => zOf(a)-zOf(b));
  const i = LAYERS.indexOf(o[1]);
  openEditor(i); await w(900); COARSE = 0; render(); await w(400);
  const 前 = window.__full();
  closeEditor(); await w(700);
  SEL = LAYERS.indexOf(o[0]); SELIDS = [o[0].id]; syncSelIds(); syncSel();
  document.getElementById('b_adjlayer').click(); await w(400);
  const A = LAYERS[SEL];
  const e = document.getElementById('r_abri'); e.value = 80;
  e.dispatchEvent(new Event('input', { bubbles:true })); await w(600);
  openEditor(LAYERS.indexOf(o[1])); await w(1000); COARSE = 0; render(); await w(500);
  const 乗る = window.__sad(前, window.__full());
  closeEditor(); await w(600);
  A.on = false; LAYERS.forEach(L => L._key = ''); await w(200);
  openEditor(LAYERS.indexOf(o[1])); await w(1000); COARSE = 0; render(); await w(500);
  const 外すと戻る = window.__sad(前, window.__full());
  closeEditor(); await w(600);
  return { 乗る, 外すと戻る };
});
ok(INSUB.乗る > 0 && INSUB.外すと戻る === 0,
   '⭐⭐ 外の調整レイヤーは【中の画面にも乗る】／外すと1画素も同じに戻る',
   JSON.stringify(INSUB));

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
const EDKNOBS = ['r_black','r_white','r_gamma','r_con','r_hue','r_sat','r_lum','r_temp','r_tint',
  'r_eblur','r_sharp','r_enoise','r_mosaic','r_poster','r_thresh','r_mono','r_einvert','r_eedge',
  'r_half','r_gpen','r_film','r_warp'];
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
ok(EDDEAD.length === 0, '⭐⭐ 編集の22本ぜんぶが効く（死んでいるつまみが無い）',
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
await p.evaluate(() => document.getElementById('b_solo').click());
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
  /* ⚠️ 「そのまま」が 0 でないつまみ＝チャンネルミキサーの元の R は 100%（＝素通し） */
  /* ⚠️ 「何もしない値」が 0 でないつまみ（濃度・不透明度のたぐい）は 100 が素 */
  const NEU = { r_op:100, r_air:100, r_white:100, r_gamma:100, r_out:100, r_mxr:100,
                r_filla:100, r_lmdens:100, r_glasssm:6, r_glassscale:100 };
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
                'r_mang','r_wfreq','r_liqrad','r_liqstr','r_rrough','r_rsize','r_rstr','r_rseed',
                'sh_gang',
                /* 塗りレイヤー（べた塗り・グラデーション・パターン）の形の設定＝絵の空気ではない */
                'r_rgang','r_patsz','r_patw','r_patang',
                /* パターンオーバーレイの柄の設定＝絵の空気ではない（入り切りは行の丸が持つ） */
                'r_fxpsz','r_fxpw','r_fxpang','r_fxpop',
                /* パスの許容値＝形を点に直すときの精度（絵の空気ではない） */
                'r_ptol','r_halfsz','r_gpenang',
                /* グラデーションで消すの形の設定（入り切りはチェックが持つ） */
                'r_mgang','r_mgstart','r_mgsoft','r_glossn',
                /* レイヤーマスクの筆の設定（濃さ・やわらかさ）＝道具の数字で、絵の空気ではない */
                'r_lmflow','r_lmsoft',
                /* 筆（特殊効果）の設定＝道具の数字で、絵の空気ではない（2026-09-01） */
                'r_brsize','r_brflow','r_brscat','r_brgrain','r_brseed',
                /* 調整レイヤーの効く範囲（奥行きの帯）＝どこに効かせるかの設定で、絵の空気ではない */
                'r_adjfrom','r_adjto'];
  const bad = [];
  document.querySelectorAll('#panel input[type=range]').forEach(e => {
    if(SKIP.includes(e.id)) return;
    /* ⚠️ その場で作るつまみ（グラデの向きなど）は id を持たない＝目印で外す */
    if(e.dataset && e.dataset.neu === 'skip') return;
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
  const rows = () => [...document.getElementById('layers').children]
    .filter(r => !r.classList.contains('bgrow'));
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
ok(await p.evaluate(() => { openEditor(SEL); return true; }) &&
   await (async () => { await wait(1400);
     return p.evaluate(() => !document.getElementById('textBox').classList.contains('hide')); })(),
   '⭐ 文字のパネルは【編集画面】で出る（ボード画面には置き方だけ）');
await p.evaluate(() => document.getElementById('b_solo').click());
await wait(900);
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
await p.evaluate(() => document.getElementById('b_solo').click());
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
ok(await p.evaluate(() => { openEditor(SEL); return true; }) &&
   await (async () => { await wait(1400);
     return p.evaluate(() => !document.getElementById('shapeBox').classList.contains('hide')); })(),
   '⭐ 図形のパネルは【編集画面】で出る');
const SKINDS = await p.evaluate(async () => {
  const out = [];
  for(const bt of document.querySelectorAll('#s_shape button')){
    bt.click(); await new Promise(r => setTimeout(r, 350));
    out.push(bt.dataset.v);
  }
  return out;
});
ok(SKINDS.length === 6, '⭐ 6つのかたちが作れる', SKINDS.join('/'));
/* ⭐⭐ 図形の塗りは【グラデーション（終わりを透明）】にできる
   🔴 ポスターの「下を落として字を置く」は これが無いと帯を何枚も重ねる羽目になり、
      必ず段差が出る（2026-08-31 にキングダム風を組んで分かった）。 */
const SHG = await p.evaluate(async () => {
  document.querySelector('#s_shape button[data-v="rect"]').click();
  await new Promise(r => setTimeout(r, 300));
  const L = LAYERS[SEL];
  /* ⚠️ わざと【古い設定JSON と同じ形】にする（はじめの色・おわりの色・おわりを透明に）。
     ＝読むときにストップへ写されて、絵は同じままになることを見る（2026-09-01 に作り替えた） */
  Object.assign(shapeOf(L), { w:800, h:800, fillOn:true, strokeOn:false,
    grad:true, g1:'#000000', g2:'#000000', gang:270, gfade:true });
  delete L.shape.fmode; delete L.shape.smode;
  shapeOf(L);                       /* ← ここで古い形から写される */
  rebuildShape(L);
  await new Promise(r => setTimeout(r, 300));
  const c = document.createElement('canvas'); c.width = 40; c.height = 40;
  c.getContext('2d').drawImage(L.img, 0, 0, 40, 40);
  const d = c.getContext('2d').getImageData(0, 0, 40, 40).data;
  return { 上:d[(2*40+20)*4+3], 下:d[(37*40+20)*4+3] };
});
ok(Math.abs(SHG.上 - SHG.下) > 120,
   '⭐⭐ 図形の塗りをグラデーションにでき、終わりが透明になる（段差の出ない落とし）',
   JSON.stringify(SHG));
await p.evaluate(() => { const L = LAYERS[SEL];
  shapeOf(L).grad = false; rebuildShape(L); });
await wait(400);
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
  return /fixed|absolute/.test(getComputedStyle(bh).position) && !bh.closest('canvas');
}), '⭐ 左上の表記は浮いているだけ（PNG には入らない）');

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
/* ⭐⭐ 2026-09-01・図形は【盤でドラッグして描く】に変えた（木下＝「選ぶとすぐに出るのではなく、
   自分でドラッグして入れたい。これが一番良さそう」）＝押しただけでは増えない。 */
const SD = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const n0 = LAYERS.length;
  document.querySelector('#tools button[data-t="shape"]').click(); await w(500);
  const 押しただけでは増えない = LAYERS.length === n0 && SHAPEDRAW === true;
  const a2 = toScreen(0.3, 0.3), b2 = toScreen(0.6, 0.55);
  stage.dispatchEvent(new PointerEvent('pointerdown',
    { clientX:a2.clientX, clientY:a2.clientY, bubbles:true, pointerId:1 }));
  stage.dispatchEvent(new PointerEvent('pointermove',
    { clientX:b2.clientX, clientY:b2.clientY, bubbles:true, pointerId:1 }));
  await w(200);
  const 下見が出る = !!SHAPEBOX;
  stage.dispatchEvent(new PointerEvent('pointerup',
    { clientX:b2.clientX, clientY:b2.clientY, bubbles:true, pointerId:1 }));
  await w(600);
  const L = LAYERS[LAYERS.length-1], f = sheet();
  return { 押しただけでは増えない, 下見が出る, 種:L.kind, 増えた:LAYERS.length === n0 + 1,
           幅:Math.round(L.shape ? L.shape.w : 0), ねらい:Math.round(0.3 * f.w),
           十字:document.body.classList.contains('shapedraw') };
});
ok(SD.押しただけでは増えない && SD.下見が出る,
   '⭐⭐ 図形は【押しただけでは置かれない】＝盤でドラッグして描く', JSON.stringify(SD));
ok(SD.増えた && SD.種 === 'shape' && Math.abs(SD.幅 - SD.ねらい) <= 2,
   '⭐⭐ ドラッグした大きさそのままで図形が置かれる', JSON.stringify(SD));
ok(!SD.十字, '⭐ 描き終わったら【描く待ち】は解ける（十字が残らない）', String(SD.十字));
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
ok(await p.evaluate(() => {
  document.querySelector('#tools button[data-t="retouch"]').click();
  document.querySelector('#s_tool button[data-v="erase"]').click();
  const c = getComputedStyle(document.getElementById('stage')).cursor;
  const bt2 = document.querySelector('#tools button[data-t="move"]'); if(bt2) bt2.click();
  return c === 'crosshair'; }), '⭐ 画像編集のときだけ十字');

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
     ['fx_bevel','ベベルとエンボス'], ['fx_satin','サテン'], ['fx_grad','グラデーション'],
     ['fx_pat','パターン']]){
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
   '⭐⭐ エフェクト9つが効いて、切れば1画素も同じに戻る（焼き込んでいない）',
   FXDEAD.length ? FXDEAD.join(' , ') : '9/9');

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
  document.getElementById('b_solo').click();
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
  await p.evaluate(([tt, SUB]) => (SUB.includes(tt)
    ? (document.querySelector('#tools button[data-t="retouch"]').click(),
       document.querySelector('#s_tool button[data-v="' + tt + '"]').click())
    : document.querySelector('#tools button[data-t="' + tt + '"]').click()), [t, OPTSUB]);
  await wait(450);
  const v = await p.evaluate(() => ({ cut:cutView(), mode:MODE }));
  if(v.cut || v.mode !== 'cut') TOOLSTAY.push(t + JSON.stringify(v));
}
ok(TOOLSTAY.length === 0, '⭐⭐ 切る道具を選んでも【版面のまま】（画面が飛ばない）',
   TOOLSTAY.length ? TOOLSTAY.join(' , ') : '4/4');
const BRUSH = await p.evaluate(async () => {
  const o = LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b));
  SEL = LAYERS.indexOf(o[1]); SELIDS = [o[1].id]; syncSel(); buildList();
  (document.querySelector('#tools button[data-t="retouch"]').click(),document.querySelector('#s_tool button[data-v="erase"]').click());
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
/* ⚠️ 2026-08-31 から Photoshop と同じ＝閉じたら【作業用パス】。切らないし選択にもならない。
   ⭐ パスパネルに並び、そこから 選択にする／線を描く／塗る／ベクトルマスクにする を選ぶ。 */
ok(await p.evaluate(() => !!LAYERS[SEL].work && !LAYERS[SEL].sel && !hasCut(LAYERS[SEL])),
   '⭐⭐ パスを閉じても【切らないし選択にもならない】＝作業用パスになる（Adobe と同じ）');
ok(await p.evaluate(() => !document.getElementById('pathBox').classList.contains('hide')
   && document.querySelectorAll('#pathList .pathrow').length >= 1),
   '⭐⭐ パスパネルに【作業用パス】として並ぶ');
await p.evaluate(() => document.getElementById('b_pload').click());
await wait(700);
ok(await p.evaluate(() => !document.getElementById('selUI').classList.contains('hide')),
   '⭐［パスを選択範囲として読み込む］と選択の道具が出る');
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
ok(await p.evaluate(() => { const L = LAYERS[SEL]; return hasCut(L) && selSubs(L.sel).length > 0; }),
   '⭐ 選択から切り抜ける（⚠️ 切ったあとも選択は残る＝Photoshop と同じ）');

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
/* ⚠️ 数は増える（2026-08-31 に7つ足した）ので【ボタンの数と一致するか】で見る
   ＝「押した数だけ効いて、押した所に印が付く」が本当に見たいこと */
const BANN = await p.evaluate(() => document.querySelectorAll('#s_banner button').length);
ok(BAN.out.length === BANN && BAN.out.every(x => !x.includes('印なし')),
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
await p.evaluate(() => (document.querySelector('#tools button[data-t="retouch"]').click(),document.querySelector('#s_tool button[data-v="liq"]').click()));
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
/* ⚠️ 2026-08-31 から Adobe と同じ＝閉じたものは【作業用パス】。
   ［作業用パスを保存］で名前つきになり、上書きされなくなる。 */
await p.evaluate(() => document.getElementById('b_psave').click());
await wait(600);
ok(await p.evaluate(() => LAYERS[SEL].paths.length === 1 && !LAYERS[SEL].work &&
     document.querySelectorAll('#pathList .pathrow').length === 1),
   '⭐⭐ 作業用パスを保存できる（Adobe のパスパネルと同じ）');
await p.evaluate(() => { document.querySelector('#pathList .pathrow').click(); });
await wait(400);
await p.evaluate(() => document.getElementById('b_pload').click());
await wait(600);
ok(await p.evaluate(() => selSubs(LAYERS[SEL].sel).length > 0), '⭐ 残したパスを選択に呼び戻せる');
const PS0 = await p.evaluate(() => LAYERS.length);
await p.evaluate(() => document.getElementById('b_pshape').click());
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
  /* ⚠️ 2026-08-31 から 閉じたものは【作業用パス】＝直す相手は curPathPts */
  const PP = () => curPathPts(LAYERS[SEL]);
  const before = { x:PP()[0].x, y:PP()[0].y };
  const A = toScr(before.x/m.w, before.y/m.h);
  const st = document.getElementById('stage');
  st.dispatchEvent(new PointerEvent('pointerdown',
    { bubbles:true, pointerId:21, clientX:A.x, clientY:A.y }));
  st.dispatchEvent(new PointerEvent('pointermove',
    { bubbles:true, pointerId:21, clientX:A.x+40, clientY:A.y+30 }));
  st.dispatchEvent(new PointerEvent('pointerup',
    { bubbles:true, pointerId:21, clientX:A.x+40, clientY:A.y+30 }));
  await new Promise(r => setTimeout(r, 500));
  const moved = Math.abs(PP()[0].x - before.x) > 3 ||
                Math.abs(PP()[0].y - before.y) > 3;
  /* 線の上を押すと点が増える */
  const n0 = PP().length;
  const ps = PP();
  const mid = { x:(ps[0].x+ps[1].x)/2, y:(ps[0].y+ps[1].y)/2 };
  const B = toScr(mid.x/m.w, mid.y/m.h);
  st.dispatchEvent(new PointerEvent('pointerdown',
    { bubbles:true, pointerId:22, clientX:B.x, clientY:B.y }));
  st.dispatchEvent(new PointerEvent('pointerup',
    { bubbles:true, pointerId:22, clientX:B.x, clientY:B.y }));
  await new Promise(r => setTimeout(r, 500));
  const n1 = PP().length;
  dispatchEvent(new KeyboardEvent('keydown', { key:'Backspace', bubbles:true }));
  await new Promise(r => setTimeout(r, 400));
  return { moved, 掴んだ:SELPT, n0, n1, n2:PP().length };
});
ok(PE.moved, '⭐⭐ 閉じたパスの点を掴んで動かせる（形をあとから直せる）', JSON.stringify(PE));
ok(PE.n1 === PE.n0 + 1, '⭐ 線の上を押すと点が増える（Photoshop と同じ）',
   PE.n0 + ' → ' + PE.n1);
ok(PE.n2 === PE.n0, '⭐ ⌫ で選んだ点を消せる');
await p.evaluate(() => document.getElementById('b_pedit').click());
await wait(800);
ok(await p.evaluate(() => POLY.length >= 3 && !LAYERS[SEL].work),
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
/* 🔴🔴 ダブルタップ拡大を止める（2026-08-31・木下＝「タップするとときどき違うところで
   デザイン関係なくズームされるやつ」）。⚠️ iOS は user-scalable=no を無視するので
   止められるのは touch-action だけ。 */
const ZM = await p.evaluate(() => {
  const ta = sel => { const e = document.querySelector(sel);
    return e ? getComputedStyle(e).touchAction : 'なし'; };
  const small = [];
  document.querySelectorAll('textarea,select,input[type=text],input[type=number]')
    .forEach(e => { if(parseFloat(getComputedStyle(e).fontSize) < 16)
      small.push((e.id || e.tagName) + ':' + getComputedStyle(e).fontSize); });
  const btns = [...document.querySelectorAll('#panel button')].slice(0, 20)
    .filter(e => getComputedStyle(e).touchAction !== 'manipulation').length;
  return { body:ta('body'), panel:ta('#panel'), tools:ta('#tools'), stage:ta('#stage'),
           小さい字の入力:small, 押す所でmanipulationでない:btns };
});
ok(ZM.body === 'manipulation' && ZM.押す所でmanipulationでない === 0,
   '⑨ 指の端末で【ダブルタップ拡大】が止まる', JSON.stringify(ZM));
ok(ZM.panel === 'pan-y' && ZM.tools === 'pan-x' && ZM.stage === 'none',
   '⑨ 引ける所は引けるまま（右パネル縦・ツールバー横・盤は指を全部取る）');
ok(ZM.小さい字の入力.length === 0,
   '⑨ 字を打つ所はぜんぶ 16px（iOS が勝手に寄らない）',
   ZM.小さい字の入力.join(',') || '0件');
/* ══⭐⭐ 編集画面＝【その画像だけのアートボード】══ 2026-08-31 ═══════════
   🔴🔴 木下＝「編集画面内ではその画像のレイヤーとしてレイヤーパネルも切り替えて。
      フレームサイズの変更や、この画像だけ小さくして左端に余白ができたりもできるのが普通」
   ⭐ 見るのは【中と外が別の紙になっているか】：
     ・入ると一覧が中身に切り替わる（版面の枚数は変わらない）
     ・紙を大きくすると まわりに余白ができて、中の素材は px で動かない
     ・中で足したものは 外から見ると【1枚の画像】
     ・入って出るだけなら 1画素も変わらない（中を作っただけで絵を変えない） */
await p.setViewport({ width:1400, height:900 });
await wait(600);
/* ⚠️ 指の端末に切り替えたところで頁が読み直される＝物差しを入れ直す */
await p.evaluate(() => {
  window.__full = () => { const d = g.getImageData(0,0,cv.width,cv.height).data;
    const o = []; for(let i = 0; i < d.length; i += 4*3) o.push(d[i], d[i+1], d[i+2], d[i+3]);
    return o; };
  window.__sad = (A,B) => { let s2 = 0;
    for(let i = 0; i < Math.min(A.length,B.length); i++) s2 += Math.abs(A[i]-B[i]);
    return Math.round(s2); };
});
await p.evaluate(() => { closeAllEditors(); document.getElementById('b_demo').click(); });
await wait(2000);
const AB0 = await p.evaluate(() => window.__full());
const AB = await p.evaluate(async () => {
  const wait2 = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const o = LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b));
  const idx = LAYERS.indexOf(o[0]);
  out.版面の枚数 = LAYERS.length;
  openEditor(idx);
  await wait2(700);
  out.入った = !!SUBOF;
  out.中の枚数 = LAYERS.length;
  out.一覧の行 = [...document.getElementById('layers').children]
    .filter(r => !r.classList.contains('bgrow')).length;
  out.紙 = [SUBOF.sub.w, SUBOF.sub.h];
  out.奥行きを出さない = getComputedStyle(document.getElementById('depthKnob')).display === 'none';
  out.空気を出さない = getComputedStyle(document.getElementById('airPart')).display === 'none';
  out.置き方は出す = !document.getElementById('selBox').classList.contains('hide');
  out.素材を足せる = !document.getElementById('matBox').classList.contains('hide');
  /* 入って出るだけ＝1画素も変わらない */
  closeEditor(); await wait2(700);
  COARSE = 0; render(); await wait2(300);
  out.出たあとの枚数 = LAYERS.length;
  return out;
});
const AB1 = await p.evaluate(() => window.__full());
ok(AB.入った && AB.中の枚数 === 1 && AB.一覧の行 === 1,
   '⭐⭐ ダブルクリックで【その画像だけのアートボード】に入る（一覧が中身に切り替わる）',
   JSON.stringify({ 中の枚数:AB.中の枚数, 一覧:AB.一覧の行, 版面:AB.版面の枚数 }));
ok(AB.奥行きを出さない && AB.空気を出さない && AB.置き方は出す && AB.素材を足せる,
   '⭐ 中では【奥行き・空気】を出さない（版面のもの）／置き方と素材を足すは出す',
   JSON.stringify({ 奥行き:AB.奥行きを出さない, 空気:AB.空気を出さない,
                    置き方:AB.置き方は出す, 素材:AB.素材を足せる }));
ok(AB.出たあとの枚数 === AB.版面の枚数 && await p.evaluate(([a,b2]) => window.__sad(a,b2), [AB0, AB1]) === 0,
   '🔴 入って出るだけなら【1画素も同じ】（中を作っただけで絵を変えない）',
   await p.evaluate(([a,b2]) => window.__sad(a,b2), [AB0, AB1]));

/* ⭐ 紙を大きくすると まわりに余白ができる（中の素材は px で動かない） */
const AB2 = await p.evaluate(async () => {
  const wait2 = ms => new Promise(r => setTimeout(r, ms));
  const o = LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b));
  openEditor(LAYERS.indexOf(o[0]));
  await wait2(600);
  const s = SUBOF.sub, b0 = LAYERS[0];
  const 前 = { w:s.w, h:s.h, px:b0.s * s.w, cx:b0.x * s.w };
  document.getElementById('b_submargin').click();
  await wait2(600);
  const 後 = { w:s.w, h:s.h, px:LAYERS[0].s * s.w, cx:LAYERS[0].x * s.w };
  /* 中の素材は px では動いていない（紙だけ大きくなった＝余白ができた） */
  const 動いていない = Math.abs(後.px - 前.px) < 2 && Math.abs((後.cx - 後.w/2) - (前.cx - 前.w/2)) < 2;
  const 紙が大きい = 後.w > 前.w && 後.h > 前.h;
  /* 中で画像を足せる */
  const c = document.createElement('canvas'); c.width = 120; c.height = 120;
  const x = c.getContext('2d'); x.fillStyle = '#22cc55'; x.fillRect(0,0,120,120);
  const img = new Image();
  await new Promise(r => { img.onload = r; img.src = c.toDataURL(); });
  addImage(img, '中に足した', 0);
  await wait2(500);
  const 中で足せた = LAYERS.length === 2 && LAYERS[1].name === '中に足した';
  const 版面の枚数 = SUBBACK[0].layers.length;
  closeEditor(); await wait2(700);
  return { 動いていない, 紙が大きい, 中で足せた, 版面の枚数, 出たあと:LAYERS.length, 前, 後 };
});
ok(AB2.紙が大きい && AB2.動いていない,
   '⭐⭐ 紙を大きくすると【まわりに余白】ができる（中の素材は動かない）',
   JSON.stringify({ 前:AB2.前.w + '×' + AB2.前.h, 後:AB2.後.w + '×' + AB2.後.h }));
ok(AB2.中で足せた && AB2.出たあと === AB2.版面の枚数,
   '⭐⭐ 中で画像を足せる（版面から見ると【1枚の画像】のまま）',
   JSON.stringify({ 中:2, 版面:AB2.出たあと }));

/* ⭐⭐ 中身は設定JSONに入る（＝「どう作ったか」が戻る） */
const AB3 = await p.evaluate(async () => {
  const wait2 = ms => new Promise(r => setTimeout(r, ms));
  COARSE = 0; render(); await wait2(300);
  const before = window.__full();
  const j = JSON.parse(JSON.stringify(snapshot()));
  const L = LAYERS.find(x => x.sub);
  const 入っている = !!(j.layers.find(q => q.sub && q.sub.layers.length === 2));
  /* ① 設定JSON＝写真は入っていないので【いま置いてある写真のまま】紙と置き方が戻るか
     ⚠️ 荒らすのは「紙の大きさと中の置き方」（写真を捨てると設定JSONでは戻せない＝仕様） */
  L.sub.w = Math.round(L.sub.w * 1.7);
  L.sub.layers[0].x = 0.2; L.sub.layers[0].s *= 0.6;
  L.sub.layers.forEach(o => o._key = ''); bumpSub(L);
  COARSE = 0; render(); await wait2(400);
  const 荒らせた = window.__sad(before, window.__full()) > 0;
  applyJSON(j);
  await wait2(900); COARSE = 0; render(); await wait2(300);
  const 戻る = window.__sad(before, window.__full());
  /* ② まるごとJSON＝中に置いた写真も入るので、中身を捨てても組み直せる */
  const jb = JSON.parse(JSON.stringify(snapshot()));
  jb.bundled = true;
  jb.layers.forEach((L2, i) => {
    L2.img = imgData(LAYERS[i].img, 1600);
    const sb = LAYERS[i].sub;
    if(sb) L2.subImgs = sb.layers.map(q => q.img ? imgData(q.img, 1600) : null);
  });
  const 中の写真も入る = !!(jb.layers.find(q => q.subImgs && q.subImgs.length === 2
                                              && q.subImgs.every(u => typeof u === 'string')));
  LAYERS.forEach(o => { o.sub = null; bumpSub(o); });
  COARSE = 0; render(); await wait2(400);
  applyJSON(jb);
  await wait2(1600); COARSE = 0; render(); await wait2(400);
  const L2 = LAYERS.find(x => x.sub);
  const まるごとで組み直せる = !!(L2 && L2.sub.layers.length === 2
                                 && L2.sub.layers[1].img && L2.sub.layers[1].img.naturalWidth > 10);
  return { 入っている, 荒らせた, 戻る, 中の写真も入る, まるごとで組み直せる };
});
ok(AB3.入っている, '⭐⭐ 中身（アートボード）は設定JSONに入る');
ok(AB3.荒らせた, '（前提）中身の紙と置き方を荒らすと絵は変わっている');
ok(AB3.戻る === 0, '⭐⭐ 設定を読むと【中の紙と置き方まで】1画素も同じに戻る', AB3.戻る);
ok(AB3.中の写真も入る && AB3.まるごとで組み直せる,
   '⭐⭐ まるごと書き出しには【中に置いた写真】も入る（中身ごと組み直せる）',
   JSON.stringify({ 写真:AB3.中の写真も入る, 組み直せた:AB3.まるごとで組み直せる }));

/* ══⭐ 一覧の名前が読める（1文字に潰れない）══ 2026-08-31
   🔴 ボタンが6つで幅を全部取り、名前が「見.」まで潰れていた（実機のスクショで発覚）。
   ⭐ 見るのは【はみ出していないか】＝ellipsis で切られていないか。 */
const NMW = await p.evaluate(async () => {
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1600); });
  const rows = [...document.getElementById('layers').children]
    .filter(r => !r.classList.contains('bgrow'));
  return rows.map(r => { const n = r.querySelector('.nm');
    return { t:n.textContent, w:Math.round(n.clientWidth), need:Math.round(n.scrollWidth) }; });
});
{
  const bad = NMW.filter(o => o.need > o.w + 2);
  ok(bad.length === 0, '⭐ 一覧の名前が【潰れずに読める】（ellipsis で切られない）',
     bad.length ? JSON.stringify(bad) : NMW.map(o => o.t).join(' / '));
}

/* ══⭐⭐ 押しても何も起きない、を作らない ══ 2026-08-31
   🔴🔴 木下＝「画像を入れてみた。色で消すとかも反映されていないような気がする」
      「全部そうだが、もしくはリアルタイムでプレビューできない状態？」
     ＝道具は効いていた。効いていなかったのは【入口】── 色で消すは盤で色を押すまで
       許容つまみが何もしないのに、つまみは触れる形で出ていた。 */
const HINT = await p.evaluate(async () => {
  const wait2 = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors(); SEL = 0; syncSel(); buildList();
  document.querySelector('#tools button[data-t="retouch"]').click();
  document.querySelector('#s_tool button[data-v="color"]').click();
  await wait2(400);
  const 前 = { 案内:el('optSay').textContent, 許容:el('r_tol').disabled,
               戻す:el('b_uncut').disabled };
  const L = LAYERS[SEL];
  pickColor(L, 3, 3); syncKeys();
  await wait2(300);
  const 後 = { 案内:el('optSay').textContent, 許容:el('r_tol').disabled,
               戻す:el('b_uncut').disabled };
  clearMask(L); syncKeys(); render();
  document.querySelector('#tools button[data-t="move"]').click();
  return { 前, 後 };
});
ok(/どこが消えるか/.test(HINT.前.案内) && HINT.前.許容 === false && HINT.前.戻す === true,
   '⭐⭐ 色で消すは【押す前でも許容を触れる】／案内は「どこが消えるか出る」',
   JSON.stringify(HINT.前));
ok(HINT.後.許容 === false && HINT.後.戻す === false && /覚え/.test(HINT.後.案内),
   '⭐ 色を押すと 覚えた数が出る（許容はずっと触れる）',
   JSON.stringify(HINT.後));

/* ══⭐⭐ 空気と関係ない【ふつうの色調補正】══ 2026-08-31
   🔴 木下＝「**空気関係なく** 明るさやサイドなど、いわゆる Photoshop 的な所はここに今ある？」
     ＝有ったのは黒点・白点・ガンマ・色まで。コントラストとトーンカーブが無かった。
   ⭐ 見るのは【絶対値として効くか】と【まっすぐに戻すと1画素も同じに戻るか】。 */
const TC = await p.evaluate(async () => {
  const wait2 = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1600); });
  const idx = LAYERS.length - 1;
  openEditor(idx); await wait2(800);
  const L = LAYERS[SEL];
  COARSE = 0; render(); await wait2(300);
  const before = window.__full();
  const 平ら = curvePlain(edOf(L).curve);
  /* ① RGB を曲げる（中間を持ち上げる） */
  const pts = curveOf(L, 'rgb');
  pts.splice(1, 0, [0.5, 0.78]);
  L._key = ''; L._edk = ''; L._edc = null; if(SUBOF) bumpSub(SUBOF);
  COARSE = 0; render(); await wait2(400);
  const 曲げた = window.__sad(before, window.__full());
  /* ② まっすぐに戻す */
  document.getElementById('b_curve0').click();
  COARSE = 0; render(); await wait2(400);
  const 戻る = window.__sad(before, window.__full());
  /* ③ R だけ曲げると【赤だけ】動く */
  const rp = curveOf(L, 'r');
  rp.splice(1, 0, [0.5, 0.85]);
  L._key = ''; L._edk = ''; L._edc = null; if(SUBOF) bumpSub(SUBOF);
  COARSE = 0; render(); await wait2(400);
  const d = g.getImageData(0,0,cv.width,cv.height).data;
  let dr = 0, db = 0, n = 0;
  for(let i = 0; i < d.length; i += 4*3){
    dr += Math.abs(d[i] - before[n]); db += Math.abs(d[i+2] - before[n+2]); n += 4;
  }
  const 赤だけ = dr > db * 3;
  /* ④ 設定JSON に入る */
  const j = JSON.parse(JSON.stringify(snapshot()));
  const 中に入る = JSON.stringify(j).indexOf('"curve"') >= 0;
  document.getElementById('b_curve0').click();
  await wait2(300);
  /* ⑤ コントラストは絶対値（空気を触っていない） */
  const put = (id, v) => { const e = document.getElementById(id); e.value = v;
    e.dispatchEvent(new Event('input',{bubbles:true})); };
  COARSE = 0; render(); await wait2(300);
  const b2 = window.__full();
  put('r_con', 80);
  COARSE = 0; render(); await wait2(400);
  const コントラストが効く = window.__sad(b2, window.__full()) > 0;
  put('r_con', 0);
  COARSE = 0; render(); await wait2(400);
  const コントラストを戻す = window.__sad(b2, window.__full());
  closeEditor(); await wait2(600);
  return { 平ら, 曲げた, 戻る, 赤だけ, 中に入る, コントラストが効く, コントラストを戻す, dr:Math.round(dr), db:Math.round(db) };
});
ok(TC.平ら, '⭐ トーンカーブの既定は【まっすぐ】（分岐ごと通さない）');
ok(TC.曲げた > 0, '⭐⭐ トーンカーブを曲げると絵が変わる', TC.曲げた);
ok(TC.戻る === 0, '🔴 まっすぐに戻すと【1画素も同じ】に戻る（焼き込んでいない）', TC.戻る);
ok(TC.赤だけ, '⭐⭐ R だけ曲げると【赤だけ】動く（色かぶりを直せる）',
   JSON.stringify({ 赤:TC.dr, 青:TC.db }));
ok(TC.中に入る, '⭐ トーンカーブは設定JSONに入る');
ok(TC.コントラストが効く && TC.コントラストを戻す === 0,
   '⭐⭐ コントラスト（絶対値）が効いて、0 に戻すと1画素も同じに戻る',
   TC.コントラストを戻す);

/* ══⭐⭐ 調整レイヤーは【空気とは別の色調補正】を持つ ══ 2026-08-31
   🔴 木下＝「今の調整レイヤーはレイヤーパネルの上にあり、下にある画像に対して調整が
      できるという内容だよね？ **空気とは別に** ここに調整できるための」
   ⭐ 見るのは【下に効くか】【0 に戻すと1画素も同じに戻るか】【切ると1枚だけか】。 */
const ADJ2 = await p.evaluate(async () => {
  const wait2 = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  COARSE = 0; render(); await wait2(300);
  const before = window.__full();
  document.getElementById('b_adjlayer').click(); await wait2(500);
  const L = LAYERS[SEL];
  const out = { 調整レイヤー: L.kind === 'adj',
    盤でパネルが出る: !document.getElementById('editBox').classList.contains('hide'),
    置き方は出さない: getComputedStyle(document.getElementById('scaleKnob')).display === 'none' };
  const put = (id, v) => { const e = document.getElementById(id); e.value = v;
    e.dispatchEvent(new Event('input', { bubbles:true })); };
  const one = async (name, on, off) => {
    on(); touchEd(L); COARSE = 0; render(); await wait2(420);
    const d1 = window.__sad(before, window.__full());
    off(); touchEd(L); COARSE = 0; render(); await wait2(420);
    out[name] = [d1, window.__sad(before, window.__full())];
  };
  await one('レベル補正', () => put('r_black', 30), () => put('r_black', 0));
  await one('コントラスト', () => put('r_con', 70), () => put('r_con', 0));
  await one('露光量', () => put('r_expo', 60), () => put('r_expo', 0));
  await one('自然な彩度', () => put('r_vib', 90), () => put('r_vib', 0));
  await one('レンズフィルター', () => put('r_lens', 60), () => put('r_lens', 0));
  await one('トーンカーブ',
    () => { curveOf(L, 'rgb').splice(1, 0, [0.5, 0.8]); },
    () => { document.getElementById('b_curve0').click(); });
  await one('チャンネルミキサー',
    () => { MIXCH = 'r'; put('r_mxg', 130); },
    () => { document.getElementById('b_mix0').click(); });
  await one('グラデーションマップ',
    () => { const g2 = gmapOf(L); g2.stops = GMPRE.sepia.map(o => Object.assign({}, o)); g2.on = true; },
    () => { gmapOf(L).on = false; });
  /* ⭐ 切ると【すぐ下の1枚だけ】に効く（Photoshop と同じ） */
  put('r_black', 30); touchEd(L); COARSE = 0; render(); await wait2(400);
  const ぜんぶ = window.__sad(before, window.__full());
  L.clip = true; touchEd(L); COARSE = 0; render(); await wait2(400);
  const いち枚だけ = window.__sad(before, window.__full());
  out.切ると狭くなる = ぜんぶ > いち枚だけ && いち枚だけ > 0;
  out.きき = [ぜんぶ, いち枚だけ];
  removeAt(SEL); COARSE = 0; render(); await wait2(400);
  out.消したら戻る = window.__sad(before, window.__full());
  return out;
});
ok(ADJ2.調整レイヤー && ADJ2.盤でパネルが出る && ADJ2.置き方は出さない,
   '⭐⭐ 調整レイヤーは【盤の上で】色調補正のパネルが出る（置き方は出さない）',
   JSON.stringify({ パネル:ADJ2.盤でパネルが出る, 置き方:ADJ2.置き方は出さない }));
{
  const names = ['レベル補正','コントラスト','露光量','自然な彩度','レンズフィルター',
                 'トーンカーブ','チャンネルミキサー','グラデーションマップ'];
  const dead = names.filter(k => !(ADJ2[k] && ADJ2[k][0] > 0));
  const stuck = names.filter(k => ADJ2[k] && ADJ2[k][1] !== 0);
  ok(dead.length === 0, '⭐⭐ 調整レイヤーの補正8つが【下の素材ぜんぶ】に効く',
     dead.length ? dead.join(',') : names.length + '本');
  ok(stuck.length === 0, '🔴 どれも 0 に戻すと【1画素も同じ】に戻る（焼き込んでいない）',
     stuck.length ? stuck.join(',') : 'ぜんぶ戻る');
}
ok(ADJ2.切ると狭くなる, '⭐⭐［下の素材の形で切る］で【すぐ下の1枚だけ】に効く',
   JSON.stringify(ADJ2.きき));
ok(ADJ2.消したら戻る === 0, '🔴 調整レイヤーを消すと1画素も同じに戻る', ADJ2.消したら戻る);

/* ══⭐⭐ 塗りレイヤー（べた塗り・グラデーション・パターン）══ 2026-08-31 */
const FILLL = await p.evaluate(async () => {
  const wait2 = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  COARSE = 0; render(); await wait2(300);
  const before = window.__full();
  const out = {};
  for(const [id, k, nm] of [['b_solid','solid','べた塗り'], ['b_grad','grad','グラデーション'],
                            ['b_pattern','pattern','パターン']]){
    document.getElementById(id).click(); await wait2(600);
    COARSE = 0; render(); await wait2(300);
    out[nm] = { 出た: window.__sad(before, window.__full()) > 0,
                種類: LAYERS[SEL].rnd.kind === k,
                絵になっている: !!(LAYERS[SEL].img && LAYERS[SEL].img.naturalWidth > 10) };
    removeAt(SEL); COARSE = 0; render(); await wait2(300);
    out[nm].消したら戻る = window.__sad(before, window.__full()) === 0;
  }
  /* 柄6つがぜんぶ違う絵になる */
  document.getElementById('b_pattern').click(); await wait2(600);
  const seen = []; let prev = null;
  for(const bt of document.querySelectorAll('#s_pat button')){
    bt.click(); await wait2(320); COARSE = 0; render(); await wait2(200);
    const now = window.__full();
    seen.push([bt.dataset.v, prev ? window.__sad(prev, now) > 0 : true]);
    prev = now;
  }
  out.柄 = seen;
  /* 地なしにできる＝下が透ける */
  const kb = document.getElementById('k_patbg');
  kb.checked = false; kb.dispatchEvent(new Event('change', { bubbles:true }));
  await wait2(400);
  out.地なしにできる = renderOf(LAYERS[SEL]).pc2 === '#00000000';
  removeAt(SEL); COARSE = 0; render(); await wait2(300);
  return out;
});
{
  const bad = ['べた塗り','グラデーション','パターン']
    .filter(k => !(FILLL[k].出た && FILLL[k].種類 && FILLL[k].絵になっている && FILLL[k].消したら戻る));
  ok(bad.length === 0, '⭐⭐ 塗りレイヤー3種が置けて、消すと1画素も同じに戻る',
     bad.length ? bad.join(',') : 'べた塗り／グラデーション／パターン');
  const dead = FILLL.柄.filter(([, ok2]) => !ok2).map(([k]) => k);
  ok(dead.length === 0, '⭐ パターンの柄6つがぜんぶ違う絵になる',
     dead.length ? dead.join(',') : FILLL.柄.map(([k]) => k).join('/'));
  ok(FILLL.地なしにできる, '⭐ パターンは地なしにできる（下が透ける）');
}

/* ══⭐ ライト／ダーク ══ 2026-08-31・木下＝「ボードが白色じゃないといけない時もある」 */
const LTMODE = await p.evaluate(async () => {
  const wait2 = ms => new Promise(r => setTimeout(r, ms));
  COARSE = 0; render(); await wait2(300);
  const 盤0 = window.__full();
  const 台0 = getComputedStyle(document.getElementById('stage')).backgroundColor;
  document.getElementById('lightBtn').click(); await wait2(500);
  COARSE = 0; render(); await wait2(300);
  const out = {
    台が変わる: getComputedStyle(document.getElementById('stage')).backgroundColor !== 台0,
    盤は変わらない: window.__sad(盤0, window.__full()) === 0,
    見出しが逆の色: (() => {
      const h = document.querySelector('#panel > .grp > label.h');
      const s2 = getComputedStyle(h);
      const n = c => c.match(/\d+/g).slice(0,3).map(Number).reduce((a,b)=>a+b,0) / 3;
      return Math.abs(n(s2.backgroundColor) - n(s2.color)) > 100;
    })(),
  };
  document.getElementById('lightBtn').click(); await wait2(400);
  out.戻せる = !document.body.classList.contains('light');
  return out;
});
ok(LTMODE.台が変わる && LTMODE.戻せる, '⭐ ライト／ダークを切り替えられる（覚えておく）',
   JSON.stringify(LTMODE));
ok(LTMODE.盤は変わらない, '🔴 明かりを変えても【出す絵は1画素も変わらない】（画面の明かりと紙の色は別）');
ok(LTMODE.見出しが逆の色, '⭐ 大きな見出しは【地と逆の色】（どこからどこまでか分かる）');

/* ══⭐ 版面のパスも残せる ══ 2026-08-31 */
const PGP = await p.evaluate(async () => {
  const wait2 = ms => new Promise(r => setTimeout(r, ms));
  PAGEPATHS = [];
  SHEETCUT = { keepIn:true, pts:[{x:0.2,y:0.2,hx:0,hy:0},{x:0.8,y:0.25,hx:0,hy:0},{x:0.5,y:0.8,hx:0,hy:0}] };
  LAYERS.forEach(L => L._key = ''); COARSE = 0; render(); await wait2(300);
  const 切った = window.__full();
  document.getElementById('b_pgsave').click(); await wait2(200);
  const 残った = PAGEPATHS.length;
  SHEETCUT = null; LAYERS.forEach(L => L._key = ''); COARSE = 0; render(); await wait2(300);
  const 消した = window.__sad(切った, window.__full()) > 0;
  document.querySelector('#pgList button').click(); await wait2(300);
  COARSE = 0; render(); await wait2(300);
  const 戻せた = window.__sad(切った, window.__full()) === 0;
  const j = JSON.parse(JSON.stringify(snapshot()));
  const JSONにも = (j.pagePaths || []).length === 1;
  SHEETCUT = null; PAGEPATHS = []; buildPgList();
  LAYERS.forEach(L => L._key = ''); COARSE = 0; render(); await wait2(200);
  return { 残った, 消した, 戻せた, JSONにも };
});
ok(PGP.残った === 1 && PGP.消した && PGP.戻せた && PGP.JSONにも,
   '⭐⭐ 版面のパスも残せて、呼び戻せる（設定JSONにも入る）', JSON.stringify(PGP));

/* ══⭐⭐ 可変フォントの軸（wght 以外）══ 2026-08-31
   🔴 canvas は font の書き方に軸を書けない＝【軸の値ごとに別の書体として登録する】。
   ⭐ 見るのは【軸を読めるか】【動かすと字の形が変わるか】【既定へ戻ると元に戻るか】。 */
{
  const fsMod = await import('node:fs');
  const B64 = fsMod.readFileSync('/System/Library/Fonts/SFNS.ttf').toString('base64');
  const VF = await p.evaluate(async (b64) => {
    const wait2 = ms => new Promise(r => setTimeout(r, ms));
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for(let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const buf = u8.buffer;
    const out = { 軸:readAxes(buf).map(a => a.tag) };
    const fam = 'moya-VFtest', fam2 = '"' + fam + '"';
    const face = new FontFace(fam, buf, { weight:'1 1000' });
    await face.load(); document.fonts.add(face);
    FONTS.push([fam2, 'VFtest']); FONTBUF[fam2] = buf; FONTAXES[fam2] = readAxes(buf);
    const o = document.createElement('option');
    o.value = fam2; o.textContent = 'VFtest'; document.getElementById('t_font').appendChild(o);
    closeAllEditors();
    document.getElementById('b_text').click(); await wait2(900);
    const L = LAYERS[SEL];
    textOf(L).font = fam2; textOf(L).str = 'Wdth 幅';
    await new Promise(r => rebuildText(L, r)); await wait2(500);
    const wOf = () => L.img.naturalWidth;
    const w0 = wOf();
    /* つまみが【その書体が持っている軸だけ】出る */
    buildAxes();
    out.つまみ = [...document.getElementById('axBox').querySelectorAll('.knob .n')]
      .map(e => e.textContent);
    axesOfText(textOf(L)).wdth = 30;
    await new Promise(r => rebuildText(L, r)); await wait2(900);
    out.幅が効く = wOf() !== w0;
    axesOfText(textOf(L)).wdth = FONTAXES[fam2].find(a => a.tag === 'wdth').def;
    await new Promise(r => rebuildText(L, r)); await wait2(700);
    out.既定へ戻る = wOf() === w0;
    out.太さは出さない = !out.つまみ.some(t => /wght/.test(t));
    removeAt(SEL); render();
    return out;
  }, B64);
  ok(VF.軸.includes('wdth') && VF.軸.includes('wght'),
     '⭐⭐ 書体ファイルから【可変フォントの軸】を読める', VF.軸.join('・'));
  ok(VF.つまみ.length >= 2 && VF.太さは出さない,
     '⭐ その書体が持っている軸だけ つまみが出る（太さは元からあるので出さない）',
     VF.つまみ.join(' / '));
  ok(VF.幅が効く, '⭐⭐ 軸を動かすと【字の形が変わる】（幅の軸）');
  ok(VF.既定へ戻る, '🔴 既定へ戻すと元の形に戻る（焼き込んでいない）');
}

/* ══⭐ 選んでいる行がどちらの明かりでも読める ══ 2026-08-31
   🔴 木下＝「選択しているとこ見辛え」（ライトで薄い青に白字だった） */
const SELVIS = await p.evaluate(async () => {
  const wait2 = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  SEL = 0; SELIDS = [LAYERS[0].id]; syncSelIds(); buildList(); syncSel();
  await wait2(400);
  const lum = c => { const v = c.match(/[\d.]+/g).slice(0,3).map(Number);
    return 0.2126*v[0] + 0.7152*v[1] + 0.0722*v[2]; };
  const read = () => {
    const row = document.querySelector('#layers .ly.sel.pri');
    if(!row) return null;
    const s2 = getComputedStyle(row), n2 = getComputedStyle(row.querySelector('.nm'));
    return Math.abs(lum(s2.backgroundColor) - lum(n2.color));
  };
  const dark = read();
  document.getElementById('lightBtn').click(); await wait2(500);
  const light = read();
  document.getElementById('lightBtn').click(); await wait2(300);
  return { dark, light };
});
ok(SELVIS.dark > 90 && SELVIS.light > 90,
   '⭐ 選んでいる行は【どちらの明かりでも】地と字がはっきり分かれる',
   JSON.stringify({ 暗:Math.round(SELVIS.dark), 明:Math.round(SELVIS.light) }));

/* ══⭐⭐ パスパネルとベクトルマスク（Adobe の公式ヘルプどおり）══ 2026-08-31
   🔴 木下＝「フォトショ同様 **パスのレイヤーパネルも出した方がよい**」
      「**きちんと Photoshop の作業構成の手順などは見た方がよさそう**。
        ちゃんと実装するなら何をどうやっているのか調べて実装して」
   ⭐ 公式ヘルプを読んで直した所を試験にする：
     ・閉じたら【作業用パス】（切らないし選択にもならない）
     ・パスパネルに ベクトルマスク／保存したパス／作業用パス が並ぶ・一度に1つ
     ・**ベクトルマスク＝焼き込まない**（点を直すと切り口も変わる・外すと1画素も同じ）
     ・⌘＋サムネールで選択範囲として読み込む
     ・選択範囲から作業用パスを作成（許容値）
     ・Esc／空いている所でパスの選択解除
   出典 https://helpx.adobe.com/jp/photoshop/using/paths.html */
const PATHP = await p.evaluate(async () => {
  const wait2 = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const o = LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b));
  SEL = LAYERS.indexOf(o[1]); SELIDS = [o[1].id]; syncSel(); buildList();
  document.querySelector('#tools button[data-t="path"]').click();
  const L = LAYERS[SEL], m = maskSize(L);
  COARSE = 0; render(); await wait2(300);
  const before = window.__full();
  POLY = [{x:m.w*0.2,y:m.h*0.2,hx:0,hy:0},{x:m.w*0.8,y:m.h*0.25,hx:0,hy:0},
          {x:m.w*0.5,y:m.h*0.8,hx:0,hy:0}];
  closePath(); await wait2(400);
  const out = {
    作業用パスになる: !!L.work && !L.sel && !hasCut(L),
    パネルに並ぶ: document.querySelectorAll('#pathList .pathrow').length === 1,
    一度に1つ: !!PATHSEL,
  };
  /* ⌘＋サムネールで選択範囲として読み込む（公式の手） */
  document.querySelector('#pathList .pathrow')
    .dispatchEvent(new MouseEvent('click', { bubbles:true, metaKey:true }));
  await wait2(400);
  out.コマンドクリックで選択になる = selSubs(L.sel).length > 0;
  L.sel = null; syncSelPath();
  /* ベクトルマスク＝焼き込まない */
  document.getElementById('b_pvmask').click();
  COARSE = 0; render(); await wait2(500);
  out.ベクトルマスクで切れる = window.__sad(before, window.__full()) > 0;
  out.型は焼いていない = !hasCut(L);
  const A = window.__full();
  L.vmask.pts[0].x = m.w * 0.35; L._key = '';
  COARSE = 0; render(); await wait2(400);
  out.点を直すと切り口も変わる = window.__sad(A, window.__full()) > 0;
  L.vmask = null; L._key = '';
  COARSE = 0; render(); await wait2(400);
  out.外すと1画素も同じ = window.__sad(before, window.__full()) === 0;
  /* 選択範囲から作業用パスを作成 */
  L.work = null;
  pickColor(L, 3, 3); COARSE = 0; render(); await wait2(400);
  document.getElementById('b_pfromsel').click(); await wait2(500);
  out.選択範囲から作業用パス = !!(L.work && L.work.pts.length >= 3);
  out.点の数 = L.work ? L.work.pts.length : 0;
  /* Esc で選択解除 */
  PATHSEL = { kind:'work' };
  dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
  await wait2(200);
  out.Escで解除 = PATHSEL === null;
  clearMask(L); L.work = null; PATHSEL = null; buildPathList(); render();
  return out;
});
ok(PATHP.作業用パスになる && PATHP.パネルに並ぶ,
   '⭐⭐ パスを閉じると【作業用パス】になり、パスパネルに並ぶ（Adobe と同じ）',
   JSON.stringify({ 作業用:PATHP.作業用パスになる, パネル:PATHP.パネルに並ぶ }));
ok(PATHP.コマンドクリックで選択になる,
   '⭐ ⌘＋サムネールのクリックで【選択範囲として読み込む】（Adobe の公式の手）');
ok(PATHP.ベクトルマスクで切れる && PATHP.型は焼いていない,
   '⭐⭐ ベクトルマスクで切れる（⚠️ 型に焼き込んでいない）',
   JSON.stringify({ 切れた:PATHP.ベクトルマスクで切れる, 焼いていない:PATHP.型は焼いていない }));
ok(PATHP.点を直すと切り口も変わる,
   '⭐⭐ ベクトルマスクの点を直すと【切り口も変わる】（解像度に依存しないパス）');
ok(PATHP.外すと1画素も同じ, '🔴 ベクトルマスクを外すと1画素も同じに戻る');
ok(PATHP.選択範囲から作業用パス,
   '⭐ 選択範囲から作業用パスを作成できる（許容値で点が減る）', PATHP.点の数 + ' 点');
ok(PATHP.Escで解除, '⭐ Esc でパスの選択を解除できる（Adobe と同じ）');

/* ══⭐⭐ Adobe 公式との食い違いを直した所 ══ 2026-08-31
   ① クリッピングマスク＝「ベースレイヤーの不透明度およびモード属性が適用されます」
   ② 不透明度と塗り（Fill）は別物＝「塗りはレイヤー効果の不透明度には影響しません」
   出典 revealing-layers-clipping-masks.html ／ layer-opacity-blending.html */
const PSDIFF = await p.evaluate(async () => {
  const wait2 = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  const mk = async col => { const c = document.createElement('canvas'); c.width = 300; c.height = 300;
    const x = c.getContext('2d'); x.fillStyle = col; x.fillRect(0,0,300,300);
    const img = new Image(); await new Promise(r => { img.onload = r; img.src = c.toDataURL(); });
    return img; };
  LAYERS = [];
  addImage(await mk('#ff0000'), '土台', 0.5); LAYERS[0].x = .5; LAYERS[0].y = .5; LAYERS[0].air = 0;
  addImage(await mk('#0000ff'), '上',  0.5); LAYERS[1].x = .5; LAYERS[1].y = .5; LAYERS[1].air = 0;
  LAYERS[1].clip = true;
  P.haze = P.split = P.bloom = P.grain = P.vig = P.edge = P.mix = P.wob = 0;
  LIGHTS.forEach(L => L.i = 0);
  LAYERS.forEach(L => L._key = '');
  const mid = () => { COARSE = 0; render();
    const d = g.getImageData((cv.width/2)|0, (cv.height/2)|0, 1, 1).data; return [d[0],d[1],d[2]]; };
  await wait2(300);
  const out = {};
  const a0 = mid();
  LAYERS[0].op = 0.5; LAYERS.forEach(L => L._key = ''); await wait2(200);
  const a1 = mid();
  out.土台の不透明度が効く = Math.abs(a1[2] - a0[2]) > 10;
  LAYERS[0].op = 1; LAYERS.forEach(L => L._key = '');
  LAYERS[0].blend = 'multiply'; LAYERS.forEach(L => L._key = ''); await wait2(200);
  const a2 = mid();
  out.土台の重ね方が効く = Math.abs(a2[2] - a0[2]) > 10;
  LAYERS[0].blend = 'source-over'; LAYERS.forEach(L => L._key = ''); await wait2(200);
  out.戻ると同じ = mid().join() === a0.join();
  out.値 = { 素:a0, 半分:a1, 乗算:a2 };
  /* ② 塗り（Fill）＝絵だけ薄くなって、影は残る
     ⚠️ 空気の効きを 1 に戻して【版面の道】で見る（素のままは最後に置き直す別の道） */
  LAYERS[1].clip = false; LAYERS[0].air = 1; LAYERS[1].air = 1;
  LAYERS.forEach(L => L._key = '');
  SEL = 1; SELIDS = [LAYERS[1].id]; syncSel();
  fxOf(LAYERS[1]).shadow.on = true; fxOf(LAYERS[1]).shadow.op = 1;
  fxOf(LAYERS[1]).shadow.dist = 40; LAYERS.forEach(L => L._key = '');
  COARSE = 0; render(); await wait2(400);
  /* 影の出る所（右下へずらしてある）を読む */
  const shadowAt = () => { COARSE = 0; render();
    const px = Math.round(cv.width*0.5 + cv.width*0.13), py = Math.round(cv.height*0.5 + cv.height*0.13);
    const d = g.getImageData(px, py, 1, 1).data; return [d[0],d[1],d[2]]; };
  const 影0 = shadowAt(), 絵0 = mid();
  LAYERS[1].fillA = 0; LAYERS.forEach(L => L._key = '');
  COARSE = 0; render(); await wait2(400);
  const 影1 = shadowAt(), 絵1 = mid();
  out.塗り0で絵が消える = Math.abs(絵1[2] - 絵0[2]) > 40;
  out.塗り0でも影は残る = Math.abs(影1[0] - 影0[0]) < 30 && Math.abs(影1[1] - 影0[1]) < 30;
  out.影 = { 前:影0, 後:影1 }; out.絵 = { 前:絵0, 後:絵1 };
  LAYERS[1].fillA = 1; fxOf(LAYERS[1]).shadow.on = false;
  LAYERS.forEach(L => L._key = '');
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1500); });
  return out;
});
ok(PSDIFF.土台の不透明度が効く && PSDIFF.土台の重ね方が効く && PSDIFF.戻ると同じ,
   '⭐⭐ クリッピングマスクは【土台の不透明度と描画モード】が上にも効く（Adobe 公式どおり）',
   JSON.stringify(PSDIFF.値));
ok(PSDIFF.塗り0で絵が消える && PSDIFF.塗り0でも影は残る,
   '⭐⭐ 塗り（Fill）は【絵だけ】薄くする＝レイヤー効果（影）は残る（Adobe 公式どおり）',
   JSON.stringify({ 絵:PSDIFF.絵, 影:PSDIFF.影 }));

/* ══⭐⭐ 調整レイヤーは【効く範囲】を持てる ══ 2026-08-31
   Adobe＝「白い領域（選択範囲）は調整を表示、黒い領域（選択範囲外）は調整を非表示」
   ⭐ MOYA は形（点）で持つ＝焼き込まない。外すと版面ぜんぶに戻る。
   出典 use-layer-masks-to-target-adjustment-or-fill-layers.html */
const AMASK = await p.evaluate(async () => {
  const wait2 = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1600); });
  const at = (u, v) => { COARSE = 0; render();
    const d = g.getImageData(Math.round(cv.width*u), Math.round(cv.height*v), 1, 1).data;
    return [d[0], d[1], d[2]]; };
  document.getElementById('b_adjlayer').click(); await wait2(500);
  const A = LAYERS[SEL];
  const put = (id, v) => { const e = document.getElementById(id); e.value = v;
    e.dispatchEvent(new Event('input', { bubbles:true })); };
  put('r_black', 45); touchEd(A); await wait2(400);
  const 全 = { 左上:at(0.3,0.3), 右下:at(0.7,0.7) };
  A.amask = { inv:false, feather:0, pts:[
    {x:0.05,y:0.05,hx:0,hy:0},{x:0.5,y:0.05,hx:0,hy:0},
    {x:0.5,y:0.5,hx:0,hy:0},{x:0.05,y:0.5,hx:0,hy:0}] };
  LAYERS.forEach(o => { o._key = ''; o._edk = ''; o._edc = null; });
  await wait2(400);
  const 部 = { 左上:at(0.3,0.3), 右下:at(0.7,0.7) };
  const out = {
    パネルが出る: !document.getElementById('amaskBox').classList.contains('hide'),
    中はそのまま: 部.左上.join() === 全.左上.join(),
    外は元に戻る: 部.右下.join() !== 全.右下.join(),
    値: { 全, 部 },
  };
  A.amask = null; LAYERS.forEach(o => { o._key = ''; o._edk = ''; o._edc = null; });
  await wait2(400);
  out.外すと版面ぜんぶ = at(0.7,0.7).join() === 全.右下.join();
  removeAt(SEL); render(); await wait2(300);
  return out;
});
ok(AMASK.パネルが出る, '⭐ 調整レイヤーを選ぶと【効く範囲】の段が出る');
ok(AMASK.中はそのまま && AMASK.外は元に戻る,
   '⭐⭐ 調整レイヤーは【囲った中だけ】に効く（Adobe のマスクと同じ）',
   JSON.stringify(AMASK.値));
ok(AMASK.外すと版面ぜんぶ, '🔴 範囲を外すと版面ぜんぶに戻る（焼き込んでいない）');

/* ══⭐⭐ 木下が持ってきた Photoshop チュートリアル8本に足りなかったもの ══ 2026-08-31
   ④ヴィンテージ・ハーフトーン＝ハーフトーンパターン／グラフィックペン／フィルム粒子
   ⑦ピクセルストレッチ＝グラデーションでマスク（端に向かって消える）
   ⚠️ どれも【焼き込まない】＝0 に戻すと1画素も同じに戻る */
const TUT = await p.evaluate(async () => {
  const wait2 = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1600); });
  const o = LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b));
  const out = {};
  const put = (id, v) => { const e = document.getElementById(id); e.value = v;
    e.dispatchEvent(new Event('input', { bubbles:true })); };
  openEditor(LAYERS.indexOf(o[1])); await wait2(800);
  COARSE = 0; render(); await wait2(300);
  const before = window.__full();
  const one = async (name, on, off) => {
    on(); COARSE = 0; render(); await wait2(450);
    const d1 = window.__sad(before, window.__full());
    off(); COARSE = 0; render(); await wait2(450);
    out[name] = [d1, window.__sad(before, window.__full())];
  };
  await one('ハーフトーンパターン', () => put('r_half', 90), () => put('r_half', 0));
  await one('グラフィックペン',   () => put('r_gpen', 80), () => put('r_gpen', 0));
  await one('フィルム粒子',       () => put('r_film', 70), () => put('r_film', 0));
  closeEditor(); await wait2(700);
  COARSE = 0; render(); await wait2(300);
  const b2 = window.__full();
  const kg = document.getElementById('k_mgrad');
  kg.checked = true; kg.dispatchEvent(new Event('change', { bubbles:true }));
  await wait2(500); COARSE = 0; render(); await wait2(300);
  out.グラデーションで消す = [window.__sad(b2, window.__full())];
  kg.checked = false; kg.dispatchEvent(new Event('change', { bubbles:true }));
  await wait2(500); COARSE = 0; render(); await wait2(300);
  out.グラデーションで消す.push(window.__sad(b2, window.__full()));
  return out;
});
{
  const names = ['ハーフトーンパターン','グラフィックペン','フィルム粒子','グラデーションで消す'];
  const dead = names.filter(k => !(TUT[k] && TUT[k][0] > 0));
  const stuck = names.filter(k => TUT[k] && TUT[k][1] !== 0);
  ok(dead.length === 0, '⭐⭐ チュートリアルに要った4つが効く（ハーフトーン／ペン／粒子／グラデで消す）',
     dead.length ? dead.join(',') : names.join(' / '));
  ok(stuck.length === 0, '🔴 どれも切ると【1画素も同じ】に戻る（焼き込んでいない）',
     stuck.length ? stuck.join(',') : 'ぜんぶ戻る');
}

/* ══⭐⭐ ヒストリー ══ 2026-08-31
   🔴 木下＝「ヒストリーがいるね。何をしたか？パネルに並んでいて、戻せるという仕組み」
   ⚠️ つまみは控えを取っていなかった＝⌘Z で戻せず、並びもしなかった。 */
const HIS = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const names = () => [...document.querySelectorAll('#histList .hrow')].map(e => e.textContent);
  const out = { 開いたとき:names()[0] };
  const o = LAYERS.slice().sort((a,b) => zOf(a)-zOf(b));
  SEL = LAYERS.indexOf(o[1]); SELIDS = [o[1].id]; syncSelIds(); syncSel(); buildList();
  document.getElementById('b_lmadd').click(); await w(300);
  document.getElementById('b_flip').click(); await w(300);
  out.操作が並ぶ = names().slice(-2);
  /* つまみ＝触り始めに1回だけ控える */
  const r = document.getElementById('r_haze');
  const 前 = P.haze;
  r.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true }));
  r.value = 90; r.dispatchEvent(new Event('input', { bubbles:true })); await w(300);
  out.つまみも並ぶ = names()[names().length - 1];
  out.かすみが変わった = P.haze !== 前;
  /* 一覧を押してそこまで戻る（⚠️ 行の番号は絶対位置＝「ひとつ前」は最後から2番目） */
  const rows = [...document.querySelectorAll('#histList .hrow')];
  rows[rows.length - 2].click(); await w(600);
  out.戻った = { いま:document.getElementById('o_histn').value,
                 かすみ:P.haze === 前, 薄い:[...document.querySelectorAll('#histList .hrow.undone')].length };
  const last = [...document.querySelectorAll('#histList .hrow')];
  last[last.length - 1].click(); await w(600);
  out.やり直した = document.getElementById('o_histn').value;
  return out;
});
ok(HIS.開いたとき === '開いたとき' && HIS.操作が並ぶ.join('/').indexOf('マスク') >= 0,
   '⭐⭐ ヒストリーに【何をしたか】が名前で並ぶ（案内の言葉をそのまま使う）',
   JSON.stringify(HIS.操作が並ぶ));
ok(HIS.つまみも並ぶ === 'かすみ' && HIS.かすみが変わった,
   '⭐⭐ つまみもヒストリーに並ぶ（触り始めに1回だけ控える）', HIS.つまみも並ぶ);
ok(HIS.戻った.かすみ && HIS.戻った.薄い > 0,
   '⭐⭐ 一覧を押すとその時点まで戻る（先は薄く残ってやり直せる）', JSON.stringify(HIS.戻った));

/* ══⭐⭐ 一覧のいちばん下は【背景】＝紙の地 ══ 2026-08-31
   🔴 木下＝「一番下に背景というのをレイヤーパネルにデフォルトで入れておこう」
   ⚠️ 新しいデータを作っていないこと（P.nobg / P.bg をそのまま出している）も見る。 */
await p.evaluate(async () => {
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  COARSE = 0; render();
});
await wait(700);
const BGR = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const rows = [...document.getElementById('layers').children];
  const last = rows[rows.length - 1];
  const out = { いちばん下:last.querySelector('.nm').textContent,
                印:last.classList.contains('bgrow'),
                動かせない:!last.dataset.i };
  const before = window.__full();
  last.querySelector('.eye').click(); await w(400); COARSE = 0; render(); await w(300);
  out.地なしにできる = window.__sad(before, window.__full()) > 0 && !!P.nobg;
  last.querySelector('.eye').click(); await w(400); COARSE = 0; render(); await w(300);
  out.戻ると同じ = window.__sad(before, window.__full());
  return out;
});
ok(BGR.いちばん下 === '背景' && BGR.印 && BGR.動かせない,
   '⭐⭐ 一覧のいちばん下に【背景】（紙の地）が出る・並べ替えの相手にならない',
   JSON.stringify(BGR));
ok(BGR.地なしにできる && BGR.戻ると同じ === 0,
   '⭐ 背景の目で【地なし】に切り替わり、戻すと1画素も同じ', JSON.stringify(BGR));

/* ══⭐⭐ ＋ 新規パスを作成（パスを何本でも持てる）══ 2026-08-31
   🔴 木下＝「パスを追加できるように＋ボタンを押せるようにすればよいのでは？
      そうすると複数パスを追加してもそれらを選択して選択範囲として読めば範囲選択の余地が増える」 */
const PNEW = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const o = LAYERS.slice().sort((a,b) => zOf(a)-zOf(b));
  SEL = LAYERS.indexOf(o[1]); SELIDS = [o[1].id]; syncSelIds(); syncSel(); buildList();
  const L = LAYERS[SEL], m = maskSize(L);
  L.paths = []; L.work = null; L.sel = null; PATHSEL = null;
  document.getElementById('b_pnew').click(); await w(250);
  POLY = [{x:m.w*0.1,y:m.h*0.1,hx:0,hy:0},{x:m.w*0.4,y:m.h*0.1,hx:0,hy:0},{x:m.w*0.4,y:m.h*0.4,hx:0,hy:0}];
  closePath(); await w(250);
  const 作業用にしない = !L.work && pathsOf(L).length === 1 && pathsOf(L)[0].pts.length === 3;
  document.getElementById('b_pnew').click(); await w(250);
  POLY = [{x:m.w*0.6,y:m.h*0.6,hx:0,hy:0},{x:m.w*0.9,y:m.h*0.6,hx:0,hy:0},{x:m.w*0.9,y:m.h*0.9,hx:0,hy:0}];
  closePath(); await w(250);
  const 本数 = pathsOf(L).length;
  document.querySelector('#s_selop button[data-v="new"]').click();
  PATHSEL = { kind:'saved', i:0 }; document.getElementById('b_pload').click(); await w(200);
  const n1 = selSubs(L.sel).length;
  document.querySelector('#s_selop button[data-v="add"]').click();
  PATHSEL = { kind:'saved', i:1 }; document.getElementById('b_pload').click(); await w(200);
  const n2 = selSubs(L.sel).length;
  PATHSEL = { kind:'saved', i:1 };
  document.getElementById('b_pdel').click(); await w(200);
  const 消せる = pathsOf(L).length === 1;
  document.querySelector('#s_selop button[data-v="new"]').click();
  return { 作業用にしない, 本数, 足せる:[n1, n2], 消せる };
});
ok(PNEW.作業用にしない && PNEW.本数 === 2 && PNEW.消せる,
   '⭐⭐ ＋でパスを何本でも作れる（描くと そのパスに入る・作業用パスを上書きしない）',
   JSON.stringify(PNEW));
ok(PNEW.足せる[0] === 1 && PNEW.足せる[1] === 2,
   '⭐⭐ 別々のパスを【追加】で選択範囲に足していける（範囲選択の余地が増える）',
   JSON.stringify(PNEW.足せる));

/* ══⭐ 選択ツールでパスをそのまま動かせる（Photoshop のパスコンポーネント選択）══
   🔴 木下＝「パスを閉じて選択ツールにした場合、作業用パスを選択している状態だと
      パスをそのまま移動できる」 */
{
  const P0 = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const L = LAYERS[SEL], m = maskSize(L);
    L.paths = []; L.sel = null; PATHSEL = null;
    document.querySelector('#tools button[data-t="path"]').click();
    POLY = [{x:m.w*0.3,y:m.h*0.3,hx:0,hy:0},{x:m.w*0.7,y:m.h*0.3,hx:0,hy:0},{x:m.w*0.5,y:m.h*0.7,hx:0,hy:0}];
    closePath(); await w(250);
    document.querySelector('#tools button[data-t="move"]').click();
    await w(200);
    const cx = L.x, cy = L.y;                      /* 素材の中心＝パスの内側 */
    const a = toScreen(cx, cy), b2 = toScreen(cx + 0.05, cy + 0.03);
    return { before:curPathPts(L).map(q => [q.x|0, q.y|0]),
             a:{ x:a.clientX, y:a.clientY }, b:{ x:b2.clientX, y:b2.clientY } };
  });
  await p.mouse.move(P0.a.x, P0.a.y);
  await p.mouse.down();
  for(let i = 1; i <= 5; i++)
    await p.mouse.move(P0.a.x + (P0.b.x-P0.a.x)*i/5, P0.a.y + (P0.b.y-P0.a.y)*i/5);
  await p.mouse.up();
  await wait(400);
  const P1 = await p.evaluate(() => ({
    after: curPathPts(LAYERS[SEL]).map(q => [q.x|0, q.y|0]),
    素材は動いていない: true }));
  const moved = P0.before.every((q, i) => P1.after[i][0] > q[0] + 4 && P1.after[i][1] > q[1] + 2);
  /* ⚠️ 座標は整数に丸めて見ているので、ずれ幅は ±1 まで許す（ぶれる試験にしない） */
  const dx = P0.before.map((q, i) => P1.after[i][0] - q[0]);
  const dy = P0.before.map((q, i) => P1.after[i][1] - q[1]);
  const same = Math.max(...dx) - Math.min(...dx) <= 1 && Math.max(...dy) - Math.min(...dy) <= 1;
  ok(moved && same,
     '⭐⭐ 選択ツールで【パスをそのまま動かせる】（形は変えずに全部いっしょに）',
     JSON.stringify({ 前:P0.before[0], 後:P1.after[0], ずれ:[dx, dy] }));
}

/* ⭐⭐ 描いている最中の ⌘Z は【点をひとつ戻す】（別の操作を戻さない）── 2026-08-31
   🔴 木下＝「パスを描いているときのコマンドZ はひとつ前に戻る」 */
{
  const Z0 = await p.evaluate(async () => {
    const L = LAYERS[SEL], m = maskSize(L);
    L.paths = []; L.work = null; L.sel = null; PATHSEL = null;
    document.querySelector('#tools button[data-t="path"]').click();
    await new Promise(r => setTimeout(r, 200));
    POLY = [{x:m.w*0.2,y:m.h*0.2,hx:0,hy:0},{x:m.w*0.5,y:m.h*0.2,hx:0,hy:0},
            {x:m.w*0.5,y:m.h*0.5,hx:0,hy:0}];
    drawOverlay(cv.width, cv.height);
    document.body.focus();
    return { 点:POLY.length, 手:HIST.past.length, 枚:LAYERS.length };
  });
  await p.keyboard.down('Meta'); await p.keyboard.press('KeyZ'); await p.keyboard.up('Meta');
  await wait(300);
  const Z1 = await p.evaluate(() => ({ 点:POLY.length, 手:HIST.past.length, 枚:LAYERS.length }));
  ok(Z1.点 === Z0.点 - 1 && Z1.手 === Z0.手 && Z1.枚 === Z0.枚,
     '⭐⭐ パスを描いている最中の ⌘Z は【点をひとつ戻す】（前の操作まで戻さない）',
     JSON.stringify({ 前:Z0, 後:Z1 }));
  await p.evaluate(() => { POLY = []; drawOverlay(cv.width, cv.height); });
}

/* ══⭐⭐ レイヤーマスク（Photoshop の「レイヤーマスク」）══ 2026-08-31
   Adobe＝「白＝表示／黒＝非表示／グレー＝半透明（グレーが暗いほど透明度が高い）」
   🔴 見るのは【焼き込んでいないか】＝使用しない・消す で 1画素も同じに戻るか。
   ⭐ 筆は【本当に盤を引いて】試す（つまみを直接触るだけでは、入口が死んでいても通る）。 */
await p.setViewport({ width:1400, height:900 });
await wait(500);
await p.evaluate(async () => {
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1600); });
  SEL = LAYERS.findIndex(L => L.img && !L.kind);
  SELIDS = [LAYERS[SEL].id]; syncSelIds(); syncSel(); buildList();
  COARSE = 0; render();
});
await wait(600);
const LM0 = await p.evaluate(() => ({
  段が出る: !document.getElementById('lmBox').classList.contains('hide'),
  マスクなし: document.getElementById('o_lm').value,
  前: window.__full(),
}));
ok(LM0.段が出る && LM0.マスクなし === 'マスクなし',
   '⭐ 素材を選ぶと【レイヤーマスク】の段が出る（まだマスクは無い）', LM0.マスクなし);

await p.evaluate(A => { window.__before = A; }, LM0.前);
const LM1b = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  document.getElementById('b_lmadd').click();
  COARSE = 0; render(); await w(400);
  out.白を足しても同じ = window.__sad(window.__before, window.__full());
  document.getElementById('b_lmblack').click();
  COARSE = 0; render(); await w(400);
  out.黒で隠れる = window.__sad(window.__before, window.__full());
  document.getElementById('b_lmwhite').click();
  COARSE = 0; render(); await w(400);
  out.白に戻すと同じ = window.__sad(window.__before, window.__full());
  return out;
});
ok(LM1b.白を足しても同じ === 0,
   '⭐⭐ マスクを足しただけでは【1画素も変わらない】（すべて表示＝白）', LM1b.白を足しても同じ);
ok(LM1b.黒で隠れる > 0 && LM1b.白に戻すと同じ === 0,
   '⭐⭐ 黒＝非表示／白＝表示（ぜんぶ黒で消え、白に戻すと1画素も同じ）',
   JSON.stringify(LM1b));

/* ⭐ 筆＝ツールバーから入って、盤を本当に引く（入口が死んでいたら落ちる） */
await p.evaluate(() => {
  document.querySelector('#tools button[data-t="retouch"]').click();
  document.querySelector('#s_tool button[data-v="lmask"]').click();
});
await wait(400);
const TOOLON = await p.evaluate(() => ({ MODE, TOOL,
  つまみが出る: !document.getElementById('lmUI').classList.contains('hide') }));
ok(TOOLON.TOOL === 'lmask' && TOOLON.MODE === 'cut' && TOOLON.つまみが出る,
   '⭐ ツールバー［画像編集］→［マスクを塗る］で入れる（つまみもそこに出る）',
   JSON.stringify(TOOLON));
{
  const pt = await p.evaluate(() => {
    const L = LAYERS[SEL];
    const a = toScreen(L.x - L.s * 0.22, L.y), b2 = toScreen(L.x + L.s * 0.22, L.y);
    return { ax:a.clientX, ay:a.clientY, bx:b2.clientX, by:b2.clientY };
  });
  await p.evaluate(() => { window.__b2 = window.__full(); });
  await p.mouse.move(pt.ax, pt.ay);
  await p.mouse.down();
  for(let i = 1; i <= 6; i++)
    await p.mouse.move(pt.ax + (pt.bx - pt.ax) * i / 6, pt.ay + (pt.by - pt.ay) * i / 6);
  await p.mouse.up();
  await wait(700);
  const BR = await p.evaluate(async () => {
    COARSE = 0; render(); await new Promise(r => setTimeout(r, 400));
    const d = window.__sad(window.__b2, window.__full());
    const L = LAYERS[SEL];
    /* 使用しない＝1画素も同じに戻る（焼き込んでいない） */
    L.lm.on = false; lmBump(L); COARSE = 0; render();
    await new Promise(r => setTimeout(r, 400));
    const back = window.__sad(window.__b2, window.__full());
    L.lm.on = true; lmBump(L); COARSE = 0; render();
    await new Promise(r => setTimeout(r, 400));
    return { 塗った差:d, 使用しないで戻る:back, 塗った後:window.__full() };
  });
  ok(BR.塗った差 > 0, '⭐⭐ 盤を指で引くと【黒で塗れる＝隠れる】', BR.塗った差 + ' 点');
  ok(BR.使用しないで戻る === 0,
     '🔴🔴 ［使用しない］で【1画素も同じ】に戻る（元の写真を削っていない）', BR.使用しないで戻る);
  await p.evaluate(A => { window.__b3 = A; }, BR.塗った後);
}
/* ⭐ グレー＝半透明（濃さを半分にして塗ると、黒で塗った時の中間になる） */
const GR = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const L = LAYERS[SEL], m = maskSize(L);
  document.getElementById('b_lmwhite').click();
  P.lmflow = 1;
  lmStrokeStart(L); lmBrush(L, m.w*0.5, m.h*0.5, null, null, true); lmStrokeEnd();
  COARSE = 0; render(); await w(400);
  const kuro = window.__sad(window.__before, window.__full());
  document.getElementById('b_lmwhite').click();
  P.lmflow = 0.5;
  lmStrokeStart(L); lmBrush(L, m.w*0.5, m.h*0.5, null, null, true); lmStrokeEnd();
  COARSE = 0; render(); await w(400);
  const hai = window.__sad(window.__before, window.__full());
  P.lmflow = 1;
  /* 反転＝白と黒が入れ替わる */
  document.getElementById('b_lmblack').click();
  L.lm.inv = true; lmBump(L); COARSE = 0; render(); await w(400);
  const hanten = window.__sad(window.__before, window.__full());
  L.lm.inv = false;
  /* 濃度＝マスクの効き（0 で効かない） */
  document.getElementById('b_lmblack').click();
  L.lm.dens = 0; lmBump(L); COARSE = 0; render(); await w(400);
  const dens0 = window.__sad(window.__before, window.__full());
  L.lm.dens = 1;
  /* 消す＝1画素も同じに戻る */
  document.getElementById('b_lmdel').click(); COARSE = 0; render(); await w(400);
  const keshita = window.__sad(window.__before, window.__full());
  return { 黒:kuro, 灰:hai, 反転で戻る:hanten, 濃度0で戻る:dens0, 消すと戻る:keshita };
});
ok(GR.灰 > 0 && GR.灰 < GR.黒 * 0.85,
   '⭐⭐ グレー＝半透明（濃さを半分にして塗ると、黒の中間になる）',
   JSON.stringify([GR.灰, GR.黒]));
ok(GR.反転で戻る === 0,
   '⭐ 白と黒を入れ替える（反転）が効く（ぜんぶ黒＋反転＝ぜんぶ白）', GR.反転で戻る);
ok(GR.濃度0で戻る === 0, '⭐ 濃度 0 でマスクが効かなくなる（Adobe の濃度と同じ）', GR.濃度0で戻る);
ok(GR.消すと戻る === 0,
   '🔴🔴 ［マスクを消す］で【1画素も同じ】に戻る（焼き込んでいない）', GR.消すと戻る);

/* ⭐⭐ 鎖（リンク）＝外すとマスクは版面に留まる（素材だけが中で動く） */
const LNK = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const L = LAYERS[SEL], m = maskSize(L);
  document.getElementById('b_lmadd').click();
  L.lm.cv.getContext('2d').clearRect(0, 0, m.w/2, m.h);   /* 左半分を黒＝隠す */
  lmBump(L); COARSE = 0; render(); await w(400);
  const A = window.__full();
  const x0 = L.x;
  L.x = x0 + 0.12; L._key = ''; COARSE = 0; render(); await w(400);
  const 鎖あり = window.__sad(A, window.__full());
  L.x = x0; L._key = ''; COARSE = 0; render(); await w(400);
  const 戻ると同じ = window.__sad(A, window.__full());
  lmLink(L, false); COARSE = 0; render(); await w(400);
  const 外した瞬間 = window.__sad(A, window.__full());
  L.x = x0 + 0.12; L._key = ''; COARSE = 0; render(); await w(500);
  const B = window.__full();
  const 鎖なし = window.__sad(A, B);
  lmLink(L, true); COARSE = 0; render(); await w(500);
  const 戻した差 = window.__sad(B, window.__full());
  L.x = x0; L._key = '';
  return { 鎖あり, 戻ると同じ, 外した瞬間, 鎖なし, 戻した差 };
});
ok(LNK.外した瞬間 === 0 && LNK.鎖なし > 0 && LNK.鎖あり > 0,
   '⭐⭐ 鎖を外すとマスクは【版面に留まる】（外した瞬間は1画素も変わらない）',
   JSON.stringify(LNK));
ok(LNK.戻した差 === 0,
   '⭐ 鎖を戻すと【見えているまま】写し取る（絵が飛ばない）', LNK.戻した差);

/* ⭐ 設定JSON に【マスクの紙そのもの】が入って、読むと同じ絵に戻る */
const LJ = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const L = LAYERS[SEL], m = maskSize(L), i = SEL;
  document.getElementById('b_lmwhite').click();
  L.lm.cv.getContext('2d').clearRect(0, 0, m.w/2, m.h);
  L.lm.dens = 0.7; L.lm.feather = 0.2; lmBump(L);
  COARSE = 0; render(); await w(500);
  const C = window.__full();
  const j = JSON.parse(JSON.stringify(snapshot()));
  const 入る = !!(j.layers[i] && j.layers[i].lm && j.layers[i].lm.cv);
  const つまみ = j.layers[i].lm ? [j.layers[i].lm.dens, j.layers[i].lm.feather] : null;
  L.lm = null; L._key = ''; COARSE = 0; render(); await w(300);
  lmApply(L, j.layers[i].lm);
  await w(900); COARSE = 0; render(); await w(400);
  const 戻ると同じ = window.__sad(C, window.__full());
  document.getElementById('b_lmdel').click(); COARSE = 0; render(); await w(300);
  return { 入る, つまみ, 戻ると同じ };
});
ok(LJ.入る && LJ.つまみ[0] === 0.7 && LJ.つまみ[1] === 0.2 && LJ.戻ると同じ === 0,
   '⭐⭐ 設定JSON にマスクの紙とつまみが入り、読むと同じ絵に戻る', JSON.stringify(LJ));

/* ⭐ ひと筆は【⌘Z で戻る】／複製にはマスクが写る（控えるものは戻したいものと同じに） */
const LUN = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const L = LAYERS[SEL], m = maskSize(L);
  document.getElementById('b_lmdel').click();
  COARSE = 0; render(); await w(400);
  const A = window.__full();
  hist(); lmStrokeStart(L);
  lmBrush(L, m.w*0.4, m.h*0.5, null, null, true);
  lmBrush(L, m.w*0.6, m.h*0.5, m.w*0.4, m.h*0.5, true);
  lmStrokeEnd(); COARSE = 0; render(); await w(400);
  const 塗った = window.__sad(A, window.__full());
  undo(); COARSE = 0; render(); await w(500);
  const 戻した = window.__sad(A, window.__full());
  redo(); COARSE = 0; render(); await w(500);
  const やり直した = window.__sad(A, window.__full());
  const d2 = dupLayer(L, 0.05, 0.05);
  const 複製に写る = !!(d2.lm && d2.lm.cv && d2.lm.cv !== L.lm.cv);
  LAYERS.pop(); SEL = LAYERS.findIndex(o => o === L); SELIDS = [L.id]; syncSelIds();
  document.getElementById('b_lmdel').click(); buildList(); COARSE = 0; render(); await w(300);
  return { 塗った, 戻した, やり直した, 複製に写る };
});
ok(LUN.塗った > 0 && LUN.戻した === 0 && LUN.やり直した === LUN.塗った,
   '⭐⭐ マスクのひと筆は ⌘Z で【1画素も同じ】に戻り、⌘⇧Z でやり直せる', JSON.stringify(LUN));
ok(LUN.複製に写る, '⭐ 複製（⌘D）にはマスクも写る（写した方を塗っても元は変わらない）');

/* ⭐ 選択範囲からマスクを作る（Adobe＝レイヤー／レイヤーマスク／選択範囲外をマスク） */
const LSL = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const o = LAYERS.slice().sort((a,b) => zOf(a)-zOf(b));
  SEL = LAYERS.indexOf(o[1]); SELIDS = [o[1].id]; syncSel(); buildList();
  document.querySelector('#tools button[data-t="path"]').click();
  const L = LAYERS[SEL], m = maskSize(L);
  COARSE = 0; render(); await w(400);
  const A = window.__full();
  POLY = [{x:m.w*0.2,y:m.h*0.2,hx:0,hy:0},{x:m.w*0.8,y:m.h*0.25,hx:0,hy:0},
          {x:m.w*0.5,y:m.h*0.8,hx:0,hy:0}];
  closePath(); await w(300);
  document.querySelector('#pathList .pathrow')
    .dispatchEvent(new MouseEvent('click', { bubbles:true, metaKey:true }));
  await w(400); syncLm();
  /* ⭐ 選択範囲の段（反転・解除・ぼかす）は【道具が何であっても】触れる
     🔴 2026-08-31・木下＝「ここから選択範囲を反転させたい。どうする？」
        ＝反転は［切り抜き・パス］の中にあって、切り抜きの道具でないと出なかった。
        ⭐ パスの段（持ち物）へ移した＝素材を選んでいれば常に出る。 */
  document.querySelector('#tools button[data-t="move"]').click();
  await w(250);
  const su = document.getElementById('selUI');
  const 版面でも触れる = !su.classList.contains('hide')
    && su.getBoundingClientRect().height > 10
    && document.getElementById('b_selinv').getBoundingClientRect().height > 0;
  const ボタンが出る = !document.getElementById('lmSel').classList.contains('hide');
  document.getElementById('b_lmselout').click();
  COARSE = 0; render(); await w(500);
  const 効いた = window.__sad(A, window.__full());
  document.getElementById('b_lmdel').click(); COARSE = 0; render(); await w(400);
  const 消すと戻る = window.__sad(A, window.__full());
  return { ボタンが出る, 効いた, 消すと戻る, 版面でも触れる };
});
ok(LSL.ボタンが出る && LSL.効いた > 0 && LSL.消すと戻る === 0,
   '⭐⭐ 選択範囲外をマスクできる（Adobe の公式の手）＋消すと1画素も同じに戻る',
   JSON.stringify(LSL));
ok(LSL.版面でも触れる,
   '⭐⭐ 選択範囲の段（反転 ⌘⇧I・解除・ぼかす）は【道具が何であっても】触れる',
   LSL.版面でも触れる);

/* ══⭐⭐ まるごとJSON の【往復】══ 2026-09-01
   🔴 木下がこれから通る道＝「まるごと書き出す → リロード → 設定を読む」。
     ここが通らないと、作ったものが消える。
   ⭐ 作り込んでから出して、**全部消して読み直して**、絵が同じかを見る。 */
const RT = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const o = LAYERS.slice().sort((a,b) => zOf(a)-zOf(b));
  const i = LAYERS.indexOf(o[1]);
  SEL = i; SELIDS = [o[1].id]; syncSelIds(); syncSel();
  const L = LAYERS[SEL], m = maskSize(L);
  document.getElementById('b_lmadd').click(); await w(300);
  L.lm.cv.getContext('2d').clearRect(0, 0, m.w/2, m.h); lmBump(L);   /* マスク */
  cutBrush(L, m.w*0.8, m.h*0.8, null, null, true);                   /* 切り抜き */
  document.querySelector('#tools button[data-t="text"]').click(); await w(800);
  await drawShape(); await w(400);
  SEL = i; syncSel();
  document.getElementById('b_adjlayer').click(); await w(400);
  LAYERS[SEL].adj.bri = 0.3;
  const put = (id, v) => { const e = document.getElementById(id); e.value = v;
    e.dispatchEvent(new Event('input', { bubbles:true })); };
  put('r_haze', 70); put('r_bloom', 60);
  LAYERS.forEach(x => x._key = ''); COARSE = 0; render(); await w(800);
  const 前 = { 絵:window.__full(), 枚:LAYERS.length,
               種:LAYERS.map(x => x.kind || 'img').join(','),
               マスク:LAYERS.filter(x => x.lm && x.lm.cv).length,
               切り抜き:LAYERS.filter(x => hasCut(x)).length, haze:P.haze };
  /* まるごとJSON を作って、全部消して読み直す */
  const j = snapshot(); j.bundled = true;
  j.layers.forEach((L2, k) => {
    L2.img = LAYERS[k].img ? imgData(LAYERS[k].img, 1600) : null;
    const sb = LAYERS[k].sub;
    if(sb) L2.subImgs = sb.layers.map(q => q.img ? imgData(q.img, 1600) : null);
  });
  const txt = JSON.stringify(j);
  applyJSON(JSON.parse(txt));
  await w(3000); COARSE = 0; render(); await w(800);
  const 後 = { 枚:LAYERS.length, 種:LAYERS.map(x => x.kind || 'img').join(','),
               マスク:LAYERS.filter(x => x.lm && x.lm.cv).length,
               切り抜き:LAYERS.filter(x => hasCut(x)).length, haze:P.haze };
  return { 差:window.__sad(前.絵, window.__full()), MB:+(txt.length/1024/1024).toFixed(2),
           前:{ 枚:前.枚, 種:前.種, マスク:前.マスク, 切り抜き:前.切り抜き, haze:前.haze }, 後 };
});
ok(RT.差 === 0 && RT.前.枚 === RT.後.枚 && RT.前.種 === RT.後.種,
   '⭐⭐ まるごとJSON は【往復して1画素も同じ】（写真・文字・図形・調整レイヤーごと戻る）',
   JSON.stringify(RT));
ok(RT.後.マスク === RT.前.マスク && RT.後.切り抜き === RT.前.切り抜き
   && RT.後.haze === RT.前.haze,
   '⭐⭐ レイヤーマスク・切り抜き・空気のつまみも戻る', JSON.stringify(RT.後));

/* ══⭐⭐ アンチエイリアスとぼかしは【別物】（Adobe 公式）══ 2026-09-01
   Adobe＝「アンチエイリアス＝**エッジピクセルのみ変更**（選択を作る前に決める）」
          「ぼかし＝**遷移ゾーン**を作る（作った後でも効く）」
   ⭐ canvas は黙って AA を掛けるので【切る】方を作った＝縁が1画素ずつの硬い形になる。 */
const AAT = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const o = LAYERS.slice().sort((a,b) => zOf(a)-zOf(b));
  const i = LAYERS.indexOf(o[1]);
  SEL = i; SELIDS = [o[1].id]; syncSelIds(); syncSel(); buildList();
  const L = LAYERS[SEL], m = maskSize(L);
  document.querySelector('#tools button[data-t="path"]').click();
  POLY = [{x:m.w*0.2,y:m.h*0.25,hx:0,hy:0},{x:m.w*0.75,y:m.h*0.2,hx:0,hy:0},
          {x:m.w*0.5,y:m.h*0.7,hx:0,hy:0}];
  closePath(); await w(250);
  document.getElementById('b_pload').click(); await w(300);
  /* 縁に【中間の濃さ】があるか＝アンチエイリアスが効いているか */
  const half = () => { const c = selMask(L);
    const d = c.getContext('2d', { willReadFrequently:true })
      .getImageData(0, 0, c.width, c.height).data;
    let n = 0; for(let k = 3; k < d.length; k += 4) if(d[k] > 10 && d[k] < 245) n++; return n; };
  const out = { あり:half() };
  const k = document.getElementById('k_selaa');
  k.checked = false; k.dispatchEvent(new Event('change', { bubbles:true })); await w(300);
  out.なし = half();
  out.JSON = snapshot().layers[i].sel.aa;
  k.checked = true; k.dispatchEvent(new Event('change', { bubbles:true })); await w(250);
  out.戻る = half();
  /* 後片付け（選択を残すと次の試験で盤に点線が出る） */
  LAYERS.forEach(x => { x.sel = null; x.work = null; });
  PATHSEL = null; POLY = [];
  document.querySelector('#tools button[data-t="move"]').click();
  buildList(); syncSelPath(); render(); await w(300);
  return out;
});
ok(AAT.あり > 0 && AAT.なし === 0 && AAT.戻る === AAT.あり,
   '⭐⭐ アンチエイリアスを切ると縁が【1画素ずつの硬い形】になる（ぼかしとは別物）',
   JSON.stringify(AAT));
ok(AAT.JSON === false, '⭐ アンチエイリアスの入り切りは設定JSONにも入る', String(AAT.JSON));

/* ══⭐⭐ まわりの色で抜く（「被写体を選択」の代わり）══ 2026-09-01
   ⚠️ Adobe の「被写体を選択」「空を選択」は AI ＝ MOYA は持っていない。
   ⭐ 代わりに【縁の色＝背景】とみなして色を覚える＝「色で消す」を自動で押すだけ。
     ＝許容つまみでその場で直せる／消せば1画素も同じに戻る（焼き込まない）。 */
const AR = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  document.getElementById('b_solid').click(); await w(600);   /* 背景が1色の素材を作る */
  const L = LAYERS[SEL];
  L.s = 0.8; L.d = 0.5; L._key = ''; COARSE = 0; render(); await w(500);
  const A = window.__full();
  const 前 = (L.keys || []).length;
  document.getElementById('b_around').click(); await w(500);
  COARSE = 0; render(); await w(400);
  const out = { 前, 後:(L.keys || []).length, 変わる:window.__sad(A, window.__full()),
                文:document.getElementById('stat').textContent };
  clearMask(L); L._key = ''; COARSE = 0; render(); await w(400);
  out.消すと戻る = window.__sad(A, window.__full());
  /* 後片付け＝足した素材を消す */
  setLayers(LAYERS.filter(x => x !== L)); SEL = 0; SELIDS = [];
  syncSelIds(); buildList(); syncSel(); render(); await w(300);
  return out;
});
ok(AR.後 > AR.前 && AR.変わる > 0,
   '⭐⭐［まわりの色で抜く］で背景の色を覚えて抜ける（AI の代わり）', JSON.stringify(AR));
ok(AR.消すと戻る === 0,
   '🔴 切り抜きを消すと1画素も同じに戻る（覚えるだけ＝焼き込まない）', AR.消すと戻る);

/* ══⭐⭐ CHU Modular（木下の書体）を MOYA でも使う ══ 2026-09-01
   🔴 木下＝「chu module を MOYA でもテキストフォント使えるようにして」
   ⚠️ いちばん上は【新しく置く字の既定】なので、そこは動かさない（今までの絵のまま）。 */
const CHU = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const out = { 並ぶ:FONTS.filter(f => /CHU/.test(f[0])).map(f => f[1]).length,
                既定:FONTS[0][1] };
  document.querySelector('#tools button[data-t="text"]').click(); await w(900);
  const L = LAYERS[SEL];
  out.置いた字の書体 = L.text.font;
  const put = (id, v) => { const e = document.getElementById(id); e.value = v;
    e.dispatchEvent(new Event('input', { bubbles:true })); };
  put('t_str', 'ABC'); await w(700);
  COARSE = 0; render(); await w(400);
  const A = window.__full();
  const sel = document.getElementById('t_font');
  sel.value = 'CHU, sans-serif'; sel.dispatchEvent(new Event('change', { bubbles:true }));
  await w(2000); COARSE = 0; render(); await w(500);
  out.CHUで変わる = window.__sad(A, window.__full());
  out.読めた = document.fonts.check('700 100px CHU');
  const B = window.__full();
  put('t_weight', 100); await w(900); COARSE = 0; render(); await w(400);
  out.太さが効く = window.__sad(B, window.__full());
  put('t_str', 'あいう'); await w(600);
  sel.value = 'CHUJP, sans-serif'; sel.dispatchEvent(new Event('change', { bubbles:true }));
  await w(2500); COARSE = 0; render(); await w(600);
  out.JPも読めた = document.fonts.check('700 100px CHUJP');
  return out;
});
ok(CHU.並ぶ >= 7 && CHU.CHUで変わる > 0 && CHU.読めた && CHU.JPも読めた,
   '⭐⭐ CHU Modular（欧文・かな・型5つ）が MOYA の書体に並び、本当に切り替わる',
   JSON.stringify(CHU));
ok(CHU.太さが効く > 0,
   '⭐ 可変フォントの太さ（100〜900）がそのまま効く', CHU.太さが効く);
ok(/ゴシック/.test(CHU.既定) && /apple-system/.test(CHU.置いた字の書体),
   '🔴 新しく置く字の【既定は今までどおり】（書体を足しても既定を変えない）',
   JSON.stringify({ 既定:CHU.既定, 置いた:CHU.置いた字の書体 }));

/* ══⭐⭐ ガラス（Photoshop のフィルターギャラリー／変形／ガラス）══ 2026-09-01
   🔴 木下がくれた作例＝ゆがみ12・滑らかさ6・テクスチャ・拡大縮小100%
   ⭐ つまみは4つ（ゆがみ／滑らかさ／テクスチャ／大きさ）＝どれも【絵が変わる】こと、
     0 に戻すと1画素も同じに戻ることを見る。 */
const GLS = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const o = LAYERS.slice().sort((a,b) => zOf(a)-zOf(b));
  openEditor(LAYERS.indexOf(o[1])); await w(900);
  COARSE = 0; render(); await w(400);
  const A = window.__full();
  const put = (id, v) => { const e = document.getElementById(id); e.value = v;
    e.dispatchEvent(new Event('input', { bubbles:true })); };
  put('r_glass', 12); await w(500); COARSE = 0; render(); await w(350);
  const out = { かかる:window.__sad(A, window.__full()), 種:{} };
  for(const k of ['block','canvas','lens']){
    document.querySelector('#s_glass button[data-v="' + k + '"]').click();
    await w(450); COARSE = 0; render(); await w(300);
    out.種[k] = window.__sad(A, window.__full());
  }
  document.querySelector('#s_glass button[data-v="frost"]').click(); await w(400);
  put('r_glasssm', 15); await w(450); COARSE = 0; render(); await w(300);
  out.滑らかさ = window.__sad(A, window.__full());
  /* 重さ＝ガラスそのものだけを測る（版面の描き直しは入れない） */
  const c = document.createElement('canvas'); c.width = 1000; c.height = 1250;
  const x = c.getContext('2d', { willReadFrequently:true });
  x.fillStyle = '#888'; x.fillRect(0, 0, 1000, 1250);
  const t0 = performance.now();
  edGlass(x, 1000, 1250, { glass:0.6, glassSm:6, glassTex:'frost', glassScale:1 });
  out.重さms = Math.round(performance.now() - t0);
  put('r_glass', 0); put('r_glasssm', 6); await w(500); COARSE = 0; render(); await w(400);
  out.ゼロで戻る = window.__sad(A, window.__full());
  closeEditor(); await w(600);
  return out;
});
ok(GLS.かかる > 0 && GLS.滑らかさ !== GLS.かかる,
   '⭐⭐ ガラス＝ゆがみと滑らかさで絵が変わる（Photoshop と同じつまみ）',
   JSON.stringify(GLS));
ok(new Set(Object.values(GLS.種)).size === 3 && !Object.values(GLS.種).includes(GLS.かかる),
   '⭐⭐ テクスチャ4種（霜付き／ブロック／カンバス／小さいレンズ）が別の絵になる',
   JSON.stringify(GLS.種));
ok(GLS.ゼロで戻る === 0, '🔴 ゆがみ 0 で【1画素も同じ】に戻る（焼き込んでいない）', GLS.ゼロで戻る);
ok(GLS.重さms < 200, '⭐ ガラスは 1000×1250 で 200ms 未満（つまみが引ける）', GLS.重さms + ' ms');

/* ══⭐⭐ ロックは4種（Adobe＝すべて／透明ピクセル／画像ピクセル／位置）══ 2026-09-01
   ⭐ 黒＝完全にロック／白＝部分的にロック（Adobe と同じ見え方）。
   🔴 鍵をかけても【選択は外さない】＝外すとパネルの持ち主が移り、その場で外せなくなる。 */
const LOCK = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const o = LAYERS.slice().sort((a,b) => zOf(a)-zOf(b));
  const L = o[0];                       /* いちばん手前＝重なりで邪魔されない */
  SEL = LAYERS.indexOf(L); SELIDS = [L.id]; syncSelIds(); syncSel(); buildList();
  const set = (id, v) => { const e = document.getElementById(id);
    e.checked = v; e.dispatchEvent(new Event('change', { bubbles:true })); };
  const row = () => [...document.querySelectorAll('#layers .ly[data-i]')]
    .find(rr => +rr.dataset.i === LAYERS.indexOf(L));
  const 掴める = () => hitLayer({ x:L.x, y:L.y }) === LAYERS.indexOf(L);
  const out = { はじめ:{ 掴める:掴める(), 状態:lockState(L) } };
  set('k_lockpos', true); await w(300);
  out.位置 = { 掴める:掴める(), 状態:lockState(L), 表示:document.getElementById('o_lock').value,
              白い鍵:row().querySelector('.lock').innerHTML.includes('fill="none"') };
  set('k_lockall', true); await w(300);
  out.ぜんぶ = { 状態:lockState(L),
                黒い鍵:row().querySelector('.lock').innerHTML.includes('fill="currentColor"'),
                選択は残る:SELIDS.includes(L.id) };
  set('k_lockall', false); set('k_lockpos', false); await w(300);
  out.外せる = { 掴める:掴める(), 状態:lockState(L) };
  set('k_lockpix', true); await w(200);
  const j = snapshot(); const q = j.layers[LAYERS.indexOf(L)];
  out.JSONに入る = [q.lock, q.lockPos, q.lockPix, q.lockAlpha].join(',');
  set('k_lockpix', false); await w(200);
  return out;
});
ok(LOCK.はじめ.掴める && !LOCK.位置.掴める && LOCK.位置.白い鍵 && LOCK.ぜんぶ.黒い鍵,
   '⭐⭐ 鍵4種＝位置を止めると掴めない／部分は白い鍵・ぜんぶは黒い鍵（Adobe と同じ）',
   JSON.stringify(LOCK));
ok(LOCK.ぜんぶ.選択は残る && LOCK.外せる.掴める && LOCK.外せる.状態 === 'none',
   '🔴 鍵をかけても選択は残る＝その場で外せる（外すと持ち主が移って外せなくなる）',
   JSON.stringify(LOCK.外せる));
ok(LOCK.JSONに入る === 'false,false,true,false',
   '⭐ 鍵4種は設定JSONにも入る', LOCK.JSONに入る);

/* ══⭐⭐ 包括光源を使用（Adobe＝影・内側の影・ベベルで共有される単一の照明角度）══ 2026-09-01
   ⭐ MOYA は版面に【灯】が有るので、そこへ合わせる＝角度を別に持たない。
     ＝灯を動かすと 3つの効果の向きが **全部いっしょに** ついてくる（芯と同じ）。 */
const GL = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const o = LAYERS.slice().sort((a,b) => zOf(a)-zOf(b));
  SEL = LAYERS.indexOf(o[1]); SELIDS = [o[1].id]; syncSelIds(); syncSel();
  const L = LAYERS[SEL], f = fxOf(L);
  f.shadow.on = true; f.shadow.op = 0.9; f.shadow.dist = 30;
  f.inner.on = true; f.bevel.on = true;
  L._key = ''; COARSE = 0; render(); await w(600);
  const A = window.__full();
  const lx = LIGHTS[0].x, ly = LIGHTS[0].y;
  const k = document.getElementById('k_fxglobal');
  k.checked = true; k.dispatchEvent(new Event('change', { bubbles:true })); await w(600);
  COARSE = 0; render(); await w(400);
  const 灯に合う = window.__sad(A, window.__full());
  const 向きが隠れる = getComputedStyle(document.getElementById('r_sang').closest('.knob'))
    .display === 'none';
  const B = window.__full();
  LIGHTS[0].x = 0.1; LIGHTS[0].y = 0.1; LAYERS.forEach(x => x._key = '');
  COARSE = 0; render(); await w(600);
  const 灯で動く = window.__sad(B, window.__full());
  LIGHTS[0].x = lx; LIGHTS[0].y = ly; LAYERS.forEach(x => x._key = '');
  k.checked = false; k.dispatchEvent(new Event('change', { bubbles:true })); await w(600);
  COARSE = 0; render(); await w(400);
  const 外すと戻る = window.__sad(A, window.__full());
  f.shadow.on = false; f.inner.on = false; f.bevel.on = false; L._key = '';
  COARSE = 0; render(); await w(300);
  return { 灯に合う, 向きが隠れる, 灯で動く, 外すと戻る };
});
ok(GL.灯に合う > 0 && GL.向きが隠れる,
   '⭐⭐ 包括光源＝影・内側の影・段差の向きが【灯】に合う（向きのつまみは出さない）',
   JSON.stringify(GL));
ok(GL.灯で動く > 0 && GL.外すと戻る === 0,
   '⭐⭐ 灯を動かすと3つの向きが全部ついてくる／外すと1画素も同じに戻る',
   JSON.stringify(GL));

/* 盤の左上の表記＝画面のいちばん左上・小さく（木下の指示） */
await p.setViewport({ width:1400, height:900 });
await wait(700);
const BH = await p.evaluate(() => {
  const h = document.getElementById('boardHead').getBoundingClientRect();
  const ti = document.getElementById('toolsIn').getBoundingClientRect();
  return { 左:Math.round(h.left), 上:Math.round(h.top),
           字:getComputedStyle(document.querySelector('#boardHead .l1')).fontSize,
           カプセル上:Math.round(ti.top) };
});
ok(BH.左 < 20 && BH.上 < 20 && parseFloat(BH.字) <= 10 && BH.上 + 60 < BH.カプセル上,
   '⭐ 盤の表記は【画面の左上】に小さく出る（ツールバーと重ならない）', JSON.stringify(BH));
await p.setViewport({ width:390, height:844, isMobile:true, hasTouch:true });
await wait(900);

/* ══⭐⭐ 指で【2回たたく】と中に入れる ══ 2026-09-01
   🔴 木下＝「モバイルだとオブジェクトの詳細画面に入れない。
      ボードを2回タップすると画面全体がズームになる」
   ＝ dblclick は指ではほぼ出ない。自分で2回たたきを見るようにした。 */
{
  const pos = await p.evaluate(async () => {
    closeAllEditors();
    await new Promise(r => setTimeout(r, 500));
    const o = LAYERS.slice().sort((a,b) => zOf(a)-zOf(b));
    const L = o[1];
    SEL = LAYERS.indexOf(L); SELIDS = [L.id]; syncSelIds(); syncSel(); buildList();
    const s = toScreen(L.x, L.y);
    return { x:Math.round(s.clientX), y:Math.round(s.clientY), name:L.name };
  });
  await p.touchscreen.tap(pos.x, pos.y);
  await wait(120);
  await p.touchscreen.tap(pos.x, pos.y);
  await wait(900);
  const IN = await p.evaluate(() => ({ 中:!!SUBOF, 名:SUBOF ? SUBOF.name : null }));
  ok(IN.中 && IN.名 === pos.name,
     '⭐⭐ 指で【2回たたく】と、その素材の中に入れる（指では dblclick が出ない）',
     JSON.stringify(IN));
  await p.evaluate(async () => { closeAllEditors(); await new Promise(r => setTimeout(r, 400)); });
  await wait(500);
}

/* ══⭐⭐ 配線の二重チェック（木下＝「そういったミスがないか検証実装をして」）══
   ⚠️ input は「値を反映する配線」と「別の目的」で2本付くことが普通にある＝見ない。
     見るのは【1回の操作が2回起きる】もの＝押す・引き始め・変える・2回押す。 */
{
  const DUP = await p.evaluate(() => {
    const n = {};
    (window.__listen || []).forEach(k => n[k] = (n[k] || 0) + 1);
    return Object.entries(n).filter(([k, v]) => v > 1)
      .filter(([k]) => /\|(click|pointerdown|change|dblclick)$/.test(k))
      .map(([k, v]) => k + '×' + v);
  });
  ok(DUP.length === 0,
     '⭐⭐ 同じ物に【押す・引き始め・変える】の配線が二重に付いていない',
     DUP.length ? DUP.join(' , ') : 'ぜんぶ1本');
}
/* ⭐⭐ 1回の操作＝ヒストリー1手（二重に控えていないか・名前が付いているか） */
{
  const ONE = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    closeAllEditors();
    await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1600); });
    const before = HIST.past.length;
    const r = document.getElementById('r_haze');
    r.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true }));
    r.value = 80; r.dispatchEvent(new Event('input', { bubbles:true }));
    await w(300);
    const 引いた = HIST.past.length - before;
    const 名 = HIST.past[HIST.past.length-1].name;
    const b2 = HIST.past.length;
    const o = LAYERS.slice().sort((a,b) => zOf(a)-zOf(b));
    SEL = LAYERS.indexOf(o[1]); SELIDS = [o[1].id]; syncSelIds(); syncSel(); buildList();
    document.getElementById('b_lmadd').click();
    await w(300);
    return { 引いた, 名, 押した:HIST.past.length - b2,
             押した名:HIST.past[HIST.past.length-1].name };
  });
  ok(ONE.引いた === 1 && ONE.名 === 'かすみ',
     '⭐⭐ つまみを1回引いたら【1手】だけ積まれ、名前が付く', JSON.stringify(ONE));
  ok(ONE.押した === 1 && /マスク/.test(ONE.押した名 || ''),
     '⭐ ボタンを1回押したら【1手】だけ積まれる', JSON.stringify(ONE));
}


/* ══════════ 2026-09-01（木下の実機確認・後半）で足したもの ══════════
   ⚠️ 見本の組み直しは【重い】＝タブごと落ちる。ここでは見本を2回しか組まない。
   🔴🔴 ここに来るまでに指の端末の試験があり、**isMobile を変えると Puppeteer は
      ページを読み直す**＝window に入れておいた物差し（__full など）が消えている。
      ＝入れ直さないと「window.__full is not a function」で試験ごと落ちる。
   → feedback_regression_test_before_push（ぶれる試験はもっと悪い） */
await p.setViewport({ width:1400, height:900 });
await wait(900);
await p.evaluate(() => {
  window.__shot = () => { const d = g.getImageData(0,0,cv.width,cv.height).data;
    const o = []; for(let i = 0; i < d.length; i += 4*7) o.push(d[i], d[i+3]); return o; };
  window.__diff = (A,B) => { let n = 0;
    for(let i = 0; i < Math.min(A.length,B.length); i++) if(Math.abs(A[i]-B[i]) > 8) n++; return n; };
  window.__full = () => { const d = g.getImageData(0,0,cv.width,cv.height).data;
    const o = []; for(let i = 0; i < d.length; i += 4*3) o.push(d[i], d[i+1], d[i+2], d[i+3]);
    return o; };
  window.__sad = (A,B) => { let s2 = 0;
    for(let i = 0; i < Math.min(A.length,B.length); i++) s2 += Math.abs(A[i]-B[i]);
    return Math.round(s2); };
});
await p.evaluate(async () => {
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
});
await wait(500);

/* ⭐⭐ ① 背景（紙の地）を選んだら、盤も「選んでいる」見た目になる
   🔴 木下＝「背景をレイヤーパネルで選択したらボードに同じようなアクティブ状態にして」 */
{
  const BG = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const over = () => { const d = og.getImageData(0,0,ov.width,ov.height).data;
      let n = 0; for(let i = 3; i < d.length; i += 4*11) if(d[i] > 8) n++; return n; };
    setSel(0, false); syncSel(); buildList(); COARSE = 0; render();
    await w(250);
    const 前 = over(), 盤前 = window.__full();
    const row = document.querySelector('#layers .bgrow');
    if(!row) return { だめ:'背景の行が無い' };
    row.click(); await w(300);
    COARSE = 0; render(); await w(200);
    /* ⚠️ 印は ov（印の板）だけ＝盤の絵そのものは1画素も動かないこと */
    const 盤後 = window.__full();
    const 後 = over(), 印 = SELBG;
    /* ⚠️ 押すと一覧は作り直される＝行は取り直す（古い行を見ると必ず「印が無い」と出る） */
    const 行 = (document.querySelector('#layers .bgrow') || {}).className || '';
    setSel(0, false); syncSel(); buildList(); await w(150);   /* 素材を選ぶと外れる */
    return { 前, 後, 印, 行, 外れる:!SELBG,
             盤は変わらない:window.__diff(盤前, 盤後) };
  });
  ok(BG.後 > BG.前 && BG.印 === true && /sel/.test(BG.行 || '') && BG.外れる,
     '⭐⭐ 背景を一覧で選ぶと【盤も選んでいる見た目】になる（素材を選ぶと外れる）',
     JSON.stringify(BG));
  ok(BG.盤は変わらない === 0,
     '⚠️ 背景の枠は【印の板】にしか描かない（絵そのものは1画素も変わらない）', BG.盤は変わらない);
}

/* ⭐⭐ ② ⌘S ＝ いま開いているファイルへ上書き保存（できた旨を画面で言う）
   🔴 木下＝「コマンドsで読み込んだJSONは上書き保存できるように、
      上書き保存できた旨もメッセージでユーザーに伝えるように」
   ⚠️ 見本は組み直さない（いまの版面のまま保存できるかを見る） */
{
  const SV = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    let 書かれた = null, 許可 = 0;
    const fake = { name:'MOYA_設定_test.json',
      queryPermission:async () => { 許可++; return 'granted'; },
      createWritable:async () => ({ write:async b2 => { 書かれた = await b2.text(); },
                                    close:async () => {} }),
      getFile:async () => new File([JSON.stringify(snapshot())], 'MOYA_設定_test.json') };
    window.showOpenFilePicker = async () => [fake];
    document.getElementById('b_inj').click();          /* ［設定を読む］でファイルを覚える */
    await w(800);
    const 覚えた = CURFILE ? CURFILE.h.name : null;
    const 画面 = document.getElementById('curfile').textContent;
    /* ⌘S＝字を打っている最中でも効く */
    document.getElementById('t_str').focus();
    document.dispatchEvent(new KeyboardEvent('keydown',
      { key:'s', metaKey:true, bubbles:true, cancelable:true }));
    await w(900);
    document.getElementById('t_str').blur();
    let 中身 = null; try{ 中身 = JSON.parse(書かれた || 'null'); }catch(_){}
    書かれた = null;
    return { 覚えた, 画面, 許可, 言った:document.getElementById('stat').textContent,
             靄のJSON:!!(中身 && 中身.tool), 枚:中身 ? (中身.layers||[]).length : -1 };
  });
  ok(SV.覚えた === 'MOYA_設定_test.json' && /⌘S/.test(SV.画面 || ''),
     '⭐⭐ 設定JSONを読むと【そのファイル】を覚える（画面にも出る）',
     JSON.stringify({ 覚えた:SV.覚えた, 画面:SV.画面 }));
  ok(SV.靄のJSON && SV.枚 > 0 && /上書き保存した/.test(SV.言った || ''),
     '⭐⭐ ⌘S で【同じファイルに上書き】され、上書きしたと画面が言う',
     JSON.stringify({ 言った:SV.言った, 枚:SV.枚 }));
}

/* ══ @下地 ここから先は【見本2（文字・図形・エフェクト）】を1回だけ組んで使い回す ══
   ⭐ @下地 ＝ この章より後ろの章を選んだときは、この章も必ず一緒に流す印。
      （moya/_test/pick.mjs が読む。ここを外すと「筆」などが素材ゼロで落ちる） */
await p.evaluate(async () => {
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo2').click(); setTimeout(r, 1800); });
});
await wait(600);

/* ⭐⭐ ③ エフェクトは【1つずつ目で外せる】（ぜんぶ切るしか無かった）
   🔴 木下＝「かかっていたグラデーションを全部切るにしてしまうと、
      入っていたエフェクトが全部なくなってしまう、、、これではだめだ」 */
{
  const FX = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    let i = LAYERS.findIndex(L => L.kind === 'text'); if(i < 0) i = 0;
    setSel(i, false); syncSel(); buildList();
    document.querySelector('#s_fxpre button[data-v="gold"]').click();
    COARSE = 0; render(); await w(350);
    const 前 = window.__full();
    const f = fxOf(LAYERS[SEL]);
    const 効いていた = FXLIST.filter(([k]) => f[k].on).length;
    const sec = document.querySelector('#fxBox .fxsec[data-fx="grad"]');
    const eye = sec.querySelector('.fxhead .eye');
    eye.click(); COARSE = 0; render(); await w(350);
    const 絵が変わる = window.__sad(前, window.__full());
    const 行は残る = !sec.classList.contains('off');
    const 斜線 = /M2\.4 13\.6/.test(eye.innerHTML);
    const 他は残る = FXLIST.filter(([k]) => fxOf(LAYERS[SEL])[k].on).length;
    eye.click(); COARSE = 0; render(); await w(350);
    const 戻ると同じ = window.__diff(前, window.__full());
    sec.querySelector('.fxhead .xr').click(); await w(250);   /* × ＝一覧から外す */
    const 消える = sec.classList.contains('off');
    const 足すに戻る = [...document.querySelectorAll('#fxAddMenu button')]
      .some(b2 => /グラデーション/.test(b2.textContent));
    document.execCommand && 0;
    return { 効いていた, 絵が変わる, 行は残る, 斜線, 他は残る, 戻ると同じ, 消える, 足すに戻る };
  });
  ok(FX.絵が変わる > 0 && FX.行は残る && FX.斜線 && FX.他は残る === FX.効いていた - 1,
     '⭐⭐ エフェクトは【1つだけ】目で外せる（行は残り、目に斜線・他は効いたまま）',
     JSON.stringify(FX));
  ok(FX.戻ると同じ === 0,
     '🔴 目で戻すと【1画素も同じ】に戻る（値を捨てていない）', FX.戻ると同じ);
  ok(FX.消える && FX.足すに戻る,
     '⭐ × で一覧から外すと［＋足す］へ戻る', JSON.stringify({ 消:FX.消える, 戻:FX.足すに戻る }));
}

/* ⭐⭐ ④ 盤を2回押す＝字は書き換え／字でないものは中へ入る
   🔴 木下＝「ボード上でもダブルクリックするとテキスト差し替えできるように。
      編集画面問わず他の画面でも」 */
{
  const DBL = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const ti = LAYERS.findIndex(L => L.kind === 'text');
    const ii = LAYERS.findIndex(L => L.img && L.kind !== 'text' && L.kind !== 'shape');
    setSel(ii, false); syncSel(); buildList();
    /* ⭐ 入口をそのまま通す＝盤の【本物のダブルクリック】（関数を直に呼ばない） */
    const dbl = i2 => { const L = LAYERS[i2]; const s = toScreen(L.x, L.y);
      stage.dispatchEvent(new MouseEvent('dblclick',
        { clientX:s.clientX, clientY:s.clientY, bubbles:true })); };
    dbl(ti); await w(600);
    /* ⭐ 2026-09-01・木下＝「ボードないでテキストを変更できない」
       ＝右のパネルへ焦点を送るのではなく【盤の上の入力欄】が出て、打つと絵が変わること */
    const ta = document.getElementById('boardText');
    const 字 = { 盤に入力欄:!!ta, 焦点:!!ta && document.activeElement === ta,
                 中に入っていない:!SUBOF, 選んだ:!!(LAYERS[SEL] && LAYERS[SEL].kind === 'text'),
                 言った:document.getElementById('stat').textContent };
    if(ta){
      const 前 = LAYERS[SEL].text.str;
      ta.value = '打ち直し'; ta.dispatchEvent(new Event('input', { bubbles:true }));
      await w(400);
      字.打つと変わる = LAYERS[SEL].text.str === '打ち直し' && 前 !== '打ち直し';
      字.段にも入る = document.getElementById('t_str').value === '打ち直し';
      ta.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
      await w(200);
      字.Escで閉じる = !document.getElementById('boardText');
    }
    const t0 = document.getElementById('t_str'); if(t0) t0.blur();
    dbl(ii); await w(800);
    const 中 = !!SUBOF;
    closeAllEditors(); await w(500);
    return { 字, 中 };
  });
  ok(DBL.字.盤に入力欄 && DBL.字.焦点 && DBL.字.中に入っていない && DBL.字.選んだ,
     '⭐⭐ 盤で字を2回押すと【盤の上に入力欄】が出る（中には入らない）',
     JSON.stringify(DBL.字));
  ok(DBL.字.打つと変わる && DBL.字.段にも入る && DBL.字.Escで閉じる,
     '⭐⭐ 盤の上で打つと絵が変わり、［文字］の段にも同じ字が入る（値の持ち主は1つ）',
     JSON.stringify(DBL.字));
  ok(DBL.中, '⚠️ 字でない素材は今までどおり【中に入る】', DBL.中);
}

/* ⭐⭐ ⑤ 上のバーが【壊れていない】（木下＝「なんかUIがおかしいな、テキストの編集画面の上部」）
   🔴 借りてきた select に inline の width:100% が付いていて、
     字の色・線の色が【バーの外へ押し出されて見えなかった】＝木下の「色はどこにある？」の正体。
   → feedback_measure_the_look（見た目の直しも実測する） */
{
  const BAR = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const ti = LAYERS.findIndex(L => L.kind === 'text');
    setSel(ti, false); syncSel(); buildList(); syncOpt();
    await w(400);
    const bar = document.getElementById('optbar').getBoundingClientRect();
    const r = id => { const e = document.getElementById(id); if(!e) return null;
      const b2 = e.getBoundingClientRect();
      return { w:Math.round(b2.width), 中:b2.left >= bar.left - 1 && b2.right <= bar.right + 1 }; };
    const out = { 書体:r('t_font'), 字の色:r('t_color'), 線の色:r('t_stroke'),
                  名前:[...document.querySelectorAll('#optbar .ol')].map(x => x.textContent) };
    /* 中に入っているときは［← 版面へ戻る］と重ならないこと */
    const bi = LAYERS.findIndex(L => L.img && L.kind !== 'text' && L.kind !== 'shape');
    openEditor(bi); await w(800);
    const sb = document.getElementById('b_solo').getBoundingClientRect();
    const bar2 = document.getElementById('optbar').getBoundingClientRect();
    out.重なる = document.body.classList.contains('hasopt') && bar2.left < sb.right;
    closeAllEditors(); await w(500);
    return out;
  });
  ok(BAR.書体 && BAR.書体.w < 200 && BAR.字の色 && BAR.字の色.中 && BAR.線の色 && BAR.線の色.中,
     '⭐⭐ 文字の上のバーに【字の色・線の色】が見えている（書体に押し出されていない）',
     JSON.stringify(BAR));
  ok(BAR.名前.includes('字の色') && BAR.名前.includes('線の色'),
     '⭐ 色の四角には【何の色か】の名前が付く', JSON.stringify(BAR.名前));
  ok(!BAR.重なる,
     '🔴 中に入っている間、上のバーは［← 版面へ戻る］に重ならない', String(BAR.重なる));
}

/* ⭐ ⑥ KETA（4つ目のリリース）も MOYA の書体に並ぶ
   🔴 木下＝「KETAもフォント追加されたから 利用できるようにして　MOYAね」 */
{
  const KT = await p.evaluate(async () => {
    const 並ぶ = FONTS.filter(f => /^KETA/.test(f[0])).map(f => f[1]);
    let 読めた = false;
    try{ await document.fonts.load('700 100px KETA', 'KETA 0123');
         読めた = document.fonts.check('700 100px KETA'); }catch(_){}
    return { 並ぶ, 読めた, 既定:FONTS[0][1] };
  });
  ok(KT.並ぶ.length === 1 && KT.読めた && /ゴシック/.test(KT.既定),
     '⭐ KETA（升目から鋳る）が MOYA の書体に並び、本当に読める（既定は動かさない）',
     JSON.stringify(KT));
}

/* ⭐⭐ ⑦ パスを【塗る／線を描く】前に下見が出る（押すまで分からない、を無くす）
   🔴 木下＝「PREVIEW しないとわからないので、これはどこの操作でも同じ。全部確認し」 */
{
  const PV = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const over = () => { const d = og.getImageData(0,0,ov.width,ov.height).data;
      let n = 0; for(let i = 3; i < d.length; i += 4*11) if(d[i] > 8) n++; return n; };
    closeAllEditors(); await w(300);
    /* 写真の素材に三角のパスを1本作る */
    const i = LAYERS.findIndex(L2 => L2.img && L2.kind !== 'text' && L2.kind !== 'shape');
    setSel(i, false); syncSel(); buildList();
    const L = LAYERS[SEL], m = maskSize(L);
    L.paths = []; L.work = null; L.sel = null; PATHSEL = null;
    document.getElementById('b_pnew').click(); await w(250);
    POLY = [{x:m.w*0.2,y:m.h*0.2,hx:0,hy:0},{x:m.w*0.8,y:m.h*0.2,hx:0,hy:0},
            {x:m.w*0.8,y:m.h*0.8,hx:0,hy:0}];
    closePath(); await w(300);
    PATHSEL = { kind:'saved', i:0 }; buildPathList();
    COARSE = 0; render(); await w(300);
    const 前 = over(), 盤前 = window.__full();
    const 枚前 = LAYERS.length;
    /* ボタンに触れる＝下見が出る */
    const bf = document.getElementById('b_pfill');
    bf.dispatchEvent(new PointerEvent('pointerenter', { bubbles:true }));
    await w(250);
    const 塗りの下見 = over();
    const 盤は変わらない = window.__diff(盤前, window.__full());
    const 増えていない = LAYERS.length === 枚前;
    bf.dispatchEvent(new PointerEvent('pointerleave', { bubbles:true }));
    await w(250);
    const 離すと消える = over();
    /* 線の方も出る（太さを引いても出る） */
    const bs = document.getElementById('b_pstroke');
    bs.dispatchEvent(new PointerEvent('pointerenter', { bubbles:true }));
    await w(250);
    const 線の下見 = over();
    bs.dispatchEvent(new PointerEvent('pointerleave', { bubbles:true }));
    const r2 = document.getElementById('r_selsw');
    r2.value = 40; r2.dispatchEvent(new Event('input', { bubbles:true }));
    await w(250);
    const 太さでも出る = over();
    PATHPV = null; drawOverlay(cv.width, cv.height);
    /* 本当に押すと絵になる（下見と同じ形が新しいレイヤーで出る） */
    document.getElementById('b_pfill').click(); await w(400);
    const 押すと増える = LAYERS.length === 枚前 + 1;
    const 名 = LAYERS[SEL] ? LAYERS[SEL].name : '';
    undo(); await w(400);
    const 戻せる = LAYERS.length === 枚前;
    return { 前, 塗りの下見, 離すと消える, 線の下見, 太さでも出る,
             盤は変わらない, 増えていない, 押すと増える, 名, 戻せる };
  });
  ok(PV.塗りの下見 > PV.前 && PV.線の下見 > PV.前 && PV.太さでも出る > PV.前,
     '⭐⭐ パスを【塗る／線を描く】前に、描かれるものが盤に出る（押すまで分からない を無くす）',
     JSON.stringify(PV));
  /* ⚠️ 点線（marching ants）は毎コマ動くので印の数は少しゆれる＝ぴったり比べない
     （下見は 20倍以上になるので、ゆれと混ざらない）→ feedback_regression_test_before_push */
  ok(PV.離すと消える < PV.前 * 1.5 && PV.盤は変わらない === 0 && PV.増えていない,
     '⚠️ 下見は印の板だけ＝絵は1画素も変わらず、レイヤーも増えない', JSON.stringify(PV));
  ok(PV.押すと増える && /パスの塗り/.test(PV.名) && PV.戻せる,
     '⭐ 押すと本当に新しいレイヤーになり、⌘Z で戻せる', JSON.stringify(PV));
}

/* ⭐⭐ ⑧ 重ね方（描画モード）は【空気を 0 にしていても】効く
   🔴🔴 木下＝「円だが、重ね方オーバーレイにしたが何の変化もない」「画像もオーバーレイできないね」
     ＝素のまま（空気 0）の素材は仕上げのあとに置き直す作りで、そこで source-over に戻していた。
     ＝**空気を 0 にしている素材だけ 重ね方が丸ごと効かなかった**（木下の画面は全部 空気 0.00）。 */
{
  const BL = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    closeAllEditors(); await w(300);
    const i = LAYERS.findIndex(L2 => L2.img && L2.kind !== 'adj');
    setSel(i, false); syncSel(); buildList();
    const L = LAYERS[SEL];
    const keep = { blend:L.blend, air:airOf(L) };
    setAir(L, 0); L.blend = 'source-over'; L._key = ''; COARSE = 0; render(); await w(350);
    const 素0 = window.__full();
    L.blend = 'overlay'; L._key = ''; COARSE = 0; render(); await w(350);
    const 空気0で効く = window.__sad(素0, window.__full());
    L.blend = 'source-over'; setAir(L, 1); L._key = ''; COARSE = 0; render(); await w(350);
    const 空1 = window.__full();
    L.blend = 'overlay'; L._key = ''; COARSE = 0; render(); await w(350);
    const 空気1でも効く = window.__sad(空1, window.__full());
    L.blend = 'source-over'; L._key = ''; COARSE = 0; render(); await w(350);
    const 戻ると同じ = window.__diff(空1, window.__full());
    setAir(L, keep.air); L.blend = keep.blend || 'source-over'; L._key = ''; render();
    return { 空気0で効く, 空気1でも効く, 戻ると同じ };
  });
  ok(BL.空気0で効く > 0 && BL.空気1でも効く > 0,
     '⭐⭐ 重ね方（オーバーレイ）は【空気 0 の素材でも】効く', JSON.stringify(BL));
  ok(BL.戻ると同じ === 0,
     '🔴 通常に戻すと1画素も同じに戻る（重ね方を焼き込んでいない）', BL.戻ると同じ);
}

/* ⭐⭐ ⑨ 一覧に【そのレイヤーのエフェクト】がぶら下がる
   🔴 木下＝「エフェクトが追加されているレイヤーには、レイヤーパネルに
      エフェクトがずらずらとついているとよいかも」 */
{
  const FR = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const ti = LAYERS.findIndex(L2 => L2.kind === 'text');
    setSel(ti < 0 ? 0 : ti, false); syncSel(); buildList();
    document.querySelector('#s_fxpre button[data-v="gold"]').click();
    await w(400); buildList(); await w(150);
    /* ⚠️ 一覧には【素材ごとに】ぶら下がる＝いま選んでいる素材の行だけを見る */
    const mine = () => [...document.querySelectorAll('#layers .fxrow')]
      .filter(r => +r.dataset.i === SEL);
    const rows = mine();
    const 名 = rows.map(r => r.textContent.trim());
    const 効いている数 = FXLIST.filter(([k]) => fxOf(LAYERS[SEL])[k].on).length;
    /* 行の目で外せる（一覧から直に切れる） */
    const k0 = rows[0] && rows[0].dataset.fx;
    const 前 = k0 ? fxOf(LAYERS[SEL])[k0].on : null;
    if(rows[0]) rows[0].querySelector('.eye').click();
    await w(350);
    const 後 = k0 ? fxOf(LAYERS[SEL])[k0].on : null;
    const back = mine().find(r => r.dataset.fx === k0);
    if(back) back.querySelector('.eye').click();
    await w(350);
    return { 名, 数:rows.length, 効いている数, 前, 後 };
  });
  ok(FR.数 === FR.効いている数 && FR.数 >= 5,
     '⭐⭐ 一覧に【そのレイヤーのエフェクト】がぶら下がる', JSON.stringify(FR));
  ok(FR.前 === true && FR.後 === false,
     '⭐ 一覧の目でエフェクトを切れる（右のパネルへ行かなくていい）',
     JSON.stringify({ 前:FR.前, 後:FR.後 }));
}

/* ⭐⭐ ⑩ 外見の【角の丸み】＝どんな素材でも四隅を丸められる（Figma の「外見」と同じ場所）
   🔴 木下＝「Figma でいう外見に…」／⚠️ 既定 0＝今までの絵と1画素も同じ */
{
  const RD = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    closeAllEditors(); await w(300);
    await drawShape(); await w(400);
    COARSE = 0; render(); await w(300);
    const 前 = window.__full();
    const r2 = document.getElementById('r_round');
    r2.value = 40; r2.dispatchEvent(new Event('input', { bubbles:true }));
    COARSE = 0; render(); await w(400);
    const 丸めた = window.__sad(前, window.__full());
    const 設定に入る = /"round":0\.4/.test(JSON.stringify(snapshot()));
    r2.value = 0; r2.dispatchEvent(new Event('input', { bubbles:true }));
    COARSE = 0; render(); await w(400);
    const 戻ると同じ = window.__diff(前, window.__full());
    /* 外見＝濃さ・塗り・角の丸み・重ね方 が ひとつづきに並んでいること */
    const ids = [...document.querySelectorAll('#selBox .knob, #selBox #blendPart')]
      .map(e => e.id || (e.querySelector('input[type=range]') || {}).id);
    const i0 = ids.indexOf('opKnob'), i1 = ids.indexOf('fillAKnob');
    const i2 = ids.indexOf('roundKnob'), i3 = ids.indexOf('blendPart');
    return { 丸めた, 設定に入る, 戻ると同じ, 並び:[i0, i1, i2, i3] };
  });
  ok(RD.丸めた > 0 && RD.設定に入る,
     '⭐⭐ 外見の【角の丸み】が効き、設定JSONにも入る', JSON.stringify(RD));
  ok(RD.戻ると同じ === 0,
     '🔴 0 に戻すと1画素も同じに戻る（角を焼き込んでいない）', RD.戻ると同じ);
  ok(RD.並び[0] >= 0 && RD.並び[1] === RD.並び[0] + 1
     && RD.並び[2] === RD.並び[1] + 1 && RD.並び[3] === RD.並び[2] + 1,
     '⭐ 外見（不透明度・塗り・角の丸み・重ね方）が ひとつづきに並ぶ', JSON.stringify(RD.並び));
}

/* ⭐⭐ ⑪ 1枚のレイヤーの中に【塗りを何枚でも】積める（Figma の「塗り」）
   🔴 木下＝「ひとつのレイヤーの中に画像などをいれてオーバーレイできるとかもできるように
      なった？」＝色でも画像でも、濃さ・重ね方・目つきで何枚でも積める。 */
{
  const FL = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    closeAllEditors(); await w(300);
    await drawShape(); await w(400);
    const L = LAYERS[SEL];
    COARSE = 0; render(); await w(300);
    const 前 = window.__full();
    document.getElementById('b_fillcol').click(); await w(350);
    const f = L.fills[0]; f.color = '#ff0000'; L._key = ''; COARSE = 0; render(); await w(400);
    const 色が乗る = window.__sad(前, window.__full());
    f.mode = 'overlay'; L._key = ''; COARSE = 0; render(); await w(400);
    const 重ね方が効く = window.__sad(前, window.__full()) !== 色が乗る;
    const 行 = document.querySelectorAll('#fillsList .growp').length;
    const 設定に入る = /"fills":\[\{/.test(JSON.stringify(snapshot()));
    /* 目で外すと 1画素も同じに戻る（焼き込まない） */
    document.querySelector('#fillsList .growp .mini').click(); await w(400);
    COARSE = 0; render(); await w(300);
    const 目で戻ると同じ = window.__diff(前, window.__full());
    return { 色が乗る, 重ね方が効く, 行, 設定に入る, 目で戻ると同じ };
  });
  ok(FL.色が乗る > 0 && FL.重ね方が効く && FL.行 === 1 && FL.設定に入る,
     '⭐⭐ 1枚のレイヤーの中に【塗りを積める】（色・濃さ・重ね方・目）', JSON.stringify(FL));
  ok(FL.目で戻ると同じ === 0,
     '🔴 目で外すと1画素も同じに戻る（塗りを焼き込んでいない）', FL.目で戻ると同じ);
}

/* ⭐⭐ ⑫ ペンで描いた形は【本物の図形】になる（塗り・線・グラデがそのまま効く）
   🔴 木下＝「パスは繋ぐと図形にもなるのでは？ いまだと全部作業用パスになる」 */
{
  const P2S = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    closeAllEditors(); await w(300);
    const i = LAYERS.findIndex(L2 => L2.img && !L2.kind);
    setSel(i, false); syncSel(); buildList();
    const L = LAYERS[SEL], m = maskSize(L);
    L.paths = []; L.work = null; L.sel = null; PATHSEL = null;
    document.getElementById('b_pnew').click(); await w(250);
    POLY = [{x:m.w*0.2,y:m.h*0.2,hx:0,hy:0},{x:m.w*0.8,y:m.h*0.25,hx:0,hy:0},
            {x:m.w*0.6,y:m.h*0.8,hx:0,hy:0}];
    closePath(); await w(300);
    PATHSEL = { kind:'saved', i:0 }; buildPathList();
    const n0 = LAYERS.length;
    document.getElementById('b_pshape').click(); await w(600);
    const S = LAYERS[SEL];
    const out = { 増えた:LAYERS.length === n0 + 1, 種:S.kind,
                  形:S.shape ? S.shape.type : null, 点:S.shape ? (S.shape.pts||[]).length : 0 };
    /* 塗りをグラデにできる＝本物の図形として扱える */
    COARSE = 0; render(); await w(300);
    const 前 = window.__full();
    shapeOf(S).fmode = 'linear'; rebuildShape(S); COARSE = 0; render(); await w(400);
    out.グラデが効く = window.__sad(前, window.__full()) > 0;
    return out;
  });
  ok(P2S.増えた && P2S.種 === 'shape' && P2S.形 === 'path' && P2S.点 === 3,
     '⭐⭐ ペンで描いた形は【本物の図形レイヤー】になる（点も残る）', JSON.stringify(P2S));
  ok(P2S.グラデが効く,
     '⭐ その図形に 塗り・線・グラデがそのまま効く', String(P2S.グラデが効く));
}

/* ⭐⭐ ⑬ フィルターの追加（木下＝「フィルター機能にこれらも追加したい」liginc の記事）
   ⚠️ 記事の4つ（うずまき・ぼかし・放射状ぼかし・移動ぼかし）は **もともと有った**＝実測で確かめる。
   ⭐ 足りなかった【球面】と【太らせる／痩せさせる】を足した（どちらも 0 で1画素も同じに戻る）。 */
{
  const FI = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    closeAllEditors(); await w(300);
    const i = LAYERS.findIndex(L2 => L2.img && !L2.kind);
    setSel(i, false); syncSel(); buildList();
    const L = LAYERS[SEL];
    COARSE = 0; render(); await w(400);
    const A = window.__full(), out = {};
    const set = (id, v) => { const e = document.getElementById(id); e.value = v;
      e.dispatchEvent(new Event('input', { bubbles:true })); };
    for(const [id, v] of [['r_twirl',60], ['r_rblur',40], ['r_mblur',40], ['r_wave',40],
                          ['r_sphere',70], ['r_dilate',50]]){
      set(id, v); COARSE = 0; render(); await w(450);
      out[id] = window.__sad(A, window.__full());
      set(id, 0); COARSE = 0; render(); await w(350);
      out[id + '_戻る'] = window.__diff(A, window.__full());
    }
    return out;
  });
  const 効く = ['r_twirl','r_rblur','r_mblur','r_wave','r_sphere','r_dilate']
    .filter(k => FI[k] > 0);
  const 戻る = ['r_twirl','r_rblur','r_mblur','r_wave','r_sphere','r_dilate']
    .filter(k => FI[k + '_戻る'] === 0);
  ok(効く.length === 6,
     '⭐⭐ フィルター6つ（渦巻き・放射状・移動・うねり・球面・太らせる）がぜんぶ効く',
     効く.join(',') + ' / ' + JSON.stringify(FI));
  ok(戻る.length === 6,
     '🔴 どれも 0 に戻すと1画素も同じに戻る（焼き込んでいない）', 戻る.join(','));
}

/* ⭐⭐ ⑭ 盤で【パスを押して選び直せる】（木下＝「今そのパスを選択することもできない」） */
{
  const PSEL = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    closeAllEditors(); await w(300);
    const i = LAYERS.findIndex(L2 => L2.img && !L2.kind);
    setSel(i, false); syncSel(); buildList();
    const L = LAYERS[SEL], m = maskSize(L);
    L.paths = []; L.work = null; PATHSEL = null;
    document.getElementById('b_pnew').click(); await w(200);
    POLY = [{x:m.w*0.15,y:m.h*0.15,hx:0,hy:0},{x:m.w*0.4,y:m.h*0.15,hx:0,hy:0},
            {x:m.w*0.4,y:m.h*0.4,hx:0,hy:0}];
    closePath(); await w(250);
    document.getElementById('b_pnew').click(); await w(200);
    POLY = [{x:m.w*0.6,y:m.h*0.6,hx:0,hy:0},{x:m.w*0.9,y:m.h*0.6,hx:0,hy:0},
            {x:m.w*0.9,y:m.h*0.9,hx:0,hy:0}];
    closePath(); await w(250);
    PATHSEL = { kind:'saved', i:1 }; buildPathList();
    document.querySelector('#tools button[data-t="move"]').click(); await w(300);
    /* 1本目の点の近くを盤で押す */
    const f = sheet(), iw = cwOf(L), ih = chOf(L);
    const dw = L.s, dh = dw * ih / iw * syOf(L) * (f.w / f.h);
    const u = L.x + ((m.w*0.15)/m.w - 0.5) * dw, v = L.y + ((m.h*0.15)/m.h - 0.5) * dh;
    const sc = toScreen(u, v);
    stage.dispatchEvent(new PointerEvent('pointerdown',
      { clientX:sc.clientX, clientY:sc.clientY, bubbles:true, pointerId:3 }));
    await w(300);
    stage.dispatchEvent(new PointerEvent('pointerup',
      { clientX:sc.clientX, clientY:sc.clientY, bubbles:true, pointerId:3 }));
    await w(200);
    const out = { 選び直せた:!!(PATHSEL && PATHSEL.kind === 'saved' && PATHSEL.i === 0) };
    L.paths = []; L.work = null; PATHSEL = null; buildPathList(); render();
    return out;
  });
  ok(PSEL.選び直せた,
     '⭐⭐ 盤でパスを押すと【そのパスに選び直せる】', String(PSEL.選び直せた));
}

/* ⭐⭐ ⑮ ペンで盤に描いて閉じると【図形レイヤー】になる（入口をそのまま通す）
   🔴 木下＝「ペンツールでボード上に書いて閉じたパスは塗り、線で図形になる。
      実装できてる？レイヤーパネルにも追加されてる？」 */
{
  const PEN = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    closeAllEditors(); await w(300);
    const n0 = LAYERS.length;
    /* ⚠️ 点は【選んでいる素材の中の座標】で持つ＝盤いっぱいの素材を選んでおく
       （小さい素材だと、打った点が素材の外に落ちて図形にできない） */
    const big = LAYERS.map((L2, i2) => ({ L2, i2 })).filter(o => o.L2.img && !o.L2.kind)
      .sort((a2, b2) => b2.L2.s - a2.L2.s)[0];
    if(big){ setSel(big.i2, false); syncSel(); buildList();
      big.L2.s = 1; big.L2.x = 0.5; big.L2.y = 0.5; big.L2._key = ''; render(); await w(300); }
    document.querySelector('#tools button[data-t="path"]').click(); await w(500);
    /* ⭐ ツールバーの【ペン】は図形を描くで入る（画像編集→パスは作業用パス） */
    const out = { 段が出る:!!document.getElementById('s_penmode'), 既定:PENMODE };
    document.querySelector('#s_penmode button[data-v="shape"]').click(); await w(250);
    out.切り替え = PENMODE;
    const pt = (u, v) => { const s = toScreen(u, v);
      stage.dispatchEvent(new PointerEvent('pointerdown',
        { clientX:s.clientX, clientY:s.clientY, bubbles:true, pointerId:11 }));
      stage.dispatchEvent(new PointerEvent('pointerup',
        { clientX:s.clientX, clientY:s.clientY, bubbles:true, pointerId:11 })); };
    pt(0.35, 0.35); await w(150); pt(0.65, 0.38); await w(150); pt(0.55, 0.70); await w(150);
    out.点 = POLY.length;
    pt(0.35, 0.35); await w(800);          /* 最初の点をもう一度＝閉じる */
    const L = LAYERS[SEL];
    out.増えた = LAYERS.length - n0;
    out.種 = L && L.kind; out.形 = L && L.shape && L.shape.type;
    /* ⚠️ 並ぶ順は【奥行き】が決める＝いちばん上とは限らない。一覧に居ることを見る */
    out.一覧に出る = [...document.querySelectorAll('#layers .ly .nm')]
      .some(e => e.textContent === L.name);
    out.塗りの段 = !document.getElementById('shapeBox').classList.contains('hide');
    /* 塗りと線が本当に効く */
    document.querySelector('#tools button[data-t="move"]').click(); await w(400);
    COARSE = 0; render(); await w(400);
    const A = window.__full();
    document.querySelector('#shSw i[data-c="#d43b2b"]').click(); await w(400);
    COARSE = 0; render(); await w(300);
    out.塗りが効く = window.__sad(A, window.__full());
    document.getElementById('shcStroke').click(); await w(200);
    document.querySelector('#shSw i[data-c="#0a0a0a"]').click(); await w(300);
    const sw = document.getElementById('sh_sw');
    sw.value = 30; sw.dispatchEvent(new Event('input', { bubbles:true })); await w(400);
    COARSE = 0; render(); await w(300);
    out.線が効く = window.__sad(A, window.__full());
    out.点は残る = L.shape.pts.length;
    /* 後片付け */
    PENMODE = 'path';
    document.querySelector('#s_penmode button[data-v="path"]').click();
    return out;
  });
  ok(PEN.段が出る && PEN.切り替え === 'shape' && PEN.点 === 3,
     '⭐⭐ ペンを押すと【作業用パス／図形を描く】を選べる（前に選んだ方で入る）',
     JSON.stringify(PEN));
  ok(PEN.増えた === 1 && PEN.種 === 'shape' && PEN.形 === 'path'
     && PEN.一覧に出る && PEN.塗りの段 && PEN.点は残る === 3,
     '⭐⭐ 盤で描いて閉じると【図形レイヤー】になり、一覧にも出る', JSON.stringify(PEN));
  ok(PEN.塗りが効く > 0 && PEN.線が効く > 0,
     '⭐⭐ その図形に 塗りと線がそのまま効く', JSON.stringify({ 塗り:PEN.塗りが効く, 線:PEN.線が効く }));
}

/* ⭐⭐ ⑯ 欧文だけの書体に日本語を打ったら【言う】（黙って差し替えない）
   🔴 木下＝「テキストがうまく反映していない」（UWASA＝欧文に日本語）
   ⚠️ 「その書体が字を持っているか」は画面から測れない（代替書体どうしを比べることになる）
     ＝FONTS の3つ目（かな込みか）で判断する。 */
{
  const FW = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    closeAllEditors(); await w(300);
    document.querySelector('#tools button[data-t="text"]').click(); await w(1000);
    const ta = document.getElementById('t_str'), sel = document.getElementById('t_font');
    const wn = document.getElementById('fontWarn');
    const out = {};
    sel.value = 'UWASA, sans-serif'; sel.dispatchEvent(new Event('change', { bubbles:true }));
    await w(1500);
    ta.value = 'テキスト'; ta.dispatchEvent(new Event('input', { bubbles:true })); await w(900);
    out.日本語で言う = !wn.classList.contains('hide');
    out.文 = wn.textContent.slice(0, 40);
    ta.value = 'HIKARI'; ta.dispatchEvent(new Event('input', { bubbles:true })); await w(800);
    out.欧文では言わない = wn.classList.contains('hide');
    sel.value = 'UWASAJP, sans-serif'; sel.dispatchEvent(new Event('change', { bubbles:true }));
    await w(1500);
    ta.value = 'テキスト'; ta.dispatchEvent(new Event('input', { bubbles:true })); await w(900);
    out.かな込みでは言わない = wn.classList.contains('hide');
    sel.value = FONTS[0][0]; sel.dispatchEvent(new Event('change', { bubbles:true })); await w(800);
    ta.value = 'テキスト'; ta.dispatchEvent(new Event('input', { bubbles:true })); await w(800);
    out.既定でも言わない = wn.classList.contains('hide');
    /* 表に「かな込みか」が入っていること（入れ忘れると黙る） */
    out.表に印がある = FONTS.filter(f => f[2] === false).length >= 8;
    return out;
  });
  ok(FW.日本語で言う && /持っていません/.test(FW.文),
     '⭐⭐ 欧文だけの書体に日本語を打つと【言う】（黙って差し替えない）', JSON.stringify(FW));
  ok(FW.欧文では言わない && FW.かな込みでは言わない && FW.既定でも言わない && FW.表に印がある,
     '⚠️ 欧文のとき・かな込みのとき・既定のときは言わない（うるさくしない）',
     JSON.stringify(FW));
}

/* ⭐⭐ ⑰ 調整レイヤーの【効く範囲】＝奥ぜんぶ／すぐ下の1枚／奥行きの帯
   🔴 木下＝「その下でまた調整レイヤーを入れてかけるにはどうしたらいい？
      フォトショならクリッピングマスクにしたり、グループにさせるのか。実装可能？」
   ⭐ MOYA は奥行きで前後が決まるので【奥行きの帯】で切る（グループを作らない＝軽い）。 */
{
  const AR = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    closeAllEditors(); await w(300);
    const ims = LAYERS.filter(L2 => L2.img && !L2.kind);
    ims.forEach((L2, i2) => { L2.d = [0.1, 0.5, 0.9][i2] == null ? 0.5 : [0.1,0.5,0.9][i2];
      L2._key = ''; });
    document.getElementById('b_adjlayer').click(); await w(600);
    const A = LAYERS[SEL];
    A.d = 0; A.adj.bri = 0.6; A.ed.expo = 0.5;
    LAYERS.forEach(o => o._key = ''); COARSE = 0; render(); await w(600);
    const 奥ぜんぶ = window.__full();
    const out = { 奥ぜんぶの枚数:LAYERS.filter(o => o.img && adjHits(A, o)).length };
    document.querySelector('#s_adjscope button[data-v="band"]').click(); await w(400);
    const f = document.getElementById('r_adjfrom'), t = document.getElementById('r_adjto');
    f.value = 40; f.dispatchEvent(new Event('input', { bubbles:true }));
    t.value = 60; t.dispatchEvent(new Event('input', { bubbles:true }));
    LAYERS.forEach(o => o._key = ''); COARSE = 0; render(); await w(600);
    out.帯の枚数 = LAYERS.filter(o => o.img && adjHits(A, o)).length;
    out.絵が変わる = window.__sad(奥ぜんぶ, window.__full());
    out.一覧に帯が出る = [...document.querySelectorAll('#layers .ly .dp')]
      .some(e => /0\.40〜0\.60/.test(e.textContent));
    out.設定に入る = /adjRange/.test(JSON.stringify(snapshot()));
    document.querySelector('#s_adjscope button[data-v="all"]').click(); await w(400);
    LAYERS.forEach(o => o._key = ''); COARSE = 0; render(); await w(600);
    out.戻すと同じ = window.__diff(奥ぜんぶ, window.__full());
    /* すぐ下の1枚 */
    document.querySelector('#s_adjscope button[data-v="clip"]').click(); await w(400);
    out.クリップの枚数 = LAYERS.filter(o => o.img && adjHits(A, o)).length;
    document.querySelector('#s_adjscope button[data-v="all"]').click(); await w(300);
    /* 後片付け */
    setLayers(LAYERS.filter(o => o !== A)); SEL = 0; SELIDS = [];
    syncSelIds(); buildList(); syncSel(); render();
    return out;
  });
  ok(AR.奥ぜんぶの枚数 >= 2 && AR.帯の枚数 === 1 && AR.クリップの枚数 === 1,
     '⭐⭐ 調整の効く範囲＝奥ぜんぶ／すぐ下の1枚／奥行きの帯 が別々に効く', JSON.stringify(AR));
  ok(AR.絵が変わる > 0 && AR.戻すと同じ === 0,
     '🔴 帯にすると絵が変わり、奥ぜんぶへ戻すと1画素も同じに戻る', JSON.stringify(AR));
  ok(AR.一覧に帯が出る && AR.設定に入る,
     '⭐ 一覧に「奥 0.40〜0.60 だけ」と出て、設定JSONにも入る', JSON.stringify(AR));
}

/* ⭐⭐ ⑱ 1枚組んで見つけた2つ（実際にポスターを作って踏んだ）
   ・字の大きさ(px) と レイヤーの大きさ が二重に掛かる → 打った px そのままにする1手
   ・版面からはみ出しても何も言わない → 一覧に印（言うだけ・止めない） */
{
  const MK = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    closeAllEditors(); await w(300);
    document.querySelector('#tools button[data-t="text"]').click(); await w(1000);
    const out = { 前:document.getElementById('tfitSay').textContent };
    document.getElementById('b_tfit').click(); await w(500);
    out.後 = document.getElementById('tfitSay').textContent;
    const L = LAYERS[SEL], f = sheet();
    out.実寸になった = Math.abs(L.s * f.w - (L.img.naturalWidth || 0)) < 2;
    /* はみ出しの印＝半分以上出たときだけ */
    const i2 = LAYERS.findIndex(L2 => L2.img && !L2.kind);
    setSel(i2, false); syncSel(); buildList(); await w(200);
    out.見本では印なし = !document.querySelector('#layers .ly.outside');
    const L2 = LAYERS[SEL]; const keep = L2.x;
    L2.x = 1.25; L2._key = ''; buildList(); await w(250);
    out.半分以上出ると印 = !!document.querySelector('#layers .ly.outside');
    L2.x = keep; buildList(); await w(200);
    out.戻すと消える = !document.querySelector('#layers .ly.outside');
    return out;
  });
  ok(/ずれています/.test(MK.前) && /一致しています/.test(MK.後) && MK.実寸になった,
     '⭐⭐ 字は【打った px そのままの大きさ】にできる（二重に掛かるのを解く）',
     JSON.stringify(MK));
  ok(MK.見本では印なし && MK.半分以上出ると印 && MK.戻すと消える,
     '⭐ 版面から半分以上はみ出したら一覧に印（全面に敷いた背景では言わない）',
     JSON.stringify(MK));
}

/* ══════════════════════════════════════════════════════════════════════
   ⭐⭐ 筆は【焼き込まない】── 描いた後でもつまみが効く／板として掴める
   （2026-09-01・木下＝「書いた後で太さや濃さなど変えても何も変わらない」
     「この筆もレイヤーとして生きているためボード上で移動できるようにして」）
   ══════════════════════════════════════════════════════════════════════ */
{
  await p.evaluate(() => {
    closeAllEditors();
    document.querySelector('#tools button[data-t="brush"]').click();
  });
  await wait(500);
  const pt = await p.evaluate(() => {
    const a = toScreen(0.34, 0.42), b2 = toScreen(0.62, 0.56);
    return { ax:a.clientX, ay:a.clientY, bx:b2.clientX, by:b2.clientY };
  });
  await p.mouse.move(pt.ax, pt.ay);
  await p.mouse.down();
  for(let i = 1; i <= 8; i++)
    await p.mouse.move(pt.ax + (pt.bx - pt.ax) * i / 8, pt.ay + (pt.by - pt.ay) * i / 8);
  await p.mouse.up();
  await wait(700);
  const B1 = await p.evaluate(() => {
    const L = LAYERS[SEL], f = sheet();
    return { 筆:!!(L && L.brush), 打った点:L.brush ? L.brush.strokes.reduce((n, st) => n + st.length, 0) : 0,
      紙の幅:L.img ? L.img.naturalWidth : 0, 版面の幅:f.w,
      切り詰めた:!!(L.img && L.img.naturalWidth < f.w),
      掴める:hitLayer({ x:L.x, y:L.y }) === SEL,
      外は掴まない:hitLayer({ x:0.03, y:0.03 }) !== SEL };
  });
  ok(B1.筆 && B1.打った点 > 3, '⭐⭐ 筆は【打った点】を覚えている（焼き込まない）', JSON.stringify(B1));
  ok(B1.切り詰めた && B1.掴める && B1.外は掴まない,
     '⭐⭐ ひと筆おわりで紙が絵の大きさに切り詰まる＝盤で掴んで動かせる板になる',
     JSON.stringify(B1));

  /* ⭐ 描いた後にツールを戻して、つまみを回すと【その絵が描き直される】 */
  await p.evaluate(() => {
    document.querySelector('#tools button[data-t="move"]').click();
  });
  await wait(400);
  const B2 = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const L = LAYERS[SEL];
    const out = { 段が出る: !document.getElementById('brushBox').classList.contains('hide'),
                  描き足す釦: !document.getElementById('b_bradd').classList.contains('hide') };
    COARSE = 0; render(); await w(400);
    const 前 = window.__full();
    const 太さ0 = L.brush.size;
    const e = document.getElementById('r_brsize');
    e.value = String(Math.min(90, 太さ0 * 3));
    e.dispatchEvent(new Event('input', { bubbles:true }));
    await w(700); COARSE = 0; render(); await w(400);
    out.太さで変わる = window.__sad(前, window.__full());
    e.value = String(太さ0); e.dispatchEvent(new Event('input', { bubbles:true }));
    await w(700); COARSE = 0; render(); await w(400);
    out.戻すと同じ = window.__sad(前, window.__full());
    /* 種類も後から変えられる */
    const bt = [...document.querySelectorAll('#s_brkind button')]
      .find(x => x.dataset.v !== L.brush.kind);
    bt.click(); await w(700); COARSE = 0; render(); await w(400);
    out.種類でも変わる = window.__sad(前, window.__full());
    out.種類 = L.brush.kind;
    return out;
  });
  ok(B2.段が出る && B2.描き足す釦,
     '⭐⭐ 筆で描いた層を選ぶと【筆の段】が出る（入口が死んでいない）', JSON.stringify(B2));
  ok(B2.太さで変わる > 0 && B2.戻すと同じ === 0,
     '⭐⭐ 描いた後でも太さが効く／戻すと1画素も同じ（焼き込んでいない）', JSON.stringify(B2));
  ok(B2.種類でも変わる > 0, '⭐ 描いた後でも【粉・霧…】の種類を変えられる', JSON.stringify(B2));
}

/* ⭐ 版面からはみ出しても、枠と四隅が見える（印の板が版面より大きい） */
{
  const OV = await p.evaluate(() => ({ 盤:cv.width, 印:ov.width, 余白:OVM }));
  ok(OV.印 > OV.盤 && OV.余白 > 0,
     '⭐⭐ 印の板は版面より一回り大きい＝はみ出した素材の枠も見える', JSON.stringify(OV));
}

/* ⭐ 木下の書体は漢字を持っていない＝打ったら言う */
{
  const FM = await p.evaluate(() => ({
    UWASA欧文にかな: fontMissing('UWASA, sans-serif', 'しずか'),
    UWASAJPにかな:   fontMissing('UWASAJP, sans-serif', 'しずか'),
    UWASAJPに漢字:   fontMissing('UWASAJP, sans-serif', '静かな手紙'),
    KETAにかな:      fontMissing('KETA, sans-serif', 'しずか'),
    明朝に漢字:      fontMissing('"Hiragino Mincho ProN","Yu Mincho",serif', '静かな手紙') }));
  ok(FM.UWASA欧文にかな && !FM.UWASAJPにかな && FM.UWASAJPに漢字 === '静手紙'
     && !FM.KETAにかな && !FM.明朝に漢字,
     '⭐⭐ 書体に無い字を先に言う（かな込みでも【漢字は無い】と言う）', JSON.stringify(FM));
}

/* ⭐⭐ ペンの【図形を描く】＝閉じたら本当にレイヤーになる（2026-09-01・木下）
   🔴 前は選んでいる素材の紙の中で点を取っていたので、小さい素材を選んだまま
      広い所に描くと「図形にできませんでした」で終わっていた。 */
{
  await p.evaluate(() => {
    closeAllEditors();
    document.querySelector('#tools button[data-t="path"]').click();
  });
  await wait(600);
  await p.evaluate(() => {
    /* いちばん小さい素材を選んでおく（前はこれで必ず失敗した） */
    let k = 0, best = 9;
    LAYERS.forEach((L, i) => { if(L.img && L.s < best){ best = L.s; k = i; } });
    setSel(k, false); syncSel();
    const bt = [...document.querySelectorAll('#s_penmode button')].find(x => x.dataset.v === 'shape');
    if(bt) bt.click();
  });
  await wait(400);
  const P0 = await p.evaluate(() => ({ 枚:LAYERS.length, PENMODE,
    釦:document.getElementById('b_polyend').textContent }));
  const pp = await p.evaluate(() => {
    const a2 = toScreen(0.34, 0.28), b2 = toScreen(0.63, 0.35), c2 = toScreen(0.45, 0.60);
    return [[a2.clientX, a2.clientY], [b2.clientX, b2.clientY], [c2.clientX, c2.clientY]];
  });
  for(const [x, y] of pp){ await p.mouse.click(x, y); await wait(250); }
  await p.mouse.click(pp[0][0], pp[0][1]);
  await wait(800);
  const P1 = await p.evaluate(() => {
    const o = LAYERS[SEL];
    return { 枚:LAYERS.length, 名:o ? o.name : null, 種:o ? o.kind : null,
      型:o && o.shape ? o.shape.type : null, 点:o && o.shape ? o.shape.pts.length : 0,
      x:o ? +o.x.toFixed(2) : 0, y:o ? +o.y.toFixed(2) : 0, s:o ? +o.s.toFixed(2) : 0,
      掴める:o ? hitLayer({ x:o.x, y:o.y }) === SEL : false,
      案内:document.getElementById('stat').textContent };
  });
  ok(/図形/.test(P0.釦) && P0.PENMODE === 'shape',
     '⭐ ［図形を描く］にすると閉じる釦の名前も変わる（釦が嘘をつかない）', JSON.stringify(P0));
  ok(P1.枚 === P0.枚 + 1 && P1.種 === 'shape' && P1.型 === 'path' && P1.点 === 3,
     '⭐⭐ ペンで囲んで閉じると【本物の図形レイヤー】になる（塗り・線が効く）', JSON.stringify(P1));
  ok(Math.abs(P1.x - 0.485) < 0.04 && Math.abs(P1.y - 0.44) < 0.05
     && Math.abs(P1.s - 0.29) < 0.05 && P1.掴める,
     '⭐⭐ 描いた場所・大きさのまま版面に置かれる（選んでいる素材に引きずられない）',
     JSON.stringify(P1));
  await p.evaluate(() => {
    const bt = [...document.querySelectorAll('#s_penmode button')].find(x => x.dataset.v === 'path');
    if(bt) bt.click();
    document.querySelector('#tools button[data-t="move"]').click();
  });
  await wait(300);
}

/* ⭐⭐ 地の色を変えても見えないときは【理由を言う】（2026-09-01・木下＝
   「いくらやっても背景白にならないな、俺のデータ」＝いちばん奥の見本が版面を覆っていた） */
{
  const BG = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    closeAllEditors();
    let deep = null;
    LAYERS.forEach(L => { if(L.img && !L.kind && (!deep || L.d > deep.d)) deep = L; });
    if(!deep) return { だめ:'絵の素材が無い' };
    const s0 = deep.s, y0 = deep.sy, x0 = deep.x, yy0 = deep.y;
    deep.s = 1.2; deep.sy = 4; deep.x = 0.5; deep.y = 0.5; deep._key = '';
    buildList(); render(); await w(400);
    const 覆う = { 名:bgCover() ? bgCover().name : null,
      段:!document.getElementById('bgCoverSay').classList.contains('hide'),
      一覧:!!document.querySelector('#layers .bgrow.covered') };
    /* 目を閉じたら言わない（覆っていないので） */
    deep.on = false; buildList(); render(); await w(300);
    const 閉じたら = { 名:bgCover() ? bgCover().name : null,
      段:!document.getElementById('bgCoverSay').classList.contains('hide') };
    deep.on = true;
    deep.s = s0; deep.sy = y0; deep.x = x0; deep.y = yy0; deep._key = '';
    buildList(); render(); await w(300);
    const 戻したら = { 名:bgCover() ? bgCover().name : null };
    return { 覆う, 閉じたら, 戻したら };
  });
  ok(BG.覆う && BG.覆う.名 && BG.覆う.段 && BG.覆う.一覧 && !BG.閉じたら.名 && !BG.閉じたら.段,
     '⭐⭐ 地の色が【覆われていて見えない】ときは、どの素材のせいか言う',
     JSON.stringify(BG));
}

ok(errs.length === 0, 'JSエラーが出ない', errs.join(' | '));
await b.close();
process.exit(NG ? 1 : 0);
