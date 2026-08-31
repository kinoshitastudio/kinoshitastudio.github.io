/* ============================================================
   セクションを「オートレイアウトで建て直す」ために実測する道具

   使い方:
     node tools/kinoshita/measure-sec.mjs "<URL>" <section番号|all> [幅=1440]
   例:
     node tools/kinoshita/measure-sec.mjs "https://www.uniform-net.jp/" 1
     node tools/kinoshita/measure-sec.mjs "https://www.uniform-net.jp/" all   # ⭐ブラウザ1回で全部

   出す物（tools/kinoshita/_out/ に置く）:
     sec<N>.json  … 入れ子・flex/grid・余白・角丸・線・影・写真URL・文字と書体
     sec<N>.png   … そのセクションの2倍スクショ（見て確かめる用）

   🔴 ここがキモ ── 丸写しでは落ちる物を拾う:
     - ::before / ::after（矢印・丸・帯は疑似要素のことが多い。DOMには出ない）
     - <br> は display を見てから改行にする（pc_hidden 等は PC で消える＝偽の改行を作らない）
     - 背景 transparent は親をさかのぼって実際の色を取る
     - flex/grid の gap・justify・align（＝そのまま layout に写せる）
   ============================================================ */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '_out');
fs.mkdirSync(OUT, { recursive: true });

const URL_ = process.argv[2];
const ARG = String(process.argv[3] ?? '0');
const W = Number(process.argv[4] ?? 1440);
if (!URL_) { console.error('使い方: node measure-sec.mjs "<URL>" <section番号|all> [幅=1440]'); process.exit(1); }

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: W, height: 900, deviceScaleFactor: 2 });
await p.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
await p.goto(URL_, { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 3000));
// ⚠️ 全部スクロールしてから測る（opacity:0 でスクロールに合わせて現れる物を落とさない）
await p.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 160)); }
  window.scrollTo(0, 0);
});
await new Promise(r => setTimeout(r, 2000));

const secs = await p.$$('section');
const IDX = ARG === 'all' ? secs.map((_, i) => i) : [Number(ARG)];
if (IDX.some(i => !secs[i])) { console.error(`その section が無い（このページの section は ${secs.length} 個）`); await b.close(); process.exit(1); }
console.log(`section ${secs.length} 個 / 測るのは ${IDX.length} 個\n`);

