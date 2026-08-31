// ⭐ サイト → セクションごとの Figma デザインデータ（library/*.json）
//   使い方: node site2figma.mjs <URL> <接頭辞>
//   ・写真は Chrome の中で fetch → base64（CORS を避ける）
//   ・⚠️ webp/avif は Figma が描けないので JPEG に変換してから埋める
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'fs'; import {execFileSync} from 'child_process';
const [URL_, PREFIX] = process.argv.slice(2);
const M=process.env.HOME+'/Desktop/GitHub-clone/名称未設定/mothership/library/';
const TMP='/private/tmp/claude-501/-Users-kinoshitatakahiro-Desktop/76c0ead6-2c9c-41ab-9164-49d8f95cbec5/scratchpad/dl/';
fs.rmSync(TMP,{recursive:true,force:true}); fs.mkdirSync(TMP,{recursive:true});

const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage(); await p.setViewport({width:1440,height:900});
await p.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
await p.setExtraHTTPHeaders({'Accept-Language':'ja,en-US;q=0.9'});
await p.goto(URL_,{waitUntil:'networkidle2',timeout:60000});
await new Promise(r=>setTimeout(r,3000));
await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,160));}window.scrollTo(0,0);});
await new Promise(r=>setTimeout(r,2500));

const secs=await p.evaluate(()=>{
  const H=document.body.scrollHeight;
  // ⭐ section が無いサイトもあるので、無ければ「画面の高さで切る」
  let list=[...document.querySelectorAll('section')].filter(s=>s.getBoundingClientRect().height>200);
  if(list.length<2){
    list=[...document.body.children].filter(e=>e.getBoundingClientRect&&e.getBoundingClientRect().height>300);
  }
  // ⭐ 追従ヘッダーは <section> の外にあるので、別に拾って【01】に合成する
  const fixed=[];
  document.querySelectorAll('header, nav, [class*=header], [class*=Header]').forEach(el=>{
    const c=getComputedStyle(el), r=el.getBoundingClientRect();
    if((c.position==='fixed'||c.position==='sticky'||c.position==='absolute') && r.height>30 && r.top<200)
      fixed.push(el);
  });
  const out=[];
  list.forEach((sec,si)=>{
    const S=sec.getBoundingClientRect();
    if(S.height<200||S.height>6000) return;
    const h=sec.querySelector('h1,h2,h3,.ttl,[class*=title]');
    const title=(h?h.textContent:'').trim().replace(/\s+/g,'').slice(0,16)||`sec${si+1}`;
    const kids=[];
    // 🔴 ここが犯人だった ── 子要素が1つでもあると葉と見なさず、
    //   <h1>ユニフォームに、<br>無限の提案力を。</h1> のような見出しを丸ごと落としていた。
    // ⭐ br / span / em / b / strong だけの子なら【葉】として扱う。
    //   ⚠️ 二重に拾わないよう、拾った要素の子孫は飛ばす。
    const taken=new Set();
    sec.querySelectorAll('*').forEach(el=>{
      for(let a=el.parentElement; a && a!==sec; a=a.parentElement) if(taken.has(a)) return;
      const r=el.getBoundingClientRect(), c=getComputedStyle(el);
      if(r.width<5||r.height<5) return;
      // ⭐ opacity:0 は「スクロールで現れる要素」なので落とさない（実測23個あった）
      if(c.visibility==='hidden'||c.display==='none') return;
      const x=Math.round(r.left-S.left), y=Math.round(r.top-S.top);
      const w=Math.round(r.width), hh=Math.round(r.height);
      if(x<-500||x>2000||y<-500||hh>5000) return;
      if(el.tagName==='IMG'&&el.currentSrc){
        kids.push({k:'img',x,y,w,h:hh,src:el.currentSrc,name:(el.alt||'photo').slice(0,20)}); return; }
      const bi=c.backgroundImage;
      if(bi&&bi!=='none'&&bi.includes('url(')&&w>40&&hh>40){
        const u=bi.match(/url\(["']?([^"')]+)/);
        if(u&&!u[1].startsWith('data:')){kids.push({k:'img',x,y,w,h:hh,src:u[1],name:'bg'});return;} }
      const inlineOnly=[...el.children].every(ch=>/^(BR|SPAN|EM|B|STRONG|I|SMALL|WBR|A|SUP|SUB|MARK|U)$/.test(ch.tagName));
      const txt=el.textContent.replace(/\s*\n\s*/g,'\n').trim();
      const leaf=(el.childElementCount===0||inlineOnly)&&txt;
      if(leaf&&txt.length<400){
        taken.add(el);
        // ⭐ <br> は改行として残す（Figma のテキストで改行になる）
        const withBr=[...el.childNodes].map(nd=>nd.nodeName==='BR'?'\n':(nd.textContent||'')).join('').replace(/\s*\n\s*/g,'\n').trim()||txt;
        kids.push({k:'text',x,y,w,h:hh,text:withBr,
          size:Math.round(parseFloat(c.fontSize)),weight:parseInt(c.fontWeight)||400,
          lh:Math.round(parseFloat(c.lineHeight))||Math.round(parseFloat(c.fontSize)*1.7),
          ls:+(parseFloat(c.letterSpacing)||0).toFixed(2),color:c.color,
          fam:(function(ff){
            // ⭐ Figma に確実にある書体へ寄せる（無い書体は置換されて崩れるため）
            var f=ff.split(',')[0].replace(/["']/g,'').trim();
            var l=f.toLowerCase();
            if(/明朝|mincho|serif jp|ryumin|リュウミン|shuei|游明朝|yu mincho|hiragino mincho/.test(l)) return 'Noto Serif JP';
            if(/cormorant|playfair|garamond|didot|bodoni|times|georgia|serif$/.test(l)) return 'Playfair Display';
            if(/inter|helvetica|arial|roboto|lato|montserrat|poppins|hind|sans-serif$/.test(l)) return 'Inter';
            if(/noto sans jp|hiragino|yu gothic|游ゴシック|meiryo|ゴシック|gothic/.test(l)) return 'Noto Sans JP';
            return 'Noto Sans JP';   // ⚠️ 分からないものは全部これ（日本語が出る）
          })(c.fontFamily),
          align:c.textAlign==='center'?'center':(c.textAlign==='right'?'right':'left'),
          name:txt.slice(0,18)}); return; }
      // ⭐ 面：背景色・枠線・影・グラデーション・回転を全部拾う（仕様：rect は stroke/strokeWidth/shadow 対応）
      const hasBg=c.backgroundColor&&!/rgba\(0, 0, 0, 0\)/.test(c.backgroundColor);
      const bw=parseFloat(c.borderTopWidth)||0;
      const hasBd=bw>0 && c.borderTopStyle!=='none';
      const sh=c.boxShadow;
      const hasSh=sh&&sh!=='none';
      const grad=/gradient/.test(c.backgroundImage)?c.backgroundImage:null;
      const tr=c.transform;
      let rot=0;
      if(tr&&tr!=='none'&&tr.startsWith('matrix')){
        const m=tr.match(/matrix\(([^)]+)\)/);
        if(m){const v=m[1].split(',').map(Number);
          rot=Math.round(Math.atan2(v[1],v[0])*180/Math.PI*10)/10;}
      }
      if((hasBg||hasBd||hasSh||grad)&&el!==sec&&w>10&&hh>3){
        const o={k:'rect',x,y,w,h:hh,bg:hasBg?c.backgroundColor:null,
          radius:Math.round(parseFloat(c.borderTopLeftRadius))||0,name:'面'};
        if(hasBd){o.bd=c.borderTopColor;o.bw=bw;}
        if(hasSh){o.sh=sh;}
        if(grad){o.grad=grad;}
        if(Math.abs(rot)>0.5){o.rot=rot;}
        kids.push(o);
      }
    });
    // ⭐ 背景が透明なら親をさかのぼる（transparent のまま出すと地が消える）
    let bg=getComputedStyle(sec).backgroundColor;
    if(!bg||/rgba\(0, 0, 0, 0\)/.test(bg)){
      for(let a=sec.parentElement;a;a=a.parentElement){
        const c=getComputedStyle(a).backgroundColor;
        if(c && !/rgba\(0, 0, 0, 0\)/.test(c)){ bg=c; break; }
      }
    }
    // ⭐ それでも無ければ、セクションの中でいちばん面積の大きい面の色
    if(!bg||/rgba\(0, 0, 0, 0\)/.test(bg)){
      let best=null,area=0;
      kids.filter(k=>k.k==='rect').forEach(k=>{ if(k.w*k.h>area){area=k.w*k.h;best=k.bg;} });
      if(best && area > S.width*S.height*0.5) bg=best;
    }
    out.push({i:out.length+1,title,w:Math.round(S.width),h:Math.round(S.height),bg,kids,
      isFirst: out.length===0});
  });
  // ⭐ ヘッダーを 01 に合成（座標は 01 の左上から）
  if(out.length && fixed.length){
    const S=list[0].getBoundingClientRect();
    const taken2=new Set();
    fixed.forEach(hd=>{
      hd.querySelectorAll('*').forEach(el=>{
        for(let a=el.parentElement;a&&a!==hd;a=a.parentElement) if(taken2.has(a)) return;
        const r=el.getBoundingClientRect(), c=getComputedStyle(el);
        if(r.width<5||r.height<5) return;
        if(c.visibility==='hidden'||c.display==='none'||+c.opacity<0.05) return;
        const x=Math.round(r.left-S.left), y=Math.round(r.top-S.top);
        const w=Math.round(r.width), hh=Math.round(r.height);
        if(x<-200||x>1900||y<-200||y>400) return;
        if(el.tagName==='IMG'&&el.currentSrc){ out[0].kids.push({k:'img',x,y,w,h:hh,src:el.currentSrc,name:'logo'}); return; }
        if(el.tagName==='SVG'){ out[0].kids.push({k:'svg',x,y,w,h:hh,svg:el.outerHTML,name:'logo'}); return; }
        const inl=[...el.children].every(ch=>/^(BR|SPAN|EM|B|STRONG|I|SMALL|WBR|A|SUP|SUB)$/.test(ch.tagName));
        const t=el.textContent.trim();
        if((el.childElementCount===0||inl)&&t&&t.length<60){
          taken2.add(el);
          out[0].kids.push({k:'text',x,y,w,h:hh,text:t,
            size:Math.round(parseFloat(c.fontSize)),weight:parseInt(c.fontWeight)||400,
            lh:Math.round(parseFloat(c.lineHeight))||Math.round(parseFloat(c.fontSize)*1.6),
            ls:+(parseFloat(c.letterSpacing)||0).toFixed(2),color:c.color,
            fam:c.fontFamily.split(',')[0].replace(/["']/g,''),
            align:c.textAlign==='center'?'center':'left',name:'nav '+t.slice(0,12)});
          return;
        }
        const bgc=c.backgroundColor;
        if(bgc&&!/rgba\(0, 0, 0, 0\)/.test(bgc)&&w>20&&hh>10)
          out[0].kids.push({k:'rect',x,y,w,h:hh,bg:bgc,
            radius:Math.round(parseFloat(c.borderTopLeftRadius))||0,name:'nav 面'});
      });
    });
  }
  return out;
});
console.log(`■ セクション ${secs.length} 個`);

// ⭐ 写真を落とす（Chrome の中から fetch）
const urls=[...new Set(secs.flatMap(s=>s.kids.filter(k=>k.k==='img').map(k=>k.src)))].slice(0,60);
const data={}; let ok=0;
for(const u of urls){
  try{
    const d=await p.evaluate(async(url)=>{
      const r=await fetch(url,{mode:'cors'}); if(!r.ok) return null;
      const bl=await r.blob(); if(bl.size>6e6) return null;
      return await new Promise(res=>{const f=new FileReader();f.onload=()=>res(f.result);f.readAsDataURL(bl);});
    },u);
    if(!d) continue;
    const m=d.match(/^data:([^;]+);base64,(.+)$/); if(!m) continue;
    if(m[1].includes('svg')){ data[u]=d; ok++; continue; }   // svg はそのまま
    const raw=Buffer.from(m[2],'base64');
    const f=TMP+ok+'.bin'; fs.writeFileSync(f,raw);
    // ⚠️ webp/avif は Figma が描けない → JPEG に変換（＋大きすぎるものは縮める）
    const out=TMP+ok+'.jpg';
    execFileSync('python3',['-c',`
from PIL import Image
im=Image.open("${f}").convert("RGB")
if im.width>1600: im=im.resize((1600,round(im.height*1600/im.width)), Image.LANCZOS)
im.save("${out}","JPEG",quality=80,optimize=True)`]);
    data[u]='data:image/jpeg;base64,'+fs.readFileSync(out).toString('base64');
    ok++;
  }catch(e){}
}
console.log(`■ 写真 ${ok}/${urls.length} 枚を取り込んだ（webp は JPEG に変換）`);

const rgb=s=>{const m=s&&s.match(/\d+/g); if(!m) return null;
  if(m.length>3&&+m[3]===0) return null;
  return '#'+m.slice(0,3).map(v=>(+v).toString(16).padStart(2,'0')).join('');};
for(const s of secs){
  const T={colors:{}}; let ci=0;
  const tok=css=>{const hex=rgb(css); if(!hex) return null;
    for(const [k,v] of Object.entries(T.colors)) if(v===hex) return '@colors.'+k;
    const k='c'+(++ci); T.colors[k]=hex; return '@colors.'+k;};
  const children=[];
  for(const c of s.kids){
    if(c.k==='svg'){ children.push({type:'svg',name:c.name,x:c.x,y:c.y,w:c.w,h:c.h,svg:c.svg}); }
    else if(c.k==='img'){ const src=data[c.src]; if(!src) continue;
      children.push({type:'image',name:c.name,x:c.x,y:c.y,w:c.w,h:c.h,src,scaleMode:'FILL'}); }
    else if(c.k==='rect'){
      const o={type:'rect',name:c.name,x:c.x,y:c.y,w:c.w,h:c.h};
      // ⭐ グラデーション（仕様: {"gradient":["#a","#b"],"angle":120}）
      if(c.grad){
        const cols=[...c.grad.matchAll(/rgba?\(([^)]+)\)/g)].map(m=>rgb('rgb('+m[1]+')')).filter(Boolean);
        const ang=(c.grad.match(/(\d+)deg/)||[])[1];
        if(cols.length>=2) o.fill={gradient:cols.slice(0,4),angle:ang?+ang:180};
        else o.fill=tok(c.bg)||'@colors.c1';
      } else o.fill=tok(c.bg)||'@colors.c1';
      if(c.radius)o.radius=c.radius;
      // ⭐ 枠線（実測46個が全部落ちていた）
      if(c.bd){const st=tok(c.bd); if(st){o.stroke=st;o.strokeWidth=c.bw;}}
      // ⭐ 影（仕様: {x,y,blur,color,opacity}）
      if(c.sh){
        const m=c.sh.match(/rgba?\(([^)]+)\)\s*(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px/)
             || c.sh.match(/(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px[^)]*rgba?\(([^)]+)\)/);
        if(m){
          const nums=c.sh.match(/(-?[\d.]+)px/g)||[];
          const col=(c.sh.match(/rgba?\(([^)]+)\)/)||[])[1];
          const parts=col?col.split(',').map(v=>parseFloat(v)):[0,0,0,0.2];
          o.shadow={x:parseFloat(nums[0])||0,y:parseFloat(nums[1])||0,
                    blur:parseFloat(nums[2])||0,
                    color:rgb('rgb('+parts.slice(0,3).join(',')+')')||'#000',
                    opacity:parts.length>3?parts[3]:0.2};
        }
      }
      if(c.rot) o.rotation=c.rot;
      children.push(o);}
    else children.push({type:'text',name:c.name,x:c.x,y:c.y,w:c.w,text:c.text,align:c.align,
      fill:tok(c.color)||'@colors.c1',
      font:{family:c.fam,size:c.size,weight:c.weight,lineHeight:c.lh,letterSpacing:c.ls}});
  }
  if(!Object.keys(T.colors).length) T.colors.c1='#222222';
  const bgTok=tok(s.bg)||'@colors.c1';
  const name=`${PREFIX} — ${String(s.i).padStart(2,'0')} ${s.title} (1440)`;
  const board={name,font:'Noto Sans JP',tokens:T,
    root:{type:'frame',name,w:s.w,h:s.h,fill:bgTok,clip:true,children}};
  const f=M+name.replace(/[\/\\:*?"<>|]/g,'-')+'.json';
  fs.writeFileSync(f,JSON.stringify(board));
  const n={i:children.filter(c=>c.type==='image').length,t:children.filter(c=>c.type==='text').length,
           r:children.filter(c=>c.type==='rect').length};
  console.log(`✅ ${name}  ${children.length}ノード（写真${n.i} 文字${n.t} 面${n.r}）  ${(fs.statSync(f).size/1024).toFixed(0)}KB`);
}
await b.close();
