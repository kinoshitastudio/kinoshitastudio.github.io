/* Siren — 鳴物
 *
 * A sequencer that plays shapes. Everything it makes is a real Figma node:
 * ellipses, rectangles, gradients, layer blur. Nothing is baked into an image.
 *
 * Fons's surfaces are not 3D. They are blurred gradient shapes, stacked.
 * Here the same parts get placed by the rhythm instead of by hand.
 *
 * Four instruments, four operators on ONE surface — not four pictures:
 *   kick  hits it and then decays (what it tore loose comes down as dust)
 *   snare breaks it (Voronoi plates move apart; a crack is the space between)
 *   hat   roughens it (粒子。粒状の荒れ — blue-noise grain, smaller than its own spacing)
 *   bass  weighs it (面積・重心・暗さ — nested planes, MULTIPLY, settled low)
 *
 * ⚠ make() and draw() in ui.html must consume the RNG in exactly the same
 * order, or the same seed draws two different pictures. Every `continue`, every
 * short-circuited R() is part of the contract. Change one, change both.
 */

const KEY = 'siren'
const TMP = 'siren.preview'   // this frame is only a preview; LIVE off throws it away
const DEF = 1000
// a payload can arrive with a missing or NaN knob; never let it reach resize()
const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d)
let lastTarget = null

figma.showUI(__html__, { width: 400, height: 720 })

/* Tell the UI what we are about to fill, so its preview has the same shape.
   ⭐ "the same shape" literally: the plugin masks its output to the selected
   node, so the panel has to clip its preview to that node too, or the panel is
   lying about what 鳴らす will produce. Ship the node's own outline as SVG. */
