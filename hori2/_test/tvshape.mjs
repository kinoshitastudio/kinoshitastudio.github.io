/* 🔴 木下「4:5の盤面にしているのに動画書き出しは違いそう」
   ⭐ 中身は module なので外から関数を呼べない。⭐⭐ かえって良い＝**木下が見る数字そのもの**
      （パネルの「出る大きさ」と「出力」）を読んで、縦横の比で突き合わせる。
   ⭐ 形のボタンは .seg＝click しか来ない。押して合わせ直るかまで通す。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const OUT='/private/tmp/claude-501/-Users-kinoshitatakahiro-Desktop-Github-99letters-github-io/a564c726-5851-4f06-851f-e680f2b9ac7d/scratchpad/hori2';
const FILE=process.argv[2]||new URL('../index.html', import.meta.url).pathname;
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new',args:['--no-sandbox','--allow-file-access-from-files','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); let err=0; p.on('pageerror',e=>{err++;console.log('🔴',e.message)});
await p.setViewport({width:1440,height:900,deviceScaleFactor:1});
await p.goto('file://'+decodeURIComponent(FILE),{waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,4500));

const rows=await p.evaluate(async ()=>{
  const wait=()=>new Promise(r=>setTimeout(r,250));
  const num=(s)=>{ const m=(s||'').match(/(\d+)\s*×\s*(\d+)/); return m?[+m[1],+m[2]]:null; };
  const png=()=>num((document.getElementById('frameOut')||{}).textContent);
  const mov=()=>num((document.getElementById('tvSize')||{}).textContent);
  const out=[];
  const fu=document.querySelector('[data-unit="frame"]');
  if(!fu) return [{no:'🔴 版面の段が見つからない'}];
  if(fu.classList.contains('off')) fu.querySelector('.unit-head').click();
  await wait();
  /* 🔴🔴 最初この試験は【2つのパネルの数字を見比べる】だけだった。
     直す前の版で流したら **両方とも古いまま固まっていて、揃っているので ✅** になった。
     ⭐ だから【形ごとの正しい比】を先に書いておく＝これが判定。 */
  const WANT={ '0':1, '3':0.8, '1':9/16, '2':16/9 };
  for(const v of ['0','3','1','2']){
    const btn=document.querySelector('.seg[data-seg="frameShape"] button[data-v="'+v+'"]');
    if(!btn){ out.push({no:'🔴 形のボタン '+v+' が無い'}); continue; }
    btn.click(); await wait();
    out.push({ 形:btn.textContent.trim(), 期待:+WANT[v].toFixed(3), 静止画:png(), 動画:mov(),
      文:(document.getElementById('tvSize')||{}).textContent||'' });
  }
  /* 版面を消したら【画面の形】になるか */
  fu.querySelector('.unit-head').click(); await wait();
  /* ⚠️ canvas は1枚ではない（見本や目盛りの小さいものが先に来る）＝**いちばん大きいもの**が盤 */
  const el=[...document.querySelectorAll('canvas')]
    .sort((a,b)=>(b.clientWidth*b.clientHeight)-(a.clientWidth*a.clientHeight))[0];
  out.push({ 形:'版面 切', 静止画:png(), 動画:mov(),
    画面:[el.clientWidth||innerWidth, el.clientHeight||innerHeight],
    文:(document.getElementById('tvSize')||{}).textContent||'' });
  return out;
});
console.log('JSエラー', err, '\n');
let ng=0;
for(const r of rows){
  if(r.no){ console.log(r.no); ng++; continue; }
  const a=r.静止画, m=r.動画, s=r.画面;
  const ra=a?+(a[0]/a[1]).toFixed(3):null, rm=m?+(m[0]/m[1]).toFixed(3):null;
  /* 版面ありは【その形の正しい比】／版面切は【画面の比】が答え */
  const want = s ? +(s[0]/s[1]).toFixed(3) : r.期待;
  const okA = (ra!==null && Math.abs(ra-want)<0.02);   /* 静止画が正しい比か */
  const okM = (rm!==null && Math.abs(rm-want)<0.02);   /* 動画が正しい比か */
  const ok = okA && okM;
  if(!ok) ng++;
  console.log(`${ok?'✅':'🔴'} ${String(r.形).padEnd(9)} 正解 ${want}`
    + ` ／ 静止画 ${a?a.join('×'):'-'} (${ra??'-'})${okA?'':' ←ちがう'}`
    + ` ／ 動画 ${m?m.join('×'):'-'} (${rm??'-'})${okM?'':' ←ちがう'}`
    + (s?`  画面 ${s.join('×')}`:''));
  console.log('   パネル: '+r.文.replace(/\s+/g,' ').slice(0,86));
}
console.log('\n'+(ng?'🔴 NG '+ng+'件':'✅ 全部一致'));
await p.screenshot({path:OUT+'/tvshape.png'});
await b.close();
process.exit(ng?1:0);
