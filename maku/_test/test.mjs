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
  SHEETS[0].stInkN = 2; SHEETS[0].inkc[0] = '#1e56d6'; SHEETS[0].inkc[1] = '#e8e02a'; syncInk();
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

console.log('\n[12] 粒（マス目に落とす）');
/* ⭐ 粒 TSUBU の効きを膜の上で出す。0＝なしで【これまでどおりなめらかな字】。
   🔴 いちばん見たいのは「字を焼き直すのでなく面の上で落としている」こと＝
      画像の版にも同じくかかる。字だけで測ると、そこが抜けても通ってしまう。 */
const grain = await page.evaluate(async ()=>{
  const c = document.getElementById('gl');
  const gl2 = c.getContext('webgl') || c.getContext('experimental-webgl');
  const w = c.width, h = c.height;
  const grab = async ()=>{ await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const px = new Uint8Array(w*h*4); gl2.readPixels(0,0,w,h,gl2.RGBA,gl2.UNSIGNED_BYTE,px); return px; };
  const count = (A,B)=>{ let n=0;
    for(let y=0;y<h;y+=2) for(let x=0;x<w;x+=2){ const i=(y*w+x)*4;
      if(Math.abs(A[i]-B[i])>8 || Math.abs(A[i+1]-B[i+1])>8 || Math.abs(A[i+2]-B[i+2])>8) n++; }
    return n; };

  resetAll();
  const s = SHEETS[0]; s.text = 'あ'; bakeSheet(s);
  SHEETS.length = 1; curSheet = 0; refreshSheets();
  P.look = 0; P.grain = 0; P.grainInk = 0; syncInk();
  const off = await grab();
  P.grain = 40;                    const on   = await grab();
  P.grainInk = 1;                  const bit  = await grab();
  P.grainJit = 70;                 const jit  = await grab();   // ⭐ マスごとのばらつき
  P.grainJit = 0; P.grain = 0; P.grainInk = 0;
  const back = await grab();

  /* 画像の版でも粒がかかるか＝面の上で落としている証拠。
     ⚠️ 画像は uSrc==1 で早い段階に return する道を通るので、そこを通していないと効かない。 */
  /* ⚠️ 測る画像は【細かく強い模様】にする。なめらかな板だと、マスの中心で拾い直しても
     隣のマスとの色差が小さく、効いていても閾値に届かない＝テストが嘘をつく。 */
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g2d = cv.getContext('2d');
  for(let y=0;y<64;y++) for(let x=0;x<64;x++){
    g2d.fillStyle = ((x + y) % 2) ? '#ff2020' : '#2040ff';    // 1pxごとの市松
    g2d.fillRect(x,y,1,1);
  }
  const img = new Image();
  await new Promise(r=>{ img.onload = r; img.src = cv.toDataURL(); });
  addImageSheet(img);
  await new Promise(r=>setTimeout(r,150));
  P.grain = 0;                     const imgOff = await grab();
  P.grain = 30;                    const imgOn  = await grab();
  P.grain = 0;
  return { on: count(off,on), bit: count(on,bit), jit: count(bit,jit), back: count(off,back), img: count(imgOff,imgOn) };
});
ok('粒を上げると絵が変わる', grain.on > 100, JSON.stringify(grain));
ok('「色もマスごと」で絵が変わる', grain.bit > 50, JSON.stringify(grain));
ok('⭐ ばらつきでマスごとに色が散る', grain.jit > 100, JSON.stringify(grain));
ok('⭐ 粒を0に戻すと元の絵に戻る（既定＝これまでのなめらかな字）', grain.back === 0, `違う画素=${grain.back}`);
ok('🔴 粒は【画像の版】にもかかる（面の上で落としている）', grain.img > 100,
   `画像の変化画素=${grain.img} ← 0なら字だけに効いている＝焼き直しになっている`);

/* 🔴 マスが【正方形】か。vUV は版ローカルの 0..1 なので、版の実寸比で割り振らないと
   横長の版では横に伸びた矩形になって粒に見えない（2026-08-07 に踏んだ）。
   横長（4:1）の板を貼って、横のマス数が縦のマス数のおよそ4倍あるかを数える。 */
