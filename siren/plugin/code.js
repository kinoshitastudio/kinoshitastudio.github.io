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
 *   snare tears it (the cells part; the ground shows in the split)
 *   hat   roughens it (粒子。粒状の荒れ — no new shape, just grain)
 *   bass  swells it (a sustained arc, not a point)
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

/* ---- the field: run the sequence, build the three height maps + the tears ---
   Shared, verbatim, with draw() in ui.html. `sink` is what the kick digs; `sub`
   is how finely the hat has broken the surface; `lift` is the band the bass
   holds up. */
function field(R, P, V, W, H, S) {
  const G = P.grid, cell = S / G
  const GX = Math.ceil(W / cell), GY = Math.ceil(H / cell)
  const sink = new Float32Array(GX * GY), grit = new Float32Array(GX * GY), lift = new Float32Array(GX * GY)
  const jit = (a) => (R() * 2 - 1) * a * P.hum
  const hits = [], tears = [], arcs = []
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
    /* A crack drawn as a line is an illustration of a crack. Here the cells
       themselves part: each tear pushes the surface aside along its own normal,
       and what shows in the gap is the ground that was always underneath. */
    if (V.snare.on.indexOf(s) >= 0 && V.snare.amt > 0) {
      const r = S * 0.5 * V.snare.ring * (1 + jit(0.06))
      const a = ang + jit(0.05)
      tears.push({ x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r, c: Math.cos(a), s: Math.sin(a),
                   len: S * V.snare.len * (0.6 + R() * 0.8), w: cell * V.snare.w * (0.7 + R() * 0.6) })
    }
    /* ハイハット = 粒子。粒状の荒れ。
       Not a shape. Not a smaller kick — a smaller kick belongs inside the kick.
       The hat adds nothing to the field; it roughens what the field already has.
       Where it lands the cells go grainy: their value scatters and they lose a
       little of their size, so the ground shows between them. Adds no nodes. */
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
    /* A sustained note is not a point. It is held, so it is an arc — and a band
       of the surface stays lifted for as long as it rings. */
    if (V.bass.on.indexOf(s) >= 0) {
      const span = V.bass.arc * Math.PI / 2
      const ringR = S * 0.5 * V.bass.ring
      const band = Math.max(cell, V.bass.width * S * 0.22)
      arcs.push({ ang, span, ringR, band })
      for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
        const cx = (gx + 0.5) * cell, cy = (gy + 0.5) * cell
        const dr = Math.sqrt((cx - W / 2) * (cx - W / 2) + (cy - H / 2) * (cy - H / 2)) - ringR
        const rad = Math.exp(-(dr * dr) / (band * band))
        if (rad < 0.02) continue
        let da = Math.atan2(cy - H / 2, cx - W / 2) - ang
        da = ((da % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
        if (da > span) continue
        const e = Math.min(1, Math.min(da, span - da) / (span * 0.35 + 1e-6))   // fade at both ends
        lift[gy * GX + gx] += rad * (e * e * (3 - 2 * e))
      }
    }
  }

  let smax = 0; for (const v of sink) if (v > smax) smax = v; if (smax < 1e-6) smax = 1
  let gmax = 0; for (const v of grit) if (v > gmax) gmax = v; if (gmax < 1e-6) gmax = 1
  let lmax = 0; for (const v of lift) if (v > lmax) lmax = v; if (lmax < 1e-6) lmax = 1
  return { cell, GX, GY, sink, grit, lift, smax, gmax, lmax, hits, tears, arcs }
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
const liftAtF = (F, x, y) => biAtF(F.lift, F, x, y) / F.lmax
/* how far this cell has been pulled apart, and which way it goes */
function tearAt(F, x, y) {
  let ox = 0, oy = 0, near = 0
  for (const t of F.tears) {
    const rx = x - t.x, ry = y - t.y
    const al = rx * t.c + ry * t.s
    const hl = t.len / 2
    if (Math.abs(al) > hl) continue
    const pe = -rx * t.s + ry * t.c
    const ap = Math.abs(pe)
    if (ap > t.w) continue
    const u = al / hl
    const fall = (1 - ap / t.w) * (1 - u * u)
    if (fall <= 0) continue
    const sg = pe < 0 ? -1 : 1
    ox += -t.s * sg * fall * F.cell * 1.1
    oy +=  t.c * sg * fall * F.cell * 1.1
    if (fall > near) near = fall
  }
  return { ox, oy, near }
}

function make(P, reuse, preview) {
  const R = rng(P.seed * 7919 + 13)
  const V = P.v
  const K = V.kick, Sn = V.snare, HT = V.hat, Bs = V.bass

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

  frame.fills = (P.flip || !worn)
    ? [{ type: 'SOLID', color: ground }]
    : JSON.parse(JSON.stringify(worn))

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
  const { cell, GX, GY, grit, gmax } = F

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
  const canFold = P.shape === 'sq' && num(P.fill, 1) > 0.9 && num(P.sample, 0) < 0.02

  for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
    const gN = Math.min(1, grit[gy * GX + gx] / gmax) * num(HT.amt, 0)   // how grainy it is here
    const px = (gx + 0.5) * cell, py = (gy + 0.5) * cell

    if (canFold && gN < 0.02) {
      const kC = kAtF(F, px, py, curve)
      const tC = Sn.amt > 0 ? tearAt(F, px, py).near : 0
      // nothing reached this cell. It is still the surface it always was.
      if (kC < 0.012 && tC <= 0) { asleep[gy * GX + gx] = 1; continue }
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
    /* the hat, again: it roughens, it does not build. A grain of value and a
       grain of size — no new shape, no finer grid, no BIT. */
    let nz = 0
    if (gN > 0.02) {
      nz = R() * 2 - 1
      size *= 1 - gN * (0.10 + 0.30 * R())
    }
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

    const tr = tearAt(F, px, py)
    if (tr.near > 0) {
      cx += tr.ox * Sn.amt; cy += tr.oy * Sn.amt
      size *= 1 - tr.near * Sn.amt * 0.5
      if (!(size > 0.6)) continue
    }

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
    if (tr.near > 0) col = mixC(col, ground, tr.near * Sn.amt * 0.85)  // the split shows the ground
    if (gN > 0.02) {
      const g = 1 + nz * 0.45 * gN
      const gi = { r: clamp01(ink.r * g), g: clamp01(ink.g * g), b: clamp01(ink.b * g) }
      col = mixC(col, gi, Math.min(0.85, gN * 0.7))
    }

    /* A closed surface must not have its own grid drawn across it. Cells that sit
       exactly edge to edge leave a hairline seam where they meet, and a field of
       hairlines reads as BIT — Kaibou's word, not Siren's. So a cell that is
       still surface overlaps its neighbour. The further it has fallen, the less
       it reaches: a hole must stay open. */
    const seam = (P.shape === 'sq' && !loose && num(P.fill, 1) > 0.9 && gN < 0.02)
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

  /* --- bass: a held note is a surface, not a point --------------------------
     A drum is a cell. A sustained note is not — it has no edge and no instant,
     so it cannot be a square. It is a band of the field, held for as long as it
     rings, and the only honest way to draw that is the way Fons draws
     everything: a blurred gradient shape. SOFT_LIGHT, so it lifts the white
     panel without burning it out and lifts the ground without becoming a lamp.

     Different instrument, different part. That is what a mixer is. ---------- */
  if (num(Bs.amt, 0) > 0 && F.arcs.length) {
    const bs = []
    for (const a of F.arcs) {
      const beads = 7
      for (let i = 0; i <= beads; i++) {
        const t = i / beads
        const e = Math.min(1, Math.min(t, 1 - t) / 0.34)     // the note swells and dies
        const op = num(Bs.amt, 0) * 0.45 * (e * e * (3 - 2 * e))
        if (op < 0.012) continue
        const th = a.ang + a.span * t
        const cx = W / 2 + Math.cos(th) * a.ringR, cy = H / 2 + Math.sin(th) * a.ringR
        const d = a.band * 1.7
        const e2 = figma.createEllipse()
        e2.resize(d, d)
        e2.x = cx - d / 2; e2.y = cy - d / 2
        e2.fills = [{
          type: 'GRADIENT_RADIAL',
          gradientTransform: [[0.5, 0, 0.25], [0, 0.5, 0.25]],
          gradientStops: [
            { position: 0,   color: { r: 1, g: 1, b: 1, a: 0.92 } },
            { position: 0.5, color: { r: 1, g: 1, b: 1, a: 0.35 } },
            { position: 1,   color: { r: 1, g: 1, b: 1, a: 0 } },
          ],
        }]
        e2.effects = [{ type: 'LAYER_BLUR', radius: Math.max(0.4, a.band * 0.6), visible: true }]
        e2.blendMode = 'SOFT_LIGHT'
        e2.opacity = Math.max(0, Math.min(1, op))
        e2.name = 'band'
        frame.appendChild(e2); bs.push(e2)
      }
    }
    if (bs.length) figma.group(bs, frame).name = 'bass'
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
      /* LIVE reuses its one throwaway frame, so dragging a knob does not litter
         the page. 鳴らす does NOT: a committed Siren is a finished thing, and the
         next one is a NEW thing. Reusing it meant the second hit picked up the
         first and dragged it across the canvas to the new selection. */
      if (!preview) discard()
      const f = make(msg.p, preview, preview)
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
