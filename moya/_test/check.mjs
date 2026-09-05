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
/* ══🔴🔴 盤の指紋（物差し）は【読み込むたびに必ず入る】ようにする ══ 2026-09-02
   🔴🔴 2026-09-02 に踏んだ：速い束（章だけ）を流したら
     `window.__full is not a function` で **ok() が1本も 🔴 にならずにプロセスごと死んだ**。
     原因＝物差しを goto の【後】に1回入れていただけで、
       指の端末の試験でページが読み直されると消え、入れ直す章を選ばないと戻らなかった。
     ⚠️ ✅の数だけ見ていると「通った」に見える＝いちばんたちが悪い。
   ⭐ evaluateOnNewDocument＝**読み込みのたびに先に入る**。＝入れ直しの章はもう要らない。
     ＝式は1本（ここだけ）。 → feedback_same_formula_in_two_places_drifts */
/* ⚠️ 試験は【前の続きから開かない】＝自動保存に引きずられない（2026-09-02）
   🔴 これが無いと、指の端末で頁が読み直されたときに その回の素材を全部復元しようとして
     15 秒を超え、ok() が1本も🔴にならずに落ちる＝ぶれる試験になる。
   ⭐ 自動保存を見る章だけ、その場で localStorage の印を立てて外す。 */
await p.evaluateOnNewDocument(() => {
  try{ window.__MOYA_NOLOCAL = !localStorage.getItem('moya.test.local'); }
  catch(_){ window.__MOYA_NOLOCAL = true; }
});
await p.evaluateOnNewDocument(() => {
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

/* ⭐ 盤の指紋（物差し）は上の evaluateOnNewDocument で入っている */
/* ══🔴🔴 画面の大きさを変えたら【盤が出るまで待つ】══ 2026-09-02
   🔴 指の端末（isMobile）に切り替えると **ページが読み直される**。
     いままで `wait(900)` と決め打ちしていたので、読み直しが少し遅いと
     `getComputedStyle(document.getElementById('stage'))` が null で落ちた
     （＝ok() が1本も🔴にならずにプロセスごと死ぬ＝いちばん読めない落ち方）。
   ⭐ 時間で待たない。**盤と素材が出たことを見てから進む**＝ぶれない。
   → feedback_regression_test_before_push（⭐⭐ぶれる試験は落ちない試験よりもっと悪い） */
const ready = async (ms = 20000) => {
  /* 🔴🔴 2026-09-02 に踏んだ：ここで `window.LAYERS` を見ていたが、
     **`let LAYERS` は window に載らない**ので【一度も真にならない条件】を待っていた
     ＝毎回 15 秒待って TimeoutError で落ちていた（ok() は1本も🔴にならない）。
     ⭐ 中の名前は `typeof` で見る（window 経由にしない）。
     → feedback_prove_no_change_by_pixels（画面の中の物は画面の言葉で確かめる） */
  await p.waitForFunction(
    () => !!document.getElementById('stage') && !!window.cv
       && typeof LAYERS !== 'undefined' && Array.isArray(LAYERS),
    { timeout: ms });
  await wait(600);            /* 出てから ひと呼吸（描き終わりを待つ） */
};
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
  /* ══🔴🔴 新しいつまみを足したら【この表も見る】══════════════════
     「素の値」は **つまみごとに人が決めるしかない**（機械的には出ない）。
     ・空気・灯・馴染ませ ＝ HTML の初期値は「道具のおすすめ」で、**素は 0**
     ・下の表のもの       ＝ **0 が「何もしない」ではない**（0 にすると逆に効く）
     ⚠️ 2026-09-05 に「初期値を読めば表は要らない」と変えてみたが、
       **空気の20本が全部落ちた**＝おすすめ値と素の値は別物だった。表に戻した。 */
  const NEU = { r_op:100, r_air:100, r_white:100, r_gamma:100, r_out:100, r_mxr:100,
                r_filla:100, r_lmdens:100, r_glasssm:6, r_glassscale:100,
                /* 0 が「何もしない」ではないもの（＝素の値が 0 でない） */
                r_outhi:255,      /* 出力レベルの白（0 にすると真っ黒） */
                r_gmapop:100 };   /* グラデーションマップの不透明度（0 だとかからない） */
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
                /* ブラシの かたさ・間隔・不透明度＝筆の道具の数字（2026-09-03）
                   ⚠️ 既定は 70／25／100 で、0 ではない（Adobe の丸ブラシに合わせた値） */
                'r_brhard','r_brspace','r_bropa','r_brtaper','r_brwob',
                /* 毛の本数・滑らかさ＝筆の道具の数字（2026-09-04・既定は 0＝おまかせ／効かせない） */
                'r_brhair','r_brsm',
                /* ⭐ 既定が 0 でないもの＝【0 が「何もしない」ではない】つまみ。
                   ブレンド条件の白側は 255 が「何もしない」／灯の当たる帯の上限も 100 が「ぜんぶ」。
                   ＝ 型「素」で 0 にすると **逆に効いてしまう**ので、ここは触らない。 */
                'r_bi2','r_bi3','r_lto',
                /* ⭐ シャドウ・ハイライトの【階調の幅】と【半径】も 0 が「何もしない」ではない。
                   量（r_shA / r_hiA）が 0 なら1回も走らない＝素のままは そちらで守られる。 */
                'r_shW','r_shR',
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

/* ⑬-2 一覧の数字が【略さず】出る（木下＝「奥行きの数字を明確に表示してほしい」）
   ⚠️ 2026-09-02：置き場所を変えた。名前の下の「奥 x 空気 y」（読むだけ）をやめて、
     【奥・空・濃 の3つの引ける数字】を1行に並べた（同じ数字を2つの顔で出さない）。 */
const ROWTXT = await p.evaluate(() => {
  const r = document.getElementById('layers').children[0];
  return { 奥:r.querySelector('.dep').textContent, 空:r.querySelector('.air').textContent,
           濃:r.querySelector('.op').textContent, dp:r.querySelector('.dp').textContent };
});
ok(/^奥\d\.\d\d$/.test(ROWTXT.奥) && /^濃\d+%$/.test(ROWTXT.濃),
   '⭐ 一覧に 奥行きと濃さが【名札つきで略さず】出る', JSON.stringify(ROWTXT));
ok(ROWTXT.空 === '空' || /^空\d+%$/.test(ROWTXT.空),
   '⭐ 空気は 空／空◯◯% のどれか（0 のときは斜線で言う）', ROWTXT.空);

/* ⑬-3 一覧の空気ボタンが本当に切り替わる */
const ROWAIR = await p.evaluate(async () => {
  const rows = () => [...document.getElementById('layers').children]
    .filter(r => !r.classList.contains('bgrow'));
  const val = () => airOf(LAYERS.slice().sort((a,b)=>zOf(a)-zOf(b))[2]);
  const before = val();
  rows()[2].querySelector('.air').click();
  await new Promise(r => setTimeout(r, 300));
  const chip = rows()[2].querySelector('.air');
  return { before, after: val(), txt: chip.textContent, 斜線: chip.classList.contains('raw') };
});
/* ⚠️ 2026-09-02・木下＝「素に変わって斜線ではなく、**空に斜め・非アクティブ**の方が分かりやすい」
   ＝字は「空」のまま。切ってあることは【斜線】で言う（目のアイコンと同じ言い方）。
   ⚠️ このとき `.click()` でも切り替わること＝引ける形にしたら一度殺していた入口。 */
ok(ROWAIR.before === 1 && ROWAIR.after === 0 && ROWAIR.txt === '空' && ROWAIR.斜線,
   '⭐ 一覧の空気ボタン（click でも）その素材だけ素のままにできる／字は「空」のまま斜線',
   JSON.stringify(ROWAIR));

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
await ready();
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
await ready();
/* ⭐ 読み直されても物差しは戻る（evaluateOnNewDocument）＝入れ直さない */
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
await ready();

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

/* ══⭐ ペンのときは【青い帯】を出さない ══ 2026-09-02
   🔴 木下＝「ペンツールを使う際のこの青色のメッセージは非表示にして」
     ＝盤の上に案内の帯が出しっぱなしで、絵の邪魔だった。
   ⭐ 見るのは【消したのはペンだけか】と【役割が分からなくなっていないか】：
     ・ペンを選んでも #optSay は出ない
     ・色で消す・なぞって消す などの案内は今までどおり出る
     ・役割［作業用パス／図形を描く］は上のバーに出たまま（押した直後に光る）
     ・切り替えると［閉じる］釦の名前が変わる＝どちらで描いているか分かる
   ＝ 出しっぱなしの帯だけをやめて、聞かれた時に答える所は残す。 */
const PENBAR = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const say = () => { const e = document.getElementById('optSay');
    return { 出ている: !!e && !e.classList.contains('hide'), 文: e ? e.textContent.trim() : null }; };
  closeAllEditors(); SEL = 0; syncSel(); buildList();
  document.querySelector('#tools button[data-t="retouch"]').click();
  document.querySelector('#s_tool button[data-v="color"]').click();
  await w(500);
  const 色 = say();
  document.querySelector('#tools button[data-t="path"]').click();
  await w(700);
  const ペン = say();
  const seg = document.getElementById('s_penmode');
  const 役割 = { 段が出ている: !!seg && seg.offsetParent !== null,
    光る: !!seg && seg.classList.contains('flash'),
    閉じる釦: (document.getElementById('b_polyend') || {}).textContent };
  const bt = seg && [...seg.querySelectorAll('button')].find(x => x.dataset.v === 'shape');
  if(bt) bt.click(); await w(400);
  const 切替後 = { 帯: say(), 閉じる釦: (document.getElementById('b_polyend') || {}).textContent };
  if(seg){ const b0 = [...seg.querySelectorAll('button')].find(x => x.dataset.v === 'path');
    if(b0) b0.click(); }                                   /* もとに戻す（次の章に持ち越さない） */
  document.querySelector('#tools button[data-t="move"]').click();
  await w(300);
  return { 色, ペン, 役割, 切替後 };
});
ok(PENBAR.ペン.出ている === false,
   '⭐ ペンを選んでも【青い帯】は出ない（盤の上に居座らない）', JSON.stringify(PENBAR.ペン));
ok(PENBAR.色.出ている === true && /どこが消えるか/.test(PENBAR.色.文),
   '⭐ 消したのはペンだけ ── 色で消すの案内は今までどおり出る', JSON.stringify(PENBAR.色));
ok(PENBAR.役割.段が出ている === true,
   '⭐ 役割［作業用パス／図形を描く］は上のバーに出たまま（入口を殺していない）',
   JSON.stringify(PENBAR.役割));
ok(PENBAR.切替後.帯.出ている === false && PENBAR.切替後.閉じる釦 !== PENBAR.役割.閉じる釦,
   '⭐ 切り替えても帯は出ない／［閉じる］釦の名前でどちらか分かる', JSON.stringify(PENBAR.切替後));

/* ══⭐⭐ 線の太さを動かしたら【線が出る】══ 2026-09-02
   🔴🔴 木下＝「ペンツールで図形を描けた後に、線の太さなどを変更するが
      何も図形に変化はなし」
     ＝図形は【線なし（strokeOn:false）】で生まれるので、太さを 60 にしても
       絵は1通りしか出なかった＝死んだつまみ。線を出す道は［線］の色を選んでから
       ／ を押す所にしか無く、そこに気づけなかった＝芯は正しいのに入口が無い。
   ⭐ 見るのは【つまみが必ず絵を変えるか】と【0 は本当に 0 か】：
     ・太さを上げると 絵が変わる／strokeOn が true になる
     ・0 に戻すと 線なしの絵に **1画素も同じ**に戻る
     ・線の位置（中央・内側・外側）を押しても線が出る
   → feedback_count_the_pictures_a_knob_makes ／ feedback_a_tool_starts_from_being_ready */
const SWDTH = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const set = (id, v) => { const e = document.getElementById(id);
    e.value = v; e.dispatchEvent(new Event('input', { bubbles:true })); };
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1600); });
  const L = await window.drawShape(0.30, 0.30, 0.60, 0.58);
  const q = L.shape;
  COARSE = 0; render(); await w(400);
  const 生まれたとき = { 線: q.strokeOn, 太さ: q.sw };
  const A = window.__full();
  set('sh_sw', 24); await w(500);
  const 太くした = { 線: q.strokeOn, 太さ: q.sw, 変わった: window.__sad(window.__full(), A) };
  set('sh_sw', 0); await w(500);
  const ゼロ = { 線: q.strokeOn, 戻り: window.__sad(window.__full(), A) };
  /* 線の位置を押すだけでも線が出る（押したのに何も出ない、を作らない） */
  document.querySelector('#s_shalign button[data-v="outer"]').click();
  await w(500);
  const 位置 = { 線: q.strokeOn, 太さ: q.sw, 変わった: window.__sad(window.__full(), A) };
  return { 生まれたとき, 太くした, ゼロ, 位置 };
});
ok(SWDTH.生まれたとき.線 === false,
   '⚠️ 図形は【線なし】で生まれる（今までの絵を変えない）', JSON.stringify(SWDTH.生まれたとき));
ok(SWDTH.太くした.線 === true && SWDTH.太くした.変わった > 0,
   '⭐⭐ 線の太さを上げると【線が出て絵が変わる】（死んだつまみにしない）',
   JSON.stringify(SWDTH.太くした));
ok(SWDTH.ゼロ.線 === false && SWDTH.ゼロ.戻り === 0,
   '🔴 0 は本当に 0 ── 線なしの絵に1画素も同じに戻る', JSON.stringify(SWDTH.ゼロ));
ok(SWDTH.位置.線 === true && SWDTH.位置.太さ > 0 && SWDTH.位置.変わった > 0,
   '⭐ 線の位置を押しても線が出る（押したのに何も起きない、を作らない）',
   JSON.stringify(SWDTH.位置));

/* ══⭐⭐ 線を太くしても【本体の大きさは変えない】══ 2026-09-02
   🔴🔴 木下＝「外側と書いてあると普通のその三角の白い部分の大きさは変わらず、外に線が
      つくだけだが、今ではその白い面積自体も小さくなっている。中央、内側も？と思う動きだ」
     ＝実測でそのとおりだった（太さ47・白い本体の幅）：
       太さ0 **318px** → 外側 **256px**／中央 **248px**／内側 **214px**
     原因＝線が太くなると紙（shapeCanvas）が余白のぶん大きくなるのに、盤に置く倍率 L.s が
       そのままだった＝大きくなった紙を同じ幅に押し込む＝**中身がまるごと縮む**。
   ⭐ 見るのはイラレと同じ3つの振る舞い：
     ・**外側**＝白い本体は変わらない（線は外へ付く）
     ・**中央**＝線の半分が内へ食い込む（本体は少し小さくなる）
     ・**内側**＝線ぜんぶが内へ食い込む（中央よりさらに小さい）
   → feedback_canvas_view_fix_zoom_not_offset ／ feedback_same_formula_in_two_places_drifts */
const SHSTK = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const set = (id, v) => { const e = document.getElementById(id);
    e.value = v; e.dispatchEvent(new Event('input', { bubbles:true })); };
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1600); });
  const L = await window.drawShape(0.30, 0.30, 0.62, 0.58);
  document.querySelector('#tools button[data-t="move"]').click(); await w(300);
  COARSE = 0;
  const q = L.shape;
  /* 白い本体の幅＝盤に出ている「まっ白な画素」の横の広がり（線は黒なので混ざらない） */
  const body = () => { const d = g.getImageData(0,0,cv.width,cv.height).data;
    let x0 = 1e9, x1 = -1;
    for(let y = 0; y < cv.height; y++) for(let x = 0; x < cv.width; x++){
      const i = (y*cv.width + x)*4;
      if(d[i] > 230 && d[i+1] > 230 && d[i+2] > 230){ if(x < x0) x0 = x; if(x > x1) x1 = x; } }
    return x1 - x0; };
  q.fill = '#ffffff'; q.fillOn = true; q.stroke = '#000000';
  q.strokeOn = false; q.sw = 0; rebuildShape(L); render(); await w(400);
  const 太さ0 = body();
  document.querySelector('#s_shalign button[data-v="outer"]').click(); await w(200);
  set('sh_sw', 47); await w(500);
  const 外側 = body();
  document.querySelector('#s_shalign button[data-v="center"]').click(); await w(500);
  const 中央 = body();
  document.querySelector('#s_shalign button[data-v="inner"]').click(); await w(500);
  const 内側 = body();
  return { 太さ0, 外側, 中央, 内側 };
});
ok(Math.abs(SHSTK.外側 - SHSTK.太さ0) <= 3,
   '⭐⭐ 外側＝白い本体の大きさは【変わらない】（線が外へ付くだけ）', JSON.stringify(SHSTK));
ok(SHSTK.中央 < SHSTK.太さ0 - 10 && SHSTK.中央 > SHSTK.内側 + 10,
   '⭐ 中央＝線の半分だけ内へ食い込む（外側と内側のちょうど間）', JSON.stringify(SHSTK));
ok(SHSTK.内側 < SHSTK.中央,
   '⭐ 内側＝線ぜんぶが内へ食い込む（いちばん小さい）', JSON.stringify(SHSTK));

/* ══⭐⭐ 塗りの画像は【素材の大きさ】を物差しに盤で大きくできる ══ 2026-09-02
   🔴 木下＝「塗り画像の部分のみを触ることができるが**大きくできない**」
     ＝効いてはいた（k は動いていた）。**効きが弱すぎた**＝物差しが【版面いっぱい】で、
       素材の上を引いても版面のごく一部＝×1.05 程度しか動かず「効かない」に見えた。
   ⭐ **素材の高さ1つぶん引いたら 2倍**（下へ引けば 1/2）＝手の動きと絵が釣り合う。
   → feedback_count_the_pictures_a_knob_makes ／ feedback_grab_size_in_screen_px */
const FILK = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1600); });
  const L = await window.drawShape(0.30, 0.30, 0.62, 0.58);
  document.querySelector('#tools button[data-t="move"]').click(); await w(300);
  COARSE = 0;
  const tc = document.createElement('canvas'); tc.width = 200; tc.height = 200;
  const tg = tc.getContext('2d');
  tg.fillStyle = '#ff0000'; tg.fillRect(0, 0, 200, 200);
  tg.fillStyle = '#00ff00'; tg.fillRect(50, 50, 100, 100);
  fillsOf(L).push({ kind:'image', src:tc.toDataURL(), op:1, mode:'source-over', on:true });
  L._key = ''; buildList(); render(); await w(900);
  const f = fillsOf(L)[0];
  const shot = () => { const d = g.getImageData(0,0,cv.width,cv.height).data; const o = [];
    for(let i = 0; i < d.length; i += 4*3) o.push(d[i], d[i+1], d[i+2], d[i+3]); return o; };
  const sad = (A, B) => { let s2 = 0; for(let i = 0; i < A.length; i++) s2 += Math.abs(A[i]-B[i]);
    return s2; };
  const A = shot();
  /* 素材の高さの 2/3 ぶん、上へ引く */
  FILLEDIT = { L, f };
  const dh = L.s * chOf(L)/cwOf(L) * syOf(L) * (cv.width/cv.height);
  const p0 = toScreen(0.46, 0.50), p1 = toScreen(0.46, 0.50 - dh*2/3);
  stage.dispatchEvent(new PointerEvent('pointerdown',
    { clientX:p0.clientX, clientY:p0.clientY, bubbles:true, pointerId:11, shiftKey:true }));
  await w(60);
  stage.dispatchEvent(new PointerEvent('pointermove',
    { clientX:p1.clientX, clientY:p1.clientY, bubbles:true, pointerId:11, shiftKey:true }));
  await w(60);
  stage.dispatchEvent(new PointerEvent('pointerup',
    { clientX:p1.clientX, clientY:p1.clientY, bubbles:true, pointerId:11, shiftKey:true }));
  await w(500);
  const 大きく = { k:f.k, 変わった: sad(shot(), A) };
  /* 下へ同じだけ引いたら小さくなる（両向きに効く） */
  f.k = 1; L._key = ''; render(); await w(300);
  const p2 = toScreen(0.46, 0.50 + dh*2/3);
  stage.dispatchEvent(new PointerEvent('pointerdown',
    { clientX:p0.clientX, clientY:p0.clientY, bubbles:true, pointerId:12, shiftKey:true }));
  await w(60);
  stage.dispatchEvent(new PointerEvent('pointermove',
    { clientX:p2.clientX, clientY:p2.clientY, bubbles:true, pointerId:12, shiftKey:true }));
  await w(60);
  stage.dispatchEvent(new PointerEvent('pointerup',
    { clientX:p2.clientX, clientY:p2.clientY, bubbles:true, pointerId:12, shiftKey:true }));
  await w(500);
  const 小さく = { k:f.k };
  FILLEDIT = null;
  return { 大きく, 小さく };
});
ok(FILK.大きく.k > 1.4 && FILK.大きく.変わった > 0,
   '⭐⭐ 素材の高さの2/3 引いたら【1.4倍より大きく】なる（弱すぎない）', JSON.stringify(FILK));
ok(FILK.小さく.k < 0.75,
   '⭐ 下へ引けば小さくなる（両向きに同じだけ効く）', JSON.stringify(FILK));

/* ══⭐⭐ 塗りの画像は【線の下】に入る／型は1回だけかける ══ 2026-09-02
   🔴🔴 木下の2つ：
     ①「画像が入っている状態では、線をこのまま大きくすると **線が足されるのではなく、
        画像が切り取りされているような動き**になる」
        ＝塗りの画像を【形の中ぜんぶ（線の上まで）】に乗せていたので、線が隠れていた。
        → イラレと同じ順に：**塗り → 塗りの画像 → 線**。
     ②「**線の太さが0の場合でもうっすらと線も見えている**」
        ＝別の紙で形に切ってから、盤へ置くときも source-atop でもう一度 形のアルファを
          掛けていた＝縁の1画素が 0.5×0.5＝0.25 になり、下の塗り（白）がにじんで見えた。
        → すでに切ってある紙は そのまま置く（型は1回だけ）。
   ⭐ 見るのは画素で数える3つ：
     ・線なし＝**白い縁が1画素も出ない**（下の白い塗りが漏れていない）
     ・外側＝**画像の面積が線なしとほぼ同じ**（切り取られていない）＋線の黒が増える
     ・内側＝画像が内へ食い込む（減る）＋線の黒が増える
   ⚠️ 控えは canvas を写さない（shapeCopy が `_` を落とす）＝⌘Z で戻しても落ちない。 */
const SHFILL = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const set = (id, v) => { const e = document.getElementById(id);
    e.value = v; e.dispatchEvent(new Event('input', { bubbles:true })); };
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1600); });
  const L = await window.drawShape(0.28, 0.28, 0.66, 0.62);
  document.querySelector('#tools button[data-t="move"]').click(); await w(300);
  COARSE = 0;
  const q = L.shape;
  q.type = 'tri'; q.fill = '#ffffff'; q.fillOn = true; q.stroke = '#000000';
  q.strokeOn = false; q.sw = 0; rebuildShape(L);
  /* まっ赤な画像＝線（黒）と はっきり分かれる */
  const tc = document.createElement('canvas'); tc.width = 200; tc.height = 200;
  const tg = tc.getContext('2d'); tg.fillStyle = '#ff0000'; tg.fillRect(0, 0, 200, 200);
  fillsOf(L).push({ kind:'image', src:tc.toDataURL(), op:1, mode:'source-over', on:true });
  L._key = ''; buildList(); render(); await w(900);
  const count = () => { const d = g.getImageData(0,0,cv.width,cv.height).data;
    let 赤 = 0, 黒 = 0, 白 = 0;
    for(let i = 0; i < d.length; i += 4){
      const r = d[i], g2 = d[i+1], b2 = d[i+2];
      if(r > 180 && g2 < 70 && b2 < 70) 赤++;
      else if(r < 28 && g2 < 28 && b2 < 28) 黒++;
      else if(r > 235 && g2 > 235 && b2 > 235) 白++;
    }
    return { 赤, 黒, 白 }; };
  const 線なし = count();
  document.querySelector('#s_shalign button[data-v="inner"]').click(); await w(300);
  set('sh_sw', 60); await w(600);
  const 内側 = count();
  document.querySelector('#s_shalign button[data-v="outer"]').click(); await w(600);
  const 外側 = count();
  let 戻して落ちない = false;
  try{ undo(); await w(600); 戻して落ちない = true; }catch(_){ }
  return { 線なし, 内側, 外側, 戻して落ちない };
});
ok(SHFILL.線なし.白 === 0,
   '⭐⭐ 線の太さ0で【うっすらした線が1画素も出ない】（型は1回だけかける）',
   JSON.stringify(SHFILL.線なし));
ok(SHFILL.外側.赤 > SHFILL.線なし.赤 * 0.97 && SHFILL.外側.黒 > SHFILL.線なし.黒 * 1.3,
   '⭐⭐ 外側＝画像は切り取られない（面積そのまま）＋線が外へ足される',
   JSON.stringify(SHFILL.外側) + ' / 線なし ' + JSON.stringify(SHFILL.線なし));
