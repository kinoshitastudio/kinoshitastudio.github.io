/* 🔴🔴 控え（JSON）の往復で【位置がずれない】か（2026-08-26）
   木下＝「なぜかJSON保存して開きなおすと位置がずれてるな」（YAW -18026° の画面つき）
   ⭐ 正体＝移動（cam.px/py）が控えに入っていなかった。開くと 0 に戻る。
   ⚠️ 直す前の版では必ず落ちる。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || path.join(HERE, '..', 'index.html');
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); let err = 0;
p.on('pageerror', e => { err++; console.log('🔴 JSエラー:', e.message); });
await p.setViewport({ width:1200, height:800, deviceScaleFactor:1 });
await p.goto('file://' + decodeURIComponent(FILE), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3500));

const R = await p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  /* ⚠️⭐ この道具は TAPE（通す）の粒が【時間で】動くので、そのままだと揺らぎが 2600画素も出て
     「位置が戻ったか」の判定にならない（ぶれる試験は落ちない試験より悪い）。
     ⭐ 測る前に、測りたいもの以外を止める＝TAPE を切る。 */
  const tapeHead = document.querySelector('[data-unit="tape"] .unit-head');
  if(tapeHead && !document.querySelector('[data-unit="tape"]').classList.contains('off')) tapeHead.click();
  await new Promise(r => setTimeout(r, 600));
  const cv0 = [...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0];
  const r = cv0.getBoundingClientRect();
  const ev = (t,x,y,extra) => cv0.dispatchEvent(new PointerEvent(t,
    Object.assign({ clientX:x, clientY:y, button:0, buttons:1, bubbles:true, pointerId:1, pointerType:'mouse' }, extra||{})));
  /* 線を引く（切り抜くものを作る） */
  ev('pointerdown', r.left + r.width*0.34, r.top + r.height*0.42);
  for(let i=1;i<=12;i++){ ev('pointermove', r.left + r.width*(0.34+0.30*i/12), r.top + r.height*0.42); await wait(24); }
  ev('pointerup', r.left + r.width*0.64, r.top + r.height*0.42);
  await wait(900);
  /* 「移動」に持ち替えて盤を動かす＝ここが控えに入っていなかった所 */
  const pan = document.getElementById('btn-pan'); if(pan) pan.click();
  await wait(200);
  ev('pointerdown', r.left + r.width*0.5, r.top + r.height*0.5);
  for(let i=1;i<=10;i++){ ev('pointermove', r.left + r.width*(0.5+0.16*i/10), r.top + r.height*(0.5-0.14*i/10)); await wait(24); }
  ev('pointerup', r.left + r.width*0.66, r.top + r.height*0.36);
  await wait(900);
  if(pan) pan.click();                       /* 引くに戻す */

  const grab = () => { const c=document.createElement('canvas'); c.width=cv0.width; c.height=cv0.height;
    c.getContext('2d').drawImage(cv0,0,0);
    const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    const o=[]; for(let i=0;i<d.length;i+=4*7) o.push(d[i]); return o; };
  const before = grab();
  /* ⚠️ この道具は滲みの蓄積で毎回わずかに違う＝【揺らぎ】を先に測ってから前後を比べる */
  await wait(900);
  const before2 = grab();

  /* 控える＝Blob を横取り */
  const grabbed = [];
  const o = URL.createObjectURL.bind(URL);
  URL.createObjectURL = bb => { grabbed.push(bb); return o(bb); };
  document.getElementById('btn-save').click();
  for(let i=0;i<60 && !grabbed.length;i++) await wait(200);
  if(!grabbed.length) return { 無し:'控えが出なかった' };
  const text = await grabbed[grabbed.length-1].text();

  /* 別の向きにずらしてから読み戻す＝本当に戻っているかを見る */
  ev('pointerdown', r.left + r.width*0.4, r.top + r.height*0.4, { button:2, buttons:2 });
  ev('pointermove', r.left + r.width*0.7, r.top + r.height*0.6, { button:2, buttons:2 });
  ev('pointerup',   r.left + r.width*0.7, r.top + r.height*0.6, { button:2, buttons:2 });
  await wait(1200);
  const moved = grab();

  /* 読む＝file input に流し込む */
  const inp = document.getElementById('file-json');
  const dt = new DataTransfer();
  dt.items.add(new File([text], 'hori2.json', { type:'application/json' }));
  inp.files = dt.files;
  inp.dispatchEvent(new Event('change', { bubbles:true }));
  await wait(2500);
  const after = grab();
  /* ⭐⭐ 画素で「戻ったか」を見ようとしたが、この道具は時間で動くものが多く
     揺らぎが 2000画素も出て判定にならなかった（ぶれる試験は落ちない試験より悪い）。
     ⭐ だから【控えの中身どうし】を比べる＝読み戻したあと、もう一度控えて同じか。
        画素の揺らぎに左右されず、しかも「本当に戻ったか」を直接見ている。 */
  grabbed.length = 0;
  document.getElementById('btn-save').click();
  for(let i=0;i<60 && !grabbed.length;i++) await wait(200);
  const text2 = grabbed.length ? await grabbed[grabbed.length-1].text() : '';

  const diff = (A,B)=>{let n=0;for(let i=0;i<Math.min(A.length,B.length);i++) if(Math.abs(A[i]-B[i])>8) n++; return n;};
  const j1 = JSON.parse(text), j2 = text2 ? JSON.parse(text2) : null;
  const near = (a,b)=> a==null||b==null ? false : Math.abs(a-b) < 0.5;
  const camSame = j2 && near(j1.cam.px, j2.cam.px) && near(j1.cam.py, j2.cam.py)
                     && near(j1.cam.az, j2.cam.az) && near(j1.cam.dist, j2.cam.dist);
  return { ずれ:diff(before, after), 動かしたとき:diff(before, moved),
           揺らぎ:diff(before, before2), 控えのcam:j1.cam || {},
           読み戻したcam: j2 ? j2.cam : null, camSame, 見た画素:before.length };
});
await b.close();
let ng = 0;
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng++; };
console.log('── 控え（JSON）の往復');
if(R.無し){ console.log('  🔴 ' + R.無し); process.exit(1); }
ok(err === 0, 'JSエラーが出ない', err + '件');
ok('px' in R.控えのcam && 'py' in R.控えのcam, '控えに【移動（px/py）】が入っている',
   JSON.stringify(R.控えのcam));
ok(Math.abs(R.控えのcam.az) <= Math.PI*2 + 0.001, '角度が1周ぶんに畳まれている',
   (R.控えのcam.az*180/Math.PI).toFixed(1) + '°');
ok(R.動かしたとき > 200, '（前提）ずらしたら絵は変わっている', R.動かしたとき + '画素');
/* ⚠️ 画素は揺らぎ（時間で動くもの）で判定にならない＝控えの中身どうしで見る */
ok(R.camSame, '控えを読むと【控えた通りの位置】に戻る',
   `控え ${JSON.stringify(R.控えのcam)} → 読み戻し ${JSON.stringify(R.読み戻したcam)}`);
console.log(`     （参考：画素のずれ ${R.ずれ} ／ 揺らぎ ${R.揺らぎ} ／ ずらしたとき ${R.動かしたとき}）`);
process.exit(ng ? 1 : 0);
