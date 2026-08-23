/* ⭐ 刃 HA の回帰テスト ── 直したら流す。使い方: bash ha/_test/run.sh
   🔴 見るのは「エラーが出ないか」ではなく次を数字で：
     ① 芯＝骨に刃を通す。角度・幅を動かすと絵が変わるか
     ② 刃と平行だと潰れる（それが仕組み）＝画面で理由を言っているか
     ③ ペンごとに【塗り】と【線】が別々に効くか（2026-08-23 に分けた所）
     ④ 塗りなし＋線 0 ＝ 本当に何も出ない（前は勝手に 2／4 で引いていた）
     ⑤ ペンは独立か（刃を塗りなしにしても管は変わらない）
     ⑥ 選び直すと、その骨の値がパネルに戻るか（パネルが嘘をつかない）
     ⑦ 【通すもの】は「これから引くもの」＝選んでいない骨を書き換えないか
     ⑧ 版（隠した版は書き出しにも入らない・入れ替えても絵が飛ばない）
     ⑨ 控え（JSON）を読むと同じ絵に戻るか／古い控え（中を抜く）も読めるか
     ⑩ 手元に残るか（リロードしても骨・版・つまみ・画素が消えない／ぜんぶ消せば空に戻る）
     ⑪ 出す（SVG＝塗りなしの管が本当の輪／PNG／地を透明に）
   ⭐ 物差しは本体の exList / exBox / shot から取る（描き方をここに書き直さない）。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const URL = process.argv[2] || 'http://localhost:8097/ha_tk/';
const b = await puppeteer.launch({
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox'] });
const p = await b.newPage();
let errs = 0; const ng = [];
p.on('pageerror', e => { errs++; console.log('🔴 JSエラー:', e.message); });
p.on('dialog', d => d.accept());
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(URL, { waitUntil:'networkidle0' });
await p.evaluate(() => { try{ localStorage.clear(); }catch(_){} });
await p.reload({ waitUntil:'networkidle0' });
const check = (ok, name, note) => {
  console.log(`  ${ok?'✅':'🔴'} ${name}${note?'  '+note:''}`); if(!ok) ng.push(name); };

/* 骨を3本（刃・管・升）置く＝道具が引いたのと同じ形 */
const seed = () => p.evaluate(() => {
  const line = y => Array.from({length:20},(_,i)=>({x:120+i*30, y:y+Math.sin(i/3)*30}));
  const mk = (pen,y) => ({ pen, pts:line(y), ang:-28, wid:60, thin:2, col:'#0a0a0a',
    tw:30, to:4, tcol:'#ffffff', ocol:'#0a0a0a', cell:24, L:0,
    bow:4, bocol:'#101010', mcol:'#0a0a0a', mow:4, mocol:'#0a0a0a',
    fb:true, ft:true, fm:true });
  STROKES = [mk('blade',150), mk('tube',330), mk('masu',510)];
  LAYERS = [{name:'版 1',on:true}]; LSEL=0; SEL=-1; UNDO.length=0; REDO.length=0;
  layRender(); draw();
});
/* 骨1本ぶんの「地でない画素」＝本体の書き出しと同じ道で数える */
const ink = i => p.evaluate(i => {
  const s = STROKES[i], c = shot([s], exBox([s]), 1, 1, false);
  const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  const hx = P.bg.replace('#',''), R=parseInt(hx.slice(0,2),16),
        G=parseInt(hx.slice(2,4),16), B=parseInt(hx.slice(4,6),16);
  let n=0; for(let k=0;k<d.length;k+=4)
    if(Math.abs(d[k]-R)+Math.abs(d[k+1]-G)+Math.abs(d[k+2]-B)>24) n++;
  return n;
}, i);
const knob = (id, v) => p.evaluate((id,v) => {
  const r = el(id); r.value = v; r.dispatchEvent(new Event('input')); }, id, v);
const clickSeg = (id, v) => p.evaluate((id,v) =>
  document.querySelector('#'+id+' button[data-v="'+v+'"]').click(), id, v);
