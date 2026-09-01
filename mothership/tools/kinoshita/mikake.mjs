/* 元サイトと、建てた JSON の【見かけ】を突き合わせる。
   moji.mjs は「文字があるか」しか見ない。こちらは
   級数・太さ・行間・字間・色・改行の数 まで1つずつ比べて、違う所を名指しする。
   使い方: node mikake.mjs "<URL>" "<接頭辞>" "<library>" [幅=1440] */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'fs';
const [URL_, PREFIX, LIB] = process.argv.slice(2);
const W = Number(process.argv[5] || 1440);
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: W, height: 900, deviceScaleFactor: 1 });
await p.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
await p.goto(URL_, { waitUntil: 'networkidle2', timeout: 60000 });
await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 140)); } window.scrollTo(0, 0); });
await new Promise(r => setTimeout(r, 2000));

const want = await p.evaluate(() => {
  const px = v => Math.round((parseFloat(v) || 0) * 100) / 100;
  const hex = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const a = m[1].split(',').map(parseFloat); if (a[3] === 0) return null;
    return '#' + a.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join(''); };
  const out = [], seen = new Set();
  document.querySelectorAll('*').forEach(el => {
    if (/^(SCRIPT|STYLE|NOSCRIPT|SVG)$/.test(el.tagName)) return;
    // 直下に文字を持つ要素だけ（親子で二重に数えない）
    const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.nodeValue.trim()).length;
    if (!own) return;
    const c = getComputedStyle(el), r = el.getBoundingClientRect();
    if (c.display === 'none' || c.visibility === 'hidden' || c.opacity === '0') return;
    if (r.width < 2 || r.height < 2 || r.right <= 0 || r.left >= innerWidth) return;
    let t = '';
    (function rec(n) { [...n.childNodes].forEach(k => {
      if (k.nodeType === 3) t += k.nodeValue.replace(/\s*\n\s*/g, ' ');
      else if (k.tagName === 'BR') t += (getComputedStyle(k).display === 'none' ? '' : '\n');
      else rec(k); }); })(el);
    t = t.replace(/[ \t]+/g, ' ').replace(/\n /g, '\n').trim();
    if (!t) return;
    const key = t.slice(0, 40);
    if (seen.has(key)) return; seen.add(key);
    out.push({ t, size: px(c.fontSize), weight: parseInt(c.fontWeight) || 400,
      lh: px(c.lineHeight) || Math.round(px(c.fontSize) * 1.4),
      ls: c.letterSpacing === 'normal' ? 0 : px(c.letterSpacing),
      color: hex(c.color), br: (t.match(/\n/g) || []).length });
  });
  return out;
});
await b.close();

const files = fs.readdirSync(LIB).filter(f => f.startsWith(PREFIX + ' — ') && f.endsWith(`(${W}).json`)).sort();
if (!files.length) { console.log(`🔴 「${PREFIX} … (${W}).json」が1枚も無い＝測っていない`); process.exit(1); }
const got = [];
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(LIB + '/' + f, 'utf8'));
  (function w(n) {
    if (n.type === 'text') { const F = n.font || {};
      got.push({ t: n.text, size: F.size, weight: F.weight, lh: F.lineHeight,
        ls: F.letterSpacing || 0, color: n.fill, br: (String(n.text).match(/\n/g) || []).length, f }); }
    (n.children || []).forEach(w);
  })(d.root);
}
const norm = s => String(s).replace(/[\s　]+/g, '').replace(/[“”"]/g, '"');
const near = (a, b, tol = 1) => a != null && b != null && Math.abs(a - b) <= tol;
let ng = 0, ok = 0, miss = 0;
const diff = (g, w) => {
  const bad = [];
  if (!near(g.size, w.size, 0.6)) bad.push(`級数 ${g.size}→${w.size}`);
  if (g.weight !== w.weight) bad.push(`太さ ${g.weight}→${w.weight}`);
  if (!near(g.lh, w.lh, 1.5)) bad.push(`行間 ${g.lh}→${w.lh}`);
  if (!near(g.ls, w.ls, 0.3)) bad.push(`字間 ${g.ls}→${w.ls}`);
  if (w.color && g.color && g.color.toLowerCase() !== w.color.toLowerCase()) bad.push(`色 ${g.color}→${w.color}`);
  if (g.br !== w.br) bad.push(`改行 ${g.br}→${w.br}`);
  return bad;
};
for (const w of want) {
  // 🔴 同じ文字が何箇所にもある（見出しとラベルなど）。1つ目と比べると別物と比較して嘘のずれが出る。
  //    ⭐ 同じ文字の候補を全部見て、1つでも合っていれば「合っている」。
  let cands = got.filter(x => norm(x.t) === norm(w.t));
  if (!cands.length && norm(w.t).length > 3) cands = got.filter(x => norm(x.t).includes(norm(w.t)));
  if (!cands.length) { miss++; console.log(`❌ 無い : 「${w.t.slice(0, 34).replace(/\n/g, '⏎')}」`); continue; }
  const hit = cands.find(g => diff(g, w).length === 0);
  if (hit) { ok++; continue; }
  // 全部ずれている＝いちばん差の少ない物で報告
  const best = cands.map(g => ({ g, bad: diff(g, w) })).sort((a, b) => a.bad.length - b.bad.length)[0];
  ng++; console.log(`⚠️ 「${w.t.slice(0, 26).replace(/\n/g, '⏎')}」  ${best.bad.join(' / ')}`);
}
console.log(`\n${files.length}枚 ／ 元サイトの文字 ${want.length}箇所 ── ✅一致 ${ok} ／ ⚠️ずれ ${ng} ／ ❌無い ${miss}`);
process.exit(ng + miss ? 1 : 0);
