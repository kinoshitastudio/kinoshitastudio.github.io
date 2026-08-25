/* 貼 HARI 回帰テスト ──
   ①立ち上がって例が版面に載るか／例外が出ていないか
   ②⭐選んでいる間だけ取っ手が出るか（何も選んでいないのに枠が出ると「いつも選ばれている」意味になる）
   ③行を足す・複製・削除と ⌘Z が【一回で】戻るか
   ④版面の大きさが UI に書いた数字どおりに効くか
   ⑤4つの型（積む・巡る・下部・帯）が全部当たるか
   ⑥振る → 振る前に戻す が元に戻るか
   ⑦控え（JSON）の往復
   ⑧PNG が版面の寸法で出るか・1色でないか／SVG に文字が入っているか
   ⑨版面の外を「隠す」にしたら、外にはみ出た分が焼かれないか
   ⑩モバイル幅でページが横に伸びないか／パネルの掴み手が出るか
   ⚠️ 落ちないテストは意味がない。最後に「わざと壊したら落ちるか」の検算あり。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const PORT   = process.env.PORT || 8098;
const TARGET = `http://localhost:${PORT}/hari/index.html`;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if(cond){ pass++; console.log(`  ok   ${name}${extra ? '   ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}   ${extra}`); }
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--window-size=1500,1000'] });
const page = await browser.newPage();
await page.setViewport({ width: 1500, height: 1000 });
const errors = [];
page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
page.on('console', m => {
  if(m.type() === 'error' && !/favicon|404|fonts\.googleapis|gstatic/.test(m.text())) errors.push('console: ' + m.text().slice(0, 200));
});

await page.goto(TARGET, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => typeof stateNow === 'function');
await new Promise(r => setTimeout(r, 700));

const S  = () => page.evaluate(() => JSON.parse(stateNow()));
const px = () => page.evaluate(() => document.getElementById('cv').toDataURL());
/* 盤の画素をざっくり数える（同じか違うかだけ見る） */
const sig = async () => page.evaluate(() => {
  const c = document.getElementById('cv');
  const g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let sum = 0, uniq = new Set();
  for(let i = 0; i < d.length; i += 4 * 401){
    sum = (sum + d[i] * 3 + d[i+1] * 5 + d[i+2] * 7) % 2147483647;
    uniq.add(d[i] + ',' + d[i+1] + ',' + d[i+2]);
  }
  return { sum, uniq: uniq.size };
});
/* ⚠️ 控えは【pointerdown の瞬間】に積まれる（道具側は document の capture で取っている）。
   click() だけを呼ぶと控えが積まれず、⌘Z のテストが【偽で】落ちる。人と同じ順で投げる。 */
const click = id => page.evaluate(i => {
  const el = document.getElementById(i);
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, pointerId:1 }));
  el.click();
}, id);

console.log('\n貼 HARI ──────────────────────────────');

/* ── ① 立ち上がり ── */
let st = await S();
ok('版面に例が載っている', (st.lines || []).length >= 2, `行 ${(st.lines||[]).length}`);
ok('版面の寸法を持っている', st.board && st.board.w > 0 && st.board.h > 0, `${st.board.w}×${st.board.h}`);

/* ── ② 選んでいる間だけ取っ手が出るか ──
   ⭐ 盤の何も無い所を押したら選択が外れ、外れたら盤の絵が変わる（＝取っ手が消える）。
   ⚠️ 絵が1画素も変わらないなら、取っ手は【選択と関係なく描かれている】＝いつも選ばれている意味になる。 */
const withSel = await sig();
const selBefore = (await S()).sel;
await page.evaluate(() => {
  const c = document.getElementById('cv');
  const r = c.getBoundingClientRect();
  /* 版面の外＝ステージの左端。ここには行も図も無い */
  const ev = t => new PointerEvent(t, { bubbles:true, clientX:r.left + 6, clientY:r.top + 6, pointerId:1, button:0, buttons:1 });
  c.dispatchEvent(ev('pointerdown'));
  c.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, clientX:r.left+6, clientY:r.top+6, pointerId:1 }));
});
await new Promise(r => setTimeout(r, 250));
const selAfter = (await S()).sel;
const noSel = await sig();
ok('何も無い所を押すと選択が外れる', JSON.stringify(selBefore) !== JSON.stringify(selAfter) || !selAfter,
   `${JSON.stringify(selBefore)} → ${JSON.stringify(selAfter)}`);
ok('選択を外すと取っ手も消える（絵が変わる）', withSel.sum !== noSel.sum,
   withSel.sum === noSel.sum ? '選択の有無で盤が1画素も変わらない＝取っ手が常に出ている' : '');