async function tellTarget() {
  const sel = figma.currentPage.selection
  const n = sel.length === 1 && 'width' in sel[0] && !sel[0].getPluginData(KEY) ? sel[0] : null
  const bb = n && n.absoluteBoundingBox

  let shape = null
  if (n && bb && bb.width * bb.height < 6e6) {      // a huge node is not worth the wait
    try { shape = await n.exportAsync({ format: 'SVG_STRING' }) } catch (e) { shape = null }
  }
  figma.ui.postMessage({
    type: 'target',
    w: bb ? Math.round(bb.width)  : DEF,
    h: bb ? Math.round(bb.height) : DEF,
    name: n ? n.name : null,
    paint: paintOf(n),
    fills: n && 'fills' in n && n.fills !== figma.mixed ? JSON.parse(JSON.stringify(n.fills)) : null,
    shape,
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
// only a preview is ever reused. A committed frame belongs to the document.
function findFrame(preview) { return preview ? findPreview() : null }
function discard() {
  const all = figma.currentPage.findAll(isPreview)
  for (const f of all) f.remove()
  return all.length
}

const LX = -0.62, LY = -0.62, LZ = 0.48

/* wow & flutter: a slow sine down the frame plus a fine tremor. Transport speed
   instability, drawn. A coordinate transform — no effect, no blend mode. */
function wowAt(P, y, H) {
  const w = P.v.tape ? num(P.v.tape.wow, 0) : 0
  if (!(w > 0)) return 0
  const t = y / H
  return (Math.sin(t * Math.PI * 2.2 + P.seed * 0.7) * 9 + Math.sin(t * Math.PI * 17 + P.seed) * 1.6) * w
}
const CH_RGB = [{ r: 1, g: 0, b: 0 }, { r: 0, g: 1, b: 0 }, { r: 0, g: 0, b: 1 }]
const CH_CMY = [{ r: 0, g: 0.72, b: 0.78 }, { r: 0.9, g: 0, b: 0.43 }, { r: 1, g: 0.85, b: 0 }]

/* ---- the field: run the sequence, build the three height maps + the tears ---
   Shared, verbatim, with draw() in ui.html. `sink` is what the kick digs; `sub`
   is how finely the hat has broken the surface; `lift` is the band the bass
   holds up. */
function field(R, P, V, W, H, S) {
  const G = P.grid, cell = S / G
  const GX = Math.ceil(W / cell), GY = Math.ceil(H / cell)
  const sink = new Float32Array(GX * GY), grit = new Float32Array(GX * GY)
  const jit = (a) => (R() * 2 - 1) * a * P.hum
  const hits = [], cracks = []
  let hold = 0
  const K = V.kick

  for (let bar = 0; bar < P.bars; bar++) for (let s = 0; s < 16; s++) {
    const ang = (s / 16) * Math.PI * 2 - Math.PI / 2 + jit(0.06)

    if (K.on.indexOf(s) >= 0) {
      const r = S * 0.5 * 0.30 * (1 + jit(0.10))
      const hx = W / 2 + Math.cos(ang) * r, hy = H / 2 + Math.sin(ang) * r
      const reach = K.reach * (1 + jit(0.18)) * (S / DEF)
      hits.push({ x: hx, y: hy, r: reach })
      for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
        const cx = (gx + 0.5) * cell, cy = (gy + 0.5) * cell
        const d2 = (cx - hx) * (cx - hx) + (cy - hy) * (cy - hy)
        sink[gy * GX + gx] += Math.exp(-d2 / (reach * reach))
      }
    }
    /* A crack drawn as a line is an illustration of a crack. Here the surface
       itself comes apart: the snare marks where it was struck, and the field
       shatters into plates around those points. */
    if (V.snare.on.indexOf(s) >= 0 && V.snare.amt > 0) {
      const r = S * 0.5 * V.snare.ring * (1 + jit(0.06))
      const a = ang + jit(0.05)
      cracks.push({ x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r })
    }
    /* ハイハット = 粒子。粒状の荒れ。
       Not a shape. Not a smaller kick — a smaller kick belongs inside the kick.
       The hat adds nothing to the field and takes nothing from it. This map only
       says WHERE the grain is dense. The grain itself is scattered later as
       points, with a minimum distance between them — the only way a particle can
       be smaller than the space around it. */
    if (V.hat.on.indexOf(s) >= 0 && V.hat.amt > 0) {
      const r = S * 0.5 * V.hat.ring * (1 + jit(0.05))
      const hx = W / 2 + Math.cos(ang) * r, hy = H / 2 + Math.sin(ang) * r
      const reach = V.hat.reach * (1 + jit(0.20)) * (S / DEF)
      for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
        const cx = (gx + 0.5) * cell, cy = (gy + 0.5) * cell
        const d2 = (cx - hx) * (cx - hx) + (cy - hy) * (cy - hy)
        grit[gy * GX + gx] += Math.exp(-d2 / (reach * reach))
      }
    }
    /* A held note has no attack point and no edge, so it draws nothing here. How
       long it is held is all the field needs to know. */
    if (V.bass.on.indexOf(s) >= 0) hold++
  }

  /* ⭐ Voronoi plates. Each seed owns the cells nearest to it, and the whole plate
     moves as one body, away from the blow that broke it. Two neighbouring plates
     go different ways, so a gap opens along the seam they used to share — and what
     you see in the gap is the ground. There is no crack node. A crack is the space
     between two pieces that used to touch. */
  const shards = []
  if (V.snare.amt > 0 && cracks.length) {
    const n = Math.round(20 + V.snare.pieces * 100)
    const reach = V.snare.reach * (S / DEF)
    for (let i = 0; i < n; i++) {
      const sx = R() * W, sy = R() * H
      let bx = 0, by = 0, bd = 1e18
      for (const c of cracks) {
        const d = (sx - c.x) * (sx - c.x) + (sy - c.y) * (sy - c.y)
        if (d < bd) { bd = d; bx = c.x; by = c.y }
      }
      const dx = sx - bx, dy = sy - by, d = Math.sqrt(dx * dx + dy * dy) || 1
      /* mostly away from the blow, partly its own way. Real fracture is not
         radially obedient, and two hits on one axis would otherwise send every
         plate sideways and lay the cracks down in stripes. */
      const ra = R() * Math.PI * 2, m = 0.6
      let vx = (dx / d) * m + Math.cos(ra) * (1 - m), vy = (dy / d) * m + Math.sin(ra) * (1 - m)
      const vl = Math.sqrt(vx * vx + vy * vy) || 1
      shards.push({ x: sx, y: sy, vx: vx / vl, vy: vy / vl,
                    f: Math.exp(-bd / (reach * reach)), rot: (R() * 2 - 1) * 0.10 })
    }
  }

  let smax = 0; for (const v of sink) if (v > smax) smax = v; if (smax < 1e-6) smax = 1
  let gmax = 0; for (const v of grit) if (v > gmax) gmax = v; if (gmax < 1e-6) gmax = 1
  return { cell, GX, GY, sink, grit, smax, gmax, hits, shards, hold }
}

/* the crater floor, sampled anywhere — not just at cell centres, because the
   hat's subcells sit between them */
function kAtF(F, x, y, curve) {
  const fx = x / F.cell - 0.5, fy = y / F.cell - 0.5
  const x0 = Math.floor(fx), y0 = Math.floor(fy)
  const tx = fx - x0, ty = fy - y0
  const g = (gx, gy) => F.sink[Math.min(F.GY - 1, Math.max(0, gy)) * F.GX + Math.min(F.GX - 1, Math.max(0, gx))]
  const a = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * tx
  const b = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * tx
  return Math.pow(Math.max(0, (a + (b - a) * ty) / F.smax), curve)
}
function biAtF(arr, F, x, y) {
  const fx = x / F.cell - 0.5, fy = y / F.cell - 0.5
  const x0 = Math.floor(fx), y0 = Math.floor(fy)
  const tx = fx - x0, ty = fy - y0
  const g = (gx, gy) => arr[Math.min(F.GY - 1, Math.max(0, gy)) * F.GX + Math.min(F.GX - 1, Math.max(0, gx))]
  const a = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * tx
  const b = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * tx
  return a + (b - a) * ty
}
/* ---- blue noise: Bridson's Poisson-disc -----------------------------------
   ⭐ Every point is at least r from every other, otherwise random. That kills the
   clumping of white noise AND the regularity of a grid at once. Because there are
   no cells, the grain's size is decoupled from its spacing — and a grain far
   smaller than the gap around it IS the definition of grain. A grid can never do
   this: its dot can never be smaller than its own cell. That was the whole bug. */
function poisson(R, r, w, h) {
  const cs = r / Math.SQRT2, gw = Math.ceil(w / cs), gh = Math.ceil(h / cs)
  const grid = new Int32Array(gw * gh).fill(-1), pts = [], act = []
  const put = (p) => { pts.push(p); act.push(pts.length - 1); grid[(p[1] / cs | 0) * gw + (p[0] / cs | 0)] = pts.length - 1 }
  put([R() * w, R() * h])
  while (act.length) {
    const ai = R() * act.length | 0, p = pts[act[ai]]
    let hit = false
    for (let i = 0; i < 18; i++) {
      const a = R() * Math.PI * 2, rr = r * (1 + R())
      const q = [p[0] + Math.cos(a) * rr, p[1] + Math.sin(a) * rr]
      if (q[0] < 0 || q[1] < 0 || q[0] >= w || q[1] >= h) continue
      const gx = q[0] / cs | 0, gy = q[1] / cs | 0
      let ok = true
      for (let yy = Math.max(0, gy - 2); yy <= Math.min(gh - 1, gy + 2) && ok; yy++)
        for (let xx = Math.max(0, gx - 2); xx <= Math.min(gw - 1, gx + 2); xx++) {
          const id = grid[yy * gw + xx]
          if (id >= 0 && Math.hypot(pts[id][0] - q[0], pts[id][1] - q[1]) < r) { ok = false; break }
        }
      if (ok) { put(q); hit = true; break }
    }
    if (!hit) act.splice(ai, 1)
  }
  return pts
}

/* ---- Voronoi by half-plane clipping. No library, no Delaunay. -------------
   A cell is the box, clipped once against the bisector with every other seed. */
function clipHalf(poly, a, b) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, nx = b[0] - a[0], ny = b[1] - a[1]
  const f = (p) => (p[0] - mx) * nx + (p[1] - my) * ny
  const out = []
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length]
    const dp = f(p), dq = f(q)
    if (dp <= 0) out.push(p)
    if ((dp <= 0) !== (dq <= 0)) { const t = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]) }
  }
  return out
}
function voronoiCells(seeds, W, H) {
  const box = [[0, 0], [W, 0], [W, H], [0, H]]
  return seeds.map((s, i) => {
    let poly = box
    for (let j = 0; j < seeds.length; j++) { if (i !== j) { poly = clipHalf(poly, s, seeds[j]); if (!poly.length) break } }
    return poly
  })
}
const centroid = (p) => { let x = 0, y = 0; for (const q of p) { x += q[0]; y += q[1] } return [x / p.length, y / p.length] }
const shrinkPoly = (p, c, f) => p.map((q) => [c[0] + (q[0] - c[0]) * f, c[1] + (q[1] - c[1]) * f])
const pathD = (p) => 'M' + p.map((q) => q[0].toFixed(2) + ',' + q[1].toFixed(2)).join('L') + 'Z'

