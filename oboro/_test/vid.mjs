/* ⭐⭐ 朧 OBORO ── 動画にも効く／もっと細かく（2026-08-27）
   木下＝「さらに今画像だけに適応だが、動画にも適応できるとなおいい」
   　　　「Oboro ののびなどだが、これぐらい細かく繊細にできるようになればいいな」

   見るのは「落ちない」ではなく：
     ・動画を入れると【動画の版】になり、コマが進むと絵が変わる（毎コマ色を採り直す）
     ・⭐⭐ 帯の【並びは動かない】＝止まった帯の中身だけが流れる（種で決まる）
     ・止めると絵も止まる／頭からで戻る
     ・段を上げると帯が【髪の毛の細さ】まで行く（前は2pxで止まっていた）
   ⚠️ 見本の動画はその場で作る（ffmpeg・外に取りに行かない）。
   使い方：node oboro/_test/vid.mjs [URL] */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const URL_ = process.argv[2] || 'http://localhost:8479/oboro/';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'obo-'));
const MP4 = path.join(TMP, 'v.mp4');
/* ⚠️ 中身が【コマごとに変わる】動画でないと「毎コマ採り直している」が測れない */
execFileSync('ffmpeg', ['-v','error','-f','lavfi','-i','testsrc2=size=480x360:rate=12:duration=3',
  '-pix_fmt','yuv420p', MP4, '-y']);

const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); let err = 0;
p.on('pageerror', e => { err++; console.log('🔴', e.message); });
await p.setViewport({ width:1300, height:900 });
await p.goto(URL_, { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 2000));

/* 段の上限が上がっているか（細かく繊細に） */
const RANGE = await p.evaluate(() => {
  const r = document.getElementById('rows'), m = document.getElementById('maxx');
  return { 段:+r.max, 細かい:+m.max };
});
/* 動画を入れる */
const input = await p.$('#file');
await input.uploadFile(MP4);
await new Promise(r => setTimeout(r, 3000));

const shot = () => p.evaluate(() => { const cv = document.querySelector('canvas');
  const c = document.createElement('canvas'); c.width = 200; c.height = 150;
  c.getContext('2d').drawImage(cv, 0, 0, 200, 150);
  return [...c.getContext('2d').getImageData(0,0,200,150).data.filter((_,i)=>i%4===0)]; });
const diff = (a, b2) => a.reduce((n, v, i) => n + (Math.abs(v - b2[i]) > 10 ? 1 : 0), 0);

const R = { };
R.動画の版 = await p.evaluate(() => document.body.classList.contains('vid'));
R.帯 = await p.evaluate(() => cells.length);
const a1 = await shot();
await new Promise(r => setTimeout(r, 900));
const a2 = await shot();
R.流れる = diff(a1, a2);
/* ⭐ 帯の並びは動かない＝同じ帯（同じ場所・同じ大きさ）のまま */
R.並び = await p.evaluate(() => cells.slice(0, 30).map(c => [c.x0, c.y0, c.x1, c.y1].join()).join('|'));
await new Promise(r => setTimeout(r, 700));
R.並び2 = await p.evaluate(() => cells.slice(0, 30).map(c => [c.x0, c.y0, c.x1, c.y1].join()).join('|'));
/* 止める */
await p.evaluate(() => document.getElementById('bVidPlay').click());
await new Promise(r => setTimeout(r, 500));
const b1 = await shot();
await new Promise(r => setTimeout(r, 900));
R.止まる = diff(b1, await shot());
R.印 = await p.evaluate(() => document.getElementById('bVidPlay').textContent.trim());
/* 細かく（段を上げると帯が増え、いちばん細い帯が 2px 未満まで行く） */
await p.evaluate(() => { const r = document.getElementById('rows');
  r.value = 200; r.dispatchEvent(new Event('input', { bubbles:true })); });
await new Promise(r => setTimeout(r, 1500));
R.細かいときの帯 = await p.evaluate(() => cells.length);
R.いちばん細い = await p.evaluate(() => Math.min(...cells.map(c => Math.min(c.y1-c.y0, c.x1-c.x0))));
/* ⭐ 地＝単色（2026-08-27 木下の参考＝白い地に横帯だけが並ぶ絵） */
R.地 = await p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const cv = document.querySelector('canvas');
  const at = () => { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
    c.getContext('2d').drawImage(cv, 0, 0);
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let r=0,g2=0,b2=0,n=0;
    for(let i=0;i<d.length;i+=4*97){ r+=d[i]; g2+=d[i+1]; b2+=d[i+2]; n++; }
    return [Math.round(r/n),Math.round(g2/n),Math.round(b2/n)].join(); };
  /* ⚠️ 帯が全面を覆っていると地は1画素も見えない＝【刷る割合】を落としてから見る
     （この道具は「写真の上に帯を刷る」ので、地が出るのは帯の無い所だけ） */
  const f = document.getElementById('fill');
  f.value = 40; f.dispatchEvent(new Event('input', { bubbles:true }));
  await wait(700);
  const before = at();
  document.querySelector('#ground button[data-v="flat"]').click();
  const g = document.getElementById('groundCol');
  g.value = '#ff0000'; g.dispatchEvent(new Event('input', { bubbles:true }));
  await wait(700);
  const after = at();
  const 出る = getComputedStyle(document.getElementById('groundCol').parentElement).display !== 'none';
  document.querySelector('#ground button[data-v="photo"]').click();
  await wait(600);
  return { before, after, 戻る:at(), 色のつまみが出る:出る };
});
await b.close();
fs.rmSync(TMP, { recursive:true, force:true });

let ng = 0;
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng++; };
console.log('── 朧 OBORO：動画にも効く／もっと細かく');
ok(err === 0, 'JSエラーが出ない', err + '件');
ok(RANGE.段 >= 200, '⭐ 段を【もっと細かく】まで上げられる', '段 max ' + RANGE.段 + '／細かい max ' + RANGE.細かい);
ok(R.動画の版, '⭐ 動画を入れると【動画の版】になる（動画のつまみが出る）');
ok(R.帯 > 10, '帯ができている', R.帯 + '本');
ok(R.流れる > 200, '⭐⭐ コマが進むと絵が変わる（毎コマ色を採り直す）', R.流れる + '点');
ok(R.並び === R.並び2, '⭐⭐ 帯の【並びは動かない】（止まった帯の中身だけが流れる）');
ok(R.止まる < 60, '⭐ 止めると絵も止まる', R.止まる + '点');
ok(/再生/.test(R.印), '止めたら印が【▶ 再生】に変わる', R.印);
ok(R.細かいときの帯 > R.帯 * 3, '⭐ 段を上げると帯が増える', `${R.帯} → ${R.細かいときの帯}`);
ok(R.いちばん細い <= 1, '⭐⭐ いちばん細い帯が【1px】まで行く（前は2pxで止まっていた）',
   R.いちばん細い + 'px（色を採る画像の画素）');
{ const [r0,g0,b0] = R.地.before.split(',').map(Number);
  const [r1,g1,b1] = R.地.after.split(',').map(Number);
  ok(r1 > r0 + 20 && g1 < g0 && b1 < b0,
     '⭐ 地を【単色】にすると写真が消えて帯だけ残る（赤い地にしたら赤くなる）',
     `${R.地.before} → ${R.地.after}`); }
ok(R.地.色のつまみが出る, '⚠️ 単色のときだけ地の色のつまみが出る');
ok(R.地.戻る === R.地.before, '⭐ 写真に戻すと元の絵に帰る', R.地.戻る);
process.exit(ng ? 1 : 0);
