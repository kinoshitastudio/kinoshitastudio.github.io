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

/* ============================================================
   D 既存トークンへ寄せる（Snap to existing tokens）＝DSへ収束（決定的・ローカル・relay不要）
   新色/新型を新規で増やさず、選択内の色・文字を「既存 Variables / Text Styles の最近傍」へ束ねる。
   まず診断(dry-run)→［寄せる］で適用。既にバインド/スタイル適用済みは触らない（非破壊）。
   ============================================================ */
function _srgb2lin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function rgb2lab(r, g, b) {                 // sRGB(0-1) → CIE-Lab（ガンマ展開→XYZ(D65)→Lab）
  const R = _srgb2lin(r), G = _srgb2lin(g), B = _srgb2lin(b);
  let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let Y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.0;
  let Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}
function deltaE76(p, q) { const dL = p.L - q.L, da = p.a - q.a, db = p.b - q.b; return Math.sqrt(dL * dL + da * da + db * db); }
async function _resolveVarRGB(v, colById) {   // Variableの既定モードのRGB(0-1)。エイリアス/非色はnull
  try {
    const col = colById[v.variableCollectionId];
    const modeId = col ? col.defaultModeId : Object.keys(v.valuesByMode)[0];
    const val = v.valuesByMode[modeId];
    if (!val || val.type === "VARIABLE_ALIAS" || typeof val.r !== "number") return null;
    return { r: val.r, g: val.g, b: val.b };
  } catch (e) { return null; }
}
async function snapToTokens(apply) {           // 色を既存Variableへ寄せる
  const sel = figma.currentPage.selection;
  if (!sel.length) { figma.ui.postMessage({ type: "snap-done", kind: "color", error: "フレームを選んでください" }); return; }
  try {
    const vars = await figma.variables.getLocalVariablesAsync("COLOR");
    if (!vars.length) { figma.ui.postMessage({ type: "snap-done", kind: "color", empty: true, error: "既存の色トークンがありません。まず 🏷 色をトークン化 を実行してください。" }); return; }
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const colById = {}; cols.forEach((c) => { colById[c.id] = c; });
    const targets = [];
    for (const v of vars) { const rgb = await _resolveVarRGB(v, colById); if (rgb) targets.push({ v: v, name: v.name, lab: rgb2lab(rgb.r, rgb.g, rgb.b) }); }
    if (!targets.length) { figma.ui.postMessage({ type: "snap-done", kind: "color", empty: true, error: "解決できる色トークンがありません" }); return; }
    const all = []; for (const r of sel) lintWalk(r, all);
    const T = 6;                               // ΔE閾値（≤=寄せる／>=新規候補）
    const seen = {}; let applied = 0, skipped = 0;
    for (const n of all) {
      if (!("fills" in n) || !Array.isArray(n.fills) || !n.fills.length) continue;
      let changed = false;
      const nf = n.fills.map((f) => {
        if (f && f.type === "SOLID" && f.visible !== false) {
          if (f.boundVariables && f.boundVariables.color) { skipped++; return f; }   // 既にバインド済＝壊さない
          const hex = _rgbToHex(f.color), lab = rgb2lab(f.color.r, f.color.g, f.color.b);
          let best = null, bestDE = Infinity;
          for (const t of targets) { const dE = deltaE76(lab, t.lab); if (dE < bestDE) { bestDE = dE; best = t; } }
          const hit = best && bestDE <= T;
          if (!seen[hex]) seen[hex] = { hex: hex, n: 0, near: hit ? best.name : null, dE: best ? Math.round(bestDE * 10) / 10 : null };
          seen[hex].n++;
          if (hit && apply) { changed = true; applied++; return figma.variables.setBoundVariableForPaint(f, "color", best.v); }
        }
        return f;
      });
      if (apply && changed) n.fills = nf;
    }
    const rows = Object.keys(seen).map((h) => seen[h]).sort((a, b) => b.n - a.n);
    const merged = rows.filter((r) => r.near).length, fresh = rows.filter((r) => !r.near).length;
    figma.ui.postMessage({ type: "snap-done", kind: "color", apply: !!apply, merged: merged, fresh: fresh, applied: applied, skipped: skipped, T: T, rows: rows });
    if (apply) figma.notify("寄せる：" + applied + " 箇所を既存トークンへ統合" + (fresh ? "（新規候補 " + fresh + " 色は🏷で作成可）" : ""));
  } catch (e) {
    figma.ui.postMessage({ type: "snap-done", kind: "color", error: "Variables APIエラー: " + (e && e.message ? e.message : e) });
  }
}
async function snapTypeToStyles(apply) {       // 文字を既存Text Styleへ寄せる
  const sel = figma.currentPage.selection;
  if (!sel.length) { figma.ui.postMessage({ type: "snap-done", kind: "type", error: "フレームを選んでください" }); return; }
  try {
    const styles = await figma.getLocalTextStylesAsync();
    if (!styles.length) { figma.ui.postMessage({ type: "snap-done", kind: "type", empty: true, error: "既存の文字スタイルがありません。まず 🔤 文字をスタイル化 を実行してください。" }); return; }
    const cand = styles.map((s) => ({ s: s, name: s.name, family: s.fontName.family, style: s.fontName.style, size: s.fontSize }));
    const all = []; for (const r of sel) lintWalk(r, all);
    const seen = {}; let applied = 0, skipped = 0;
    for (const n of all) {
      if (n.type !== "TEXT") continue;
      if (n.textStyleId && n.textStyleId !== "" && n.textStyleId !== figma.mixed) { skipped++; continue; }  // 既にスタイル適用済＝触らない
      const sig = _typeSig(n); if (!sig) continue;
      let best = null;
      for (const c of cand) { if (c.family === sig.fontName.family && c.style === sig.fontName.style && Math.abs(c.size - sig.size) <= 1) { best = c; break; } }
      if (!seen[sig.key]) seen[sig.key] = { label: sig.fontName.family + " " + sig.fontName.style + " · " + sig.size + "px", n: 0, near: best ? best.name : null };
      seen[sig.key].n++;
      if (best && apply) { try { await loadNodeFont(n); if (typeof n.setTextStyleIdAsync === "function") await n.setTextStyleIdAsync(best.s.id); else n.textStyleId = best.s.id; applied++; } catch (e2) {} }
    }
    const rows = Object.keys(seen).map((k) => seen[k]).sort((a, b) => b.n - a.n);
    const merged = rows.filter((r) => r.near).length, fresh = rows.filter((r) => !r.near).length;
    figma.ui.postMessage({ type: "snap-done", kind: "type", apply: !!apply, merged: merged, fresh: fresh, applied: applied, skipped: skipped, rows: rows });
    if (apply) figma.notify("寄せる：" + applied + " 箇所を既存スタイルへ統合" + (fresh ? "（新規候補 " + fresh + " 種は🔤で作成可）" : ""));
  } catch (e) {
    figma.ui.postMessage({ type: "snap-done", kind: "type", error: "Text Styles APIエラー: " + (e && e.message ? e.message : e) });
  }
}

