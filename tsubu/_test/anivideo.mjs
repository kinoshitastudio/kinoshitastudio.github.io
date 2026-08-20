/* ⭐ 動画（集まる・漂う・落ちる）を【押して落ちてくる実物】で確かめる（2026-08-20 新設）
   🔴 見るのは：
     ① 落ち代が 0 でも書き出せる（1コマ目で盤を作り直さない）
        木下の設定に依らず踏む所。tvRun は落ち代の用意を【落ちる】のときだけしていたので、
        集まる・漂うで落ち代が8未満だと、1コマ目の崩すが撮影中に build() を呼んで
        直前に立てた live を全部消し、盤の高さまで変えていた。
     ② 秒で指定したコマ数がちゃんと出る（8秒が2秒になる、をまた作らない）
     ③ 頭と尻が字（行って戻る＝繋いでも段差が出ない）
     ④ 途中が止まっていない（漂うが「何も変化しない動画」にならない） */
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

/* ⭐ 実物の tvRun を回す。⚠️ 出来上がりを配る所（保存）だけ差し替えて、コマを掴む。
   ⚠️ mp4 の器はネットから取りに行くので、ここは PNG連番で回す（コマの中身は同じ）。 */
const run = (mv, sec, fall) => p.evaluate(async o => {
  const seg = (id, v) => document.getElementById(id).querySelector(`[data-v="${v}"]`).click();
  const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles:true })); };
  set('fall', o.fall);
  seg('tvMove', o.mv); seg('tvFmt', 'png'); seg('tvQ', 'lo'); seg('tvLoop', 'sec');
  set('tvSec', o.sec);
  set('res', 12);                                     // ⚠️ 小さくして速く回す（見るのは動きなので足りる）
  await new Promise(r => setTimeout(r, 700));

  /* ⭐ コマを掴む。draw() のあとの canvas を粗い指紋にして持つ。 */
  const fps = [], hs = [];
  const orig = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function(cb, ...a){
    try{
      const cx = this.getContext('2d'), W2 = this.width, H2 = this.height;
      const d = cx.getImageData(0, 0, W2, H2).data;
      const N = 24, f = new Float32Array(N * N);
      for(let y = 0; y < H2; y += 3) for(let x = 0; x < W2; x += 3){
        const i = (y * W2 + x) * 4;
        f[Math.min(N-1,(y/H2*N)|0) * N + Math.min(N-1,(x/W2*N)|0)] += (d[i]+d[i+1]+d[i+2])/3;
      }
      let mx = 0; for(let k = 0; k < f.length; k++) if(f[k] > mx) mx = f[k];
      if(mx > 0) for(let k = 0; k < f.length; k++) f[k] /= mx;
      fps.push(Array.from(f));
      hs.push(H);                                     // ⚠️ 盤の高さは【コマごとに】控える
    }catch(e){}
    /* ⚠️ 中身は要らない（測るのは指紋）。1×1 の PNG を返して先へ進ませる。 */
    return orig.call(this, cb, ...a);
  };
  /* ⚠️ zip を配らせない（headless に保存させると散らかる）。押した先だけ黙らせる。 */
  const bu = URL.createObjectURL; URL.createObjectURL = () => 'blob:stub';
  const ac = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function(){};

  await tvRun();

  HTMLCanvasElement.prototype.toBlob = orig;
  URL.createObjectURL = bu; HTMLAnchorElement.prototype.click = ac;
  /* ⭐ 撮り終わったら画面は【元どおり】か。粒が散らかったまま残っていないか見る。 */
  await new Promise(r => setTimeout(r, 400));
  let away = 0;
  for(const d of dots) if(Math.abs(d.x - d.hx) > 0 || Math.abs(d.y - d.hy) > 0) away++;
  const plan = tvPlan();
  return { n: fps.length, want: plan.total, fps, hs, away, stage: breakStage, mode: P.mode };
}, { mv, sec, fall });

const diff = (a, b) => { let s = 0; for(let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };

for(const mv of ['drift','gather']){
  const name = mv === 'drift' ? '漂う' : '集まる';
  console.log(`\n── ${name}（落ち代 0 から・6秒）`);
  const r = await run(mv, 6, 0);
  const hset = [...new Set(r.hs)];
  console.log(`    出たコマ ${r.n} ／ 予定 ${r.want} ／ 撮っているあいだの盤の高さ ${hset.join(',')}`);
  check(r.n === r.want, `${name}：予定どおりのコマ数が出る`, `${r.n}/${r.want}`);
  /* 🔴 落ち代は【撮り始める前に】用意する。1コマでも高さが変われば、撮影中に
     build() が走った＝直前に立てた live も消えている。 */
  check(hset.length === 1, `${name}：撮影中に盤が作り直されない（落ち代0でも）`, `高さ ${hset.join('→')}`);
  if(r.n >= 8){
    const q = i => r.fps[Math.round((r.n - 1) * i)];
    /* ⭐ 頭と尻は【1ステップぶんだけ】違うのが正しい（尻の次が頭＝繋いで1コマ進む）。
       ⚠️ ぴったり同じを求めると、集まるのように1コマで大きく動くものが落ちる。
       ⭐ 見るのは「尻が字へ帰っているか」＝頭との隔たりが、真ん中との隔たりより桁違いに小さいこと。 */
    /* ⭐ 比べる相手は【1コマぶんの進み】そのもの（コマ0→コマ1）。
       尻から頭へ繋いだときの飛びが、ふだんの1コマと同じくらいなら段差は出ない。 */
    const head = diff(q(0), q(1)), one = diff(r.fps[0], r.fps[1]), far = diff(q(0), q(0.48));
    console.log(`    尻→頭の飛び ${head.toFixed(4)} ／ ふだんの1コマ ${one.toFixed(4)} ／ 頭と真ん中 ${far.toFixed(4)}`);
    check(head <= one * 1.6 + 0.002, `${name}：尻が字へ帰っている（繋いでも段差が出ない）`,
      `飛び ${head.toFixed(4)} ≦ 1コマ ${one.toFixed(4)}`);
    /* ⭐ 途中が止まっていないか＝前半の3割地点と5割地点で絵が違う */
    const mid = diff(q(0.30), q(0.48));
    console.log(`    途中（3割→5割）の隔たり ${mid.toFixed(4)}`);
    check(mid > 0.012, `${name}：途中で絵が進んでいる（止まった動画にならない）`, mid.toFixed(4));
  }
  /* 🔴 撮ったあと画面に散らかりが残らないか。段を巻き戻すようにしたので、
     「崩れているか」で組み直しを決めていると、ここをすり抜けて粒が散ったまま残る。 */
  console.log(`    撮ったあと：家に居ない粒 ${r.away} ／ 段 ${r.stage} ／ 動き ${r.mode}`);
  check(r.away === 0 && r.stage === 0, `${name}：撮り終わったら画面が元どおり`, `散らかり ${r.away} 粒・段 ${r.stage}`);
}
check(errs.length === 0, '例外が出ていない', errs.join(' / '));
await b.close();
console.log(ng.length ? '\n🔴 落ちた: ' + ng.join(' / ') : '\n✅ 動画（集まる・漂う）は全部通った');
process.exit(ng.length ? 1 : 0);
