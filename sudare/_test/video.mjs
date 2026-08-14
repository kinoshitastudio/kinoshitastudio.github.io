/* ⭐ 動画で出す ── 実物を headless で回して【本当に出るか】【見えが戻るか】を見る。
   🔴 見るのは「エラーが出ないか」ではない。次の3つを数字で見る（feedback_regression_test_before_push）。
      ① 撮り終わったあと、画面の絵が【撮る前と完全に同じ】か（板の見えを1画素も変えない）
      ② 位相が【0→100→0 の三角】で、頭と尻が繋がるか（継ぎ目なしループの正体）
      ③ 本当にファイルが出るか（コマ数・大きさ）
   ⚠️ 本体は触らず、コピーを別ポートで立てて当てる。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL = process.argv[2] || 'http://localhost:8094/sudare/masu/';
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

let ng = [];
const check = (ok, name, note) => { console.log(`  ${ok ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`);
  if(!ok) ng.push(name); };

/* ── 仕込み ── 落ちてくる blob を横取りし、renderAll のたびに位相を控える ── */
await p.evaluate(() => {
  window.__got = [];
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(b){ window.__got.push({ size:b.size, type:b.type }); return oc.call(URL, b); };
  window.__kp = [];
  const _ra = renderAll;
  renderAll = function(x){ window.__kp.push(S_().kpos); return _ra(x); };
});

/* ⚠️ 「速さ」が 0 だと何も動かない＝出さない作り。まず動かす状態にする。
   🔴 ただし【画面のアニメは止めておく】。回したまま前後の絵を比べると、
      書き出しのせいでなく単に時間が進んだぶんで必ず食い違い、いつも 🔴 になる（最初にこれで誤検出）。 */
await p.evaluate(() => {
  animStart = function(){};                       // 画面は動かさない（位相は書き出し側が置く）
  const set = (id, v) => { const r = document.getElementById(id); r.value = v;
    r.dispatchEvent(new Event('input', { bubbles:true })); };
  set('speed', 30); set('fps', 8);
  set('kpos', 50);                                // 決めた位相で止めて、前後を同じ条件で比べる
  document.querySelector('#tvFmt button[data-v="png"]').click();   // ⚠️ headless は mp4 の器を取りに行けない
  document.querySelector('#tvLoop button[data-v="1"]').click();
  document.querySelector('#tvLen button[data-v="1080"]').click();
});
await new Promise(r => setTimeout(r, 300));

const shown = await p.evaluate(() => document.getElementById('tvSize').textContent);
check(/コマ/.test(shown) && /往復/.test(shown), '押す前に コマ数・秒・大きさ が出ている', shown.replace(/\s+/g, ' ').trim());

const plan = await p.evaluate(() => tvPlan());
const before = await sig();

await p.evaluate(() => { window.__kp.length = 0; document.getElementById('tvGo').click(); });
/* 終わるまで待つ（ボタンの字が戻る＝終わり） */
for(let i = 0; i < 240; i++){
  const done = await p.evaluate(() => document.getElementById('tvGo').textContent === '動画を出す' && !TV.on);
  if(done && i > 2) break;
  await new Promise(r => setTimeout(r, 500));
}
await new Promise(r => setTimeout(r, 500));

const after = await sig();
const msg = await p.evaluate(() => document.getElementById('tvSize').textContent);
const got = await p.evaluate(() => window.__got);
const kp  = await p.evaluate(() => window.__kp);

console.log(`\n  出た知らせ: ${msg.replace(/\s+/g, ' ').trim()}`);
check(before === after, '撮ったあと画面の絵が元に戻る', `${before} → ${after}`);
check(/PNG連番/.test(msg) && !/🔴/.test(msg), 'ちゃんと出た（理由つきで止まっていない）');
const zip = got.filter(g => /zip/.test(g.type));
check(zip.length === 1 && zip[0].size > 5000, 'ZIP がひとつ落ちた', zip.map(z => Math.round(z.size/1e3) + 'KB').join());

/* ── 位相 ── 頭2つは【大きさを測る2回】。そのあとが本番のコマ。 ── */
const frames = kp.slice(2, 2 + plan.total);
check(frames.length === plan.total, `コマ数が予定どおり ${plan.total}`, `実測 ${frames.length}`);
check(Math.abs(frames[0]) < 1e-9, '1コマ目の位相が 0（頭）', String(frames[0]));
/* ⚠️ 三角の頂点は【コマの間】に落ちることがある（総コマ数が奇数なら 100 のコマは無い）。
      同じ高さのコマが2つ並ぶこともある。だから「ぴったり100」ではなく
      【1コマぶんの中まで来ているか】で見る。 */
const step = 200 / plan.total;
const top = Math.max(...frames), topAt = frames.indexOf(top);
check(top > 100 - step, '真ん中で 100 のすぐ手前まで行く', `最大 ${top.toFixed(2)}（1コマ ${step.toFixed(2)}・${topAt}/${frames.length} コマ目）`);
/* ⭐ 継ぎ目なし＝【最後の次】が頭と同じ 0 に戻る。1コマぶんの差が均等かで見る。 */
const tail = frames[frames.length - 1];
check(Math.abs(tail - step) < step * 0.51, '最後のコマが「頭の1つ手前」＝繋がる', `最後 ${tail.toFixed(2)} / 1コマ ${step.toFixed(2)}`);
/* ⭐ 上がって下がるだけ＝向きが変わるのは1回だけ。飛びは1コマぶんを超えない。 */
/* ⚠️ 頂点をまたぐとき、同じ高さのコマが2つ並んで差が 0 になる。
      0 を「向きが変わった」と数えても「変わっていない」と数えても間違う＝
      ⭐【最後に動いた向き】を覚えて、それが反転した回数だけを数える。 */
let turns = 0, jump = 0, dir = 0;
for(let i = 1; i < frames.length; i++){
  const d = frames[i] - frames[i-1];
  jump = Math.max(jump, Math.abs(d));
  if(d === 0) continue;
  const s = Math.sign(d);
  if(dir && s !== dir) turns++;
  dir = s;
}
check(turns === 1 && jump < step * 1.01, '位相が 行って戻る（三角）だけで、飛びが無い',
      `向きが変わった回数 ${turns}・いちばん大きい飛び ${jump.toFixed(2)}`);

/* ── つまみを戻したか ── */
const kposUI = await p.evaluate(() => +document.getElementById('kpos').value);
const kposSh = await p.evaluate(() => Math.round(S_().kpos));
check(kposUI === kposSh, '「黒の位置」の数字と実体がズレていない', `${kposUI} / ${kposSh}`);
const cvOK = await p.evaluate(() => {
  const dpr = Math.min(devicePixelRatio, 2), c = document.querySelector('canvas');
  return c.width === Math.round(innerWidth * dpr) && c.height === Math.round(innerHeight * dpr); });
check(cvOK, 'キャンバスの大きさが画面のものに戻っている');

console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ 動画で出すは全部通った');
if(errs) console.log(`🔴 JSエラー ${errs}件`);
await b.close();
process.exit(ng.length || errs ? 1 : 0);
