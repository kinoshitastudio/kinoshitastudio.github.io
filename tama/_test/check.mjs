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
const $=id=>document.getElementById(id);
const set=(id,v)=>{const r=$(id); r.value=v; r.dispatchEvent(new Event('input'));};
/* ⚠️ 見本はトグル。すでに置いてあるのに押すと【取り下げ】になる（前はそれで空になり落ちた） */
const ensurePre=v=>{ if(TAMA.P.preset!==v) document.querySelector('#pre button[data-v="'+v+'"]').click(); };
try{
  ok('層が2つで始まる', TAMA.LAYER.length===2);
  ok('どちらも字の層', TAMA.LAYER.every(l=>l.kind==='text'));

  // 玉が効いている
  set('r_r',0); const a=shot(280,280,0);
  set('r_r',0.05); const b=shot(280,280,0);
  ok('玉の大きさが効く（'+diff(a,b)+'画素）', diff(a,b)>300);
  set('r_gap',0.25); const c1=shot(280,280,0);
  set('r_gap',1.5);  const c2=shot(280,280,0);
  ok('間隔が効く（'+diff(c1,c2)+'画素）', diff(c1,c2)>300);

  // ⭐ つまみは【選んだ層だけ】に効く
  { const other=TAMA.LAYER[0]===TAMA.cur()?TAMA.LAYER[1]:TAMA.LAYER[0];
    const keep=other.r;
    set('r_r',0.11);
    ok('選んだ層だけ変わる（選 '+TAMA.cur().r+' / 他 '+other.r+'）', TAMA.cur().r===0.11 && other.r===keep);
    set('r_r',0.045);
  }

  // かたち3つ
  for(const v of ['both','edge','fill']){
    document.querySelector('#fillMode button[data-v="'+v+'"]').click();
    ok('かたち '+v, TAMA.cur().mode===v);
  }
  /* 玉だけ＝輪になる。⚠️ 玉が太いと字を埋め尽くすので【細い玉・太い字】で測る */
  { set('r_r',0.008); set('r_gap',0.5); set('r_tsize',0.9);
    document.querySelector('#fillMode button[data-v="fill"]').click();
    const F=ink(shot(300,300,0));
    document.querySelector('#fillMode button[data-v="edge"]').click();
    const E=ink(shot(300,300,0));
    ok('玉だけは輪になる（塗り '+F+' → 玉だけ '+E+'）', E<F*0.75);
    document.querySelector('#fillMode button[data-v="both"]').click();
    set('r_r',0.045); set('r_gap',0.6); set('r_tsize',0.52);
  }

  // ばらつき
  { set('r_vary',0); const a0=shot(280,280,0);
    set('r_vary',0.5); const a1=shot(280,280,0);
    ok('ばらつきが効く（'+diff(a0,a1)+'画素）', diff(a0,a1)>200);
    set('r_flow',1);
    const b0=shot(240,240,0), b1=shot(240,240,1);
    ok('ばらつきありでも1周で戻る（ずれ '+diff(b0,b1)+'）', diff(b0,b1)===0);
    set('r_flow',0); set('r_vary',0);
  }

  // 層：足す・写す・消す
  { const n0=TAMA.LAYER.length;
    $('b_addT').click(); $('b_addD').click();
    ok('文字と線を足せる', TAMA.LAYER.length===n0+2 && TAMA.LAYER[TAMA.LAYER.length-1].kind==='draw');
    $('b_dup').click();
    ok('写せる', TAMA.LAYER.length===n0+3);
    /* ⭐ 写しは下にずれて色が変わる＝複製できたことが見える */
    { const me=TAMA.LAYER[TAMA.sel], under=TAMA.LAYER[TAMA.sel-1];
      ok('写しはずれる', Math.abs(under.ox-me.ox)>0.005);
      ok('写しは色が変わる', under.col!==me.col); }
    $('b_del').click(); $('b_del').click(); $('b_del').click();
    ok('消せる', TAMA.LAYER.length===n0);
  }

  // 見本＝押すと置く／もう一度で取り下げる
  { const pb=document.querySelector('#pre button[data-v="kasane"]');
    const n0=TAMA.LAYER.length;
    pb.click();
    ok('見本を置くと見本の層になる（'+n0+'→'+TAMA.LAYER.length+'）', TAMA.LAYER.length===2 && TAMA.P.preset==='kasane');
    ok('見本のボタンが光る', pb.classList.contains('on'));
    pb.click();
    ok('もう一度で取り下げる（'+TAMA.LAYER.length+'）', TAMA.P.preset===null && TAMA.LAYER.length===0);
    ok('ボタンの光が消える', !pb.classList.contains('on'));
  }
  // 見本を置いたまま まっさら＝全部消える
  { document.querySelector('#pre button[data-v="futaji"]').click();
    $('b_wipe').click();
    ok('まっさらで層が0になる', TAMA.LAYER.length===0 && TAMA.P.preset===null);
    document.querySelector('#pre button[data-v="kasane"]').click();
  }

  // 描く＝線の層に入る
  { $('c_draw').checked=true; $('c_draw').dispatchEvent(new Event('change'));
    ok('描くを入れると線の層に移る', TAMA.cur().kind==='draw');
    const before=shot(240,240,0);
    TAMA.cur().strokes.push([[-0.5,0,1],[0,0.2,1],[0.5,-0.1,1]]);
    const after=shot(240,240,0);
    ok('描いた線が刷られる（'+diff(before,after)+'画素）', diff(before,after)>200);
    $('b_undoline').click();
    ok('1本消すで減る', TAMA.cur().strokes.length===0);
    $('c_draw').checked=false; $('c_draw').dispatchEvent(new Event('change'));
  }

  // 層は全部消せる（⚠️ 前は「層は1つは要る」で最後の1枚が残った）
  { $('b_wipe').click(); $('b_addT').click(); $('b_addD').click();
    $('b_del').click(); $('b_del').click();
    ok('消すで層が0になる', TAMA.LAYER.length===0);
    const empty=ink(shot(200,200,0));
    ok('0枚なら何も刷らない（'+empty+'画素）', empty===0);
    $('b_addT').click();
    ok('0枚から文字を足せる', TAMA.LAYER.length===1);
  }

  // 筆圧＝点ごとの太さ（⚠️ 字も数えると差が薄まるので線だけで測る）
  { $('b_wipe').click();
    $('b_addD').click();
    TAMA.cur().strokes=[[[-0.6,0,0.4],[0,0,0.4],[0.6,0,0.4]]];
    const thin=ink(shot(260,260,0));
    TAMA.cur().strokes=[[[-0.6,0,1.5],[0,0,1.5],[0.6,0,1.5]]];
    const thick=ink(shot(260,260,0));
    ok('点ごとの太さが効く（細 '+thin+' < 太 '+thick+'）', thin<thick*0.7);
    $('b_wipe').click();
  }

  // 二色で描く＝写しが別の層に別の色で同時に増える
  { $('b_wipe').click(); $('b_addD').click();
    $('c_pair').checked=true; $('c_pair').dispatchEvent(new Event('change'));
    const pe=(ty,x,y)=>cv.dispatchEvent(new PointerEvent(ty,{clientX:x,clientY:y,button:0,buttons:1,
      pointerId:1,pointerType:'mouse',bubbles:true,cancelable:true}));
    cv.setPointerCapture=()=>{};
    pe('pointerdown',300,300); pe('pointermove',400,380); pe('pointerup',400,380);
    ok('二色で描くと層が2つになる（'+TAMA.LAYER.length+'）', TAMA.LAYER.length===2);
    const me=TAMA.cur(), tw=TAMA.LAYER.find(l=>l.twinOf===me.id);
    ok('写しができる', !!tw && tw.strokes.length===1);
    ok('写しは色が違う', tw.col!==me.col);
    /* 🔴 下に差し込むと選ぶ場所がずれて、写しの方に描いてしまう前例あり */
    pe('pointerdown',320,420); pe('pointermove',520,460); pe('pointerup',520,460);
    ok('2本目も同じ2層のまま（'+TAMA.LAYER.length+'）', TAMA.LAYER.length===2);
    ok('両方 2本', TAMA.cur().strokes.length===2 && tw.strokes.length===2);
    $('b_undoline').click();
    ok('1本消すと写しも減る', TAMA.cur().strokes.length===1 && tw.strokes.length===1);
    /* ⭐ 形のつまみは連動する（木下＝「筆の太さなども同じように連動して」） */
    const rp=$('r_pen'); rp.value='0.12'; rp.dispatchEvent(new Event('input'));
    ok('筆の太さが写しにも効く（'+tw.pen+'）', Math.abs(tw.pen-0.12)<1e-9);
    ok('色は連動しない', tw.col!==TAMA.cur().col);
    /* ⚠️ 連動は両向き＝写しを選んで直しても元がついてくる */
    const back=TAMA.LAYER.indexOf(tw); const keepSel=TAMA.sel;
    TAMA.pick(back);
    const rr2=$('r_r'); rr2.value='0.08'; rr2.dispatchEvent(new Event('input'));
    ok('写し側から直すと元も合う', Math.abs(TAMA.LAYER[keepSel].r-0.08)<1e-9);
    $('c_pair').checked=false; $('c_pair').dispatchEvent(new Event('change'));
    $('b_wipe').click();
  }

  // 字も二色で（写しがついてくる）
  { $('b_wipe').click(); $('b_addT').click();
    const src=TAMA.cur();
    $('c_pairT').checked=true; $('c_pairT').dispatchEvent(new Event('change'));
    ok('字を二色でにすると層が2つ（'+TAMA.LAYER.length+'）', TAMA.LAYER.length===2);
    const tw2=TAMA.LAYER.find(l=>l.twinOf===src.id);
    ok('字の写しも【字】の層', !!tw2 && tw2.kind==='text');
    ok('字の写しは色が違う', !!tw2 && tw2.col!==src.col);
    ok('字の写しはずれている', !!tw2 && (tw2.ox!==src.ox||tw2.oy!==src.oy));
    /* 🔴 差し込みで選ぶ場所がずれていないこと＝元を選んだままのはず */
    ok('元を選んだまま', TAMA.cur().id===src.id);
    const ta=$('t_text'); ta.value='ふたいろ'; ta.dispatchEvent(new Event('input'));
    ok('打ち直した字が写しにもつく（'+tw2.text+'）', tw2.text==='ふたいろ');
    const rs=$('r_tsize'); rs.value='0.9'; rs.dispatchEvent(new Event('input'));
    ok('大きさも連動（'+tw2.tsize+'）', Math.abs(tw2.tsize-0.9)<1e-9);
    /* 写しを選んでいる間は入れっぱなしで触れない（写しの写しを作らない） */
    TAMA.pick(TAMA.LAYER.indexOf(tw2));
    ok('写しを選ぶと二色では触れない', $('c_pairT').disabled===true && $('c_pairT').checked===true);
    TAMA.pick(TAMA.LAYER.indexOf(src));
    $('c_pairT').checked=false; $('c_pairT').dispatchEvent(new Event('change'));
    ok('切ると写しが消える（'+TAMA.LAYER.length+'）', TAMA.LAYER.length===1);
    TAMA.undo();
    ok('⌘Zで写しが戻る（'+TAMA.LAYER.length+'）', TAMA.LAYER.length===2);
    $('b_wipe').click();
  }

  // 盤の上で組（元＋写し）を動かす
  { $('b_wipe').click(); $('b_addT').click();
    const src=TAMA.cur();
    $('c_pairT').checked=true; $('c_pairT').dispatchEvent(new Event('change'));
    const tw=TAMA.LAYER.find(l=>l.twinOf===src.id);
    const d0x=+(tw.ox-src.ox).toFixed(3), d0y=+(tw.oy-src.oy).toFixed(3);
    const o0x=src.ox, o0y=src.oy;
    const pe=(ty,x,y,sh)=>cv.dispatchEvent(new PointerEvent(ty,{clientX:x,clientY:y,button:0,buttons:1,
      shiftKey:!!sh,pointerId:3,pointerType:'mouse',bubbles:true,cancelable:true}));
    cv.setPointerCapture=()=>{};
    pe('pointerdown',300,300); pe('pointermove',420,360); pe('pointerup',420,360);
    ok('左ドラッグで動く（'+src.ox+','+src.oy+'）', src.ox!==o0x && src.oy!==o0y);
    ok('右下へ引いたら右下へ動く', src.ox>o0x && src.oy>o0y);
    ok('写しも一緒に動く（ずれの差は同じ）',
       Math.abs((tw.ox-src.ox)-d0x)<1e-9 && Math.abs((tw.oy-src.oy)-d0y)<1e-9);
    ok('つまみにも出る', Math.abs(+$('r_ox').value-src.ox)<1e-9);
    TAMA.undo();
    ok('⌘Zで動かす前に戻る', Math.abs(TAMA.cur().ox-o0x)<1e-9);
    /* ⚠️ 筆を構えている間は筆が先。動かすのは Shift＋左ドラッグ */
    $('b_wipe').click(); $('b_addD').click();
    const dl=TAMA.cur(), dx0=dl.ox;
    pe('pointerdown',300,300); pe('pointermove',380,340); pe('pointerup',380,340);
    ok('筆のときは左ドラッグで描く（動かさない）', dl.ox===dx0 && dl.strokes.length===1);
    pe('pointerdown',300,300,true); pe('pointermove',380,340,true); pe('pointerup',380,340,true);
    ok('Shift＋左ドラッグなら描かずに動く', dl.ox!==dx0 && dl.strokes.length===1);
    $('b_wipe').click();
  }

  // 版面4つ
  ensurePre('futaji');
  for(const v of ['1','169','43','45']){
    $('c_frame').checked=true; $('c_frame').dispatchEvent(new Event('change'));
    document.querySelector('#ratio button[data-v="'+v+'"]').click();
    const s=TAMA.outSize();
    ok('版面 '+v+' → '+s.join('×'), s[0]>16&&s[1]>16);
  }
  $('c_frame').checked=false; $('c_frame').dispatchEvent(new Event('change'));
  ok('わく 切でわくを描かない', TAMA.guideAlpha()===0);

  // つまみを端から端まで
  let n=0;
  for(const rr of document.querySelectorAll('#panel input[type=range]')){
    const keep=rr.value;
    for(const v of [rr.min, rr.max, keep]){ rr.value=v; rr.dispatchEvent(new Event('input')); }
    n++;
  }
  ok('つまみ '+n+'本を端まで動かしても落ちない', true);

  // ふる → 戻す／控えの往復
  const before=JSON.stringify(TAMA.bundle());
  $('b_rand').click();
  ok('ふる で変わる', JSON.stringify(TAMA.bundle())!==before);
  /* ⚠️ 前は「押しても落ちない」しか見ていなかった。中身が戻ることを見る。 */
  $('b_undo').click();
  ok('戻す で元の姿に戻る', JSON.stringify(TAMA.bundle())===before);
  /* 🔴 1回押したら【1手ぶん】戻ること（前は1回目が効かず、2回目から2手ぶん戻っていた） */
  { $('b_wipe').click(); $('b_addT').click();
    const one=TAMA.LAYER.length;
    $('b_addT').click(); $('b_addT').click();
    ok('3枚になった（'+TAMA.LAYER.length+'）', TAMA.LAYER.length===one+2);
    $('b_undo').click();
    ok('⌘Z 1回で1枚だけ戻る（'+TAMA.LAYER.length+'）', TAMA.LAYER.length===one+1);
    $('b_undo').click();
    ok('⌘Z 2回でもう1枚戻る（'+TAMA.LAYER.length+'）', TAMA.LAYER.length===one);
    $('b_wipe').click();
  }
  const j=JSON.stringify(TAMA.bundle());
  $('b_rand').click();
  TAMA.applyState(JSON.parse(j));
  ok('控えの往復', JSON.stringify(TAMA.bundle())===j);

  // 古い控え（版＝PLATE の頃）を層に組み替える
  { const old={tool:'tama', P:{text:'旧',font:'Georgia, serif',tw:700,tsize:0.5,tls:0,tlh:1,
      r:0.03,gap:0.6,mode:'both',pen:0.03}, PLATE:[{on:true,col:'#fff',ox:0,oy:0,ph:0,fat:0}],
      STROKE:[[[0,0],[0.2,0.2]]]};
    const m2=TAMA.migrate(old);
    ok('古い控えが層になる（'+m2.LAYER.length+'）', m2.LAYER.length===2 && m2.LAYER[1].kind==='draw');
  }

  // 動き3種
  ensurePre('futaji');
  for(const [id,val] of [['r_flow',2],['r_beat',0.4],['r_spin',1]]){
    for(const x of ['r_flow','r_beat','r_spin']) set(x,0);
    set(id,val);
    const q0=shot(220,220,0), qh=shot(220,220,0.3), q1=shot(220,220,1);
    ok(id+' で動く（'+diff(q0,qh)+'画素）', diff(q0,qh)>100);
    ok(id+' も1周で戻る（ずれ '+diff(q0,q1)+'）', diff(q0,q1)===0);
  }

  // 再生ボタン
  const p=$('anGo');
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
