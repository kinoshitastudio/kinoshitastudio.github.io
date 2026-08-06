/* 膜 MAKU 回帰テスト ── 「歪みを版ごとに分けた」改修が、
   ①版ごとに効くか ②他の版を巻き込まないか ③控え・古い控え・全リセットが壊れていないか
   を実際の関数を通して確かめる。⚠️ 落ちないテストは意味がないので、
   最後に「わざと壊した想定」の検算（版1と版2が同じ値なら失敗）も入れてある。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const PORT = process.env.PORT || 8093;
const TARGET = `http://localhost:${PORT}/maku/index.html`;   // ⚠️ URL という名前は使わない（グローバルの URL を潰す）
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
let pass = 0, fail = 0;
const ok = (name, cond, extra='') => { if(cond){ pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${extra}`); } };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  args: ['--enable-unsafe-swiftshader','--use-gl=swiftshader','--no-sandbox','--window-size=1400,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if(m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(()=> typeof SHEETS !== 'undefined' && SHEETS.length > 0, { timeout: 30000 });
await new Promise(r => setTimeout(r, 1200));

console.log('\n[1] 起動');
ok('JSエラーなし', errors.length === 0, errors.join(' | '));
ok('版が1枚ある', await page.evaluate(()=> SHEETS.length) === 1);
ok('1枚目に warp が入っている', await page.evaluate(()=> !!(SHEETS[0] && SHEETS[0].warp)));
ok('1枚目の縦うねりは 30（開幕の絵のまま）', await page.evaluate(()=> SHEETS[0].warp.vwarp) === 30);
ok('開幕の3層が1枚目に入っている（漢字 w=14）', await page.evaluate(()=> SHEETS[0].layers[0].w) === 14);
ok('P に歪みのキーが残っていない', await page.evaluate(()=> WARP_KEYS.filter(k=> P[k] !== undefined).length) === 0);

console.log('\n[2] つまみが【選んでいる版】に書かれる');
const setRange = async (id, v) => page.evaluate((id,v)=>{
  const el = document.getElementById(id); el.value = v;
  el.dispatchEvent(new Event('input', { bubbles:true }));
}, id, v);
await setRange('vwarp', 80);
ok('縦うねり80が版1に入った', await page.evaluate(()=> SHEETS[0].warp.vwarp) === 80);
ok('Pには入っていない', await page.evaluate(()=> P.vwarp === undefined));

console.log('\n[3] 版を足す＝歪みを受け継ぐ／そのあとは別々に動く');
await page.evaluate(()=> document.querySelector('#addSeg button[data-add="text"]').click());
await new Promise(r => setTimeout(r, 300));
ok('版が2枚になった', await page.evaluate(()=> SHEETS.length) === 2);
ok('版2は版1の縦うねり80を受け継いだ', await page.evaluate(()=> SHEETS[1].warp.vwarp) === 80);
ok('版2は版1の3層も受け継いだ', await page.evaluate(()=> SHEETS[1].layers[0].w) === 14);
ok('受け継ぎは【コピー】＝同じ入れ物を共有していない',
   await page.evaluate(()=> SHEETS[0].warp !== SHEETS[1].warp && SHEETS[0].layers !== SHEETS[1].layers));

await setRange('vwarp', -50);                       // いま選んでいるのは版2
ok('版2だけ -50 になった', await page.evaluate(()=> SHEETS[1].warp.vwarp) === -50);
ok('⭐ 版1は 80 のまま（巻き込んでいない）', await page.evaluate(()=> SHEETS[0].warp.vwarp) === 80,
   'ここが今回の目的');
await setRange('wmid', 60);
ok('変形（中幅）も版2だけ', await page.evaluate(()=> SHEETS[1].warp.wmid === 60 && SHEETS[0].warp.wmid === 0));
await setRange('L_w', -70);
ok('3層（太らせ）も版2だけ',
   await page.evaluate(()=> SHEETS[1].layers[P.layer].w === -70 && SHEETS[0].layers[0].w === 14));

console.log('\n[4] 版を押し替えるとつまみが その版の値になる');
await page.evaluate(()=> document.querySelectorAll('#sheets button')[0].click());
await new Promise(r => setTimeout(r, 200));
ok('版1を選ぶと縦うねりのつまみが 80', await page.evaluate(()=> +document.getElementById('vwarp').value) === 80);
ok('右の数字も 80（数字と実体をズラさない）',
   await page.evaluate(()=> document.getElementById('vwarp').parentElement.querySelector('.val').textContent) === '80');
ok('3層のつまみも版1の値（14）', await page.evaluate(()=> +document.getElementById('L_w').value) === 14);
await page.evaluate(()=> document.querySelectorAll('#sheets button')[1].click());
await new Promise(r => setTimeout(r, 200));
ok('版2を選ぶと -50 に入れ替わる', await page.evaluate(()=> +document.getElementById('vwarp').value) === -50);

console.log('\n[5] 実際の絵が版ごとに違って出ているか（描画で確かめる）');
/* 版1だけを画面の左、版2を右に置いて、左右の絵が違うことを見る。
   ⚠️ 内部の値だけ見ても「GLに入っているか」は分からないので、必ず描画を見る。 */
