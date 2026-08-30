/* ⭐⭐ 外の余白 と 比のつまみ（2026-08-30）
   ① 外の余白＝【組みぜんぶ】が姿はそのままで内側へ入る
      🔴 直す前：張る・並ぶ・札 の箱しか動かず、沿う・図・描いた線は1画素も動かなかった
   ② 余白 0 なら 1画素も変わらない（画素で見る）
   ③ 縮み方は縦横おなじ率＝丸が楕円に潰れない
   ④ 掴み手が【縮んだあとの絵の上】に出る（見えている所を掴める）
   ⑤ 押した所と、そこに出来る行の場所が一致する（入口で打ち消せているか）
   ⑥ 余白の線＝引く／引かない が効く／ガイドの余白は既定 0（勝手に線が出ない）
   ⑦ 比のつまみ＝連続で動かせて、長辺は変わらず、構図が同じ割合の所に残る
   ⑧ 引いている間は【1コマに1回だけ】刷る（30回投げて刷りが30回走らない）
   使い方: node hari/_test/pad.mjs [URL] */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || path.join(HERE, '..', 'index.html');
const URL0 = /^https?:|^file:/.test(FILE) ? FILE : 'file://' + decodeURIComponent(path.resolve(FILE));
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage(); let err = 0;
p.on('pageerror', e => { err++; console.log('🔴', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(URL0, { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3500));

const R = await p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  /* ⚠️ 直す前の版には pp が無い＝ここで落ちると【何が落ちたか】が出ない。素通しで測る */
  const PP = (typeof pp === 'function') ? pp : (q => q);
  /* headless は行0で始まる＝自分で積む。置き方も混ぜる（沿う／並ぶ） */
  for(let i = 0; i < 5; i++) newLine();
  if(S.lines[1]) S.lines[1].kind = 'narabu';
  /* ⭐ 図も1つ作る＝【描いた線】が寄るかも見る（行だけだと図の道が通らない） */
  { const r0 = cv.getBoundingClientRect();
    document.getElementById('bPen').click(); await wait(200);
    const ev = (t,x,y) => cv.dispatchEvent(new PointerEvent(t,
      { clientX:x, clientY:y, button:0, buttons:1, bubbles:true, pointerId:1, pointerType:'mouse' }));
    const y0 = r0.top + r0.height*0.42;
    ev('pointerdown', r0.left + r0.width*0.30, y0);
    for(let i=1;i<=12;i++){ ev('pointermove', r0.left + r0.width*(0.30+0.22*i/12), y0); await wait(16); }
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, pointerId:1 }));
    await wait(400);
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'v', bubbles:true })); await wait(200); }
  out['図'] = S.pieces.length;
  render(); await wait(300);

  const png = () => cv.toDataURL('image/png');
  const geo = () => {
    render();
    const inn = artLayer.children.find(c => c.data && c.data.inner && !c.data.ghost);
    return inn.children.filter(c => !c.clipMask).map(c => {
      const g = inn.localToGlobal(c.bounds.center);
      const k = Math.abs(inn.matrix.scaling.x);
      return { x:+g.x.toFixed(1), y:+g.y.toFixed(1), w:+(c.bounds.width * k).toFixed(1) };
    });
  };

  /* ② 余白 0 なら1画素も変わらない */
  S.board.pad = 0; render(); const p0 = png(); const g0 = geo();
  S.board.pad = 0; render(); out['②0で不変'] = (png() === p0);

  /* ① 全部が内側へ入る */
  S.board.pad = 15; render(); const g15 = geo();
  const c = { x:S.board.w/2, y:S.board.h/2 };
  out['①動いた数'] = g0.filter((a, i) => Math.abs(a.x - g15[i].x) > 0.5 || Math.abs(a.y - g15[i].y) > 0.5).length;
  out['①全部'] = g0.length;
  /* ③ 中心からの距離が【全部おなじ率】で縮んでいるか＝一様（丸が潰れない） */
  const ks = g0.map((a, i) => {
    const d0 = Math.hypot(a.x - c.x, a.y - c.y);
    return d0 < 1 ? null : Math.hypot(g15[i].x - c.x, g15[i].y - c.y) / d0;
  }).filter(v => v !== null);
  out['③率'] = ks.map(v => +v.toFixed(3));
  out['③幅の率'] = g0.map((a, i) => a.w > 1 ? +(g15[i].w / a.w).toFixed(3) : null).filter(v => v);

  /* ④ 掴み手が縮んだ絵の上に出る */
  S.sel = { kind:'line', i:0 }; syncPanel(); render(); await wait(150);
  const inn = artLayer.children.find(c2 => c2.data && c2.data.inner && !c2.data.ghost);
  const art = inn.localToGlobal(inn.children.filter(x => !x.clipMask)[0].bounds.center);
  const hs = uiLayer.children.filter(x => x.data && x.data.lineCorner !== undefined);
  out['④掴み手'] = hs.length;
  if(hs.length){
    const hb = uiLayer.localToGlobal(hs[0].bounds.center);
    out['④手が版面の内'] = (hb.x > S.board.w*0.14 && hb.x < S.board.w*0.86);
  }

  /* ⑤ 押した所 → そこに行が出来る（入口で打ち消せているか） */
  const r = cv.getBoundingClientRect();
  const want = new paper.Point(S.board.w*0.30, S.board.h*0.40);
  const v = paper.view.projectToView(PP(want));
  const n0 = S.lines.length;
  cv.dispatchEvent(new MouseEvent('dblclick', { clientX:r.left+v.x, clientY:r.top+v.y, bubbles:true }));
  await wait(300);
  if(S.lines.length > n0){
    const L = S.lines[S.lines.length-1];
    out['⑤ずれ'] = +Math.hypot(L.box.x/100*S.board.w - want.x, L.box.y/100*S.board.h - want.y).toFixed(1);
    S.lines.pop(); S.sel = { kind:'line', i:0 };
  } else out['⑤ずれ'] = 'いきなり出来なかった';

  /* ⑥ 余白の線／ガイドの余白 */
  const rects = () => { render(); let n = 0;
    const walk = it => { (it.children||[]).forEach(walk);
      if(it.className === 'Path' && it.strokeColor && !it.fillColor && it.segments && it.segments.length === 4) n++; };
    walk(artLayer); return n; };
  S.board.padLine = 1; const l1 = rects();
  S.board.padLine = 0; const l0 = rects();
  out['⑥線'] = (l1 - l0) === 1;
  out['⑥ガイド既定'] = S.guide.margin;
  S.board.padLine = 1; S.board.pad = 0; render();

  /* ⑪ ガイド（三分割）は【版面】の線＝余白で縮まない（物の印だけが縮む） */
  { const at = () => { render();
      let x = null;
      const walk = it => { (it.children||[]).forEach(walk);
        if(it.className === 'Path' && it.segments && it.segments.length === 2 && it.strokeColor){
          const g = it.parent ? it.parent.localToGlobal(it.bounds.center) : it.bounds.center;
          if(Math.abs(g.y - S.board.h/2) < 2 && (x === null || g.x < x)) x = +g.x.toFixed(1);
        } };
      walk(uiLayer); return x; };
    S.guide = { on:'third', margin:0, grid:6 };
    S.board.pad = 0;  const a0 = at();
    S.board.pad = 20; const a20 = at();
    out['⑪ガイドずれ'] = (a0 === null || a20 === null) ? '線が見つからない' : +Math.abs(a20 - a0).toFixed(1);
    S.guide = { on:0, margin:0, grid:6 }; S.board.pad = 0; render(); }

  /* ⑦⑧ 比のつまみ */
  const el = document.getElementById('bRatio');
  out['⑦つまみある'] = !!el;
  if(el){
    boardResize(1000, 1414); await wait(200);
    /* 版面に対する割合を控えておく（4つの持ち物ぜんぶ） */
    const before = { L:S.lines.map(L2 => L2.path && L2.path.dx != null ? L2.path.dx/S.board.w : null),
                     P:S.pieces.map(pc => [pc.x/S.board.w, pc.y/S.board.h]) };
    const long0 = Math.max(S.board.w, S.board.h);
    /* ⚠️ 「刷りが何回」を生の数で見ると、機械の速さで落ちたり通ったりする
       （実測 15〜25 でぶれた）。⭐ 見るのは【コマ数を超えて刷っていないか】＝
       1コマに1回だけ、が守れているか。投げた数と比べるのは意味がない。 */
    let calls = 0, frames = 0, run = true;
    const R0 = render;
    window.render = function(){ calls++; return R0.apply(this, arguments); };
    const tick = () => { if(!run) return; frames++; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    for(let i = 0; i < 30; i++){
      el.value = String(50 - i*3);
      el.dispatchEvent(new Event('input', { bubbles:true }));
      await wait(4);
    }
    await wait(120);
    run = false;
    out['⑧投げた数'] = 30;
    out['⑧刷り'] = calls;
    out['⑧コマ'] = frames;
    window.render = R0;
    el.dispatchEvent(new Event('change', { bubbles:true }));
    await wait(200);
    out['⑦長辺そのまま'] = Math.max(S.board.w, S.board.h) === long0;
    out['⑦かたち'] = S.board.w + '×' + S.board.h;
    out['⑦割合ずれ'] = +Math.max(0, ...S.pieces.map((pc, i) =>
      Math.max(Math.abs(pc.x/S.board.w - before.P[i][0]), Math.abs(pc.y/S.board.h - before.P[i][1])))).toFixed(4);
    out['⑦つまみと版面が合う'] = Math.abs(Number(el.value) - ratioT()) <= 1;

    /* ⑨ ⌘Z ＝【引きはじめの1手】に戻る（引いたコマ数ぶん積まない） */
    boardResize(1000, 1414); await wait(150);
    const was = S.board.w + '×' + S.board.h;
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, pointerId:9 }));
    for(let i = 0; i < 6; i++){
      el.value = String(50 - (i+1)*12);
      el.dispatchEvent(new Event('input', { bubbles:true })); await wait(20);
    }
    el.dispatchEvent(new Event('change', { bubbles:true }));
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, pointerId:9 }));
    await wait(250);
    out['⑨引いた先'] = S.board.w + '×' + S.board.h;
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'z', metaKey:true, bubbles:true }));
    await wait(300);
    out['⑨1回で戻る'] = (S.board.w + '×' + S.board.h) === was;
  }

  /* ⑫⑬ 版面の比を変えたとき（2026-08-30 木下の「夏の日残像4a」で出た2件）
     ⑫ 字の大きさが連れていかれる（前は px のまま残って、組みが壊れて見えた）
     ⑬ 比を【往復すると元に戻る】（前は min を掛け続けて 1往復で 43% 縮んで戻らなかった） */
  { const hit = s => document.querySelector('[data-size="'+s+'"]').click();
    hit('1000,1250'); await wait(300);
    const take = () => ({ s:S.lines.map(L => +(L.size||0).toFixed(4)),
                          p:S.pieces.map(q => [+q.x.toFixed(3), +q.y.toFixed(3), +q.sc.toFixed(4)]) });
    const a = take();
    hit('1414,1000'); await wait(300);
    const b = take();
    out['⑫字が連れていかれる'] = a.s.length > 0 && a.s.every((v, i) => Math.abs(b.s[i] - v) > 0.01);
    /* 9:16 → 正方 → A比縦 と回って 4:5 に戻す */
    ['1080,1920','1000,1000','1000,1414','1000,1250'].forEach(s => hit(s));
    await wait(500);
    const c = take();
    const d = Math.max(0, ...a.s.map((v, i) => Math.abs(c.s[i] - v) / (v || 1)),
                          ...a.p.map((q, i) => Math.max(...q.map((v, j) => Math.abs(c.p[i][j] - v) / (Math.abs(v) || 1)))));
    out['⑬往復のずれ'] = +d.toFixed(5);
  }

  /* ⑩ 外の余白も ⌘Z で1回で戻る */
  { const e2 = document.getElementById('bPad');
    S.board.pad = 0; render(); await wait(120);
    e2.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, pointerId:8 }));
    for(let i = 1; i <= 6; i++){ e2.value = String(i*3); e2.dispatchEvent(new Event('input', { bubbles:true })); await wait(20); }
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, pointerId:8 }));
    await wait(250);
    out['⑩引いた先'] = S.board.pad;
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'z', metaKey:true, bubbles:true }));
    await wait(300);
    out['⑩1回で戻る'] = (S.board.pad || 0) === 0;
  }
  return out;
});

