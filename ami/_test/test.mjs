/* 網 AMI 回帰テスト ──
   ①層（画像・文字）が焼けて、入切・位置・大きさ・重なり順が【絵に】効くか
   ②動きが継ぎ目なくループするか（位相0と位相1が1粒も違わないか）
   ③10種の網が全部刷れるか（片方に潰れないか）
   ④控え（JSON）の往復・戻す（⌘Z）の往復
   ⑤動画（mp4 / PNG連番）が実際に出るか
   ⚠️ 落ちないテストは意味がない。最後に「わざと壊した想定」の検算を入れてある。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

const PORT   = process.env.PORT || 8092;
const TARGET = `http://localhost:${PORT}/ami/index.html`;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DL     = fs.mkdtempSync(path.join(os.tmpdir(), 'ami-test-'));

let pass = 0, fail = 0;
const ok = (name, cond, extra='') => { if(cond){ pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${extra}`); } };

const browser = await puppeteer.launch({ executablePath: CHROME, headless:'new',
  args:['--no-sandbox','--window-size=1500,1100'] });
const page = await browser.newPage();
await page.setViewport({ width:1500, height:1100 });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if(m.type()==='error' && !/favicon|404/.test(m.text())) errors.push('console: '+m.text()); });
const cdp = await page.createCDPSession();
await cdp.send('Page.setDownloadBehavior', { behavior:'allow', downloadPath:DL });
await page.goto(TARGET, { waitUntil:'networkidle0' });
await page.evaluate(() => document.fonts.ready);

/* ── ① 層 ───────────────────────────────────────────── */
ok('起動して描けている', await page.evaluate(()=> cv.width>0 && cw>0));

const cov = await page.evaluate(()=>{
  selLay='txt'; L.txt.on=true; L.txt.text='網\nAMI'; L.txt.sc=0.6; bakeTxt(); syncUI(); render();
  let n=0; for(const v of baked.txt.a) if(v>0.05) n++; return n/baked.txt.a.length;
});
ok('文字の層が焼けている', cov>0.005, `面積 ${(cov*100).toFixed(1)}%`);

const px = () => page.evaluate(()=> cv.toDataURL());
const on  = await page.evaluate(()=>{L.txt.on=true; render(); return cv.toDataURL()});
const off = await page.evaluate(()=>{L.txt.on=false;render(); return cv.toDataURL()});
ok('文字の入切が【絵を】変える', on!==off);

const base = await page.evaluate(()=>{L.txt.on=true;L.txt.x=0;L.txt.sc=0.6;bakeTxt();render();return cv.toDataURL()});
const moved= await page.evaluate(()=>{L.txt.x=0.5;bakeTxt();render();return cv.toDataURL()});
const big  = await page.evaluate(()=>{L.txt.x=0;L.txt.sc=1.2;bakeTxt();render();return cv.toDataURL()});
ok('文字の位置が効く', base!==moved);
ok('文字の大きさが効く', base!==big);

/* ⭐ 文字が地と反対の明るさで乗っているか＝【読めるか】を画素で確かめる。
      白い文字を明るい地に置くと、置けているのに見えない（実際に踏んだ）。 */
for(const inv of [false, true]){
  const r = await page.evaluate(iv=>{
    selLay='txt'; L.txt.on=true; L.txt.text='網'; L.txt.sc=1.1; L.txt.inv=iv;
    L.txt.mode='rep'; L.txt.amt=1; L.txt.x=0; bakeTxt(); render();
    const id=makeFrame(0,false).data, m=baked.txt.a;
    let inB=0,inN=0,outB=0,outN=0;
    for(let i=0;i<m.length;i++){
      const black = id[i*4]<128;
      if(m[i]>0.8){ inN++; if(black) inB++; } else if(m[i]<0.02){ outN++; if(black) outB++; }
    }
    return { in:inB/inN, out:outB/outN };
  }, inv);
  ok(`文字が地と分かれて読める（反転${inv?'あり':'なし'}）`, Math.abs(r.in-r.out)>0.25,
     `中 ${(r.in*100).toFixed(0)}% / 外 ${(r.out*100).toFixed(0)}%`);
}
await page.evaluate(()=>{L.txt.inv=false;bakeTxt()});

const o1 = await page.evaluate(()=>JSON.stringify(order));
const o2 = await page.evaluate(()=>{order.reverse();render();return JSON.stringify(order)});
ok('重なり順を入れ替えられる', o1!==o2);
await page.evaluate(()=>{order.reverse()});

/* ── ② 継ぎ目のないループ ──────────────────────────── */
const seam = await page.evaluate(()=>{
  Object.assign(P,{wave:0.7,freq:2.5,warp:1.5,shN:2,screen:'b8',mode:'a',cell:8}); layout();
  const a=makeFrame(0,false).data, b=makeFrame(1,false).data;
  let d=0; for(let i=0;i<a.length;i+=4) if(a[i]!==b[i]) d++;
  return d;
});
ok('位相0と位相1が1粒も違わない（継ぎ目なし）', seam===0, `差 ${seam}粒`);
const mid = await page.evaluate(()=>{
  const a=makeFrame(0,false).data, b=makeFrame(0.37,false).data;
  let d=0; for(let i=0;i<a.length;i+=4) if(a[i]!==b[i]) d++; return d;
});
ok('途中のコマは変わっている', mid>50, `${mid}粒`);

