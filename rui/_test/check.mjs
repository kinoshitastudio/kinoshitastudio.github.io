/* ⭐ 累 RUI の回帰テスト ── 直したら流す。
   🔴 見るのは「エラーが出ないか」ではなく、次を数字で見る：
     ① つまみを動かして【絵が変わるか】（動くのに効かないつまみを作らない）
     ② この道具の芯＝【円の直径が升目より大きいか】で結果が変わるか
        （×1.00 以下なら「抜く」「重なりだけ」は何も出ない、を数値で確かめる）
     ③ 版の中の重なり方 3つ（塗る／抜く／重なりだけ）が本当に違う絵になるか
     ④ PNG / 地なしPNG / SVG が本当に落ちるか・地なしが本当に透明か
     ⑤ ⌘Z が本当に戻るか
     ⑥ 見本4つが全部違う絵になるか（型を置いた意味があるか）
     ⑦ 実機幅でつまみが掴めるか・縦スクロールが止まっていないか
   ⭐ 物差しは【本体と同じ buildPlan()】から取る。画面の画素で比べると縁の塗り方の
      揺れで落ちる（TEN で実測済み）。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const URL = process.argv[2] || 'http://localhost:8094/projects/rui_tk/';
const b = await puppeteer.launch({
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox'] });
const p = await b.newPage();
let errs = 0;
p.on('pageerror', e => { errs++; console.log('🔴 JSエラー:', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(URL, { waitUntil:'networkidle0' });
/* ⚠️ 前に触った状態がこのブラウザに残っているので必ず消してから測る */
await p.evaluate(() => { try{ localStorage.clear(); }catch(_){} });
await p.reload({ waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 1800));

let ng = [];
const check = (ok, name, note) => {
  console.log(`  ${ok ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`);
  if(!ok) ng.push(name);
};

/* 落ちてくるものを横取りする */
await p.evaluate(() => {
  window.__got = [];
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(x){ window.__got.push({ size:x.size, type:x.type }); return oc.call(URL, x); };
});

/* ── 物差し ── */
const hash = t => { let h = 2166136261;
  for(let i = 0; i < t.length; i++){ h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h>>>0); };
const sig = () => p.evaluate(() => {
  const s = size(); const pl = buildPlan(s.W, s.H);
  return JSON.stringify(pl); }).then(t => hash(t) + ':' + t.length);
/* 版ごとの「実際に色が乗った画素の数」＝出ているか出ていないかを直接測る。
   ⭐ 刷るのは本体の paintPlate()。テスト側で同じ式を書き直さない
      （書き直したら、本体を直したのに物差しが古いままで空振りした）。 */
const inkOf = i => p.evaluate(i => {
  const s = size(), pl = buildPlan(s.W, s.H), q = pl.plates[i];
  if(!q) return -1;
  const lay = paintPlate(q, s.W, s.H);
  const d = lay.getContext('2d').getImageData(0, 0, s.W, s.H).data;
  let n = 0; for(let k = 3; k < d.length; k += 4) if(d[k] > 8) n++;
  return n; }, i);
/* 画面そのものの見え方（版の重ね方・紙まで含めて変わったか） */
const pix = () => p.evaluate(() => {
  const x = cv.getContext('2d');
  const d = x.getImageData(0, 0, cv.width, cv.height).data;
  let h = 2166136261;
  for(let i = 0; i < d.length; i += 401){ h ^= d[i]; h = Math.imul(h, 16777619); }
  return (h>>>0); });
const set = async o => {
  await p.evaluate(x => { Object.assign(P, x); syncUI(); kick(); }, o);
  await new Promise(r => setTimeout(r, 300)); };
const setPlate = async (i, o) => {
  await p.evaluate((i, o) => { Object.assign(PLATES[i], o); syncUI(); kick(); }, i, o);
  await new Promise(r => setTimeout(r, 300)); };
const BASE = { text:'orr\non', font:'bodoni', weight:900, track:0.02, lh:1.0, margin:0.07,
  cols:26, thr:0.34, grow:0, rad:1.55, guide:'near', gopa:0.30, gw:1, gtop:false,
  paper:'#d3d3d3', ratio:'1:1', long:1400, preset:null,
  anim:false, cyc:3, spinN:0, spinR:0.25, spinS:0, brN:0, brA:0.25,
  outLong:'same', vFmt:'mp4', vFps:'24', vLoop:'1', vQ:'mid' };
