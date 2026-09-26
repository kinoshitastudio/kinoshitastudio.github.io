/* 捺 NATSU の芯 ── 版・インク・紙を別々に持ち、「捺す（刷る）」1回ぶんを計算する。
   ⭐ かすれは乱数でなく【紙の地形 − インクの厚み】の引き算で出る。
   ⭐ 刷るたびに版のインクが減る＝何回目かで擦れ方が勝手に変わる。
   🔴 Math.random を使わない（同じ種なら1画素も違わない）。
   ブラウザでもnodeでも読めるようにしてある（node は数字の確かめ用）。 */
(function (root) {
  'use strict';

  function rng(seed) {                       // mulberry32
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(ix, iy, s) {
    let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(s, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, s) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  /* 地形 0〜1。grain＝目の粗さ（px）／fiber＝向きへ伸ばす倍率（1＝伸ばさない）／ang＝向き（ラジアン） */
  function makeField(W, H, seed, grain, fiber, ang) {
    const out = new Float32Array(W * H);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const oct = [[1, 0.50], [2, 0.28], [4, 0.14], [8, 0.08]];
    let lo = 1e9, hi = -1e9;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = (x * ca + y * sa) / fiber, v = (-x * sa + y * ca);
      let h = 0;
      for (let k = 0; k < oct.length; k++) {
        const f = oct[k][0] / grain;
        h += oct[k][1] * vnoise(u * f, v * f, seed * 31 + k * 977);
      }
      out[y * W + x] = h;
      if (h < lo) lo = h; if (h > hi) hi = h;
    }
    // 端の2%ずつを捨てて0〜1へ（種で濃さが揺れないように）
    const span = hi - lo || 1, a0 = lo + span * 0.1, a1 = hi - span * 0.1;
    for (let i = 0; i < out.length; i++) { const v = (out[i] - a0) / (a1 - a0); out[i] = v < 0 ? 0 : v > 1 ? 1 : v; }
    return out;
  }

  /* 刷る 1回。
     plate: 版（W×H, 0〜1。少しぼかしてある＝縁の荒れを作る余地）
     ink:   版の上のインク（W×H, 書き換える）
     F:     { paper, low, PW, PH }＝紙の地形とむら（版より大きい。回ごとに切り出す位置を変える）
     o:     { pressure, tilt, tiltAng, dx, dy, px, py, bridge, depth, soft, k, rate, rough, mura }
     box:   [x0,y0,x1,y1] 版に何かある範囲（ここだけ回す）
     返り値: 紙に乗った濃さ（W×H, 0〜1）
     ⭐⭐ 当たり c＝(圧×版 + インクの厚み×bridge + 紙の高さ×depth + むら − 1) / soft
        インクが厚いと紙の谷まで届く。薄くなると山だけに当たる＝「3回目から急に掠れる」が勝手に出る */
  function press(W, H, plate, ink, F, o, box) {
    const d = new Float32Array(W * H);
    const dx = Math.round(o.dx), dy = Math.round(o.dy);
    const ct = Math.cos(o.tiltAng), st = Math.sin(o.tiltAng);
    const PW = F.PW, px = Math.round(o.px), py = Math.round(o.py);
    const x0 = Math.max(0, box[0] + dx), x1 = Math.min(W, box[2] + dx);
    const y0 = Math.max(0, box[1] + dy), y1 = Math.min(H, box[3] + dy);
    for (let y = y0; y < y1; y++) {
      const v = y - dy;
      if (v < 0 || v >= H) continue;
      const prow = (y + py) * PW + px;
      for (let x = x0; x < x1; x++) {
        const u = x - dx;
        if (u < 0 || u >= W) continue;
        const pi = v * W + u;
        const mb = plate[pi];
        if (mb < 0.02) continue;
        const g = F.paper[prow + x];
        // 縁の荒れ：ぼかした版を紙の目で揺らしてから締める（回ごとに紙が違う＝縁も毎回違う）
        let m = 0.5 + (mb - 0.5 + o.rough * (g - 0.5)) * 8;
        if (m <= 0) continue; if (m > 1) m = 1;
        let I = ink[pi];
        // 縁に溜まる：押されたインクは外へ逃げる＝縁ほど厚く、中ほど薄い（リノカットの「縁だけ濃い」）
        if (o.edge && o.pool) I *= 1 - o.pool * 0.55 + o.pool * 1.5 * o.edge[pi];
        const nx = x / W - 0.5, ny = y / H - 0.5;
        let P = o.pressure * (1 + o.tilt * (nx * ct + ny * st));
        if (o.pf) P *= Math.max(0, 1 + o.pamp * 2 * (o.pf[y * W + x] - 0.5));
        const L = F.low[prow + x] - 0.5;
        const reach = P * m + I * o.bridge + g * o.depth + o.mura * L - 1;
        let c = reach / o.soft;
        if (c <= 0) continue;
        if (c > 1) c = 1;
        const dd = c * m * Math.min(1, I * o.k);
        if (dd <= 0) continue;
        d[y * W + x] = dd;
        ink[pi] = Math.max(0, ink[pi] - dd * o.rate);
      }
    }
    return d;
  }

  /* 圧の場 0〜1。🔴 上から押す圧は全体に均一にかからない（木下 2026-09-26「ここはランダムで」）。
     回ごとに違う種で、大きなうねり（size px）を粗い格子で作って引き伸ばす＝速い。
     低いところは圧が抜けて、インクがあっても紙に届かない＝字の片側がすっぱり欠ける */
  function makePressure(W, H, seed, size) {
    const step = 16, GW = Math.ceil(W / step) + 2, GH = Math.ceil(H / step) + 2;
    const g = new Float32Array(GW * GH);
    let lo = 1e9, hi = -1e9;
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const x = i * step, y = j * step;
      const v = 0.65 * vnoise(x / size, y / size, seed * 13 + 1) + 0.35 * vnoise(x / (size * 0.45), y / (size * 0.45), seed * 13 + 7);
      g[j * GW + i] = v; if (v < lo) lo = v; if (v > hi) hi = v;
    }
    for (let i = 0; i < g.length; i++) g[i] = (g[i] - lo) / (hi - lo || 1);
    const out = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      const gy = y / step, j = gy | 0, fy = gy - j;
      for (let x = 0; x < W; x++) {
        const gx = x / step, i = gx | 0, fx = gx - i, b = j * GW + i;
        const a0 = g[b] + (g[b + 1] - g[b]) * fx, a1 = g[b + GW] + (g[b + GW + 1] - g[b + GW]) * fx;
        out[y * W + x] = a0 + (a1 - a0) * fy;
      }
    }
    return out;
  }

  function sum(a) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; }

  /* 画素 → SVGのパス（しきい値で白黒にして、画素の縁をたどる）。
     小さすぎる粒は minArea で捨てる。返り値は d 属性の文字列 */
  function trace(W, H, a, thr, minArea) {
    const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && a[y * W + x] >= thr;
    const VW = W + 1;
    const out1 = new Int32Array(VW * (H + 1)).fill(-1), out2 = new Int32Array(VW * (H + 1)).fill(-1);
    const add = (s, e) => { if (out1[s] < 0) out1[s] = e; else out2[s] = e; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!on(x, y)) continue;
      const tl = y * VW + x, tr = tl + 1, bl = tl + VW, br = bl + 1;
      if (!on(x, y - 1)) add(tl, tr);
      if (!on(x + 1, y)) add(tr, br);
      if (!on(x, y + 1)) add(br, bl);
      if (!on(x - 1, y)) add(bl, tl);
    }
    const parts = [];
    for (let s = 0; s < out1.length; s++) {
      while (out1[s] >= 0 || out2[s] >= 0) {
        const pts = [];
        let v = s, area = 0;
        do {
          let e;
          if (out1[v] >= 0) { e = out1[v]; out1[v] = out2[v]; out2[v] = -1; }
          else { e = out2[v]; out2[v] = -1; }
          pts.push(v);
          const x0 = v % VW, y0 = (v / VW) | 0, x1 = e % VW, y1 = (e / VW) | 0;
          area += x0 * y1 - x1 * y0;
          v = e;
          if (out1[v] < 0 && out2[v] < 0 && v !== s) break;
        } while (v !== s);
        if (Math.abs(area) / 2 < minArea) continue;
        // 一直線に並んだ点を間引く
        let dstr = '', n = pts.length;
        const P = pts.map(p => [p % VW, (p / VW) | 0]);
        const keep = [];
        for (let i = 0; i < n; i++) {
          const A = P[(i - 1 + n) % n], B = P[i], C = P[(i + 1) % n];
          if ((B[0] - A[0]) * (C[1] - B[1]) - (B[1] - A[1]) * (C[0] - B[0]) !== 0) keep.push(B);
        }
        if (keep.length < 3) continue;
        dstr = 'M' + keep.map(p => p[0] + ' ' + p[1]).join('L') + 'Z';
        parts.push(dstr);
      }
    }
    return parts.join('');
  }

  const api = { rng, hash, makeField, makePressure, press, sum, trace };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NATSU = api;
})(this);
