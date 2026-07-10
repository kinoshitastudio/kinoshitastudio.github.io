/* ◆ モーション・ライブラリ（読み取り→JSON→再適用）の単体テスト（Figma不要・node motion_test.js）
   code.js から該当節を実体抽出し、フェイクのFigmaノードで往復を検証する（snap_test.js と同じ思想）。 */
const fs = require("fs"), vm = require("vm");
const SRC = __dirname + "/code.js";
const src = fs.readFileSync(SRC, "utf8");
const a = src.indexOf("const MOTION_DOC_KIND");
const b = src.indexOf("// 🎞 スライドショー化：選択した複数フレーム");
if (a < 0 || b < 0) throw new Error("section markers not found");
const section = src.slice(a, b);

let posted = [], notified = [], selection = [];
const ctx = {
  console,
  figma: {
    get currentPage() { return { selection, children: [] }; },
    ui: { postMessage: (m) => posted.push(m) },
    notify: (s) => notified.push(s),
    viewport: { scrollAndZoomIntoView() {} },
    clientStorage: {
      _s: {},
      async getAsync(k) { return this._s[k]; },
      async setAsync(k, v) { this._s[k] = v; },
    },
    motion: { figmaAnimationStyles: () => [{ name: "motion.preset_name.scale", styleId: "S:1" }] },
  },
  _motionOK: () => true,
  _motionPresets: () => ({ "motion.preset_name.scale": "S:1" }),
  _extendTimelines: (nodes, d) => (d > 0 ? 1 : 0),
};
Object.defineProperty(ctx.figma.currentPage, "selection", { get: () => selection, set: (v) => (selection = v) });
vm.createContext(ctx);
vm.runInContext(section, ctx);

// ---- フェイクノード ----
function node(name, type, tracks, kids, presets) {
  const n = {
    name, type, removed: false,
    manualKeyframeTracks: tracks || null,
    animationStyles: presets || [],
    applied: [], appliedPresets: [],
    applyManualKeyframeTrack(field, track) {
      if (this.blocked) throw new Error("Cannot write animations to a product component");
      this.applied.push({ field: field.name, track });
    },
    async applyAnimationStyle(id, cfg) { this.appliedPresets.push({ id, cfg }); },
    timelines: [{ id: "tl1" }],
    setTimelineDuration() {},
  };
  if (kids) {
    n.children = kids;
    n.findOne = (fn) => { const walk = (x) => { if (fn(x)) return x; for (const c of x.children || []) { const r = walk(c); if (r) return r; } return null; }; for (const c of kids) { const r = walk(c); if (r) return r; } return null; };
  }
  return n;
}
const F = (v) => ({ type: "FLOAT", value: v });
const XY = (v) => ({ type: "VECTOR", value: { x: v, y: v } });

const slide1 = node("Slide 1", "FRAME", {
  OPACITY: { baseValue: F(0), keyframes: [{ timelinePosition: 0, value: F(0), easing: { type: "EASE_OUT" } }, { timelinePosition: 0.7, value: F(1) }] },
  SCALE_XY: { baseValue: XY(1.16), keyframes: [{ timelinePosition: 0, value: XY(1.16) }, { timelinePosition: 1.0, value: XY(1) }] },
  fills: { keyframes: [{ timelinePosition: 0, value: { type: "PAINT", value: {} } }] },   // 色トラック＝v1対象外→skipped
});
const slide2 = node("Slide 2", "FRAME", {
  TRANSLATION_X: { baseValue: F(600), keyframes: [{ timelinePosition: 2, value: F(600), easing: { type: "CUSTOM_CUBIC_BEZIER", easingFunctionCubicBezier: { x1: 0.2, y1: 0, x2: 0, y2: 1 } } }, { timelinePosition: 3.4, value: F(0) }] },
});
const root = node("Slideshow", "FRAME", null, [slide1, slide2], [{ name: "motion.preset_name.scale", duration: 0.4, timelineOffset: 0.1 }]);

