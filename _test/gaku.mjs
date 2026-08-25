/* ⭐⭐ 余白（額）の共通試験 ── 2026-08-25
   木下＝「oboro で枠に線をつけるようにした。付いていない道具にも付けて」

   見るのは「落ちない」ではなく、額として成立しているかを【画素で数える】：
     ① 額 0 のときは四辺に額の色が1画素も無い（＝今までの絵のまま）
     ② 額を入れると絵が変わる
     ③ 四辺の帯が【同じ太さ】（短い辺の％。辺ごとに比例させると縦長で上下だけ太くなる
        ＝OBORO で木下に「上下左右大きさ違う？？よね？」と指摘された型）
     ④ 中を2倍にしても【縁は必ず残る】（額は上のレイヤー＝はみ出しは額の下に隠れる）
     ⑤ 寄せても四辺の縁が残る／寄せた側の縁は太らない
     ⑥ ぜんぶ戻すと元の絵に1画素も戻る

   使い方： node _test/gaku.mjs rui
   ⚠️ 本体は1行も触らない（複製の </body> の前に試験を差し込んで headless で読む）。
   ⚠️ 道具ごとに「1枚描く呼び方」だけが違うので、ここ1箇所に表で持つ。 */
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/* 道具ごとに違うのは【P の取り方】と【1枚描く呼び方】の2つだけ。ここ1箇所に表で持つ。
   ⭐ 本体が持っている入口をそのまま呼ぶ（試験が別に描き方を作らない）。 */
const HOW = {
  /* pre＝測る前の下ごしらえ。⚠️ 起動直後が【無地】の道具は「中を大きくしても中身が変わらない」
     ＝道具の性質であって不具合ではないので、中身のある状態にしてから測る。 */
  rui:  { P:'P',      shot:`render(c.getContext('2d'), buildPlan(W,H), false)` },
  tama: { P:'TAMA.P', shot:`TAMA.paint(c.getContext('2d'), W, H, 0)` },
  hida: { P:'P',      shot:`paint(c.getContext('2d'), W, H, 0, true)` },
  nuri: { P:'P',      pre:`PP.pmode='grad'; PP.paper2='#ffffff'; PP.paper='#000000';`,
                      shot:`render(c.getContext('2d'), W, H)` },
  sure: { P:'P',      shot:`render(c.getContext('2d'), buildPlan(W,H), false)` },
};

const tool = process.argv[2];
const src  = process.argv[3] || path.join(ROOT, tool, 'index.html');
if(!tool || !HOW[tool]){ console.log('使い方: node _test/gaku.mjs <道具名>  （表にあるのは '+Object.keys(HOW).join('/')+'）'); process.exit(1); }

const T = `
<script>
const L=[]; const ok=(n,c)=>L.push((c?'OK  ':'NG  ')+n);
addEventListener('error',e=>L.push('NG  例外: '+e.message+' @'+e.lineno));
try{
  /* ⚠️ 本体の P と同じ名前にすると自分を指して落ちる（TDZ）ので別名で持つ */
  const PP = ${HOW[tool].P};
  /* 🔴 額の色が【その道具の地の色】と近いと、地を額と数えてしまう（hida で実際に落ちた）。
     ⭐ 測る前に、どの道具の地とも重ならない色に決め打ちする＝測りたいものだけが動く状態を作る。 */
  PP.gakuCol = '#ff00ff';
  ${HOW[tool].pre || ''}
  const W=400,H=520;
  const shot=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;
    ${HOW[tool].shot};
    return c.getContext('2d').getImageData(0,0,W,H).data;};
  const diff=(A,B)=>{let n=0;for(let i=0;i<A.length;i+=4)if(Math.abs(A[i]-B[i])>8)n++;return n;};
  const isCol=(d,x,y,hex)=>{const i=(y*W+x)*4;
    const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    return Math.abs(d[i]-r)<6 && Math.abs(d[i+1]-g)<6 && Math.abs(d[i+2]-b)<6;};
  /* その辺から数えて、額の色が何画素続くか */
  const band=(d,dir)=>{let n=0;
    for(let k=0;k<Math.min(W,H)/2;k++){
      const p = dir==='L'?[k,H>>1] : dir==='R'?[W-1-k,H>>1] : dir==='T'?[W>>1,k] : [W>>1,H-1-k];
      if(isCol(d,p[0],p[1],PP.gakuCol)) n++; else break;
    } return n;};
  const a=shot();
  ok('額 0 のときは四辺に額の色が無い（'+band(a,'L')+'）', band(a,'L')===0);
  PP.gaku=10;
  const b=shot();
  ok('額を入れると絵が変わる（'+diff(a,b)+'画素）', diff(a,b)>2000);
  const [l,r,t,bo]=[band(b,'L'),band(b,'R'),band(b,'T'),band(b,'B')];
  ok('四辺の帯が同じ太さ（左'+l+' 右'+r+' 上'+t+' 下'+bo+'）', l>0 && l===r && l===t && l===bo);
  ok('帯の太さ＝短い辺の10%（'+l+'px ≒ '+Math.round(Math.min(W,H)*0.10)+'px）',
     Math.abs(l-Math.min(W,H)*0.10)<=2);
  PP.gakuZ=200;
  const c2=shot();
  ok('中を2倍にしても縁は残る（左'+band(c2,'L')+' 上'+band(c2,'T')+'）',
     band(c2,'L')===l && band(c2,'T')===t);
  ok('中を2倍にすると中身は変わる（'+diff(b,c2)+'画素）', diff(b,c2)>2000);
  PP.gakuZ=100; PP.gakuX=30; PP.gakuY=-20;
  const e=shot();
  /* ⭐ 寄せると【寄せた側と反対】に額の色が広がる（窓は動かず中の絵だけ動くため）。
     見るのは「四辺とも縁が残っているか」＝どの辺も 0 にならないこと。 */
  ok('寄せても四辺の縁は残る（左'+band(e,'L')+' 右'+band(e,'R')+' 上'+band(e,'T')+' 下'+band(e,'B')+'）',
     band(e,'L')>0 && band(e,'R')>0 && band(e,'T')>0 && band(e,'B')>0);
  ok('寄せた側の縁は太らない（右'+band(e,'R')+'px ≦ '+l+'px）', band(e,'R')<=l+1);
  PP.gaku=0; PP.gakuX=0; PP.gakuY=0;
  ok('ぜんぶ戻すと元の絵（ずれ '+diff(a,shot())+'）', diff(a,shot())===0);
}catch(e){L.push('NG  落ちた: '+((e&&e.stack)||e));}
const pre=document.createElement('pre');pre.id='R';pre.textContent=L.join('\\n');
document.body.appendChild(pre);
<\/script>`;

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gaku-'));
fs.writeFileSync(path.join(TMP,'t.html'), fs.readFileSync(src,'utf8').replace('</body>', T+'</body>'));
let dom='';
try{ dom=execFileSync(CHROME,['--headless=new','--disable-gpu','--virtual-time-budget=40000',
  '--window-size=1400,900','--dump-dom','file://'+path.join(TMP,'t.html')],
  {encoding:'utf8',maxBuffer:1<<28,stdio:['ignore','pipe','ignore'],timeout:180000,killSignal:'SIGKILL'});
}catch(e){ dom=(e&&e.stdout)?String(e.stdout):''; }
fs.rmSync(TMP,{recursive:true,force:true});
const m=dom.match(/<pre id="R">([\s\S]*?)<\/pre>/);
const out = m?m[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'):'（結果が取れなかった）';
console.log('── 余白（額）'+tool+' ──');
console.log(out);
process.exit(/^NG/m.test(out) ? 1 : 0);
