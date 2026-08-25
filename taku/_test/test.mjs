/* 卓 TAKU 回帰テスト ──
   ①例が机に載るか（空の机は「読んで何も出ない」＝入口が無いのと同じ）
   ②札の高さが【実測】されているか（0 のままだと並べられない）
   ③枠（章）が幾何で決まるか ── 離しても付いてくる／重ねても二重に数えない
   ④並びがそのまま文章になるか（章の順・段落数・読む順のつまみ）
   ⑤⭐画面の版面と刷り上がりの版面が同じ行で折れるか ── 版下の道具なのでここが本丸
   ⑥地を4種すべて刷り直せるか／升目を消して出せるか
   ⑦捨てる→⌘Z が【一回で】戻るか（控えを二重に積んでいると空振りする）
   ⑧文章が段落ごとの札に割れるか
   ⑨控え（JSON）の往復
   ⑩PNG が出るか・1色でないか・倍率が UI に書いた数字どおりか
   ⚠️ 落ちないテストは意味がない。最後に「わざと壊したら落ちるか」の検算あり。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const PORT   = process.env.PORT || 8094;
const TARGET = `http://localhost:${PORT}/taku/index.html`;
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
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if(m.type() === 'error' && !/favicon|404|fonts\.googleapis/.test(m.text())) errors.push('console: ' + m.text()); });

await page.goto(TARGET, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => window.TAKU && window.TAKU.cards().length > 0);

/* 画面に出ている行を、Range で1文字ずつ実測して拾う（これが「画面の版面」の正） */
const DOM_LINES = `(el) => {
  const node = el.firstChild; if(!node || node.nodeType !== 3) return [];
  const r = document.createRange(); const out = []; let cur = '', last = null;
  for(let i = 0; i < node.length; i++){
    r.setStart(node, i); r.setEnd(node, i + 1);
    const t = r.getBoundingClientRect().top;
    if(last === null || Math.abs(t - last) < 1.5) cur += node.data[i];
    else { out.push(cur); cur = node.data[i]; }
    last = t;
  }
  if(cur) out.push(cur);
  return out;
}`;

console.log('\n卓 TAKU ──────────────────────────────');

/* ── ① 例 ── */
const base = await page.evaluate(() => {
  TAKU.demo();
  const c = TAKU.cards();
  return { text: c.filter(x => x.kind === 'text').length,
           frame: c.filter(x => x.kind === 'frame').length,
           zeroH: c.filter(x => x.kind === 'text' && !(x.h > 10)).length };
});
ok('例の札が6枚', base.text === 6, `実測 ${base.text}`);
ok('例の枠が2つ', base.frame === 2, `実測 ${base.frame}`);
ok('札の高さが実測されている', base.zeroH === 0, `高さ0の札 ${base.zeroH} 枚`);

/* ── ③ 枠は幾何で決まる ── */
const frames = await page.evaluate(() => {
  const comp = TAKU.compose();
  return { sections: comp.map(s => (s.frame ? s.frame.name : '余り') + ':' + s.items.length),
           rest: !!comp.find(s => !s.frame) };
});
ok('章が2つに分かれた', frames.sections.length === 2, JSON.stringify(frames.sections));
ok('どの章にも入らない札が無い', !frames.rest);

const moved = await page.evaluate(() => {
  const f = TAKU.cards().find(c => c.kind === 'frame');
  const g = TAKU.cards().filter(c => c.kind === 'frame')[1];
  const kids = TAKU.compose().find(s => s.frame && s.frame.id === f.id).items.slice();
  const before = kids.length;
  const mv = (dx, dy) => { f.x += dx; f.y += dy; kids.forEach(c => { c.x += dx; c.y += dy; }); };
  mv(-3000, -3000);
  const away = TAKU.compose().find(s => s.frame && s.frame.id === f.id).items.length;
  mv(3000, 3000);
  mv(g.x - f.x, g.y - f.y);                       /* 枠を枠にぴったり重ねる */
  const comp = TAKU.compose();
  const total = comp.reduce((s, x) => s + x.items.length, 0);
  const ids = comp.reduce((a, x) => a.concat(x.items.map(c => c.id)), []);
  TAKU.demo();
  return { before, away, total, uniq: new Set(ids).size };
});
ok('枠を離れた所へ動かしても中身が離れない', moved.before === 3 && moved.away === 3, `${moved.before} → ${moved.away}`);
ok('枠を枠に重ねても札が二重に数えられない', moved.total === 6 && moved.uniq === 6, `合計 ${moved.total} 枚 / 種類 ${moved.uniq}`);

