/* ◆ DS蒸留（構造フィンガープリント→軸/プロパティ振り分け→バリアント組み立て）の単体テスト（Figma不要・node ds_test.js）
   code.js から該当節を実体抽出し、フェイクのFigmaノードで検証する（snap_test.js / motion_test.js と同じ思想）。 */
const fs = require("fs"), vm = require("vm");
const src = fs.readFileSync(__dirname + "/code.js", "utf8");
const a = src.indexOf("const DS_MAX_AXIS_VALUES");
const b = src.indexOf("figma.ui.onmessage");
if (a < 0 || b < 0) throw new Error("section markers not found");

let posted = [], selection = [], pageKids = [], created = [];

// ---- フェイクノード ----
let _id = 0;
function node(opts) {
  const n = Object.assign({
    id: "n" + (++_id), name: "node", type: "FRAME", x: 0, y: 0, width: 100, height: 40,
    visible: true, removed: false, layoutMode: "HORIZONTAL", fills: [], children: null,
    characters: undefined, parent: null, componentPropertyReferences: null,
  }, opts);
  if (n.children) n.children.forEach((c) => (c.parent = n));
  n.clone = function () {
    const c = node(Object.assign({}, n, { id: undefined, children: n.children ? n.children.map((k) => k.clone()) : null, parent: null }));
    return c;
  };
  n.remove = function () { n.removed = true; };
  if (!("children" in opts)) delete n.children;   // 子なしノードは "children" in n を false に
  if (n.children === null) delete n.children;
  return n;
}
const fill = (hex, vid) => [{ type: "SOLID", visible: true, color: hex, boundVariables: vid ? { color: { id: vid } } : undefined }];
const text = (chars, name) => node({ type: "TEXT", name: name || chars, characters: chars, width: 60, height: 16 });
const icon = () => node({ type: "VECTOR", name: "Icon", width: 16, height: 16 });

function btn(hex, w, h, label, withIcon, vid) {
  const kids = withIcon ? [icon(), text(label, "Label")] : [text(label, "Label")];
  return node({ type: "FRAME", name: "Frame", width: w, height: h, fills: fill(hex, vid), children: kids });
}

const ctx = {
  console,
  _rgbToHex: (c) => String(c),
  _byPath: (root, path) => { let n = root; for (const i of (path || [])) { if (!n || !n.children || !n.children[i]) return null; n = n.children[i]; } return n; },
  _byName: (root, name) => { const walk = (x) => { if (String(x.name) === name) return x; for (const c of (x.children || [])) { const r = walk(c); if (r) return r; } return null; }; return walk(root); },
  figma: {
    currentPage: { get selection() { return selection; }, set selection(v) { selection = v; }, get children() { return pageKids; }, appendChild(n) { pageKids.push(n); n.parent = null; } },
    ui: { postMessage: (m) => posted.push(m) },
    notify: () => {},
    viewport: { scrollAndZoomIntoView() {} },
    variables: { getVariableById: (id) => (id === "V:accent" ? { name: "colors/accent" } : id === "V:ink" ? { name: "colors/ink" } : null) },
    async getNodeByIdAsync(id) { const all = []; const walk = (n) => { all.push(n); (n.children || []).forEach(walk); }; pageKids.forEach(walk); universe.forEach(walk); return all.find((n) => n.id === id) || null; },
    createComponentFromNode(n) {
      if (n.type === "COMPONENT" || n.type === "COMPONENT_SET") throw new Error("Cannot create component from node");
      n.type = "COMPONENT";
      n.addComponentProperty = compAddProp; n.deleteComponentProperty = compDelProp; n.props = {};
      created.push(n); return n;
    },
    combineAsVariants(comps, parent) {
      comps.forEach((c) => { if (c.type !== "COMPONENT") throw new Error("must consist of only component nodes"); });
      const names = comps.map((c) => c.name);
      if (new Set(names).size !== names.length) throw new Error("duplicate variant names");
      const set = node({ type: "COMPONENT_SET", name: "set", children: comps });
      set.props = {};
      set.addComponentProperty = compAddProp; set.deleteComponentProperty = compDelProp;
      return set;
    },
  },
};
function compAddProp(name, type, def) {
  if (type === "TEXT" && typeof def !== "string") throw new Error("TEXT default must be a string");
  if (type === "BOOLEAN" && typeof def !== "boolean") throw new Error("BOOLEAN default must be a boolean");
  const id = name + "#" + (++_id);
  this.props[id] = { name, type, def };
  return id;
}
function compDelProp(id) { delete this.props[id]; }
let universe = [];
vm.createContext(ctx);
vm.runInContext(src.slice(a, b), ctx);