const reset = async () => {
  await p.evaluate(o => {
    Object.assign(P, o);
    PLATES = [
      newPlate({ color:'#1c5b3a', dx:0,   dy:-0.45, rs:1.00, inner:'over',  blend:'source-over' }),
      newPlate({ color:'#e6c020', dx:0,   dy: 0.45, rs:1.00, inner:'over',  blend:'source-over' }),
      newPlate({ color:'#141414', dx:0,   dy: 0,    rs:1.00, inner:'over',  blend:'source-over' }),
      newPlate({ color:'#3f5ed2', dx:0.5, dy: 0,    rs:0.86, inner:'inter', blend:'source-over' }),
    ];
    cur = 3; PH = 0; syncUI(); kick();
    pushHist();          /* ⚠️ ここを忘れると ⌘Z が「テストが作る前の姿」まで戻る */
  }, BASE);
  await new Promise(r => setTimeout(r, 400)); };

/* ══ ① つまみが効くか ══════════════════════════════ */
console.log('\n① つまみを動かすと刷る計画が変わるか');
await reset();
const KNOBS = [
  ['細かさ',   { cols:34 }],
  ['拾い方',   { thr:0.55 }],
  ['字を太らせる',{ grow:-0.3 }],
  ['円の大きさ',{ rad:1.90 }],
  ['余白',     { margin:0.20 }],
  ['字間',     { track:0.20 }],
  ['行間',     { lh:1.40 }],
  ['太さ',     { weight:400 }],
  ['字',       { text:'ab\ncd' }],
  ['書体',     { font:'anton' }],
  ['版面',     { ratio:'4:5' }],
  ['長辺',     { long:900 }],
  ['版下',     { guide:'all' }],
];
for(const [n, o] of KNOBS){
  await reset();
  const a = await sig(); await set(o); const c = await sig();
  check(a !== c, `${n} が効く`, a === c ? `（計画が同じ ${a}）` : '');
}
/* 版下の濃さ・太さ・上下は「計画」に入っているので同じ物差しで見える */
for(const [n, o] of [['版下の濃さ', { gopa:0.9 }], ['版下の太さ', { gw:3 }]]){
  await reset(); await set({ guide:'all' });
  const a = await sig(); await set(o); const c = await sig();
  check(a !== c, `${n} が効く`);
}
/* ⚠️「版下を上に出す」と「紙の色」は計画の見た目に効くので画素で見る */
for(const [n, o] of [['版下を上に出す', { gtop:true }], ['紙の色', { paper:'#ff0000' }]]){
  await reset(); await set({ guide:'all', gopa:0.9, gw:3 });
  const a = await pix(); await set(o); const c = await pix();
  check(a !== c, `${n} が効く`);
}

console.log('\n① 版のつまみが効くか');
for(const [n, o] of [['ずれ よこ', { dx:-0.5 }], ['ずれ たて', { dy:0.5 }],
                     ['円の倍率', { rs:1.2 }], ['濃さ', { al:0.3 }],
                     ['重ね方', { blend:'difference' }]]){
  await reset();
  const a = await pix(); await setPlate(3, o); const c = await pix();
  check(a !== c, `版の ${n} が効く`);
}

/* ══ ② 芯＝円が升目より大きいか ══════════════════════ */
console.log('\n② 芯 ── 円の直径が升目の ×1.00 を超えないと重ならない');
await reset();
await setPlate(3, { inner:'inter', rs:0.60 });      /* 1.55 × 0.60 = 0.93 → 重ならない */
const inkNone = await inkOf(3);
await setPlate(3, { rs:0.86 });                      /* 1.55 × 0.86 = 1.33 → 重なる */
const inkSome = await inkOf(3);
check(inkNone === 0, '×0.93 のとき「重なりだけ」は1画素も出ない', `(${inkNone}px)`);
check(inkSome > 1000, '×1.33 のときレンズが出る', `(${inkSome}px)`);
/* 画面にも理由が出ているか（黙って出ないのが一番タチが悪い） */
await setPlate(3, { rs:0.60 });
const warn = await p.evaluate(() => ({
  txt: document.getElementById('pMeter').textContent,
  warn: document.getElementById('pMeter').classList.contains('warn') }));
check(warn.warn && /何も出ない/.test(warn.txt), '出ない理由が画面に出ている', warn.txt.split('\n')[1]);

/* ══ ③ 版の中の重なり方 3つが違うか ══════════════════ */
console.log('\n③ 塗る／抜く／重なりだけ が違う絵になるか');
await reset();
const inks = {};
for(const m of ['over','xor','inter']){
  await setPlate(3, { inner:m, rs:0.86 });
  inks[m] = await inkOf(3);
}
check(inks.over > inks.xor && inks.xor > inks.inter,
  '塗る > 抜く > 重なりだけ の順に面積が減る',
  `over=${inks.over} xor=${inks.xor} inter=${inks.inter}`);
/* ⭐ 抜く＋重なりだけ ＝ 塗る（穴と穴埋めがぴったり合う）＝式が1本である証拠 */
const diff = Math.abs((inks.xor + inks.inter) - inks.over) / inks.over;
check(diff < 0.02, '抜く＋重なりだけ = 塗る（縁の誤差 2% 未満）', `ずれ ${(diff*100).toFixed(2)}%`);

