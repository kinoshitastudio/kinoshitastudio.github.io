/* ⭐ 擦 SURE の回帰テスト ── 直したら流す。
   🔴 見るのは「エラーが出ないか」ではなく次を数字で：
     ① つまみを動かして絵が変わるか（動くのに効かないつまみを作らない）
     ② 芯＝【距離を粗い升目で読む】。升目を粗くすると階段が大きくなるか
     ③ 段（線から外へ）が効くか・足せるか・並べ替えられるか
     ④ 縁の荒れ＝距離にゆらぎを足してから丸める、が効くか
     ⑤ 質感＝粒子・色の荒れ。⭐⭐【同じ種なら1画素も違わない】（Math.random を使っていない）
     ⑥ 描く・1本消す・ぜんぶ消す・⌘Z
     ⑦ 出す（PNG／地なし／SVG）・地なしが本当に透明か・SVG の矩形が計画と一致するか
     ⑧ 出す大きさ＝焼き直し（倍で出しても同じ絵）
     ⑨ 盤（拡大しても刷る計画は変わらない）
     ⑩ 実機幅
   ⭐ 物差しは本体の buildPlan() / runs() から取る。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const URL = process.argv[2] || 'http://localhost:8094/projects/sure_tk/';
const b = await puppeteer.launch({
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox'] });
const p = await b.newPage();
let errs = 0;
p.on('pageerror', e => { errs++; console.log('🔴 JSエラー:', e.message); });
p.on('dialog', d => d.accept());
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(URL, { waitUntil:'networkidle0' });
await p.evaluate(() => { try{ localStorage.clear(); }catch(_){} });
await p.reload({ waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 1500));

let ng = [];
const check = (ok, name, note) => {
  console.log(`  ${ok ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!ok) ng.push(name); };

await p.evaluate(() => {
  window.__got = [];
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(x){ window.__got.push({ size:x.size, type:x.type }); return oc.call(URL, x); };
});

const hash = t => { let h = 2166136261;
  for(let i = 0; i < t.length; i++){ h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h>>>0); };
/* 刷る計画そのもの（段の割り当て＝この道具が作っているもの） */
const sig = () => p.evaluate(() => {
  const s = size(), pl = buildPlan(s.W, s.H);
  /* ⚠️ W/H も入れる。入れないと「長辺」を動かしても計画が同じに見える
     （段の割り当ては同じ＝絵は同じで大きさだけ違う、が正しい姿なので） */
  return JSON.stringify({ w:pl.W, h:pl.H, c:pl.cols, r:pl.rows, col:pl.colors, pa:pl.paper,
    i:Array.from(pl.idx) }); }).then(t => hash(t) + ':' + t.length);
/* ⭐ 段と段の境にある升目の数＝縁がどれだけ複雑か（縁の荒れを直接測る） */
const nEdge = () => p.evaluate(() => {
  const s = size(), pl = buildPlan(s.W, s.H), { cols, rows, idx } = pl;
  let n = 0;
  for(let y = 1; y < rows-1; y++) for(let x = 1; x < cols-1; x++){
    const i = y*cols + x, v = idx[i];
    if(v !== idx[i-1] || v !== idx[i+1] || v !== idx[i-cols] || v !== idx[i+cols]) n++;
  }
  return n; });
/* 線そのものが乗っている升目の数（消しゴムを測る） */
const inkCells = () => p.evaluate(() => { const s = size(); return buildPlan(s.W, s.H).inside; });
/* 画面の画素（粒子まで含めて見る） */
const pix = () => p.evaluate(() => {
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  let h = 2166136261;
  for(let i = 0; i < d.length; i += 397){ h ^= d[i]; h = Math.imul(h, 16777619); }
  return (h>>>0); });
/* 段の切れ目の数＝階段の細かさ（芯を直接測る） */
const nRuns = () => p.evaluate(() => { const s = size(); return runs(buildPlan(s.W, s.H)).length; });
const areaOf = i => p.evaluate(i => {
  const s = size(), pl = buildPlan(s.W, s.H);
  let n = 0; for(let k = 0; k < pl.idx.length; k++) if(pl.idx[k] === i) n++;
  return n; }, i);

