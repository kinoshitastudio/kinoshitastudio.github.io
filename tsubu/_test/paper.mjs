/* ⭐ 粒 TSUBU の【版面・大きさ】回帰テスト（2026-08-18 新設）
   木下「動画や画像書き出しのサイズを調整でき、書き出しできるようにしよう」

   🔴 見るのは：
     ①⭐ 既定（画面ぜんぶ＋4x）が【今までと1画素も同じ】── 直す前の index.html と実物を突き合わせる
     ② 版面（1:1 / 4:5 / 3:4 / 9:16 / 16:9）を押すと PNG がその形の実寸で出る
     ③ 長辺 px を選ぶとその px ちょうど（倍率は使わない）
     ④ 動画のコマも同じ版面で出る（PNG連番で実際に1本焼いて中のコマを読む）
     ⑤ 画面ぜんぶに戻すと元の大きさに戻る
     ⑥ 出る大きさが【押す前に】出ている・JSエラーなし
   ⚠️ 測るのは【落ちてきた実物】。画面の表示ではなく、出した PNG / zip の中身を見る。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const BASE = process.argv[2] || 'http://localhost:8400';
const NEW  = process.argv[3] || '/tsubu/';
/* ⭐ 直前のコミットの本体の置き場。'none'（git が無い）・'same'（コミット済みで中身が同じ）は
   突き合わせようが無いので、そう言って飛ばす（黙って通さない）。 */
const OLD  = process.argv[4] || 'none';

