/* 詰 TSUME：線の字（一定の太さ）を「面」にして、つなぎ目の内側を削る。
   作字を詰めて分かった作法をそのまま規則にしたもの（2026-11-07）：
   ① まっすぐな線（上の線・縦の線）は削らない＝縁をまっすぐに保つ。削るのは曲線の側だけ
   ② 相手は「平行に寄って重なる線」だけ。T字・十字・直角の角は触らない
   ③ 向かい合う側の半分の太さを 27→3（線の太さ 54 のとき）まで細くし、離れるにつれて戻す＝合わさる所の太さが 1.45 倍を超えない
   ④ 角はとがらせる（マイター）。まっすぐな所は直線2点、点の少ない所はならさない（ならすと暴れる）
   ⑤ 線の中に隠れた字の部分は切る（線より上へ出る字は切らない）
   使い方： tsumeCarve(svg文字列, {hmin, d0, d1, keepTop: ['e','a']（字の名前）か true（丸の上が線に接するだけの所）＝削らない, fillHoles: 面積＝それより小さい穴を埋める}) → { sep: 字ごとの面の SVG, one: 1枚に合わせた SVG, report } */
window.tsumeCarve = function (svg, opt) {
  const { Path, Point, CompoundPath, Group } = paper;
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
  const root = paper.project.importSVG(svg, { expandShapes: true, insert: false });
  opt = opt || {}; const HMIN = opt.hmin ?? 3, D0 = opt.d0 ?? 45, D1 = opt.d1 ?? 95, STEP = 1, C0 = 0.95, C1 = 0.45;
  const sm = (e0, e1, x) => { const f = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return f * f * (3 - 2 * f) };
  // 1) 字ごとに、なめらかに続く所で切った「部品」に分ける
  const pieces = [], corners = [];
  root.getItems({ class: Path }).forEach(pa => {
    const own = pa.parent instanceof CompoundPath ? pa.parent : pa;
    const name = own.name; if (!name || /^clip/i.test(name) || !own.strokeColor) return;   // 線の字だけ（書き出しの枠・切り抜きは外す）
    const h = (own.strokeWidth || 54) / 2;
    const runs = []; let run = [];
    pa.curves.forEach(c => { if (run.length) { const a = run[run.length - 1].getTangentAtTime(1), t = c.getTangentAtTime(0); if (Math.abs(a.getDirectedAngle(t)) > 3) { runs.push(run); run = []; corners.push({ name, pt: c.point1, h, ti: a.normalize(), to: t.normalize() }) } } run.push(c) });
    runs.push(run);
    runs.forEach(r => {
      if (!r.length) return;   // 点だけの部分パス（M だけ）は飛ばす
      const q = new Path({ insert: false }); q.moveTo(r[0].point1);
      r.forEach(c => q.cubicCurveTo(c.point1.add(c.handle1), c.point2.add(c.handle2), c.point2));
      const ring = runs.length === 1 && q.firstSegment.point.getDistance(q.lastSegment.point) < 0.05;
      const rigid = r.every(c => !c.hasHandles());   // まっすぐな線（上の線・縦の線）は削らない＝縁をまっすぐに保つ
      pieces.push({ name, q, ring, h, rigid });
    });
  });
  // 2) 中心線を 1 ずつ取り、両側の半分の太さを決める
  pieces.forEach((P, pi) => {
    const L = P.q.length, n = Math.max(2, Math.ceil(L / STEP)); P.s = [];
    for (let i = 0; i <= n; i++) {
      const s = Math.min(L, L * i / n), pt = P.q.getPointAt(s), t = P.q.getTangentAt(s).normalize(), nr = t.rotate(90);
      const smp = { pt, nr, hA: P.h, hB: P.h, near: [] };
      pieces.forEach((Q, qi) => {
        if (qi === pi || P.rigid) return;
        if ((opt.keepTop || []).includes && (opt.keepTop || []).includes(P.name) && /線|line/i.test(Q.name || '')) return;   // 線に付く所を削らない字（くびれを作らない）
        const loc = Q.q.getNearestLocation(pt); if (!loc) return; const d = loc.point.getDistance(pt); if (d > D1) return;
        const tq = Q.q.getTangentAt(loc.offset).normalize(); const wa = sm(C0, C1, Math.abs(t.cross(tq))); if (wa <= 0) return;   // 平行に寄る所ほど強く（直角のT字は触らない）
        const v = loc.point.subtract(pt); let side = 0;
        let ws = 1; if (d >= 1) { ws = sm(0.45, 0.75, Math.abs(v.dot(nr)) / d); if (ws <= 0) return; side = v.dot(nr) > 0 ? 1 : -1 }
        smp.near.push({ qi, d, side, wa: wa * ws, par: Math.abs(t.cross(tq)) });
      });
      P.s.push(smp);
    }
    // 相手は「どこかで平行に重なって合わさる」線だけ（T字・十字・直角の角は触らない）
    const merge = new Set(); P.s.forEach(x => x.near.forEach(nb => { if (nb.d < 6 && nb.par < 0.2) merge.add(nb.qi) }));
    // keepTop:true＝丸の上が線に「接する」だけの所は削らない（線の中へ入っていく r の肩・s の始まりは削る）
    if (opt.keepTop === true) [...merge].forEach(qi => { if (!/線|line/i.test(pieces[qi].name || '')) return; const idx = []; P.s.forEach((x, i) => { if (x.near.some(nb => nb.qi === qi && nb.d < 6)) idx.push(i) });
      const N = P.s.length, nearEnd = idx.some(i => i < 25 || i > N - 26); if (P.ring || !nearEnd) merge.delete(qi) });
    P.s.forEach(x => { x.near = x.near.filter(nb => merge.has(nb.qi)) });
    // d<1 の所は、同じ相手の近くの点から向きを借りる
    P.s.forEach((smp, i) => smp.near.forEach(nb => { if (nb.side) return; for (let k = 1; k < 60; k++) { for (const j of [i - k, i + k]) { const o = P.s[j]; if (!o) continue; const m = o.near.find(x => x.qi === nb.qi && x.side); if (m) { nb.side = m.side; return } } } }));
    P.s.forEach(smp => smp.near.forEach(nb => {
      if (!nb.side) return; const f = Math.min(1, Math.max(0, (nb.d - D0) / (D1 - D0)));
      const hh = P.h - (P.h - HMIN) * (1 - f * f * (3 - 2 * f)) * nb.wa;   // なめらかに戻す
      if (nb.side > 0) smp.hA = Math.min(smp.hA, hh); else smp.hB = Math.min(smp.hB, hh);
    }));
    // 段がつかないよう、太さを前後 ±10 でならす（輪は回り込む）
    for (const k of ['hA', 'hB']) { const v = P.s.map(x => x[k]), N = v.length; P.s.forEach((x, i) => { let a = 0, w = 0; for (let j = -15; j <= 15; j++) { let ii = i + j; if (P.ring) ii = (ii + N - 1) % (N - 1); else if (ii < 0 || ii >= N) continue; const g = Math.exp(-(j * j) / 60); a += v[ii] * g; w += g } x[k] = a / w }) }
  });
  // 3) 面を作る（生の多角形）
  const poly = pts => { const q = new Path({ insert: false, closed: true }); pts.forEach(p => q.add(p)); return q };
  const shapeOf = P => {
    const A = P.s.map(s => s.pt.add(s.nr.multiply(s.hA))), B = P.s.map(s => s.pt.subtract(s.nr.multiply(s.hB)));
    if (P.ring) { const o = poly(A.slice(0, -1)), i = poly(B.slice(0, -1)); const big = Math.abs(o.area) > Math.abs(i.area) ? o : i, sm = big === o ? i : o; return big.subtract(sm, { insert: false }) }
    return poly(A.concat(B.reverse()));
  };
  // 角（とがり）で切って、間だけ曲線にならす
  const smooth = item => {
    const paths = item instanceof CompoundPath ? item.children.slice() : [item]; const out = [];
    paths.forEach(pa => {
      const sg = pa.segments, N = sg.length; if (N < 4) { out.push(pa.clone({ insert: false })); return }
      const P0 = i => sg[(i + N) % N].point;
      // 角は「前後 3 点ずつ」の向きで見る（交点でできた短い辺にだまされない）。近い角は1つにまとめる
      const far = (i, sg) => { for (let j = 1; j < N / 2; j++) { const q = P0(i + sg * j); if (q.getDistance(P0(i)) >= 2.5) return q } return P0(i + sg) };
      const ang = i => { const a = P0(i).subtract(far(i, -1)), c = far(i, 1).subtract(P0(i)); return a.length < 1e-6 || c.length < 1e-6 ? 0 : Math.abs(a.getDirectedAngle(c)) };
      const sharp = []; for (let i = 0; i < N; i++) { const g = ang(i); if (g <= 40) continue; let mx = true; for (const j of [-2, -1, 1, 2]) { if (P0(i + j).getDistance(P0(i)) >= 3) continue; const o = ang(i + j); if (j < 0 ? o > g : o >= g) { mx = false; break } } if (mx) sharp.push(i) }
      if (window.__dbg) console.log('N', N, 'sharp', sharp.length, sharp.slice(0,8).join(','), 'ang', [0,1,2].map(i=>ang(i).toFixed(0)).join('/'));
      if (window.__dbg) console.log('N', N, 'corners', sharp.map(i=>P0(i).x.toFixed(0)+','+P0(i).y.toFixed(0)+'('+ang(i).toFixed(0)+')').join(' '));
      const q = new Path({ insert: false, closed: true });
      if (!sharp.length) { const r = new Path({ insert: false }); for (let i = 0; i <= N; i++) r.add(P0(i)); r.simplify(0.35); r.removeSegment(r.segments.length - 1); r.closed = true; out.push(r); return }
      // 区間ごとに「曲線のリスト」を作ってから、1本につなぐ（ハンドルの持ち越しで崩れないように）
      const bz = [];
      for (let k = 0; k < sharp.length; k++) {
        const a = sharp[k], z = k + 1 < sharp.length ? sharp[k + 1] : sharp[0] + N;
        const ch0 = P0(a), ch1 = P0(z), chv = ch1.subtract(ch0), chl = chv.length; let dev = 0;
        if (chl > 0) for (let i = a; i <= z; i++) dev = Math.max(dev, Math.abs(chv.cross(P0(i).subtract(ch0))) / chl);
        if (chl > 2 && dev < 0.08) { bz.push({ line: true, to: ch1 }); continue }   // まっすぐな所は直線
        if (z - a <= 10) { for (let i = a + 1; i <= z; i++) if (P0(i).getDistance(P0(i - 1)) > 0.3 || i === z) bz.push({ line: true, to: P0(i) }); continue }   // 点が少ない所はならさない（ならすと暴れる）
        const r = new Path({ insert: false }); for (let i = a; i <= z; i++) r.add(P0(i)); r.simplify(0.35);
        r.curves.forEach(c => bz.push(c.hasHandles() ? { c1: c.point1.add(c.handle1), c2: c.point2.add(c.handle2), to: c.point2 } : { line: true, to: c.point2 }));
      }
      q.moveTo(P0(sharp[0])); bz.forEach(o => o.line ? q.lineTo(o.to) : q.cubicCurveTo(o.c1, o.c2, o.to));
      if (q.lastSegment.point.getDistance(q.firstSegment.point) < 0.01) { q.firstSegment.handleIn = q.lastSegment.handleIn; q.removeSegment(q.segments.length - 1) }
      q.closed = true;
      out.push(q);
    });
    return out.length === 1 ? out[0] : new CompoundPath({ children: out, insert: false });
  };
  const names = [...new Set(pieces.map(p => p.name))];
  const raw = {};
  names.forEach(nm => {
    let u = null;
    pieces.filter(p => p.name === nm).forEach(P => { const s = shapeOf(P); u = u ? u.unite(s, { insert: false }) : s });
    corners.filter(c => c.name === nm).forEach(c => {   // 角はとがらせる（マイター）＝幾何の e の棒の端と同じ
      [1, -1].forEach(sd => { const n1 = c.ti.rotate(90).multiply(sd), n2 = c.to.rotate(90).multiply(sd); const den = 1 + n1.dot(n2); if (den < 0.2) return;
        const M = c.pt.add(n1.add(n2).multiply(c.h / den)); u = u.unite(poly([c.pt, c.pt.add(n1.multiply(c.h)), M, c.pt.add(n2.multiply(c.h))]), { insert: false }) }) });
    raw[nm] = u;
  });
  // 線の中に隠れた字の部分は切る（字は線から「下がる」だけ。線より上へ出る t は切らない）＝重なりのない、渡しやすい形
  const LN = names.find(n => /線|line/i.test(n));
  if (LN) names.forEach(nm => { if (nm === LN) return; const lb = raw[LN].bounds; if (raw[nm].bounds.top < lb.top - 1) return; raw[nm] = raw[nm].subtract(raw[LN], { insert: false }) });
  const fmt = (it, id) => { const s = smooth(it); const d = (s.pathData || '').replace(/-?\d+\.\d+/g, m => (+(+m).toFixed(2)).toString()); return `<path id="${id}" d="${d}" fill="#111"/>` };
  const attrs = `data-xh="${doc.getAttribute('data-xh')}" data-base="${doc.getAttribute('data-base')}"`;
  const vb = doc.getAttribute('viewBox');
  // 小さな穴（白い粒・細い切り込み）を埋める：全部を合わせた形で穴を探し、いちばん重なる字に足す（字ごとの面にも反映）
  if (opt.fillHoles) {
    let u0 = null; names.forEach(nm => { u0 = u0 ? u0.unite(raw[nm], { insert: false }) : raw[nm].clone({ insert: false }) });
    const kids = u0 instanceof CompoundPath ? u0.children.slice() : [];
    kids.filter(k => Math.abs(k.area) < opt.fillHoles && kids.some(o => o !== k && o.bounds.contains(k.bounds))).forEach(k => {
      const hole = new Path({ segments: k.segments.map(g => g.clone()), closed: true, insert: false });
      const grow = hole.bounds.expand(4); let best = null, bs = -1;
      names.forEach(nm => { if (nm === LN) return; const it = raw[nm].bounds.intersect(grow); const a = it.width > 0 && it.height > 0 ? it.width * it.height : 0; if (a > bs) { bs = a; best = nm } });
      if (best) raw[best] = raw[best].unite(hole, { insert: false });
    });
  }
  const sep = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${attrs}>` + names.map(nm => fmt(raw[nm], nm)).join('') + '</svg>';
  let all = null; names.forEach(nm => { all = all ? all.unite(raw[nm], { insert: false }) : raw[nm].clone({ insert: false }) });
  const one = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">` + fmt(all, 'word') + '</svg>';
  const cnt = it => (it instanceof CompoundPath ? it.children : [it]).reduce((s, c) => s + c.segments.length, 0);
  return { sep, one, report: names.map(nm => nm + ':' + cnt(smooth(raw[nm])) + '点').join(' ') + ' ／ 1枚:' + cnt(smooth(all)) + '点' };
};