/* ⭐ 測り方＝「版2のつまみを動かしたあと、【版1だけを描いた絵】が1画素も変わらないこと」。
   ⚠️ 画面の左右で切って見る測り方は使えない（版が重なっていると版2のはみ出しを
      版1の変化と読み違える＝テストが嘘をつく）。版1だけを描いて突き合わせる。
   ⚠️ 左右の形を見比べる測り方も使えない（縦うねりは上下対称で重心が動かない）。 */
const shot = await page.evaluate(async ()=>{
  const c = document.getElementById('gl');
  const gl2 = c.getContext('webgl') || c.getContext('experimental-webgl');
  const w = c.width, h = c.height;
  const grab = async ()=>{ await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const px = new Uint8Array(w*h*4); gl2.readPixels(0,0,w,h,gl2.RGBA,gl2.UNSIGNED_BYTE,px); return px; };
  const count = (A,B)=>{ let n=0;
    for(let y=0;y<h;y+=2) for(let x=0;x<w;x+=2){ const i=(y*w+x)*4;
      if(Math.abs(A[i]-B[i]) > 8 || Math.abs(A[i+1]-B[i+1]) > 8 || Math.abs(A[i+2]-B[i+2]) > 8) n++; }
    return n; };
  /* 🔴 選ぶのは【版1】のまま、値を書き換えるのは【版2】。
     こうしないと「選んでいる版の歪みを全部に当てる」という壊れ方を見逃す
     （版2を選んで版2を触ると、壊れていても絵が変わってしまい ok になる）。 */
  curSheet = 0; refreshSheets();
  SHEETS[0].x = -60; SHEETS[1].x = 60;
  SHEETS[0].warp.vwarp = 0; SHEETS[1].warp.vwarp = 0;
  const all = SHEETS.slice();
  SHEETS.length = 0; SHEETS.push(all[0]);                // ── 版1だけ描く
  const only1a = await grab();
  SHEETS.length = 0; all.forEach(s=>SHEETS.push(s));
  const bothA = await grab();
  SHEETS[1].warp.vwarp = 100;                            // ⭐ 選んでいない版2を歪ませる
  const bothB = await grab();
  SHEETS.length = 0; SHEETS.push(all[0]);                // ── もう一度 版1だけ描く
  const only1b = await grab();
  SHEETS.length = 0; all.forEach(s=>SHEETS.push(s));
  const ink = ()=>{ let n=0; for(let y=0;y<h;y+=2) for(let x=0;x<w;x+=2){ const i=(y*w+x)*4;
      if(bothA[i]<200 || bothA[i+1]<200 || bothA[i+2]<200) n++; } return n; };
  return { changedAll: count(bothA, bothB), changedSheet1: count(only1a, only1b), ink: ink() };
});
ok('そもそも絵が出ている', shot.ink > 200, JSON.stringify(shot));
ok('⭐ 選んでいない版2を歪ませても絵が変わる（版の値がそのままGLに届いている）',
   shot.changedAll > 100, JSON.stringify(shot) + ' ← 0なら「選んでいる版の歪みを全版に当てている」');
