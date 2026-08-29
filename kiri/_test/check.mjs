/* ⭐⭐ 霧 KIRI の回帰テスト ── 2026-08-28
   🔴 見るのは「落ちないか」ではなく【この道具の芯が出ているか】：
     ⭐⭐ ① 濃さは粒の【数】で作る（濃い所ほど密）
     ⭐⭐ ② 粒の【大きさは変えない】＝網（点TEN）との決定的な違い
     ⭐⭐ ③ 近すぎる粒が無い（青色ノイズ）＝ただの乱数ならムラが出る
     ④ 同じ種なら1粒も同じ／振ると変わる
     ⑤ 散りを上げると粒は減る（間が空くから）
     ⑥ 飛沫 0 なら形の外に出ない
     ⑦ PNG / SVG が本当に落ちる
   使い方: node kiri/_test/check.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL_ = process.argv[2] || 'http://localhost:8460/kiri/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1400, height:900 });
await p.goto(URL_, { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,1500));
let NG=0; const ok=(c,n,x)=>{ console.log((c?'  ✅ ':'  🔴 ')+n+(x!=null?' … '+x:'')); if(!c) NG=1; };

/* 落ちてくるものを横取りする */
await p.evaluate(() => { window.__got = [];
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(x){ window.__got.push({ size:x.size, type:x.type }); return oc.call(URL, x); }; });

/* 左が濃く右が薄い元を入れる（濃さが粒の数になるかを見るため） */
const set = (id, v) => p.evaluate(([i,x]) => {
  const r = document.getElementById(i); r.value = x; r.dispatchEvent(new Event('input',{bubbles:true}));
}, [id, String(v)]);
await p.evaluate(async () => {
  const c = document.createElement('canvas'); c.width=400; c.height=400;
  const q = c.getContext('2d');
  const lg = q.createLinearGradient(0,0,400,0);
  lg.addColorStop(0,'#000'); lg.addColorStop(1,'#fff');
  q.fillStyle = lg; q.fillRect(0,0,400,400);
  const im = new Image();
  await new Promise(r => { im.onload = r; im.src = c.toDataURL('image/png'); });
  SRC = im; MAPKEY=''; DOTKEY=''; render();
});
await set('r_pad', 0); await set('r_ma', 0); await set('r_dens', 40);
await new Promise(r=>setTimeout(r,700));

const D = () => p.evaluate(() => {
  const d = scatter();
  const half = d.w/2;
  let L=0, R=0, minD=1e9, sizes=[];
  /* ⭐ 大きさは本体と同じ1本（dotSize）から取る。
     ⚠️ 控えているのは揺れの種であって大きさではない（ここを直に読むと別の数字になる）。 */
  for(let i=0;i<d.n;i++){ (d.xs[i] < half ? L++ : R++); if(i<400) sizes.push(dotSize(d.sz[i])); }
  /* 近すぎる粒が無いか＝いちばん近い2粒の距離（先頭2000粒で見る） */
  const m = Math.min(2000, d.n);
  for(let i=0;i<m;i++) for(let j=i+1;j<m;j++){
    const dx=d.xs[i]-d.xs[j], dy=d.ys[i]-d.ys[j]; const s=dx*dx+dy*dy; if(s<minD) minD=s;
  }
  return { n:d.n, L, R, w:d.w, minD:Math.sqrt(minD),
           大きさ最小:Math.min(...sizes), 大きさ最大:Math.max(...sizes) };
});
const A = await D();
ok(A.n > 1000, '元を入れると粒が出る', A.n.toLocaleString() + ' 粒');
ok(A.L > A.R * 1.8, '⭐⭐ 濃い側ほど粒が多い（濃さは【数】で作る）', `濃い側 ${A.L} / 薄い側 ${A.R}`);

/* ② 大きさは変えない（むら 0 なら全部同じ） */
await set('r_jit', 0); await new Promise(r=>setTimeout(r,500));
const B = await D();
ok(Math.abs(B.大きさ最大 - B.大きさ最小) < 1e-6,
   '⭐⭐ むら 0・霧なしなら粒の大きさは全部同じ（濃さで大きさを変えない＝網ではない）',
   `${B.大きさ最小.toFixed(3)} 〜 ${B.大きさ最大.toFixed(3)}`);

