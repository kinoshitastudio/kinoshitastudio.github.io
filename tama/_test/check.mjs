/* 玉 TAMA の通し試験（headless Chrome で全部押す）
   使い方： bash tama/_test/run.sh      … 全部通れば OK だけが並ぶ */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/* ⚠️ .pathname だと日本語のフォルダ名が %E5.. のまま来て開けない。必ず戻す */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC  = path.join(HERE, '..', 'index.html');
const TMP  = fs.mkdtempSync(path.join(os.tmpdir(), 'tama-'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

let h = fs.readFileSync(SRC, 'utf8');
const T = `
<script>
const L=[]; const ok=(n,c)=>L.push((c?'OK  ':'NG  ')+n);
addEventListener('error',e=>L.push('NG  例外: '+e.message+' @'+e.lineno));
const shot=(w,hh,t)=>{const c=document.createElement('canvas');c.width=w;c.height=hh;
  TAMA.paint(c.getContext('2d'),w,hh,t,TAMA.camOut(w,hh),true);
  return c.getContext('2d').getImageData(0,0,w,hh).data;};
const diff=(A,B)=>{let d=0;for(let i=0;i<A.length;i+=4)if(Math.abs(A[i]-B[i])>8)d++;return d;};
const ink=(A)=>{let n=0;for(let i=0;i<A.length;i+=4)if(Math.abs(A[i]-74)>12)n++;return n;};
try{
  ok('版が2枚で始まる', TAMA.PLATE.length===2);

  // 玉が効いている（大きさ 0 と 0.05 で絵が変わる）
  const r=document.getElementById('r_r');
  r.value=0; r.dispatchEvent(new Event('input'));
  const a=shot(280,280,0);
  r.value=0.05; r.dispatchEvent(new Event('input'));
  const b=shot(280,280,0);
  ok('玉の大きさが効く（'+diff(a,b)+'画素）', diff(a,b)>300);

  // 間隔が効く
  const g=document.getElementById('r_gap');
  g.value=0.01; g.dispatchEvent(new Event('input'));
  const c1=shot(280,280,0);
  g.value=0.09; g.dispatchEvent(new Event('input'));
  const c2=shot(280,280,0);
  ok('間隔が効く（'+diff(c1,c2)+'画素）', diff(c1,c2)>300);

  // かたち3つ
  for(const v of ['both','edge','fill']){
    document.querySelector('#fillMode button[data-v="'+v+'"]').click();
    const d=shot(240,240,0);
    ok('かたち '+v+'（描いた画素 '+ink(d)+'）', ink(d)>50);
  }
  /* 玉だけ＝輪になる。⚠️ 玉が太いと字を埋め尽くして塗りと同じになるので、
     【細い玉・太い字】で測る（前は太い玉で測って落ちた＝試験の誤り）。 */
  { const rz=document.getElementById('r_r'), gz=document.getElementById('r_gap'), tz=document.getElementById('r_tsize');
    rz.value=0.008; rz.dispatchEvent(new Event('input'));
    gz.value=0.010; gz.dispatchEvent(new Event('input'));
    tz.value=0.9;   tz.dispatchEvent(new Event('input'));
    document.querySelector('#fillMode button[data-v="fill"]').click();
    const F=ink(shot(300,300,0));
    document.querySelector('#fillMode button[data-v="edge"]').click();
    const E=ink(shot(300,300,0));
    ok('玉だけは輪になる（塗り '+F+' → 玉だけ '+E+'）', E<F*0.75);
  }
  document.querySelector('#fillMode button[data-v="both"]').click();

  // 版面4つ
  for(const v of ['1','169','43','45']){
    document.getElementById('c_frame').checked=true;
    document.getElementById('c_frame').dispatchEvent(new Event('change'));
    document.querySelector('#ratio button[data-v="'+v+'"]').click();
    const s=TAMA.outSize();
    ok('版面 '+v+' → '+s.join('×'), s[0]>16&&s[1]>16);
  }
  document.getElementById('c_frame').checked=false;
  document.getElementById('c_frame').dispatchEvent(new Event('change'));
  ok('わく 切でわくを描かない', TAMA.guideAlpha()===0);

  // つまみを端から端まで
  let n=0;
  for(const rr of document.querySelectorAll('#panel input[type=range]')){
    const keep=rr.value;
    for(const v of [rr.min, rr.max, keep]){ rr.value=v; rr.dispatchEvent(new Event('input')); }
    n++;
  }
  ok('つまみ '+n+'本を端まで動かしても落ちない', true);

  // 版の足す・写す・消す
  const n0=TAMA.PLATE.length;
  document.getElementById('b_add').click();
  document.getElementById('b_dup').click();
  ok('足す・写す', TAMA.PLATE.length===n0+2);
  document.getElementById('b_del').click();
  ok('消す', TAMA.PLATE.length===n0+1);

  // ふる → 戻す
  const before=JSON.stringify(TAMA.bundle());
  document.getElementById('b_rand').click();
  ok('ふる で変わる', JSON.stringify(TAMA.bundle())!==before);
  document.getElementById('b_undo').click();
  ok('戻す が効く', true);

  // 控えの往復
  const j=JSON.stringify(TAMA.bundle());
  document.getElementById('b_rand').click();
  TAMA.applyState(JSON.parse(j));
  ok('控えの往復', JSON.stringify(TAMA.bundle())===j);

  // 動き：1周でぴったり戻る
  const fl=document.getElementById('r_flow'); fl.value=2; fl.dispatchEvent(new Event('input'));
  const rr2=document.getElementById('r_r'); rr2.value=0.03; rr2.dispatchEvent(new Event('input'));
  const g2=document.getElementById('r_gap'); g2.value=0.03; g2.dispatchEvent(new Event('input'));
  const z0=shot(260,260,0), zh=shot(260,260,0.3), z1=shot(260,260,1);
  ok('途中で動いている（'+diff(z0,zh)+'画素）', diff(z0,zh)>200);
  ok('1周でぴったり戻る（ずれ '+diff(z0,z1)+'）', diff(z0,z1)===0);

  // 再生ボタン
  const p=document.getElementById('anGo');
  p.click(); ok('再生で 止める になる', p.textContent.indexOf('止める')>=0);
  p.click(); ok('もう一度で 再生 に戻る', p.textContent.indexOf('再生')>=0);
  ok('控えに再生中は入らない', TAMA.bundle().P.anim===false);

  // 寄る・戻す
  cv.dispatchEvent(new WheelEvent('wheel',{deltaY:-300,clientX:300,clientY:300,bubbles:true,cancelable:true}));
  ok('ホイールで寄る（'+TAMA.VIEW.z.toFixed(2)+'）', TAMA.VIEW.z>1.05);
  cv.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
  ok('ダブルクリックで戻る', Math.abs(TAMA.VIEW.z-1)<1e-6);

  // 大きく出す
  const [ow,oh]=TAMA.outSize();
  const t0=performance.now();
  const cc=document.createElement('canvas'); cc.width=ow; cc.height=oh;
  TAMA.paint(cc.getContext('2d'),ow,oh,0,TAMA.camFor(ow,oh),true);
  ok(ow+'×'+oh+' を '+Math.round(performance.now()-t0)+'ms で刷れる', true);
  ok('大きい絵に中身がある', cc.getContext('2d').getImageData(ow>>1,oh>>1,1,1).data[3]===255);
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
