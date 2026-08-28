import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1500, height:950, deviceScaleFactor:1 });
/* ⚠️ 既定は【この道具の index.html を直に】読む（feel.mjs と同じ作法）。
   URL を渡せばそちらを見る（コピーを立てて当てるとき用）。 */
const FILE = process.argv[2] || 'file://' + decodeURIComponent(
  (await import('node:path')).default.join(
    (await import('node:path')).default.dirname(
      (await import('node:url')).fileURLToPath(import.meta.url)), '..', 'index.html'));
await p.goto(FILE, { waitUntil:'networkidle0' });
await p.evaluate(() => { try{ localStorage.clear(); }catch(_){} });
await p.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,3000));

const ok = (c,n,x)=>{ console.log((c?'  ✅ ':'  🔴 ')+n+(x!=null?' … '+x:'')); if(!c) NG=1; };
let NG=0;

// 図形を1つ置いて選ぶ
await p.evaluate(() => {
  artLayer.activate();
  const q = new paper.Path.Circle(paper.view.center, 120);
  q.fillColor = '#111';
  artLayer.children.forEach(c => c.selected = false);
  q.selected = true;
  guides(); paper.view.update();
});
await new Promise(r=>setTimeout(r,400));
/* ⭐ 物差しは【本体と同じ出どころ】＝anchors が付けた印（data.pv）を数える。
   ⚠️ 画素や uiLayer の数だと、選択の掴み手（バウンディングボックス）や枠のガイドまで混ざる
      （実測 3144→2545 で止まって「消えていない」に見えた）。掴み手は【残ってよい】もの。 */
const count = () => p.evaluate(() => uiLayer.children.filter(c => c.data && c.data.pv).length);
const 出ている = await count();
ok(出ている > 8, '既定ではパスが出ている（今までどおり）', 出ている + ' 個のアンカー下見');

// 位置（枠と重なっていないか）
const pos = await p.evaluate(() => {
  const a = document.getElementById('abBtn').getBoundingClientRect();
  const v = document.getElementById('pvBtn').getBoundingClientRect();
  return { 枠右:Math.round(a.right), パス左:Math.round(v.left), 同じ高さ: Math.round(a.top)===Math.round(v.top), 幅:Math.round(v.width) };
});
ok(pos.パス左 >= pos.枠右 && pos.パス左 - pos.枠右 < 20 && pos.同じ高さ, '枠の右にきれいに並ぶ', JSON.stringify(pos));

// 押すと消える
await p.click('#pvBtn'); await new Promise(r=>setTimeout(r,400));
const 消えた = await count();
ok(消えた === 0, 'ボタンでパスが消える', 消えた + ' 個');
ok(await p.evaluate(() => paper.settings.handleSize === 0), 'paper 自前の点も止まる');
ok(await p.evaluate(() => artLayer.children.some(c => c.selected)), '選択そのものは外れていない');

// ダイレクト選択の間は必ず出る
await p.evaluate(() => setTool('direct')); await new Promise(r=>setTimeout(r,400));
ok(await count() > 8, 'ダイレクト選択の間は必ず出る（点を掴む道具だから）', (await count()) + ' 個');
await p.evaluate(() => setTool('select')); await new Promise(r=>setTimeout(r,400));
ok(await count() === 0, '選択に戻ると また消える', (await count()) + ' 個');

// H キー
await p.keyboard.press('h'); await new Promise(r=>setTimeout(r,400));
ok(await count() > 8, 'H キーで出る', (await count()) + ' 個');
await p.keyboard.press('h'); await new Promise(r=>setTimeout(r,400));
ok(await count() === 0, 'H キーで消える', (await count()) + ' 個');

// 覚えている
await p.reload({ waitUntil:'networkidle0' }); await new Promise(r=>setTimeout(r,3000));
ok(await p.evaluate(() => S.pathView === false), '開き直しても覚えている');
ok(await p.evaluate(() => document.getElementById('pvBtn').classList.contains('on') === false), 'ボタンの印も合っている');
ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close();
process.exit(NG);
