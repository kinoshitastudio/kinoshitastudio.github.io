/* 穴の巡りを上げると【文字の動きが止まる】のか？ を切り分ける
   ・光の動き（＝文字の陰影の変化）だけを見る＝穴が乗っている所を外して測る
   ・1コマにかかる時間も測る（遅くなって止まって見えるだけ、を疑う） */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const SRC = '/Users/kinoshitatakahiro/Desktop/GitHub-clone/名称未設定/kasa/index.html';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'kasa-hole-'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const T = `
<script>
const L=[];
addEventListener('error',e=>L.push('例外: '+e.message+' @'+e.lineno));
const W=240,H=150;
function shot(t){const c=document.createElement('canvas');c.width=W;c.height=H;
  const t0=performance.now();
  KASA.paint(c.getContext('2d'),W,H,t);
  const ms=performance.now()-t0;
  return [c.getContext('2d').getImageData(0,0,W,H).data, ms];}
/* 穴が乗る所は【黒（10未満）】なので、両方のコマで黒くない画素だけ数える
   ＝穴そのものの移動を除いた「光と紙の動き」を見る */
function lightMove(A,B){
  let n=0,s=0,c=0;
  for(let i=0;i<A.length;i+=4){
    if(A[i]<14||B[i]<14) continue;           /* 穴・壁の黒は数えない */
    c++; const d=Math.abs(A[i]-B[i]); s+=d; if(d>8) n++;
  }
  return [ c?n/c*100:0, c?s/c:0, c ];
}
function run(name,set){
  Object.assign(KASA.P,set); KASA.rebuild();
  const [a,ma]=shot(0), [b,mb]=shot(0.25), [d]=shot(0.5);
  const [p1,m1]=lightMove(a,b), [p2,m2]=lightMove(a,d);
  L.push(name.padEnd(26)+' 光の動き 1/4周 '+p1.toFixed(1)+'%('+m1.toFixed(1)+')'
        +'  半周 '+p2.toFixed(1)+'%('+m2.toFixed(1)+')'
        +'  1コマ '+((ma+mb)/2).toFixed(0)+'ms');
}
try{
  run('穴0   灯.55 息.14', {orbit:0.55, breath:0.14, holeOrbit:0});
  run('穴.20 灯.55 息.14', {orbit:0.55, breath:0.14, holeOrbit:0.20});
  run('穴.44 灯.55 息.14', {orbit:0.55, breath:0.14, holeOrbit:0.44});
  run('穴.80 灯.55 息.14', {orbit:0.55, breath:0.14, holeOrbit:0.80});
  /* 穴の数と大きさも見る（穴が多い・大きいと画面を覆って光の変化が隠れる） */
  L.push('穴の数='+KASA.P.holeN+' 穴の大きさ='+KASA.P.holeR);
  run('穴.44・穴を小さく',   {orbit:0.55, breath:0.14, holeOrbit:0.44, holeR:0.03});
  /* ⭐ 足した「揺れ」＝紙と文字そのものが動く（光は止めて、揺れだけで見る） */
  run('★揺れ.02 だけ',      {orbit:0, breath:0, holeOrbit:0, holeR:0.03, sway:0.02});
  run('★揺れ.05 だけ',      {orbit:0, breath:0, holeOrbit:0, holeR:0.03, sway:0.05});
  run('★揺れ.02＋灯.55',    {orbit:0.55, breath:0.14, holeOrbit:0, holeR:0.03, sway:0.02});
  run('揺れ0 に戻す',        {orbit:0.55, breath:0.14, holeOrbit:0, holeR:0.03, sway:0});
  /* ⭐ 実寸（画面と同じくらいの大きさ）で1コマの時間を測る＝遅くて止まって見える説を潰す */
  {
    const BW=1150,BH=719;
    const big=t=>{const c=document.createElement('canvas');c.width=BW;c.height=BH;
      const t0=performance.now(); KASA.paint(c.getContext('2d'),BW,BH,t);
      return performance.now()-t0;};
    for(const k of [0, 0.44, 0.80]){
      Object.assign(KASA.P,{orbit:0.55,breath:0.14,holeOrbit:k}); KASA.rebuild();
      big(0);                                   /* 1回目は場を作るので捨てる */
      const ms=[big(0.1),big(0.2),big(0.3)].reduce((a,b)=>a+b,0)/3;
      L.push('実寸 1150×719 穴'+k+' → 1コマ '+ms.toFixed(0)+'ms（'+(1000/ms).toFixed(1)+'コマ/秒）');
    }
  }
}catch(e){ L.push('落ちた: '+((e&&e.stack)||e)); }
const pre=document.createElement('pre'); pre.id='R'; pre.textContent=L.join('\\n');
document.body.appendChild(pre);
<\/script>`;

const h = fs.readFileSync(SRC, 'utf8');
fs.writeFileSync(path.join(TMP, 't.html'), h.replace('</body>', T + '</body>'));
let dom='';
try{
  dom = execFileSync(CHROME, ['--headless=new','--disable-gpu','--virtual-time-budget=60000',
    '--window-size=1200,800','--dump-dom','file://'+path.join(TMP,'t.html')],
    { encoding:'utf8', maxBuffer:1<<28, stdio:['ignore','pipe','ignore'], timeout:240000, killSignal:'SIGKILL' });
}catch(e){ dom = (e&&e.stdout)?String(e.stdout):''; }
const m = dom.match(/<pre id="R">([\s\S]*?)<\/pre>/);
console.log(m ? m[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>') : '（結果が取れなかった）');
fs.rmSync(TMP, { recursive: true, force: true });
