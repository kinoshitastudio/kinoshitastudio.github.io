/* Siren — 鳴物
 *
 * A sequencer that plays shapes. Everything it makes is a real Figma node:
 * ellipses, rectangles, gradients, layer blur. Nothing is baked into an image.
 *
 * Fons's surfaces are not 3D. They are blurred gradient shapes, stacked.
 * Here the same parts get placed by the rhythm instead of by hand.
 */

const KEY = 'siren'
const TMP = 'siren.preview'   // this frame is only a preview; LIVE off throws it away
const DEF = 1000
// a payload can arrive with a missing or NaN knob; never let it reach resize()
const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d)
let lastTarget = null

figma.showUI(__html__, { width: 400, height: 720 })

/* Tell the UI what we are about to fill, so its preview has the same shape. */
function tellTarget() {
  const sel = figma.currentPage.selection
  const n = sel.length === 1 && 'width' in sel[0] && !sel[0].getPluginData(KEY) ? sel[0] : null
  const bb = n && n.absoluteBoundingBox
  figma.ui.postMessage({
    type: 'target',
    w: bb ? Math.round(bb.width)  : DEF,
    h: bb ? Math.round(bb.height) : DEF,
    name: n ? n.name : null,
    paint: paintOf(n),
    fills: n && 'fills' in n && n.fills !== figma.mixed ? JSON.parse(JSON.stringify(n.fills)) : null,
  })
}
figma.on('selectionchange', tellTarget)
tellTarget()

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

/* hsl → figma rgb (0..1) */
function hsl(h, s, l) {
  const a = s * Math.min(l, 1 - l)
  const f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1))) }
  return { r: clamp01(f(0)), g: clamp01(f(8)), b: clamp01(f(4)) }
}

/* the last flat paint on a node — so Siren can borrow the colour it sits on */
/* What the layer actually looks like. A gradient is averaged across its stops;
   stacked fills are composited the way Figma stacks them (index 0 is bottom).
   The point isn't colour theory — it's that the ground should already belong
   to the artwork. */
function fillColour(p) {
  if (p.type === 'SOLID') return { c: p.color, a: p.opacity == null ? 1 : p.opacity }
  if (p.type && p.type.indexOf('GRADIENT') === 0 && p.gradientStops && p.gradientStops.length) {
    let r = 0, g = 0, b = 0, a = 0
    for (const st of p.gradientStops) {
      r += st.color.r; g += st.color.g; b += st.color.b
      a += st.color.a == null ? 1 : st.color.a
    }
    const n = p.gradientStops.length
    const op = p.opacity == null ? 1 : p.opacity
    return { c: { r: r / n, g: g / n, b: b / n }, a: (a / n) * op }
  }
  return null                       // images and video: nothing to sample
}
function paintOf(node) {
  if (!node || !('fills' in node) || node.fills === figma.mixed) return null
  const vis = node.fills.filter((p) => p.visible !== false)
  if (!vis.length) return null

  let out = null
  for (const p of vis) {
    const f = fillColour(p)
    if (!f) continue
    if (!out) { out = { r: f.c.r, g: f.c.g, b: f.c.b }; continue }
    out = {
      r: out.r + (f.c.r - out.r) * f.a,
      g: out.g + (f.c.g - out.g) * f.a,
      b: out.b + (f.c.b - out.b) * f.a,
    }
  }
  return out
}

/* How bright a paint stack reads, so the ink can choose to be dark or light. */
function lumaOf(fills) {
  const c = paintOf({ fills })
  return c ? 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b : 0
}

/* Figma rotates around a node's origin, not its centre. Place it by hand. */
function centreAt(node, cx, cy, w, h, angle) {
  const c = Math.cos(angle), s = Math.sin(angle)
  node.relativeTransform = [
    [c, -s, cx - (c * w) / 2 + (s * h) / 2],
    [s,  c, cy - (s * w) / 2 - (c * h) / 2],
  ]
}

/* ---------- generate ---------- */
/* A preview is disposable. A committed frame is not. Keep them apart. */
const isSiren   = (n) => n.type === 'FRAME' && !!n.getPluginData(KEY)
const isPreview = (n) => isSiren(n) && n.getPluginData(TMP) === '1'

