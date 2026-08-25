/* ⭐⭐ SVG を置く（2026-08-25 木下「Sakuji のパスをそのまま Hori2 に入れ込んでも
   同じようなエフェクトやシルエット・粒などは維持したい。無理なのか？」）

   見るのは「読めた」ではなく、【引いた線と同じものになっているか】を画素で数える：
     ① SVG を入れると線が置かれる（本数・点数が出る）
     ② 入れると絵が変わる
     ③ 彫る（EXTRUDE）を動かすと変わる ＝ 立体として扱われている
     ④ 粒にする を動かすと変わる ＝ 質感もそのまま効く
     ⑤ 「SVG を消す」で入れる前に戻る（手で引いた線と混ざっていない）
   ⚠️ 直す前の版には #svgFile が無いので、この試験はちゃんと落ちる。
   ⚠️ 見本の SVG は曲線・複数パス・transform 入り（SAKUJI から出るものに近い形）。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SVG  = path.join(HERE, 'sample.svg');
const FILE = process.argv[2] || path.join(HERE, '..', 'index.html');

const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); let err = 0;
p.on('pageerror', e => { err++; console.log('🔴 JSエラー:', e.message); });
await p.setViewport({ width:1200, height:820, deviceScaleFactor:1 });
await p.goto('file://' + decodeURIComponent(FILE), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 4500));

const big = () => p.evaluate(() => {
  const el = [...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0];
  const c = document.createElement('canvas'); c.width = el.width; c.height = el.height;
  c.getContext('2d').drawImage(el, 0, 0);
  const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  const o = []; for(let i=0;i<d.length;i+=4*7) o.push(d[i]); return o;
});
const diff = (A,B) => { let n=0; for(let i=0;i<Math.min(A.length,B.length);i++) if(Math.abs(A[i]-B[i])>8) n++; return n; };
const info = () => p.evaluate(() => (document.getElementById('svgInfo')||{}).textContent || '');
const knob = (name, to) => p.evaluate(([nm, t]) => {
  const r = document.querySelector('[data-p="'+nm+'"]'); if(!r) return false;
  const u = r.closest('.unit');
  if(u && u.classList.contains('off')) u.querySelector('.unit-head').click();
  r.value = (t === 'max') ? r.max : t;
  r.dispatchEvent(new Event('input', { bubbles:true })); return true;
}, [name, to]);

let ng = [];
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng.push(name); };

/* ⚠️ この道具は滲みの蓄積で毎回わずかに違う＝揺らぎを先に測る */
const a0 = await big(); await new Promise(r=>setTimeout(r,700)); const a1 = await big();
const yure = diff(a0, a1);

const inp = await p.$('#svgFile');
if(!inp){ console.log('  🔴 SVG を読む入口（#svgFile）が無い'); await b.close(); process.exit(1); }
await inp.uploadFile(SVG);
await new Promise(r => setTimeout(r, 3500));
const s1 = await big();
const txt = await info();
ok(/(\d+) 本/.test(txt), 'SVG を入れると線が置かれる', txt);
ok(diff(a1, s1) > yure * 3 + 500, '入れると絵が変わる', `${diff(a1,s1)}画素（揺らぎ ${yure}）`);

await knob('depth', 'max'); await new Promise(r => setTimeout(r, 2500));
const s2 = await big();
ok(diff(s1, s2) > yure * 3 + 500, '彫る を動かすと変わる＝立体として扱われている', `${diff(s1,s2)}画素`);

await knob('grid', 'max'); await new Promise(r => setTimeout(r, 2500));
const s3 = await big();
ok(diff(s2, s3) > yure * 3 + 500, '粒にする を動かすと変わる＝質感もそのまま効く', `${diff(s2,s3)}画素`);

await p.evaluate(() => document.getElementById('btn-unsvg').click());
await new Promise(r => setTimeout(r, 2500));
const s4 = await big();
ok((await info()).indexOf('まだ') >= 0, '「SVG を消す」で入れる前の表示に戻る');
ok(err === 0, 'JSエラーが出ない', err + '件');
await b.close();
process.exit(ng.length ? 1 : 0);