const square = await page.evaluate(async ()=>{
  const c = document.getElementById('gl');
  const gl2 = c.getContext('webgl') || c.getContext('experimental-webgl');
  const w = c.width, h = c.height;
  resetAll();
  /* ⚠️ 測るのは【字の版】。画像で測ろうとしたが、テクスチャの線形補間で
     細かい模様が平均化されて潰れ、境目を数えられなかった。
     字なら「粒のばらつき」が効く＝マスごとに色が変わるので、境目がそのまま数えられる。
     ■ を4つ＝版が 4:1 の横長になり、中身はベタで走査線が通しやすい。 */
  const s = SHEETS[0];
  s.text = '■■■■'; s.track = -10; bakeSheet(s);
  SHEETS.length = 1; curSheet = 0; refreshSheets();
  s.scale = 1.0; s.x = 0; s.y = 0;
  P.look = 3; SHEETS[0].inkN = 2; SHEETS[0].inkc[0] = '#101010'; SHEETS[0].inkc[1] = '#f0f0f0';
  P.papSteps = 0; P.papN = 1;
  P.grain = 40; P.grainInk = 1; P.grainJit = 100;    // マスごとに2色がランダムに出る
  syncInk(); syncGrad();
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const px = new Uint8Array(w*h*4); gl2.readPixels(0,0,w,h,gl2.RGBA,gl2.UNSIGNED_BYTE,px);
  const at = (x,y)=> px[((y*w+x)*4)];
  const lit = (x,y)=> { const i=(y*w+x)*4; return px[i]>60 || px[i+1]>60 || px[i+2]>60; };
  // 字の中だけを走って「色が変わった回数」＝マスの切れ目を数える
  const runX = (y)=>{ let n=0, prev=-999;
    for(let x=0;x<w;x++){ if(!lit(x,y)) continue; const v=at(x,y);
      if(prev>-999 && Math.abs(v-prev)>60) n++; prev=v; } return n; };
  const runY = (x)=>{ let n=0, prev=-999;
    for(let y=0;y<h;y++){ if(!lit(x,y)) continue; const v=at(x,y);
      if(prev>-999 && Math.abs(v-prev)>60) n++; prev=v; } return n; };
  /* ⚠️ 走査線は【いちばん字が詰まっている行／列】を通す。
     字の外接の真ん中を通すと、■と■の字間（何も無い所）を走って 0 になる。 */
  const best = (n, cnt)=>{ let bi=0, bv=-1;
    for(let i=0;i<n;i++){ const v=cnt(i); if(v>bv){ bv=v; bi=i; } } return bi; };
  const rowLit = y=>{ let n=0; for(let x=0;x<w;x+=2) if(lit(x,y)) n++; return n; };
  const colLit = x=>{ let n=0; for(let y=0;y<h;y+=2) if(lit(x,y)) n++; return n; };
  const by = best(h, rowLit), bx = best(w, colLit);
  return { x: runX(by), y: runY(bx), line:[bx,by] };
});
/* ⭐ 粒のつまみは【目盛り】と【実マス数】が別。粗い側（4〜30）が触れることと、
   控えを読んだときに目盛りが実マス数から逆算されて数字と実体がズレないことを見る。 */
const gs = await page.evaluate(()=>{
  const el = document.getElementById('grain');
  const set = t => { el.value = t; el.dispatchEvent(new Event('input',{bubbles:true}));
    return { g: P.grain, txt: el.parentElement.querySelector('.val').textContent }; };
  const zero = set(0), half = set(50), full = set(100);
  P.grain = 28; syncGrainUI();                       // 控えから戻したときの噛み合い
  return { zero, half, full, backSlider: +el.value,
           backTxt: el.parentElement.querySelector('.val').textContent };
});
ok('目盛り0＝粒なし', gs.zero.g === 0 && gs.zero.txt === 'なし', JSON.stringify(gs.zero));
ok('⭐ 目盛りの真ん中が粗い側（マス数30以下）＝粗い側が触れる', gs.half.g > 4 && gs.half.g <= 30,
   `目盛り50 → ${gs.half.g}マス`);
ok('目盛り100が一番細かい（200マス）', gs.full.g === 200, JSON.stringify(gs.full));
ok('表示は実マス数（目盛りの数字を出さない）', gs.half.txt === String(gs.half.g), gs.half.txt);
ok('🔴 実マス数から目盛りが逆算される（控えを読んでもズレない）',
   gs.backSlider === 50 && gs.backTxt === '28', `目盛り=${gs.backSlider} 表示=${gs.backTxt}`);

const ratio = square.x / Math.max(square.y, 1);
ok('🔴 マスが正方形（横長4:1の版でも粒が伸びない）', ratio > 2.5 && ratio < 6,
   `横のマス数=${square.x} 縦のマス数=${square.y} 比=${ratio.toFixed(2)} ← 1前後なら版の形を見ずに切っている`);

console.log('\n[13] 色のプリセット');
/* 🔴 変えるのは【字の色だけ】。地まで同じ色にすると字が地に沈む。
   ⚠️ 「字の色が変わった」だけ見ると、地も変えてしまう実装でも通る＝地も必ず見る。 */
const pal = await page.evaluate(()=>{
  resetAll();
  P.look = 0; SHEETS[0].stInkN = 2; syncInk();
  const papBefore = PAPC.slice();
  const inkBefore = SHEETS[0].inkc.slice();
  const btns = document.querySelectorAll('#pal button');
  btns[2].click();                                   // 熱
  const inkAfter = SHEETS[0].inkc.slice(), papAfter = PAPC.slice();
  const swatch = document.querySelector('input[data-ic="0"]').value;
  const lit = document.querySelectorAll('#pal button.on').length;
  // 手で色をいじったら、どのプリセットでもない状態に戻る
  const c = document.querySelector('input[data-ic="0"]');
  c.value = '#123456'; c.dispatchEvent(new Event('input', { bubbles:true }));
  return { n: btns.length, changed: inkAfter[0] !== inkBefore[0],
           papSame: papAfter.every((v,i)=> v === papBefore[i]),
           swatch, lit, ink0: inkAfter[0],
           afterHand: { ink: SHEETS[0].inkc[0], lit: document.querySelectorAll('#pal button.on').length } };
});
ok('プリセットが6つある', pal.n === 6, JSON.stringify(pal));
ok('押すと字の色が変わる', pal.changed && pal.ink0 === '#0d0000', JSON.stringify(pal));
ok('色見本にも反映される（数字と実体をズラさない）', pal.swatch === '#0d0000', pal.swatch);
ok('押したプリセットだけが点く', pal.lit === 1, String(pal.lit));
ok('🔴 地（紙）の色は動かない（字と同じ色にすると字が地に沈む）', pal.papSame, JSON.stringify(pal));
ok('手で色をいじるとプリセットの選択が外れる',
   pal.afterHand.ink === '#123456' && pal.afterHand.lit === 0, JSON.stringify(pal.afterHand));

