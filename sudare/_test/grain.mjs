/* ⭐ 簾［マス］「刻みも動かす」と「刻みの数の本当の上限」の回帰テスト（2026-08-20 新設）
   木下「刻みの数がゆいいつビット感からアニメーションとして追加できそう。動かすに追加できる？」
       「800まで数字があるけど、実際130ぐらいまでしか動きがない」
       「今の見え方に変化はさせないようにしてね」

   🔴 一番大事なのは【振れ0なら1画素も変わらない】こと。ここが崩れたら他が全部通っても失敗。
   見るのは：
     ① 振れ0＝黒の位置を動かしてもマスの数は1つも変わらない（今までどおり）
     ② 振れを上げても【位相0（黒の位置0）ではいまの絵のまま】＝いまの絵が片方の端
     ③ 位相を進めるとマスが粗くなる（数が減る）
     ④ 振れを0に戻すと【元の絵に完全に帰る】（盤のデータ sh.slices は書き換えていない）
     ⑤ 分け方「輪郭から」では効かない（刻みを使わない）
     ⑥ 刻みの上限＝マスのときだけ min(字の幅,高さ)÷2 に合う／板は800のまま
     ⑦ 上限より上に置いても絵は上限のときと同じ（＝丸めても見えは変わらない）
   ⚠️ 素の状態から始める（動画を焼いた後の TV.on / animOn に引っかかる）。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e=>errs.push(e.message));
await p.setViewport({width:1440,height:900,deviceScaleFactor:1});
await p.goto((process.argv[2]||'http://localhost:8406/sudare/masu/')+'?v='+Date.now(),{waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,2500));
const ng=[]; const check=(ok,n,note)=>{ console.log(`  ${ok?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!ok) ng.push(n); };

/* マス・字を抜く・輪郭から（木下の画面と同じ組み合わせ）にする */
await p.evaluate(()=>{
  const sh = S_();
  sh.txt = 'CAVOLO\nCAVOLO\nCAVOLO';
  document.getElementById('txt').value = sh.txt;
  Object.assign(sh, { dir:4, mstyle:0, mdir:2, slices:101, gap:0, minLen:4, kpos:0 });
  build(); syncUI();
});
await new Promise(r=>setTimeout(r,600));

/* 絵そのものを見る＝書き出しと同じ道（renderAll）で焼いた1枚を比べる */
const pic = (kpos, grain) => p.evaluate(async (kpos, grain)=>{
  P.grain = grain; S_().kpos = kpos;
  const c = renderAll();
  await new Promise(r=>setTimeout(r,20));
  return { url:c.toDataURL('image/png'), cells:(S_().CELLS||S_().RECTS||[]).length, slices:S_().slices };
}, kpos, grain);

/* ── ① 振れ0＝黒の位置を動かしてもマスの数は変わらない ── */
const a0 = await pic(0, 0), a50 = await pic(50, 0), a100 = await pic(100, 0);
check(a0.cells === a50.cells && a50.cells === a100.cells,
      '⭐振れ0＝黒の位置を動かしてもマスの数は変わらない', `${a0.cells}/${a50.cells}/${a100.cells}`);

/* ── ② 振れを上げても位相0ではいまの絵のまま ── */
const g0 = await pic(0, 60);
check(g0.url === a0.url && g0.cells === a0.cells,
      '⭐⭐振れを上げても【位相0＝いまの絵】のまま（1画素も違わない）', `マス ${g0.cells}`);

/* ── ③ 位相を進めると粗くなる ── */
const g50 = await pic(50, 60), g100 = await pic(100, 60);
check(g50.cells < g0.cells && g100.cells < g50.cells,
      '⭐位相を進めるほどマスが粗くなる', `${g0.cells} → ${g50.cells} → ${g100.cells}`);
check(g100.url !== a100.url, '同じ位相でも振れ0と振れ60で絵が違う');

/* ── ④ 振れを0に戻すと元の絵に完全に帰る ── */
const back50 = await pic(50, 0), back0 = await pic(0, 0);
check(back50.url === a50.url && back0.url === a0.url,
      '⭐⭐振れを0に戻すと元の絵に完全に帰る');
check(back0.slices === 101, '盤のデータ（刻みの数）は1つも書き換えていない', `刻み ${back0.slices}`);

/* ── ⑤ 「輪郭から」では効かない ── */
const dist = await p.evaluate(async ()=>{
  const sh = S_(); sh.dir = 3; build(); await new Promise(r=>setTimeout(r,400));
  P.grain = 100; sh.kpos = 0;  const a = renderAll().toDataURL('image/png');
  sh.kpos = 100; const b2 = renderAll().toDataURL('image/png');
  P.grain = 0;   sh.kpos = 100; const c = renderAll().toDataURL('image/png');
  return { same: b2 === c, differ: a !== b2 };
});
check(dist.same, '⭐「輪郭から」では刻みの振れが効かない（黒の位置だけが動く）');

