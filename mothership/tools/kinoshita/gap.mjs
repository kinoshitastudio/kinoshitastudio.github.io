import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage(); await p.setViewport({width:1440,height:900});
await p.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
await p.goto('https://www.uniform-net.jp/',{waitUntil:'networkidle2',timeout:60000});
await new Promise(r=>setTimeout(r,3000));
console.log(JSON.stringify(await p.evaluate(()=>{
  const R={};
  // ⭐ 私の作りが【拾えないもの】を数える
  R['SVG（ロゴ・アイコン）'] = document.querySelectorAll('svg').length;
  R['疑似要素 ::before/::after で描いた飾り'] = [...document.querySelectorAll('*')].filter(e=>{
    const b=getComputedStyle(e,'::before'), a=getComputedStyle(e,'::after');
    return (b.content&&b.content!=='none'&&b.content!=='""')||(a.content&&a.content!=='none'&&a.content!=='""');
  }).length;
  R['グラデーション背景'] = [...document.querySelectorAll('*')].filter(e=>/gradient/.test(getComputedStyle(e).backgroundImage)).length;
  R['border（枠線）を持つ要素'] = [...document.querySelectorAll('*')].filter(e=>parseFloat(getComputedStyle(e).borderTopWidth)>0).length;
  R['box-shadow（影）'] = [...document.querySelectorAll('*')].filter(e=>getComputedStyle(e).boxShadow!=='none').length;
  R['transform（回転・傾き）'] = [...document.querySelectorAll('*')].filter(e=>{const t=getComputedStyle(e).transform; return t&&t!=='none'&&!/matrix\(1, 0, 0, 1/.test(t);}).length;
  R['clip-path で切った形'] = [...document.querySelectorAll('*')].filter(e=>{const c=getComputedStyle(e).clipPath; return c&&c!=='none';}).length;
  R['video'] = document.querySelectorAll('video').length;
  R['スクロールで現れる要素（opacity:0）'] = [...document.querySelectorAll('*')].filter(e=>+getComputedStyle(e).opacity<0.05).length;
  R['縦書き（writing-mode）'] = [...document.querySelectorAll('*')].filter(e=>/vertical/.test(getComputedStyle(e).writingMode)).length;
  R['文字のグラデ/縁取り'] = [...document.querySelectorAll('*')].filter(e=>{const c=getComputedStyle(e); return c.webkitTextStroke!=='0px'&&c.webkitTextStroke!==''||c.webkitTextFillColor==='rgba(0, 0, 0, 0)';}).length;
  return R;
}),null,1));
await b.close();