/* ══ ④ 出す ══════════════════════════════════════ */
console.log('\n④ 出す');
await reset();
await p.evaluate(() => { window.__got = []; });
await p.evaluate(() => document.getElementById('b_png').click());
await new Promise(r => setTimeout(r, 900));
await p.evaluate(() => document.getElementById('b_pnga').click());
await new Promise(r => setTimeout(r, 900));
await p.evaluate(() => document.getElementById('b_svg').click());
await new Promise(r => setTimeout(r, 700));
const got = await p.evaluate(() => window.__got);
check(got.length === 3, '3つとも落ちた', JSON.stringify(got.map(g => g.type)));
check(got.every(g => g.size > 2000), '中身が空でない', got.map(g => Math.round(g.size/1024) + 'KB').join(' '));
/* 地なしが本当に透明か（⭐ 他の道具に持ち込むための出口） */
const alpha = await p.evaluate(() => {
  const s = size(), pl = buildPlan(s.W, s.H);
  const c = document.createElement('canvas'); c.width = s.W; c.height = s.H;
  const x = c.getContext('2d'); render(x, pl, true);
  const corner = x.getImageData(2, 2, 1, 1).data[3];
  const mid = x.getImageData(Math.round(s.W*0.30), Math.round(s.H*0.22), 1, 1).data[3];
  return { corner, mid }; });
check(alpha.corner === 0, '地なしPNGの隅が本当に透明', `α=${alpha.corner}`);
check(alpha.mid > 0, '地なしでも字は残っている', `α=${alpha.mid}`);
/* SVG の中身 ── 計画の円の数と道の数が合うか。
   ⚠️「重なりだけ」の版は mask で書くので【同じ道が2回】出る（白で全部・黒で奇数）。
      数を合わせるときはそれを勘定に入れる。 */
const svg = await p.evaluate(() => {
  const s = size(), pl = buildPlan(s.W, s.H);
  const t = toSVG(pl, false);
  const arcs = (t.match(/ a /g) || []).length;                 /* 円1個につき 2 */
  const want = pl.plates.reduce((a, q) => a + q.n * (q.inner === 'inter' ? 2 : 1), 0)
             + (pl.guide ? pl.guide.n : 0);
  return { len:t.length, arcs, want, head:t.slice(0, 60) }; });
check(/^<svg xmlns/.test(svg.head), 'SVG が svg で始まる');
check(svg.arcs === svg.want * 2, 'SVG の円の数が計画と一致', `${svg.arcs/2} / ${svg.want}`);

/* ══ ⑤ ⌘Z ══════════════════════════════════════ */
console.log('\n⑤ 戻す');
await reset();
await p.evaluate(() => { const r = document.getElementById('r_cols');
  r.value = 12; r.dispatchEvent(new Event('input', { bubbles:true }));
  r.dispatchEvent(new Event('change', { bubbles:true })); });
await new Promise(r => setTimeout(r, 400));
const after = await p.evaluate(() => P.cols);
await p.evaluate(() => undo());
await new Promise(r => setTimeout(r, 400));
const back = await p.evaluate(() => P.cols);
check(after === 12 && back === 26, '⌘Z で細かさが戻る', `${BASE.cols} → ${after} → ${back}`);
/* 版を消したのも戻るか（⭐ 状態はコミットで守れない） */
await reset();
const n0 = await p.evaluate(() => PLATES.length);
await p.evaluate(() => document.getElementById('b_del').click());
await new Promise(r => setTimeout(r, 300));
const n1 = await p.evaluate(() => PLATES.length);
await p.evaluate(() => undo());
await new Promise(r => setTimeout(r, 400));
const n2 = await p.evaluate(() => PLATES.length);
check(n1 === n0 - 1 && n2 === n0, '⌘Z で消した版が戻る', `${n0} → ${n1} → ${n2}`);

/* ══ ⑥ 見本 ══════════════════════════════════════ */
console.log('\n⑥ 見本');
const seen = new Map();
const names = await p.$$eval('#preSeg button', bs => bs.map(x => x.textContent));
for(let i = 0; i < names.length; i++){
  await p.evaluate(i => document.querySelectorAll('#preSeg button')[i].click(), i);
  await new Promise(r => setTimeout(r, 600));
  const s = await sig();
  const dup = [...seen.entries()].find(([, v]) => v === s);
  check(!dup, `見本「${names[i]}」が他と違う絵になる`, dup ? `（「${dup[0]}」と同じ）` : '');
  seen.set(names[i], s);
  /* 見本の中に「何も出ない版」が混ざっていないか（型は必ず絵になること） */
  const bad = await p.evaluate(() => PLATES.filter(q => q.on && q.inner !== 'over' && P.rad * q.rs <= 1.001).length);
  check(bad === 0, `見本「${names[i]}」に空振りの版が無い`, bad ? `${bad}枚` : '');
}

