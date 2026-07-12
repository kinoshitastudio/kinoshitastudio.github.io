/* Onore — Figma plugin main.
 *
 * ⭐ This file has NO engine logic. The UI computes descriptors (図形の記述) once,
 *    previews them as SVG, and posts the exact same list here. code.js only turns
 *    descriptors into native Figma nodes. Preview and output are the same data, so
 *    they cannot drift — this is why Onore needs no rng-contract / sync.js.
 * ⚠ Figma traps learned on Siren/Kaibou, guarded below:
 *    - vectorPaths data is SPACE separated (comma throws).
 *    - resize() throws on <= 0.
 *    - figma.group([]) throws.
 *    - a clone/new node is born at the page root; set position after appendChild.
 */
const W = 720, H = 900, SQ = 1200   // ⭐ 書き出しは 1200×1200 の正方形。生成物(W×H)を中央に置く＝ひとつの作品

figma.showUI(__html__, { width: 400, height: 640 })

function hsl2rgb(h, s, l) {
  h /= 360; s /= 100; l /= 100
  if (s === 0) return { r: l, g: l, b: l }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
  const f = t => { t = (t + 1) % 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p }
  return { r: f(h + 1 / 3), g: f(h), b: f(h - 1 / 3) }
}
const rgb = c => { const o = hsl2rgb(c[0], c[1], c[2]); return { r: o.r, g: o.g, b: o.b } }
const n2 = v => Math.round(v * 100) / 100