/* ③ 近すぎる粒が無い（青色ノイズ）＝ただの乱数なら 0 に近い値が出る */
ok(B.minD > 0.12, '⭐⭐ 近すぎる粒が無い（散りが効いている）', 'いちばん近い2粒 ' + B.minD.toFixed(3) + ' px');

/* ④ 種 */
const sig = () => p.evaluate(() => { const d = scatter();
  let h = 2166136261;
  for(let i=0;i<Math.min(4000,d.n);i++){ h ^= (d.xs[i]*97)|0; h = Math.imul(h,16777619); h ^= (d.ys[i]*89)|0; h = Math.imul(h,16777619); }
  return (h>>>0); });
const s1 = await sig();
await p.evaluate(() => { DOTKEY=''; render(); });
const s2 = await sig();
ok(s1 === s2, '同じ種なら1粒も同じ', String(s1));
await p.evaluate(() => document.getElementById('b_seed').click());
await new Promise(r=>setTimeout(r,500));
const s3 = await sig();
ok(s3 !== s1, '種を振ると散り方が変わる');
await p.evaluate(() => document.getElementById('b_seedback').click());
await new Promise(r=>setTimeout(r,500));
ok(await sig() === s1, '前の種に戻せる（気に入った散りは戻ってくる）');

/* ⑤ 散りを上げると【間が広がる】
   ⚠️ 「粒が減る」で見てはいけない＝真っ黒な所は濃さ 1 なので、散りを上げても
      そこだけは密のまま入り切る（それがこの道具の芯＝濃い所は密になれる）。 */
const g0 = (await D()).minD;
await set('r_gap', 600); await new Promise(r=>setTimeout(r,800));
const g1 = (await D()).minD;
ok(g1 > g0 * 1.5, '散りを上げると粒どうしの間が広がる', `${g0.toFixed(3)} → ${g1.toFixed(3)} px`);
await set('r_gap', 150); await new Promise(r=>setTimeout(r,500));

/* ⑥ 飛沫 0 なら形の外に出ない（右端は真っ白＝薄い側の外） */
await p.evaluate(async () => {
  const c = document.createElement('canvas'); c.width=400; c.height=400;
  const q = c.getContext('2d'); q.fillStyle='#fff'; q.fillRect(0,0,400,400);
  q.fillStyle='#000'; q.beginPath(); q.arc(200,200,90,0,7); q.fill();
  const im = new Image(); await new Promise(r => { im.onload = r; im.src = c.toDataURL('image/png'); });
  SRC = im; MAPKEY=''; DOTKEY=''; render();
});
/* ⚠️ 飛沫は【広がり（ぼかし）の届く範囲】までしか出ない＝縁のすぐ外で数える */
await set('r_mb', 60);
await set('r_ma', 0); await new Promise(r=>setTimeout(r,600));
const far = () => p.evaluate(() => { const d = scatter();
  const cx=d.w/2, cy=d.h/2, R=d.w*90/400;
  let out=0; for(let i=0;i<d.n;i++){ if(Math.hypot(d.xs[i]-cx, d.ys[i]-cy) > R*1.06) out++; }
  return out; });
const out0 = await far();
await set('r_ma', 80); await new Promise(r=>setTimeout(r,600));
const out1 = await far();
ok(out0 < 40, '飛沫 0 なら形の外にほとんど出ない', out0 + ' 粒');
ok(out1 > out0 * 3 + 50, '飛沫を上げると外へ抜ける', `${out0} → ${out1} 粒`);

/* ⑦ 出せる */
await p.evaluate(() => { window.__got = []; document.getElementById('b_png').click(); });
await new Promise(r=>setTimeout(r,1200));
await p.evaluate(() => document.getElementById('b_svgout').click());
await new Promise(r=>setTimeout(r,900));
const got = await p.evaluate(() => window.__got);
ok(got.length >= 2 && got.some(x => /png/.test(x.type)) && got.some(x => /svg/.test(x.type)),
   'PNG と SVG が本当に落ちる', JSON.stringify(got));
