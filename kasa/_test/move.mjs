/* 暈 KASA ── 「動きがどれだけ絵を変えるか」を実測する（幅を広げる前の物差し）
   使い方： node kasa-move.mjs
   ⚠️ 本体は1行も触らない。複製の </body> の前に測る script を差し込むだけ。 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const SRC = '/Users/kinoshitatakahiro/Desktop/GitHub-clone/名称未設定/kasa/index.html';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'kasa-move-'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const T = `
<script>
const L=[];
addEventListener('error',e=>L.push('例外: '+e.message+' @'+e.lineno));
/* 小さく刷って速く測る（絵の変わり方の比較なので大きさは要らない） */
const W=180,H=110;
const shot=t=>{const c=document.createElement('canvas');c.width=W;c.height=H;
  KASA.paint(c.getContext('2d'),W,H,t);return c.getContext('2d').getImageData(0,0,W,H).data;};
/* 動いた量＝明るさが 8 以上変わった画素の割合（％）と、平均のずれ */
const moved=(A,B)=>{let n=0,s=0;for(let i=0;i<A.length;i+=4){const d=Math.abs(A[i]-B[i]);s+=d;if(d>8)n++;}
  return [ (n/(A.length/4)*100), (s/(A.length/4)) ];};
function measure(name,set){
  Object.assign(KASA.P,set);
  KASA.rebuild();
  const a=shot(0), b=shot(0.25), c=shot(0.5);
  const [p1,m1]=moved(a,b), [p2,m2]=moved(a,c);
  L.push(name.padEnd(30)+' 1/4周: '+p1.toFixed(1)+'% (平均'+m1.toFixed(1)+')'
        +'  半周: '+p2.toFixed(1)+'% (平均'+m2.toFixed(1)+')');
}
try{
  L.push('灯の数='+KASA.P.lampN+' 広がり='+KASA.P.lampR+' 強さ='+KASA.P.lampI);
  measure('いまの既定（巡り.05 息.18）', {orbit:0.05, breath:0.18});
  measure('木下の設定（巡り.55 息.14）', {orbit:0.55, breath:0.14});
  measure('いまの上限（巡り.8 息.8）',   {orbit:0.80, breath:0.80});
  measure('広げた案A（巡り1.5 息.8）',   {orbit:1.50, breath:0.80});
  measure('広げた案B（巡り2.5 息1.5）',  {orbit:2.50, breath:1.50});
  measure('息だけ（巡り0 息1.5）',       {orbit:0,    breath:1.50});
  measure('巡りだけ（巡り2.5 息0）',     {orbit:2.50, breath:0});
  /* 広がりを狭めると動きが目立つか（灯が広いと動いても絵が変わらない疑い） */
  measure('広がり狭め（.2）＋巡り.8',    {lampR:0.20, orbit:0.80, breath:0.20});
  measure('広がり広め（1.0）＋巡り.8',   {lampR:1.00, orbit:0.80, breath:0.20});
  /* ⭐ 足した「穴の巡り」＝黒い形そのものが動く */
  measure('★穴だけ巡る（.3）',          {lampR:0.42, orbit:0, breath:0, holeOrbit:0.30});
  measure('★穴だけ巡る（.6）',          {lampR:0.42, orbit:0, breath:0, holeOrbit:0.60});
  measure('★穴.3＋灯.55＋息.14',        {lampR:0.42, orbit:0.55, breath:0.14, holeOrbit:0.30});
  measure('穴0 に戻すと元と同じか',      {lampR:0.42, orbit:0.55, breath:0.14, holeOrbit:0});
}catch(e){ L.push('落ちた: '+((e&&e.stack)||e)); }
const pre=document.createElement('pre'); pre.id='R'; pre.textContent=L.join('\\n');
document.body.appendChild(pre);
<\/script>`;

const h = fs.readFileSync(SRC, 'utf8');
fs.writeFileSync(path.join(TMP, 't.html'), h.replace('</body>', T + '</body>'));
const dom = execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--virtual-time-budget=60000',
  '--window-size=1200,800', '--dump-dom', 'file://' + path.join(TMP, 't.html')
], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
const m = dom.match(/<pre id="R">([\s\S]*?)<\/pre>/);
console.log(m ? m[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>') : '（結果が取れなかった）');
fs.rmSync(TMP, { recursive: true, force: true });
