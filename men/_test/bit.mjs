/* 面 MEN — ビットの粒（TSUBU から）と 体の動きで崩す を見る（2026-08-20 新設）
   ⭐ 物差しは【ビット感そのもの】に合わせた。画素のハッシュで比べても
      偽カメラは毎コマ絵が動くので必ず違う＝何も言えない。だから次の2つを数える：
        ① 色の数 ── ビット感の正体は【色数が少ないこと】。段に落ちていれば必ず減る
        ② 横に続く同じ色の長さ ── 粗さ（＝1粒の大きさ）を上げれば必ず伸びる
   ⚠️ 偽のカメラには顔が写らない。ここで見るのは【画面全体に敷く絵】なので顔は要らない。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL0 = process.argv[2] || 'http://localhost:8092/men/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader',
    '--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1200, height:800, deviceScaleFactor:1 });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ng = [];
const check = (ok, name, note) => { console.log(`  ${ok ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!ok) ng.push(name); };

await p.goto(URL0 + '?v=' + Date.now(), { waitUntil:'networkidle0' });
for(let i = 0; i < 40; i++){ await wait(500); if(await p.evaluate(() => !document.getElementById('start').disabled)) break; }
await p.evaluate(() => document.getElementById('start').click());
await wait(2000);

const press = (id, n=1) => p.evaluate((id,n) => { for(let i=0;i<n;i++) document.getElementById(id).click(); }, id, n);
const P_ = () => p.evaluate(() => ({ ...MEN.P, form:MEN.FORMS[MEN.P.form], grid:MEN.GRIDS[MEN.P.grid][0] }));

/* 盤をそのまま読む（縮めない＝縮めると色が混ざって数えられない） */
const measure = () => p.evaluate(() => {
  const c = document.getElementById('cv');
  const q = document.createElement('canvas'); q.width = 600; q.height = 400;
  const t = q.getContext('2d', { willReadFrequently:true });
  t.imageSmoothingEnabled = false;               /* ⚠️ ぼかすと段が消えて色数が数えられない */
  t.drawImage(c, 0, 0, c.width, c.height, 0, 0, 600, 400);
  const d = t.getImageData(0, 0, 600, 400).data;
  const seen = new Set();
  let runSum = 0, runN = 0, ink = 0;
  for(let y = 0; y < 400; y++){
    let run = 1, prev = -1;
    for(let x = 0; x < 600; x++){
      const i = (y*600 + x)*4;
      const k = (d[i]>>3<<10) | (d[i+1]>>3<<5) | (d[i+2]>>3);     /* 32段に丸めて数える */
      seen.add(k);
      if(d[i]+d[i+1]+d[i+2] > 90) ink++;
      if(k === prev) run++;
      else { if(prev >= 0){ runSum += run; runN++; } run = 1; prev = k; }
    }
    runSum += run; runN++;
  }
  return { colors:seen.size, run:+(runSum/runN).toFixed(2), ink:Math.round(ink/(600*400)*100) };
});

console.log('── ① ビットへ送ると【刷る】が点く（押しても何も起きない状態を作らない）');
const before = await measure();
await press('b_form', 3);                       /* 素材 → 錐 → 玉 → ビット */
await wait(1000);
const st = await P_();
check(st.form === 'ビット', '粒がビットになった', st.form);
check(st.print === 1, '⭐「刷る」が自動で点いた', String(st.print));
const bit = await measure();
console.log('     ', JSON.stringify(before), '→', JSON.stringify(bit));

console.log('\n── ② ビット感＝色数が少ない（段に落ちている）');
/* 比べる相手＝同じ「刷る」で粒が素材のとき */
await press('b_form', 1);                        /* ビット → 素材 */
await wait(900);
const soza = await measure();
await press('b_form', 3);                        /* 素材 → ビット へ戻す */
await wait(900);
const bit2 = await measure();
check(bit2.colors < soza.colors * 0.75,
  '⭐ビットの方が色数が少ない（連続したグラデになっていない）', `ビット ${bit2.colors} < 素材 ${soza.colors}`);

console.log('\n── ③ 粗さ＝1粒の大きさ（大きく入れられる）');
/* ⚠️ 押す回数で狙わない（一周して戻る）。⭐その名前に着くまで押す＝本体の道を通ったまま狙える */
const setGrid = async name => {
  for(let i = 0; i < 8; i++){
    if((await P_()).grid === name) return true;
    await press('b_grid', 1); await wait(280);
  }
  return false;
};
check(await setGrid('細'), '粗さ「細」に着く');
await wait(700);
const fine = await measure();
check(await setGrid('特大'), '粗さ「特大」に着く');
await wait(700);
const big = await measure();
check(big.run > fine.run * 1.4, '⭐粗くすると1粒が大きくなる（細 → 特大）',
  `続く長さ ${fine.run} → ${big.run}`);

console.log('\n── ④ 体の動きで崩す');
const m = await p.evaluate(() => MEN.mot());
check(m > 0.05, '⭐動いた場所が立っている（前のコマとの差を読めている）', m.toFixed(3));
const on1 = await measure();
await press('b_mot'); await wait(900);
const off1 = await measure();
const offP = await P_();
check(offP.mot === 0, '「動きで崩す」を消せる');
check(Math.abs(on1.ink - off1.ink) > 1 || Math.abs(on1.run - off1.run) > 0.15,
  '⭐消すと絵が変わる（＝点いている間は本当に効いている）',
  `インク ${on1.ink}→${off1.ink} / 続く長さ ${on1.run}→${off1.run}`);

check(errs.length === 0, 'JSエラーが1つも出ていない', errs.slice(0,2).join(' / '));
console.log(ng.length ? `\n🔴 だめ ${ng.length}件: ${ng.join(' / ')}` : '\n✅ ビットは全部通った');
await b.close();
process.exit(ng.length ? 1 : 0);
