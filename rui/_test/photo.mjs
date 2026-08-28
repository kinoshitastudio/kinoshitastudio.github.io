/* ⭐⭐ 写真から形を作る ── 累RUI（2026-08-28）
   ⭐⭐ この道具の形は maskCv（塗られている所）ひとつで決まる。
     写真は【明るさで切って塗りに直す】ところまでで済ませ、
     升目・拾い方・円の大きさ・重なり・素材・額には1行も触っていない。
   見るのは：
     ① 写真を渡すと升目が拾える
     ② 写真のしきいを動かすと拾う升目が変わる
     ③ 【暗い方を形に】でも写真の外（余白）が形にならない
        🔴 ここを透明にしないと、紙いっぱいの四角い塊になる
     ④ 写真を外すと字に戻る（字の設定は何も消えない）
   ⭐ 物差しは本体と同じ gridOf() から取る（画面の画素は縁の揺れで落ちる＝TEN で実測済み）。
   使い方: node rui/_test/photo.mjs <URL> */
import fs from 'fs';
import os from 'os';
import path from 'path';
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const URL_ = process.argv[2];
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); let errs = 0;
p.on('pageerror', e => { errs++; console.log('🔴 JSエラー:', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(URL_, { waitUntil:'networkidle0' });
/* ⚠️ 前に触った状態がこのブラウザに残っているので必ず消してから測る */
await p.evaluate(() => { try{ localStorage.clear(); }catch(_){} });
await p.reload({ waitUntil:'networkidle0' });
/* ⚠️ 書体が届く前に測ると、あとで届いた時に字の形が変わる＝【戻ったか】が誤って落ちる */
await p.evaluate(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 2500));

let ng = [];
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note != null ? '  ' + note : ''}`); if(!c) ng.push(name); };

/* ⭐ 本体と同じ gridOf() を通して「どの升目が形か」を読む */
const grid = () => p.evaluate(() => {
  const s = size(); const g = gridOf(s.W, s.H);
  const on = g.on || [];
  return { n:on.length, cols:g.cols,
           左端: on.length ? Math.min(...on.map(o => o.i)) : -1,
           右端: on.length ? Math.max(...on.map(o => o.i)) : -1 };
});

ok(await p.evaluate(() => !!document.getElementById('bPh') && !!document.getElementById('r_pthr')
                        && !!document.getElementById('pinvSeg')), '入口（写真から形を作る／しきい／反転）がある');
ok(await p.evaluate(() => document.getElementById('phUI').style.display === 'none'),
   '写真を置くまでは つまみを出さない');
const 字 = await grid();

/* 渡す写真＝白地に黒い丸（横長）。⭐ 横長にするのは、升目の左右に大きな余白が残るから…
   ではなく縦長にする＝左右に余白（この道具は横に cols で割るので、左右の余りを見るのが素直） */
const PNG = path.join(os.tmpdir(), 'rui_test_photo.png');
const b64 = await p.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 160; c.height = 400;
  const g = c.getContext('2d');
  /* ⭐ 写真らしく【中間調】を入れる。真っ白と真っ黒だけだと、しきいを動かしても
     どの画素も切り替わらない＝つまみが効いていても効いていないように見える（実測で踏んだ） */
  const gr = g.createLinearGradient(0, 0, 0, 400);
  gr.addColorStop(0, '#111'); gr.addColorStop(1, '#fff');
  g.fillStyle = gr; g.fillRect(0, 0, 160, 400);
  g.fillStyle = '#f2f2f2';
  g.beginPath(); g.arc(80, 130, 55, 0, 7); g.fill();
  g.fillStyle = '#1a1a1a';
  g.beginPath(); g.arc(80, 290, 42, 0, 7); g.fill();
  return c.toDataURL('image/png').split(',')[1];
});
fs.writeFileSync(PNG, Buffer.from(b64, 'base64'));

const inp = await p.$('#fPh');
if(!inp){ console.log('  🔴 写真を渡す入口（#fPh）が無い'); await b.close(); process.exit(1); }
await inp.uploadFile(PNG);
await new Promise(r => setTimeout(r, 1500));

/* ① 明るい方を形に＝白い地が形になる（縦長の板） */
const 明 = await grid();
ok(明.n > 50 && 明.n !== 字.n, '写真を渡すと升目が拾える（字とは違う形）', JSON.stringify(明));
ok(await p.evaluate(() => document.getElementById('phUI').style.display !== 'none'),
   '写真を渡すと しきい・反転が出てくる');

/* ② しきい */
const setThr = v => p.evaluate(t => {
  const r = document.getElementById('r_pthr'); r.value = t;
  r.dispatchEvent(new Event('input', { bubbles:true }));
}, String(v));
await setThr(30);  await new Promise(r=>setTimeout(r,600)); const ゆるい = await grid();
await setThr(230); await new Promise(r=>setTimeout(r,600)); const きつい = await grid();
ok(ゆるい.n !== きつい.n, 'しきいで拾う升目が変わる', `ゆるい ${ゆるい.n} / きつい ${きつい.n}`);

/* ③ 暗い方を形に ＝ 写真の外（左右の余白）が形にならない */
await setThr(128); await new Promise(r=>setTimeout(r,500));
await p.evaluate(() => document.querySelectorAll('#pinvSeg button')[1].click());
await new Promise(r=>setTimeout(r,900));
const 暗 = await grid();
ok(暗.n > 20 && 暗.左端 > 0 && 暗.右端 < 暗.cols - 1,
   '【暗い方を形に】でも写真の外が形にならない',
   `升目 ${暗.cols} 列のうち ${暗.左端}〜${暗.右端}（${暗.n} 升）`);

/* ④ 字に戻す */
await p.evaluate(() => document.querySelectorAll('#pinvSeg button')[0].click());
await new Promise(r=>setTimeout(r,500));
await p.evaluate(() => document.getElementById('bPhOff').click());
await new Promise(r=>setTimeout(r,900));
const 戻り = await grid();
ok(戻り.n === 字.n, '写真を外すと字の形にそのまま戻る', `${戻り.n} vs ${字.n} 升`);
ok(await p.evaluate(() => document.getElementById('phUI').style.display === 'none'
     && !document.getElementById('t_text').disabled), 'つまみが引っ込み、字の欄がまた触れる');
ok(errs === 0, 'JSエラーが出ない', errs + '件');

await b.close();
process.exit(ng.length ? 1 : 0);
