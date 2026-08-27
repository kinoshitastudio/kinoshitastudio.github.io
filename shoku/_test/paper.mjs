/* ⭐⭐ 版面のかたちと、出る大きさ（2026-08-27）
   木下＝「版の書き出しサイズを他みたいにできるようにして」

   見るのは「落ちない」ではなく **選んだ紙のかたちで本当に出るか**：
     ⭐⭐ 落ちた PNG の縦横が【選んだ比】になっている（画面の縦横ではない）
     ⭐ 盤もその形の窓になる（外が暗く落ちる）＝見えているとおりに出る
     ⭐ 長辺は【段のボタンでも、打ち込みでも同じ1つの値】＝食い違わない
     ⭐ 動画の大きさも同じ比（縦横を決める式が2箇所にあると黙って食い違う）
     ⚠️ 既定「画面」＝これまでと同じ（分岐を通らない）
   使い方: node shoku/_test/paper.mjs <ポート|公開URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const ARG = process.argv[2] || '8092';
const BASE = /^https?:/.test(ARG) ? ARG.replace(/\/+$/,'') : `http://localhost:${ARG}`;
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e=>errs.push(e.message));
await p.setViewport({ width:1280, height:800, deviceScaleFactor:1 });
await p.goto(`${BASE}/shoku/?v=${Date.now()}`, { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,2800));

const R = await p.evaluate(async () => {
  const wait = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  if(!document.getElementById('pratio')) return { 無し:'版面のかたち（#pratio）が無い' };
  const cv = document.querySelector('canvas');
  /* ⭐⭐ 本当に落ちる PNG の縦横を測る＝<a download> を横取りして中身を読む
     （outWH を呼び直すのでは「同じ式をもう一度読んだ」だけになる）。 */
  const shotWH = async () => {
    let blob = null;
    const co = URL.createObjectURL;
    URL.createObjectURL = o => { if(o instanceof Blob && o.type === 'image/png') blob = o; return co(o); };
    document.getElementById('png').click();
    for(let i=0;i<60 && !blob;i++) await wait(60);
    URL.createObjectURL = co;
    if(!blob) return null;
    const bm = await createImageBitmap(blob);
    return { W:bm.width, H:bm.height };
  };
  const pick = v => { document.querySelector(`#pratio button[data-v="${v}"]`).click(); };
  /* 盤の隅の色＝版面の外が暗く落ちているか（窓になっているか） */
  const corner = () => {
    const g2 = cv.getContext('2d');
    const d = g2.getImageData(2, 2, 1, 1).data;
    return [d[0], d[1], d[2]];
  };

  /* ══ ① 既定は「画面のまま」＝これまでどおり ══ */
  out.既定 = { pratio:P.pratio, long:P.long };
  const 画面比 = cv.width / cv.height;
  const a0 = await shotWH();
  out.画面のまま = a0 ? { ...a0, ずれ: Math.abs(a0.W / a0.H - 画面比) } : null;

  /* ══ ②⭐⭐ 4:5 を選ぶと PNG も 4:5 ══ */
  pick('4:5'); await wait(700);
  const a1 = await shotWH();
  out.四五 = a1 ? { ...a1, 比:(a1.W / a1.H).toFixed(4) } : null;
  out.窓になる = corner();
  out.出る欄 = (document.getElementById('outSize').textContent || '').replace(/\s/g,'');

  /* ══ ③ 9:16（縦長）でも合う ══ */
  pick('9:16'); await wait(700);
  const a2 = await shotWH();
  out.九一六 = a2 ? { ...a2, 比:(a2.W / a2.H).toFixed(4) } : null;

  /* ══ ④ 長辺＝段でも打ち込みでも同じ1つの値 ══ */
  document.querySelector('#expk button[data-k="1080"]').click(); await wait(300);
  out.段で1080 = { long:P.long, 欄:+document.getElementById('longIn').value };
  const el = document.getElementById('longIn');
  el.value = '3200'; el.dispatchEvent(new Event('input', { bubbles:true })); await wait(300);
  out.打ち込み3200 = { long:P.long,
    段:[...document.querySelectorAll('#expk button')].filter(x=>x.classList.contains('on')).length };
  const a3 = await shotWH();
  out.打ち込みの絵 = a3;

  /* ══ ⑤ 動画の大きさも同じ比 ══ */
  const tv = (document.getElementById('tvSize').textContent || '').match(/(\d+)\s*×\s*(\d+)/);
  out.動画 = tv ? { W:+tv[1], H:+tv[2], 比:(+tv[1] / +tv[2]).toFixed(4) } : null;

  /* ══ ⑥ 版面でも寄りがズレない（掴む対応表に置いた場所が入っているか） ══ */
  {
    const r = cv.getBoundingClientRect();
    const cx = r.left + r.width * 0.42, cy = r.top + r.height * 0.5;
    const at = () => ({ u:(cx - r.left - MAP.ox) / MAP.dw, v:(cy - r.top - MAP.oy) / MAP.dh });
    const b0 = at();
    cv.dispatchEvent(new WheelEvent('wheel', { clientX:cx, clientY:cy, deltaY:-300, bubbles:true, cancelable:true }));
    await wait(500);
    const b1 = at();
    out.寄っても動かない = { ずれ:Math.hypot(b1.u-b0.u, b1.v-b0.v).toFixed(5), zoom:+VIEW.zoom.toFixed(2) };
  }

  /* ══ ⑦ 控えの往復 ══ */
  pick('2:3'); await wait(500);
  const before = { pratio:P.pratio, long:P.long };
  const txt = JSON.stringify({ app:'shoku', P });
  P.pratio = 'view'; P.long = 2000; syncUI(); draw(true); await wait(300);
  const d = JSON.parse(txt);
  Object.assign(P, d.P); syncUI(); draw(true); await wait(400);
  out.控え = { before, after:{ pratio:P.pratio, long:P.long },
               印:document.querySelector('#pratio button.on').dataset.v };

  /* ══ ⑧ 画面に戻すと、外の暗さも消える ══ */
  pick('view'); await wait(600);
  out.戻せる = { pratio:P.pratio, 隅:corner() };
  return out;
});
await b.close();