const STROKE = [
  { t:'draw', w:3.4, pts:[[.18,.28],[.34,.52],[.24,.70],[.46,.50],[.66,.72],[.56,.40],[.80,.30]] },
  { t:'draw', w:3.4, pts:[[.26,.62],[.50,.66],[.74,.60]] },
];
const BASE = { tool:'draw', bw:3.3, cols:96, rough:0.9, rgrain:5, grain:0.26, gsize:1,
  chroma:0.18, gdark:0.55, seed:7, paper:'#efe7dc', ratio:'4:5', long:1400,
  outLong:'same', preset:null,
  anim:false, cyc:3, boilN:0, boilR:1.0, brN:0, brA:0.35, gflick:0,
  vFmt:'mp4', vFps:'24', vLoop:'1', vQ:'mid' };
const reset = async () => {
  await p.evaluate((o, st) => {
    Object.assign(P, o); PH = 0; sel = -1;
    BANDS = [ newBand({ color:'#141414', w:1.7 }), newBand({ color:'#fbf9f4', w:2.3 }),
              newBand({ color:'#141414', w:1.5 }) ];
    ITEMS = st.map(s => ({ t:s.t, w:s.w, pts:s.pts.map(q => [q[0], q[1]]) }));
    bcur = 0; syncUI(); kick(); pushHist();
  }, BASE, STROKE);
  await new Promise(r => setTimeout(r, 450)); };
const set = async o => {
  await p.evaluate(x => { Object.assign(P, x); syncUI(); kick(); }, o);
  await new Promise(r => setTimeout(r, 400)); };

/* ══ ① つまみ ══ */
console.log('\n① つまみを動かすと絵が変わるか');
for(const [n, o] of [['升目の細かさ', { cols:48 }], ['縁の荒れ', { rough:2.2 }],
                     ['荒れの粗さ', { rgrain:12 }], ['種', { seed:44 }],
                     ['版面', { ratio:'16:9' }], ['長辺', { long:900 }], ['紙の色', { paper:'#ff0000' }]]){
  await reset();
  const a = await sig(); await set(o); const c = await sig();
  check(a !== c, `${n} が効く`, a === c ? `（計画が同じ ${a}）` : '');
}
for(const [n, o] of [['粒子', { grain:0.6 }], ['粒子の大きさ', { gsize:4 }],
                     ['色の荒れ', { chroma:0.8 }], ['暗いほど粒が立つ', { gdark:0 }]]){
  await reset();
  const a = await pix(); await set(o); const c = await pix();
  check(a !== c, `${n} が効く（画素で）`);
}

/* ══ ② 芯 ══ */
console.log('\n② 芯 ── 距離を粗い升目で読むから階段になる');
await reset(); await set({ cols:160, rough:0 });
const fine = await nRuns();
await set({ cols:40 });
const coarse = await nRuns();
check(coarse < fine / 3, '升目を粗くすると段の切れ目が減る＝階段が大きくなる',
  `160升 ${fine}本 → 40升 ${coarse}本`);
/* 🔴🔴「細かさ」は【階段の大きさ】だけを変える。線や段の【太さ】は変えてはいけない。
   ⭐ 太さが同じなら、升目が倍になったとき同じ面積を覆う升目の数は約4倍になるはず。
   ⚠️ 2026-08-20：升目単位で太さを持っていて比が 0.54（＝太さが半分）だった。%で持つよう直した。 */
await reset(); await set({ rough:0, cols:60 });
const a60 = await areaOf(0);
await set({ cols:120 });
const a120 = await areaOf(0);
const ratio = a120 / (a60 * 4);
check(Math.abs(ratio - 1) < 0.12, '細かさを変えても線と段の太さは変わらない',
  `60升 ${a60} → 120升 ${a120}（比 ${ratio.toFixed(2)}・1.00 が正）`);