/* ── ③ 全部の網 ───────────────────────────────────── */
let flat = [];
for(const k of ['b2','b4','b8','dot','v','h','chk','nz','flat','ed']){
  const s = await page.evaluate(kk=>{
    P.mode='a'; P.screen=kk; L.txt.on=false; render();
    const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
    let bl=0,w=0,n=0; for(let p=0;p<d.length;p+=4*37){n++; d[p]>200?w++:bl++;}
    return {bl,w,n};
  }, k);
  if(!(s.bl>s.n*0.02 && s.w>s.n*0.02)) flat.push(`${k}(黒${(s.bl/s.n*100).toFixed(0)}%)`);
}
ok('10種の網が全部刷れる（片方に潰れない）', flat.length===0, flat.join(' '));

/* ── ④ 控え・戻す ─────────────────────────────────── */
const round = await page.evaluate(()=>{
  Object.assign(P,{grad:-0.4,ct:2.1,cell:5}); L.txt.text='ためし'; L.txt.sc=0.77; order=['img','txt'];
  const j=JSON.parse(JSON.stringify(bundle()));
  Object.assign(P,{grad:0.9,ct:0.5,cell:12});  L.txt.text='ちがう'; L.txt.sc=0.2;  order=['txt','img'];
  applyState(j);
  return P.grad===-0.4 && P.ct===2.1 && P.cell===5 && L.txt.text==='ためし'
      && Math.abs(L.txt.sc-0.77)<1e-9 && order[0]==='img';
});
ok('控え（JSON）を開くと元に戻る', round);

await page.evaluate(()=>localStorage.clear());
await page.reload({ waitUntil:'networkidle0' });
const s0 = await page.evaluate(()=>JSON.stringify({P,L,order}));
for(let i=0;i<4;i++) await page.click('#b_rand');
const s4 = await page.evaluate(()=>JSON.stringify({P,L,order}));
for(let i=0;i<8;i++) await page.click('#b_undo');
const sb = await page.evaluate(()=>JSON.stringify({P,L,order}));
ok('ふるで変わる', s0!==s4);
ok('戻す（⌘Z）で元に戻る', sb===s0);

/* ── ⑤ 動画 ──────────────────────────────────────── */
async function shoot(fmt){
  await page.evaluate(f=>{
    Object.assign(P,{wave:0.6,freq:2.2,warp:1.2,shN:2,cyc:1,cell:8,ratio:'1:1'}); resize();
    const pick=(id,v)=>[...document.getElementById(id).children].forEach(x=>x.classList.toggle('on',x.dataset.v===v));
    pick('tvFmt',f); pick('tvFps','12'); pick('tvLoop','1'); pick('tvSz','px');
    const px=document.getElementById('tvPx'); px.value=512; px.dispatchEvent(new Event('input'));
  }, fmt);
  await page.click('#tvGo');
  for(let i=0;i<160;i++){ if(!await page.evaluate(()=>TV.on)) break; await new Promise(r=>setTimeout(r,250)); }
  await new Promise(r=>setTimeout(r,1500));
  return page.evaluate(()=>document.getElementById('tvSize').textContent.replace(/\s+/g,' '));
}
const m4 = await shoot('mp4');
const sq = await shoot('png');
const files = fs.readdirSync(DL);
ok('mp4 が出る',      files.some(f=>/\.mp4$/.test(f)) && !/🔴/.test(m4), m4.slice(0,70));
ok('PNG連番が出る',   files.some(f=>/_seq\.zip$/.test(f)) && !/🔴/.test(sq), sq.slice(0,70));

/* ── 検算：わざと壊した想定で、ちゃんと落ちるか ──────
   ⚠️ 「網をずらす」を整数周でなく端数にすると、位相0と位相1は必ずズレる。
      ここが 0 のままなら、上のループ判定は何も見ていないことになる。 */
const broken = await page.evaluate(()=>{
  Object.assign(P,{wave:0.7,freq:2.5,warp:1.5,shN:2,screen:'b8',mode:'a',cell:8,ratio:'3:4'}); resize();
  const a=makeFrame(0,false).data, b=makeFrame(1 + 0.013,false).data;   // わざと端数を足す
  let d=0; for(let i=0;i<a.length;i+=4) if(a[i]!==b[i]) d++; return d;
});
ok('検算：端数の位相なら、ちゃんとズレを見つける', broken>50, `差 ${broken}粒`);

ok('エラーが出ていない', errors.length===0, errors.join(' / '));

await browser.close();
try{ fs.rmSync(DL, {recursive:true, force:true}); }catch(_){}
console.log(`\n  ${pass} 通過 / ${fail} 失敗`);
process.exit(fail ? 1 : 0);
