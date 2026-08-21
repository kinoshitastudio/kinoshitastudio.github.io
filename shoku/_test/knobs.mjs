/* ⭐ 蝕 SHOKU の回帰テスト ── つまみ総当たり＋出す＋戻す
   🔴 見るのは「エラーが出ない」ではない。次を数字で見る。
     ① 全部のつまみを実際に動かして【絵が変わるか】（触れるのに効かないつまみを出さない）
     ② 渡りを進めると【A の字から B の字へ本当に入れ替わるか】（この道具の芯）
     ③ PNG が落ちる／控えが往復する／⌘Z で戻る
     ④ 0 に戻したら元の絵に完全に帰る（＝盤のデータを書き換えていない）
   ⚠️ 1つ試すごとに元へ戻す（戻さないと以降ぜんぶ「変わらない」と誤検出する）。
   使い方: node shoku/_test/knobs.mjs <ポート|公開URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const ARG = process.argv[2] || '8393';
const BASE = /^https?:/.test(ARG) ? ARG.replace(/\/+$/,'') : `http://localhost:${ARG}`;
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e=>errs.push(e.message));
await p.setViewport({ width:1280, height:800, deviceScaleFactor:1 });
await p.goto(`${BASE}/shoku/?v=${Date.now()}`, { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,2600));
const ng=[]; const check=(ok,n,note)=>{ console.log(`  ${ok?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!ok) ng.push(n); };

/* 絵の指紋＝書き出しと同じ道（paint）で焼いた1枚から取る＝画面の都合に左右されない */
await p.evaluate(()=>{
  window.__sig = () => {
    const c = document.createElement('canvas'); c.width = 420; c.height = 190;
    paint(c.getContext('2d'), 420, 190, false);
    const d = c.getContext('2d').getImageData(0,0,420,190).data;
    let h = 2166136261, ink = 0;
    for(let i=0;i<d.length;i+=4){ if(d[i] > 127) ink++; h ^= d[i] + i; h = Math.imul(h, 16777619); }
    return { h: h>>>0, ink };
  };
});
const sig = () => p.evaluate(()=>window.__sig());

const base = await sig();
check(base.ink > 500, '字が出ている', `白い画素 ${base.ink}`);

/* ── ① つまみ総当たり ── */
/* ⚠️ 動かす・動画のためのつまみ（速さ・コマ・動画の秒）は【1コマ目の絵】には出ない。
   絵が変わらないのが正しい（触れるのに効かない、ではない）＝ここでは見ない。 */
const SKIP = ['fps', 'speed', 'tvSec'];
/* ⚠️ 出ていないつまみは見ない（出し分けているものを「効かない」と誤検出しないため） */
const ids = await p.evaluate(()=>[...document.querySelectorAll('#panel input[type=range]')]
  .filter(r=> r.offsetParent !== null).map(r=>r.id));
const dead = [];
for(const id of ids){
  if(SKIP.includes(id)) continue;
  const r = await p.evaluate(async (id)=>{
    const el = document.getElementById(id);
    const keep = el.value;
    const lo = +el.min, hi = +el.max;
    /* いまの値から【いちばん遠い端】へ振る＝必ず大きく動く */
    const to = (Math.abs(+keep - lo) > Math.abs(+keep - hi)) ? lo : hi;
    el.value = to; el.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(x=>setTimeout(x,120));
    const after = window.__sig();
    el.value = keep; el.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(x=>setTimeout(x,120));
    const back = window.__sig();
    return { to, after, back };
  }, id);
  if(r.after.h === base.h) dead.push(id);
  if(r.back.h !== base.h) dead.push(id + '（戻らない）');
}
check(dead.length === 0, '⭐全部のつまみが効いて、戻すと元に帰る', dead.length ? dead.join(' / ') : `${ids.length-SKIP.length} 本`);

/* ── ② 渡り＝A の字から B の字へ入れ替わる（この道具の芯）── */
const cross = await p.evaluate(async ()=>{
  const set = (id,v)=>{ const r=document.getElementById(id); r.value=v; r.dispatchEvent(new Event('input',{bubbles:true})); };
  set('nAmp', 0); set('eat', 0); set('wob', 0);          // 帯の効果を消して、入れ替わりだけを見る
  await new Promise(x=>setTimeout(x,150));
  set('pos', -70); await new Promise(x=>setTimeout(x,120));
  const before = window.__sig();
  set('pos', 170); await new Promise(x=>setTimeout(x,120));
  const after = window.__sig();
  /* 同じ語を両方に入れたら、渡り切った絵は完全に一致するはず */
  const ta = document.getElementById('txtA'), tb = document.getElementById('txtB');
  const kb = tb.value; tb.value = ta.value; tb.dispatchEvent(new Event('input',{bubbles:true}));
  await new Promise(x=>setTimeout(x,300));
  set('pos', -70); await new Promise(x=>setTimeout(x,120));
  const sameA = window.__sig();
  set('pos', 170); await new Promise(x=>setTimeout(x,120));
  const sameB = window.__sig();
  tb.value = kb; tb.dispatchEvent(new Event('input',{bubbles:true}));
  await new Promise(x=>setTimeout(x,300));
  return { before, after, sameA, sameB };
});
/* ⚠️ MOOD と DOOM は同じ字の並べ替え＝白い画素の数はほぼ同じになる。
   ⭐ だから「量」ではなく【指紋】で見る（数だけ見ると入れ替わっていなくても通ってしまう）。 */
