/* 捺 NATSU の刷り場（Web Worker）
   ⭐ 刷る計算を画面の外でやる＝スライダーを動かしている間も画面は止まらない。
   ⭐ いちばん新しい頼みだけを刷る。途中で新しい頼みが来たら、今の刷りは捨てて頭から刷り直す。
   ⭐ 紙の地形・回ごとの圧の場は、関係するつまみが変わったときだけ作り直す（控えを持つ）。 */
importScripts('core.js');

let P = null;                  // 版 { W, H, plate, ink0map, edge, box, ver }
let pending = null, busy = false;
let field = null, fieldKey = '';
const presCache = new Map();   // 回ごとの圧の場

onmessage = e => {
  const m = e.data;
  if (m.type === 'plate') { P = m; return; }
  if (m.type === 'scan') { pending = m; if (!busy) run(); }
};

async function run() {
  busy = true;
  while (pending) { const job = pending; pending = null; await scan(job); }
  busy = false;
}
const tick = () => new Promise(r => setTimeout(r, 0));   // 新しい頼みを受け取る隙間

function getField(W, H, q) {
  const PAD = 60, PW = W + PAD * 2, PH = H + PAD * 2;
  const key = [W, H, q.seed, q.grain, q.fiber, q.dir].join(',');
  if (key !== fieldKey) {
    const ang = q.dir * Math.PI / 180;
    field = { PW, PH,
      paper: NATSU.makeField(PW, PH, q.seed, q.grain, q.fiber / 10, ang),
      low: NATSU.makeField(PW, PH, q.seed + 500, 70, 1.6, ang) };
    fieldKey = key;
  }
  return field;
}
function getPressure(W, H, seed, size) {
  const key = W + 'x' + H + ':' + seed + ':' + size;
  let f = presCache.get(key);
  if (!f) { if (presCache.size > 24) presCache.clear(); f = NATSU.makePressure(W, H, seed, size); presCache.set(key, f); }
  return f;
}

async function scan(job) {
  if (!P) return;
  const { W, H, plate, ink0map, edge, box } = P, q = job.q, n = job.n, PAD = 60;
  const t0 = performance.now();
  const F = getField(W, H, q);
  if (pending) return;
  const ink = new Float32Array(W * H);
  const k0 = q.ink0 / 100;
  for (let i = 0; i < ink.length; i++) ink[i] = plate[i] > 0.02 ? ink0map[i] * k0 : 0;
  for (let k = 0; k < n; k++) {
    const r = NATSU.rng(q.seed * 7919 + k * 104729);
    const tiltAng = r() * Math.PI * 2, dx = (r() - 0.5) * 2 * q.jit, dy = (r() - 0.5) * 2 * q.jit, px = r() * PAD * 2, py = r() * PAD * 2;
    const d = NATSU.press(W, H, plate, ink, F, {
      pressure: q.pressure / 100, tilt: q.tilt / 100, tiltAng, dx, dy, px, py,
      bridge: q.bridge / 100, depth: q.depth / 100, soft: 0.18, k: 1.6, rate: q.rate / 100,
      rough: q.rough / 100 * 0.9, mura: q.mura / 100,
      pf: getPressure(W, H, q.seed * 101 + k * 7 + 3, 120 + q.psize * 6), pamp: q.pamp / 100,
      edge, pool: q.pool / 100
    }, box);
    // 0〜255に詰めて渡す（半分の重さ・転送は移すだけ）
    const a = new Uint8Array(W * H); let sum = 0;
    for (let i = 0; i < a.length; i++) { const v = d[i]; if (v > 0) { sum += v; a[i] = v >= 1 ? 255 : (v * 255 + 0.5) | 0; } }
    postMessage({ job: job.job, k, n, W, H, d: a, sum, ms: performance.now() - t0 }, [a.buffer]);
    await tick();
    if (pending) return;                     // 新しい頼みが来た＝この刷りは捨てる
  }
}
