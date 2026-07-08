/* D「既存トークンへ寄せる」の色数学＋最近傍判定の単体テスト（Figma不要・node snap_test.js）
   code.js から rgb2lab / deltaE76 / _srgb2lin を実体抽出して検証（設計 06 §7 のDoD相当）。 */
const fs = require("fs");
const src = fs.readFileSync(__dirname + "/code.js", "utf8");

function grab(name) {              // function NAME(...) { ... } を波括弧カウントで抜く（ネスト{}対応）
  const start = src.indexOf("function " + name);
  if (start < 0) throw new Error("not found: " + name);
  let depth = 0, began = false;
  for (let j = src.indexOf("{", start); j < src.length; j++) {
    if (src[j] === "{") { depth++; began = true; }
    else if (src[j] === "}") { depth--; if (began && depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error("unbalanced: " + name);
}
eval(grab("_srgb2lin"));
eval(grab("rgb2lab"));
eval(grab("deltaE76"));

function hexRGB(h) { h = h.replace("#", ""); return { r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255 }; }
function lab(h) { const c = hexRGB(h); return rgb2lab(c.r, c.g, c.b); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.log("  ✗ FAIL:", msg); } }

// 1. 既知値：ΔE(white,black) ≈ 100
const dWB = deltaE76(lab("#ffffff"), lab("#000000"));
ok(Math.abs(dWB - 100) < 1.5, "ΔE(white,black)≈100 (got " + dWB.toFixed(1) + ")");
// 2. 同色 ΔE=0
ok(deltaE76(lab("#a89060"), lab("#a89060")) < 1e-6, "ΔE(same)=0");
// 3. 近似色は小さいΔE（<閾値6）
const dNear = deltaE76(lab("#a89060"), lab("#a68f5e"));
ok(dNear < 6, "near colors ΔE<6 (got " + dNear.toFixed(2) + ")");
// 4. 別色は大きいΔE（>閾値6）
const dFar = deltaE76(lab("#a89060"), lab("#4a90e2"));
ok(dFar > 6, "distinct colors ΔE>6 (got " + dFar.toFixed(1) + ")");

// 5. 最近傍＋閾値判定（snapToTokens の中核ロジックを再現）
function nearest(hex, targetHexes, T) {
  const L = lab(hex); let best = null, bd = Infinity;
  for (const t of targetHexes) { const d = deltaE76(L, lab(t)); if (d < bd) { bd = d; best = t; } }
  return { best: best, dE: bd, hit: !!best && bd <= T };
}
const targets = ["#a89060", "#262422", "#ffffff"];   // accent / ink / surface
const n1 = nearest("#a68f5e", targets, 6);  ok(n1.hit && n1.best === "#a89060", "near accent → 寄せる (#a89060)");
const n2 = nearest("#4a90e2", targets, 6);  ok(!n2.hit, "far blue → 新規候補（寄せない）");
const n3 = nearest("#111111", targets, 6);  ok(n3.best === "#262422", "near-black → nearest ink");
const n4 = nearest("#fafafa", targets, 6);  ok(n4.hit && n4.best === "#ffffff", "near-white → surface");

console.log("\n" + (fail ? "❌ FAILED " + fail + " / passed " + pass : "✅ ALL PASS (" + pass + ")"));
process.exit(fail ? 1 : 0);