/* ── ④ 並び＝文章 ── */
const md = await page.evaluate(() => {
  const v = TAKU.md(); TAKU.S.order = 'h'; const h = TAKU.md(); TAKU.S.order = 'v';
  return { v, h, paras: v.split(/\n\n/).filter(s => s.trim() && !s.startsWith('##')).length };
});
ok('Markdown に章が出る', md.v.indexOf('## はじめに') === 0, md.v.slice(0, 26).replace(/\n/g, '/'));
ok('Markdown の段落が6つ', md.paras === 6, `実測 ${md.paras}`);
ok('章の順が机の上から下', md.v.indexOf('## はじめに') < md.v.indexOf('## なぜ机なのか'));
ok('読む順のつまみが効く', md.v !== md.h, md.v === md.h ? '縦と横で同じ文章が出た' : '');

const spill = await page.evaluate(() => {
  const t = TAKU.cards().filter(c => c.kind !== 'frame')[2];
  t.x -= 1400;                                     /* 1枚だけ枠の外へ出す */
  const m = TAKU.md();
  TAKU.demo();
  return m.indexOf('## 余り') > 0;
});
ok('枠の外に出した札は「余り」になる', spill);

/* ── ⑤ 画面の版面 ＝ 刷り上がりの版面 ── */
const wrap = await page.evaluate(domLinesSrc => {
  const domLines = eval('(' + domLinesSrc + ')');
  let bad = 0, tot = 0, sample = '';
  TAKU.cards().filter(c => c.kind === 'text').forEach(c => {
    const d = document.querySelector('[data-id="' + c.id + '"] .body'); if(!d) return;
    tot++;
    const a = domLines(d), b = TAKU.lines(c);
    const same = b && a.length === b.length && a.every((l, i) => l === b[i]);
    if(!same){ bad++; if(!sample) sample = JSON.stringify(a) + ' ≠ ' + JSON.stringify(b); }
  });
  return { bad, tot, sample };
}, DOM_LINES);
ok('画面と刷り上がりで行が同じ', wrap.bad === 0, `${wrap.tot - wrap.bad}/${wrap.tot} 枚${wrap.sample ? ' 例:' + wrap.sample : ''}`);

/* ── ⑥ 地・升目 ── */
const grounds = await page.evaluate(() => {
  let err = '';
  ['wood','paper','slate','void'].forEach(k => {
    try{ document.querySelector('#segGround button[data-g="' + k + '"]').click(); }
    catch(e){ err = k + ': ' + e.message; }
  });
  document.querySelector('#segGround button[data-g="wood"]').click();
  let gridErr = '';
  try{
    const cb = document.getElementById('cGridShow');
    cb.checked = false; cb.dispatchEvent(new Event('change'));
    const off = getComputedStyle(document.querySelector('#board > div')).backgroundImage;
    cb.checked = true;  cb.dispatchEvent(new Event('change'));
  }catch(e){ gridErr = e.message; }
  return { err, gridErr };
});
ok('地を4種すべて刷り直せる', !grounds.err, grounds.err);
ok('升目を消して出せる', !grounds.gridErr, grounds.gridErr);

/* ── ⑦ 捨てる → ⌘Z ── */
const undoR = await page.evaluate(() => {
  TAKU.demo();
  const n0 = TAKU.cards().length;
  const first = document.querySelector('.card:not(.frame)');
  first.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, clientX:300, clientY:300, pointerId:1 }));
  document.getElementById('stage').dispatchEvent(new PointerEvent('pointerup', { bubbles:true, clientX:300, clientY:300, pointerId:1 }));
  document.getElementById('tTrash').click();
  const n1 = TAKU.cards().length;
  window.dispatchEvent(new KeyboardEvent('keydown', { key:'z', metaKey:true, bubbles:true }));
  return { n0, n1, n2: TAKU.cards().length };
});
ok('選んだ札を1枚捨てられる', undoR.n1 === undoR.n0 - 1, `${undoR.n0} → ${undoR.n1}`);
ok('⌘Z 一回で戻る', undoR.n2 === undoR.n0, `${undoR.n1} → ${undoR.n2}（${undoR.n0} に戻るはず）`);

