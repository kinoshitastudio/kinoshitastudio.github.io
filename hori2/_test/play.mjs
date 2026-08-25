/* ⭐⭐ SPIN は【再生を押して初めて】動く（2026-08-26）
   木下＝「スピンに関しても再生ボタンを押して初めてうごくようにして。
   でないと動画書き出しの最初のトリガーや位置が調整できない」

   見るのは：
     ① SPIN を点けただけでは【角度が1度も動かない】（＝合わせた向きが残る）
     ② ▶再生 を押すと角度が動く
     ③ ■止める で角度が止まり、その向きのまま残る
     ④ SPIN が消えている状態で再生を押したら、SPIN も点く（押して何も起きない を作らない）
   ⚠️ 書き出しが SPIN に従うことは ②tvspin.mjs が見ている（画面が止まっていても回る）。
   ⚠️ 直す前の版では「①」が必ず落ちる（点けた瞬間から回っていた）。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || path.join(HERE, '..', 'index.html');

const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); let err = 0;
p.on('pageerror', e => { err++; console.log('🔴 JSエラー:', e.message); });
await p.setViewport({ width:1200, height:800, deviceScaleFactor:1 });
await p.goto('file://' + decodeURIComponent(FILE), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3500));

/* 角度は左下の角度表（YAW）から読む＝木下が見ている数字そのもの */
const yaw = () => p.evaluate(() => {
  const t = (document.getElementById('gztext') || {}).textContent || '';
  const m = t.match(/YAW\s*(-?\d+)/); return m ? +m[1] : null;
});
const click = id => p.evaluate(i => { const b = document.getElementById(i); if(b) b.click(); return !!b; }, id);
const has = id => p.evaluate(i => !!document.getElementById(i), id);

let ng = [];
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng.push(name); };

console.log('── SPIN は再生を押して初めて動く');
if(!(await has('btn-play'))){ console.log('  🔴 再生ボタン（#btn-play）が無い'); await b.close(); process.exit(1); }

/* ⚠️ headless（swiftshader）は数コマ/秒しか出ない。既定の速さ 32 だと3秒でも1〜2度しか
   回らず「動いていない」と誤読する。⭐ 測る前に速さを最大にする＝測りたいものだけを動かす。 */
await p.evaluate(() => {
  const r = document.querySelector('[data-p="spinSpeed"]');
  if(r){ r.value = r.max; r.dispatchEvent(new Event('input', { bubbles:true })); }
});
await click('btn-spin');                       /* 回す＝設定を点ける */
const a0 = await yaw();
await new Promise(r => setTimeout(r, 2500));
const a1 = await yaw();
ok(a0 !== null && a0 === a1, 'SPIN を点けただけでは角度が動かない', `YAW ${a0}° → ${a1}°`);

await click('btn-play');                       /* 再生 */
/* ⚠️ headless（swiftshader）は数コマ/秒しか出ない。決め打ちの待ち時間だと
   「動いていない」と誤読する。⭐ 動くまで待つ（上限つき）。 */
let a2 = a1;
for(let i = 0; i < 40 && a2 === a1; i++){ await new Promise(r => setTimeout(r, 400)); a2 = await yaw(); }
ok(a2 !== a1, '▶再生 を押すと角度が動く', `YAW ${a1}° → ${a2}°`);

await click('btn-play');                       /* 止める */
/* ⚠️ 止めた瞬間に角度が固まるわけではない＝カメラは【目標へ 0.12 ずつ寄る】作りなので、
   止めたあともしばらく動く（カクッと止まらないため）。
   ⭐ だから「ぴたりと同じ数字か」ではなく【動きが小さくなったか】で見る。 */
const step = async () => { const u = await yaw(); await new Promise(r => setTimeout(r, 1200));
                           return Math.abs((await yaw()) - u); };
const moveStopped = await step();
await click('btn-play');                       /* もう一度再生して比べる */
await new Promise(r => setTimeout(r, 600));
const movePlaying = await step();
await click('btn-play');                       /* 止め直す */
ok(moveStopped < Math.max(1, movePlaying), '■止める で動きが止まっていく（回り続けない）',
   `止めているとき ${moveStopped}° ／ 再生中 ${movePlaying}°`);

/* SPIN を消して再生を押したら SPIN も点く（押して何も起きない を作らない） */
await click('btn-spin');                       /* SPIN を消す */
const spinOff = await p.evaluate(() => document.getElementById('btn-spin').style.background === '');
await click('btn-play');
await new Promise(r => setTimeout(r, 800));
const a5 = await yaw();
let a6 = a5;
for(let i = 0; i < 40 && a6 === a5; i++){ await new Promise(r => setTimeout(r, 400)); a6 = await yaw(); }
ok(spinOff && a5 !== a6, 'SPIN が消えていても再生を押せば動く（SPIN も点く）', `YAW ${a5}° → ${a6}°`);
ok(err === 0, 'JSエラーが出ない', err + '件');
await b.close();
process.exit(ng.length ? 1 : 0);
