/* ⭐⭐ 写真から形を作る ── 点TEN（2026-08-28）
   ⭐ この道具のマスクは【もともと画像を受ける】。ただし写真は透明が無いので、
     そのままだと版面いっぱいが形になる（＝形にならない）。
     そこに【明るさで切る】しきいを足した。⚠️ しきい 0 ＝切らない＝今までの絵。
   見るのは：
     ① しきい 0（切らない）＝写真を形にすると版面いっぱい（今までどおり）
     ② しきいを入れると形が縮む（写真の明るい所だけになる）
     ③ 【暗い方を形に】でその逆になる
     ④ 版の外（写真を置いていない所）は形にならない
     ⑤ しきいを 0 に戻すと ① と同じ絵に戻る（＝今までの絵を1つも壊していない）
   ⭐ 物差しは本体と同じ dots() から取る（画面の画素は縁の揺れで落ちる＝TEN で実測済み）。
   使い方: node ten/_test/photo.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); let errs = 0;
p.on('pageerror', e => { errs++; console.log('🔴 JSエラー:', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(process.argv[2], { waitUntil:'networkidle0' });
await p.evaluate(() => { try{ localStorage.clear(); }catch(_){} });
await p.reload({ waitUntil:'networkidle0' });
await p.evaluate(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 2200));

let ng = [];
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note != null ? '  ' + note : ''}`); if(!c) ng.push(name); };

/* ⭐ 本体と同じ dots() を通して「点がどこに何個出るか」を読む */
const shape = () => p.evaluate(() => {
  const s = size(); bakeTone(s.W, s.H); bakeMask(s.W, s.H);
  const ds = dots(s.W, s.H);
  /* ⭐ 形そのものも数える＝点は【濃さ】にも縛られるので、点だけ見ても形の広がりは分からない。
     maskData（白＝形）を直に数えると、版の外まで形になった時に一目で出る。 */
  let 形の画素 = 0, 左 = 1e9, 右 = -1;
  for(let y = 0; y < s.H; y += 4) for(let x = 0; x < s.W; x += 4){
    if(maskData[(y*s.W + x)*4] > 127){ 形の画素++; if(x < 左) 左 = x; if(x > 右) 右 = x; }
  }
  return { n:ds.length, W:s.W, 形の画素,
           形の左端: 右 < 0 ? -1 : 左, 形の右端: 右 };
});

/* 写真（透明の無い縦長）を版として入れて、それを【形】に選ぶ */
await p.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 200; c.height = 500;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 500);
  gr.addColorStop(0, '#101010'); gr.addColorStop(1, '#f4f4f4');
  g.fillStyle = gr; g.fillRect(0, 0, 200, 500);
  g.fillStyle = '#fafafa'; g.beginPath(); g.arc(100, 160, 62, 0, 7); g.fill();
  g.fillStyle = '#141414'; g.beginPath(); g.arc(100, 360, 52, 0, 7); g.fill();
  const url = c.toDataURL('image/png');
  /* ⚠️ 形に使った版は【濃さ】には入らない＝濃さの版が無いと点が1つも出ない。
     先に字の版を1枚置いて「中身」を作る（この道具＝文字の中に別の絵）。 */
  addSheet('txt');
  await new Promise(r => setTimeout(r, 400));
  addSheet('img', url);
  await new Promise(r => setTimeout(r, 800));
  const sh = SHEETS[0];
  sh.sc = 0.6;                     /* ⚠️ cover のままだと版面いっぱい＝左右の余りが出ない */
  P.mask = String(sh.id);          /* この版を【形】に選ぶ */
  syncSheetUI(); kick();
});
await new Promise(r => setTimeout(r, 900));

ok(await p.evaluate(() => !!document.getElementById('r_s_pthr') && !!document.getElementById('s_pinv')),
   '入口（写真のしきい／明るい方・暗い方）がある');
ok(await p.evaluate(() => SHEETS[0].pthr === 0), 'はじめは【切らない】＝今までの絵');

const 切らない = await shape();
ok(切らない.n > 100, '切らないと版面いっぱいが形（透明が無いので当然）', JSON.stringify(切らない));

const setThr = v => p.evaluate(t => {
  const r = document.getElementById('r_s_pthr'); r.value = t;
  r.dispatchEvent(new Event('input', { bubbles:true }));
}, String(v));

await setThr(128); await new Promise(r=>setTimeout(r,700));
const 明 = await shape();
ok(明.n < 切らない.n * 0.9, 'しきいを入れると形が縮む（明るい所だけ）',
   `${切らない.n} → ${明.n} 点`);
await p.evaluate(() => document.querySelectorAll('#s_pinv button')[1].click());
await new Promise(r=>setTimeout(r,700));
const 暗 = await shape();
ok(暗.n > 0 && 暗.n !== 明.n, '【暗い方を形に】で逆の形になる', `明 ${明.n} / 暗 ${暗.n} 点`);
/* 🔴 版の外は【透明】＝明るさ0。透明を除かずに切ると、暗い方を形にした瞬間に
   版面いっぱいが形になる（＝写真の外まで点が広がる）。そこを幅で見る。 */
ok(暗.形の左端 >= 切らない.形の左端 && 暗.形の右端 <= 切らない.形の右端
   && 暗.形の画素 < 切らない.形の画素,
   '版の外（写真を置いていない所）は形にならない',
   `写真 ${切らない.形の左端}〜${切らない.形の右端}（${切らない.形の画素}）/ `
   + `暗い方 ${暗.形の左端}〜${暗.形の右端}（${暗.形の画素}）・版面の幅 ${切らない.W}`);

await p.evaluate(() => document.querySelectorAll('#s_pinv button')[0].click());
await new Promise(r=>setTimeout(r,500));
await setThr(0); await new Promise(r=>setTimeout(r,700));
const 戻り = await shape();
ok(戻り.n === 切らない.n && 戻り.形の画素 === 切らない.形の画素,
   '0 に戻すと今までの絵にそのまま戻る', `${戻り.n} vs ${切らない.n} 点`);
ok(errs === 0, 'JSエラーが出ない', errs + '件');

await b.close();
process.exit(ng.length ? 1 : 0);
