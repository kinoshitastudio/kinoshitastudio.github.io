/* ⭐⭐ ガイド（余白の線）と、数字の打ち込み ── 枡MASU（2026-08-27）
   木下＝「余白の線を出せるようにして」「パネルの数字をテキストで入力して調整できるようにもして」

   見るのは「落ちない」ではなく：
     ⭐⭐ 余白・三分割・方眼が【画面に出る】（濃い絵の上でも見えるよう白黒の互い違い）
     ⭐⭐ ガイドは【書き出しに1本も入らない】（見るための線、という約束）
     ⭐ 数字の欄に打ち込むと絵が変わる／つまみを動かすと欄も変わる（持ち主は1つ）
     ⭐ 端を超えたら端で止まる／↑↓ で1つずつ
     ⚠️ 切に戻すと1画素も変わらない
   🔴 縮小して比べると【1px の線】が潰れて差が出ない＝等倍のまま数える。
   使い方: node sudare/masu/_test/guide.mjs <URL>
 */import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(process.argv[2], { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 4000));
const R = await p.evaluate(async () => {
  const w = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  /* 🔴 縮小して比べると【1px の線】が潰れて差が出ない＝等倍のまま数える */
  const shot = () => cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
  const diff = (a,c)=>{let n=0;for(let i=0;i<a.length;i+=4){if(Math.abs(a[i]-c[i])+Math.abs(a[i+1]-c[i+1])+Math.abs(a[i+2]-c[i+2])>10)n++;}return n;};
  const A = shot();
  // ① 余白の線を出すと絵（画面）が変わる
  const mar = document.getElementById('gMar');
  mar.value='12'; mar.dispatchEvent(new Event('input',{bubbles:true})); await w(500);
  out.余白の線 = diff(A, shot());
  // ② 三分割
  document.querySelector('#guideOn button[data-v="third"]').click(); await w(500);
  out.三分割 = diff(A, shot());
  // ③ 方眼＋方眼の数の欄が出る
  document.querySelector('#guideOn button[data-v="grid"]').click(); await w(500);
  out.方眼 = { 差:diff(A, shot()), 欄:getComputedStyle(document.getElementById('rowGGrid')).display };
  // ④⭐⭐ 書き出しには入らない
  let blob=null; const co=URL.createObjectURL;
  URL.createObjectURL = o => { if(o instanceof Blob && o.type==='image/png') blob=o; return co(o); };
  document.getElementById('png').click();
  for(let i=0;i<60 && !blob;i++) await w(60);
  URL.createObjectURL = co;
  if(blob){
    const bm = await createImageBitmap(blob);
    const c2 = document.createElement('canvas'); c2.width=bm.width; c2.height=bm.height;
    c2.getContext('2d').drawImage(bm,0,0);
    const D = c2.getContext('2d').getImageData(0,0,bm.width,bm.height).data;
    /* ⭐ 焼いた絵を【ガイドの無い画面】と突き合わせる＝1画素も入っていないことを見る */
    out.書き出し = { 差:diff(A, D), 大きさ:[bm.width,bm.height] };
  }
  await w(600);
  // ⑤ 切に戻すと元の絵
  document.querySelector('#guideOn button[data-v="0"]').click();
  mar.value='0'; mar.dispatchEvent(new Event('input',{bubbles:true})); await w(600);
  out.戻せる = diff(A, shot());
  return out;
});
await b.close();
let ng = 0;
const ok = (c,n,note)=>{ console.log(`  ${c?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!c) ng++; };
console.log('── ⭐⭐ ガイド（余白の線）');
ok(errs.length === 0, 'JSエラーが出ない', errs.length + '件' + (errs[0] ? ' → ' + errs[0] : ''));
ok(R.余白の線 > 1500, '⭐⭐ 余白の線が画面に出る（木下「余白の線を出せるようにして」）', R.余白の線 + '画素');
ok(R.三分割 > 3000, '⭐ 三分割が出る', R.三分割 + '画素');
ok(R.方眼.差 > 3000 && R.方眼.欄 !== 'none',
   '⭐ 方眼が出る／方眼のときだけ【数】の欄が出る（触れるのに効かない、を作らない）',
   JSON.stringify(R.方眼));
ok(R.書き出し && R.書き出し.差 < 600,
   '⭐⭐ ガイドは【書き出しに1本も入らない】（20000画素の線を出したまま焼いても差が出ない）',
   JSON.stringify(R.書き出し));
ok(R.戻せる < 600, '⚠️ 切に戻せば元の絵（分岐ごと通らない）', R.戻せる + '画素');
process.exit(ng ? 1 : 0);
