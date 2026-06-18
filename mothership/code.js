/* ============================================================
   Mothership — Mothership JSON → ネイティブ Figma ノード生成
   木下スタジオ / kinoshita.studio
   設計の「原本(JSON)」を、編集可能な本物のFigmaノードに翻訳する。
   SVG貼り付けと違い、テキスト・オートレイアウト・角丸などが
   すべてネイティブで残る（＝強いFigmaユーザーがそのまま編集できる）。
   ============================================================ */

const FONT_FAMILY = "Inter";
const WEIGHT_STYLE = {
  100: "Thin", 200: "Extra Light", 300: "Light", 400: "Regular",
  500: "Medium", 600: "Semi Bold", 700: "Bold", 800: "Extra Bold", 900: "Black"
};

/* ---------- helpers ---------- */
function hexToRGB(hex) {
  hex = String(hex == null ? "#000000" : hex).replace("#", "").trim();
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const n = parseInt(hex.slice(0, 6), 16) || 0;
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
function solid(hex, opacity) {
  return [{ type: "SOLID", color: hexToRGB(hex), opacity: opacity == null ? 1 : opacity }];
}
function styleFor(weight) {
  return WEIGHT_STYLE[weight] || "Regular";
}

/* デザイントークン（doc.tokens）の参照を実値へ解決する。
   例: fill: "@colors.accent" / font.size: "@text.h1.size" */
let TOKENS = {};
function resolve(val) {
  if (typeof val !== "string" || val[0] !== "@") return val;
  const path = val.slice(1).split(".");
  let cur = TOKENS;
  for (const k of path) { if (cur == null) return val; cur = cur[k]; }
  return cur == null ? val : cur;
}

/* ---------- フォントの事前ロード ---------- */
function collectWeights(node, acc) {
  if (!node || typeof node !== "object") return acc;
  if (node.type === "text") acc.push((node.font && node.font.weight) || 400);
  (node.children || []).forEach((c) => collectWeights(c, acc));
  return acc;
}
async function loadFonts(weights) {
  const styles = new Set(["Regular", "Medium", "Bold"]);
  weights.forEach((w) => styles.add(styleFor(w)));
  for (const s of styles) {
    try { await figma.loadFontAsync({ family: FONT_FAMILY, style: s }); } catch (e) { /* スキップ */ }
  }
}

/* ---------- パディング正規化 ---------- */
function applyPadding(frame, pad) {
  if (pad == null) return;
  if (typeof pad === "number") {
    frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = pad;
  } else {
    frame.paddingTop = pad.top || 0;
    frame.paddingBottom = pad.bottom || 0;
    frame.paddingLeft = pad.left || 0;
    frame.paddingRight = pad.right || 0;
  }
}

/* ---------- ノード生成（再帰） ---------- */
async function build(node) {
  const type = node.type || "frame";
  let n;

  if (type === "text") {
    n = figma.createText();
    const weight = (node.font && node.font.weight) || 400;
    n.fontName = { family: FONT_FAMILY, style: styleFor(weight) };
    n.characters = node.text != null ? String(resolve(node.text)) : "";
    const size = resolve(node.font && node.font.size);
    if (size) n.fontSize = size;
    const lh = resolve(node.font && node.font.lineHeight);
    if (lh) n.lineHeight = { value: lh, unit: "PIXELS" };
    if (node.align) n.textAlignHorizontal = String(node.align).toUpperCase();
    n.fills = solid(resolve(node.fill) || "#1a1a18", node.opacity);
    if (node.w) { n.textAutoResize = "HEIGHT"; n.resize(resolve(node.w), n.height); }

  } else if (type === "rect") {
    n = figma.createRectangle();
    n.resize(resolve(node.w) || 100, resolve(node.h) || 100);
    n.fills = solid(resolve(node.fill) || "#cccccc", node.opacity);
    if (node.radius != null) n.cornerRadius = resolve(node.radius);
    if (node.stroke) { n.strokes = solid(resolve(node.stroke)); n.strokeWeight = node.strokeWidth || 1; }

  } else if (type === "ellipse") {
    n = figma.createEllipse();
    n.resize(resolve(node.w) || 100, resolve(node.h) || 100);
    n.fills = solid(resolve(node.fill) || "#cccccc", node.opacity);
    if (node.stroke) { n.strokes = solid(resolve(node.stroke)); n.strokeWeight = node.strokeWidth || 1; }

  } else if (type === "line") {
    n = figma.createLine();
    n.resize(resolve(node.w) || 100, 0);
    n.strokes = solid(resolve(node.stroke) || "#1a1a18");
    n.strokeWeight = node.strokeWidth || 1;

  } else if (type === "image") {
    n = figma.createRectangle();
    n.resize(resolve(node.w) || 200, resolve(node.h) || 200);
    if (node.radius != null) n.cornerRadius = resolve(node.radius);
    try {
      const img = await figma.createImageAsync(node.src);
      n.fills = [{ type: "IMAGE", scaleMode: node.scaleMode || "FILL", imageHash: img.hash }];
    } catch (e) { n.fills = solid("#999999"); }

  } else {
    /* frame（既定）— オートレイアウト対応 */
    n = figma.createFrame();
    n.resize(resolve(node.w) || 200, resolve(node.h) || 200);
    n.fills = node.fill ? solid(resolve(node.fill), node.opacity) : [];
    if (node.radius != null) n.cornerRadius = resolve(node.radius);
    if (node.stroke) { n.strokes = solid(resolve(node.stroke)); n.strokeWeight = node.strokeWidth || 1; }
    if (node.clip != null) n.clipsContent = !!node.clip;

    const L = node.layout;
    if (L) {
      n.layoutMode = L.mode === "horizontal" ? "HORIZONTAL" : "VERTICAL";
      n.itemSpacing = L.gap != null ? resolve(L.gap) : 0;
      applyPadding(n, resolve(L.padding));
      // 主軸 = レイアウト方向 / 交差軸 = それと直交
      const horiz = L.mode === "horizontal";
      n.primaryAxisSizingMode = (horiz ? node.w : node.h) ? "FIXED" : "AUTO";
      n.counterAxisSizingMode = (horiz ? node.h : node.w) ? "FIXED" : "AUTO";
      // 整列
      const align = L.align || "start";
      n.counterAxisAlignItems = align === "center" ? "CENTER" : align === "end" ? "MAX" : "MIN";
      const justify = L.justify || "start";
      n.primaryAxisAlignItems =
        justify === "center" ? "CENTER" : justify === "end" ? "MAX" : justify === "between" ? "SPACE_BETWEEN" : "MIN";
    }

    for (const child of node.children || []) {
      const c = await build(child);
      n.appendChild(c);
      if (L) {
        if (child.grow) c.layoutGrow = 1;
        if (child.stretch) c.layoutAlign = "STRETCH";
      }
    }
  }

  if (node.name) n.name = String(node.name);
  if (node.opacity != null && "opacity" in n) n.opacity = node.opacity;
  if (node.x != null) n.x = resolve(node.x);
  if (node.y != null) n.y = resolve(node.y);
  return n;
}

/* ---------- エントリ ---------- */
figma.showUI(__html__, { width: 380, height: 600, title: "Mothership" });

let lastNodes = []; // ライブ更新で前回生成分を入れ替えるための参照

async function generate(jsonStr, opts) {
  opts = opts || {};
  let doc;
  try { doc = JSON.parse(jsonStr); }
  catch (e) { figma.notify("JSON parse error: " + e.message); return; }

  TOKENS = doc.tokens || {};
  const roots = Array.isArray(doc.root) ? doc.root : [doc.root || doc];

  // ライブ(replace)時は前回生成したルートを置き換える＝Figmaが散らからない
  let baseX = null, baseY = null;
  if (opts.replace && lastNodes.length) {
    const alive = lastNodes.filter((n) => !n.removed);
    if (alive.length) { baseX = alive[0].x; baseY = alive[0].y; }
    alive.forEach((n) => n.remove());
  }
  lastNodes = [];

  try {
    await loadFonts(roots.reduce((a, r) => collectWeights(r, a), []));
    const made = [];
    let offsetX = baseX != null ? baseX : figma.viewport.center.x;
    const topY = baseY != null ? baseY : figma.viewport.center.y;
    for (const r of roots) {
      const node = await build(r);
      figma.currentPage.appendChild(node);
      if (r.x == null) node.x = offsetX;
      if (r.y == null) node.y = topY;
      offsetX += node.width + 80;
      made.push(node);
    }
    lastNodes = made;
    if (!opts.replace) {
      figma.currentPage.selection = made;
      figma.viewport.scrollAndZoomIntoView(made);
    }
    figma.notify("Mothership: " + made.length + " ノードを" + (opts.replace ? "更新" : "生成") + "しました ✓");
  } catch (e) {
    figma.notify("Build error: " + (e && e.message ? e.message : e));
  }
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === "generate") await generate(msg.json, { replace: false });
  else if (msg.type === "live") await generate(msg.json, { replace: true });
};
