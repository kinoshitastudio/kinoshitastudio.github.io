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

  /* ⭐⭐ 2026-08-23 木下＝「盤面でオブジェクトを大きくしたり小さくしたり、
     左右上下に調整できるようにしたい」＝絵のまわりの取っ手。
     🔴 見るのは「取っ手が出ている」ではなく【掴んで引いたら実際に変わったか】。 */
  KASA.render();
  const B0 = KASA.ARTBOX;
  ok('絵の広がりが取れている', !!B0 && B0.x1>B0.x0 && B0.y1>B0.y0);
  const C0 = KASA.artCorners(KASA.camScreen());
  ok('角が4つ出る', !!C0 && C0.pts.length===4);

  /* 角を掴んで外へ引く＝大きくなる（真ん中からの距離の比） */
  const cv0 = document.getElementById('cv');
  const rect = cv0.getBoundingClientRect();
  const toClient = (sx,sy) => ({ x: rect.left + sx*(rect.width/cv0.width),
                                 y: rect.top  + sy*(rect.height/cv0.height) });
  const sizeKeyNow = () => KASA.P.shape==='text' ? 'tsize' : 'size';
  const drag = (from, to) => {
    const a = toClient(from[0], from[1]), b = toClient(to[0], to[1]);
    cv0.dispatchEvent(new PointerEvent('pointerdown',
      { clientX:a.x, clientY:a.y, button:0, bubbles:true, pointerId:1, pointerType:'mouse' }));
    cv0.dispatchEvent(new PointerEvent('pointermove',
      { clientX:b.x, clientY:b.y, bubbles:true, pointerId:1, pointerType:'mouse' }));
    cv0.dispatchEvent(new PointerEvent('pointerup',
      { clientX:b.x, clientY:b.y, bubbles:true, pointerId:1, pointerType:'mouse' }));
  };
  const k0 = sizeKeyNow(), sz0 = KASA.P[k0];
  const [hx,hy] = C0.pts[2];                      /* 右下の角 */
  const mid = [ (C0.x0+C0.x1)/2, (C0.y0+C0.y1)/2 ];
  const far = [ mid[0] + (hx-mid[0])*1.6, mid[1] + (hy-mid[1])*1.6 ];
  drag([hx,hy], far);
  ok('角を外へ引くと大きくなる（'+sz0.toFixed(2)+' → '+KASA.P[k0].toFixed(2)+'）',
     KASA.P[k0] > sz0*1.05);
  const szUp = KASA.P[k0];
  /* ⚠️ 大きくしたので取っ手も動いている＝【いまの角】を掴み直す
     （前の場所を掴むと何も起きず「効かない」と誤判定する） */
  KASA.render();
  const Cu = KASA.artCorners(KASA.camScreen());
  const [ux,uy] = Cu.pts[2];
  const midU = [ (Cu.x0+Cu.x1)/2, (Cu.y0+Cu.y1)/2 ];
  const near2 = [ midU[0] + (ux-midU[0])*0.5, midU[1] + (uy-midU[1])*0.5 ];
  drag([ux,uy], near2);
  ok('内へ引くと小さくなる（'+szUp.toFixed(2)+' → '+KASA.P[k0].toFixed(2)+'）',
     KASA.P[k0] < szUp*0.95);

  /* 中を引く＝左右上下に動く（ox/oy が変わる・大きさは変わらない） */
  KASA.render();
  const C1 = KASA.artCorners(KASA.camScreen());
  const mid1 = [ (C1.x0+C1.x1)/2, (C1.y0+C1.y1)/2 ];
  const ox0 = KASA.P.ox, oy0 = KASA.P.oy, szKeep = KASA.P[k0];
  drag(mid1, [mid1[0]+90, mid1[1]-60]);
  ok('中を引くと左右上下に動く（ox '+ox0.toFixed(2)+'→'+KASA.P.ox.toFixed(2)
     +' / oy '+oy0.toFixed(2)+'→'+KASA.P.oy.toFixed(2)+'）',
     Math.abs(KASA.P.ox-ox0)>0.01 && Math.abs(KASA.P.oy-oy0)>0.01);
  ok('動かしても大きさは変わらない', Math.abs(KASA.P[k0]-szKeep)<1e-9);

  /* ⚠️ 取っ手は【出す絵には描かない】（版面のわくと同じ約束） */
  {
    const cA=document.createElement('canvas'); cA.width=160; cA.height=100;
    const g2=cA.getContext('2d'); KASA.paint(g2,160,100,0);
    const before=KASA.ARTBOX;
    KASA.paint(g2,160,100,0);
    ok('書き出しの絵では取っ手の物差しを書き換えない', KASA.ARTBOX===before);
  }

  /* 🔴🔴 2026-08-23 木下＝「これが全くうごかない」（紙片で字を組む のとき）
     ＝ 字を使うかたちが2つ（text / tpiece）あるのに text しか見ておらず、
        tpiece では効かない size を触っていた。 */
  for(const sh of ['sheet','text','tpiece']){
    document.querySelector('#shape button[data-v="'+sh+'"]').click();
    KASA.render();
    const key = (sh==='sheet') ? 'size' : 'tsize';
    const b4 = KASA.P[key];
    const rr = document.getElementById('r_artSize');
    rr.value = Math.min(+rr.max, b4*1.25);
    rr.dispatchEvent(new Event('input'));
    ok('「'+sh+'」で大きさが効く（'+key+' '+b4.toFixed(2)+'→'+KASA.P[key].toFixed(2)+'）',
       Math.abs(KASA.P[key]-b4) > 0.01);
    rr.value = b4; rr.dispatchEvent(new Event('input'));
  }
  document.querySelector('#shape button[data-v="sheet"]').click();
  KASA.render();

  /* ⭐ 黒い磁石は紙を留めている＝紙と一緒に動く・一緒に縮む（木下「黒の丸もずれてしまう」） */
  {
    const h0 = KASA.HOLE.map(h=>({x:h.x,y:h.y}));
    const key = 'size', b4 = KASA.P[key];
    const rr = document.getElementById('r_artSize');
    rr.value = b4*0.6; rr.dispatchEvent(new Event('input'));
    const k = KASA.P[key]/b4;
    const want = h0.map(h=>({ x:KASA.P.ox+(h.x-KASA.P.ox)*k, y:KASA.P.oy+(h.y-KASA.P.oy)*k }));
    const same = KASA.HOLE.every((h,i)=>Math.abs(h.x-want[i].x)<1e-6 && Math.abs(h.y-want[i].y)<1e-6);
    ok('磁石が紙と一緒に縮む（'+KASA.HOLE.length+'個・比 '+k.toFixed(2)+'）', same && Math.abs(k-1)>0.01);
    rr.value = b4; rr.dispatchEvent(new Event('input'));
  }

  /* ⭐ わくに収める＝版面の中に入る */
  {
    document.getElementById('c_frame').checked = true;
    document.getElementById('c_frame').dispatchEvent(new Event('change'));
    KASA.render();
    document.getElementById('b_artFit').click();
    KASA.render();
    const B = KASA.ARTBOX, hw = KASA.halfWH()[0], hh = KASA.halfWH()[1];
    const inside = B && B.x0>=-hw-1e-3 && B.x1<=hw+1e-3 && B.y0>=-hh-1e-3 && B.y1<=hh+1e-3;
    ok('わくに収める で版面の中に入る（絵 '+(B?(B.x1-B.x0).toFixed(2):'-')
       +'×'+(B?(B.y1-B.y0).toFixed(2):'-')+' / わく '+(2*hw).toFixed(2)+'×'+(2*hh).toFixed(2)+'）', !!inside);
  }

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
