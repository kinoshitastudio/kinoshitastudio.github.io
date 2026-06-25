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
// 既存テキストのスタイル名(例 "Semi Bold")を保ったまま別ファミリへ寄せる（Lint のフォント統一用）
async function ensureFontStyle(family, style) {
  if (await _tryLoad(family, style)) return { family, style };
  for (const fb of (STYLE_FALLBACKS[style] || ["Regular"])) {
    if (await _tryLoad(family, fb)) return { family, style: fb };
  }
  if (await _tryLoad(family, "Regular")) return { family, style: "Regular" };
  await _tryLoad("Inter", "Regular");
  return { family: "Inter", style: "Regular" };
}

/* ---------- 色 / トークン / ペイント ---------- */
function hexToRGB(hex) {
  hex = String(hex == null ? "#000000" : hex).replace("#", "").trim();
  if (hex.length === 3 || hex.length === 4) hex = hex.slice(0, 3).split("").map((c) => c + c).join("");  // #RGB / #RGBA → 色は先頭3桁
  const n = parseInt(hex.slice(0, 6), 16) || 0;
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
// hexのアルファ（#RRGGBBAA / #RGBA）。無ければ1。"#00000000" を透明として扱うために必要
function hexAlpha(hex) {
  hex = String(hex == null ? "" : hex).replace("#", "").trim();
  if (hex.length === 4) return parseInt(hex[3] + hex[3], 16) / 255;
  if (hex.length === 8) return parseInt(hex.slice(6, 8), 16) / 255;
  return 1;
}
function rgba(hex, a) { const c = hexToRGB(hex); return { r: c.r, g: c.g, b: c.b, a: a == null ? hexAlpha(hex) : a }; }

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
  if (typeof fill === "string") {
    const a = (opacity == null ? 1 : opacity) * hexAlpha(fill);   // 8桁hexのアルファを尊重
    if (a <= 0) return null;                                       // 完全透明（例: #00000000）はペイントしない
    return { type: "SOLID", color: hexToRGB(fill), opacity: a };
  }
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

  } else if (type === "svg") {
    try {
      n = figma.createNodeFromSvg(String(node.svg || "<svg/>"));   // ベクター（ロゴ/アイコン）をネイティブで
      if (node.w && node.h && n.resize) n.resize(resolve(node.w), resolve(node.h));
    } catch (e) {
      n = figma.createFrame(); n.resize(resolve(node.w) || 100, resolve(node.h) || 100); n.fills = fills("#cccccc");
    }

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
      if (L) {
        if (child.x != null || child.y != null) {            // オートレイアウト内でも x/y があれば絶対配置
          c.layoutPositioning = "ABSOLUTE";
          if (child.x != null) c.x = resolve(child.x);
          if (child.y != null) c.y = resolve(child.y);
        } else {
          if (child.grow) c.layoutGrow = 1;
          if (child.stretch) c.layoutAlign = "STRETCH";
        }
      }
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
// 前回のパネルサイズを復元（ユーザーが右下ドラッグで変えたサイズを記憶）
figma.clientStorage.getAsync("ms_size").then((s) => {
  if (s && s.w && s.h) figma.ui.resize(s.w, s.h);
}).catch(() => {});

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

/* ============================================================
   Lint & Fix — 選択（無ければページ全体）を読んで崩れを検知→一括修正
   ローカル規則のみ（Figma外へ一切送らない）。selection/SceneTree の読み書きは
   通常プラグインAPIの正当範囲。Mothership製でないフレームも対象にできる。
   ============================================================ */
const DEFAULT_NAME = /^(Frame|Group|Rectangle|Ellipse|Line|Polygon|Star|Vector|Component|Slice|Section|Image)(\s\d+)?$/;
let _lintFix = {};  // findingId -> {nodeId, action, data}

// 走査：選択配下を平らに集める。インスタンス内部は主コンポ依存なので降りない
function lintWalk(node, out) {
  out.push(node);
  if (node.type === "INSTANCE") return;
  for (const c of (node.children || [])) lintWalk(c, out);
}
// コンテナ命名用：最初のテキスト内容を拾う
function firstText(node) {
  if (node.type === "TEXT" && node.characters) return node.characters;
  for (const c of (node.children || [])) { if (c.type === "INSTANCE") continue; const t = firstText(c); if (t) return t; }
  return null;
}
function cleanName(s) { s = String(s).replace(/\s+/g, " ").trim(); return s.length > 40 ? s.slice(0, 40) + "…" : s; }
// オートレイアウト配下（絶対配置でない）＝x/yはレイアウト管理なので触らない
function inAutoLayout(n) {
  return n.parent && "layoutMode" in n.parent && n.parent.layoutMode !== "NONE" && n.layoutPositioning !== "ABSOLUTE";
}
function _num(v) { return typeof v === "number"; }
function _median(a) { const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
// 手置きの子が「きれいな1行/1列」なら {axis:"x"|"y", gap} を返す（オートレイアウト化の候補）
function autoCandidate(n) {
  if ((n.type !== "FRAME" && n.type !== "COMPONENT") || !("layoutMode" in n) || n.layoutMode !== "NONE") return null;
  const kids = (n.children || []).filter((c) => c.visible !== false && _num(c.x) && _num(c.y) && _num(c.width) && _num(c.height));
  if (kids.length < 3) return null;
  const evalAxis = (main) => {
    const cross = main === "x" ? "y" : "x", msz = main === "x" ? "width" : "height", csz = main === "x" ? "height" : "width";
    const sorted = kids.slice().sort((a, b) => a[main] - b[main]);
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i][main] - (sorted[i - 1][main] + sorted[i - 1][msz]));
    if (gaps.some((g) => g < -1)) return null;                       // 主軸で重なり＝行/列でない
    const gmin = Math.min(...gaps), gmax = Math.max(...gaps), gmean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (gmax - gmin > Math.max(12, gmean * 0.6)) return null;        // 間隔がバラバラ＝整列でない
    const cmax = Math.max(...kids.map((c) => c[csz]));
    const centers = kids.map((c) => c[cross] + c[csz] / 2);
    if (Math.max(...centers) - Math.min(...centers) > cmax * 0.6) return null;  // クロス軸の帯から外れる
    return { axis: main, gap: Math.max(0, Math.round(_median(gaps))) };
  };
  return evalAxis("x") || evalAxis("y");
}

