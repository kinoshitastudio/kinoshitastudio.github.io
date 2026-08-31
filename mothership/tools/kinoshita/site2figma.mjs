/* ============================================================
   サイト → Figma（mothership JSON）を セクションごとに オートレイアウトで建てる

   使い方:
     node tools/kinoshita/site2figma.mjs "<URL>" "<接頭辞>" [幅=1440]
   例:
     node tools/kinoshita/site2figma.mjs "https://www.h7house.com/" "H-7 HOUSE"

   出す物:
     library/<接頭辞> — NN <見出し> (幅).json   ← セクションごと・1枚1ファイル
     tools/kinoshita/_out/secN.png              ← 見て確かめる用の2倍スクショ

   🔴 前の版（丸写し）との違い ── 仕様書が名指しした事故を起こさない:
     - 絶対配置(x/y)で並べない。**位置は padding と gap に翻訳する**
     - gap がばらつく所は「同じ gap が続く区間」で束ねて入れ子にする
     - 重なっている所（写真の上の文字＝KV）だけ絶対配置にする
     - ::before / ::after を子ノードとして拾う（矢印・丸・帯はここに居る）
     - <br> は display を見てから改行にする（pc_hidden は PC で消える）
     - 書体は Figma にある物へ寄せる（明朝→Noto Serif JP 等）
     - 画像は src に素のURLのまま（webp変換・縮小は tools/bake.js がやる）

   ⭐ 出したあと、同じ JSON を Figma と同じ規則で展開して実測と突き合わせ、
      ズレを表示する（＝Figma を見る前に分かる）。
   ============================================================ */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');          // mothership/
const LIB = path.join(ROOT, 'library');
const OUT = path.join(HERE, '_out');
fs.mkdirSync(OUT, { recursive: true });

const URL_ = process.argv[2];
const PREFIX = process.argv[3];
const W = Number(process.argv[4] ?? 1440);
if (!URL_ || !PREFIX) {
  console.error('使い方: node site2figma.mjs "<URL>" "<接頭辞>" [幅=1440]');
  process.exit(1);
}

/* ---------- 書体を Figma にある物へ寄せる ---------- */
const JP = /[ぁ-んァ-ヶ一-龠]|明朝|ゴシック|丸ゴ|リュウミン|游|ヒラギノ|Hiragino|Yu |Noto|Yaku|Tazugane|Meiryo|MS P/;
function mapFont(family) {
  const f = String(family || '').replace(/["']/g, '');
  const first = f.split(',')[0].trim();
  const mincho = /明朝|Mincho|リュウミン|Ryumin|Serif|游明朝|Yu Mincho|Hiragino Mincho/i.test(f);
  if (/Cormorant/i.test(f)) return 'Cormorant Garamond';
  if (/Playfair/i.test(f)) return 'Playfair Display';
  if (JP.test(first) || JP.test(f)) return mincho ? 'Noto Serif JP' : 'Noto Sans JP';
  if (mincho) return 'Noto Serif JP';
  return 'Inter';
}

/* ---------- 色 ---------- */
const hex = (c) => {
  const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null;
  const [r, g, b, a] = m[1].split(',').map(s => parseFloat(s));
  if (a === 0) return null;
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
};

/* ============================================================
   1) ブラウザで木を採る
   ============================================================ */
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: W, height: 900, deviceScaleFactor: 2 });
await p.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
await p.goto(URL_, { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 3000));
await p.evaluate(async () => {   // ⚠️ 全部スクロール＝opacity:0 で現れる物を落とさない
  for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 160)); }
  window.scrollTo(0, 0);
});
// 🔴 lazyload（class="lazyload"）の img は読み込まれておらず currentSrc が 1×1 の data URI。
//    本物は data-src に居る。流し込んでから測る（uniform-net は60枚以上これだった）
await p.evaluate(async () => {
  document.querySelectorAll('img[data-src]').forEach(im => { const u = im.getAttribute('data-src'); if (u) { im.src = u; im.removeAttribute('data-src'); } });
  document.querySelectorAll('img[data-srcset]').forEach(im => { const u = im.getAttribute('data-srcset'); if (u) im.srcset = u; });
  document.querySelectorAll('source[data-srcset]').forEach(so => { const u = so.getAttribute('data-srcset'); if (u) so.srcset = u; });
  await Promise.all([...document.images].map(im => (im.decode ? im.decode().catch(() => {}) : null)));
});
await new Promise(r => setTimeout(r, 2500));

const secs = await p.$$('section');
console.log(`section ${secs.length} 個\n`);

