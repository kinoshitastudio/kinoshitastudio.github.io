/* ⭐⭐ 埋 UME の回帰テスト ── 2026-08-29
   🔴 見るのは【この道具の芯が出ているか】：
     ⭐⭐ ① 升目は【四分木】で刻まれる＝大きさがばらつく（一定なら枡MASU と同じで意味が無い）
     ⭐⭐ ② 字の縁の近くほど細かい（＝小さい升目は縁に集まる）
     ⭐ ③ 刻みの深さを上げると升目が増える
     ⭐ ④ 地を埋める／字を埋める が入れ替わる（向きを縛らない）
     ⑤ いちばん小さい升目より小さく割らない
     ⑥ 詰める字を変えると絵が変わる
     ⑦ PNG が本当に落ちる
   使い方: node ume/_test/check.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL_ = process.argv[2] || 'http://localhost:8098/ume/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1400, height:900 });
await p.goto(URL_, { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,2600));
let NG=0; const ok=(c,n,x)=>{ console.log((c?'  ✅ ':'  🔴 ')+n+(x!=null?' … '+x:'')); if(!c) NG=1; };
await p.evaluate(() => { window.__got = [];
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(x){ window.__got.push({ size:x.size, type:x.type }); return oc.call(URL, x); }; });

const cs = (set) => p.evaluate((set) => {
  Object.assign(P, set); MAPKEY = ''; CELLKEY = ''; render();
  const C = cells(), M = bakeMap();
  let mn = 9e9, mx = 0, sum = 0;
  /* ⭐ 小さい升目が【字の縁に集まっているか】＝縁からの近さを測る */
  const small = [], big = [];
  C.list.forEach(([x,y,w,h]) => {
    const a = Math.min(w,h); if(a < mn) mn = a; if(Math.max(w,h) > mx) mx = Math.max(w,h);
    sum += a;
    (a <= mn*2 ? small : big).push([x + w/2, y + h/2, w, h]);
  });
  return { 数:C.n, 小:Math.round(mn), 大:Math.round(mx),
           平均:C.n ? +(sum/C.n).toFixed(1) : 0, 盤:[M.w, M.h] };
}, set);

const A = await cs({ txt:'永', fill:'あいうえお', side:'out', depth:6, minc:18, gap:6 });
ok(A.数 > 20, '⭐ 升目が出る', JSON.stringify(A));
ok(A.大 > A.小 * 3,
   '⭐⭐ 升目の大きさが【ばらつく】＝四分木で刻まれている（一定なら枡と同じ）', JSON.stringify(A));

const B = await cs({ depth:8 });
ok(B.数 > A.数, '⭐ 刻みの深さを上げると升目が増える', `${A.数} → ${B.数}`);

const C = await cs({ depth:6, side:'in' });
ok(C.数 > 5 && C.数 !== A.数, '⭐ 地を埋める／字を埋める が入れ替わる（向きを縛らない）',
   `地 ${A.数} → 字 ${C.数}`);

const D = await cs({ side:'out', minc:60 });
ok(D.小 >= 30, '⭐ いちばん小さい升目より小さく割らない', `いちばん小さい ${D.小}px（下限 60 の半分以上）`);

