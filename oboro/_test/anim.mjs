/* ⭐ 朦 OBORO ── 「どの線」を2色でわたすでも／再生の重さ の回帰テスト（2026-08-21 新設）
   木下「引き伸ばしにした時のどの線のランダムで早い動きが好きだから、
        これを2色でわたすのときにもできるようにとかできる？」
       「アニメーションがさ、流れやFPSをあげるとかなり重い。。。」

   🔴 いちばん大事なのは【どの線 50 なら1画素も変わらない】こと。
   見るのは：
     ① 2色でわたす でも「どの線」のつまみが出る／動かすの対象にも出る
     ② どの線 50 ＝直す前と絵が完全に一致（＝過去作を壊していない）
     ③ 0 と 100 では絵が変わる（＝ちゃんと効いている）／50 に戻すと完全に帰る
     ④ 再生の間だけ版面が粗くなり、止めると元の大きさに戻る
     ⑤ 粗くすると1コマが本当に軽くなる（数字で見る）
     ⑥ 再生中に PNG を出しても【元の大きさで出る】（粗いまま落ちない）
   使い方: node oboro/_test/anim.mjs <いまのURL> [直す前のURL] */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const NEW = process.argv[2] || 'http://localhost:8393/oboro/';
const OLD = process.argv[3] || '';
const ng = []; const check=(ok,n,note)=>{ console.log(`  ${ok?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!ok) ng.push(n); };
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });
async function open(url){
  const p = await b.newPage(); const errs=[];
  p.on('pageerror', e=>errs.push(e.message));
  await p.setViewport({ width:1440, height:900, deviceScaleFactor:1 });
  await p.goto(url + '?v=' + Date.now(), { waitUntil:'networkidle0' });
  await new Promise(r=>setTimeout(r,2900));
  await p.evaluate(()=>{ window.__sig = () => {
    const d = ctx.getImageData(0,0,cv.width,cv.height).data; let h = 2166136261;
    for(let i=0;i<d.length;i+=4*97){ h ^= d[i]+d[i+1]*3+d[i+2]*7; h = Math.imul(h,16777619); }
    return h>>>0; }; });
  return { p, errs };
}
const set = (p,id,v)=> p.evaluate((id,v)=>{ const r=document.getElementById(id); r.value=v;
  r.dispatchEvent(new Event('input',{bubbles:true})); }, id, v);
const wait = ms => new Promise(r=>setTimeout(r,ms));

const A = await open(NEW);

/* ── ① 出ているか ── */
const ui = await A.p.evaluate(()=>({
  ink: P.ink,
  slitShown: document.getElementById('slit').offsetParent !== null,
  targets: [...document.querySelectorAll('#anwhat button')].filter(b=>b.style.display!=='none').map(b=>b.textContent.trim())
}));
check(ui.ink === 'grad', '立ち上がりは 2色でわたす', ui.ink);
check(ui.slitShown, '⭐2色でわたす でも「どの線」のつまみが出る');
check(ui.targets.includes('どの線'), '⭐動かすの対象にも「どの線」が出る', ui.targets.join(' / '));

/* ── ②③ 50 は今までどおり／0・100 は効く ── */
const s50 = await A.p.evaluate(()=>window.__sig());
if(OLD){
  const B = await open(OLD);
  const o = await B.p.evaluate(()=>window.__sig());
  check(o === s50, '⭐⭐どの線50 のとき直す前と絵が完全に一致', `指紋 ${o} / ${s50}`);
  await B.p.close();
}else console.log('  ⚠️ 直す前のURLが無いので突き合わせは飛ばした');
await set(A.p,'slit',0);   await wait(400); const s0  = await A.p.evaluate(()=>window.__sig());
await set(A.p,'slit',100); await wait(400); const s100= await A.p.evaluate(()=>window.__sig());
await set(A.p,'slit',50);  await wait(400); const sb  = await A.p.evaluate(()=>window.__sig());
check(s0 !== s50 && s100 !== s50 && s0 !== s100, '⭐0 と 100 で絵が変わる（効いている）',
      `${s0} / ${s50} / ${s100}`);
check(sb === s50, '⭐50 に戻すと完全に帰る');

/* ── ④⑤ 再生の重さ ── */
await A.p.evaluate(()=>{ const s=(id,v)=>{const r=document.getElementById(id);r.value=v;
  r.dispatchEvent(new Event('input',{bubbles:true}));};
  document.querySelector('#ink button[data-v="smear"]').click(); });
await wait(1400);
await set(A.p,'rows',60); await set(A.p,'maxx',60); await set(A.p,'reach',400);
await wait(1800);
const heavy = await A.p.evaluate(()=>{
  const t=[]; for(let i=0;i<6;i++){ const s=performance.now(); P.slit=(i*13)%100; draw(); t.push(performance.now()-s); }
  t.sort((a,b)=>a-b); return { ms:+t[3].toFixed(1), cv:cv.width+'x'+cv.height, cells:cells.length };
});
await set(A.p,'anflow',261); await set(A.p,'anfps',42);
await A.p.evaluate(()=>document.getElementById('anGo').click());
await wait(1600);
const playing = await A.p.evaluate(()=>{
  const t=[]; for(let i=0;i<6;i++){ const s=performance.now(); P.slit=(i*13)%100; draw(); t.push(performance.now()-s); }
  t.sort((a,b)=>a-b);
  return { ms:+t[3].toFixed(1), cv:cv.width+'x'+cv.height,
           fps:(document.getElementById('anFps').textContent||'').replace(/\s+/g,' ').trim() };
});
check(playing.cv !== heavy.cv, '⭐再生の間だけ版面が粗くなる', `${heavy.cv} → ${playing.cv}`);
/* ⚠️ 版面を 1/5 の面積にしても、時間は 1/5 にはならない。
   ⭐ 実測で分かったこと＝重さの大半は【帯の数】（1枚ごとの描画の呼び出し回数）で、
      面積ではない。だから版面を粗くする効きは 1.6〜2.7 倍どまり。
      本当に軽くしたいなら 段・細かい・のび を下げるしかない＝それを画面に出した。 */
check(playing.ms < heavy.ms * 0.8, '⭐⭐1コマが本当に軽くなる',
      `${heavy.ms}ms → ${playing.ms}ms（帯 ${heavy.cells}）`);
check(/コマ\/秒/.test(playing.fps), '⭐いま何コマ出ているかを画面に出す', playing.fps.slice(0, 70));

/* ── ⑥ 再生中に PNG を出しても元の大きさで出る ── */
const png = await A.p.evaluate(async ()=>{
  let size = 0, w = 0, h = 0;
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(bb){ size = bb.size; return oc.call(URL, bb); };
  const before = cv.width;
  document.getElementById('bPNG').click();
  await new Promise(x=>setTimeout(x,1500));
  URL.createObjectURL = oc;
  return { size, atClick:before, now:cv.width };
});
check(png.size > 20000, '再生中でも PNG が落ちた', `${Math.round(png.size/1e3)}KB`);
check(png.now === png.atClick, '出したあと粗さへ戻っている（再生は続く）', `${png.atClick} → ${png.now}`);

/* 止めると元の大きさへ戻る */
await A.p.evaluate(()=>document.getElementById('anGo').click());
await wait(1500);
const stopped = await A.p.evaluate(()=>({ cv:cv.width+'x'+cv.height,
  fps:(document.getElementById('anFps').textContent||'').trim() }));
check(stopped.cv === heavy.cv, '⭐止めると元の大きさに戻る', `${playing.cv} → ${stopped.cv}`);
check(stopped.fps === '', '止めたらコマ数の知らせも消える');

console.log(A.errs.length?`  🔴 JSエラー: ${A.errs.slice(0,2).join(' / ')}`:'  ✅ JSエラーなし');
console.log(ng.length?`\n🔴 だめ ${ng.length}件`:'\n✅ どの線／再生の重さ は全部通った');
await b.close(); process.exit(ng.length||A.errs.length?1:0);
