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

/* ── ③b 隠す ── 画面から消えるだけでなく【書き出しにも入らない】か ──
   ⚠️ ここが片方だけだと、画面と刷り上がりが違う＝版下として使えない。 */
await page.reload({ waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 700));
const hid = await page.evaluate(async () => {
  const cv = document.getElementById('cv'), g = cv.getContext('2d', { willReadFrequently:true });
  const sig = () => { const d = g.getImageData(0,0,cv.width,cv.height).data; let s=0;
    for(let i=0;i<d.length;i+=4*97) s=(s+d[i]*3+d[i+1]*5+d[i+2]*7)%2147483647; return s; };
  const png = async () => {
    const rc = HTMLAnchorElement.prototype.click; let u='';
    HTMLAnchorElement.prototype.click = function(){ if(this.download && !/svg/i.test(this.download)) u=this.href; };
    document.getElementById('ePNG').click();
    await new Promise(r => setTimeout(r, 1600));
    HTMLAnchorElement.prototype.click = rc;
    const im = new Image();
    await new Promise((y,n) => { im.onload=y; im.onerror=n; im.src=u; });
    const c2 = document.createElement('canvas'); c2.width=im.width; c2.height=im.height;
    const g2 = c2.getContext('2d'); g2.drawImage(im,0,0);
    const d = g2.getImageData(0,0,im.width,im.height).data; let s=0;
    for(let i=0;i<d.length;i+=4*197) s=(s+d[i]*3+d[i+1]*5)%2147483647; return s;
  };
  const eyes = document.querySelectorAll('#lineList .li:not(.kami) .hd');
  if(!eyes.length) return { なし:true };
  const a = sig(), pa = await png();
  eyes[0].click(); await new Promise(r => setTimeout(r, 350));
  const b = sig(), pb = await png();
  eyes[0].click(); await new Promise(r => setTimeout(r, 350));
  return { 目の数:eyes.length, 画面が変わる:a!==b, 書き出しも変わる:pa!==pb };
});
ok('レイヤーごとに隠すボタンがある', !hid.なし && hid.目の数 > 0, '目 ' + (hid.目の数||0) + ' 個');
ok('隠すと画面から消える', !!hid.画面が変わる);
ok('🔴 隠したものは書き出しにも入らない', !!hid.書き出しも変わる,
   hid.書き出しも変わる ? '' : '画面では消えたのに PNG には焼かれている＝版下として使えない');

/* ── ③c 矢印キーで 1px（⇧ で 10px）──
   ⭐ 置き方で座標の持ち方が違う（張る/並ぶは％・沿うは点）。どれでも版面の1pxで動くこと。 */
const nudge = await page.evaluate(async () => {
  const kd = (k, sh) => window.dispatchEvent(new KeyboardEvent('keydown', { key:k, shiftKey:!!sh, bubbles:true }));
  const kind = t => [...document.querySelectorAll('#segKind button')].find(x => x.textContent.trim() === t);
  const cur = () => { const s = JSON.parse(stateNow()); return s.lines[s.sel.i]; };
  const out = {};
  for(const t of ['沿う','張る','並ぶ']){
    kind(t).click(); await new Promise(r => setTimeout(r, 350));
    const a = JSON.stringify(cur());
    kd('ArrowRight'); kd('ArrowDown');
    await new Promise(r => setTimeout(r, 250));
    out[t] = a !== JSON.stringify(cur());
  }
  kind('張る').click(); await new Promise(r => setTimeout(r, 300));
  const W = JSON.parse(stateNow()).board.w;
  const x = () => cur().box.x;
  const x0 = x(); kd('ArrowRight'); await new Promise(r => setTimeout(r, 200)); const x1 = x();
  kd('ArrowRight', true); await new Promise(r => setTimeout(r, 200)); const x2 = x();
  out.px1  = +((x1-x0)/100*W).toFixed(2);
  out.px10 = +((x2-x1)/100*W).toFixed(2);
  return out;
});
ok('矢印キーが3つの置き方すべてで効く', nudge['沿う'] && nudge['張る'] && nudge['並ぶ'],
   JSON.stringify({ 沿う:nudge['沿う'], 張る:nudge['張る'], 並ぶ:nudge['並ぶ'] }));
ok('矢印1回で版面の 1px 動く', Math.abs(nudge.px1 - 1) < 0.02, '実測 ' + nudge.px1 + 'px');
ok('⇧＋矢印で 10px 動く',      Math.abs(nudge.px10 - 10) < 0.2, '実測 ' + nudge.px10 + 'px');

/* ── ③d レイヤーを掴んで並べ替え ──
   🔴 いちばんまずい間違え方は【上下が逆になる】こと（一覧は「手前が上」の逆順で出している）。
      「上へ動かしたのに奥へ行った」は、動かないことより悪い。だから順の一致を必ず見る。 */