ok('⭐ 版1の絵は1画素も変わっていない（他の版を巻き込まない）', shot.changedSheet1 === 0,
   `版1の変化画素=${shot.changedSheet1} ← 0でなければ他の版まで歪んでいる`);

console.log('\n[6] 控え（JSON）を通しても保たれる');
const roundtrip = await page.evaluate(async ()=>{
  SHEETS[0].warp.vwarp = 100; SHEETS[1].warp.vwarp = -100;   // ⚠️ 期待値は先にここで決める
  const before = JSON.parse(JSON.stringify(stateToJSON(false)));
  await new Promise(r=> applyState(before, r));
  return { v: before.v,
    s0: SHEETS[0].warp.vwarp, s1: SHEETS[1].warp.vwarp,
    l0: SHEETS[0].layers[0].w, l1: SHEETS[1].layers[0].w,
    inSheet: before.sheets.every(s=> s.warp && s.layers) };
});
ok('控えの版の中に warp と layers が入っている', roundtrip.inSheet);
ok('控えの版番号は v3', roundtrip.v === 3);
ok('読み直しても版1=100・版2=-100 のまま', roundtrip.s0 === 100 && roundtrip.s1 === -100,
   JSON.stringify(roundtrip));
ok('3層も版ごとに保たれる', roundtrip.l0 === 14 && roundtrip.l1 === -70, JSON.stringify(roundtrip));

console.log('\n[7] 古い控え（v2＝歪みが面にひとつだった頃）も読める');
const legacy = await page.evaluate(async ()=>{
  const old = { v:2,
    P: { font:0, dir:0, layer:0, track:0, leading:0, vwarp:70, hwarp:0, freq:3, thick:0,
         wtop:0, wbot:0, hleft:0, hright:0, wmid:25, hmid:0, shearx:0, sheary:0, twtop:0, twbot:0,
         radius:30, strength:55, look:0, density:14, mesh:90, inkN:3,
         papN:1, papMode:0, papAng:90, papSteps:0, papCx:50, papCy:50 },
    LAYERS: [ {w:33,h:0,rot:0,warp:0,dens:0,sang:0,soff:0}, {w:0,h:0,rot:0,warp:0,dens:0,sang:0,soff:0},
              {w:0,h:0,rot:0,warp:0,dens:0,sang:0,soff:0}, {w:0,h:0,rot:0,warp:0,dens:0,sang:0,soff:0} ],
    ANCHORS: [], VIEW: { zoom:1, panx:0, pany:0, rotx:0, roty:0 }, cur:0,
    sheets: [ { kind:'text', text:'あ', font:0, dir:0, track:0, leading:0, x:-30, y:0, scale:1, rot:0, asp:1, cscale:[], crot:[] },
              { kind:'text', text:'い', font:0, dir:0, track:0, leading:0, x:30,  y:0, scale:1, rot:0, asp:1, cscale:[], crot:[] } ] };
  await new Promise(r=> applyState(old, r));
  return { n: SHEETS.length,
    warps: SHEETS.map(s=> s.warp.vwarp), mids: SHEETS.map(s=> s.warp.wmid),
    freqs: SHEETS.map(s=> s.warp.freq), lw: SHEETS.map(s=> s.layers[0].w),
    pLeft: WARP_KEYS.filter(k=> P[k] !== undefined) };
});
ok('版は2枚に戻った', legacy.n === 2);
ok('⭐ 昔の縦うねり70が【全部の版】に配られた（見え方が変わらない）',
   legacy.warps.every(v=> v === 70), JSON.stringify(legacy.warps));