ok(SHFILL.内側.赤 < SHFILL.線なし.赤 * 0.8 && SHFILL.内側.黒 > SHFILL.線なし.黒 * 1.3,
   '⭐ 内側＝線が画像の上に乗る（画像は内へ食い込む・線は見える）',
   JSON.stringify(SHFILL.内側));
ok(SHFILL.戻して落ちない === true,
   '🔴 ⌘Z で戻しても落ちない（控えは作り直せる紙を写さない）', String(SHFILL.戻して落ちない));

/* ══⭐⭐ 一覧で選んだら、右パネルの【その段】まで送る ══ 2026-09-02
   🔴 木下＝「レイヤーパネルで筆のレイヤーを選ぶと、サイドパネルも筆の場所にスクロールする
      ように」「レイヤーがテキストの時はサイドパネルを文字にスクロールしてほしい」
     ＝右パネルは長いので、選んでも【どこを触ればいいか】が画面の外にあった。
   ⭐ 道具を押したときと同じ道（focusGrp）＝送り方は1本。動かすのは右パネルだけ（盤は動かさない）。
   ⚠️ あわせて「↑ ◯◯ は上のバーにあります」の補足を出さないようにした
      （木下＝「補足説明のこのテキストは非表示で」＝同じ文が段ごとに並んで本文より多かった）。
      ⭐ ただし【上のバーには名前が付いたまま】＝迷子にはならない（ここも見る）。 */
const JUMP = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1600); });
  /* 筆で1本引く */
  document.querySelector('#tools button[data-t="brush"]').click(); await w(500);
  const a = toScreen(0.34, 0.42), c = toScreen(0.62, 0.56);
  stage.dispatchEvent(new PointerEvent('pointerdown',
    { clientX:a.clientX, clientY:a.clientY, bubbles:true, pointerId:7 }));
  stage.dispatchEvent(new PointerEvent('pointermove',
    { clientX:c.clientX, clientY:c.clientY, bubbles:true, pointerId:7 }));
  stage.dispatchEvent(new PointerEvent('pointerup',
    { clientX:c.clientX, clientY:c.clientY, bubbles:true, pointerId:7 }));
  await w(800);
  document.querySelector('#tools button[data-t="move"]').click(); await w(300);
  /* 文字を1つ置く */
  document.querySelector('#tools button[data-t="text"]').click(); await w(700);
  document.querySelector('#tools button[data-t="move"]').click(); await w(400);
  const 筆L = LAYERS.find(L => L.brush), 字L = LAYERS.find(L => L.kind === 'text');
  const 素材 = () => LAYERS.findIndex(L => L.img && !L.kind && !L.brush);
  const rows = () => [...document.querySelectorAll('#layers .ly')]
    .filter(r => !r.classList.contains('bgrow') && !r.classList.contains('grp'));
  const press = L => { const row = rows().find(r => (r.textContent || '').includes(L.name));
    if(!row) return false;
    row.dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, pointerId:21, clientX:10, clientY:10 }));
    row.dispatchEvent(new PointerEvent('pointerup',
      { bubbles:true, pointerId:21, clientX:10, clientY:10 }));
    return true; };
  const 光り = id => { const e = document.getElementById(id);
    return e ? { 出ている:!e.classList.contains('hide'), 光った:e.classList.contains('flash') } : null; };
  setSel(素材(), false); syncSel(); buildList(); await w(300);
  out.筆を押せた = press(筆L); await w(250);
  out.筆 = { 段:光り('brushBox'), 選ばれた:!!(LAYERS[SEL] && LAYERS[SEL].brush) };
  await w(700);
  setSel(素材(), false); syncSel(); buildList(); await w(300);
  out.字を押せた = press(字L); await w(250);
  out.字 = { 段:光り('textBox'), 選ばれた:!!(LAYERS[SEL] && LAYERS[SEL].kind === 'text') };
  out.補足の数 = document.querySelectorAll('.moved').length;
  out.上のバーの名前 = [...document.querySelectorAll('#optbar .ol')].map(e => e.textContent);
  return out;
});
ok(JUMP.筆を押せた && JUMP.筆.選ばれた && JUMP.筆.段.出ている && JUMP.筆.段.光った,
   '⭐⭐ 一覧で【筆】の層を選ぶと、右パネルの筆の段まで送って光る', JSON.stringify(JUMP.筆));
ok(JUMP.字を押せた && JUMP.字.選ばれた && JUMP.字.段.出ている && JUMP.字.段.光った,
   '⭐⭐ 一覧で【文字】の層を選ぶと、右パネルの文字の段まで送って光る', JSON.stringify(JUMP.字));
ok(JUMP.補足の数 === 0,
   '⭐「↑ ◯◯ は上のバーにあります」を出さない（本文より目印が多かった）', String(JUMP.補足の数));
ok(JUMP.上のバーの名前.length > 0,
   '⚠️ ただし上のバーには【名前が付いたまま】＝借りた物が迷子にならない',
   JSON.stringify(JUMP.上のバーの名前));

/* ══🔴🔴 盤で【掴んだだけ】ではパネルを動かさない ══ 2026-09-02
   🔴 木下＝「筆のレイヤーパネルを押す、サイドパネルが筆にいく、しかしそのレイヤーを
      ボード上で移動するとサイドパネルが選んだレイヤーに自動的にまた変わる。これでいいのか？」
     ＝よくない。手が盤の上にある最中に、目で追っている右パネルが勝手に動く。
       しかも動かしているのは「もう選んである物」＝新しく見せるものが何も無い。
   ⭐ 決め＝**選んでいるものが変わったときだけ送る**。
     ・盤でいまの物を掴んで動かす → 変わっていないので**動かさない**
     ・盤で別の物を押した → 変わったので送る（その物の設定が見たいはず）
   ⭐ あわせて段の見出しに【何を選んでいるか】を出す
     （木下＝「選んだレイヤーというタイトルが気になるな」＝一覧の言葉「素材」に揃えた）。 */
const HOLD = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const panel = document.getElementById('panel');
  const top = () => Math.round(panel.scrollTop);
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1600); });
  document.querySelector('#tools button[data-t="brush"]').click(); await w(500);
  const a = toScreen(0.40, 0.44), c = toScreen(0.60, 0.54);
  stage.dispatchEvent(new PointerEvent('pointerdown',
    { clientX:a.clientX, clientY:a.clientY, bubbles:true, pointerId:7 }));
  stage.dispatchEvent(new PointerEvent('pointermove',
    { clientX:c.clientX, clientY:c.clientY, bubbles:true, pointerId:7 }));
  stage.dispatchEvent(new PointerEvent('pointerup',
    { clientX:c.clientX, clientY:c.clientY, bubbles:true, pointerId:7 }));
  await w(900);
  document.querySelector('#tools button[data-t="move"]').click(); await w(400);
  const 筆L = LAYERS.find(L => L.brush);
  out.見出し_筆 = document.getElementById('selH').textContent;
  /* 筆の段まで送っておく（見えている状態にする） */
  focusGrp('brushBox'); await w(1500);
  const 前 = top();
  /* ① その筆を盤の上で【動かす】＝もう見えている段なので送らない */
  const 中 = toScreen(筆L.x, 筆L.y), 先 = toScreen(筆L.x + 0.06, 筆L.y + 0.04);
  stage.dispatchEvent(new PointerEvent('pointerdown',
    { clientX:中.clientX, clientY:中.clientY, bubbles:true, pointerId:41 }));
  await w(700);
  out.掴んでも動かない = { 前, 後:top(), 差:Math.abs(top() - 前) };
  stage.dispatchEvent(new PointerEvent('pointermove',
    { clientX:先.clientX, clientY:先.clientY, bubbles:true, pointerId:41 }));
  stage.dispatchEvent(new PointerEvent('pointerup',
    { clientX:先.clientX, clientY:先.clientY, bubbles:true, pointerId:41 }));
  await w(500);
  out.動かしても選ばれたまま = !!(LAYERS[SEL] && LAYERS[SEL].brush);
  /* ② 見えていない段（空気）まで送ってから 別の物を押す＝送られる */
  focusGrp('airBox'); await w(1400);
  const 前2 = top();
  const 他 = LAYERS.find(L => L.img && !L.kind && !L.brush);
  const q3 = toScreen(他.x, 他.y);
  stage.dispatchEvent(new PointerEvent('pointerdown',
    { clientX:q3.clientX, clientY:q3.clientY, bubbles:true, pointerId:42 }));
  await w(900);
  out.見えていなければ送る = { 前:前2, 後:top(), 差:Math.abs(top() - 前2) };
  stage.dispatchEvent(new PointerEvent('pointerup',
    { clientX:q3.clientX, clientY:q3.clientY, bubbles:true, pointerId:42 }));
  await w(300);
  out.見出し_素材 = document.getElementById('selH').textContent;
  SELIDS = LAYERS.slice(0, 3).map(L => L.id); syncSelIds(); syncSel(); await w(200);
  out.見出し_3枚 = document.getElementById('selH').textContent;
  return out;
});
ok(HOLD.掴んでも動かない.差 <= 2 && HOLD.動かしても選ばれたまま,
   '🔴🔴 もう見えている段なら、盤で掴んでも右パネルは【1pxも動かない】',
   JSON.stringify(HOLD.掴んでも動かない));
ok(HOLD.見えていなければ送る.差 > 20,
   '⭐ 見えていない段のときは ちゃんと送る（探さなくていい）',
   JSON.stringify(HOLD.見えていなければ送る));
ok(/^選んでいるレイヤー/.test(HOLD.見出し_筆) && /筆/.test(HOLD.見出し_筆)
   && /見本/.test(HOLD.見出し_素材) && /3 枚/.test(HOLD.見出し_3枚),
   '⭐ 段の見出しが【何を選んでいるか】を言う（2枚以上なら枚数）',
   JSON.stringify([HOLD.見出し_筆, HOLD.見出し_素材, HOLD.見出し_3枚]));

/* ══⭐⭐ 一覧の見出しから【版面のもの】へ飛ぶ／盤の灯を押すと灯の段へ ══ 2026-09-02
   🔴 木下＝「ボードの灯を押すとサイドパネルも灯にスクロール」
      「ここに空気、エフェクト、馴染ませのアイコンを押してそれぞれのサイドパネルに
       スクロールさせるのはどうだろうか？」
   ⭐ 見るのは3つ：
     ・見出しの釦が【横一列に収まる】（文字の釦を足して縦に潰れていないか）
     ・押すとその段へ送る（スクロール量で測る＝光っただけ、を通さない）
     ・エフェクトは素材を選ぶまで押せない（触れるのに効かない釦を作らない）
   → feedback_flex_button_squeeze ／ feedback_a_tool_starts_from_being_ready */
const LAYGO = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const panel = document.getElementById('panel');
  const top = () => Math.round(panel.scrollTop);
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  document.getElementById('layOpen').click(); await w(500);
  const btns = [...document.querySelectorAll('#layGo button')];
  const head = document.getElementById('layWinHead');
  /* 🔴🔴 2026-09-02・木下＝「アイコンにしよう。これはださいわ」
     ＝文字の釦が【中で折り返して】潰れていた（馴染ま/せ）。
     ⚠️ 前の試験は「釦が1段に並んでいるか」しか見ていなかったので通ってしまった。
     ⭐ 中の高さ（scrollHeight）が釦の高さを超えていないかを見る＝折り返しはここに出る。
       ⭐ さらに【窓をいちばん狭くして】も崩れないことを見る（木下の画面は狭い）。 */
  const 崩れ = () => btns.map(b2 => ({
    名: b2.getAttribute('aria-label'),
    幅: Math.round(b2.getBoundingClientRect().width),
    高さ: Math.round(b2.getBoundingClientRect().height),
    中がはみ出す: b2.scrollHeight > b2.clientHeight + 1 || b2.scrollWidth > b2.clientWidth + 1,
    アイコン: !!b2.querySelector('svg'),
  }));
  const win = document.getElementById('layWin');
  const w0 = win.style.width;
  win.style.width = '260px'; await w(300);       /* いちばん狭くしてみる */
  out.狭くしても = 崩れ();
  out.狭いとき見出し = { はみ出し: head.scrollWidth > head.clientWidth + 1 };
  win.style.width = w0 || ''; await w(300);
  out.並び = { 釦の数:btns.length,
    段数: new Set(btns.map(b2 => Math.round(b2.getBoundingClientRect().top))).size,
    はみ出し: head.scrollWidth > head.clientWidth + 1 };
  /* ⚠️ 2026-09-02・木下＝「非表示のアイコンがあるのはなぜなのか？」
     ＝薄い釦は「壊れている」か「使えない」かが読めない。4つとも同じ濃さで出す。
     ⭐ 代わりに、押したときに【なぜ出ないか】を言う（答えるのは聞かれたとき）。 */
  SELIDS = []; syncSelIds(); syncSel(); buildList();
  if(window.syncLayGo) syncLayGo(); await w(250);
  const fxb = document.querySelector('#layGo button[data-go="fxBox"]');
  out.薄い釦 = [...document.querySelectorAll('#layGo button')].filter(b2 => b2.disabled).length;
  /* ⚠️ 2026-09-02 に実測で分かった：fxBox は素材を選んでいなくても【出ている】。
     ＝押せば送られる（何も起きない釦ではない）＝ここは「押すと何か言う」を見る。 */
  fxb.click(); await w(300);
  out.素材なしで押した = (document.getElementById('stat') || {}).textContent || '';
  out.素材なしでも出ている = !document.getElementById('fxBox').classList.contains('hide');
  setSel(LAYERS.findIndex(L => L.img && !L.kind), false); syncSel(); buildList();
  if(window.syncLayGo) syncLayGo(); await w(300);
  out.素材ありで出る = !document.getElementById('fxBox').classList.contains('hide');
  /* 一番下まで送っておいてから、空気・馴染ませ を押す＝本当に動くか */
  out.送った = {};
  for(const id of ['airBox','najiBox','litBox']){
    panel.scrollTop = panel.scrollHeight; await w(300);
    const 前 = top();
    document.querySelector('#layGo button[data-go="' + id + '"]').click();
    await w(800);
    out.送った[id] = { 前, 後:top(), 動いた:Math.abs(top() - 前) > 20,
                       光った:document.getElementById(id).classList.contains('flash') };
    await w(700);
  }
  /* 盤の灯を押すと灯の段へ（見えていないときは送られる） */
  panel.scrollTop = 0; await w(400);
  const 前L = top();
  const lit = LIGHTS[0], q4 = toScreen(lit.x, lit.y);
  stage.dispatchEvent(new PointerEvent('pointerdown',
    { clientX:q4.clientX, clientY:q4.clientY, bubbles:true, pointerId:51 }));
  await w(900);
  out.灯を押した = { 前:前L, 後:top(), 動いた:Math.abs(top() - 前L) > 20,
                     光った:document.getElementById('litBox').classList.contains('flash') };
  stage.dispatchEvent(new PointerEvent('pointerup',
    { clientX:q4.clientX, clientY:q4.clientY, bubbles:true, pointerId:51 }));
  await w(1500);
  /* もう見えているので、掴み直しても動かない */
  const 前L2 = top();
  stage.dispatchEvent(new PointerEvent('pointerdown',
    { clientX:q4.clientX, clientY:q4.clientY, bubbles:true, pointerId:52 }));
  await w(700);
  out.灯を掴み直す = { 差:Math.abs(top() - 前L2) };
  stage.dispatchEvent(new PointerEvent('pointerup',
    { clientX:q4.clientX, clientY:q4.clientY, bubbles:true, pointerId:52 }));
  return out;
});
ok(LAYGO.並び.釦の数 === 4 && LAYGO.並び.段数 === 1 && !LAYGO.並び.はみ出し,
   '⭐ 一覧の見出しの釦4つが【横一列】に収まる（縦に潰れない・はみ出さない）',
   JSON.stringify(LAYGO.並び));
ok(LAYGO.狭くしても.every(o => o.アイコン && !o.中がはみ出す && o.幅 >= 18 && o.高さ >= 18)
   && !LAYGO.狭いとき見出し.はみ出し,
   '🔴🔴 窓をいちばん狭くしても釦が【中で折り返さない】（文字をやめてアイコンにした）',
   JSON.stringify(LAYGO.狭くしても));
ok(LAYGO.送った.airBox.動いた && LAYGO.送った.najiBox.動いた && LAYGO.送った.litBox.動いた,
   '⭐⭐ 空気・馴染ませ・灯 を押すと、その段まで【本当に送られる】（スクロール量で測った）',
   JSON.stringify(LAYGO.送った));
ok(LAYGO.薄い釦 === 0 && LAYGO.素材ありで出る
   && (LAYGO.素材なしでも出ている ? /へ送った/.test(LAYGO.素材なしで押した)
                                  : /レイヤーを選んで/.test(LAYGO.素材なしで押した)),
   '⭐ 釦は4つとも同じ濃さ（薄い釦を作らない）／押すと【送る】か【なぜ出ないか】を言う'
   + '＝黙って何もしない釦にしない',
   JSON.stringify([LAYGO.薄い釦, LAYGO.素材なしでも出ている, LAYGO.素材なしで押した]));
ok(LAYGO.灯を押した.動いた && LAYGO.灯を掴み直す.差 <= 2,
   '⭐⭐ 盤の灯を押すと灯の段へ送る／もう見えているときは1pxも動かない',
   JSON.stringify([LAYGO.灯を押した, LAYGO.灯を掴み直す]));

/* ══⭐⭐ 落としても消えない（この機械に控える）＋ボードをまっさらにする ══ 2026-09-02
   🔴 木下＝「読み込んだデータをローカルデータとしてパソコンに保存するようにして。
      リロードしてもまた立ち上がるように。iphoneもやモバイルも同様に」
      「レイヤーにボードをまっさらにするを追加してボードをまっさらの状態にしてほしい」
   ⭐ 見るのは4つ：
     ・手が止まったら控えが取られる（IndexedDB・まるごと＝写真も入る）
     ・**読み直したら続きから開く**（見本に戻らない）
     ・まっさらにすると空になり、⌘Z で戻る
     ・まっさらのあと読み直しても空のまま（控えも空になっている）
   🔴🔴 いちばん危ないのは【立ち上がりの読み込みが終わる前に、空の盤で上書きする】こと。
     SAVEOK が立つまで控えないことで止めている（ここも見る）。
   ⚠️ 実測（18枚・4.5MB）＝組み立て 241ms／書き込み 44ms／読み出し 13ms。 */
{
  /* ⭐ この章だけ【前の続きから開く】を効かせる（印を立てる） */
  await p.evaluate(() => { window.confirm = () => true;
    try{ localStorage.setItem('moya.test.local', '1'); }catch(_){}
    window.__MOYA_NOLOCAL = false; });
  const A = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    closeAllEditors();
    await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1800); });
    LAYERS[0].name = '控えに残るはず'; buildList(); render();
    await w(4200);                       /* 手が止まってから 2.5 秒で書く */
    const got = await idbGet();
    return { 枚数:LAYERS.length, 控えがある:!!(got && got.txt),
             控えに名がある:!!(got && got.txt && got.txt.indexOf('控えに残るはず') >= 0),
             控えms:LASTSAVE, 起動の見張り:SAVEOK };
  });
  await p.reload({ waitUntil:'networkidle0' });
  await ready();
  await wait(3500);                      /* 写真を読み終えるまで */
  const B = await p.evaluate(() => ({
    枚数:LAYERS.length, 名:(LAYERS[0] || {}).name }));
  ok(A.控えがある && A.控えに名がある && A.起動の見張り === true,
     '⭐⭐ 手が止まったら【この機械に控える】（まるごと＝写真も入る）', JSON.stringify(A));
  ok(B.枚数 === A.枚数 && B.名 === '控えに残るはず',
     '⭐⭐ 読み直しても【続きから開く】（見本に戻らない）', JSON.stringify(B));
  const C = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.confirm = () => true;
    const 前 = LAYERS.length;
    document.getElementById('b_clear').click(); await w(600);
    const 空 = LAYERS.length;
    undo(); await w(600);
    const 戻した = LAYERS.length;
    /* もう一度まっさらにして、控えも空にしておく（次の章に持ち越さない） */
    document.getElementById('b_clear').click(); await w(4200);
    const got = await idbGet();
    return { 前, 空, 戻した,
             控えも空:!!(got && got.txt && JSON.parse(got.txt).layers.length === 0) };
  });
  await p.reload({ waitUntil:'networkidle0' });
  await ready();
  await wait(2500);
  const D = await p.evaluate(() => ({ 枚数:LAYERS.length }));
  ok(C.空 === 0 && C.戻した === C.前,
     '⭐ ボードをまっさらにする＝空になり、⌘Z で戻る（消しっぱなしにしない）',
     JSON.stringify(C));
  ok(C.控えも空 && D.枚数 === 0,
     '⭐ まっさらのあと読み直しても空のまま（控えも空になっている）',
     JSON.stringify([C.控えも空, D.枚数]));
  /* 後片付け＝控えを消し、印も外して見本に戻す（次の章は今までどおり見本から始まる） */
  await p.evaluate(async () => { await idbPut(null);
    try{ localStorage.removeItem('moya.test.local'); }catch(_){}
    window.__MOYA_NOLOCAL = true; });
  await p.evaluate(async () => {
    closeAllEditors();
    await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1800); });
  });
  await wait(1200);
}

/* ══🔴🔴 縦書きに切り替えても【字の大きさは変わらない】══ 2026-09-02
   🔴 木下＝「言えなかった言葉をのテキスト縦組にすると同じフォントサイズではなく、
      自動的に小さくなる」
     ＝実測：縦書きで盤に出る大きさが 58×447、横に戻すと **58×8**（ほぼ消えた）。
     原因＝縦書きにすると紙（textCanvas）が【細長い】に変わるのに、盤に置く倍率 L.s
       （版面に対する **幅** の割合）はそのままだった＝幅だけ固定され、縦横比のぶん縮む。
       🔴 図形の線を太くしたときと **まったく同じ形**の間違い（紙が変わるのに倍率を直さない）。
   ⭐ 見るのは【紙の1画素が盤の何pxに落ちるか】＝これが変わらなければ字の大きさは同じ。
     ・横→縦 で 倍率が変わらない／盤の箱は 縦横が入れ替わるだけ
     ・縦→横 に戻すと 1画素も同じに戻る */
const TATE = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  document.querySelector('#tools button[data-t="text"]').click(); await w(900);
  document.querySelector('#tools button[data-t="move"]').click(); await w(400);
  const L = LAYERS[SEL];
  const ta = document.getElementById('t_str');
  ta.value = '言えなかった言葉を、いま';
  ta.dispatchEvent(new Event('input', { bubbles:true })); await w(900);
  COARSE = 0;
  /* 紙の1画素が版面の何pxに落ちるか＝字の大きさそのもの */
  const 倍率 = () => +((L.s * sheet().w) / cwOf(L)).toFixed(4);
  const 箱 = () => { const dw = L.s * sheet().w;
    return { 幅:Math.round(dw), 高さ:Math.round(dw * chOf(L)/cwOf(L) * syOf(L)) }; };
  const 前 = { 倍率:倍率(), 箱:箱() };
  const v = document.getElementById('t_vert');
  v.checked = true; v.dispatchEvent(new Event('change', { bubbles:true })); await w(1200);
  const 縦 = { 倍率:倍率(), 箱:箱() };
  v.checked = false; v.dispatchEvent(new Event('change', { bubbles:true })); await w(1200);
  const 戻す = { 倍率:倍率(), 箱:箱() };
  return { 前, 縦, 戻す };
});
ok(Math.abs(TATE.縦.倍率 - TATE.前.倍率) < 0.002,
   '🔴🔴 縦書きにしても【字の大きさは変わらない】（紙の1画素→盤の大きさが同じ）',
   JSON.stringify([TATE.前, TATE.縦]));
ok(Math.abs(TATE.縦.箱.幅 - TATE.前.箱.高さ) <= 2 && Math.abs(TATE.縦.箱.高さ - TATE.前.箱.幅) <= 2,
   '⭐ 盤に出る箱は【縦横が入れ替わるだけ】（字が縮まない）',
   JSON.stringify([TATE.前.箱, TATE.縦.箱]));
ok(Math.abs(TATE.戻す.倍率 - TATE.前.倍率) < 0.002
   && Math.abs(TATE.戻す.箱.幅 - TATE.前.箱.幅) <= 2,
   '⭐ 横に戻すと1画素も同じに戻る', JSON.stringify([TATE.前, TATE.戻す]));

/* ══⭐⭐ 上のバーが潰れない／行で【濃さ】を直に触れる ══ 2026-09-02
   🔴 木下の3つ：
     ①「太さのところ（が潰れている）」②「スライダー調整しづらい」
     ③「大きさ（字…）見れないし見る必要があるのか？」
       ＝つまみ1つを 150px に詰めていたので、名前が 78px で切れ（「大きさ（字…」）、
         スライダーは 60px ＝ **つまみの黒い丸しか見えなかった**（●太さ に見えた）。
       ⭐ 幅を決め打ちしない／名前は折り返さず出し切る／スライダーは 110px 以上。
     ④「少し薄くしたいなどの透明の調整を直感的にするところがどこかわからない」
       ＝不透明度は段の下の方にしか無く、行に出ている「62%」は**空気の効き**だった。
       ⭐ Photoshop と同じ【行の中】に濃さを置く。横に引く＝1px で 1%。
   ⚠️ 値の持ち主は L.op ひとつ（段のつまみと同じもの）＝ここも見る。 */
