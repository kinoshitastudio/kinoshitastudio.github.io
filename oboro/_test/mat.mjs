/* ⭐ 朦 OBORO の「余白（額）」の回帰テスト（2026-08-21 新設）
   木下「ボードの縁に余白を設けたい。その余白にも色をつけたい。
        上からつけるだけでなく、それにより今あるボードのオブジェクトが縮小される感じに」

   🔴 いちばん大事なのは【余白 0 なら1画素も変わらない】こと。ここが崩れたら他が通っても失敗。
   見るのは：
     ① 余白0＝直す前（HEAD）と絵が完全に一致（＝過去作を壊していない）
     ② 余白を上げると【縁が余白の色になる】（四隅を実際に読む）
     ③ 【中の絵が縮む】＝上に被せているのではない（絵のある範囲が内側へ寄る）
     ④ 縮んでも【歪まない】（絵の縦横比が変わらない）
     ⑤ 余白の色を変えると縁の色だけが変わる
     ⑥ 0 に戻すと元の絵に完全に帰る
     ⑦ SVG にも余白が入る（見えているものがそのまま出る）
   使い方: node oboro/_test/mat.mjs <いまのURL> [直す前のURL] */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const NEW = process.argv[2] || 'http://localhost:8393/oboro/';
const OLD = process.argv[3] || '';
const ng = []; const check=(ok,n,note)=>{ console.log(`  ${ok?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!ok) ng.push(n); };
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });

async function open(url){
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e=>errs.push(e.message));
  await p.setViewport({ width:1440, height:900, deviceScaleFactor:1 });
  await p.goto(url + '?v=' + Date.now(), { waitUntil:'networkidle0' });
  await new Promise(r=>setTimeout(r,2800));
  /* 絵の指紋と「絵のある範囲」を取る道具を仕込む */
  await p.evaluate(()=>{
    window.__look = () => {
      const d = ctx.getImageData(0,0,cv.width,cv.height).data;
      let h = 2166136261;
      for(let i=0;i<d.length;i+=4*97){ h ^= d[i]+d[i+1]*3+d[i+2]*7; h = Math.imul(h,16777619); }
      const px = (x,y)=>{ const i=((y*cv.width)+x)*4; return [d[i],d[i+1],d[i+2]]; };
      return { h:h>>>0, w:cv.width, h2:cv.height,
               corner: px(3,3), edge: px((cv.width>>1), 3), mid: px(cv.width>>1, cv.height>>1) };
    };
    /* 「絵のある範囲」＝まわりの1色でない画素の外接（余白の色を除いて数える） */
    window.__box = (bg) => {
      const d = ctx.getImageData(0,0,cv.width,cv.height).data;
      const near = (i)=> Math.abs(d[i]-bg[0])<6 && Math.abs(d[i+1]-bg[1])<6 && Math.abs(d[i+2]-bg[2])<6;
      let x0=1e9,y0=1e9,x1=-1,y1=-1;
      for(let y=0;y<cv.height;y++) for(let x=0;x<cv.width;x++){
        const i=(y*cv.width+x)*4; if(near(i)) continue;
        if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
      }
      return { x0,y0,x1,y1, w:x1-x0+1, h:y1-y0+1 };
    };
  });
  return { p, errs };
}
const set = (p,id,v) => p.evaluate((id,v)=>{ const r=document.getElementById(id); r.value=v;
  r.dispatchEvent(new Event('input',{bubbles:true})); }, id, v);
const wait = ms => new Promise(r=>setTimeout(r,ms));

const A = await open(NEW);
const base = await A.p.evaluate(()=>window.__look());
check(base.w > 100, '絵が出ている', `版面 ${base.w}×${base.h2}`);

/* ── ① 余白0＝直す前と完全に一致 ── */
if(OLD){
  const B = await open(OLD);
  const o = await B.p.evaluate(()=>window.__look());
  check(o.h === base.h && o.w === base.w && o.h2 === base.h2,
        '⭐⭐余白0のとき直す前と絵が完全に一致', `指紋 ${o.h} / ${base.h}`);
  if(B.errs.length) console.log('  ⚠️ 直す前 JSエラー:', B.errs[0]);
  await B.p.close();
}else console.log('  ⚠️ 直す前のURLが無いので突き合わせは飛ばした');

/* 余白0のときの「絵のある範囲」＝版面いっぱい（地は黒） */
const box0 = await A.p.evaluate(()=>window.__box([0,0,0]));

/* ── ②③④ 余白を上げる ── */
await set(A.p, 'mat', 12); await wait(500);
const m1 = await A.p.evaluate(()=>window.__look());
const col = await A.p.evaluate(()=>{
  const c = P.matcol.replace('#','');
  return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)];
});
const near = (a,b2)=> Math.abs(a[0]-b2[0])<6 && Math.abs(a[1]-b2[1])<6 && Math.abs(a[2]-b2[2])<6;
check(near(m1.corner, col) && near(m1.edge, col), '⭐縁が余白の色になる',
      `四隅 ${m1.corner} / 色 ${col}`);
const box1 = await A.p.evaluate(()=>window.__box([242,239,230]));
check(box1.w < box0.w * 0.85 && box1.h < box0.h * 0.85,
      '⭐⭐中の絵が縮む（上に被せているのではない）', `${box0.w}×${box0.h} → ${box1.w}×${box1.h}`);
const ar0 = box0.w / box0.h, ar1 = box1.w / box1.h;
check(Math.abs(ar1 - ar0) / ar0 < 0.02, '⭐縮んでも歪まない（縦横比が変わらない）',
      `比 ${ar0.toFixed(3)} → ${ar1.toFixed(3)}`);
/* 余白の幅が四辺とも辺の長さに比例しているか（＝バランスが取れている） */
const pw = box1.x0 / m1.w, ph = box1.y0 / m1.h2;
check(Math.abs(pw - ph) < 0.02, '余白が四辺で釣り合っている（辺に比例）',
      `よこ ${(pw*100).toFixed(1)}% / たて ${(ph*100).toFixed(1)}%`);

/* ── ④b 額の中で絵ごと大きくする・寄せる（2026-08-21）
   ⭐⭐ 木下「余白をつけているときは中の画像は下のレイヤーにいる状態にして。
        なので、ズームすると余白自体は上にあってかわりはない。中のよこ、中のたても」
   🔴 だから見るのは「絵が大きくなったか」ではなく【余白が残っているか】。 */
const win = await A.p.evaluate(()=>{
  const p = P.mat/100;
  return { x:Math.round(cv.width*p), y:Math.round(cv.height*p),
           w:Math.round(cv.width*(1-p*2)), h:Math.round(cv.height*(1-p*2)) };
});
const sig1 = await A.p.evaluate(()=>window.__look().h);
await set(A.p, 'matzoom', 160); await wait(600);
const mZ = await A.p.evaluate(()=>window.__look());
const boxZ = await A.p.evaluate(()=>window.__box([242,239,230]));
check(near(mZ.corner, col) && near(mZ.edge, col),
      '⭐⭐中の大きさを上げても余白は残る（絵は余白の下に潜る）', `四隅 ${mZ.corner}`);
check(boxZ.x0 >= win.x - 2 && boxZ.x0 + boxZ.w <= win.x + win.w + 2
   && boxZ.y0 >= win.y - 2 && boxZ.y0 + boxZ.h <= win.y + win.h + 2,
      '⭐絵が額の窓からはみ出していない', `絵 ${boxZ.x0}〜${boxZ.x0+boxZ.w} / 窓 ${win.x}〜${win.x+win.w}`);
check(mZ.h !== sig1, '中の大きさが効いている（絵が変わる）');
await set(A.p, 'matzoom', 100); await set(A.p, 'matx', 20); await wait(600);
const mX = await A.p.evaluate(()=>window.__look());
const boxX = await A.p.evaluate(()=>window.__box([242,239,230]));
check(near(mX.corner, col), '⭐中のよこで寄せても余白は残る', `四隅 ${mX.corner}`);
check(boxX.x0 > box1.x0 + 40, '⭐中のよこで右へ寄る', `x ${box1.x0} → ${boxX.x0}`);
await set(A.p, 'matx', 0); await set(A.p, 'maty', -20); await wait(600);
const mY = await A.p.evaluate(()=>window.__look());
const boxY = await A.p.evaluate(()=>window.__box([242,239,230]));
check(near(mY.corner, col), '⭐中のたてで寄せても余白は残る', `四隅 ${mY.corner}`);
/* ⚠️ 上へ寄せると【上は窓で切れる】ので y0 は窓の上端のまま動かない。
   ⭐ 動くのは【下】＝下に余白が広がる。ここを見る（最初これを y0 で見て誤検出した）。 */
check(boxY.y0 + boxY.h < box1.y0 + box1.h - 40, '⭐中のたてで上へ寄る（下に余白が広がる）',
      `下端 ${box1.y0 + box1.h} → ${boxY.y0 + boxY.h}`);
await set(A.p, 'maty', 0); await wait(400);

/* ── ⑤ 色を変えると縁だけ変わる ── */
await A.p.evaluate(()=>{ const el=document.getElementById('matcol'); el.value='#c81e1e';
  el.dispatchEvent(new Event('input',{bubbles:true})); });
await wait(500);
const m2 = await A.p.evaluate(()=>window.__look());
check(near(m2.corner, [200,30,30]), '⭐余白の色を変えると縁の色が変わる', String(m2.corner));
check(String(m2.mid) === String(m1.mid), '真ん中（絵）は変わらない', `${m1.mid} / ${m2.mid}`);

/* ── ⑦ SVG にも入る ── */
const svg = await A.p.evaluate(async ()=>{
  let got = null;
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(bb){ got = bb; return oc.call(URL, bb); };
  document.getElementById('bSVG').click();
  await new Promise(x=>setTimeout(x,900));
  URL.createObjectURL = oc;
  return got ? await got.text() : '';
});
check(/<rect x="0" y="0"[^>]*fill="#c81e1e"/.test(svg) && /<g transform="translate\(/.test(svg),
      '⭐SVG にも余白が入る（見えているものがそのまま出る）', `${Math.round(svg.length/1024)}KB`);

/* ── ⑥ 0 に戻すと元の絵に完全に帰る ── */
await A.p.evaluate(()=>{ const el=document.getElementById('matcol'); el.value='#f2efe6';
  el.dispatchEvent(new Event('input',{bubbles:true})); });
await set(A.p, 'mat', 0); await wait(600);
const back = await A.p.evaluate(()=>window.__look());
check(back.h === base.h, '⭐⭐0 に戻すと元の絵に完全に帰る', `指紋 ${base.h} → ${back.h}`);

console.log(A.errs.length?`  🔴 JSエラー: ${A.errs.slice(0,2).join(' / ')}`:'  ✅ JSエラーなし');
console.log(ng.length?`\n🔴 だめ ${ng.length}件`:'\n✅ 余白（額）は全部通った');
await b.close(); process.exit(ng.length||A.errs.length?1:0);
