/* ⭐ 朦 OBORO 動画で出す ── 「秒で」を足したときの回帰テスト（2026-08-20 新設）
   木下「3往復までしかなく、他ツール同様秒数まで決めれるようにして」

   🔴 一番大事なのは【1往復・2往復・3往復のときの出方が前と1文字も変わっていない】こと。
      だから直す前（HEAD）を別ポートに立てて、押す前に出る文字（#tvSize）ごと突き合わせる。
   見るのは：
     ① 1/2/3往復 の 出る大きさ・コマ数・秒・往復 が【直す前と完全に同じ】
     ② 「秒で」を選んだときだけ 秒のつまみが出る（触れるのに効かないつまみを出さない）
     ③ 欲しい秒に対して【いちばん近い整数の往復】に寄っている＝継ぎ目のないループが守られる
     ④ 流れを変えると同じ秒でも往復の数が変わる（1往復にかかる秒は流れで決まる）
     ⑤ 「秒で」で実際に1本焼ける（PNG連番）
   使い方: node oboro/_test/movie.mjs <いまのURL> <直す前のURL>
   ⚠️ headless は mp4 の器を取りに行けないので PNG連番で焼く。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const NEW = process.argv[2] || 'http://localhost:8373/oboro/';
const OLD = process.argv[3] || '';
const ng = []; const check = (ok,n,note)=>{ console.log(`  ${ok?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!ok) ng.push(n); };

async function open(url){
  const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e=>errs.push(e.message));
  await p.setViewport({width:1440,height:900,deviceScaleFactor:1});
  await p.goto(url + '?v=' + Date.now(), { waitUntil:'networkidle0' });
  await new Promise(r=>setTimeout(r,2500));
  return { b, p, errs };
}
/* ⭐ 物差しは【押す前に画面に出ている文字】＝木下が見ているものと同じ */
const setFlow = (p, flow, fps) => p.evaluate((flow, fps)=>{
  const set = (id,v)=>{ const r=document.getElementById(id); r.value=v; r.dispatchEvent(new Event('input',{bubbles:true})); };
  set('anflow', flow); set('anfps', fps);
}, flow, fps);
const pickLoop = (p, v) => p.evaluate(v => document.querySelector(`#tvLoop button[data-v="${v}"]`)?.click(), v);
const sizeText = p => p.evaluate(()=> (document.getElementById('tvSize').textContent||'').replace(/\s+/g,' ').trim());

const A = await open(NEW);
await setFlow(A.p, 100, 30);

/* ── ① 1/2/3往復 が前と同じ ── */
if(OLD){
  const B = await open(OLD);
  await setFlow(B.p, 100, 30);
  for(const v of ['1','2','3']){
    await pickLoop(A.p, v); await pickLoop(B.p, v);
    await new Promise(r=>setTimeout(r,150));
    const a = await sizeText(A.p), b2 = await sizeText(B.p);
    check(a === b2, `⭐${v}往復の出方が直す前と同じ`, a === b2 ? a : `いま[${a}] / 前[${b2}]`);
  }
  if(B.errs.length) console.log('  ⚠️ 直す前 JSエラー:', B.errs.slice(0,2).join(' / '));
  await B.b.close();
} else console.log('  ⚠️ 直す前のURLが無いので突き合わせは飛ばした');

/* ── ② 秒のつまみの出し分け ── */
await pickLoop(A.p, '1'); await new Promise(r=>setTimeout(r,120));
const hidden = await A.p.evaluate(()=>getComputedStyle(document.getElementById('tvSecRow')).display);
await pickLoop(A.p, 'sec'); await new Promise(r=>setTimeout(r,120));
const shown = await A.p.evaluate(()=>getComputedStyle(document.getElementById('tvSecRow')).display);
check(hidden === 'none' && shown !== 'none', '⭐「秒で」のときだけ秒のつまみが出る', `${hidden} → ${shown}`);