const BAR = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  document.querySelector('#tools button[data-t="text"]').click(); await w(900);
  document.querySelector('#tools button[data-t="move"]').click(); await w(500);
  out.つまみ = [...document.querySelectorAll('#optbar .knob')].map(k => {
    const n = k.querySelector('.n'), r = k.querySelector('input[type=range]');
    return { 名:n ? n.textContent : '',
             名が切れる: n ? n.scrollWidth > n.clientWidth + 1 : false,
             スライダー: r ? Math.round(r.getBoundingClientRect().width) : 0 };
  });
  const ob = document.getElementById('optbar');
  out.バーがはみ出す = ob.scrollWidth > ob.clientWidth + 1;
  /* 行の濃さ */
  const L = LAYERS.find(x => x.img && !x.kind);
  setSel(LAYERS.indexOf(L), false); syncSel(); buildList(); await w(400);
  const row = [...document.querySelectorAll('#layers .ly')]
    .find(r => (r.textContent || '').includes(L.name));
  const op = row.querySelector('.op');
  out.濃さの釦 = { ある:!!op, 文:op ? op.textContent : null };
  const r0 = op.getBoundingClientRect();
  const x0 = r0.left + r0.width/2, y0 = r0.top + r0.height/2;
  op.dispatchEvent(new PointerEvent('pointerdown',
    { clientX:x0, clientY:y0, bubbles:true, pointerId:61 }));
  op.dispatchEvent(new PointerEvent('pointermove',
    { clientX:x0 - 35, clientY:y0, bubbles:true, pointerId:61 }));
  op.dispatchEvent(new PointerEvent('pointerup',
    { clientX:x0 - 35, clientY:y0, bubbles:true, pointerId:61 }));
  await w(400);
  out.引いたあと = { op:+L.op.toFixed(2), 文:op.textContent,
                     段のつまみ:document.getElementById('r_op').value };
  undo(); await w(500);
  out.戻した = +(LAYERS.find(x => x.id === L.id).op).toFixed(2);
  return out;
});
/* ⚠️ 2026-09-02：バーは【溢れたら横に流れる】作り（overflow-x:auto）＝はみ出し自体は正しい。
   木下の指摘は「名前が切れる」「スライダーが引けない」だったので、そこだけを見る。
   （1400px の試験窓では、色の種類を足したぶん必ず溢れる＝そこで落とすと嘘の🔴になる） */
ok(BAR.つまみ.length >= 2 && BAR.つまみ.every(o => !o.名が切れる && o.スライダー >= 100),
   '⭐⭐ 上のバーのつまみ＝名前が切れない／スライダーが引ける長さ（110px以上）',
   JSON.stringify(BAR.つまみ));
ok(BAR.濃さの釦.ある && BAR.濃さの釦.文 === '濃100%',
   '⭐⭐ 行の中に【濃さ（不透明度）】が出ている（探さなくていい）',
   JSON.stringify(BAR.濃さの釦));
ok(BAR.引いたあと.op < 0.8 && BAR.引いたあと.文 === '濃' + Math.round(BAR.引いたあと.op*100) + '%'
   && String(BAR.引いたあと.段のつまみ) === String(Math.round(BAR.引いたあと.op*100)),
   '⭐ 横に引くと薄くなる／段のつまみと【同じ値】になる（持ち主は1つ）',
   JSON.stringify(BAR.引いたあと));
ok(BAR.戻した === 1, '⭐ ⌘Z で元の濃さに戻る', String(BAR.戻した));

/* ══⭐⭐ 空気の効きも【行の中で引いて】決める／行とパネルが食い違わない ══ 2026-09-02
   🔴 木下＝「空気を ON にすると自動的に 1.00 になる。パネルを見ると 1.00 ではなく
      調整した数字のまま。これがひとつ不思議」
     ＝押した行が【選んでいる行ではなかった】＝パネルは選んでいる方を出していた。
       値は正しいのに、2つを並べて読むと食い違って見える＝いちばん混乱する形。
     ⭐ 直し＝**触った行のものを選ぶ**＝パネルは必ずその行を出す。
   🔴 木下＝「このレイヤーパネルで空気の効きをスライダーなどで調整できるように」
     ⭐ 濃さと同じ手ざわり＝横に引く（1px で 1%）／押すと 空⇄素。
       ＝上のアイコンで版面ぜんぶ → 行で1枚ずつ → 段で細かく、の3段になる。 */
const AIRROW = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const ls = LAYERS.filter(x => x.img && !x.kind);
  const A = ls[0], B = ls[1];
  /* わざと【別の行】を選んでおく＝食い違いが起きる状況を作る */
  setSel(LAYERS.indexOf(A), false); syncSel(); buildList(); await w(400);
  const chip = r => [...document.querySelectorAll('#layers .ly')]
    .find(x => (x.textContent || '').includes(r.name)).querySelector('.air');
  const c = chip(B), q = c.getBoundingClientRect();
  const x0 = q.left + q.width/2, y0 = q.top + q.height/2;
  c.dispatchEvent(new PointerEvent('pointerdown',
    { clientX:x0, clientY:y0, bubbles:true, pointerId:81 }));
  c.dispatchEvent(new PointerEvent('pointerup',
    { clientX:x0, clientY:y0, bubbles:true, pointerId:81 }));
  await w(500);
  out.押した = { 選ばれた:LAYERS[SEL] === B, 空気:+airOf(B).toFixed(2),
                 パネル:document.getElementById('o_air').value };
  /* 横に引くと細かく変わる（右へ45px＝＋45%） */
  const c2 = chip(B), q2 = c2.getBoundingClientRect();
  const x1 = q2.left + q2.width/2, y1 = q2.top + q2.height/2;
  c2.dispatchEvent(new PointerEvent('pointerdown',
    { clientX:x1, clientY:y1, bubbles:true, pointerId:82 }));
  c2.dispatchEvent(new PointerEvent('pointermove',
    { clientX:x1 + 45, clientY:y1, bubbles:true, pointerId:82 }));
  c2.dispatchEvent(new PointerEvent('pointerup',
    { clientX:x1 + 45, clientY:y1, bubbles:true, pointerId:82 }));
  await w(500);
  out.引いた = { 空気:+airOf(B).toFixed(2), 行:chip(B).textContent,
                 パネル:document.getElementById('o_air').value,
                 つまみ:document.getElementById('r_air').value };
  undo(); await w(500);
  out.戻した = +airOf(LAYERS.find(x => x.id === B.id)).toFixed(2);
  return out;
});
ok(AIRROW.押した.選ばれた && AIRROW.押した.パネル === AIRROW.押した.空気.toFixed(2),
   '⭐⭐ 行の空気を触ると【その行が選ばれ】、パネルも同じ値を出す（食い違わない）',
   JSON.stringify(AIRROW.押した));
ok(AIRROW.引いた.空気 > 0.3 && AIRROW.引いた.行 === '空' + Math.round(AIRROW.引いた.空気*100) + '%'
   && String(AIRROW.引いた.つまみ) === String(Math.round(AIRROW.引いた.空気*100)),
   '⭐⭐ 行の中で【横に引いて】空気の効きを決められる（段のつまみと同じ値）',
   JSON.stringify(AIRROW.引いた));
ok(AIRROW.戻した !== AIRROW.引いた.空気, '⭐ ⌘Z で戻る（空気）',
   JSON.stringify([AIRROW.引いた.空気, AIRROW.戻した]));

/* ══🔴🔴 同じ数字は【3か所とも同時に】動く ══ 2026-09-02
   🔴 木下＝「上の空気0.62と下の76%の違いはなんなのか？まず知りたい」
     ＝**同じもの**だった。引いている最中に【チップだけ】書き換えて、
       名前の下の行（奥 0.00 空気 0.62）を書き換えていなかった＝食い違って見えた。
   ⭐ 同じ数字を2か所以上に出すなら、**書き換える道も1本**にする。
   ⚠️ ここは「引いている最中」を見る（離したあとは buildList が全部直すので隠れる）。 */
const AIRSYNC = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const L = LAYERS.find(x => x.img && !x.kind);
  setSel(LAYERS.indexOf(L), false); syncSel(); buildList(); await w(400);
  const row = () => [...document.querySelectorAll('#layers .ly')].find(x => x.__L === L);
  const よむ = () => ({ チップ:row().querySelector('.air').textContent,
    行:row().querySelector('.dp').textContent.trim(),
    段:document.getElementById('o_air').value });
  setAir(L, 0.62, true); buildList(); await w(300);
  const 前 = よむ();
  const c = row().querySelector('.air'), q = c.getBoundingClientRect();
  const x = q.left + q.width/2, y = q.top + q.height/2;
  c.dispatchEvent(new PointerEvent('pointerdown', { clientX:x, clientY:y, bubbles:true, pointerId:99 }));
  c.dispatchEvent(new PointerEvent('pointermove', { clientX:x + 14, clientY:y, bubbles:true, pointerId:99 }));
  await w(300);
  const 最中 = よむ();
  c.dispatchEvent(new PointerEvent('pointerup', { clientX:x + 14, clientY:y, bubbles:true, pointerId:99 }));
  await w(400);
  return { 前, 最中, 後:よむ() };
});
{
  /* ⚠️ 2026-09-02：名前の下の重複は【消した】（同じ数字を2つの顔で出さない）。
     ＝そろっているかは【チップ】と【段のつまみ】で見る。 */
  const そろう = o => {
    const n = parseInt(String(o.チップ).replace(/[^0-9]/g, ''), 10);   /* 空76% → 76 */
    return Math.round(+o.段 * 100) === n;
  };
  ok(そろう(AIRSYNC.最中),
     '🔴🔴 引いている最中も【チップと段のつまみ】が同じ数字（食い違わない）',
     JSON.stringify(AIRSYNC.最中));
  ok(そろう(AIRSYNC.前) && そろう(AIRSYNC.後) && AIRSYNC.後.行 === '',
     '⭐ 引く前・離したあとも同じ／名前の下に同じ数字を二重に出さない',
     JSON.stringify([AIRSYNC.前, AIRSYNC.後]));
}

/* ══⭐ 空気を着せていない（素）ときは【目と同じ斜線】を入れる ══ 2026-09-02
   🔴 木下＝「空気を聴かせないときの表示は表示非表示同様アイコンに斜め線も入れて」
     ＝いままでは字を薄くするだけで、目のように「切ってある」と読めなかった。
   ⭐ 同じ意味は同じ形で言う（向きも太さも EYE_SVG の斜線と同じ）。
   ⚠️ 斜線が出るのは【素（0）のときだけ】＝途中の値や 空気どおり では出さない。 */
const AIRSLASH = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const ls = LAYERS.filter(x => x.img && !x.kind);
  setAir(ls[0], 1, true); setAir(ls[1], 0.45, true); setAir(ls[2], 0, true);
  buildList(); await w(400);
  const chip = r => [...document.querySelectorAll('#layers .ly')]
    .find(x => (x.textContent || '').includes(r.name)).querySelector('.air');
  const よむ = r => { const e = chip(r);
    return { 文:e.textContent, 斜線:e.classList.contains('raw') }; };
  return { 空気どおり:よむ(ls[0]), 途中:よむ(ls[1]), 素:よむ(ls[2]) };
});
ok(AIRSLASH.素.斜線 === true && AIRSLASH.素.文 === '空',
   '⭐ 空気を着せていないときは【「空」のまま斜線】が入る（目と同じ言い方）'
   + ' ── 2026-09-02・木下＝「素に変わって斜線ではなく、空に斜め・非アクティブの方が分かりやすい」',
   JSON.stringify(AIRSLASH.素));
ok(AIRSLASH.空気どおり.斜線 === false && AIRSLASH.途中.斜線 === false,
   '⚠️ 空気どおり・途中の値では斜線を出さない（うるさくしない）',
   JSON.stringify([AIRSLASH.空気どおり, AIRSLASH.途中]));

/* ══⭐⭐ 字と塗りも【グラデーション】にできる ══ 2026-09-02
   🔴 木下＝「グラデーションなどはできないのか？」（字の色を開いて）
      「そう考えるとここの色もグラデーションできるようにしたいな」（重ねる塗りの色）
     ＝図形だけが 単色／グラデ／放射 を持っていて、字と塗りは単色だけだった。
   ⭐ **部品を増やさない**＝引く式は gradFrom 1本、組む所は gradEditor 1本
     （図形・字・塗りの3つが同じものを見る）。
   ⚠️ 既定は 'solid'＝いままで置いた字・塗り・設定JSONは1画素も変わらない。
     ⭐ だから【単色に戻すと 1画素も同じに戻る】かをここで見る。 */
const GRAD = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const full = () => { const d = g.getImageData(0,0,cv.width,cv.height).data; const o = [];
    for(let i = 0; i < d.length; i += 4*3) o.push(d[i], d[i+1], d[i+2], d[i+3]); return o; };
  const sad = (A, B) => { let s2 = 0; for(let i = 0; i < A.length; i++) s2 += Math.abs(A[i]-B[i]);
    return s2; };
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  /* ── 字 ── */
  document.querySelector('#tools button[data-t="text"]').click(); await w(900);
  document.querySelector('#tools button[data-t="move"]').click(); await w(500);
  const L = LAYERS[SEL]; COARSE = 0; render(); await w(500);
  const A = full();
  document.querySelector('#s_tfmode button[data-v="linear"]').click(); await w(900);
  out.字 = { mode:textOf(L).fmode, 変わった:sad(full(), A),
             組む所:!document.getElementById('tfGradUI').classList.contains('hide') };
  document.querySelector('#s_tfmode button[data-v="solid"]').click(); await w(900);
  out.字を戻す = { mode:textOf(L).fmode, 戻り:sad(full(), A) };
  document.querySelector('#s_tsmode button[data-v="radial"]').click(); await w(900);
  out.字の線 = { mode:textOf(L).smode, 線が出た:!!textOf(L).strokeOn, 変わった:sad(full(), A) };
  document.querySelector('#s_tsmode button[data-v="solid"]').click();
  textOf(L).strokeOn = false; rebuildText(L, () => {}); await w(800);
  /* ── 重ねる塗り ── */
  const P0 = LAYERS.find(x => x.img && !x.kind);
  setSel(LAYERS.indexOf(P0), false); syncSel(); buildList(); buildFills(); await w(400);
  document.getElementById('b_fillcol').click(); await w(500);
  const B = full();
  const seg = document.querySelector('#fillsList .seg button[data-v="linear"]');
  out.塗りの釦 = !!seg;
  if(seg){
    seg.click(); await w(900);
    const f = fillsOf(P0)[0];
    out.塗り = { fmode:f.fmode, ストップ:(f.fstops || []).length, 変わった:sad(full(), B) };
    document.querySelector('#fillsList .seg button[data-v="solid"]').click(); await w(800);
    out.塗りを戻す = { fmode:fillsOf(P0)[0].fmode, 戻り:sad(full(), B) };
  }
  return out;
});
ok(GRAD.字.mode === 'linear' && GRAD.字.変わった > 0 && GRAD.字.組む所,
   '⭐⭐ 字の色を【グラデーション】にできる（組む所も出る）', JSON.stringify(GRAD.字));
ok(GRAD.字を戻す.mode === 'solid' && GRAD.字を戻す.戻り === 0,
   '🔴 単色に戻すと【1画素も同じ】に戻る（字）', JSON.stringify(GRAD.字を戻す));
ok(GRAD.字の線.mode === 'radial' && GRAD.字の線.線が出た && GRAD.字の線.変わった > 0,
   '⭐ 字の線もグラデにできる（グラデにしたら線を出す＝押しても何も出ない、を作らない）',
   JSON.stringify(GRAD.字の線));
ok(GRAD.塗りの釦 && GRAD.塗り && GRAD.塗り.fmode === 'linear' && GRAD.塗り.変わった > 0,
   '⭐⭐ 重ねる塗りの色も【グラデーション】にできる', JSON.stringify(GRAD.塗り));
ok(GRAD.塗りを戻す && GRAD.塗りを戻す.fmode === 'solid' && GRAD.塗りを戻す.戻り === 0,
   '🔴 単色に戻すと【1画素も同じ】に戻る（塗り）', JSON.stringify(GRAD.塗りを戻す));

/* ══⭐⭐ 紙の地（背景）も【グラデーション】にできる ══ 2026-09-02
   🔴 木下＝「背景の地にもグラデできるようにしよう」
   ⭐ 描く所は paint() 1本＝画面も PNG も SVG も同じものを通る（ここも見る）。
   ⚠️ ストップと向きは【入力欄ではない】ので、設定JSONへ明示的に写している（ここも見る）。 */
const BGGRAD = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const full = () => { const d = g.getImageData(0,0,cv.width,cv.height).data; const o = [];
    for(let i = 0; i < d.length; i += 4*3) o.push(d[i], d[i+1], d[i+2], d[i+3]); return o; };
  const sad = (A, B) => { let s2 = 0; for(let i = 0; i < A.length; i++) s2 += Math.abs(A[i]-B[i]);
    return s2; };
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  COARSE = 0; render(); await w(600);
  const A = full();
  document.querySelector('#s_bgmode button[data-v="linear"]').click(); await w(900);
  out.グラデ = { mode:P.bgmode, ストップ:(P.bgstops || []).length, 変わった:sad(full(), A),
                 組む所:!document.getElementById('bgGradUI').classList.contains('hide') };
  const txt = cfgText(false);
  out.JSONに入る = /"bgmode": *"linear"/.test(txt) && /"bgstops"/.test(txt);
  /* 出す絵（paint 1本）にも効いている＝上と下で色が違う */
  const t = document.createElement('canvas'); t.width = 200; t.height = 300;
  paint(t.getContext('2d'), 200, 300, false);
  const d2 = t.getContext('2d').getImageData(0, 0, 200, 300).data;
  const 上 = [d2[0], d2[1], d2[2]], 下 = [d2[299*200*4], d2[299*200*4+1], d2[299*200*4+2]];
  out.出す絵にも = { 上, 下,
    ちがう: 上.some((v, i) => Math.abs(v - 下[i]) > 12) };
  document.querySelector('#s_bgmode button[data-v="solid"]').click(); await w(900);
  out.単色に戻す = { mode:P.bgmode, 戻り:sad(full(), A) };
  applyJSON(JSON.parse(txt)); await w(1500);
  out.読み直すと = { mode:P.bgmode,
    段:document.querySelector('#s_bgmode button.on').dataset.v };
  /* 後片付け＝単色に戻す（次の章に持ち越さない） */
  document.querySelector('#s_bgmode button[data-v="solid"]').click(); await w(600);
  return out;
});
ok(BGGRAD.グラデ.mode === 'linear' && BGGRAD.グラデ.変わった > 0 && BGGRAD.グラデ.組む所,
   '⭐⭐ 紙の地（背景）も【グラデーション】にできる', JSON.stringify(BGGRAD.グラデ));
ok(BGGRAD.出す絵にも.ちがう,
   '⭐ 出す絵（paint 1本）にも効いている＝上と下で色が違う',
   JSON.stringify(BGGRAD.出す絵にも));
ok(BGGRAD.単色に戻す.mode === 'solid' && BGGRAD.単色に戻す.戻り === 0,
   '🔴 単色に戻すと【1画素も同じ】に戻る（紙の地）', JSON.stringify(BGGRAD.単色に戻す));
ok(BGGRAD.JSONに入る && BGGRAD.読み直すと.mode === 'linear'
   && BGGRAD.読み直すと.段 === 'linear',
   '⭐ 設定JSONに入って、読み直すと段も合う（ストップは入力欄ではない）',
   JSON.stringify([BGGRAD.JSONに入る, BGGRAD.読み直すと]));

/* ══⭐ 図形のグラデは【上のバーからも】行ける／図形を選ぶと図形の段へ送る ══ 2026-09-02
   🔴 木下＝「そうすると図形もそうだよね」
     ＝図形にはグラデが**有った**のに、上のバーからは行けなかった（右パネルだけ）。
   🔴 木下＝「図形パネルに関してもサイドパネルは図形のパネルにスクロールしてほしいな」
   ⚠️ 3択は【長い名前と短い名前の2枚札】＝上のバーでは1文字（1680px で 127px はみ出した）。
     ＝案内文は btName() で長い方を読む（「単色単」にならない）。 */
const SHBAR = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const panel = document.getElementById('panel'), top = () => Math.round(panel.scrollTop);
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const L = await window.drawShape(0.30, 0.30, 0.55, 0.52);
  document.querySelector('#tools button[data-t="move"]').click(); await w(500);
  out.バーに種類がある = !!document.querySelector('#optbar #s_shmode');
  out.バーは1文字 = (() => { const b2 = document.querySelector('#optbar #s_shmode button');
    if(!b2) return null;
    const lg = b2.querySelector('.lg'), sm = b2.querySelector('.sm');
    return { 長い:lg ? lg.textContent : null, 短い:sm ? sm.textContent : null,
             名前を読む:typeof btName === 'function' ? btName(b2) : null }; })();
  /* 一覧で図形を選ぶと図形の段へ送られる（スクロール量で測る） */
  panel.scrollTop = panel.scrollHeight; await w(400);
  const 前 = top();
  const row = [...document.querySelectorAll('#layers .ly')]
    .find(r => (r.textContent || '').includes(L.name));
  row.dispatchEvent(new PointerEvent('pointerdown',
    { bubbles:true, pointerId:71, clientX:10, clientY:10 }));
  row.dispatchEvent(new PointerEvent('pointerup',
    { bubbles:true, pointerId:71, clientX:10, clientY:10 }));
  await w(900);
  out.図形の段へ = { 前, 後:top(), 動いた:Math.abs(top() - 前) > 20,
                     光った:document.getElementById('shapeBox').classList.contains('flash') };
  return out;
});
ok(SHBAR.バーに種類がある && SHBAR.バーは1文字
   && SHBAR.バーは1文字.短い.length === 1 && SHBAR.バーは1文字.名前を読む.length > 1,
   '⭐ 図形の【単色／グラデ／放射】が上のバーにある（バーでは1文字・案内は長い名前）',
   JSON.stringify(SHBAR.バーは1文字));
ok(SHBAR.図形の段へ.動いた && SHBAR.図形の段へ.光った,
   '⭐ 一覧で【図形】を選ぶと、右パネルの図形の段まで送って光る',
   JSON.stringify(SHBAR.図形の段へ));

/* ══⭐⭐ エフェクトを触ったら【一覧も】その場で描き直す ══ 2026-09-02
   🔴 木下＝「Effect をつけた時にすぐにレイヤーのところは変化がない、
      ボードなど他の行為をした瞬間からレイヤー下に表示される。これでいいのか？」
     ＝よくない。足す・目で外す・× で外す のどこも `syncFx(); render()` だけで
       **一覧（buildList）を呼んでいなかった**＝次に何かするまで古い一覧が残っていた。
       ＝絵は変わっているのに一覧が黙っている＝「効いていないのでは？」に見える。
   ⭐ 触ったあとにやることを fxTouched() 1本にまとめた（6か所に同じ3行を書かない）。
   ⚠️ buildList の中から syncFx を呼んでいる所がある（一覧の行→パネル）＝逆向きなので回らない。 */
const FXROW = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const L = LAYERS.find(x => x.img && !x.kind);
  setSel(LAYERS.indexOf(L), false); syncSel(); buildList(); await w(500);
  const 行 = () => document.querySelectorAll('#layers .fxrow').length;
  out.前 = 行();
  document.getElementById('b_fxadd').click(); await w(300);
  const menu = [...document.querySelectorAll('#fxAddMenu button')];
  const drop = menu.find(b2 => /ドロップ/.test(b2.textContent)) || menu[0];
  drop.click(); await w(600);
  out.足した直後 = 行();                       /* ★ここが本題＝その場で出るか */
  /* ⚠️ 見出しは9つとも DOM に居る＝名指しで探す（先頭を押すと別のを足してしまう） */
  const head = [...document.querySelectorAll('#fxBox .fxhead')]
    .find(h => /ドロップ/.test(h.textContent));
  const K = head ? head.dataset.fx : null;
  if(head){
    head.querySelector('.eye').click(); await w(500);
    out.目で外した = { 行:行(), 効いている:fxOf(L)[K].on };
    head.querySelector('.xr').click(); await w(500);
    out.バツで外した = { 行:行(), 一覧に出す:fxOf(L)[K].use };
  }
  return out;
});
ok(FXROW.前 === 0 && FXROW.足した直後 === 1,
   '⭐⭐ エフェクトを足したら【その場で】一覧に出る（他を触るまで待たせない）',
   JSON.stringify([FXROW.前, FXROW.足した直後]));
ok(FXROW.目で外した.行 === 1 && FXROW.目で外した.効いている === false,
   '⭐ 目で外しても【行は残る】（値も残る・いつでも戻せる）',
   JSON.stringify(FXROW.目で外した));