await page.reload({ waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 700));
const ord = await page.evaluate(async () => {
  /* 3行にして、見分けのつく名前を付ける */
  const add = () => { const b = document.getElementById('addLine');
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, pointerId:1 })); b.click(); };
  add(); await new Promise(r => setTimeout(r, 250));
  const s0 = JSON.parse(stateNow());
  s0.lines.forEach((l, i) => l.text = 'LINE' + i);
  applyStateStr(JSON.stringify(s0));
  await new Promise(r => setTimeout(r, 300));
  /* ⚠️ 紙（`.li.kami`）は作品の行ではないので数えない（2026-08-27 に一覧へ出した） */
  const names = () => [...document.querySelectorAll('#lineList .li:not(.kami) .t')].map(x => x.textContent.trim());
  const before = names();
  /* いちばん下の行を、いちばん上まで引き上げる */
  const rows = [...document.querySelectorAll('#lineList .li:not(.kami)')];
  const last = rows[rows.length-1], first = rows[0];
  const rb = last.getBoundingClientRect(), fb = first.getBoundingClientRect();
  last.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, clientY:rb.top+rb.height/2, clientX:rb.left+40, pointerId:1 }));
  for(let y = rb.top; y > fb.top - 8; y -= 8){
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles:true, clientY:y, clientX:rb.left+40, pointerId:1 }));
    await new Promise(z => setTimeout(z, 6));
  }
  document.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, pointerId:1 }));
  await new Promise(r => setTimeout(r, 400));
  const after = names();
  /* 一覧の並び（手前が上）と、z の大きい順が一致するか */
  const s = JSON.parse(stateNow());
  const byZ = s.lines.map(l => ({ t:(l.text||'').trim(), z:l.z }))
                     .sort((a,b) => b.z - a.z).map(x => x.t);
  return { before, after, byZ,
           一致: JSON.stringify(after) === JSON.stringify(byZ),
           動いた: JSON.stringify(before) !== JSON.stringify(after) };
});
ok('一覧を掴んで並べ替えられる', ord.動いた, ord.before + ' → ' + ord.after);
ok('🔴 並べ替えても【一覧の上＝版面の手前】が保たれる', ord.一致,
   ord.一致 ? '' : '一覧 ' + JSON.stringify(ord.after) + ' / 手前から ' + JSON.stringify(ord.byZ) + '＝上下が逆');

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

/* ── ④b 地のグラデ ── ストップで【位置】が効くか ──
   🔴 木下＝「グラデの色数を増やしても黄色などが反映されていない」→ 色数のつまみを
      ストップのバーに替えた。⭐ いちばん大事なのは【位置が絵に効く】こと
      （今までは何色置いても必ず等間隔だった）。 */
await page.reload({ waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 700));
const grad = await page.evaluate(async () => {
  const cv = document.getElementById('cv'), g = cv.getContext('2d', { willReadFrequently:true });
  const sig = () => { const d = g.getImageData(0,0,cv.width,cv.height).data; let s=0;
    for(let i=0;i<d.length;i+=4*97) s=(s+d[i]*3+d[i+1]*5+d[i+2]*7)%2147483647; return s; };
  const seg = t => [...document.querySelectorAll('#segBg button')].find(x => x.textContent.trim() === t).click();
  seg('グラデ'); await new Promise(r => setTimeout(r, 400));
  const o = { バー: !!document.getElementById('stopBar') };
  document.getElementById('stopAdd').click(); await new Promise(r => setTimeout(r, 300));
  o.足せる = JSON.parse(stateNow()).board.stops.length >= 3;
  const cols = [...document.querySelectorAll('#stopList input[type=color]')];
  const a = sig();
  cols[1].value = '#f2f200'; cols[1].dispatchEvent(new Event('input', { bubbles:true }));
  await new Promise(r => setTimeout(r, 300));
  o.色が効く = sig() !== a;
  const nums = [...document.querySelectorAll('#stopList input[type=number]')];
  nums[1].value = '5';  nums[1].dispatchEvent(new Event('input', { bubbles:true }));
  await new Promise(r => setTimeout(r, 300)); const at5 = sig();
  nums[1].value = '95'; nums[1].dispatchEvent(new Event('input', { bubbles:true }));
  await new Promise(r => setTimeout(r, 300)); const at95 = sig();
  o.位置が効く = at5 !== at95;
  const e1 = sig(); document.getElementById('stopEven').click();
  await new Promise(r => setTimeout(r, 300)); o.均等 = sig() !== e1;
  const e2 = sig(); document.getElementById('stopFlip').click();
  await new Promise(r => setTimeout(r, 300)); o.反転 = sig() !== e2;
  const e3 = sig(); document.querySelector('[data-bgp="yuu"]').click();
  await new Promise(r => setTimeout(r, 400)); o.配色の型 = sig() !== e3;
  seg('単色'); await new Promise(r => setTimeout(r, 300));
  o.単色で隠れる = getComputedStyle(document.getElementById('bgStopUI')).display === 'none';
  return o;
});
ok('地のグラデにストップのバーがある', grad.バー);
ok('色を足せる', grad.足せる);
ok('ストップの色が絵に効く', grad.色が効く);
ok('🔴 ストップの【位置】が絵に効く', grad.位置が効く,
   grad.位置が効く ? '' : '位置を 5%→95% にしても絵が同じ＝等間隔のまま＝置いた通りにならない');
ok('「均等」で並びが変わる', grad.均等);
ok('「⇄」で反転する', grad.反転);
ok('配色の型を押すと地が変わる', grad.配色の型);
ok('単色にするとバーが隠れる', grad.単色で隠れる);

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
