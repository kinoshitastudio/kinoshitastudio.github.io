/* ⭐ 漂う（動画）の回帰テスト（2026-08-20 新設）
   木下＝「漂うは秒数を増やしても、最初のから次へのステップがうまく表現されていない」
        「重要なのは出ているオブジェクトの見え方なので、それが壊れないようにしてほしい」

   🔴 見るのは4つ。どれも【書き出しと同じ手順】で粒を動かして測る（画面の見た目ではなく実物の値）。
     ① 進むか      ── 家からの距離が時間とともに増える（前の式は 6マスで頭打ち＝ずっと同じ）
     ② 秒が効くか  ── 長く撮るほど遠くまで行く（木下の「秒数を増やしても」への答え）
     ③ 見え方      ── 出ている粒の【混み具合】が変わらない（吸い込まれて筋にならない・薄まらない）
     ④ 跳ねないか  ── 崩した1コマ目は字そのまま（前は sin(seed) のぶんいきなり跳んでいた）
   ⚠️ 集まる・積もるは1バイトも触っていないはずなので、⑤で「動くこと」だけ確かめる。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL0 = process.argv[2] || 'http://localhost:8450/tsubu/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1200, height:900, deviceScaleFactor:1 });
await p.goto(URL0 + '?v=' + Date.now(), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 2200));
const ng = [];
const check = (ok, name, note) => { console.log(`  ${ok ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!ok) ng.push(name); };

/* ⭐ ここで測るのは【漂うの物理】そのもの。粒を生かして、コマ数ぶん step するだけ。
   ⚠️ 崩すの段の入れ方（間の置き方・少しずつ入れる仕掛け）は書き出し側の話なので、
      ここでは簡単な等間隔で回す。実物の書き出しは anivideo.mjs が見ている。 */
