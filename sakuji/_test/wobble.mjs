/* ⭐⭐ 手のゆらぎ（利き手を捨てる）── 作字SAKUJI 2026-08-28
   木下＝「Sakuji で描いたものは手の揺らぎなどここは調整できるようにして」
   🔴 直す前の落ち方（3つ、どれも黙って死んでいた）：
     ① 下見の配線が【実物と違う id】を見ていた（wobAmp / wobTilt は存在しない）＝つまみが効かない
     ② その先で呼んでいる `wobbleOpts()` が【どこにも定義されていなかった】
     ③ 掛けると【必ず closed=true】＝フリーハンドで引いた開いた線が勝手に閉じて別の形になる
   見るのは：
     ① 開いた線が閉じない ② つまみを動かすと形が変わる（＝調整できる）
     ③ 下見を外すと元に戻る ④ 確定（手で書き直す）したら重ねられる
   使い方: node sakuji/_test/wobble.mjs <URL> */
import path from 'node:path'; import { fileURLToPath } from 'node:url';
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || 'file://' + decodeURIComponent(path.join(HERE, '..', 'index.html'));
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1500, height:950 });
await p.goto(FILE, { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,3200));
let NG=0; const ok=(c,n,x)=>{ console.log((c?'  ✅ ':'  🔴 ')+n+(x!=null?' … '+x:'')); if(!c) NG=1; };

/* 開いた線を1本置いて選ぶ（＝Sakuji で描いたもの） */
const st = () => p.evaluate(() => {
  const it = artLayer.children[0];
  return { 閉じ:!!it.closed, 点:it.segments.length, 形:it.pathData.length,
           長さ:Math.round(it.length) };
});
await p.evaluate(() => {
  artLayer.removeChildren();
  const q = new paper.Path({ segments:[[300,300],[500,260],[700,380],[860,300]], strokeColor:'#111', strokeWidth:6 });
  q.selected = true; guides(); paper.view.update();
});
const 前 = await st();
ok(前.閉じ === false, 'はじめは開いた線', JSON.stringify(前));

/* ② つまみを動かすと形が変わる（下見に自分から入る） */
const knob = (id, v) => p.evaluate(([i,x]) => {
  const r = document.getElementById(i); r.value = x;
  r.dispatchEvent(new Event('input', { bubbles:true }));
}, [id, String(v)]);
await knob('wbTremor', 80); await new Promise(r=>setTimeout(r,300));
const A = await st();
ok(A.形 !== 前.形, 'つまみを動かすと形が変わる（＝調整できる）', `${前.点}点 → ${A.点}点`);
ok(await p.evaluate(() => document.getElementById('pvWob').checked), '触った時点で下見に入る（チェックも立つ）');
ok(A.閉じ === false, '⭐ 開いた線が閉じない', JSON.stringify(A));

/* もう一段動かすと、また変わる（前の結果に重ならない＝いつも元から掛け直す） */
await knob('wbTremor', 20); await new Promise(r=>setTimeout(r,300));
const B = await st();
ok(B.形 !== A.形, 'もう一度動かすとまた変わる', `${A.点}点 → ${B.点}点`);

/* ③ 下見を外すと元に戻る */
await p.evaluate(() => { const e = document.getElementById('pvWob'); e.checked = false; e.dispatchEvent(new Event('change',{bubbles:true})); });
await new Promise(r=>setTimeout(r,300));
const C = await st();
ok(C.形 === 前.形 && C.点 === 前.点, '下見を外すと元に戻る', `${C.点}点 / ${前.点}点`);

/* ④ 確定＝掛かる／もう一度で重なる */
await p.evaluate(() => document.getElementById('bWobble').click());
await new Promise(r=>setTimeout(r,300));
const D = await st();
ok(D.形 !== 前.形, '「手で書き直す」で確定して掛かる', `${前.点}点 → ${D.点}点`);
ok(D.閉じ === false, '確定しても開いた線のまま', JSON.stringify(D));
await p.evaluate(() => document.getElementById('bWobbleAgain').click());
await new Promise(r=>setTimeout(r,300));
const E = await st();
ok(E.形 !== D.形, '「もう一度」で重ねられる', `${D.点}点 → ${E.点}点`);

/* 何も選んでいないときは下見に入らない（掛ける相手がいない） */
await p.evaluate(() => { artLayer.children.forEach(c => c.selected = false);
  const e = document.getElementById('pvWob'); e.checked = false; });
await knob('wbPress', 70); await new Promise(r=>setTimeout(r,250));
ok(!(await p.evaluate(() => document.getElementById('pvWob').checked)), '選んでいなければ下見に入らない');
ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close(); process.exit(NG);
