/* ⭐⭐ 名NA に【顔】を足す（2026-08-28）
   木下＝「tkinoshita84 の X のアイコンは masu で作ったアイコンなんだが、
   あんな感じで顔文字というかキャラに見えそうなのも作れるようにして」

   ⭐⭐ 顔に見えるかどうかは【並びの型】で決まる。
     でたらめに記号を並べても顔にはならない（いまの ふつう／荒い はそれ）。
     型＝ 手 ・ 囲み ・（髪）・ 目 ・ 口 ・ 目 ・ 囲み ・ 手。
   ⚠️ 左右の囲みと手は【同じ番号】で取る＝対にならないと崩れる。
   ⭐ 名NA の芯は変えない＝**同じ種なら必ず同じ題**／**道具の漢字が入る（辿れる）**。
   使い方: node na/_test/face.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1200, height:900, deviceScaleFactor:1 });
await p.goto(process.argv[2], { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 2500));
const R = await p.evaluate(async () => {
  const w = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  const btn = document.querySelector('#wild button[data-v="face"]');
  out.段がある = !!btn;
  if(!btn) return out;
  const t0 = document.getElementById('title').textContent;
  btn.click(); await w(400);
  out.顔 = document.getElementById('title').textContent;
  /* 種を変えて10個出す */
  const list = [];
  for(let i=0;i<10;i++){
    S.seed = 1000 + i*37; draw();
    list.push(document.getElementById('title').textContent);
    await w(60);
  }
  out.見本 = list;
  /* 同じ種なら同じ（名NA の芯） */
  S.seed = 1000; draw(); const a1 = document.getElementById('title').textContent;
  S.seed = 2000; draw();
  S.seed = 1000; draw(); const a2 = document.getElementById('title').textContent;
  out.同じ種なら同じ = a1 === a2;
  /* 漢字が入る（辿れる） */
  out.漢字が入る = /[暈刃蝕貼粒礫面組簾枡累鋳擦押朧膜彫襞塗滲網点玉作連]/.test(a1);
  /* 荒いに戻せる */
  document.querySelector('#wild button[data-v="wild"]').click(); await w(300);
  out.戻せる = document.getElementById('title').textContent !== out.顔;
  return out;
});
await b.close();
let ng = 0;
const ok = (c,n,note)=>{ console.log(`  ${c?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!c) ng++; };
console.log('── ⭐⭐ 名NA の【顔】');
ok(errs.length === 0, 'JSエラーが出ない', errs.length + '件' + (errs[0] ? ' → ' + errs[0] : ''));
ok(R.段がある, '⭐ 荒さに【顔】がある');
/* ⭐ 顔の型＝囲みが対になっていること（左と右が同じ番号で出ている）を見る */
const L = '(（[｛〈《⦅⁽⌈｟⌜', Rr = ')）]｝〉》⦆⁾⌉｠⌝';
const paired = t => { for(let i=0;i<L.length;i++){ if(t.includes(L[i]) && t.includes(Rr[i])) return true; } return false; };
const okn = (R.見本 || []).filter(paired).length;
ok(okn >= 8, '⭐⭐ 出てくる題が【顔の型】になっている（囲みが対で出る）',
   `${okn}/${(R.見本||[]).length} 例：${(R.見本||[])[0]}`);
ok(R.同じ種なら同じ, '⭐ 同じ種なら必ず同じ題（名NA の芯）');
ok(R.漢字が入る, '⭐ 道具の漢字が入る＝顔でも【辿れる】');
ok(R.戻せる, '⚠️ 荒いに戻せる（顔は1つの段であって、置き換えではない）');
process.exit(ng ? 1 : 0);