console.log('\n[14] 縞をマスに合わせる／地なしPNGの切り詰め');
const out = await page.evaluate(async ()=>{
  resetAll();
  const s = SHEETS[0]; s.text = '文'; bakeSheet(s);
  SHEETS.length = 1; curSheet = 0; refreshSheets();
  const c = document.getElementById('gl');
  const gl2 = c.getContext('webgl') || c.getContext('experimental-webgl');
  const w = c.width, h = c.height;
  const grab = async ()=>{ await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const px = new Uint8Array(w*h*4); gl2.readPixels(0,0,w,h,gl2.RGBA,gl2.UNSIGNED_BYTE,px); return px; };
  const count = (A,B)=>{ let n=0;
    for(let y=0;y<h;y+=2) for(let x=0;x<w;x+=2){ const i=(y*w+x)*4;
      if(Math.abs(A[i]-B[i])>8 || Math.abs(A[i+1]-B[i+1])>8 || Math.abs(A[i+2]-B[i+2])>8) n++; }
    return n; };
  // 縞をマスに合わせる＝1マス1本のパイプ（参考の金のパイプ）
  P.look = 0; P.grain = 40; P.density = 6; P.stFit = 0; syncInk();
  const free = await grab();
  P.stFit = 1;                      const fit = await grab();
  P.stFit = 0;                      const back = await grab();

  /* 🔴 地なしPNGは【絵のあるところだけ】に切り詰める。
     ⚠️ 透明の余白が残っていると、他の道具で選んだとき画面いっぱいの箱になる。 */
  const blob = await new Promise(r=> renderToBlob(r, true));
  const bmp = await createImageBitmap(blob);
  const oc = document.createElement('canvas'); oc.width = bmp.width; oc.height = bmp.height;
  const o2 = oc.getContext('2d'); o2.drawImage(bmp, 0, 0);
  const d = o2.getImageData(0, 0, bmp.width, bmp.height).data;
  const edge = (px)=>{ let n=0;                       // 端の4辺に不透明画素があるか
    for(let x=0;x<bmp.width;x++){ if(d[(0*bmp.width+x)*4+3]>2) n++; if(d[((bmp.height-1)*bmp.width+x)*4+3]>2) n++; }
    for(let y=0;y<bmp.height;y++){ if(d[(y*bmp.width+0)*4+3]>2) n++; if(d[(y*bmp.width+bmp.width-1)*4+3]>2) n++; }
    return n; };
  return { fit: count(free, fit), back: count(free, back),
           png: { w: bmp.width, h: bmp.height, canvas: [w, h], edge: edge() } };
});
ok('「縞をマスに合わせる」で絵が変わる', out.fit > 100, JSON.stringify(out));
/* 🔴 合わせた帯が【マスに追従している】かを数える＝粒を倍にすれば縞も倍。
   ⚠️「絵が変わった」だけでは、帯がマスと無関係に走っていても通る。
   🔴 さらに「色もマスごと」を ON にしても縞が残ることを見る
      ── 色までマスごとに1つにすると、マスの中のグラデが消えて平らな色ブロックになる
         （＝パイプを選んでいるのに効かない）。 */
const pipe = await page.evaluate(async ()=>{
  const c = document.getElementById('gl');
  const gl2 = c.getContext('webgl') || c.getContext('experimental-webgl');
  const w = c.width, h = c.height;
  const stripes = async ()=>{
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const px = new Uint8Array(w*h*4); gl2.readPixels(0,0,w,h,gl2.RGBA,gl2.UNSIGNED_BYTE,px);
    const at=(x,y)=>px[((y*w+x)*4)], lit=(x,y)=>{const i=(y*w+x)*4; return px[i]>40||px[i+1]>40||px[i+2]>40;};
    let bx=0, bv=-1;
    for(let x=0;x<w;x+=2){ let n=0; for(let y=0;y<h;y+=2) if(lit(x,y)) n++; if(n>bv){bv=n;bx=x;} }
    let peaks=0, up=false, prev=-1;
    for(let y=0;y<h;y++){ if(!lit(bx,y)) continue; const v=at(bx,y);
      if(prev>=0){ if(v>prev+6 && !up){ up=true; peaks++; } if(v<prev-6) up=false; } prev=v; }
    return peaks;
  };
  resetAll();
  const s = SHEETS[0]; s.text = '■■■■\n■■■■'; bakeSheet(s);
  SHEETS.length = 1; curSheet = 0; refreshSheets();
  s.scale = 1.0; s.warp.vwarp = 0;
  P.look = 0; P.stFit = 1; SHEETS[0].stInkN = 1; P.stRound = 0; P.grainInk = 0; P.grainJit = 0;
  P.grain = 20; syncGrainUI();  const n20 = await stripes();
  P.grain = 40; syncGrainUI();  const n40 = await stripes();
  P.grain = 20; syncGrainUI(); P.grainInk = 1;  const nBit = await stripes();
  return { n20, n40, nBit };
});
ok('🔴 縞がマスに追従する（粒を倍にすると縞も倍）',
   pipe.n40 > pipe.n20 * 1.6 && pipe.n40 < pipe.n20 * 2.5,
   `粒20→${pipe.n20}本 / 粒40→${pipe.n40}本 ← 変わらないならマスと無関係に走っている`);
ok('🔴 「色もマスごと」でもマスの中のグラデが残る（パイプが潰れない）',
   pipe.nBit >= pipe.n20 - 1,
   `色なめらか=${pipe.n20}本 / 色もマスごと=${pipe.nBit}本 ← 0 なら平らな色ブロックに潰れている`);
ok('戻すと元の絵に戻る', out.back === 0, `違う画素=${out.back}`);
ok('🔴 地なしPNGが画面より小さい（余白を切り詰めている）',
   out.png.w < out.png.canvas[0] && out.png.h < out.png.canvas[1], JSON.stringify(out.png));