ok('辺ごと（中幅25）も全版に配られた', legacy.mids.every(v=> v === 25), JSON.stringify(legacy.mids));
ok('山数3も全版に配られた', legacy.freqs.every(v=> v === 3), JSON.stringify(legacy.freqs));
ok('昔の3層（漢字33）も全版に配られた', legacy.lw.every(v=> v === 33), JSON.stringify(legacy.lw));
ok('古い控えを読んでも P に歪みが残らない（二重管理をしない）',
   legacy.pLeft.length === 0, JSON.stringify(legacy.pLeft));

console.log('\n[8] 全リセット');
const reset = await page.evaluate(()=>{
  resetAll();
  return { warps: SHEETS.map(s=> s.warp.vwarp), mids: SHEETS.map(s=> s.warp.wmid),
           lw: SHEETS.map(s=> s.layers[0].w), n: SHEETS.length,
           ui: +document.getElementById('vwarp').value,
           uiVal: document.getElementById('vwarp').parentElement.querySelector('.val').textContent };
});
ok('版は消えない（素材だから）', reset.n === 2);
ok('全部の版の縦うねりが初期値30に戻る', reset.warps.every(v=> v === 30), JSON.stringify(reset.warps));
ok('辺ごともゼロに戻る', reset.mids.every(v=> v === 0), JSON.stringify(reset.mids));
ok('3層はゼロに戻る（これまでと同じ）', reset.lw.every(v=> v === 0), JSON.stringify(reset.lw));
ok('つまみの表示も 30 になる', reset.ui === 30 && reset.uiVal === '30', `${reset.ui}/${reset.uiVal}`);

console.log('\n[9] 複製（8/6の機能）が歪みごと複製する');
const dup = await page.evaluate(async ()=>{
  SHEETS[0].warp.vwarp = -22; SHEETS[0].layers[0].rot = 41;
  curSheet = 0; refreshSheets();
  document.getElementById('dupSheet').click();
  await new Promise(r=> setTimeout(r, 100));
  const last = SHEETS.length-1;
  return { n: SHEETS.length, v: SHEETS[last].warp.vwarp, r: SHEETS[last].layers[0].rot,
           sepW: SHEETS[last].warp !== SHEETS[0].warp, sepL: SHEETS[last].layers !== SHEETS[0].layers };
});
ok('版が増えた', dup.n === 3);
ok('複製先も同じ歪み（-22 / 傾ぎ41）', dup.v === -22 && dup.r === 41, JSON.stringify(dup));
ok('複製先は別の入れ物（片方を動かしても双子が動かない）', dup.sepW && dup.sepL);

console.log('\n[10] ⌘Zで戻す');
const undo = await page.evaluate(async ()=>{
  if(typeof snap === 'function') snap();
  const before = SHEETS[0].warp.vwarp;
  SHEETS[0].warp.vwarp = 99;
  const el = document.getElementById('vwarp');
  document.dispatchEvent(new KeyboardEvent('keydown', { key:'z', metaKey:true, bubbles:true }));
  await new Promise(r=> setTimeout(r, 200));
  return { before, after: SHEETS[0] ? SHEETS[0].warp.vwarp : null };
});
ok('⌘Z で歪みが戻る（版の中に入っているので控えに乗る）', undo.after === undo.before,
   JSON.stringify(undo));

console.log('\n[11] 縞（金属）── 段・隙間・色数・丸み');
/* ⭐ ここは「刷った帯」に寄せるための4つ。既定（0/0/1/0）では【これまでと同じなめらかな金属】。
   🔴 いちばん見たいのは隙間：明暗で抜くと【暗いほうの色が丸ごと消えて2色刷りが1色になる】。
      色数2で隙間を入れたとき、青も黄も残っていることを画素で確かめる。 */