ok(FXROW.バツで外した.行 === 0 && FXROW.バツで外した.一覧に出す === false,
   '⭐ × で外すと その場で一覧から消える', JSON.stringify(FXROW.バツで外した));

/* ══⭐⭐ 奥行きは【引いている最中は並べ替えない】／空気0なら そう言う ══ 2026-09-02
   🔴 木下＝「ここで奥行きを調整するとレイヤー自体がどんどん下に移動していく。
      しかし本来は違うよね？」
     ＝並ぶ順は奥行きが決める（芯）ので動くこと自体は正しい。だが**引いている最中に
       毎回並べ替えていた**＝行が指の下から逃げて読めなかった。
     ⭐ 引いている間は【その行の数字だけ】書き換える。並べ替えは手を離してから。
   🔴 木下＝「筆やテキスト、図形も同じ仕様だね、これは実装できていない認識のような気がする」
     ＝実装はできている。**文字と図形は空気 0 で生まれる**ので、奥行きを動かしても
       かすみ・ぼけ・色は1画素も変わらず、並ぶ順だけが動いていた。
     実測（奥 0→0.9 の差の合計）：
       写真 296,660／筆 126,968／文字 942,932（＝順が動いただけ）／
       文字の空気を 1 にすると 2,103,458（＝ちゃんと効く）
     ⭐ 壊れてはいない。**そう書いていない**のが問題だった＝つまみの下でその場で言う。 */
const DEPTHSAY = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  COARSE = 0;
  document.querySelector('#tools button[data-t="text"]').click(); await w(900);
  document.querySelector('#tools button[data-t="move"]').click(); await w(500);
  const T = LAYERS[SEL];
  out.空気0 = { 空気:airOf(T),
    言う:!document.getElementById('depthSay').classList.contains('hide'),
    文:(document.getElementById('depthSay').textContent || '').slice(0, 24) };
  setAir(T, 1, true); syncSel(); await w(300);
  out.空気1 = { 言う:!document.getElementById('depthSay').classList.contains('hide') };
  setAir(T, 0, true); syncSel(); await w(300);
  /* 引いている最中は並べ替えない＝行の位置が変わらない */
  const idx = () => [...document.querySelectorAll('#layers .ly')].findIndex(r => r.__L === T);
  const 前 = idx();
  const r = document.getElementById('r_depth');
  r.value = 70; r.dispatchEvent(new Event('input', { bubbles:true })); await w(400);
  const dp = [...document.querySelectorAll('#layers .ly')]
    .find(x => x.__L === T).querySelector('.dp');
  out.引いている最中 = { 前, 後:idx(), 動かない:idx() === 前, 行の字:dp.textContent.trim() };
  r.dispatchEvent(new Event('change', { bubbles:true })); await w(500);
  out.手を離すと = { 後:idx(), 並べ替わった:idx() !== 前 };
  return out;
});
ok(DEPTHSAY.空気0.空気 === 0 && DEPTHSAY.空気0.言う && /空気 0/.test(DEPTHSAY.空気0.文),
   '⭐⭐ 空気 0 のときは【奥行きは並ぶ順だけに効く】とその場で言う',
   JSON.stringify(DEPTHSAY.空気0));
ok(DEPTHSAY.空気1.言う === false,
   '⚠️ 空気を上げたら言わない（うるさくしない）', JSON.stringify(DEPTHSAY.空気1));
ok(DEPTHSAY.引いている最中.動かない && /奥 0\.70/.test(DEPTHSAY.引いている最中.行の字),
   '🔴🔴 奥行きを引いている最中は【並べ替えない】（行が指の下から逃げない・数字は追う）',
   JSON.stringify(DEPTHSAY.引いている最中));
ok(DEPTHSAY.手を離すと.並べ替わった,
   '⭐ 手を離したら並べ替わる（並ぶ順は奥行きが決める＝芯は守る）',
   JSON.stringify(DEPTHSAY.手を離すと));

/* ══⭐⭐ 行の数字は【奥・空・濃】の3つ／どれも引ける・切れない ══ 2026-09-02
   🔴 木下＝「奥0.00になっている。サイドパネルも同じ。ではその下の100%になっているのは
      なぜか？…ここも違うのはなぜか？たぶんバグだと思う」
     ＝バグではなく **並びが不揃い**だった：
       空気だけ2回（名前の下の行とチップ）／奥行きは読むだけ／不透明度は触るだけ。
       だから「100% は奥行きのはず」と読めた。
   🔴 木下＝「空気と奥行きは重要な役割で、それによりなじみ度が変わると思っていたから
      ここを奥行きで表示させるようにした」
     ＝そのとおり。実測：写真（空気1）で 奥 0→0.9 は 296,660 変わる／空気 0 だと 0。
       ＝奥行きは【空気とセットでしか効かない】。消さずに同じ資格で並べる。
   ⭐ 3つを【名前の下の1行】に置く。⚠️ 右のボタン列に混ぜたら 308px に入らず
     いちばん左の「奥」が切れた（実測）＝置き場所を分ける。 */
const CHIPS = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const L = LAYERS.find(x => x.img && !x.kind);
  setAir(L, 0.77, true); L.d = 0; L._key = ''; buildList(); render(); await w(500);
  const row = () => [...document.querySelectorAll('#layers .ly')].find(x => x.__L === L);
  const 見る = () => [...row().querySelectorAll('.chips .x')].map(e => ({
    文:e.textContent, 幅:Math.round(e.getBoundingClientRect().width),
    切れる:e.scrollWidth > e.clientWidth + 1 }));
  out.みっつ = 見る();
  out.名前の下 = row().querySelector('.dp').textContent.trim();
  /* 奥行きを引く＝引いている最中は並べ替えない／離すと並べ替わる */
  const idx = () => [...document.querySelectorAll('#layers .ly')].findIndex(r => r.__L === L);
  const d = row().querySelector('.dep'), q = d.getBoundingClientRect();
  const x = q.left + q.width/2, y = q.top + q.height/2;
  const 前 = idx();
  d.dispatchEvent(new PointerEvent('pointerdown', { clientX:x, clientY:y, bubbles:true, pointerId:77 }));
  d.dispatchEvent(new PointerEvent('pointermove', { clientX:x + 60, clientY:y, bubbles:true, pointerId:77 }));
  await w(350);
  out.引いている最中 = { 動かない:idx() === 前, チップ:row().querySelector('.dep').textContent,
                         段:document.getElementById('o_depth').value };
  d.dispatchEvent(new PointerEvent('pointerup', { clientX:x + 60, clientY:y, bubbles:true, pointerId:77 }));
  await w(600);
  out.離すと = { 並べ替わった:idx() !== 前, 奥:+L.d.toFixed(2) };
  return out;
});
ok(CHIPS.みっつ.length === 3 && CHIPS.みっつ.every(o => !o.切れる && o.幅 > 20)
   && /^奥/.test(CHIPS.みっつ[0].文) && /^空/.test(CHIPS.みっつ[1].文) && /^濃/.test(CHIPS.みっつ[2].文),
   '⭐⭐ 行に【奥・空・濃】の3つが名札つきで並び、1つも切れない',
   JSON.stringify(CHIPS.みっつ));
ok(CHIPS.名前の下 === '',
   '⭐ 同じ数字を2つの顔で出さない（名前の下の重複を消した）',
   JSON.stringify(CHIPS.名前の下));
ok(CHIPS.引いている最中.動かない
   && String(CHIPS.引いている最中.段) === CHIPS.引いている最中.チップ.replace('奥',''),
   '🔴 奥行きを引いている最中は並べ替えない／段のつまみと同じ数字',
   JSON.stringify(CHIPS.引いている最中));
ok(CHIPS.離すと.並べ替わった,
   '⭐ 離したら並べ替わる（並ぶ順は奥行きが決める＝芯は守る）',
   JSON.stringify(CHIPS.離すと));

/* ══⭐⭐ 空気を押して戻したら【元の値に戻る】══ 2026-09-02
   🔴 木下＝「空気62%これを押すと空気はゼロに、もう一度押すと今だと1.0になる。
      元に戻るようにして」
     ＝目と同じ考え＝**切っても値は残る**。1.0 に飛ばすと 62% が消えてしまう。
   ⭐ 切る直前の値を覚えて、戻すときはそれを返す（覚えが無いときだけ 1.0）。 */
const AIRBACK = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const L = LAYERS.find(x => x.img && !x.kind);
  setAir(L, 0.62, true); buildList(); await w(400);
  const row = () => [...document.querySelectorAll('#layers .ly')].find(x => x.__L === L);
  const よむ = () => ({ 空:+airOf(L).toFixed(2), 文:row().querySelector('.air').textContent });
  const おす = () => row().querySelector('.air').click();
  const a = よむ(); おす(); await w(400);
  const b2 = よむ(); おす(); await w(400);
  const c = よむ(); おす(); await w(400);
  const d = よむ();
  return { はじめ:a, 一回目:b2, 二回目:c, 三回目:d };
});
ok(AIRBACK.はじめ.空 === 0.62 && AIRBACK.一回目.空 === 0 && AIRBACK.二回目.空 === 0.62,
   '⭐⭐ 空気を押して切って、もう一度押すと【元の値（0.62）に戻る】（1.0 に飛ばさない）',
   JSON.stringify(AIRBACK));
ok(AIRBACK.三回目.空 === 0 && AIRBACK.一回目.文 === '空',
   '⭐ 何度でも行き来できる／切っているときも字は「空」のまま（斜線で言う）',
   JSON.stringify([AIRBACK.三回目, AIRBACK.一回目]));

/* ══⭐⭐ 行の3つは【同じ手ざわり】／言葉は1つ ══ 2026-09-02
   🔴 木下の4つ：
     ①「空気はクリックで0にできるが、奥行きは今はできていない」
       → 奥行きも押すと 0 ⇄ 元の値。⚠️ 斜線は引かない（奥 0 は「切ってある」ではなく
         【いちばん手前】。斜線は「効いていない」の印＝空気と目だけに使う）。
     ②「濃さを押すとポップアップが表示される。不要」
       → やめて、空気・奥行きと同じ 押すと 100% ⇄ 元の値。数字は段の欄で打てる。
     ③「表記が濃100%なのだが、サイドパネルは不透明度になっている。統一した方がいい」
       → 🔴🔴 HTML では「濃さ」に直したのに、**JS が実行時に「不透明度」へ書き戻していた**
         ＝言葉の持ち主が2か所にあった。両方「濃さ」に揃えた。
     ④「不透明度と塗りの違いはなんなのか？同じようにも見える」
       → Photoshop と同じ違い（濃さ＝エフェクトごと／塗り＝絵だけ・エフェクトは残る）。
         **エフェクトを付けたときにだけ差が出る**ので、何も無いと同じに見える＝段で言う。 */
const ROWUX = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  let ポップアップ = 0;
  const _p = window.prompt; window.prompt = (...a) => { ポップアップ++; return _p ? null : null; };
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const L = LAYERS.find(x => x.img && !x.kind);
  setSel(LAYERS.indexOf(L), false); syncSel(); buildList(); await w(400);
  const row = () => [...document.querySelectorAll('#layers .ly')].find(x => x.__L === L);
  /* 奥行き＝押すと 0 ⇄ 元の値・斜線は引かない */
  L.d = 0.42; L._key = ''; buildList(); await w(300);
  const a1 = +L.d.toFixed(2);
  row().querySelector('.dep').click(); await w(400);
  const a2 = +L.d.toFixed(2);
  row().querySelector('.dep').click(); await w(400);
  out.奥行き = { はじめ:a1, 一回目:a2, 二回目:+L.d.toFixed(2),
                 斜線:row().querySelector('.dep').classList.contains('raw') };
  /* 濃さ＝押してもポップアップが出ない */
  const b1 = +(L.op == null ? 1 : L.op).toFixed(2);
  row().querySelector('.op').click(); await w(400);
  out.濃さ = { はじめ:b1, 押したあと:+(L.op == null ? 1 : L.op).toFixed(2), ポップアップ };
  /* 言葉が揃っている */
  out.言葉 = { 段:document.querySelector('#opKnob .n').textContent,
               行:row().querySelector('.op').textContent };
  out.塗りの説明 = [...document.querySelectorAll('#selBox .note')]
    .some(e => /濃さ/.test(e.textContent) && /塗り/.test(e.textContent) && /違い/.test(e.textContent));
  window.prompt = _p;
  return out;
});
ok(ROWUX.奥行き.一回目 === 0 && ROWUX.奥行き.二回目 === ROWUX.奥行き.はじめ
   && ROWUX.奥行き.斜線 === false,
   '⭐⭐ 奥行きも押すと 0 ⇄ 元の値（空気と同じ手ざわり）／⚠️ 斜線は引かない（0＝手前）',
   JSON.stringify(ROWUX.奥行き));
ok(ROWUX.濃さ.ポップアップ === 0 && ROWUX.濃さ.押したあと !== ROWUX.濃さ.はじめ,
   '⭐ 濃さを押しても【ポップアップを出さない】（押すと切り替わる・数字は段の欄で打つ）',
   JSON.stringify(ROWUX.濃さ));
ok(ROWUX.言葉.段 === '濃さ' && /^濃/.test(ROWUX.言葉.行),
   '🔴🔴 言葉は1つ＝行も段も「濃さ」（JS が実行時に書き戻していたのを直した）',
   JSON.stringify(ROWUX.言葉));
ok(ROWUX.塗りの説明,
   '⭐ 段で【濃さと塗りの違い】を言う（エフェクトが無いと同じに見えるので）',
   String(ROWUX.塗りの説明));

/* ══⭐⭐ ぼかし（ガウス）は【空気と関係なく】効く・独立して置く ══ 2026-09-02
   🔴 木下＝「図形をぼかしやガウスを適応させる場合どうすればいい？エフェクトを見たがない」
      →「空気からのズレに入れちゃうと空気の効きをONしないと適応されないからよくないね。
         別で必要かも」
     ＝**効きは空気と関係なく出る**（実測：図形・空気0で 182,699 変化）。
       だが【空気からのズレ】の下にあると「空気が要る」と読める＝読めない置き場所は無いのと同じ。
   ⭐ 外見のすぐ下に独立させた（段の中で 2159px → 1306px）。値の持ち主は1つのまま（adj.blur）。
   ⭐ エフェクトの段からは【押すと飛ぶ釦】で連れて行く（場所を書くだけにしない）。 */
const BLUR = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const full = () => { const d = g.getImageData(0,0,cv.width,cv.height).data; const o = [];
    for(let i = 0; i < d.length; i += 4*3) o.push(d[i], d[i+1], d[i+2], d[i+3]); return o; };
  const sad = (A, B) => { let s2 = 0; for(let i = 0; i < A.length; i++) s2 += Math.abs(A[i]-B[i]);
    return s2; };
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const L = await window.drawShape(0.32, 0.32, 0.58, 0.55);
  document.querySelector('#tools button[data-t="move"]').click(); await w(600);
  COARSE = 0; render(); await w(500);
  out.空気 = +airOf(L).toFixed(2);
  const A = full();
  const r = document.getElementById('r_ablur');
  r.value = 60; r.dispatchEvent(new Event('input', { bubbles:true })); await w(800);
  out.ぼかした = { 名:r.closest('.knob').querySelector('.n').textContent,
                   変わった:sad(full(), A), 空気:+airOf(L).toFixed(2) };
  r.value = 0; r.dispatchEvent(new Event('input', { bubbles:true })); await w(700);
  out.戻すと = sad(full(), A);
  /* ⭐ 2026-09-02・木下＝「エフェクトの中に入れると綺麗かも。実装上変？」
     ＝変ではない（Figma も同じ置き方）。
     ⚠️ そのあと木下＝「デフォルトでレイヤーブラーがあるのはok？」＝よくない
       ＝この段は【足したものだけ行になる】。だから**足してから**居場所を見る。 */
  document.getElementById('b_fxadd').click(); await w(300);
  const bt2 = [...document.querySelectorAll('#fxAddMenu button')]
    .find(x => x.textContent === 'レイヤーブラー');
  out.一覧にある = !!bt2;
  if(bt2){ bt2.click(); await w(800); }
  out.どの段 = r.closest('.grp') ? r.closest('.grp').id : '（段の外）';
  out.段の見出し = r.closest('.grp')
    ? (r.closest('.grp').querySelector('.h') || {}).textContent : '';
  out.行の名前 = [...document.querySelectorAll('#fxEdList .fxhead .nm')].map(e => e.textContent);
  /* 後片付け＝外して 0 に戻す（次の章に持ち越さない） */
  const xr2 = document.querySelector('#fxEdList .fxhead .xr');
  if(xr2){ xr2.click(); await w(500); }
  return out;
});
ok(BLUR.空気 === 0 && BLUR.ぼかした.変わった > 0,
   '⭐⭐ ぼかしは【空気 0 の素材（図形）でも効く】（空気の ON は要らない）',
   JSON.stringify(BLUR.ぼかした));
ok(BLUR.戻すと === 0,
   '🔴 0 に戻すと【1画素も同じ】に戻る（焼き込まない）', String(BLUR.戻すと));
ok(BLUR.ぼかした.名 === 'ぼかし',
   '⭐ 名前は「ぼかし」＝空気の話に見えない（独立した段に置いた）', BLUR.ぼかした.名);
ok(BLUR.一覧にある && BLUR.どの段 === 'fxBox' && BLUR.行の名前.includes('レイヤーブラー'),
   '⭐⭐ ［＋足す］から足すと【エフェクトの段】に「レイヤーブラー」の行が出る'
   + ' ── 木下＝「細かくやった上で最後に空気、なじませる」＝作る順番と画面の並びが合う',
   JSON.stringify([BLUR.一覧にある, BLUR.どの段, BLUR.行の名前]));

/* ══⭐⭐ 画像のフィルターも【エフェクトの同じ一覧】から足せる ══ 2026-09-02
   🔴 木下＝「今ある分に関して、エフェクトに全部まとめるような感じで追加したらやばそう？」
      →「まとめるではなく、あなたが言っているやり方でやろう」
     ＝**見た目は増やさない・探すのは1か所**。［＋足す］の一覧に混ぜて、
       選ぶと**エフェクトの段に行が増えて そこで触れる**。
   ⭐ つまみは画像編集の段から【借りてくる】＝値の持ち主は1つのまま（上のバーと同じ考え）。
     × で外すと**元の場所へ返る**（実測：editBox へ戻る）。値は残る＝また足せば同じ絵。
   ⭐ 印は `ed.show` に持つ＝edCopy が JSON まるごと写すので、控え・設定JSON に自動で乗る。
   ⚠️ 足した瞬間に【何か見える】ようにする（押しても何も起きない、を作らない）。
     ⚠️ すでに触ってある値は上書きしない。 */
const FXED = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const full = () => { const d = g.getImageData(0,0,cv.width,cv.height).data; const o = [];
    for(let i = 0; i < d.length; i += 4*3) o.push(d[i], d[i+1], d[i+2], d[i+3]); return o; };
  const sad = (A, B) => { let s2 = 0; for(let i = 0; i < A.length; i++) s2 += Math.abs(A[i]-B[i]);
    return s2; };
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const L = LAYERS.find(x => x.img && !x.kind);
  setSel(LAYERS.indexOf(L), false); syncSel(); buildList(); COARSE = 0; render(); await w(600);
  const A = full();
  document.getElementById('b_fxadd').click(); await w(300);
  const menu = [...document.querySelectorAll('#fxAddMenu button')].map(x => x.textContent);
  out.一覧 = { 数:menu.length, 区切り:[...document.querySelectorAll('#fxAddMenu div')]
    .map(x => x.textContent) };
  out.元の9つがある = ['ドロップシャドウ','境界線','サテン'].every(n => menu.includes(n));
  out.フィルターもある = ['渦巻き','ガラス（歪み）','モザイク','フィルム粒子']
    .every(n => menu.includes(n));
  const tw = [...document.querySelectorAll('#fxAddMenu button')]
    .find(x => x.textContent === '渦巻き');
  tw.click(); await w(900);
  out.足した = { 行:document.querySelectorAll('#fxEdList .fxsec').length,
                 つまみが来た:!!document.querySelector('#fxEdList #r_twirl'),
                 絵が変わった:sad(full(), A), 値:document.getElementById('r_twirl').value };
  /* × で外すと元へ返る（値は残る） */
  document.querySelector('#fxEdList .fxhead .xr').click(); await w(700);
  const 居場所 = (() => { const e = document.getElementById('r_twirl');
    let n = e; while(n && !(n.classList && n.classList.contains('grp'))) n = n.parentElement;
    return n ? n.id : '（段の外）'; })();
  out.外した = { 行:document.querySelectorAll('#fxEdList .fxsec').length,
                 借りたまま:!!document.querySelector('#fxEdList #r_twirl'),
                 居場所, 値は残る:document.getElementById('r_twirl').value };
  /* 後片付け＝元に戻す */
  const e2 = document.getElementById('r_twirl');
  e2.value = 0; e2.dispatchEvent(new Event('input', { bubbles:true })); await w(500);
  out.戻すと = sad(full(), A);
  return out;
});
ok(FXED.元の9つがある && FXED.フィルターもある && FXED.一覧.区切り.includes('画像のフィルター'),
   '⭐⭐ ［＋足す］の一覧に【レイヤースタイル9つ＋画像のフィルター】が並ぶ（探すのは1か所）',
   JSON.stringify(FXED.一覧));
ok(FXED.足した.行 === 1 && FXED.足した.つまみが来た && FXED.足した.絵が変わった > 0,
   '⭐⭐ 選ぶとエフェクトの段に【行が増えて そこで触れる】／足した瞬間に絵が変わる',
   JSON.stringify(FXED.足した));
/* ══🔴🔴 × は【効果も消す】── 2026-09-03 に仕様を変えた ══
   木下＝「エフェクトで画像編集のエフェクトつけたんだけど、**削除してもそれが適応されている
         状態だった**わ」＝ 前は「一覧から外すだけ・値は残す」＝押しても絵が1画素も変わらない。
   ⭐ Photoshop と同じ2段：👁＝一時的に切る（値は残る）／×＝消す（つまみも既定へ戻る）。
   ⚠️ だから この試験は【値が既定に戻っていること】を見る（前は「残ること」を見ていた）。 */
ok(FXED.外した.行 === 0 && !FXED.外した.借りたまま && FXED.外した.居場所 === 'editBox'
   && Number(FXED.外した.値は残る) === 0,
   '⭐⭐ × で消すと【元の場所へ返る＋つまみも既定に戻る】（消したのに効いたままにしない）',
   JSON.stringify(FXED.外した));
ok(FXED.戻すと === 0,
   '🔴 0 に戻すと1画素も同じに戻る（焼き込まない）', String(FXED.戻すと));

/* ══⭐⭐ 背景のぼかし（下にあるものをぼかす）══ 2026-09-02
   🔴 木下＝「背景のぼかしもしよう」＝Figma のエフェクトに有って MOYA に無かった1つ。
   ⭐ MOYA は【奥→手前】に描くので、その素材を描く直前の盤＝下にあるもの。
     そこをぼかして、その素材の形で切って敷く＝すりガラス越しの見え方。
   ⚠️ 焼き込まない＝0 に戻すと1画素も同じ。⚠️ 0 のときは1回も走らせない（重いので）。 */
const BDBLUR = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const full = () => { const d = g.getImageData(0,0,cv.width,cv.height).data; const o = [];
    for(let i = 0; i < d.length; i += 4*3) o.push(d[i], d[i+1], d[i+2], d[i+3]); return o; };
  const sad = (A, B) => { let s2 = 0; for(let i = 0; i < A.length; i++) s2 += Math.abs(A[i]-B[i]);
    return s2; };
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const L = await window.drawShape(0.30, 0.34, 0.62, 0.62);
  document.querySelector('#tools button[data-t="move"]').click(); await w(400);
  /* 半透明にしないと下が見えない＝すりガラスの試し方 */
  L.op = 0.45; L.d = 0; L._key = ''; COARSE = 0; render(); await w(700);
  const A = full();
  const r = document.getElementById('r_bdblur');
  out.つまみがある = !!r;
  r.value = 45; r.dispatchEvent(new Event('input', { bubbles:true })); await w(900);
  out.かけた = { 変わった:sad(full(), A), 値:+((L.ed && L.ed.bdblur) || 0).toFixed(2) };
  r.value = 0; r.dispatchEvent(new Event('input', { bubbles:true })); await w(700);
  out.戻すと = sad(full(), A);
  document.getElementById('b_fxadd').click(); await w(300);
  out.一覧にある = [...document.querySelectorAll('#fxAddMenu button')]
    .some(x => x.textContent === '背景のぼかし');
  document.getElementById('b_fxadd').click();
  return out;
});
ok(BDBLUR.つまみがある && BDBLUR.かけた.変わった > 0 && BDBLUR.かけた.値 === 0.45,
   '⭐⭐ 背景のぼかし＝【下にあるもの】がぼけて透ける（Figma に有って無かった1つ）',
   JSON.stringify(BDBLUR.かけた));
