/* 暈 KASA の通し試験（headless Chrome で全部押す）
   使い方： bash kasa/_test/run.sh      … 全部通れば OK だけが並ぶ */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/* ⚠️ .pathname だと日本語のフォルダ名が %E5.. のまま来て開けない。必ず戻す */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC  = path.join(HERE, '..', 'index.html');
const TMP  = fs.mkdtempSync(path.join(os.tmpdir(), 'kasa-'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

let h = fs.readFileSync(SRC, 'utf8');
const T = `
<script>
const L=[]; const ok=(n,c)=>L.push((c?'OK  ':'NG  ')+n);
addEventListener('error',e=>L.push('NG  例外: '+e.message+' @'+e.lineno));
const shot=(w,hh,t)=>{const c=document.createElement('canvas');c.width=w;c.height=hh;
  KASA.paint(c.getContext('2d'),w,hh,t);return c.getContext('2d').getImageData(0,0,w,hh).data;};
const diff=(A,B)=>{let d=0;for(let i=0;i<A.length;i+=4)if(Math.abs(A[i]-B[i])>8)d++;return d;};
try{
  ok('場ができている', KASA.FW>2 && KASA.FH>2);
  ok('場を作るのが 2秒以内（'+KASA.fieldMs+'ms）', KASA.fieldMs<2000);

  // 版面4つ
  for(const v of ['169','43','1','45']){
    document.querySelector('#ratio button[data-v="'+v+'"]').click();
    KASA.render();                       /* ⚠️ 場は次のコマで作り直される。押した直後に測らない */
    ok('版面 '+v, KASA.FW>2);
  }
  document.querySelector('#ratio button[data-v="169"]').click();

  // つまみを端から端まで（落ちないこと）
  let n=0;
  for(const r of document.querySelectorAll('#panel input[type=range]')){
    const keep=r.value;
    for(const v of [r.min, r.max, keep]){ r.value=v; r.dispatchEvent(new Event('input')); }
    n++;
  }
  ok('つまみ '+n+'本を端まで動かしても落ちない', true);

  // くしゃっとやり直す＝絵が変わる
  const a=shot(140,90,0);
  document.getElementById('b_crush').click();
  const b=shot(140,90,0);
  ok('くしゃっとやり直すと変わる（'+diff(a,b)+'画素）', diff(a,b)>200);

  // ふる → 戻す
  const before=JSON.stringify(KASA.bundle());
  document.getElementById('b_rand').click();
  ok('ふる で変わる', JSON.stringify(KASA.bundle())!==before);
  document.getElementById('b_undo').click();
  ok('戻す が効く', true);

  // 控えの往復
  const j=JSON.stringify(KASA.bundle());
  document.getElementById('b_crush').click();
  KASA.applyState(JSON.parse(j));
  ok('控えの往復', JSON.stringify(KASA.bundle())===j);

  // 穴と灯の数がつまみに従う
  const rh=document.getElementById('r_holeN'); rh.value=7; rh.dispatchEvent(new Event('input'));
  ok('穴の数が合う', KASA.HOLE.length===7);
  const rl=document.getElementById('r_lampN'); rl.value=2; rl.dispatchEvent(new Event('input'));
  ok('灯の数が合う', KASA.LAMP.length===2);

  // 灯を動かすと絵が変わる（＝場を作り直さなくても効く）
  const c1=shot(160,100,0);
  KASA.LAMP[0].x+=0.5; KASA.LAMP[0].y-=0.3;
  const c2=shot(160,100,0);
  ok('灯を動かすと変わる（'+diff(c1,c2)+'画素）', diff(c1,c2)>200);

  // 動き：1周で戻る
  const ro=document.getElementById('r_orbit'); ro.value=0.08; ro.dispatchEvent(new Event('input'));
  const rb=document.getElementById('r_breath'); rb.value=0.4; rb.dispatchEvent(new Event('input'));
  const z0=shot(150,95,0), zh=shot(150,95,0.37), z1=shot(150,95,1);
  ok('途中で動いている（'+diff(z0,zh)+'画素）', diff(z0,zh)>100);
  ok('1周でぴったり戻る（ずれ '+diff(z0,z1)+'）', diff(z0,z1)===0);

  // 再生ボタン
  const g=document.getElementById('anGo');
  g.click(); ok('再生で 止める になる', g.textContent.indexOf('止める')>=0);
  g.click(); ok('もう一度で 再生 に戻る', g.textContent.indexOf('再生')>=0);
  ok('控えに再生中は入らない', KASA.bundle().P.anim===false);

  // 大きく刷れるか
  const [ow,oh]=KASA.outSize();
  const t0=performance.now();
  const c=document.createElement('canvas'); c.width=ow; c.height=oh;
  KASA.paint(c.getContext('2d'),ow,oh,0);
  const ms=Math.round(performance.now()-t0);
  ok(ow+'×'+oh+' を '+ms+'ms で刷れる', ms<20000);
  ok('大きい絵に中身がある', c.getContext('2d').getImageData(ow>>1,oh>>1,1,1).data[3]===255);
}catch(e){ L.push('NG  落ちた: '+((e&&e.stack)||e)); }
const pre=document.createElement('pre'); pre.id='R'; pre.textContent=L.join('\\n');
document.body.appendChild(pre);
<\/script>`;
fs.writeFileSync(path.join(TMP, 't.html'), h.replace('</body>', T + '</body>'));

const dom = execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--virtual-time-budget=30000',
  '--window-size=1400,900', '--dump-dom', 'file://' + path.join(TMP, 't.html')
], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });

const m = dom.match(/<pre id="R">([\s\S]*?)<\/pre>/);
const out = m ? m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '（結果が取れなかった）';
console.log(out);
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(/^NG/m.test(out) ? 1 : 0);