check(cross.before.h !== cross.after.h, '⭐⭐渡り切ると別の字になっている',
      `指紋 ${cross.before.h} → ${cross.after.h}（白い画素 ${cross.before.ink} → ${cross.after.ink}）`);
check(cross.sameA.h === cross.sameB.h, '⭐同じ語を両方に入れたら、渡っても同じ絵（＝ずれていない）');

/* ── ③ 出す・控え・⌘Z ── */
const out = await p.evaluate(async ()=>{
  window.__oc = window.__oc || URL.createObjectURL;
  window.__got = [];
  URL.createObjectURL = function(bb){ window.__got.push({ size:bb.size, type:bb.type }); return window.__oc.call(URL, bb); };
  document.querySelector('#expk button[data-k="1080"]').click();
  document.getElementById('png').click();
  await new Promise(x=>setTimeout(x,1400));
  document.getElementById('pngA').click();
  await new Promise(x=>setTimeout(x,1400));
  document.getElementById('save').click();
  await new Promise(x=>setTimeout(x,400));
  return window.__got;
});
check(out.filter(o=>/png/.test(o.type)).length === 2, 'PNG が2枚（地あり・地なし）落ちた',
      out.filter(o=>/png/.test(o.type)).map(o=>Math.round(o.size/1e3)+'KB').join(' / '));
check(out.some(o=>/json/.test(o.type)), '控えが落ちた');

const undo = await p.evaluate(async ()=>{
  const before = window.__sig();
  const r = document.getElementById('cut');
  r.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));   // ⭐ 掴んだ瞬間に1回だけ積む
  r.value = 60; r.dispatchEvent(new Event('input',{bubbles:true}));
  await new Promise(x=>setTimeout(x,150));
  const moved = window.__sig();
  dispatchEvent(new KeyboardEvent('keydown',{ key:'z', metaKey:true, bubbles:true }));
  await new Promise(x=>setTimeout(x,400));
  return { before, moved, after: window.__sig() };
});
check(undo.moved.h !== undo.before.h && undo.after.h === undo.before.h, '⭐⌘Z で1つ戻る');

/* ── ④ 寄る・動かす（ボードのズーム）── ⭐ 絵を拡大するのではなく【地形を読む位置】を変える */
const zoom = await p.evaluate(async ()=>{
  const cvv = document.getElementById('cv');
  const r = cvv.getBoundingClientRect();
  const cx = r.left + r.width/2, cy = r.top + r.height/2;
  const z0 = VIEW.zoom, x0 = VIEW.x;
  /* ⭐ 見るのは「VIEW.x が動かないこと」ではない（絵の箱はパネルを避けて置いてあるので、
     画面の真ん中＝絵の真ん中ではない）。⭐【カーソルの下にある絵の点が動かないこと】を見る。 */
  const d0 = cv.width / cv.clientWidth;
  const uv = (m)=>({ u:((cx - cvv.getBoundingClientRect().left)*d0 - m.ox)/m.dw,
                     v:((cy - cvv.getBoundingClientRect().top )*d0 - m.oy)/m.dh });
  const before = uv(MAP);
  cvv.dispatchEvent(new WheelEvent('wheel',{ clientX:cx, clientY:cy, deltaY:-600, bubbles:true, cancelable:true }));
  await new Promise(x=>setTimeout(x,300));
  const zIn = VIEW.zoom;
  const after = uv(MAP);
  const drift = Math.max(Math.abs(after.u - before.u), Math.abs(after.v - before.v));
  /* ドラッグで動く */
  const xAfterZoom = VIEW.x;
  cvv.dispatchEvent(new PointerEvent('pointerdown',{ pointerId:1, clientX:cx, clientY:cy, bubbles:true }));
  cvv.dispatchEvent(new PointerEvent('pointermove',{ pointerId:1, clientX:cx+120, clientY:cy, bubbles:true }));
  cvv.dispatchEvent(new PointerEvent('pointerup',{ pointerId:1, clientX:cx+120, clientY:cy, bubbles:true }));
  await new Promise(x=>setTimeout(x,300));
  const moved = VIEW.x;
  /* ダブルクリックで正面に戻る */
  cvv.dispatchEvent(new MouseEvent('dblclick',{ bubbles:true }));
  await new Promise(x=>setTimeout(x,300));
  return { z0, zIn, drift, moved, afterZoomX:xAfterZoom, back:{ z:VIEW.zoom, x:VIEW.x, y:VIEW.y } };
});
check(zoom.zIn > zoom.z0 * 1.3, '⭐ホイールで寄れる', `${zoom.z0} → ${zoom.zIn.toFixed(2)}倍`);
check(zoom.drift < 0.005, '⭐⭐カーソルの下の点が動かない（そこを見失わない）', `ずれ ${zoom.drift.toFixed(5)}`);
check(Math.abs(zoom.moved - zoom.afterZoomX) > 0.02, 'ドラッグで動く', `よこ ${zoom.moved.toFixed(3)}`);
check(zoom.back.z === 1 && zoom.back.x === 0 && zoom.back.y === 0, '⭐ダブルクリックで正面に戻る');