/* ══ ⑥b 日本語 ══ ⭐ 2026-08-20 木下「日本語だと見えづらい」「見本を変更すると何なのか見えない」 */
console.log('\n⑥b 日本語');
await reset();
await set({ text:'それでいい' });
/* 見本の粗さは【1文字に何マス】。字が日本語でも黒丸2つにならないこと */
const jp = [];
for(let i = 0; i < names.length; i++){
  await p.evaluate(i => document.querySelectorAll('#preSeg button')[i].click(), i);
  await new Promise(r => setTimeout(r, 600));
  jp.push(await p.evaluate(() => ({
    n: PRESETS[P.preset].n, cols:P.cols,
    per: P.cols / Math.max(1, ...P.text.split('\n').map(L => [...L].length)),
    cells: buildPlan(size().W, size().H).cells })));
}
for(const r of jp)
  check(r.per >= 12, `見本「${r.n}」が日本語でも1文字12マス以上ある`,
    `細かさ ${r.cols}・1文字 ${r.per.toFixed(1)}マス・オン ${r.cells}`);
/* ⭐ 字を細らせると、同じ升目でもオンになる升目が減る＝隙間が残る */
await reset(); await set({ text:'それでいい', cols:60, thr:0.42, grow:0 });
const fat = await p.evaluate(() => buildPlan(size().W, size().H).cells);
await set({ grow:-0.28 });
const thin = await p.evaluate(() => buildPlan(size().W, size().H).cells);
check(thin < fat * 0.92, '字を細らせると升目が減る（かなの隙間が残る）', `${fat} → ${thin}`);

/* ⭐ 選んでいる見本が光る／つまみを触ったら消える */
await p.evaluate(() => document.querySelectorAll('#preSeg button')[0].click());
await new Promise(r => setTimeout(r, 500));
const litA = await p.$$eval('#preSeg button.on', bs => bs.map(x => x.textContent));
await p.evaluate(() => { const r = document.getElementById('r_rad');
  r.value = 1.2; r.dispatchEvent(new Event('input', { bubbles:true })); });
await new Promise(r => setTimeout(r, 400));
const litB = await p.$$eval('#preSeg button.on', bs => bs.map(x => x.textContent));
check(litA.length === 1, '選んだ見本が1つだけ光る', litA.join(','));
check(litB.length === 0, 'つまみを触ったら光が消える', litB.join(',') || '(消えた)');

/* ══ ⑥c 素材（版に画像を入れる）══ ⭐ 木下「文字の中に masu のような素材を入れたい」 */
console.log('\n⑥c 素材');
await reset();
/* ⚠️「素材を入れる」も「色に戻す」も【選んだ版】に効く。先に版を選ぶ（木下の手順と同じ） */
await p.evaluate(() => { cur = 2; syncUI(); });
/* 赤青の市松＝どこに入ったか一目で分かる素材 */
const MAT = await p.evaluate(() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  for(let j = 0; j < 8; j++) for(let i = 0; i < 8; i++){
    x.fillStyle = (i + j) % 2 ? '#e02020' : '#2040e0'; x.fillRect(i*8, j*8, 8, 8); }
  return c.toDataURL('image/png'); });
const plainPix = await pix();
await p.evaluate(u => { setMat(PLATES[2], u, false); }, MAT);
await new Promise(r => setTimeout(r, 600));
const matPix = await pix();
check(plainPix !== matPix, '素材を入れると絵が変わる');
check(await p.evaluate(() => !!buildPlan(size().W, size().H).plates.find(q => q.mat)),
  '計画に素材が乗っている');
/* 単位を変えると別の絵になる（版面いっぱい ↔ 円1つ）*/
const sheetPix = await pix();
await p.evaluate(() => { PLATES[2].matUnit = 'circle'; syncUI(); kick(); });
await new Promise(r => setTimeout(r, 600));
const circlePix = await pix();
check(sheetPix !== circlePix, '素材の単位（版面いっぱい／円1つ）で絵が変わる');
check(await p.evaluate(() => {
  const q = buildPlan(size().W, size().H).plates.find(x => x.fill === 'mat');
  return Array.isArray(q.pts) && q.pts.length > 0; }), '粒1つのときだけ中心を持つ');