/* ══⭐ ③④ 「秒で」＝**指定した秒ちょうど**（2026-08-21 に規則が変わった）══
   🔴 ここは前まで【いちばん近い整数の往復へ寄る】【流れを上げると往復が増える】を見ていた。
      その後「秒は【1往復を引き伸ばす】＋ゆらぎ」に変わった（繰り返しに見えるのをやめた）ので、
      試験がずっと落ちたままになっていた＝**規則が変わったら、見るものを入れ替える**。
   ⭐ いまの約束＝出る秒はつまみの秒ちょうど／コマ数＝秒×fps／
      流れを変えても秒は動かない（速さは画面と同じで、足りない分はゆらぎが埋める）。 */
const read = () => sizeText(A.p).then(t=>{
  const m = t.match(/(\d+) コマ・([\d.]+)秒・(\d+)fps・(ゆらぎ[^<]*|\d+往復)/);
  return m ? { total:+m[1], sec:+m[2], fps:+m[3], how:m[4], t } : { t };
});
const setSec = (v) => A.p.evaluate(v=>{ const r=document.getElementById('tvSec'); r.value=v;
  r.dispatchEvent(new Event('input',{bubbles:true})); }, v);
for(const want of [3, 6, 12, 20]){
  await setSec(want); await new Promise(r=>setTimeout(r,150));
  const r = await read();
  if(!r.total){ check(false, `${want}秒 の読み取り`, r.t); continue; }
  check(Math.abs(r.sec - want) < 0.06 && r.total === Math.round(want * r.fps),
        `⭐${want}秒 → 秒ちょうど・コマ数も合う`, `${r.total}コマ・${r.sec}秒・${r.fps}fps`);
  check(/ゆらぎ/.test(r.how), '　⭐「往復」ではなく【ゆらぎ】と書く（1往復と出すと嘘になる）', r.how);
}
/* 秒の数字がつまみの横に出ているか */
const secVal = await A.p.evaluate(()=>document.querySelector('#tvSecRow .val').textContent.trim());
check(secVal === '20', '秒の数字がつまみと合っている', secVal);

/* ── ④ 流れを変えても【秒は動かない】（速さは画面と同じ・足りない分はゆらぎ） ── */
await setFlow(A.p, 200, 30); await setSec(12); await new Promise(r=>setTimeout(r,200));
const fast = await read();
await setFlow(A.p, 50, 30);  await setSec(12); await new Promise(r=>setTimeout(r,200));
const slow = await read();
check(fast.sec === slow.sec && fast.total === slow.total,
      '⭐流れを変えても【秒とコマ数は動かない】（速さは画面と同じ）',
      `流れ200 → ${fast.sec}秒/${fast.total}コマ ／ 流れ50 → ${slow.sec}秒/${slow.total}コマ`);

/* ── ⑤ 「秒で」で実際に1本焼ける ── */
await setFlow(A.p, 150, 12); await setSec(2); await new Promise(r=>setTimeout(r,250));
await A.p.evaluate(()=>{
  window.__got = []; const oc = URL.createObjectURL;
  URL.createObjectURL = function(b){ window.__got.push({ size:b.size, type:b.type }); return oc.call(URL, b); };
  document.querySelector('#tvFmt button[data-v="png"]').click();
  document.querySelector('#tvSz button[data-v="1080"]').click();
  document.getElementById('tvGo').click();
});
for(let i=0;i<240;i++){
  const done = await A.p.evaluate(()=>document.getElementById('tvGo').textContent !== 'やめる');
  if(done && i>3) break;
  await new Promise(r=>setTimeout(r,500));
}
await new Promise(r=>setTimeout(r,800));
const got = await A.p.evaluate(()=>window.__got.filter(g=>/zip/.test(g.type)));
const msg = await sizeText(A.p);
check(got.length === 1 && got[0].size > 5000, '⭐「秒で」で動画（PNG連番）が1本落ちた',
      got.map(z=>Math.round(z.size/1e3)+'KB').join());
check(!/🔴/.test(msg), '理由つきで止まっていない', msg.slice(0, 60));

console.log(A.errs.length?`  🔴 JSエラー: ${A.errs.slice(0,2).join(' / ')}`:'  ✅ JSエラーなし');
console.log(ng.length?`\n🔴 だめ ${ng.length}件`:'\n✅ 動画で出す（秒で）は全部通った');
await A.b.close(); process.exit(ng.length||A.errs.length?1:0);