const segOn = id => p.evaluate(id =>
  (document.querySelector('#'+id+' button.on')||{dataset:{}}).dataset.v, id);
const sel = i => p.evaluate(i => { SEL=i; syncPanel(); draw(); }, i);

await seed();
const PENS = [['刃','fillB',0,'bow'], ['管','fillT',1,'to'], ['升','fillM',2,'mow']];

console.log('① 芯＝刃のつまみが効く');
const a0 = await ink(0);
await knob('wid', 120); const a1 = await ink(0);
await knob('wid', 60);  const a2 = await ink(0);
check(a1 > a0 && a2 === a0, '刃の幅を上げると太る・戻すと元の絵', `${a0} → ${a1} → ${a2} 画素`);
await knob('ang', 62);  const a3 = await ink(0);
await knob('ang', -28); const a4 = await ink(0);
check(a3 !== a0 && a4 === a0, '刃の角度で絵が変わる・戻すと元の絵', `${a3} → ${a4} 画素`);

console.log('② 刃と平行だと潰れる（それが仕組み・画面で言う）');
const flat = await p.evaluate(() => {
  const th = -28*Math.PI/180, L = 300;
  const pts = [{x:200,y:700},{x:200+Math.cos(th)*L, y:700+Math.sin(th)*L}];
  return { f: bladeFlatness({ang:-28, pts}), ink: (()=>{
    const s = Object.assign({}, STROKES[0], {pts}), c = shot([s], exBox([s]), 1, 1, false);
    const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let n=0; for(let k=0;k<d.length;k+=4) if(d[k]<128) n++; return n; })() };
});
check(flat.f < 0.05, '刃と平行な骨は「潰れる」と判定される', `平行度 ${flat.f.toFixed(3)}`);

console.log('③ ペンごとに【塗り】と【線】が別々に効く');
const filled = {};
for(const [nm,,i] of PENS) filled[nm] = await ink(i);
for(const [nm,id,i] of PENS){
  await clickSeg(id,'0');
  const hollow = await ink(i);
  check(hollow > 0 && hollow < filled[nm], nm+'：塗りなしで線だけ残る',
    `塗る ${filled[nm]} → 塗りなし ${hollow} 画素`);
  await clickSeg(id,'1');
  check(await ink(i) === filled[nm], nm+'：塗るに戻すと元の絵');
}

/* 🔴 2026-08-23 木下＝「升のまま線の太さを最小にしても縦に引くと太くなる／
   刃の線の太さを調整すると升で書いたはずなのに連動される」
   ⭐ 連動は仕組み（升は刃で形を作ってから丸める）。直したのは【升の欄から触れないこと】。 */
console.log('③-2 升の太さは〔刃〕が決める（升の欄からも触れる）');
await seed();
const mIn = () => p.evaluate(() => document.querySelectorAll('#panel [data-k]').length);
const dup = await p.evaluate(() => ['ang','wid','thin']
  .map(k => k + ':' + document.querySelectorAll('[data-k="' + k + '"]').length).join(' '));
check(/ang:2/.test(dup) && /wid:2/.test(dup) && /thin:2/.test(dup),
  '刃の3つは升の欄にも出ている（入れ物が2つ）', dup);
/* 升の欄のつまみを動かすと、刃の欄の表示も一緒に動く＝値は1つ */
const both = await p.evaluate(() => {
  const rs = [...document.querySelectorAll('[data-k="wid"]')];
  rs[1].value = 120; rs[1].dispatchEvent(new Event('input'));
  const r = { a:+rs[0].value, b:+rs[1].value, P:P.wid,
              o:[...document.querySelectorAll('[data-o="wid"]')].map(x=>x.textContent).join('/') };
  rs[0].value = 60; rs[0].dispatchEvent(new Event('input'));
  r.back = { a:+rs[0].value, b:+rs[1].value, P:P.wid };
  return r;
});
check(both.a === 120 && both.b === 120 && both.P === 120 && both.o === '120/120',
  '升の欄で動かすと刃の欄も同じ値になる（式が2本に割れていない）', `${both.o} / P=${both.P}`);