ok('🔴 切り詰めた端に絵が接している（余白が残っていない）', out.png.edge > 0,
   `端の不透明画素=${out.png.edge} ← 0なら切り足りない`);

console.log('\n[15] 版をつかむ（画面で直接動かす）');
/* 🔴 見るのは「掴んだ点に絵がついてくるか」＝引いた画素数と絵が動いた画素数が一致するか。
   ⚠️ 版の x が増えただけでは、ズレていても通る（実際 toUV が面のスケールを外しておらず、
      半分しか動いていないのに「動いた」で通っていた）。 */
const centroid = async ()=> page.evaluate(async ()=>{
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const c = document.getElementById('gl');
  const gl2 = c.getContext('webgl') || c.getContext('experimental-webgl');
  const w = c.width, h = c.height, px = new Uint8Array(w*h*4);
  gl2.readPixels(0,0,w,h,gl2.RGBA,gl2.UNSIGNED_BYTE,px);
  let n=0, sx=0, sy=0;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=(y*w+x)*4;
    if(px[i]>150 || px[i+1]>150 || px[i+2]>150){ n++; sx+=x; sy+=y; } }
  return { n, cx: n?sx/n:0, cy: n?sy/n:0, dpr: w/c.clientWidth };
});
await page.evaluate(()=>{
  resetAll();
  SHEETS.length = 1; curSheet = 0; refreshSheets();
  ANCHORS.length = 0; SHEETS[0].x = 0; SHEETS[0].y = 0; SHEETS[0].warp.vwarp = 0;
  P.grab = 0;
});
// 既定＝面を押す（今までどおりアンカーが増え、版は動かない）
await page.mouse.move(500,400); await page.mouse.down();
await page.mouse.move(560,430,{steps:5}); await page.mouse.up();
const pushMode = await page.evaluate(()=>({ anchors: ANCHORS.length, x: SHEETS[0].x }));
ok('既定は「面を押す」＝アンカーが増え、版は動かない', pushMode.anchors === 1 && pushMode.x === 0,
   JSON.stringify(pushMode));

await page.evaluate(()=>{ ANCHORS.length = 0; SHEETS[0].x = 0; SHEETS[0].y = 0;
  document.querySelectorAll('#grab button')[1].click(); });
const before = await centroid();
const DX = 200, DY = -120;
await page.mouse.move(600,450); await page.mouse.down();
await page.mouse.move(600+DX, 450+DY, {steps:10}); await page.mouse.up();
const after = await centroid();
const grabbed = await page.evaluate(()=>({ anchors: ANCHORS.length, x: SHEETS[0].x,
  つまみ: +document.getElementById('sx').value }));
/* ⚠️ readPixels の y は【下から】数える＝画面で上に動くと値が増える。画面の向きに直して比べる。 */
const movedX = (after.cx - before.cx) / before.dpr;
const movedY = -(after.cy - before.cy) / before.dpr;
ok('つかむモードではアンカーが増えない', grabbed.anchors === 0, JSON.stringify(grabbed));
ok('つまみの数字も実体に合う', grabbed.つまみ === grabbed.x, JSON.stringify(grabbed));
ok('🔴 引いた分だけ絵が横に動く（掴んだ点についてくる）', Math.abs(movedX - DX) < 14,
   `引いた=${DX} 動いた=${movedX.toFixed(1)} ← 半分なら面のスケールを外していない`);
ok('🔴 引いた分だけ絵が縦に動く', Math.abs(movedY - DY) < 14,
   `引いた=${DY} 動いた=${movedY.toFixed(1)}`);

console.log('\n[16] 字を抜く（面を刷って字を彫る）');
/* 🔴 見るのは「絵が変わったか」でなく【地と図が入れ替わっているか】。
   刷ったとき塗られている画素と、抜いたとき塗られている画素は、重ならないはず
   （重なるなら反転しきれていない）。 */
const cut = await page.evaluate(async ()=>{
  const c = document.getElementById('gl');
  const gl2 = c.getContext('webgl') || c.getContext('experimental-webgl');
  const w = c.width, h = c.height;
  const grab = async ()=>{ await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const px = new Uint8Array(w*h*4); gl2.readPixels(0,0,w,h,gl2.RGBA,gl2.UNSIGNED_BYTE,px); return px; };
  resetAll();
  const s = SHEETS[0]; s.text = '文字'; bakeSheet(s);
  SHEETS.length = 1; curSheet = 0; refreshSheets();
  s.scale = 1.0; s.warp.vwarp = 0;
  P.look = 0; P.grain = 0; SHEETS[0].stInkN = 1; P.cut = 0; syncInk();
  const A = await grab();
  P.cut = 1;
  const B = await grab();
  // 塗られている＝地（ほぼ黒）より明るい
  const ink = px => { let n = 0;
    for(let y=0;y<h;y+=2) for(let x=0;x<w;x+=2){ const i=(y*w+x)*4; if(px[i]>60||px[i+1]>60||px[i+2]>60) n++; }
    return n; };
  let both = 0;
  for(let y=0;y<h;y+=2) for(let x=0;x<w;x+=2){ const i=(y*w+x)*4;
    const a = A[i]>60||A[i+1]>60||A[i+2]>60, b = B[i]>60||B[i+1]>60||B[i+2]>60;
    if(a && b) both++; }
  return { print: ink(A), carve: ink(B), both };
});
ok('字を刷ったときに絵が出ている', cut.print > 200, JSON.stringify(cut));
ok('⭐ 字を抜くと【面のほうが】刷られる（字より広い）', cut.carve > cut.print, JSON.stringify(cut));
ok('🔴 刷った所と抜いた所が入れ替わっている（重なりは輪郭ぶんだけ）',
   cut.both < cut.print * 0.12,
   `重なり=${cut.both} 刷り=${cut.print} ← 重なりが多いなら反転しきれていない`);

