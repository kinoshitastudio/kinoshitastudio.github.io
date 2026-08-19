/* 面 MEN — 顔をマス目に（柄）を見る（2026-08-19 新設）
   木下「顔をマス目に関してはこの素材を使って」＋「今のは今ので残しておいて」
   ⭐ 見るのは：
     ① なし → 色 → 柄 → 柄に色 の4つが【どれも別の絵になる】（＝押しても何も変わらない、を落とす）
     ② 柄を送ると絵が変わる（素材を取りに行けている）
     ③ 「色」は今までどおり（残してある）
   ⚠️ 偽のカメラには顔が写らない＝作りものの顔を window.MEN.fakeFace で入れて測る。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL0 = process.argv[2] || 'http://localhost:8092/men/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader',
    '--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1000, height:800, deviceScaleFactor:1 });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ng = [];
const check = (ok, name, note) => { console.log(`  ${ok ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!ok) ng.push(name); };

await p.goto(URL0 + '?v=' + Date.now(), { waitUntil:'networkidle0' });
for(let i = 0; i < 40; i++){ await wait(500); if(await p.evaluate(() => !document.getElementById('start').disabled)) break; }
await p.evaluate(() => document.getElementById('start').click());
await wait(2000);
await p.evaluate(() => { MEN.fakeFace(true); MEN.P.eye = 0; MEN.P.grain = 0; });   /* マス目だけ見る */
await wait(600);

/* 顔のあたりだけを数字にする（真ん中の四角） */
const shot = () => p.evaluate(() => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => {
  const c = document.getElementById('cv'), q = document.createElement('canvas');
  q.width = 160; q.height = 160;
  const gg = q.getContext('2d');
  gg.drawImage(c, c.width*0.35, c.height*0.28, c.width*0.30, c.height*0.44, 0, 0, 160, 160);
  const d = gg.getImageData(0,0,160,160).data;
  let r=0,g2=0,b2=0, dark=0, bright=0;
  for(let i=0;i<d.length;i+=4){ r+=d[i]; g2+=d[i+1]; b2+=d[i+2];
    const l=(d[i]*0.3+d[i+1]*0.59+d[i+2]*0.11); if(l<40) dark++; if(l>200) bright++; }
  const n = d.length/4;
  res({ r:Math.round(r/n), g:Math.round(g2/n), b:Math.round(b2/n),
        dark:Math.round(dark/n*100), bright:Math.round(bright/n*100) });
}))));
const same = (a, c) => Math.abs(a.r-c.r) + Math.abs(a.g-c.g) + Math.abs(a.b-c.b)
                     + Math.abs(a.dark-c.dark)*3 + Math.abs(a.bright-c.bright)*3 < 8;
const setMasu = v => p.evaluate(v => { MEN.P.masu = v; }, v);

console.log('── ① 4つがどれも別の絵になる');
const S = [];
for(let v = 0; v < 4; v++){ await setMasu(v); await wait(500); S.push(await shot()); }
['なし','色','柄','柄に色'].forEach((n,i) => console.log(`     ${n}\t${JSON.stringify(S[i])}`));
check(!same(S[0], S[1]), 'なし ≠ 色');
check(!same(S[1], S[2]), '⭐色 ≠ 柄（今のを残したまま柄が足せている）');
check(!same(S[2], S[3]), '柄 ≠ 柄に色');
check(!same(S[0], S[2]), 'なし ≠ 柄');

console.log('\n── ② 柄を送ると絵が変わる');
await setMasu(2); await wait(400);
const t0 = await shot();
const names = [];
for(let k = 0; k < 3; k++){
  await p.evaluate(() => document.getElementById('b_tile').click());
  await wait(900);
  names.push(await p.evaluate(() => document.getElementById('b_tile').textContent));
}
const t1 = await shot();
check(!same(t0, t1), `柄を3つ送ると絵が変わる（${names.join(' → ')}）`, `${JSON.stringify(t0)} → ${JSON.stringify(t1)}`);
const loaded = await p.evaluate(() => Object.keys(MEN.TIMG).filter(k => MEN.TIMG[k]).length);
check(loaded >= 3, '押したぶんだけ素材を取りに行っている（最初に22枚読まない）', String(loaded));

console.log('\n── ③ 柄に色は【カメラを染めない】');
/* 素材の透けている所まで色が乗ると、顔の外まで色がつく＝顔の外を見る */
await p.evaluate(() => { MEN.P.tile = 10; });   /* 輪＝透けている所が多い素材 */
await wait(900);
await setMasu(0); await wait(400);
const out0 = await p.evaluate(() => new Promise(res => requestAnimationFrame(() => {
  const c = document.getElementById('cv'), q = document.createElement('canvas');
  q.width = q.height = 40; const gg = q.getContext('2d');
  gg.drawImage(c, 20, 20, 60, 60, 0, 0, 40, 40);   /* 左上＝顔の外 */
  const d = gg.getImageData(0,0,40,40).data; let r=0,g2=0,b2=0;
  for(let i=0;i<d.length;i+=4){ r+=d[i]; g2+=d[i+1]; b2+=d[i+2]; }
  res([Math.round(r/(d.length/4)), Math.round(g2/(d.length/4)), Math.round(b2/(d.length/4))]);
})));
await setMasu(3); await wait(500);
const out3 = await p.evaluate(() => new Promise(res => requestAnimationFrame(() => {
  const c = document.getElementById('cv'), q = document.createElement('canvas');
  q.width = q.height = 40; const gg = q.getContext('2d');
  gg.drawImage(c, 20, 20, 60, 60, 0, 0, 40, 40);
  const d = gg.getImageData(0,0,40,40).data; let r=0,g2=0,b2=0;
  for(let i=0;i<d.length;i+=4){ r+=d[i]; g2+=d[i+1]; b2+=d[i+2]; }
  res([Math.round(r/(d.length/4)), Math.round(g2/(d.length/4)), Math.round(b2/(d.length/4))]);
})));
const diff = Math.abs(out0[0]-out3[0]) + Math.abs(out0[1]-out3[1]) + Math.abs(out0[2]-out3[2]);
check(diff < 12, '⭐顔の外は染まらない（マス目は顔の形に切られている）', `${out0} → ${out3}（差 ${diff}）`);
check(errs.length === 0, 'JSエラーが1つも出ていない', errs.slice(0,2).join(' / '));

console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ マス目は全部通った');
await b.close();
process.exit(ng.length ? 1 : 0);
