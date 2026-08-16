/* ⭐ 襞 HIDA の回帰テスト（2026-08-14・寄る/引く と キーを足したときに新設）
   🔴 見るのは「エラーが出ないか」ではなく数字：
     ① 寄ると絵が変わる・引くと【等倍と完全に同じ】に戻る（＝見るためのものが本体を汚していない）
     ② 寄っても線が痩せない（焼き直しているか＝寄った絵の輪郭の鋭さを測る）
     ③ ⌥＋ドラッグは【画面が動くだけ】で芯は動かない／ふつうのドラッグは芯が動く
     ④ キー（space / 0 / + − / ⌘Z / ⇧⌘Z / R）が効く
     ⑤ 書き出し（PNG）に【ズームが掛かっていない】（見るためのものは出す絵に入れない） */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL = process.argv[2] || 'http://localhost:8340/hida/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage();
let errs = 0; p.on('pageerror', e => { errs++; console.log('🔴 JSエラー:', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(URL, { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 1800));
await p.evaluate(() => { try{ localStorage.clear(); }catch(_){} });
await p.reload({ waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 1800));

let ng = [];
const check = (ok, name, note) => { console.log(`  ${ok ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!ok) ng.push(name); };
const sig = () => p.evaluate(() => { const c = document.getElementById('cv'), g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height).data; let h = 2166136261;
  for(let i = 0; i < d.length; i += 4*7){ h ^= d[i] + d[i+1]*3 + d[i+2]*7; h = Math.imul(h, 16777619); }
  return h >>> 0; });
/* ⭐ 輪郭の鋭さ ── 隣り合う画素の差が大きい所の数。ぼけると【減る】。
   ボケた拡大か焼き直しかは、これで分かれる。 */
const sharp = () => p.evaluate(() => { const c = document.getElementById('cv'), g = c.getContext('2d');
  const W = c.width, H = c.height, d = g.getImageData(0, 0, W, H).data;
  let n = 0;
  for(let y = 1; y < H-1; y += 2) for(let x = 1; x < W-1; x += 2){
    const k = (y*W+x)*4;
    if(Math.abs(d[k] - d[k+4]) > 140) n++;
  }
  return n; });
const wait = ms => new Promise(r => setTimeout(r, ms));
/* ⚠️ 本体と同じ入口（zoomStep）で寄る。倍率だけ直に入れて位置を 0 のままにすると
      【左上の角】を見てしまい、絵が無い所を測って落ちる（最初にこれで誤検出）。 */
const setZoom = z => p.evaluate(v => { viewFit(); if(v !== 1) zoomStep(v); }, z);

console.log('── ① 寄る・引く');
await setZoom(1); await wait(500);
const s1 = await sig(), sh1 = await sharp();
await setZoom(3); await wait(900);
const s3 = await sig(), sh3 = await sharp();
check(s1 !== s3, '寄ると絵が変わる', `${s1} → ${s3}`);
await p.evaluate(() => viewFit()); await wait(700);
check(await sig() === s1, '引くと等倍と完全に同じに戻る（本体を汚していない）');

console.log('\n── ② 盤は【窓】か／寄っても線が痩せないか');
/* ⚠️ ただ引き伸ばしただけなら、輪郭の画素は【増えない】（縁がぼけて薄く広がる）。
      カメラで寄っていれば、絵はベクターのまま焼かれるので輪郭は保たれる。 */
check(sh3 > sh1 * 0.5, '寄った絵の輪郭が保たれている（カメラで寄っている）', `等倍 ${sh1} → 3倍 ${sh3}`);
/* ⭐⭐ 盤は版面ではなく窓 ── canvas が盤いっぱいで、版面はガイドとして描くだけ */
const board = await p.evaluate(() => { const st=document.getElementById('stage');
  return { sw:st.clientWidth, sh:st.clientHeight, cw:cv.clientWidth, ch:cv.clientHeight }; });
check(board.sw === board.cw && board.sh === board.ch, 'canvas が盤いっぱい（版面に切り取られていない）',
      `盤 ${board.sw}×${board.sh} / canvas ${board.cw}×${board.ch}`);
const zoomOut = await p.evaluate(() => { viewFit(); zoomStep(1/6); return VIEW.zoom; });
check(zoomOut < 1, '1倍より引ける（版面の外まで見える）', `${zoomOut.toFixed(2)} 倍`);
await p.evaluate(() => viewFit()); await wait(400);
/* 版面のわくは【画面だけ】＝入切で画面が変わる */
const gOn = await p.evaluate(() => { P.guide=1; kick(); return 1; });
await wait(400); const gp1 = await sig();
await p.evaluate(() => { P.guide=0; kick(); }); await wait(400); const gp2 = await sig();
check(gp1 !== gp2, '版面のわくを消すと画面が変わる（画面だけの飾り）');
await p.evaluate(() => { P.guide=1; kick(); }); await wait(300);

console.log('\n── ③ ドラッグの行き先');
await p.evaluate(() => { viewFit(); });
await wait(500);
const core0 = await p.evaluate(() => ({ x:+SRC[sel].x.toFixed(4), y:+SRC[sel].y.toFixed(4) }));
/* ふつうのドラッグ＝芯が動く */
const box = await p.evaluate(() => { const r = document.getElementById('cv').getBoundingClientRect();
  return { x:r.x + r.width/2, y:r.y + r.height/2 }; });
await p.mouse.move(box.x, box.y);
await p.mouse.down(); await p.mouse.move(box.x + 60, box.y + 40, { steps:6 }); await p.mouse.up();
await wait(400);
const core1 = await p.evaluate(() => ({ x:+SRC[sel].x.toFixed(4), y:+SRC[sel].y.toFixed(4) }));
check(core0.x !== core1.x || core0.y !== core1.y, 'ふつうのドラッグで芯が動く', `${JSON.stringify(core0)} → ${JSON.stringify(core1)}`);
/* ⌥＋ドラッグ＝画面だけ動く */
const v0 = await p.evaluate(() => ({ ...VIEW }));
await p.keyboard.down('Alt');
await p.mouse.move(box.x, box.y);
await p.mouse.down(); await p.mouse.move(box.x - 50, box.y - 30, { steps:6 }); await p.mouse.up();
await p.keyboard.up('Alt');
await wait(400);
const v1 = await p.evaluate(() => ({ ...VIEW }));
const core2 = await p.evaluate(() => ({ x:+SRC[sel].x.toFixed(4), y:+SRC[sel].y.toFixed(4) }));
check(v0.x !== v1.x || v0.y !== v1.y, '⌥＋ドラッグで画面が動く', `${JSON.stringify(v0)} → ${JSON.stringify(v1)}`);
check(core1.x === core2.x && core1.y === core2.y, '⌥＋ドラッグでは芯が動かない');

console.log('\n── ④ キー');
await p.evaluate(() => { viewFit(); }); await wait(400);
await p.keyboard.press('Space'); await wait(500);
check(await p.evaluate(() => P.anim === true), 'space で再生が始まる');
await p.keyboard.press('Space'); await wait(500);
check(await p.evaluate(() => P.anim === false), 'space で止まる');
await p.keyboard.press('+'); await wait(400);
const z1 = await p.evaluate(() => VIEW.zoom);
check(z1 > 1, '+ で寄る', String(+z1.toFixed(2)));
await p.keyboard.press('0'); await wait(400);
check(await p.evaluate(() => VIEW.zoom) === 1, '0 で正面に戻る');
/* ⌘Z と ⇧⌘Z */
const before = await p.evaluate(() => ({ n:SRC.length, s:JSON.stringify(SRC[sel]) }));
await p.evaluate(() => el('b_rand').click()); await wait(700);
const after = await p.evaluate(() => ({ n:SRC.length, s:JSON.stringify(SRC[sel]) }));
check(before.s !== after.s, 'ふる（R も同じ入口）で絵が変わる');
await p.keyboard.down('Meta'); await p.keyboard.press('z'); await p.keyboard.up('Meta'); await wait(700);
const undone = await p.evaluate(() => JSON.stringify(SRC[sel]));
check(undone === before.s, '⌘Z で戻る');
await p.keyboard.down('Meta'); await p.keyboard.down('Shift');
await p.keyboard.press('z');
await p.keyboard.up('Shift'); await p.keyboard.up('Meta'); await wait(700);
check(await p.evaluate(() => JSON.stringify(SRC[sel])) === after.s, '⇧⌘Z でやり直す');

/* ⭐ 寄っているときの手の速さ ── 版面での動きは【1/倍率】になるはず */
console.log('\n── ④b 寄っているときに芯を引っぱる速さ');
const drag = async (z) => {
  await p.evaluate(v => { viewFit(); if(v !== 1) zoomStep(v); }, z);
  await wait(500);
  const a0 = await p.evaluate(() => ({ x:SRC[sel].x, y:SRC[sel].y }));
  await p.mouse.move(box.x, box.y);
  await p.mouse.down(); await p.mouse.move(box.x + 90, box.y, { steps:6 }); await p.mouse.up();
  await wait(400);
  const a1 = await p.evaluate(() => ({ x:SRC[sel].x, y:SRC[sel].y }));
  return Math.abs(a1.x - a0.x);
};
const d1 = await drag(1), d3 = await drag(3);
check(d1 > 0.01 && Math.abs(d3 - d1/3) < d1*0.15, '3倍で寄ると、芯の動きも1/3になる',
      `等倍 ${d1.toFixed(4)} / 3倍 ${d3.toFixed(4)}（見込み ${(d1/3).toFixed(4)}）`);
await p.evaluate(() => viewFit()); await wait(400);

console.log('\n── ⑤ 出す絵にズームが入っていないか');
await p.evaluate(() => { VIEW.zoom = 4; VIEW.x = 120; VIEW.y = 90; kick(); }); await wait(700);
const outSame = await p.evaluate(() => {
  const h = a => { let x = 2166136261; for(let i = 0; i < a.length; i += 4*7){ x ^= a[i]+a[i+1]*3+a[i+2]*7; x = Math.imul(x, 16777619); } return x>>>0; };
  const bake = () => { const c = document.createElement('canvas'); c.width = 600; c.height = 750;
    paint(c.getContext('2d'), 600, 750, 0, true);
    return h(c.getContext('2d').getImageData(0,0,600,750).data); };
  const zoomed = bake();
  const keep = { ...VIEW };
  VIEW.zoom = 1; VIEW.x = 0; VIEW.y = 0;
  const plain = bake();
  Object.assign(VIEW, keep);
  return zoomed === plain;
});
check(outSame, '寄っていても、出る絵は寄っていないものと完全に同じ');
await p.evaluate(() => viewFit());

/* ⭐ ⑥ 見本 ── 2026-08-17（4本→11本にしたときに新設）
   🔴 見るのは「PRESETS に書いてあるか」ではなく【押して絵が出るか】。
      ボタンの data-v と関数名がずれると、書けているのに出ない（入口が死ぬ）。
   ⭐ 測るのは【出す絵】（書き出しと同じ道）＝画面のカメラに左右されない。 */
console.log('\n── ⑥ 見本は全部【押して】出るか');
const preList = await p.evaluate(() => [...document.getElementById('pre').children].map(x => ({v:x.dataset.v, t:x.textContent})));
const preSig = () => p.evaluate(() => {
  const [ow,oh] = outSize();
  const o = document.createElement('canvas'); o.width = ow; o.height = oh;
  paint(o.getContext('2d'), ow, oh, 0, true);
  const d = o.getContext('2d').getImageData(0,0,ow,oh).data;
  let x = 2166136261, ink = 0, n = 0;
  for(let i = 0; i < d.length; i += 4*7){ x ^= d[i]+d[i+1]*3+d[i+2]*7; x = Math.imul(x, 16777619); if(d[i] < 128) ink++; n++; }
  return { h:x>>>0, ink:Math.round(ink/n*100) };
});
const preSeen = new Map();
for(const nm of preList){
  await p.click(`#pre button[data-v="${nm.v}"]`); await wait(650);
  const s = await preSig();
  const on  = await p.evaluate(v => document.querySelector(`#pre button[data-v="${v}"]`).classList.contains('on'), nm.v);
  const dup = preSeen.get(s.h);
  /* ⚠️ まっ白・まっ黒は「出た」ではない（絵が無いのに落ちない＝意味のないテストになる） */
  const live = s.ink > 2 && s.ink < 98;
  check(on && live && !dup, `見本「${nm.t}」が押して出る`,
        `墨 ${s.ink}%${dup ? '  🔴 ' + dup + ' と同じ絵' : ''}${on ? '' : '  🔴 選ばれない'}`);
  preSeen.set(s.h, nm.t);
}
/* ⚠️ 見本のボタンは幅が不揃いになりやすい（一字だけ痩せる）＝格子で組んであるかを数で見る */
const preW = await p.evaluate(() => {
  const bs = [...document.getElementById('pre').children].map(x => x.getBoundingClientRect().width);
  return { min:Math.round(Math.min(...bs)), max:Math.round(Math.max(...bs)) };
});
check(preW.min >= 50, '見本のボタンが痩せていない', `${preW.min}〜${preW.max}px`);
await p.evaluate(() => { PRESETS.geijutsu(); syncAll(); kick(); });

console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ 全部通った');
if(errs) console.log(`🔴 JSエラー ${errs}件`);
await b.close();
process.exit(ng.length || errs ? 1 : 0);
