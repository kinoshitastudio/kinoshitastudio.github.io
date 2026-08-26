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
/* ⭐⭐ 2026-08-26 木下「停止すると一番最初の位置に戻して」＝止めたら【押す前の向き】へ。
   ⚠️ ここは前は「動きが小さくなったか」を見ていた（止めた所に残る作りだった）。
      規則が変わったので、見るものも変えた＝戻ってくるかどうか。
   ⚠️ カメラは目標へ寄る作りなので、落ち着くまで少し待つ。 */
let a3 = null;
for(let i = 0; i < 20; i++){ await new Promise(r => setTimeout(r, 300)); a3 = await yaw();
                             if(Math.abs(a3 - a1) <= 1) break; }
ok(Math.abs(a3 - a1) <= 1, '⭐ ■止めると【押す前の向き】に戻る',
   `押す前 ${a1}° → 回して ${a2}° → 止めて ${a3}°`);

/* ⭐ 逆回転（2026-08-26 木下「さらにスピンの逆回転もできるように」）
   ⚠️ 見るのは【符号が裏返り、つまみも一緒に動く】こと＝回る向きはこの1つの値で決まる。 */
/* ⚠️ 本体は type="module" なので P は外から見えない＝【つまみの値】で見る（木下が見る数字と同じ） */
const spinVal = () => p.evaluate(() => +document.querySelector('[data-p="spinSpeed"]').value);
if(!(await has('btn-rev'))){
  ok(false, '⇄逆回転のボタン（#btn-rev）が有る');
  console.log('  ⚠️ 逆回転の入口が無いので、ここから先は見ない');
  await b.close(); process.exit(1);
}
const revBefore = await spinVal();
await click('btn-rev');
const revAfter = await spinVal();
const revMark = await p.evaluate(() => document.getElementById('btn-rev').textContent.includes('入'));
ok(revAfter === -revBefore, '⭐ ⇄逆回転で回る向きが裏返る（つまみも一緒に動く）',
   `${revBefore} → ${revAfter}`);
ok(revMark === (revAfter < 0), '⇄逆回転の印が状態と合っている');
await click('btn-rev');                        /* 元に戻しておく */

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
