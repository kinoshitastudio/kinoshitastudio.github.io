/* ⭐⭐ 複数選択・版面はスペースで動かす・掴んだ反対側から伸ばす（2026-08-27）
   木下＝「複数選択もできるように、またつかんだレイヤーのオブジェクトはパネルで色をつけるなど
   アクティブをわかるように」「今だとそのままボードがずれてしまうので、ボード上を動かす時は
   スペースを押しながらなど工夫して」「真ん中から左右に広がるのでやりづらい。
   掴んだ左右の辺から大きくできるようにして」「ちょうどあわせないとフレームが表示される」

   見るのは「落ちない」ではなく：
     ⭐ ⇧で選びに足す／外す・一覧も同じ数だけ光る（アクティブが見える）
     ⭐⭐ 主を選び直したら追加分は消える（選び直したのに前のが残る、を作らない）
     ⭐ まとめて動く
     ⭐⭐ 何もない所を引いても【版面は動かない】／スペースを押している間だけ動く
     ⭐⭐ 掴んだ所の【反対側】が動かない（⌥ は中心から＝今までの効き）
     ⭐ 版面をちょうど覆う大きさで吸い付く
   使い方: node hari/_test/multi.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(process.argv[2], { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 4000));
const R = await p.evaluate(async () => {
  const w = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  const cv = document.querySelector('canvas');
  const ev = (t,o) => cv.dispatchEvent(new PointerEvent(t, Object.assign({button:0,buttons:1,bubbles:true,pointerId:1,pointerType:'mouse'}, o)));
  // ① 一覧で ⇧クリック＝足す
  const rows = () => [...document.querySelectorAll('#lineList .li:not(.kami)')];
  rows()[0].dispatchEvent(new MouseEvent('click',{bubbles:true})); await w(200);
  out.単数 = { 数:selList().length, 光る:document.querySelectorAll('#lineList .li.on').length };
  rows()[1].dispatchEvent(new MouseEvent('click',{bubbles:true, shiftKey:true})); await w(250);
  out.shiftAdd = { 数:selList().length, 光る:document.querySelectorAll('#lineList .li.on').length };
  /* ══ ②⭐⭐ まとめて動かす ══
     🔴 2026-08-27：ここで moveSel() を【直接呼んで】いたので、
        本体が moveSel を呼んでいなくても通ってしまっていた（＝落ちない試験）。
     ⭐ 指で掴んで引く道を通す＝本体の配線ごと確かめる。 */
  const snap0 = () => selList().map(o => JSON.stringify(selObj(o).path || selObj(o).box || {x:selObj(o).x}));
  const before = snap0();
  {
    const g = artItems().find(c => c.data && (c.data.line === selObj(selList()[0]).id ||
                                              c.data.piece === selObj(selList()[0]).id));
    const c0 = g.parent ? g.parent.localToGlobal(g.bounds.center) : g.bounds.center;
    const v = paper.view.projectToView(c0), r0 = cv.getBoundingClientRect();
    const X = r0.left + v.x, Y = r0.top + v.y;
    ev('pointerdown', { clientX:X, clientY:Y });
    for(let i=1;i<=5;i++) ev('pointermove', { clientX:X + 9*i, clientY:Y + 6*i });
    window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));
    await w(350);
  }
  const after = snap0();
  out.まとめて動く = before.filter((b,i)=> b !== after[i]).length;
  // ③ ⇧でもう一度＝外す
  rows()[1].dispatchEvent(new MouseEvent('click',{bubbles:true, shiftKey:true})); await w(250);
  out.shiftDrop = selList().length;
  // ④ 主を選び直すと追加分は消える
  rows()[1].dispatchEvent(new MouseEvent('click',{bubbles:true, shiftKey:true})); await w(200);
  rows()[0].dispatchEvent(new MouseEvent('click',{bubbles:true})); await w(200);
  out.選び直すと1つ = selList().length;
  // ⑤ スペースで版面が動く／何もない所を引いても動かない
  const c0 = paper.view.center.clone();
  const r = cv.getBoundingClientRect();
  ev('pointerdown', { clientX:r.left+30, clientY:r.top+30 });
  ev('pointermove', { clientX:r.left+160, clientY:r.top+120 });
  window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));
  await w(250);
  out.何もない所 = { 動いた: Math.round(paper.view.center.getDistance(c0)) };
  document.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',key:' ',bubbles:true}));
  await w(150);
  ev('pointerdown', { clientX:r.left+30, clientY:r.top+30 });
  ev('pointermove', { clientX:r.left+160, clientY:r.top+120 });
  window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));
  await w(250);
  document.dispatchEvent(new KeyboardEvent('keyup',{code:'Space',key:' ',bubbles:true}));
  out.スペース = { 動いた: Math.round(paper.view.center.getDistance(c0)) };

  /* ══ ⑦⭐⭐ 版面の縁に吸い付く（縁＝地の色の帯が出るのを防ぐ）══ */
  {
    const c = document.createElement('canvas'); c.width=200; c.height=280;
    c.getContext('2d').fillStyle='#c8322a'; c.getContext('2d').fillRect(0,0,200,280);
    const blob = await new Promise(r=> c.toBlob(r,'image/png'));
    takeFile(new File([blob],'s.png',{type:'image/png'}));
    for(let i=0;i<40 && !S.pieces.some(x=>x.src);i++) await w(100);
    const pc = S.pieces[S.pieces.length-1];
    /* 版面をちょうど覆う大きさにして、少しだけ内側へずらす＝縁が出ている状態を作る */
    pc.sc = fitScale(pc, 'cover'); pc.x = S.board.w/2; pc.y = S.board.h/2;
    S.sel = { kind:'piece', i:S.pieces.length-1 }; syncPanel(); render(); await w(300);
    const off = Math.max(3, Math.round(Math.min(S.board.w, S.board.h) * 0.006));
    pc.x += off; pc.y += off; render(); await w(200);
    const gap0 = Math.round(Math.min(...pieceCorners(pc).map(q=>q.x)));
    /* 指で1px 引く＝本体の配線ごと確かめる */
    const g2 = artItems().find(x => x.data && x.data.piece === pc.id);
    const c2 = g2.parent ? g2.parent.localToGlobal(g2.bounds.center) : g2.bounds.center;
    const v2 = paper.view.projectToView(c2), r2 = cv.getBoundingClientRect();
    ev('pointerdown', { clientX:r2.left+v2.x, clientY:r2.top+v2.y });
    ev('pointermove', { clientX:r2.left+v2.x+1, clientY:r2.top+v2.y+1 });
    window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));
    await w(300);
    const cs2 = pieceCorners(pc);
    out.吸い付く = { 前の隙間:gap0,
                     後の左:Math.round(Math.min(...cs2.map(q=>q.x))),
                     後の上:Math.round(Math.min(...cs2.map(q=>q.y))) };
  }
  return out;
});
const R2 = await p.evaluate(async () => {
  const w = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  const cv = document.querySelector('canvas');
  const ev = (t,o) => cv.dispatchEvent(new PointerEvent(t, Object.assign({button:0,buttons:1,bubbles:true,pointerId:1,pointerType:'mouse'}, o)));
  const c = document.createElement('canvas'); c.width=200;c.height=140;
  c.getContext('2d').fillStyle='#2b6cf6'; c.getContext('2d').fillRect(0,0,200,140);
  const blob = await new Promise(r=> c.toBlob(r,'image/png'));
  /* ⚠️ 前の試験で置いた図が残っていることがある＝【足す前の数】を控えて、増えるまで待つ
     （そうしないと古い図を掴んで、拡大の試験が「効いていない」に見える） */
  const n00 = S.pieces.length;
  takeFile(new File([blob],'a.png',{type:'image/png'}));
  for(let i=0;i<40 && S.pieces.length === n00;i++) await w(100);
  const pc = S.pieces[S.pieces.length-1];
  pc.sc = 40; pc.x = S.board.w*0.4; pc.y = S.board.h*0.4;
  S.sel = { kind:'piece', i:S.pieces.length-1 };
  syncPanel(); render(); await w(400);
  const scr = q => { const v = paper.view.projectToView(q); const r = cv.getBoundingClientRect();
    return { x:r.left+v.x, y:r.top+v.y }; };
  const corner = i => pieceCorners(pc)[i];
  // 右下の角（index 4）を掴んで外へ引く。左上（index 0）が動かないはず
  const A0 = corner(0).clone();
  const Q = scr(corner(4));
  ev('pointerdown', { clientX:Q.x, clientY:Q.y });
  for(let i=1;i<=8;i++) { ev('pointermove', { clientX:Q.x+8*i, clientY:Q.y+6*i }); await w(30); }
  window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));
  await w(300);
  const A1 = corner(0);
  out.anchorFix = { ずれ:+A0.getDistance(A1).toFixed(2), 大きさ:Math.round(pc.sc) };
  // ⌥＝中心から（今までの効き）＝中心が動かない
  pc.sc = 40; pc.x = S.board.w*0.4; pc.y = S.board.h*0.4; render(); await w(300);
  const C0 = { x:pc.x, y:pc.y };
  const Q2 = scr(corner(4));
  ev('pointerdown', { clientX:Q2.x, clientY:Q2.y, altKey:true });
  for(let i=1;i<=8;i++) { ev('pointermove', { clientX:Q2.x+8*i, clientY:Q2.y+6*i, altKey:true }); await w(30); }
  window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));
  await w(300);
  out.altCenter = { ずれ:+Math.hypot(pc.x-C0.x, pc.y-C0.y).toFixed(2), 大きさ:Math.round(pc.sc) };
  // 覆う大きさでsnap
  const cover = fitScale(pc, 'cover');
  pc.sc = cover * 0.97; pc.x = S.board.w/2; pc.y = S.board.h/2; render(); await w(300);
  const Q3 = scr(corner(4));
  ev('pointerdown', { clientX:Q3.x, clientY:Q3.y });
  ev('pointermove', { clientX:Q3.x+3, clientY:Q3.y+2 }); await w(80);
  ev('pointermove', { clientX:Q3.x+5, clientY:Q3.y+4 }); await w(200);
  window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));
  await w(300);
  out.snap = { 大きさ:+pc.sc.toFixed(2), 覆う:+cover.toFixed(2),
                   一致:Math.abs(pc.sc - cover) < 0.01 };
  return out;
});
await b.close();
let ng = 0;
const ok = (c,n,note)=>{ console.log(`  ${c?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!c) ng++; };
console.log('── ⭐⭐ 複数選択・スペースで版面・掴んだ反対側から');
ok(errs.length === 0, 'JSエラーが出ない', errs.length + '件' + (errs[0] ? ' → ' + errs[0] : ''));
ok(R.単数.数 === 1 && R.単数.光る === 1, '⭐ ふつうに押せば1つ（一覧も1つ光る）', JSON.stringify(R.単数));
ok(R.shiftAdd.数 === 2 && R.shiftAdd.光る === 2,
   '⭐⭐ ⇧で選びに足せる／一覧も【同じ数だけ光る】（木下：アクティブを分かるように）',
   JSON.stringify(R.shiftAdd));
ok(R.まとめて動く === 2, '⭐⭐ 選んだものが【まとめて】動く', R.まとめて動く + 'つ動いた');
ok(R.shiftDrop === 1, '⭐ ⇧でもう一度押すと外れる', String(R.shiftDrop));
ok(R.選び直すと1つ === 1, '⭐⭐ 主を選び直したら追加分は消える', String(R.選び直すと1つ));
ok(R.何もない所.動いた === 0, '⭐⭐ 何もない所を引いても【版面は動かない】（木下：勝手にずれる）', R.何もない所.動いた + 'px');
ok(R.スペース.動いた > 100, '⭐⭐ スペースを押している間だけ版面が動く', R.スペース.動いた + 'px');
ok(R2.anchorFix.ずれ < 1 && R2.anchorFix.大きさ > 45,
   '⭐⭐ 掴んだ所の【反対側】が動かない（Figma と同じ持ち方）', JSON.stringify(R2.anchorFix));
ok(R2.altCenter.ずれ < 1 && R2.altCenter.大きさ > 45,
   '⭐ ⌥ は中心から（今までの効きも残っている）', JSON.stringify(R2.altCenter));
ok(R2.snap.一致, '⭐⭐ 版面をちょうど覆う大きさで吸い付く（縁が出ない）', JSON.stringify(R2.snap));
ok(R.吸い付く && R.吸い付く.前の隙間 > 0 && R.吸い付く.後の左 <= 0 && R.吸い付く.後の上 <= 0,
   '⭐⭐ 動かしても【版面の縁に吸い付く】＝地の色の帯が出ない（木下：書き出しでずれる）',
   JSON.stringify(R.吸い付く));
process.exit(ng ? 1 : 0);
