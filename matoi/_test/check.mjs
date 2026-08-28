/* ⭐⭐ 纏 MATOI の回帰テスト ── 2026-08-28
   🔴 見るのは【この道具の芯が出ているか】：
     ⭐⭐ ① 陰を借りる＝ロゴの上に下地の暗さが乗る（乗せただけの絵と違う）
     ⭐⭐ ② しわに沿う＝下地の明暗の傾きでロゴがずれる
     ⭐⭐ ③ 借りたものが【ロゴの外へはみ出さない】（形で切れている）
     ④ 全部 0 なら「ただ貼っただけ」に戻る（つまみが嘘でない）
     ⑤ 四隅を動かすと当て込む場所が変わる／面はいくつでも足せる
     ⑥ 色を差し替えられる（白版・黒版）
     ⑦ 掴み手は出す PNG に混ざらない
   使い方: node matoi/_test/check.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL_ = process.argv[2] || 'http://localhost:8460/matoi/';
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

/* 下地＝左が暗く右が明るい布／ロゴ＝真っ白な四角（借りているかが一目で分かる） */
await p.evaluate(async () => {
  const c = document.createElement('canvas'); c.width=800; c.height=600;
  const q = c.getContext('2d');
  const lg = q.createLinearGradient(0,0,800,0);
  lg.addColorStop(0,'#202020'); lg.addColorStop(1,'#f0f0f0');
  q.fillStyle = lg; q.fillRect(0,0,800,600);
  const bg = new Image(); await new Promise(r => { bg.onload = r; bg.src = c.toDataURL('image/png'); });
  BG = bg; TONEKEY = '';
  const l = document.createElement('canvas'); l.width=400; l.height=200;
  const lq = l.getContext('2d'); lq.fillStyle = '#ffffff'; lq.fillRect(0,0,400,200);
  const li = new Image(); await new Promise(r => { li.onload = r; li.src = l.toDataURL('image/png'); });
  LOGO = li;
  FACES[0].pts = [[0.10,0.35],[0.90,0.35],[0.90,0.65],[0.10,0.65]];
  render();
});
await new Promise(r=>setTimeout(r,600));

/* ロゴの中の明るさを、左端と右端で読む（本体と同じ盤から） */
const read = () => p.evaluate(() => {
  const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
  c.getContext('2d').drawImage(cv, 0, 0);
  const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  const at = (fx, fy) => { const x = Math.round(c.width*fx), y = Math.round(c.height*fy);
    const i = (y*c.width + x)*4; return Math.round(d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114); };
  return { 左:at(0.16, 0.50), 右:at(0.84, 0.50), 外上:at(0.16, 0.12), 外下:at(0.84, 0.88) };
});
const A = await read();
ok(A.右 > A.左 + 25, '⭐⭐ 陰を借りている（下地が暗い側ではロゴも暗い）', JSON.stringify(A));

/* ④ 全部 0 なら「ただ貼っただけ」＝ロゴの中は真っ白で左右同じ */
const set = (id, v) => p.evaluate(([i,x]) => { const r=document.getElementById(i); r.value=x;
  r.dispatchEvent(new Event('input',{bubbles:true})); }, [id, String(v)]);
/* ⚠️ 濃さも 1.00 にしてから見る＝既定は 0.95 なので下地がわずかに透ける（仕様どおり）。
   これを入れないと「ただ貼っただけ」との差が 8 だけ残って落ちる。 */
await set('r_sh', 0); await set('r_hi', 0); await set('r_gr', 0); await set('r_warp', 0); await set('r_op', 100);
await new Promise(r=>setTimeout(r,600));
const B = await read();
ok(Math.abs(B.右 - B.左) < 6 && B.左 > 230, '全部 0 なら【ただ貼っただけ】に戻る（つまみが嘘でない）', JSON.stringify(B));

/* ③ 借りたものがロゴの外へはみ出さない＝外は下地のまま（左が暗く右が明るい） */
await set('r_op', 95); await set('r_sh', 120); await new Promise(r=>setTimeout(r,600));
const C = await read();
ok(C.外上 < 90 && C.外下 > 180, '⭐⭐ 借りた陰がロゴの外へはみ出さない', JSON.stringify(C));
await set('r_sh', 75);

/* ② しわに沿う＝傾きがある所でロゴの形がずれる */
const shape = () => p.evaluate(() => {
  const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
  c.getContext('2d').drawImage(cv, 0, 0);
  const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  let h = 2166136261;
  for(let i=0;i<d.length;i+=4*211){ h ^= d[i]; h = Math.imul(h, 16777619); }
  return (h>>>0);
});
await set('r_warp', 0); await new Promise(r=>setTimeout(r,500));
const w0 = await shape();
await set('r_warp', 180); await new Promise(r=>setTimeout(r,500));
const w1 = await shape();
ok(w0 !== w1, '⭐⭐ しわに沿う＝形が変わる', `${w0} → ${w1}`);
await set('r_warp', 55);

/* ⑤ 面 */
const n0 = await p.evaluate(() => FACES.length);
await p.evaluate(() => document.getElementById('b_addFace').click());
await new Promise(r=>setTimeout(r,400));
ok(await p.evaluate(() => FACES.length) === n0 + 1, '面を足せる（箱の正面と側面／胸とタグ）');
await p.evaluate(() => document.getElementById('b_delFace').click());
await new Promise(r=>setTimeout(r,300));

/* 四隅を動かすと当て込む場所が変わる */
const s0 = await shape();
await p.evaluate(() => { FACES[0].pts[0] = [0.05, 0.20]; render(); });
await new Promise(r=>setTimeout(r,400));
ok(await shape() !== s0, '四隅を動かすと当て込む場所が変わる');

/* ⑥ 色を差し替える */
await p.evaluate(() => { FACES[0].pts = [[0.10,0.35],[0.90,0.35],[0.90,0.65],[0.10,0.65]]; render(); });
await new Promise(r=>setTimeout(r,300));
const before = (await read()).右;
await p.evaluate(() => document.querySelectorAll('#s_tint button')[2].click());  /* 黒 */
await new Promise(r=>setTimeout(r,500));
const after = (await read()).右;
ok(after < before - 40, '色を差し替えられる（白版・黒版）', `${before} → ${after}`);
await p.evaluate(() => document.querySelectorAll('#s_tint button')[0].click());

/* ⑦ 掴み手は出す PNG に混ざらない */
await p.evaluate(() => { window.__got = []; document.getElementById('b_png').click(); });
await new Promise(r=>setTimeout(r,1200));
const got = await p.evaluate(() => window.__got);
ok(got.some(x=>/png/.test(x.type)), 'PNG が本当に落ちる', JSON.stringify(got));
ok(await p.evaluate(() => ov.id === 'ov' && ov !== cv), '掴み手は別の板に描いている（PNG に混ざらない）');
ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close(); process.exit(NG);
