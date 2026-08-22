/* ── ①書く：作った .ttf を【本物の読み込み口】から入れて、IndexedDB に残るか
   ⚠️ 途中で止まっても どこまで行ったか 分かるように、1行ずつその場で書き出す ── */
(function(){
  const pre=document.createElement('pre'); pre.id='__RESULT'; pre.textContent='';
  addEventListener('DOMContentLoaded',()=>document.body.appendChild(pre));
  if(document.body) document.body.appendChild(pre);
  const POST=t=>{ try{ fetch('http://127.0.0.1:8919/log',{method:'POST',mode:'no-cors',body:t}); }catch(e){} };
  const say=s=>{ pre.textContent += s + '\n'; POST(s); };
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function run(){
    try{
      say('start');
      say('DataTransfer がある = ' + (typeof DataTransfer!=='undefined'));
      say('indexedDB がある = ' + (typeof indexedDB!=='undefined'));

      artLayer.removeChildren();
      const a=S.abs[0]; a.ch='A';
      const Rc=abRectOf(a), cx=Rc.center.x, cy=Rc.center.y;
      const mk=(x0,y0,x1,y1)=>{ const p=new Path({strokeColor:'black',strokeWidth:120,strokeCap:'round'});
        const L=Math.hypot(x1-x0,y1-y0), st=Math.max(2,Math.round(L/7));
        for(let s=0;s<=st;s++){const t=s/st; p.add(new Point(x0+(x1-x0)*t, y0+(y1-y0)*t));}
        p.simplify(2.5); artLayer.addChild(p); };
      mk(cx-150,cy+200,cx-10,cy-200); mk(cx-10,cy-200,cx+140,cy+200); mk(cx-95,cy+60,cx+85,cy+60);
      say('字を描いた');

      document.getElementById('fnBold').value='90';
      document.getElementById('fnBold').dispatchEvent(new Event('input',{bubbles:true}));
      document.getElementById('fnName').value='SakujiIDBTest';
      svQuiet=true; const file=await svBuildVF(); svQuiet=false;
      say('.ttf を鋳た = ' + (file? file.length+' バイト':'null'));
      if(!file){ say('__HAS_FAIL__'); return; }

      /* ⭐ 本物の読み込み口（ファイル選択）を通す */
      const inp=document.getElementById('fontFile');
      const dt=new DataTransfer();
      dt.items.add(new File([file],'SakujiIDBTest.ttf',{type:'font/ttf'}));
      inp.files=dt.files;
      say('ファイルを入れた = ' + inp.files.length + '個');
      inp.dispatchEvent(new Event('change',{bubbles:true}));
      say('change を投げた');
      await wait(1500);
      say('FONTS = ' + JSON.stringify(Object.keys(FONTS)));

      say('fdbAll を呼ぶ…');
      const list=await Promise.race([fdbAll(), wait(5000).then(()=>'TIMEOUT')]);
      if(list==='TIMEOUT'){ say('🔴 fdbAll が返らない（IndexedDB が動いていない）'); say('__HAS_FAIL__'); return; }
      say('IndexedDB の中身 = ' + (list.length? list.map(([k,v])=>k+'/'+((v&&(v.byteLength||v.length))||0)+'バイト').join('、') : '（空）'));

      const sel=document.getElementById('tfont');
      say('◆ の書体 = ' + [...sel.options].filter(o=>/◆/.test(o.textContent)).map(o=>o.textContent).join('、'));
      say(list.length ? '__ALL_PASS__' : '__HAS_FAIL__');
    }catch(e){ say('🔴 '+e.message+' / '+(e.stack||'').split('\n')[1]); say('__HAS_FAIL__'); }
  }
  const boot=()=>setTimeout(run,1200);
  if(document.readyState==='complete') boot(); else addEventListener('load',boot);
})();
