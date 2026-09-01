/* JSON を Figma と同じ規則で展開して【絵】にする。
   ⭐ Figma を開く前に、重なり・はみ出し・折り返しを目で見るため。
   使い方: node mihon.mjs "<library/xxx.json>" [出力.png] */
import fs from 'fs';
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const src = process.argv[2], out = process.argv[3] || '/tmp/mihon.png';
const d = JSON.parse(fs.readFileSync(src, 'utf8'));
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// Figma と同じ規則で展開（site2figma の verify と同じ考え方）
const pad = P => Array.isArray(P) ? {t:P[0],r:P[1],b:P[2],l:P[3]}
  : (P && typeof P === 'object') ? {t:P.top||0,r:P.right||0,b:P.bottom||0,l:P.left||0}
  : {t:P||0,r:P||0,b:P||0,l:P||0};
const html = [];
const draw = (n, X, Y) => {
  const w = n.w ?? 0, h = n.h ?? 0;
  const st = [`position:absolute;left:${X}px;top:${Y}px`];
  if (w) st.push(`width:${w}px`);
  if (n.type !== 'text' && h) st.push(`height:${h}px`);
  if (typeof n.fill === 'string') st.push(`background:${n.fill}`);
  else if (n.fill && n.fill.gradient) st.push(`background:linear-gradient(${n.fill.angle||180}deg,${n.fill.gradient.join(',')})`);
  if (n.stroke) st.push(`outline:${n.strokeWidth||1}px solid ${n.stroke};outline-offset:-${n.strokeWidth||1}px`);
  if (n.radius) st.push(`border-radius:${n.radius}px`);
  if (n.type === 'text') {
    const f = n.font || {};
    st.push(`font-family:'${f.family||'Noto Sans JP'}',sans-serif`, `font-size:${f.size||14}px`,
      `font-weight:${f.weight||400}`, `line-height:${f.lineHeight||20}px`,
      `letter-spacing:${f.letterSpacing||0}px`, `color:${n.fill||'#000'}`, 'white-space:pre-wrap',
      `text-align:${n.align||'left'}`, 'background:none');
    html.push(`<div style="${st.join(';')}">${esc(n.text||'')}</div>`);
    return;
  }
  if (n.type === 'image' || (n.type === 'svg')) { st.push('background:#dfe6ec;'); html.push(`<div style="${st.join(';')};outline:1px dashed #9ab"></div>`); return; }
  html.push(`<div style="${st.join(';')}"></div>`);
  const L = n.layout, kids = n.children || [];
  kids.filter(c => c.x != null).forEach(c => draw(c, X + c.x, Y + c.y));
  const flow = kids.filter(c => c.x == null);
  if (!flow.length) return;
  if (!L) { flow.forEach(c => draw(c, X, Y)); return; }
  // ⭐ Figma と同じ規則で並べる（align / justify を見ないと、中央寄せの帯が左に寄って嘘の絵になる）
  const P = pad(L.padding), gap = L.gap || 0, horiz = L.mode === 'horizontal';
  const inW = w - P.l - P.r, inH = h - P.t - P.b;
  const ss = flow.map(c => ({ w: c.w ?? 0, h: c.h ?? estH(c) }));
  const total = ss.reduce((a, c) => a + (horiz ? c.w : c.h), 0) + gap * (ss.length - 1);
  const free = (horiz ? inW : inH) - total;
  const off = L.justify === 'center' ? free / 2 : L.justify === 'end' ? free : 0;
  const gp = (L.justify === 'between' && ss.length > 1) ? gap + free / (ss.length - 1) : gap;
  let cur = (horiz ? X + P.l : Y + P.t) + off;
  flow.forEach((c, i) => {
    const cross = horiz ? inH - ss[i].h : inW - ss[i].w;
    const co = L.align === 'center' ? cross / 2 : L.align === 'end' ? cross : 0;
    if (horiz) draw(c, cur, Y + P.t + co); else draw(c, X + P.l + co, cur);
    cur += (horiz ? ss[i].w : ss[i].h) + gp;
  });
};
function estH(c) {
  if (c.h) return c.h;
  if (c.type === 'text') { const f=c.font||{}; const lh=f.lineHeight||20;
    const per = Math.max(1, Math.floor((c.w||600) / ((f.size||14)*0.95)));
    const lines = String(c.text||'').split('\n').reduce((a,l)=>a+Math.max(1,Math.ceil(l.length/per)),0);
    return lh*lines; }
  const L=c.layout, ks=(c.children||[]).filter(x=>x.x==null); if(!L||!ks.length) return 0;
  const P=pad(L.padding); return P.t+P.b+ks.reduce((a,k)=>a+estH(k),0)+(L.gap||0)*(ks.length-1);
}
const R = d.root;
draw(R, 0, 0);
const page = `<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@100..900&family=Noto+Serif+JP:wght@200..900&family=Inter:wght@100..900&display=swap" rel="stylesheet">
<style>body{margin:0;width:${R.w}px;height:${R.h}px;position:relative;background:#fff}</style></head><body>${html.join('')}</body></html>`;
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: Math.round(R.w), height: Math.round(R.h), deviceScaleFactor: 1 });
await p.setContent(page, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1200));
await p.screenshot({ path: out });
await b.close();
console.log('✅', out, `${R.w}×${R.h}`);
