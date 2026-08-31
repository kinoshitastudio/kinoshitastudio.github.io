// ⭐ HTML の各 section を実測して、Mothership の library/*.json に落とす
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'fs';
const M=process.env.HOME+'/Desktop/GitHub-clone/名称未設定/mothership/library/';
const B='http://localhost:8178/html/_figma/';
const PAGES=[['社内','page-a.html','naibu'],['社外','page-b.html','gaibu']];
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']});
const rgb=s=>{const m=s.match(/\d+/g); if(!m) return null;
  if(m.length>3 && +m[3]===0) return null;
  return '#'+m.slice(0,3).map(v=>(+v).toString(16).padStart(2,'0')).join('');};

for(const [tag,file,slug] of PAGES){
  const p=await b.newPage(); await p.setViewport({width:1440,height:1000});
  await p.goto(B+encodeURI(file),{waitUntil:'networkidle0'}); await new Promise(r=>setTimeout(r,900));
  const secs=await p.evaluate(()=>{
    const out=[];
    document.querySelectorAll('section').forEach((sec,si)=>{
      const S=sec.getBoundingClientRect();
      const title=(sec.querySelector('h1,h2,.h2,.fv-h1')||{}).textContent||`sec${si+1}`;
      const kids=[];
      // ⭐ 葉ノード（文字・画像・面）だけ拾う ＝ Figma のレイヤーになる粒度
      sec.querySelectorAll('*').forEach(el=>{
        const r=el.getBoundingClientRect(), c=getComputedStyle(el);
        if(r.width<3||r.height<3) return;
        const x=Math.round(r.left-S.left), y=Math.round(r.top-S.top);
        const w=Math.round(r.width), h=Math.round(r.height);
        if(el.tagName==='IMG'){ kids.push({k:'img',x,y,w,h,src:el.currentSrc,name:el.alt||'photo'}); return; }
        if(el.tagName==='SVG'){ kids.push({k:'svg',x,y,w,h,svg:el.outerHTML,name:'illust'}); return; }
        const leaf = el.childElementCount===0 && el.textContent.trim();
        if(leaf){
          kids.push({k:'text',x,y,w,h,text:el.textContent.trim(),
            size:Math.round(parseFloat(c.fontSize)), weight:parseInt(c.fontWeight)||400,
            lh:Math.round(parseFloat(c.lineHeight))||Math.round(parseFloat(c.fontSize)*1.6),
            ls:+(parseFloat(c.letterSpacing)||0).toFixed(2),
            color:c.color, fam:c.fontFamily.split(',')[0].replace(/["']/g,''),
            align:c.textAlign==='center'?'center':(c.textAlign==='right'?'right':'left'),
            name:el.textContent.trim().slice(0,18)});
          return;
        }
        // 面（背景か枠がある箱）
        const hasBg = c.backgroundColor && !/rgba\(0, 0, 0, 0\)/.test(c.backgroundColor);
        const hasBd = parseFloat(c.borderTopWidth)>0;
        if((hasBg||hasBd) && el!==sec){
          kids.push({k:'rect',x,y,w,h,bg:hasBg?c.backgroundColor:null,
            bd:hasBd?c.borderTopColor:null, bw:hasBd?parseFloat(c.borderTopWidth):0,
            radius:Math.round(parseFloat(c.borderTopLeftRadius))||0,
            name:(el.className&&typeof el.className==='string'?el.className.split(' ')[0]:'box')});
        }
      });
      out.push({i:si+1, title:title.trim().replace(/\s+/g,'').slice(0,16),
        w:Math.round(S.width), h:Math.round(S.height),
        bg:getComputedStyle(sec).backgroundColor, kids});
    });
    return out;
  });
  for(const s of secs){
    const T={colors:{}}; let ci=0;
    const tok=(css)=>{ const hex=rgb(css); if(!hex) return null;
      for(const [k,v] of Object.entries(T.colors)) if(v===hex) return '@colors.'+k;
      const k='c'+(++ci); T.colors[k]=hex; return '@colors.'+k; };
    const children=[];
    for(const c of s.kids){
      if(c.k==='img') children.push({type:'image',name:c.name,x:c.x,y:c.y,w:c.w,h:c.h,src:c.src});
      else if(c.k==='svg') children.push({type:'svg',name:c.name,x:c.x,y:c.y,w:c.w,h:c.h,svg:c.svg});
      else if(c.k==='rect'){ const o={type:'rect',name:c.name,x:c.x,y:c.y,w:c.w,h:c.h};
        const f=c.bg?tok(c.bg):null; if(f)o.fill=f;
        if(c.bw>0){ const st=tok(c.bd); if(st){o.stroke=st;o.strokeWidth=c.bw;} }
        if(c.radius)o.radius=c.radius; children.push(o); }
      else children.push({type:'text',name:c.name,x:c.x,y:c.y,w:c.w,text:c.text,align:c.align,
        fill:tok(c.color)||'@colors.c1',
        font:{family:c.fam,size:c.size,weight:c.weight,lineHeight:c.lh,letterSpacing:c.ls}});
    }
    const bgTok = tok(s.bg) || '@colors.white';
    if(!T.colors.white) T.colors.white='#ffffff';
    const name=`site ${tag} — ${String(s.i).padStart(2,'0')} ${s.title} (1440)`;
    const board={name,font:'Noto Sans JP',tokens:T,
      root:{type:'frame',name,w:s.w,h:s.h,fill:bgTok,clip:true,children}};
    const f=M+name.replace(/[\/\\:*?"<>|]/g,'-')+'.json';
    fs.writeFileSync(f, JSON.stringify(board));
    console.log(`✅ ${name}  ${children.length}ノード  ${(fs.statSync(f).size/1024).toFixed(0)}KB`);
  }
  await p.close();
}
await b.close();
