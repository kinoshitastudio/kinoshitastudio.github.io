#!/usr/bin/env node
/* Siren — the rng contract, checked.
 *
 * ui.html's draw() and code.js's make() must pull the same random numbers, in
 * the same order, from the same seed. If they do not, the panel shows one
 * picture and the canvas gets another, and nothing about that failure is loud.
 *
 * So: run both. Count every R(). Compare.
 *
 * This lived in a session scratch directory once and was deleted, which is a
 * poor address for the one check that must be run every time either file is
 * touched. It lives in the repo now.
 *
 *     node siren/tools/sync.js
 */
'use strict'
const fs = require('fs')
const path = require('path')

const DIR = path.join(__dirname, '..', 'plugin')

/* Rename rng() and put a counting wrapper in its place. Both files spell the
   same mulberry32; if one of them stops matching this pattern, say so loudly
   rather than quietly measuring nothing. */
function instrument(src, where) {
  const re = /function rng\(seed\)\s*\{/
  if (!re.test(src)) throw new Error(`${where}: no rng(seed) to instrument`)
  const once = src.split(re).length - 1
  if (once !== 1) throw new Error(`${where}: expected one rng(seed), found ${once}`)
  return (
    'let __rc = 0\n' +
    'function __rngCount(){ return __rc }\n' +
    'function __rngReset(){ __rc = 0 }\n' +
    src.replace(re, 'function rng(seed){ const f = __rngRaw(seed); return () => { __rc++; return f() } }\nfunction __rngRaw(seed){')
  )
}

/* ---------------- a DOM, only as much as draw() leans on ---------------- */
function fakeDom() {
  const mk = (tag) => {
    const n = {
      tagName: tag, style: {}, dataset: {}, children: [], attrs: {},
      value: '0', textContent: '', disabled: false, clientWidth: 360,
      classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
      setAttribute(k, v){ this.attrs[k] = String(v) },
      getAttribute(k){ return k in this.attrs ? this.attrs[k] : null },
      removeAttribute(k){ delete this.attrs[k] },
      append(...c){ this.children.push(...c) },
      appendChild(c){ this.children.push(c); return c },
      removeChild(c){ this.children.splice(this.children.indexOf(c), 1) },
      insertBefore(c, ref){ const i = this.children.indexOf(ref); this.children.splice(i < 0 ? this.children.length : i, 0, c); return c },
      replaceChildren(...c){ this.children = c },
      cloneNode(){ return mk(tag) },
      querySelector(){ return mk('div') },
      querySelectorAll(){ return [] },
      addEventListener(){}, removeEventListener(){},
      get firstChild(){ return this.children[0] || null },
      get parentElement(){ return this._parent || (this._parent = mk('div')) },
      closest(){ return mk('div') },
      set innerHTML(v){ this._html = v }, get innerHTML(){ return this._html || '' },
    }
    return n
  }
  const byId = new Map()
  return {
    createElement: mk, createElementNS: (_ns, t) => mk(t),
    getElementById(id){ if (!byId.has(id)) byId.set(id, mk('div')); return byId.get(id) },
    querySelector(){ return mk('div') }, querySelectorAll(){ return [] },
    addEventListener(){}, body: mk('body'), documentElement: mk('html'),
  }
}

function loadUI() {
  const html = fs.readFileSync(path.join(DIR, 'ui.html'), 'utf8')
  const blocks = html.match(/<script>([\s\S]*?)<\/script>/g) || []
  if (!blocks.length) throw new Error('ui.html: no <script>')
  const src = blocks.map(b => b.slice(8, -9)).sort((a, b) => b.length - a.length)[0]
  const body = instrument(src, 'ui.html') +
    '\n; return { P, V, draw, withSolo, payload, __rngCount, __rngReset }'
  // bare `onmessage =` and `addEventListener(` are window properties in the
  // browser; under `new Function` they have to be handed in as parameters
  const f = new Function(
    'document', 'window', 'parent', 'onmessage', 'addEventListener', 'requestAnimationFrame',
    'XMLSerializer', 'Image', 'URL', 'Blob', 'HTMLAnchorElement', 'navigator', 'EyeDropper', body)
  return f(
    fakeDom(), {}, { postMessage(){} }, null, () => {}, () => 0,
    function XMLSerializer(){}, function Image(){}, { createObjectURL(){}, revokeObjectURL(){} },
    function Blob(){}, { prototype: {} }, {}, undefined)
}

/* ---------------- a Figma, only as much as make() leans on ---------------- */
function fakeFigma() {
  const node = (type) => {
    const n = {
      type, name: '', children: [], plugin: {},
      x: 0, y: 0, width: 1, height: 1,
      resize(w, h){ this.width = w; this.height = h },
      appendChild(c){ c.parent = this; this.children.push(c) },
      insertChild(i, c){ c.parent = this; this.children.splice(i, 0, c) },
      remove(){ if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1) },
      clone(){ const c = node(type); Object.assign(c, this, { children: [], parent: null }); page.appendChild(c); return c },
      setPluginData(k, v){ this.plugin[k] = String(v) },
      getPluginData(k){ return this.plugin[k] || '' },
      findAll(){ return [] }, findOne(){ return null },
      get absoluteBoundingBox(){ return { x: this.x, y: this.y, width: this.width, height: this.height } },
      set vectorPaths(v){
        /* ⚠️ real Figma throws on `M12.3,45.6L…`: the data is space separated.
           A whole afternoon went into finding that out. It costs nothing here. */
        for (const p of v) {
          if (/[A-Za-z][0-9.\-]/.test(p.data) || /[0-9],[0-9]/.test(p.data))
            throw new Error('vectorPaths: data must be space separated — ' + p.data.slice(0, 40))
        }
        this._paths = v
      },
      get vectorPaths(){ return this._paths || [] },
    }
    return n
  }
  const page = node('PAGE')
  page.selection = []
  return {
    mixed: Symbol('mixed'),
    currentPage: page,
    viewport: { center: { x: 0, y: 0 } },
    showUI(){}, on(){}, notify(){}, closePlugin(){},
    ui: { postMessage(){}, set onmessage(_v){} },
    createFrame(){ return node('FRAME') },
    createRectangle(){ return node('RECTANGLE') },
    createEllipse(){ return node('ELLIPSE') },
    createVector(){ return node('VECTOR') },
    group(nodes, parent){
      if (!nodes.length) throw new Error('figma.group([]) throws — guard the empty case')
      const g = node('GROUP')
      for (const n of nodes) g.appendChild(n)
      parent.appendChild(g)
      return g
    },
  }
}

function loadCode() {
  const src = fs.readFileSync(path.join(DIR, 'code.js'), 'utf8')
  const body = instrument(src, 'code.js') + '\n; return { make, __rngCount, __rngReset }'
  return new Function('figma', '__html__', body)(fakeFigma(), '')
}

/* ---------------- the check ---------------- */
const SEEDS = [7, 1, 42, 1234]
const ui = loadUI()
const code = loadCode()

let bad = 0
for (const seed of SEEDS) {
  ui.P.seed = seed
  ui.__rngReset()
  ui.withSolo(ui.draw)
  const a = ui.__rngCount()

  const p = ui.payload()
  code.__rngReset()
  code.make(p, false, false)
  const b = code.__rngCount()

  const ok = a === b
  if (!ok) bad++
  console.log(`seed ${String(seed).padEnd(5)} rng ui ${String(a).padEnd(7)} | code ${String(b).padEnd(7)} ` +
              (ok ? '✅ IN SYNC' : `❌ OUT OF SYNC (${b - a > 0 ? '+' : ''}${b - a})`))
}
if (bad) {
  console.error('\nThe panel and the canvas are drawing different pictures. Change one, change both.')
  process.exit(1)
}
console.log('\nall seeds in sync.')
