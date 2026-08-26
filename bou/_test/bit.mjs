/* ⭐⭐ 貌 BOU 回帰テスト（2026-08-27）
   木下＝「写真から BIT に変化できる道具を作りたい」

   見るのは「落ちない」ではなく **ビットになっているか**：
     ・⭐⭐ 色数を下げると【実際に使われている色の数】が減る（ビット感の正体）
     ・升目を粗くするとマスが減る／しきいで黒の割合が動く
     ・散らす＝2色のまま【切り替わりが増える】（網＝ディザ）
     ・地を透かす＝いちばん明るい段が【穴になる】（地なしPNG＝他の道具へ渡せる）
     ・段の表＝1枚ずつ違う絵になる・版面が【列×段】になる（潰れない）
     ・PNG／SVG が出る
     ・モバイルで横に伸びない・掴み手が出る
   ⚠️ 見本の写真は同じ repo の中のもの（外に取りに行かない）。
   使い方：node bou/_test/bit.mjs [http://localhost:PORT/bou/ か ファイル] */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL_ = process.argv[2] || 'http://localhost:8477/bou/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage(); let err = 0;
p.on('pageerror', e => { err++; console.log('🔴', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(URL_, { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 2500));

const R = await p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const cv = document.querySelector('#cv');
  const set = async (id, v) => { const r = document.getElementById(id);
    r.value = v; r.dispatchEvent(new Event('input', { bubbles:true })); await wait(400); };
  const pix = () => { const c = document.createElement('canvas');
    c.width = cv.width; c.height = cv.height;
    c.getContext('2d').drawImage(cv, 0, 0);
    return c.getContext('2d').getImageData(0, 0, c.width, c.height).data; };
  /* 使われている色の数＝ビット感の物差し（⚠️ 縁のなじみを拾わないよう少し丸める） */
  const colors = () => { const d = pix(), set2 = new Set();
    for(let i = 0; i < d.length; i += 4){ if(d[i+3] < 128) continue;
      set2.add((d[i] >> 3) + ',' + (d[i+1] >> 3) + ',' + (d[i+2] >> 3)); }
    return set2.size; };
  const dark = () => { const d = pix(); let n = 0, t = 0;
    for(let i = 0; i < d.length; i += 4){ if(d[i+3] < 128) continue; t++; if(d[i] < 110) n++; }
    return Math.round(n / Math.max(1, t) * 1000) / 10; };
  const clear = () => { const d = pix(); let n = 0;
    for(let i = 3; i < d.length; i += 4) if(d[i] < 8) n++; return n; };
  /* 横に走って色が切り替わった回数＝網（ディザ）が効くと増える */
  const flips = () => { const d = pix(), W = cv.width; let n = 0;
    for(let y = (cv.height/2)|0, x = 1; x < W; x++){
      const i = (y*W + x)*4, j = (y*W + x - 1)*4;
      if(Math.abs(d[i] - d[j]) > 24) n++; }
    return n; };

  out.見本が入る = !!document.getElementById('meter').textContent.match(/升/);
  await set('r_grid', 64); await set('r_lev', 8); await set('r_dit', 0);
  out.色数8 = colors();
  await set('r_lev', 2);
  out.色数2 = colors();
  out.升目多 = document.getElementById('meter').textContent;
  /* 升目＝粗くするとマスが減る */
  await set('r_grid', 16);
  out.マス16 = +(document.getElementById('meter').textContent.match(/マス ([\d,]+)/)||[0,'0'])[1].replace(/,/g,'');
  await set('r_grid', 64);
  out.マス64 = +(document.getElementById('meter').textContent.match(/マス ([\d,]+)/)||[0,'0'])[1].replace(/,/g,'');
  /* しきい＝黒の割合が動く */
  await set('r_th', 0);   const d0 = dark();
  await set('r_th', 60);  const d1 = dark();
  await set('r_th', -60); const d2 = dark();
  out.しきい = { 中:d0, 明:d1, 暗:d2 };
  await set('r_th', 0);
  /* 散らす＝2色のまま切り替わりが増える */
  await set('r_lev', 2); await set('r_dit', 0);
  const f0 = flips(), c0 = colors();
  await set('r_dit', 100);
  out.散らす = { 前:f0, 後:flips(), 色数:colors(), 色数前:c0 };
  await set('r_dit', 0);
  /* 地を透かす＝穴があく */
  out.透かす前 = clear();
  document.getElementById('k_alpha').click(); await wait(500);
  out.透かす後 = clear();
  document.getElementById('k_alpha').click(); await wait(400);
  /* 段の表 */
  await set('r_cols', 3); await set('r_rows', 2);
  document.getElementById('b_sheet').click(); await wait(900);
  out.表の版面 = document.getElementById('meter').textContent.match(/版面 (\d+) × (\d+)/).slice(1).map(Number);
  { const d = pix(), W = cv.width, H = cv.height;
    const at = (x, y) => { const i = ((y|0)*W + (x|0))*4; return d[i]; };
    let diff = 0;
    for(let k = 0; k < 400; k++){
      const x = 20 + (k*7) % ((W/3|0) - 40), y = 20 + (k*13) % ((H/2|0) - 40);
      if(Math.abs(at(x, y) - at(x + (W/3|0), y)) > 24) diff++;
    }
    out.表は1枚ずつ違う = diff; }
  document.getElementById('b_one').click(); await wait(600);
  out.一枚に戻る = !/段の表/.test(document.getElementById('meter').textContent);
  return out;
});
/* 出す（PNG／SVG）＝落ちるものが本当に出るか */
const dls = [];
const cdp = await p.createCDPSession();
await cdp.send('Browser.setDownloadBehavior', { behavior:'allowAndName',
  downloadPath:'/tmp/_bou_dl', eventsEnabled:true });
cdp.on('Browser.downloadWillBegin', e => dls.push(e.suggestedFilename));
await p.evaluate(() => document.getElementById('b_png').click());
await new Promise(r => setTimeout(r, 1500));
await p.evaluate(() => document.getElementById('b_svg').click());
await new Promise(r => setTimeout(r, 1500));
const svgN = await p.evaluate(() => (document.getElementById('stat').textContent.match(/図形 ([\d,]+)/)||[0,'0'])[1]);
/* モバイル */
await p.setViewport({ width:390, height:844, deviceScaleFactor:2, isMobile:true, hasTouch:true });
await new Promise(r => setTimeout(r, 1200));
const M = await p.evaluate(() => ({
  横に伸びない: document.documentElement.scrollWidth <= innerWidth + 1,
  掴み手: !!document.getElementById('sheetGrip'),
  盤は指を取る: getComputedStyle(document.getElementById('stage')).touchAction === 'none',
  幅: document.documentElement.scrollWidth + '/' + innerWidth }));
await b.close();

let ng = 0;
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng++; };
console.log('── 貌 BOU（写真をビットに落とす）');
ok(err === 0, 'JSエラーが出ない', err + '件');
ok(R.見本が入る, '⭐ 開くと見本が入っている（空の画面から始めない）');
ok(R.色数8 > R.色数2 * 2, '⭐⭐ 色数を下げると【使われている色】が実際に減る',
   `8段 ${R.色数8}色 → 2段 ${R.色数2}色`);
