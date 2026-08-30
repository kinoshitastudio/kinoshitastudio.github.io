/* ⭐⭐ 桁 KETA の「動かす・動画」の回帰テスト ── 2026-08-30
   🔴 見るのは【この道具の芯が動いているか】：
     ⭐⭐ ① 再生すると絵が動く。しかも【動いているのは升目だけ】＝塗るマスは1マスも変わらない
     ⭐  ② 止めると【押す前の桁】に戻る（手で直した桁も返る）
     ⭐⭐ ③ 頭（u=0）と尻（u=1）が同じ絵＝継ぎ目なしで繰り返せる
     ④ 並び（桁が波打つ／丸めが動く／マスが変わる）を押すと本当に切り替わる
     ⑤ 動画（PNG連番）が本当に落ちる・撮ったあと値が戻る
     ⑥ mp4 は偶数の辺で撮る
   使い方: node keta/_test/video.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL_ = process.argv[2] || 'http://localhost:8460/keta/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1400, height:900 });
await p.goto(URL_, { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 2000));
let NG = 0;
const ok = (c, n, x) => { console.log((c ? '  ✅ ' : '  🔴 ') + n + (x != null ? ' … ' + x : '')); if(!c) NG = 1; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await p.evaluate(() => { window.__got = [];
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(x){ window.__got.push({ size:x.size, type:x.type }); return oc.call(URL, x); }; });

console.log('── 桁 KETA（動かす・動画）');

/* ① 再生すると絵が動く。塗るマスは変わらない */
const A = await p.evaluate(async () => {
  const plan = () => pathOf(1600, 900).d;
  const pic  = () => bakePic().on.join('');
  /* 手で直した桁を1本入れておく（止めたら返ってくるかを見るため） */
  keta(); WX[2] = WX[2] * 1.4; WX[3] = WX[3] * 0.6; handEdit();
  const before = { plan:plan(), pic:pic(), wx:WX.slice() };
  document.getElementById('b_play').click();
  await new Promise(r => setTimeout(r, 700));
  const 動いた = { plan:plan(), pic:pic() };
  document.getElementById('b_play').click();
  await new Promise(r => setTimeout(r, 300));
  const after = { plan:plan(), pic:pic(), wx:WX.slice() };
  return {
    絵が動く: before.plan !== 動いた.plan,
    塗るマスは変わらない: before.pic === 動いた.pic,
    止めたら道が戻る: before.plan === after.plan,
    止めたら手の桁も戻る: JSON.stringify(before.wx) === JSON.stringify(after.wx),
    印: document.getElementById('b_play').textContent,
  };
});
ok(A.絵が動く, '⭐⭐ ① 再生すると絵が動く');
ok(A.塗るマスは変わらない, '⭐⭐ 動いているのは【升目だけ】（塗るマスは1マスも変わらない）');
ok(A.止めたら道が戻る, '⭐ ② 止めると【押す前】に戻る');
ok(A.止めたら手の桁も戻る, '⭐ 手で直した桁も返ってくる');
ok(A.印 === '再生', '止めたら印も戻る', A.印);

/* ③ 頭と尻が同じ絵 */
const B = await p.evaluate(() => {
  const base = anBase();
  const at = u => { setPhase(u, base); return pathOf(1600, 900).d; };
  const 頭 = at(0), 尻 = at(1), 途中 = at(0.37);
  anRestore(base);
  return { 頭, 尻, 途中 };
});
ok(B.頭 === B.尻, '⭐⭐ ③ 頭（u=0）と尻（u=1）が同じ絵＝継ぎ目なしで繰り返せる',
   B.頭.length + ' 文字 / ' + B.尻.length + ' 文字');
ok(B.途中 !== B.頭, '⚠️（前提）途中は違う絵になっている');

/* ④ 並びを押すと本当に切り替わる（押しても切り替わらない、を作らない） */
const C = await p.evaluate(async () => {
  const out = {};
  for(const v of ['wave','round','cols']){
    document.querySelector('#s_an button[data-v="' + v + '"]').click();
    const base = anBase();
    setPhase(0.5, base);
    out[v] = pathOf(1600, 900).d.length;
    anRestore(base);
    out[v + '_印'] = document.querySelector('#s_an button.on').dataset.v;
  }
  document.querySelector('#s_an button[data-v="wave"]').click();
  return out;
});
ok(C.wave_印 === 'wave' && C.round_印 === 'round' && C.cols_印 === 'cols',
   '④ 並びを押すと印が移る');
ok(new Set([C.wave, C.round, C.cols]).size === 3,
   '⭐ 並びごとに違う絵になる（押しても変わらない、が無い）',
   [C.wave, C.round, C.cols].join(' / '));

/* ⑤ 動画（PNG連番）が落ちる・撮ったあと値が戻る */
const D = await p.evaluate(async () => {
  const s = (id,v)=>{const r=document.getElementById(id);r.value=v;r.dispatchEvent(new Event('input',{bubbles:true}));};
  s('r_long', 600); s('r_vsec', 10); s('r_vfps', 8);
  document.querySelector('#s_vfmt button[data-v="png"]').click();
  await new Promise(r => setTimeout(r, 300));
  const before = pathOf(1600, 900).d;
  document.getElementById('b_video').click();
  for(let i = 0; i < 60 && document.getElementById('b_video').textContent !== '動画を書き出す'; i++)
    await new Promise(r => setTimeout(r, 400));
  return { 戻った: before === pathOf(1600, 900).d, 印: document.getElementById('b_video').textContent };
});
const got = await p.evaluate(() => window.__got);
ok(got.some(x => x.type === 'application/zip'), '⑤ 動画（PNG連番）が本当に落ちる', JSON.stringify(got));
ok(D.戻った && D.印 === '動画を書き出す', '⚠️ 撮ったあと値も印も元に戻る', D.印);

/* ⑥ mp4 は偶数の辺 */
const E = await p.evaluate(async () => {
  const s = (id,v)=>{const r=document.getElementById(id);r.value=v;r.dispatchEvent(new Event('input',{bubbles:true}));};
  s('r_long', 601);
  await new Promise(r => setTimeout(r, 200));
  return document.getElementById('vsize').textContent;
});
{
  const m = E.match(/(\d+)\s*×\s*(\d+)/);
  ok(m && (+m[1] % 2 === 0) && (+m[2] % 2 === 0),
     '⑥ 動画の辺は【偶数】に丸める（奇数だと作れない端末がある）', E.split('\n')[0]);
}

ok(errs.length === 0, 'JSエラーが出ない', errs.join(' | '));
await b.close();
process.exit(NG ? 1 : 0);
