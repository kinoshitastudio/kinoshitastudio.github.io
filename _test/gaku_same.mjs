/* ⭐ 余白（額）を足す前後で【既定の絵が1画素も変わっていない】かを見る（共通）。
   使い方： node _test/gaku_same.mjs <道具名> <直す前のファイル>
   ⚠️ 本体は1行も触らない（複製の </body> の前に差し込んで headless で読む）。
   ⭐ 物差しは本体が持っている描き方そのもの（_test/gaku.mjs と同じ表を見る）。 */
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE,'..');
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const HOW = {
  rui:  { shot:`render(c.getContext('2d'), buildPlan(W,H), false)` },
  tama: { shot:`TAMA.paint(c.getContext('2d'), W, H, 0)` },
  hida: { shot:`paint(c.getContext('2d'), W, H, 0, true)` },
  nuri: { shot:`render(c.getContext('2d'), W, H)` },
  sure: { shot:`render(c.getContext('2d'), buildPlan(W,H), false)` },
};
const tool=process.argv[2], head=process.argv[3];
if(!tool||!HOW[tool]||!head){ console.log('使い方: node _test/gaku_same.mjs <道具名> <直す前のファイル>'); process.exit(1); }
const T=`
<script>
const L=[];
addEventListener('error',e=>L.push('例外: '+e.message+' @'+e.lineno));
try{
  const sig=(W,H)=>{const c=document.createElement('canvas');c.width=W;c.height=H;
    ${HOW[tool].shot};
    const d=c.getContext('2d').getImageData(0,0,W,H).data;
    let h=2166136261; for(let i=0;i<d.length;i+=4){h^=d[i];h=Math.imul(h,16777619);
      h^=d[i+3];h=Math.imul(h,16777619);} return (h>>>0).toString(16);};
  for(const [W,H] of [[400,400],[300,420],[520,300],[640,640],[240,720]])
    L.push(W+'x'+H+'  '+sig(W,H));
}catch(e){L.push('落ちた: '+((e&&e.stack)||e));}
const pre=document.createElement('pre');pre.id='R';pre.textContent=L.join('\\n');
document.body.appendChild(pre);
<\/script>`;
function run(src){
  const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'gs-'));
  fs.writeFileSync(path.join(TMP,'t.html'), fs.readFileSync(src,'utf8').replace('</body>',T+'</body>'));
  let dom='';
  try{ dom=execFileSync(CHROME,['--headless=new','--disable-gpu','--virtual-time-budget=40000',
    '--window-size=1400,900','--dump-dom','file://'+path.join(TMP,'t.html')],
    {encoding:'utf8',maxBuffer:1<<28,stdio:['ignore','pipe','ignore'],timeout:180000,killSignal:'SIGKILL'});
  }catch(e){ dom=(e&&e.stdout)?String(e.stdout):''; }
  fs.rmSync(TMP,{recursive:true,force:true});
  const m=dom.match(/<pre id="R">([\s\S]*?)<\/pre>/);
  return m?m[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'):'（取れなかった）';
}
const a=run(head), b=run(path.join(ROOT,tool,'index.html'));
console.log('── 直す前 ──\n'+a+'\n\n── 直した後 ──\n'+b);
const same = a===b && !/落ちた|例外|取れなかった/.test(a);
console.log('\n'+tool+' 同じか: '+(same?'⭐ 1画素も変わっていない':'🔴 変わった／落ちた'));
process.exit(same?0:1);
