/* ライブラリの各枚を「名前に書いてある幅」で本当に建つように直す。
   🔴 中央寄せの帯は padding が 0 のまま w だけ広い＝Figma が hug で縮む（1440と書いて1185で出た）。
   ⭐ 足りない分を左右に均等に足す（中身は1つも動かさない）。
   ⚠️ 直す前に控えを取る（ライブラリの🗑は控えを取らない）。 */
import fs from 'fs'; import path from 'path';
const LIB = process.argv[2], APPLY = process.argv[3] === '--apply';
const BK = path.join(LIB, '_bk-haba-' + new Date().toISOString().slice(0,10));
if (APPLY) fs.mkdirSync(BK, { recursive: true });
let fixed = 0, skip = 0;
for (const f of fs.readdirSync(LIB).filter(x => x.endsWith('.json')).sort()) {
  const m = f.match(/\((\d+)\)\.json$/);
  const W = m ? Number(m[1]) : 0;
  // 🔴 「(3)」のような連番を幅と読むと w=3 にして壊す。道具が出す幅は 320〜3000 の範囲だけ
  if (!m || W < 320 || W > 3000) { skip++; continue; }
  const p = path.join(LIB, f);
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  const r = d.root; if (!r) continue;
  const before = { w: r.w, pad: JSON.parse(JSON.stringify((r.layout && r.layout.padding) ?? null)) };
  let changed = false;
  if (r.w !== W) { r.w = W; changed = true; }
  const L = r.layout;
  if (L) {
    if (typeof L.padding === 'number') L.padding = { top: L.padding, right: L.padding, bottom: L.padding, left: L.padding };
    if (!L.padding) L.padding = { top: 0, right: 0, bottom: 0, left: 0 };
    const kids = (r.children || []).filter(c => c.x == null);
    const ws = kids.map(c => c.w).filter(v => typeof v === 'number');
    if (ws.length) {
      const horiz = L.mode === 'horizontal';
      const inner = horiz ? ws.reduce((a, b) => a + b, 0) + (L.gap || 0) * (ws.length - 1) : Math.max(...ws);
      const gap = W - (L.padding.left || 0) - (L.padding.right || 0) - inner;
      if (Math.abs(gap) > 2) {
        L.padding.left = Math.max(0, Math.round((L.padding.left || 0) + gap / 2));
        L.padding.right = Math.max(0, Math.round(W - inner - L.padding.left));
        changed = true;
      }
    }
  }
  if (changed) {
    fixed++;
    console.log(`  ${f.slice(0,52).padEnd(54)} w:${before.w}→${r.w}  左右:${(before.pad&&before.pad.left)??'-'}/${(before.pad&&before.pad.right)??'-'} → ${L?L.padding.left:'-'}/${L?L.padding.right:'-'}`);
    if (APPLY) { fs.copyFileSync(p, path.join(BK, f)); fs.writeFileSync(p, JSON.stringify(d, null, 2)); }
  }
}
console.log(`\n${APPLY ? '✅ 直した' : '（下見だけ。直すには --apply）'} ${fixed}枚 ／ 触らなかった（名前に幅が無い）${skip}枚`);
if (APPLY) console.log('控え:', BK);