/* ══ ③ 段 ══ */
console.log('\n③ 段（線から外へ）');
await reset(); await set({ rough:0 });
const w0 = await areaOf(1);
await p.evaluate(() => { BANDS[1].w = 6; syncUI(); kick(); });
await new Promise(r => setTimeout(r, 400));
const w1 = await areaOf(1);
check(w1 > w0 * 1.5, '段の幅を広げるとその段が太る', `${w0} → ${w1}`);
await reset();
const nb = await p.evaluate(() => BANDS.length);
await p.evaluate(() => document.getElementById('b_addBand').click());
await new Promise(r => setTimeout(r, 400));
check(await p.evaluate(() => BANDS.length) === nb + 1 && await areaOf0(), '＋段で段が増えて絵に出る');
async function areaOf0(){ return (await areaOf(nb)) > 100; }
await p.evaluate(() => document.getElementById('b_delBand').click());
await new Promise(r => setTimeout(r, 300));
check(await p.evaluate(() => BANDS.length) === nb, '消すで段が減る');
/* 並べ替えると色の並びが変わる */
await reset();
const ord = await sig();
await p.evaluate(() => { BANDS.splice(1, 0, BANDS.splice(2, 1)[0]); syncUI(); kick(); });
await new Promise(r => setTimeout(r, 400));
check(ord !== await sig(), '▲▼で並べ替えると絵が変わる');

/* ══ ④ 縁の荒れ ══ */
console.log('\n④ 縁の荒れ');
/* 🔴 物差しを2回作り直した：
   ①横の切れ目の数 → 縦に食われた分が出ない（1.13倍で判定できず）
   ②境の升目の数   → 縁がうねっても【升目を横切る数はほぼ変わらない】（0.99倍）
   ⭐③ 荒れ0の割り当てと比べて【何%の升目の段が変わったか】＝荒れが実際に動かした量そのもの。
      しかも荒れを強くするほど増えるはず＝つまみに効き目の段階があることまで見る。 */
await reset(); await set({ rough:0 });
const flat = await p.evaluate(() => { const s = size(); return Array.from(buildPlan(s.W, s.H).idx); });
const moved = async v => {
  await set({ rough:v });
  return p.evaluate(f => {
    const s = size(), idx = buildPlan(s.W, s.H).idx;
    let n = 0; for(let i = 0; i < idx.length; i++) if(idx[i] !== f[i]) n++;
    return n / idx.length; }, flat); };
const m0 = await moved(0), m1 = await moved(0.8), m2 = await moved(2.5);
check(m0 === 0, '荒れ 0 なら1升も動かない', `${(m0*100).toFixed(2)}%`);
check(m1 > 0.01 && m2 > m1 * 1.4,
  '荒れを強くするほど段が食われる升目が増える',
  `0→${(m0*100).toFixed(1)}%  0.8→${(m1*100).toFixed(1)}%  2.5→${(m2*100).toFixed(1)}%`);
await reset(); await set({ rough:0 });
const r0a = await sig(); await set({ seed:99 }); const r0b = await sig();
check(r0a === r0b, '荒れ 0 のときは種を変えても段は変わらない（ゆらぎが効いていない証拠）');

/* ══ ⑤⭐⭐ 質感が【毎回同じ】か ══ */
console.log('\n⑤ 質感');
await reset();
const g1 = await pix();
await p.evaluate(() => kick());
await new Promise(r => setTimeout(r, 500));
const g2 = await pix();
check(g1 === g2, '⭐ 同じ種で刷り直すと1画素も違わない（Math.random を使っていない）', String(g1));
await set({ seed:123 });
check(g1 !== await pix(), '種を変えると粒の並びが変わる');
/* 粒子 0 なら段の色そのものが出る（余計な汚しが入っていない） */
await reset(); await set({ grain:0, chroma:0, rough:0 });
const clean = await p.evaluate(() => {
  const s = size(), pl = buildPlan(s.W, s.H);
  const c = document.createElement('canvas'); c.width = s.W; c.height = s.H;
  const x = c.getContext('2d'); render(x, pl, false);
  /* 線のど真ん中の画素が段0の色ぴったりか */
  let hit = null;
  for(let i = 0; i < pl.idx.length && !hit; i++) if(pl.idx[i] === 0){
    const cx = Math.round((i % pl.cols + .5) * pl.cell), cy = Math.round(((i / pl.cols)|0 + .5) * pl.cell);
    const d = x.getImageData(cx, cy, 1, 1).data; hit = [d[0], d[1], d[2]];
  }
  return hit; });
