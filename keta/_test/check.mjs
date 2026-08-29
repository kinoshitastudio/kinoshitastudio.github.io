/* ⭐⭐ 桁 KETA の回帰テスト ── 2026-08-30
   🔴 見るのは【この道具の芯が出ているか】：
     ⭐⭐ ① 桁（列の幅・行の高さ）を動かしても【どのマスを塗るかは1マスも変わらない】
     ⭐⭐ ② それなのに【絵は変わる】＝動いているのは字ではなく升目
     ⭐  ③ ならす＝ぴったり一様（＝ただのドット絵に戻せる）
     ⭐  ④ 振れは端まで効く（1通りの絵しか作らないつまみを作らない）
     ⑤ 角を丸めるが効く
     ⑥ 盤の上で境目をつまむと、その2本だけが動いて合計は1のまま
     ⑦ 一覧＝枚ごとに種が違い、絵（塗るマス）は同じ
     ⑧ PNG／地なしPNG／SVG が本当に落ちる
     ⑨ 設定JSONの往復で1画素も変わらない（手で直した桁も戻る）
     ⑩ モバイルで横に伸びない・掴み手が出る
   使い方: node keta/_test/check.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL_ = process.argv[2] || 'http://localhost:8460/keta/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1400, height:900 });
await p.goto(URL_, { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 2000));
let NG = 0;
const ok = (c, n, x) => { console.log((c ? '  ✅ ' : '  🔴 ') + n + (x != null ? ' … ' + x : '')); if(!c) NG = 1; };
const set = (id, v) => p.evaluate(([i, x]) => { const r = document.getElementById(i);
  r.value = x; r.dispatchEvent(new Event('input', { bubbles:true })); }, [id, String(v)]);
const wait = ms => new Promise(r => setTimeout(r, ms));

/* 出す物を横取りする（本当に落ちたかを見る） */
await p.evaluate(() => { window.__got = [];
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(x){ window.__got.push({ size:x.size, type:x.type }); return oc.call(URL, x); }; });

/* 塗るマスの並び（＝絵）と、盤の画素 */
const pic = () => p.evaluate(() => { const q = bakePic(); return q.C + 'x' + q.R + ':' + q.on.join(''); });
const shot = () => p.evaluate(() => {
  const d = g.getImageData(0, 0, cv.width, cv.height).data;
  const o = []; for(let i = 0; i < d.length; i += 4*11) o.push(d[i]); return o; });
const diff = (A, B) => { let n = 0;
  for(let i = 0; i < Math.min(A.length, B.length); i++) if(Math.abs(A[i]-B[i]) > 8) n++; return n; };
const keta = () => p.evaluate(() => { const k = keta_(); return k; });
await p.evaluate(() => { window.keta_ = () => { const { WX:a, HY:c } = keta(); return { wx:a.slice(), hy:c.slice() }; }; });

console.log('── 桁 KETA（字は動かさず、升目の方を動かす）');
const P0 = await pic(), S0 = await shot();
ok(/[1]/.test(P0), '① 字から絵ができる（塗られたマスがある）',
   P0.split(':')[0] + ' マス／' + (P0.split(':')[1].match(/1/g)||[]).length + ' マスが塗られている');

/* ⭐⭐ 芯：桁を動かす */
await set('r_seed', 123); await wait(400);
const P1 = await pic(), S1 = await shot();
ok(P1 === P0, '⭐⭐ ② 桁を動かしても【絵は1マスも変わらない】');
ok(diff(S0, S1) > 200, '⭐⭐ ③ それなのに【出る絵】は変わる（動いているのは升目）',
   diff(S0, S1) + ' 点で違う');

/* ③ ならす */
await p.evaluate(() => document.getElementById('b_even').click()); await wait(400);
const K = await keta();
const mn = Math.min(...K.wx), mx = Math.max(...K.wx);
ok(mx / mn < 1.001, '⭐ ④ ならす＝ぴったり一様（ただのドット絵に戻せる）',
   '×' + (mx/mn).toFixed(4));
const P2 = await pic();
ok(P2 === P0, '⚠️ ならしても絵は同じ（絵と升目は別々）');

/* ④ 振れは端まで効く */
const width = async v => { await set('r_wamp', v); await wait(350);
  const k = await keta(); const a = 1 / k.wx.length;
  return { 細:Math.min(...k.wx)/a, 太:Math.max(...k.wx)/a }; };
await set('r_floor', 0);
const W20 = await width(20), W60 = await width(60), W100 = await width(100);
ok(W20.細 > W60.細 && W60.細 > W100.細,
   '⭐ ⑤ 振れは端まで効く（上げるほど細い桁が細くなる）',
   `20→×${W20.細.toFixed(2)} / 60→×${W60.細.toFixed(2)} / 100→×${W100.細.toFixed(2)}`);
ok(W100.細 < 0.15, '⭐⭐ 端まで上げると桁が【縞】になる', '×' + W100.細.toFixed(3));
await set('r_wamp', 55); await set('r_floor', 10); await wait(350);

/* ⑤ 角を丸める */
await set('r_rnd', 0); await wait(350); const R0 = await shot();
await set('r_rnd', 100); await wait(350); const R1 = await shot();
ok(diff(R0, R1) > 50, '⑥ 角を丸めるが効く', diff(R0, R1) + ' 点で違う');
await set('r_rnd', 50); await wait(300);