const runAnim = (mode, total, at, noBreak) => p.evaluate(o => {
  P.mode = o.mode;
  /* ⚠️ 落ち代は【始める前に】用意する。tvRun と同じ手順。
     🔴 これを忘れると、1コマ目の崩すが中で build() を呼んで粒を作り直し、
        測るために掴んでいた粒が【もう盤に居ない粒】になる＝距離がずっと 0 に見える
        （2026-08-20 実際にこれで誤検出した）。 */
  if(P.fall < 8){
    P.fall = 8;
    const fe = document.getElementById('fall');
    if(fe){ fe.value = 8; const v = fe.parentElement.querySelector('.val'); if(v) v.textContent = 8; }
  }
  build();
  breakStage = 0;
  /* ⚠️ 字の粒だけ印を付けておく。距離は【この粒だけ】で測る。
     地・ますは後から増えるし、まぜる（4段目）は位置ごと入れ替えるので、
     混ぜると「漂ったから離れた」のか「まぜたから離れた」のか分からなくなる。 */
  const JI = [];
  for(const d of dots) if(!d.hide && !d.pap){ d.live = true; JI.push({ d, hx:d.x, hy:d.y }); }
  running = true; t = 0;
  const fwd = Math.max(2, Math.ceil((o.total + 1) / 2));
  const BRK = [1,2,3,4].map(k => Math.max(1, Math.round(fwd * 0.7 * (k - 1) / 4) + 1));

  /* ⭐ 絵そのものも測る。家からの距離は渦を一周すると 0 に戻るので、
     「進んでいるか」の答えにならない。画面の画素を粗く拾って指紋にする。 */
  const finger = () => {
    draw();
    const cx = cv.getContext('2d'), W2 = cv.width, H2 = cv.height;
    const im = cx.getImageData(0, 0, W2, H2).data;
    const N = 64, f = new Float32Array(N * N);   // 64×64 の明るさの地図
    for(let y = 0; y < H2; y += 2) for(let x = 0; x < W2; x += 2){
      const i = (y * W2 + x) * 4;
      f[(Math.min(N-1, (y / H2 * N) | 0)) * N + Math.min(N-1, (x / W2 * N) | 0)]
        += (im[i] + im[i+1] + im[i+2]) / 3;
    }
    let mx = 0; for(let k = 0; k < f.length; k++) if(f[k] > mx) mx = f[k];
    if(mx > 0) for(let k = 0; k < f.length; k++) f[k] /= mx;
    return Array.from(f);
  };

  const snap = [];
  const want = new Set(o.at.concat([fwd - 1]));
  const measure = i => {
    let sd = 0;
    for(const j of JI) sd += Math.hypot(j.d.x - j.hx, j.d.y - j.hy);
    const cells = new Set();
    for(const d of dots) cells.add(d.y * 4096 + d.x);
    return { i, far: JI.length ? sd / JI.length : 0, cells: cells.size, dots: dots.length, fp: finger() };
  };
  if(want.has(0)) snap.push(measure(0));
  for(let i = 1; i < fwd; i++){
    if(!o.noBreak && BRK.indexOf(i) >= 0) breakNow(false);
    step();
    if(want.has(i)) snap.push(measure(i));
  }
  return { fwd, BRK, snap };
}, { mode, total, at, noBreak: !!noBreak });
/* ⭐ 2つの指紋の隔たり＝絵がどれだけ変わったか（0＝同じ絵） */
const diff = (a, b) => { let s = 0; for(let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };

console.log('── ① 漂う ── 絵が最後まで進み続けるか（13秒・27fps＝351コマ）');
const A = await runAnim(2, 351, [0,1,2,20,60,100,140]);
const at = i => A.snap.find(s => s.i === i) || A.snap[A.snap.length - 1];
const s0 = at(0), s1 = at(1), s2 = at(2), sEnd = A.snap[A.snap.length - 1];
console.log(`    fwd=${A.fwd}  崩す段=${A.BRK.join(',')}  粒=${sEnd.dots}`);
for(const s of A.snap) console.log(`    コマ${String(s.i).padStart(3)}  字の家からの距離 ${s.far.toFixed(2)}  埋まったマス ${s.cells}`
  + `  1コマ目との絵の隔たり ${diff(s0.fp, s.fp).toFixed(4)}`);

/* 🔴 ここが木下の指摘そのもの。前の式は【崩し終わったら絵が止まる】＝
   後半どこを取っても同じ絵だった（実測：コマ間の変化量が最後まで 8.2±0.4 で一定）。
   ⭐ 見るのは「後半のあいだにも絵が変わり続けているか」。 */
const mid = at(60), late = at(140);
const dLate = diff(mid.fp, late.fp), dEarly = diff(s0.fp, mid.fp);
console.log(`    崩し終わったあと（コマ60→140）の絵の隔たり ${dLate.toFixed(4)}`);
check(dLate > dEarly * 0.25 && dLate > 0.01,
  '崩し終わったあとも絵が変わり続ける（止まらない）', `60→140 ${dLate.toFixed(4)}（0→60 は ${dEarly.toFixed(4)}）`);
check(sEnd.far > 8, '字が家からちゃんと離れる（6マスの円で頭打ちにならない）', `最後 ${sEnd.far.toFixed(1)} マス`);

console.log('\n── ② 秒が効くか（崩す段を入れない素の漂うで測る）');
/* ⚠️ 崩すの4段目（まぜる）は粒の位置ごと入れ替える＝距離が一気に跳ぶ。
   混ぜたぶんか漂ったぶんか分からなくなるので、ここは【崩さずに】漂うだけを測る。 */
const D = await runAnim(2, 351, [0,20,40,80,120], true);
for(const s of D.snap) console.log(`    コマ${String(s.i).padStart(3)}  字の家からの距離 ${s.far.toFixed(2)}  埋まったマス ${s.cells}`);
const d40 = D.snap.find(s => s.i === 40), d80 = D.snap.find(s => s.i === 80), dEnd = D.snap[D.snap.length - 1];
check(d80.far > d40.far * 1.5 && dEnd.far > d80.far * 1.3,
  '秒を増やすほど先まで漂う（頭打ちにならない）',
  `40コマ ${d40.far.toFixed(1)} → 80 ${d80.far.toFixed(1)} → ${dEnd.i} ${dEnd.far.toFixed(1)} マス`);
const B = await runAnim(2, 162, [0]);          // 6秒（崩す段あり＝実物）
const bEnd = B.snap[B.snap.length - 1];
const dSec = diff(bEnd.fp, sEnd.fp);
console.log(`    6秒の最後（コマ${bEnd.i}） ／ 13秒の最後（コマ${sEnd.i}）── 行き着いた絵の隔たり ${dSec.toFixed(4)}`);
check(dSec > 0.01, '6秒と13秒で行き着く絵が違う', `隔たり ${dSec.toFixed(4)}`);

console.log('\n── ③ 見え方（出ている粒が吸い込まれない・薄まらない）');
/* 🔴 見るのは【粒が何マスに散っているか】＝埋まったマス ÷ 粒。
   渦だけの場なら粒は運ばれるだけなので、この比は高いまま（重なるのは丸めのぶんだけ）。
   向きをばらまく場だと粒が細い筋へ吸い込まれ、この比は 0.4 を切って絵が骨になる。
   ⚠️ 「コマ100 と最後で同じか」では測れない。まだ混ざっている途中なので、
      正しく漂っていても少しずつ下がる（2026-08-20 これで誤検出した）。
   ⭐ 素の漂う（崩す段なし＝粒の数が変わらない）で測る。前の式でも 0.81 だった。 */
const spread = D.snap.map(s => ({ i:s.i, r: s.cells / 467 }));
for(const s of spread) console.log(`    コマ${String(s.i).padStart(3)}  散らばり ${s.r.toFixed(3)}`);
const rEnd = spread[spread.length - 1].r;
check(rEnd > 0.65, '粒が散ったまま（筋へ吸い込まれない）', `最後 ${rEnd.toFixed(3)}（前の式は 0.81・吸い込む場だと 0.4 を切る）`);

console.log('\n── ④ 崩した1コマ目は跳ねない（字がそのまま出る）');
console.log(`    コマ1 ${s1.far.toFixed(3)} マス ／ コマ2 ${s2.far.toFixed(3)} マス`);
check(s1.far < 1.0, '1コマ目は家のまま（いきなり跳ばない）', `${s1.far.toFixed(2)} マス`);

console.log('\n── ⑤ 集まる・積もるは今まで通り動く（触っていない）');
const G = await runAnim(1, 162, [0]);
const gEnd = G.snap[G.snap.length - 1];
console.log(`    集まる 家からの距離 ${gEnd.far.toFixed(1)} マス`);
check(gEnd.far > 10, '集まるは今まで通り渦になる', `${gEnd.far.toFixed(1)} マス`);
const F = await runAnim(0, 162, [0]);
const fEnd = F.snap[F.snap.length - 1];
console.log(`    積もる 家からの距離 ${fEnd.far.toFixed(1)} マス`);
check(fEnd.far > 3, '積もるは今まで通り落ちる', `${fEnd.far.toFixed(1)} マス`);

check(errs.length === 0, '例外が出ていない', errs.join(' / '));
await b.close();
console.log(ng.length ? '\n🔴 落ちた: ' + ng.join(' / ') : '\n✅ 漂う 全部通った');
process.exit(ng.length ? 1 : 0);