check(clean && clean[0] === 0x14 && clean[1] === 0x14 && clean[2] === 0x14,
  '粒子0なら段の色がそのまま出る', JSON.stringify(clean));

/* ══ ⑥ 描く ══ */
console.log('\n⑥ 描く');
await reset();
const s0 = await sig();
await p.evaluate(() => { ITEMS.push({ t:'draw', w:3, pts:[[.1,.1],[.9,.15]] }); kick(); pushHist(); });
await new Promise(r => setTimeout(r, 400));
check(s0 !== await sig(), '線を足すと絵が変わる');
await p.evaluate(() => document.getElementById('b_undoStroke').click());
await new Promise(r => setTimeout(r, 400));
check(s0 === await sig(), '1本消すで元に戻る');
/* 消しゴム */
/* ⚠️ 物差しは段0の面積でなく【線そのものが乗っている升目】。
   段0は線から外へも広がるので、消した穴が段0で埋め戻されて減りが見えなかった。 */
await reset();
const before = await inkCells();
await p.evaluate(() => { ITEMS.push({ t:'erase', w:16, pts:[[.15,.45],[.85,.55]] }); kick(); });
await new Promise(r => setTimeout(r, 400));
const after = await inkCells();
check(after < before * 0.8, '消すで線が減る', `${before} → ${after}（${Math.round((1-after/before)*100)}%減）`);
/* ぜんぶ消す＋⌘Z */
await reset();
const full = await sig();
await p.evaluate(() => document.getElementById('b_clear').click());
await new Promise(r => setTimeout(r, 500));
check(await p.evaluate(() => ITEMS.length) === 0, 'ぜんぶ消すで空になる');
await p.evaluate(() => undo());
await new Promise(r => setTimeout(r, 500));
check(full === await sig(), '⌘Z でぜんぶ消す前に戻る');

/* ══⭐ ⑥b 選ぶ・動かす ══ 木下「選択したレイヤーのオブジェクトもボード内で動かせるように」 */
console.log('\n⑥b 選ぶ・動かす');
await reset();
const mid = await p.evaluate(() => ITEMS[0].pts[3]);
check(await p.evaluate(m => hitTest(m[0], m[1]), mid) === 0, '線の上を指すとその線が当たる');
check(await p.evaluate(() => hitTest(0.98, 0.02)) === -1, '何も無い所は当たらない');
/* 動かすと絵が変わり、点も動く */
await reset();
const beforeMove = await sig();
await p.evaluate(() => {
  sel = 0;
  ITEMS[0].pts = ITEMS[0].pts.map(q => [q[0] + 0.08, q[1] - 0.05]);
  kick(); pushHist(); });
await new Promise(r => setTimeout(r, 400));
check(beforeMove !== await sig(), '選んだ線を動かすと絵が変わる');
/* ⭐ 動かしても【他の線は動かない】 */
await reset();
const other = await p.evaluate(() => JSON.stringify(ITEMS[1].pts));
await p.evaluate(() => { sel = 0; ITEMS[0].pts = ITEMS[0].pts.map(q => [q[0]+0.1, q[1]]); kick(); });
await new Promise(r => setTimeout(r, 300));
check(other === await p.evaluate(() => JSON.stringify(ITEMS[1].pts)), '動かしたのは選んだ1本だけ');
/* 🔴 選んだ印は刷る絵に混ざらない（PNG に選択枠が出ない） */
await reset();
await p.evaluate(() => { sel = 0; syncUI(); drawOverlay(); });
await new Promise(r => setTimeout(r, 300));
const withSel = await sig();
await p.evaluate(() => { sel = -1; syncUI(); drawOverlay(); });
await new Promise(r => setTimeout(r, 300));
check(withSel === await sig(), '⭐ 選んでも刷る計画は1つも変わらない（枠が絵に混ざらない）');
check(await p.evaluate(() => getComputedStyle(document.getElementById('ov')).pointerEvents) === 'none',
  '印の板が指を邪魔しない');