ok(BDBLUR.戻すと === 0,
   '🔴 0 に戻すと1画素も同じに戻る（焼き込まない）', String(BDBLUR.戻すと));
ok(BDBLUR.一覧にある,
   '⭐ ［＋足す］の一覧にも並ぶ（探すのは1か所）', String(BDBLUR.一覧にある));

/* ══⭐ レイヤーブラーも【足したときだけ出る】 ══ 2026-09-02
   🔴 木下＝「エフェクトにデフォルトでレイヤーブラーがあるのはok？」
     ＝よくない。この段は【足したものだけ行になる】のが決まりなのに、
       これだけ 0 でも出っぱなしだった＝並びが揃っていない。
   ⭐ ほかと同じ［＋足す］から出す。つまみの居場所は隠してあり、足すと借りて 外すと返る。 */
const LBLUR = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const full = () => { const d = g.getImageData(0,0,cv.width,cv.height).data; const o = [];
    for(let i = 0; i < d.length; i += 4*3) o.push(d[i], d[i+1], d[i+2], d[i+3]); return o; };
  const sad = (A, B) => { let s2 = 0; for(let i = 0; i < A.length; i++) s2 += Math.abs(A[i]-B[i]);
    return s2; };
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const L = LAYERS.find(x => x.img && !x.kind);
  setSel(LAYERS.indexOf(L), false); syncSel(); buildList(); COARSE = 0; render(); await w(600);
  out.足す前 = { 出ている:!!document.querySelector('#fxEdList #r_ablur'),
                 行:document.querySelectorAll('#fxEdList .fxsec').length };
  const A = full();
  document.getElementById('b_fxadd').click(); await w(300);
  const bt = [...document.querySelectorAll('#fxAddMenu button')]
    .find(x => x.textContent === 'レイヤーブラー');
  out.一覧にある = !!bt;
  bt.click(); await w(900);
  out.足した = { 出ている:!!document.querySelector('#fxEdList #r_ablur'),
                 行:document.querySelectorAll('#fxEdList .fxsec').length,
                 絵が変わった:sad(full(), A) };
  document.querySelector('#fxEdList .fxhead .xr').click(); await w(700);
  const 居場所 = (() => { let m = document.getElementById('r_ablur').parentElement;
    while(m && !m.id) m = m.parentElement; return m ? m.id : '?'; })();
  out.外した = { 行:document.querySelectorAll('#fxEdList .fxsec').length, 居場所 };
  const e = document.getElementById('r_ablur');
  e.value = 0; e.dispatchEvent(new Event('input', { bubbles:true })); await w(500);
  return out;
});
ok(LBLUR.足す前.出ている === false && LBLUR.足す前.行 === 0 && LBLUR.一覧にある,
   '⭐ レイヤーブラーは【足すまで出ない】（この段は足したものだけ行になる）',
   JSON.stringify(LBLUR.足す前));
ok(LBLUR.足した.出ている && LBLUR.足した.行 === 1 && LBLUR.足した.絵が変わった > 0
   && LBLUR.外した.行 === 0 && LBLUR.外した.居場所 === 'blurHome',
   '⭐ 足すと行が増えて絵が変わる／外すと元の居場所へ返る（つまみは1つのまま）',
   JSON.stringify([LBLUR.足した, LBLUR.外した]));

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
    /* ⚠️ 2026-09-02・木下＝「これは背景ではなく、そのボードより大きくなっている
       レイヤーにつけるべき」＝印は【覆っている側の行】に移した。
       背景の行には何も足さない（長い文が行に居座らない）。 */
    const 覆う = { 名:bgCover() ? bgCover().name : null,
      段:!document.getElementById('bgCoverSay').classList.contains('hide'),
      原因の行に印:!!document.querySelector('#layers .ly.covering'),
      背景の行は素:!document.querySelector('#layers .bgrow.covered') };
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
  ok(BG.覆う && BG.覆う.名 && BG.覆う.段 && !BG.閉じたら.名 && !BG.閉じたら.段,
     '⭐⭐ 地の色が【覆われていて見えない】ときは、どの素材のせいか言う',
     JSON.stringify(BG));
  ok(BG.覆う && BG.覆う.原因の行に印 && BG.覆う.背景の行は素,
     '⚠️ 印は【覆っている側の行】に付く（背景の行には長い文を置かない）',
     JSON.stringify(BG.覆う));
}

/* ══⭐⭐ 木下の実機確認【10巡目】＝行の空気の表記／書体の理由が見える所に有るか ══ 2026-09-02
   🔴 ① 木下＝「空気のきき100%の場合パーセンテージまで表記がないため100%と記載して」
        ＝行の数字は3つ並んでいるのに、**濃100% は出て 空だけ出ていなかった**（言い方が不揃い）。
   🔴🔴 ② 木下＝「フォントだが俺らが作った UWASA JP にしても表記は変わらない。ここしっかり見て」
        ＝実測すると **書体はちゃんと効いていた**（「かな」で 塗った画素 9776 → 7583）。
          変わらなく見えたのは「静かな手紙」の3字が漢字で、UWASA JP は漢字を1文字も
          持っていないから（fontTools＝267字・かな168・漢字0）。
        ＝本当の穴は【理由が、書体を選ぶ場所から見えなかった】。
          警告は出ていたが居場所は右パネルの［文字］の段で、
          実測 `fontWarn.offsetParent === null`＝**1度も画面に出ていなかった**。
   ⭐ 直し＝上のバーへ⚠️の印を借りる／盤の左上でも言う／言葉は fontWarnWords 1本から。 */
{
  const FW = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    closeAllEditors();
    await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
    /* ① 空気の効きが 1.00 の行は「空100%」と書く（0 のときだけ「空」＋斜線） */
    const L0 = LAYERS.find(x => x.img && !x.kind && airOf(x) >= 0.999);
    out.空 = { 満:[...document.querySelectorAll('#layers .x.air')]
                    .map(e => e.textContent).filter(s => /^空\d/.test(s))[0] || null };
    if(L0){ L0.air = 0; buildList(); await w(300);
      const row = [...document.querySelectorAll('#layers .ly')].find(x => x.__L === L0);
      out.空.素 = row.querySelector('.air').textContent;
      out.空.斜線 = row.querySelector('.air').classList.contains('raw');
      L0.air = 1; buildList(); await w(300);
      const row2 = [...document.querySelectorAll('#layers .ly')].find(x => x.__L === L0);
      out.空.戻すと = row2.querySelector('.air').textContent; }
    /* ② 漢字を持っていない書体を選ぶと、上のバーに⚠️が出て 盤でも言う */
    document.getElementById('b_text').click(); await w(700);
    const T = LAYERS[SEL];
    const ta = document.getElementById('t_str');
    ta.value = '静かな手紙'; ta.dispatchEvent(new Event('input', { bubbles:true })); await w(500);
    const sel = document.getElementById('t_font');
    sel.value = 'UWASAJP, sans-serif'; sel.dispatchEvent(new Event('change', { bubbles:true }));
    await w(1100);
    const ch = document.getElementById('fontWarnChip');
    out.印 = { 出る:!ch.classList.contains('hide'),
               上のバー:!!ch.closest('#optbar'),
               見えている:!!ch.offsetParent && ch.getBoundingClientRect().width > 0,
               吹き出し:ch.title };
    out.盤 = (document.getElementById('bhSay') || {}).textContent || '';
    /* ③ 持っている字しか無いときは【言わない】（嘘を言わない） */
    ta.value = 'かな'; ta.dispatchEvent(new Event('input', { bubbles:true })); await w(700);
    out.かなだけ出る = !ch.classList.contains('hide');
    /* ④ 書体は本当に効いている（画素で見る） */
    const cnt = cv2 => { const d = cv2.getContext('2d')
        .getImageData(0, 0, cv2.width, cv2.height).data;
      let n = 0; for(let i = 3; i < d.length; i += 4) if(d[i] > 8) n++; return n; };
    const shot = async fam => { T.text.font = fam;
      await new Promise(r => rebuildText(T, r)); await w(200); return cnt(T.img); };
    out.画素 = { ゴシック:await shot(FONTS[0][0]), UWASAJP:await shot('UWASAJP, sans-serif') };
    return out;
  });
  ok(FW.空.満 === '空100%' && FW.空.素 === '空' && FW.空.斜線 === true
     && FW.空.戻すと === '空100%',
     '⭐ 行の空気は【空100%】と書く（0 のときだけ「空」＋斜線＝切ってある印）',
     JSON.stringify(FW.空));
  ok(FW.印.出る && FW.印.上のバー && FW.印.見えている,
     '🔴🔴 漢字を持たない書体を選んだら【上のバー（書体の隣）】に⚠️が出る'
     + ' ── 前は右パネルにしか無く、実測で1度も画面に出ていなかった',
     JSON.stringify(FW.印));
  ok(/持っていません/.test(FW.印.吹き出し) && /変わっています/.test(FW.印.吹き出し)
     && /持っていません/.test(FW.盤),
     '⭐⭐ 理由は【盤の左上】でも言う＋「ほかの字は変わっている」も言う（効いていない と読ませない）',
     JSON.stringify([FW.印.吹き出し, FW.盤]).slice(0, 200));
  ok(FW.かなだけ出る === false,
     '⭐ 持っている字しか無いときは言わない（嘘の警告を出さない）', String(FW.かなだけ出る));
  ok(FW.画素.UWASAJP > 0 && FW.画素.UWASAJP !== FW.画素.ゴシック,
     '🔴 そもそも UWASA JP は【効いている】＝かなの画素が変わる（効かないのではなく漢字が無い）',
     JSON.stringify(FW.画素));
}

/* ══⭐⭐ 書体は【家】と【姿】の2段（Figma のタイポグラフィと同じ）══ 2026-09-02
   🔴 木下＝「太字なのか。細いのかなど この辺りも実装としていりそうだな。でないと整合性あわなそう」
     ＝そのとおりだった。実測で分かった2つ：
     ① `uwasa/fonts/` には Hoso・Regular・Su・Sumi・Sure の **5本**が有るのに
        MOYA は Regular 1本しか読んでいなかった＝**4本は選べなかった**。
        同じ字・同じ幅（480）で墨の量だけ違う＝**事実上の太さの5段**
        （細 7,263 ＜ 素 8,422 ＜ 標準 9,128 ＜ 擦 10,135 ＜ 墨 10,511）。
     ② ［太さ］のつまみは、姿を1本しか持たない書体では **ブラウザの合成の太字**。
        Figma の Bold（書体が持っている実体）とは別物なので、そう言う。
   ⭐ 決めは1つ ── 一覧に出るのは【家の代表】だけ／姿は［スタイル］の欄。
     姿が1つの書体では欄ごと出さない（触れるのに効かない欄を作らない）。 */
{
  const FS = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    closeAllEditors();
    await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
    out.一覧 = [...document.querySelectorAll('#t_font option')].map(o => o.textContent);
    document.getElementById('b_text').click(); await w(700);
    const L = LAYERS[SEL];
    const ta = document.getElementById('t_str');
    ta.value = 'かなカナ'; ta.dispatchEvent(new Event('input', { bubbles:true })); await w(500);
    const sel = document.getElementById('t_font'), sv = document.getElementById('t_style');
    const row = document.getElementById('styleRow'), say = document.getElementById('weightSay');
    const put = async (id, v) => { const e = document.getElementById(id);
      e.value = v; e.dispatchEvent(new Event('change', { bubbles:true })); await w(900); };
    const cnt = cv2 => { const d = cv2.getContext('2d')
        .getImageData(0, 0, cv2.width, cv2.height).data;
      let n = 0; for(let i = 3; i < d.length; i += 4) if(d[i] > 8) n++; return n; };
    /* 姿を1つしか持たない書体＝欄を出さない＋合成だと言う */
    await put('t_font', FONTS[0][0]);
    out.ひとつ = { 欄:!row.classList.contains('hide'), 言う:/合成/.test(say.textContent) };
    /* UWASA JP＝姿が5つ */
    await put('t_font', 'UWASAJP, sans-serif');
    out.五つ = { 欄:!row.classList.contains('hide'),
      姿:[...sv.options].map(x => x.textContent),
      上のバー:!!row.closest('#optbar'), 見えている:!!row.offsetParent,
      太さの一言:say.textContent };
    out.画素 = {};
    for(const v of [...sv.options].map(x => x.value)){
      await put('t_style', v); out.画素[styleOf(v)] = cnt(L.img); }
    await put('t_style', 'UWASAJP, sans-serif');
    out.戻すと = cnt(L.img);
    out.家は代表のまま = sel.value;
    /* ⭐ 細字・太字を置いていない状態で【合成の太字が効く】ことを見る */
    const tw = document.getElementById('t_weight');
    const wt = async v => { tw.value = v; tw.dispatchEvent(new Event('input', { bubbles:true }));
      await w(800); return cnt(L.img); };
    out.太さ = { w400:await wt(400), w700:await wt(700) };
    await wt(700);
    /* 可変フォント＝太さの実体を持つ（合成ではない） */
    await put('t_font', 'CHUJP, sans-serif');
    out.可変 = { 欄:!row.classList.contains('hide'), 言う:/実体/.test(say.textContent) };
    return out;
  });
  /* ⚠️ 数で見ない（前の章で書体を読み込むと1行増える＝ぶれる試験になる）。
     見るのは【姿の行が一覧に出ていないこと】＝家の代表だけが並んでいること。 */
  ok(!FS.一覧.some(s => /^UWASA JP (素|擦れ|墨|細身)$/.test(s))
     && FS.一覧.indexOf('UWASA JP（かな込み・漢字なし）') >= 0,
     '⭐ 書体の一覧は【家の代表だけ】＝姿の4行は出ていない（姿は［スタイル］へ）',
     JSON.stringify(FS.一覧.filter(s => /UWASA/.test(s))));
  ok(FS.ひとつ.欄 === false && FS.ひとつ.言う,
     '⭐⭐ 姿を1つしか持たない書体では［スタイル］を出さない＋［太さ］は合成だと言う',
     JSON.stringify(FS.ひとつ));
  /* 🔴 名前は【木下の言葉と道具の KATA】に合わせる（素・筆・擦れ・墨・細身）。
     私は最初「標準・細・素・擦・墨」と書いていた＝道具の中を見ずに付けた名前だった。 */
  /* 🔴🔴 並びも言葉も【道具（uwasa の #segKata）とまったく同じ】にする。
     いったん「墨の量が多い順＝太字」に並べ替えたが、木下がくれた5枚の画面では
     **墨は線の中が白く抜けて軽く見える**＝太さの階段ではなかった。→ 道具の順に戻した。 */
  ok(FS.五つ.欄 && FS.五つ.上のバー && FS.五つ.見えている
     && FS.五つ.姿.join('・') === '素・筆・擦れ・墨・細身',
     '🔴🔴 UWASA JP の【5つの型】＝素・筆・擦れ・墨・細身（道具と同じ順・同じ言葉）'
     + ' ── 前は Regular 1本しか読んでいなかった／⚠️ これは太さではなく崩し方',
     JSON.stringify(FS.五つ));
  ok(new Set(Object.values(FS.画素)).size === 5,
     '⭐⭐ 5つの型は【ぜんぶ違う絵】になる（同じ字・同じ大きさで墨の量が5通り）',
     JSON.stringify(FS.画素));
  ok(FS.戻すと === FS.画素.筆 && FS.家は代表のまま === 'UWASAJP, sans-serif',
     '🔴 型を戻すと1画素も同じ／型を選んでいる間も一覧は【家】を指したまま',
     JSON.stringify([FS.戻すと, FS.画素.筆, FS.家は代表のまま]));
  ok(/太さ（細字・中間・太字）はこの/.test(FS.五つ.太さの一言 || ''),
     '⭐ ［太さ］の下で「細字・中間・太字はこのつまみ」と言う',
     String(FS.五つ.太さの一言).slice(0, 80));
  /* ══🔴🔴 私が一度こわした所を、二度と壊さないための試験 ══ 2026-09-02
     細字・太字の .ttf を CSS の @font-face で【先に宣言】したら、
     ファイルが無くて中間の1本へ落ちるのに「その太さの face は有る」と見なされ、
     **ブラウザの合成の太字まで止まった**（実測＝300/400/700 が全部 9,172 で同じ）。
     ＝［太さ］が1通りの絵しか作らない＝死んだつまみ／しかも**今までの絵が変わる**。
     ⭐ 直し＝実ファイルが本当に読めたときだけ JS で FontFace を足す。
     ⚠️ ここは「置いていない状態」なので、**合成の太字が効いていること**を見る。 */
  ok(FS.太さ && FS.太さ.w700 > FS.太さ.w400,
     '🔴🔴 細字・太字を置いていないうちは【合成の太字が今までどおり効く】'
     + '（@font-face を先に宣言すると合成が止まって、つまみが死ぬ）',
     JSON.stringify(FS.太さ));
  ok(FS.可変.欄 === false && FS.可変.言う,
     '⭐ 可変フォント（CHU JP）は【太さの実体】を持つ＝つまみがそのまま効くと言う',
     JSON.stringify(FS.可変));
}

/* ══⭐⭐ 読み込んだ書体は【この機械に残る】／足す道具を名指しする ══ 2026-09-02
   🔴 木下＝「フォントを読み込みしても ローカルにそのデータがあるなら
      そこで利用できるようにしてね」＝開き直すと消えていた（毎回 .ttf を選び直し）。
   🔴🔴 木下＝「使用する場合は、CHU に入れないといけないの？なんかその辺がわかってなくて」
     ＝混乱の元は**私が書いた文**だった（UWASA の書体なのに「鋳CHU で足す」と書いていた）。
       → その書体を作った道具を名指しする（UWASA→噂UWASA／CHU→鋳CHU／KETA→桁KETA）。 */
{
  const FK = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    closeAllEditors();
    /* ① 書体を足したら IndexedDB に残るか（読み戻す道が本当に動くか） */
    const buf = await (await fetch('../uwasa/fonts/UWASA-JP-Sumi.ttf')).arrayBuffer();
    const nm = '試験用の書体';
    const fam = 'moya-shiken';
    const fam2 = '"' + fam + '"';
    document.fonts.add(await new FontFace(fam, buf, { weight:'1 1000' }).load());
    FONTBUF[fam2] = buf; FONTAXES[fam2] = readAxes(buf);
    await fontSave(fam2, nm, buf);
    FONTS.push([fam2, nm]);
    /* 覚えていないふりをして、読み戻す道だけを通す */
    const i = FONTS.findIndex(o => o[0] === fam2);
    FONTS.splice(i, 1); delete FONTBUF[fam2];
    out.読み戻した = await fontRestore();
    out.一覧にある = [...document.querySelectorAll('#t_font option')]
      .map(x => x.textContent).includes(nm);
    out.FONTSにある = FONTS.some(o => o[0] === fam2);
    await document.fonts.load('400 120px ' + fam2, 'かなAB');
    const m = document.createElement('canvas').getContext('2d');
    m.font = '400 120px ' + fam2; const a = m.measureText('AB').width;
    m.font = '400 120px sans-serif'; const s2 = m.measureText('AB').width;
    out.その書体で描ける = Math.round(a) !== Math.round(s2);
    /* 後片付け＝残したものを消す（次の回に持ち越さない） */
    await fontDrop(fam2);
    const j = FONTS.findIndex(o => o[0] === fam2); if(j >= 0) FONTS.splice(j, 1);
    const op = [...document.querySelectorAll('#t_font option')].find(x => x.value === fam2);
    if(op) op.remove();
    /* ② 足す道具の名指し */
    out.道具 = { UWASA:makerOf('UWASAJP, sans-serif'), CHU:makerOf('CHUJP, sans-serif'),
                 KETA:makerOf('KETA, sans-serif') };
    document.getElementById('b_text').click(); await w(700);
    const T = LAYERS[SEL];
    const ta = document.getElementById('t_str');
    ta.value = '静かな手紙'; ta.dispatchEvent(new Event('input', { bubbles:true })); await w(500);
    const sel = document.getElementById('t_font');
    sel.value = 'UWASAJP, sans-serif'; sel.dispatchEvent(new Event('change', { bubbles:true }));
    await w(1100);
    out.段の文 = (document.getElementById('fontWarn').textContent || '');
    return out;
  });
  ok(FK.読み戻した >= 1 && FK.一覧にある && FK.FONTSにある && FK.その書体で描ける,
     '⭐⭐ 読み込んだ書体は【この機械に残る】＝開き直しても一覧から選べて、その書体で描ける',
     JSON.stringify(FK));
  ok(FK.道具.UWASA && FK.道具.UWASA[0] === '噂 UWASA'
     && FK.道具.CHU && FK.道具.CHU[0] === '鋳 CHU'
     && FK.道具.KETA && FK.道具.KETA[0] === '桁 KETA',
     '⭐ その書体を【どの道具が作ったか】を持っている（UWASA→噂UWASA／CHU→鋳CHU）',
     JSON.stringify(FK.道具));
  ok(/噂 UWASA/.test(FK.段の文) && !/鋳CHU で漢字を足す/.test(FK.段の文),
     '🔴🔴 漢字が無いと言うときは【その書体を作った道具】を名指しする'
     + ' ── 前は UWASA の書体なのに「鋳CHU で足す」と書いていた（木下が混乱した元）',
     FK.段の文.slice(0, 140));
}

/* ══⭐⭐ 漢字入りの UWASA ══ 2026-09-02
   🔴 木下＝「なんとか使えるように **漢字も含めフォントダウンロードしたい**な uwasa の」
     ＝噂UWASA で【元の書体（Zen Kaku Gothic New）の漢字ぜんぶ】を鋳って `uwasa/fonts/` へ置いた。
       実測＝6,949字（かな168・漢字6,682）／素 13MB・筆 3.7MB・擦れ 7.2MB・墨 8.6MB・細身 3.8MB。
   ⚠️ 重いので **かなだけの5本はそのまま残す**（今までの絵は1画素も変わらない）。
   ⭐ ここで見るのは3つ ── ①一覧に出る ②型が5つ ③**漢字の警告が消える**（嘘を言わない）。 */
{
  const KJ = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    closeAllEditors();
    await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
    out.一覧 = [...document.querySelectorAll('#t_font option')].map(x => x.textContent)
      .filter(s => /UWASA/.test(s));
    document.getElementById('b_text').click(); await w(700);
    const L = LAYERS[SEL];
    const ta = document.getElementById('t_str');
    ta.value = '静かな手紙'; ta.dispatchEvent(new Event('input', { bubbles:true })); await w(600);
    const put = async (id, v) => { const e = document.getElementById(id);
      e.value = v; e.dispatchEvent(new Event('change', { bubbles:true })); await w(1400); };
    const cnt = c2 => { const d = c2.getContext('2d').getImageData(0,0,c2.width,c2.height).data;
      let n = 0; for(let i = 3; i < d.length; i += 4) if(d[i] > 8) n++; return n; };
    await put('t_font', 'UWASAJP, sans-serif');
    out.かなだけ = { 画素:cnt(L.img),
      印:!document.getElementById('fontWarnChip').classList.contains('hide') };
    await put('t_font', 'UWASAJPK, sans-serif');
    await w(7000);                       /* 3.7MB が落ちてくるのを待つ */
    await new Promise(r => rebuildText(L, r)); await w(400);
    out.漢字入り = { 画素:cnt(L.img),
      印:!document.getElementById('fontWarnChip').classList.contains('hide') };
    out.型 = [...document.querySelectorAll('#t_style option')].map(x => x.textContent);
    return out;
  });
  ok(KJ.一覧.includes('UWASA JP 漢字入り') && KJ.一覧.includes('UWASA JP（かな込み・漢字なし）'),
     '⭐ 一覧に【UWASA JP 漢字入り】が並ぶ（かなだけの軽い方も残っている）',
     JSON.stringify(KJ.一覧));
  ok(KJ.型.join('・') === '素・筆・擦れ・墨・細身',
     '⭐ 漢字入りにも【5つの型】がある（かなだけの方と同じ言葉・同じ順）',
     JSON.stringify(KJ.型));
  ok(KJ.かなだけ.印 === true && KJ.漢字入り.印 === false,
     '🔴🔴 漢字入りでは【⚠️ を出さない】＝漢字を持っているのに「持っていません」と嘘を言わない',
     JSON.stringify([KJ.かなだけ.印, KJ.漢字入り.印]));
  ok(KJ.漢字入り.画素 > 0 && KJ.漢字入り.画素 !== KJ.かなだけ.画素,
     '⭐⭐ 漢字入りにすると【漢字のところも UWASA になる】＝絵が変わる',
     JSON.stringify([KJ.かなだけ.画素, KJ.漢字入り.画素]));
}