const stripe = await page.evaluate(async ()=>{
  const c = document.getElementById('gl');
  const gl2 = c.getContext('webgl') || c.getContext('experimental-webgl');
  const w = c.width, h = c.height;
  const grab = async ()=>{ await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const px = new Uint8Array(w*h*4); gl2.readPixels(0,0,w,h,gl2.RGBA,gl2.UNSIGNED_BYTE,px); return px; };
  const count = (A,B)=>{ let n=0;
    for(let y=0;y<h;y+=2) for(let x=0;x<w;x+=2){ const i=(y*w+x)*4;
      if(Math.abs(A[i]-B[i])>8 || Math.abs(A[i+1]-B[i+1])>8 || Math.abs(A[i+2]-B[i+2])>8) n++; }
    return n; };
  const inks = px=>{ let blue=0, yellow=0;
    for(let y=0;y<h;y+=2) for(let x=0;x<w;x+=2){ const i=(y*w+x)*4;
      if(px[i+2] > 90 && px[i+2] > px[i] + 40) blue++;                       // 青の帯
      if(px[i] > 90 && px[i+1] > 90 && px[i+2] < px[i] - 40) yellow++; }     // 黄の帯
    return { blue, yellow }; };

  resetAll();
  const s = SHEETS[0]; s.text = 'あいう'; bakeSheet(s);
  SHEETS.length = 1; curSheet = 0; refreshSheets();
  P.look = 0; P.density = 20; syncInk();
  const base = await grab();

  P.stSteps = 5;                        const steps = await grab();
  P.stSteps = 0;                        const back  = await grab();
  P.stInkN = 2; INKC[0] = '#1e56d6'; INKC[1] = '#e8e02a'; syncInk();
  const twoColor = await grab();
  const c2 = inks(twoColor);
  P.stGap = 30;                         const gap = await grab();
  const cg = inks(gap);
  P.stGap = 0; P.stRound = 90;          const round = await grab();

  return { steps: count(base, steps), back: count(base, back),
           color: count(base, twoColor), gap: count(twoColor, gap), round: count(twoColor, round),
           c2, cg };
});
console.log(`   隙間の前後：青 ${stripe.c2.blue}→${stripe.cg.blue} ／ 黄 ${stripe.c2.yellow}→${stripe.cg.yellow}`);
ok('段を上げると絵が変わる', stripe.steps > 100, JSON.stringify(stripe));
ok('⭐ 段を0に戻すと元の絵に戻る（既定＝これまでの金属）', stripe.back === 0, `違う画素=${stripe.back}`);
ok('色数2で色がつく', stripe.color > 100, JSON.stringify(stripe));
ok('色数2＝青と黄が両方出ている', stripe.c2.blue > 50 && stripe.c2.yellow > 50, JSON.stringify(stripe.c2));
ok('隙間を入れると絵が変わる', stripe.gap > 100, JSON.stringify(stripe));
/* 🔴 ここが番人。明暗（g）で抜く実装だと【明るい色は1画素も減らない】。
   「どちらの色も残っている」だけでは通ってしまう（青は半分残るので）。
   ⭐ 見るのは「両方の色が削れているか」＝隙間は帯と帯のあいだに入るもの。 */
const keepB = stripe.cg.blue / Math.max(stripe.c2.blue, 1);
const keepY = stripe.cg.yellow / Math.max(stripe.c2.yellow, 1);
ok('🔴 隙間は【どちらの色も】削る（明暗で抜くと明るい色が無傷で残る）',
   keepB < 0.95 && keepY < 0.95,
   `青の残り=${(keepB*100).toFixed(0)}% 黄の残り=${(keepY*100).toFixed(0)}% ← 片方が100%なら明暗で抜いている`);
ok('隙間を入れても両方の色は消えない', stripe.cg.blue > 30 && stripe.cg.yellow > 30,
   `青=${stripe.cg.blue} 黄=${stripe.cg.yellow}`);
ok('丸みで帯に明暗がつく', stripe.round > 100, JSON.stringify(stripe));

console.log('\n[12] 描き終わりまでJSエラーが出ていない');
ok('通しでJSエラーなし', errors.length === 0, errors.slice(0,3).join(' | '));

// ⚠️ パスに日本語が入る＝import.meta.url は %E5.. になっている。decode してから渡す
await page.screenshot({ path: decodeURIComponent(new globalThis.URL('./_out.png', import.meta.url).pathname) });
await browser.close();
console.log(`\n===== ${pass} ok / ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
