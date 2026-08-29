/* ⭐⭐ 曳 HIKI の回帰テスト ── 2026-08-29
   🔴 見るのは【この道具の芯が出ているか】：
     ⭐⭐ ① 効き 0 なら【元のまま】（読む速さが一定＝この道具の意味が出ない側）
     ⭐⭐ ② 効きを上げると読む速さがばらつく＝【伸びる所と縮む所】ができる
     ⭐⭐ ③ 止まる所があれば【帯】／戻る所があれば【鏡】が出る
     ④ 効きはマイナスにもできる（向きを縛らない）
     ⑤ 横にも縦にも走れる
     ⑥ 端で止める＝元の外を読まない（絵が切れない）
     ⑦ 絵の明暗から読む速さを決められる（絵が自分で自分を引き伸ばす）
     ⑧ PNG が本当に落ちる
   使い方: node hiki/_test/check.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL_ = process.argv[2] || 'http://localhost:8098/hiki/';
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

/* 読む速さの内訳（この道具のすべてがここに出る） */
const spd = (set) => p.evaluate((set) => {
  Object.assign(P, set); MAPKEY = ''; SCANKEY = ''; render();
  const S2 = scan(); let mn = 9e9, mx = -9e9, back = 0, flat = 0;
  for(let i = 1; i < S2.n; i++){
    const v = S2.src[i] - S2.src[i-1];
    if(v < mn) mn = v; if(v > mx) mx = v;
    if(v < -0.001) back++;
    if(Math.abs(v) < 0.02) flat++;
  }
  return { 遅い:+mn.toFixed(3), 速い:+mx.toFixed(3), 戻る:back, 止まる:flat, 本:S2.n,
           端:[+S2.src[0].toFixed(2), +S2.src[S2.n-1].toFixed(2)] };
}, set);

const A = await spd({ way:'wave', amp:0, freq:2, ph:0, sh:0, axis:'x' });
ok(Math.abs(A.遅い - 1) < 0.01 && Math.abs(A.速い - 1) < 0.01,
   '⭐⭐ 効き 0 なら【元のまま】（読む速さが一定）', JSON.stringify(A));

const B = await spd({ amp:0.6 });
ok(B.速い > A.速い + 0.05 && B.遅い < A.遅い - 0.05,
   '⭐⭐ 効きを上げると【伸びる所と縮む所】ができる', JSON.stringify(B));

const C = await spd({ amp:1.6, freq:6 });
ok(C.戻る > 0, '⭐⭐ 強く効かせると【戻る所】が出る＝鏡になる', JSON.stringify(C));

const D = await spd({ way:'step', amp:1.0, freq:10 });
ok(D.止まる > 0, '⭐⭐ 段＝【止まる所】が出る＝帯になる', JSON.stringify(D));

const E = await spd({ way:'wave', amp:-0.6, freq:2 });
ok(E.速い > 1.05 && E.遅い < 0.95, '⭐ 効きはマイナスにもできる（向きを縛らない）', JSON.stringify(E));

const F = await spd({ way:'wave', amp:1.8, freq:3 });
ok(F.端[0] >= 0 && F.端[1] <= F.本 - 1,
   '⭐ 端で止める＝元の外を読まない（絵が切れない）', JSON.stringify(F.端) + ' / 本 ' + F.本);

const G = await spd({ axis:'y', amp:0.6, way:'wave' });
ok(G.本 > 0 && G.速い > 1.0, '⭐ 縦にも走れる', JSON.stringify({ 本:G.本, 速い:G.速い }));

const H = await spd({ axis:'x', way:'tone', amp:0.9 });
ok(Math.abs(H.速い - H.遅い) > 0.01,
   '⭐⭐ 絵の明暗から読む速さが決まる（絵が自分で自分を引き伸ばす）', JSON.stringify(H));

/* 絵が実際に変わっているか（画素で） */
const shape = () => p.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 90; c.height = 90;
  c.getContext('2d').drawImage(cv, 0, 0, 90, 90);
  const d = c.getContext('2d').getImageData(0,0,90,90).data;
  let h = 2166136261;
  for(let i=0;i<d.length;i+=4){ h ^= d[i]; h = Math.imul(h, 16777619); }
  return (h>>>0);
});
await spd({ way:'wave', amp:0, freq:2, axis:'x', sh:0 });
const s0 = await shape();
await spd({ amp:0.8 });
const s1 = await shape();
ok(s0 !== s1, '⭐⭐ つまみを回すと【絵が本当に変わる】', `${s0} → ${s1}`);

await p.evaluate(() => { window.__got = []; document.getElementById('b_png').click(); });
await new Promise(r=>setTimeout(r,1400));
const got = await p.evaluate(() => window.__got);
ok(got.some(x=>/png/.test(x.type)), 'PNG が本当に落ちる', JSON.stringify(got));

ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close(); process.exit(NG);
