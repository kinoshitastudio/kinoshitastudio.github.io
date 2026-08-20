/* ⭐ 簾［マス］「流す」と「速さ」の回帰テスト（2026-08-20 新設）
   🔴 木下「デフォルトは動かす速さ0なのに、流すを押した瞬間自動的に30になる」
      ＝【速さ】が動きのスイッチを兼ねていた（止める＝0に戻す／流す＝0なら30に上げる）。
   ⭐ 守る規則は1つ＝**動きの入切は「流す」だけ・速さは速さしか決めない**。
   だから見るのは6つ：
     ① 開いた瞬間に勝手に動いていない（既定が30でも止まっている）
     ② 流すを押しても【速さの数字が1も動かない】  ← 木下が言ったのはこれ
     ③ 押したらちゃんと動く（＝押したのに動かない、を作らない）
     ④ 止めても速さが0に戻らない（次に押せばまた動く）
     ⑤ 速さを上げただけでは動き出さない
     ⑥ 流している最中に速さ0にしても【流している状態は残る】＝上げれば続く
   ⚠️ 動きの検査は素の状態から（動画を焼いた後の TV.on / animOn に引っかかる）。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e=>errs.push(e.message));
await p.setViewport({width:1440,height:900,deviceScaleFactor:1});
await p.goto((process.argv[2]||'http://localhost:8406/sudare/masu/')+'?v='+Date.now(),{waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,2500));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ng=[]; const check=(ok,n,note)=>{ console.log(`  ${ok?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!ok) ng.push(n); };

/* 画面に出ている速さ（つまみ・数字・P の3つが食い違っていないか一度に見る） */
const spd = () => p.evaluate(()=>{ const r=document.getElementById('speed');
  return { ui:+r.value, txt:r.parentElement.querySelector('.val').textContent.trim(), P:+P.speed,
           on:!!animOn, label:document.getElementById('animGo').textContent.trim(),
           kpos:Math.round(S_().kpos) }; });

/* ── ① 開いた瞬間は止まっている ── */
const a0 = await spd();
check(a0.P > 0, '既定の速さが【動く値】になっている', `速さ ${a0.P}`);
check(a0.ui === a0.P && a0.txt === String(a0.P), 'つまみ・数字・中身が揃っている', `${a0.ui}/${a0.txt}/${a0.P}`);
const k0 = a0.kpos; await wait(900); const k0b = (await spd()).kpos;
check(!a0.on && k0 === k0b && a0.label === '流す', '⭐開いた瞬間は動いていない', `黒の位置 ${k0} → ${k0b}`);

/* ── ② 流すを押しても速さの数字が動かない ── */
await p.evaluate(()=>document.getElementById('animGo').click());
await wait(200);
const a1 = await spd();
check(a1.P === a0.P && a1.ui === a0.ui && a1.txt === a0.txt,
      '⭐⭐流すを押しても【速さ】が1も動かない', `${a0.P} → ${a1.P}`);
check(a1.on && a1.label === '止める', 'ボタンが「止める」になった', a1.label);

/* ── ③ 押したらちゃんと動く ── */
await wait(900);
const a2 = await spd();
check(a2.kpos !== a1.kpos, '押したら黒の位置が動く', `${a1.kpos} → ${a2.kpos}`);

/* ── ④ 止めても速さが0に戻らない ── */
await p.evaluate(()=>document.getElementById('animGo').click());
await wait(300);
const a3 = await spd();
check(a3.P === a0.P && a3.ui === a0.ui, '⭐止めても【速さ】が0に戻らない', `速さ ${a3.P}`);
const k3 = a3.kpos; await wait(700); const k3b = (await spd()).kpos;
check(!a3.on && k3 === k3b && a3.label === '流す', '止めたら本当に止まる', `${k3} → ${k3b}`);

/* ── ⑤ 速さを上げただけでは動き出さない ── */
await p.evaluate(()=>{ const r=document.getElementById('speed'); r.value=55;
  r.dispatchEvent(new Event('input',{bubbles:true})); });
await wait(800);
const a4 = await spd();
const k4 = a4.kpos; await wait(700); const k4b = (await spd()).kpos;
check(a4.P === 55 && !a4.on && k4 === k4b, '⭐速さを上げただけでは動き出さない', `速さ55 / 黒の位置 ${k4} → ${k4b}`);

/* ── ⑥ 流している最中に速さ0＝その場で止まるが「流している」は残る ── */
await p.evaluate(()=>document.getElementById('animGo').click());
await wait(600);
await p.evaluate(()=>{ const r=document.getElementById('speed'); r.value=0;
  r.dispatchEvent(new Event('input',{bubbles:true})); });
await wait(700);
const a5 = await spd(); const k5 = a5.kpos; await wait(700); const a5b = await spd();
check(a5.on && a5.label === '止める' && k5 === a5b.kpos,
      '⭐速さ0はその場で止まるだけ（流している状態は残る）', `${k5} → ${a5b.kpos} / ${a5.label}`);
await p.evaluate(()=>{ const r=document.getElementById('speed'); r.value=40;
  r.dispatchEvent(new Event('input',{bubbles:true})); });
await wait(900);
const a6 = await spd();
check(a6.kpos !== a5b.kpos, '⭐0から上げるとそのまま続きが動く', `${a5b.kpos} → ${a6.kpos}`);

/* ── ⑦ 古い控え（速さ0で保存されている）を読んでも押せば動く ── */
await p.evaluate(()=>{ document.getElementById('animGo').click();      // まず止める
  applyP(JSON.stringify({ P:{ bg:P.bg, speed:0, fps:30 } })); });
await wait(1200);
const a7 = await spd();
check(a7.P > 0 && !a7.on, '⭐速さ0の古い控えは既定に戻る（押しても動かない、を作らない）', `速さ ${a7.P}`);

console.log(errs.length?`  🔴 JSエラー: ${errs.slice(0,2).join(' / ')}`:'  ✅ JSエラーなし');
console.log(ng.length?`\n🔴 だめ ${ng.length}件`:'\n✅ 流すと速さは全部通った');
await b.close(); process.exit(ng.length||errs.length?1:0);
