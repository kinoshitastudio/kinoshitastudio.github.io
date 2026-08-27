/* ⭐⭐ 写真の形にマスを埋める ── 枡MASU（2026-08-28）
   木下＝「姉弟の写真を渡すと Masu だけでそれらに似た形で表現してくれることはできないだろうか？」
   参考＝カエルの形をカエルのタイルで埋めた絵。

   ⭐⭐ この道具の芯＝「マス目が先にあって、一つずつ中身を選ぶ」。
     だから写真は【どのマスに置くか】だけを決める＝中身は棚の素材から選ぶ
     ＝**形は写真・中身は自分の素材**（参考の絵とまったく同じ組み方）。
   見るのは：
     ⭐ 写真の形にマスが置かれる（形の上端〜下端が写真のとおり）
     ⭐⭐ 【振る】と中身だけ変わる（置く場所は変わらない）
     ⭐ しきいで形が変わる
   ⚠️ 素材が無いと置けない＝先に素材を入れておく。
   使い方: node masu/_test/photo.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1300, height:900, deviceScaleFactor:2 });
await p.goto(process.argv[2], { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 4000));
const R = await p.evaluate(async () => {
  const w = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  out.段がある = !!document.getElementById('phBtn');
  out.素材の数 = mats.length;
  /* うさぎの形を渡す */
  const c = document.createElement('canvas'); c.width=240; c.height=300;
  const g2 = c.getContext('2d');
  g2.fillStyle='#000'; g2.fillRect(0,0,240,300);
  g2.fillStyle='#fff';
  g2.beginPath(); g2.arc(120,195,80,0,7); g2.fill();
  g2.beginPath(); g2.ellipse(90,75,20,52,0,0,7); g2.fill();
  g2.beginPath(); g2.ellipse(150,75,20,52,0,0,7); g2.fill();
  const im = new Image();
  await new Promise(r => { im.onload = r; im.src = c.toDataURL('image/png'); });
  S.cols = 28; S.rows = 34; S.cell = 26;
  phImg = im;
  document.getElementById('phUI').style.display = '';
  phFill(); await w(600);
  out.置いた = Object.keys(S.cells).length;
  const ks = Object.keys(S.cells).map(k => k.split(',').map(Number));
  const ys = ks.map(a=>a[1]);
  out.形の幅 = { 上の行:Math.min(...ys), 下の行:Math.max(...ys) };
  /* 中身を振ると組み合わせだけ変わる（マスの数は同じ） */
  const before = JSON.stringify(Object.keys(S.cells).sort());
  const mBefore = Object.values(S.cells).map(v=>v.m).join('');
  document.getElementById('phShake').click(); await w(500);
  out.振る = { 同じマス: before === JSON.stringify(Object.keys(S.cells).sort()),
               中身が変わる: mBefore !== Object.values(S.cells).map(v=>v.m).join('') };
  /* しきいで形が変わる */
  const n0 = Object.keys(S.cells).length;
  phThr = 200; phFill(); await w(400);
  out.しきい = { 前:n0, 後:Object.keys(S.cells).length };
  phThr = 128; phFill(); await w(400);
  return out;
});
await b.close();
let ng = 0;
const ok = (c,n,note)=>{ console.log(`  ${c?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!c) ng++; };
console.log('── ⭐⭐ 写真の形にマスを埋める（枡MASU）');
ok(errs.length === 0, 'JSエラーが出ない', errs.length + '件' + (errs[0] ? ' → ' + errs[0] : ''));
ok(R.段がある, '⭐ 【写真から形を作る】の段がある');
ok(R.素材の数 > 0, '⚠️ 素材が入っている（無いと置けない）', R.素材の数 + '本');
ok(R.置いた > 50, '⭐⭐ 写真の形にマスが置かれる', R.置いた + 'マス');
ok(R.形の幅.上の行 > 0 && R.形の幅.下の行 < 33,
   '⭐ 形が写真のとおり（上下に余りがある＝盤いっぱいに塗っていない）', JSON.stringify(R.形の幅));
ok(R.振る.同じマス && R.振る.中身が変わる,
   '⭐⭐ 【振る】と中身だけ変わる（置く場所は変わらない）', JSON.stringify(R.振る));
ok(R.しきい.前 !== R.しきい.後, '⭐ しきいで形が変わる', JSON.stringify(R.しきい));
process.exit(ng ? 1 : 0);
