/* ══ 噂 UWASA 回帰テスト ══════════════════════════════════════
   使い方：node uwasa/_test/run.mjs [URL]
   ⚠️ 落ちないテストは意味がない。最後に「わざと壊したら落ちるか」の検算あり。
   見ているのは
     ① 立ち上がって、元の字から【輪郭】が取れているか
     ② ⭐⭐ 崩しが【全部の字に同じ規則で】掛かるか ＝ ここが「書体」の定義
     ③ ⭐ 太らせると【太る】か（🔴 法線が内を向いて細っていた／巻き方でも直らなかった）
     ④ 字幅・字高が別々に効くか（縦に長く・横に長く）
     ⑤ ⭐ 組みの3本（向き・字送り・行間・折り返し）が【大きく】にも【試し組み】にも効くか
     ⑥ 打った字が【全部】出るか（🔴 1字しか出していなかった）
     ⑦ はみ出しを数字で言うか／「収める」でつまみ自体が動くか
     ⑧ SVG が輪郭（path）で出るか
     ⑨ 種を変えると崩れ方が変わるか（種の1発目が潰れていないか）
   ══════════════════════════════════════════════════════════ */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL0 = process.argv[2] || 'http://localhost:8123/uwasa/index.html';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); let err = 0;
p.on('pageerror', e => { err++; console.log('🔴', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(URL0, { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3200));

const R = await p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const set = (id, v) => { const e = document.getElementById(id); e.value = v;
    e.dispatchEvent(new Event('input', { bubbles:true })); };
  const bbox = c => { let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    glyph(c).forEach(r => r.forEach(q => { x0=Math.min(x0,q[0]); x1=Math.max(x1,q[0]);
      y0=Math.min(y0,q[1]); y1=Math.max(y1,q[1]); }));
    return [Math.round(x1-x0), Math.round(y1-y0)]; };
  const area = c => { let a = 0;
    glyph(c).forEach(r => { for(let i=0;i<r.length;i++){ const q=r[i], w=r[(i+1)%r.length];
      a += q[0]*w[1] - w[0]*q[1]; } });
    return Math.abs(a/2); };

  /* ① 輪郭が取れている */
  out['①囲みの数'] = glyph('爆').length;
  out['①点の数'] = glyph('爆').reduce((s,r)=>s+r.length,0);

  /* ② ⭐⭐ 崩しが全部の字に効く（1字だけ変わるのは「書体」ではない） */
  const chs = ['爆','あ','ん'];
  const b0 = chs.map(c => JSON.stringify(glyph(c)));
  set('rough', 90); await wait(120);
  const b1 = chs.map(c => JSON.stringify(glyph(c)));
  out['②変わった字'] = b0.filter((v,i) => v !== b1[i]).length;
  out['②全部'] = chs.length;
  set('rough', 34); await wait(80);

  /* ③ 太らせると太る */
  const a0 = area('爆'); set('fat', 40); await wait(120);
  out['③太らせの面積比'] = +(area('爆')/a0).toFixed(3);
  set('fat', -40); await wait(120);
  out['③細らせの面積比'] = +(area('爆')/a0).toFixed(3);
  set('fat', 0); await wait(80);

  /* ④ 字幅・字高が別々 */
  const s0 = bbox('あ');
  set('wide', 180); await wait(100); const sw = bbox('あ'); set('wide', 100); await wait(60);
  set('tall', 180); await wait(100); const sh = bbox('あ'); set('tall', 100); await wait(60);
  out['④素'] = s0; out['④横に長く'] = sw; out['④縦に長く'] = sh;

  /* ⑤⑥ 組みの3本が【大きく】にも効く／打った字が全部出る */
  S.text = 'なんだろう';
  document.getElementById('tText').value = 'なんだろう';
  document.getElementById('tText').dispatchEvent(new Event('input', { bubbles:true }));
  await wait(250);
  out['⑥大きくの字数'] = bigChars().length;
  S.view = 'one'; layout(); render(); await wait(120);
  const P0 = JSON.stringify(runPos(5,640).pos), B0 = JSON.stringify(boardSize());
  set('kLine', 260); await wait(200);
  out['⑤行間が効く'] = JSON.stringify(runPos(5,640).pos) !== P0;
  out['⑤版面も伸びる'] = JSON.stringify(boardSize()) !== B0;
  set('kLine', 150); await wait(120);
  document.querySelector('#segDir button[data-v="h"]').click(); await wait(200);
  const yoko = boardSize();
  document.querySelector('#segDir button[data-v="v"]').click(); await wait(200);
  const tate = boardSize();
  out['⑤横縦で入れ替わる'] = (yoko[0] === tate[1] && yoko[1] === tate[0]);
  set('kWrap', 2); await wait(150);
  out['⑤折り返し2の行数'] = runPos(5,640).lines;
  set('kWrap', 4); await wait(120);

  /* ⑦ はみ出しを言う／収めるでつまみが動く */
  S.view = 'lay'; layout(); render(); await wait(150);
  set('mSize', 400); await wait(150);
  const over = layOver();
  out['⑦はみ出しを数える'] = (over.top + over.bottom + over.left + over.right) > 0;
  document.getElementById('bFitText').click(); await wait(250);
  const o2 = layOver();
  out['⑦収めたら0'] = (o2.top + o2.bottom + o2.left + o2.right) === 0;
  out['⑦つまみも動く'] = (+document.getElementById('mSize').value === S.lay.size);

  /* ⑧ SVG は輪郭で出る */
  { const g = document.createElement('canvas').getContext('2d');
    const body = paint(g, S.lay.w, S.lay.h, { svg:true });
    out['⑧pathの数'] = body.filter(s => s.startsWith('<path')).length; }

  /* ⑭ ⭐ 型＝押すとつまみ自体がその値になる／素へ必ず戻れる（2026-08-31） */
  document.querySelector('#segKata button[data-v="sure"]').click(); await wait(350);
  out['⑭型でつまみが動く'] = (+document.getElementById('chip').value === S.cut.chip && S.cut.chip > 0);
  out['⑭型で絵が変わる'] = (glyph('G').length > 1);      /* 毛羽・飛沫が別の囲みとして増える */
  document.querySelector('#segKata button[data-v="su"]').click(); await wait(300);
  out['⑭素へ戻る'] = (S.cut.chip === 0 && S.cut.rough === 0 && S.cut.hair === 0 && S.cut.spat === 0);
  out['⑭素は囲み1つ'] = (glyph('G').length === 1);
  /* ⚠️ つまみを触ったら型の印が外れる（絵と印が食い違わない） */
  set('rough', 70); await wait(200);
  out['⑭触ると印が外れる'] = document.querySelectorAll('#segKata button.on').length === 0;
  /* ⚠️⚠️ ここで【素のまま】にすると、次の⑨（種で変わるか）が
     崩しゼロのせいで落ちる ── 本体ではなく試験の置き方の問題。既定へ戻す。 */
  set('rough', 34); set('fat', 0); set('smooth', 18); await wait(200);

  /* ⑨ 種で崩れ方が変わる（🔴 種の1発目が潰れていると変わらない） */
  const g1 = JSON.stringify(glyph('あ'));
  set('seed', 42); await wait(150);
  out['⑨種で変わる'] = JSON.stringify(glyph('あ')) !== g1;
  const firsts = [3,14,25,36,47].map(k => +rnd(k)().toFixed(3));
  out['⑨種ごとの1発目'] = firsts;
  out['⑨散らばり'] = +(Math.max(...firsts) - Math.min(...firsts)).toFixed(3);
  return out;
});

const NG = [];
const ok = (k, cond) => { console.log((cond?'  ✅ ':'  🔴 ') + k + ' … ' + JSON.stringify(R[k])); if(!cond) NG.push(k); };
console.log('── 噂 UWASA（書体を崩して作る）');
ok('①囲みの数', R['①囲みの数'] > 0);
ok('①点の数', R['①点の数'] > 100);
ok('②変わった字', R['②変わった字'] === R['②全部']);
ok('③太らせの面積比', R['③太らせの面積比'] > 1.1);
ok('③細らせの面積比', R['③細らせの面積比'] < 0.9);
ok('④横に長く', R['④横に長く'][0] > R['④素'][0]*1.3 && R['④横に長く'][1] === R['④素'][1]);
ok('④縦に長く', R['④縦に長く'][1] > R['④素'][1]*1.3 && R['④縦に長く'][0] === R['④素'][0]);
ok('⑥大きくの字数', R['⑥大きくの字数'] === 5);
ok('⑤行間が効く', R['⑤行間が効く'] === true);
ok('⑤版面も伸びる', R['⑤版面も伸びる'] === true);
ok('⑤横縦で入れ替わる', R['⑤横縦で入れ替わる'] === true);
ok('⑤折り返し2の行数', R['⑤折り返し2の行数'] === 3);
ok('⑦はみ出しを数える', R['⑦はみ出しを数える'] === true);
ok('⑦収めたら0', R['⑦収めたら0'] === true);
ok('⑦つまみも動く', R['⑦つまみも動く'] === true);
ok('⑧pathの数', R['⑧pathの数'] >= 5);
ok('⑭型でつまみが動く', R['⑭型でつまみが動く'] === true);
ok('⑭素へ戻る', R['⑭素へ戻る'] === true);
ok('⑭型で絵が変わる', R['⑭型で絵が変わる'] === true);
ok('⑭素は囲み1つ', R['⑭素は囲み1つ'] === true);
ok('⑭触ると印が外れる', R['⑭触ると印が外れる'] === true);
ok('⑨種で変わる', R['⑨種で変わる'] === true);
ok('⑨散らばり', R['⑨散らばり'] > 0.4);
console.log('  ' + (err ? '🔴 例外 ' + err + '件' : '✅ 例外なし'));

/* ⚠️ 検算＝わざと壊したら落ちるか */
const bad = await p.evaluate(() => {
  const g0 = JSON.stringify(glyph('あ'));
  S.cut.rough = 0; S.cut.fat = 0; S.cut.smooth = 0; S.cut.wide = 100; S.cut.tall = 100;
  cutCache.clear();                                       /* 崩しを全部切る */
  return JSON.stringify(glyph('あ')) === g0;
});
console.log('  ── 検算：崩しを全部切ったら字が変わった＝ ' + (!bad)
  + '（ここが false なら つまみが効いていない＝②③が落ちる）');

if(NG.length || err){ console.log('  🔴 落ち：' + NG.join('／')); await b.close(); process.exit(1); }
console.log('  ── 通過（23項目）');
await b.close();
