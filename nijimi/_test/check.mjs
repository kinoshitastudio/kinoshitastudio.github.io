/* ⭐ 滲 NIJIMI の回帰テスト（2026-08-17・版面＝出る形を選べるようにしたときに新設）
   🔴 この道具は WebGL ＋ `type="module"`＝**中の変数は外から読めない**。
      さらに `preserveDrawingBuffer:false` なので**画面の canvas を読むと真っ黒**（「! まず読む」）。
      ⭐ だから測るのは【落ちてきた実物】＝PNG・PNG連番の中のコマ・mp4 の中の寸法。
   見るのは：
     ① 起動する（WebGL・JSエラーなし）
     ② 既定は正方＝2048×2048（今までと同じ）
     ③ 版面（4:5 / 9:16 / 16:9）で PNG の実寸が変わる
     ④ 動画（PNG連番・mp4）も同じ形で出る
     ⑤ 絵の大きさ・よこ・たて が効き、0 に戻すと元の絵に戻る
     ⑥ ⌥＋ドラッグは版面が動くだけ（筆で塗らない） */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL0 = process.argv[2] || 'http://localhost:8410/nijimi/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1440, height:900, deviceScaleFactor:1 });
await p.goto(URL0 + '?v=' + Date.now(), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3000));

const ng = [];
const check = (ok, name, note) => { console.log(`  ${ok ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!ok) ng.push(name); };
const wait = ms => new Promise(r => setTimeout(r, ms));
/* 落ちてくるものを横取り（PNG も zip も mp4 も Blob で来る） */
await p.evaluate(() => { window.__got = [];
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(x){ if(x instanceof Blob) window.__got.push(x); return oc.call(URL, x); }; });

const setRatio = v => p.evaluate(x => document.querySelector(`#seg-pratio button[data-v="${x}"]`).click(), v);
const slide = (id, val) => p.evaluate(o => { const r = document.getElementById(o.id);
  r.value = o.val; r.dispatchEvent(new Event('input', { bubbles:true })); }, { id, val });
/* PNG を1枚出して、実物の幅×高さを読む */
const png = async () => {
  await p.evaluate(() => { window.__got.length = 0; document.getElementById('b-export').click(); });
  await wait(2500);
  return p.evaluate(async () => {
    const b2 = window.__got.find(x => /png/.test(x.type)); if(!b2) return null;
    const bmp = await createImageBitmap(b2);
    return { w:bmp.width, h:bmp.height, kb:Math.round(b2.size/1024) };
  });
};

console.log('── ① 起動');
check(errs.length === 0, 'JSエラーなし', errs.join(' / '));
const cv0 = await p.evaluate(() => [document.getElementById('c').width, document.getElementById('c').height]);
check(cv0[0] > 8 && Math.abs(cv0[0]-cv0[1]) < 2, '盤が立ち上がって正方', cv0.join('×'));

console.log('\n── ② 既定は正方（今までと同じ）');
const s0 = await png();
check(!!s0 && s0.w === 2048 && s0.h === 2048, 'PNG は 2048×2048', s0 ? `${s0.w}×${s0.h}・${s0.kb}KB` : '落ちてこない');

console.log('\n── ③ 版面で PNG の形が変わる');
for(const [v, w, h] of [['4:5',1638,2048], ['9:16',1152,2048], ['16:9',2048,1152], ['3:4',1536,2048]]){
  await setRatio(v); await wait(800);
  const s = await png();
  check(!!s && Math.abs(s.w-w) < 3 && Math.abs(s.h-h) < 3, `${v} は ${w}×${h}`, s ? `${s.w}×${s.h}` : '落ちてこない');
  const cv = await p.evaluate(() => [document.getElementById('c').width, document.getElementById('c').height]);
  check(Math.abs((cv[1]/cv[0]) - (h/w)) < 0.08, `${v} で盤も同じ形になる`, cv.join('×'));
}

console.log('\n── ④ 動画も同じ形で出る');
/* PNG連番＝zip の中のコマを読む（zip は無圧縮 store なので PNG の IHDR がそのまま入っている） */
const frame = async () => {
  await p.evaluate(() => {
    window.__got.length = 0;
    document.querySelector('#tvFmt button[data-v="png"]').click();
    document.querySelector('#tvSz button[data-v="px"]').click();
    const px = document.getElementById('tvPx'); px.value = 256; px.dispatchEvent(new Event('input', { bubbles:true }));
    const fl = document.getElementById('s-flow'); fl.value = 250; fl.dispatchEvent(new Event('input', { bubbles:true }));
    document.getElementById('tvGo').click();
  });
  for(let i = 0; i < 40; i++){ await wait(700);
    const n = await p.evaluate(() => window.__got.filter(x => /zip/.test(x.type)).length); if(n) break; }
  return p.evaluate(async () => {
    const z = window.__got.find(x => /zip/.test(x.type)); if(!z) return null;
    const u = new Uint8Array(await z.arrayBuffer());
    for(let i = 0; i < u.length-16; i++){
      if(u[i] === 73 && u[i+1] === 72 && u[i+2] === 68 && u[i+3] === 82){      // 'IHDR'
        const g = o => (u[i+4+o]<<24)|(u[i+5+o]<<16)|(u[i+6+o]<<8)|u[i+7+o];
        return { w:g(0), h:g(4) };
      }
    }
    return null;
  });
};
await setRatio('9:16'); await wait(700);
const f1 = await frame();
check(!!f1 && f1.h > f1.w && Math.abs(f1.h/f1.w - 16/9) < 0.15, '9:16 の動画のコマも縦長', f1 ? `${f1.w}×${f1.h}` : '出てこない');
/* mp4 ＝ 'avc1' の直後から幅・高さを読む */
const mp4 = await (async () => {
  await p.evaluate(() => {
    window.__got.length = 0;
    document.querySelector('#tvFmt button[data-v="mp4"]').click();
    const px = document.getElementById('tvPx'); px.value = 270; px.dispatchEvent(new Event('input', { bubbles:true }));
    document.getElementById('tvGo').click();
  });
  for(let i = 0; i < 40; i++){ await wait(700);
    const n = await p.evaluate(() => window.__got.filter(x => /mp4|video/.test(x.type)).length); if(n) break; }
  return p.evaluate(async () => {
    const m = window.__got.find(x => /mp4|video/.test(x.type)); if(!m) return null;
    const u = new Uint8Array(await m.arrayBuffer());
    for(let i = 0; i < u.length-40; i++){
      if(u[i] === 0x61 && u[i+1] === 0x76 && u[i+2] === 0x63 && u[i+3] === 0x31){   // 'avc1'
        const o = i+4+24, w = (u[o]<<8)|u[o+1], h = (u[o+2]<<8)|u[o+3];
        if(w > 0 && h > 0 && w < 8192 && h < 8192) return { w, h, kb:Math.round(m.size/1024) };
      }
    }
    return null;
  });
})();
check(!!mp4 && mp4.h > mp4.w, 'mp4 の中身も縦長', mp4 ? `${mp4.w}×${mp4.h}・${mp4.kb}KB` : '出てこない／読めない');

console.log('\n── ⑤ 絵の大きさ・移動');
await setRatio('1:1'); await wait(700);
const base = await png();
await slide('s-pzoom', 60); await wait(700);
const small = await png();
check(!!small && small.kb !== base.kb, '絵の大きさを下げると絵が変わる', `${base.kb}KB → ${small.kb}KB`);
await slide('s-pzoom', 100); await slide('s-pox', 25); await wait(700);
const moved = await png();
check(!!moved && moved.kb !== base.kb, 'よこが効く', `${base.kb}KB → ${moved.kb}KB`);
await slide('s-pox', 0); await slide('s-poy', -25); await wait(700);
const moved2 = await png();
check(!!moved2 && moved2.kb !== base.kb, 'たてが効く', `${base.kb}KB → ${moved2.kb}KB`);
await slide('s-poy', 0); await wait(700);
const back = await png();
/* ⭐ 場そのものは動かしていないので、0 に戻せば元の絵に戻る */
check(!!back && back.kb === base.kb, '⭐0 に戻すと元の絵に戻る（場は動いていない）', `${back.kb}KB`);

console.log('\n── ⑥ ⌥＋ドラッグは版面が動くだけ');
const box = await p.evaluate(() => { const r = document.getElementById('c').getBoundingClientRect();
  return { x:r.x, y:r.y, w:r.width, h:r.height }; });
const ox0 = await p.evaluate(() => +document.getElementById('s-pox').value);
await p.mouse.move(box.x + box.w*0.5, box.y + box.h*0.5);
await p.keyboard.down('Alt');
await p.mouse.down(); await p.mouse.move(box.x + box.w*0.5 + 80, box.y + box.h*0.5 + 40, { steps:8 }); await p.mouse.up();
await p.keyboard.up('Alt');
await wait(600);
const ox1 = await p.evaluate(() => +document.getElementById('s-pox').value);
check(ox1 !== ox0, '⌥＋ドラッグで版面が動く', `よこ ${ox0} → ${ox1}`);
const drawn = await png();
await p.evaluate(() => { const r = document.getElementById('s-pox'); r.value = 0; r.dispatchEvent(new Event('input', { bubbles:true }));
  const r2 = document.getElementById('s-poy'); r2.value = 0; r2.dispatchEvent(new Event('input', { bubbles:true })); });
await wait(700);
const after = await png();
/* ⭐ 筆が入っていたら、位置を戻しても絵は元に戻らない＝塗っていないことの証拠 */
check(!!after && after.kb === base.kb, '⌥＋ドラッグでは塗っていない（戻すと元の絵）', `${drawn.kb}KB → ${after.kb}KB（元 ${base.kb}KB）`);

console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ 全部通った');
if(errs.length) console.log(`🔴 JSエラー ${errs.length}件: ${errs.slice(0,3).join(' / ')}`);
await b.close();
process.exit(ng.length || errs.length ? 1 : 0);
