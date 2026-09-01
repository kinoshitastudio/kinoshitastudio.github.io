/* ライブラリの各枚が Figma で「実際に何px幅で描かれるか」を code.js と同じ規則で計算する。
   ⭐ JSON に w が書いてあっても、オートレイアウトの sizing が AUTO なら中身に縮む（＝hug）。
      code.js 195-196行：
        primaryAxisSizingMode = (horiz ? node.w : node.h) ? FIXED : AUTO
        counterAxisSizingMode = (horiz ? node.h : node.w) ? FIXED : AUTO */
import fs from 'fs'; import path from 'path';
const LIB = process.argv[2];
const files = fs.readdirSync(LIB).filter(f => f.endsWith('.json')).sort();
const W = n => {
  const L = n.layout;
  if (L) {
    const horiz = L.mode === 'horizontal';
    const widthFixed = horiz ? !!n.w : !!n.w;          // 横幅は horizontal→primary(w) / vertical→counter(w)
    if (widthFixed) return n.w;
    // AUTO ＝ 中身から
    const pad = Array.isArray(L.padding) ? (L.padding[1] + L.padding[3]) : (L.padding || 0) * 2;
    const kids = (n.children || []).filter(c => c.x == null);
    if (!kids.length) return pad;
    const inner = horiz
      ? kids.reduce((s, c) => s + W(c), 0) + (L.gap || 0) * (kids.length - 1)
      : Math.max(...kids.map(W));
    return inner + pad;
  }
  if (n.w != null) return n.w;
  const kids = n.children || [];
  return kids.length ? Math.max(...kids.map(c => (c.x || 0) + W(c))) : 0;
};
const rows = [];
for (const f of files) {
  let d; try { d = JSON.parse(fs.readFileSync(path.join(LIB, f), 'utf8')); } catch { continue; }
  const r = d.root || {};
  const m = f.match(/\((\d+)\)\.json$/);
  const want = m ? Number(m.group ? m.group(1) : m[1]) : null;
  rows.push({ f, decl: r.w ?? null, drawn: Math.round(W(r)), want, h: r.h ?? null, lay: r.layout ? r.layout.mode : null });
}
const bad = rows.filter(r => r.decl == null || r.h == null || r.drawn !== r.decl || (r.want && r.drawn !== r.want));
console.log(`全 ${rows.length}枚 ／ ⚠️ ずれ ${bad.length}枚\n`);
for (const r of bad) console.log(`  書いてある w=${String(r.decl).padStart(5)}  描かれる=${String(r.drawn).padStart(5)}  h=${String(r.h).padStart(5)}  名前の幅=${r.want ?? '-'}   ${r.f}`);
const c = {}; rows.forEach(r => c[r.drawn] = (c[r.drawn] || 0) + 1);
console.log('\n=== 実際に描かれる幅の分布 ===');
Object.entries(c).sort((a,b)=>b[1]-a[1]).forEach(([w,n]) => console.log(`  ${w}px : ${n}枚`));
