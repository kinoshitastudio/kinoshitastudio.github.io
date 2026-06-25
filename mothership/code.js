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
// 選択状態をUIへ通知（メインチャットで「選択フレームを編集」に切替えるため）
figma.on("selectionchange", () => { try { postSel(); } catch (e) {} });
setTimeout(() => { try { postSel(); } catch (e) {} }, 60);  // 起動直後の現在選択も送る

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
function _spread(a) { return Math.max(...a) - Math.min(...a); }
function _snap8(v) { v = Math.max(0, v); if (v < 2) return 0; if (v < 6) return 4; return Math.round(v / 8) * 8; }  // 8ptグリッド（小さい間は4）
function _snap4(v) { return Math.round(v / 4) * 4; }
function _offGrid(v) { return _num(v) && v > 0 && v % 4 !== 0; }   // 4の倍数でない＝グリッド外
// フレーム内で「背景/装飾」とみなす子（大きく覆う・全幅/全高）。オートレイアウト化では絶対配置で残す
function _isDecor(c, fw, fh) { return (c.width * c.height) >= fw * fh * 0.55 || c.width >= fw * 0.92 || c.height >= fh * 0.92; }
// 手置きの子が「1行/1列の積み重ね」なら {axis,gap} を返す。装飾は除外し、間隔のバラつきは許容（中央値を8ptに）
function autoCandidate(n) {
  if ((n.type !== "FRAME" && n.type !== "COMPONENT") || !("layoutMode" in n) || n.layoutMode !== "NONE") return null;
  const all = (n.children || []).filter((c) => c.visible !== false && _num(c.x) && _num(c.y) && _num(c.width) && _num(c.height));
  if (all.length < 2) return null;
  const kids = all.filter((c) => !_isDecor(c, n.width, n.height));
  if (kids.length < 2) return null;
  const evalAxis = (main) => {
    const cross = main === "x" ? "y" : "x", msz = main === "x" ? "width" : "height", csz = main === "x" ? "height" : "width";
    const sorted = kids.slice().sort((a, b) => a[main] - b[main]);
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i][main] - (sorted[i - 1][main] + sorted[i - 1][msz]));
    if (gaps.some((g) => g < -2)) return null;                       // 主軸で重なり＝1D並びでない
    const cmax = Math.max(...kids.map((c) => c[csz]));
    const centers = kids.map((c) => c[cross] + c[csz] / 2), lefts = kids.map((c) => c[cross]);
    if (Math.min(_spread(centers), _spread(lefts)) > cmax * 0.5) return null;  // 中央揃いも端揃いも崩れ＝1D並びでない
    return { axis: main, gap: _snap8(_median(gaps)) };
  };
  return evalAxis("y") || evalAxis("x");   // 縦積み優先
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
    // 5) オートレイアウト化（手置きで並んだ行/列をオートレイアウトへ・装飾は絶対配置で温存）
    const ac = autoCandidate(n);
    if (ac) add("auto", "med", "オートレイアウト化", n, "autolayout", { axis: ac.axis, gap: ac.gap }, (ac.axis === "x" ? "横並び" : "縦並び") + "・間隔" + ac.gap + "px・余白も8pt整列");
    // 6) 余白グリッド（既存オートレイアウトの padding/gap が4/8pxグリッド外）
    if (("layoutMode" in n) && n.layoutMode && n.layoutMode !== "NONE") {
      if ([n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft, n.itemSpacing].some(_offGrid)) {
        add("grid", "low", "余白がグリッド外", n, "grid8", null, "→ 4/8pxに整列");
      }
    }
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
          const main = horiz ? "x" : "y", cross = horiz ? "y" : "x", csz = horiz ? "height" : "width";
          const all = (n.children || []).filter((c) => _num(c.x) && c.visible !== false);
          const decor = all.filter((c) => _isDecor(c, n.width, n.height)), content = all.filter((c) => !_isDecor(c, n.width, n.height));
          if (content.length >= 2 && "layoutMode" in n) {
            const sorted = content.slice().sort((a, b) => a[main] - b[main]);
            const padMain = _snap8(sorted[0][main]);                                   // 先頭までの余白を8ptに
            const padCross = _snap8(Math.min(...content.map((c) => c[cross])));        // クロス軸の余白を8ptに
            const cents = content.map((c) => c[cross] + c[csz] / 2), lefts = content.map((c) => c[cross]);
            const align = _spread(cents) <= _spread(lefts) ? "CENTER" : "MIN";
            const dpos = decor.map((c) => ({ c: c, x: c.x, y: c.y }));
            decor.forEach((c) => n.appendChild(c));        // 装飾を背面に
            sorted.forEach((c) => n.appendChild(c));       // 中身を視覚順に
            n.layoutMode = horiz ? "HORIZONTAL" : "VERTICAL";
            n.primaryAxisSizingMode = "FIXED"; n.counterAxisSizingMode = "FIXED";
            n.itemSpacing = f.data.gap;
            if (horiz) { n.paddingLeft = n.paddingRight = padMain; n.paddingTop = n.paddingBottom = padCross; }
            else { n.paddingTop = n.paddingBottom = padMain; n.paddingLeft = n.paddingRight = padCross; }
            n.counterAxisAlignItems = align; n.primaryAxisAlignItems = "MIN";
            dpos.forEach((d) => { try { d.c.layoutPositioning = "ABSOLUTE"; d.c.x = d.x; d.c.y = d.y; } catch (e) {} });  // 装飾は元位置に固定
          }
        } else if (f.action === "grid8") {
          if ("layoutMode" in n && n.layoutMode && n.layoutMode !== "NONE") {
            ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "itemSpacing"].forEach((k) => { if (_offGrid(n[k])) n[k] = _snap4(n[k]); });
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

/* ============================================================
   AI整え（B）— 選択を読む → relay→Claude が「整え操作」を返す → ボードに適用
   チャットでなくパネルのボタンで起動。判断系（入れ子オートレイアウト等）を担う。
   ============================================================ */
// RGB(0-1)→#RRGGBB。AIが現在の色を把握して整合性ある配色変更をするため
function _rgbToHex(c) { const h = (v) => ("0" + Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16)).slice(-2); return "#" + h(c.r) + h(c.g) + h(c.b); }
// ノードの代表的な塗り：solid=hex / image=写真(触らない) / gradient
function nodeFill(node) {
  if (!("fills" in node) || !Array.isArray(node.fills) || !node.fills.length) return null;
  const f = node.fills.filter((x) => x.visible !== false).pop() || node.fills[node.fills.length - 1];
  if (!f) return null;
  if (f.type === "SOLID") return _rgbToHex(f.color);
  if (f.type === "IMAGE") return "image";
  if (f.type && f.type.indexOf("GRADIENT") === 0) return "gradient";
  return null;
}
function serForAI(node, depth) {
  const o = { id: node.id, type: node.type, name: node.name };
  if (_num(node.x)) { o.x = Math.round(node.x); o.y = Math.round(node.y); }
  if (_num(node.width)) { o.w = Math.round(node.width); o.h = Math.round(node.height); }
  if ("layoutMode" in node && node.layoutMode && node.layoutMode !== "NONE") o.autolayout = { mode: node.layoutMode, gap: node.itemSpacing, pad: [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft] };
  const fl = nodeFill(node); if (fl) o.fill = fl;   // ★現在の色（hex/image/gradient）＝AIが色を認識して整合的に変更できる
  if (node.type === "TEXT") { o.text = String(node.characters || "").slice(0, 40); if (node.fontName && node.fontName !== figma.mixed) o.font = node.fontName.family; }
  if (node.children && node.type !== "INSTANCE" && depth < 8) o.children = node.children.filter((c) => c.visible !== false).map((c) => serForAI(c, depth + 1));
  return o;
}
function collectForAI(src) {
  const sel = figma.currentPage.selection;
  if (!sel.length) { figma.ui.postMessage({ type: "ai-structure", src: src, error: "フレームを選んでください" }); return; }
  figma.ui.postMessage({ type: "ai-structure", src: src, structure: sel.map((n) => serForAI(n, 0)) });
}
// 選択状態をUIに通知（メインチャットで「選択フレームを編集」モードに切替えるため）
function postSel() {
  const s = figma.currentPage.selection;
  figma.ui.postMessage({ type: "sel", n: s.length, name: s.length ? String(s[0].name) : "" });
}
// テキストの文字/サイズを変える前に現在のフォントを読み込む（未読込だと編集でエラー）
async function loadNodeFont(n) {
  try {
    if (n.fontName && n.fontName !== figma.mixed) { await figma.loadFontAsync(n.fontName); return; }
    if (n.fontName === figma.mixed && typeof n.getRangeAllFontNames === "function") {
      for (const f of n.getRangeAllFontNames(0, n.characters.length)) await figma.loadFontAsync(f);
    }
  } catch (e) {}
}
async function applyAIOps(ops, src) {
  let ok = 0, fail = 0;
  const get = async (id) => { try { return await figma.getNodeByIdAsync(id); } catch (e) { return null; } };
  const setPad = (n, p) => { if (Array.isArray(p)) { n.paddingTop = p[0] || 0; n.paddingRight = p[1] || 0; n.paddingBottom = p[2] || 0; n.paddingLeft = p[3] || 0; } };
  const ALIGN = { min: "MIN", center: "CENTER", max: "MAX" };
  try {
    for (const op of (ops || [])) {
      try {
        if (op.op === "rename") { const n = await get(op.id); if (n && !n.removed) n.name = String(op.name || n.name); }
        else if (op.op === "remove") { const n = await get(op.id); if (n && !n.removed) n.remove(); }
        else if (op.op === "pad") { const n = await get(op.id); if (n && "layoutMode" in n && n.layoutMode !== "NONE") setPad(n, op.pad); }
        else if (op.op === "autolayout") {
          const n = await get(op.id); if (!n || n.removed || !("layoutMode" in n)) continue;
          n.layoutMode = op.mode === "horizontal" ? "HORIZONTAL" : "VERTICAL";
          if (_num(op.gap)) n.itemSpacing = op.gap;
          if (op.pad) setPad(n, op.pad);
          n.primaryAxisSizingMode = "FIXED"; n.counterAxisSizingMode = "FIXED";
          if (op.align && ALIGN[op.align]) n.counterAxisAlignItems = ALIGN[op.align];
        } else if (op.op === "unifyFont") {
          for (const root of figma.currentPage.selection) {
            const stack = [root];
            while (stack.length) { const x = stack.pop(); if (x.type === "TEXT" && x.fontName && x.fontName !== figma.mixed && x.fontName.family !== op.family) { try { x.fontName = await ensureFontStyle(op.family, x.fontName.style); } catch (e) {} } if (x.children && x.type !== "INSTANCE") stack.push.apply(stack, x.children); }
          }
        } else if (op.op === "group") {
          const nodes = [];
          for (const id of (op.ids || [])) { const n = await get(id); if (n && !n.removed) nodes.push(n); }
          if (nodes.length < 2) continue;
          const parent = nodes[0].parent; if (!parent) continue;
          const horiz = op.mode !== "vertical";
          const f = figma.createFrame(); f.name = String(op.name || "Group"); f.fills = []; f.clipsContent = false;
          const minX = Math.min.apply(null, nodes.map((n) => n.x)), minY = Math.min.apply(null, nodes.map((n) => n.y));
          const maxX = Math.max.apply(null, nodes.map((n) => n.x + n.width)), maxY = Math.max.apply(null, nodes.map((n) => n.y + n.height));
          parent.appendChild(f); f.x = minX; f.y = minY; f.resize(Math.max(1, maxX - minX), Math.max(1, maxY - minY));
          nodes.sort((a, b) => horiz ? a.x - b.x : a.y - b.y);
          for (const n of nodes) f.appendChild(n);
          f.layoutMode = horiz ? "HORIZONTAL" : "VERTICAL";
          if (_num(op.gap)) f.itemSpacing = op.gap;
          f.primaryAxisSizingMode = "AUTO"; f.counterAxisSizingMode = "AUTO";
        } else if (op.op === "setText") {
          const n = await get(op.id); if (n && n.type === "TEXT") { await loadNodeFont(n); n.characters = String(op.text != null ? op.text : n.characters); }
        } else if (op.op === "setFontSize") {
          const n = await get(op.id); if (n && n.type === "TEXT" && _num(op.size)) { await loadNodeFont(n); try { n.fontSize = op.size; } catch (e) {} }
        } else if (op.op === "setFont") {
          const n = await get(op.id);
          if (n && n.type === "TEXT") {
            const cur = (n.fontName && n.fontName !== figma.mixed) ? n.fontName : { family: "Inter", style: "Regular" };
            const fam = op.family || cur.family;
            let style = cur.style;
            if (op.weight != null) style = WEIGHT_STYLE[op.weight] || style;
            else if (op.style) style = op.style;
            try { await loadNodeFont(n); n.fontName = await ensureFontStyle(fam, style || "Regular"); } catch (e) {}
          }
        } else if (op.op === "setFill") {
          const n = await get(op.id); if (n && "fills" in n && op.color) { const cur = Array.isArray(n.fills) ? n.fills : []; if (!cur.some((f) => f.type === "IMAGE")) n.fills = [{ type: "SOLID", color: hexToRGB(op.color), opacity: 1 }]; }  // 画像塗りは保持
        } else if (op.op === "resize") {
          const n = await get(op.id); if (n && "resize" in n) { const w = _num(op.w) ? op.w : n.width, h = _num(op.h) ? op.h : n.height; try { n.resize(Math.max(1, w), Math.max(1, h)); } catch (e) {} }
        } else if (op.op === "setGap") {
          const n = await get(op.id); if (n && "itemSpacing" in n && n.layoutMode && n.layoutMode !== "NONE" && _num(op.gap)) n.itemSpacing = op.gap;
        } else if (op.op === "setRadius") {
          const n = await get(op.id); if (n && "cornerRadius" in n && _num(op.radius)) n.cornerRadius = op.radius;
        }
        ok++;
      } catch (e) { fail++; }
    }
  } finally {
    figma.ui.postMessage({ type: "ai-done", ok: ok, fail: fail, src: src });
    figma.notify("AI整え：" + ok + " 操作" + (fail ? ("／失敗 " + fail) : ""));
  }
}

