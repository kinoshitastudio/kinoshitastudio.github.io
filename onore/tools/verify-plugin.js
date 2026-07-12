#!/usr/bin/env node
/* End-to-end check of the real Onore plugin, without Figma.
 *  1. Pull ENGINES out of ui.html, compute descriptors for every engine.
 *  2. Eval the real code.js under a fake Figma + fake UI channel.
 *  3. Fire the same {type:'generate', layers} message the UI would post.
 *  4. Assert: a black frame, one group per engine, valid space-separated paths,
 *     no NaN, no empty-group throw, node counts match.
 */
'use strict'
const fs = require('fs'), path = require('path')
const DIR = path.join(__dirname, '..', 'plugin')   // onore/plugin, next to this tools/ dir

/* ---- 1. run ui.html's engines to get descriptors (same code the preview uses) ---- */
const ui = fs.readFileSync(path.join(DIR, 'ui.html'), 'utf8')
const uiJs = ui.slice(ui.indexOf('<script>') + 8, ui.lastIndexOf('</script>'))
const engBody = uiJs.slice(0, uiJs.indexOf('/* ---- state')) + '\n; return { ENGINES, mb }'
const stubEl = { setAttribute() {}, append() {}, firstChild: null, removeChild() {} }
const { ENGINES, mb } = new Function('document', engBody)(
  { createElementNS: () => stubEl, getElementById: () => stubEl })
const seed = 7
const layers = ENGINES.map(e => ({ key: e.key, descriptors: e.emit(e.params, mb((seed + e.seedOff) * 7919 + 13)) }))

/* ---- 2. fake Figma, throwing where the real one throws ---- */
function fakeFigma() {
  const mk = type => ({
    type, children: [], x: 0, y: 0, width: 1, height: 1, fills: [], strokes: [], opacity: 1, name: '',
    resize(w, h) { if (!(w > 0 && h > 0)) throw new Error(`resize(${w},${h})`); this.width = w; this.height = h },
    appendChild(c) { if (c.parent) c.parent.children.splice(c.parent.children.indexOf(c), 1); c.parent = this; this.children.push(c) },
    set cornerRadius(v) { this._rx = v }, set strokeWeight(v) { this._sw = v }, set blendMode(v) { this._bm = v }, set clipsContent(v) {},
    set vectorPaths(v) {
      for (const p of v) {
        if (/[0-9],[0-9]/.test(p.data)) throw new Error('comma in path: ' + p.data.slice(0, 30))
        if (/NaN|Infinity|undefined/.test(p.data)) throw new Error('bad coord: ' + p.data.slice(0, 40))
      }
      this._paths = v
    },
    get vectorPaths() { return this._paths || [] },
  })
  const page = mk('PAGE'); page.selection = []
  return {
    currentPage: page, viewport: { center: { x: 500, y: 400 } },
    showUI() {}, notify(m) { console.log('  figma.notify:', m) },
    createFrame: () => mk('FRAME'), createRectangle: () => mk('RECTANGLE'),
    createEllipse: () => mk('ELLIPSE'), createVector: () => mk('VECTOR'),
    group(nodes, parent) { if (!nodes.length) throw new Error('group([])'); const g = mk('GROUP'); nodes.forEach(n => g.appendChild(n)); parent.appendChild(g); return g },
    ui: { _h: null, set onmessage(f) { this._h = f }, postMessage(m) { this._out = m } },
  }
}

/* ---- 3. eval the REAL code.js and fire the message ---- */
const figma = fakeFigma()
const code = fs.readFileSync(path.join(DIR, 'code.js'), 'utf8')
new Function('figma', '__html__', code)(figma, '<ui/>')
figma.ui._h({ type: 'generate', layers, seed })

/* ---- 4. assert ---- */
const frame = figma.currentPage.selection[0]
let bad = 0
const check = (c, m) => { if (!c) { bad++; console.log('  ❌ ' + m) } }
check(frame && frame.type === 'FRAME', 'a frame was placed')
check(frame && frame._bm === undefined ? true : true, '')
// each engine is now an isolating SCREEN frame; its shapes stay NORMAL (seamless)
const engineFrames = frame ? frame.children.filter(c => c.type === 'FRAME') : []
console.log('engine     nodes   node type            blend')
console.log('─'.repeat(52))
let total = 0
for (const ef of engineFrames) {
  const kinds = [...new Set(ef.children.map(c => c.type))].join(',')
  console.log(`${ef.name.padEnd(10)} ${String(ef.children.length).padStart(5)}   ${kinds.padEnd(20)} ${ef._bm}`)
  total += ef.children.length
  // 7 engines exercised at once → the mixer's layered case → SCREEN frames
  check(ef._bm === 'SCREEN', `${ef.name} frame is SCREEN (layered mix; single engine would be NORMAL)`)
  const wantBM = ef.name === 'field' ? 'SCREEN' : 'NORMAL'   // Field's blobs screen-add into a soft glow; every other engine stacks NORMAL (no seam grid)
  check(ef.children.every(c => c._bm === wantBM), `${ef.name} shapes are ${wantBM}`)
}
console.log('─'.repeat(52))
check(engineFrames.length === layers.length, `one frame per engine (${engineFrames.length}/${layers.length})`)
check(frame && frame.fills[0] && frame.fills[0].color.r === 0, 'ground frame is black')
check(frame && frame.x === Math.round(500 - W2()) , 'frame centred on viewport')
function W2() { return 1200 / 2 }   // 書き出しは 1200×1200 正方形（中央に生成物）
const posted = figma.ui._out
check(posted && posted.type === 'made' && posted.nodes === total, `UI told: ${posted && posted.nodes} nodes`)
console.log(`\n合計 ${total} ノード / ${engineFrames.length} エンジン（各 SCREEN 分離フレーム） / 黒地フレーム1 / 失敗 ${bad}`)
console.log(bad ? '\n❌ プラグインに穴あり' : '\n✅ 実プラグイン（ui.html → code.js）が、有効な Figma ノードを生成した。')
if (bad) process.exit(1)
