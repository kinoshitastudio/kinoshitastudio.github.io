/* ⭐ 塗 NURI の【つまみが効くか】回帰テスト（2026-08-19 新設）
   木下「これが全く何もかわらないのは仕様？」（粒の角・粒の形が錐のとき）
   🔴 錐は四角を直に描いていたので【粒の角（丸→四角）を通っていなかった】
      ＝触れるのに効かない範囲を作っていた。→ 玉と同じ形（超楕円）で切り抜く。
   ⚠️ 測るのは【粒1つのスプライトの四隅の埋まり】＝四角いほど多い。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL0 = process.argv[2] || 'http://localhost:8092/nuri/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
p.on('pageerror', e => console.log('🔴', e.message));
await p.setViewport({ width:900, height:900, deviceScaleFactor:1 });
await p.goto(URL0 + '?v='+Date.now(), { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,2500));
/* 粒1つのスプライトで、四隅がどれだけ埋まっているか＝角の丸さを測る */
const r = await p.evaluate(() => {
  const out = {};
  for(const fill of ['tama','kado']){
    P.fill = fill; P.gloss = 0.8; P.bulge = 0.4; P.lang = 315;
    const row = {};
    for(const sq of [2, 4, 8]){
      P.sq = sq; TAMA.clear();
      const sp = tamaSprite([58,60,232], 0, 1);
      const c = document.createElement('canvas'); c.width=sp.width; c.height=sp.height;
      const q = c.getContext('2d'); q.drawImage(sp,0,0);
      const d = q.getImageData(0,0,c.width,c.height).data;
      /* 四隅（外側 12%）に不透明な画素がどれだけあるか＝四角いほど多い */
      const m = Math.round(c.width*0.12);
      let n=0, tot=0;
      for(let y=0;y<m;y++) for(let x=0;x<m;x++){ tot++; if(d[(y*c.width+x)*4+3] > 60) n++; }
      row['角'+sq] = +(n/tot*100).toFixed(1);
    }
    out[fill] = row;
  }
  return out;
});
console.log(JSON.stringify(r));
const ng=[]; const ck=(o,n,x)=>{console.log(`  ${o?'✅':'🔴'} ${n}${x?'  '+x:''}`); if(!o)ng.push(n);};
for(const f of ['tama','kado']){
  const v = r[f];
  ck(v['角2'] < 5, `${f}：角2（丸）で四隅が空く`, String(v['角2']));
  ck(v['角8'] > 40, `${f}：角8（四角）で四隅が埋まる`, String(v['角8']));
  ck(v['角8'] - v['角2'] > 30, `⭐${f}：粒の角のつまみが効いている`, JSON.stringify(v));
}
await b.close();
console.log(ng.length ? `\n🔴 だめだったもの ${ng.length}件: ${ng.join(' / ')}` : '\n✅ つまみは全部効いている');
process.exit(ng.length ? 1 : 0);