check(both.back.a === 60 && both.back.b === 60 && both.back.P === 60,
  '刃の欄で動かしても升の欄が同じ値になる');
/* 升の〔線の太さ〕は縁だけ＝中身の太さは変わらない／〔刃の幅〕は中身を変える */
const m = await p.evaluate(() => {
  const ink = i => { const s = STROKES[i], c = shot([s], exBox([s]), 1, 1, false);
    const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let n=0; for(let k=0;k<d.length;k+=4) if(d[k]<128) n++; return n; };
  const set = (k,v) => { const r = document.querySelector('[data-k="'+k+'"]');
    r.value = v; r.dispatchEvent(new Event('input')); };
  const line = (y,vert) => Array.from({length:16},(_,i)=>
    vert ? {x:300, y:y+i*20} : {x:200+i*20, y:y});
  const mk = pts => Object.assign({}, STROKES[2], { pts:pts.map(q=>({x:q.x,y:q.y})) });
  STROKES = [mk(line(150,true)), mk(line(500,false))];
  LAYERS=[{name:'版 1',on:true}]; SEL=-1; layRender(); draw();
  const a = { v:ink(0), h:ink(1) };
  set('mow', 0);          const b = { v:ink(0), h:ink(1) };
  set('mow', 4); set('wid', 16); const c = { v:ink(0), h:ink(1) };
  set('wid', 60);
  return { a, b, c };
});
check(Math.abs(m.b.v - m.a.v) / m.a.v < 0.12,
  '升の〔線の太さ〕を 0 にしても中身の太さは変わらない', `縦 ${m.a.v} → ${m.b.v}`);
check(m.c.v < m.a.v * 0.6,
  '〔刃の幅〕を下げると升も細くなる（太さを決めているのは刃）', `縦 ${m.a.v} → ${m.c.v}`);
/* ⚠️ 縁（線）は縦にも横にも同じだけ乗るので、比べるのは【縁を 0 にした中身どうし】 */
check(m.b.v > m.b.h * 1.35,
  '縦が横より太いのは仕組み（刃と直角＝満量／平行＝潰れる）',
  `縦 ${m.b.v} / 横 ${m.b.h} ＝ ${(m.b.v/m.b.h).toFixed(2)}倍`);
/* ⚠️ ここで骨を入れ替えたので、あとの項目のために元の3本へ戻す */
await seed();

console.log('④ 塗りなし＋線 0 ＝ 本当に何も出ない');
for(const [nm,id,i,wk] of PENS){
  await clickSeg(id,'0'); await knob(wk, 0);
  check(await ink(i) === 0, nm+'：塗りなし＋線 0 で消える');
  await knob(wk, 4); await clickSeg(id,'1');
}

console.log('⑤ ペンは独立している');
await sel(-1); await clickSeg('fillB','0');
check(await ink(1) === filled['管'] && await ink(2) === filled['升'],
  '刃を塗りなしにしても管と升は変わらない');
await clickSeg('fillB','1');

console.log('⑥ 選び直すとパネルに戻る');
await sel(0); await clickSeg('fillB','0');
await sel(1); const asTube = await segOn('fillB');
await sel(0); const asBlade = await segOn('fillB');
check(asTube === '1' && asBlade === '0', '骨ごとの塗りがパネルに戻る',
  `管のとき ${asTube} ／ 刃のとき ${asBlade}`);
await clickSeg('fillB','1'); await sel(-1);

console.log('⑦【通すもの】は「これから引くもの」だけ');
const before = await p.evaluate(() => STROKES.map(s=>s.pen).join(','));
await p.evaluate(() => document.querySelector('#penSeg button[data-v="tube"]').click());
const after = await p.evaluate(() => STROKES.map(s=>s.pen).join(','));
check(before === after, '選んでいなければ、すでに引いた骨は変わらない', after);
await p.evaluate(() => document.querySelector('#penSeg button[data-v="blade"]').click());