console.log('\n[17] つまみの数字とキー操作');
/* 🔴 数字はつまみの右に【収まっている】こと。文字が入っていても、パネルからはみ出していれば
   木下の画面には無い（2026-08-07「パネルに数字がない」＝22px はみ出していた）。 */
const vals = await page.evaluate(()=>{
  const pr = document.getElementById('panel').getBoundingClientRect();
  let over = 0, empty = 0, total = 0;
  document.querySelectorAll('#panel .row .val').forEach(v=>{
    const r = v.getBoundingClientRect();
    if(r.width === 0 && r.height === 0) return;            // 畳まれている節は数えない
    const inp = v.parentElement.querySelector('input');
    if(inp && inp.disabled) return;                        // 触れないつまみは数えない
    total++;
    if(r.right > pr.right - 2) over++;
    if(!v.textContent.trim()) empty++;
  });
  return { total, over, empty };
});
ok('つまみの数字がどれもパネルの中に収まっている', vals.over === 0,
   `はみ出し=${vals.over}/${vals.total} ← 1つでも出ていれば画面の外で読めない`);
ok('数字が空でない', vals.empty === 0, `空=${vals.empty}/${vals.total}`);

/* 🔴 ⌘Z は【実際につまみを掴んで動かしてから実キーで】確かめる。
   合成イベントでは snap が走らず、実機で効かない壊れ方を見逃す。 */
await page.evaluate(()=>{ resetAll(); SHEETS.length = 1; curSheet = 0; refreshSheets(); });
const v0 = await page.evaluate(()=> SHEETS[0].warp.vwarp);
const box = await page.evaluate(()=>{ const el = document.getElementById('vwarp');
  el.scrollIntoView({block:'center'});
  const r = el.getBoundingClientRect(); return { x:r.x, y:r.y, w:r.width, h:r.height }; });
await page.mouse.move(box.x + box.w*0.5, box.y + box.h/2);
await page.mouse.down();
await page.mouse.move(box.x + box.w*0.92, box.y + box.h/2, { steps:6 });
await page.mouse.up();
const v1 = await page.evaluate(()=> SHEETS[0].warp.vwarp);
await page.keyboard.down('Meta'); await page.keyboard.press('KeyZ'); await page.keyboard.up('Meta');
await new Promise(r=> setTimeout(r, 400));
const v2 = await page.evaluate(()=> SHEETS[0].warp.vwarp);
ok('つまみを掴んで動かせている', v1 !== v0, `${v0} → ${v1}`);
ok('🔴 つまみを触った直後でも ⌘Z で戻る（実キー）', v2 === v0,
   `${v0} → ${v1} → ⌘Z → ${v2} ← 戻らないなら ⌘Z 自身が今の状態を積んでいる`);
await page.keyboard.down('Meta'); await page.keyboard.down('Shift');
await page.keyboard.press('KeyZ');
await page.keyboard.up('Shift'); await page.keyboard.up('Meta');
await new Promise(r=> setTimeout(r, 400));
const v3 = await page.evaluate(()=> SHEETS[0].warp.vwarp);
ok('⌘⇧Z でやり直せる', v3 === v1, `${v2} → ⌘⇧Z → ${v3}`);
await page.keyboard.press('KeyH');
ok('H キーで手のひらモードになる', await page.evaluate(()=> handMode === true));
await page.keyboard.press('KeyH');

console.log('\n[18] 粒を【形】にかけるか【塗り】にかけるか');
/* 🔴 参考（2色の帯）は【字の輪郭はなめらかで、塗りだけが構造を持つ】。
   形に粒をかけると輪郭が階段になる＝そこを選べないと参考に届かない。
   ⚠️ 「絵が変わったか」では測れない。輪郭の【中間色の画素】を数える
      （なめらかな輪郭にはアンチエイリアスの中間色が出る／階段には出ない）。 */
const gm = await page.evaluate(async ()=>{
  const c = document.getElementById('gl');
  const gl2 = c.getContext('webgl') || c.getContext('experimental-webgl');
  const w = c.width, h = c.height;
  const edge = async ()=>{
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const px = new Uint8Array(w*h*4); gl2.readPixels(0,0,w,h,gl2.RGBA,gl2.UNSIGNED_BYTE,px);
    let mid = 0, lit = 0;
    for(let y=0;y<h;y+=2) for(let x=0;x<w;x+=2){ const i=(y*w+x)*4;
      const v = Math.max(px[i], px[i+1], px[i+2]);
      if(v > 200) lit++;
      else if(v > 40) mid++;                       // 地でも塗りでもない＝輪郭のなめらかさ
    }
    return { mid, lit };
  };
  resetAll();
  const s = SHEETS[0]; s.text = '文字'; bakeSheet(s);
  SHEETS.length = 1; curSheet = 0; refreshSheets();
  s.warp.vwarp = 0; s.scale = 1.2;
  P.look = 3; SHEETS[0].inkN = 2; SHEETS[0].inkc[0] = '#ff8000'; SHEETS[0].inkc[1] = '#ffd080';
  P.cut = 0; P.grain = 30; P.grainJit = 0;
  P.grainInk = 0; const shape = await edge();      // 形だけ＝輪郭は階段
  P.grainInk = 2; const inkOnly = await edge();    // 色だけ＝輪郭はなめらか
  return { shape, inkOnly };
});
ok('「形だけ」は輪郭が階段（中間色がほとんど出ない）',
   gm.shape.mid < gm.shape.lit * 0.2, JSON.stringify(gm.shape));
ok('🔴 「色だけ」は字の輪郭がなめらか（中間色が出る）',
   gm.inkOnly.mid > gm.shape.mid * 1.8, JSON.stringify(gm));

