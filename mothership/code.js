/* ============================================================
   Mothership — Mothership JSON → ネイティブ Figma ノード生成
   木下スタジオ / kinoshita.studio
   設計の「原本(JSON)」を、編集可能な本物のFigmaノードに翻訳する。
   対応: frame/text/rect/ellipse/line/image・オートレイアウト・トークン参照
        ・font.family（日本語フォント可）・ドロップシャドウ・グラデーション
   ============================================================ */

/* ---------- フォント ---------- */
let DEFAULT_FAMILY = "Inter";
const WEIGHT_STYLE = {
  100: "Thin", 200: "Extra Light", 300: "Light", 400: "Regular",
  500: "Medium", 600: "Semi Bold", 700: "Bold", 800: "Extra Bold", 900: "Black"
};
// 指定スタイルが無いファミリ(例: Noto Sans JP に Semi Bold 無し)向けのフォールバック順
const STYLE_FALLBACKS = {
  "Thin": ["Light", "Regular"], "Extra Light": ["Light", "Regular"], "Light": ["Regular"],
  "Regular": ["Medium"], "Medium": ["Regular"], "Semi Bold": ["Bold", "Medium", "Regular"],
  "Bold": ["Medium", "Regular"], "Extra Bold": ["Bold", "Medium", "Regular"], "Black": ["Bold", "Medium", "Regular"]
};
const _loaded = new Set();
async function _tryLoad(family, style) {
  const key = family + "|" + style;
  if (_loaded.has(key)) return true;
  try { await figma.loadFontAsync({ family, style }); _loaded.add(key); return true; }
  catch (e) { return false; }
}
async function ensureFont(family, weight) {
  const want = WEIGHT_STYLE[weight] || "Regular";
  if (await _tryLoad(family, want)) return { family, style: want };
  for (const fb of (STYLE_FALLBACKS[want] || ["Regular"])) {
    if (await _tryLoad(family, fb)) return { family, style: fb };
  }
  if (await _tryLoad("Inter", "Regular")) return { family: "Inter", style: "Regular" };
  return { family, style: "Regular" };
}