/* ============================================================
   色をトークン化（Figma Variables）＝チーム独自DSの第一歩（決定的・ローカル）
   選択内の繰り返し塗り色を Variable 化し、各塗りをバインドする。写真(IMAGE)は触らない。
   ============================================================ */
function _hexToRGBA(hex) { const c = hexToRGB(hex); return { r: c.r, g: c.g, b: c.b, a: 1 }; }
function _colorClass(hex) {
  const c = hexToRGB(hex);
  const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  const mx = Math.max(c.r, c.g, c.b), mn = Math.min(c.r, c.g, c.b);
  const sat = mx === 0 ? 0 : (mx - mn) / mx;
  if (lum < 0.18) return "ink";       // 濃い＝文字系
  if (lum > 0.92) return "surface";   // 明るい＝地
  if (sat < 0.12) return "neutral";   // 無彩色＝グレー
  return "accent";                     // 有彩色
}
async function tokenizeSelection() {
  const sel = figma.currentPage.selection;
  if (!sel.length) { figma.ui.postMessage({ type: "tokenize-done", error: "フレームを選んでください" }); return; }
  try {
    const all = [];
    for (const r of sel) lintWalk(r, all);
    const counts = {};
    for (const n of all) {
      if ("fills" in n && Array.isArray(n.fills)) {
        for (const f of n.fills) if (f && f.type === "SOLID" && f.visible !== false) {
          const hex = _rgbToHex(f.color); counts[hex] = (counts[hex] || 0) + 1;
        }
      }
    }
    const palette = Object.keys(counts).map((h) => ({ hex: h, n: counts[h] })).sort((a, b) => b.n - a.n);
    if (!palette.length) { figma.ui.postMessage({ type: "tokenize-done", error: "塗り色が見つかりません" }); return; }
    let toks = palette.filter((p) => p.n >= 2);   // 繰り返し色＝トークン化の価値あり
    if (!toks.length) toks = palette;             // 無ければ全色
    const col = figma.variables.createVariableCollection("Mothership Tokens");
    const modeId = col.modes[0].modeId;
    const cat = {}, byHex = {};
    for (const t of toks) {
      const cl = _colorClass(t.hex); cat[cl] = (cat[cl] || 0) + 1;
      const v = figma.variables.createVariable(cl + "/" + cat[cl], col, "COLOR");
      v.setValueForMode(modeId, _hexToRGBA(t.hex));
      byHex[t.hex] = v;
    }
    let bound = 0;
    for (const n of all) {
      if ("fills" in n && Array.isArray(n.fills) && n.fills.length) {
        let changed = false;
        const nf = n.fills.map((f) => {
          if (f && f.type === "SOLID" && f.visible !== false) {
            const v = byHex[_rgbToHex(f.color)];
            if (v) { changed = true; bound++; return figma.variables.setBoundVariableForPaint(f, "color", v); }
          }
          return f;
        });
        if (changed) n.fills = nf;
      }
    }
    figma.ui.postMessage({ type: "tokenize-done", kind: "color", vars: toks.length, bound: bound, colors: palette.length });
    figma.notify("トークン化：" + toks.length + " 変数を作成・" + bound + " 箇所に適用");
  } catch (e) {
    figma.ui.postMessage({ type: "tokenize-done", kind: "color", error: "Variables APIエラー: " + (e && e.message ? e.message : e) });
  }
}