ok(R.色数2 <= 3, '⭐ 2色にしたら本当に2色（＋縁）', R.色数2 + '色');
ok(R.マス64 > R.マス16 * 4, '升目を細かくするとマスが増える', `16升 ${R.マス16} → 64升 ${R.マス64}`);
ok(R.しきい.明 < R.しきい.中 && R.しきい.中 < R.しきい.暗,
   '⭐ しきいで黒の割合が動く（潰れたら戻せる）', JSON.stringify(R.しきい));
ok(R.散らす.後 > R.散らす.前 * 1.5 && R.散らす.色数 <= 3,
   '⭐ 散らす＝2色のまま網になる（切り替わりが増える）', JSON.stringify(R.散らす));
ok(R.透かす後 > R.透かす前 + 1000, '⭐ 地を透かすと穴があく（地なしPNG）',
   `${R.透かす前} → ${R.透かす後} 画素`);
ok(R.表の版面[0] / R.表の版面[1] > 1, '⭐ 段の表は【列×段】の版面になる（写真が潰れない）',
   R.表の版面.join(' × '));
ok(R.表は1枚ずつ違う > 40, '⭐⭐ 段の表は1枚ずつ違う絵になる', R.表は1枚ずつ違う + '点で違う');
ok(R.一枚に戻る, '1枚に戻せる');
ok(dls.includes('bou.png'), 'PNG が出る', dls.join(','));
ok(dls.includes('bou.svg'), 'SVG が出る（図形 ' + svgN + ' 個）', dls.join(','));
ok(M.横に伸びない, 'モバイルで横に伸びない', M.幅);
ok(M.掴み手, 'モバイルでパネルの掴み手が出る');
ok(M.盤は指を取る, '盤を引いてもページが動かない（touch-action:none）');
process.exit(ng ? 1 : 0);