console.log('\n[19] 縞の角度（面ぜんぶ）');
/* 🔴 「絵が変わったか」では向きが変わったか分からない。
   横に走査したときの山の数と、縦に走査したときの山の数を比べる＝向きが入れ替わるはず。 */
const ang = await page.evaluate(async ()=>{
  const c = document.getElementById('gl');
  const gl2 = c.getContext('webgl') || c.getContext('experimental-webgl');
  const w = c.width, h = c.height;
  const peaks = async ()=>{
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const px = new Uint8Array(w*h*4); gl2.readPixels(0,0,w,h,gl2.RGBA,gl2.UNSIGNED_BYTE,px);
    const at=(x,y)=>px[((y*w+x)*4)], lit=(x,y)=>{const i=(y*w+x)*4; return px[i]>40||px[i+1]>40||px[i+2]>40;};
    const run = (fixed, horiz)=>{ let n=0, up=false, prev=-1;
      const N = horiz ? w : h;
      for(let i=0;i<N;i++){ const x = horiz ? i : fixed, y = horiz ? fixed : i;
        if(!lit(x,y)) continue; const v = at(x,y);
        if(prev>=0){ if(v>prev+6 && !up){ up=true; n++; } if(v<prev-6) up=false; } prev=v; }
      return n; };
    let by=0, bv=-1; for(let y=0;y<h;y+=2){ let n=0; for(let x=0;x<w;x+=2) if(lit(x,y)) n++; if(n>bv){bv=n;by=y;} }
    let bx=0, bw=-1; for(let x=0;x<w;x+=2){ let n=0; for(let y=0;y<h;y+=2) if(lit(x,y)) n++; if(n>bw){bw=n;bx=x;} }
    return { よこ走査: run(by, true), たて走査: run(bx, false) };
  };
  resetAll();
  const s = SHEETS[0]; s.text = '■■\n■■'; bakeSheet(s);
  SHEETS.length = 1; curSheet = 0; refreshSheets();
  s.warp.vwarp = 0; s.scale = 1.0;
  P.look = 0; P.density = 20; P.grain = 0; P.stAng = 0; syncInk();
  const yoko = await peaks();               // 角度0＝横に流れる縞
  P.stAng = 100;
  const tate = await peaks();               // 角度100＝縦に流れる縞
  return { yoko, tate };
});
ok('角度0＝縞は横に流れる（たてに走査すると山が多い）',
   ang.yoko.たて走査 > ang.yoko.よこ走査 * 1.8, JSON.stringify(ang.yoko));
ok('🔴 角度100＝縞が縦に流れる（よこに走査すると山が多い）',
   ang.tate.よこ走査 > ang.tate.たて走査 * 1.8,
   JSON.stringify(ang.tate) + ' ← 入れ替わらないなら角度が効いていない');

console.log('\n[20] 字の色が版ごと（参考の「上が青黄・下が赤」）');
const inks = await page.evaluate(async ()=>{
  const c = document.getElementById('gl');
  const gl2 = c.getContext('webgl') || c.getContext('experimental-webgl');
  const w = c.width, h = c.height;
  const grab = async ()=>{ await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const px = new Uint8Array(w*h*4); gl2.readPixels(0,0,w,h,gl2.RGBA,gl2.UNSIGNED_BYTE,px); return px; };
  const hue = px => { let r=0,g=0,b=0,n=0;                 // 塗られている画素の平均色
    for(let y=0;y<h;y+=2) for(let x=0;x<w;x+=2){ const i=(y*w+x)*4;
      if(px[i]>50||px[i+1]>50||px[i+2]>50){ r+=px[i]; g+=px[i+1]; b+=px[i+2]; n++; } }
    return n ? [Math.round(r/n), Math.round(g/n), Math.round(b/n)] : [0,0,0]; };
  resetAll();
  SHEETS.length = 1; curSheet = 0; refreshSheets();
  const s1 = SHEETS[0]; s1.text = '文'; bakeSheet(s1); s1.warp.vwarp = 0; s1.x = -50;
  /* ⚠️ 色数1は【墨】＝地のグラデと同じ規則（色数1なら今までと同じ）。色を見るなら2以上にする。 */
  P.look = 3; s1.inkN = 2; s1.inkc[0] = '#2050ff'; s1.inkc[1] = '#80b0ff';   // 版1＝青
  document.querySelector('#addSeg button[data-add="text"]').click();
  const s2 = SHEETS[1]; s2.text = '字'; bakeSheet(s2); s2.x = 50;
  s2.inkN = 2; s2.inkc[0] = '#ff3020'; s2.inkc[1] = '#ff9070';               // 版2＝赤
  syncInk();
  const all = SHEETS.slice();
  SHEETS.length = 0; SHEETS.push(all[0]); const only1 = hue(await grab());
  SHEETS.length = 0; SHEETS.push(all[1]); const only2 = hue(await grab());
  SHEETS.length = 0; all.forEach(x=>SHEETS.push(x));
  // 版を押し替えたとき色見本が入れ替わるか
  document.querySelectorAll('#sheets button')[0].click();
  const sw1 = document.querySelector('input[data-ic="0"]').value;
  document.querySelectorAll('#sheets button')[1].click();
  const sw2 = document.querySelector('input[data-ic="0"]').value;
  return { only1, only2, sw1, sw2, 別々: all[0].inkc !== all[1].inkc };
});
ok('版ごとに色の入れ物が別（片方を変えても双子が動かない）', inks.別々, JSON.stringify(inks));
ok('🔴 版1は青で刷られている', inks.only1[2] > inks.only1[0] + 40, JSON.stringify(inks.only1));
ok('🔴 版2は赤で刷られている', inks.only2[0] > inks.only2[2] + 40,
   JSON.stringify(inks.only2) + ' ← 版1と同じ色なら、色が面ぜんぶのまま');
