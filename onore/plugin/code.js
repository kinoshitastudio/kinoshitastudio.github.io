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
const W = 720, H = 900

figma.showUI(__html__, { width: 560, height: 640 })

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
  nd.blendMode = 'NORMAL'
  return nd
}

function build(layers, seed) {
  // the ground: a black frame, so SCREEN has something to add onto
  const frame = figma.createFrame()
  frame.resize(W, H); frame.name = 'Onore ' + (seed != null ? '#' + seed : '')
  frame.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]
  frame.clipsContent = true

  let total = 0, engines = 0
  for (const L of layers) {
    if (!L.descriptors.length) continue
    /* ⭐ One frame per engine, NORMAL — not SCREEN. Wave tiles thousands of quads
       edge to edge; if the frame screens, Figma adds each quad's anti-aliased edge
       against its neighbour and a white grid lights up the seams. On the black
       ground a single engine's opaque shapes look identical whether the frame is
       NORMAL or SCREEN (screen-vs-black is the colour itself), so NORMAL loses
       nothing and the ribbon stays seamless. When the mixer layers engines, the
       additive SCREEN comes back — handled at that point, per engine, not per shape. */
    const ef = figma.createFrame()
    ef.resize(W, H); ef.x = 0; ef.y = 0; ef.name = L.key
    ef.fills = []                 // transparent, so only the shapes carry colour
    ef.clipsContent = false
    ef.blendMode = 'NORMAL'
    for (const d of L.descriptors) { ef.appendChild(node(d)); total++ }
    frame.appendChild(ef); engines++
  }

  // place at the middle of what the user is looking at
  const c = figma.viewport.center
  frame.x = Math.round(c.x - W / 2); frame.y = Math.round(c.y - H / 2)
  figma.currentPage.selection = [frame]
  return { total, engines }
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
  }
}
