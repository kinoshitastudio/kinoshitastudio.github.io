/* ⭐⭐ 書き出しの縁（2026-08-27）
   木下＝「HARIの書き出しpngがまだ余白が出てしまっているよ。
   はみ出しているのは書き出しされないようにして書き出しできるように」
   ＋ 木下の実ファイル（夏の日残像4.json）で再現した。

   🔴 出ていたのは【はみ出し】ではなく【足りない側】＝図が版面より少し小さく
      （992×1240 に対し版面 1000×1250）、右と下に地の色が帯で残っていた。
   ⭐ 図に「縁を出さない」を入れると、**描くときだけ**版面を覆う大きさに広げる
      （状態は1ミリも書き換えない＝切れば元の絵に戻る）。
   ⚠️ 見るのは【焼いた PNG の四辺に地の色が残っていないか】。
   使い方: node hari/_test/edge.mjs <URL> <json> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'node:fs';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1200, height:800, deviceScaleFactor:1 });
await p.goto(process.argv[2], { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3500));
const json = fs.readFileSync(process.argv[3], 'utf8');
const R = await p.evaluate(async (txt) => {
  const w = ms => new Promise(r=>setTimeout(r,ms));
  const f = new File([txt], 'a.json', { type:'application/json' });
  const dt = new DataTransfer(); dt.items.add(f);
  const inp = document.getElementById('fJSON');
  inp.files = dt.files; inp.dispatchEvent(new Event('change',{bubbles:true}));
  await w(2500);
  const before = await bakeCanvas();
  const gb = before.getContext('2d');
  const isBg0 = (x,y)=>{ const d=gb.getImageData(x,y,1,1).data;
    return Math.abs(d[0]-217)<8 && Math.abs(d[1]-221)<8 && Math.abs(d[2]-224)<8; };
  let 前の右=0; for(let i=0;i<40;i++) if(isBg0(before.width-6, 40+i*Math.floor((before.height-80)/40))) 前の右++;
  /* ⭐ 何も押さずに（fill を入れずに）出した絵にも、帯が残っていないか */
  let 押さずの右=0, 押さずの下=0;
  for(let i=0;i<40;i++){
    if(isBg0(before.width-6, 40+i*Math.floor((before.height-80)/40))) 押さずの右++;
    if(isBg0(40+i*Math.floor((before.width-80)/40), before.height-6)) 押さずの下++;
  }
  /* ⭐ 図に「縁を出さない」を入れる */
  const pc = S.pieces.find(x=>x.src); if(pc){ pc.fill = 1; render(); await w(600); }
  const c = await bakeCanvas();
  const g = c.getContext('2d');
  const at = (x,y)=>{ const d=g.getImageData(x,y,1,1).data; return [d[0],d[1],d[2]]; };
  const line = (x0,y0,dx,dy,n)=>{ const out=[]; for(let i=0;i<n;i++) out.push(at(x0+dx*i, y0+dy*i)); return out; };
  /* 四辺の内側10px を見る＝地の色（#d9dde0）が帯で残っていないか */
  const isBg = ([r,gg,bb]) => Math.abs(r-217)<8 && Math.abs(gg-221)<8 && Math.abs(bb-224)<8;
  const right = line(c.width-6, 40, 0, Math.floor((c.height-80)/40), 40);
  const bottom= line(40, c.height-6, Math.floor((c.width-80)/40), 0, 40);
  const left  = line(5, 40, 0, Math.floor((c.height-80)/40), 40);
  const top   = line(40, 5, Math.floor((c.width-80)/40), 0, 40);
  return { 前の右, 押さずの右, 押さずの下, 大きさ:[c.width,c.height],
           右:right.filter(isBg).length, 下:bottom.filter(isBg).length,
           左:left.filter(isBg).length, 上:top.filter(isBg).length,
           図:S.pieces.length, 版面:[S.board.w,S.board.h] };
}, json);
await b.close();
let ng = 0;
const ok = (c,n,note)=>{ console.log(`  ${c?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!c) ng++; };
console.log('── ⭐⭐ 書き出しの縁（地の帯が残らないか）');
ok(errs.length === 0, 'JSエラーが出ない', errs.length + '件' + (errs[0] ? ' → ' + errs[0] : ''));
ok(R.押さずの右 === 0 && R.押さずの下 === 0,
   '⭐⭐ 何も押さなくても帯が出ない（ほぼ覆っている図は自動で埋める）',
   `右${R.押さずの右} 下${R.押さずの下}`);
ok(R.右 === 0 && R.下 === 0 && R.左 === 0 && R.上 === 0,
   '⭐⭐ 「縁を出さない」を入れると四辺とも地の帯が消える',
   `右${R.右} 下${R.下} 左${R.左} 上${R.上}`);
process.exit(ng ? 1 : 0);
