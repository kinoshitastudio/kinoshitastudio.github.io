/* ⭐⭐ 散 CHIRU ── 小さな文章の塊を版面に散らす（2026-08-27）
   木下＝「別途新しいセクションをパネルに作り、そこにテキストを入れ込みするとランダムに配置。
   フォントを小さく配置させ、ランダムに当て込みし直感的に僕が選べるようにしたい。
   また直接ボードをさわり移動することもできる」

   見るのは「落ちない」ではなく：
     ⭐ 置き方に【散】がある／選ぶと散の段が出る
     ⭐ 文章が塊に分かれて版面に散る
     ⭐⭐ 振ると置き場所が変わる（見て選ぶ）
     ⭐⭐ 塊を【1つだけ】掴んで動かせる（他は動かない）
     🔴 「並ぶ」も盤で掴めるか（木下「並ぶだけが移動できないのもいやだね」）
   ⚠️ 掴んだ結果は【控え（put）】で見る＝絵の中心は字の並びで動くので物差しにならない。
   ⚠️ 塊の中心には字が無いことがある＝中の1字を狙う。
   使い方: node hari/_test/chiru.mjs <URL> */
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
  L.text = 'A small white chicken confidently perches on the back of a reclining white goat. The two animals are indoors at night, bathed in the direct flash of the camera.';
  L.size = 14;
  document.querySelector('#segPath button')  // 触らない
  ;[...document.querySelectorAll('#segKind button')].forEach(()=>{});
  const kindBtn = [...document.querySelectorAll('button[data-v="chiru"]')][0];
  out.段がある = !!kindBtn;
  if(kindBtn){ kindBtn.click(); await w(700); }
  out.散になった = L.kind;
  out.パネルが出る = getComputedStyle(document.getElementById('chiruUI')).display !== 'none';
  const blocks = () => { const g = artItems().find(c => c.data && c.data.line === L.id);
    return g ? g.children.filter(c => c.data && c.data.chiruAt !== undefined) : []; };
  out.塊の数 = blocks().length;
  const posOf = () => blocks().map(g => [Math.round(g.bounds.center.x), Math.round(g.bounds.center.y)]);
  const p0 = posOf();
  // ① 振ると置き場所が変わる
  document.getElementById('cShake').click(); await w(700);
  const p1 = posOf();
  out.振ると変わる = p0.filter((q,i)=> !p1[i] || q[0]!==p1[i][0] || q[1]!==p1[i][1]).length;
  // ② 塊を掴んで動かせる
  /* ⭐ 掴んだ結果は【控え（put）】で見る＝版面の絵の位置より確実（字の並びで中心は動くため）。
     ⚠️ 塊の中心には字が無いことがある＝中の1字を狙う。 */
  const bs = blocks();
  const put0 = JSON.stringify((L.chiru.put||[]).map(q=>q.map(v=>Math.round(v*100)/100)));
  if(bs.length){
    const ch = bs[0].children[0];
    const c0 = ch.parent.localToGlobal(ch.bounds.center);
    const v = paper.view.projectToView(c0), r = cv.getBoundingClientRect();
    ev('pointerdown', { clientX:r.left+v.x, clientY:r.top+v.y });
    out.掴んだ = (typeof drag !== 'undefined' && drag) ? drag.kind + '/' + drag.at : 'なし';
    for(let i=1;i<=5;i++){ ev('pointermove', { clientX:r.left+v.x+12*i, clientY:r.top+v.y+9*i }); await w(30); }
    window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));
    await w(400);
  }
  const put1 = (L.chiru.put||[]).map(q=>q.map(v=>Math.round(v*100)/100));
  const p1put = JSON.parse(put0);
  out.掴んで動く = {
    動いた: p1put[0] ? Math.round(Math.hypot(put1[0][0]-p1put[0][0], put1[0][1]-p1put[0][1])*10)/10 : -1,
    他は動かない: p1put.slice(1).every((q,i)=> put1[i+1] && q[0]===put1[i+1][0] && q[1]===put1[i+1][1]) };
  // ③ 塊の数を変えられる
  const n = document.getElementById('cN');
  n.value='12'; n.dispatchEvent(new Event('input',{bubbles:true})); await w(700);
  out.数を変える = blocks().length;
  // ④ 並ぶが掴めるか（別件）
  L.kind = 'narabu'; S.sel = { kind:'line', i:0 }; syncPanel(); render(); await w(400);
  out.並ぶの掴み手 = uiLayer.children.filter(c=>c.data && (c.data.lineCorner!==undefined)).length;
  return out;
});
await b.close();
let ng = 0;
const ok = (c,n,note)=>{ console.log(`  ${c?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!c) ng++; };
console.log('── ⭐⭐ 散（小さな文章を版面に散らす）');
ok(errs.length === 0, 'JSエラーが出ない', errs.length + '件' + (errs[0] ? ' → ' + errs[0] : ''));
ok(R.段がある && R.散になった === 'chiru', '⭐ 置き方に【散】がある');
ok(R.パネルが出る, '⭐ 散を選ぶと散の段が出る（触れるのに効かない、を残さない）');
ok(R.塊の数 >= 3, '⭐⭐ 文章が塊に分かれて散る', R.塊の数 + '個');
ok(R.振ると変わる === R.塊の数, '⭐⭐ 振ると【ぜんぶの】置き場所が変わる（見て選ぶ）',
   R.振ると変わる + '/' + R.塊の数);
ok(R.掴んだ && /chiruMove/.test(R.掴んだ),
   '⭐⭐ 塊を掴める（🔴「行ごと回す」に取られていたのを直した）', R.掴んだ);
ok(R.掴んで動く.動いた > 3 && R.掴んで動く.他は動かない,
   '⭐⭐ 掴んだ塊【だけ】が動く（直接ボードをさわり移動できる）', JSON.stringify(R.掴んで動く));
ok(R.数を変える !== R.塊の数, '⭐ 塊の数を変えられる', R.塊の数 + ' → ' + R.数を変える);
ok(R.並ぶの掴み手 > 0,
   '🔴 【並ぶ】も盤で掴める（木下「並ぶだけが移動できないのもいやだね」）', R.並ぶの掴み手 + '個');
process.exit(ng ? 1 : 0);