/* SVG に素材が入るか（両方の単位で） */
for(const u of ['sheet','circle']){
  await p.evaluate(u => { PLATES[2].matUnit = u; syncUI(); kick(); }, u);
  await new Promise(r => setTimeout(r, 400));
  const has = await p.evaluate(() => {
    const s = size(); const t = toSVG(buildPlan(s.W, s.H), false);
    return { img:/<image /.test(t), data:/data:image\/png/.test(t), len:t.length }; });
  check(has.img && has.data, `SVG に素材が入る（${u}）`, Math.round(has.len/1024) + 'KB');
}
/* 素材は控えに入るが、戻す履歴には入らない（重いので） */
check(await p.evaluate(() => snapObj(true).length > snapObj(false).length),
  '控えには素材が入り、戻す履歴には入らない');
/* 中身を「色」に戻せる（素材そのものは版に残る＝また選べば戻せる） */
await p.evaluate(() => { document.querySelector('#fillSeg button[data-v="color"]').click(); });
await new Promise(r => setTimeout(r, 400));
check(await p.evaluate(() => PLATES[2].fill === 'color'
  && !buildPlan(size().W, size().H).plates.some(q => q.fill === 'mat')), '中身を「色」に戻せる');

/* ══ ⑥c2 粒の形と縞グラデ ══ ⭐ 木下「中の形の変化、中の色に Tsubu のあのグラデーション」 */
console.log('\n⑥c2 粒の形と縞グラデ');
await reset();
const shapeInk = {};
for(const s of ['circle','square','diamond','hex','tri']){
  await p.evaluate(s => { PLATES.forEach(pl => pl.shape = s); syncUI(); kick(); }, s);
  await new Promise(r => setTimeout(r, 350));
  shapeInk[s] = await inkOf(2);
}
const uniq = new Set(Object.values(shapeInk));
check(uniq.size === 5, '粒の形5つが全部ちがう面積になる', JSON.stringify(shapeInk));
check(shapeInk.circle > shapeInk.hex && shapeInk.hex > shapeInk.square && shapeInk.square > shapeInk.tri,
  '外径を揃えているので 円 > 六角 > 四角 > 三角 の順に減る');
/* 粒を回すと重なりの形が変わる */
await reset();
await p.evaluate(() => { PLATES.forEach(pl => pl.shape = 'tri'); syncUI(); kick(); });
await new Promise(r => setTimeout(r, 300));
const rot0 = await pix();
await p.evaluate(() => { PLATES.forEach(pl => pl.rot = 40); syncUI(); kick(); });
await new Promise(r => setTimeout(r, 300));
check(rot0 !== await pix(), '粒を回すと絵が変わる');

/* 🔴🔴 2026-08-20 のバグを回帰で守る ──
   source-in はキャンバス全体に効くので、粒ごとに1回ずつ呼ぶと直前の粒まで消える。
   ⭐ 形は中身に関係なく同じはず＝色でも縞グラデでも【インクの量が一致】する。 */
await reset();
const inkColor = await inkOf(2);
await p.evaluate(() => {
  PLATES[2].fill = 'grad'; PLATES[2].matUnit = 'circle';
  PLATES[2].g = { c1:'#101010', c2:'#ffffff', n:4, ang:0, ramp:1, sym:false };
  syncUI(); kick(); });
await new Promise(r => setTimeout(r, 500));
const inkGrad = await inkOf(2);
check(Math.abs(inkGrad - inkColor) / inkColor < 0.01,
  '粒1つの縞グラデでも、色のときと同じ面積が出る（粒が消えない）',
  `色 ${inkColor} / 縞 ${inkGrad}`);
/* 単位で絵が変わる */
const gCircle = await pix();
await p.evaluate(() => { PLATES[2].matUnit = 'sheet'; syncUI(); kick(); });
await new Promise(r => setTimeout(r, 400));
check(gCircle !== await pix(), '縞グラデも単位（版面いっぱい／粒1つ）で絵が変わる');
/* 縞のつまみが効く */
for(const [n, o] of [['縞の数', { n:12 }], ['向き', { ang:60 }],
                     ['上がり方', { ramp:0.3 }], ['行って戻る', { sym:true }]]){
  await p.evaluate(() => { PLATES[2].matUnit = 'sheet';
    PLATES[2].g = { c1:'#101010', c2:'#ffffff', n:4, ang:0, ramp:1, sym:false }; syncUI(); kick(); });
  await new Promise(r => setTimeout(r, 350));
  const a = await pix();
  await p.evaluate(o => { Object.assign(PLATES[2].g, o); syncUI(); kick(); }, o);
  await new Promise(r => setTimeout(r, 350));
  check(a !== await pix(), `縞の ${n} が効く`);
}
/* SVG は画像に焼かず linearGradient のまま出す */
for(const u of ['sheet','circle']){
  await p.evaluate(u => { PLATES[2].matUnit = u; syncUI(); kick(); }, u);
  await new Promise(r => setTimeout(r, 350));
  const g = await p.evaluate(() => {
    const s = size(); const t = toSVG(buildPlan(s.W, s.H), false);
    return { lg:/<linearGradient/.test(t), img:/data:image/.test(t), rep:/spreadMethod="repeat"/.test(t) }; });
  check(g.lg && g.rep && !g.img, `SVG に縞がベクターのまま入る（${u}）`,
    g.img ? '🔴 画像に焼かれている' : '');
}