const grab = (i) => p.evaluate((i) => {
  // ⭐ i === -1 ＝ KV（最初の section より上の帯。`<section>` の外にあるので別扱い）
  const KV = i === -1;
  const sec = KV ? document.body : document.querySelectorAll('section')[i];
  const S = KV ? { left: 0, top: 0, width: document.documentElement.clientWidth,
                   height: Math.round(document.querySelector('section').getBoundingClientRect().top) }
               : sec.getBoundingClientRect();
  const px = v => Math.round((parseFloat(v) || 0) * 100) / 100;
  const LEAFISH = new Set(['BR', 'SPAN', 'EM', 'B', 'STRONG', 'A', 'I', 'SUP', 'SUB', 'SMALL', 'TIME']);
  const isLeafText = el => el.childElementCount === 0
    || [...el.children].every(c => LEAFISH.has(c.tagName) && c.childElementCount === 0);
  const txt = el => {
    let s = '';
    const rec = n => {
      if (n.nodeType === 3) s += n.nodeValue;
      else if (n.tagName === 'BR') s += (getComputedStyle(n).display === 'none' ? '' : '\n');
      else [...n.childNodes].forEach(rec);
    };
    rec(el); return s.replace(/[ \t]+/g, ' ').replace(/\n /g, '\n').trim();
  };
  const inkWidth = el => {     // 文字そのものの幅（hug したときの幅）
    try { const r = document.createRange(); r.selectNodeContents(el);
      const rs = [...r.getClientRects()]; if (!rs.length) return null;
      return Math.round(Math.max(...rs.map(x => x.width)) * 100) / 100;
    } catch (e) { return null; }
  };
  const bgUp = el => { let n = el; while (n && n !== document.documentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; n = n.parentElement; } return null; };
  const urlOf = s => { const m = String(s).match(/url\(["']?(.+?)["']?\)/); return m ? m[1] : null; };
  const tmat = t => { const m = String(t).match(/matrix\(([^)]+)\)/); if (!m) return [0, 0];
    const a = m[1].split(',').map(parseFloat); return [a[4] || 0, a[5] || 0]; };

  let uid = 0;
  const node = (el) => {
    const r = el.getBoundingClientRect(), c = getComputedStyle(el);
    if (r.width < 2 || r.height < 2 || c.visibility === 'hidden') return null;
    const o = {
      id: ++uid, tag: el.tagName.toLowerCase(),
      cls: (typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '') || '',
      x: px(r.left - S.left), y: px(r.top - S.top), w: px(r.width), h: px(r.height),
      pos: c.position, disp: c.display,
      flexDir: c.display === 'flex' ? c.flexDirection : null,
      gap: c.display === 'flex' || c.display === 'grid' ? c.gap : null,
      just: c.justifyContent, alignI: c.alignItems,
      pad: [px(c.paddingTop), px(c.paddingRight), px(c.paddingBottom), px(c.paddingLeft)],
      bg: /rgba\(0, 0, 0, 0\)/.test(c.backgroundColor) ? null : c.backgroundColor,
      bgimg: urlOf(c.backgroundImage), bgsize: c.backgroundSize,
      radius: px(c.borderTopLeftRadius),
      border: px(c.borderTopWidth) > 0 ? { w: px(c.borderTopWidth), c: c.borderTopColor } : null,
      shadow: c.boxShadow !== 'none' ? c.boxShadow : null,
      opacity: c.opacity !== '1' ? parseFloat(c.opacity) : null,
      clip: c.overflow === 'hidden',
      children: []
    };
    if (el.tagName === 'IMG') { o.kind = 'image'; o.src = el.currentSrc || el.src; o.fit = c.objectFit; return o; }
    if (el.tagName === 'svg') { o.kind = 'svg'; o.svg = el.outerHTML; return o; }
    if (isLeafText(el)) {
      const t = txt(el);
      if (t) {
        o.kind = 'text'; o.text = t; o.tw = inkWidth(el);
        o.font = { family: c.fontFamily, size: px(c.fontSize), weight: parseInt(c.fontWeight) || 400,
                   lineHeight: px(c.lineHeight) || Math.round(px(c.fontSize) * 1.4),
                   ls: c.letterSpacing === 'normal' ? 0 : px(c.letterSpacing) };
        o.color = c.color; o.ta = c.textAlign;
        return o;
      }
    }
    o.kind = 'frame';
    // 🔴 疑似要素＝矢印・丸・帯。DOM に出ないので子として足す
    ['::before', '::after'].forEach(ps => {
      const pc = getComputedStyle(el, ps);
      if (!pc || pc.content === 'none' || pc.content === 'normal') return;
      const pw = px(pc.width), ph = px(pc.height);
      if (pw < 2 || ph < 2) return;
      if (pc.position !== 'absolute' && pc.position !== 'fixed') return;   // 流れの中の物は位置が読めない
      const [tx, ty] = tmat(pc.transform);
      const L = pc.left === 'auto' ? (pc.right === 'auto' ? 0 : r.width - pw - px(pc.right)) : px(pc.left);
      const T = pc.top === 'auto' ? (pc.bottom === 'auto' ? 0 : r.height - ph - px(pc.bottom)) : px(pc.top);
      const img = urlOf(pc.backgroundImage);
      o.children.push({
        id: ++uid, tag: ps, cls: '', 疑似: true,
        x: px(r.left - S.left + L + tx), y: px(r.top - S.top + T + ty), w: pw, h: ph,
        pos: 'absolute', kind: img ? 'image' : 'rect',
        src: img, fit: pc.backgroundSize === 'contain' ? 'contain' : 'cover',
        bg: /rgba\(0, 0, 0, 0\)/.test(pc.backgroundColor) ? null : pc.backgroundColor,
        radius: px(pc.borderTopLeftRadius), border: null, children: []
      });
    });
    [...el.children].forEach(ch => { const n = node(ch); if (n) o.children.push(n); });
    // 🔴 background-image は「子が無い箱」だけでなく必ず拾う。
    //    子がある箱の背景を捨てると、写真が丸ごと落ちる（H-7 の KV は
    //    女性の写真が背景で、拾えていたのは上に重なる矢羽根のオーバーレイ画像だけだった）
    if (o.bgimg) {
      if (!o.children.length) { o.kind = 'image'; o.src = o.bgimg; o.fit = o.bgsize === 'contain' ? 'contain' : 'cover'; }
      else o.children.unshift({                       // いちばん下に敷く
        id: ++uid, tag: 'bg', cls: '', 疑似: true, kind: 'image',
        x: o.x, y: o.y, w: o.w, h: o.h, pos: 'absolute',
        src: o.bgimg, fit: o.bgsize === 'contain' ? 'contain' : 'cover', children: []
      });
    }
    return o;
  };
  let tree;
  if (KV) {
    const Y = S.height, Wp = S.width;
    const fits = el => { const r = el.getBoundingClientRect();
      return r.width >= Wp * 0.5 && r.height >= 120 && r.top >= -8 && r.bottom <= Y + 8; };
    // 帯に収まる中でいちばん大きい塊＝KV本体
    let best = null, area = 0;
    document.body.querySelectorAll('*').forEach(el => {
      if (el.closest('section') || !fits(el)) return;
      const r = el.getBoundingClientRect(), a = r.width * r.height;
      if (a > area) { area = a; best = el; }
    });
    const kids = [];
    if (best) { const n = node(best); if (n) kids.push(n); }
    // 🔴 ヘッダーは position:fixed ＝ 帯の外に居る。別に拾って KV に合成する
    document.body.querySelectorAll('*').forEach(el => {
      const c = getComputedStyle(el);
      if (c.position !== 'fixed' && c.position !== 'sticky') return;
      if (best && best.contains(el)) return;
      if (el.closest('section')) return;
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 20 || r.top > Y - 20) return;
      if (kids.some(k => k.__el === el)) return;
      const n = node(el); if (n) { n.pos = 'absolute'; kids.push(n); }
    });
    tree = { id: 0, tag: 'div', cls: 'KV', kind: 'frame', pos: 'static',
             x: 0, y: 0, w: Wp, h: Y, pad: [0, 0, 0, 0], children: kids };
  } else {
    tree = node(sec);
    // 🔴 ヘッダーは position:fixed ＝ どの section にも属さない。先頭セクションに合成する
    if (i === 0 && tree) {
      const R = sec.getBoundingClientRect();
      document.body.querySelectorAll('*').forEach(el => {
        const c = getComputedStyle(el);
        if (c.position !== 'fixed' && c.position !== 'sticky') return;
        if (el.closest('section')) return;
        const r = el.getBoundingClientRect();
        if (r.width < 40 || r.height < 20) return;
        if (r.bottom < R.top + 4 || r.top > R.top + 200) return;   // 先頭セクションの頭に重なっている物だけ
        if (tree.children.some(k => k.x === px(r.left - S.left) && k.y === px(r.top - S.top)
              && k.w === px(r.width) && k.h === px(r.height))) return;   // ⚠️ 高さを入れないと KV と同一視して捨てる
        const n = node(el); if (n) { n.pos = 'absolute'; tree.children.push(n); }
      });
    }
  }
  const head = (() => { let t = null;
    const rec = n => { if (t) return; if (n.kind === 'text' && /^h[1-6]$/.test(n.tag)) t = n.text; (n.children || []).forEach(rec); };
    rec(tree); if (!t) { const rec2 = n => { if (t) return; if (n.kind === 'text') t = n.text; (n.children || []).forEach(rec2); }; rec2(tree); }
    return t || ''; })();
  return { tree, bg: KV ? (getComputedStyle(document.body).backgroundColor || null) : bgUp(sec), head: head.replace(/\s+/g, ' ').trim() };
}, i);

/* ============================================================
   2) 木を整える → オートレイアウトへ翻訳
   ============================================================ */
const near = (a, b, t = 1.5) => Math.abs(a - b) <= t;

// 🔴 中身の無い入れ物は畳む ── 大きさが違っても畳む。
//    （子が自分の位置を持っているので、入れ物の padding は捨ててよい。
//     残すと「幅1320・padding-left 780」のような箱が横並びを壊し、絶対配置に落ちる）
function collapse(n, isRoot) {
  n.children = (n.children || []).map(c => collapse(c, false));
  while (!isRoot && n.kind === 'frame' && n.children.length === 1) {   // ⚠️ セクション自身は畳まない（大きさと余白を失う）
    const c = n.children[0];
    const plain = !n.bg && !n.border && !n.shadow && !n.radius && !n.疑似 && !n.clip;
    if (!plain || c.pos === 'absolute' || c.疑似) break;
    n = c;
  }
  n.children = dedupImages(n.children || []);
  return n;
}

// ⚠️ 同じ場所に同じ大きさの写真が2枚（<img> と ::before の背景）＝二重に重い。上に来る方だけ残す
function dedupImages(kids) {
  const rectOf = k => (k.kind === 'image') ? k
    : (k.kind === 'frame' && k.children?.length === 1 && k.children[0].kind === 'image'
       && near(k.children[0].w, k.w, 1) && near(k.children[0].h, k.h, 1)) ? k.children[0] : null;
  const out = [];
  kids.forEach(k => {
    const r = rectOf(k); if (!r) { out.push(k); return; }
    r.cands = r.cands || (r.src ? [r.src] : []);
    const i = out.findIndex(o => { const q = rectOf(o); return q && near(q.x, r.x) && near(q.y, r.y) && near(q.w, r.w) && near(q.h, r.h); });
    // 🔴 同じ場所に写真候補が2つ（<img> と ::before の背景）＝どちらかが空のプレースホルダ。
    //    「後から来た方」でなく「実物がある方」を後で選ぶので、候補として両方持っておく
    if (i >= 0) {
      const q = rectOf(out[i]);
      q.cands = [...new Set([...(q.cands || []), ...r.cands])];
      // ⭐ 生きているURLを優先する（data: は交差フェード用の空プレースホルダ）
      if (/^data:/.test(String(q.src || ''))) {
        const real = q.cands.find(u => !/^data:/.test(u));
        if (real) { q.src = real; q.fit = r.fit || q.fit; }
      }
    } else out.push(k);
  });
  return out;
}

const stats = { al: 0, abs: 0, band: 0, svg: 0, swap: 0, blank: 0, shot: 0, kasanari: 0 };

const r1 = v => Math.round(v * 10) / 10;

function toNode(n, parentBgKnown) {
  const mark = o => { o.__mx = n.x; o.__my = n.y; return o; };
  if (n.kind === 'text') {
    const lines = Math.max(1, Math.round(n.h / Math.max(1, n.font.lineHeight)));
    const o = { type: 'text', name: n.text.replace(/\n/g, ' ').slice(0, 24), text: n.text,
      fill: hex(n.color) || '#111111',
      font: { family: mapFont(n.font.family), size: r1(n.font.size), weight: n.font.weight, lineHeight: Math.round(n.font.lineHeight) } };
    if (n.font.ls) o.font.letterSpacing = r1(n.font.ls);
    if (n.ta && n.ta !== 'start' && n.ta !== 'left') o.align = n.ta === 'end' ? 'right' : n.ta;
    // 🔴 w の入れどころ
    //  ・複数行／中央・右寄せ … 実寸が要る
    //  ・箱に余裕がある（文字の実寸 < 箱の幅）… 実寸を入れる。
    //    ⚠️ hug にすると <a> の余白が消えて隣が詰まる（実測72pxずれた）。余裕があるので折り返さない
    //  ・箱ぴったりの短いラベル … hug のまま（実寸を入れると書体差で折り返してボタンが壊れる）
    const boxW = Math.round(n.w), ink = n.tw != null ? n.tw : n.w;
    const roomy = ink <= boxW - 2;
    if (lines >= 2 || (o.align && o.align !== 'left') || roomy) o.w = boxW;
    o.__w = o.w != null ? o.w : ink;
    o.__h = n.h;
    return mark(o);
  }
  if (n.kind === 'image') {
    // ⚠️ 小さい data URI ＝ 空のプレースホルダ。写真として出さず、差し替える場所として灰色の枠にする
    if (/^data:/.test(String(n.src || ''))) {
      const g = { type: 'rect', name: '写真（未読込）', w: Math.round(n.w), h: Math.round(n.h), fill: '#e6e8ea' };
      if (n.radius) g.radius = n.radius;
      g.__w = g.w; g.__h = g.h; stats.blank++; return mark(g);
    }
    const o = { type: 'image', name: (n.cls || n.tag || 'photo').slice(0, 24), w: Math.round(n.w), h: Math.round(n.h),
      src: n.src, scaleMode: n.fit === 'contain' ? 'FIT' : 'FILL' };
    if (n.cands && n.cands.length > 1) o.__cands = n.cands;
    if (n.radius) o.radius = n.radius;
    o.__w = o.w; o.__h = o.h; return mark(o);
  }
  if (n.kind === 'svg') {
    const o = { type: 'svg', name: (n.cls || 'icon').slice(0, 24), w: Math.round(n.w), h: Math.round(n.h), svg: n.svg };
    o.__w = o.w; o.__h = o.h; return mark(o);
  }
  if (n.kind === 'rect') {
    const o = { type: n.radius >= Math.min(n.w, n.h) / 2 ? 'ellipse' : 'rect', w: Math.round(n.w), h: Math.round(n.h),
      name: '飾り', fill: hex(n.bg) || '#000000' };
    if (o.type === 'rect' && n.radius) o.radius = n.radius;
    o.__w = o.w; o.__h = o.h; return mark(o);
  }
  return mark(frameNode(n, parentBgKnown));
}

// ⭐ レイヤー名 ── クラス名が意味を持たない時（sd / wrap / inner 等）は中の文字から名前を付ける
const MUIMI = /^(sd|appear|inner|wrap|wrapper|box|item|row|col|list|content|contents|main|body|el|c|div|group)$/i;
function firstText(n) {
  if (n.kind === 'text') return n.text;
  for (const c of n.children || []) { const t = firstText(c); if (t) return t; }
  return null;
}
function frameName(n) {
  const cls = (n.cls || '').trim();
  if (cls && cls.length >= 4 && !MUIMI.test(cls)) return cls.slice(0, 28);
  const t = firstText(n);
  if (t) return t.replace(/\n/g, ' ').trim().slice(0, 20);
  if (n.children?.some(c => c.kind === 'image')) return (n.w < 48 && n.h < 48) ? 'アイコン' : '写真';
  return cls || n.tag || 'frame';
}

function frameNode(n) {
  const o = { type: 'frame', name: frameName(n), w: Math.round(n.w), h: Math.round(n.h) };
  if (n.bg) { const f = hex(n.bg); if (f) o.fill = f; }
  if (n.radius) o.radius = n.radius;
  if (n.border) { const s = hex(n.border.c); if (s) { o.stroke = s; o.strokeWidth = n.border.w; } }
  if (n.opacity != null) o.opacity = n.opacity;

  let kids = n.children || [];
  if (!kids.length) { o.__w = o.w; o.__h = o.h; return o; }

  // 🔴 親の外へはみ出す子は、オートレイアウトでは表せない（padding は負にできない）
  //    ＝写真を断ち切って見せている所。その子だけ絶対配置にして、親で切る
  const outside = k => k.x < n.x - 1 || k.y < n.y - 1
    || k.x + k.w > n.x + n.w + 1 || k.y + k.h > n.y + n.h + 1;
  // ⭐ はみ出す子が何枚もある＝流れる帯（マーキー）。1枚に束ねて、その帯だけ絶対配置にする
  //    （1枚ずつ絶対配置にすると、64枚の写真が全部バラの座標になって手が付けられない）
  const outs = kids.filter(k => k.pos !== 'absolute' && k.pos !== 'fixed' && outside(k));
  if (outs.length >= 2) {
    const bx = Math.min(...outs.map(k => k.x)), by = Math.min(...outs.map(k => k.y));
    const track = { id: 'track', tag: 'div', cls: 'はみ出す帯', kind: 'frame', pos: 'absolute',
      x: bx, y: by, w: Math.max(...outs.map(k => k.x + k.w)) - bx, h: Math.max(...outs.map(k => k.y + k.h)) - by,
      children: outs };
    kids = kids.filter(k => !outs.includes(k)).concat([track]);
  }
  const isAbs = k => k.pos === 'absolute' || k.pos === 'fixed' || outside(k);
  const flow = kids.filter(k => !isAbs(k));
  const abs = kids.filter(isAbs);
  if (abs.some(outside)) o.clip = true;

  const built = [];
  if (flow.length) {
    const lay = inferLayout(n, flow);
    if (lay) { Object.assign(o, lay.frameProps); built.push(...lay.children); stats.al++; }
    else {   // ⚠️ 重なっている＝KVのような重ね。ここだけ絶対配置でよい
      stats.abs++;
      flow.forEach(k => { const c = toNode(k); c.x = Math.round(k.x - n.x); c.y = Math.round(k.y - n.y); built.push(c); });
    }
  }
  // 疑似要素・絶対配置の子は、親の中の座標で重ねる（オートレイアウト内でも x/y があれば絶対配置になる＝code.js 210行）
  abs.forEach(k => { const c = toNode(k); c.x = Math.round(k.x - n.x); c.y = Math.round(k.y - n.y); built.push(c); });

  o.children = built;
  o.__w = o.w; o.__h = o.h;
  return o;
}

/* ⭐ ここが心臓：実測の位置を padding と gap に翻訳する */
function inferLayout(parent, kids) {
  const horiz = decideAxis(kids);
  if (horiz == null) return null;                       // 重なっている → 絶対配置へ
  const S = [...kids].sort((a, b) => horiz ? a.x - b.x : a.y - b.y);
  const s = k => horiz ? k.x : k.y, e = k => horiz ? k.x + k.w : k.y + k.h;
  const cs = k => horiz ? k.y : k.x, ce = k => horiz ? k.y + k.h : k.x + k.w;

  for (let i = 1; i < S.length; i++) if (s(S[i]) < e(S[i - 1]) - 1.5) return null;   // 主軸で重なる

  const pS = horiz ? parent.x : parent.y, pE = horiz ? parent.x + parent.w : parent.y + parent.h;
  const cS = horiz ? parent.y : parent.x, cE = horiz ? parent.y + parent.h : parent.x + parent.w;
  const padStart = s(S[0]) - pS, padEnd = pE - e(S[S.length - 1]);
  const gaps = S.slice(1).map((k, i) => s(k) - e(S[i]));

  // 交差軸の寄せ方
  const startsSame = S.every(k => near(cs(k), cs(S[0])));
  const centersSame = S.every(k => near(cs(k) + (horiz ? k.h : k.w) / 2, cs(S[0]) + (horiz ? S[0].h : S[0].w) / 2));
  const endsSame = S.every(k => near(ce(k), ce(S[0])));
  let align = 'start', padCS = cs(S[0]) - cS, padCE = cE - ce(S[0]);
  if (startsSame) { align = 'start'; padCS = cs(S[0]) - cS; padCE = cE - Math.max(...S.map(ce)); }
  else if (centersSame) {
    // 🔴 中央寄せの余白は左右（上下）均等とは限らない。
    //    中身の中心が箱の中心とずれている分を、片側の padding で作る（例：下 padding 30 の行）
    align = 'center';
    const cc = cs(S[0]) + (horiz ? S[0].h : S[0].w) / 2;         // 中身の中心
    const d = 2 * (cc - cS - (horiz ? parent.h : parent.w) / 2);
    if (d >= 0) { padCS = d; padCE = 0; } else { padCS = 0; padCE = -d; }
  }
  else if (endsSame) { align = 'end'; padCE = cE - ce(S[0]); padCS = Math.min(...S.map(k => cs(k) - cS)); }
  else return null;      // 交差軸がバラバラ＝オートレイアウトでは出せない

  // gap がばらつく → 同じ gap が続く区間で束ねて入れ子にする（オートレイアウトの gap は1本しかない）
  const uniq = [...new Set(gaps.map(g => Math.round(g)))];
  if (uniq.length > 1) {
    const bands = band(S, gaps);
    if (bands) {
      stats.band++;
      const wrapped = bands.map(gr => {
        if (gr.items.length === 1) return gr.items[0];
        const bx = Math.min(...gr.items.map(k => k.x)), by = Math.min(...gr.items.map(k => k.y));
        return { id: 'band', tag: 'group', cls: '束', kind: 'frame', pos: 'static',
          x: bx, y: by,
          w: Math.max(...gr.items.map(k => k.x + k.w)) - bx,
          h: Math.max(...gr.items.map(k => k.y + k.h)) - by,
          children: gr.items, pad: [0, 0, 0, 0] };
      });
      return inferLayout(parent, wrapped);
    }
  }

  const gap = gaps.length ? Math.round(Math.max(0, gaps.reduce((a, c) => a + c, 0) / gaps.length)) : 0;
  const padding = horiz
    ? { top: Math.round(Math.max(0, padCS)), right: Math.round(Math.max(0, padEnd)), bottom: Math.round(Math.max(0, padCE)), left: Math.round(Math.max(0, padStart)) }
    : { top: Math.round(Math.max(0, padStart)), right: Math.round(Math.max(0, padCE)), bottom: Math.round(Math.max(0, padEnd)), left: Math.round(Math.max(0, padCS)) };
  // ⭐ 寄せ方は「座標」でなく「揃え方」で書く＝書体差で文字幅が変わっても崩れない
  //   ・両端まで中身が詰まっている横並び → between（右端の物が右端に貼り付く）
  //   ・端の余りが揃っている → center
  let justify = 'start';
  if (horiz && S.length >= 2 && padStart <= 1.5 && padEnd <= 1.5 && uniq.length === 1) justify = 'between';
  else if (padStart > 1 && near(padStart, padEnd, 2)) justify = 'center';

  return {
    frameProps: { layout: { mode: horiz ? 'horizontal' : 'vertical', gap, padding, align, justify } },
    children: S.map(k => toNode(k))
  };
}

// 主軸を決める（横に並ぶか・縦に積むか・重なっているか）
function decideAxis(kids) {
  if (kids.length === 1) {
    return null_or(kids);
  }
  const overlapY = (a, b) => Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1.5;
  const overlapX = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1.5;
  const X = [...kids].sort((a, b) => a.x - b.x), Y = [...kids].sort((a, b) => a.y - b.y);
  let hOK = true, vOK = true;
  for (let i = 1; i < X.length; i++) if (X[i].x < X[i - 1].x + X[i - 1].w - 1.5) hOK = false;
  for (let i = 1; i < Y.length; i++) if (Y[i].y < Y[i - 1].y + Y[i - 1].h - 1.5) vOK = false;
  if (vOK && !hOK) return false;
  if (hOK && !vOK) return true;
  if (vOK && hOK) {                       // どちらでも並ぶ＝縦に積むのが自然
    const spreadY = Y[Y.length - 1].y - Y[0].y, spreadX = X[X.length - 1].x - X[0].x;
    return spreadX > spreadY;
  }
  return null;                            // 重なっている
}
function null_or(kids) { return false; }  // 子1つ＝縦で包む

// 同じ gap が続く区間で束ねる
function band(S, gaps) {
  const g = gaps.map(v => Math.round(v));
  const outer = Math.max(...g);
  if (g.every(v => v === outer)) return null;
  const groups = []; let cur = [S[0]];
  for (let i = 0; i < g.length; i++) {
    if (g[i] === outer) { groups.push({ items: cur }); cur = [S[i + 1]]; }
    else cur.push(S[i + 1]);
  }
  groups.push({ items: cur });
  return groups.length > 1 ? groups : null;
}

/* ============================================================
   3) 出す（＋Figmaと同じ規則で展開して実測と突き合わせる）
   ============================================================ */
function strip(n) { delete n.__w; delete n.__h; delete n.__mx; delete n.__my; delete n.__cands; (n.children || []).forEach(strip); return n; }

/* ⭐⭐ 解けない所は「スクショを敷く」──木下「構成そのままでなく
   スクリーンショット的な感じで画像だけ置いていてもいい」。
   クロスフェード・スライドショー・重なりが解けない塊は、URLを当てにいかず見た目を焼く。
   文字は上に残すので編集はできる。 */
async function shotNode(pageX, pageY, w, h, name) {
  const buf = await p.screenshot({ type: 'jpeg', quality: 78, captureBeyondViewport: true,
    clip: { x: Math.max(0, Math.round(pageX)), y: Math.max(0, Math.round(pageY)), width: Math.round(w), height: Math.round(h) } });
  stats.shot++;
  const W2 = Math.round(w), H2 = Math.round(h);
  return { type: 'svg', name: name || '見た目（スクショ）', w: W2, h: H2,
    svg: `<svg width="${W2}" height="${H2}" viewBox="0 0 ${W2} ${H2}" xmlns="http://www.w3.org/2000/svg">`
       + `<image width="${W2}" height="${H2}" preserveAspectRatio="xMidYMid slice" href="data:image/jpeg;base64,${buf.toString('base64')}"/></svg>` };
}

// 未読込の写真（灰色の枠）を、その場所のスクショに差し替える
async function fillBlanks(n, offX, offY) {
  const kids = n.children || [];
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i];
    if (c.name === '写真（未読込）' && c.__mx != null) {
      const sh = await shotNode(offX + c.__mx, offY + c.__my, c.w, c.h, '写真（スクショ）');
      sh.x = c.x; sh.y = c.y; sh.__w = c.__w; sh.__h = c.__h; sh.__mx = c.__mx; sh.__my = c.__my;
      kids[i] = sh;
    } else await fillBlanks(c, offX, offY);
  }
}

