/* ⭐ 塗 NURI の回帰テスト（2026-08-15・公開に合わせて新設）
   🔴 見るのは「エラーが出ないか」ではなく、この道具の芯が生きているかを数字で見る：
     ① 筆で塗ると【場】に溜まる（画素に直接色を塗っていない＝場を消せば絵も消える）
     ② 塗った所ごとに色が載る（2色で塗って、両方が画面に出ているか）
     ③ 粒間の芯＝【谷が紙の色に落ちない】（地を敷いている）
     ④ 粒（玉/平ら/泡）と 地（泡の入/切）が【別々に】効く
     ⑤ 型を押すと、前に触った値が残っていても【まとめて上書きされる】
     ⑥ つまみが絵に効く／⌘Z で戻る／PNG が落ちる／大きい版でも現実的な速さ */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL = process.argv[2] || 'http://localhost:8340/nuri/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage();
let errs = 0; p.on('pageerror', e => { errs++; console.log('🔴 JSエラー:', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(URL, { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
await p.evaluate(() => { try{ localStorage.clear(); }catch(_){} });
await p.reload({ waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 1500));

let ng = [];
const check = (ok, name, note) => { console.log(`  ${ok ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!ok) ng.push(name); };
const wait = ms => new Promise(r => setTimeout(r, ms));
/* 落ちてくるものを横取り */
await p.evaluate(() => { window.__got = [];
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(x){ window.__got.push({ size:x.size, type:x.type }); return oc.call(URL, x); }; });

/* ⭐ 物差し＝画面の画素（この道具は場から刷った絵そのものが成果物）。
   ⚠️ 縁のアンチエイリアスが揺れうるので、比べるのは【はっきり違う／同じ】だけにする。 */
const sig = () => p.evaluate(() => { const c = document.getElementById('cv'), g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height).data; let h = 2166136261;
  for(let i = 0; i < d.length; i += 4*11){ h ^= d[i] + d[i+1]*3 + d[i+2]*7; h = Math.imul(h, 16777619); }
  return h >>> 0; });
/* 塗る（本体と同じ入口＝筆の関数を通す） */
const paint = (pts, col) => p.evaluate((o) => {
  P.ink = o.col; let px = null, py = null;
  const rgb = hex2rgb(o.col);
  for(const [nx, ny] of o.pts){ const x = nx*FW, y = ny*FH;
    if(px === null) stampAt(x, y, rgb); else strokeTo(x, y, px, py, rgb);
    px = x; py = y; }
  kick();
}, { pts, col });
const base = o => p.evaluate(x => {
  Object.assign(P, { paper:'#0a0a0a', long:1000, ratio:'9:16', bsize:200, bsoft:0.4, bflow:1,
    fill:'tama', bgawa:false, pitch:13, gap:-0.02, sq:4.2, bed:1, tsize:0, asp:1.08, stagger:false,
    lang:315, gloss:0.9, bulge:0.7, blur:0.18, cut:0.1, hard:0.92 }, x || {});
  syncUI(); kick();
}, o || {});

console.log('── ① 筆は【場】に溜める（画素に直接塗っていない）');
await base(); await p.evaluate(() => newField()); await wait(300);
const empty = await sig();
await paint([[0.25,0.3],[0.75,0.35],[0.4,0.6]], '#3a3ce8'); await wait(500);
const painted = await sig();
check(empty !== painted, '塗ると絵が変わる');
/* ⭐ 場を消すだけで絵が消える＝画素に色を塗っていない証拠 */
await p.evaluate(() => { newField(); kick(); }); await wait(400);
check(await sig() === empty, '場を消すと絵も消える（画素に直接塗っていない）');

console.log('\n── ② 塗った所ごとに色が載る');
await base(); await p.evaluate(() => newField()); await wait(200);
await paint([[0.2,0.25],[0.8,0.25]], '#3a3ce8');
await paint([[0.2,0.7],[0.8,0.7]], '#e94b8a');
await wait(600);
const two = await p.evaluate(() => {
  const c = document.getElementById('cv'), g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let blue = 0, pink = 0;
  for(let i = 0; i < d.length; i += 4){
    const r = d[i], gg = d[i+1], bb = d[i+2];
    if(bb > r + 40 && bb > 90) blue++;
    if(r > bb + 40 && r > 90) pink++;
  }
  return { blue, pink };
});
check(two.blue > 2000 && two.pink > 2000, '2色で塗ると両方が画面に出る（NIJIMI で詰まっていた所）',
      `青 ${two.blue} / 桃 ${two.pink}`);

console.log('\n── ③ 粒間の芯＝谷が紙の色に落ちない');
await base(); await p.evaluate(() => newField()); await wait(200);
await paint([[0.15,0.2],[0.85,0.2],[0.15,0.35],[0.85,0.35],[0.15,0.5],[0.85,0.5],[0.15,0.65],[0.85,0.65]], '#3a3ce8');
await wait(600);
const valley = () => p.evaluate(() => {
  const c = document.getElementById('cv'), g = c.getContext('2d');
  const y = Math.round(c.height*0.42);
  const d = g.getImageData(Math.round(c.width*0.4), y, 60, 1).data;
  let mn = 999;
  for(let i = 0; i < 60; i++){ const v = d[i*4]*0.3 + d[i*4+1]*0.59 + d[i*4+2]*0.11; if(v < mn) mn = v; }
  return Math.round(mn);
});
/* ⚠️ 既定は粒が重なっていて【谷が無い】ので、地の有無が出ない（最初これで誤検出）。
      芯の主張は「谷が紙の色に落ちない」なので、谷ができる設定にしてから測る。 */
await p.evaluate(() => { P.gap = 0.3; P.sq = 2; syncUI(); kick(); }); await wait(500);
const vOn = await valley();
await p.evaluate(() => { P.bed = 0; syncUI(); kick(); }); await wait(500);
const vOff = await valley();
check(vOn > vOff + 15, '地を敷くと粒の谷が紙の色に落ちない', `敷く ${vOn} / 敷かない ${vOff}`);
check(vOn > 40, '地を敷けば谷が黒に落ちない', `谷の最低 ${vOn}`);
/* ⭐ 既定（粒が重なる設定）では、そもそも谷が無いことも押さえる */
await p.evaluate(() => { P.bed = 1; P.gap = -0.02; P.sq = 4.2; syncUI(); kick(); }); await wait(500);
check(await valley() > 40, '既定では粒が重なって谷そのものが無い', `谷の最低 ${await valley()}`);

console.log('\n── ④ 粒と地は別々に効く');
await base(); await p.evaluate(() => newField()); await wait(200);
await paint([[0.3,0.3],[0.7,0.3],[0.5,0.6]], '#eceae4'); await wait(500);
const g1 = await sig();
await p.evaluate(() => { P.bgawa = true; syncUI(); kick(); }); await wait(1200);
const g2 = await sig();
check(g1 !== g2, '地だけ泡にすると変わる');
/* ⭐ 地を泡にしても【塗った所の粒】は玉のまま＝別々に効いている */
const stillTama = await p.evaluate(() => P.fill === 'tama' && P.bgawa === true);
check(stillTama, '玉で塗ったまま地だけ泡にできる');
await p.evaluate(() => { P.fill = 'awa'; syncUI(); kick(); }); await wait(1500);
check(await sig() !== g2, '粒も泡にするとさらに変わる');

console.log('\n── ⑤ 型は前の状態を上書きする');
await p.evaluate(() => { Object.assign(P, { pitch:34, gap:0.5, fill:'flat', bed:0, paper:'#ffffff' }); syncUI(); kick(); });
await wait(500);
await p.evaluate(() => document.querySelector('#kataSeg button[data-v="ao"]').click());
await wait(600);
const after = await p.evaluate(() => ({ pitch:P.pitch, gap:P.gap, fill:P.fill, bed:P.bed, paper:P.paper }));
check(after.pitch === 13 && after.fill === 'tama' && after.bed === 1,
      '型「参考の青」でまとめて上書きされる', JSON.stringify(after));
await p.evaluate(() => document.querySelector('#kataSeg button[data-v="midori"]').click());
await wait(1500);
const after2 = await p.evaluate(() => ({ fill:P.fill, paper:P.paper }));
check(after2.fill === 'awa' && after2.paper === '#5fc02a', '型「参考の緑」も同じ', JSON.stringify(after2));

console.log('\n── ⑥ つまみ・戻す・出す・速さ');
await base(); await p.evaluate(() => newField()); await wait(200);
await paint([[0.2,0.3],[0.8,0.35],[0.4,0.65]], '#3a3ce8'); await wait(500);
const KNOBS = [['pitch',26],['gap',0.5],['sq',8],['bed',0],['tsize',1],['asp',1.8],
               ['lang',120],['gloss',0.1],['bulge',0.1],['blur',0.9],['cut',0.6],['hard',0.1]];
for(const [k, v] of KNOBS){
  await base(); await wait(350);
  const before = await sig();
  await p.evaluate(o => { P[o.k] = o.v; syncUI(); kick(); }, { k, v }); await wait(400);
  check(before !== await sig(), `つまみ ${k}`);
}
await base(); await wait(350);
const b4 = await sig();
await p.evaluate(() => { pushHist(); const rgb = hex2rgb('#e94b8a');
  for(let i = 0; i < 40; i++) stampAt(FW*0.5, FH*0.2 + i, rgb); kick(); });
await wait(450);
check(b4 !== await sig(), '塗ると変わる（⌘Z の前）');
await p.evaluate(() => document.getElementById('b_undo').click()); await wait(450);
check(await sig() === b4, '⌘Z で元に戻る');
await p.evaluate(() => { window.__got.length = 0; document.getElementById('b_png').click(); });
await wait(1500);
const png = (await p.evaluate(() => window.__got)).filter(x => /png/.test(x.type));
check(png.length >= 1 && png[0].size > 3000, 'PNG が落ちた', png.map(x => Math.round(x.size/1e3)+'KB').join());
for(const [long, limit] of [[1600, 2500], [2600, 6000]]){
  const ms = await p.evaluate(o => { P.long = o.long; P.fill = 'tama'; P.bgawa = false;
    const s = size(); const c = document.createElement('canvas'); c.width = s.W; c.height = s.H;
    const t = performance.now(); render(c.getContext('2d'), s.W, s.H);
    return Math.round(performance.now() - t); }, { long });
  check(ms < limit, `長辺 ${long} が ${limit}ms 未満`, `${ms}ms`);
}

console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ 全部通った');
if(errs) console.log(`🔴 JSエラー ${errs}件`);
await b.close();
process.exit(ng.length || errs ? 1 : 0);