check(await p.evaluate(() => {
  const t1 = cv.style.transform, t2 = document.getElementById('ov').style.transform;
  return t1 === t2 && t1.length > 0; }), '印の板が盤と同じ倍率で動く');
/* 複製・消す・並べ替え */
await reset();
const n0 = await p.evaluate(() => ITEMS.length);
await p.evaluate(() => { sel = 0; syncUI(); document.getElementById('b_selDup').click(); });
await new Promise(r => setTimeout(r, 400));
check(await p.evaluate(() => ITEMS.length) === n0 + 1, '複製で1本増える');
await p.evaluate(() => document.getElementById('b_selDel').click());
await new Promise(r => setTimeout(r, 400));
check(await p.evaluate(() => ITEMS.length) === n0 && await p.evaluate(() => sel) === -1,
  'これを消すで1本減って、選択が外れる');

/* ══⭐ ⑥c 動かす（アニメーション）══ 木下「アニメーションもできるように」 */
console.log('\n⑥c 動かす');
await reset();
await set({ boilN:1, boilR:1.2, brN:1, brA:0.4 });
const still = await p.evaluate(() => { PH = 0; const s = size();
  return JSON.stringify(Array.from(buildPlan(s.W, s.H).idx)); });
const noAnim = await p.evaluate(() => {
  const k = { boilN:P.boilN, brN:P.brN }; P.boilN = 0; P.brN = 0;
  const s = size(), t = JSON.stringify(Array.from(buildPlan(s.W, s.H).idx));
  Object.assign(P, k); return t; });
check(still === noAnim, '⭐ 位相0＝つまみで作った絵そのもの（振れは片側だけ）');
const midPh = await p.evaluate(() => { PH = 0.37; const s = size();
  const t = JSON.stringify(Array.from(buildPlan(s.W, s.H).idx)); PH = 0; return t; });
check(midPh !== still, '位相を進めると絵が変わる');
const wrap = await p.evaluate(() => { PH = 1; const s = size();
  const t = JSON.stringify(Array.from(buildPlan(s.W, s.H).idx)); PH = 0; return t; });
check(wrap === still, '🔴 位相1と位相0が完全に一致（継ぎ目なしループ）');
for(const [n, o] of [['縁が沸く', { boilN:1, boilR:1.5, brN:0, brA:0 }],
                     ['段が呼吸', { boilN:0, boilR:0, brN:1, brA:0.5 }]]){
  await reset(); await set(o);
  const a = await p.evaluate(() => { PH = 0; const s = size();
    return JSON.stringify(Array.from(buildPlan(s.W, s.H).idx)); });
  const c = await p.evaluate(() => { PH = 0.5; const s = size();
    const t = JSON.stringify(Array.from(buildPlan(s.W, s.H).idx)); PH = 0; return t; });
  check(a !== c, `${n} だけでも動く`);
}
/* 粒が踊る＝決めたコマ数で一巡する */
await reset(); await set({ gflick:8 });
const gs = await p.evaluate(() => [0, 1/8, 1].map(v => { PH = v;
  const s = size(), q = buildPlan(s.W, s.H).seed; PH = 0; return q; }));