async function runLint() {
  const sel = figma.currentPage.selection;
  const roots = sel.length ? sel.slice() : figma.currentPage.children.slice();
  const all = [];
  for (const r of roots) lintWalk(r, all);

  // フォント分布（最多ファミリを基準＝dominant）
  const fam = {};
  for (const n of all) if (n.type === "TEXT" && n.fontName && n.fontName !== figma.mixed) fam[n.fontName.family] = (fam[n.fontName.family] || 0) + 1;
  let dom = null, domc = -1;
  for (const f in fam) if (fam[f] > domc) { dom = f; domc = fam[f]; }
  const multiFam = Object.keys(fam).length > 1;

  _lintFix = {};
  let idn = 0;
  const findings = [];
  const r1 = (v) => Math.round(v * 10) / 10;  // 表示用に小数1桁
  // ノード参照を直接保持（documentAccess:"dynamic-page" では同期 getNodeById が使えないため）
  const add = (cat, sev, msg, node, action, data, detail) => {
    const fid = "f" + (idn++);
    _lintFix[fid] = { node, action: action || null, data: data || null };
    findings.push({ id: fid, cat, sev, msg, node: node.name, fixable: !!action, detail: detail || "" });
  };

  for (const n of all) {
    const w = ("width" in n) ? n.width : null, h = ("height" in n) ? n.height : null;
    // 1) 不要レイヤー（非表示／不透明度0／サイズ0の残骸）
    if (n.visible === false) { add("cruft", "low", "非表示レイヤー", n, "remove", null, "削除される"); continue; }
    if ("opacity" in n && n.opacity === 0) { add("cruft", "low", "不透明度0のレイヤー", n, "remove", null, "削除される"); continue; }
    if (w === 0 || h === 0) { add("cruft", "low", "サイズ0のレイヤー", n, "remove", null, "削除される"); continue; }
    // 2) サブピクセルのずれ（整数スナップ）— 何がどう変わるかを before→after で示す
    const sub = (v) => v != null && Math.abs(v - Math.round(v)) > 0.01;
    const auto = inAutoLayout(n);
    const parts = [];
    if (!auto) { if (sub(n.x)) parts.push("x " + r1(n.x) + "→" + Math.round(n.x)); if (sub(n.y)) parts.push("y " + r1(n.y) + "→" + Math.round(n.y)); }
    if (sub(w)) parts.push("W " + r1(w) + "→" + Math.round(w)); if (sub(h)) parts.push("H " + r1(h) + "→" + Math.round(h));
    if (parts.length) add("snap", "low", "サブピクセルのずれ", n, "snap", null, parts.join("  "));
    // 3) 既定の名前（コンテナは中身のテキストから命名／それ以外は指摘のみ）
    if (DEFAULT_NAME.test(n.name)) {
      if (n.type === "FRAME" || n.type === "GROUP" || n.type === "SECTION" || n.type === "COMPONENT") {
        const t = firstText(n);
        if (t) add("name", "med", "既定の名前", n, "rename", { newName: cleanName(t) }, "→「" + cleanName(t) + "」");
        else add("name", "low", "既定の名前（中身にテキスト無し）", n, null, null, "手動で命名");
      } else {
        add("name", "low", "既定の名前", n, null, null, "手動で命名");
      }
    }
    // 4) フォント揺れ（最多ファミリへ統一・スタイルは保持）
    if (multiFam && n.type === "TEXT" && n.fontName && n.fontName !== figma.mixed && n.fontName.family !== dom) {
      add("font", "med", "フォント揺れ", n, "unifyFont", { family: dom }, "「" + n.fontName.family + "」→「" + dom + "」");
    }
    // 5) オートレイアウト化（手置きで並んだ行/列をオートレイアウトへ）
    const ac = autoCandidate(n);
    if (ac) add("auto", "med", "オートレイアウト化", n, "autolayout", { axis: ac.axis, gap: ac.gap }, (ac.axis === "x" ? "横並び" : "縦並び") + "・間隔" + ac.gap + "px");
  }
  figma.ui.postMessage({ type: "lint-result", findings, summary: { nodes: all.length, scope: sel.length ? "selection" : "page", dominant: dom } });
}