/* ⭐⭐ 小さい升目が字の縁に集まっているか＝四分木の意味そのもの */
const E = await p.evaluate(() => {
  Object.assign(P, { txt:'永', side:'out', depth:7, minc:12, gap:6 });
  MAPKEY = ''; CELLKEY = ''; render();
  const C = cells(), M = bakeMap(), { w, sum } = M;
  const W1 = w + 1;
  const at = (x,y,ww,hh) => sum[(y+hh)*W1+(x+ww)] - sum[y*W1+(x+ww)] - sum[(y+hh)*W1+x] + sum[y*W1+x];
  /* 升目のまわり（少し広げた枠）に字が混ざっていれば「縁の近く」 */
  /* ⚠️ 周りを見る幅を【升目の大きさに比例】させると、大きい升目も広く見て
     「縁がある」と出てしまう（実際にそれで 100% / 100% になった）。
     ⭐ 測りたいのは【縁からの近さ】だけ＝幅は盤に対して固定にする。 */
  const near = (x,y,ww,hh) => {
    const m = Math.max(4, Math.round(M.w * 0.012));
    const X = Math.max(0, x-m), Y = Math.max(0, y-m);
    const W2 = Math.min(M.w, x+ww+m) - X, H2 = Math.min(M.h, y+hh+m) - Y;
    const n = at(X, Y, W2, H2);
    return n > 0 && n < W2*H2;
  };
  const sizes = C.list.map(c => Math.min(c[2], c[3])).sort((a,b) => a-b);
  const th = sizes[Math.floor(sizes.length*0.25)] || 0;      /* 小さい方 25% */
  let sN = 0, sAll = 0, bN = 0, bAll = 0;
  C.list.forEach(c => {
    const a = Math.min(c[2], c[3]);
    if(a <= th){ sAll++; if(near(...c)) sN++; }
    else       { bAll++; if(near(...c)) bN++; }
  });
  return { 小さい升目が縁: sAll ? +(sN/sAll*100).toFixed(0) : 0,
           大きい升目が縁: bAll ? +(bN/bAll*100).toFixed(0) : 0, 小:sAll, 大:bAll };
});
ok(E.小さい升目が縁 > E.大きい升目が縁 + 15,
   '⭐⭐ 小さい升目ほど【字の縁】に集まっている（四分木が効いている）',
   `小さい ${E.小さい升目が縁}% / 大きい ${E.大きい升目が縁}%`);

/* 詰める字を変えると絵が変わる */
const shape = () => p.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 90; c.height = 90;
  c.getContext('2d').drawImage(cv, 0, 0, 90, 90);
  const d = c.getContext('2d').getImageData(0,0,90,90).data;
  let h = 2166136261;
  for(let i=0;i<d.length;i+=4){ h ^= d[i+2]; h = Math.imul(h, 16777619); }
  return (h>>>0);
});
await cs({ fill:'あいうえお', depth:6, minc:18 });
const f0 = await shape();
await cs({ fill:'YUAN' });
const f1 = await shape();
ok(f0 !== f1, '⭐ 詰める字を変えると絵が変わる', `${f0} → ${f1}`);

await p.evaluate(() => { window.__got = []; document.getElementById('b_png').click(); });
await new Promise(r=>setTimeout(r,1400));
const got = await p.evaluate(() => window.__got);
ok(got.some(x=>/png/.test(x.type)), 'PNG が本当に落ちる', JSON.stringify(got));

/* ⭐⭐ 指の端末で【立ち上がるか】── 2026-08-29
   🔴 外枠を隣の道具から借りたとき、その道具にしか無いつまみを触る1行が付いてきて、
      指の端末だけ立ち上げが丸ごと死んでいた（何も描かれない）。
   ⚠️ PC 幅の「JSエラーが出ない」では出ない＝【指の端末で1回開く】試験がここに要る。 */
{
  const m = await b.newPage(); const merr = [];
  m.on('pageerror', e => merr.push(e.message));
  await m.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1');
  await m.setViewport({ width:390, height:844, deviceScaleFactor:2, isMobile:true, hasTouch:true });
  await m.goto(URL_, { waitUntil:'networkidle0' });
  await new Promise(r=>setTimeout(r,3200));
  /* 盤に本当に絵が乗っているか＝一色でないこと */
  const ink = await m.evaluate(() => {
    let best = 0;
    document.querySelectorAll('canvas').forEach(c => {
      if(!c.width || !c.height) return;
      const t = document.createElement('canvas'); t.width = 48; t.height = 48;
      const g = t.getContext('2d'); g.drawImage(c, 0, 0, 48, 48);
      const d = g.getImageData(0,0,48,48).data, f = [d[0],d[1],d[2],d[3]]; let n = 0;
      for(let i=0;i<d.length;i+=4)
        if(Math.abs(d[i]-f[0])>6||Math.abs(d[i+1]-f[1])>6||Math.abs(d[i+2]-f[2])>6||Math.abs(d[i+3]-f[3])>6) n++;
      if(n > best) best = n;
    });
    return best;
  });
  ok(merr.length === 0, '⭐⭐ 指の端末で立ち上げが死なない', merr.join(' / '));
  ok(ink > 20, '⭐⭐ 指の端末でも盤に絵が出る', '違う画素 ' + ink);
  await m.close();
}

ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close(); process.exit(NG);
