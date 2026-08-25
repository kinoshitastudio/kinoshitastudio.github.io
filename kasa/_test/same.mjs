/* 直す前（HEAD）と後で【既定の絵が1画素も変わっていない】かを見る
   使い方： node kasa-same.mjs   （先に head.py で /tmp/kasa_head.html を作っておく） */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const T = `
<script>
const L=[];
addEventListener('error',e=>L.push('例外: '+e.message+' @'+e.lineno));
try{
  const W=220,H=140;
  const sig=t=>{const c=document.createElement('canvas');c.width=W;c.height=H;
    KASA.paint(c.getContext('2d'),W,H,t);
    const d=c.getContext('2d').getImageData(0,0,W,H).data;
    let h=2166136261; for(let i=0;i<d.length;i+=4){h^=d[i];h=Math.imul(h,16777619);}
    return (h>>>0).toString(16);};
  L.push('既定 t=0   '+sig(0));
  L.push('既定 t=0.5 '+sig(0.5));
  KASA.P.orbit=0.55; KASA.P.breath=0.14; KASA.rebuild();
  L.push('巡り.55息.14 t=0.25 '+sig(0.25));
}catch(e){ L.push('落ちた: '+((e&&e.stack)||e)); }
const pre=document.createElement('pre'); pre.id='R'; pre.textContent=L.join('\\n');
document.body.appendChild(pre);
<\/script>`;

function run(src){
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'kasa-same-'));
  const h = fs.readFileSync(src, 'utf8');
  fs.writeFileSync(path.join(TMP, 't.html'), h.replace('</body>', T + '</body>'));
  let dom='';
  try{
    dom = execFileSync(CHROME, ['--headless=new','--disable-gpu','--virtual-time-budget=30000',
      '--window-size=1400,900','--dump-dom','file://'+path.join(TMP,'t.html')],
      { encoding:'utf8', maxBuffer:1<<28, stdio:['ignore','pipe','ignore'], timeout:180000, killSignal:'SIGKILL' });
  }catch(e){ dom = (e && e.stdout) ? String(e.stdout) : ''; }
  fs.rmSync(TMP,{recursive:true,force:true});
  const m = dom.match(/<pre id="R">([\s\S]*?)<\/pre>/);
  return m ? m[1] : '（取れなかった）';
}
const a = run('/tmp/kasa_head.html');
const b = run('/Users/kinoshitatakahiro/Desktop/GitHub-clone/名称未設定/kasa/index.html');
console.log('── 直す前 ──\n' + a + '\n── 直した後 ──\n' + b);
console.log('\n同じか: ' + (a === b ? '⭐ 1画素も変わっていない' : '🔴 変わっている'));