async function applyFixes(ids) {
  let ok = 0, failN = 0;
  try {
    for (const fid of (ids || [])) {
      const f = _lintFix[fid];
      if (!f || !f.action) continue;
      const n = f.node;                      // 参照を直接保持済み
      if (!n || n.removed) continue;
      try {
        if (f.action === "remove") n.remove();
        else if (f.action === "rename") n.name = f.data.newName;
        else if (f.action === "snap") {
          if (!inAutoLayout(n)) { if (typeof n.x === "number") n.x = Math.round(n.x); if (typeof n.y === "number") n.y = Math.round(n.y); }
          if ("resize" in n && typeof n.width === "number") n.resize(Math.round(n.width), Math.round(n.height));
        } else if (f.action === "unifyFont") {
          if (n.type === "TEXT" && n.fontName && n.fontName !== figma.mixed) n.fontName = await ensureFontStyle(f.data.family, n.fontName.style);
        } else if (f.action === "autolayout") {
          const horiz = f.data.axis === "x";
          const main = horiz ? "x" : "y", msz = horiz ? "width" : "height", cross = horiz ? "y" : "x", csz = horiz ? "height" : "width";
          const kids = (n.children || []).filter((c) => _num(c.x) && c.visible !== false);
          if (kids.length >= 2 && "layoutMode" in n) {
            const sorted = kids.slice().sort((a, b) => a[main] - b[main]);
            const last = sorted[sorted.length - 1];
            const frameMain = horiz ? n.width : n.height, frameCross = horiz ? n.height : n.width;
            const padMain = Math.max(0, Math.round(sorted[0][main]));
            const trailMain = Math.max(0, Math.round(frameMain - (last[main] + last[msz])));
            const padCross = Math.max(0, Math.round(Math.min(...kids.map((c) => c[cross]))));
            const trailCross = Math.max(0, Math.round(frameCross - Math.max(...kids.map((c) => c[cross] + c[csz]))));
            const cents = kids.map((c) => c[cross] + c[csz] / 2), tops = kids.map((c) => c[cross]);
            const spread = (a) => Math.max(...a) - Math.min(...a);
            const align = spread(cents) < spread(tops) ? "CENTER" : "MIN";
            sorted.forEach((c) => n.appendChild(c));     // 視覚順に並べ替えてから有効化
            n.layoutMode = horiz ? "HORIZONTAL" : "VERTICAL";
            n.primaryAxisSizingMode = "FIXED"; n.counterAxisSizingMode = "FIXED";
            n.itemSpacing = f.data.gap;
            if (horiz) { n.paddingLeft = padMain; n.paddingRight = trailMain; n.paddingTop = padCross; n.paddingBottom = trailCross; }
            else { n.paddingTop = padMain; n.paddingBottom = trailMain; n.paddingLeft = padCross; n.paddingRight = trailCross; }
            n.counterAxisAlignItems = align; n.primaryAxisAlignItems = "MIN";
          }
        }
        ok++;
      } catch (e) { failN++; }              // 1件の失敗で全体を止めない
    }
  } catch (e) {
    figma.notify("修正でエラー: " + (e && e.message ? e.message : e));
  } finally {
    // 何が起きても必ず UI を解放する（残りを再スキャンして返す＋完了通知）
    try { await runLint(); } catch (e) { figma.ui.postMessage({ type: "lint-result", findings: [], summary: { nodes: 0, scope: "error" } }); }
    figma.ui.postMessage({ type: "fix-done", ok, fail: failN });
    figma.notify("整えました：" + ok + " 件" + (failN ? ("／失敗 " + failN) : ""));
  }
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === "generate") await generate(msg.json, true);
  else if (msg.type === "live") await generate(msg.json, false);
  else if (msg.type === "lint") await runLint();
  else if (msg.type === "fix") await applyFixes(msg.ids);
  else if (msg.type === "reveal") {  // パネルの行クリック→該当レイヤーをFigmaで選択＋ズーム
    const f = _lintFix[msg.id];
    if (f && f.node && !f.node.removed) {
      try { figma.currentPage.selection = [f.node]; figma.viewport.scrollAndZoomIntoView([f.node]); } catch (e) {}
    }
  }
  else if (msg.type === "open" && msg.url) figma.openExternal(msg.url);
  else if (msg.type === "resize") {
    const w = Math.max(300, Math.min(1400, Math.round(msg.w || 380)));
    const h = Math.max(360, Math.min(1600, Math.round(msg.h || 600)));
    figma.ui.resize(w, h);
    figma.clientStorage.setAsync("ms_size", { w: w, h: h });  // 次回起動時に復元
  } else if (msg.type === "panelsize") {  // 折りたたみ用：最小高さ制限を回さず小さくできる
    const w = Math.max(200, Math.min(1400, Math.round(msg.w || 380)));
    const h = Math.max(40, Math.min(1600, Math.round(msg.h || 600)));
    figma.ui.resize(w, h);
    if (msg.remember) figma.clientStorage.setAsync("ms_size", { w: w, h: h });
  }
};
