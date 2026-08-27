/* ⭐⭐ 数字の打ち込み ── 枡MASU（2026-08-27 木下）
   ⭐ 欄に打ち込む→絵が変わる／つまみを動かす→欄も変わる（値の持ち主は1つ）
   ⭐ 端で止まる／↑↓ で1つずつ。⚠️ 直す前の版には input.val が無いので落ちる。
   使い方: node sudare/masu/_test/vals.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(process.argv[2], { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 4000));
const R = await p.evaluate(async () => {
  const w = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  const sig = () => { const d = cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
    let h=2166136261; for(let i=0;i<d.length;i+=997){ h ^= d[i]; h = Math.imul(h,16777619); } return h>>>0; };
  out.欄の数 = document.querySelectorAll('#panel input.val').length;
  out.spanの残り = document.querySelectorAll('#panel span.val').length;
  const r = document.getElementById('x');            // 横位置
  const inp = r.parentElement.querySelector('input.val');
  out.つまみと同じ = { つまみ:r.value, 欄:inp.value };
  const s0 = sig();
  // ① 打ち込むと絵が変わる
  inp.value = '120'; inp.dispatchEvent(new Event('input',{bubbles:true})); await w(500);
  out.打ち込み = { つまみ:+r.value, 絵が変わった: sig() !== s0 };
  // ② つまみを動かすと欄も変わる（2つの持ち主を作っていない）
  r.value = '-60'; r.dispatchEvent(new Event('input',{bubbles:true})); await w(400);
  out.つまみから = { 欄:inp.value };
  // ③ 端を超えたら端で止まる
  inp.value = '9999'; inp.dispatchEvent(new Event('change',{bubbles:true})); await w(400);
  out.端で止まる = { 欄:inp.value, つまみ:+r.value, max:+r.max };
  // ④ ↑キーで1つずつ
  inp.value = '10'; inp.dispatchEvent(new Event('change',{bubbles:true})); await w(250);
  inp.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true})); await w(250);
  out.矢印 = +r.value;
  // ⑤ 元に戻す
  r.value = '0'; r.dispatchEvent(new Event('input',{bubbles:true})); await w(300);
  return out;
});
await b.close();
let ng = 0;
const ok = (c,n,note)=>{ console.log(`  ${c?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!c) ng++; };
console.log('── ⭐⭐ 数字を打ち込んで直す');
ok(errs.length === 0, 'JSエラーが出ない', errs.length + '件' + (errs[0] ? ' → ' + errs[0] : ''));
ok(R.欄の数 > 20 && R.spanの残り === 0,
   '⭐ つまみぜんぶの数字が【打ち込める欄】になった（見るだけの数字は残っていない）',
   `欄 ${R.欄の数} 本 ／ 残り ${R.spanの残り}`);
ok(R.つまみと同じ.つまみ === R.つまみと同じ.欄, '⭐ 開いた時点でつまみと欄が同じ', JSON.stringify(R.つまみと同じ));
ok(R.打ち込み.つまみ === 120 && R.打ち込み.絵が変わった,
   '⭐⭐ 打ち込むと【つまみも絵も】動く', JSON.stringify(R.打ち込み));
ok(R.つまみから.欄 === '-60',
   '⭐⭐ つまみを動かすと【欄も】動く（持ち主が2つに割れていない）', JSON.stringify(R.つまみから));
ok(R.端で止まる.つまみ === R.端で止まる.max && R.端で止まる.欄 === String(R.端で止まる.max),
   '⭐ 端を超えて打ったら端で止まる（欄もその値に直る）', JSON.stringify(R.端で止まる));
ok(R.矢印 === 11, '⭐ ↑キーで1つずつ動く', String(R.矢印));
process.exit(ng ? 1 : 0);