console.log('── 外の余白 と 比のつまみ');
const NG = [];
const ok = (k, cond) => { console.log((cond?'  ✅ ':'  🔴 ') + k + ' … ' + JSON.stringify(R[k])); if(!cond) NG.push(k); };
ok('②0で不変', R['②0で不変'] === true);
ok('①動いた数', R['①動いた数'] === R['①全部'] && R['①全部'] > 0);
ok('③率', R['③率'].length > 0 && Math.max(...R['③率']) - Math.min(...R['③率']) < 0.01);
ok('③幅の率', R['③幅の率'].length > 0 && Math.abs(R['③幅の率'][0] - R['③率'][0]) < 0.02);
ok('④掴み手', R['④掴み手'] > 0);
ok('④手が版面の内', R['④手が版面の内'] === true);
ok('⑤ずれ', typeof R['⑤ずれ'] === 'number' && R['⑤ずれ'] < 12);
ok('⑥線', R['⑥線'] === true);
ok('⑥ガイド既定', R['⑥ガイド既定'] === 0);
ok('⑦つまみある', R['⑦つまみある'] === true);
ok('⑦長辺そのまま', R['⑦長辺そのまま'] === true);
ok('⑦割合ずれ', R['⑦割合ずれ'] < 0.01);
ok('⑦つまみと版面が合う', R['⑦つまみと版面が合う'] === true);
/* ⭐ 1コマに1回だけ＝刷りがコマ数を超えない（投げた数ではなくコマ数と比べる） */
console.log('  ・投げた ' + R['⑧投げた数'] + ' ／ コマ ' + R['⑧コマ'] + ' ／ 刷り ' + R['⑧刷り']);
ok('⑧刷り', R['⑧刷り'] > 0 && R['⑧刷り'] <= R['⑧コマ'] + 1);
ok('⑪ガイドずれ', typeof R['⑪ガイドずれ'] === 'number' && R['⑪ガイドずれ'] < 1);
ok('⑨1回で戻る', R['⑨1回で戻る'] === true);
ok('⑩1回で戻る', R['⑩1回で戻る'] === true);
ok('⑫字が連れていかれる', R['⑫字が連れていかれる'] === true);
ok('⑬往復のずれ', typeof R['⑬往復のずれ'] === 'number' && R['⑬往復のずれ'] < 0.001);
console.log('  ' + (err ? '🔴 例外 ' + err + '件' : '✅ 例外なし'));
if(NG.length || err){ console.log('  🔴 落ち：' + NG.join('／')); await b.close(); process.exit(1); }
console.log('  ── 通過');
await b.close();
