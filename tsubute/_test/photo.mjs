/* ⭐⭐ 写真から形を作る ── 礫TSUBUTE（2026-08-28）
   ⭐⭐ 形が決まるのは glyphDots ひとつ＝字の代わりに写真の明暗を焼く。
     積み・向き・色・地は1行も変えていない。
   ⚠️ この道具は <script type="module">＝中の値を外から読めない。
      だから hori2/_test/svgin.mjs と同じで【実物の入口にファイルを渡して、画素で測る】。
   見るのは：
     ① 写真を渡すと絵が変わる（＝形が拾えている）
     ② しきいを動かすと絵が変わる
        （🔴 覚えた粒の鍵に しきい・反転 を入れないと、触っても何も起きない＝ここが落とし穴）
     ③ 反転（暗い方を形に）で絵が変わる
     ④ 写真を外すと字の絵に戻る
   ⭐ 余白が形にならないこと（黒のままだと四角い塊になる）は、
      同じ形をしている 粒TSUBU 側（tsubu/_test/photo.mjs）で升目の左右を数えて確かめている。
   使い方: node tsubute/_test/photo.mjs <URL> */
import fs from 'fs';
import os from 'os';
import path from 'path';
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); let err = 0;
p.on('pageerror', e => { err++; console.log('🔴 JSエラー:', e.message); });
await p.setViewport({ width:1200, height:820, deviceScaleFactor:1 });
await p.goto(process.argv[2], { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 4500));

/* いちばん大きい canvas（＝作品の盤）を間引いて読む */
const big = () => p.evaluate(() => {
  const el = [...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0];
  const c = document.createElement('canvas'); c.width = el.width; c.height = el.height;
  c.getContext('2d').drawImage(el, 0, 0);
  const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  const o = []; for(let i=0;i<d.length;i+=4*7) o.push(d[i]); return o;
});
const diff = (A,B) => { let n=0; for(let i=0;i<Math.min(A.length,B.length);i++) if(Math.abs(A[i]-B[i])>8) n++; return n; };
const knob = (name, to) => p.evaluate(([nm,t]) => {
  const r = document.querySelector('[data-p="'+nm+'"]'); if(!r) return false;
  r.value = t; r.dispatchEvent(new Event('input', { bubbles:true })); return true;
}, [name, String(to)]);

let ng = [];
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note != null ? '  ' + note : ''}`); if(!c) ng.push(name); };

/* ⭐⭐ 測りたいものだけが動く状態を先に作る ── 地は毎コマ流れていて、
   そのままだと【揺らぎ】が本物の変化と同じくらい出る（実測 64875 画素）。
   ⚠️ 触るのは地の流れだけ＝字・積み・色には手を出さない。 */
await knob('gspeed', 0);
await new Promise(r=>setTimeout(r,1500));
const a0 = await big(); await new Promise(r=>setTimeout(r,800)); const a1 = await big();
const yure = diff(a0, a1);

/* 渡す写真＝白地に黒い丸（横長）。⭐ 横長にするのは、升目の上下に大きな余白が残るから */
const PNG = path.join(os.tmpdir(), 'tsubute_test_photo.png');
const b64 = await p.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 400; c.height = 130;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0,0,400,130);
  g.fillStyle = '#111';
  g.beginPath(); g.arc(120,65,52,0,7); g.fill();
  g.beginPath(); g.arc(270,65,40,0,7); g.fill();
  return c.toDataURL('image/png').split(',')[1];
});
fs.writeFileSync(PNG, Buffer.from(b64, 'base64'));

ok(!!(await p.$('#bPh')) && !!(await p.$('[data-p="pthr"]')) && !!(await p.$('[data-seg="pinv"]')),
   '入口（写真から形を作る／しきい／反転）がある');
ok(await p.evaluate(() => document.getElementById('phUI').style.display === 'none'),
   '写真を置くまでは つまみを出さない');

const inp = await p.$('#fPh');
if(!inp){ console.log('  🔴 写真を渡す入口（#fPh）が無い'); await b.close(); process.exit(1); }
await inp.uploadFile(PNG);
await new Promise(r => setTimeout(r, 3500));
const s1 = await big();
ok(diff(a1, s1) > yure * 3 + 200, '写真を渡すと絵が変わる', `${diff(a1,s1)} 画素（揺らぎ ${yure}）`);
ok(await p.evaluate(() => document.getElementById('phUI').style.display !== 'none'),
   '写真を渡すと しきい・反転が出てくる');

await knob('pthr', 60);  await new Promise(r=>setTimeout(r,2500)); const s2 = await big();
ok(diff(s1, s2) > yure * 3 + 200, 'しきいを動かすと絵が変わる（覚えた粒の鍵に入っている）',
   `${diff(s1,s2)} 画素（揺らぎ ${yure}）`);

await knob('pthr', 128); await new Promise(r=>setTimeout(r,2000));
const s3 = await big();
await p.evaluate(() => document.querySelectorAll('[data-seg="pinv"] button')[1].click());
await new Promise(r=>setTimeout(r,2500)); const s4 = await big();
ok(diff(s3, s4) > yure * 3 + 200, '【暗い方を形に】で絵が変わる', `${diff(s3,s4)} 画素（揺らぎ ${yure}）`);

await p.evaluate(() => document.getElementById('bPhOff').click());
await new Promise(r=>setTimeout(r,3000)); const s5 = await big();
ok(diff(s5, a1) < yure * 3 + 400, '写真を外すと字の絵に戻る', `${diff(s5,a1)} 画素（揺らぎ ${yure}）`);
ok(await p.evaluate(() => document.getElementById('txt').value === '礫'
     && document.getElementById('phUI').style.display === 'none'), '字の欄も つまみも 元に戻る');
ok(err === 0, 'JSエラーが出ない', err + '件');

await b.close();
process.exit(ng.length ? 1 : 0);
