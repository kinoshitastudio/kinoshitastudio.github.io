/* ⭐⭐ 写真から形を作る ── 塗NURI（2026-08-28）
   ⭐⭐ この道具の形は【場（濃さ）】ひとつ＝字を焼くのと同じ所に写真の明暗を焼く。
     筆・色・玉・出すには1行も触っていない（＝写真の形を玉の粒で埋める）。
   見るのは：
     ① ＋写真から形 で版が1枚増え、場に形が入る
     ② しきいを動かすと形が変わる
     ③ 【暗い方を形に】で逆になる
     ④ 版面の外（写真を置いていない所）は形にならない
        🔴 透明を除かずに切ると、暗い方を形にした瞬間に版面いっぱいが塗りになる
     ⑤ 写真の版にも筆で足せる（この道具の芯を殺していない）
   ⭐ 物差しは本体と同じ場（L.A）から取る。
   使い方: node nuri/_test/photo.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); let errs = 0;
p.on('pageerror', e => { errs++; console.log('🔴 JSエラー:', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(process.argv[2], { waitUntil:'networkidle0' });
await p.evaluate(() => { try{ localStorage.clear(); }catch(_){} });
await p.reload({ waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 2000));

let ng = [];
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note != null ? '  ' + note : ''}`); if(!c) ng.push(name); };

/* いま選んでいる版の【場】を読む（本体と同じ L.A） */
const field = () => p.evaluate(() => {
  const L = curLay(); if(!L) return null;
  let n = 0, 左 = 1e9, 右 = -1, 上 = 1e9, 下 = -1;
  for(let y = 0; y < FH; y++) for(let x = 0; x < FW; x++){
    if(L.A[y*FW + x] > 0.5){ n++;
      if(x < 左) 左 = x; if(x > 右) 右 = x; if(y < 上) 上 = y; if(y > 下) 下 = y; }
  }
  return { kind:L.kind, n, FW, FH, 左: 右 < 0 ? -1 : 左, 右, 上: 下 < 0 ? -1 : 上, 下, 版数:LAY.length };
});

const 前 = await field();
ok(!!(await p.$('#b_layPhoto')), '入口（＋ 写真から形）がある');
ok(await p.evaluate(() => document.getElementById('photoBox').classList.contains('hide')),
   '写真の版を選ぶまで つまみを出さない');

/* 写真を入れる（UI の道をそのまま通す：読み込み→版を足す→焼く） */
await p.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 200; c.height = 460;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 460);
  gr.addColorStop(0, '#111'); gr.addColorStop(1, '#f6f6f6');
  g.fillStyle = gr; g.fillRect(0, 0, 200, 460);
  g.fillStyle = '#f8f8f8'; g.beginPath(); g.arc(100, 140, 58, 0, 7); g.fill();
  g.fillStyle = '#151515'; g.beginPath(); g.arc(100, 330, 46, 0, 7); g.fill();
  const im = new Image();
  await new Promise(r => { im.onload = r; im.src = c.toDataURL('image/png'); });
  PHOTO = im;
  pushHist();
  const L = newLayer({ kind:'photo', col:P.ink });
  LAY.push(L); sel = LAY.length - 1;
  bakePhoto(L);
  drawLayList(); syncLay(); syncText(); syncPhoto(); kick(); saveLocal();
});
await new Promise(r => setTimeout(r, 700));

const 明 = await field();
ok(明.版数 === 前.版数 + 1 && 明.kind === 'photo', '版が1枚増えて【写真】になる',
   `${前.版数} → ${明.版数} 枚`);
ok(明.n > 500, '場に形が入る', `${明.n} 画素`);
ok(!(await p.evaluate(() => document.getElementById('photoBox').classList.contains('hide'))),
   '写真の版を選んでいる間だけ つまみが出る');

const setThr = v => p.evaluate(t => {
  const r = document.getElementById('r_pthr'); r.value = t;
  r.dispatchEvent(new Event('input', { bubbles:true }));
}, String(v));
await setThr(60);  await new Promise(r=>setTimeout(r,500)); const ゆるい = await field();
await setThr(220); await new Promise(r=>setTimeout(r,500)); const きつい = await field();
ok(ゆるい.n > きつい.n, 'しきいを上げるほど形が狭くなる', `${ゆるい.n} → ${きつい.n} 画素`);

await setThr(128); await new Promise(r=>setTimeout(r,400));
const 明128 = await field();
await p.evaluate(() => document.querySelectorAll('#pinvSeg button')[1].click());
await new Promise(r=>setTimeout(r,600));
const 暗 = await field();
ok(暗.n > 0 && 暗.n !== 明128.n, '【暗い方を形に】で逆の形になる', `明 ${明128.n} / 暗 ${暗.n} 画素`);
/* 🔴 写真の外は透明＝明るさ0。透明を除かずに切ると、暗い方で版面いっぱいが塗りになる */
ok(暗.左 > 0 && 暗.右 < 暗.FW - 1 && 暗.上 > 0 && 暗.下 < 暗.FH - 1,
   '写真の外（版面の余り）は形にならない',
   `よこ ${暗.左}〜${暗.右} / たて ${暗.上}〜${暗.下}（場 ${暗.FW}×${暗.FH}）`);

/* ⑤ 写真の版にも筆で足せる（字の版と違って塗れる＝この道具の芯） */
await p.evaluate(() => document.querySelectorAll('#pinvSeg button')[0].click());
await new Promise(r=>setTimeout(r,500));
const 筆前 = await field();
const box = await p.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect();
  return { x:r.x + r.width/2, y:r.y + r.height/2 }; });
await p.mouse.move(box.x - 60, box.y - 60);
await p.mouse.down();
await p.mouse.move(box.x + 60, box.y + 60, { steps:12 });
await p.mouse.up();
await new Promise(r=>setTimeout(r,700));
const 筆後 = await field();
ok(筆後.n !== 筆前.n, '写真の版にも筆で足せる', `${筆前.n} → ${筆後.n} 画素`);
ok(errs === 0, 'JSエラーが出ない', errs + '件');

await b.close();
process.exit(ng.length ? 1 : 0);