/* ── ③ 行を足す・消す・⌘Z ── */
await page.reload({ waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 600));
const n0 = (await S()).lines.length;
await click('addLine'); await new Promise(r => setTimeout(r, 200));
const n1 = (await S()).lines.length;
ok('「行を足す」で行が増える', n1 === n0 + 1, `${n0} → ${n1}`);
await click('dupLine'); await new Promise(r => setTimeout(r, 200));
const n2 = (await S()).lines.length;
ok('「複製」で行が増える', n2 === n1 + 1, `${n1} → ${n2}`);
await click('delLine'); await new Promise(r => setTimeout(r, 200));
const n3 = (await S()).lines.length;
ok('「削除」で行が減る', n3 === n2 - 1, `${n2} → ${n3}`);
/* ⚠️ page.keyboard の Meta+z は OS 側に取られて届かないことがある。
   道具は window の keydown を見ているので、そこへ直接投げる（人が押したのと同じ道）。 */
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key:'z', metaKey:true, bubbles:true })));
await new Promise(r => setTimeout(r, 300));
const n4 = (await S()).lines.length;
ok('⌘Z 一回で消した行が戻る', n4 === n2, `${n3} → ${n4}（${n2} に戻るはず）`);

/* ── ④ 版面の大きさは UI に書いた数字どおりか ── */
await page.reload({ waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 600));
await page.evaluate(() => {
  const w = document.getElementById('bw'), h = document.getElementById('bh');
  w.value = 800; w.dispatchEvent(new Event('input', { bubbles:true }));
  h.value = 600; h.dispatchEvent(new Event('input', { bubbles:true }));
});
await new Promise(r => setTimeout(r, 350));
const b2 = (await S()).board;
ok('版面の大きさが打った数字どおりになる', b2.w === 800 && b2.h === 600, `実測 ${b2.w}×${b2.h} / 打った 800×600`);

/* ── ⑤ 4つの型 ── */
await page.reload({ waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 600));
const shots = {};
for(const id of ['preTsumu','preMeguru','preShita','preObi']){
  await click(id); await new Promise(r => setTimeout(r, 400));
  shots[id] = await sig();
}
const vals = Object.values(shots).map(s => s.sum);
ok('4つの型が全部当たる（どれも同じ絵にならない）', new Set(vals).size === 4,
   `違う絵 ${new Set(vals).size}/4`);
ok('どの型も白紙にならない', Object.values(shots).every(s => s.uniq > 3),
   Object.entries(shots).map(([k,v]) => `${k}:${v.uniq}色`).join(' '));

/* ── ⑥ 振る → 振る前に戻す ── */
await page.reload({ waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 600));
const beforeShuf = JSON.stringify((await S()).lines);
await click('shufAll'); await new Promise(r => setTimeout(r, 450));
const afterShuf = JSON.stringify((await S()).lines);
ok('「ぜんぶ振る」で組みが変わる', beforeShuf !== afterShuf);
await click('shufBack'); await new Promise(r => setTimeout(r, 450));
const backShuf = JSON.stringify((await S()).lines);
ok('「振る前に戻す」で元に戻る', backShuf === beforeShuf,
   backShuf === beforeShuf ? '' : '戻したのに振る前と違う');

/* ── ⑦ 控えの往復 ── */
await page.reload({ waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 600));
const round = await page.evaluate(async () => {
  const before = stateNow();
  applyPreset('obi');                      /* 中身を変えてから */
  await new Promise(r => setTimeout(r, 300));
  const changed = stateNow();
  applyStateStr(before);                   /* 控えを戻す */
  await new Promise(r => setTimeout(r, 300));
  return { before, changed, after: stateNow() };
});
ok('控えを当てると中身が変わる', round.before !== round.changed);
ok('控えの往復で元に戻る', round.before === round.after,
   round.before === round.after ? '' : '戻したのに控えと違う');

/* ── ⑧ 書き出し ── */
await page.reload({ waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 700));
const out = await page.evaluate(async () => {
  const rc = HTMLAnchorElement.prototype.click;
  const grabbed = {};
  HTMLAnchorElement.prototype.click = function(){ if(this.download) grabbed[/svg/i.test(this.download) ? 'svg' : 'png'] = this.href; };
  document.getElementById('ePNG').click();
  await new Promise(r => setTimeout(r, 1400));
  document.getElementById('eSVG').click();
  await new Promise(r => setTimeout(r, 900));
  HTMLAnchorElement.prototype.click = rc;

  const st = JSON.parse(stateNow());
  const res = { board: st.board, png: null, svg: null };
  if(grabbed.png){
    const im = new Image();
    await new Promise((y, n) => { im.onload = y; im.onerror = n; im.src = grabbed.png; });
    const cv = document.createElement('canvas');
    cv.width = im.width; cv.height = im.height;
    const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, im.width, im.height).data;
    const uniq = new Set();
    for(let i = 0; i < d.length; i += 4 * 197) uniq.add(d[i] + ',' + d[i+1] + ',' + d[i+2]);
    res.png = { w: im.width, h: im.height, uniq: uniq.size };
  }
  if(grabbed.svg){
    /* ⚠️ dl() は Blob URL（blob:...）で落とす。data URL ではないので atob できない。 */
    const txt = await (await fetch(grabbed.svg)).text();
    res.svg = { len: txt.length, hasText: /<text|<path|<tspan/.test(txt) };
  }
  return res;
});
ok('PNG が出る', !!out.png, out.png ? `${out.png.w}×${out.png.h}` : '出なかった');
if(out.png){
  const ratio = out.png.w / out.board.w;
  ok('PNG の縦横比が版面と合っている',
     Math.abs(out.png.h / out.board.h - ratio) < 0.02,
     `版面 ${out.board.w}×${out.board.h} / PNG ${out.png.w}×${out.png.h}`);
  ok('PNG に絵が入っている（1色でない）', out.png.uniq > 4, `色 ${out.png.uniq} 種`);
}
ok('SVG が出て、中に字か形が入っている', !!(out.svg && out.svg.hasText),
   out.svg ? `${out.svg.len} 字` : '出なかった');