let pass = 0, fail = 0;
const ok = (c, msg, extra) => { if (c) { pass++; console.log("  ✓ " + msg); } else { fail++; console.log("  ✗ " + msg + (extra ? "  → " + JSON.stringify(extra) : "")); } };

// ===== 1. 読み取り =====
console.log("\n[1] 選択1つから読み取る");
selection = [root]; posted = [];
ctx.readMotionDoc("シネマ順送り");
const m = posted[0];
ok(m && !m.error, "エラーなく読めた", m);
const doc = m.doc;
ok(doc.kind === "mothership.motion" && doc.name === "シネマ順送り", "kind と name");
ok(doc.nodes.length === 3, "root(preset)＋Slide1＋Slide2 の3ノード", doc.nodes.map((n) => n.name));
ok(JSON.stringify(doc.nodes[1].path) === "[0]" && JSON.stringify(doc.nodes[2].path) === "[1]", "index パスが入る");
ok(doc.duration === 3.4, "尺＝最大キーフレーム時刻 3.4s", doc.duration);
ok(m.skipped === 1, "色(fills)トラックは1件スキップ扱い", m.skipped);
const sc = doc.nodes[1].tracks.find((t) => t.field === "SCALE_XY");
ok(Array.isArray(sc.baseValue) && sc.baseValue[0] === 1.16, "VECTORは [x,y] で保存", sc.baseValue);
const tx = doc.nodes[2].tracks[0];
ok(tx.keyframes[0].easing.easingFunctionCubicBezier.x1 === 0.2, "カスタムベジェの係数が保存される");
ok(doc.nodes[0].presets[0].duration === 0.4, "animationStyles(プリセット)も保存");