console.log('⑧ 版');
await p.evaluate(() => { el('layAdd').click(); STROKES[0].L = 0;
  STROKES[1].L = 1; STROKES[2].L = 1; layRender(); draw(); });
const shown = await p.evaluate(() => exList().length);
await p.evaluate(() => { LAYERS[0].on = false; draw(); });
const hidden = await p.evaluate(() => exList().length);
check(shown === 3 && hidden === 2, '隠した版は書き出しにも入らない', `${shown} → ${hidden} 本`);
await p.evaluate(() => { LAYERS[0].on = true; layMove(0,1); draw(); });
check(await p.evaluate(() => STROKES.every(s => LAYERS[s.L|0] !== undefined)),
  '版を入れ替えても骨の版番号が迷子にならない');
/* ⭐【この版をまっさらにする】＝版は残して骨だけ消す・⌘Z で戻る */
const clr = await p.evaluate(() => {
  LSEL = 0; layRender();
  const before = { bones:STROKES.length, layers:LAYERS.length,
                   here:STROKES.filter(s=>(s.L|0)===0).length };
  el('layClear').click();
  const after = { bones:STROKES.length, layers:LAYERS.length,
                  here:STROKES.filter(s=>(s.L|0)===0).length };
  el('layClear').click();                       /* 空を押しても壊れない */
  undo();
  return { before, after, back:STROKES.length, layers:LAYERS.length };
});
check(clr.before.here > 0 && clr.after.here === 0
      && clr.after.bones === clr.before.bones - clr.before.here
      && clr.after.layers === clr.before.layers,
  'まっさらにすると、その版の骨だけ消えて版は残る',
  `骨 ${clr.before.bones}→${clr.after.bones} ／ 版 ${clr.before.layers}→${clr.after.layers}`);
check(clr.back === clr.before.bones && clr.layers === clr.before.layers,
  'まっさらにしても ⌘Z で戻る', `骨 ${clr.back} 本`);
check(await p.evaluate(() => STROKES.every(s => LAYERS[s.L|0] !== undefined)),
  'まっさらの後も骨の版番号が迷子にならない');

console.log('⑨ 控え（JSON）');
await seed();
const sig = () => p.evaluate(() => {
  const list = exList(); return shot(list, exBox(list), 1, 1, false).toDataURL('image/png'); });
const s0 = await sig();
const saved = await p.evaluate(() => JSON.stringify(
  { tool:'ha', v:2, P, VIEW, strokes:STROKES, layers:LAYERS, lsel:LSEL }));
await p.evaluate(() => { STROKES=[]; LAYERS=[{name:'版 1',on:true}]; layRender(); draw(); });
await p.evaluate(t => { const d = JSON.parse(t);
  STROKES = d.strokes; STROKES.forEach(fillOld); LAYERS = d.layers; LSEL = d.lsel;
  Object.assign(P, d.P); SEL=-1; fillSync(P); layRender(); draw(); }, saved);
check(await sig() === s0, '控えを読むと同じ絵に戻る');
/* 🔴 古い控え（中を抜く＝hollow）＝2026-08-23 より前のもの。
   線が 0 でも【今までどおり】2／2 で引かれないと、開いた瞬間に見え方が変わる。 */
const old = await p.evaluate(() => {
  const mk = (pen,y) => ({ pen, pts:Array.from({length:20},(_,i)=>({x:120+i*30,y:y})),
    ang:-28, wid:60, thin:2, col:'#0a0a0a', tw:30, to:0, tcol:'#fff', ocol:'#0a0a0a',
    cell:24, L:0, bow:0, bocol:'#101010', mcol:'#0a0a0a', mow:0, mocol:'#0a0a0a',
    hollow:true });
  STROKES = [mk('blade',200), mk('tube',360), mk('masu',520)];
  LAYERS=[{name:'版 1',on:true}]; STROKES.forEach(fillOld); layRender(); draw();
  return STROKES.map(s => [s.fb, s.ft, s.fm, s.bow, s.to, s.mow].join('/'));
});
check(old.every(x => x === 'false/false/false/2/2/2'),
  '古い控え（中を抜く）は「塗りなし＋線 2」に翻訳される', old[0]);