/* which plate this point belongs to. Nearest seed wins — that is Voronoi. */
function shardAt(F, x, y) {
  let best = null, bd = 1e18
  for (const sh of F.shards) {
    const d = (x - sh.x) * (x - sh.x) + (y - sh.y) * (y - sh.y)
    if (d < bd) { bd = d; best = sh }
  }
  return best
}

function make(P, reuse, preview) {
  const R = rng(P.seed * 7919 + 13)
  const V = P.v
  const K = V.kick, Sn = V.snare, HT = V.hat, Bs = V.bass

  // A selected node decides the canvas: same size, same place, same parent.
  const sel = figma.currentPage.selection
  const target = sel.length === 1 && 'width' in sel[0] && !sel[0].getPluginData(KEY) ? sel[0] : null
  if (target) lastTarget = target.id
  /* ⚠️ node.x/y is the node's ORIGIN, not the top-left of what you see. For a
     vector or a rotated node those are different points, and the frame lands
     somewhere else entirely. The bounding box is the only thing that means
     "where this looks like it is". Same for width/height. */
  const tbb = target && target.absoluteBoundingBox
  const W = tbb ? Math.round(tbb.width)  : DEF
  const H = tbb ? Math.round(tbb.height) : DEF
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
       Park the frame on the page first so indexOf() is not thrown off by it.
       But some parents will not take a child: a component instance, a locked
       tree. Never let that throw — fall back to the page and place by absolute
       coordinates instead. It has to work on ANY node, or it works on none. */
    figma.currentPage.appendChild(frame)
    const parent = target.parent
    let nested = false
    try {
      if (parent && parent.type !== 'INSTANCE' && 'insertChild' in parent) {
        parent.insertChild(parent.children.indexOf(target) + 1, frame)
        nested = true
      }
    } catch (e) { nested = false }
    // an auto layout would otherwise pack the frame into the flow
    const host = frame.parent
    if (host && 'layoutMode' in host && host.layoutMode !== 'NONE') {
      frame.layoutPositioning = 'ABSOLUTE'
    }
    frame.resize(W, H)
    /* Put the frame's bounding box exactly on the target's bounding box. Doing
       this in absolute space and then correcting means it is right whatever the
       parent is doing — rotated, nested, auto laid out. */
    const fbb = frame.absoluteBoundingBox
    if (fbb && tbb) {
      frame.x += tbb.x - fbb.x
      frame.y += tbb.y - fbb.y
    }
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

  /* ⭐ A frame is a rectangle. The thing you selected is usually not.
     Clone the target and make it a mask: everything after it in the frame gets
     cut to that shape — a triangle, an ellipse, a letterform. The clone lands on
     the page, not in the frame, so put it where it belongs BEFORE moving it, or
     the parent's origin shifts it. (Kaibou learned this one the hard way.)
     The ground has to be cut too, so the frame stops painting itself and the
     ground becomes a child. */
  let mask = null
  if (target && P.clip !== false && 'clone' in target) {
    mask = target.clone()
    frame.insertChild(0, mask)
    const fb = frame.absoluteBoundingBox, mb = mask.absoluteBoundingBox
    if (fb && mb) { mask.x += fb.x - mb.x; mask.y += fb.y - mb.y }
    else { mask.x = 0; mask.y = 0 }
    if ('effects' in mask) mask.effects = []
    if ('strokes' in mask) mask.strokes = []
    // a stroke-only path clones into an EMPTY mask, and an empty mask erases
    // everything behind it. Give it something to be.
    if ('fills' in mask && (mask.fills === figma.mixed || !mask.fills.length)) {
      mask.fills = [{ type: 'SOLID', color: grey(1) }]
    }
    mask.opacity = 1
    mask.visible = true
    mask.isMask = true
    mask.name = '⟨shape⟩'
  }
  /* Averaging a gradient down to one colour throws away the thing that made it
     worth taking. If the artwork's paint is wanted, wear the paint. */
  const worn = P.useFill && P.srcFills && P.srcFills.length ? P.srcFills : null
  const dialled = hsl(num(P.bgH, 0), num(P.bgS, 0), num(P.bgL, 0))
  const chosen = worn ? (paintOf({ fills: worn }) || grey(0)) : dialled
  const pale = worn ? lumaOf(worn) > 0.5 : num(P.bgL, 0) > 0.5

  /* 反転 swaps the panel and the void. Turning the ink over while the ground
     stays put just makes the surface disappear into it — inversion has to move
     both, or it moves nothing. */
  const panel = pale ? grey(0.06) : grey(0.92)      // the colour of the surface
  const ground = P.flip ? panel : chosen            // what shows through a hole
  const light = P.flip ? !pale : pale               // a pale void wants dark ink
  /* The panel used to be whatever the ground was not. That is a good default and
     a bad law — a red ground turned the panel black with no way to say otherwise.
     The ground and the surface are two colours, so they take two controls. */
  const ink = P.inkAuto === false
    ? hsl(num(P.inkH, 0), num(P.inkS, 0), num(P.inkL, 0.92))
    : grey(light ? 0.06 : 0.92)

  /* the ground is a child now, so the mask can cut it as well */
  frame.fills = []
  const bg = figma.createRectangle()
  bg.name = 'ground'
  bg.resize(W, H)
  bg.x = 0; bg.y = 0
  bg.fills = (P.flip || !worn)
    ? [{ type: 'SOLID', color: ground }]
    : JSON.parse(JSON.stringify(worn))
  frame.appendChild(bg)

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

  const F = field(R, P, V, W, H, S)
  const { cell, GX, GY } = F

  /* --- the field ------------------------------------------------------------
     `sink` is a height field. A dent and a bump shrink their cells exactly the
     same way — the only thing that tells them apart is which wall catches the
     light. So take the normal and light it. The light sits up and to the left,
     which means the near wall of a dent goes dark and the far wall goes bright.
     Reverse that and the eye reads a bump. This is the whole illusion. */
  const cells = []
  const base = cell * num(P.fill, 1)   // a closed surface: size 1 = the cell
  const curve = num(K.curve, 2)
  const relief = num(K.relief, 0.9)
  const spread = num(K.spread, 0.4)
  const debris = num(K.debris, 0)
  const sinkAmt = num(K.sink, 0.7)
  const decay = num(K.decay, 0)     // declared up here: the cell loop reads it too

  /* ⭐ Only a cell that MOVED has to be a node.
     A fine grid costs thousands of rectangles, and almost all of them are asleep:
     closed, flat, the same colour as the one beside them. Those are not panels,
     they are one panel. Fold each run of sleeping cells into a single rectangle
     and spend the budget where something actually happened. */
  const asleep = new Uint8Array(GX * GY)
  /* ⭐ Broken or whole. When the snare sounds the field is no longer a grid — it
     IS the plates. The kick's hole does not sit on top of them: it is the plates
     near the impact going dark and shrinking away until the ground shows. One
     event, not two layers. */
  const broken = num(Sn.amt, 0) > 0 && F.shards.length > 0
  const canFold = !broken && P.shape === 'sq' && num(P.fill, 1) > 0.9 && num(P.sample, 0) < 0.02

  if (broken) {
    const polys = voronoiCells(F.shards.map((sh) => [sh.x, sh.y]), W, H)
    polys.forEach((poly, i) => {
      if (poly.length < 3) return
      const sh = F.shards[i]
      const c = centroid(poly)
      const k = kAtF(F, c[0], c[1], curve)
      const dx = (kAtF(F, c[0] + cell, c[1], curve) - kAtF(F, c[0] - cell, c[1], curve)) * 0.5
      const dy = (kAtF(F, c[0], c[1] + cell, curve) - kAtF(F, c[0], c[1] - cell, curve)) * 0.5
      const shade = (dx * LX + dy * LY + LZ) / Math.sqrt(dx * dx + dy * dy + 1) - LZ
      // a surface breaks where the stress is, and the stress is on the crater wall
      const slope = Math.sqrt(dx * dx + dy * dy)
      const sF = Sn.amt * sh.f * (0.28 + 0.72 * Math.min(1, slope * 6))

      let col = mixC(ink, mixC(cA, cB, c[0] / W * 0.6 + c[1] / H * 0.4), P.sample * (1 - k * 0.55))
      col = mixC(col, ground, Math.min(1, k * K.dark * 1.25))
      if (shade > 0) col = mixC(col, grey(1), Math.min(1, shade * 2.2 * relief))
      else if (shade < 0) col = mixC(col, ground, Math.min(1, -shade * 1.5 * relief))
      const lit = (k - 0.82) / 0.18
      if (lit > 0) col = mixC(col, mixC(grey(1), accent, 0.6), Math.min(1, lit * K.glow))

      /* the plate shrinks — that is the crack, and it is also the hole: a plate at
         the bottom of the kick shrinks to nothing and the ground is what is left.
         An unbroken plate overlaps its neighbour, or the shared edge draws itself. */
      const grow = 1 + 0.022 * (1 - Math.min(1, sF * 6))
      const f = (1 - sF * 0.145) * (1 - k * sinkAmt * 0.62) * grow
      if (!(f > 0.02)) return                    // this plate has gone
      let p = shrinkPoly(poly, c, f)
      // once loose, a plate accelerates: it is no longer part of anything
      const push = Math.pow(sF, 1.25) * cell * 0.9, rot = sh.rot * sF
      const cs = Math.cos(rot), sn = Math.sin(rot)
      p = p.map((q) => {
        const rx = q[0] - c[0], ry = q[1] - c[1]
        return [c[0] + rx * cs - ry * sn + sh.vx * push + wowAt(P, q[1], H), c[1] + rx * sn + ry * cs + sh.vy * push]
      })
      const v = figma.createVector()
      v.vectorPaths = [{ windingRule: 'NONZERO', data: pathD(p) }]
      v.fills = [{ type: 'SOLID', color: col }]
      v.strokes = []
      // past a certain distance a plate has left the surface, and it thins out
      const gone = Math.max(0, sF - 1)
      const op = (1 - k * 0.28) * Math.max(0.06, 1 - gone * 0.34)
      if (k > 0.02 || gone > 0) v.opacity = Math.max(0, Math.min(1, op))
      v.name = 'plate'
      frame.appendChild(v)
      cells.push(v)
    })
  } else
  for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
    const px = (gx + 0.5) * cell, py = (gy + 0.5) * cell

    if (canFold) {
      const kC = kAtF(F, px, py, curve)
      // nothing reached this cell. It is still the surface it always was.
      if (kC < 0.012) { asleep[gy * GX + gx] = 1; continue }
    }

    // The rim of a dent is still surface. Bending the falloff keeps the holes
    // near the impact instead of spreading them over the whole field.
    const k = kAtF(F, px, py, curve)
    const dx = (kAtF(F, px + cell, py, curve) - kAtF(F, px - cell, py, curve)) * 0.5
    const dy = (kAtF(F, px, py + cell, curve) - kAtF(F, px, py - cell, curve)) * 0.5
    const shade = (dx * LX + dy * LY + LZ) / Math.sqrt(dx * dx + dy * dy + 1) - LZ

    /* Material has to go somewhere. Where the wall is steep the surface is being
       displaced: cells are shoved outward, down the slope, and the ones just
       outside the pit swell with what used to be inside it. */
    const slope = Math.sqrt(dx * dx + dy * dy)
    const swell = 1 + spread * slope * 3.2 * (1 - k)
    let size = base * (1 - k * sinkAmt) * swell
    if (!(size > 0.6)) continue

    let push = spread * slope * cell * 5.5
    /* Torn loose. Past a certain blow the cells on the wall stop being surface:
       they lose their shape, become debris, and are thrown clear. */
    const loose = debris > 0 && k > 0.2 && k < 0.85 && R() < debris
    if (loose) { push *= 1.6 + R() * 2.4; size *= 0.35 + R() * 0.4 }
    // only a cell that is already moving gets nudged — a closed rim stays closed
    const j = cell * 0.16 * Math.min(1, k * 3)
    let cx = px - dx / (slope || 1) * push + (R() * 2 - 1) * j * P.hum
    let cy = py - dy / (slope || 1) * push + (R() * 2 - 1) * j * P.hum
    cx += wowAt(P, py, H)


    const t = cx / W * 0.6 + cy / H * 0.4
    let col = mixC(ink, mixC(cA, cB, t), P.sample * (1 - k * 0.55))
    // A dent is a cell falling toward the ground, not a cell lighting up.
    col = mixC(col, ground, Math.min(1, k * K.dark * 1.25))
    // the wall facing the light is lit; the wall turned away is dimmer, not black
    if (shade > 0) col = mixC(col, grey(1), Math.min(1, shade * 2.2 * relief))
    else if (shade < 0) col = mixC(col, ground, Math.min(1, -shade * 1.5 * relief))
    // only the very floor of the impact catches light, and it takes the accent
    const lit = (k - 0.82) / 0.18
    if (lit > 0) col = mixC(col, mixC(grey(1), accent, 0.6), Math.min(1, lit * K.glow))

    /* A closed surface must not have its own grid drawn across it. Cells that sit
       exactly edge to edge leave a hairline seam where they meet, and a field of
       hairlines reads as BIT — Kaibou's word, not Siren's. So a cell that is
       still surface overlaps its neighbour. The further it has fallen, the less
       it reaches: a hole must stay open. */
    const seam = (P.shape === 'sq' && !loose && num(P.fill, 1) > 0.9)
      ? cell * 0.09 * Math.min(1, (num(P.fill, 1) - 0.9) / 0.1) * (1 - Math.min(1, k * 1.5)) : 0
    const dsz = size + seam
    let node
    if (loose || P.shape === 'ci') {
      node = figma.createEllipse()
      node.resize(size, size)
      node.x = cx - size / 2; node.y = cy - size / 2
    } else {
      node = figma.createRectangle()
      node.resize(dsz, dsz)
      const rot = (R() * 2 - 1) * 6 * P.hum * Math.min(1, k * 3) * Math.PI / 180
      centreAt(node, cx, cy, dsz, dsz, rot)
    }
    node.fills = [{ type: 'SOLID', color: col }]
    const op = loose ? Math.max(0.15, (1 - k * 0.28) * (0.35 + R() * 0.5)) : (1 - k * 0.28)
    if (k > 0.02 || loose) node.opacity = Math.max(0, Math.min(1, op))
    node.name = loose ? 'debris' : 'cell'
    frame.appendChild(node)
    cells.push(node)
  }
  /* one rectangle per horizontal run of sleeping cells */
  const rest = []
  if (canFold) {
    const over = cell * 0.14
    for (let gy = 0; gy < GY; gy++) {
      let x0 = -1
      for (let gx = 0; gx <= GX; gx++) {
        const on = gx < GX && asleep[gy * GX + gx]
        if (on && x0 < 0) x0 = gx
        else if (!on && x0 >= 0) {
          const r = figma.createRectangle()
          r.resize((gx - x0) * cell + over * 2, cell + over * 2)
          r.x = x0 * cell - over; r.y = gy * cell - over
          r.fills = [{ type: 'SOLID', color: ink }]
          r.name = 'surface'
          frame.appendChild(r); rest.push(r)
          x0 = -1
        }
      }
    }
  }
  // the untouched surface sits under everything the sequence did to it,
  // but still above the wash
  for (const c of cells) frame.appendChild(c)
  const all = rest.concat(cells)
  const fieldGroup = all.length ? figma.group(all, frame) : null
  if (fieldGroup) fieldGroup.name = 'field'

  /* --- light ---------------------------------------------------------------
     SCREEN can only add. MULTIPLY can only subtract. So on a dark ground the
     highlights fire and the illusion lives; on a pale ground they add nothing
     and only the shadows remain — which is exactly what a dent on white paper
     looks like. Build the stack the ground can actually carry.

     Blur radii are fractions of D, the crater's diameter. A hot specular is
     small and barely blurred; the diffuse under it is large and soft. That size
     contrast is what separates "wet" from "matte".
     Nothing here is 3D. Ellipses, gradients, a blur. ------------------------ */
  if (K.glow > 0 && F.hits.length && relief > 0 && !light) {
    const LN = Math.sqrt(LX * LX + LY * LY)
    const ux = LX / LN, uy = LY / LN          // toward the light
    const g = Math.min(1.4, K.glow)

    /* Every hit used to throw its spark the same way, because every one of them
       borrowed the light's direction. But a hit is an event with a place: what
       flies off it flies away from where it happened. Give each one its own
       outward vector, jittered, and the ring stops looking like a stamp. */
    const lamp = (h, o) => {
      const D = h.r * 2
      const d = D * o.size
      if (!(d > 0.5)) return null
      let dirx = o.away ? -ux : ux, diry = o.away ? -uy : uy
      if (o.burst) {
        let rx = h.x - W / 2, ry = h.y - H / 2
        const rl = Math.sqrt(rx * rx + ry * ry)
        if (rl > 1e-3) {
          const a = Math.atan2(ry, rx) + (R() * 2 - 1) * 0.6      // scatter, don't stamp
          dirx = Math.cos(a); diry = Math.sin(a)
        }
      }
      const e = figma.createEllipse()
      e.resize(d, d)
      e.x = h.x + D * o.off * dirx - d / 2
      e.y = h.y + D * o.off * diry - d / 2
      e.fills = [{
        type: 'GRADIENT_RADIAL',
        gradientTransform: [[0.5, 0, 0.25], [0, 0.5, 0.25]],
        gradientStops: [
          { position: 0,    color: { r: o.c.r, g: o.c.g, b: o.c.b, a: o.a } },
          { position: 0.45, color: { r: o.c.r, g: o.c.g, b: o.c.b, a: o.a * 0.3 } },
          { position: 1,    color: { r: o.c.r, g: o.c.g, b: o.c.b, a: 0 } },
        ],
      }]
      e.effects = [{ type: 'LAYER_BLUR', radius: Math.max(0.4, D * o.blur), visible: true }]
      e.blendMode = o.mode
      e.opacity = Math.max(0, Math.min(1, o.op))
      e.name = o.name
      frame.appendChild(e)
      return e
    }

    const white = grey(1)
    const parts = []
    for (const h of F.hits) {
      /* No occlusion, no shadow, no diffuse ball. The dark inside the dent is not
         painted on — it is the ground, and it appears because the panels above it
         fell away. Painting darkness over a surface that is already falling only
         puts a smudge on top of it.
         What survives is what a real surface would still show: one hard pin of
         reflection thrown clear of the crater, and colour bleeding into the hollow. */
      const throwOut = 0.08 + spread * 0.10   // it still flies outward, but the panel is over it
      parts.push(lamp(h, { name:'spec',   c:white,  a:0.90, size:0.20, off:throwOut, burst:1, blur:0.06, mode:'SCREEN',     op:0.75*g }))
      parts.push(lamp(h, { name:'colour', c:accent, a:0.30, size:0.60, off:throwOut, burst:1, blur:0.20, mode:'SOFT_LIGHT', op:0.7*g }))
    }
    const kept = parts.filter(Boolean)
    if (kept.length) figma.group(kept, frame).name = 'light'
  }
  /* The lamps go UNDER the panel. Light on a white surface is a white smudge —
     SCREEN can only add, and a closed panel has nothing to add to. So the light
     lives beneath, the way the dark does, and shows only where the surface broke
     and let it through. The panel hides its own glow until it is holed. */
  if (fieldGroup) frame.appendChild(fieldGroup)

  /* --- reverb: ぼかし＝畳み込み ---------------------------------------------
     Not a metaphor. A gaussian blur and a reverb tail are the same computation, so
     the tail is drawn the only honest way: copies of the surface, each offset
     further, blurred more, fainter. The blur GROWING is the whole thing — late
     reflections diffuse and a sharp edge dissolves into a wash you cannot count.

     Echo is the sibling, not the same knob: discrete repeats, evenly spaced, NOT
     blurred. You can count them. Never mix the two.

     余白 is not a third mechanism. It is the tail aimed into an emptiness: bias it
     one way, leave that way clear, and the eye extrapolates the decay past the
     last copy. Empty space with nothing decaying into it is just a margin. --- */
  const RV = V.reverb || { amt: 0 }
  if (fieldGroup && num(RV.amt, 0) > 0) {
    const N = Math.max(1, Math.round(num(RV.taps, 5)))
    const px = S / DEF
    const at = frame.children.indexOf(fieldGroup)
    for (let i = N; i >= 1; i--) {
      const t = i / N
      const echo = RV.mode === 'echo'
      const blur = echo ? 0 : Math.max(0.3, t * num(RV.spread, 26) * 0.55 * px)
      const step = num(RV.spread, 26) * px
      const dx = echo ? i * step * 0.8 : (RV.mode === 'ma' ? Math.pow(t, 0.8) * step * N * 0.45 : t * step * 1.1)
      const dy = echo ? i * step * 0.35 : (RV.mode === 'ma' ? 0 : t * step * 0.45)
      const op = (echo ? Math.pow(0.62, i) : Math.pow(0.55, i) * 1.6) * RV.amt
      if (op < 0.004) continue
      const c = fieldGroup.clone()
      frame.insertChild(at, c)              // the tail decays BEHIND its source
      c.x += dx; c.y += dy
      if (blur > 0.3) c.effects = [{ type: 'LAYER_BLUR', radius: blur, visible: true }]
      c.opacity = Math.max(0, Math.min(1, op))
      c.blendMode = light ? 'MULTIPLY' : 'SCREEN'
      c.name = echo ? 'echo' : 'tail'
    }
  }

  /* --- tape: 全体の揺れ、色ズレ -----------------------------------------------
     ⭐ Ink is subtractive: cyan on white paper absorbs red, two inks overlapping
     make the paper darker. That is MULTIPLY, and it does something only on a light
     ground. Light is additive: red + green + blue is white. That is SCREEN, and it
     does something only on a dark ground.

     So there is no single misregistration. There are two, and the ground decides
     which physics you are in. ------------------------------------------------ */
  const TP = V.tape || { amt: 0 }
  if (fieldGroup && num(TP.amt, 0) > 0) {
    const ink = TP.mode === 'cmy' || (TP.mode === 'auto' && light)
    const ch = ink ? CH_CMY : CH_RGB
    const off = num(TP.off, 6) * (S / DEF) * TP.amt
    const dirs = [[-off, -off * 0.4], [0, off * 0.5], [off, -off * 0.2]]
    for (let i = 0; i < 3; i++) {
      const c = fieldGroup.clone()
      frame.appendChild(c)
      c.x += dirs[i][0]; c.y += dirs[i][1]
      for (const nd of c.findAll((x) => 'fills' in x)) nd.fills = [{ type: 'SOLID', color: ch[i] }]
      c.blendMode = ink ? 'MULTIPLY' : 'SCREEN'
      c.name = ink ? 'plate ' + 'CMY'[i] : 'channel ' + 'RGB'[i]
    }
    fieldGroup.visible = false             // the channels replace it
  }

  /* --- bass: 面積・重心・暗さ ------------------------------------------------
     A drum is an event. A held note is not — no attack point, no edge, so it
     cannot be a shape that happens. It is mass: nested planes, each a flat tone,
     offset downward so the visual weight settles low. Area is the mass, the low
     placement is the centre of gravity, the tone is the darkness. Nothing
     happens, and that is what being held looks like.

     MULTIPLY darkens the panel and does nothing to the ground, which is already
     dark — the same arithmetic that keeps the lamps off a pale surface. On a pale
     ground the panels ARE the dark thing, so it lightens instead. ---------- */
  if (num(Bs.amt, 0) > 0 && F.hold) {
    const held = Math.min(1, F.hold / 6)      // how long it is held = its area
    const N = Math.max(2, Math.round(num(Bs.layers, 5)))
    const w0 = Math.min(W, H) * num(Bs.size, 0.9) * (0.55 + 0.45 * held)
    const bs = []
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1)
      const w = w0 * (1 - t * 0.72)
      const y = H / 2 - w / 2 + (w0 - w) * 0.5 * num(Bs.drop, 0.5)
      const v = 1 - t * 0.86
      const c = light ? grey(1 - v * Bs.amt * 0.9) : grey(v)
      const r = figma.createRectangle()
      r.resize(w, w)
      r.x = W / 2 - w / 2; r.y = y
      r.fills = [{ type: 'SOLID', color: c }]
      r.blendMode = light ? 'SCREEN' : 'MULTIPLY'
      r.opacity = Math.max(0, Math.min(1, Bs.amt * (0.30 + 0.70 * held)))
      r.name = 'plane'
      frame.appendChild(r); bs.push(r)
    }
    if (bs.length) figma.group(bs, frame).name = 'bass'
  }

  /* --- the hat: 粒子・粒状の荒れ --------------------------------------------
     Grain sits ON the surface and never asks what the surface is made of — cells,
     plates, it does not care. It is the ground showing through where the panel has
     worn away. Dense where the hat landed, absent where it did not. It adds no
     structure, so it cannot add BIT. ---------------------------------------- */
  if (num(HT.amt, 0) > 0) {
    // spacing tightens as the hat opens. The grain gets denser, never bigger.
    const gr = Math.max(3, (34 - 14 * HT.amt) * (S / DEF))
    const pts = poisson(R, gr, W, H)
    const sz0 = num(HT.size, 1.1) * 2.0 * (S / DEF)
    const gs = []
    for (const p of pts) {
      /* A hi-hat is not a place, it is a texture: it grains the whole surface, and
         the ring it plays on only makes some of that surface grainier. */
      const dens = HT.amt * (0.45 + 0.55 * Math.min(1, biAtF(F.grit, F, p[0], p[1]) / F.gmax))
      if (R() > dens) continue
      const k = kAtF(F, p[0], p[1], curve)
      if (k > 0.72) continue                               // the hole is already ground
      const sz = sz0 * (0.30 + Math.pow(R(), 2.4) * 2.7)   // many tiny, a few larger
      if (!(sz > 0.30)) continue
      const op = 0.35 + R() * 0.65
      const e = figma.createEllipse()
      e.resize(sz * 2, sz * 2)
      e.x = p[0] - sz; e.y = p[1] - sz
      e.fills = [{ type: 'SOLID', color: ground }]
      e.opacity = Math.max(0, Math.min(1, op))
      e.name = 'grain'
      frame.appendChild(e); gs.push(e)
    }
    if (gs.length) figma.group(gs, frame).name = 'grain'
  }

  /* --- dust ----------------------------------------------------------------
     There are no shock rings here, and no ripple in the height field either.
     Both were tried. A ring painted over the panel is white light on a white
     surface and it vanishes; a ripple shaded into the cells turns the field into
     a staircase, because every cell is a shape and a thousand shapes look like a
     thousand shapes. Smooth shading is not something a vector synth can say. It
     is what Kaibou is for — blur is reverb, and reverb belongs after the
     instrument, not inside it.

     So the decay is this: debris that has settled. It is the panel's own colour,
     so it can only be seen where the panel is gone — inside the crater, where the
     ground shows through. That is where it fell. ---------------------------- */
  if (decay > 0 && F.hits.length) {
    const bits = []
    for (const h of F.hits) {
      const cnt = Math.round(decay * 30)
      for (let i = 0; i < cnt; i++) {
        const a = R() * Math.PI * 2
        const u = R()
        const rr = h.r * (0.18 + Math.pow(u, 0.55) * 0.92)   // the hollow, not the field
        const sz = cell * 0.14 * (0.3 + R() * 0.85)
        if (!(sz > 0.3)) continue
        const n = figma.createRectangle()
        n.resize(sz, sz)
        n.x = h.x + Math.cos(a) * rr - sz / 2
        n.y = h.y + Math.sin(a) * rr - sz / 2
        n.fills = [{ type: 'SOLID', color: ink }]
        n.opacity = Math.max(0, Math.min(1, decay * (0.3 + 0.7 * (1 - u)) * 0.8))
        n.name = 'dust'
        frame.appendChild(n); bits.push(n)
      }
    }
    if (bits.length) figma.group(bits, frame).name = 'dust'
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
      /* say WHERE it went. A node count alone cannot tell you whether the thing
         you selected is the thing that got filled. */
      const sel0 = figma.currentPage.selection
      const tgt = sel0.length === 1 && 'width' in sel0[0] && !sel0[0].getPluginData(KEY) ? sel0[0] : null
      const into = tgt ? tgt.name : null
      const many = sel0.length > 1
      /* LIVE reuses its one throwaway frame, so dragging a knob does not litter
         the page. 鳴らす does NOT: a committed Siren is a finished thing, and the
         next one is a NEW thing. Reusing it meant the second hit picked up the
         first and dragged it across the canvas to the new selection. */
      if (!preview) discard()
      const f = make(msg.p, preview, preview)
      if (!preview) figma.viewport.scrollAndZoomIntoView([f])
      figma.ui.postMessage({ type: 'made', nodes: f.children.length, into, many, preview })
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
