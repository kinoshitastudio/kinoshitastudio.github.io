/* ⭐ 朦 OBORO ── HEIC（iPhone の写真）が読めるかを実測する（2026-08-21 新設）
   木下「iphone とかで写真が出るのが HEIC という拡張子があるが、それでも読み込みできるように」

   🔴 見るのは「エラーが出ない」ではない。【本当に写真が入れ替わったか】。
     ① HEIC を選ぶと、絵が別のもの（その写真）になる
     ② 版面の縦横がその写真のものになる
     ③ ふつうの JPEG は今までどおり（余計な回り道をしない）
     ④ 読めなかったときは【理由が画面に出る】（黙って何も起きない、を作らない）
   ⚠️ headless の Chrome は HEIC を素で読めない＝変換の部品を取りに行く道を通る
      （Safari は①で通るので、この検査は「重い方の道」を見ていることになる）。
   使い方: node oboro/_test/heic.mjs <URL> <HEICファイルのパス> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'node:fs';
const URLBASE = process.argv[2] || 'http://localhost:8393/oboro/';
const HEIC = process.argv[3];
if(!HEIC || !fs.existsSync(HEIC)){ console.log('🔴 HEIC ファイルのパスを渡してください'); process.exit(1); }
const ng = []; const check=(ok,n,note)=>{ console.log(`  ${ok?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!ok) ng.push(n); };

const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e=>errs.push(e.message));
await p.setViewport({ width:1440, height:900, deviceScaleFactor:1 });
await p.goto(URLBASE + '?v=' + Date.now(), { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,2800));

const look = () => p.evaluate(()=>{
  const d = ctx.getImageData(0,0,cv.width,cv.height).data;
  let h = 2166136261;
  for(let i=0;i<d.length;i+=4*97){ h ^= d[i]+d[i+1]*3+d[i+2]*7; h = Math.imul(h,16777619); }
  return { h:h>>>0, w:cv.width, hh:cv.height,
           msg:(document.getElementById('loadMsg').textContent||'').trim(),
           iw: img ? img.width : 0, ih: img ? img.height : 0 };
});
const before = await look();
check(before.w > 100, '立ち上がりの写真が出ている', `版面 ${before.w}×${before.hh}`);

/* ⭐ 実際にファイルを選ばせる（人と同じ道） */
const input = await p.$('#file');
await input.uploadFile(HEIC);
/* 変換の部品を取りに行くので長めに待つ */
let after = before;
for(let i=0;i<40;i++){
  await new Promise(r=>setTimeout(r,500));
  after = await look();
  if(after.h !== before.h || /🔴/.test(after.msg)) break;
}
if(/🔴/.test(after.msg)){
  check(false, '⭐HEIC が読めた', after.msg.slice(0, 90));
  check(true, '⭐読めなかったときは理由が画面に出る（黙って止まっていない）', after.msg.slice(0, 60));
}else{
  check(after.h !== before.h, '⭐⭐HEIC を選ぶと絵がその写真に入れ替わる',
        `指紋 ${before.h} → ${after.h}`);
  check(after.iw > 0 && after.ih > 0, '写真の実寸が取れている', `${after.iw}×${after.ih}`);
  check(after.msg === '', '読み終わったら知らせが消える', after.msg || '（空）');
}

/* ── ③ ふつうの JPEG は今までどおり ── */
const jpg = HEIC.replace(/[^/]+$/, '') + '__t.jpg';
fs.copyFileSync(process.argv[4] || '/Users/kinoshitatakahiro/Desktop/GitHub-clone/名称未設定/oboro/2.jpg', jpg);
const b2 = await look();
await (await p.$('#file')).uploadFile(jpg);
let after2 = b2;
for(let i=0;i<20;i++){
  await new Promise(r=>setTimeout(r,400));
  after2 = await look();
  if(after2.h !== b2.h) break;
}
check(after2.h !== b2.h, 'ふつうの JPEG も今までどおり読める', `指紋 ${b2.h} → ${after2.h}`);
check(after2.msg === '', 'JPEG では知らせを出さない（回り道をしていない）', after2.msg || '（空）');
fs.unlinkSync(jpg);

console.log(errs.length?`  🔴 JSエラー: ${errs.slice(0,2).join(' / ')}`:'  ✅ JSエラーなし');
console.log(ng.length?`\n🔴 だめ ${ng.length}件`:'\n✅ HEIC の読み込みは全部通った');
await b.close(); process.exit(ng.length||errs.length?1:0);