/* ⭐⭐ 濃さは【霧から真っ黒まで】通る ── 2026-08-29
   🔴 木下＝「いくらつまみをあげてもそこまで表現が変わらない」。原因は2つ：
     ① つまみが「数」だった＝版面を大きくするとスカスカになり、上限で張り付く
     ② 20万粒を超えると **道の文字列が大きすぎて new Path2D が黙って失敗し、何も描かれなかった**
        （実測：40万粒で墨 0）。だから木下は 15万あたりから先へ行けなかった。
   ⭐ つまみを「濃さ（どこまで詰めるか）」にして、道は刻んで渡すようにした。 */
{
  const shot = () => p.evaluate(() => {
    const c = document.getElementById('cv');
    const t = document.createElement('canvas'); t.width = 200; t.height = 200;
    const q = t.getContext('2d'); q.drawImage(c, 0, 0, 200, 200);
    const d = q.getImageData(0,0,200,200).data;
    let 墨 = 0, 真っ黒 = 0;
    for(let i = 0; i < d.length; i += 4){ if(d[i] < 128) 墨++; if(d[i] < 40) 真っ黒++; }
    return { 墨, 真っ黒, 粒:scatter().n };
  });
  await p.evaluate(() => { P.lay = 'drop'; DOTKEY = ''; render(); });
  const rows = [];
  for(const v of [10, 40, 70, 100]){
    await set('r_dens', v);
    await new Promise(r => setTimeout(r, 1400));
    rows.push({ v, ...(await shot()) });
  }
  ok(rows[0].墨 < rows[1].墨 && rows[1].墨 < rows[2].墨 && rows[2].墨 <= rows[3].墨,
     '⭐⭐ 濃さを上げるほど濃くなる（どこかで張り付かない）', JSON.stringify(rows.map(r => r.v + ':' + r.墨)));
  ok(rows[3].粒 > 200000 && rows[3].墨 > 0,
     '⭐⭐ 20万粒を超えても【ちゃんと描かれる】（道を刻んで渡す）', rows[3].粒.toLocaleString() + ' 粒 / 墨 ' + rows[3].墨);
  await p.evaluate(() => { P.lay = 'dither'; DOTKEY = ''; render(); });
  ok(rows[3].真っ黒 > rows[0].真っ黒 * 5 && rows[3].真っ黒 > rows[3].墨 * 0.85,
     '⭐⭐ いちばん濃くすると【真っ黒まで届く】（参考の吹き付けと同じ）',
     '濃さ10 ' + rows[0].真っ黒 + ' → 濃さ100 ' + rows[3].真っ黒
     + '（墨のうち ' + Math.round(rows[3].真っ黒 / rows[3].墨 * 100) + '% が真っ黒）');
  /* ⭐ 版面を変えても濃さの見え方が変わらない（数は結果） */
  await set('r_dens', 62);
  const a = await p.evaluate(async () => { const r = el('r_long'); r.value = 900; r.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(x => setTimeout(x, 1200)); return null; });
  await new Promise(r => setTimeout(r, 900));
  const s900 = await shot();
  await p.evaluate(async () => { const r = el('r_long'); r.value = 2200; r.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(x => setTimeout(x, 1600)); });
  await new Promise(r => setTimeout(r, 1400));
  const s2200 = await shot();
  ok(Math.abs(s900.墨 - s2200.墨) < s900.墨 * 0.28,
     '⭐ 版面を変えても【濃さの見え方が変わらない】（数は面積から出す）',
     '900px ' + s900.墨 + ' / 2200px ' + s2200.墨);
  await p.evaluate(() => { const r = el('r_long'); r.value = 1400; r.dispatchEvent(new Event('input',{bubbles:true})); });
  await new Promise(r => setTimeout(r, 1200));
}