let pass = 0, fail = 0;
const ok = (c, msg, extra) => { if (c) { pass++; console.log("  ✓ " + msg); } else { fail++; console.log("  ✗ " + msg + (extra !== undefined ? "  → " + JSON.stringify(extra) : "")); } };

// ===== 1. クラスタリング＋軸推論 =====
console.log("\n[1] 同じ形の塊を見つけ、色→Tone軸 / 寸法→Size軸 / 文字→TEXTプロパティ に振り分ける");
// Tone 2値 × Size 2値 = 4セル。文字は全部違う（＝バリアントにしてはいけない）
const btns = [
  btn("#a89060", 100, 40, "Save", false, "V:accent"),
  btn("#262422", 100, 40, "Cancel", false, "V:ink"),
  btn("#a89060", 160, 56, "Continue", false, "V:accent"),
  btn("#262422", 160, 56, "Back", false, "V:ink"),
];
const page = node({ type: "FRAME", name: "Page", children: btns, width: 800, height: 600 });
universe = [page]; pageKids = [page];
selection = [page]; posted = [];
ctx.dsScan();
let s = posted[0];
ok(!s.error, "診断できた", s.error);
ok(s.clusters.length === 1, "1クラスタ", s.clusters && s.clusters.length);
const c0 = s.clusters[0];
ok(c0.count === 4 && c0.cells === 4, "4個 → 4セル", [c0.count, c0.cells]);
const toneAxis = c0.axes.find((x) => x.name === "Tone"), sizeAxis = c0.axes.find((x) => x.name === "Size");
ok(!!toneAxis && !!sizeAxis, "Tone軸とSize軸が立つ", c0.axes.map((x) => x.name));
ok(toneAxis.values.map((v) => v.label).sort().join(",") === "accent,ink", "Tone値名は変数名から取る（colors/accent → accent）", toneAxis.values.map((v) => v.label));
ok(sizeAxis.values.map((v) => v.label).join(",") === "S,L", "Size値は面積順に S,L");
ok(c0.props.length === 1 && c0.props[0].type === "TEXT", "文字の違いはTEXTプロパティ（＝バリアントにしない）", c0.props);

// ===== 2. 同一テキストなら TEXT プロパティは立てない =====
console.log("\n[2] 文字が同じならTEXTプロパティは提案しない");
const same = [btn("#a89060", 100, 40, "OK", false), btn("#262422", 100, 40, "OK", false)];
const p2 = node({ type: "FRAME", name: "P2", children: same });
universe = [p2]; pageKids = [p2]; selection = [p2]; posted = [];
ctx.dsScan();
ok(posted[0].clusters[0].props.length === 0, "TEXTプロパティなし", posted[0].clusters[0].props);

// ===== 3. 要素の有無 → BOOLEAN（子が1つ違うクラスタを吸収する） =====
console.log("\n[3] アイコンの有無 → BOOLEANプロパティ（別クラスタにしない）");
const mix = [
  btn("#a89060", 100, 40, "Save", true), btn("#a89060", 100, 40, "Send", true),
  btn("#262422", 100, 40, "Cancel", false), btn("#262422", 100, 40, "Back", false),
];
const p3 = node({ type: "FRAME", name: "P3", children: mix });
universe = [p3]; pageKids = [p3]; selection = [p3]; posted = [];
ctx.dsScan();
const c3 = posted[0].clusters[0];
ok(posted[0].clusters.length === 1, "アイコン有無で分裂せず1クラスタ", posted[0].clusters.length);
ok(c3.count === 4, "4個が同じ塊", c3.count);
const bp = c3.props.find((p) => p.type === "BOOLEAN");
ok(!!bp && bp.name === "Icon", "Icon が BOOLEAN プロパティに", c3.props.map((p) => p.name + ":" + p.type));

// ===== 4. 差分ゼロ（ただの重複）はDSにしない =====
console.log("\n[4] 差分ゼロの重複はDS化しない");
const dup = [btn("#a89060", 100, 40, "OK", false), btn("#a89060", 100, 40, "OK", false)];
const p4 = node({ type: "FRAME", name: "P4", children: dup });
universe = [p4]; pageKids = [p4]; selection = [p4]; posted = [];
ctx.dsScan();
ok(!!posted[0].error, "『同じ形の繰り返しが見つかりません』で止まる", posted[0].error);

