/* ⭐⭐ 隙 SUKI の回帰テスト ── 2026-08-28
   🔴 見るのは【この道具の芯が出ているか】：
     ⭐⭐ ① 太らせ 1.00 で隣と接し、それを超えると【重なる】（＝隙間が絵になる）
     ⭐⭐ ② 隙間が埋まる境目（正方 ×1.41）を超えると、濃い所はベタになる
     ⭐⭐ ③ 粒の大きさは【濃さ】で変わる（＝網点。KIRI とはここが逆）
     ④ 升目に乗っている（格子＝規則がある。KIRI は乗っていない）
     ⑤ 角度を変えると並びが回る（モアレの元）
     ⑥ 字・写真・SVG のどれからでも作れる
     ⑦ PNG / SVG が本当に落ちる
   使い方: node suki/_test/check.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL_ = process.argv[2] || 'http://localhost:8460/suki/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1400, height:900 });
await p.goto(URL_, { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,1600));
let NG=0; const ok=(c,n,x)=>{ console.log((c?'  ✅ ':'  🔴 ')+n+(x!=null?' … '+x:'')); if(!c) NG=1; };
await p.evaluate(() => { window.__got = [];
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(x){ window.__got.push({ size:x.size, type:x.type }); return oc.call(URL, x); }; });
const set = (id, v) => p.evaluate(([i,x]) => { const r=document.getElementById(i); r.value=x;
  r.dispatchEvent(new Event('input',{bubbles:true})); }, [id, String(v)]);

/* いちばん濃い所（字の中）の粒どうしが重なっているかを数字で見る */
const D = () => p.evaluate(() => {
  const d = lay(), s = P.pitch;
  let big = 0, small = 0, over = 0, minR = 1e9, maxR = 0;
  for(let i = 0; i < d.n; i++){
    const r = d.rs[i];
    if(r > maxR) maxR = r; if(r < minR) minR = r;
    if(r * 2 > s) over++;               /* 直径が升目より大きい＝隣と重なる */
    if(r > s*0.4) big++; else small++;
  }
  return { n:d.n, over, big, small, minR:+minR.toFixed(2), maxR:+maxR.toFixed(2), pitch:s };
});
const A = await D();
ok(A.n > 200, '字から粒が並ぶ', A.n.toLocaleString() + ' 粒');
ok(A.over > 100, '⭐⭐ 濃い所は直径が升目を超える＝となりと重なる', A.over + ' 粒が重なっている');
ok(A.maxR > A.minR * 2, '⭐⭐ 粒の大きさが濃さで変わる（＝網点）', `${A.minR} 〜 ${A.maxR} px`);

/* ⭐⭐ 縁が【階段】で落ちる（2026-08-30）
   🔴🔴 直す前は升目のまん中1画素だけを見ていた＝字は白か黒なので
      粒の太さは「いちばん太い」「いちばん細い」の **2種類しか出なかった**。
      隙間が全部おなじ形＝壁紙になり、この道具の芯（隙間が絵になる）が消えていた。
   ⭐ いまは升目のぶんを平均して読む＝輪郭にまたがった粒は中くらいの太さになる。 */
const K = await p.evaluate(() => {
  const d = lay(), set2 = new Set();
  for(let i = 0; i < d.n; i++) set2.add(d.rs[i].toFixed(1));
  const s = [...set2].map(Number).sort((a,b)=>a-b);
  /* いちばん細い（地）といちばん太い（芯）の【あいだ】に何段あるか */
  const mid = s.filter(r => r > s[0] * 1.5 && r < s[s.length-1] * 0.9);
  return { 段:s.length, 中くらいの太さ:mid.length };
});
ok(K.段 >= 6, '⭐⭐ 粒の太さが何段もある（2種類の壁紙になっていない）', K.段 + ' 段');
ok(K.中くらいの太さ >= 3, '⭐⭐ 輪郭に【中くらいの粒】が出る＝縁が階段で落ちる', K.中くらいの太さ + ' 段');

