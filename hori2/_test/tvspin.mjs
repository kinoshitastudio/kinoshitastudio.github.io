/* 🔴 木下「出すを押すと SPIN させたくなくても SPIN になる」
   ⭐ 判定を先に1文で言う＝**書き出しの途中で絵が回っているかどうか**。
      回れば絵の重心（横）が大きく振れる／回らなければほとんど動かない。
   ⚠️ 滲みは溜まりものなので少しは動く＝**まず SPIN 入で「ずれ」を測り、それと比べる**。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const FILE=process.argv[2]||new URL('../index.html', import.meta.url).pathname;
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new',args:['--no-sandbox','--allow-file-access-from-files','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); let err=0; p.on('pageerror',e=>{err++;console.log('🔴',e.message)});
const client=await p.createCDPSession();
await client.send('Page.setDownloadBehavior',{behavior:'deny'}).catch(()=>{});
await p.setViewport({width:1000,height:700,deviceScaleFactor:1});
await p.goto('file://'+decodeURIComponent(FILE),{waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,4500));

const run=async(spinOn)=>p.evaluate(async (spinOn)=>{
  const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
  const seg=(name,v)=>{ const el=document.querySelector('.seg[data-seg="'+name+'"] button[data-v="'+v+'"]');
    if(el) el.click(); };
  const unit=(n,want)=>{ const u=document.querySelector('[data-unit="'+n+'"]'); if(!u) return;
    const on=!u.classList.contains('off'); if(on!==want) u.querySelector('.unit-head').click(); };
  const rng=(k,v)=>{ const r=document.querySelector('[data-p="'+k+'"]'); if(!r) return;
    r.value=v; r.dispatchEvent(new Event('input')); };
  /* 🔴 まっさらの盤には【線が1本も無い】＝回しても地しか映らない（画素の平均が 244 で一定だった）。
     ⭐ memory の作法どおり「字を置く」で毎回同じ形を出す（手で引くと揺らぐ）。 */
  const tt=document.getElementById('typeText'); if(tt) tt.value='彫';
  document.getElementById('btn-type').click();
  await wait(1200);
  /* 小さく短くして headless で回りきるように */
  unit('frame',true); seg('frameShape','3'); seg('frameScale','1');
  seg('tvFmt','png'); seg('tvLoop','1'); seg('tvFps','4');
  rng('tvLen',320); rng('tvFps',4);
  unit('spin',spinOn);
  await wait(400);

  const cv=[...document.querySelectorAll('canvas')]
    .sort((a,b)=>(b.clientWidth*b.clientHeight)-(a.clientWidth*a.clientHeight))[0];
  /* ⭐ しきい値を置かずに測る＝**1コマ目からの画素のずれ**。回れば大きく、回らなければ小さい。 */
  const c=document.createElement('canvas'); c.width=160; c.height=200;
  const g=c.getContext('2d');
  const grab=()=>{ g.clearRect(0,0,160,200); g.drawImage(cv,0,0,160,200);
    const d=g.getImageData(0,0,160,200).data, a=new Float32Array(160*200);
    for(let i=0,j=0;i<d.length;i+=4,j++) a[j]=d[i]*0.3+d[i+1]*0.59+d[i+2]*0.11;
    return a; };
  const dist=(A,B)=>{ let s=0; for(let i=0;i<A.length;i++) s+=Math.abs(A[i]-B[i]); return s/A.length; };
  const prog=()=>{ const t=(document.getElementById('tvSize')||{}).textContent||'';
    const m=t.match(/(\d+)\s*\/\s*(\d+)\s*コマ/); return m?[+m[1],+m[2]]:null; };

  document.getElementById('tvGo').click();
  let first=null, worst=0, n=0, lastI=0;
  for(let k=0;k<600;k++){
    await wait(80);
    const q=prog();
    if(q){ lastI=q[0];
      const a=grab();
      if(!first) first=a; else { const d=dist(first,a); if(d>worst) worst=d; }
      n++;
    }
    if(!document.getElementById('tvGo').textContent.includes('やめる') && n>2) break;
  }
  return { 見た点:n, 最後のコマ:lastI, ずれ:+worst.toFixed(2),
    結果:(document.getElementById('tvSize')||{}).textContent.replace(/\s+/g,' ').slice(0,80) };
}, spinOn);

const on = await run(true);
console.log('■ 回す 入 :', 'ずれ', on.ずれ, '／', on.見た点, '点見た');
console.log('   ', on.結果);
await new Promise(r=>setTimeout(r,1500));
const off = await run(false);
console.log('■ 回す 切 :', 'ずれ', off.ずれ, '／', off.見た点, '点見た');
console.log('   ', off.結果);
console.log('\nJSエラー', err);
const ok = on.ずれ!==null && off.ずれ!==null && off.ずれ < on.ずれ*0.34;
console.log(ok ? '✅ 回す を切ると【回らない】（ずれ '+off.ずれ+' ＜ 入の '+on.ずれ+' の1/3）'
              : '🔴 切っても回っている（切 '+off.ずれ+' / 入 '+on.ずれ+'）');
await b.close();
process.exit(ok?0:1);
