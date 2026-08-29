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

ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close(); process.exit(NG);