/* ── ⑥ 刻みの上限 ── */
const cap = await p.evaluate(async ()=>{
  const sh = S_(); const r = document.getElementById('slices');
  sh.dir = 4; sh.mstyle = 0; sh.mdir = 0; sh.slices = 101; build(); syncUI();
  await new Promise(r2=>setTimeout(r2,300));
  const md = sh.MASKD;
  const want = Math.max(4, Math.min(800, Math.ceil(Math.min(md.W, md.H)/2)));
  const shown = document.getElementById('slicesCap');
  const masu = { max:+r.max, want, note:(shown.textContent||'').trim(), vis:shown.style.display };
  sh.dir = 0; build(); syncUI();
  await new Promise(r2=>setTimeout(r2,300));
  const ita = { max:+r.max, vis:document.getElementById('slicesCap').style.display };
  return { masu, ita };
});
check(cap.masu.max === cap.masu.want, '⭐マスの刻みの上限が【本当に効く数】に合っている',
      `上限 ${cap.masu.max}（式 ${cap.masu.want}）`);
check(cap.masu.vis !== 'none' && cap.masu.note.includes(String(cap.masu.want)),
      '上限を常時見えるところに出している', cap.masu.note.slice(0, 40));
check(cap.ita.max === 800 && cap.ita.vis === 'none', '⭐板のときは 800 のまま（下限が無いので本当に効く）',
      `上限 ${cap.ita.max}`);

/* ── ⑦ 上限より上に置いても絵は上限のときと同じ ── */
const same = await p.evaluate(async ()=>{
  const sh = S_(); sh.dir = 4; sh.mstyle = 0; sh.mdir = 0; P.grain = 0; sh.kpos = 0;
  const cap = Math.max(4, Math.ceil(Math.min(sh.MASKD.W, sh.MASKD.H)/2));
  sh.slices = cap;  build(); await new Promise(r=>setTimeout(r,200));
  const a = renderAll().toDataURL('image/png');
  sh.slices = 800;  build(); await new Promise(r=>setTimeout(r,200));
  const b2 = renderAll().toDataURL('image/png');
  return a === b2;
});
check(same, '⭐上限より上（800）に置いても上限のときと同じ絵＝丸めても見えは変わらない');

/* ── ⑧ 動画にもちゃんと乗る（実物を1本焼く） ──
   🔴 見るのは「エラーが出ない」ではなく ①コマごとにマスの粗さが本当に変わっているか
      ②撮ったあと画面が【元の絵に完全に戻る】か（＝盤を書き換えていない証拠）。
   ⚠️ headless は mp4 の器を取りに行けないので PNG連番で焼く。 */
await p.evaluate(()=>{
  const sh = S_();
  Object.assign(sh, { dir:4, mstyle:0, mdir:0, slices:101, gap:0, minLen:4, kpos:0 });
  build(); syncUI();
  window.__got = []; const oc = URL.createObjectURL;
  URL.createObjectURL = function(bb){ window.__got.push({ size:bb.size, type:bb.type }); return oc.call(URL, bb); };
  window.__cells = []; const _ra = renderAll;
  renderAll = function(x){ const o = _ra(x); window.__cells.push((S_().CELLS||S_().RECTS||[]).length); return o; };
  animStart = function(){};                                   // 画面は動かさない（位相は書き出し側が置く）
  const set = (id,v)=>{ const r=document.getElementById(id); r.value=v; r.dispatchEvent(new Event('input',{bubbles:true})); };
  set('grain', 80); set('speed', 30); set('fps', 8);
  document.querySelector('#tvFmt button[data-v="png"]').click();
  document.querySelector('#tvLoop button[data-v="1"]').click();
  document.querySelector('#tvLen button[data-v="1080"]').click();
});
await new Promise(r=>setTimeout(r,400));
const sig = () => p.evaluate(()=>{ const c=document.querySelector('canvas'), g2=c.getContext('2d');
  const d=g2.getImageData(0,0,c.width,c.height).data; let h=2166136261;
  for(let i=0;i<d.length;i+=4*13){ h ^= d[i]+d[i+1]*3+d[i+2]*7; h = Math.imul(h,16777619); }
  return h>>>0; });
const before = await sig();
await p.evaluate(()=>{ window.__cells.length = 0; document.getElementById('tvGo').click(); });
for(let i=0;i<240;i++){
  const done = await p.evaluate(()=>document.getElementById('tvGo').textContent === '動画を出す' && !TV.on);
  if(done && i>2) break;
  await new Promise(r=>setTimeout(r,500));
}
await new Promise(r=>setTimeout(r,600));
const after = await sig();
const got = await p.evaluate(()=>window.__got.filter(g2=>/zip/.test(g2.type)));
const cells = await p.evaluate(()=>window.__cells);
const uniq = new Set(cells.slice(2)).size;
check(got.length === 1 && got[0].size > 5000, '動画（PNG連番）が1本落ちた', got.map(z=>Math.round(z.size/1e3)+'KB').join());
check(uniq > 3, '⭐コマごとにマスの粗さが変わっている', `${uniq} 種類 / ${cells.length-2} コマ`);
check(before === after, '⭐⭐撮ったあと画面が元の絵に完全に戻る', `${before} → ${after}`);

console.log(errs.length?`  🔴 JSエラー: ${errs.slice(0,2).join(' / ')}`:'  ✅ JSエラーなし');
console.log(ng.length?`\n🔴 だめ ${ng.length}件`:'\n✅ 刻みも動かす・刻みの上限は全部通った');
await b.close(); process.exit(ng.length||errs.length?1:0);