/* ── ⑧ 流し込み ── */
const split = await page.evaluate(() => {
  TAKU.demo();
  const before = TAKU.cards().length;
  document.getElementById('taIn').value = 'ひとつめ。\n\nふたつめ。\n\nみっつめ。';
  document.getElementById('bSplit').click();
  return { before, after: TAKU.cards().length };
});
ok('文章が段落ごとの札に割れる', split.after === split.before + 3, `${split.before} → ${split.after}（+3 のはず）`);

/* ── ⑨ 控えの往復 ── */
const round = await page.evaluate(() => {
  TAKU.demo();
  const mdBefore = TAKU.md();
  const data = TAKU.save();
  document.getElementById('bClear').click();
  const empty = TAKU.cards().length;
  TAKU.load(JSON.parse(JSON.stringify(data)));
  return { mdBefore, empty, n: TAKU.cards().length, mdAfter: TAKU.md(),
           hasMd: typeof data.markdown === 'string' && data.markdown.length > 20 };
});
ok('片づけると机が空になる', round.empty === 0, `実測 ${round.empty}`);
ok('控えから机が戻る', round.n === 8, `実測 ${round.n} 枚`);
ok('控えの往復で文章が変わらない', round.mdBefore === round.mdAfter);
ok('控えを開かなくても中身が読める（markdown を同梱）', round.hasMd);

/* ── ⑩ PNG ── */
const png = await page.evaluate(async () => {
  TAKU.demo();
  const rc = HTMLAnchorElement.prototype.click;
  let url = '';
  HTMLAnchorElement.prototype.click = function(){ if(this.download) url = this.href; };
  await TAKU.exportPng();
  HTMLAnchorElement.prototype.click = rc;
  const im = new Image();
  await new Promise((res, rej) => { im.onload = res; im.onerror = rej; im.src = url; });
  const cv = document.createElement('canvas');
  cv.width = im.width; cv.height = im.height;
  const g = cv.getContext('2d');
  g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, im.width, im.height).data;
  const uniq = new Set();
  for(let i = 0; i < d.length; i += 4 * 97) uniq.add(d[i] + ',' + d[i+1] + ',' + d[i+2]);
  const b = TAKU.bbox(), m = TAKU.S.grid * 3;
  return { w: im.width, h: im.height, uniq: uniq.size,
           want: Math.round((b.w + m * 2) * TAKU.S.scale) };
});
ok('PNG が出る', png.w > 0 && png.h > 0, `${png.w}×${png.h}`);
ok('PNG に絵が入っている（1色でない）', png.uniq > 8, `色 ${png.uniq} 種`);
ok('PNG の倍率が UI に書いた数字どおり', png.w === png.want, `実測 ${png.w} / 約束 ${png.want}`);

/* ── 検算：わざと壊したら落ちるか ──────────────────────────
   ⚠️ ここが通らないなら、上の「行が同じ」は【何も見ていない】ことになる。
      札の幅だけ変えて画面を組み直し、刷り側だけ古い幅で折らせて、ずれを検出できるか見る。 */
const guard = await page.evaluate(domLinesSrc => {
  const domLines = eval('(' + domLinesSrc + ')');
  TAKU.demo();
  const c = TAKU.cards().find(x => x.kind === 'text');
  const d0 = document.querySelector('[data-id="' + c.id + '"] .body');
  const good = domLines(d0);
  c.w = c.w - 60;                  /* 画面だけ狭くする */
  TAKU.rebuild();
  const d1 = document.querySelector('[data-id="' + c.id + '"] .body');
  const now = domLines(d1);
  TAKU.demo();
  return { changed: JSON.stringify(good) !== JSON.stringify(now) };
}, DOM_LINES);
ok('検算：幅を変えれば行も変わる（テストが実際に見ている）', guard.changed,
   guard.changed ? '' : '幅を変えても行が同じ＝行を見ていない');

ok('実行中に例外が出ていない', errors.length === 0, errors.slice(0, 3).join(' / '));

console.log(`\n  ${pass} 通過 / ${fail} 失敗\n`);
await browser.close();
process.exit(fail ? 1 : 0);