/* 🔓 解除（Detach）＝トークン化/寄せるの逆＝バインドを外して"生の値"に戻す（非破壊・Cmd+Z可）
   色：Variableバインドを外し、現在の解決色を素のSOLIDに戻す／文字：Text Style適用を外し現在の見た目を保持。 */
async function detachTokens() {
  const sel = figma.currentPage.selection;
  if (!sel.length) { figma.ui.postMessage({ type: "detach-done", error: "フレームを選んでください" }); return; }
  try {
    const all = []; for (const r of sel) lintWalk(r, all);
    let colors = 0, texts = 0;
    for (const n of all) {
      if ("fills" in n && Array.isArray(n.fills) && n.fills.length) {
        let changed = false;
        const nf = n.fills.map((f) => {
          if (f && f.type === "SOLID" && f.boundVariables && f.boundVariables.color) {
            changed = true; colors++;
            return { type: "SOLID", color: { r: f.color.r, g: f.color.g, b: f.color.b }, opacity: (f.opacity != null ? f.opacity : 1), visible: (f.visible !== false), blendMode: (f.blendMode || "NORMAL") };
          }
          return f;
        });
        if (changed) n.fills = nf;
      }
      if (n.type === "TEXT" && n.textStyleId && n.textStyleId !== "" && n.textStyleId !== figma.mixed) {
        try { await loadNodeFont(n); if (typeof n.setTextStyleIdAsync === "function") await n.setTextStyleIdAsync(""); else n.textStyleId = ""; texts++; } catch (e2) {}
      }
    }
    figma.ui.postMessage({ type: "detach-done", colors: colors, texts: texts });
    figma.notify("解除：色バインド " + colors + " ／ 文字スタイル " + texts + " を生の値に戻しました");
  } catch (e) {
    figma.ui.postMessage({ type: "detach-done", error: "解除エラー: " + (e && e.message ? e.message : e) });
  }
}

/* ============================================================
   🎞 Motion＝モーションを時間トークンに整える（Motion Lint を吸収・決定的・relay不要・非破壊）
   node.animationStyles の duration / timelineOffset を MOTION_TOKENS(ms) の最近傍へ収束（見た目=props保持）。
   収束 = applyAnimationStyle(presetStyleId,{新timing, props}) → removeAnimationStyle(旧id)。フェイルセーフ付き。
   ＝🎯寄せる(色/文字)のモーション版＝DSのモーション次元。図: figma.motion.figmaAnimationStyles()/node.animationStyles。
   ============================================================ */
const MOTION_TOKENS = [100, 150, 200, 250, 300, 400, 500, 600, 800, 1000];   // ms・DSの"時間の語彙"
function _nearMs(v) { let best = MOTION_TOKENS[0], bd = Math.abs(v - best); for (let i = 1; i < MOTION_TOKENS.length; i++) { const d = Math.abs(v - MOTION_TOKENS[i]); if (d < bd) { bd = d; best = MOTION_TOKENS[i]; } } return best; }
function _motionPresets() { const m = {}; try { (figma.motion.figmaAnimationStyles() || []).forEach((p) => { if (p && p.name) m[p.name] = p.styleId; }); } catch (e) {} return m; }
function _motionOK() { return !!(figma.motion && typeof figma.motion.figmaAnimationStyles === "function"); }
async function motionTidy(apply) {
  if (!_motionOK()) { figma.ui.postMessage({ type: "motion-done", error: "このFigmaはMotion APIに未対応です（Figmaを更新してください）。" }); return; }
  try {
    const presets = _motionPresets();
    const roots = figma.currentPage.selection.length ? figma.currentPage.selection : figma.currentPage.children;
    const all = []; for (const r of roots) lintWalk(r, all);
    const rows = []; let applied = 0, skipped = 0; const EPS = 0.5;
    for (const node of all) {
      let styles = null; try { styles = node.animationStyles; } catch (e) { continue; }
      if (!styles || !styles.length) continue;
      for (const st of styles) {
        const durMs = (typeof st.duration === "number") ? st.duration * 1000 : null;
        const offMs = (typeof st.timelineOffset === "number") ? st.timelineOffset * 1000 : 0;
        const dNear = durMs != null ? _nearMs(durMs) : null;
        const oNear = offMs > 0 ? _nearMs(offMs) : null;
        const durOff = dNear != null && Math.abs(durMs - dNear) > EPS;
        const offOff = oNear != null && Math.abs(offMs - oNear) > EPS;
        if (!durOff && !offOff) continue;
        const presetId = presets[st.name];
        if (apply) {
          if (!presetId || !node || node.removed) { skipped++; continue; }
          try {
            const cfg = { duration: durOff ? dNear / 1000 : st.duration, timelineOffset: offOff ? oNear / 1000 : (st.timelineOffset || 0) };
            const props = Object.assign({}, st.props, { delay: cfg.timelineOffset });   // offsetはtimelineOffsetとprops.delayの二重持ち＝揃える
            try { await node.applyAnimationStyle(presetId, Object.assign({}, cfg, { props: props })); }
            catch (e) { await node.applyAnimationStyle(presetId, cfg); }                  // propsで弾かれたらtimingのみ
            try { node.removeAnimationStyle(st.id); } catch (e) {}                         // 旧（トークン外）を除去
            applied++;
          } catch (e) { skipped++; }
        } else {
          rows.push({ node: node.name, prop: String(st.name || "").replace("motion.preset_name.", ""), durFrom: durMs != null ? Math.round(durMs * 10) / 10 : null, durTo: durOff ? dNear : null, offFrom: offMs > 0 ? Math.round(offMs * 10) / 10 : null, offTo: offOff ? oNear : null, canFix: !!presetId });
        }
      }
    }
    if (apply) { figma.ui.postMessage({ type: "motion-done", apply: true, applied: applied, skipped: skipped }); figma.notify("モーション整え：" + applied + " 件をトークンへ" + (skipped ? "／スキップ " + skipped : "") + "。Cmd+Zで戻せます。"); }
    else { figma.ui.postMessage({ type: "motion-done", apply: false, count: rows.length, fixable: rows.filter((r) => r.canFix).length, rows: rows, tokens: MOTION_TOKENS }); }
  } catch (e) {
    figma.ui.postMessage({ type: "motion-done", error: "Motion APIエラー: " + (e && e.message ? e.message : e) });
  }
}

