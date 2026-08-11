/* ⭐ KUMI に足した「簾の質感」を実測する。
   ① シェーダがコンパイルできているか（WebGL は黙って落ちる＝画面が真っ黒になる型）
   ② 足したつまみが【実際に絵を変えるか】（UI 経由で動かす＝到達できるかも同時に見る）
   ③ 質感を全部 0 に戻したら【改修前と同じ絵】か（既存の断面を壊していない証明）
   🔴 KUMI は IKI（呼吸・揺れ）と GRAIN で毎フレーム動く＝そのままでは指紋の比較が無効。
      ⭐ まず IKI を切って GRAIN を 0 にし、【何もしなければ指紋が動かない】ことを確かめてから測る。
   ⚠️ 本体は触らずコピーを別ポートで立てて当てる。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const PORT = process.env.PORT || '8097';
const TARGET = process.argv[2] || `http://localhost:${PORT}/kumi/`;
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
let errs = [];
p.on('pageerror', e => errs.push('JSエラー: ' + e.message));
p.on('console', m => { const t = m.text(); if(/shader|ERROR/i.test(t)) errs.push('console: ' + t.slice(0, 300)); });
await p.setViewport({ width:1100, height:800, deviceScaleFactor:1 });
await p.goto(TARGET, { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 2500));

const sig = () => p.evaluate(() => {
  const c = document.querySelector('canvas');
  const cv = document.createElement('canvas'); cv.width = 240; cv.height = 170;
  const g = cv.getContext('2d'); g.drawImage(c, 0, 0, 240, 170);
  const d = g.getImageData(0, 0, 240, 170).data;
  let h = 2166136261, sum = 0; const cols = new Set();
  for(let i = 0; i < d.length; i += 4){
    h ^= d[i] + d[i+1] * 3 + d[i+2] * 7; h = Math.imul(h, 16777619);
    sum += (d[i] + d[i+1] + d[i+2]) / 3;
    cols.add((d[i] >> 4) + ',' + (d[i+1] >> 4) + ',' + (d[i+2] >> 4));
  }
  return { h: h >>> 0, bright: +(sum / (d.length / 4)).toFixed(1), colors: cols.size };
});
const setKnob = (k, v) => p.evaluate((k, v) => {
  const el = document.querySelector(`input[data-p="${k}"]`);
  if(!el) return false;
  el.value = v; el.dispatchEvent(new Event('input', { bubbles:true })); return true;
}, k, v);
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ── 時間を止める（IKI を切る・GRAIN を 0）── */
await p.evaluate(() => document.querySelector('[data-unit="iki"] .unit-head').click());
await setKnob('grain', 0);
await wait(1200);
const st = []; for(let i = 0; i < 3; i++){ st.push((await sig()).h); await wait(600); }
if(new Set(st).size !== 1){ console.log('🔴 まだ動いている＝この測り方は無効:', st.join(' / ')); await b.close(); process.exit(1); }
console.log('✅ 静止した（指紋の比較が有効）');

const s0 = await sig();
console.log('NURI 切:', JSON.stringify(s0));
if(s0.bright < 3) console.log('🔴 画面が真っ黒（シェーダのコンパイル失敗の疑い）');

await p.evaluate(() => document.querySelector('[data-unit="nuri"] .unit-head').click());
await wait(700);
const sN = await sig();
console.log('NURI 入:', JSON.stringify(sN), sN.h !== s0.h ? '✅ 変わった' : '🔴 変わらない');

/* ⚠️ 「効かなくて当たり前」の組み合わせで測らない ── 黒の位置は【黒の幅が0だと効かない】、
   艶の細かさは【丸みも光沢も0だと効かない】。前提のつまみを先に入れてから測る。 */
const KNOBS = [
  ['nKPos', 49, 12, { nKW: 40 }], ['nKW', 0, 60], ['nRound', 0, 100], ['nGloss', 0, 95],
  ['nShineN', 2, 6, { nRound: 60 }], ['nDir', 0, 90], ['nBands', 1, 8],
  ['nColN', 3, 6], ['nPix', 1, 10],
];
const ng = [];
for(const [k, base, v, dep] of KNOBS){
  for(const [dk, dv] of Object.entries(dep || {})) await setKnob(dk, dv);
  await wait(400);
  const ref = (await sig()).h;                       // ⭐ 前提を入れた状態を基準にする
  if(!(await setKnob(k, v))){ ng.push(k + '（つまみが無い）'); continue; }
  await wait(600);
  const s = await sig(); const ok = s.h !== ref;
  console.log(` ${k} ${base}→${v}${dep ? ' (前提 ' + JSON.stringify(dep) + ')' : ''}:`, JSON.stringify(s), ok ? '✅' : '🔴 絵が変わらない');
  if(!ok) ng.push(k);
  await setKnob(k, base);
  for(const dk of Object.keys(dep || {})) await setKnob(dk, dk === 'nKW' ? 0 : dk === 'nRound' ? 0 : 0);
  await wait(400);
}
/* 🔴 落ちないテストは意味がない ── わざと壊して、ちゃんと落ちるか確かめる */
{
  const ref = (await sig()).h;
  await setKnob('nKW', 0);                            // 幅0で位置を動かす＝効かないはず
  await setKnob('nKPos', 5); await wait(600);
  const s = await sig();
  console.log(' [自己検査] 黒の幅0で黒の位置を動かす:', s.h === ref ? '✅ 変わらない（テストは落ちる側も見えている）' : '🔴 変わってしまった');
  await setKnob('nKPos', 49);
}
/* 艶の細かさは丸みが 0 だと効かなくて当たり前 → 丸みを入れた状態で測っている（上の既定 45） */

const seg = [];
for(const [k,v] of [['nKW',0],['nRound',0],['nGloss',0]]) await setKnob(k, v);
for(const v of ['0', '1', '2']){
  await p.evaluate(v => document.querySelector(`.seg[data-seg="nAxis"] button[data-v="${v}"]`).click(), v);
  await wait(700);
  const s = await sig(); seg.push(s);
  console.log(` 帯の向き ${['横','縦','両方'][+v]}:`, JSON.stringify(s));
}
if(seg[0].h === seg[1].h) ng.push('帯の向き 横＝縦');
if(seg[1].h === seg[2].h) ng.push('帯の向き 縦＝両方');

/* 質感を全部 0（＝改修前の状態）。この指紋を旧版と突き合わせる */
await p.evaluate(() => document.querySelector('.seg[data-seg="nAxis"] button[data-v="0"]').click());
for(const [k, v] of [['nKW',0],['nRound',0],['nGloss',0]]) await setKnob(k, v);
await wait(800);
const sZ = await sig();
console.log('質感=0:', JSON.stringify(sZ));

await p.screenshot({ path: process.argv[3] || 'kumi/_test/_out.png' });
if(errs.length) console.log('🔴 エラー:\n' + errs.join('\n'));
console.log(ng.length ? '🔴 死んでいるつまみ: ' + ng.join(', ') : '✅ つまみは全部効いた');
await b.close();
process.exit((ng.length || errs.length) ? 1 : 0);
