/* ══⭐⭐ 回帰を【章で選んで】流す ══ 2026-09-01
   🔴 なぜ要るか（実測）：
     ・check.mjs は 279KB / 384本 まで育ち、1回流すのに数分かかる。
       そのうち **387回の待ち＝245秒（4.1分）** はただの sleep。
     ・小さな直しを1つ入れるたびに 384本ぜんぶ流していた＝待ち時間が仕事より長い。
   ⭐ 直し方＝**本体を分けない**。check.mjs はそのまま1本に置いて、
     ここで【序＋芯＋選んだ章＋終わり】だけを組み直した使い捨ての1本を作って流す。
     ＝試験の文が2か所に分かれない（[[feedback_same_formula_in_two_places_drifts]]）。

   ⭐ 章の切れ目＝check.mjs の行頭の `/* ══`。
     章はどれも冒頭で closeAllEditors() → b_demo で見本を組み直すので、ほぼ単独で通る。
     通らない2つは自動で解く：⑤ 名前を辿って作っている章を足す／⑥ @下地 の章を足す。
   ✅ 2026-09-01 に **全章を1つずつ単独で流して、ぜんぶ通ることを確かめた**
     （moya/_test/verify-chapters.sh・落ちた4章は⑤で解けた）。

   使い方:
     node moya/_test/pick.mjs --list          … 章の一覧（番号・本数・見出し）
     node moya/_test/pick.mjs 筆 パス          … 見出しに その字を含む章だけ
     node moya/_test/pick.mjs --n 12,13       … 番号で選ぶ
     node moya/_test/pick.mjs --core          … 芯（①〜⑨）だけ
   ⚠️ 出すのは【組み直した .mjs のパス】1行だけ（run.sh がそれを node に渡す）。
      説明は stderr へ出す＝パイプを汚さない。 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC  = join(HERE, 'check.mjs');
const OUT  = join(HERE, '.pick.mjs');          /* 使い捨て（.gitignore 済み） */

const lines = readFileSync(SRC, 'utf8').split('\n');

/* ── ① 章の切れ目を拾う ───────────────────────────────── */
const heads = [];
lines.forEach((s, i) => { if (/^\/\* ══/.test(s)) heads.push(i); });
if (!heads.length) { console.error('🔴 章の切れ目（行頭の /* ══）が1つも無い'); process.exit(1); }

/* ── ② 終わり（後始末）＝ここから下は必ず付ける ───────────
   `ok(errs...)` から下＝JSエラーの確認・タブを閉じる・終了コード。
   これを落とすと **必ず通る嘘の試験**になる（ブラウザが開いたまま 0 で終わる）。 */
let tailAt = lines.length;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].startsWith('ok(errs.length === 0')) { tailAt = i; break; }
}

/* ── ③ 序＋芯＝先頭から最初の章まで（いつも付ける）───────
   序＝puppeteer の立ち上げ・ok()・wait() などの小道具（〜92行）
   芯＝①〜⑨＝この道具の芯（奥行き・灯・切り抜き・並ぶ順…）。
   ⭐ 芯は「直したものと関係なくても」毎回流す。壊したらここが落ちる。
   ⚠️ 序の中にも `/* ══` の見出しがある（配線の見張りなど・まだページを開く前）。
      章の始まりは【ページを開いた行より後ろ】の最初の見出し。 */
const GOTO = lines.findIndex(s => s.startsWith('await p.goto('));
const CORE_END = heads.find(at => at > GOTO);
if (CORE_END == null) { console.error('🔴 ページを開いた後に章が1つも無い'); process.exit(1); }