/* ══ ⑥d 盤（ズーム・位置）══ ⭐ 木下「ボードをズームインズームアウトできるように」 */
console.log('\n⑥d 盤');
await reset();
const tf0 = await p.evaluate(() => cv.style.transform);
await p.evaluate(() => document.getElementById('z_in').click());
const tf1 = await p.evaluate(() => cv.style.transform);
await p.evaluate(() => document.getElementById('z_out').click());
await p.evaluate(() => document.getElementById('z_out').click());
const tf2 = await p.evaluate(() => cv.style.transform);
check(tf0 !== tf1 && tf1 !== tf2, '＋−で拡大が変わる');
await p.evaluate(() => document.getElementById('z_fit').click());
const tf3 = await p.evaluate(() => cv.style.transform);
check(tf3 === tf0, '「ぴったり」で元に戻る');
/* ⭐ 盤は見る側だけ＝刷る計画は1文字も変わらない */
const sigBefore = await sig();
await p.evaluate(() => { document.getElementById('z_in').click(); document.getElementById('z_in').click(); });
await new Promise(r => setTimeout(r, 300));
const sigAfter = await sig();
check(sigBefore === sigAfter, '拡大しても刷る計画は変わらない', sigBefore.slice(0, 14));
/* 原寸＝紙の1画素が画面の1点 */
await p.evaluate(() => document.getElementById('z_one').click());
const one = await p.evaluate(() => +(cv.style.transform.match(/scale\(([\d.]+)\)/)[1]));
check(Math.abs(one - 1) < 0.01, '「原寸」がちょうど 100%', (one*100).toFixed(1) + '%');
check(await p.$eval('#z_lab', e => e.textContent) === '100%', '倍率の表示が合っている');
await p.evaluate(() => document.getElementById('z_fit').click());

/* ══ ⑥e 版を足す ══ */
console.log('\n⑥e 版を足す');
await reset();
const nBefore = await p.evaluate(() => PLATES.length);
await p.evaluate(() => document.getElementById('b_add').click());
await new Promise(r => setTimeout(r, 500));
const added = await p.evaluate(() => ({ n:PLATES.length, cur, on:PLATES[cur].on }));
check(added.n === nBefore + 1 && added.cur === added.n - 1, '＋版で1枚増えて、その版が選ばれる',
  `${nBefore} → ${added.n}・選択 ${added.cur}`);
check(await inkOf(added.n - 1) > 1000, '足した版が本当に絵に出る（空振りしない）');
await p.evaluate(() => document.getElementById('b_dup').click());
await new Promise(r => setTimeout(r, 400));
check(await p.evaluate(() => PLATES.length) === nBefore + 2, '複製で1枚増える');

/* ══ ⑧ 動かす ══ ⭐ 木下「アニメーションも」 */
console.log('\n⑧ 動かす');
await reset();
await set({ spinN:2, spinR:0.3, spinS:0.4, brN:1, brA:0.4 });
/* ⭐⭐ 位相0＝つまみで作った絵そのもの（動かす設定を入れても今の絵を見失わない） */
const still = await p.evaluate(() => { PH = 0; return JSON.stringify(buildPlan(size().W, size().H)); });
const noAnim = await p.evaluate(() => {
  const keep = { spinN:P.spinN, brN:P.brN };
  P.spinN = 0; P.brN = 0;
  const t = JSON.stringify(buildPlan(size().W, size().H));
  Object.assign(P, keep); return t; });
