/* ⭐⭐ 張るをくねらせる（2026-08-27）
   木下＝「はるにさ、頂点を追加してくねっと曲げたりできたらそれはいいかな」

   見るのは「落ちない」ではなく：
     ⚠️ まっすぐのときは【これまでと1画素も変わらない】（別スクリプトで4通り突き合わせ済み）
     ⭐⭐ ⌖ 頂点の道具で張るの線を押す＝曲げの点が増える
     ⭐ 掴んで動かすと本当にくねる（字の高さがばらける）
     ⭐⭐ 曲げは【箱に対する割合】で持つ＝箱を動かしても曲がりが付いてくる
     ⭐ 点を消せばまっすぐに戻る
   使い方: node hari/_test/haru.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(process.argv[2], { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3800));
const R = await p.evaluate(async () => {
  const w = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  const cv = document.querySelector('canvas');
  const ev = (t,o) => cv.dispatchEvent(new PointerEvent(t, Object.assign({button:0,buttons:1,bubbles:true,pointerId:1,pointerType:'mouse'}, o)));
  const L = S.lines[0];
  S.sel = { kind:'line', i:0 };
  L.kind='haru'; L.text='はるをくねらせる'; L.box={ x:10, y:50, w:80, rot:0 }; L.fit=0;
  syncPanel(); render(); await w(500);
  const ys = () => { const g = artItems().find(c => c.data && c.data.line === L.id);
    return g.children.map(it => Math.round(it.bounds.center.y)); };
  const y0 = ys();
  out.まっすぐ = { 高さの幅: Math.max(...y0) - Math.min(...y0) };
  // ① ⌖ 頂点の道具で、張るの線を押す＝曲げの点が増える
  document.querySelector('#tools button[data-tool="pt"]').click(); await w(300);
  const line = uiLayer.children.find(c => c.data && c.data.pathOf === L.id);
  out.線がある = !!line;
  if(line){
    const q = line.getPointAt(line.length*0.5);
    const v = paper.view.projectToView(q), r = cv.getBoundingClientRect();
    ev('pointerdown', { clientX:r.left+v.x, clientY:r.top+v.y });
    window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));
    await w(400);
  }
  out.点が増える = (L.box.pts||[]).length;
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'v',bubbles:true})); await w(300);
  // ② 掴んで動かすと曲がる
  const h = uiLayer.children.find(c => c.data && c.data.haruPt !== undefined);
  out.掴み手 = !!h;
  if(h){
    const v = paper.view.projectToView(h.bounds.center), r = cv.getBoundingClientRect();
    ev('pointerdown', { clientX:r.left+v.x, clientY:r.top+v.y });
    for(let i=1;i<=6;i++) ev('pointermove', { clientX:r.left+v.x, clientY:r.top+v.y - 14*i });
    window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));
    await w(400);
  }
  const y1 = ys();
  out.曲がった = { 高さの幅: Math.max(...y1) - Math.min(...y1), uv:L.box.pts[0].map(n=>+n.toFixed(3)) };
  // ③ 箱を動かしても曲がりが付いてくる（割合で持っている）
  const before = JSON.stringify(L.box.pts);
  L.box.x = 25; render(); await w(300);
  const y2 = ys();
  out.付いてくる = { 控えは同じ: before === JSON.stringify(L.box.pts),
                     高さの幅: Math.max(...y2) - Math.min(...y2) };
  // ④ 点を消せば元通り
  L.box.pts = []; L.box.x = 10; render(); await w(300);
  const y3 = ys();
  out.戻せる = { 高さの幅: Math.max(...y3) - Math.min(...y3) };
  return out;
});
await b.close();
let ng = 0;
const ok = (c,n,note)=>{ console.log(`  ${c?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!c) ng++; };
console.log('── ⭐⭐ 張るをくねらせる');
ok(errs.length === 0, 'JSエラーが出ない', errs.length + '件' + (errs[0] ? ' → ' + errs[0] : ''));
ok(R.まっすぐ.高さの幅 === 0, '⚠️ 点が無ければ【まっすぐ】（これまでの張る）', R.まっすぐ.高さの幅 + 'px');
ok(R.線がある, '⭐ 選ぶと張るの線が見える（⌖ が「この線」だと分かる目印つき）');
ok(R.点が増える === 1, '⭐⭐ ⌖ 頂点で線を押す＝曲げの点が増える', String(R.点が増える));
ok(R.掴み手, '⭐ 曲げの点に掴み手が出る');
ok(R.曲がった.高さの幅 > 40, '⭐⭐ 掴んで動かすと【くねる】', JSON.stringify(R.曲がった));
ok(R.付いてくる.控えは同じ && R.付いてくる.高さの幅 > 40,
   '⭐⭐ 箱を動かしても曲がりが付いてくる（割合で持っているので控えは1つも書き換わらない）',
   JSON.stringify(R.付いてくる));
ok(R.戻せる.高さの幅 === 0, '⭐ 点を消せばまっすぐに戻る', R.戻せる.高さの幅 + 'px');
process.exit(ng ? 1 : 0);
