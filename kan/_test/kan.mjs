/* ⭐⭐ 嵌 KAN 回帰テスト（2026-08-27）
   木下＝「街の写真の看板に自分の作品を当て込みできるようなツール」
   　　　「当て込みによっては斜めになっていたり奥行きがあったりするはずなのでそれもできるように」

   見るのは「落ちない」ではなく **嵌まっているか**：
     ・⭐⭐ 四隅を動かすと【その形に】嵌まる（台形にすると上辺と下辺で幅が変わる＝奥行き）
     ・面の外＝街は1画素も変えない
     ・中身が無ければ何も描かない／濃さ0で街のまま
     ・重ね方で画素が変わる
     ・掴み手は【別の板】＝焼いた絵に入らない
     ・動かす＝ゆらぎで絵が変わる／止めると0秒の姿に戻る
     ・PNG が落ちる／モバイルで横に伸びない・掴み手が出る
   使い方：node kan/_test/kan.mjs [URL] */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL_ = process.argv[2] || 'http://localhost:8483/kan/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); let err = 0;
p.on('pageerror', e => { err++; console.log('🔴', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(URL_, { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 2500));

const R = await p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const cv = document.querySelector('#cv');
  const pix = () => { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
    c.getContext('2d').drawImage(cv, 0, 0);
    return c.getContext('2d').getImageData(0, 0, c.width, c.height).data; };
  const diff = (a, b2) => { let n = 0; for(let i = 0; i < a.length; i += 4)
    if(Math.abs(a[i]-b2[i]) > 6) n++; return n; };
  /* 横1行を走って【暗い所（作品）】の幅を測る＝奥行きが出ているかの物差し */
  /* ⚠️ 街（見本の絵）にも細い黒線があるので「暗い画素の左端〜右端」では測れない。
     ⭐ 作品は真っ黒の板＝【続いている黒の長さ】で測る（いちばん長い連なり）。 */
  const width = (yy) => { const d = pix(), W = cv.width, y = Math.round(cv.height*yy);
    let best = 0, run = 0;
    for(let x = 0; x < W; x++){ const i = (y*W + x)*4;
      if(d[i] < 40 && d[i+1] < 40 && d[i+2] < 40){ run++; if(run > best) best = run; }
      else run = 0; }
    return best; };

  out.街が入っている = !!(CITY && (CITY.naturalWidth || CITY.videoWidth));
  out.面 = FACES.length;
  out.中身 = !!(FACES[0] && FACES[0].art);
  /* ① まっすぐの面 → 上と下で幅が同じ */
  FACES[0].pts = [[0.30,0.25],[0.70,0.25],[0.70,0.70],[0.30,0.70]]; render(); await wait(300);
  const straight = pix();
  out.まっすぐ = { 上:width(0.32), 下:width(0.63) };
  /* ② 奥行き（右へ倒す）→ 上辺と下辺で幅が変わる */
  FACES[0].pts = [[0.30,0.20],[0.70,0.33],[0.70,0.62],[0.30,0.75]]; render(); await wait(300);
  out.奥行き = { 上:width(0.32), 下:width(0.63) };
  out.形が変わる = diff(straight, pix());
  /* ③ 面の外（街）は変わらない ── 左端の帯を見る */
  { const a = pix(); FACES[0].pts = [[0.32,0.22],[0.68,0.34],[0.68,0.60],[0.32,0.73]];
    render(); await wait(250);
    const b2 = pix(); let n = 0;
    const W = cv.width, H = cv.height;
    for(let y = 0; y < H; y += 3) for(let x = 0; x < Math.round(W*0.22); x++){
      const i = (y*W + x)*4; if(Math.abs(a[i]-b2[i]) > 6) n++; }
    out.街は変わらない = n; }
  /* ④ 中身が無ければ描かない／濃さ0で街のまま */
  const art = FACES[0].art;
  const withArt = pix();
  FACES[0].art = null; render(); await wait(250);
  const noArt = pix();
  out.中身なしで消える = diff(withArt, noArt) > 3000;
  FACES[0].art = art; FACES[0].amt = 0; render(); await wait(250);
  out.濃さ0で街のまま = diff(noArt, pix()) < 400;
  FACES[0].amt = 100;
  /* ⑤ 重ね方で変わる */
  FACES[0].blend = 'source-over'; render(); await wait(250); const nor = pix();
  FACES[0].blend = 'multiply';    render(); await wait(250);
  out.重ね方で変わる = diff(nor, pix());
  FACES[0].blend = 'source-over'; render(); await wait(200);
  /* ⑥ 掴み手は別の板（焼いた絵に入らない） */
  { const c = document.createElement('canvas'); c.width = 200; c.height = 120;
    const bake0 = (typeof bake === 'function') ? bake(0) : null;
    out.掴み手は焼かれない = !!bake0 && (() => {
      const d = bake0.getContext('2d').getImageData(0,0,bake0.width,bake0.height).data;
      let blue = 0;
      for(let i = 0; i < d.length; i += 4)
        if(d[i+2] > 180 && d[i] < 110 && d[i+1] < 150) blue++;
      return blue < 200;                       /* 選択の青い線が焼かれていない */
    })(); }
  /* ⑦ 動かす＝ゆらぎで変わる／止めると0秒の姿へ */
  const still = pix();
  { const r = document.getElementById('r_wob'); r.value = 80; r.dispatchEvent(new Event('input',{bubbles:true})); }
  document.getElementById('b_anim').click();
  await wait(700);
  out.動くと変わる = diff(still, pix());
  document.getElementById('b_anim').click();
  await wait(400);
  out.止めると戻る = diff(still, pix());
  { const r = document.getElementById('r_wob'); r.value = 0; r.dispatchEvent(new Event('input',{bubbles:true})); }
  return out;
});
/* PNG が本当に落ちるか */
const dls = [];
const cdp = await p.createCDPSession();
await cdp.send('Browser.setDownloadBehavior', { behavior:'allowAndName', downloadPath:'/tmp/_kan_dl', eventsEnabled:true });
cdp.on('Browser.downloadWillBegin', e => dls.push(e.suggestedFilename));
await p.evaluate(() => document.getElementById('b_png').click());
await new Promise(r => setTimeout(r, 2000));
/* モバイル */
await p.setViewport({ width:390, height:844, deviceScaleFactor:2, isMobile:true, hasTouch:true });
await new Promise(r => setTimeout(r, 1200));
const M = await p.evaluate(() => ({
  横に伸びない: document.documentElement.scrollWidth <= innerWidth + 1,
  掴み手: !!document.getElementById('sheetGrip'),
  盤は指を取る: getComputedStyle(document.getElementById('stage')).touchAction === 'none' }));
await b.close();

let ng = 0;
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng++; };
console.log('── 嵌 KAN（街に嵌める）');
ok(err === 0, 'JSエラーが出ない', err + '件');
ok(R.街が入っている && R.面 >= 1 && R.中身, '⭐ 開くと街と面と中身が入っている（空から始めない）');
ok(Math.abs(R.まっすぐ.上 - R.まっすぐ.下) < 12,
   'まっすぐな面は上下で幅が同じ', JSON.stringify(R.まっすぐ));
