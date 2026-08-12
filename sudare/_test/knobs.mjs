/* ⭐ 全部のつまみを実際に動かして【絵が変わるか】を見る。
   🔴「つまみは動くのに絵が変わらない」＝ build を呼ぶ一覧に入れ忘れる型（2026-08-09 縦の長さ）。
   ⚠️ 本体は触らず、コピーを別ポートで立てて headless の実物に当てる。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL = process.argv[2] || 'http://localhost:8099/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage();
let errs = 0; p.on('pageerror', e => { errs++; console.log('🔴 JSエラー:', e.message); });
await p.setViewport({ width:1200, height:800, deviceScaleFactor:1 });
await p.goto(URL, { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 2000));

const sig = () => p.evaluate(() => { const c = document.querySelector('canvas'), g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height).data; let h = 2166136261;
  for(let i = 0; i < d.length; i += 4 * 13){ h ^= d[i] + d[i+1] * 3 + d[i+2] * 7; h = Math.imul(h, 16777619); }
  return h >>> 0; });

/* つまみが効くか見るために、まず「輪郭から」と「板」の両方で回す */
/* ⚠️ 1つ試すごとに【版を丸ごと元に戻す】。戻さないと前のつまみの値が残り、
      字が画面の外に出て真っ黒になり、以降ぜんぶ「変わらない」と誤検出する（最初にこれで36件出た）。 */
/* ⚠️ アニメのつまみ（速さ・コマ）は1コマ目では差が出ない＝ここでは見ない（別で見る）。
   ⚠️ 艶の細かさは【丸みが0だと効かなくて当たり前】なので、丸みを入れた状態で測る（同種：縦のグラデの幅）。 */
const SKIP = ['speed','fps'];
const modes = [ { name:'板', set:{ dir:0, slices:60, gap:6 } },
                /* ⭐ マス（2026-08-12 追加）＝升目に切って1マスに1回グラデ。板とは拾い方が別 */
                { name:'マス', set:{ dir:4, slices:20, gap:6, minLen:4, mdir:3 } },
                { name:'輪郭から', set:{ dir:3, dScale:40, dRes:600, dCombN:30, vgrad:50, dRound:60 } } ];
let ng = [];
for(const m of modes){
  const reset = async () => await p.evaluate(s => {
    SHEETS.length = 1; SHEETS[0] = newSheet('CAVOLO'); Object.assign(SHEETS[0], s);
    buildAll(); syncUI(); }, m.set);
  await reset();
  const ids = await p.evaluate(() => [...document.querySelectorAll('#panel input[type=range]')]
    .filter(r => r.offsetParent !== null).map(r => r.id));
  for(const id of ids){
    if(SKIP.includes(id)) continue;
    const before = await sig();
    const moved = await p.evaluate(id => { const r = document.getElementById(id);
      const mn = +r.min, mx = +r.max, cur = +r.value;
      const to = (cur - mn) > (mx - cur) ? mn : mx;      // いまと遠い方の端へ
      if(to === cur) return null;
      r.value = to; r.dispatchEvent(new Event('input', { bubbles:true })); return to; }, id);
    if(moved === null) continue;
    const after = await sig();
    const ok = before !== after;
    if(!ok) ng.push(`${m.name}／${id}`);
    console.log(`  ${ok ? '✅' : '🔴'} ${m.name}  ${id} → ${moved}`);
    await reset();
  }
}
console.log(ng.length ? `\n🔴 絵が変わらないつまみ ${ng.length}件: ${ng.join(', ')}` : '\n✅ 全部のつまみが絵に効いている');
if(errs) console.log(`🔴 JSエラー ${errs}件`);
await b.close();
process.exit(ng.length || errs ? 1 : 0);