/* ⑥ 境目をつまむ＝その2本だけ動いて合計は1のまま */
const G = await p.evaluate(async () => {
  const before = keta().WX.slice();
  const q = edges(cv.width, cv.height);
  const i = 3;
  /* 盤の中の座標で、境目 i を右へずらす */
  const a0 = WX[i-1], b0 = WX[i], span = q.xs[q.xs.length-1] - q.xs[0];
  const dd = (span * 0.05) / span;
  const tot = a0 + b0, lo = 0.004;
  const a = Math.max(lo, Math.min(tot - lo, a0 + dd));
  WX[i-1] = a; WX[i] = tot - a; handEdit(); render();
  const after = keta().WX.slice();
  let moved = 0; for(let k = 0; k < after.length; k++) if(Math.abs(after[k]-before[k]) > 1e-9) moved++;
  return { moved, sum: after.reduce((x,y)=>x+y,0), 動いた:[i-1, i] };
});
ok(G.moved === 2, '⑦ 境目をつまむと【隣り合う2本だけ】が動く', G.moved + ' 本が動いた');
ok(Math.abs(G.sum - 1) < 1e-9, '⚠️ 合計は 1 のまま（他の桁は動かない）', G.sum.toFixed(9));

/* ⑦ 一覧 */
const SH = await p.evaluate(async () => {
  document.getElementById('b_sheet').click();
  await new Promise(r=>setTimeout(r, 700));
  const seeds = paintSheet.used.slice();
  const pic2 = bakePic();
  document.getElementById('b_one').click();
  await new Promise(r=>setTimeout(r, 500));
  return { seeds, 枚:seeds.length, 絵: pic2.C + 'x' + pic2.R + ':' + pic2.on.join('') };
});
ok(new Set(SH.seeds).size === SH.枚, '⑧ 一覧＝枚ごとに種が違う', SH.seeds.join(','));
ok(SH.絵 === P0, '⚠️ 一覧でも絵（塗るマス）は同じ');

/* ⑧ 出す */
await p.evaluate(async () => {
  document.getElementById('b_png').click();  await new Promise(r=>setTimeout(r,700));
  document.getElementById('b_apng').click(); await new Promise(r=>setTimeout(r,700));
  document.getElementById('b_svg').click();  await new Promise(r=>setTimeout(r,400));
});
const got = await p.evaluate(() => window.__got);
ok(got.filter(x => x.type === 'image/png').length >= 2 && got.some(x => x.type === 'image/svg+xml'),
   '⑨ PNG／地なしPNG／SVG が本当に落ちる', JSON.stringify(got));

/* ⑨ 設定の往復 ── 作る → 荒らす → 読む
   ⚠️ 物差しは【本体が作る道そのもの（pathOf の d）】から取る。
      画素で見ると、getImageData を1回でも通した canvas は CPU 描きに移って
      縁の1画素が揺れる＝**測りたいものだけが動く状態にならない**（ぶれる試験は狼少年）。
      d は画面・PNG・SVG がぜんぶ通る1本なので、これが同じなら3つとも同じ。 */
const RT = await p.evaluate(async () => {
  const plan = () => pathOf(1600, 900).d;
  const snap = JSON.parse(JSON.stringify(snapshot()));
  const before = plan();
  /* 荒らす（つまみも字も動かす。桁は手で直したものが入っている） */
  const s = (id,v)=>{const r=document.getElementById(id);r.value=v;r.dispatchEvent(new Event('input',{bubbles:true}));};
  s('r_seed', 999); s('r_wamp', 12); s('r_rows', 7); s('r_rnd', 5);
  document.getElementById('t_txt').value = 'XYZ';
  document.getElementById('t_txt').dispatchEvent(new Event('input',{bubbles:true}));
  await new Promise(r=>setTimeout(r,500));
  const messed = plan();
  applyJSON(snap);
  await new Promise(r=>setTimeout(r,500));
  const after = plan();
  const same = a => JSON.stringify(a);
  return { 同じ: before === after, 荒らせた: before !== messed,
           手で直した桁も戻った: same(snap.keta.wx) === same(WX) && same(snap.keta.hy) === same(HY),
           長さ: [before.length, after.length] };
});
ok(RT.荒らせた, '（前提）荒らすと道は変わっている');
ok(RT.手で直した桁も戻った, '⭐ 手で直した桁も戻る（つまみでは戻せないものだけ別に持つ）');
ok(RT.同じ, '⭐⭐ ⑩ 設定を読むと【道が1文字も違わずに】戻る（画面・PNG・SVG が同じ1本を通る）',
   RT.長さ.join(' → '));

/* ⑩ モバイル */
const M = await p.evaluate(() => ({}));
await p.setViewport({ width:390, height:844, isMobile:true, hasTouch:true });
await wait(900);
const MB = await p.evaluate(() => ({
  幅: document.documentElement.scrollWidth + '/' + innerWidth,
  横に伸びない: document.documentElement.scrollWidth <= innerWidth + 1,
  掴み手: !!document.getElementById('sheetGrip'),
  盤は指を取る: getComputedStyle(document.getElementById('stage')).touchAction === 'none',
}));
ok(MB.横に伸びない, '⑪ モバイルで横に伸びない', MB.幅);
ok(MB.掴み手, '⑪ モバイルでパネルの掴み手が出る');
ok(MB.盤は指を取る, '⑪ 盤を引いてもページが動かない（touch-action:none）');

ok(errs.length === 0, 'JSエラーが出ない', errs.join(' | '));
await b.close();
process.exit(NG ? 1 : 0);
