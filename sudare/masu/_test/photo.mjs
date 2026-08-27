/* ⭐⭐ 写真から形を作る ── 枡MASU（2026-08-27）
   木下＝「姉弟の写真を渡すと Masu だけでそれらに似た形で表現してくれることはできないだろうか？」
   参考＝カエルの形をカエルのタイルで埋めた絵。

   ⭐⭐ この道具の形は【mask（0/1 の地図）】ひとつで決まる。
     だから **字の代わりに写真の明暗を入れる** だけで、
     マス・縦横のスライス・輪郭から・グラデ・刻みが**そのまま効く**（芯を1つも変えない）。

   見るのは：
     ⭐ 写真を渡すと形が変わる（板の数・箱の比が写真のものになる）
     ⭐ しきい／反転で形が変わる（写真から形を取り出すつまみ）
     ⭐⭐ 分け方【マス】でも中身が出る（🔴 字の位置からタイルを作る道は写真では空になる）
     ⭐ 写真を外すと字に戻る（字の設定は何も消えない）
   使い方: node sudare/masu/_test/photo.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1300, height:900, deviceScaleFactor:2 });
await p.goto(process.argv[2], { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 4000));
const R = await p.evaluate(async () => {
  const w = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  const sh = S_();
  /* 分かりやすい形（丸＋耳＝うさぎ風）を作って渡す */
  const c = document.createElement('canvas'); c.width=300; c.height=300;
  const g2 = c.getContext('2d');
  g2.fillStyle='#000'; g2.fillRect(0,0,300,300);
  g2.fillStyle='#fff';
  g2.beginPath(); g2.arc(150,190,85,0,7); g2.fill();
  g2.beginPath(); g2.ellipse(115,70,22,55,0,0,7); g2.fill();
  g2.beginPath(); g2.ellipse(185,70,22,55,0,0,7); g2.fill();
  const src = c.toDataURL('image/png');
  const board = () => { const d = cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
    let n=0; for(let i=0;i<d.length;i+=4) if(d[i]>60) n++; return n; };
  out.字のとき = { 板:sh.RECTS ? sh.RECTS.length : -1, 画素:board() };
  await new Promise(r => phLoad(src, sh, r));
  build(); await w(900);
  out.写真のとき = { 板:sh.RECTS ? sh.RECTS.length : -1, 画素:board(),
                     箱:[Math.round(sh.ART.w), Math.round(sh.ART.h)] };
  /* しきいを動かすと形が変わる */
  sh.pthr = 200; build(); await w(600);
  out.しきい200 = { 板:sh.RECTS ? sh.RECTS.length : -1 };
  sh.pthr = 128; sh.pinv = 1; build(); await w(600);
  out.反転 = { 板:sh.RECTS ? sh.RECTS.length : -1 };
  sh.pinv = 0;
  /* マス（1文字＝1タイル）でも効く */
  sh.dir = 4; build(); await w(900);
  out.マス = { 板:sh.RECTS ? sh.RECTS.length : -1, セル:sh.CELLS ? sh.CELLS.length : -1 };
  /* 写真を外すと字に戻る */
  sh.PHOTO = null; sh.PSRC = null; sh.dir = 0; build(); await w(700);
  out.外すと字 = { 板:sh.RECTS ? sh.RECTS.length : -1 };
  return out;
});
await b.close();
let ng = 0;
const ok = (c,n,note)=>{ console.log(`  ${c?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!c) ng++; };
console.log('── ⭐⭐ 写真から形を作る（枡MASU）');
ok(errs.length === 0, 'JSエラーが出ない', errs.length + '件' + (errs[0] ? ' → ' + errs[0] : ''));
ok(R.字のとき.板 > 0, '⚠️ はじめは字の形（これまでどおり）', JSON.stringify(R.字のとき));
ok(R.写真のとき.板 > 0 && R.写真のとき.板 !== R.字のとき.板,
   '⭐⭐ 写真を渡すと【形が変わる】', JSON.stringify(R.写真のとき));
ok(Math.abs(R.写真のとき.箱[0] - R.写真のとき.箱[1]) < 40,
   '⭐ 箱が【写真の比】で取り直される（正方の写真なら正方）', JSON.stringify(R.写真のとき.箱));
ok(R.反転.板 !== R.写真のとき.板,
   '⭐ 反転（暗い方を形に）で形が変わる', `${R.写真のとき.板} → ${R.反転.板}`);
ok(R.マス.板 > 50,
   '⭐⭐ 分け方【マス】でも中身が出る（🔴 字の位置から作る道は写真では空になり真っ黒だった）',
   JSON.stringify(R.マス));
ok(R.外すと字.板 === R.字のとき.板,
   '⭐ 写真を外すと字に戻る（字の設定は何も消えない）', JSON.stringify(R.外すと字));
process.exit(ng ? 1 : 0);