/* ---------- 色 / トークン / ペイント ---------- */
function hexToRGB(hex) {
  hex = String(hex == null ? "#000000" : hex).replace("#", "").trim();
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const n = parseInt(hex.slice(0, 6), 16) || 0;
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
function rgba(hex, a) { const c = hexToRGB(hex); return { r: c.r, g: c.g, b: c.b, a: a == null ? 1 : a }; }

let TOKENS = {};
function resolve(val) {
  if (typeof val !== "string" || val[0] !== "@") return val;
  const path = val.slice(1).split(".");
  let cur = TOKENS;
  for (const k of path) { if (cur == null) return val; cur = cur[k]; }
  return cur == null ? val : cur;
}

// 角度(deg)→ Figmaの線形グラデーション変換行列。0=左→右, 90=上→下
function linearTransform(angleDeg) {
  const a = angleDeg * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  return [[cos, sin, (1 - cos - sin) / 2], [-sin, cos, (sin - cos + 1) / 2]];
}
// fill: 文字列(hex) | {gradient:[hex...], angle} | {type:"linear|radial", angle, stops:[{color,at,opacity}]}
function toPaint(fill, opacity) {
  fill = resolve(fill);
  if (fill == null) return null;
  if (typeof fill === "string") return { type: "SOLID", color: hexToRGB(fill), opacity: opacity == null ? 1 : opacity };
  let stops = fill.stops;
  if (!stops && Array.isArray(fill.gradient)) {
    const cols = fill.gradient.map(resolve);
    stops = cols.map((c, i) => ({ color: c, at: cols.length < 2 ? 0 : i / (cols.length - 1) }));
  }
  stops = (stops || []).map((s) => ({ position: s.at == null ? 0 : s.at, color: rgba(resolve(s.color), s.opacity) }));
  if (!stops.length) stops = [{ position: 0, color: rgba("#000000", 1) }];
  const radial = fill.type === "radial";
  return {
    type: radial ? "GRADIENT_RADIAL" : "GRADIENT_LINEAR",
    gradientTransform: radial ? [[0.5, 0, 0.25], [0, 0.5, 0.25]] : linearTransform(fill.angle == null ? 90 : fill.angle),
    gradientStops: stops,
    opacity: opacity == null ? 1 : opacity
  };
}
function fills(fill, opacity, def) {
  const f = fill == null ? (def == null ? null : def) : fill;
  if (f == null) return [];
  const p = toPaint(f, opacity);
  return p ? [p] : [];
}

/* ---------- パディング / シャドウ ---------- */
function applyPadding(frame, pad) {
  if (pad == null) return;
  if (typeof pad === "number") { frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = pad; }
  else { frame.paddingTop = pad.top || 0; frame.paddingBottom = pad.bottom || 0; frame.paddingLeft = pad.left || 0; frame.paddingRight = pad.right || 0; }
}
// shadow: {x,y,blur,spread,color,opacity,inner} または その配列
function applyShadow(n, shadow) {
  if (!shadow || !("effects" in n)) return;
  const arr = Array.isArray(shadow) ? shadow : [shadow];
  n.effects = arr.map((s) => ({
    type: s.inner ? "INNER_SHADOW" : "DROP_SHADOW",
    color: rgba(s.color || "#000000", s.opacity == null ? 0.18 : s.opacity),
    offset: { x: s.x == null ? 0 : s.x, y: s.y == null ? 8 : s.y },
    radius: s.blur == null ? 16 : s.blur,
    spread: s.spread || 0,
    visible: true, blendMode: "NORMAL"
  }));
}

/* ---------- ノード生成（再帰） ---------- */
async function build(node) {
  const type = node.type || "frame";
  let n;

  if (type === "text") {
    n = figma.createText();
    const family = (node.font && node.font.family) || DEFAULT_FAMILY;
    const weight = (node.font && node.font.weight) || 400;
    n.fontName = await ensureFont(family, weight);
    n.characters = node.text != null ? String(resolve(node.text)) : "";
    const size = resolve(node.font && node.font.size); if (size) n.fontSize = size;
    const ls = resolve(node.font && node.font.letterSpacing); if (ls != null) n.letterSpacing = { value: ls, unit: "PIXELS" };
    const lh = resolve(node.font && node.font.lineHeight); if (lh) n.lineHeight = { value: lh, unit: "PIXELS" };
    if (node.align) n.textAlignHorizontal = String(node.align).toUpperCase();
    n.fills = fills(node.fill, node.opacity, "#1a1a18");
    if (node.w) { n.textAutoResize = "HEIGHT"; n.resize(resolve(node.w), n.height); }

  } else if (type === "rect") {
    n = figma.createRectangle();
    n.resize(resolve(node.w) || 100, resolve(node.h) || 100);
    n.fills = fills(node.fill, node.opacity, "#cccccc");
    if (node.radius != null) n.cornerRadius = resolve(node.radius);
    if (node.stroke) { n.strokes = fills(node.stroke); n.strokeWeight = node.strokeWidth || 1; }

  } else if (type === "ellipse") {
    n = figma.createEllipse();
    n.resize(resolve(node.w) || 100, resolve(node.h) || 100);
    n.fills = fills(node.fill, node.opacity, "#cccccc");
    if (node.stroke) { n.strokes = fills(node.stroke); n.strokeWeight = node.strokeWidth || 1; }

  } else if (type === "line") {
    n = figma.createLine();
    n.resize(resolve(node.w) || 100, 0);
    n.strokes = fills(node.stroke, null, "#1a1a18");
    n.strokeWeight = node.strokeWidth || 1;

  } else if (type === "image") {
    n = figma.createRectangle();
    n.resize(resolve(node.w) || 200, resolve(node.h) || 200);
    if (node.radius != null) n.cornerRadius = resolve(node.radius);
    try { const img = await figma.createImageAsync(node.src); n.fills = [{ type: "IMAGE", scaleMode: node.scaleMode || "FILL", imageHash: img.hash }]; }
    catch (e) { n.fills = fills("#999999"); }

  } else {
    n = figma.createFrame();
    n.resize(resolve(node.w) || 200, resolve(node.h) || 200);
    n.fills = node.fill ? fills(node.fill, node.opacity) : [];
    if (node.radius != null) n.cornerRadius = resolve(node.radius);
    if (node.stroke) { n.strokes = fills(node.stroke); n.strokeWeight = node.strokeWidth || 1; }
    if (node.clip != null) n.clipsContent = !!node.clip;

    const L = node.layout;
    if (L) {
      n.layoutMode = L.mode === "horizontal" ? "HORIZONTAL" : "VERTICAL";
      n.itemSpacing = L.gap != null ? resolve(L.gap) : 0;
      applyPadding(n, resolve(L.padding));
      const horiz = L.mode === "horizontal";
      n.primaryAxisSizingMode = (horiz ? node.w : node.h) ? "FIXED" : "AUTO";
      n.counterAxisSizingMode = (horiz ? node.h : node.w) ? "FIXED" : "AUTO";
      const align = L.align || "start";
      n.counterAxisAlignItems = align === "center" ? "CENTER" : align === "end" ? "MAX" : "MIN";
      const justify = L.justify || "start";
      n.primaryAxisAlignItems =
        justify === "center" ? "CENTER" : justify === "end" ? "MAX" : justify === "between" ? "SPACE_BETWEEN" : "MIN";
    }
    for (const child of node.children || []) {
      const c = await build(child);
      n.appendChild(c);
      if (L) { if (child.grow) c.layoutGrow = 1; if (child.stretch) c.layoutAlign = "STRETCH"; }
    }
  }

  if (node.name) n.name = String(node.name);
  if (node.opacity != null && "opacity" in n) n.opacity = node.opacity;
  applyShadow(n, node.shadow);
  if (node.x != null) n.x = resolve(node.x);
  if (node.y != null) n.y = resolve(node.y);
  return n;
}

/* ---------- エントリ（名前ベースの和解） ---------- */
figma.showUI(__html__, { width: 380, height: 600, title: "Mothership" });

const generated = {}; // name -> 生成済みノード（同名は置き換え、新名は新フレーム）

function nextFreeX() {
  // ページ上の全トップレベルノードの右端を基準に（重なり防止・再起動をまたいでも有効）
  let maxRight = null;
  for (const n of figma.currentPage.children) {
    if (!n || n.removed) continue;
    const r = n.x + n.width;
    if (maxRight == null || r > maxRight) maxRight = r;
  }
  return maxRight == null ? figma.viewport.center.x : maxRight + 80;
}

function countNodes(node) {
  let n = 1;
  (node.children || []).forEach((c) => { n += countNodes(c); });
  return n;
}

async function generate(jsonStr, zoom) {
  let doc;
  try { doc = JSON.parse(jsonStr); }
  catch (e) { figma.notify("JSON parse error: " + e.message); return; }

  TOKENS = doc.tokens || {};
  DEFAULT_FAMILY = doc.font || "Inter";
  const roots = Array.isArray(doc.root) ? doc.root : [doc.root || doc];

  const total = roots.reduce((a, r) => a + countNodes(r), 0);
  figma.ui.postMessage({ type: "gen-start", count: total, est: 320 + total * 7 });
  const t0 = Date.now();

  try {
    const made = [];
    // 新規フレームの配置基準：選択中フレームの右隣／無ければ今見ている場所（遠くに飛ばさない）
    const vc = figma.viewport.center;
    const sel = figma.currentPage.selection;
    let anchorX, anchorY, anchorMode;
    if (sel.length && typeof sel[0].x === "number") {
      anchorX = sel[0].x + (sel[0].width || 0) + 80; anchorY = sel[0].y; anchorMode = "right";
    } else { anchorX = vc.x; anchorY = vc.y; anchorMode = "center"; }
    let stack = 0;
    for (const r of roots) {
      const name = r.name || "Frame";
      let px = null, py = null;
      // メモリの記録 → 無ければページ上の同名フレームを探す（プラグイン再起動をまたいでも同じ原本を更新＝増殖しない）
      let prev = generated[name];
      if (!(prev && !prev.removed)) prev = figma.currentPage.children.find((n) => n.name === name);
      const isNew = !(prev && !prev.removed);
      if (!isNew) { px = prev.x; py = prev.y; prev.remove(); delete generated[name]; }

      const node = await build(r);
      figma.currentPage.appendChild(node);
      if (px != null) { node.x = px; node.y = py; }                          // 既存：その場で更新（動かさない）
      else if (r.x != null || r.y != null) { node.x = (r.x != null ? r.x : anchorX); node.y = (r.y != null ? r.y : anchorY); } // JSON指定優先
      else if (anchorMode === "center") {                                    // 何も選択なし：今見ている中央に
        node.x = Math.round(vc.x - node.width / 2) + stack * 40;
        node.y = Math.round(vc.y - node.height / 2) + stack * 40; stack++;
      } else {                                                               // 選択あり：その右隣に並べる
        node.x = anchorX + stack * (node.width + 80); node.y = anchorY; stack++;
      }
      generated[name] = node;
      made.push(node);
    }
    figma.currentPage.selection = made;
    // 生成・更新のたびに結果へカメラを寄せる（ライブラリ送信／詰め書き出しのどちらでも追える）
    figma.viewport.scrollAndZoomIntoView(made);
    figma.ui.postMessage({ type: "gen-done", count: made.length, ms: Date.now() - t0 });
  } catch (e) {
    figma.ui.postMessage({ type: "gen-done", count: 0, ms: Date.now() - t0, error: String(e && e.message ? e.message : e) });
    figma.notify("Build error: " + (e && e.message ? e.message : e));
  }
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === "generate") await generate(msg.json, true);
  else if (msg.type === "live") await generate(msg.json, false);
  else if (msg.type === "open" && msg.url) figma.openExternal(msg.url);
};