/* ============================================================
   🎬 chat-to-animate＝会話でモーションを付ける（Phase2）＝Claudeがキーフレームを設計→applyManualKeyframeTrackで適用。
   collectMotion: 選択＋子(1階層)の id/name/type/w/h をAIへ渡す → relay /ai-motion → ops → applyMotionOps。
   ops形式: {id, tracks:[{field:'TRANSLATION_Y', baseValue:0, keyframes:[{t(秒),v(値),easing?}]}]}。値はFLOAT。
   ============================================================ */
function _serMotion(n) { return { id: n.id, name: String(n.name), type: n.type, w: Math.round(n.width || 0), h: Math.round(n.height || 0) }; }
// 🎞 スライドショー＝重なったSlide群を「決定的に」順送り生成（AIを介さない＝確実）。手前(番号大)ほど後に0→1で現れ下を覆う＝カット切替。
function _isSlideshow(n) {
  return n && ("children" in n) && (String(n.name) === "Slideshow" || n.children.filter((c) => /^Slide\s*\d/i.test(String(c.name))).length >= 2) && n.children.length >= 2;
}
function slideshowMotion(frame, instruction) {
  if (!_motionOK()) { figma.ui.postMessage({ type: "motion-ai-done", error: "このFigmaはMotion APIに未対応です（Figmaを更新）。" }); return; }
  const slides = frame.children.slice();
  if (slides.length < 2) { figma.ui.postMessage({ type: "motion-ai-done", error: "スライドが2枚未満です" }); return; }
  const ins = String(instruction || "");
  let style = "varied";   // 既定＝映画的に"毎回違う"トランジション（単調な横スライドを避ける）
  if (/ハードカット|hard\s*cut|カット|cut/i.test(ins)) style = "cut";
  else if (/ズーム|ドリー|ケン|zoom|dolly|ken\s*burns/i.test(ins)) style = "zoom";
  else if (/ディゾルブ|dissolve|フェード|fade/i.test(ins)) style = "dissolve";
  else if (/プッシュ|スライド|push|slide/i.test(ins)) style = "push";
  let HOLD = 2.0;   // 1枚あたりの尺（保持）
  const mSec = ins.match(/(\d+(?:\.\d+)?)\s*(秒|s\b|sec|second)/i);
  if (mSec) HOLD = Math.max(0.6, parseFloat(mSec[1]) / slides.length);   // 「◯秒で」＝全体尺÷枚数
  else if (/長め|ゆっくり|じっくり|long|slow/i.test(ins)) HOLD = 3.5;
  else if (/短め|速く|テンポ|素早|quick|fast/i.test(ins)) HOLD = 1.2;
  const W = frame.width || 800, H = frame.height || 600;   // ★Hを定義（未定義バグ修正）
  const F = (v) => ({ type: "FLOAT", value: v });
  const XY = (v) => ({ type: "VECTOR", value: { x: v, y: v } });
  const EO = { type: "EASE_OUT" }, LN = { type: "LINEAR" }, HD = { type: "HOLD" };
  const put = (s, name, base, arr) => { try { s.applyManualKeyframeTrack({ type: "PROPERTY", name: name }, { baseValue: base, keyframes: arr }); } catch (e) {} };   // 1トラック失敗が他を壊さないよう個別try
  const total = slides.length * HOLD;
  const pans = [[1, 0.6], [-0.8, 0.7], [0.5, -0.9], [-0.7, -0.5], [0.9, 0.4], [-0.5, 0.8]];   // ケンバーンズのパン方向（決定的に散らす）
  let applied = 0; const summary = [];
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i], t = i * HOLD, fields = [];
    const IN = Math.min(0.7, HOLD * 0.45);   // 登場にかける秒
    const pk = pans[i % pans.length], panX = W * 0.06 * pk[0], panY = H * 0.06 * pk[1];   // 保持中のゆっくりパン量
    try {
      if (i === 0) {   // 最背面＝常時表示＋全編ケン・バーンズ（ゆっくり寄り＆パン）
        put(s, "OPACITY", F(1), [{ timelinePosition: 0, value: F(1) }]);
        put(s, "SCALE_XY", XY(1.04), [{ timelinePosition: 0, value: XY(1.04), easing: LN }, { timelinePosition: total, value: XY(1.13) }]);
        put(s, "TRANSLATION_X", F(-panX), [{ timelinePosition: 0, value: F(-panX), easing: LN }, { timelinePosition: total, value: F(panX) }]);
        put(s, "TRANSLATION_Y", F(-panY), [{ timelinePosition: 0, value: F(-panY), easing: LN }, { timelinePosition: total, value: F(panY) }]);
        fields.push("常時・ケンバーンズ");
      } else if (style === "cut") {   // ハードカット＝一瞬で切替＋保持中に軽く寄る
        put(s, "OPACITY", F(0), [{ timelinePosition: t, value: F(0), easing: HD }, { timelinePosition: t + 0.001, value: F(1) }]);
        put(s, "SCALE_XY", XY(1), [{ timelinePosition: t, value: XY(1), easing: LN }, { timelinePosition: t + HOLD, value: XY(1.07) }]);
        fields.push("ハードカット＋寄り " + Math.round(t * 1000) + "ms");
      } else {   // ▼ シネマティック＝プッシュ(方向交互)＋ドリーズーム＋フェード＋保持中ケンバーンズ を全部重ねる
        const dir = i % 4; let fromX = 0, fromY = 0;
        if (dir === 0) fromX = W * 0.55; else if (dir === 1) fromY = H * 0.55; else if (dir === 2) fromX = -W * 0.55; else fromY = -H * 0.55;
        put(s, "OPACITY", F(0), [{ timelinePosition: t, value: F(0), easing: EO }, { timelinePosition: t + IN * 0.7, value: F(1) }]);
        put(s, "SCALE_XY", XY(1.16), [{ timelinePosition: t, value: XY(1.16), easing: EO }, { timelinePosition: t + IN, value: XY(1) }, { timelinePosition: t + HOLD, value: XY(1.09), easing: LN }]);   // 入りのドリー→保持中の寄り
        put(s, "TRANSLATION_X", F(fromX), [{ timelinePosition: t, value: F(fromX), easing: EO }, { timelinePosition: t + IN, value: F(0) }, { timelinePosition: t + HOLD, value: F(panX), easing: LN }]);   // プッシュ→保持中パン
        put(s, "TRANSLATION_Y", F(fromY), [{ timelinePosition: t, value: F(fromY), easing: EO }, { timelinePosition: t + IN, value: F(0) }, { timelinePosition: t + HOLD, value: F(panY), easing: LN }]);
        fields.push("登場 " + Math.round(t * 1000) + "ms・シネマ" + ["→", "↑", "←", "↓"][dir]);
      }
      applied++; summary.push({ name: String(s.name), fields: fields });
    } catch (e) {}
  }
  const _tlS = _extendTimelines(slides, total);   // 尺を全長へ＝全部の切り替えが再生される
  try { figma.currentPage.selection = [frame]; figma.viewport.scrollAndZoomIntoView([frame]); } catch (e) {}
  figma.ui.postMessage({ type: "motion-ai-done", applied: applied, fail: 0, summary: summary, errs: [], notes: ["スライドショー＝決定的に順送り生成（" + style + "・約" + Math.round(total) + "秒・timelines:" + _tlS + "）。1枚目は常時表示、以降は隠して順に手前へ現す。", (_tlS ? "" : "⚠ タイムライン尺を設定できませんでした（node.timelines が空）。実機情報として共有ください。")].filter(Boolean) });
  figma.notify("🎬 スライドショー：" + applied + "枚を順送り（" + style + "）。タイムラインで再生・Cmd+Zで戻せます。");
}
// ✦ パーティクル化：選択1個をN個に複製して散布した「Particles」フレームを作る＝増殖/星の流れ の土台（モーションは新規オブジェクトを作れないので"先に増やす"）
function scatterParticles(count) {
  const sel = figma.currentPage.selection;
  if (sel.length !== 1 || !("clone" in sel[0])) { figma.ui.postMessage({ type: "particles-done", error: "散らす元を1つだけ選んでください" }); return; }
  const src = sel[0], host = src.parent;
  const isFrame = host && ("width" in host) && host.type !== "PAGE" && host.type !== "DOCUMENT";
  const W = isFrame ? host.width : 1600, H = isFrame ? host.height : 900;
  const N = Math.max(3, Math.min(200, Math.round(count || 40)));
  const box = figma.createFrame();
  box.name = "Particles"; box.resize(W, H); box.fills = []; box.clipsContent = false;
  if (isFrame) { host.appendChild(box); box.x = 0; box.y = 0; }
  else { figma.currentPage.appendChild(box); box.x = Math.round(src.x - W / 2); box.y = Math.round(src.y - H / 2); }
  let made = 0;
  for (let i = 0; i < N; i++) {
    try {
      const c = src.clone(); box.appendChild(c);
      if (typeof c.rescale === "function") c.rescale(0.3 + Math.random() * 1.0);
      c.x = Math.round(Math.random() * Math.max(1, W - c.width));
      c.y = Math.round(Math.random() * Math.max(1, H - c.height));
      if ("rotation" in c) { try { c.rotation = Math.round(Math.random() * 360); } catch (e) {} }
      if ("opacity" in c) { try { c.opacity = 0.55 + Math.random() * 0.45; } catch (e) {} }
      c.name = "P" + (i + 1); made++;
    } catch (e) {}
  }
  figma.currentPage.selection = [box];
  figma.viewport.scrollAndZoomIntoView([box]);
  figma.ui.postMessage({ type: "particles-done", count: made });
  figma.notify("✦ " + made + "個に複製して散らしました（Particles）。これを選んでモーションで『中心から湧く／星のように流れる／揺れる』を試せます。Cmd+Zで戻せます。");
}
function _isParticles(n) { return n && String(n.name) === "Particles" && ("children" in n) && n.children.length >= 3; }
// ✦ パーティクルの決定的モーション：burst(中心から湧く=増殖)/flow(星が流れる)/shake(揺れる)/rain(降る)
function particleMotion(box, instruction) {
  if (!_motionOK()) { figma.ui.postMessage({ type: "motion-ai-done", error: "このFigmaはMotion APIに未対応です（Figmaを更新）。" }); return; }
  const ps = box.children.slice();
  if (ps.length < 3) { figma.ui.postMessage({ type: "motion-ai-done", error: "パーティクルが少なすぎます" }); return; }
  const ins = String(instruction || "");
  let style = "burst";
  if (/流れ|星|フロー|flow|star/i.test(ins)) style = "flow";
  else if (/揺れ|ゆれ|shake|振動/i.test(ins)) style = "shake";
  else if (/降|雨|rain|落ち/i.test(ins)) style = "rain";
  else if (/湧|増え|増殖|集ま|中心|burst|multiply/i.test(ins)) style = "burst";
  const W = box.width || 1600, H = box.height || 900, cx = W / 2, cy = H / 2;
  const F = (v) => ({ type: "FLOAT", value: v });
  const XY = (v) => ({ type: "VECTOR", value: { x: v, y: v } });
  let applied = 0; const summary = [];
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i], fields = [];
    const px = p.x + (p.width || 0) / 2, py = p.y + (p.height || 0) / 2;
    const st = (i % 24) * 0.05;   // スタッガー（波打つ）
    try {
      if (style === "flow") {   // 星のように斜めに流れて消える
        const dur = 3 + (i % 5) * 0.5, drift = W * 0.6;
        p.applyManualKeyframeTrack({ type: "PROPERTY", name: "TRANSLATION_X" }, { baseValue: F(0), keyframes: [{ timelinePosition: st, value: F(0), easing: { type: "LINEAR" } }, { timelinePosition: st + dur, value: F(drift) }] });
        p.applyManualKeyframeTrack({ type: "PROPERTY", name: "TRANSLATION_Y" }, { baseValue: F(0), keyframes: [{ timelinePosition: st, value: F(0), easing: { type: "LINEAR" } }, { timelinePosition: st + dur, value: F(-drift * 0.4) }] });
        p.applyManualKeyframeTrack({ type: "PROPERTY", name: "OPACITY" }, { baseValue: F(0), keyframes: [{ timelinePosition: st, value: F(0), easing: { type: "EASE_OUT" } }, { timelinePosition: st + 0.6, value: F(1) }, { timelinePosition: st + dur - 0.5, value: F(1) }, { timelinePosition: st + dur, value: F(0) }] });
        fields.push("流れ");
      } else if (style === "shake") {   // 小刻みに揺れる
        const a = 3 + (i % 4) * 2;
        p.applyManualKeyframeTrack({ type: "PROPERTY", name: "TRANSLATION_X" }, { baseValue: F(0), keyframes: [{ timelinePosition: 0, value: F(0) }, { timelinePosition: 0.1, value: F(a) }, { timelinePosition: 0.2, value: F(-a) }, { timelinePosition: 0.3, value: F(a) }, { timelinePosition: 0.4, value: F(-a) }, { timelinePosition: 0.5, value: F(0) }] });
        p.applyManualKeyframeTrack({ type: "PROPERTY", name: "ROTATION" }, { baseValue: F(0), keyframes: [{ timelinePosition: 0, value: F(0) }, { timelinePosition: 0.25, value: F(a) }, { timelinePosition: 0.5, value: F(-a) }, { timelinePosition: 0.75, value: F(0) }] });
        fields.push("揺れ");
      } else if (style === "rain") {   // 上から降り注ぐ
        const dy0 = -(py + (p.height || 0));
        p.applyManualKeyframeTrack({ type: "PROPERTY", name: "TRANSLATION_Y" }, { baseValue: F(dy0), keyframes: [{ timelinePosition: st, value: F(dy0), easing: { type: "EASE_IN" } }, { timelinePosition: st + 1.0, value: F(0) }] });
        p.applyManualKeyframeTrack({ type: "PROPERTY", name: "OPACITY" }, { baseValue: F(0), keyframes: [{ timelinePosition: st, value: F(0), easing: { type: "EASE_OUT" } }, { timelinePosition: st + 0.3, value: F(1) }] });
        fields.push("降下");
      } else {   // burst＝中心から湧いて散る（増殖に見える）
        const dx = cx - px, dy = cy - py;
        p.applyManualKeyframeTrack({ type: "PROPERTY", name: "OPACITY" }, { baseValue: F(0), keyframes: [{ timelinePosition: st, value: F(0), easing: { type: "EASE_OUT" } }, { timelinePosition: st + 0.5, value: F(1) }] });
        p.applyManualKeyframeTrack({ type: "PROPERTY", name: "SCALE_XY" }, { baseValue: XY(0), keyframes: [{ timelinePosition: st, value: XY(0), easing: { type: "EASE_OUT_BACK" } }, { timelinePosition: st + 0.6, value: XY(1) }] });
        p.applyManualKeyframeTrack({ type: "PROPERTY", name: "TRANSLATION_X" }, { baseValue: F(dx), keyframes: [{ timelinePosition: st, value: F(dx), easing: { type: "EASE_OUT" } }, { timelinePosition: st + 0.7, value: F(0) }] });
        p.applyManualKeyframeTrack({ type: "PROPERTY", name: "TRANSLATION_Y" }, { baseValue: F(dy), keyframes: [{ timelinePosition: st, value: F(dy), easing: { type: "EASE_OUT" } }, { timelinePosition: st + 0.7, value: F(0) }] });
        fields.push("湧出");
      }
      applied++; if (summary.length < 8) summary.push({ name: String(p.name), fields: fields });
    } catch (e) {}
  }
  const maxT = (style === "flow") ? 6.5 : (style === "rain") ? 2.3 : (style === "shake") ? 0.9 : 2.1;
  const _tlP = _extendTimelines(ps, maxT);   // 尺を全長へ
  try { figma.currentPage.selection = [box]; figma.viewport.scrollAndZoomIntoView([box]); } catch (e) {}
  figma.ui.postMessage({ type: "motion-ai-done", applied: applied, fail: 0, summary: summary, errs: [], notes: ["パーティクル＝決定的に生成（" + style + "・" + ps.length + "個・約" + Math.round(maxT) + "秒・timelines:" + _tlP + "）。タイムラインで再生・Cmd+Zで戻せます。"] });
  figma.notify("✦ パーティクル：" + applied + "個を動かしました（" + style + "）。Cmd+Zで戻せます。");
}
function collectMotion(instruction) {
  const sel = figma.currentPage.selection;
  if (!sel.length) { figma.ui.postMessage({ type: "motion-structure", error: "フレームを選んでください" }); return; }
  if (sel.length === 1 && _isParticles(sel[0])) { particleMotion(sel[0], instruction); return; }     // パーティクル＝決定的に湧く/流れる/揺れる
  if (sel.length === 1 && _isSlideshow(sel[0])) { slideshowMotion(sel[0], instruction); return; }   // 重なりスライド＝決定的に順送り（AI経由しない）
  const nodes = [];
  for (const n of sel) { nodes.push(_serMotion(n)); if ("children" in n) for (const c of n.children.slice(0, 40)) nodes.push(Object.assign(_serMotion(c), { parent: n.id })); }
  figma.ui.postMessage({ type: "motion-structure", nodes: nodes, instruction: instruction || "" });
}
function _fillColor(n) {   // ノードの最初のsolid塗り色（線色の下地に使う）
  try { const fs = n.fills; if (Array.isArray(fs)) { const s = fs.find((p) => p && p.type === "SOLID" && p.visible !== false); if (s) return { r: s.color.r, g: s.color.g, b: s.color.b }; } } catch (e) {}
  return null;
}
function _revealTracks(dur) {   // パスドロー代替＝ふわっと出すリビール（OPACITY 0→1 ＋ SCALE 0.9→1）
  const d = dur > 0 ? dur : 0.5;
  return [
    { field: "OPACITY", baseValue: 0, keyframes: [{ t: 0, v: 0, easing: "EASE_OUT" }, { t: d, v: 1 }] },
    { field: "SCALE_XY", baseValue: 0.9, keyframes: [{ t: 0, v: 0.9, easing: "EASE_OUT" }, { t: d, v: 1 }] },
  ];
}
function _applyTrack(n, t) {   // 1トラックを適用（成功=fieldラベル / キーフレーム無し=null / 失敗=throw）
  const raw = (t.keyframes || []).map((k) => ({ tp: Number(k.t) || 0, v: Number(k.v) || 0, easing: k.easing }));
  if (!raw.length) return null;
  const isXY = /_XY$/.test(String(t.field));   // SCALE_XY / TRANSLATION_XY は VECTOR 値が必須（FLOATだと弾かれる）
  const mkVal = (num) => isXY ? { type: "VECTOR", value: { x: num, y: num } } : { type: "FLOAT", value: num };
  const kfs = raw.map((k) => { const kf = { timelinePosition: k.tp, value: mkVal(k.v) }; if (k.easing) kf.easing = { type: String(k.easing) }; return kf; });
  const baseNum = (t.baseValue != null) ? Number(t.baseValue) : raw[0].v;
  n.applyManualKeyframeTrack({ type: "PROPERTY", name: String(t.field) }, { baseValue: mkVal(baseNum || 0), keyframes: kfs });
  const dur = Math.max.apply(null, raw.map((k) => k.tp));
  return String(t.field) + (dur ? " " + Math.round(dur * 1000) + "ms" : "");
}
// タイムライン尺を全長へ伸ばす。★正しいAPI＝node.setTimelineDuration(timelineId, 秒)（node.timelines[].id が必須・単位=秒）。既定2秒だと長い動きが切れて「1回しか再生されない」対策。返り値=尺を設定できたタイムライン数（診断用）。
function _extendTimelines(nodes, durSec) {
  if (!(durSec > 0)) return 0;
  const d = durSec + 0.3, seen = {}; let cnt = 0;
  for (const n of (nodes || [])) {
    if (!n) continue;
    try {
      const tls = n.timelines || [];
      for (const tl of tls) { if (tl && tl.id && !seen[tl.id] && typeof n.setTimelineDuration === "function") { n.setTimelineDuration(tl.id, d); seen[tl.id] = true; cnt++; } }
    } catch (e) {}
  }
  return cnt;
}
async function applyMotionOps(ops) {
  if (!_motionOK()) { figma.ui.postMessage({ type: "motion-ai-done", error: "このFigmaはMotion APIに未対応です（Figmaを更新）。" }); return; }
  const get = async (id) => { try { return await figma.getNodeByIdAsync(id); } catch (e) { return null; } };
  let applied = 0, fail = 0; const summary = [], errs = [], notes = []; let lastNode = null, maxT = 0;
  for (const op of (ops || [])) for (const t of (op.tracks || [])) (t.keyframes || []).forEach((k) => { maxT = Math.max(maxT, Number(k.t) || 0); });   // 全キーフレームの最大時刻＝必要な尺
  for (const op of (ops || [])) {
    let n = await get(op.id);
    if (!n && op.name) { try { n = figma.currentPage.findOne((x) => x.name === op.name); } catch (e) {} }
    if (!n || n.removed) { fail++; continue; }
    let tracks = (op.tracks || []).slice();
    // ▼ パスドロー(PATH_TRIM)は線が必須。塗り形＝描ければ輪郭を描く(線を付与)／線を持てない形はリビールへ代替
    if (tracks.some((t) => /^PATH_TRIM/.test(String(t.field)))) {
      if ("strokes" in n) {
        if (!(n.strokes && n.strokes.length)) {   // 塗り形にストローク無し → 塗り色から線を足して輪郭を描けるように
          try {
            n.strokes = [{ type: "SOLID", color: _fillColor(n) || { r: 0.12, g: 0.12, b: 0.12 } }];
            if ("strokeWeight" in n && !(n.strokeWeight > 0)) n.strokeWeight = 2;
            notes.push(String(n.name) + "：輪郭を描くため線を追加");
          } catch (e) {}
        }
      } else {                                     // ストロークを持てない型 → PATH_TRIMを外してリビール
        let d = 0.5; tracks.forEach((t) => { if (/^PATH_TRIM/.test(String(t.field))) (t.keyframes || []).forEach((k) => { d = Math.max(d, Number(k.t) || 0); }); });
        tracks = tracks.filter((t) => !/^PATH_TRIM/.test(String(t.field))).concat(_revealTracks(d));
        notes.push(String(n.name) + "：パスドロー不可→リビールに代替");
      }
    }
    const fields = [];
    let ptFail = false, ptDur = 0.5, blocked = false;
    for (const t of tracks) {
      if (blocked) break;   // プロダクトコンポーネントはノード単位で不可＝残りトラックも試さない
      try {
        const lbl = _applyTrack(n, t);
        if (lbl) { applied++; lastNode = n; fields.push(lbl); }
      } catch (e) {
        const msg = (e && e.message ? e.message : String(e));
        if (/product component/i.test(msg)) { blocked = true; }   // Figma制約＝APIでアニメ書込不可。赤エラーにせず情報通知へ
        else if (/^PATH_TRIM/.test(String(t.field))) { ptFail = true; (t.keyframes || []).forEach((k) => { ptDur = Math.max(ptDur, Number(k.t) || 0); }); }   // パスドロー失敗は握って後でリビール
        else { fail++; if (errs.length < 5) errs.push(String(n.name) + "." + String(t.field) + " → " + msg); }
      }
    }
    if (blocked) notes.push(String(n.name) + "：プロダクトコンポーネントのため動かせません（分解すれば可・Figmaの制約）");
    if (ptFail) {   // ▼ 線を足しても描けなかった → リビールで代替（無理ならリビール）
      for (const t of _revealTracks(ptDur)) { try { const lbl = _applyTrack(n, t); if (lbl) { applied++; lastNode = n; fields.push(lbl); } } catch (e) {} }
      notes.push(String(n.name) + "：パスドロー失敗→リビールに代替");
    }
    if (fields.length) summary.push({ name: String(n.name), fields: fields });
  }
  const _tlA = _extendTimelines([lastNode], maxT);   // 尺を全長へ＝途中で切れない
  if (maxT > 2) notes.push("尺を約" + Math.round(maxT) + "秒へ調整（timelines:" + _tlA + "）");
  if (lastNode) { try { figma.currentPage.selection = [lastNode]; figma.viewport.scrollAndZoomIntoView([lastNode]); } catch (e) {} }   // 付けたノードを選択＝タイムラインにモーションが出る
  figma.ui.postMessage({ type: "motion-ai-done", applied: applied, fail: fail, summary: summary, errs: errs, notes: notes });
  figma.notify("🎬 モーション適用：" + applied + " トラック" + (fail ? "／失敗 " + fail : "") + "。Cmd+Zで戻せます。");
}

