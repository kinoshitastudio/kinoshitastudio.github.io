/* Kaibou — Figma plugin
 *
 * A designer keeps their layers. So does this.
 * The original node is never destroyed: it is hidden, locked, renamed, and kept
 * as the source. The chain settings live on the result via setPluginData, so
 * selecting the result again brings every knob back where you left it.
 */

const UI = { width: 400, height: 680 }
const KEY = 'kaibou'         // settings, stored on the result
const SRC = 'kaibou.source'  // id of the hidden original
const FILLS = 'kaibou.fills' // the paint we replaced, so we can put it back
const PRV = 'kaibou.preview' // '1' while LIVE is only trying it on

figma.showUI(__html__, UI)

const MAX_PX = 1600         // long edge we hand to the UI

function exportable(node) {
  return node && typeof node.exportAsync === 'function' && 'width' in node
}

/* The last visible paint on a node. If it is a flat colour we can run the chain
   over just that paint and hand it back as an image fill — the children of the
   frame are never touched, auto layout survives, text stays editable. */
function paintInfo(node) {
  if (!('fills' in node) || node.fills === figma.mixed) return null
  const visible = node.fills.filter(p => p.visible !== false)
  if (!visible.length) return null
  const p = visible[visible.length - 1]
  if (p.type === 'SOLID') {
    return { type: 'SOLID', color: p.color, opacity: p.opacity == null ? 1 : p.opacity }
  }
  return { type: p.type }   // gradients / images: not fillable yet
}

async function push() {
 try {
  const sel = figma.currentPage.selection
  console.log('[kaibou] selection', sel.length, sel[0] && sel[0].type)
  if (sel.length !== 1 || !exportable(sel[0])) {
    figma.ui.postMessage({ type: 'no-selection', count: sel.length })
    return
  }

  const node = sel[0]

  // If this node is a Kaibou result, re-export its hidden source instead,
  // so applying twice never stacks the chain on itself.
  let source = node
  const srcId = node.getPluginData(SRC)
  if (srcId) {
    const found = await figma.getNodeByIdAsync(srcId)
    if (found && exportable(found)) source = found
  }

  const scale = Math.min(2, MAX_PX / Math.max(source.width, source.height))
  const opts = { format: 'PNG', constraint: { type: 'SCALE', value: Math.max(0.25, scale) } }

  // A hidden node exports as transparent, so it has to be visible to export.
  // Never un-hide the original in place: if it sits in an auto layout, showing
  // it re-flows the parent and shoves the result node — which is its sibling —
  // sideways. Every LIVE push would nudge the artwork further off. So export a
  // throwaway clone parked at page level, where no layout can see it.
  let bytes
  if (source.visible) {
    bytes = await source.exportAsync(opts)
  } else {
    // clone() already parents under the page, where no layout can see it.
    const tmp = source.clone()
    tmp.visible = true
    tmp.locked = false
    try { bytes = await tmp.exportAsync(opts) } finally { tmp.remove() }
  }

  const saved = node.getPluginData(KEY)
  console.log('[kaibou] exported', bytes.length, 'bytes')
  figma.ui.postMessage({
    type: 'source',
    bytes,
    name: source.name,
    settings: saved ? JSON.parse(saved) : null,
    paint: paintInfo(node),
    w: Math.round(node.width),
    h: Math.round(node.height),
    isFilled: !!node.getPluginData(FILLS),
  })
 } catch (err) {
  console.error('[kaibou]', err)
  figma.ui.postMessage({ type: 'error', message: String(err && err.message || err) })
 }
}

/* Put a node back the way it was. Works for both modes: a swapped paint gets
   its fills returned, a baked layer is removed and its source unhidden. */
async function restore(node) {
  if (!node) return false

  const paint = node.getPluginData(FILLS)
  if (paint) {
    node.fills = JSON.parse(paint)
    node.setPluginData(FILLS, '')
    node.setPluginData(KEY, '')
    node.setPluginData(PRV, '')
    return true
  }

  const srcId = node.getPluginData(SRC)
  if (!srcId) return false
  const source = await figma.getNodeByIdAsync(srcId)
  if (!source) return false
  source.visible = true
  source.locked = false
  source.name = source.name.replace(/^⟨source⟩ /, '')
  figma.currentPage.selection = [source]
  node.remove()
  return true
}