// ===== 5. 軸の値が多すぎたら軸にしない（個体差） =====
console.log("\n[5] 離散値が多すぎる（6色）＝軸ではなく個体差");
const many = ["#111111", "#222222", "#333333", "#444444", "#555555", "#666666"].map((h, i) => btn(h, 100, 40, "T" + i, false));
const p5 = node({ type: "FRAME", name: "P5", children: many });
universe = [p5]; pageKids = [p5]; selection = [p5]; posted = [];
ctx.dsScan();
const c5 = posted[0].clusters[0];
ok(!c5.axes.some((x) => x.name === "Tone"), "Tone軸は立たない（6値 > 上限5）", c5.axes.map((x) => x.name));
ok(c5.cells === 1, "軸が無いのでセルは1つ（バリアント爆発しない）", c5.cells);

// ===== 6. 組み立て（L2）＝複製から作り、元は非破壊 =====
(async function () {
  console.log("\n[6] 組み立て：バリアント化＋プロパティ結線・元は非破壊");
  universe = [page]; pageKids = [page]; selection = [page]; posted = []; created = [];
  ctx.dsScan();
  const id = posted[0].clusters[0].id;
  posted = [];
  await ctx.dsBuild(id, "Button");
  const r = posted[posted.length - 1];
  ok(!r.error, "組み立て成功", r.error);
  ok(r.isSet && r.variants === 4, "4バリアントのコンポーネントセット", [r.isSet, r.variants]);
  ok(r.name === "Button", "名前を上書きできる");
  ok(btns.every((b) => b.type === "FRAME" && !b.removed), "★元の4フレームは FRAME のまま（非破壊）");
  ok(created.length === 4, "複製4つだけがコンポーネント化された", created.length);
  ok(created.every((c) => /^Tone=(accent|ink), Size=(S|L)$/.test(c.name)), "バリアント名は Prop=Value 形式", created.map((c) => c.name));
  ok(r.props.length === 1 && /TEXT/.test(r.props[0]), "TEXTプロパティが付いた", r.props);
  const set = selection[0];
  const propIds = Object.keys(set.props);
  ok(propIds.length === 1, "セットにプロパティが1つ", propIds);
  const bound = set.children.filter((v) => v.children[0].componentPropertyReferences && v.children[0].componentPropertyReferences.characters === propIds[0]);
  ok(bound.length === 4, "★全バリアントのテキストが characters に結線された", bound.length);

  // ===== 7. BOOLEAN の結線は名前で引く（index がずれても正しい子に当たる） =====
  console.log("\n[7] BOOLEANは名前で結線（index変位に強い）");
  universe = [p3]; pageKids = [p3]; selection = [p3]; posted = []; created = [];
  ctx.dsScan();
  const id3 = posted[0].clusters[0].id;
  posted = [];
  await ctx.dsBuild(id3, "IconButton");
  const r3 = posted[posted.length - 1];
  ok(!r3.error, "組み立て成功", r3.error);
  const set3 = selection[0];
  const bId = Object.keys(set3.props).find((k) => set3.props[k].type === "BOOLEAN");
  if (bId) {
    const iconBound = (set3.children || []).filter((v) => (v.children || []).some((c) => c.componentPropertyReferences && c.componentPropertyReferences.visible === bId && c.name === "Icon"));
    ok(iconBound.length >= 1, "Icon の visible に結線された（Icon を持つバリアント）", iconBound.length);
    const wrong = (set3.children || []).some((v) => (v.children || []).some((c) => c.name !== "Icon" && c.componentPropertyReferences && c.componentPropertyReferences.visible === bId));
    ok(!wrong, "★Icon 以外のノード（Label）には visible を結線していない");
  } else {
    ok(r3.errs.some((e) => /取り消し/.test(e)), "結線できなければプロパティを残さない", r3.errs);
  }

  // ===== 8. L1＝選択をそのままコンポーネント化 =====
  console.log("\n[8] L1：選択をコンポーネント化");
  const one = btn("#a89060", 100, 40, "Solo", false);
  universe = [one]; pageKids = [one]; selection = [one]; posted = [];
  ctx.dsComponentize("Solo Button");
  ok(one.type === "COMPONENT" && posted[0].name === "Solo Button", "その場でコンポーネントになる（in-place）");
  selection = [one]; posted = [];
  ctx.dsComponentize("again");
  ok(!!posted[0].error, "コンポーネントを二重にコンポーネント化しない", posted[0].error);
  selection = [one, btn("#000", 10, 10, "x", false)]; posted = [];
  ctx.dsComponentize("");
  ok(/1つだけ/.test(posted[0].error), "複数選択はエラー");

  console.log("\n===== " + pass + " passed, " + fail + " failed =====");
  process.exit(fail ? 1 : 0);
})();
