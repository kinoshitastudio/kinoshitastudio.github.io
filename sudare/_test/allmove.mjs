/* ⭐ 簾［マス］「すべての版を同じように動かす」の回帰テスト（2026-08-18 新設）
   木下「字を追加した際に、すべての字を動かすなどのボタンをチェックすれば
        アニメーションがすべて同じように動くことは可能か？」
   🔴 見るのは：切＝選んだ版だけ動く（値がばらける）／入＝全部が同じ値で動く。
   ⚠️ 動きの検査は【素の状態から】始める（動画を焼いた後の TV.on / animOn に引っかかる）。
   ⚠️ 画面も動画も同じ式（P.animAll ? SHEETS : [sh]）を通る＝ここで守れば両方守れる。 */
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
/* 版を2枚にする */
/* ⭐ 版を足すのは #addSeg の「＋ 字」 */
await p.evaluate(()=>document.querySelector('#addSeg button[data-add="text"]').click());
await wait(1500);
const n = await p.evaluate(()=>SHEETS.length);
check(n>=2, `版が2枚以上になった`, `${n}枚`);
const kposes = () => p.evaluate(()=>SHEETS.map(s=>Math.round(s.kpos)));
/* 切のとき＝選んでいる版だけ動く */
await p.evaluate(()=>{ const c=document.getElementById('animAll'); c.checked=false; c.dispatchEvent(new Event('change',{bubbles:true}));
  SHEETS.forEach(s=>s.kpos=50); const r=document.getElementById('speed'); r.value=40; r.dispatchEvent(new Event('input',{bubbles:true})); });
await wait(1500);
const off = await kposes();
check(new Set(off).size > 1, '切＝選んだ版だけ動く（値がばらける）', JSON.stringify(off));
/* 入のとき＝全部同じ */
await p.evaluate(()=>{ const c=document.getElementById('animAll'); c.checked=true; c.dispatchEvent(new Event('change',{bubbles:true})); });
await wait(1500);
const on1 = await kposes(); await wait(800); const on2 = await kposes();
check(new Set(on1).size === 1 && new Set(on2).size === 1 && on1[0] !== on2[0],
      '⭐入＝すべての版が同じ値で動く', `${JSON.stringify(on1)} → ${JSON.stringify(on2)}`);
console.log(errs.length?`  🔴 JSエラー: ${errs.slice(0,2).join(' / ')}`:'  ✅ JSエラーなし');
console.log(ng.length?`\n🔴 だめ ${ng.length}件`:'\n✅ 全部通った');
await b.close(); process.exit(ng.length||errs.length?1:0);