// 🎞 スライドショー化：選択した複数フレームを1つの親フレームに「同じ位置で重ねる」＝1本のタイムラインでシーン切替できる下ごしらえ（クローンで重ねる＝原本は非破壊）
async function stackForSlideshow() {
  const sel = figma.currentPage.selection.filter((n) => ("clone" in n) && typeof n.width === "number");
  if (sel.length < 2) { figma.ui.postMessage({ type: "slideshow-done", error: "スライドにするフレームを2枚以上選んでください" }); return; }
  const w = Math.max.apply(null, sel.map((n) => n.width));
  const h = Math.max.apply(null, sel.map((n) => n.height));
  const parent = figma.createFrame();
  parent.name = "Slideshow";
  parent.resize(w, h);
  parent.clipsContent = true;
  parent.x = Math.max.apply(null, sel.map((n) => n.x + n.width)) + 80;   // 選択の右隣に置く
  parent.y = Math.min.apply(null, sel.map((n) => n.y));
  figma.currentPage.appendChild(parent);
  let added = 0, skipped = 0; const errs = [];
  for (const n of sel) {
    try {
      const c = n.clone();                    // クローン（原本は非破壊）
      parent.appendChild(c);                  // 親に入れる＝重なる
      c.x = Math.round((w - c.width) / 2);    // 中央に重ねる（サイズ違いも中央合わせ）
      c.y = Math.round((h - c.height) / 2);
      c.name = "Slide " + (added + 1);
      added++;
    } catch (e) { skipped++; if (errs.length < 3) errs.push(String(n.name) + " → " + (e && e.message ? e.message : String(e))); }
  }
  figma.currentPage.selection = [parent];
  figma.viewport.scrollAndZoomIntoView([parent]);
  figma.ui.postMessage({ type: "slideshow-done", count: added, total: sel.length, skipped: skipped, errs: errs, names: sel.map((n) => String(n.name) + " " + Math.round(n.width) + "×" + Math.round(n.height)) });
  figma.notify("🎞 " + added + "/" + sel.length + " 枚を「Slideshow」に重ねました" + (skipped ? "（" + skipped + "枚スキップ）" : "") + "。Cmd+Zで戻せます。");
}