/* ⭐⭐ 質感 ── 参考は【1bit のディザ】だった（2026-08-29）
   🔴 木下＝「砂の集まりというか質感から違う」「今のままなら ten でも十分そう」。
     参考を原寸で読んだら、粒は **1画素ぶんで、画素の升目の上に乗っていた**（誤差拡散の虫食い模様つき）。
     ＝ 丸い粒をランダムに撒く作りでは、どのつまみを回しても到達できない。
   ⭐ 「画素に置く（ディザ）」を足した。芯（濃さを粒の数だけで作る）は同じで、置く場所が升目。 */
{
  /* ⚠️ 板ぜんぶで数えると、真っ白な地に薄められて動きが見えない
     （実測 16.5%→18.5%）。⭐ 効くのは【中間調】なので、そこだけ数える。 */
  const cells = () => p.evaluate(() => {
    const M = bakeMap(), D = ditherCells();
    let on = 0, n = 0;
    for(let y = 0; y < D.gh; y++) for(let x = 0; x < D.gw; x++){
      const i = Math.min(M.core.length-1, y*D.px*M.w + x*D.px);
      const m2 = Math.max(M.core[i], M.blur[i]*P.ma);
      if(m2 > 0.06 && m2 < 0.94){ n++; on += D.on[y*D.gw+x]; }
    }
    return { on, 中間調:n, 割合:n ? +(on/n).toFixed(3) : 0, 升目:D.px };
  });
  await p.evaluate(() => { P.lay = 'dither'; P.dot = 1; P.dens = 50; MAPKEY = ''; render(); });
  await new Promise(r => setTimeout(r, 900));
  const a1 = await cells();
  await p.evaluate(() => { P.dens = 85; render(); });
  await new Promise(r => setTimeout(r, 900));
  const a2 = await cells();
  ok(a1.割合 > 0 && a2.割合 > a1.割合 * 1.25,
     '⭐⭐ 画素に置く＝濃さで【黒い升目が増える】', JSON.stringify(a1) + ' → ' + JSON.stringify(a2));

  /* ⭐ 誤差拡散＝濃さが1画素も失われない＝出た黒の割合が、狙った濃さの平均に近い */
  const keep = await p.evaluate(() => {
    P.dens = 50; MAPKEY = '';
    const M = bakeMap(), D = ditherCells();
    const gam2 = Math.max(0.18, 2.2 - 1.9 * (P.dens / 100));
    let want = 0;
    for(let i = 0; i < M.core.length; i++){
      const m2 = Math.min(1, Math.max(M.core[i], M.blur[i]*P.ma));
      want += m2 > 0 ? Math.pow(m2, gam2) : 0;
    }
    want /= M.core.length;
    let on = 0; for(let i = 0; i < D.on.length; i++) on += D.on[i];
    return { 狙い:+want.toFixed(3), 出た:+(on / D.on.length).toFixed(3) };
  });
  ok(Math.abs(keep.狙い - keep.出た) < 0.03,
     '⭐⭐ 誤差拡散＝【濃さが失われない】（出た黒の割合＝狙った濃さ）', JSON.stringify(keep));

  /* ⭐ 大きさ＝升目の大きさになる（粒が画素の升目に乗る） */
  const px2 = await p.evaluate(() => { P.dot = 3; const D = ditherCells(); return D.px; });
  ok(px2 === 3, '⭐ 大きさ＝升目の大きさ（画素の升目に乗る）', '升目 ' + px2 + ' px');

  /* ⭐ 降らせる（吹き付け）にも戻せる＝向きを縛らない */
  const both = await p.evaluate(async () => {
    const shot = () => { const c = document.getElementById('cv');
      const t = document.createElement('canvas'); t.width = 180; t.height = 180;
      const q = t.getContext('2d'); q.drawImage(c, 0, 0, 180, 180);
      const d = q.getImageData(0,0,180,180).data; let x = 2166136261;
      for(let i = 0; i < d.length; i += 4){ x ^= d[i]; x = Math.imul(x, 16777619); } return x >>> 0; };
    P.dot = 1; P.dens = 55;
    P.lay = 'dither'; MAPKEY=''; DOTKEY=''; render(); const a3 = shot();
    P.lay = 'drop';   MAPKEY=''; DOTKEY=''; render(); const b3 = shot();
    P.lay = 'dither'; MAPKEY=''; DOTKEY=''; render();
    return { ディザ:a3, 降らせる:b3 };
  });
  ok(both.ディザ !== both.降らせる,
     '⭐ 【降らせる】にも戻せる（吹き付けの粗さも選べる）', JSON.stringify(both));
}

/* ⭐ 欄と絵が同じ値を指している（HTML と P の食い違いを起こさない）── 2026-08-29
   ⚠️ ここまでの段で P を直接触っているので、【読み込み直した所】で見る。 */
{
  const m = await b.newPage();
  await m.setViewport({ width:1400, height:900 });
  await m.goto(URL_, { waitUntil:'networkidle0' });
  await new Promise(r => setTimeout(r, 2600));
  const same = await m.evaluate(() => ({
    dens:[+el('r_dens').value, P.dens], dot:[+el('r_dot').value/100, P.dot],
    gap:[+el('r_gap').value/100, P.gap], 表示:[el('o_dens').value, el('o_dot').value, el('o_gap').value] }));
  ok(['dens','dot','gap'].every(k => Math.abs(same[k][0] - same[k][1]) < 1e-6),
     '⭐⭐ 欄と絵が【同じ値】を指している', JSON.stringify(same));
  await m.close();
}

ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close(); process.exit(NG);