/* one descriptor → one native node */
function node(d) {
  /* ⭐ 'disc' = a holographic disc, expanded into REAL Figma layers so the making is
     visible: a clipped frame (base colour + edge inner-shadow) holding a blurred
     "mesh" frame of colour-blob ellipses + a sheen. Same shape the SVG preview draws. */
  if (d.t === 'disc') {
    const minr = Math.min(d.rx, d.ry)
    const fr = figma.createFrame()
    fr.resize(Math.max(0.01, d.rx * 2), Math.max(0.01, d.ry * 2))
    fr.x = d.cx - d.rx; fr.y = d.cy - d.ry
    fr.name = 'disc'; fr.clipsContent = true
    fr.cornerRadius = Math.max(0, d.shape === 1 ? minr * d.round : minr)
    fr.fills = [{ type: 'SOLID', color: rgb(d.base) }]
    fr.effects = [{ type: 'INNER_SHADOW', color: { r: 0, g: 0, b: 0, a: d.edge }, offset: { x: 0, y: 0 }, radius: minr * 0.6, spread: 0, visible: true, blendMode: 'NORMAL' }]
    const bf = figma.createFrame()
    bf.resize(fr.width, fr.height); bf.x = 0; bf.y = 0; bf.name = 'mesh'
    bf.fills = []; bf.clipsContent = false
    bf.effects = [{ type: 'LAYER_BLUR', radius: Math.max(0, d.blur), visible: true }]
    for (const b of d.blobs) {
      const e = figma.createEllipse()
      e.resize(Math.max(0.01, b.r * 2), Math.max(0.01, b.r * 2))
      e.x = (b.cx - d.cx + d.rx) - b.r; e.y = (b.cy - d.cy + d.ry) - b.r
      e.fills = [{ type: 'SOLID', color: rgb(b.c) }]
      bf.appendChild(e)
    }
    const sh = figma.createEllipse()
    sh.resize(Math.max(0.01, d.sheen.r * 2), Math.max(0.01, d.sheen.r * 2))
    sh.x = (d.sheen.cx - d.cx + d.rx) - d.sheen.r; sh.y = (d.sheen.cy - d.cy + d.ry) - d.sheen.r
    sh.fills = [{ type: 'SOLID', color: rgb(d.sheen.c), opacity: Math.max(0, Math.min(1, d.sheen.a)) }]
    bf.appendChild(sh)
    fr.appendChild(bf)
    fr.blendMode = 'NORMAL'
    return fr
  }
  let nd
  if (d.t === 'rect') {
    nd = figma.createRectangle()
    nd.resize(Math.max(0.01, d.w), Math.max(0.01, d.h)); nd.x = d.x; nd.y = d.y
    if (d.rx) nd.cornerRadius = Math.max(0, d.rx)
    nd.fills = [{ type: 'SOLID', color: rgb(d.fill) }]
  } else if (d.t === 'circle') {
    nd = figma.createEllipse()
    nd.resize(Math.max(0.01, d.r * 2), Math.max(0.01, d.r * 2)); nd.x = d.c[0] - d.r; nd.y = d.c[1] - d.r
    nd.fills = [{ type: 'SOLID', color: rgb(d.fill) }]
  } else if (d.t === 'line') {
    nd = figma.createVector()
    nd.vectorPaths = [{ windingRule: 'NONE', data: `M ${n2(d.a[0])} ${n2(d.a[1])} L ${n2(d.b[0])} ${n2(d.b[1])}` }]
    nd.strokes = [{ type: 'SOLID', color: rgb(d.stroke) }]; nd.strokeWeight = d.w; nd.fills = []
    if (d.op != null) nd.opacity = Math.max(0, Math.min(1, d.op))
  } else if (d.t === 'grad') {
    /* a quad filled with a linear gradient running from d.a to d.b (absolute
       coords). Figma's gradientTransform maps the node's normalised 0..1 space
       into gradient space, so build the map (0,0)→A,(1,0)→B in normalised space
       and invert it. This is the ribbon strip: one node, a smooth cross-section. */
    nd = figma.createVector()
    const data = 'M ' + d.pts.map(p => `${n2(p[0])} ${n2(p[1])}`).join(' L ') + ' Z'
    nd.vectorPaths = [{ windingRule: 'NONZERO', data }]
    let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9
    for (const p of d.pts) { if (p[0] < mnx) mnx = p[0]; if (p[1] < mny) mny = p[1]; if (p[0] > mxx) mxx = p[0]; if (p[1] > mxy) mxy = p[1] }
    const bw = Math.max(1e-3, mxx - mnx), bh = Math.max(1e-3, mxy - mny)
    const Ax = (d.a[0] - mnx) / bw, Ay = (d.a[1] - mny) / bh, Bx = (d.b[0] - mnx) / bw, By = (d.b[1] - mny) / bh
    const gx = Bx - Ax, gy = By - Ay, px = -gy, py = gx      // gradient axis + a perpendicular
    const det = (gx * py - px * gy) || 1e-6                   // M = [[gx,px,Ax],[gy,py,Ay]]; want its inverse
    const gt = [[py / det, -px / det, (px * Ay - py * Ax) / det],
                [-gy / det, gx / det, (gy * Ax - gx * Ay) / det]]
    nd.fills = [{ type: 'GRADIENT_LINEAR', gradientTransform: gt,
      gradientStops: d.stops.map(st => { const c = rgb(st.c); return { position: st.p, color: { r: c.r, g: c.g, b: c.b, a: 1 } } }) }]
    nd.strokes = []
  } else { // poly
    nd = figma.createVector()
    const data = 'M ' + d.pts.map(p => `${n2(p[0])} ${n2(p[1])}`).join(' L ') + (d.close ? ' Z' : '')
    if (d.fill) { nd.vectorPaths = [{ windingRule: 'NONZERO', data }]; nd.fills = [{ type: 'SOLID', color: rgb(d.fill) }]; nd.strokes = [] }
    else { nd.vectorPaths = [{ windingRule: 'NONE', data }]; nd.fills = []; nd.strokes = [{ type: 'SOLID', color: rgb(d.stroke) }]; nd.strokeWeight = d.w }
  }
  /* ⚠ Set NORMAL explicitly. A fresh Figma node defaults to PASS_THROUGH, which
     blends it against the backdrop as if its parent frame's SCREEN weren't there
     — so every quad SCREEN-adds against its neighbour and the shared, anti-aliased
     edges brighten into a white grid over the ribbon. NORMAL makes the shapes just
     stack (alpha-over) within the engine frame, exactly like the SVG preview's
     children; only the engine frame carries the SCREEN. */
  nd.blendMode = d.blend === 'screen' ? 'SCREEN' : 'NORMAL'
  return nd
}