/* Everything LIVE put on the canvas, and nothing else. */
async function discardPreviews() {
  const previews = figma.currentPage.findAll(n => n.getPluginData(PRV) === '1')
  for (const n of previews) await restore(n)
  return previews.length
}

figma.on('selectionchange', push)
// the UI also asks for the first push once its script is running
push()

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'ready') { push(); return }

  if (msg.type === 'apply') {
    const sel = figma.currentPage.selection
    if (sel.length !== 1 || !exportable(sel[0])) return
    let node = sel[0]

    const image = figma.createImage(new Uint8Array(msg.bytes))
    const settings = JSON.stringify(msg.settings)
    // A LIVE push is a fitting, not a decision. Only 適用 commits.
    const trial = msg.preview ? '1' : ''

    // Paint-only: swap the node's fill, leave everything inside it alone.
    if (msg.mode === 'fill') {
      if (!node.getPluginData(FILLS)) {
        node.setPluginData(FILLS, JSON.stringify(node.fills))
      }
      node.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }]
      node.setPluginData(KEY, settings)
      node.setPluginData(PRV, trial)
      return
    }

    // Re-applying to an existing result: just swap the fill, keep everything else.
    if (node.getPluginData(SRC)) {
      node.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }]
      node.setPluginData(KEY, settings)
      // once committed, a layer never goes back to being a preview
      if (!msg.preview) node.setPluginData(PRV, '')
      return
    }

    // First application: keep the original, put the result over it.
    const parent = node.parent
    const index = parent.children.indexOf(node)

    // Clone the node so the shape survives — an ellipse stays an ellipse, a
    // rounded rect keeps its corners, rotation and constraints come along.
    // Text is the exception: its shape *is* the glyphs, so it becomes a rect.
    const canHoldPaint = node.type !== 'TEXT' && 'fills' in node && node.fills !== figma.mixed

    // clone() parents the copy under the page, so its x/y become absolute.
    // Moving it back into `parent` keeps those numbers and the layer lands at
    // the parent's origin offset. Remember the placement and restore it.
    const place = node.relativeTransform

    let rect
    if (canHoldPaint) {
      rect = node.clone()
      if ('children' in rect) for (const c of [...rect.children]) c.remove()
      if ('strokes' in rect) rect.strokes = []
      if ('effects' in rect) rect.effects = []
      rect.visible = true
      rect.locked = false
    } else {
      rect = figma.createRectangle()
      rect.resize(node.width, node.height)
      rect.x = node.x
      rect.y = node.y
      if ('rotation' in node) rect.rotation = node.rotation
      if ('cornerRadius' in node && typeof node.cornerRadius === 'number') {
        rect.cornerRadius = node.cornerRadius
      }
    }

    rect.name = 'Kaibou · ' + node.name
    rect.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }]
    rect.setPluginData(KEY, settings)
    rect.setPluginData(SRC, node.id)
    rect.setPluginData(FILLS, '')
    rect.setPluginData(PRV, trial)

    parent.insertChild(index, rect)
    if (canHoldPaint) rect.relativeTransform = place

    node.name = '⟨source⟩ ' + node.name
    node.visible = false
    node.locked = true

    figma.currentPage.selection = [rect]
    if (!msg.preview) figma.notify('元のレイヤーは残してあります')
  }

  // LIVE was switched off: nothing tried on stays.
  if (msg.type === 'discard') {
    const n = await discardPreviews()
    if (n) figma.notify('プレビューを消しました')
    return
  }

  if (msg.type === 'restore') {
    const node = figma.currentPage.selection[0]
    if (!(await restore(node))) {
      figma.notify('これは Kaibou のレイヤーではありません')
      return
    }
    figma.notify('元に戻しました')
  }

  if (msg.type === 'close') figma.closePlugin()
}