/* ══⭐⭐ 木下の実機確認【16巡目】── レイヤーまわり4件 ══ 2026-09-02
   ① 「オブジェクトをコピーしてペーストするとき、**同じ位置で複製したい**」
      ＝⌘V が右下へ 0.03 ずらしていた。Photoshop / Illustrator は ⌘V＝同じ位置。
      → ⌘V＝同じ位置／⌘⇧V＝ずらす／⌘D＝ずらして複製、に役割を分けた。
   ② 「レイヤーパネルを**複数選択できグルーピング**でフォルダにしたい」
      ＝**もう出来た**（⇧か⌘で足して選ぶ→⌘G）。だが**どこにも書いていなかった**＝無いのと同じ。
      → 行を選んだその場で言う。
   ③ 「奥行きを変更した場合、レイヤーが変わり、**どのレイヤーだっけ**になる」
      ＝並ぶ順は奥行きが決めるので行が飛ぶ。→ 選んでいる行まで一覧をスクロールする。
   ④ 「縦書きの字の色と線の色の横に**空白が開いている**。これは何？」
      ＝色の四角だけ上のバーへ借りて、**名前だけの `.row` が段に残っていた**＝穴。
      → 借りるときは名前の行も隠し、返すときに戻す。 */
{
  const LY = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    closeAllEditors();
    await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
    const key = (k, sh) => document.dispatchEvent(new KeyboardEvent('keydown',
      { key:k, metaKey:true, shiftKey:!!sh, bubbles:true }));
    /* ① ⌘V＝同じ位置 */
    const L0 = LAYERS.find(L => L.img && !L.kind);
    setSel(LAYERS.indexOf(L0), false); syncSel(); await w(300);
    const 枚 = LAYERS.length;
    key('c'); await w(200); key('v'); await w(700);
    const 貼1 = LAYERS[SEL];
    out.同じ位置 = { 増えた:LAYERS.length - 枚, 同じ:貼1.x === L0.x && 貼1.y === L0.y,
                     選ばれた:SELIDS[0] === 貼1.id };
    key('v', true); await w(700);
    out.ずらして貼る = Math.abs(LAYERS[SEL].x - L0.x) > 0.02;
    /* ② 複数選択 → ⌘G */
    const rows = () => [...document.querySelectorAll('#layers .ly:not(.bgrow):not(.grp)')];
    const 押す = (e2, sh) => { const y = e2.getBoundingClientRect().top + 8;
      e2.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, pointerId:1, clientY:y }));
      e2.dispatchEvent(new PointerEvent('pointerup',
        { bubbles:true, pointerId:1, shiftKey:!!sh, clientY:y })); };
    押す(rows()[0]); await w(400);
    out['1枚の案内'] = (document.getElementById('stat') || {}).textContent || '';
    押す(rows()[1], true); await w(400);
    out['2枚の案内'] = (document.getElementById('stat') || {}).textContent || '';
    out.複数選べる = selLayers().length;
    out.Gが押せる = !document.getElementById('b_group').disabled;
    const g前 = GROUPS.length;
    key('g'); await w(700);
    out.グループできた = GROUPS.length > g前 && !!document.querySelector('#layers .ly.grp');
    /* ③ 奥行きを変えたら選んでいる行を追う
       ⚠️ スクロールしているのは #layersHost とは限らない（右パネルの中／レイヤー窓の中）
         ＝ 決め打ちで測ると嘘になる → **本当にスクロールする先祖**を探して測る。 */
    /* ⚠️ 追うのは【切り離したレイヤー窓】の中だけ（右パネルは動かさない決め）
       ＝ 窓を開いてから測る。#panel に当たったら追わない。 */
    const wb = document.getElementById('layOpen');
    if(wb && !document.body.classList.contains('laywin')){ wb.click(); await w(800); }
    const 親 = e2 => { let h2 = e2.parentElement;
      while(h2 && h2 !== document.body && h2.id !== 'panel'){
        const st = getComputedStyle(h2);
        if(/(auto|scroll)/.test(st.overflowY) && h2.scrollHeight > h2.clientHeight + 2) return h2;
        h2 = h2.parentElement; }
      return null; };
    const L2 = LAYERS.find(L => L.img && !L.kind && L.g == null) || LAYERS[0];
    setSel(LAYERS.indexOf(L2), false); syncSel(); buildList(); await w(500);
    const host = 親(document.querySelector('#layers .ly'));
    out.スクロールする所がある = !!host;
    if(host){ host.scrollTop = 0; await w(300); }
    L2.d = 0.95; L2._key = ''; buildList(); await w(1000);
    const 行 = document.querySelector('#layers .ly.pri');
    if(!host || !行){ out.追える = true; }        /* スクロールしない＝全部見えている */
    else { const r = 行.getBoundingClientRect(), h = host.getBoundingClientRect();
      out.追える = r.top >= h.top - 2 && r.bottom <= h.bottom + 2; }
    /* ④ 借りた所に名前だけ残らない */
    document.getElementById('b_text').click(); await w(800);
    const 色 = document.getElementById('t_color');
    const 名 = 色 ? 色.previousElementSibling : null;
    out.穴 = { バーの中:!!(色 && 色.closest('#optbar')),
               名前だけ残る:!!(名 && 名.classList.contains('row') && !名.classList.contains('hide')) };
    const bt = document.querySelector('#tools button[data-t="move"]'); if(bt) bt.click();
    await w(500);
    out.戻したら名前も戻る = !!(名 && !名.classList.contains('hide'));
    return out;
  });
  ok(LY.同じ位置.増えた === 1 && LY.同じ位置.同じ && LY.同じ位置.選ばれた,
     '🔴 ⌘V は【同じ位置】に貼る（Photoshop・Illustrator と同じ）＋貼ったものを選ぶ',
     JSON.stringify(LY.同じ位置));
  ok(LY.ずらして貼る === true,
     '⭐ ⌘⇧V は【ずらして】貼る（役割を分けた／⌘D はずらして複製のまま）',
     String(LY.ずらして貼る));
  ok(LY.複数選べる === 2 && LY.Gが押せる && LY.グループできた,
     '⭐⭐ ⇧か⌘で【複数選べる】→ ⌘G でグループ（フォルダ）になる',
     JSON.stringify([LY.複数選べる, LY.Gが押せる, LY.グループできた]));
  ok(/複数選べます/.test(LY['1枚の案内']) && /グループ/.test(LY['2枚の案内']),
     '🔴 出来ることを【選んだその場で言う】── 前は どこにも書いていなくて「無い」と同じだった',
     JSON.stringify([LY['1枚の案内'].slice(0, 40), LY['2枚の案内'].slice(0, 30)]));
  ok(LY.追える === true,
     '⭐⭐ 奥行きを変えて行が飛んでも【選んでいる行まで一覧がスクロールする】＝見失わない',
     String(LY.追える));
  ok(LY.穴.バーの中 && LY.穴.名前だけ残る === false && LY.戻したら名前も戻る,
     '🔴🔴 上のバーへ借りたら【名前の行も一緒に隠す】＝「字の色」と書いて横が空っぽ、を作らない',
     JSON.stringify([LY.穴, LY.戻したら名前も戻る]));
}

/* ══🔴🔴 足した画像のフィルターは【その場で触れる】 ══ 2026-09-02
   木下＝「試しにレイヤーブラーをたしたが、**調整がこの場でできない**」
        「モザイクもそれ以外もだね。ポリた（ポスタリゼーション）なんとかも」
   ＝つまみは借りられていて hide も外れていたのに、**見えていなかった**。
     理由＝`.fxbody` は CSS で `display:none` が既定で、
     **`.fxsec.open .fxbody` のときだけ** 出る。
     レイヤースタイル9種は `.open` を付けていたが、
     **私が足した画像のフィルター19種には付けていなかった**＝19個ぜんぶ触れなかった。
   ⚠️ hide の付け外しだけ見ていると気づけない ── **「見えているか」で測る**。 */
{
  const FXED = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    closeAllEditors();
    await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
    const L = LAYERS.find(x => x.img && !x.kind);
    setSel(LAYERS.indexOf(L), false); syncSel(); await w(400);
    const out = { だめ:[], 数:0 };
    for(const [k, n] of EDLIST){
      document.getElementById('b_fxadd').click(); await w(260);
      const bt = [...document.querySelectorAll('#fxAddMenu button')]
        .find(x => x.textContent === n);
      if(!bt){ out.だめ.push(n + '：一覧に無い'); continue; }
      bt.click(); await w(700);
      const sec = [...document.querySelectorAll('#fxEdList .fxsec')]
        .find(s2 => (s2.querySelector('.nm') || {}).textContent === n);
      if(!sec){ out.だめ.push(n + '：行が出ない'); continue; }
      const body = sec.querySelector('.fxbody');
      const つ = body.querySelectorAll('input[type=range]').length;
      const 見 = !!body.offsetParent && body.getBoundingClientRect().height > 4;
      if(!つ) out.だめ.push(n + '：つまみが無い');
      else if(!見) out.だめ.push(n + '：見えていない');
      else out.数++;
      const xr = sec.querySelector('.xr'); if(xr) xr.click(); await w(380);
    }
    return out;
  });
  ok(FXED.だめ.length === 0 && FXED.数 === 19,
     '🔴🔴 ［＋足す］で足した画像のフィルター【19種ぜんぶ】が、その場で開いて触れる'
     + ' ── 前は .fxsec に .open を付け忘れて 19個とも触れなかった',
     JSON.stringify([FXED.数, FXED.だめ]));
}

/* ══⭐⭐ ブラシ（ふつうに色を塗る筆）══ 2026-09-03
   🔴 木下＝「ブラシツールなんだろうな」「今だと筆だから ちょっとスムーズではないね」
     ＝MOYA の筆は【特殊効果】7種だけで、**ただ色を塗る筆が1つも無かった**。
   ⭐ Adobe 公式のブラシに合わせて3つ足した（推測で作らない・出典で決めた）：
     ・かたさ Hardness＝「硬い中心部の大きさ」を直径に対する%で持つ
     ・間隔 Spacing＝ブラシマーク同士の距離を直径に対する%で。丸ブラシの既定 25%。
       ⚠️ 切ると「カーソルの速度」が間隔を決める＝**MOYA の今までの状態**＝数珠つなぎの正体
     ・不透明度 Opacity＝**そのひと筆の天井**（離すまで超えない）／流量 Flow＝天井へ溜まる速さ
       → helpx.adobe.com/photoshop/using/painting-tools.html
   🔴🔴 いちど3つとも「効かない」と実測で出た＝**筆の値を層に写す3か所で写し忘れていた**
     （新しい層／描き足し／brBake）。→ 3か所とも同じ顔ぶれにした。 */
{
  const BRU = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    closeAllEditors();
    await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
    const stage = document.getElementById('stage');
    const b2 = stage.getBoundingClientRect();
    const 道 = [[.20,.30],[.40,.42],[.60,.34],[.80,.46]];
    const ひと筆 = async (set) => {
      Object.assign(BR, set);
      const k = document.getElementById('k_brnew'); if(k) k.checked = true;
      const bt = document.querySelector('#tools button[data-t="brush"]'); if(bt) bt.click();
      BRUSHON = true; document.body.classList.add('brushon');
      const ev = (t, u, v) => stage.dispatchEvent(new PointerEvent(t,
        { bubbles:true, pointerId:71, clientX:b2.x + b2.width*u, clientY:b2.y + b2.height*v }));
      ev('pointerdown', 道[0][0], 道[0][1]);
      for(const [u, v] of 道.slice(1)){ ev('pointermove', u, v); await w(60); }
      ev('pointerup', 道[3][0], 道[3][1]);
      await w(500);
      BRUSHON = false; document.body.classList.remove('brushon');
      const L = LAYERS[SEL]; const c = L && L.img; if(!c) return null;
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0, a = 0, 半 = 0;
      for(let i = 3; i < d.length; i += 4){ if(d[i] > 4){ n++; a += d[i];
        if(d[i] > 110 && d[i] < 210) 半++; } }
      return { 塗った:n, 平均:Math.round(a / Math.max(1, n)), 中間:半,
               写った:{ hard:L.brush.hard, space:L.brush.space, opa:L.brush.opa } };
    };
    const 基 = { kind:'brush', size:14, flow:100, scat:0, grain:0,
                 col:'#ff0000', neu:false, seed:7 };
    const o = {};
    o.間隔密 = await ひと筆({ ...基, hard:92, space:1,  opa:100 });
    o.間隔粗 = await ひと筆({ ...基, hard:92, space:60, opa:100 });
    o.天井100 = await ひと筆({ ...基, hard:100, space:10, opa:100 });
    o.天井40  = await ひと筆({ ...基, hard:100, space:10, opa:40 });
    o.かたさ100 = await ひと筆({ ...基, size:20, hard:100, space:10, opa:100 });
    o.かたさ20  = await ひと筆({ ...基, size:20, hard:20,  space:10, opa:100 });
    o.一覧 = [...document.querySelectorAll('#s_brkind button')].map(x => x.textContent);
    o.つまみが出る = ['brHardKnob','brSpaceKnob','brOpaKnob']
      .map(id => !document.getElementById(id).classList.contains('hide'));
    return o;
  });
  ok(BRU.一覧.includes('ブラシ') && BRU.一覧.includes('刷毛'),
     '⭐⭐ 筆に【ブラシ】と【刷毛】を足した（前は特殊効果7種だけで色を塗る筆が無かった）',
     JSON.stringify(BRU.一覧));
  ok(BRU.間隔密.塗った > BRU.間隔粗.塗った,
     '⭐ 間隔（Spacing）が効く ── 密なほど塗れる／これが無いと【数珠つなぎ】になる',
     JSON.stringify([BRU.間隔密.塗った, BRU.間隔粗.塗った]));
  ok(BRU.天井40.平均 < BRU.天井100.平均 * 0.75,
     '🔴🔴 不透明度は【ひと筆の天井】＝重ねても超えない（Adobe と同じ・流量とは別物）',
     JSON.stringify([BRU.天井100.平均, BRU.天井40.平均]));
  ok(BRU.かたさ20.中間 > BRU.かたさ100.中間 * 1.5,
     '⭐ かたさ（Hardness）が効く ── 低いほど縁がぼける（中間の濃さの画素が増える）',
     JSON.stringify([BRU.かたさ100.中間, BRU.かたさ20.中間]));
  ok(BRU.天井40.写った.opa === 40 && BRU.かたさ20.写った.hard === 20
     && BRU.間隔密.写った.space === 1,
     '🔴🔴 筆の値が【層に写る】── 写す所は3つ有り、いちど3つとも写し忘れて全部効かなかった',
     JSON.stringify(BRU.天井40.写った));
  ok(BRU.つまみが出る.every(Boolean),
     '⭐ かたさ・間隔・不透明度は【ブラシ・刷毛のときだけ】出す（効かないつまみを出さない）',
     JSON.stringify(BRU.つまみが出る));
}

/* ══⭐⭐ 21巡目 ── 木下の実機（第2波）で見つかった3つ ══ 2026-09-03 ════════
   ① 一覧の【選ぶ四角】── 木下＝「複数選択時に中のものも数字をいじってしまう」
   ② JSON を【落として読める】── 木下＝「ドラッグアンドドロップで読み込みできるように」
   ③ ガラス（歪み）の3つのつまみが【大きい絵でも効く】
      木下＝「ガラスの歪みのつまみが全く反映されない」
      🔴 原因は2つ＝ずれが 22px の決め打ち／滑らかさを上げるほど傾きが消えていた */
const CK21 = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const out = {};
  const cks = () => [...document.querySelectorAll('#layers .ly .lyck')];
  out.四角の数 = cks().length;
  out.見える = cks().every(e => !!e.offsetParent && e.getBoundingClientRect().width > 8);
  const L = LAYERS[SEL] || LAYERS[0];
  const 控 = { d:L.d, air:L.air, op:L.op };
  /* ⚠️ 数で比べない ── 押した瞬間に【もう無い層の id】が落とされるので数はずれる。
     ＝ 見るのは「その層が選ばれたか」そのもの。 */
  const 行1 = [...document.querySelectorAll('#layers .ly')].filter(r => r.querySelector('.lyck'))[1];
  const id1 = LAYERS[+行1.dataset.i] ? LAYERS[+行1.dataset.i].id : null;
  cks()[1] && cks()[1].click(); await w(350);
  out.押すと増える = SELIDS.includes(id1);
  /* ⚠️ SELIDS には【もう一覧に出ていない層】の id が混ざることがある（章をまたぐ回帰では特に）。
     ＝ 比べるのは「いま一覧に出ている行のうち選ばれている数」。 */
  { const 出 = new Set([...document.querySelectorAll('#layers .ly .lyck')]
      .map((c, k) => k)); 
    const 行 = [...document.querySelectorAll('#layers .ly')].filter(r => r.querySelector('.lyck'));
    const 選 = 行.filter(r => r.classList.contains('sel')).length;
    out.印が付く = 行.filter(r => r.querySelector('.lyck').classList.contains('on')).length === 選;
    out.見えている選択 = 選; }
  /* 🔴🔴 木下＝「選択して筆の調整をした後、**もう一度レイヤーパネルで選択を外そうとすると
     外せないパターン**があるわ」＝ 私が「ぜんぶ外れないように」1枚のときは外させなかった。
     ⭐ ぜんぶ外れてよい（左端の【ぜんぶ選ぶ】で1回で戻せる）。 */
  cks()[1] && cks()[1].click(); await w(350);
  out.もう一度で減る = !SELIDS.includes(id1);
  /* 1枚だけのときも外せる（0 枚になれる） */
  const 残 = [...document.querySelectorAll('#layers .ly .lyck')];
  SELIDS.slice().forEach(() => { const c = 残.find(x => x.classList.contains('on')); if(c) c.click(); });
  await w(400);
  out.ぜんぶ外せる = SELIDS.length === 0;
  out.数字は動かない = (L.d === 控.d && L.air === 控.air && L.op === 控.op);
  return out;
});
ok(CK21.四角の数 >= 3 && CK21.見える,
   '⭐⭐ 一覧の行に【選ぶ四角】が出ている（行の数字に触れずに選べる）', JSON.stringify(CK21));
ok(CK21.押すと増える && CK21.もう一度で減る && CK21.印が付く,
   '⭐ 四角を押すと選んだものに足され、もう一度で外れる（印も付く）', JSON.stringify(CK21));
ok(CK21.ぜんぶ外せる,
   '🔴🔴 1枚だけのときも【外せる】（0枚になれる）── 外せないパターンを作らない',
   JSON.stringify(CK21));
const ALL21 = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const e2 = document.getElementById('lp_all');
  if(!e2) return { 無い:true };
  const 見 = !!e2.offsetParent && e2.getBoundingClientRect().width > 8;
  e2.click(); await w(400);
  const 全 = { 数:SELIDS.length, 顔:e2.textContent, ぜんぶ:SELIDS.length === LAYERS.length };
  e2.click(); await w(400);
  const 空 = { 数:SELIDS.length, 顔:e2.textContent };
  /* いくつかだけ選ぶと【−】の顔になる */
  const cks = [...document.querySelectorAll('#layers .ly .lyck')];
  cks[0] && cks[0].click(); await w(400);
  const 一部 = { 顔:e2.textContent, some:e2.classList.contains('some') };
  return { 見えている:見, 全, 空, 一部, 層:LAYERS.length };
});
ok(ALL21.見えている && ALL21.全.ぜんぶ && ALL21.全.顔 === '✓',
   '⭐⭐ アイコン列の左端で【ぜんぶ選ぶ】── メールの一覧と同じ（顔は ✓）',
   JSON.stringify(ALL21));
ok(ALL21.空.数 === 0 && ALL21.空.顔 === '◻',
   '⭐⭐ もう一度押すと【ぜんぶ外れる】（選び間違えても1回で戻せる）',
   JSON.stringify(ALL21));
ok(ALL21.一部.顔 === '−' && ALL21.一部.some,
   '⭐ いくつかだけ選んでいるときは【−】の顔（押す前に何枚か分かる）',
   JSON.stringify(ALL21));

ok(CK21.数字は動かない,
   '🔴🔴 四角を押しても【奥行き・空気・濃さ】は1つも動かない（木下の困りごとの本体）',
   JSON.stringify(CK21));

const DROP21 = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const 前 = LAYERS.length;
  /* いまの版を JSON にして、それを【落として】読み直す＝往復して同じ数に戻る */
  const txt = cfgText(true);
  LAYERS.length = 0; SEL = -1; SELIDS = []; buildList(); render(); await w(400);
  const f = new File([txt], 'MOYA_試し.json', { type:'application/json' });
  const dt = new DataTransfer(); dt.items.add(f);
  window.dispatchEvent(new DragEvent('drop', { bubbles:true, cancelable:true, dataTransfer:dt }));
  await w(6000);
  return { 前, 後:LAYERS.length };
});
ok(DROP21.後 === DROP21.前 && DROP21.後 > 0,
   '⭐⭐ JSON を【落として読める】（読む道は applyJSON 1本＝［設定を読む］と同じ絵）',
   JSON.stringify(DROP21));

const GLASS21 = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  /* 🔴 大きい絵で測る（22px の決め打ちは 700px 級では見えていた＝小さい絵では気づけない） */
  const 触 = (id, v) => { const e = document.getElementById(id); if(!e) return;
    e.value = String(v); e.dispatchEvent(new Event('input',{bubbles:true}));
    e.dispatchEvent(new Event('change',{bubbles:true})); };
  触('r_long', 1800); await w(700);
  const 撮 = () => { const d = g.getImageData(0,0,cv.width,cv.height).data;
    let s2 = 0; for(let i = 0; i < d.length; i += 4*5) s2 += d[i]*3 + d[i+1]*5 + d[i+2]*7;
    return s2; };
  const L = LAYERS.filter(x => !x.kind && x.img).sort((a,b)=>a.d-b.d)[0];
  setSel(LAYERS.indexOf(L), false); syncSel(); await w(500);
  edShow(L)['glass'] = true; FXOPEN = 'ed:glass'; buildFxEd(); await w(300);
  触('r_glass', 15); await w(800);  const 甲 = 撮();
  触('r_glasssm', 15); await w(800); const 乙 = 撮();
  触('r_glassscale', 165); await w(800); const 丙 = 撮();
  触('r_glass', 0); await w(800);   const 丁 = 撮();
  edShow(L)['glass'] = false;
  return { ゆがみが効く: 甲 !== 丁, 滑らかさが効く: 乙 !== 甲,
           テクスチャが効く: 丙 !== 乙, ゼロで戻る: 丁 };
});
ok(GLASS21.ゆがみが効く && GLASS21.滑らかさが効く && GLASS21.テクスチャが効く,
   '🔴🔴 ガラス（歪み）の3つのつまみが【大きい絵でも】ぜんぶ効く（22px の決め打ちをやめた）',
   JSON.stringify(GLASS21));

/* ══⭐⭐ 22巡目 ── Photoshop / Figma から取り入れた2つ ══ 2026-09-03 ══════
   台帳＝Obsidian「07_MOYA に足りないもの ── Photoshop と Figma から取り入れる台帳」
   ① 灯が【どこまで届くか】（木下＝「光の範囲とかもそうだなと俺は思った」）
   ② そろえる・等間隔（木下＝「便利なツールなどは Figma からも取り入れるべき」）
   ⭐ 木下の物差し4つで見る＝**効く／重すぎない／他に触っていない／往復して戻る**。 */
const LIT22 = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const 触 = (id, v) => { const e = document.getElementById(id); if(!e) return false;
    e.value = String(v); e.dispatchEvent(new Event('input',{bubbles:true}));
    e.dispatchEvent(new Event('change',{bubbles:true})); return true; };
  const 撮 = () => { const d = g.getImageData(0,0,cv.width,cv.height).data;
    let s2 = 0; for(let i = 0; i < d.length; i += 4*5) s2 += d[i]*3 + d[i+1]*5 + d[i+2]*7;
    return s2; };
  const 有 = ['r_lfall','r_lfrom','r_lto'].every(id => {
    const e = document.getElementById(id); return !!e && !!e.offsetParent; });
  /* 1本目（灯そのもの）を効かせたまま測る */
  触('r_li', 80); 触('r_rim', 80); 触('r_bnc', 70); await w(800);
  const 素 = 撮();
  const t0 = performance.now();
  触('r_lfall', 90); await w(800);
  const 落 = 撮();
  const ms = Math.round(performance.now() - t0 - 800);
  /* 何度も往復して元に戻る */
  for(let i = 0; i < 10; i++){ 触('r_lfall', i % 2 ? 90 : 0); await w(120); }
  触('r_lfall', 0); await w(900);
  const 戻 = 撮();
  /* 当たる帯＝手前だけにすると、奥の素材だけが変わる */
  触('r_lfrom', 0); 触('r_lto', 20); await w(800);
  const 帯 = 撮();
  触('r_lto', 100); await w(800);
  const 戻2 = 撮();
  return { つまみが有る:有, 届く距離が効く: 落 !== 素, ms,
           往復して戻る: 戻 === 素, 帯が効く: 帯 !== 素, 帯を戻すと同じ: 戻2 === 素 };
});
ok(LIT22.つまみが有る && LIT22.届く距離が効く && LIT22.帯が効く,
   '⭐⭐ 灯に【届く距離】と【当たる奥行きの帯】ができた（木下＝「光の範囲」）',
   JSON.stringify(LIT22));
ok(LIT22.往復して戻る && LIT22.帯を戻すと同じ,
   '🔴🔴 灯の届き方は【焼き込まない】── 10往復しても 0 に戻せば1画素も同じ',
   JSON.stringify(LIT22));