/* 章を組み立てる（見出しの文＋範囲＋その中の ok() の数） */
const after = heads.filter(at => at >= CORE_END);
const chaps = after.map((at, k) => {
  const end = (k + 1 < after.length) ? after[k + 1] : tailAt;
  const raw = lines[at].replace(/^\/\* ══+/, '').replace(/══+.*$/, '').trim();
  /* 見出しが飾りだけの章は、次の行の文を見出しにする */
  const name = (raw || (lines[at + 1] || '').replace(/^\s*/, '').replace(/\s*══+.*$/, '').trim())
    .replace(/^@下地\s*/, '');
  /* ⭐ @下地 ＝ 後ろの章がこの章の作った見本を使い回す＝一緒に流さないと素材ゼロで落ちる */
  const base = /@下地/.test(lines[at]);
  let n = 0;
  for (let i = at; i < end; i++) n += (lines[i].match(/\bok\(/g) || []).length;
  return { k: k + 1, at, end, name, n, base };
});
const countOk = (a, b) => { let n = 0;
  for (let i = a; i < b; i++) n += (lines[i].match(/\bok\(/g) || []).length; return n; };
const coreN = countOk(0, CORE_END);
const tailN = countOk(tailAt, lines.length);   /* 「JSエラーが出ない」＝いつも付く1本 */

/* ── ③.5 名前のかぶりを【流す前に】弾く ──────────────────
   🔴🔴 2026-09-02 に踏んだ：新しい章で `const SW` を作ったら、
     1300行めに同じ名前が既に有って **9分待った末に SyntaxError で全部死んだ**
     （`Identifier 'SW' has already been declared`）。
     ⚠️ 速い束では出ない（その章を選ばなければ かぶらない）＝**全部流すまで気づけない**。
   ⭐ 行頭の宣言は必ず同じ場所（トップレベル）に並ぶので、かぶりは**読むだけで分かる**。
     ＝9分待たずに その場で言う。 → feedback_check_existing_before_adding */
function dupNames(){
  const seen = new Map(), dup = [];
  for (let i = 0; i < lines.length; i++) {
    const m = DECL0.exec(lines[i]);
    if (!m) continue;
    const w = m[1] || m[2];
    if (seen.has(w)) dup.push({ w, first: seen.get(w) + 1, again: i + 1 });
    else seen.set(w, i);
  }
  return dup;
}
const DECL0 = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)|^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/;

/* ── ④ 引数を読む ────────────────────────────────────── */
const argv = process.argv.slice(2);
if (argv.includes('--dup')) {
  const d = dupNames();
  d.forEach(o => console.error(`🔴 名前がかぶっている： ${o.w} … ${o.first}行 と ${o.again}行`));
  if (d.length) console.error('   → どちらかの名前を変える（このまま全部流すと SyntaxError で1本も走らない）');
  process.exit(d.length ? 1 : 0);
}
{ const d = dupNames();
  if (d.length) { d.forEach(o =>
    console.error(`🔴 名前がかぶっている： ${o.w} … ${o.first}行 と ${o.again}行`));
    console.error('   → 全部流すと SyntaxError で1本も走らない。先に名前を変える。');
    process.exit(1); } }
if (argv.includes('--list')) {
  console.log(`  芯（①〜⑨・いつも流す）  ${String(coreN + tailN).padStart(3)}本  1〜${CORE_END}行`);
  chaps.forEach(c => console.log(
    `  ${String(c.k).padStart(2)}  ${String(c.n).padStart(3)}本  ${c.name}`));
  console.log(`  ── 章 ${chaps.length}個 ／ ぜんぶで ${coreN + tailN + chaps.reduce((s, c) => s + c.n, 0)}本`);
  process.exit(0);
}

let want = [];
if (argv.includes('--core')) {
  want = [];
} else {
  const nums = [];
  const words = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--n') { (argv[++i] || '').split(/[, ]+/).forEach(s => s && nums.push(+s)); }
    else if (!argv[i].startsWith('--')) words.push(argv[i]);
  }
  want = chaps.filter(c => nums.includes(c.k) || words.some(w => c.name.includes(w)
    || lines.slice(c.at, c.end).some(s => s.includes(w))));
  if (!want.length) {
    console.error('🔴 その字を見出しにも中身にも持つ章が無い：' + argv.join(' '));
    console.error('   → node moya/_test/pick.mjs --list で一覧を見る');
    process.exit(1);
  }
}