check(gs[0] !== gs[1] && gs[0] === gs[2], '粒が踊る＝コマで種が進み、1周で戻る', JSON.stringify(gs));
/* 画面で動かす／止めると位相0に戻る */
await reset(); await set({ boilN:1, boilR:1 });
await p.evaluate(() => { el('c_anim').checked = true; el('c_anim').dispatchEvent(new Event('change')); });
await new Promise(r => setTimeout(r, 700));
const moved2 = await p.evaluate(() => PH);
await p.evaluate(() => { el('c_anim').checked = false; el('c_anim').dispatchEvent(new Event('change')); });
await new Promise(r => setTimeout(r, 300));
check(moved2 > 0, '画面で動かすと位相が進む', moved2.toFixed(3));
check(await p.evaluate(() => PH === 0 && !P.anim), '止めると位相0（つまみの絵）に戻る');
/* 動画（PNG連番で実際に走らせる） */
await reset();
await set({ boilN:1, boilR:1.2, cyc:0.5, outLong:'1080', vFmt:'png', vFps:'12', vLoop:'1' });
const vp = await p.evaluate(() => tvPlan());
check(vp.total === 6 && vp.moving, 'コマ数＝秒×コマ/秒×周', `${vp.total}コマ`);
await p.evaluate(() => { window.__got = []; });
await p.evaluate(() => document.getElementById('b_video').click());
for(let i = 0; i < 80; i++){ if(await p.evaluate(() => !TV.on)) break; await new Promise(r => setTimeout(r, 500)); }
const vgot = await p.evaluate(() => window.__got);
const vmsg = await p.$eval('#vMeter', e => e.textContent);
check(vgot.length === 1 && vgot[0].type === 'application/zip', 'PNG連番（zip）が落ちた', JSON.stringify(vgot));
check(!/🔴/.test(vmsg), '書き出しが最後まで通った', vmsg.slice(0, 50));
check(await p.evaluate(() => PH === 0 && !TV.on), '撮り終わったら位相も状態も元に戻る');

/* ══ ⑦ 出す ══ */
console.log('\n⑦ 出す');
await reset();
await p.evaluate(() => { window.__got = []; });
for(const id of ['b_png','b_pnga','b_svg']){
  await p.evaluate(i => document.getElementById(i).click(), id);
  await new Promise(r => setTimeout(r, 900));
}
const got = await p.evaluate(() => window.__got);
check(got.length === 3, '3つとも落ちた', JSON.stringify(got.map(g => g.type)));
check(got.every(g => g.size > 1000), '中身が空でない', got.map(g => Math.round(g.size/1024) + 'KB').join(' '));
const alpha = await p.evaluate(() => {
  const s = size(), pl = buildPlan(s.W, s.H);
  const c = document.createElement('canvas'); c.width = s.W; c.height = s.H;
  const x = c.getContext('2d', { willReadFrequently:true }); render(x, pl, true);
  let mid = 0;
  for(let i = 0; i < pl.idx.length && !mid; i++) if(pl.idx[i] === 0){
    const cx = Math.round((i % pl.cols + .5) * pl.cell), cy = Math.round(((i / pl.cols)|0 + .5) * pl.cell);
    mid = x.getImageData(cx, cy, 1, 1).data[3];
  }
  return { corner:x.getImageData(2, 2, 1, 1).data[3], mid }; });
check(alpha.corner === 0, '地なしPNGの隅が本当に透明', `α=${alpha.corner}`);
check(alpha.mid > 0, '地なしでも線は残っている', `α=${alpha.mid}`);
const svg = await p.evaluate(() => {
  const s = size(), pl = buildPlan(s.W, s.H);
  const t = toSVG(pl, false);
  return { m:(t.match(/M/g) || []).length, want:runs(pl).length, head:t.slice(0, 40) }; });
check(/^<svg xmlns/.test(svg.head), 'SVG が svg で始まる');
check(svg.m === svg.want, 'SVG の矩形の数が計画と一致', `${svg.m} / ${svg.want}`);

