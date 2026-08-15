/* ⭐ 点 TEN の回帰テスト ── 直したら流す。
   🔴 見るのは「エラーが出ないか」ではなく、次を数字で見る：
     ① つまみを動かして【絵が変わるか】（動くのに効かないつまみを作らない）
     ② PNG / SVG が本当に落ちるか・SVG の中身が空でないか
     ③ ⌘Z が本当に戻るか
     ④ 「点が消えて終わる」と「切る」で【縁が違う】か（この道具の芯）
     ⑤ 大きい版でも現実的な速さか（1個ずつ道を呼ぶと50倍遅くなる型を踏まない） */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL = process.argv[2] || 'http://localhost:8300/ten_tk/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage();
let errs = 0; p.on('pageerror', e => { errs++; console.log('🔴 JSエラー:', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(URL, { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
/* ⚠️ 前に触った状態がこのブラウザに残っているので、必ず消してから測る */
await p.evaluate(() => { try{ localStorage.clear(); }catch(_){} });

let ng = [];
const check = (ok, name, note) => { console.log(`  ${ok ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!ok) ng.push(name); };

/* ⭐⭐ 物差しは【画面の画素】ではなく【点そのもの】にする。
   🔴 2026-08-14 に実測して分かったこと ── 同じつまみで焼き直すと、
      点の数も半径も**完全に一致する**のに、画面の画素は 12% 食い違うことがある
      （違う画素の 91% が点の縁・インク量の差 2.5%・最大差 128）。
      ＝ブラウザが canvas の描き先を途中で切り替えて、縁の塗り方だけが変わる。
      ⚠️ だから画素のハッシュで比べると【本体は正しいのにテストが落ちる】。
   ⭐ この道具が作っているものは【刷る計画 drawPlan()＝どの色でどの道を塗るか】。そこを比べる。
   ⚠️ 物差しを3回作り直した ── 画素（縁の塗り方が揺れて落ちる）→ 点の位置と半径（点の形と
      崩れが素通り）→ 道の文字列（色が素通り）→ ⭐drawPlan（本体と同じ出どころ）。
      ⭐ 出どころを本体と1つにしておけば、つまみを足しても必ず物差しに入る。 */
const sig = () => p.evaluate(() => {
  const s = size(); bakeTone(s.W, s.H); bakeMask(s.W, s.H);
  const ds = dots(s.W, s.H);
  const t = JSON.stringify(drawPlan(ds));
  let h = 2166136261;
  for(let i = 0; i < t.length; i++){ h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h>>>0) + ':' + ds.length; });
/* 点の合計（縁の作法を比べるのに使う） */
const geom = () => p.evaluate(() => {
  const s = size(); bakeTone(s.W, s.H); bakeMask(s.W, s.H);
  const ds = dots(s.W, s.H);
  let r = 0, area = 0;
  for(const q of ds){ r += q.r; area += q.r*q.r; }
  return { n:ds.length, r:Math.round(r), area:Math.round(area) }; });
const set = async o => { await p.evaluate(x => { Object.assign(P, x); syncUI(); kick(); }, o);
  await new Promise(r => setTimeout(r, 350)); };

/* 落ちてくるものを横取りする */
await p.evaluate(() => { window.__got = [];
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(x){ window.__got.push({ size:x.size, type:x.type }); return oc.call(URL, x); }; });

/* ── 土台 ── 画像を使わずに測れるように、版は【文字1枚】にして底上げで埋める ──
   ⚠️ 版そのものが状態なので、つまみを試すたびに版ごと作り直す。 */
const mkBase = () => p.evaluate(() => {
  SHEETS = [ newSheet('txt') ];
  SHEETS[0].text = '網網\n網網'; SHEETS[0].sc = 0.42;
  cur = 0;
  Object.assign(P, { mask:'none', edge:'fade', pitch:10, ang:45, shape:'round',
    twist:0, flow:0, flowDir:'r', br:0, ct:1.2, gam:1, base:0.5, inv:false,
    bleed:0.35, jit:0.06, rjit:0.12, rough:0.14, drop:0.04,
    colBy:'none', colN:16, long:1200, ratio:'4:5' });
  syncUI(); kick();
});
const BASE = null;
const reset = async () => { await mkBase(); await new Promise(r => setTimeout(r, 350)); };

console.log('── ① つまみが絵に効くか');
/* ⚠️ 1つ試すごとに土台へ戻す。戻さないと前の値が残って「変わらない」の誤検出になる（SUDARE で36件出した型） */
const KNOBS = [['pitch',22],['ang',0],['twist',120],['flow',0.5],['br',0.3],['ct',3],['gam',2.2],
               ['base',0.9],['bleed',2.5],['jit',0.4],['rjit',0.6],['rough',0.5],['drop',0.4],['long',2000]];
for(const [k, v] of KNOBS){
  await reset(); const before = await sig();
  await set({ [k]:v });  const after = await sig();
  check(before !== after, `つまみ ${k}`, `${before} → ${after}`);
}
for(const [key, v, pre] of [['shape','square',{}], ['ratio','16:9',{}],
                            ['flowDir','y',{ flow:0.5 }], ['colBy','tone',{}], ['colN',4,{ colBy:'tone' }]]){
  await reset(); await set(pre); const before = await sig();
  await set({ [key]:v }); const after = await sig();
  check(before !== after, `${key} = ${v}`);
}
await reset(); const b1 = await sig();
await p.evaluate(() => { P.inv = true; syncUI(); kick(); }); await new Promise(r => setTimeout(r, 350));
check(b1 !== await sig(), '白黒を反転');

/* ⭐ 版そのもの（足す／消す／重ね方）も見る ── ここが 2026-08-14 に入った芯 */
console.log('\n── ①b 版（重ねる）');
await reset(); const s1 = await sig();
await p.evaluate(() => { addSheet('txt'); S_().text = '点'; S_().sc = 0.8; S_().mode = 'add'; kick(); });
await new Promise(r => setTimeout(r, 400));
const s2 = await sig();
check(s1 !== s2, '版を足すと絵が変わる', `${s1} → ${s2}`);
const nSheets = await p.evaluate(() => SHEETS.length);
check(nSheets === 2, '版が2枚になった', String(nSheets));
await p.evaluate(() => { S_().on = false; kick(); }); await new Promise(r => setTimeout(r, 350));
check(await sig() === s1, '版を消す（■）と元に戻る');
await p.evaluate(() => { S_().on = true; S_().mode = 'sub'; kick(); }); await new Promise(r => setTimeout(r, 350));
check(await sig() !== s2, '重ね方（濃くする／薄くする）で変わる');

console.log('\n── ② 形と縁（この道具の芯）');
await reset();
await p.evaluate(() => { addSheet('txt'); S_().text = '網'; S_().sc = 0.62;
  P.mask = String(S_().id); P.base = 0.5; P.edge = 'fade'; syncUI(); kick(); });
await new Promise(r => setTimeout(r, 400));
const gFade = await geom();
await set({ edge:'cut' });
const gCut = await geom();
check(gFade.n > 100 && gCut.n > 100, '文字の中に点が出る', `消えて終わる ${gFade.n} / 切る ${gCut.n}`);
/* ⭐⭐ 芯の主張＝「点が消えて終わる」は縁で点が【小さくなって】消える。
      だから切るより【点の数は多い】のに【1点あたりは小さい】。ここを数字で押さえる。 */
check(gFade.n > gCut.n, '消えて終わる方が点の数が多い（縁に小さい点が残る）', `${gFade.n} > ${gCut.n}`);
check(gFade.r/gFade.n < gCut.r/gCut.n, '消えて終わる方が1点あたり小さい',
      `${(gFade.r/gFade.n).toFixed(2)}px < ${(gCut.r/gCut.n).toFixed(2)}px`);
/* 画面が真っ白／真っ黒でないこと（点が出ていても塗られていなければ意味がない） */
const ink = await p.evaluate(() => { const c = document.getElementById('cv'), g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0;
  for(let i = 0; i < d.length; i += 4) if(d[i] < 100) n++;
  return n / (d.length/4); });
check(ink > 0.02 && ink < 0.9, '画面が真っ白でも真っ黒でもない', `インク ${(ink*100).toFixed(1)}%`);

console.log('\n── ③ 出す');
await reset(); await set({ pitch:12, long:1000 });
await p.evaluate(() => { window.__got.length = 0; document.getElementById('b_png').click(); });
await new Promise(r => setTimeout(r, 1200));
await p.evaluate(() => document.getElementById('b_svg').click());
await new Promise(r => setTimeout(r, 1200));
const got = await p.evaluate(() => window.__got);
const png = got.filter(x => /png/.test(x.type)), svg = got.filter(x => /svg/.test(x.type));
check(png.length >= 1 && png[0].size > 3000, 'PNG が落ちた', png.map(x => Math.round(x.size/1e3)+'KB').join());
check(svg.length === 1 && svg[0].size > 3000, 'SVG が落ちた', svg.map(x => Math.round(x.size/1e3)+'KB').join());
const svgOK = await p.evaluate(() => {
  const s = size(); bakeTone(s.W, s.H); bakeMask(s.W, s.H);
  const d = pathData(dots(s.W, s.H));
  return { len:d.length, head:d.slice(0, 1) }; });
check(svgOK.len > 1000 && svgOK.head === 'M', 'SVG の道が空でない', `${svgOK.len} 文字`);

console.log('\n── ④ 戻す（⌘Z）');
await reset();
const before = await sig();
await p.evaluate(() => { const r = document.getElementById('r_pitch');
  r.dispatchEvent(new Event('pointerdown', { bubbles:true }));
  r.value = 30; r.dispatchEvent(new Event('input', { bubbles:true })); });
await new Promise(r => setTimeout(r, 350));
const moved = await sig();
await p.evaluate(() => document.getElementById('b_undo').click());
await new Promise(r => setTimeout(r, 350));
const back = await sig();
check(before !== moved, 'つまみを動かすと変わる');
check(back === before, '⌘Z で元に戻る', `${before} → ${moved} → ${back}`);

console.log('\n── ⑤ 大きい版の速さ');
for(const [long, pitch, limit] of [[2400, 9, 3000], [4000, 9, 8000]]){
  const ms = await p.evaluate(o => {
    Object.assign(P, { mask:'none', rough:0.14, base:0.5, long:o.long, pitch:o.pitch }); syncUI();
    const s = size(); cv.width = s.W; cv.height = s.H; bakeTone(s.W, s.H); bakeMask(s.W, s.H);
    const t = performance.now(); render(cv.getContext('2d'), s.W, s.H, false);
    return Math.round(performance.now() - t); }, { long, pitch });
  const n = await p.evaluate(() => lastDots);
  check(ms < limit, `長辺 ${long} が ${limit}ms 未満`, `点 ${n.toLocaleString()}・${ms}ms`);
}

console.log('\n── ⑥ 動かす（継ぎ目なしループ）');
/* ⭐⭐ この道具の動きの芯＝【位相 0 と位相 1 で刷る計画が完全一致すること】。
   🔴 2026-08-14 に踏んだ ── 「ねじれが回る」は場所ごとに掛かる量が違うので
      360°足しても元に戻らない（＝ループしない）。効果を1つずつ測って見つけた。
   ⚠️ これらのつまみは【位相 0 では絵が変わらない】ので ① では測れない。ここで測る。 */
const seam = async (name, over) => {
  const r = await p.evaluate(o => {
    Object.assign(P, { spinN:0, twob:0, cflowN:0, wob:0, anim:false, twist:60,
                       colBy:'tone', colN:14, long:1000, base:0.5 }, o);
    const h = t => { let x = 2166136261; for(let i=0;i<t.length;i++){ x ^= t.charCodeAt(i); x = Math.imul(x, 16777619); } return x>>>0; };
    const s = size();
    const at = ph => { PH = ph; bakeTone(s.W, s.H); bakeMask(s.W, s.H);
      return h(JSON.stringify(drawPlan(dots(s.W, s.H)))); };
    const a0 = at(0), a1 = at(1), am = at(0.4);
    PH = 0;
    return { same:a0 === a1, moves:a0 !== am };
  }, over);
  check(r.same, `${name} — 位相0と位相1が完全一致`);
  check(r.moves, `${name} — 途中で動く`);
};
await reset();
await seam('網が回る', { spinN:1 });
await seam('ねじれが揺れる', { twob:90 });
await seam('色が流れる', { cflowN:1 });
await seam('にじみが揺れる', { wob:0.4 });
await seam('全部いっぺんに', { spinN:1, twob:90, cflowN:1, wob:0.4 });

console.log('\n── ⑦ 動画で出す');
await p.evaluate(() => {
  Object.assign(P, { spinN:1, cflowN:1, colBy:'tone', colN:10, cyc:2, anim:false, long:1000, base:0.5 });
  syncUI();
  document.querySelector('#tvFmt button[data-v="png"]').click();   /* ⚠️ headless は mp4 の器を取りに行けないことがある */
  document.querySelector('#tvSz button[data-v="1080"]').click();
  document.querySelector('#tvFps button[data-v="12"]').click();
  document.querySelector('#tvLoop button[data-v="1"]').click();
  window.__got.length = 0;
});
await new Promise(r => setTimeout(r, 400));
const shown = await p.evaluate(() => document.getElementById('tvSize').textContent);
check(/コマ/.test(shown) && /周/.test(shown), '押す前に 出力・コマ数・秒 が出ている', shown.replace(/\s+/g,' ').trim());
const before6 = await sig();
await p.evaluate(() => document.getElementById('tvGo').click());
for(let i = 0; i < 200; i++){
  const done = await p.evaluate(() => !TV.on && document.getElementById('tvGo').textContent === '動画を出す');
  if(done && i > 2) break;
  await new Promise(r => setTimeout(r, 500));
}
await new Promise(r => setTimeout(r, 1500));
const zip = (await p.evaluate(() => window.__got)).filter(x => /zip/.test(x.type));
check(zip.length === 1 && zip[0].size > 20000, 'ZIP がひとつ落ちた', zip.map(x => Math.round(x.size/1e6)+'MB').join());
check(/PNG連番/.test(await p.evaluate(() => document.getElementById('tvSize').textContent)), '理由つきで止まっていない');
/* 🔴 撮り終わったあと、位相も倍率も元に戻っているか */
const after6 = await p.evaluate(() => ({ PH, RS, on:TV.on }));
check(after6.RS === 1 && after6.PH === 0 && !after6.on, '撮ったあと 位相・倍率が元に戻る', JSON.stringify(after6));
check(await sig() === before6, '撮ったあと絵が元に戻る');

console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ 全部通った');
if(errs) console.log(`🔴 JSエラー ${errs}件`);
await b.close();
process.exit(ng.length || errs ? 1 : 0);