/* ── ⑤ 動画で出す（PNG連番で実際に1本焼く）── ⚠️ headless は mp4 の器を取りに行けない */
const mov = await p.evaluate(async ()=>{
  /* 🔴 差し替えを重ねると【1回の呼び出しが2回数えられる】（前の節でも差し替えているため）。
     ⭐ 元を1つだけ控えて、毎回そこから付け直す。 */
  window.__oc = window.__oc || URL.createObjectURL;
  window.__got = [];
  URL.createObjectURL = function(bb){ window.__got.push({ size:bb.size, type:bb.type }); return window.__oc.call(URL, bb); };
  const set = (id,v)=>{ const r=document.getElementById(id); r.value=v; r.dispatchEvent(new Event('input',{bubbles:true})); };
  set('speed', 60); set('fps', 8);
  document.querySelector('#tvFmt button[data-v="png"]').click();
  document.querySelector('#tvLoop button[data-v="1"]').click();
  document.querySelector('#tvLen button[data-v="1080"]').click();
  const shown = document.getElementById('tvSize').textContent;
  const keep = P.pos;
  window.__phase = [];
  const _paint = paint;
  paint = function(...a){ if(TV.on) window.__phase.push(P.pos); return _paint(...a); };
  document.getElementById('tvGo').click();
  for(let i=0;i<200;i++){
    if(document.getElementById('tvGo').textContent === '動画を出す' && !TV.on && i>3) break;
    await new Promise(x=>setTimeout(x,400));
  }
  await new Promise(x=>setTimeout(x,600));
  paint = _paint;
  return { shown, got:window.__got.filter(o=>/zip/.test(o.type)), msg:document.getElementById('tvSize').textContent,
           phase:window.__phase, keep, now:P.pos };
});
check(/コマ/.test(mov.shown) && /往復/.test(mov.shown), '押す前にコマ数・秒・大きさが出ている',
      mov.shown.replace(/\s+/g,' ').trim().slice(0,60));
check(mov.got.length === 1 && mov.got[0].size > 5000, '⭐動画（PNG連番）が1本落ちた',
      mov.got.map(z=>Math.round(z.size/1e3)+'KB').join());
check(!/🔴/.test(mov.msg), '理由つきで止まっていない', mov.msg.replace(/\s+/g,' ').slice(0,60));
/* ⭐ 頭と尻が合う＝1コマ目と「最後の次」が同じ位置に戻る三角の波か */
const ph = mov.phase;
check(ph.length > 4, 'コマを実際に焼いた', `${ph.length} コマ`);
if(ph.length > 4){
  let turns = 0, dir = 0, jump = 0;
  for(let i=1;i<ph.length;i++){ const d = ph[i]-ph[i-1];
    jump = Math.max(jump, Math.abs(d));
    if(d === 0) continue;
    const s = Math.sign(d); if(dir && s !== dir) turns++; dir = s; }
  check(turns === 1, '⭐渡りが 行って戻る（三角）だけ＝継ぎ目のないループ', `向きが変わった回数 ${turns}`);
  check(Math.abs(ph[0] - (-70)) < 1e-6, '1コマ目が端（頭）', String(ph[0].toFixed(2)));
}
check(Math.abs(mov.now - mov.keep) < 1e-6, '⭐撮ったあと渡りが元に戻る', `${mov.keep} → ${mov.now}`);

console.log(errs.length?`  🔴 JSエラー: ${errs.slice(0,2).join(' / ')}`:'  ✅ JSエラーなし');
console.log(ng.length?`\n🔴 だめ ${ng.length}件`:'\n✅ 蝕 SHOKU は全部通った');
await b.close(); process.exit(ng.length||errs.length?1:0);