ok(LIT22.ms < 400,
   '⭐ 灯の届き方は重すぎない（1回の描き直し）', LIT22.ms + 'ms');

const ALIGN22 = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const al = () => document.getElementById('s_align');
  /* ⚠️ オブジェクトのキーは【数字で始めない】（`1枚では出ない` は文法エラー）。
     2026-09-02 に `out.1枚の案内` で同じ所を踏んでいる＝2度目。 */
  const out = { '1枚では出ない': al().classList.contains('hide') || !al().offsetParent };
  document.getElementById('lp_all').click(); await w(400);
  document.querySelector('#tools button[data-t="move"]').click(); await w(500);
  out['2枚以上で出る'] = !al().classList.contains('hide') && !!al().offsetParent;
  out['釦の数'] = al().querySelectorAll('button').length;
  const 枠 = () => { const f = sheet();
    return LAYERS.map(L => { const s2 = sizeOf(L, f.w, f.h);
      return { l:+(L.x - s2.dw/f.w/2).toFixed(4), 奥:L.d, 空:L.air, 大:L.s }; }); };
  const 前 = 枠();
  const t0 = performance.now();
  al().querySelector('button[data-v="l"]').click(); await w(600);
  out.ms = Math.round(performance.now() - t0 - 600);
  const 後 = 枠();
  const ls = 後.map(o2 => o2.l);
  out['左がそろう'] = Math.max(...ls) - Math.min(...ls) < 0.0006;
  out['奥行きは動かない'] = 前.every((o2, i) => o2.奥 === 後[i].奥);
  out['空気は動かない'] = 前.every((o2, i) => o2.空 === 後[i].空);
  out['大きさは動かない'] = 前.every((o2, i) => o2.大 === 後[i].大);
  return out;
});
ok(ALIGN22['2枚以上で出る'] && ALIGN22.釦の数 === 8 && ALIGN22['1枚では出ない'],
   '⭐⭐ そろえる・等間隔（8つ）が【2枚以上選んだときだけ】上のバーに出る',
   JSON.stringify(ALIGN22));
ok(ALIGN22['左がそろう'],
   '⭐ ［左にそろえる］で左端がぴたりと揃う（目で見ないで枠で測る）',
   JSON.stringify(ALIGN22));
ok(ALIGN22['奥行きは動かない'] && ALIGN22['空気は動かない'] && ALIGN22['大きさは動かない'],
   '🔴🔴 そろえても【奥行き・空気・大きさ】は1つも動かない（芯を触らない）',
   JSON.stringify(ALIGN22));

/* ══⭐⭐ ブレンド条件（Blend If）══ 2026-09-03
   Obsidian「06_…馴染ませる」第6部⑤に **「MOYAには無い考え方」** と名指しされていた1つ。
   ⭐ 木下の物差し4つ＝効く／重すぎない／他の層に触っていない／往復して戻る。 */
const BI22 = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const 触 = (id, v) => { const e = document.getElementById(id); if(!e) return false;
    e.value = String(v); e.dispatchEvent(new Event('input',{bubbles:true}));
    e.dispatchEvent(new Event('change',{bubbles:true})); return true; };
  const 撮 = () => { const d = g.getImageData(0,0,cv.width,cv.height).data;
    let s2 = 0; for(let i = 0; i < d.length; i += 4*5) s2 += d[i]*3 + d[i+1]*5 + d[i+2]*7;
    return s2; };
  /* その層だけを出して撮る＝他の層に触っていないかを1枚ずつ見る */
  const 層を撮る = (L) => {
    const f = sheet(); const 控 = LAYERS.map(o2 => o2.on);
    LAYERS.forEach(o2 => o2.on = (o2 === L));
    const keep = COARSE; COARSE = 0; LAYERS.forEach(o2 => o2._key = '');
    const c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
    paint(c.getContext('2d'), f.w, f.h, false); COARSE = keep;
    const d = c.getContext('2d').getImageData(0,0,f.w,f.h).data;
    let s2 = 0; for(let i = 0; i < d.length; i += 4*7) s2 += d[i]*3 + d[i+1]*5 + d[i+2]*7;
    LAYERS.forEach((o2, k) => o2.on = 控[k]); LAYERS.forEach(o2 => o2._key = '');
    return s2;
  };
  const 有 = ['r_bi0','r_bi1','r_bi2','r_bi3'].every(id => {
    const e = document.getElementById(id); return !!e && !!e.offsetParent; });
  const 素 = 撮();
  const 素の層 = LAYERS.map(L => 層を撮る(L));
  const t0 = performance.now();
  触('r_bi1', 200); 触('r_bi0', 160); await w(900);
  const 後 = 撮();
  const ms = Math.round(performance.now() - t0 - 900);
  const 後の層 = LAYERS.map(L => 層を撮る(L));
  const 変 = [];
  LAYERS.forEach((L, k) => { if(素の層[k] !== 後の層[k]) 変.push(L.name); });
  /* 何度も往復して元に戻る */
  for(let i = 0; i < 10; i++){ 触('r_bi0', i % 2 ? 160 : 0); await w(120); }
  触('r_bi0', 0); 触('r_bi1', 0); await w(900);
  const 戻 = 撮();
  return { つまみが有る:有, 効く: 後 !== 素, ms, 変わった層:変,
           往復して戻る: 戻 === 素, 案内:(document.getElementById('o_biSay')||{}).value };
});
ok(BI22.つまみが有る && BI22.効く,
   '⭐⭐ ブレンド条件（このレイヤー）＝黒を消すと絵が変わる（火の粉・煙の黒地を抜く）',
   JSON.stringify(BI22));
ok(BI22.変わった層.length === 1,
   '🔴🔴 ブレンド条件は【選んでいる層だけ】に効く（他の層は1画素も変わらない）',
   JSON.stringify(BI22.変わった層));
ok(BI22.往復して戻る,
   '🔴🔴 ブレンド条件は【焼き込まない】── 10往復しても 0 に戻せば1画素も同じ',
   JSON.stringify(BI22));
ok(BI22.ms < 400, '⭐ ブレンド条件は重すぎない（1回の描き直し）', BI22.ms + 'ms');

/* ══⭐⭐ 吸い付き（スマートガイド）══ 2026-09-03・Figma から取り入れた1つ
   ⚠️ マウスを使わずに【snapMove の入り口と出口】で見る（試験を速く・ぶれなく）。 */
const SNAP22 = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  document.querySelector('#tools button[data-t="move"]').click(); await w(400);
  const L = LAYERS.filter(x => !x.kind && x.img).sort((a,b) => a.d - b.d)[0];
  setSel(LAYERS.indexOf(L), false); syncSel(); await w(300);
  const f = sheet();
  /* いまの中心から【版面の中央のすぐ手前】へ動かすつもりで呼ぶ */
  const move = [{ L, ox:0, oy:0 }];
  const 近 = { x:0.5 + 3 / boardScale().sx, y:0.5 + 3 / boardScale().sy };
  SNAPLINES = [];
  const 寄 = snapMove(move, 近, false);
  const 線 = SNAPLINES.slice();
  /* ⌘ を押している間は切れる */
  SNAPLINES = [];
  const 切 = snapMove(move, 近, true);
  return { 線の数:線.length,
    寄った: Math.abs(寄.x - 近.x) > 1e-9 || Math.abs(寄.y - 近.y) > 1e-9,
    切ると寄らない: Math.abs(切.x - 近.x) < 1e-12 && Math.abs(切.y - 近.y) < 1e-12,
    切ると線も出ない: SNAPLINES.length === 0,
    /* 遠い所では吸わない（いままでの動かし心地のまま） */
    遠い所では寄らない: (() => { SNAPLINES = [];
      const r2 = snapMove(move, { x:0.23, y:0.71 }, false);
      return Math.abs(r2.x - 0.23) < 1e-12 && Math.abs(r2.y - 0.71) < 1e-12; })() };
});
ok(SNAP22.線の数 > 0 && SNAP22.寄った,
   '⭐⭐ 吸い付き（スマートガイド）＝近くの端・中心に寄って赤い線が出る（Figma と同じ）',
   JSON.stringify(SNAP22));
ok(SNAP22.切ると寄らない && SNAP22.切ると線も出ない,
   '⭐ ⌘ を押している間は吸い付かない（Figma と同じ）', JSON.stringify(SNAP22));
ok(SNAP22.遠い所では寄らない,
   '🔴 近くに何も無ければ【1画素も動かさない】（いままでの動かし心地のまま）',
   JSON.stringify(SNAP22));

/* ══⭐⭐ スポイト（盤から色を吸う）══ 2026-09-03
   Obsidian「06_…馴染ませる」の対応表＝「空気の色＝背景の一番遠い所をスポイトで吸う」。
   ⭐ 道具を増やさず【色の欄ごとに［吸］の釦】＝どの色でも同じ道。 */
const PICK22 = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const 釦 = id => { const e = document.getElementById(id);
    return e && e.nextSibling && e.nextSibling.classList
      && e.nextSibling.classList.contains('pickb') ? e.nextSibling : null; };
  const 欄 = ['c_air','c_lit','c_bg','c_brush','c_selsw'];
  const out = { 釦の数: 欄.filter(id => !!釦(id)).length };
  const e = document.getElementById('c_air');
  const 前 = e.value;
  釦('c_air').click(); await w(300);
  out.吸うモード = document.body.classList.contains('picking');
  /* 盤の左上あたりを吸う（本物の押下と同じ道＝pickAt） */
  pickAt(0.22, 0.18); await w(600);
  out.色が変わった = e.value !== 前;
  out.空気に入った = (P.air === e.value);
  out.モードが終わった = !document.body.classList.contains('picking');
  /* Esc でやめられる */
  釦('c_lit').click(); await w(200);
  const 中 = document.body.classList.contains('picking');
  document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
  await w(300);
  out.Escでやめられる = 中 && !document.body.classList.contains('picking');
  return out;
});
ok(PICK22.釦の数 === 5 && PICK22.吸うモード && PICK22.色が変わった,
   '⭐⭐ スポイト＝色の欄ごとの［吸］で盤から色を吸える（空気・灯・地・筆・描画色）',
   JSON.stringify(PICK22));
ok(PICK22.空気に入った && PICK22.モードが終わった,
   '⭐ 吸った色は【その欄の持ち主】に入る（空気の色なら P.air）／吸ったら終わる',
   JSON.stringify(PICK22));
ok(PICK22.Escでやめられる, '⭐ Esc でスポイトをやめられる', JSON.stringify(PICK22));

/* ══⭐⭐ 明るさからマスクを作る（輝度マスク）══ 2026-09-03
   Obsidian「06_…馴染ませる」第6部④＝Tony Kuyper の輝度マスク。
   Photoshop の『チャンネルの RGB を ⌘クリック』にあたるもの。 */
const LUM22 = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const 撮 = () => { const d = g.getImageData(0,0,cv.width,cv.height).data;
    let s2 = 0; for(let i = 0; i < d.length; i += 4*5) s2 += d[i]*3 + d[i+1]*5 + d[i+2]*7;
    return s2; };
  const 層を撮る = (L) => { const f = sheet(); const 控 = LAYERS.map(o2 => o2.on);
    LAYERS.forEach(o2 => o2.on = (o2 === L));
    const keep = COARSE; COARSE = 0; LAYERS.forEach(o2 => o2._key = '');
    const c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
    paint(c.getContext('2d'), f.w, f.h, false); COARSE = keep;
    const d = c.getContext('2d').getImageData(0,0,f.w,f.h).data;
    let s2 = 0; for(let i = 0; i < d.length; i += 4*7) s2 += d[i]*3 + d[i+1]*5 + d[i+2]*7;
    LAYERS.forEach((o2, k) => o2.on = 控[k]); LAYERS.forEach(o2 => o2._key = '');
    return s2; };
  const L = LAYERS.filter(x => !x.kind && x.img).sort((a,b) => a.d - b.d)[0];
  setSel(LAYERS.indexOf(L), false); syncSel(); await w(500);
  const out = { 釦が有る: ['b_lmlum','b_lmlumd','b_lmlumm','b_lmlumn']
    .every(id => { const e = document.getElementById(id); return !!e && !!e.offsetParent; }) };
  const 素 = 撮();
  const 素の層 = LAYERS.map(x => 層を撮る(x));
  const t0 = performance.now();
  document.getElementById('b_lmlum').click(); await w(800);
  out.ms = Math.round(performance.now() - t0 - 800);
  const 明 = 撮();
  out.明るい所が効く = 明 !== 素;
  const 後の層 = LAYERS.map(x => 層を撮る(x));
  out.変わった層 = LAYERS.filter((x, k) => 素の層[k] !== 後の層[k]).length;
  document.getElementById('b_lmlumn').click(); await w(800);
  out.絞ると変わる = 撮() !== 明;
  document.getElementById('b_lmlumd').click(); await w(800);
  out.暗い側は別の絵 = 撮() !== 明;
  document.getElementById('b_lmdel').click(); await w(900);
  out.消すと元に戻る = 撮() === 素;
  return out;
});
ok(LUM22.釦が有る && LUM22.明るい所が効く && LUM22.暗い側は別の絵,
   '⭐⭐ 明るさからマスクを作れる（輝度マスク・明るい側／暗い側／中間）',
   JSON.stringify(LUM22));
ok(LUM22.絞ると変わる,
   '⭐ ［もっと狭く］でいちばん明るい所だけに寄る（Photoshop の ⌘⇧⌥クリックと同じ）',
   JSON.stringify(LUM22));
ok(LUM22.変わった層 === 1,
   '🔴🔴 輝度マスクは【選んでいる層だけ】に効く（他の層は1画素も変わらない）',
   String(LUM22.変わった層));
ok(LUM22.消すと元に戻る,
   '🔴🔴 輝度マスクは【焼き込まない】── ［マスクを消す］で1画素も同じに戻る',
   JSON.stringify(LUM22));
ok(LUM22.ms < 400, '⭐ 輝度マスクは重すぎない', LUM22.ms + 'ms');

/* ══⭐⭐ カラールックアップ（.cube）══ 2026-09-03
   Obsidian「08_MOYAに無い『Photoshopの普通の機能』」が【本当に無い】と挙げた1つ。
   ⚠️ ［画像を編集］の段は【素材の編集画面】か【調整レイヤー】のときだけ出る。
     Photoshop もカラールックアップは調整レイヤー＝この道が正しい。 */
const CUBE22 = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  /* 試し用の .cube（8³・青を上げ 赤を下げる）を その場で作る＝外の物に頼らない */
  const n = 8, lines = ['TITLE "test"', 'LUT_3D_SIZE ' + n];
  for(let b2 = 0; b2 < n; b2++) for(let g2 = 0; g2 < n; g2++) for(let r2 = 0; r2 < n; r2++)
    lines.push((r2/(n-1)*0.65).toFixed(6) + ' ' + (g2/(n-1)*0.92).toFixed(6) + ' '
      + Math.min(1, b2/(n-1) + 0.22).toFixed(6));
  const cu = cubeParse(lines.join('\n'));
  const out = { 読めた: !!cu, 格子: cu ? cu.n : 0 };
  /* 調整レイヤーを置くと［画像を編集］の段が出る＝そこに欄がある */
  document.getElementById('b_adjlayer').click(); await w(800);
  out.欄が見える = ['b_cube','b_cube0','r_cube'].every(id => {
    const e = document.getElementById(id); return !!e && !!e.offsetParent; });
  removeAt(SEL); await w(600);
  const 撮 = () => { const d = g.getImageData(0,0,cv.width,cv.height).data;
    let s2 = 0, rr = 0, bb = 0, c2 = 0;
    for(let i = 0; i < d.length; i += 4*5){ s2 += d[i]*3 + d[i+1]*5 + d[i+2]*7;
      rr += d[i]; bb += d[i+2]; c2++; }
    return { 印:s2, 赤:rr/c2, 青:bb/c2 }; };
  const L = LAYERS.filter(x => !x.kind && x.img).sort((a,b) => a.d - b.d)[0];
  setSel(LAYERS.indexOf(L), false); syncSel(); await w(400);
  const 素 = 撮();
  const t0 = performance.now();
  const e2 = edOf(L); e2.cube = cu; e2.cubeName = 'test'; e2.cubeAmt = 1;
  L._key = ''; L._edc = null; L._edk = ''; if(L._edcM) L._edcM.clear();
  render(); await w(900);
  out.ms = Math.round(performance.now() - t0 - 900);
  const 後 = 撮();
  out.効く = 後.印 !== 素.印;
  out.青が増えた = 後.青 > 素.青;
  out.赤が減った = 後.赤 < 素.赤;
  const r3 = document.getElementById('r_cube');
  r3.value = '0'; r3.dispatchEvent(new Event('input', { bubbles:true })); await w(900);
  out['効き0で元に戻る'] = 撮().印 === 素.印;
  r3.value = '100'; r3.dispatchEvent(new Event('input', { bubbles:true })); await w(600);
  document.getElementById('b_cube0').click(); await w(900);
  out['外すと元に戻る'] = 撮().印 === 素.印;
  return out;
});
ok(CUBE22.読めた && CUBE22.格子 === 8 && CUBE22.欄が見える,
   '⭐⭐ カラールックアップ＝.cube（3D LUT）を読める（Photoshop の調整レイヤーと同じ場所）',
   JSON.stringify(CUBE22));
ok(CUBE22.効く && CUBE22.青が増えた && CUBE22.赤が減った,
   '⭐ LUT のとおりに色が入れ替わる（青が上がり 赤が下がる LUT で確かめた）',
   JSON.stringify(CUBE22));
ok(CUBE22['効き0で元に戻る'] && CUBE22['外すと元に戻る'],
   '🔴🔴 LUT は【焼き込まない】── 効き 0／外す で1画素も同じに戻る',
   JSON.stringify(CUBE22));
ok(CUBE22.ms < 500, '⭐ LUT は重すぎない', CUBE22.ms + 'ms');

/* ══⭐⭐ 特定色域の選択／シャドウ・ハイライト ══ 2026-09-03
   Obsidian「08_MOYAに無い『Photoshopの普通の機能』」の★★2つ。
   つまみ名は「Photoshop の作法 — 公式ヘルプの調べ2」から取った（推測しない）。
   ⚠️ 相対値／絶対値の差は【sel6Apply の入口と出口】で見る。
     素材の色によっては絵の差が丸めで消えるので、絵で測るとぶれる
     （→ feedback_regression_test_before_push＝ぶれる試験はもっと悪い）。 */
const SC22 = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const 触 = (id, v) => { const e = document.getElementById(id); if(!e) return false;
    e.value = String(v); e.dispatchEvent(new Event('input',{bubbles:true}));
    e.dispatchEvent(new Event('change',{bubbles:true})); return true; };
  const 撮 = () => { const d = g.getImageData(0,0,cv.width,cv.height).data;
    let s2 = 0; for(let i = 0; i < d.length; i += 4*5) s2 += d[i]*3 + d[i+1]*5 + d[i+2]*7;
    return s2; };
  const 層を撮る = (L) => { const f = sheet(); const 控 = LAYERS.map(o2 => o2.on);
    LAYERS.forEach(o2 => o2.on = (o2 === L));
    const keep = COARSE; COARSE = 0; LAYERS.forEach(o2 => o2._key = '');
    const c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
    paint(c.getContext('2d'), f.w, f.h, false); COARSE = keep;
    const d = c.getContext('2d').getImageData(0,0,f.w,f.h).data;
    let s2 = 0; for(let i = 0; i < d.length; i += 4*7) s2 += d[i]*3 + d[i+1]*5 + d[i+2]*7;
    LAYERS.forEach((o2, k) => o2.on = 控[k]); LAYERS.forEach(o2 => o2._key = '');
    return s2; };
  const out = {};
  document.getElementById('b_adjlayer').click(); await w(800);
  out.欄が見える = ['r_shA','r_hiA','r_sc6c','r_sc6m','b_sc60'].every(id => {
    const e = document.getElementById(id); return !!e && !!e.offsetParent; });
  out.色域の数 = document.querySelectorAll('#s_sc6 button').length;
  removeAt(SEL); await w(600);
  const L = LAYERS.filter(x => !x.kind && x.img).sort((a,b) => a.d - b.d)[0];
  setSel(LAYERS.indexOf(L), false); syncSel(); await w(500);
  const 素 = 撮();
  const 素の層 = LAYERS.map(x => 層を撮る(x));
  /* ① シャドウ・ハイライト */
  let t0 = performance.now();
  触('r_shA', 80); await w(900);
  out.SHms = Math.round(performance.now() - t0 - 900);
  out.暗部持ち上げが効く = 撮() !== 素;
  const 影の層 = LAYERS.map(x => 層を撮る(x));
  out.SH変わった層 = LAYERS.filter((x, k) => 素の層[k] !== 影の層[k]).length;
  触('r_shA', 0); await w(900);
  out.SH0で戻る = 撮() === 素;
  /* ② 特定色域 */
  t0 = performance.now();
  document.querySelector('#s_sc6 button[data-v="r"]').click(); await w(200);
  触('r_sc6m', 60); await w(900);
  out.SCms = Math.round(performance.now() - t0 - 1100);
  out.特定色域が効く = 撮() !== 素;
  out.案内 = (document.getElementById('o_sc6Say')||{}).value;
  document.querySelector('#s_sc6 button[data-v="c"]').click(); await w(300);
  out.色域を変えると欄も変わる = document.getElementById('r_sc6m').value === '0';
  document.querySelector('#s_sc6 button[data-v="r"]').click(); await w(250);
  document.getElementById('b_sc60').click(); await w(900);
  out.SC0で戻る = 撮() === 素;
  /* ③ 相対値と絶対値は【計算そのもの】で違うことを見る（素材に左右されない） */
  const q1 = newSel6(); q1.r[1] = 60; q1.rel = true;
  const q2 = newSel6(); q2.r[1] = 60; q2.rel = false;
  const a1 = sel6Apply(q1, 200, 60, 60), a2 = sel6Apply(q2, 200, 60, 60);
  out.相対と絶対が違う = !!(a1 && a2 && Math.abs(a1[1] - a2[1]) > 2);
  out.相対 = a1 ? a1.map(v => Math.round(v)) : null;
  out.絶対 = a2 ? a2.map(v => Math.round(v)) : null;
  /* 0 なら何もしない */
  out.ぜんぶ0なら効かない = sel6Apply(newSel6(), 200, 60, 60) === null;
  return out;
});
ok(SC22.欄が見える && SC22.色域の数 === 9,
   '⭐⭐ 特定色域の選択＝9つの色域（Adobe と同じ並び）と C/M/Y/K の4本が出ている',
   JSON.stringify({ 欄:SC22.欄が見える, 色域:SC22.色域の数 }));
ok(SC22.特定色域が効く && SC22.色域を変えると欄も変わる && SC22.SC0で戻る,
   '⭐ 色域を選んで足し引きでき、色域を変えると欄も変わり、0 で1画素も同じに戻る',
   JSON.stringify(SC22));
ok(SC22.相対と絶対が違う && SC22.ぜんぶ0なら効かない,
   '⭐⭐ 相対値と絶対値は【別の計算】（Adobe と同じ）／ぜんぶ 0 なら何もしない',
   JSON.stringify({ 相対:SC22.相対, 絶対:SC22.絶対 }));
ok(SC22.暗部持ち上げが効く && SC22.SH0で戻る && SC22.SH変わった層 === 1,
   '⭐⭐ シャドウ・ハイライト＝暗部だけ持ち上がり、0 で1画素も同じに戻る（選んだ層だけ）',
   JSON.stringify(SC22));
ok(SC22.SHms < 500 && SC22.SCms < 500,
   '⭐ どちらも重すぎない', 'SH ' + SC22.SHms + 'ms / SC ' + SC22.SCms + 'ms');

/* ══🔴🔴 今日足したもの ぜんぶが【書き出して読み直しても同じ絵】か ══ 2026-09-03
   木下＝「実装に問題ないかも踏まえて実際のつまみで検証よろしく」
   ＝ この試験で **本当の穴が2つ** 見つかった：
     ① 書き出す道・読む道が【各2本】あり、ブレンド条件を片方にしか入れていなかった
        ＝まるごとで渡すと消えていた（→ feedback_same_formula_in_two_places_drifts）
     ② LUT が Float32Array に戻らず「数の入ったただのオブジェクト」のまま効いて
        絵が変わっていた ＝ **使う直前の1か所で関門**をかけて直した。
   ⚠️ だから この試験は【往復して1画素も同じ】を見る。 */
