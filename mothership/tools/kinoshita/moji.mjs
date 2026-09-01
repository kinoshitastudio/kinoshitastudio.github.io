/* 元サイトの「見えている文字」と、建てた JSON の文字を突き合わせる */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'fs';
const [URL_, PREFIX, LIB] = process.argv.slice(2);
const W = Number(process.argv[5] || 1440);   // 🔴 幅で絞らないと (1440) を測って「合格」してしまう
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width:W, height:900, deviceScaleFactor:1 });
await p.goto(URL_, { waitUntil:'networkidle2', timeout:60000 });
await new Promise(r=>setTimeout(r,1500));
const secs = await p.evaluate(() => [...document.querySelectorAll('section')].map(s => {
  const out = [];
  const wk = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
  let n; while ((n = wk.nextNode())) {
    const t = n.nodeValue.replace(/\s+/g,' ').trim(); if (!t) continue;
    const pe = n.parentElement; if (!pe) continue;
    const c = getComputedStyle(pe);
    if (c.display === 'none' || c.visibility === 'hidden' || c.opacity === '0') continue;
    const r = pe.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    out.push(t);
  }
  return out;
}));
await b.close();
const files = fs.readdirSync(LIB).filter(f => f.startsWith(PREFIX + ' — ') && f.endsWith(`(${W}).json`)).sort();
const norm = s => s.replace(/[\s　]+/g,'').replace(/[“”"]/g,'"');
let ng = 0;
secs.forEach((want, i) => {
  const f = files.find(x => x.includes(` — ${String(i+1).padStart(2,'0')} `));
  if (!f) { console.log(`❌ ${i+1} の JSON が無い`); ng++; return; }
  const d = JSON.parse(fs.readFileSync(LIB + '/' + f, 'utf8'));
  let got = '';
  (function w(n){ if (n.type==='text') got += n.text; (n.children||[]).forEach(w); })(d.root);
  got = norm(got);
  const miss = want.filter(t => !got.includes(norm(t)));
  if (miss.length) { ng++; console.log(`❌ ${f}`); miss.forEach(m => console.log('    落ち:', m.slice(0,60))); }
  else console.log(`✅ ${f}  文字 ${want.length}箇所 すべて入っている`);
});
console.log(ng ? `\n🔴 ${ng}枚に落ちがある` : '\n⭐ 全枚数、文字の落ちゼロ');