// ===== 🖊 高度なパス整形：RDP簡略化＋コーナー検出＋Catmull-Romスムーズ。ノイズ頂点を間引いて自然な曲線にfit。regions/塗り保持・非破壊。 =====
function _rdp(pts, eps) {   // 開いた点列のRamer-Douglas-Peucker簡略化（両端固定）
  const n = pts.length; if (n < 3) return pts.slice();
  const keep = new Array(n).fill(false); keep[0] = keep[n - 1] = true;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const seg = stack.pop(), a = seg[0], b = seg[1], A = pts[a], B = pts[b];
    const dx = B.x - A.x, dy = B.y - A.y, len = Math.sqrt(dx * dx + dy * dy) || 1e-9;
    let maxD = -1, idx = -1;
    for (let i = a + 1; i < b; i++) { const P = pts[i], d = Math.abs((P.x - A.x) * dy - (P.y - A.y) * dx) / len; if (d > maxD) { maxD = d; idx = i; } }
    if (maxD > eps && idx > -1) { keep[idx] = true; stack.push([a, idx]); stack.push([idx, b]); }
  }
  const out = []; for (let i = 0; i < n; i++) if (keep[i]) out.push(pts[i]); return out;
}
function _rdpClosed(pts, eps) {   // 閉ループ：最遠点を軸に2弧へ割ってRDP
  const n = pts.length; if (n < 5) return pts.slice();
  let far = 0, fd = -1; for (let i = 1; i < n; i++) { const ddx = pts[i].x - pts[0].x, ddy = pts[i].y - pts[0].y, d = ddx * ddx + ddy * ddy; if (d > fd) { fd = d; far = i; } }
  const s1 = _rdp(pts.slice(0, far + 1), eps), s2 = _rdp(pts.slice(far).concat([pts[0]]), eps);
  const out = s1.slice(); for (let i = 1; i < s2.length - 1; i++) out.push(s2[i]); return out;
}
async function smoothVectorPaths(eps) {
  const AUTO = !(typeof eps === "number" && eps > 0);   // eps未指定/0以下＝オート（頂点密度からεを自動決定：多パスほど強め）
  const K = 1.0, STEPS = 10, CORNER_COS = -0.2;   // 曲線強さ / 曲線サンプル数 / cos>-0.2(≒101°未満)は角として鋭く残す
  const sel = figma.currentPage.selection;
  const vectors = [];
  const walk = (n) => { if (n && n.type === "VECTOR") vectors.push(n); if (n && "children" in n && n.type !== "INSTANCE") for (const c of n.children) walk(c); };
  sel.forEach(walk);
  if (!vectors.length) { figma.ui.postMessage({ type: "smooth-done", error: "ベクター（パス）を選んでください。塗り/線のシェイプはベクター化してから。" }); return; }
  let done = 0, fail = 0, before = 0, after = 0, lastEps = 0; const errs = [];
  for (const v of vectors) {
    try {
      const net = v.vectorNetwork;
      if (!net || !net.vertices || !net.segments || !net.segments.length) continue;
      if (!net.regions || !net.regions.length) continue;   // v1は塗り(regions)ベクター専用
      const V = net.vertices, S = net.segments;
      before += V.length;
      let epsUse = AUTO ? 1.5 : eps;   // オート＝バウンディングボックス対角と頂点数の密度からεを算出（密なほど強く間引く）
      if (AUTO) { let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity; for (const p of V) { if (p.x < mnx) mnx = p.x; if (p.y < mny) mny = p.y; if (p.x > mxx) mxx = p.x; if (p.y > mxy) mxy = p.y; } const diag = Math.sqrt((mxx - mnx) * (mxx - mnx) + (mxy - mny) * (mxy - mny)) || 1, density = V.length / (diag / 10); epsUse = Math.max(0.8, Math.min(6, 0.5 + density * 0.15)); }
      lastEps = epsUse;
      const newVerts = [], newSegs = [], newRegions = [];
      for (const region of net.regions) {
        const outLoops = [];
        for (const loop of region.loops) {
          if (!loop || !loop.length) { outLoops.push([]); continue; }
          // 1) ループのセグメントを向き付きで並べる
          const dir = [];
          const first = S[loop[0]], second = S[loop[1 % loop.length]];
          const fwd0 = loop.length === 1 || (second && (first.end === second.start || first.end === second.end));
          dir.push({ seg: loop[0], from: fwd0 ? first.start : first.end, to: fwd0 ? first.end : first.start, fwd: fwd0 });
          for (let i = 1; i < loop.length; i++) { const s = S[loop[i]], prevTo = dir[i - 1].to, f = (s.start === prevTo); dir.push({ seg: loop[i], from: f ? s.start : s.end, to: f ? s.end : s.start, fwd: f }); }
          // 2) 曲線を点列に展開（閉ループ）
          const pts = [];
          for (const d of dir) {
            const seg = S[d.seg], P0 = V[d.from], P3 = V[d.to];
            const tS = d.fwd ? seg.tangentStart : seg.tangentEnd, tE = d.fwd ? seg.tangentEnd : seg.tangentStart;
            const isLine = (!tS || (tS.x === 0 && tS.y === 0)) && (!tE || (tE.x === 0 && tE.y === 0));
            if (isLine) { pts.push({ x: P0.x, y: P0.y }); }
            else { const P1 = { x: P0.x + (tS ? tS.x : 0), y: P0.y + (tS ? tS.y : 0) }, P2 = { x: P3.x + (tE ? tE.x : 0), y: P3.y + (tE ? tE.y : 0) }; for (let i = 0; i < STEPS; i++) { const t = i / STEPS, u = 1 - t; pts.push({ x: u * u * u * P0.x + 3 * u * u * t * P1.x + 3 * u * t * t * P2.x + t * t * t * P3.x, y: u * u * u * P0.y + 3 * u * u * t * P1.y + 3 * u * t * t * P2.y + t * t * t * P3.y }); } }
          }
          // 3) RDP簡略化（閉）→ 4) コーナー検出＋Catmull-Rom接線
          let sp = _rdpClosed(pts, epsUse); if (sp.length < 3) sp = pts.slice();
          const m = sp.length, tan = new Array(m);
          for (let i = 0; i < m; i++) {
            const P = sp[i], A = sp[(i - 1 + m) % m], B = sp[(i + 1) % m];
            const ax = A.x - P.x, ay = A.y - P.y, bx = B.x - P.x, by = B.y - P.y;
            const ma = Math.sqrt(ax * ax + ay * ay), mb = Math.sqrt(bx * bx + by * by);
            let t = { x: 0, y: 0 };
            if (ma > 0.001 && mb > 0.001 && (ax * bx + ay * by) / (ma * mb) <= CORNER_COS) t = { x: (B.x - A.x) * K / 6, y: (B.y - A.y) * K / 6 };   // 鋭角=接線0(角を残す)
            tan[i] = t;
          }
          // 5) 新頂点・新セグメント（キャップ付き＝形が崩れない）
          const base = newVerts.length;
          for (let i = 0; i < m; i++) newVerts.push({ x: sp[i].x, y: sp[i].y });
          const segIdxs = [];
          for (let i = 0; i < m; i++) {
            const j = (i + 1) % m, segLen = Math.sqrt((sp[j].x - sp[i].x) * (sp[j].x - sp[i].x) + (sp[j].y - sp[i].y) * (sp[j].y - sp[i].y)), cap = segLen * 0.4;
            const clamp = (t2) => { const h = Math.sqrt(t2.x * t2.x + t2.y * t2.y); return (h > cap && h > 0.001) ? { x: t2.x * cap / h, y: t2.y * cap / h } : { x: t2.x, y: t2.y }; };
            newSegs.push({ start: base + i, end: base + j, tangentStart: clamp(tan[i]), tangentEnd: clamp({ x: -tan[j].x, y: -tan[j].y }) });
            segIdxs.push(newSegs.length - 1);
          }
          outLoops.push(segIdxs);
        }
        const nr = { windingRule: region.windingRule, loops: outLoops };
        if (region.fills) nr.fills = region.fills; if (region.fillStyleId) nr.fillStyleId = region.fillStyleId;
        newRegions.push(nr);
      }
      after += newVerts.length;
      await v.setVectorNetworkAsync({ vertices: newVerts, segments: newSegs, regions: newRegions });
      done++;
    } catch (e) { fail++; if (errs.length < 4) errs.push(String(v.name) + " → " + (e && e.message ? e.message : String(e))); }
  }
  const epsLabel = AUTO ? ("オート≈" + lastEps.toFixed(1)) : eps;
  figma.ui.postMessage({ type: "smooth-done", done: done, fail: fail, errs: errs, eps: epsLabel, before: before, after: after });
  figma.notify("🖊 パス整形：" + done + " 個（頂点 " + before + "→" + after + "・ε=" + epsLabel + "）" + (fail ? "／失敗 " + fail : "") + "。Cmd+Zで戻せます。");
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
  else if (msg.type === "snap") await snapToTokens(msg.apply);            // D 色を既存トークンへ寄せる（apply=false診断/true適用）
  else if (msg.type === "snap-type") await snapTypeToStyles(msg.apply);   // D 文字を既存スタイルへ寄せる
  else if (msg.type === "detach") await detachTokens();                   // 🔓 トークン/スタイルのバインドを解除＝生の値に戻す
  else if (msg.type === "motion") await motionTidy(msg.apply);             // 🎞 モーションを時間トークンへ整える（apply=false診断/true適用）
  else if (msg.type === "collect-motion") collectMotion(msg.instruction);  // 🎬 chat-to-animate：選択をAIへ渡す
  else if (msg.type === "motion-apply") await applyMotionOps(msg.ops);     // 🎬 AIのキーフレームopsを適用
  else if (msg.type === "slideshow") await stackForSlideshow();            // 🎞 選択を1親フレームに重ねる（スライドショーの下ごしらえ）
  else if (msg.type === "particles") scatterParticles(msg.count);          // ✦ 複製して散らす（パーティクル化）
  else if (msg.type === "smooth-path") await smoothVectorPaths(msg.eps);    // 🖊 パス整形（RDP簡略化＋Catmull-Romスムーズ）
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