check(still === noAnim, '位相0＝つまみで作った絵そのもの（振れは片側だけ）');
/* 位相を進めると絵が変わる */
const mid = await p.evaluate(() => { PH = 0.37; const t = JSON.stringify(buildPlan(size().W, size().H)); PH = 0; return t; });
check(mid !== still, '位相を進めると絵が変わる');
/* 🔴 継ぎ目なしループ＝周が整数なら 位相0 と 位相1 が【数値で】一致する */
const wrap = await p.evaluate(() => { PH = 1; const t = JSON.stringify(buildPlan(size().W, size().H)); PH = 0; return t; });
check(wrap === still, '位相1と位相0が完全に一致（継ぎ目なしループ）');
/* 回るのと呼吸するのが別々に効く */
for(const [n, o] of [['回る', { spinN:1, spinR:0.3, brN:0, brA:0 }],
                     ['呼吸', { spinN:0, spinR:0,   brN:1, brA:0.4 }]]){
  await reset(); await set(o);
  const a = await p.evaluate(() => { PH = 0;    return JSON.stringify(buildPlan(size().W, size().H)); });
  const c = await p.evaluate(() => { PH = 0.5;  const t = JSON.stringify(buildPlan(size().W, size().H)); PH = 0; return t; });
  check(a !== c, `${n} だけでも動く`);
}
/* 画面で動かすを切ったら位相が 0 に戻る（＝つまみの絵に戻る） */
await reset(); await set({ spinN:2, spinR:0.3 });
await p.evaluate(() => { el('c_anim').checked = true; el('c_anim').dispatchEvent(new Event('change')); });
await new Promise(r => setTimeout(r, 700));
const moved = await p.evaluate(() => PH);
await p.evaluate(() => { el('c_anim').checked = false; el('c_anim').dispatchEvent(new Event('change')); });
await new Promise(r => setTimeout(r, 300));
const stopped = await p.evaluate(() => ({ ph:PH, anim:P.anim }));
check(moved > 0, '画面で動かすと位相が進む', moved.toFixed(3));
check(stopped.ph === 0 && !stopped.anim, '止めると位相0（つまみの絵）に戻る');

/* ⭐ 動かすと字ごと寄っていく＝端で切れる。向きは縛らず「切れている」と出るか */
await reset();
check(!await p.evaluate(() => buildPlan(size().W, size().H).cut), '止まっているときは切れていない');
await set({ spinN:1, spinR:0.7, margin:0.0 });
const cutAt = await p.evaluate(() => { PH = 0.5; const c = buildPlan(size().W, size().H).cut; PH = 0; return c; });
check(cutAt === true, '回る幅を上げて端が切れたら、切れていると出る');
await set({ margin:0.28 });
const cutFixed = await p.evaluate(() => { PH = 0.5; const c = buildPlan(size().W, size().H).cut; PH = 0; return c; });
check(cutFixed === false, '余白を増やせば切れなくなる（縛らずに逃がせる）');

/* ══ ⑨ 出す大きさ ══ ⭐ 木下「書き出しのときのサイズ指定」 */
console.log('\n⑨ 出す大きさ');
await reset();
check(await p.evaluate(() => outSize().W) === 1400, '「版面のまま」は版面と同じ');
await set({ outLong:'2048' });
const os = await p.evaluate(() => outSize());
check(os.W === 2048 && os.H === 2048, '長辺を選ぶとその大きさになる', `${os.W}×${os.H}`);
await set({ ratio:'4:5', outLong:'2048' });
const os2 = await p.evaluate(() => outSize());
check(os2.H === 2048 && os2.W === Math.round(2048*4/5), '縦長でも長辺が合う', `${os2.W}×${os2.H}`);
/* ⭐⭐ 大きく出しても【同じ絵】── 引き伸ばしでなく焼き直しているか。
   大きい方を縮めて重ね、画素のずれを測る（版下の線も一緒に太っているか含む）。 */
await reset();
const sizeDiff = await p.evaluate(async () => {
  const mk = L => { const s = (L === 700) ? { W:700, H:700 } : { W:1400, H:1400 };
    const c = document.createElement('canvas'); c.width = s.W; c.height = s.H;
    render(c.getContext('2d'), buildPlan(s.W, s.H), false); return c; };
  const small = mk(700), big = mk(1400);
  const sh = document.createElement('canvas'); sh.width = sh.height = 700;
  const x = sh.getContext('2d');
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(big, 0, 0, 700, 700);
  const a = small.getContext('2d').getImageData(0,0,700,700).data;
  const b = x.getImageData(0,0,700,700).data;
  let sum = 0; for(let i = 0; i < a.length; i += 4) sum += Math.abs(a[i]-b[i]);
  return sum / (a.length/4); });
check(sizeDiff < 12, '倍の大きさで出しても同じ絵（焼き直し・引き伸ばしでない）', `画素の平均ずれ ${sizeDiff.toFixed(1)}/255`);
/* PNG が指定の大きさで出る */
await set({ outLong:'1080' });
const pngSize = await p.evaluate(() => new Promise(res => {
  const s = outSize();
  const c = document.createElement('canvas'); c.width = s.W; c.height = s.H;
  render(c.getContext('2d'), buildPlan(s.W, s.H), false);
  c.toBlob(b => res({ w:c.width, h:c.height, kb:Math.round(b.size/1024) }), 'image/png'); }));
check(pngSize.w === 1080 && pngSize.h === 1080, 'PNG が指定の大きさで出る',
  `${pngSize.w}×${pngSize.h}・${pngSize.kb}KB`);

/* ══ ⑩ 動画 ══ ⭐ 木下「動画の書き出しも」
   ⚠️ mp4 は外の器（CDN）が要るので、つながっていない所でも回るように PNG連番で通す。
      いちばん確かめたいのは【コマ番号で刻んでいるか】＝頭と尻が一致するか。 */