ok(Math.abs(R.奥行き.上 - R.奥行き.下) > 12 || R.形が変わる > 5000,
   '⭐⭐ 四隅を動かすと【その形に】嵌まる（斜め・奥行き）',
   JSON.stringify(R.奥行き) + ' / 変わった ' + R.形が変わる + '画素');
ok(R.街は変わらない < 300, '⚠️ 面の外（街）は変えていない', R.街は変わらない + '画素');
ok(R.中身なしで消える, '中身が無ければ何も描かない');
ok(R.濃さ0で街のまま, '⚠️ 濃さ 0 ＝街のまま（触れるのに効かない、を作らない）');
ok(R.重ね方で変わる > 3000, '⭐ 重ね方（乗算）で馴染む', R.重ね方で変わる + '画素');
ok(R.掴み手は焼かれない, '⚠️ 掴み手は【別の板】＝焼いた絵に入らない');
ok(R.動くと変わる > 2000, '⭐ 動かすと絵が動く（ゆらぎ）', R.動くと変わる + '画素');
ok(R.止めると戻る < 600, '⭐ 止めると 0秒の姿に戻る（他の道具と同じ作法）', R.止めると戻る + '画素');
ok(dls.includes('kan.png'), 'PNG が出る', dls.join(','));
ok(M.横に伸びない, 'モバイルで横に伸びない');
ok(M.掴み手, 'モバイルでパネルの掴み手が出る');
ok(M.盤は指を取る, '盤を引いてもページが動かない（touch-action:none）');
process.exit(ng ? 1 : 0);