/* ── ⑨ 版面の外を隠す ──
   ⭐ 「隠す」にしたら、版面からはみ出た分は焼かれない。
   ⚠️ ここが効いていないと、仕上がりに出ないものが画面には見えている＝画面が嘘をつく。 */
const clip = await page.evaluate(async () => {
  const read = () => {
    const c = document.getElementById('cv'), g = c.getContext('2d');
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let s = 0; for(let i = 0; i < d.length; i += 4 * 401) s = (s + d[i]*3 + d[i+1]*5 + d[i+2]*7) % 2147483647;
    return s;
  };
  const btns = [...document.querySelectorAll('#segGhost button')].map(b => b.textContent.trim());
  const hit = t => [...document.querySelectorAll('#segGhost button')].find(b => b.textContent.trim() === t);
  const a = hit('薄く見せる'), b = hit('隠す');
  if(!a || !b) return { btns, ok: false, why: 'ボタンが見つからない' };
  a.click(); await new Promise(r => setTimeout(r, 350)); const s1 = read();
  b.click(); await new Promise(r => setTimeout(r, 350)); const s2 = read();
  return { btns, ok: s1 !== s2, s1, s2 };
});
ok('版面の外「薄く見せる／隠す」で絵が変わる', clip.ok,
   clip.ok ? '' : (clip.why || `どちらでも同じ絵（${clip.s1} / ${clip.s2}）`));

/* ── ⑩ モバイル ── */
await page.setViewport({ width: 430, height: 932, isMobile: true, hasTouch: true });
await page.reload({ waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 900));
const mob = await page.evaluate(() => {
  const over = [...document.querySelectorAll('body *')].filter(e => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.right > innerWidth + 2 && getComputedStyle(e).position !== 'fixed';
  }).map(e => (e.id ? '#' + e.id : e.tagName.toLowerCase()) + ' right=' + Math.round(e.getBoundingClientRect().right));
  return { scrollW: document.documentElement.scrollWidth, inner: innerWidth,
           grip: !!document.getElementById('sheetGrip'),
           touchAction: getComputedStyle(document.getElementById('cv')).touchAction,
           over: over.slice(0, 5) };
});
ok('モバイルで横に伸びない', mob.scrollW <= mob.inner + 2, `scrollWidth ${mob.scrollW} / 画面 ${mob.inner}${mob.over.length ? ' はみ出し:' + mob.over.join(' ') : ''}`);
ok('モバイルでパネルの掴み手が出る', mob.grip);
ok('盤を引いてもページが動かない（touch-action:none）', /none/.test(mob.touchAction), `実測 ${mob.touchAction}`);

/* ── 検算：わざと壊したら落ちるか ──
   ⚠️ 盤の画素で見ている項目が【本当に絵を見ているか】。行を1本消して絵が変わることを確かめる。 */
await page.setViewport({ width: 1500, height: 1000 });
await page.reload({ waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 700));
const guard = await page.evaluate(async () => {
  const read = () => {
    const c = document.getElementById('cv'), g = c.getContext('2d');
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let s = 0; for(let i = 0; i < d.length; i += 4 * 401) s = (s + d[i]*3 + d[i+1]*5 + d[i+2]*7) % 2147483647;
    return s;
  };
  const a = read();
  const st = JSON.parse(stateNow());
  st.lines = st.lines.slice(0, 1);
  applyStateStr(JSON.stringify(st));
  await new Promise(r => setTimeout(r, 400));
  return { changed: a !== read() };
});
ok('検算：行を減らせば絵も変わる（画素を実際に見ている）', guard.changed,
   guard.changed ? '' : '行を減らしても盤が同じ＝絵を見ていない');

ok('実行中に例外が出ていない', errors.length === 0, errors.slice(0, 3).join(' / '));

console.log(`\n  ${pass} 通過 / ${fail} 失敗\n`);
await browser.close();
process.exit(fail ? 1 : 0);