/* ══ ⑧ 出す大きさ ══ */
console.log('\n⑧ 出す大きさ');
await reset();
check(await p.evaluate(() => outSize().W) === 1120, '「版面のまま」は版面と同じ');
await set({ outLong:'2048' });
const os = await p.evaluate(() => outSize());
check(os.H === 2048, '長辺を選ぶとその大きさになる', `${os.W}×${os.H}`);
await reset(); await set({ grain:0, chroma:0 });
const sizeDiff = await p.evaluate(() => {
  const mk = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H;
    render(c.getContext('2d', { willReadFrequently:true }), buildPlan(W, H), false); return c; };
  const s = size();
  const small = mk(s.W, s.H), big = mk(s.W*2, s.H*2);
  const sh = document.createElement('canvas'); sh.width = s.W; sh.height = s.H;
  const x = sh.getContext('2d', { willReadFrequently:true });
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(big, 0, 0, s.W, s.H);
  const a = small.getContext('2d', { willReadFrequently:true }).getImageData(0,0,s.W,s.H).data;
  const c = x.getImageData(0,0,s.W,s.H).data;
  let sum = 0; for(let i = 0; i < a.length; i += 4) sum += Math.abs(a[i]-c[i]);
  return sum / (a.length/4); });
check(sizeDiff < 10, '倍の大きさで出しても同じ絵（焼き直し）', `画素の平均ずれ ${sizeDiff.toFixed(1)}/255`);

/* ══ ⑨ 盤 ══ */
console.log('\n⑨ 盤');
await reset();
const tf0 = await p.evaluate(() => cv.style.transform);
const sg = await sig();
await p.evaluate(() => { document.getElementById('z_in').click(); document.getElementById('z_in').click(); });
await new Promise(r => setTimeout(r, 300));
check(tf0 !== await p.evaluate(() => cv.style.transform), '＋で拡大が変わる');
check(sg === await sig(), '拡大しても刷る計画は変わらない');
await p.evaluate(() => document.getElementById('z_one').click());
const one = await p.evaluate(() => +(cv.style.transform.match(/scale\(([\d.]+)\)/)[1]));
check(Math.abs(one - 1) < 0.01, '「原寸」がちょうど 100%', (one*100).toFixed(1) + '%');

/* ══ ⑩ 実機幅 ══ */
console.log('\n⑩ 実機幅（390px）');
await p.evaluate(() => document.getElementById('z_fit').click());
await p.setViewport({ width:390, height:844, deviceScaleFactor:2, isMobile:true, hasTouch:true });
await new Promise(r => setTimeout(r, 700));
const m = await p.evaluate(() => {
  const r = document.getElementById('r_cols'), cs = getComputedStyle(r);
  return { ta:cs.touchAction, h:Math.round(r.getBoundingClientRect().height),
           docW:document.documentElement.scrollWidth, winW:innerWidth,
           reach:['b_png','b_pnga','b_svg','b_undo','b_clear','b_addBand'].map(id => {
             const e = document.getElementById(id), b = e.getBoundingClientRect();
             return b.width > 40 && b.height > 20; }) }; });
check(m.ta === 'pan-y', 'スライダーが縦スクロールを止めていない', `touch-action:${m.ta}`);
check(m.h >= 34, 'つまみが掴める高さ', `${m.h}px`);
check(m.docW <= m.winW + 1, '横にはみ出していない', `${m.docW} / ${m.winW}`);
check(m.reach.every(Boolean), 'ボタンに全部届く');

/* ══ 速さ ══ */
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await reset(); await set({ cols:240, long:2400 });
const ms = await p.evaluate(() => {
  const s = size(), t0 = performance.now();
  render(cv.getContext('2d', { willReadFrequently:true }), buildPlan(s.W, s.H), false);
  return Math.round(performance.now() - t0); });
check(ms < 2500, '細かい升目・大きい版でも 2.5秒未満で刷れる', ms + 'ms');

console.log('\n' + (errs === 0 ? '✅ JSエラー 0件' : `🔴 JSエラー ${errs}件`));
if(errs) ng.push('JSエラー');
console.log(ng.length ? `\n🔴 落ちた: ${ng.length}件\n  - ` + ng.join('\n  - ') : '\n✅ 全部通った');
await b.close();
process.exit(ng.length ? 1 : 0);
