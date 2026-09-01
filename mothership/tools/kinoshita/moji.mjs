/* 元サイトの「見えている文字」と、建てた JSON の文字を突き合わせる */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'fs';
const [URL_, PREFIX, LIB] = process.argv.slice(2);
const W = Number(process.argv[5] || 1440);   // 🔴 幅で絞らないと (1440) を測って「合格」してしまう
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width:W, height:900, deviceScaleFactor:1 });
// 🔴 UA を付けないと弾かれるサイトがある（h1+p だけのエラーページが返り、
//    section 0個＝1枚も測らずに「落ちゼロ」と出る＝偽の合格）
await p.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
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
    // 🔴 横カルーセルの「まだ見えていないカード」は画面の外に居る（実測 x=1675／幅1440）。
    //    道具はそれを捨てるのが正しいので、ここで数えると偽の落ちになる
    if (r.right <= 0 || r.left >= innerWidth) continue;
    out.push(t);
  }
  return out;
}));
const { zentai, gazou } = await p.evaluate(() => {
  const out = [], W = innerWidth;
  const wk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n; while ((n = wk.nextNode())) {
    const t = n.nodeValue.replace(/\s+/g,' ').trim(); if (!t) continue;
    const pe = n.parentElement; if (!pe) continue;
    if (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(pe.tagName)) continue;
    const c = getComputedStyle(pe);
    if (c.display === 'none' || c.visibility === 'hidden' || c.opacity === '0') continue;
    const r = pe.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    if (r.right <= 0 || r.left >= W) continue;
    out.push(t);
  }
  const inView = e => { const r = e.getBoundingClientRect(); return r.right > 0 && r.left < W && r.width > 8 && r.height > 8; };
  const imgs = [...document.querySelectorAll('img')].filter(inView).length;
  const bgs = [...document.querySelectorAll('*')].filter(e => { const u = getComputedStyle(e).backgroundImage; return u && u !== 'none' && /url\(/.test(u) && inView(e); }).length;
  return { zentai: out, gazou: imgs + bgs };
});
await b.close();
const files = fs.readdirSync(LIB).filter(f => f.startsWith(PREFIX + ' — ') && f.endsWith(`(${W}).json`)).sort();
if (!files.length) { console.log(`🔴 「${PREFIX} … (${W}).json」が library に1枚も無い＝測っていない`); process.exit(1); }
const ZENTAI = !secs.length;   // ⭐ <section> が無いサイト（道具は「幅いっぱいの塊」で切る）＝
                              //    セクション対応は取れないので、ページ全体 vs 全JSON で測る
if (ZENTAI) console.log('（<section> が無いサイト＝ページ全体で突き合わせる）\n');
const norm = s => s.replace(/[\s　]+/g,'').replace(/[“”"]/g,'"');
let ng = 0;
if (ZENTAI) {
  let got = '';
  for (const f of files) {
    const d = JSON.parse(fs.readFileSync(LIB + '/' + f, 'utf8'));
    (function w(n){ if (n.type==='text') got += n.text; (n.children||[]).forEach(w); })(d.root);
  }
  got = norm(got);
  const miss = zentai.filter(t => !got.includes(norm(t)));
  console.log(`${files.length}枚 と 見えている文字 ${zentai.length}箇所 を突き合わせた`);
  if (miss.length) { console.log(`❌ ${miss.length}箇所 落ちている`); miss.slice(0,40).forEach(m => console.log('    落ち:', m.slice(0,60))); }
  else console.log('⭐ 文字の落ちゼロ');
  console.log(`\n=== 写真 ===\n  元サイト（画面内）: ${gazou}枚`);
  let img = 0, shot = 0;
  for (const f of files) {
    const d = JSON.parse(fs.readFileSync(LIB + '/' + f, 'utf8'));
    (function w(n){
      if (n.type === 'image') img++;
      if (n.type === 'svg' && /<image/.test(n.svg || '')) (String(n.name||'').includes('スクショ') ? shot++ : img++);
      (n.children||[]).forEach(w);
    })(d.root);
  }
  console.log(`  ライブラリ      : ${img}枚（＋スクショ ${shot}枚）`);
  process.exit(miss.length ? 1 : 0);
}
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
