/* ⭐⭐ 経路をもっと使えるように（2026-08-27）
   木下＝「もう少し多角形やたん系が使いやすくしたい。左右逆になるとか？上下逆になるとか」
   「このままの状態で大きくできるかもいいな」
   「イラレでいうポイントをひとつ追加、ボード上でできるとより自由に使えそう」

   見るのは「落ちない」ではなく：
     ⭐⭐ 左右／上下に返すと絵が変わる（字の並ぶ順も・回る向きも一度に）
     ⭐⭐ 経路ごと大きくできて、掴んで作った形（控えの頂点）は【1つも書き換わらない】
     ⭐ 返している間も、頂点の掴み手が【見えている所】に出る
     ⭐⭐ 経路の線をダブルクリック＝頂点が増える／頂点をダブルクリック＝減る
   ⚠️ 「返して戻すと完全に同じ」は【この道具の前からある描き直しのぶれ】で
      4600画素ほど残る（反転を入れる前の版でも同じ数が出ることを確認済み）。
      なので「返した時（14000〜18000）よりずっと元に近い」で見る。
   使い方: node hari/_test/path.mjs <URL> */
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
  const settle = async () => { await w(260); paper.view.update(); await w(220); };
  const shot = () => cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
  const diff = (a,c)=>{let n=0;for(let i=0;i<a.length;i+=4){if(Math.abs(a[i]-c[i])>6)n++;}return n;};
  S.sel = { kind:'line', i:0 }; S.lines[0].kind='meguru'; S.lines[0].path.type='poly'; S.lines[0].path.pts=null;
  syncPanel(); render(); await settle();
  /* 🔴 1回目の描画は書体の読み込みが間に合っていないことがある＝
     何回描いても同じ絵になるまで待ってから物差しを取る（でないと毎回ぶれる）。 */
  let A = shot();
  for(let i=0;i<6;i++){ render(); await settle(); const B2 = shot();
    if(diff(A,B2) === 0) break; A = B2; }
  // ① 返す（左右／上下）
  document.getElementById('mirX').click(); await settle();
  out.左右 = diff(A, shot());
  document.getElementById('mirX').click(); await settle();
  out.戻る = diff(A, shot());
  document.getElementById('mirY').click(); await settle();
  out.上下 = diff(A, shot());
  document.getElementById('mirY').click(); await settle();
  // ② 経路ごと大きく（掴んで作った形はそのまま＝控えの点は変わらない）
  const pts0 = JSON.stringify(S.lines[0].path.pts);
  const z = document.getElementById('pZoom');
  z.value='170'; z.dispatchEvent(new Event('input',{bubbles:true})); await settle();
  out.大きく = { 絵:diff(A, shot()), 控えは同じ: pts0 === JSON.stringify(S.lines[0].path.pts),
                 欄:document.getElementById('vZoom').textContent };
  z.value='100'; z.dispatchEvent(new Event('input',{bubbles:true})); await settle();
  out.大きさ戻る = diff(A, shot());
  // ③⭐ 返している間、頂点の掴み手が見えている所に出る
  document.getElementById('mirX').click(); await settle();
  const hs = uiLayer.children.filter(c=>c.data && c.data.vertex!==undefined).map(c=>c.bounds.center);
  const pts = S.lines[0].path.pts, B = S.board;
  out.掴み手 = hs.every((h,i)=> Math.abs(h.x - (B.w - pts[i][0])) < 2 && Math.abs(h.y - pts[i][1]) < 2);
  document.getElementById('mirX').click(); await settle();
  // ④⭐⭐ 経路の線をダブルクリック＝頂点が増える
  const n0 = S.lines[0].path.pts.length;
  const line = uiLayer.children.find(c=>c.data && c.data.pathOf !== undefined);
  const mid = line ? line.getPointAt(line.length*0.13) : null;
  if(mid){
    const v = paper.view.projectToView(mid), r = cv.getBoundingClientRect();
    cv.dispatchEvent(new MouseEvent('dblclick',{clientX:r.left+v.x, clientY:r.top+v.y, bubbles:true, cancelable:true}));
    await settle();
  }
  out.足せる = { 前:n0, 後:S.lines[0].path.pts.length };
  // ⑤ 頂点をダブルクリック＝減る
  const h0 = uiLayer.children.find(c=>c.data && c.data.vertex!==undefined);
  if(h0){
    const v = paper.view.projectToView(h0.bounds.center), r = cv.getBoundingClientRect();
    cv.dispatchEvent(new MouseEvent('dblclick',{clientX:r.left+v.x, clientY:r.top+v.y, bubbles:true, cancelable:true}));
    await settle();
  }
  out.減らせる = S.lines[0].path.pts.length;
  /* ══ ⑥⭐⭐ 左の道具立ての【頂点】＝持ち替えて、押すだけで増える ══ */
  {
    const btn = document.querySelector('#tools button[data-tool="pt"]');
    out.道具がある = !!btn;
    if(btn){
      btn.click(); await settle();
      out.持ち替えた = !!PEN.pt && btn.classList.contains('on');
      const n0 = S.lines[0].path.pts.length;
      const line = uiLayer.children.find(c=>c.data && c.data.pathOf !== undefined);
      const q = line ? line.getPointAt(line.length*0.62) : null;
      if(q){
        const v = paper.view.projectToView(q), r = cv.getBoundingClientRect();
        cv.dispatchEvent(new PointerEvent('pointerdown',
          { clientX:r.left+v.x, clientY:r.top+v.y, button:0, buttons:1, bubbles:true, pointerId:1, pointerType:'mouse' }));
        window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));
        await settle();
      }
      out.道具で足せる = { 前:n0, 後:S.lines[0].path.pts.length };
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'v',bubbles:true})); await settle();
      out.選ぶに戻る = !PEN.pt;
    }
  }
  return out;
});
await b.close();
let ng = 0;
const ok = (c,n,note)=>{ console.log(`  ${c?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!c) ng++; };
console.log('── ⭐⭐ 経路（返す・大きさ・頂点を足す）');
ok(errs.length === 0, 'JSエラーが出ない', errs.length + '件' + (errs[0] ? ' → ' + errs[0] : ''));
ok(R.左右 > 8000, '⭐⭐ 左右に返すと絵が変わる', R.左右 + '画素');
ok(R.上下 > 8000, '⭐⭐ 上下に返すと絵が変わる', R.上下 + '画素');
ok(R.戻る < R.左右 * 0.5, '⭐ 返して戻すと元に近い（⚠️ 前からある描き直しのぶれが残る）',
   `戻り ${R.戻る} ／ 返した時 ${R.左右}`);
ok(R.大きく.絵 > 8000 && R.大きく.欄 === '170',
   '⭐⭐ 経路ごと大きくできる', JSON.stringify(R.大きく));
ok(R.大きく.控えは同じ,
   '⭐⭐ 大きくしても【掴んで作った形（控えの頂点）は書き換わらない】＝何度でも戻せる');
ok(R.大きさ戻る < R.大きく.絵 * 0.5, '⭐ 100 に戻せば元に近い', R.大きさ戻る + '画素');
ok(R.掴み手, '⭐ 返している間も、頂点の掴み手が【見えている所】に出る');
ok(R.足せる.後 === R.足せる.前 + 1,
   '⭐⭐ 経路の線をダブルクリック＝頂点が1つ増える', JSON.stringify(R.足せる));
ok(R.減らせる === R.足せる.前, '⭐ 頂点をダブルクリック＝1つ減る', String(R.減らせる));
ok(R.道具がある && R.持ち替えた, '⭐⭐ 左の道具立てに【頂点】がある／持ち替えられる（木下の頼み）');
ok(R.道具で足せる && R.道具で足せる.後 === R.道具で足せる.前 + 1,
   '⭐⭐ 持ち替えたら【押すだけ】で頂点が増える', JSON.stringify(R.道具で足せる));
ok(R.選ぶに戻る, '⭐ V で選ぶに戻る（持ちっぱなしにしない）');
process.exit(ng ? 1 : 0);
