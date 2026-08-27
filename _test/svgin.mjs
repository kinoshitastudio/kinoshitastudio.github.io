/* ⭐⭐ SVG を読み込めるか（共通・2026-08-26）
   木下＝「Sakuji などの svg データを どちらもこの2つは読み込みできる？」
        「Maku と Tsubu で svg 読み込みを確認しないとだね」

   見るのは「落ちない」ではなく、その道具の【作品になっているか】を数で見る：
     ① SVG を入れると絵が変わる
     ② その道具の言い方で【入ったこと】が出る（膜＝IMAGE の寸法／粒＝DOTS の数）
     ③ 拾いすぎていない（全面が塗り潰しになっていない）
   ⚠️ 道具ごとに違うのは【入口の id】と【下ごしらえ】と【入ったことの読み方】だけ。表1つに持つ。
   ⚠️ 見本は作字SAKUJI から実際に出てきた SVG（白い地の板つき）。

   使い方： node _test/svgin.mjs <道具名> [見に行くファイル] */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

/* 見本＝作字SAKUJI の実物（hori2 の試験に置いてあるものを使い回す＝1つだけ持つ） */
const SVG = path.join(ROOT, 'hori2', '_test', 'sample_sakuji.svg');

const HOW = {
  maku:  { input:'#imgFile', stat:'#stat',
           /* ⚠️ 膜は画像を1枚のシートとして置く＝「IMAGE 幅×高さ」と出る */
           want:/IMAGE\s+\d+×\d+/ },
  tsubu: { input:'#fSvg', stat:'#stat',
           /* ⚠️ 粒は 8bit ドットが芯＝既定の 16×16 では細い線が落ちる（実測 5 DOTS）。
              🔴 2026-08-27 まで、この試験は【こちらで解像を 96 に上げてから】測っていた＝
                 道具が自分で上げているかを一度も見ていなかった。
              ⭐ 手で上げるのをやめる＝**置いただけで拾えるか**を見る（落ちる試験にする）。 */
           want:/(\d+)\s*DOTS/ , minDots: 300 },
};
const tool = process.argv[2];
if(!tool || !HOW[tool]){ console.log('使い方: node _test/svgin.mjs <道具名>  （表にあるのは '+Object.keys(HOW).join('/')+'）'); process.exit(1); }
const FILE = process.argv[3] || path.join(ROOT, tool, 'index.html');
if(!fs.existsSync(SVG)){ console.log('🔴 見本の SVG が無い:', SVG); process.exit(1); }

const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); let err = 0;
p.on('pageerror', e => { err++; console.log('🔴 JSエラー:', e.message); });
await p.setViewport({ width:1200, height:900, deviceScaleFactor:1 });
await p.goto('file://' + decodeURIComponent(FILE), { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 4000));

const H = HOW[tool];
if(H.pre) await p.evaluate(async src => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await (new Function('wait', 'return (async()=>{' + src + '})()'))(wait);
}, H.pre);

const big = () => p.evaluate(() => {
  const el = [...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0];
  const c = document.createElement('canvas'); c.width = el.width; c.height = el.height;
  c.getContext('2d').drawImage(el, 0, 0);
  const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  const o = []; let ink = 0;
  for(let i=0;i<d.length;i+=4*9){ o.push(d[i]); if(d[i] > 60) ink++; }
  return { sig:o, ink, n:o.length };
});
const diff = (A,B) => { let n=0; for(let i=0;i<Math.min(A.length,B.length);i++) if(Math.abs(A[i]-B[i])>8) n++; return n; };
const stat = () => p.evaluate(s => (document.querySelector(s)||{}).textContent || '', H.stat);

const a1 = await big(); await new Promise(r=>setTimeout(r,900)); const a2 = await big();
const yure = diff(a1.sig, a2.sig);

let ng = [];
const ok = (c, name, note) => { console.log(`  ${c ? '✅' : '🔴'} ${name}${note ? '  ' + note : ''}`); if(!c) ng.push(name); };
console.log('── SVG を読み込む ' + tool);
const inp = await p.$(H.input);
if(!inp){ console.log('  🔴 入口（' + H.input + '）が無い'); await b.close(); process.exit(1); }
await inp.uploadFile(SVG);
await new Promise(r => setTimeout(r, 4000));
const s1 = await big();
const txt = await stat();

ok(diff(a2.sig, s1.sig) > yure*3 + 300, 'SVG を入れると絵が変わる',
   `${diff(a2.sig, s1.sig)}画素（揺らぎ ${yure}）`);
const m = txt.match(H.want);
ok(!!m, 'その道具の言い方で【入ったこと】が出る', txt.trim().split('\n')[0]);
if(H.minDots && m) ok(+m[1] >= H.minDots, '拾えている（細い線が落ちきっていない）', m[1] + ' DOTS');
/* ⚠️ 全面が塗り潰しになっていたら「絵」ではない */
ok(s1.ink / s1.n < 0.92, '拾いすぎていない（全面が塗り潰しでない）',
   `絵の所 ${(s1.ink/s1.n*100).toFixed(1)}%`);
ok(err === 0, 'JSエラーが出ない', err + '件');
await b.close();
process.exit(ng.length ? 1 : 0);