// ⭐ 文字が写真の上に重なっているセクションは、構造では解けない（＝KVと同じ）。
//    重なりは「どちらが上か」「巨大な見出しの実寸」まで合わせないと必ずズレるので、見た目を焼く。
function overlapsPhoto(root) {
  const texts = [], imgs = [];
  const w = n => {
    const isImg = n.type === 'image' || (n.type === 'svg' && /<image/.test(n.svg || ''));
    if (n.type === 'text') texts.push(n);
    else if (isImg) imgs.push(n);
    (n.children || []).forEach(w);
  };
  w(root);
  const box = n => ({ x: n.__mx, y: n.__my, w: n.__w ?? n.w ?? 0, h: n.__h ?? n.h ?? 0 });
  return texts.some(t => {
    if (t.__mx == null) return false;
    const a = box(t);
    return imgs.some(i => {
      if (i.__mx == null) return false;
      const b = box(i);
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      return ox > 8 && oy > 8;      // 8px 以上かぶっていれば「重ね」
    });
  });
}

// KV は丸ごとスクショを敷いて、その上に 文字とベクター だけ乗せる
async function kvFlatten(root, offX, offY) {
  const keep = [];
  const walk = n => {
    (n.children || []).forEach(c => {
      const vector = c.type === 'svg' && !/<image/.test(c.svg || '');
      if (c.type === 'text' || vector) {
        const o = { ...c }; delete o.children;
        o.x = Math.round(c.__mx); o.y = Math.round(c.__my);
        // ⚠️ 枠の外に流れている物（マーキーの続き）はレイヤーを散らかすだけ＝捨てる
        const ow = o.__w ?? o.w ?? 0, oh = o.__h ?? o.h ?? 0;
        if (o.x + ow > 8 && o.x < root.w - 8 && o.y + oh > 8 && o.y < root.h - 8) keep.push(o);
      } else walk(c);
    });
  };
  walk(root);
  const bg = await shotNode(offX, offY, root.w, root.h, '見た目（スクショ）');
  bg.x = 0; bg.y = 0; bg.__w = root.w; bg.__h = root.h; bg.__mx = 0; bg.__my = 0;
  delete root.layout;
  root.children = [bg, ...keep];
}