function build(layers, seed) {
  // the ground: a black frame, so SCREEN has something to add onto
  const frame = figma.createFrame()
  frame.resize(SQ, SQ); frame.name = 'Onore ' + (seed != null ? '#' + seed : '')
  frame.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]
  frame.clipsContent = true

  const live = layers.filter(L => L.descriptors.length)
  const BLEND = { screen: 'SCREEN', multiply: 'MULTIPLY' }
  /* ⭐ One frame per layer (engine or send). Each layer says how it blends: engines
     and the reverb tail SCREEN (add as light), a CMY tape plate MULTIPLYs. When one
     engine plays alone with no send, NORMAL — on the black ground its opaque shapes
     read the same as SCREEN, and NORMAL keeps Wave's overlapping strips from lighting
     their seams. The fader is the frame's opacity. */
  const soloAlone = live.length === 1 && !live[0].blend
  let total = 0, engines = 0
  for (const L of live) {
    const ef = figma.createFrame()
    ef.resize(W, H); ef.x = (SQ - W) / 2; ef.y = (SQ - H) / 2; ef.name = L.key   // 中央配置
    ef.fills = []                 // transparent, so only the shapes carry colour
    ef.clipsContent = false
    ef.blendMode = soloAlone ? 'NORMAL' : (BLEND[L.blend] || 'SCREEN')
    if (L.level != null) ef.opacity = Math.max(0, Math.min(1, L.level))
    for (const d of L.descriptors) { ef.appendChild(node(d)); total++ }
    frame.appendChild(ef); engines++
  }

  // place at the middle of what the user is looking at
  const c = figma.viewport.center
  frame.x = Math.round(c.x - SQ / 2); frame.y = Math.round(c.y - SQ / 2)
  figma.currentPage.selection = [frame]
  return { total, engines }
}

/* ⭐ Onore v2 — raster path. A raster engine (canvas/WebGL) renders its own pixels
   in the UI and posts PNG bytes; here we wrap them into a Figma image fill, framed
   1200² and centred, exactly like the vector export. One image node = one artwork.
   Vector engines stay descriptors→nodes; raster engines are standalone (no mixing). */
function buildRaster(bytes, seed, name) {
  const img = figma.createImage(new Uint8Array(bytes))
  const frame = figma.createFrame()
  frame.resize(SQ, SQ); frame.name = 'Onore ' + (seed != null ? '#' + seed : '') + (name ? ' · ' + name : '')
  frame.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]; frame.clipsContent = true
  const rect = figma.createRectangle()
  rect.resize(SQ, SQ); rect.x = 0; rect.y = 0
  rect.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }]
  frame.appendChild(rect)
  const c = figma.viewport.center
  frame.x = Math.round(c.x - SQ / 2); frame.y = Math.round(c.y - SQ / 2)
  figma.currentPage.selection = [frame]
  return { total: 1, engines: 1 }
}

figma.ui.onmessage = msg => {
  if (msg.type === 'generate') {
    try {
      const r = build(msg.layers || [], msg.seed)
      figma.ui.postMessage({ type: 'made', nodes: r.total, engines: r.engines })
    } catch (err) {
      figma.ui.postMessage({ type: 'made', nodes: 0, engines: 0 })
      figma.notify('Onore: ' + (err && err.message || err))
    }
  } else if (msg.type === 'generateRaster') {
    try {
      const r = buildRaster(msg.bytes, msg.seed, msg.name)
      figma.ui.postMessage({ type: 'made', nodes: r.total, engines: r.engines, raster: true })
    } catch (err) {
      figma.ui.postMessage({ type: 'made', nodes: 0, engines: 0 })
      figma.notify('Onore: ' + (err && err.message || err))
    }
  }
}