/* ============================================================
   文字をスタイル化（Figma Text Styles）＝DSの"型"トークン（決定的・ローカル）
   選択内の繰り返すタイプ（font/size/行間/字間）を Text Style 化し、各テキストに適用。
   ============================================================ */
function _typeSig(n) {
  if (n.type !== "TEXT" || !n.fontName || n.fontName === figma.mixed) return null;
  if (typeof n.fontSize !== "number") return null;            // 混在サイズは除外
  const lh = n.lineHeight, ls = n.letterSpacing;
  if (lh === figma.mixed || ls === figma.mixed) return null;
  const lhK = (lh && lh.unit) ? (lh.unit === "AUTO" ? "auto" : lh.unit + (lh.value || 0)) : "auto";
  const lsK = (ls && ls.unit) ? (ls.unit + (ls.value || 0)) : "0";
  return { key: n.fontName.family + "|" + n.fontName.style + "|" + n.fontSize + "|" + lhK + "|" + lsK, fontName: n.fontName, size: n.fontSize, lineHeight: lh, letterSpacing: ls };
}
function _typeClass(size) { return size >= 24 ? "heading" : (size >= 15 ? "body" : "caption"); }
async function tokenizeTypography() {
  const sel = figma.currentPage.selection;
  if (!sel.length) { figma.ui.postMessage({ type: "tokenize-done", kind: "type", error: "フレームを選んでください" }); return; }
  try {
    const all = [];
    for (const r of sel) lintWalk(r, all);
    const sigs = {};
    for (const n of all) { const s = _typeSig(n); if (s) { if (!sigs[s.key]) sigs[s.key] = { sig: s, nodes: [], n: 0 }; sigs[s.key].nodes.push(n); sigs[s.key].n++; } }
    let entries = Object.keys(sigs).map((k) => sigs[k]);
    if (!entries.length) { figma.ui.postMessage({ type: "tokenize-done", kind: "type", error: "テキストが見つかりません" }); return; }
    let toks = entries;   // タイポは1回しか使われない型も「役割」として価値あり＝全ての異なる型をスタイル化
    toks.sort((a, b) => b.sig.size - a.sig.size);   // 大きい順＝heading/1 が最大
    const cat = {}; let made = 0, bound = 0;
    for (const e of toks) {
      try {
        await figma.loadFontAsync(e.sig.fontName);
        const cl = _typeClass(e.sig.size); cat[cl] = (cat[cl] || 0) + 1;
        const st = figma.createTextStyle(); st.name = cl + "/" + cat[cl];
        st.fontName = e.sig.fontName; st.fontSize = e.sig.size;
        if (e.sig.lineHeight) st.lineHeight = e.sig.lineHeight;
        if (e.sig.letterSpacing) st.letterSpacing = e.sig.letterSpacing;
        made++;
        for (const n of e.nodes) { try { await loadNodeFont(n); if (typeof n.setTextStyleIdAsync === "function") await n.setTextStyleIdAsync(st.id); else n.textStyleId = st.id; bound++; } catch (e2) {} }
      } catch (e1) {}
    }
    figma.ui.postMessage({ type: "tokenize-done", kind: "type", styles: made, bound: bound, total: entries.length });
    figma.notify("文字スタイル化：" + made + " スタイル作成・" + bound + " 箇所に適用");
  } catch (e) {
    figma.ui.postMessage({ type: "tokenize-done", kind: "type", error: "Text Styles APIエラー: " + (e && e.message ? e.message : e) });
  }
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === "generate") await generate(msg.json, true);
  else if (msg.type === "live") await generate(msg.json, false);
  else if (msg.type === "lint") await runLint();
  else if (msg.type === "fix") await applyFixes(msg.ids);
  else if (msg.type === "ai-collect") collectForAI(msg.src);
  else if (msg.type === "ai-apply") await applyAIOps(msg.ops, msg.src);
  else if (msg.type === "tokenize") await tokenizeSelection();
  else if (msg.type === "tokenize-type") await tokenizeTypography();
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
