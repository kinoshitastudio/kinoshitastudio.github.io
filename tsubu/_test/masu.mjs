/* ⭐ マス目（枡の塗り・枠）が【版ごと】に効くかの回帰テスト（2026-08-18 新設）
   木下＝「ます目とかは全部のレイヤーにかかっちゃってるね。選択しているレイヤーで調整できるように」

   🔴 見るのは：
     ① 版1の塗りの色を変えても【版2は変わらない】
     ② 版を選び直すと、つまみ・色がその版の値に戻る（表示だけ古い、を作らない）
     ③ 質感3つ（グラデ塊・連続・ドット）すべてで版ごとに効く
   ⚠️ 測るのは画面の実物の画素。上半分＝版2／下半分＝版1 に離して置いて色を比べる。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL0 = process.argv[2] || 'http://localhost:8450/tsubu/_tk/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1200, height:900, deviceScaleFactor:1 });
await p.goto(URL0 + '?v=' + Date.now(), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 2200));
const wait = ms => new Promise(r => setTimeout(r, ms));
const ng = [];
const check = (ok, name, note) => { console.log(`  ${ok ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!ok) ng.push(name); };

const slide = (id, v) => p.evaluate(o => { const r = document.getElementById(o.id);
  r.value = o.v; r.dispatchEvent(new Event('input', { bubbles:true })); }, { id, v });
const color = (id, v) => p.evaluate(o => { const e = document.getElementById(o.id);
  e.value = o.v; e.dispatchEvent(new Event('input', { bubbles:true }));
  e.dispatchEvent(new Event('change', { bubbles:true })); }, { id, v });
const chip = i => p.evaluate(x => document.getElementById('layerChips').children[x].click(), i);
/* ⭐ 画面ぜんぶの【青み】＝(青 − 赤) の平均。
   ⚠️ 版ごとの帯を切って測るのは諦めた（版が重なると帯が取れず、2026-08-18 に3回誤検出）。
   ⭐ 代わりに【直す前との差】で見る：
      直す前＝マス目の色は盤ぜんぶ＝あとから青にすると【版1まで青くなる】＝画面が青い。
      直したあと＝版1は赤のまま＝画面は赤い。この差は大きいので取り違えようがない。 */
const blueness = () => p.evaluate(() => {
  const cx = cv.getContext('2d'), W = cv.width, H = cv.height;
  const d = cx.getImageData(0, 0, W, H).data;
  let s = 0, n = 0;
  for(let y = 0; y < H; y += 2) for(let x = 0; x < W; x += 2){
    const i = (y*W + x)*4;
    if(d[i] + d[i+1] + d[i+2] < 40) continue;      // 地（黒）は飛ばす
    s += d[i+2] - d[i]; n++;
  }
  return n ? +(s/n).toFixed(1) : null;
});
/* ⭐ 本体の関数で測る（画素だけに頼らない）＝版ごとにランプが分かれているか */
const banks = () => p.evaluate(() => {
  const b0 = bankFor(P.layers[0]), b1 = bankFor(P.layers[1]);
  const c = (bk) => bk.masuLut ? [...bk.masuLut.slice(600, 603)] : null;
  return { same: b0 === b1, keyEq: texKey(P.layers[0]) === texKey(P.layers[1]),
           lut0: c(b0), lut1: c(b1) };
});

/* ── 下ごしらえ：マス目を出して、版を2枚（上と下）に離す ── */
await p.evaluate(() => {
  const set = (id, v) => { const r = document.getElementById(id); if(!r) return;
    r.value = v; r.dispatchEvent(new Event('input', { bubbles:true })); };
  set('masu', 3);
  document.querySelector('#masufill button[data-v="1"]').click();
  set('masuN', 1);
});
await color('masuC1', '#ff0000');
await wait(1200);
await p.evaluate(() => document.getElementById('addLayer').click());
await wait(700);
await slide('ly', -90);                       // 足した版（cur=1）を上へ
await color('masuC1', '#0000ff');             // 上の版だけ青に
await wait(1400);

console.log('── 版ごとに分かれているか（本体の関数で測る）');
const bk = await banks();
check(!bk.same && !bk.keyEq, '版ごとに別のバンクになっている', JSON.stringify({same:bk.same, keyEq:bk.keyEq}));
check(!!bk.lut0 && !!bk.lut1 && bk.lut0[0] > 200 && bk.lut0[2] < 60, '版1のランプは赤', JSON.stringify(bk.lut0));
check(!!bk.lut1 && bk.lut1[2] > 200 && bk.lut1[0] < 60, '版2のランプは青', JSON.stringify(bk.lut1));

/* ⭐ 境目は【実測で決めた】（2026-08-18）。同じ操作を直す前／直したあとで流した実値：
     グラデ塊  直す前 -67.8 ／ 直したあと -135.1
     連続      直す前 -68.1 ／ 直したあと -136.7
     ドット    直す前 +106  ／ 直したあと +7
   ⚠️ ドットは1粒がベタ塗りで彩度が高いぶん、他の2つと桁が違う＝質感ごとに境目を持つ。 */
const LIMIT = { 'グラデ塊': -100, '連続': -100, 'ドット': 50 };
for(const [texName, texV] of [['グラデ塊', 1], ['連続', 2], ['ドット', 0]]){
  console.log(`\n── 質感＝${texName}`);
  await p.evaluate(v => document.querySelector(`#tex button[data-v="${v}"]`).click(), texV);
  await wait(1800);
  const bl = await blueness();
  /* 🔴 直す前は版2の青が版1にも効いていた＝ここが青（＋）側に寄っていた */
  check(bl != null && bl < LIMIT[texName], '⭐版1の赤が残っている（版2の青に飲まれていない）',
        `青み ${bl}（境目 ${LIMIT[texName]}）`);
}

console.log('\n── 版を選び直すと、つまみもその版の値に戻る');
await p.evaluate(() => document.querySelector('#tex button[data-v="1"]').click());
await wait(1200);
await chip(0); await wait(900);
const c0 = await p.evaluate(() => document.getElementById('masuC1').value);
await chip(1); await wait(900);
const c1 = await p.evaluate(() => document.getElementById('masuC1').value);
check(c0.toLowerCase() === '#ff0000', '版1を選ぶと赤が出る', c0);
check(c1.toLowerCase() === '#0000ff', '版2を選ぶと青が出る', c1);

console.log('\n── 片方だけ変えても、もう片方は動かない');
const bk0 = await banks();
await chip(1); await wait(600);
await slide('masuAng', 10); await wait(1500);
const bk1 = await banks();
check(JSON.stringify(bk0.lut0) === JSON.stringify(bk1.lut0), '触っていない版（版1）のランプは変わらない',
      `${JSON.stringify(bk0.lut0)} → ${JSON.stringify(bk1.lut0)}`);
check(JSON.stringify(bk1.lut1) === JSON.stringify(bk0.lut1), '版2のランプも色は保たれる（向きを変えただけ）',
      JSON.stringify(bk1.lut1));

console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ マス目の版ごとは全部通った');
if(errs.length) console.log(`🔴 JSエラー ${errs.length}件: ${errs.slice(0,3).join(' / ')}`);
await b.close();
process.exit(ng.length || errs.length ? 1 : 0);