const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });
const ng = [], errs = [];
const check = (ok, name, note) => { console.log(`  ${ok ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!ok) ng.push(name); };
const wait = ms => new Promise(r => setTimeout(r, ms));

async function open(path, tag){
  const p = await b.newPage();
  p.on('pageerror', e => errs.push(tag + ': ' + e.message));
  await p.setViewport({ width:1440, height:900, deviceScaleFactor:1 });
  await p.goto(BASE + path + '?v=' + Date.now(), { waitUntil:'networkidle0' });
  await wait(2500);
  /* 落ちてくる Blob を捕まえる（実物を測るため） */
  await p.evaluate(() => { window.__got = [];
    const oc = URL.createObjectURL;
    URL.createObjectURL = function(x){ if(x instanceof Blob) window.__got.push(x); return oc.call(URL, x); }; });
  return p;
}
/* PNG を出して、実物の寸法と中身のハッシュを返す */
async function shot(p, id = 'exPng'){
  await p.evaluate(x => { window.__got.length = 0; document.getElementById(x).click(); }, id);
  for(let i = 0; i < 40; i++){ await wait(400);
    const n = await p.evaluate(() => window.__got.filter(x => /png/.test(x.type)).length); if(n) break; }
  return p.evaluate(async () => {
    const bl = window.__got.find(x => /png/.test(x.type)); if(!bl) return null;
    const buf = await bl.arrayBuffer();
    const h = await crypto.subtle.digest('SHA-256', buf);
    const hex = [...new Uint8Array(h)].slice(0, 8).map(x => x.toString(16).padStart(2,'0')).join('');
    const bmp = await createImageBitmap(bl);
    return { w:bmp.width, h:bmp.height, hash:hex, kb:Math.round(bl.size/1024) };
  });
}
const asp = (p, v) => p.evaluate(x => document.querySelector(`#tvAsp button[data-v="${x}"]`).click(), v);
const pre = (p, v) => p.evaluate(x => document.querySelector(`#tvPre button[data-v="${x}"]`).click(), v);
const sc  = (p, v) => p.evaluate(x => document.querySelector(`#exSc button[data-v="${x}"]`).click(), v);

const N = await open(NEW, 'new');

console.log('── ① 既定（画面ぜんぶ＋4x）は今までと1画素も同じ');
const n0 = await shot(N);
check(!!n0, 'PNG が出る', n0 ? `${n0.w}×${n0.h}（${n0.kb}KB）` : 'なし');
if(OLD === 'none' || OLD === 'same'){
  console.log(`  ⏭ 直前のコミットとの突き合わせは飛ばした（${OLD === 'same' ? 'コミット済みで中身が同じ' : 'git が無い'}）`);
}else{
  const O = await open(OLD, 'old');
  const o0 = await shot(O);
  check(!!o0, '直前のコミットでも PNG が出る', o0 ? `${o0.w}×${o0.h}` : 'なし');
  check(!!n0 && !!o0 && n0.w === o0.w && n0.h === o0.h, '出る大きさが同じ', n0 && o0 ? `${n0.w}×${n0.h} vs ${o0.w}×${o0.h}` : '-');
  check(!!n0 && !!o0 && n0.hash === o0.hash, '⭐中身が1画素も同じ（ハッシュ一致）', n0 && o0 ? `${n0.hash} vs ${o0.hash}` : '-');
  await O.close();
}

console.log('\n── ①b 倍率も今までどおり効く');
await sc(N, 1); await wait(300);
const n1 = await shot(N);
check(!!n1 && !!n0 && Math.abs(n1.w * 4 - n0.w) <= 4, '1x は 4x の 1/4', n1 ? `${n1.w}×${n1.h}（4x は ${n0.w}×${n0.h}）` : '-');
await sc(N, 4); await wait(300);

console.log('\n── ② 版面（形）が PNG に効く');
await N.evaluate(() => document.getElementById('exOpen').click());
await wait(600);
const openOk = await N.evaluate(() => document.getElementById('tvWin').classList.contains('open'));
check(openOk, '「出す」から版面の窓が開く');
for(const [v, r] of [['1:1',1], ['4:5',4/5], ['3:4',3/4], ['9:16',9/16], ['16:9',16/9]]){
  await asp(N, v); await wait(500);
  const s = await shot(N);
  const got = s ? s.w / s.h : 0;
  check(!!s && Math.abs(got - r) / r < 0.02, `${v} の PNG がその形で出る`, s ? `${s.w}×${s.h}（比 ${got.toFixed(3)} / 狙い ${r.toFixed(3)}）` : '出てこない');
  /* 🔴 版面を続けて押すと切り抜きが縮んでいく不具合があった（2026-08-18 に直した）。
     どの形も【画面いっぱいに入る】＝どちらかの辺が画面の辺いっぱい（4x なので 5760 か 3600）。 */
  check(!!s && (Math.abs(s.w - 5760) < 8 || Math.abs(s.h - 3600) < 8),
        `${v} が画面いっぱいに入る（押すたびに縮まない）`, s ? `${s.w}×${s.h}` : '-');
}

console.log('\n── ③ 長辺 px はその px ちょうど（倍率は使わない）');
await asp(N, '9:16'); await pre(N, 1080); await wait(400);
const s1080 = await shot(N);
check(!!s1080 && Math.max(s1080.w, s1080.h) === 1080, '長辺 1080px ちょうど', s1080 ? `${s1080.w}×${s1080.h}` : '-');
check(!!s1080 && Math.abs(s1080.w / s1080.h - 9/16) < 0.02, 'その形のまま', s1080 ? `比 ${(s1080.w/s1080.h).toFixed(3)}` : '-');
await sc(N, 8); await wait(400);
const s1080b = await shot(N);
check(!!s1080b && Math.max(s1080b.w, s1080b.h) === 1080, '倍率を上げても 1080px のまま', s1080b ? `${s1080b.w}×${s1080b.h}` : '-');
await sc(N, 4);
await pre(N, 1440); await wait(400);
const s1440 = await shot(N);
check(!!s1440 && Math.max(s1440.w, s1440.h) === 1440, '長辺 1440px ちょうど', s1440 ? `${s1440.w}×${s1440.h}` : '-');

console.log('\n── ③b 出る大きさが押す前に出ている');
const say = await N.evaluate(() => (document.getElementById('exSize')||{}).textContent.replace(/\s+/g,' ').trim());
check(/1440/.test(say) && /長辺/.test(say), '「出す」に出る大きさが出ている', say);

console.log('\n── ④ 動画のコマも同じ版面で出る');
/* ⚠️ ここで「流れ」を上げる＝絵が動き出す。⑤ で中身を突き合わせるので、あとで必ず戻す。 */
const bGflow = await N.evaluate(() => P.gflow);
await N.evaluate(() => {
  const set = (id, v) => { const el = document.getElementById(id); if(!el) return;
    el.value = v; el.dispatchEvent(new Event('input', { bubbles:true })); };
  set('gflow', 40); set('fps', 8);                                  // 流れが 0 だと動画は出ない作り
  if(typeof P === 'object'){ P.gflow = Math.max(20, P.gflow || 0); }
  document.querySelector('#tvFmt button[data-v="png"]').click();    // headless は mp4 の器を取りに行けない
  document.querySelector('#tvLoop button[data-v="1"]').click();
});
await pre(N, 1080); await asp(N, '9:16'); await wait(600);
await N.evaluate(() => { window.__got.length = 0; document.getElementById('tvGo').click(); });
for(let i = 0; i < 60; i++){ await wait(900);
  const done = await N.evaluate(() => document.getElementById('tvGo').textContent === '動画を出す' && !TV.on);
  if(done) break; }
const frame = await N.evaluate(async () => {
  const z = window.__got.find(x => /zip/.test(x.type));
  if(!z) return { err:(document.getElementById('stat')||{}).textContent };
  const u = new Uint8Array(await z.arrayBuffer());
  /* zip は無圧縮 store ＝ PNG のバイト列がそのまま入っている。IHDR の直後が幅4B・高さ4B */
  for(let i = 0; i < u.length-16; i++){
    if(u[i] === 73 && u[i+1] === 72 && u[i+2] === 68 && u[i+3] === 82){
      const g = o => (u[i+4+o]<<24)|(u[i+5+o]<<16)|(u[i+6+o]<<8)|u[i+7+o];
      return { w:g(0), h:g(4), zipKB:Math.round(z.size/1024) };
    }
  }
  return { err:'zip の中に PNG が見つからない' };
});
check(!!frame && !frame.err && frame.h > frame.w && Math.abs(frame.w/frame.h - 9/16) < 0.05,
      '動画のコマも 9:16', frame && !frame.err ? `${frame.w}×${frame.h}（zip ${frame.zipKB}KB）` : ('出てこない: ' + (frame && frame.err)));
check(!!frame && !frame.err && Math.max(frame.w, frame.h) === 1080, '動画も長辺 1080px',
      frame && !frame.err ? `${frame.w}×${frame.h}` : '-');

console.log('\n── ⑤ 画面ぜんぶに戻す');
/* ⭐ ④ で動かした「流れ」と位相を素に戻してから測る（中身のハッシュを突き合わせるため） */
await N.evaluate(v => { P.gflow = v; flowT = 0; draw(); }, bGflow);
await N.evaluate(() => document.getElementById('tvReset').click());
await pre(N, 'fit'); await wait(600);
const back = await shot(N);
check(!!back && !!n0 && back.w === n0.w && back.h === n0.h, '元の大きさに戻る', back ? `${back.w}×${back.h}（元 ${n0.w}×${n0.h}）` : '-');
check(!!back && !!n0 && back.hash === n0.hash, '⭐戻したら中身も元どおり', back && n0 ? `${back.hash} vs ${n0.hash}` : '-');

console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ 版面・大きさは全部通った');
if(errs.length) console.log(`🔴 JSエラー ${errs.length}件: ${errs.slice(0,4).join(' / ')}`);
await b.close();
process.exit(ng.length || errs.length ? 1 : 0);
