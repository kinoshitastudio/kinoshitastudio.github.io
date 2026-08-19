/* 面 MEN — 動画が撮れるかを見る（2026-08-19 新設）
   🔴 直す前の症状＝押すと 3コマで止まる（REC.on が勝手に false へ落ちる）。
   ⭐ 見るのは：
     ① 押したら撮り始める（REC.on が立つ）
     ② 2秒まわしてもコマが増え続ける（途中で止まらない・REC.err が無い）
     ③ もう一度押すと mp4（か zip）が出てくる
   ⚠️ ヘッドレスの偽カメラを使う＝顔は写らないが、撮る仕組みそのものは同じ道を通る。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL0 = process.argv[2] || 'http://localhost:8092/men/';
const VW = +(process.argv[3] || 1201), VH = +(process.argv[4] || 901);   /* ⭐ わざと奇数＝2で割れない大きさ */
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader',
    '--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:VW, height:VH, deviceScaleFactor:1 });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ng = [];
const check = (ok, name, note) => { console.log(`  ${ok ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!ok) ng.push(name); };

await p.goto(URL0 + '?v=' + Date.now(), { waitUntil:'networkidle0' });
/* 出てくるものを捕まえる */
await p.evaluate(() => { window.__got = [];
  const oc = URL.createObjectURL;
  window.__blobs = [];
  URL.createObjectURL = function(x){ if(x instanceof Blob){ window.__got.push({ type:x.type, size:x.size }); window.__blobs.push(x); } return oc.call(URL, x); }; });
for(let i = 0; i < 40; i++){ await wait(500); if(await p.evaluate(() => !document.getElementById('start').disabled)) break; }
await p.evaluate(() => document.getElementById('start').click());
await wait(2500);
const up = await p.evaluate(() => { const c = document.getElementById('cv'); return { started: document.getElementById('gate').style.display === 'none', w:c.width, h:c.height }; });
check(up.started, 'カメラが始まっている', JSON.stringify(up));
console.log(`  （盤の大きさ ${up.w} × ${up.h}${(up.w % 2 || up.h % 2) ? ' ＝2で割れない大きさ' : ''}）`);

console.log('\n── ① 押したら撮り始める');
await p.evaluate(() => document.getElementById('b_rec').click());
await wait(800);
const s1 = await p.evaluate(() => ({ on:MEN.REC.on, n:MEN.REC.n, fmt:MEN.REC.fmt, err:MEN.REC.err && String(MEN.REC.err.message || MEN.REC.err) }));
check(s1.on, '撮り始めた', JSON.stringify(s1));

console.log('\n── ② 途中で止まらない');
await wait(2000);
const s2 = await p.evaluate(() => ({ on:MEN.REC.on, n:MEN.REC.n, err:MEN.REC.err && String(MEN.REC.err.message || MEN.REC.err),
  stat:document.getElementById('stat').textContent }));
check(s2.on, '⭐2.8秒たっても撮り続けている', JSON.stringify(s2));
check(!s2.err, 'エラーが出ていない', s2.err || '');
check(s2.n > s1.n + 20, `コマが増え続けている（${s1.n} → ${s2.n}）`);

console.log('\n── ③ もう一度押すと出てくる');
await p.evaluate(() => document.getElementById('b_rec').click());
for(let i = 0; i < 30; i++){ await wait(400); if(await p.evaluate(() => window.__got.length)) break; }
const out = await p.evaluate(() => ({ got:window.__got, stat:document.getElementById('stat').textContent, on:MEN.REC.on }));
const f = out.got.find(x => /mp4|zip/.test(x.type)) || out.got[0];
check(!!f && f.size > 20000, '動画（か連番）が出た', f ? `${f.type} ${(f.size/1024/1024).toFixed(2)}MB` : '何も出てこない');
check(/出した/.test(out.stat), '「出した」と言っている', out.stat);

/* ⭐ 出てきたものが【本当に動画として開ける】か＝入れ物だけできて中身が空、を落とす */
if(f && /mp4/.test(f.type)){
  const play = await p.evaluate(() => new Promise(res => {
    const bl = window.__blobs.find(x => /mp4/.test(x.type));
    const v = document.createElement('video'); v.muted = true; v.preload = 'metadata';
    const to = setTimeout(() => res({ err:'開かない（15秒）' }), 15000);
    v.onloadedmetadata = () => { clearTimeout(to); res({ d:v.duration, w:v.videoWidth, h:v.videoHeight }); };
    v.onerror = () => { clearTimeout(to); res({ err:'video が読めない' }); };
    v.src = URL.createObjectURL(bl);
  }));
  check(!play.err && play.w > 0 && play.d > 1.0, '⭐出した mp4 が動画として開ける（1秒以上）', JSON.stringify(play));
}
check(errs.length === 0, 'JSエラーが1つも出ていない', errs.slice(0,2).join(' / '));

console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ 動画は全部通った');
await b.close();
process.exit(ng.length ? 1 : 0);
