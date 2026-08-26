/* ⭐⭐ うねる向き＝魚のように身をくねらせる（2026-08-26）
   木下＝「Hori2のオブジェクトの動きが、スピンや、音に合わせて動くだが
   オブジェクト単体を別の動きで動けるようにしたい。魚のように、身動かしたりとか？」

   ⭐ うねりの式はもう有り、違うのは【振る向き】だけだった。
      0＝厚みの向き（いままでの絵）／100＝帯の幅の向き＝身をくねらせる。
   見るのは：
     ① 波の高さが 0 なら、向きを変えても1画素も動かない（＝いままでの絵を壊していない）
     ② 厚み→泳ぐ で絵が変わる（＝向きが効いている）
   ⚠️ 直す前の版には waveDir が無いので ② が落ちる。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); let err=0;
p.on('pageerror', e => { err++; console.log('🔴', e.message); });
await p.setViewport({ width:1200, height:800, deviceScaleFactor:1 });
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || path.join(HERE, '..', 'index.html');
await p.goto('file://' + decodeURIComponent(FILE), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3500));
const R = await p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const cv0=[...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0];
  for(const k of ['tape','bleed']){ const u=document.querySelector(`[data-unit="${k}"]`);
    if(u && !u.classList.contains('off')) u.querySelector('.unit-head').click(); }
  await wait(400);
  const t=document.getElementById('typeText'); if(t) t.value='泳';
  document.getElementById('btn-type').click(); await wait(1800);
  const grab=()=>{const c=document.createElement('canvas');c.width=cv0.width;c.height=cv0.height;
    c.getContext('2d').drawImage(cv0,0,0);
    const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    const o=[];for(let i=0;i<d.length;i+=4*7)o.push(d[i]);return o;};
  const diff=(A,B)=>{let n=0;for(let i=0;i<A.length;i++) if(Math.abs(A[i]-B[i])>8)n++;return n;};
  const knob=(k,v)=>{const r=document.querySelector('[data-p="'+k+'"]');
    if(r){const u=r.closest('.unit'); if(u&&u.classList.contains('off'))u.querySelector('.unit-head').click();
      r.value=v; r.dispatchEvent(new Event('input',{bubbles:true}));}};
  const out={};
  /* 🔴🔴 2026-08-26 ── ここで【まだ組み上がっていない絵】を土台にしていた。
     機械が混んでいると字の組み直しが 1800ms で終わらず、揺らぎが 13841画素と出て
     そのあとの判定が全部その数字に引きずられた（＝ぶれる試験＝狼少年）。
     ⭐ 落ち着くまで撮り続けてから土台にする（[[feedback_prove_no_change_by_pixels]]）。 */
  let a = grab();
  for(let i = 0; i < 20; i++){
    await wait(500);
    const b2 = grab();
    if(diff(a, b2) < 200){ a = b2; break; }
    a = b2;
  }
  await wait(700); out.揺らぎ=diff(a,grab());
  /* ⚠️⚠️ 波は【時間で動く】ので、そのままだと「向きを変えたから変わった」のか
     「波が進んだから変わった」のか分からない（直す前の版でも 11946画素 出て通ってしまった）。
     ⭐ 測る前に波の速さを 0 にする＝測りたいものだけが動く状態を作る。 */
  knob('speed', 0); await wait(600);
  knob('wave',0); knob('waveDir',100); await wait(1200);
  out['波0で向きを変えても不動']=diff(a,grab());
  knob('wave',80); knob('waveDir',0); await wait(1500);
  const b1=grab();
  knob('waveDir',100); await wait(1500);
  out['厚み→泳ぐ で絵が変わる']=diff(b1,grab());
  /* ⭐ 🐟 1押しで泳ぐ（2026-08-26 木下「魚のような動きってあれは入れてない感じ？」
     ＝入っていたが、波の高さ 0 のままだと向きを動かしても何も起きなかった） */
  const sw = document.getElementById('bSwim');
  if(!sw){ out.ボタンが無い = true; return out; }
  knob('wave',0); knob('waveDir',0); knob('speed',0); await wait(900);
  const c0 = grab();
  sw.click(); await wait(1500);
  out['1押しで泳ぐ'] = diff(c0, grab());
  out['足りない物も入る'] = { 向き:+document.querySelector('[data-p="waveDir"]').value,
                              波:+document.querySelector('[data-p="wave"]').value,
                              速さ:+document.querySelector('[data-p="speed"]').value };
  out['印が点く'] = document.getElementById('bSwim').textContent.includes('泳いでいる');
  sw.click(); await wait(1200);
  out['もう一度で厚みに戻る'] = +document.querySelector('[data-p="waveDir"]').value;
  return out;
});
await b.close();
let ng = 0;
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng++; };
console.log('── うねる向き（魚のように身をくねらせる）');
ok(err === 0, 'JSエラーが出ない', err + '件');
ok(R['波0で向きを変えても不動'] <= Math.max(R.揺らぎ, 20),
   '波の高さ 0 なら向きを変えても1画素も動かない',
   `${R['波0で向きを変えても不動']}画素（揺らぎ ${R.揺らぎ}）`);
ok(R['厚み→泳ぐ で絵が変わる'] > Math.max(R.揺らぎ*3, 2000),
   '厚み → 泳ぐ で絵が変わる（向きが効いている）',
   `${R['厚み→泳ぐ で絵が変わる']}画素`);
if(R.ボタンが無い){ ok(false, '🐟 魚のように泳がせる（#bSwim）が有る'); process.exit(1); }
ok(R['1押しで泳ぐ'] > Math.max(R.揺らぎ*3, 2000),
   '⭐ 1押しで泳ぐ（波・速さが 0 でも絵が動く）', `${R['1押しで泳ぐ']}画素`);
ok(R['足りない物も入る'].向き === 100 && R['足りない物も入る'].波 > 0 && R['足りない物も入る'].速さ > 0,
   '⭐ 足りない物（波の高さ・速さ）も一緒に入る', JSON.stringify(R['足りない物も入る']));
ok(R['印が点く'], '押したら印が点く（いま泳いでいると分かる）');
ok(R['もう一度で厚みに戻る'] === 0, 'もう一度押すと厚みの向き（いままでの絵）に戻る');
process.exit(ng ? 1 : 0);
