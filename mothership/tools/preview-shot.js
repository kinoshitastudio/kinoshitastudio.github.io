// Quick preview renderer: mothership.json -> HTML (flexbox) -> PNG via Playwright.
// Approximation of Figma auto-layout for "見せて" requests. Not the source of truth.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'mothership.json'), 'utf8'));
const tokens = spec.tokens || {};

function resolve(v) {
  if (typeof v !== 'string') return v;
  if (v[0] === '@') {
    const parts = v.slice(1).split('.');
    let cur = tokens;
    for (const p of parts) cur = cur && cur[p];
    return cur || v;
  }
  return v;
}
function fillCss(fill) {
  if (!fill) return '';
  if (typeof fill === 'string') return `background:${resolve(fill)};`;
  if (fill.gradient) {
    const a = fill.angle || 180;
    return `background:linear-gradient(${a}deg, ${fill.gradient.map(resolve).join(',')});`;
  }
  return '';
}
const alignMap = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' };
const justMap = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between' };

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function node(n) {
  const t = n.type;
  if (t === 'text') {
    const f = n.font || {};
    const st = [
      n.w ? `width:${n.w}px;` : '',
      `font-family:'${f.family || spec.font || 'Noto Sans JP'}',sans-serif;`,
      `font-size:${f.size || 16}px;`,
      `font-weight:${f.weight || 400};`,
      `line-height:${f.lineHeight ? f.lineHeight + 'px' : 'normal'};`,
      f.letterSpacing != null ? `letter-spacing:${f.letterSpacing}px;` : '',
      `color:${resolve(n.fill) || '#000'};`,
      `text-align:${n.align || 'left'};`,
      'white-space:pre-line;margin:0;',
    ].join('');
    return `<p style="${st}">${esc(n.text || '')}</p>`;
  }
  if (t === 'image') {
    const fit = n.scaleMode === 'FIT' ? 'contain' : 'cover';
    const st = [
      n.w ? `width:${n.w}px;` : '', n.h ? `height:${n.h}px;` : '',
      n.radius ? `border-radius:${n.radius}px;` : '',
      `object-fit:${fit};`, 'flex:none;display:block;background:#dfe6f2;',
    ].join('');
    return `<img src="${n.src || ''}" style="${st}">`;
  }
  if (t === 'svg') {
    const st = [n.w ? `width:${n.w}px;` : '', n.h ? `height:${n.h}px;` : '', 'flex:none;line-height:0;'].join('');
    return `<div style="${st}">${n.svg || ''}</div>`;
  }
  if (t === 'rect' || t === 'ellipse') {
    const st = [
      n.w ? `width:${n.w}px;` : '', n.h ? `height:${n.h}px;` : '',
      `border-radius:${t === 'ellipse' ? '50%' : (n.radius || 0) + 'px'};`,
      fillCss(n.fill), 'flex:none;',
    ].join('');
    return `<div style="${st}"></div>`;
  }
  // frame
  const L = n.layout;
  const st = [n.w ? `width:${n.w}px;` : '', n.h ? `height:${n.h}px;` : '', fillCss(n.fill),
    n.radius ? `border-radius:${n.radius}px;` : '', n.clip ? 'overflow:hidden;' : ''];
  if (L) {
    st.push('display:flex;',
      `flex-direction:${L.mode === 'horizontal' ? 'row' : 'column'};`,
      L.gap != null ? `gap:${L.gap}px;` : '',
      L.padding != null ? `padding:${L.padding}px;` : '',
      `align-items:${alignMap[L.align] || 'flex-start'};`,
      L.justify ? `justify-content:${justMap[L.justify] || 'flex-start'};` : '',
      'box-sizing:border-box;');
  }
  const kids = (n.children || []).map(node).join('');
  return `<div style="${st.join('')}">${kids}</div>`;
}

const html = `<!doctype html><html><head><meta charset="utf8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}body{margin:0}</style></head>
<body>${node(spec.root)}</body></html>`;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());   // 先にシステムのGoogle Chromeを使う（Playwright同梱Chromiumの150MB DL不要）。無ければ同梱にフォールバック
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.setViewportSize({ width: spec.root.w || 1200, height: 800 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const el = await page.$('body > div');
  const out = path.join(root, '_preview.png');
  await el.screenshot({ path: out });
  await browser.close();
  console.log('saved', out);
})();