(async function main(){
// ===== 2. 別フレームへ再適用（名前が違う＝index パスで当てる） =====
console.log("\n[2] 構造が同じで名前が違うフレームへ適用");
const c1 = node("Card A", "FRAME", null, []), c2 = node("Card B", "FRAME", null, []);
const other = node("Deck", "FRAME", null, [c1, c2]);
selection = [other]; posted = []; notified = [];
await ctx.applyMotionDoc(doc);
const r2 = posted[posted.length - 1];
ok(!r2.error, "エラーなし", r2.error);
ok(c1.applied.length === 2 && c2.applied.length === 1, "パスで対応ノードに着地（2/1トラック）", [c1.applied.length, c2.applied.length]);
ok(r2.applied === 4, "presetを含め4件適用", r2.applied);
const scv = c1.applied.find((x) => x.field === "SCALE_XY").track;
ok(scv.baseValue.type === "VECTOR" && scv.baseValue.value.x === 1.16, "SCALE_XYはVECTORで渡す");
ok(scv.keyframes[1].value.value.y === 1, "VECTORキーフレーム値も復元");
const op = c1.applied.find((x) => x.field === "OPACITY").track;
ok(op.keyframes[0].easing.type === "EASE_OUT", "イージング復元");
const txv = c2.applied[0].track;
ok(txv.keyframes[0].easing.easingFunctionCubicBezier.x1 === 0.2, "カスタムベジェ復元");
ok(txv.baseValue.type === "FLOAT", "TRANSLATION_XはFLOAT");
ok(other.appliedPresets.length === 1 && other.appliedPresets[0].id === "S:1", "プリセットは名前→styleIdで再適用");

// ===== 3. 構造が違う＝同名で拾う / 無ければスキップ =====
console.log("\n[3] 構造が違うフレーム（同名フォールバック / 欠けはスキップ）");
const deep = node("Slide 2", "FRAME", null, []);          // 深い位置に同名ノード（path[1]では届かない）
const wrap = node("wrap", "FRAME", null, [deep]);
const shallow = node("Deck2", "FRAME", null, [wrap]);     // 子は1つだけ＝path[1]は存在しない
selection = [shallow]; posted = [];
await ctx.applyMotionDoc(doc);
const r3 = posted[posted.length - 1];
ok(wrap.applied.length === 2, "path[0]は位置で当てる（名前が違っても＝別デザインへの流用）", wrap.applied.map((x) => x.field));
ok(deep.applied.length === 1 && deep.applied[0].field === "TRANSLATION_X", "path[1]が無い→同名 'Slide 2' を深く探して拾う");
ok(!r3.notes.some((n) => /スキップ/.test(n)), "全部着地したのでスキップ通知は出ない", r3.notes);

const ghostDoc = { kind: "mothership.motion", version: 1, name: "g", duration: 1, nodes: [{ path: [9], name: "Ghost", type: "FRAME", tracks: [{ field: "ROTATION", keyframes: [{ t: 0, v: 0 }, { t: 1, v: 90 }] }] }] };
selection = [shallow]; posted = [];
await ctx.applyMotionDoc(ghostDoc);
const r3b = posted[posted.length - 1];
ok(r3b.applied === 0 && r3b.notes.some((n) => /スキップ/.test(n)), "パスも名前も無い＝スキップしてnotesで通知", r3b.notes);

// ===== 4. プロダクトコンポーネント＝赤エラーにせず情報通知 =====
console.log("\n[4] プロダクトコンポーネントは非破壊スキップ");
const pc = node("Locked", "FRAME", null, []); pc.blocked = true;
const pcRoot = node("Deck3", "FRAME", null, [pc, node("x", "FRAME", null, [])]);
selection = [pcRoot]; posted = [];
await ctx.applyMotionDoc(doc);
const r4 = posted[posted.length - 1];
ok(r4.fail === 0, "failに数えない", r4.fail);
ok(r4.notes.some((n) => /プロダクトコンポーネント/.test(n)), "情報通知が出る");

// ===== 5. ルート1個のdoc＝選択した全ノードそれぞれに適用 =====
console.log("\n[5] ルート1個のdocは選択した全ノードに適用");
const single = { kind: "mothership.motion", version: 1, name: "s", duration: 1, nodes: [{ path: [], name: "any", type: "FRAME", tracks: [{ field: "ROTATION", baseValue: 0, keyframes: [{ t: 0, v: 0 }, { t: 1, v: 360 }] }] }] };
const a1 = node("a", "FRAME", null, []), a2 = node("b", "FRAME", null, []);
selection = [a1, a2]; posted = [];
await ctx.applyMotionDoc(single);
ok(a1.applied.length === 1 && a2.applied.length === 1, "2つとも回る");

// ===== 6. 変なJSONは弾く =====
console.log("\n[6] ガード");
selection = [a1]; posted = [];
await ctx.applyMotionDoc({ name: "design", root: {} });
ok(posted[posted.length - 1].error === "モーションJSONではありません", "デザインJSONを適用しない");
selection = []; posted = [];
await ctx.applyMotionDoc(doc);
ok(/選んで/.test(posted[posted.length - 1].error), "未選択はエラー");
selection = [root, other]; posted = [];
ctx.readMotionDoc("x");
ok(/1つだけ/.test(posted[0].error), "保存は選択1つだけ");
selection = [node("empty", "FRAME", null, [])]; posted = [];
ctx.readMotionDoc("x");
ok(/見つかりません/.test(posted[0].error), "モーション無しは保存させない");

// ===== 7. clientStorage 控え =====
console.log("\n[7] 控え（clientStorage）");
posted = [];
await ctx.motionlibSave(doc);
await ctx.motionlibSave(Object.assign({}, doc, { name: "別名" }));
await ctx.motionlibSave(Object.assign({}, doc, { duration: 9 }));   // 同名＝上書き
posted = [];
await ctx.motionlibList();
const items = posted[0].items;
ok(items.length === 2, "同名は上書きされて2件", items.map((i) => i.name));
ok(items[0].name === "シネマ順送り" && items[0].duration === 9, "上書き後が先頭・中身も新しい");
posted = [];
await ctx.motionlibDelete("別名");
ok(posted[0].items.length === 1, "削除できる");

console.log("\n===== " + pass + " passed, " + fail + " failed =====");
  process.exit(fail ? 1 : 0);
})();