const measure = (SEC) => p.evaluate((SEC) => {
  const sec = document.querySelectorAll('section')[SEC];
  const S = sec.getBoundingClientRect();
  const px = v => Math.round(parseFloat(v) || 0);
  // br/span/em/b/strong/a だけの子なら「葉＝文字」として扱う（<br> 入りの見出しを落とさない）
  const LEAFISH = new Set(['BR', 'SPAN', 'EM', 'B', 'STRONG', 'A', 'I', 'SUP', 'SUB', 'SMALL']);
  const isLeafText = el => el.childElementCount === 0
    || [...el.children].every(c => LEAFISH.has(c.tagName) && c.childElementCount === 0);
  // 🔴 <br> は display:none なら改行にしない
  const txt = el => {
    let s = '';
    const rec = n => {
      if (n.nodeType === 3) s += n.nodeValue;
      else if (n.tagName === 'BR') s += (getComputedStyle(n).display === 'none' ? '' : '\n');
      else [...n.childNodes].forEach(rec);
    };
    rec(el);
    return s.replace(/[ \t]+/g, ' ').replace(/\n /g, '\n').trim();
  };
  const bgUp = el => { let n = el; while (n && n !== document.documentElement) { const c = getComputedStyle(n).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; n = n.parentElement; } return 'none'; };

  const rows = [];
  const walk = (el, d) => {
    if (d > 8) return;
    const r = el.getBoundingClientRect(), c = getComputedStyle(el);
    if (r.width < 2 || r.height < 2) return;
    const o = {
      d, tag: el.tagName.toLowerCase(),
      cls: (typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
      x: Math.round(r.left - S.left), y: Math.round(r.top - S.top), w: Math.round(r.width), h: Math.round(r.height)
    };
    if (c.display === 'flex') o.flex = `${c.flexDirection} gap:${c.gap} just:${c.justifyContent} align:${c.alignItems} wrap:${c.flexWrap}`;
    if (c.display === 'grid') o.grid = `cols:${c.gridTemplateColumns} gap:${c.gap}`;
    if (!/rgba\(0, 0, 0, 0\)/.test(c.backgroundColor)) o.bg = c.backgroundColor;
    if (c.backgroundImage !== 'none') o.bgimg = c.backgroundImage.slice(0, 160);
    const rad = [c.borderTopLeftRadius, c.borderTopRightRadius, c.borderBottomRightRadius, c.borderBottomLeftRadius];
    if (rad.some(v => parseFloat(v) > 0)) o.radius = rad.join('/');
    if (parseFloat(c.borderTopWidth) > 0 || parseFloat(c.borderLeftWidth) > 0) o.border = `${c.borderTopWidth} ${c.borderTopStyle} ${c.borderTopColor}`;
    if (c.boxShadow !== 'none') o.shadow = c.boxShadow;
    if (c.opacity !== '1') o.opacity = c.opacity;
    if (c.transform !== 'none') o.transform = c.transform;
    if (c.clipPath !== 'none') o.clip = c.clipPath;   // ⚠️ 斜めカットは自動では出せない＝ベクターを描く
    const pad = [c.paddingTop, c.paddingRight, c.paddingBottom, c.paddingLeft].map(px);
    if (pad.some(v => v)) o.pad = pad.join(' ');
    if (el.tagName === 'IMG') { o.src = el.currentSrc || el.src; o.natural = el.naturalWidth + 'x' + el.naturalHeight; o.fit = c.objectFit; }
    if (el.tagName === 'svg') o.svg = el.outerHTML.slice(0, 800);
    if (isLeafText(el)) {
      const t = txt(el);
      if (t) { o.text = t; o.font = `${px(c.fontSize)}/${px(c.lineHeight)} w${c.fontWeight} ls:${c.letterSpacing} ${c.color} ${c.fontFamily.split(',')[0]} ta:${c.textAlign}`; }
    }
    rows.push(o);
    if (el.tagName !== 'svg') [...el.children].forEach(ch => walk(ch, d + 1));
  };
  walk(sec, 0);

  // 🔴 疑似要素＝矢印・丸・帯。DOMに出ないので別に拾う（left/top も返る＝位置が決まる）
  const pseudo = [];
  sec.querySelectorAll('*').forEach(el => {
    ['::before', '::after'].forEach(ps => {
      const c = getComputedStyle(el, ps);
      if (!c || c.content === 'none' || c.content === 'normal') return;
      if (parseFloat(c.width) < 2 && String(c.content).replace(/"/g, '').length === 0) return;
      const r = el.getBoundingClientRect();
      pseudo.push({
        on: `${el.tagName.toLowerCase()}.${(typeof el.className === 'string' ? el.className.split(' ')[0] : '')}${ps}`,
        親: `[${Math.round(r.left - S.left)},${Math.round(r.top - S.top)} ${Math.round(r.width)}×${Math.round(r.height)}]`,
        content: c.content, w: px(c.width), h: px(c.height),
        position: c.position, left: c.left, top: c.top, right: c.right,
        bg: c.backgroundColor, bgimg: (c.backgroundImage || '').slice(0, 160), bgsize: c.backgroundSize,
        radius: c.borderTopLeftRadius, border: `${c.borderTopWidth} ${c.borderTopColor}`, transform: c.transform
      });
    });
  });
  // 見出しらしい文字＝そのセクションの名前に使う
  const head = rows.find(r => r.text && /^h[1-6]$/.test(r.tag)) || rows.find(r => r.text);
  return { sec: { w: Math.round(S.width), h: Math.round(S.height), bg: bgUp(sec), 見出し: head ? head.text.replace(/\n/g, ' ') : '' }, rows, pseudo };
}, SEC);

for (const SEC of IDX) {
  const data = await measure(SEC);
  await secs[SEC].screenshot({ path: path.join(OUT, `sec${SEC}.png`) });
  fs.writeFileSync(path.join(OUT, `sec${SEC}.json`), JSON.stringify(data, null, 1));
  const clips = data.rows.filter(r => r.clip).length;
  console.log(`✅ sec${SEC}  ${data.sec.w}×${data.sec.h}  bg:${data.sec.bg}  「${data.sec.見出し.slice(0, 20)}」`);
  console.log(`   要素 ${data.rows.length} / 疑似要素 ${data.pseudo.length}${clips ? ` / ⚠️ clip-path ${clips}（自動では出せない）` : ''}`);
}
await b.close();
console.log(`\n→ ${OUT}`);
