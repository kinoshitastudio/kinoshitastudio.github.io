/* ⭐⭐ 写真から形を作る ── 粒TSUBU（2026-08-28）
   木下＝「その他はやってほしいな　みたいし」（枡MASU・簾[マス] と同じものを他の道具へ）

   ⭐⭐ この道具の形が決まるのは glyphDots ひとつ＝字の代わりに写真の明暗を焼く。
     だから向き・太さ・粒・玉・マス目・書き出しは1行も変えていない。
   見るのは：
     ① 写真を置くと粒が出る（＝形が拾えている）
     ② しきいを動かすと粒の数が変わる（＝つまみが効いている）
     ③ 【暗い方を形に】でも余白が丸ごと形にならない（🔴 余白を黒のままにすると四角い塊になる）
     ④ 字に戻せる（写真を外す＝字の設定は何も消えない）
     ⑤ 解像が自動で上がる（16 のままだと形が残らない）
   使い方: node tsubu/_test/photo.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1300, height:900, deviceScaleFactor:1 });
await p.goto(process.argv[2], { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 2500));

const R = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  out.入口がある = !!document.getElementById('bPh') && !!document.getElementById('pthr');
  out.はじめは隠れている = document.getElementById('phUI').style.display === 'none';

  /* うさぎの形（黒地に白）＝写真の代わり。周りに余白を残す＝③のため */
  const c = document.createElement('canvas'); c.width = 240; c.height = 300;
  const g2 = c.getContext('2d');
  g2.fillStyle = '#000'; g2.fillRect(0, 0, 240, 300);
  g2.fillStyle = '#fff';
  g2.beginPath(); g2.arc(120, 195, 70, 0, 7); g2.fill();
  g2.beginPath(); g2.ellipse(92, 80, 18, 48, 0, 0, 7); g2.fill();
  g2.beginPath(); g2.ellipse(148, 80, 18, 48, 0, 0, 7); g2.fill();
  const im = new Image();
  await new Promise(r => { im.onload = r; im.src = c.toDataURL('image/png'); });

  const res0 = +document.getElementById('res').value;
  phImg = im;
  const rs = document.getElementById('res');
  if(+rs.value < 64){ rs.value = 96; rs.dispatchEvent(new Event('input', { bubbles:true })); }
  const t = document.getElementById('txt');
  t.value = PHOTO_CH; t.dispatchEvent(new Event('input', { bubbles:true }));
  await w(400);
  out.解像 = { 前:res0, 後:+document.getElementById('res').value };
  out.粒が出た = dots.length;

  /* ② しきいを動かす（明るい方を形に＝しきいを上げるほど狭くなる） */
  const thr = document.getElementById('pthr');
  thr.value = 40;  thr.dispatchEvent(new Event('input', { bubbles:true })); await w(250);
  const low = dots.length;
  thr.value = 220; thr.dispatchEvent(new Event('input', { bubbles:true })); await w(250);
  const high = dots.length;
  out.しきい = { ゆるい:low, きつい:high, 効いている: low !== high };

  /* ③ 暗い方を形に ＝ 余白（写真の外）が丸ごと形にならない */
  thr.value = 128; thr.dispatchEvent(new Event('input', { bubbles:true })); await w(200);
  document.querySelectorAll('#pinv button')[1].click(); await w(300);
  /* 🔴 「数が全部より少ない」では甘い（余白は縦2本の帯だけ＝2割しか増えず、わざと壊しても通る）。
     ⭐ 見るのは【左右の端の列に形が無いこと】＝写真は縦長なので、升目の左右には必ず余白が残る。
     ⭐ 物差しは本体と同じ関数（glyphDots）から取る＝画面のつまみが決めた値をそのまま読む。 */
  const N = P.res;
  const gd = glyphDots(PHOTO_CH, N, 0, 0);
  const xs = gd.map(d => d[0]);
  out.反転 = { 粒:dots.length, 升目:N, 左端:Math.min(...xs), 右端:Math.max(...xs),
               余白が形になっていない: Math.min(...xs) > N * 0.04 && Math.max(...xs) < N * 0.96 };
  document.querySelectorAll('#pinv button')[0].click(); await w(250);

  /* ④ 字に戻す */
  document.getElementById('bPhOff').click(); await w(400);
  out.字に戻した = { 字:document.getElementById('txt').value, 粒:dots.length,
                     つまみが隠れた: document.getElementById('phUI').style.display === 'none' };
  return out;
});
await b.close();

let ng = 0;
const ok = (name, cond, extra) => { console.log((cond ? '  ✅ ' : '  🔴 ') + name + (extra != null ? ' … ' + extra : '')); if(!cond) ng = 1; };
ok('入口（写真から形を作る／しきい）がある', R.入口がある);
ok('写真を置くまでは つまみを出さない', R.はじめは隠れている);
ok('解像が自動で上がる（16 のままだと形が残らない）', R.解像.後 >= 64, JSON.stringify(R.解像));
ok('写真を置くと粒が出る', R.粒が出た > 200, R.粒が出た + ' 粒');
ok('しきいで粒の数が変わる', R.しきい.効いている, JSON.stringify(R.しきい));
ok('【暗い方を形に】でも余白が丸ごと形にならない', R.反転.余白が形になっていない, JSON.stringify(R.反転));
ok('写真を外すと字に戻る', R.字に戻した.字 === 'HELLO' && R.字に戻した.粒 > 0 && R.字に戻した.つまみが隠れた, JSON.stringify(R.字に戻した));
ok('画面のエラーが無い', errs.length === 0, errs.join(' / '));
process.exit(ng);