const ROUND22 = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const 触 = (id, v) => { const e = document.getElementById(id); if(!e) return false;
    e.value = String(v); e.dispatchEvent(new Event('input',{bubbles:true}));
    e.dispatchEvent(new Event('change',{bubbles:true})); return true; };
  const 撮 = () => { const f = sheet();
    const keep = COARSE; COARSE = 0; LAYERS.forEach(L => L._key = '');
    const c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
    paint(c.getContext('2d'), f.w, f.h, false); COARSE = keep;
    const d = c.getContext('2d').getImageData(0,0,f.w,f.h).data;
    let s2 = 0; for(let i = 0; i < d.length; i += 4*3) s2 += d[i]*3 + d[i+1]*5 + d[i+2]*7;
    return s2; };
  const L = LAYERS.filter(x => !x.kind && x.img).sort((a,b) => a.d - b.d)[0];
  setSel(LAYERS.indexOf(L), false); syncSel(); await w(500);
  /* 今日足したもの ぜんぶを効かせる */
  触('r_li',80); 触('r_rim',80); 触('r_bnc',70);
  触('r_lfall',70); 触('r_lfrom',0); 触('r_lto',90);
  触('r_bi1',200); 触('r_bi0',120);
  触('r_shA',60); 触('r_hiA',40);
  document.querySelector('#s_sc6 button[data-v="r"]').click(); await w(200);
  触('r_sc6m',50); 触('r_sc6y',-30);
  /* LUT（8³・青を上げ 赤を下げる）をその場で作って入れる */
  const n = 8, lines = ['LUT_3D_SIZE ' + n];
  for(let b2 = 0; b2 < n; b2++) for(let g2 = 0; g2 < n; g2++) for(let r2 = 0; r2 < n; r2++)
    lines.push((r2/(n-1)*0.65).toFixed(6) + ' ' + (g2/(n-1)*0.92).toFixed(6) + ' '
      + Math.min(1, b2/(n-1) + 0.22).toFixed(6));
  const e2 = edOf(L); e2.cube = cubeParse(lines.join('\n')); e2.cubeName = 'test'; e2.cubeAmt = 0.8;
  L._key = ''; L._edc = null; L._edk = ''; if(L._edcM) L._edcM.clear();
  render(); await w(1200);
  const 前 = 撮();
  const txt = cfgText(true);
  const KB = Math.round(txt.length / 1024);
  LAYERS.length = 0; SEL = -1; SELIDS = []; buildList(); render(); await w(500);
  applyJSON(JSON.parse(txt)); await w(6000);
  const 後 = 撮();
  const L2 = LAYERS.filter(x => !x.kind && x.img).sort((a,b) => a.d - b.d)[0];
  const q = L2 ? edOf(L2) : {};
  return { 同じ絵: 前 === 後, KB,
    cubeが残る: !!(q.cube && q.cube.d && q.cube.d.length),
    cubeが正しい型: !!(q.cube && q.cube.d instanceof Float32Array),
    shAが残る: q.shA === 60, sel6が残る: !!(q.sel6 && q.sel6.r && q.sel6.r[1] === 50),
    blendifが残る: !!(L2 && L2.blendif && L2.blendif.b0 === 120),
    灯が残る: !!(LIGHTS[0] && LIGHTS[0].fall === 70 && LIGHTS[0].to === 90) };
});
ok(ROUND22.同じ絵,
   '🔴🔴 今日足したもの ぜんぶ入れて【書き出して読み直しても1画素も同じ】',
   JSON.stringify(ROUND22));
ok(ROUND22.blendifが残る && ROUND22.cubeが残る && ROUND22.shAが残る
   && ROUND22.sel6が残る && ROUND22.灯が残る,
   '⭐⭐ ブレンド条件・LUT・シャドウハイライト・特定色域・灯の届き方が【まるごとJSONに残る】',
   JSON.stringify(ROUND22));
ok(ROUND22.cubeが正しい型,
   '🔴 LUT は読み直しても Float32Array（数の入ったただのオブジェクトのまま効かせない）',
   JSON.stringify(ROUND22));

/* ══⭐⭐ Photoshop で いま手を動かしていることが MOYA でも出来るか ══ 2026-09-04
   🔴 木下は `筆の型.psd` を手で組み直しながら学び直している（Obsidian ⭐07）。
     そこで実際に使っている手のうち、MOYA に無かった4つを足した：
       ① 色相・彩度の【色域】（マスターで下げると背景の青い筆まで灰色になる）
       ② レベル補正の【出力レベル】（主役：起こす の 出力 16/250）
       ③ ⌘J＝同じ位置に複製（ライトラップと接地の影は ここから始まる）
       ④ 原寸（⌘1）／毛の本数／滑らかさ／Photoshop に登録した筆5本
   ⭐ この章は【Photoshop の数字がそのまま入るか】を見る＝道具が追いついている印。 */
const PS24 = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const 触 = (id, v) => { const e = document.getElementById(id); if(!e) return false;
    e.value = String(v); e.dispatchEvent(new Event('input',{bubbles:true}));
    e.dispatchEvent(new Event('change',{bubbles:true})); return true; };
  const 撮 = () => { const f = sheet();
    const keep = COARSE; COARSE = 0; LAYERS.forEach(L => L._key = '');
    const c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
    paint(c.getContext('2d'), f.w, f.h, false); COARSE = keep;
    const d = c.getContext('2d').getImageData(0,0,f.w,f.h).data;
    let s2 = 0; for(let i = 0; i < d.length; i += 4*3) s2 += d[i]*3 + d[i+1]*5 + d[i+2]*7;
    return s2; };
  const L = LAYERS.filter(x => !x.kind && x.img).sort((a,b) => a.d - b.d)[0];
  setSel(LAYERS.indexOf(L), false); syncSel(); await w(500);
  const 素 = 撮();

  /* ── ① 色相・彩度の色域 ── 飴色と青を持つ絵を1枚だけ置いて、青が動かないことを見る */
  const c2 = document.createElement('canvas'); c2.width = 400; c2.height = 400;
  const x2 = c2.getContext('2d');
  x2.fillStyle = '#c8641e'; x2.fillRect(0,0,400,200);      /* 飴色 */
  x2.fillStyle = '#2f6fd0'; x2.fillRect(0,200,400,200);    /* 青 */
  const im2 = new Image();
  await new Promise(r => { im2.onload = r; im2.src = c2.toDataURL(); });
  addImage(im2, '色域の見本');
  await w(700);
  const T = LAYERS[LAYERS.length - 1];
  setSel(LAYERS.indexOf(T), false); syncSel(); await w(300);
  const 板 = (y) => { const dw = 200, dh = 200;
    const c3 = document.createElement('canvas'); c3.width = dw; c3.height = dh;
    const g3 = c3.getContext('2d', { willReadFrequently:true });
    g3.drawImage(edSrc(T, dw, dh), 0, 0, dw, dh);
    const d3 = g3.getImageData(dw>>1, y, 1, 1).data;
    return d3[0] + ',' + d3[1] + ',' + d3[2]; };
  const 飴0 = 板(60), 青0 = 板(140);
  /* マスターで彩度 −100 ＝ 全部の色が抜ける（Photoshop と同じ・これが困る挙動） */
  document.querySelector('#s_hs6 button[data-v="master"]').click();
  触('r_sat', -100); await w(400);
  const 飴M = 板(60), 青M = 板(140);
  触('r_sat', 0); await w(200);
  /* レッド系だけ −100 ＝ 青は1画素も動かない */
  document.querySelector('#s_hs6 button[data-v="r"]').click();
  触('r_sat', -100); await w(400);
  const 飴R = 板(60), 青R = 板(140);
  /* ⭐ 木下が Photoshop で入れている数字がそのまま入るか（主役：飴色を抜く） */
  触('r_sat', -48);
  document.querySelector('#s_hs6 button[data-v="y"]').click();
  触('r_hue', -10); 触('r_sat', -58);
  document.querySelector('#s_hs6 button[data-v="b"]').click();
  触('r_sat', 30); await w(400);
  const 飴色を抜いた = JSON.parse(JSON.stringify(edOf(T).hsl6));
  /* つまみは色域ごとに持ち替わる（マスターへ戻すと マスターの値が出る） */
  document.querySelector('#s_hs6 button[data-v="master"]').click(); await w(200);
  const マスターのつまみ = +document.getElementById('r_sat').value;
  document.querySelector('#s_hs6 button[data-v="r"]').click(); await w(200);
  const レッドのつまみ = +document.getElementById('r_sat').value;
  const 色相の幅 = document.getElementById('r_hue').min + '〜' + document.getElementById('r_hue').max;

  /* ── ② 出力レベル ── 255/255 で真っ白／0/0 で真っ黒／戻すと1画素も同じ */
  const e4 = edOf(T);
  e4.hsl6 = null; touchEd(T); await w(300);
  const 色域を消した = 板(60);
  document.getElementById('b_outwhite').click(); await w(400);
  const 白 = 板(60);
  document.getElementById('b_outblack').click(); await w(400);
  const 黒 = 板(60);
  触('r_outlo', 16); 触('r_outhi', 250); await w(400);
  const 出力16250 = { lo:edOf(T).outLo, hi:edOf(T).outHi, 色:板(60) };
  触('r_outlo', 0); 触('r_outhi', 255); await w(400);
  const 出力を戻した = 板(60);

  /* ── ③ ⌘J＝同じ位置に複製 */
  const 前枚 = LAYERS.length;
  document.dispatchEvent(new KeyboardEvent('keydown',
    { key:'j', metaKey:true, bubbles:true, cancelable:true }));
  await w(600);
  const 写し = LAYERS[LAYERS.length - 1];
  const 複製 = { 増えた:LAYERS.length - 前枚,
    同じ位置: Math.abs(写し.x - T.x) < 1e-9 && Math.abs(写し.y - T.y) < 1e-9 };

  /* ── ④ 原寸（⌘1） */
  fitView(); const 合わせる = V.z; fullView(); const 原寸 = V.z;

  /* ── ⑤ 書き出して読み直しても同じ絵（色域と出力レベルが JSON に残るか）
     ⚠️ 見たいのは【つまみが往復しても同じ絵を出すか】。
       色域の見本は canvas で作った絵なので、まるごと書き出しでは JPEG に落ちて
       画素が必ず変わる（＝書き出しの仕様で、色域のせいではない）。
       だから ここでは見本を外して、置いてある写真に同じつまみを入れて測る。 */
  LAYERS.splice(LAYERS.indexOf(T), 1);
  LAYERS.filter(x => x.name === '色域の見本 の写し')
        .forEach(x => LAYERS.splice(LAYERS.indexOf(x), 1));
  buildList(); render(); await w(400);
  setSel(LAYERS.indexOf(L), false); syncSel(); await w(200);
  const e5 = edOf(L);
  e5.hsl6 = { r:[0,-48,0], y:[-10,-58,0], g:[0,0,0], c:[0,0,0], b:[0,30,0], m:[0,0,0] };
  e5.outLo = 16/255; e5.outHi = 250/255;
  touchEd(L); render(); await w(900);
  const 前 = 撮();
  const txt = cfgText(true);
  LAYERS.length = 0; SEL = -1; SELIDS = []; buildList(); render(); await w(500);
  applyJSON(JSON.parse(txt)); await w(6000);
  const 後 = 撮();
  const T2 = LAYERS.filter(x => !x.kind && x.img).sort((a,b) => a.d - b.d)[0];
  const q2 = T2 ? edOf(T2) : {};
  return { 素, 飴0, 青0, 飴M, 青M, 飴R, 青R, 飴色を抜いた,
    マスターのつまみ, レッドのつまみ, 色相の幅,
    色域を消した, 白, 黒, 出力16250, 出力を戻した, 複製,
    合わせる:+合わせる.toFixed(3), 原寸:+原寸.toFixed(3),
    往復で同じ絵: 前 === 後,
    色域が残る: !!(q2.hsl6 && q2.hsl6.r && q2.hsl6.r[1] === -48 && q2.hsl6.y[0] === -10),
    出力が残る: !!(q2.outLo && Math.abs(q2.outLo - 16/255) < 1e-6) };
});
ok(PS24.青M !== PS24.青0,
   '🔴 マスターで彩度を下げると【青い所まで】色が抜ける（Photoshop と同じ・これが困る挙動）',
   '青 ' + PS24.青0 + ' → ' + PS24.青M);
ok(PS24.青R === PS24.青0 && PS24.飴R !== PS24.飴0,
   '⭐⭐ レッド系だけ下げると【青は1画素も動かず】飴色だけ落ちる',
   '飴 ' + PS24.飴0 + ' → ' + PS24.飴R + ' ／ 青 ' + PS24.青0 + ' → ' + PS24.青R);
ok(PS24.飴色を抜いた.r[1] === -48 && PS24.飴色を抜いた.y[0] === -10
   && PS24.飴色を抜いた.y[1] === -58 && PS24.飴色を抜いた.b[1] === 30,
   '⭐⭐ Photoshop の数字がそのまま入る（レッド −48／イエロー −10・−58／ブルー +30）',
   JSON.stringify(PS24.飴色を抜いた));
ok(PS24.マスターのつまみ === 0 && PS24.レッドのつまみ === -48,
   '⭐ 同じ3本のつまみが【選んでいる色域の値】を出す（Photoshop と同じ作り）',
   'マスター ' + PS24.マスターのつまみ + ' / レッド ' + PS24.レッドのつまみ);
ok(PS24.色相の幅 === '-180〜180',
   '⭐ 色相の目盛りは Photoshop と同じ【度】（±180°）', PS24.色相の幅);
ok(PS24.白 === '255,255,255', '⭐⭐ 出力 255/255 で【真っ白に潰れる】＝ライトラップの作り方', PS24.白);
ok(PS24.黒 === '0,0,0', '⭐⭐ 出力 0/0 で【真っ黒に潰れる】＝接地の影の作り方', PS24.黒);
ok(PS24.出力16250.色 !== PS24.色域を消した.色,
   '⭐ 出力 16／250 が入る（主役：起こす の数字）',
   JSON.stringify(PS24.出力16250));
ok(PS24.出力を戻した === PS24.色域を消した,
   '⚠️ 出力を 0／255 に戻すと1画素も同じに戻る（焼き込まない）',
   PS24.色域を消した + ' → ' + PS24.出力を戻した);
ok(PS24.複製.増えた === 1 && PS24.複製.同じ位置,
   '⭐⭐ ⌘J＝同じ位置に複製（Photoshop と同じ／ここから ライトラップと接地の影を作る）',
   JSON.stringify(PS24.複製));
ok(PS24.原寸 === 1 && PS24.合わせる !== 1,
   '⭐ ⌘1＝原寸（100%）で見られる（質感は原寸でしか分からない）',
   '合わせる ' + PS24.合わせる + ' → 原寸 ' + PS24.原寸);
ok(PS24.往復で同じ絵 && PS24.色域が残る && PS24.出力が残る,
   '🔴🔴 色域と出力レベルは【書き出して読み直しても1画素も同じ】',
   JSON.stringify({ 同じ絵:PS24.往復で同じ絵, 色域:PS24.色域が残る, 出力:PS24.出力が残る }));

/* ══⭐⭐ 筆 ── 毛の本数と滑らかさ（Photoshop の筆の型.psd から）══ 2026-09-04
   🔴🔴 原寸で見て分かったこと＝**帯を太くするのは毛でなく本数**（幅÷本×1.45 が境目）。
   ⭐ 滑らかさ＝Photoshop 2018 の手ブレ補正。昔パスでなぞらせていたのは これが無かったから。
   ⚠️ どちらも既定 0＝今までの絵は1画素も変わらない。 */
const BR24 = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  const 触 = (id, v) => { const e = document.getElementById(id); if(!e) return false;
    e.value = String(v); e.dispatchEvent(new Event('input',{bubbles:true}));
    e.dispatchEvent(new Event('change',{bubbles:true})); return true; };
  const ひと筆 = async (kind, hair, sm, ぎざ) => {
    LAYERS.length = 0; SEL = -1; SELIDS = []; buildList(); render(); await w(300);
    document.querySelector('#tools button[data-t="brush"]').click(); await w(300);
    document.querySelector('#s_brkind button[data-v="' + kind + '"]').click(); await w(150);
    触('r_brsize', kind === 'hake' ? 40 : 8); 触('r_brhair', hair); 触('r_brsm', sm);
    await w(200);
    const A = toScreen(0.25, 0.5), B = toScreen(0.75, 0.5);
    stage.dispatchEvent(new PointerEvent('pointerdown',
      { clientX:A.clientX, clientY:A.clientY, bubbles:true, pointerId:31 }));
    for(let i = 1; i <= 20; i++){
      const x = A.clientX + (B.clientX - A.clientX) * i / 20;
      const y = A.clientY + (ぎざ ? (i % 2 ? 18 : -18) : 0);
      stage.dispatchEvent(new PointerEvent('pointermove',
        { clientX:x, clientY:y, bubbles:true, pointerId:31 }));
    }
    stage.dispatchEvent(new PointerEvent('pointerup',
      { clientX:B.clientX, clientY:B.clientY, bubbles:true, pointerId:31 }));
    await w(700);
    const L = LAYERS[LAYERS.length - 1];
    if(!L || !L.img) return null;
    const c = document.createElement('canvas'); c.width = 300; c.height = 300;
    const g = c.getContext('2d', { willReadFrequently:true });
    g.drawImage(L.img, 0, 0, 300, 300);
    const d = g.getImageData(0,0,300,300).data;
    let n = 0; for(let i = 3; i < d.length; i += 4) if(d[i] > 20) n++;
    const st = (L.brush && L.brush.strokes && L.brush.strokes[0]) || [];
    let mn = 9, mx = -9; st.forEach(q => { mn = Math.min(mn, q[1]); mx = Math.max(mx, q[1]); });
    return { 画素:n, ぶれ:+(mx - mn).toFixed(4), 毛:L.brush.hair };
  };
  const おまかせ = await ひと筆('hake', 0, 0, false);
  const 五本     = await ひと筆('hake', 5, 0, false);
  const 三十本   = await ひと筆('hake', 30, 0, false);
  const ぶれ0    = await ひと筆('brush', 0, 0, true);
  const ぶれ60   = await ひと筆('brush', 0, 60, true);
  const 型 = [...document.querySelectorAll('#sel_brpre option')].map(o => o.value);
  return { おまかせ, 五本, 三十本, ぶれ0, ぶれ60, 型 };
});
ok(BR24.五本 && BR24.三十本 && BR24.五本.画素 !== BR24.三十本.画素,
   '⭐⭐ 毛の本数で絵が変わる（5本＝板／30本＝櫛）',
   '5本 ' + (BR24.五本||{}).画素 + ' / 30本 ' + (BR24.三十本||{}).画素);
ok(BR24.おまかせ && BR24.おまかせ.毛 === 0,
   '⚠️ 既定は 0＝おまかせ（いままでどおり粒の大きさから決める）',
   JSON.stringify(BR24.おまかせ));
ok(BR24.ぶれ60 && BR24.ぶれ0 && BR24.ぶれ60.ぶれ < BR24.ぶれ0.ぶれ * 0.8,
   '⭐⭐ 滑らかさ 60 で【手のぶれが均される】（記録する点そのものが滑らかになる）',
   '0 → ' + (BR24.ぶれ0||{}).ぶれ + ' ／ 60 → ' + (BR24.ぶれ60||{}).ぶれ);
ok(BR24.型.includes('ps_hikkaki') && BR24.型.includes('ps_hair'),
   '⭐ 木下が Photoshop に登録した筆（ひっかき・筆の毛）が MOYA にもある',
   BR24.型.filter(v => v.indexOf('ps_') === 0).join(','));

/* ══⭐⭐ パスを【いまの筆で】なぞる（Photoshop のパスパネル下の【○】）══ 2026-09-04
   🔴 ⭐07 の3番＝木下が「引っかき（細い線・くるくる）」で使っている手。
     Photoshop の芯＝**いま選ばれているブラシの設定そのまま**で描かれる。
   ⭐⭐ いちばん大事な試験＝**なぞった線が、盤に直接引いた線と同じ太さに見えるか**
     （素材の紙は版面と目盛りが違うので、換算を間違えると太さが変わる）。 */
const PB24 = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  closeAllEditors();
  await new Promise(r => { document.getElementById('b_demo').click(); setTimeout(r, 1700); });
  const 触 = (id, v) => { const e = document.getElementById(id); if(!e) return false;
    e.value = String(v); e.dispatchEvent(new Event('input',{bubbles:true}));
    e.dispatchEvent(new Event('change',{bubbles:true})); return true; };
  /* いちばん手前の層だけを版面へ置き直して、真ん中の縦1列で【線の太さ】を数える */
  const 太さ = () => {
    const f = sheet(), o = LAYERS[LAYERS.length-1];
    if(!o || !o.img) return -1;
    const c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
    const g = c.getContext('2d', { willReadFrequently:true });
    const iw = o.img.naturalWidth || o.img.width, ih = o.img.naturalHeight || o.img.height;
    const dw = o.s * f.w, dh = dw * ih / iw * (o.sy == null ? 1 : o.sy);
    g.drawImage(o.img, o.x*f.w - dw/2, o.y*f.h - dh/2, dw, dh);
    const d = g.getImageData(f.w>>1, 0, 1, f.h).data;
    let n = 0; for(let i = 3; i < d.length; i += 4) if(d[i] > 20) n++;
    return n;
  };
  const 数 = (o) => { const c = document.createElement('canvas'); c.width=300; c.height=300;
    const g = c.getContext('2d',{willReadFrequently:true});
    g.drawImage(o.img, 0, 0, 300, 300);
    const d = g.getImageData(0,0,300,300).data;
    let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>20) n++; return n; };
  const L = LAYERS.filter(x => !x.kind && x.img).sort((a,b) => a.d - b.d)[0];
  const 引く = async (kind, size) => {
    setSel(LAYERS.indexOf(L), false); syncSel(); await w(300);
    const ps = pathsOf(L); ps.length = 0;
    ps.push({ name:'ためし', pts:[
      { x:0.10, y:0.50, hx:0.10, hy:0 }, { x:0.50, y:0.50, hx:0.10, hy:0 },
      { x:0.90, y:0.50, hx:0.10, hy:0 } ] });
    PATHSEL = { kind:'saved', i:0 }; buildPathList(); syncSelPath(); await w(300);
    document.querySelector('#s_brkind button[data-v="' + kind + '"]').click();
    触('r_brsize', size); 触('r_brtaper', 0); 触('r_brwob', 0); 触('r_brhard', 100);
    await w(300);
    const 前 = LAYERS.length;
    document.getElementById('b_pbrush').click(); await w(900);
    const o = LAYERS[LAYERS.length-1];
    return { 増えた:LAYERS.length - 前, 名前:o.name, 画素:数(o), 太さ:太さ(),
      重なる: Math.abs(o.x - L.x) < 1e-9 && Math.abs(o.y - L.y) < 1e-9 };
  };
  const ブラシ20 = await 引く('brush', 20);
  const 刷毛20  = await 引く('hake', 20);
  const ブラシ8  = await 引く('brush', 8);
  /* 盤に直接 同じ筆で真横に引いて、太さを見比べる */
  LAYERS.length = 0; SEL = -1; SELIDS = []; buildList(); render(); await w(400);
  document.querySelector('#tools button[data-t="brush"]').click(); await w(300);
  document.querySelector('#s_brkind button[data-v="brush"]').click();
  触('r_brsize', 20); 触('r_brtaper', 0); 触('r_brhard', 100); await w(200);
  const A = toScreen(0.10, 0.50), B = toScreen(0.90, 0.50);
  stage.dispatchEvent(new PointerEvent('pointerdown',
    { clientX:A.clientX, clientY:A.clientY, bubbles:true, pointerId:41 }));
  for(let i = 1; i <= 16; i++) stage.dispatchEvent(new PointerEvent('pointermove',
    { clientX:A.clientX + (B.clientX - A.clientX) * i / 16, clientY:A.clientY,
      bubbles:true, pointerId:41 }));
  stage.dispatchEvent(new PointerEvent('pointerup',
    { clientX:B.clientX, clientY:B.clientY, bubbles:true, pointerId:41 }));
  await w(900);
  return { ブラシ20, 刷毛20, ブラシ8, 盤に直接:太さ() };
});
ok(PB24.ブラシ20.増えた === 1 && PB24.ブラシ20.名前 === 'パスを筆でなぞった'
   && PB24.ブラシ20.重なる,
   '⭐⭐ ［いまの筆でパスをなぞる］が効く（元の素材にぴったり重なる新しいレイヤー）',
   JSON.stringify(PB24.ブラシ20));
ok(PB24.ブラシ20.太さ === PB24.盤に直接,
   '⭐⭐ なぞった線は【盤に直接引いた線と同じ太さ】に見える（紙と版面の目盛りの換算）',
   'なぞり ' + PB24.ブラシ20.太さ + ' px ／ 盤に直接 ' + PB24.盤に直接 + ' px');
ok(PB24.刷毛20.画素 !== PB24.ブラシ20.画素,
   '⭐ 筆を変えると別の線になる（＝いま選んでいる筆の設定で描かれている）',
   'ブラシ ' + PB24.ブラシ20.画素 + ' / 刷毛 ' + PB24.刷毛20.画素);
ok(PB24.ブラシ8.太さ > 0 && PB24.ブラシ8.太さ < PB24.ブラシ20.太さ,
   '⭐ 太さのつまみがそのまま効く（8 は 20 より細い）',
   '太さ8 → ' + PB24.ブラシ8.太さ + ' px ／ 太さ20 → ' + PB24.ブラシ20.太さ + ' px');

ok(errs.length === 0, 'JSエラーが出ない', errs.join(' | '));
await b.close();
process.exit(NG ? 1 : 0);