console.log('⑩ 手元に残る（リロードで消えない）');
await seed();
await knob('ang', 41); await knob('wid', 88);
await p.evaluate(() => { el('layAdd').click(); STROKES[2].L = 0; P.bg='#c8c4bc';
  el('bg').value='#c8c4bc'; el('bg').dispatchEvent(new Event('input')); });
const was = await p.evaluate(() => ({
  bones:STROKES.length, layers:LAYERS.length, ang:P.ang, wid:P.wid, bg:P.bg,
  L:STROKES.map(s=>s.L|0).join(''),
  ink:(()=>{ const l=exList(); return shot(l, exBox(l),1,1,false).toDataURL('image/png'); })() }));
await new Promise(r => setTimeout(r, 1800));            /* 手元に残るのを待つ */
await p.reload({ waitUntil:'networkidle0' });           /* ← リロード */
const now = await p.evaluate(() => ({
  bones:STROKES.length, layers:LAYERS.length, ang:P.ang, wid:P.wid, bg:P.bg,
  L:STROKES.map(s=>s.L|0).join(''), msg:document.getElementById('stat').textContent,
  panelAng:+el('ang').value, panelBg:el('bg').value,
  ink:(()=>{ const l=exList(); return shot(l, exBox(l),1,1,false).toDataURL('image/png'); })() }));
check(now.bones === was.bones && now.layers === was.layers && now.L === was.L,
  'リロードしても骨と版が残る', `骨 ${now.bones} 版 ${now.layers}`);
check(now.ang === was.ang && now.wid === was.wid && now.bg === was.bg,
  'リロードしてもつまみが残る', `角度 ${now.ang}／幅 ${now.wid}／地 ${now.bg}`);
check(now.panelAng === was.ang && now.panelBg === was.bg,
  'パネルの見た目も一緒に戻る（値だけ戻して画面が古いままにならない）');
check(now.ink === was.ink, 'リロードの前と後で1画素も変わらない');
/* ⭐ まっさらに戻せる道が残っているか＝〔ぜんぶ消す〕→ リロードで空 */
await p.evaluate(() => el('bClear').click());
await new Promise(r => setTimeout(r, 1800));
await p.reload({ waitUntil:'networkidle0' });
check(await p.evaluate(() => STROKES.length) === 0, '〔ぜんぶ消す〕のあとはリロードしても空');

console.log('⑪ 出す');
await seed();
const svg = async () => p.evaluate(() => {
  let got=null; const oc=URL.createObjectURL;
  URL.createObjectURL = function(x){ got=x; return oc.call(URL,x); };
  el('bSvg').click(); URL.createObjectURL = oc; return got ? got.text() : null; });
const sFill = await svg();
await clickSeg('fillT','0');
const sHollow = await svg();
check(!!sFill && !/<mask/.test(sFill), 'SVG：塗るときは型（mask）を作らない');
check(!!sHollow && /<mask id="ring/.test(sHollow),
  'SVG：塗りなしの管は型で内側を抜く＝本当の輪（前は太い棒だった）');
await clickSeg('fillT','1');
const png = await p.evaluate(async () => {
  el('exBg').value='0'; el('exBg').dispatchEvent(new Event('change'));
  const list = exList(), c = shot(list, exBox(list), 1, 1, true);
  const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  let clear = 0; for(let k=3;k<d.length;k+=4) if(d[k]===0) clear++;
  el('exBg').value='1'; el('exBg').dispatchEvent(new Event('change'));
  return clear; });
check(png > 1000, 'PNG：地を透明にすると本当に透ける', `透明な画素 ${png}`);

console.log(errs || ng.length
  ? `\n🔴 JSエラー ${errs} 件 / 落ちた ${ng.length} 件： ${ng.join('、')}`
  : '\n✅ ぜんぶ通った・JSエラー 0 件');
await b.close();
process.exit(errs || ng.length ? 1 : 0);