ok('版を押し替えると色見本も入れ替わる', inks.sw1 === '#2050ff' && inks.sw2 === '#ff3020',
   `${inks.sw1} / ${inks.sw2}`);

/* 古い控え（色が面にひとつだった頃）を読むと、その色が全部の版に配られる */
const oldInk = await page.evaluate(async ()=>{
  const old = { v:3, P:{ look:3, inkN:2 }, PAPC:[...PAPC], INKC:['#00cc66','#111111','#222222','#333333','#444444','#555555'],
    ANCHORS:[], VIEW:{zoom:1,panx:0,pany:0,rotx:0,roty:0}, cur:0,
    sheets:[ {kind:'text',text:'あ',x:-40,y:0,scale:1,rot:0,asp:1,cscale:[],crot:[]},
             {kind:'text',text:'い',x:40,y:0,scale:1,rot:0,asp:1,cscale:[],crot:[]} ] };
  await new Promise(r=> applyState(old, r));
  return { n: SHEETS.length, c0: SHEETS[0].inkc[0], c1: SHEETS[1].inkc[0],
           n0: SHEETS[0].inkN, pLeft: (P.inkN !== undefined) || (P.stInkN !== undefined) };
});
ok('古い控えの色が【全部の版】に配られる', oldInk.c0 === '#00cc66' && oldInk.c1 === '#00cc66',
   JSON.stringify(oldInk));
ok('古い控えの色数も版に入る', oldInk.n0 === 2, JSON.stringify(oldInk));
ok('読んだあと P に色数が残らない（二重管理をしない）', !oldInk.pLeft, JSON.stringify(oldInk));

console.log('\n[21] 縞の色の混ざり／可動域');
/* 🔴 参考の帯は【帯の中で青→黄に連続して変わる】（間に緑が出る）。
   段で選ぶだけでは青と黄しか出ない＝そこが塗りの本質的な差だった。
   ⚠️ 「絵が変わったか」では測れない。青でも黄でもない【中間色】の画素を数える。 */
const mix = await page.evaluate(async ()=>{
  const c = document.getElementById('gl');
  const gl2 = c.getContext('webgl') || c.getContext('experimental-webgl');
  const w = c.width, h = c.height;
  const mids = async ()=>{
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const px = new Uint8Array(w*h*4); gl2.readPixels(0,0,w,h,gl2.RGBA,gl2.UNSIGNED_BYTE,px);
    let mid = 0, lit = 0;
    for(let y=0;y<h;y+=2) for(let x=0;x<w;x+=2){ const i=(y*w+x)*4;
      const r=px[i], g=px[i+1], bl=px[i+2];
      if(Math.max(r,g,bl) < 70) continue;            // 地
      lit++;
      const blue = bl > r + 40, yellow = r > bl + 40;
      if(!blue && !yellow) mid++;                    // 青でも黄でもない＝混ざった色
    }
    return { mid, lit };
  };
  resetAll();
  const s = SHEETS[0]; s.text = '文'; bakeSheet(s);
  SHEETS.length = 1; curSheet = 0; refreshSheets();
  s.warp.vwarp = 0; s.scale = 1.4;
  P.look = 0; P.density = 30; P.stGap = 0; P.stRound = 0; P.grain = 0;
  s.stInkN = 2; s.inkc[0] = '#1e56d6'; s.inkc[1] = '#e8e02a'; syncInk();
  P.stMix = 0;   const hard = await mids();
  P.stMix = 100; const soft = await mids();
  return { hard, soft };
});
ok('段でくっきり＝中間色がほとんど出ない', mix.hard.mid < mix.hard.lit * 0.25, JSON.stringify(mix.hard));
ok('🔴 混ざり100＝帯の中で色が連続して変わる（中間色が出る）',
   mix.soft.mid > mix.hard.mid * 1.8,
   JSON.stringify(mix) + ' ← 増えないなら段で選んだままで、参考の塗りにならない');

const range = await page.evaluate(()=>({
  密度上限: +document.getElementById('density').max,
  字間下限: +document.getElementById('track').min,
  行間下限: +document.getElementById('leading').min,
}));
ok('帯を細くできる（密度の上限が上がっている）', range.密度上限 >= 100, JSON.stringify(range));
ok('字をもっと詰められる（字間・行間の下限）', range.字間下限 <= -90 && range.行間下限 <= -90, JSON.stringify(range));