/* ── ⑤ 章をまたいで使っている名前を辿って、要る章を足す ──────
   🔴 実測（2026-09-01）：53章を1つずつ流したら **4章が単独で死んだ**。
     落ちた文＝`ReferenceError: fp10 is not defined`
     ＝その章が【前の章で作った const】をそのまま使っていた。
     ⚠️ ok() が1本も 🔴 にならずに落ちる＝「通ったのか死んだのか」が読めない＝いちばん悪い。
   ⭐ 手で印を付けて回らない。**名前を辿って、作っている章を黙って足す**。
     ・章ごとに【行頭で作っている名前】を拾う（const / let / function）
     ・選んだ章が使っている名前が、前の章でしか作られていなければ その章を足す
     ・足した章がまた別の章を要るかもしれないので、増えなくなるまで繰り返す
   ⚠️ 多めに足すのは構わない（遅くなるだけ）。足りないと **嘘の🔴** が出る。 */
/* ⭐ 宣言を読む物差しは1本（かぶりの見張りと同じ DECL0 を使う） */
const declsOf = (a, b) => {
  const set = new Set();
  for (let i = a; i < b; i++) { const m = DECL0.exec(lines[i]); if (m) set.add(m[1] || m[2]); }
  return set;
};
const PRE = declsOf(0, CORE_END);                    /* 序＋芯が作る名前＝いつも有る */
chaps.forEach(c => { c.decl = declsOf(c.at, c.end); });
const usedIn = c => {
  const set = new Set();
  for (let i = c.at; i < c.end; i++) {
    const m = lines[i].match(/[A-Za-z_$][\w$]*/g);
    if (m) m.forEach(w => set.add(w));
  }
  return set;
};
function pullDeps(sel) {
  for (let guard = 0; guard < 60; guard++) {
    let added = false;
    for (const c of [...sel]) {
      for (const w of usedIn(c)) {
        if (PRE.has(w) || sel.some(s => s.decl.has(w))) continue;
        const src = chaps.find(o => o.at < c.at && o.decl.has(w));
        if (src && !sel.includes(src)) { sel.push(src); added = true; }
      }
    }
    if (!added) break;
  }
  return sel;
}
want = pullDeps(want);

/* ── ⑥ 下地の章を足す ────────────────────────────────
   🔴 実測（2026-09-01）：「筆」の章だけを流したら 2本落ちた。
     ＝その章は前の章が組んだ【見本2】を使い回していて、単独では素材がゼロだった。
   ⭐ だから @下地 の印が付いた章は、それより後ろの章を選んだら黙って足す。
     ＝速い束が「素材が無いだけ」で落ちない（＝嘘の🔴を出さない）。 */
chaps.filter(c => c.base).forEach(b => {
  if (want.some(c => c.at > b.at) && !want.includes(b)) want.push(b);
});

/* ── ⑦ 組み直す ──────────────────────────────────────
   ⚠️ 章の順は check.mjs のまま（前後を入れ替えない＝状態の順が狂わない）。 */
want.sort((a, b) => a.at - b.at);
const out = [];
out.push('/* ⚠️ これは使い捨て。直すのは moya/_test/check.mjs の方（ここを直しても消えます）。');
out.push('   組み直した中身＝序＋芯＋【' +
  (want.length ? want.map(c => c.k + '. ' + c.name).join(' ／ ') : '芯だけ') + '】＋後始末 */');
out.push(...lines.slice(0, CORE_END));
want.forEach(c => out.push(...lines.slice(c.at, c.end)));
out.push(...lines.slice(tailAt));
writeFileSync(OUT, out.join('\n'));

const n = coreN + tailN + want.reduce((s, c) => s + c.n, 0);
const all = coreN + tailN + chaps.reduce((s, c) => s + c.n, 0);
console.error(`· 芯 ${coreN}本 ＋ 章 ${want.length}個 ＝ ${n}本（ぜんぶなら ${all}本）`);
want.forEach(c => console.error(`    ${c.k}. ${c.name}（${c.n}本）`));
console.log(OUT);