/* 🔴 同じ場所の写真候補から「中身のある方」を選ぶ。
   空のプレージホルダは極端に軽い＝バイト数がいちばん大きい物が実物。
   （H-7 は <img> が真っ白の 1360×540、実物は ::before の背景だった） */
const sizeCache = new Map();
async function bytesOf(u) {
  if (sizeCache.has(u)) return sizeCache.get(u);
  let n = -1;
  try {
    const r = await fetch(u, { method: 'HEAD' });
    if (r.ok) n = Number(r.headers.get('content-length') || -1);
    if (!(n > 0)) { const g = await fetch(u); if (g.ok) n = (await g.arrayBuffer()).byteLength; }
  } catch (e) { n = -1; }
  sizeCache.set(u, n); return n;
}
async function pickImages(n) {
  if (n.__cands) {
    const sizes = [];
    for (const u of n.__cands) sizes.push([u, await bytesOf(u)]);
    sizes.sort((a, b) => b[1] - a[1]);
    if (sizes[0][1] > 0 && sizes[0][0] !== n.src) { n.src = sizes[0][0]; stats.swap++; }
    delete n.__cands;
  }
  for (const c of n.children || []) await pickImages(c);
}

/* 🔴 .svg を image のまま渡すと壊れる（bake は svg を jpeg 扱いする）。
   中身を取ってきて svg ノードに差し替える＝Figma にネイティブのベクターで出る */