console.log('\n[22] マスごとの向き／光沢');
const gloss = await page.evaluate(async ()=>{
  const c = document.getElementById('gl');
  const gl2 = c.getContext('webgl') || c.getContext('experimental-webgl');
  const w = c.width, h = c.height;
  const grab = async ()=>{ await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const px = new Uint8Array(w*h*4); gl2.readPixels(0,0,w,h,gl2.RGBA,gl2.UNSIGNED_BYTE,px); return px; };
  const count = (A,B)=>{ let n=0;
    for(let y=0;y<h;y+=2) for(let x=0;x<w;x+=2){ const i=(y*w+x)*4;
      if(Math.abs(A[i]-B[i])>8 || Math.abs(A[i+1]-B[i+1])>8 || Math.abs(A[i+2]-B[i+2])>8) n++; }
    return n; };
  /* 光沢＝【黒まで落ちるか】。
     🔴 「いちばん暗い画素」でも「輝度のばらつき」でも測れなかった
        （輪郭のアンチエイリアスが必ず暗く出る／暗部が落ちるぶんハイライトも広がって相殺される）。
     ⭐ 光沢0で【明るかった場所】が、光沢100でどれだけ黒く落ちたかを数える。 */
  const fell = (A, B) => { let lo = 999;
    for(let y=0;y<h;y+=2) for(let x=0;x<w;x+=2){ const i=(y*w+x)*4;
      if(Math.max(A[i],A[i+1],A[i+2]) > 100){          // 光沢0で【はっきり塗られていた】場所だけ見る
        const v = Math.max(B[i],B[i+1],B[i+2]);
        if(v < lo) lo = v; } }
    return lo === 999 ? -1 : lo; };
  resetAll();
  const s = SHEETS[0]; s.text = '文'; bakeSheet(s);
  SHEETS.length = 1; curSheet = 0; refreshSheets();
  s.warp.vwarp = 0; s.scale = 1.5;
  P.look = 0; P.density = 14; P.grain = 40; P.grainInk = 0; P.stFit = 1;
  /* ⚠️ 色数1だと縞そのものの明暗と丸みが同じ位相で重なって、光沢を上げても分布が
     あまり動かない。色を置いた状態（色数2）で測る＝丸みだけが明暗を作るので効きが見える。 */
  P.stRound = 100; P.stGloss = 0; P.grainAng = 0;
  s.stInkN = 2; s.inkc[0] = '#c08040'; s.inkc[1] = '#ffe0a0'; syncInk();
  const base = await grab();
  P.grainAng = 80;  const angOn = await grab();
  P.grainAng = 0;   const angBack = await grab();
  P.stGloss = 100;  const glossOn = await grab();
  const fallen = fell(base, glossOn), self = fell(base, base);   // self＝光沢0どうし（比較の基準）
  return { ang: count(base, angOn), angBack: count(base, angBack), fallen, self };
});
ok('マスごとの向きで絵が変わる', gloss.ang > 100, JSON.stringify(gloss));
ok('0に戻すと元の絵に戻る', gloss.angBack === 0, `違う画素=${gloss.angBack}`);
ok('🔴 光沢を上げると、塗られていた所が黒まで落ちる（コントラストが立つ）',
   gloss.fallen < gloss.self * 0.5,
   `同じ場所のいちばん暗い所：光沢0=${gloss.self} → 光沢100=${gloss.fallen} ← 下がらないなら効いていない`);

console.log('\n[23] マスごとのずれ／帯の中の黒');
const blk = await page.evaluate(async ()=>{
  const c = document.getElementById('gl');
  const gl2 = c.getContext('webgl') || c.getContext('experimental-webgl');
  const w = c.width, h = c.height;
  const grab = async ()=>{ await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const px = new Uint8Array(w*h*4); gl2.readPixels(0,0,w,h,gl2.RGBA,gl2.UNSIGNED_BYTE,px); return px; };
  const count = (A,B)=>{ let n=0;
    for(let y=0;y<h;y+=2) for(let x=0;x<w;x+=2){ const i=(y*w+x)*4;
      if(Math.abs(A[i]-B[i])>8 || Math.abs(A[i+1]-B[i+1])>8 || Math.abs(A[i+2]-B[i+2])>8) n++; }
    return n; };
  /* 🔴 黒の帯は【抜く】のでなく【黒く塗る】。地を赤にして、黒い画素が増えるかを見る
     ＝抜いているだけなら地の赤が出るので、黒は増えない。 */
  const black = px => { let n=0;
    for(let y=0;y<h;y+=2) for(let x=0;x<w;x+=2){ const i=(y*w+x)*4;
      if(px[i] < 40 && px[i+1] < 40 && px[i+2] < 40) n++; }
    return n; };
  resetAll();
  const s = SHEETS[0]; s.text = '文'; bakeSheet(s);
  SHEETS.length = 1; curSheet = 0; refreshSheets();
  s.warp.vwarp = 0; s.scale = 1.5;
  P.look = 0; P.density = 16; P.grain = 40; P.grainInk = 0; P.stFit = 1;
  P.stRound = 100; P.stGloss = 0; P.grainAng = 0; P.grainPhase = 0; P.stBlack = 0;
  s.stInkN = 2; s.inkc[0] = '#c08040'; s.inkc[1] = '#ffe0a0';
  PAPC[0] = '#e0301e'; PAPC[1] = '#e0301e'; P.papN = 2;      // 地を赤にする
  syncInk(); syncGrad();
  const base = await grab(), blk0 = black(base);
  P.grainPhase = 80; const phaseOn = await grab();
  P.grainPhase = 0;  const phaseBack = await grab();
  P.stBlack = 40;    const blackOn = await grab(); const blk1 = black(blackOn);
  return { phase: count(base, phaseOn), phaseBack: count(base, phaseBack), blk0, blk1 };
});
ok('マスごとのずれで絵が変わる', blk.phase > 100, JSON.stringify(blk));
ok('0に戻すと元の絵に戻る', blk.phaseBack === 0, `違う画素=${blk.phaseBack}`);
ok('🔴 帯の中の黒は【黒く塗る】（地が赤でも黒が出る＝抜いていない）',
   blk.blk1 > blk.blk0 + 100,
   `黒い画素 ${blk.blk0} → ${blk.blk1} ← 増えないなら塗れていない（抜いているだけ）`);

console.log('\n[24] 描き終わりまでJSエラーが出ていない');
ok('通しでJSエラーなし', errors.length === 0, errors.slice(0,3).join(' | '));

// ⚠️ パスに日本語が入る＝import.meta.url は %E5.. になっている。decode してから渡す
await page.screenshot({ path: decodeURIComponent(new globalThis.URL('./_out.png', import.meta.url).pathname) });
await browser.close();
console.log(`\n===== ${pass} ok / ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