/* ① 太らせ 1.00 以下なら重ならない */
await set('r_grow', 90); await new Promise(r=>setTimeout(r,400));
const B = await D();
ok(B.over === 0, '⭐ 太らせ 0.90 では1粒も重ならない（ただの網点）', B.over + ' 粒');
await set('r_grow', 122); await new Promise(r=>setTimeout(r,400));

/* ② 境目の案内が出ている（触る前にどちら側か分かる） */
const m2 = await p.evaluate(() => document.getElementById('meter2').textContent);
ok(/1\.00/.test(m2) && /1\.41/.test(m2) && /星/.test(m2), '境目（×1.00 と ×1.41）を数字で出している', m2.replace(/\n/g,' / '));
await set('r_grow', 200); await new Promise(r=>setTimeout(r,400));
const m3 = await p.evaluate(() => document.getElementById('meter2').textContent);
ok(/埋まった/.test(m3), '埋まったら「埋まった」と言う', m3.split('\n').pop());
await set('r_grow', 122); await new Promise(r=>setTimeout(r,400));

/* ④ 升目に乗っている＝同じ行の粒は y がそろう（KIRI との違い） */
const grid = await p.evaluate(() => {
  const d = lay(); const ys = new Set();
  for(let i = 0; i < Math.min(3000, d.n); i++) ys.add(Math.round(d.ys[i]));
  return { 行の数:ys.size, 粒:Math.min(3000, d.n) };
});
ok(grid.行の数 < grid.粒 / 8, '⭐ 升目に乗っている（同じ行に粒が並ぶ）', JSON.stringify(grid));

/* ⑤ 角度で回る */
const sig = () => p.evaluate(() => { const d = lay(); let h = 2166136261;
  for(let i=0;i<Math.min(2000,d.n);i++){ h ^= (d.xs[i]*31)|0; h = Math.imul(h,16777619); }
  return (h>>>0); });
const s0 = await sig();
await set('r_ang', 22); await new Promise(r=>setTimeout(r,400));
ok(await sig() !== s0, '角度を変えると並びが回る（モアレの元）');
await set('r_ang', 0); await new Promise(r=>setTimeout(r,300));

/* ⑥ 写真からも作れる */
await p.evaluate(async () => {
  const c = document.createElement('canvas'); c.width=300; c.height=300;
  const q = c.getContext('2d');
  const lg = q.createLinearGradient(0,0,300,0);
  lg.addColorStop(0,'#000'); lg.addColorStop(1,'#fff');
  q.fillStyle = lg; q.fillRect(0,0,300,300);
  const im = new Image(); await new Promise(r => { im.onload = r; im.src = c.toDataURL('image/png'); });
  SRC = im; MAPKEY=''; DOTKEY=''; render();
});
await new Promise(r=>setTimeout(r,500));
const C = await p.evaluate(() => { const d = lay(); const half = d.w/2;
  let L=0, R=0; for(let i=0;i<d.n;i++){ if(d.rs[i] > P.pitch*0.45){ (d.xs[i]<half?L++:R++); } }
  return { L, R }; });
ok(C.L > C.R * 2, '写真の濃い側ほど粒が大きい', `濃い側 ${C.L} / 薄い側 ${C.R}`);

/* ⑦ 出せる */
await p.evaluate(() => { window.__got = []; document.getElementById('b_png').click(); });
await new Promise(r=>setTimeout(r,1000));
await p.evaluate(() => document.getElementById('b_svgout').click());
await new Promise(r=>setTimeout(r,800));
const got = await p.evaluate(() => window.__got);
ok(got.some(x=>/png/.test(x.type)) && got.some(x=>/svg/.test(x.type)), 'PNG と SVG が本当に落ちる', JSON.stringify(got));
ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close(); process.exit(NG);