let ng = 0;
const ok = (c,n,note)=>{ console.log(`  ${c?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!c) ng++; };
console.log('── ⭐⭐ 版面のかたちと、出る大きさ');
if(R.無し){ console.log('  🔴 ' + R.無し); process.exit(1); }
ok(errs.length === 0, 'JSエラーが出ない', errs.length + '件' + (errs[0] ? ' → ' + errs[0] : ''));
ok(R.既定.pratio === 'view' && R.既定.long === 2000, '⚠️ 既定は【画面のまま・2000】（これまでどおり）', JSON.stringify(R.既定));
ok(R.画面のまま && R.画面のまま.ずれ < 0.02, '⭐ 画面のまま＝画面の縦横で出る', JSON.stringify(R.画面のまま));
ok(R.四五 && Math.abs(+R.四五.比 - 0.8) < 0.01 && Math.max(R.四五.W, R.四五.H) === 2000,
   '⭐⭐ 4:5 を選ぶと【落ちた PNG】が 4:5 になる', JSON.stringify(R.四五));
ok(R.窓になる && R.窓になる[0] < 40 && R.窓になる[1] < 40,
   '⭐ 盤がその形の窓になる（外が暗く落ちる）', 'すみの色 ' + JSON.stringify(R.窓になる));
ok(/2000/.test(R.出る欄) && /4:5/.test(R.出る欄), '⭐ 押す前に【出る大きさ】が出ている', R.出る欄);
ok(R.九一六 && Math.abs(+R.九一六.比 - 9/16) < 0.01 && Math.max(R.九一六.W, R.九一六.H) === 2000,
   '⭐ 縦長（9:16）でも合う', JSON.stringify(R.九一六));
ok(R.段で1080.long === 1080 && R.段で1080.欄 === 1080,
   '⭐ 段のボタンを押すと【打ち込み欄も】1080 になる', JSON.stringify(R.段で1080));
ok(R.打ち込み3200.long === 3200 && R.打ち込み3200.段 === 0,
   '⭐⭐ 打ち込むと値がそこへ行く（段の印は消える＝どれでもない）', JSON.stringify(R.打ち込み3200));
ok(R.打ち込みの絵 && Math.max(R.打ち込みの絵.W, R.打ち込みの絵.H) === 3200,
   '⭐⭐ 打ち込んだ大きさで【本当に出る】', JSON.stringify(R.打ち込みの絵));
ok(R.動画 && Math.abs(+R.動画.比 - 9/16) < 0.02,
   '⭐ 動画の大きさも同じ比（式が1本）', JSON.stringify(R.動画));
ok(R.寄っても動かない && +R.寄っても動かない.ずれ < 0.005 && R.寄っても動かない.zoom > 1.5,
   '⭐ 版面でも【寄ったところが動かない】（掴む対応表に置き場所が入っている）',
   JSON.stringify(R.寄っても動かない));
ok(R.控え && R.控え.after.pratio === R.控え.before.pratio && R.控え.印 === R.控え.before.pratio,
   '⭐ 控えを読み直すと版面も戻る（印もついてくる）', JSON.stringify(R.控え));
/* ⚠️ 地が黒（#000000）なので「明るいか」では見分けられない。
   ⭐ 見分けるのは【外の暗さ #111114 かどうか】＝版面の窓を出しているかどうか。 */
ok(R.戻せる.pratio === 'view' && !(R.戻せる.隅[0] === 17 && R.戻せる.隅[2] === 20),
   '⚠️ 画面に戻すと暗い外も消える（分岐ごと通らない）', JSON.stringify(R.戻せる));
process.exit(ng ? 1 : 0);
