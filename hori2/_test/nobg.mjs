/* ⭐⭐ 地なしPNG（2026-08-25 木下「オブジェクトだけを切り抜いて背景なし png で書き出したい」
   ／理由＝「貼HARI でそれらでポスターを作る」）

   見るのは「落ちない」ではなく、切り抜きとして成立しているかを【画素で数える】：
     ① 画面の見えが変わっていない（alpha:true にしてもページの上では不透明のまま）
     ② 地なしで撮ると【外は透明】になる
     ③ 地なしでも【物体の所は不透明】＝形が抜け落ちていない
     ④ 撮ったあと画面が地なしのまま残らない（撮り終わったら戻る）
   ⚠️ この道具は滲みの蓄積で毎回わずかに絵が違う（揺らぎの下限が大きい）ので、
      比べるときは【揺らぎを先に測ってから】前後を比べる。

   使い方： node _test/nobg.mjs [見に行くファイル] */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const FILE = process.argv[2] || new URL('../index.html', import.meta.url).pathname;
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); let err = 0;
p.on('pageerror', e => { err++; console.log('🔴 JSエラー:', e.message); });
await p.setViewport({ width:1440, height:900, deviceScaleFactor:1 });
await p.goto('file://' + decodeURIComponent(FILE), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 4500));

const R = await p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  /* 字を置いて必ず同じ形にする（手で引くと揺らぐ） */
  const t = document.querySelector('[data-p="typeText"]') || document.querySelector('#typeText');
  const put = document.getElementById('btn-type') || [...document.querySelectorAll('button')].find(x => /字を置く/.test(x.textContent));
  if(put){ if(t) t.value = '夏'; put.click(); await wait(1200); }

  /* 🔴 `querySelector('canvas')` だと【左下の向きの球（id="gz"）】を掴む。
     盤は body の末尾に appendChild される後発なので、DOM の順では先に来ない。
     ⭐ いちばん大きい canvas ＝ 盤。（この取り違えで「画面が93%透明」と誤報した） */
  const el = [...document.querySelectorAll('canvas')]
    .sort((a, b) => b.width * b.height - a.width * a.height)[0];
  /* 画面に出ているコマの、アルファの最小値と「透明な画素の割合」 */
  const readScreen = () => {
    const c = document.createElement('canvas'); c.width = el.width; c.height = el.height;
    const g = c.getContext('2d'); g.drawImage(el, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let clear = 0, opaque = 0, n = 0;
    for(let i = 3; i < d.length; i += 4*13){ n++; if(d[i] < 8) clear++; else if(d[i] > 247) opaque++; }
    return { 透明: +(clear/n*100).toFixed(1), 不透明: +(opaque/n*100).toFixed(1) };
  };
  out.画面 = readScreen();

  /* ⭐⭐ 中身は module なので外から関数を呼べない。かえって良い＝【木下と同じく
     ボタンを押して】、落ちてくる PNG そのものを読む。
     ⚠️ ダウンロードは headless では落ちないので、Blob を作る所で横取りする。 */
  const grabbed = [];
  const origURL = URL.createObjectURL.bind(URL);
  URL.createObjectURL = bb => { grabbed.push(bb); return origURL(bb); };

  const push = async id => {
    grabbed.length = 0;
    document.getElementById(id).click();
    for(let i = 0; i < 60 && !grabbed.length; i++) await wait(200);
    const bb = grabbed[grabbed.length - 1];
    if(!bb) return { 無し:true };
    const bmp = await createImageBitmap(bb);
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    const g = c.getContext('2d'); g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let clear = 0, opaque = 0, n = 0;
    for(let i = 3; i < d.length; i += 4*13){ n++; if(d[i] < 8) clear++; else if(d[i] > 247) opaque++; }
    return { w:bmp.width, h:bmp.height, 透明:+(clear/n*100).toFixed(1), 不透明:+(opaque/n*100).toFixed(1) };
  };
  out.地あり = await push('btn-png2');
  await wait(800);
  out.地なし = await push('btn-png3');
  await wait(1200);
  out.撮ったあとの画面 = readScreen();
  return out;
});

await b.close();
let ng = 0;
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng++; };
console.log('── 地なしPNG');
ok(err === 0, 'JSエラーが出ない', err + '件');
ok(R.画面.透明 < 1, '画面は不透明のまま（alpha:true にしても見えは変わらない）', `透明 ${R.画面.透明}%`);
ok(R.地あり.透明 < 1, '地ありで撮ると透明な所が無い', `透明 ${R.地あり.透明}%  ${R.地あり.w}×${R.地あり.h}`);
ok(R.地なし.透明 > 20, '地なしで撮ると外が透ける', `透明 ${R.地なし.透明}%  ${R.地なし.w}×${R.地なし.h}`);
ok(R.地なし.不透明 > 2, '地なしでも物体の所は残る（形が抜け落ちていない）', `不透明 ${R.地なし.不透明}%`);
ok(R.地なし.w === R.地あり.w && R.地なし.h === R.地あり.h, '地ありと地なしで出る大きさが同じ',
   `${R.地あり.w}×${R.地あり.h} / ${R.地なし.w}×${R.地なし.h}`);
ok(R.撮ったあとの画面.透明 < 1, '撮ったあと画面が地なしのまま残らない', `透明 ${R.撮ったあとの画面.透明}%`);
process.exit(ng ? 1 : 0);