console.log('\n⑩ 動画');
await reset();
await set({ spinN:1, spinR:0.3, brN:1, brA:0.3, cyc:1, vFps:'12', vLoop:'1' });
const vp = await p.evaluate(() => tvPlan());
check(vp.total === 12 && vp.moving, 'コマ数＝秒×コマ/秒×周', `${vp.total}コマ・${vp.sec}秒`);
/* 🔴 1コマ目は必ず位相0＝画面と同じ絵 */
const frames = await p.evaluate(() => {
  const t = tvPlan(), s = size(), out = [];
  const keep = PH;
  for(const i of [0, 1, t.total]){        /* 最後の1つは「次の周の頭」＝1コマ目と同じはず */
    PH = (i / t.total * t.loops) % 1;
    out.push(JSON.stringify(buildPlan(s.W, s.H)).length + ':' +
      JSON.stringify(buildPlan(s.W, s.H)).slice(0, 400));
  }
  PH = keep; return out; });
check(frames[0] === frames[2], '最後の次＝1コマ目（継ぎ目なし）');
check(frames[0] !== frames[1], '2コマ目は違う絵（コマ落ちでなく本当に刻んでいる）');
/* 実際に走らせる（PNG連番・小さく・短く） */
await set({ outLong:'1080', vFmt:'png', vFps:'12', vLoop:'1', cyc:0.5 });
await p.evaluate(() => { window.__got = []; });
await p.evaluate(() => document.getElementById('b_video').click());
for(let i = 0; i < 60; i++){
  if(await p.evaluate(() => !TV.on)) break;
  await new Promise(r => setTimeout(r, 500));
}
const vgot = await p.evaluate(() => window.__got);
const vmsg = await p.$eval('#vMeter', e => e.textContent);
check(vgot.length === 1 && vgot[0].type === 'application/zip', 'PNG連番（zip）が落ちた', JSON.stringify(vgot));
check(/6枚|枚/.test(vmsg) && !/🔴/.test(vmsg), '書き出しが最後まで通った', vmsg.slice(0, 60));
check(await p.evaluate(() => PH === 0 && !TV.on), '撮り終わったら位相も状態も元に戻る');

/* ══ ⑦ 実機幅 ══════════════════════════════════════ */
console.log('\n⑦ 実機幅（390px）');
await p.setViewport({ width:390, height:844, deviceScaleFactor:2, isMobile:true, hasTouch:true });
await new Promise(r => setTimeout(r, 700));
const m = await p.evaluate(() => {
  const r = document.getElementById('r_cols');
  const cs = getComputedStyle(r);
  const box = r.getBoundingClientRect();
  const st = document.getElementById('stage').getBoundingClientRect();
  const pn = document.getElementById('panel').getBoundingClientRect();
  return { ta:cs.touchAction, h:Math.round(box.height),
           overflow:getComputedStyle(document.body).overflowY,
           stageW:Math.round(st.width), panelW:Math.round(pn.width),
           docW:document.documentElement.scrollWidth, winW:innerWidth }; });
check(m.ta === 'pan-y', 'スライダーが縦スクロールを止めていない', `touch-action:${m.ta}`);
check(m.h >= 34, 'つまみが掴める高さ', `${m.h}px`);
check(m.docW <= m.winW + 1, '横にはみ出していない', `${m.docW} / ${m.winW}`);
/* ⭐ 出す入口に届くか（完成しているのに押せない型を作らない） */
const reach = await p.evaluate(() => ['b_png','b_pnga','b_svg','b_undo','b_save','b_load','b_add','b_del']
  .map(id => { const e = document.getElementById(id); const r = e.getBoundingClientRect();
    return { id, ok: !!e && r.width > 40 && r.height > 20 && getComputedStyle(e).display !== 'none' }; }));
check(reach.every(x => x.ok), '出す・戻す・版のボタンに全部届く',
  reach.filter(x => !x.ok).map(x => x.id).join(' '));

/* ══ 速さ ══ */
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await reset();
await set({ cols:64, long:2400 });
const ms = await p.evaluate(() => {
  const s = size(); const t0 = performance.now();
  const pl = buildPlan(s.W, s.H); render(cv.getContext('2d'), pl, false);
  return Math.round(performance.now() - t0); });
check(ms < 900, '細かい版でも 900ms 未満で刷れる', ms + 'ms');

console.log('\n' + (errs === 0 ? '✅ JSエラー 0件' : `🔴 JSエラー ${errs}件`));
if(errs) ng.push('JSエラー');
console.log(ng.length ? `\n🔴 落ちた: ${ng.length}件\n  - ` + ng.join('\n  - ') : '\n✅ 全部通った');
await b.close();
process.exit(ng.length ? 1 : 0);