const svgCache = new Map();
async function inlineSvgs(n) {
  if (n.type === 'image' && /\.svg(\?|#|$)/i.test(String(n.src || ''))) {
    if (!svgCache.has(n.src)) {
      let m = null;
      try { const r = await fetch(n.src); if (r.ok) m = await r.text(); } catch (e) { m = null; }
      svgCache.set(n.src, (m && /<svg/i.test(m)) ? m : null);
    }
    const m = svgCache.get(n.src);
    if (m) { n.type = 'svg'; n.svg = m.replace(/<\?xml[^>]*\?>/gi, '').replace(/<!--[\s\S]*?-->/g, '').trim();
             delete n.src; delete n.scaleMode; stats.svg++; }
  }
  for (const c of n.children || []) await inlineSvgs(c);
}

/* ⭐ Figma と同じ規則で展開し直して、サイト実測とズレていないか測る（＝出す前に分かる） */
function verify(root) {
  const bad = [];
  let max = 0, n = 0;
  const padOf = p => (p == null) ? { t: 0, r: 0, b: 0, l: 0 }
    : (typeof p === 'number') ? { t: p, r: p, b: p, l: p }
    : { t: p.top || 0, r: p.right || 0, b: p.bottom || 0, l: p.left || 0 };
  const sz = k => ({ w: k.__w ?? k.w ?? 0, h: k.__h ?? k.h ?? 0 });

  const place = (k, X, Y) => {
    n++;
    if (k.__mx != null) {
      const d = Math.max(Math.abs(X - k.__mx), Math.abs(Y - k.__my));
      if (d > max) max = d;
      if (d > 2) bad.push({ name: k.name || k.type, 実測: `${Math.round(k.__mx)},${Math.round(k.__my)}`, 組上: `${Math.round(X)},${Math.round(Y)}`, ズレ: Math.round(d) });
    }
    const L = k.layout, kids = k.children || [];
    if (!kids.length) return;
    if (!L) { kids.forEach(c => place(c, X + (c.x || 0), Y + (c.y || 0))); return; }
    const flow = kids.filter(c => c.x == null && c.y == null);
    kids.filter(c => c.x != null || c.y != null).forEach(c => place(c, X + c.x, Y + c.y));
    if (!flow.length) return;
    const P = padOf(L.padding), gap = L.gap || 0, horiz = L.mode === 'horizontal';
    const me = sz(k), inW = me.w - P.l - P.r, inH = me.h - P.t - P.b;
    const ss = flow.map(sz);
    const total = ss.reduce((a, c) => a + (horiz ? c.w : c.h), 0) + gap * (ss.length - 1);
    const free = (horiz ? inW : inH) - total;
    const off = L.justify === 'center' ? free / 2 : L.justify === 'end' ? free : 0;
    const gp = (L.justify === 'between' && ss.length > 1) ? gap + free / (ss.length - 1) : gap;
    let cur = (horiz ? X + P.l : Y + P.t) + off;
    flow.forEach((c, i) => {
      const cross = horiz ? inH - ss[i].h : inW - ss[i].w;
      const co = L.align === 'center' ? cross / 2 : L.align === 'end' ? cross : 0;
      if (horiz) place(c, cur, Y + P.t + co); else place(c, X + P.l + co, cur);
      cur += (horiz ? ss[i].w : ss[i].h) + gp;
    });
  };
  place(root, 0, 0);
  return { n, max: Math.round(max * 10) / 10, bad };
}

const done = [];
const targets = [-1, ...secs.map((_, i) => i)];      // ⭐ -1 = KV を 00 として先に
for (const i of targets) {
  const { tree, bg, head } = await grab(i);
  if (i === -1 && (!tree.children || !tree.children.length)) { console.log('（KV は見つからなかった）\n'); continue; }
  try {
    if (i === -1) await p.screenshot({ path: path.join(OUT, 'sec_kv.png'), captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: W, height: Math.min(Math.round(tree.h), 4000) } });
    else await secs[i].screenshot({ path: path.join(OUT, `sec${i}.png`) });
  } catch (e) {}
  const t = collapse(tree, true);
  const root = frameNode(t);
  root.name = (i === -1)
    ? `${PREFIX} — 00 ${Math.round(t.h) >= 200 ? 'KV' : 'ヘッダー'} (${W})`
    : `${PREFIX} — ${String(i + 1).padStart(2, '0')} ${head.slice(0, 18) || 'sec' + (i + 1)} (${W})`;
  root.w = W; root.h = Math.round(t.h);
  if (!root.fill && bg) root.fill = hex(bg);
  // ルート直下が「同じ大きさの入れ物1つ」なら、その中身をルートに引き上げる（無駄な1枚を作らない）
  if (root.children?.length === 1) {
    const c = root.children[0];
    if (c.type === 'frame' && c.x == null && !c.fill && !c.stroke && !c.radius && c.w === root.w && c.h === root.h) {
      root.layout = c.layout; root.children = c.children; root.clip = c.clip || root.clip;
    }
  }

  await pickImages(root);          // 同じ場所の候補から実物を選ぶ
  await inlineSvgs(root);          // .svg は中身を取ってきてベクターにする
  // ⭐ 解けない所はスクショを敷く（KV は丸ごと／未読込の写真はその場所だけ）
  const box = (i === -1) ? { x: 0, y: 0 } : (await secs[i].boundingBox()) || { x: 0, y: 0 };
  // ⚠️ 帯が薄い＝KV ではなく「ヘッダーだけ」。スクショは敷かず、構造のまま建てる
  const isKV = (i === -1) && root.h >= 200;   // ⚠️ 名前の行では root.h でなく t.h を直に見る（TDZ）
  const kasanari = !isKV && overlapsPhoto(root);   // 文字が写真の上に乗っている＝構造では解けない
  if (isKV || kasanari) { await kvFlatten(root, box.x, box.y); if (kasanari) stats.kasanari++; }
  else await fillBlanks(root, box.x, box.y);
  const v = verify(root);          // ⭐ 出す前に、実測とズレていないか測る
  strip(root);

  const name = root.name.replace(/[\/\\:*?"<>|]/g, '-');
  const json = { name: root.name, font: 'Noto Sans JP', root };
  fs.writeFileSync(path.join(LIB, name + '.json'), JSON.stringify(json, null, 1));

  const c = count(root);
  done.push({ name, ...c, ...v });
  console.log(`✅ ${name}`);
  console.log(`   ノード ${c.t} / オートレイアウト ${c.lay} / 絶対配置 ${c.abs} / 写真 ${c.img}`);
  console.log(`   実測とのズレ: 最大 ${v.max}px / 2px超 ${v.bad.length}件`);
  v.bad.slice(0, 4).forEach(x => console.log(`     🔴 ${x.name}  実測${x.実測} → 組上${x.組上}  (${x.ズレ}px)`));
}
await b.close();

function count(n, a = { t: 0, lay: 0, abs: 0, img: 0 }) {
  a.t++; if (n.layout) a.lay++; if (n.x != null || n.y != null) a.abs++; if (n.type === 'image') a.img++;
  (n.children || []).forEach(c => count(c, a)); return a;
}

const T = done.reduce((a, c) => ({ t: a.t + c.t, lay: a.lay + c.lay, abs: a.abs + c.abs, img: a.img + c.img }), { t: 0, lay: 0, abs: 0, img: 0 });
console.log(`\n合計 ${done.length}枚 / ノード ${T.t} / オートレイアウト ${T.lay} / 絶対配置 ${T.abs}（重ねる所）/ 写真 ${T.img}`);
console.log(`束ねた回数 ${stats.band} ── gap が2種類ある所を入れ子にした / svgを取り込んだ ${stats.svg}件 / 写真を実物に差し替えた ${stats.swap}件 / 空だった写真 ${stats.blank}件 / スクショを敷いた ${stats.shot}件（うち 重ね ${stats.kasanari}枚）`);
console.log(`\n→ ${LIB}`);
console.log(`⭐ Figma に出す: cp "library/<名前>.json" mothership.json`);
