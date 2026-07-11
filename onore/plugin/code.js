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
  } else { // poly
    nd = figma.createVector()
    const data = 'M ' + d.pts.map(p => `${n2(p[0])} ${n2(p[1])}`).join(' L ') + (d.close ? ' Z' : '')
    if (d.fill) { nd.vectorPaths = [{ windingRule: 'NONZERO', data }]; nd.fills = [{ type: 'SOLID', color: rgb(d.fill) }] }
    else { nd.vectorPaths = [{ windingRule: 'NONE', data }]; nd.fills = []; nd.strokes = [{ type: 'SOLID', color: rgb(d.stroke) }]; nd.strokeWeight = d.w }
  }
  nd.blendMode = 'SCREEN'   // oscillators sum as light on the black ground
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
    const made = []
    for (const d of L.descriptors) { const nd = node(d); frame.appendChild(nd); made.push(nd) }
    if (made.length) {                       // ⚠ never group an empty set
      const g = figma.group(made, frame); g.name = L.key; g.blendMode = 'SCREEN'
      total += made.length; engines++
    }
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
