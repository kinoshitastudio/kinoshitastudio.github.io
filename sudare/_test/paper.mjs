/* ⭐ 簾［マス］の【版面の形】の回帰テスト（2026-08-17 新設）
   木下「縦長やサイズで動画も書き出しできるようにするよ」（インスタが縦長だから）

   🔴 見るのは：
     ① 自動＝これまでどおり【絵のある画素ぴったり】（余白が付かない）
     ② 形を選ぶと PNG（全体）が【その形の実寸】で出る
     ③⭐ その中で【絵が切れない・歪まない】（この道具の売りを壊していない）
     ④ 動画のコマも同じ形で出る（PNG連番で実際に1本焼いて中のコマを読む）
     ⑤ 自動に戻すと元の大きさに戻る
   ⚠️ 測るのは【落ちてきた実物】。画面を読むのではなく、出した PNG / zip の中身を見る。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL0 = process.argv[2] || 'http://localhost:8360/sudare/masu/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1440, height:900, deviceScaleFactor:1 });
await p.goto(URL0 + '?v=' + Date.now(), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 2500));

const ng = [];
const check = (ok, name, note) => { console.log(`  ${ok ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!ok) ng.push(name); };
const wait = ms => new Promise(r => setTimeout(r, ms));
await p.evaluate(() => { window.__got = [];
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(x){ if(x instanceof Blob) window.__got.push(x); return oc.call(URL, x); }; });

const setRatio = v => p.evaluate(x => document.querySelector(`#pratio button[data-v="${x}"]`).click(), v);
const setLen  = k => p.evaluate(x => document.querySelector(`#expk button[data-k="${x}"]`).click(), k);

/* PNG（全体）を出して、実物の寸法と【中の絵の外接】を測る */
const shot = async () => {
  await p.evaluate(() => { window.__got.length = 0; document.getElementById('pngFull').click(); });
  for(let i = 0; i < 40; i++){ await wait(700);
    const n = await p.evaluate(() => window.__got.filter(x => /png/.test(x.type)).length); if(n) break; }
  return p.evaluate(async () => {
    const b2 = window.__got.find(x => /png/.test(x.type)); if(!b2) return null;
    const bmp = await createImageBitmap(b2);
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    const cx = c.getContext('2d'); cx.drawImage(bmp, 0, 0);
    const d = cx.getImageData(0, 0, c.width, c.height).data;
    /* 地の色（左上の画素）と違う画素の外接＝絵の入っている範囲 */
    const r0 = d[0], g0 = d[1], b0 = d[2];
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for(let y = 0; y < c.height; y += 2) for(let x = 0; x < c.width; x += 2){
      const i = (y*c.width + x)*4;
      if(Math.abs(d[i]-r0) + Math.abs(d[i+1]-g0) + Math.abs(d[i+2]-b0) > 24){
        if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
    }
    return { w:c.width, h:c.height, ink: x1 < 0 ? null : { w:x1-x0+2, h:y1-y0+2, x0, y0 } };
  });
};

console.log('── ① 自動（これまでどおり）');
check(errs.length === 0, 'JSエラーなし', errs.join(' / '));
await setLen(2000); await wait(600);
const a0 = await shot();
check(!!a0 && Math.max(a0.w, a0.h) > 1500, 'PNG（全体）が出る', a0 ? `${a0.w}×${a0.h}` : '出てこない');
const ar0 = a0 ? a0.w/a0.h : 0;
check(!!a0 && a0.ink && Math.abs(a0.ink.w - a0.w) < 8 && Math.abs(a0.ink.h - a0.h) < 8,
      '⭐自動は余白が付かない（絵＝紙）', a0 && a0.ink ? `紙 ${a0.w}×${a0.h} / 絵 ${a0.ink.w}×${a0.ink.h}` : '-');

console.log('\n── ②③ 版面の形（絵は切れない・歪まない）');
for(const [v, w, h] of [['9:16',1125,2000], ['1:1',2000,2000], ['16:9',2000,1125], ['4:5',1600,2000], ['3:4',1500,2000]]){
  await setRatio(v); await wait(500);
  const s = await shot();
  check(!!s && Math.abs(s.w-w) < 4 && Math.abs(s.h-h) < 4, `${v} は ${w}×${h}`, s ? `${s.w}×${s.h}` : '出てこない');
  const arIn = s && s.ink ? s.ink.w/s.ink.h : 0;
  check(!!s && s.ink && s.ink.w <= s.w+4 && s.ink.h <= s.h+4 && Math.abs(arIn-ar0)/ar0 < 0.08,
        `${v} で絵が切れず・歪まない`,
        s && s.ink ? `絵 ${s.ink.w}×${s.ink.h}（比 ${arIn.toFixed(2)} / 元 ${ar0.toFixed(2)}）` : '-');
}

console.log('\n── ④ 動画のコマも同じ形で出る');
/* ⚠️「速さ」が 0 だと動画は出ない作り＝まず動かす状態にする（video.mjs と同じ下ごしらえ） */
await p.evaluate(() => {
  animStart = function(){};                        // ⚠️ 画面のアニメは止める（video.mjs と同じ）
  const set = (id, v) => { const el = document.getElementById(id); if(!el) return;
    el.value = v; el.dispatchEvent(new Event('input', { bubbles:true })); };
  /* ⚠️ つまみの id は 'speed' と 'fps'（'anim' は無い＝最初これで「出てこない」と誤検出した） */
  set('speed', 30); set('fps', 8); set('kpos', 50);
  document.querySelector('#tvFmt button[data-v="png"]').click();   // headless は mp4 の器を取りに行けない
  document.querySelector('#tvLoop button[data-v="1"]').click();
  document.querySelector('#tvLen button[data-v="1080"]').click();
});
await setRatio('9:16'); await wait(600);
await p.evaluate(() => { window.__got.length = 0; document.getElementById('tvGo').click(); });
for(let i = 0; i < 60; i++){ await wait(900);
  const done = await p.evaluate(() => document.getElementById('tvGo').textContent === '動画を出す' && !TV.on);
  if(done) break; }
const frame = await p.evaluate(async () => {
  const z = window.__got.find(x => /zip/.test(x.type)); if(!z) return null;
  const u = new Uint8Array(await z.arrayBuffer());
  /* zip は無圧縮 store ＝ PNG のバイト列がそのまま入っている。IHDR の直後が幅4B・高さ4B */
  for(let i = 0; i < u.length-16; i++){
    if(u[i] === 73 && u[i+1] === 72 && u[i+2] === 68 && u[i+3] === 82){
      const g = o => (u[i+4+o]<<24)|(u[i+5+o]<<16)|(u[i+6+o]<<8)|u[i+7+o];
      return { w:g(0), h:g(4), zipKB:Math.round(z.size/1024) };
    }
  }
  return null;
});
check(!!frame && frame.h > frame.w && Math.abs(frame.h/frame.w - 16/9) < 0.12,
      '9:16 の動画のコマも縦長', frame ? `${frame.w}×${frame.h}（zip ${frame.zipKB}KB）` : '出てこない');

console.log('\n── ④b 版面の中の置き方（絵の大きさ・よこ・たて）');
const slide = (id, v) => p.evaluate(o => { const r = document.getElementById(o.id);
  r.value = o.v; r.dispatchEvent(new Event('input', { bubbles:true })); }, { id, v });
await setRatio('1:1'); await wait(500);
const p0 = await shot();
check(!!p0 && !!p0.ink, '正方で絵が入っている', p0 && p0.ink ? `絵 ${p0.ink.w}×${p0.ink.h}` : '-');
await slide('pzoom', 60); await wait(600);
const p1 = await shot();
check(!!p1 && p1.ink && p1.ink.w < p0.ink.w*0.8, '絵の大きさを下げると絵が小さくなる',
      p1 && p1.ink ? `${p0.ink.w} → ${p1.ink.w}px` : '-');
/* ⭐ 出る大きさの表示（押す前に見える）が版面と合っているか */
const psay = await p.evaluate(() => (document.getElementById('pSize')||{}).textContent.replace(/\s+/g,' ').trim());
check(/2000 × 2000/.test(psay), '出る大きさが押す前に出ている', psay);
await slide('pzoom', 100); await slide('pox', 25); await wait(600);
const p2 = await shot();
check(!!p2 && p2.ink && p2.ink.x0 > p0.ink.x0 + 100, 'よこで右に寄る',
      p2 && p2.ink ? `x0 ${p0.ink.x0} → ${p2.ink.x0}` : '-');
await slide('pox', 0); await slide('poy', 25); await wait(600);
const p3 = await shot();
check(!!p3 && p3.ink && p3.ink.y0 < p0.ink.y0 - 100, 'たてで上に寄る',
      p3 && p3.ink ? `y0 ${p0.ink.y0} → ${p3.ink.y0}` : '-');
await slide('poy', 0); await wait(500);

console.log('\n── ⑤ 自動に戻す');
await setRatio('auto'); await wait(600);
const back = await shot();
check(!!back && a0 && back.w === a0.w && back.h === a0.h, '自動に戻すと元の大きさに戻る',
      back ? `${back.w}×${back.h}` : '-');

console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ 版面の形は全部通った');
if(errs.length) console.log(`🔴 JSエラー ${errs.length}件: ${errs.slice(0,3).join(' / ')}`);
await b.close();
process.exit(ng.length || errs.length ? 1 : 0);