function findPreview() { return figma.currentPage.findOne(isPreview) }
function findFrame(preview) {
  return preview ? findPreview() : (findPreview() || figma.currentPage.findOne(isSiren))
}
function discard() {
  const all = figma.currentPage.findAll(isPreview)
  for (const f of all) f.remove()
  return all.length
}

function make(P, reuse, preview) {
  const R = rng(P.seed * 7919 + 13)

  // A selected node decides the canvas: same size, same place, same parent.
  const sel = figma.currentPage.selection
  const target = sel.length === 1 && 'width' in sel[0] && !sel[0].getPluginData(KEY) ? sel[0] : null
  if (target) lastTarget = target.id
  const W = target ? Math.round(target.width)  : DEF
  const H = target ? Math.round(target.height) : DEF
  const S = Math.min(W, H)   // the ring lives on the short edge

  // Reuse the frame we made last time, so LIVE does not scatter frames around.
  let frame = reuse ? findFrame(preview) : null
  if (frame) { for (const c of [...frame.children]) c.remove() }
  else frame = figma.createFrame()

  frame.name = 'Siren'
  frame.clipsContent = true

  if (target) {
    /* Sit directly above the target, inside its parent — a layer that always
       floats on top of the document is not a layer, it is a sticker.
       Park the frame on the page first so indexOf() is not thrown off by it. */
    figma.currentPage.appendChild(frame)
    const parent = target.parent
    parent.insertChild(parent.children.indexOf(target) + 1, frame)
    // an auto layout would otherwise pack the frame into the flow
    if ('layoutMode' in parent && parent.layoutMode !== 'NONE') {
      frame.layoutPositioning = 'ABSOLUTE'
    }
    frame.resize(W, H)
    // siblings share a coordinate space, so the target's own x/y is the answer
    frame.x = target.x
    frame.y = target.y
  } else {
    const fresh = frame.parent !== figma.currentPage
    if (fresh) figma.currentPage.appendChild(frame)
    frame.resize(W, H)
    if (!reuse || fresh) {
      const v = figma.viewport.center
      frame.x = Math.round(v.x - W / 2)
      frame.y = Math.round(v.y - H / 2)
    }
  }
  frame.setPluginData(KEY, JSON.stringify(P))
  frame.setPluginData(TMP, preview ? '1' : '')
  /* Averaging a gradient down to one colour throws away the thing that made it
     worth taking. If the artwork's paint is wanted, wear the paint. */
  const worn = P.useFill && P.srcFills && P.srcFills.length ? P.srcFills : null
  const light = worn ? lumaOf(worn) > 0.5 : num(P.bgL, 0) > 0.5
  frame.fills = worn
    ? JSON.parse(JSON.stringify(worn))
    : [{ type: 'SOLID', color: hsl(num(P.bgH,0), num(P.bgS,0), num(P.bgL,0)) }]
  // what a cell falls toward when the kick drives it into the surface
  const ground = worn ? (paintOf({ fills: worn }) || grey(0)) : hsl(num(P.bgH,0), num(P.bgS,0), num(P.bgL,0))

  const cA = hueRGB(P.h1), cB = hueRGB(P.h2), accent = hueRGB(P.hue)

  /* --- wash: one linear gradient across the whole field --- */
  if (P.wash > 0) {
    const wash = figma.createRectangle()
    wash.name = 'wash'
    wash.resize(W, H)
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
  const GX = Math.ceil(W / cell), GY = Math.ceil(H / cell)
  const sink = new Float32Array(GX * GY)
  const hits = [], cracks = [], dust = []
  let bassLift = 0
  const jit = (a) => (R() * 2 - 1) * a * P.hum

  for (let bar = 0; bar < P.bars; bar++) {
    for (let s = 0; s < 16; s++) {
      const ang = (s / 16) * Math.PI * 2 - Math.PI / 2 + jit(0.06)

      if (P.kickSeq.indexOf(s) >= 0) {
        const r = S * 0.5 * 0.30 * (1 + jit(0.10))
        const hx = W / 2 + Math.cos(ang) * r, hy = H / 2 + Math.sin(ang) * r
        const reach = P.reach * (1 + jit(0.18)) * (S / DEF)
        hits.push({ x: hx, y: hy, r: reach })
        for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
          const cx = (gx + 0.5) * cell, cy = (gy + 0.5) * cell
          const d2 = (cx - hx) * (cx - hx) + (cy - hy) * (cy - hy)
          sink[gy * GX + gx] += Math.exp(-d2 / (reach * reach))
        }
      }
      if (P.snareSeq.indexOf(s) >= 0 && P.crack > 0) {
        const r = S * 0.5 * 0.50 * (1 + jit(0.06))
        cracks.push({ ang: ang + jit(0.05), r, len: S * 0.16 * (0.6 + R() * 0.8), w: 1.4 + R() * 2.6 })
      }
      if (P.hatSeq.indexOf(s) >= 0 && P.dust > 0) {
        const r = S * 0.5 * 0.72
        const n = 5 + Math.round(R() * 7)
        for (let i = 0; i < n; i++) {
          const aa = ang + (R() - 0.5) * 0.16
          const rr = r * (1 + (R() - 0.5) * 0.10)
          dust.push({ x: W / 2 + Math.cos(aa) * rr, y: H / 2 + Math.sin(aa) * rr, s: 1 + R() * 3.2, o: 0.15 + R() * 0.6 })
        }
      }
      if (P.bassSeq.indexOf(s) >= 0) bassLift += 0.12
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
      e.effects = [{ type: 'LAYER_BLUR', radius: P.blur * (S / DEF), visible: true }]
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
  const base = cell * num(P.fill, 0.7) * (1 + bassLift * num(P.bass, 0.5) * 0.5)
  const inkBase = light ? 0.06 : 0.92

  for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
    const k = sink[gy * GX + gx] / smax
    const size = base * (1 - k * num(P.sink, 0.7))
    if (!isFinite(size) || size < 1) continue
    const cx = (gx + 0.5) * cell + jit(cell * 0.16)
    const cy = (gy + 0.5) * cell + jit(cell * 0.16)

    const t = cx / W * 0.6 + cy / H * 0.4
    let col = mixC(grey(inkBase), mixC(cA, cB, t), P.sample * (1 - k * 0.55))
    // A dent is a cell falling toward the ground, not a cell lighting up.
    col = mixC(col, ground, Math.min(1, k * P.dark * 1.25))
    // only the very floor of the impact catches light, and it takes the accent
    const lit = (k - 0.82) / 0.18
    if (lit > 0) col = mixC(col, mixC(grey(1), accent, 0.6), Math.min(1, lit * P.glow))

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
      const cx = W / 2 + Math.cos(c.ang) * c.r, cy = H / 2 + Math.sin(c.ang) * c.r
      centreAt(n, cx, cy, w, h, c.ang)
      n.cornerRadius = h / 2
      n.fills = [{ type: 'SOLID', color: light ? grey(0.07) : grey(0.96) }]
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
      n.fills = [{ type: 'SOLID', color: light ? grey(0.07) : grey(1) }]
      n.opacity = Math.min(1, d.o * P.dust)
      n.name = 'grain'
      frame.appendChild(n); ds.push(n)
    }
    figma.group(ds, frame).name = 'dust'
  }

  // A preview must not steal the selection, or the target is lost on the next tick.
  if (!preview) figma.currentPage.selection = [frame]
  return frame
}

/* ---------- messages ---------- */
figma.ui.onmessage = (msg) => {
  if (msg.type === 'make' || msg.type === 'live') {
    try {
      const preview = msg.type === 'live'
      const f = make(msg.p, true, preview)
      if (!preview) figma.viewport.scrollAndZoomIntoView([f])
      figma.ui.postMessage({ type: 'made', nodes: f.children.length })
    } catch (err) {
      console.error('[siren]', err)
      figma.ui.postMessage({ type: 'error', message: String((err && err.message) || err) })
    }
  }
  if (msg.type === 'discard') {
    const n = discard()
    figma.ui.postMessage({ type: 'discarded', gone: n })
    figma.notify(n ? `プレビューを ${n} 個消しました` : '消すプレビューはありません')
  }
  if (msg.type === 'target') tellTarget()
  if (msg.type === 'close') figma.closePlugin()
}
