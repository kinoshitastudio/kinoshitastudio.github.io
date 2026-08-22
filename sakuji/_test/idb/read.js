/* ── ②開き直して読む：しまってあった書体が戻るか（＝リロードの往復） ── */
(function(){
  const pre=document.createElement('pre'); pre.id='__RESULT'; pre.textContent='';
  addEventListener('DOMContentLoaded',()=>document.body.appendChild(pre));
  if(document.body) document.body.appendChild(pre);
  const POST=t=>{ try{ fetch('http://127.0.0.1:8919/log',{method:'POST',mode:'no-cors',body:t}); }catch(e){} };
  const say=s=>{ pre.textContent += s + '\n'; POST(s); };
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function run(){
    let bad=0;
    const ok=(n,c,d)=>{ if(!c) bad++; say((c?'PASS ':'FAIL ')+n+(d?('  ['+d+']'):'')); };
    try{
      await wait(2500);                       /* 起動時の restoreFonts() を待つ */
      const list=await Promise.race([fdbAll(), wait(6000).then(()=>'TIMEOUT')]);
      if(list==='TIMEOUT'){ say('🔴 fdbAll が返らない'); say('__HAS_FAIL__'); return; }
      ok('IndexedDB に残っている（＝リロードを越えた）', list.length>0,
         list.map(([k,v])=>k+'/'+((v&&(v.byteLength||v.length))||0)+'バイト').join('、'));
      const names=Object.keys(FONTS);
      ok('起動時に FONTS へ戻っている', names.length>0, names.join('、'));
      const sel=document.getElementById('tfont');
      const marked=[...sel.options].filter(o=>/◆/.test(o.textContent)).map(o=>o.textContent);
      ok('書体の一覧に ◆ で戻っている', marked.length>0, marked.join('、'));
      const note=document.getElementById('fontnote');
      ok('「グリフを直接取れる書体」の註が出る', !!(note&&/◆/.test(note.innerHTML)),
         note?(note.textContent||'').replace(/\s+/g,' ').slice(0,60):'（無い）');
      if(names.length){
        /* ⭐ ただ残っているだけでは意味がない。戻した書体で実際に字が打てるか。
           ⚠️ 「置けた」だけでは判定にならない＝中身が0字なら置けていない */
        const fam=names[0];
        ok('ブラウザが書体を持っている（fonts.check）',
           document.fonts.check('100px "'+fam+'"'), '100px "'+fam+'"');
        const c=document.createElement('canvas').getContext('2d');
        c.font='100px "'+fam+'", monospace'; const wFam=c.measureText('A').width;
        c.font='100px monospace';            const wMono=c.measureText('A').width;
        ok('その書体で幅が変わる（＝本当に当たっている）', Math.abs(wFam-wMono)>0.5,
           'その書体='+wFam.toFixed(1)+' / monospace='+wMono.toFixed(1));
        ok('opentype でグリフが取れる', !!(FONTS[fam]&&FONTS[fam].charToGlyph('A')&&
             FONTS[fam].charToGlyph('A').path&&FONTS[fam].charToGlyph('A').path.commands.length>0),
           FONTS[fam]? (FONTS[fam].charToGlyph('A').path.commands.length+'命令') : 'null');
        /* ⚠️ placeText は headless では字を作れない（対照＝もとからの書体でも 0字になる）。
           ＝ここで落としても「戻した書体のせい」にはならないので、判定にしない。
           ⭐ 代わりに【対照と同じか】だけを見る。 */
        const put=(v)=>{ sel.value=v; document.getElementById('tinput').value='A';
          artLayer.removeChildren(); const t=placeText(new Point(0,0));
          return t&&t.children?t.children.length:0; };
        const n0=put(sel.options[0].value);
        const nn=put('"'+fam+'", sans-serif');
        ok('戻した書体は もとからの書体と同じように置ける', nn===n0,
           '戻した='+nn+'字／もとから='+n0+'字'+(n0===0?'（⚠️ headless では placeText が字を作れない＝この場では測れない）':''));
      }
      const fl=document.getElementById('fontList');
      ok('リンク切れとして名指しされていない', !(fl&&/切れ|見つ/.test(fl.textContent||'')),
         (fl&&fl.textContent||'').replace(/\s+/g,' ').slice(0,70));
      say(bad? '__HAS_FAIL__' : '__ALL_PASS__');
    }catch(e){ say('🔴 '+e.message+' / '+(e.stack||'').split('\n')[1]); say('__HAS_FAIL__'); }
  }
  const boot=()=>setTimeout(run,600);
  if(document.readyState==='complete') boot(); else addEventListener('load',boot);
})();
