/* Siren — 鳴物
 *
 * A sequencer that plays shapes. Everything it makes is a real Figma node:
 * ellipses, rectangles, gradients, layer blur. Nothing is baked into an image.
 *
 * Fons's surfaces are not 3D. They are blurred gradient shapes, stacked.
 * Here the same parts get placed by the rhythm instead of by hand.
 */

const KEY = 'siren'
const S = 1000

figma.showUI(__html__, { width: 400, height: 720 })

/* ---------- helpers ---------- */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hueRGB(h) {
  const k = (n) => (n + h / 30) % 12
  const f = (n) => 1 - Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return { r: clamp01(f(0)), g: clamp01(f(8)), b: clamp01(f(4)) }
}
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const mixC = (a, b, t) => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t })
const grey = (v) => ({ r: clamp01(v), g: clamp01(v), b: clamp01(v) })

/* Figma rotates around a node's origin, not its centre. Place it by hand. */
function centreAt(node, cx, cy, w, h, angle) {
  const c = Math.cos(angle), s = Math.sin(angle)
  node.relativeTransform = [
    [c, -s, cx - (c * w) / 2 + (s * h) / 2],
    [s,  c, cy - (s * w) / 2 - (c * h) / 2],
  ]
}

/* ---------- generate ---------- */
function make(P, reuse) {
  const R = rng(P.seed * 7919 + 13)

  // Reuse the frame we made last time, so LIVE does not scatter frames around.
  let frame = null
  if (reuse) {
    for (const n of figma.currentPage.children) {
      if (n.type === 'FRAME' && n.getPluginData(KEY)) { frame = n; break }
    }
  }
  let fx, fy
  if (frame) {
    fx = frame.x; fy = frame.y
    for (const c of [...frame.children]) c.remove()
  } else {
    frame = figma.createFrame()
    const v = figma.viewport.center
    fx = Math.round(v.x - S / 2); fy = Math.round(v.y - S / 2)
    figma.currentPage.appendChild(frame)
  }
  frame.name = 'Siren'
  frame.resize(S, S)
  frame.x = fx; frame.y = fy
  frame.clipsContent = true
  frame.setPluginData(KEY, JSON.stringify(P))
  frame.fills = [{ type: 'SOLID', color: P.invert ? grey(0.95) : grey(0.043) }]

  const cA = hueRGB(P.h1), cB = hueRGB(P.h2), accent = hueRGB(P.hue)

  /* --- wash: one linear gradient across the whole field --- */
  if (P.wash > 0) {
    const wash = figma.createRectangle()
    wash.name = 'wash'
    wash.resize(S, S)
    wash.x = 0; wash.y = 0
    wash.opacity = P.wash
    wash.fills = [{
      type: 'GRADIENT_LINEAR',
      gradientTransform: [[0.7071, 0.7071, 0], [-0.7071, 0.7071, 0.35]],
      gradientStops: [
        { position: 0, color: { ...cA, a: 1 } },
        { position: 1, color: { ...cB, a: 1 } },
      ],
    }]
    frame.appendChild(wash)
  }

  /* --- run the sequence --- */
  const G = P.grid
  const cell = S / G
  const sink = new Float32Array(G * G)
  const hits = [], cracks = [], dust = []
  let bassLift = 0
  const jit = (a) => (R() * 2 - 1) * a * P.hum

  for (let bar = 0; bar < P.bars; bar++) {
    for (let s = 0; s < 16; s++) {
      const ang = (s / 16) * Math.PI * 2 - Math.PI / 2 + jit(0.06)

      if (P.kick.indexOf(s) >= 0) {
        const r = S * 0.5 * 0.30 * (1 + jit(0.10))
        const hx = S / 2 + Math.cos(ang) * r, hy = S / 2 + Math.sin(ang) * r
        const reach = P.reach * (1 + jit(0.18))
        hits.push({ x: hx, y: hy, r: reach })
        for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
          const cx = (gx + 0.5) * cell, cy = (gy + 0.5) * cell
          const d2 = (cx - hx) * (cx - hx) + (cy - hy) * (cy - hy)
          sink[gy * G + gx] += Math.exp(-d2 / (reach * reach))
        }
      }
      if (P.snare.indexOf(s) >= 0 && P.crack > 0) {
        const r = S * 0.5 * 0.50 * (1 + jit(0.06))
        cracks.push({ ang: ang + jit(0.05), r, len: S * 0.16 * (0.6 + R() * 0.8), w: 1.4 + R() * 2.6 })
      }
      if (P.hat.indexOf(s) >= 0 && P.dust > 0) {
        const r = S * 0.5 * 0.72
        const n = 5 + Math.round(R() * 7)
        for (let i = 0; i < n; i++) {
          const aa = ang + (R() - 0.5) * 0.16
          const rr = r * (1 + (R() - 0.5) * 0.10)
          dust.push({ x: S / 2 + Math.cos(aa) * rr, y: S / 2 + Math.sin(aa) * rr, s: 1 + R() * 3.2, o: 0.15 + R() * 0.6 })
        }
      }
      if (P.bass.indexOf(s) >= 0) bassLift += 0.12
    }
  }

  let smax = 0
  for (const v of sink) if (v > smax) smax = v
  if (smax < 1e-6) smax = 1

  /* --- light: a blurred radial at every hit. the dent glows at its rim. --- */
  if (P.glow > 0 && hits.length) {
    const lights = []
    for (const h of hits) {
      const e = figma.createEllipse()
      const d = h.r * 2.3
      e.resize(d, d)
      e.x = h.x - d / 2; e.y = h.y - d / 2
      e.fills = [{
        type: 'GRADIENT_RADIAL',
        gradientTransform: [[0.5, 0, 0.25], [0, 0.5, 0.25]],
        gradientStops: [
          { position: 0,    color: { r: 1, g: 1, b: 1, a: 0.95 } },
          { position: 0.45, color: { r: 1, g: 1, b: 1, a: 0.28 } },
          { position: 1,    color: { r: 1, g: 1, b: 1, a: 0 } },
        ],
      }]
      e.effects = [{ type: 'LAYER_BLUR', radius: P.blur, visible: true }]
      e.blendMode = 'SCREEN'
      e.opacity = Math.min(1, P.glow)
      e.name = 'hit'
      frame.appendChild(e)
      lights.push(e)
    }
    const g = figma.group(lights, frame)
    g.name = 'light'
  }

  /* --- the field: every cell samples its colour out of the wash --- */
  const cells = []
  const base = cell * P.fill * (1 + bassLift * P.bass * 0.5)
  const inkBase = P.invert ? 0.06 : 0.92

  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
    const k = sink[gy * G + gx] / smax
    const size = base * (1 - k * P.sink)
    if (size < 1) continue
    const cx = (gx + 0.5) * cell + jit(cell * 0.16)
    const cy = (gy + 0.5) * cell + jit(cell * 0.16)

    const t = cx / S * 0.6 + cy / S * 0.4
    const g0 = inkBase + (P.invert ? 1 : -1) * k * P.dark * (P.invert ? 0.7 : 0.8)
    let col = mixC(grey(g0), mixC(cA, cB, t), P.sample * (1 - k * 0.55))
    col = mixC(col, grey(1), Math.max(0, k - 0.55) * 1.4 * P.glow)
    if (k > 0.86) col = mixC(col, accent, 0.75)

    let node
    if (P.shape === 'ci') {
      node = figma.createEllipse()
      node.resize(size, size)
      node.x = cx - size / 2; node.y = cy - size / 2
    } else {
      node = figma.createRectangle()
      node.resize(size, size)
      const rot = jit(6) * Math.PI / 180
      centreAt(node, cx, cy, size, size, rot)
    }
    node.fills = [{ type: 'SOLID', color: col }]
    if (k > 0.02) node.opacity = 1 - k * 0.28
    node.name = 'cell'
    frame.appendChild(node)
    cells.push(node)
  }
  if (cells.length) figma.group(cells, frame).name = 'field'

  /* --- snare: the surface splits --- */
  if (cracks.length) {
    const cs = []
    for (const c of cracks) {
      const n = figma.createRectangle()
      const w = c.len, h = Math.max(0.6, c.w * P.crack)
      n.resize(w, h)
      const cx = S / 2 + Math.cos(c.ang) * c.r, cy = S / 2 + Math.sin(c.ang) * c.r
      centreAt(n, cx, cy, w, h, c.ang)
      n.cornerRadius = h / 2
      n.fills = [{ type: 'SOLID', color: P.invert ? grey(0.07) : grey(0.96) }]
      n.name = 'crack'
      frame.appendChild(n); cs.push(n)
    }
    figma.group(cs, frame).name = 'cracks'
  }

  /* --- hat: grain on the rim --- */
  if (dust.length) {
    const ds = []
    for (const d of dust) {
      const n = figma.createRectangle()
      n.resize(d.s, d.s)
      n.x = d.x; n.y = d.y
      n.fills = [{ type: 'SOLID', color: P.invert ? grey(0.07) : grey(1) }]
      n.opacity = Math.min(1, d.o * P.dust)
      n.name = 'grain'
      frame.appendChild(n); ds.push(n)
    }
    figma.group(ds, frame).name = 'dust'
  }

  figma.currentPage.selection = [frame]
  return frame
}

/* ---------- messages ---------- */
figma.ui.onmessage = (msg) => {
  if (msg.type === 'make' || msg.type === 'live') {
    try {
      const f = make(msg.p, true)
      if (msg.type === 'make') figma.viewport.scrollAndZoomIntoView([f])
      figma.ui.postMessage({ type: 'made', nodes: f.children.length })
    } catch (err) {
      console.error('[siren]', err)
      figma.ui.postMessage({ type: 'error', message: String((err && err.message) || err) })
    }
  }
  if (msg.type === 'close') figma.closePlugin()
}
