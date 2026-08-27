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
const use=v=>document.querySelector('#useSeg button[data-v="'+v+'"]').click();
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
  { use('draw');
    ok('描くにすると線の層に移る', TAMA.cur().kind==='draw');
    const before=shot(240,240,0);
    TAMA.cur().strokes.push([[-0.5,0,1],[0,0.2,1],[0.5,-0.1,1]]);
    const after=shot(240,240,0);
    ok('描いた線が刷られる（'+diff(before,after)+'画素）', diff(before,after)>200);
    $('b_undoline').click();
    ok('1本消すで減る', TAMA.cur().strokes.length===0);
    use('move');
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
    /* ⭐ 掴めるのは【字や線の上】だけ。真ん中は字の上 */
    const r0=cv.getBoundingClientRect(), CX=r0.left+r0.width/2, CY=r0.top+r0.height/2;
    ok('字の上は掴める', TAMA.layerAt([0,0])>=0);
    ok('遠くの何も無い所は掴めない', TAMA.layerAt([0.95,0.95])<0);
    pe('pointerdown',CX,CY); pe('pointermove',CX+120,CY+60); pe('pointerup',CX+120,CY+60);
    ok('掴んで引くと動く（'+src.ox+','+src.oy+'）', src.ox!==o0x && src.oy!==o0y);
    ok('右下へ引いたら右下へ動く', src.ox>o0x && src.oy>o0y);
    ok('写しも一緒に動く（ずれの差は同じ）',
       Math.abs((tw.ox-src.ox)-d0x)<1e-9 && Math.abs((tw.oy-src.oy)-d0y)<1e-9);
    ok('つまみにも出る', Math.abs(+$('r_ox').value-src.ox)<1e-9);
    TAMA.undo();
    ok('⌘Zで動かす前に戻る', Math.abs(TAMA.cur().ox-o0x)<1e-9);
    /* ⭐ 何も無い所を押したら盤が動く（層は動かない） */
    { const v0=TAMA.VIEW.x, ox0=TAMA.cur().ox;
      pe('pointerdown',r0.left+6,r0.top+6); pe('pointermove',r0.left+80,r0.top+40); pe('pointerup',r0.left+80,r0.top+40);
      ok('何も無い所は盤が動く', TAMA.VIEW.x!==v0 && TAMA.cur().ox===ox0);
      cv.dispatchEvent(new MouseEvent('dblclick',{bubbles:true})); }
    /* ⭐ 掴んだ層がそのまま選ばれる */
    { $('b_wipe').click(); $('b_addT').click();
      const a=TAMA.cur(); a.ox=-0.5;
      $('b_addT').click(); const b=TAMA.cur(); b.ox=0.5; b.text='みぎ';
      TAMA.pick(TAMA.LAYER.indexOf(b));
      const r1=cv.getBoundingClientRect(), S=Math.min(r1.width,r1.height)/2;
      pe('pointerdown',r1.left+r1.width/2-0.5*S,r1.top+r1.height/2);
      pe('pointerup',r1.left+r1.width/2-0.5*S,r1.top+r1.height/2);
      ok('掴んだ方の層が選ばれる', TAMA.cur().id===a.id);
    }
    /* ⚠️ 描くに切り替えたら、字の上を引いても【描く】だけ（動かない） */
    $('b_wipe').click(); $('b_addD').click();
    use('draw');
    const dl=TAMA.cur(), dx0=dl.ox;
    pe('pointerdown',CX,CY); pe('pointermove',CX+80,CY+40); pe('pointerup',CX+80,CY+40);
    ok('描く側では動かない・描くだけ', dl.ox===dx0 && dl.strokes.length===1);
    use('move');
    /* 動かすに戻したら、いま描いた線を掴んで動かせる */
    pe('pointerdown',CX,CY); pe('pointermove',CX+40,CY+20); pe('pointerup',CX+40,CY+20);
    ok('動かすに戻すと線も掴める', dl.ox!==dx0 && dl.strokes.length===1);
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

  /* ⭐⭐ 左右対称に描く（2026-08-27 木下「tama で線を描くとき、左右対象に描けるようにもしてほしい」）
     見るのは【鏡の線が本当に反対側にあるか】と【1本消すで対も消えるか】。 */
  {
    $('useSeg').querySelector('button[data-v="draw"]').click();
    if($('b_addD')) $('b_addD').click();
    const L0=TAMA.cur();
    const r=cv.getBoundingClientRect();
    const ev=(t,x,y)=>cv.dispatchEvent(new PointerEvent(t,{clientX:x,clientY:y,button:0,buttons:1,
      bubbles:true,pointerId:1,pointerType:'mouse'}));
    const draw=(y0)=>{ ev('pointerdown', r.left+r.width*0.32, r.top+r.height*y0);
      for(let i=1;i<=8;i++) ev('pointermove', r.left+r.width*(0.32+0.12*i/8), r.top+r.height*(y0+0.03*i/8));
      ev('pointerup', r.left+r.width*0.44, r.top+r.height*(y0+0.03)); };
    const n0=L0.strokes.length;
    $('s_sym').querySelector('button[data-v="0"]').click();
    draw(0.42);
    const n1=L0.strokes.length;
    ok('対称なし＝1本だけ増える（いままでどおり）', n1-n0===1);
    $('s_sym').querySelector('button[data-v="x"]').click();
    draw(0.55);
    const n2=L0.strokes.length;
    ok('左右＝1回引くと2本（元＋鏡）', n2-n1===2);
    const a=L0.strokes[n2-2], m=L0.strokes[n2-1];
    ok('鏡は【版面の中心】で折り返している（x が符号だけ逆・y は同じ）',
       Math.abs(a[0][0]+m[0][0])<1e-9 && Math.abs(a[0][1]-m[0][1])<1e-9);
    $('b_undoline').click();
    ok('1本消すで【対も一緒に】消える（'+L0.strokes.length+'）', L0.strokes.length===n1);
    $('s_sym').querySelector('button[data-v="xy"]').click();
    draw(0.68);
    ok('四方＝1回引くと4本', L0.strokes.length-n1===4);
    $('s_sym').querySelector('button[data-v="0"]').click();
  }

  /* 🔴 2026-08-27 木下「Tama の大きさがかわらない」
     ＝線の層では玉の大きさ（r）を一度も見ていなかった＝触れるのに効かないつまみだった。
     ⭐ 線の層では【筆の太さに対する倍率】。⚠️ 既定（0.045）で倍率1＝いままでと同じ。 */
  {
    const L0=TAMA.cur();
    const col=L0.col.replace('#','');
    const R=parseInt(col.slice(0,2),16),G=parseInt(col.slice(2,4),16),B=parseInt(col.slice(4,6),16);
    /* ⚠️ 画面（cv）は rAF で描き直すので、押した直後に読むと【前のコマ】を測る。
       ⭐ 本体と同じ関数（TAMA.paint）でその場で刷って数える＝待たずに正しく測れる。 */
    const ink=()=>{ const d=shot(400,400,0); let n=0;
      for(let i=0;i<d.length;i+=4)
        if(Math.abs(d[i]-R)<26 && Math.abs(d[i+1]-G)<26 && Math.abs(d[i+2]-B)<26) n++;
      return n; };
    set('r_r', 0.045); const a1=ink();
    set('r_r', 0.12);  const a2=ink();
    set('r_r', 0.02);  const a3=ink();
    /* ⚠️ 数えているのは版面ぜんぶの玉の色＝他の層のぶんも入る。
       ⭐ 見るのは【増えたか・減ったか】（大 > 既定 > 小）。 */
    ok('🔴 線の層でも【大きさ】が効く（'+a1+' → 大 '+a2+' / 小 '+a3+'）',
       a2 > a1*1.05 && a3 < a1*0.99);
    set('r_r', 0.045);
    ok('⚠️ かたち（塗り＋玉…）は字の層だけ＝線の層では出さない',
       getComputedStyle($('fillMode')).display === 'none');
  }

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
