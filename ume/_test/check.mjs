/* ⭐⭐ 埋 UME の回帰テスト ── 2026-08-29（芯を作り直したので全部書き直した）
   🔴 見るのは【参考（phlydesign「META-SPACE 負空間"像素"芸術字」）の芯が出ているか】：
     ⭐⭐ ① 大きい字が【一定のマス目】に落ちて輪郭が階段になる（これが無いと隙間が残る）
     ⭐⭐ ② 空いたマスが【長方形にまとまる】＝1×3 や 2×1 が出る
             🔴 四分木では 2の冪の正方形しか作れない＝ここが前の実装との決定的な違い
     ⭐⭐ ③ 詰めた字が【大きい字に絶対に被らない】（木下の指摘：被っていた）
     ⭐ ④ マスの大きさで粗さが変わる ／ ⑤ 字幅で大きい字だけが伸び縮みする
     ⭐ ⑥ 地を埋める／字を埋める が入れ替わる（向きを縛らない）
     ⭐ ⑦ 詰める字を【欄に打って】変えると絵が変わる（P を直接触らない＝木下と同じ触り方）
     ⭐ ⑧ 欄と絵が同じ字を指している（欄に B・絵は別、が起きていた）
     ⑨ 版面が元に寄る ／ ⑩ PNG ／ ⑪ JSエラー ／ ⑫⑬ 指の端末
   使い方: node ume/_test/check.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL_ = process.argv[2] || 'http://localhost:8098/ume/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1400, height:900 });
await p.goto(URL_, { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,2600));
let NG=0; const ok=(c,n,x)=>{ console.log((c?'  ✅ ':'  🔴 ')+n+(x!=null?' … '+x:'')); if(!c) NG=1; };
await p.evaluate(() => { window.__got = [];
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(x){ window.__got.push({ size:x.size, type:x.type }); return oc.call(URL, x); }; });

/* 設定を当てて、長方形の形を数える */
const cs = (set) => p.evaluate((set) => {
  Object.assign(P, set); MAPKEY = ''; CELLKEY = ''; ASPKEY = ''; render();
  const C = cells();
  const cw = C.w / C.cols, chh = C.h / C.rows;
  const kinds = {}; let one = 0, tall = 0, wide = 0, sq = 0;
  C.list.forEach(([,,w2,h2]) => {
    const a = Math.max(1, Math.round(w2/cw)), b2 = Math.max(1, Math.round(h2/chh));
    kinds[a+'x'+b2] = (kinds[a+'x'+b2]||0) + 1;
    if(a === 1 && b2 === 1) one++;
    else if(b2 > a) tall++; else if(a > b2) wide++; else sq++;
  });
  /* 🔴 長方形が【字のマス】に1つでも掛かっていないか＝被りの直接の証拠 */
  let hit = 0;
  const want = (P.side === 'in') ? 1 : 0;
  C.list.forEach(([x,y,w2,h2]) => {
    const c0 = Math.round(x / cw), r0 = Math.round(y / chh);
    const c1 = Math.round((x+w2) / cw), r1 = Math.round((y+h2) / chh);
    for(let r = r0; r < r1; r++) for(let c = c0; c < c1; c++)
      if(C.ink[r*C.cols + c] !== want) hit++;
  });
  return { n:C.n, cols:C.cols, rows:C.rows, one, tall, wide, sq, hit,
           kinds:Object.entries(kinds).sort((a,b2)=>b2[1]-a[1]).slice(0,5).map(e=>e[0]+'×'+e[1]).join(' ') };
}, set);

/* ⭐⭐ 被りを【画素で】確かめる：大きい字だけの絵と、全部描いた絵を突き合わせる */
const overlap = () => p.evaluate(() => {
  const s = sheet(), W = Math.min(700, s.w), H = Math.round(W * s.h / s.w);
  const mk = (fill) => { const save = P.fill; P.fill = fill;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    paint(c.getContext('2d'), W, H, false); P.fill = save;
    return c.getContext('2d').getImageData(0,0,W,H).data; };
  const A = mk(''), B = mk('あいうえお');
  let big = 0, bad = 0;
  for(let i = 0; i < A.length; i += 4){
    const isBig = A[i] > 200 && A[i+1] > 200 && A[i+2] > 200;   /* 大きい字＝白 */
    if(!isBig) continue; big++;
    const same = Math.abs(A[i]-B[i]) < 12 && Math.abs(A[i+1]-B[i+1]) < 12 && Math.abs(A[i+2]-B[i+2]) < 12;
    if(!same) bad++;      /* 大きい字だった所の色が変わった＝詰めた字が乗っている */
  }
  return { big, bad };
});

const shape = () => p.evaluate(() => {
  const c = document.getElementById('cv');
  const t = document.createElement('canvas'); t.width = 220; t.height = 220;
  const g = t.getContext('2d'); g.drawImage(c, 0, 0, 220, 220);
  const d = g.getImageData(0,0,220,220).data; let h = 2166136261;
  for(let i = 0; i < d.length; i += 5){ h ^= d[i]; h = Math.imul(h, 16777619); }
  return h >>> 0;
});

/* PC の立ち上げの値（指の端末と突き合わせる） */
const DEF = await p.evaluate(() => ({ cell:P.cell, wide:P.wide, span:P.span, gap:P.gap, ratio:P.ratio }));

/* ── ① 階段になっているか＝大きい字の輪郭がマスの境にしか無い ── */
await cs({ txt:'埋', fill:'あいうえお', cell:96, wide:100, side:'out', ratio:'1:1', pad:8 });
const step = await p.evaluate(() => {
  const C = cells();
  const s = sheet(), W = 600, H = Math.round(W * s.h / s.w);
  const save = P.fill; P.fill = '';
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  paint(c.getContext('2d'), W, H, false); P.fill = save;
  const d = c.getContext('2d').getImageData(0,0,W,H).data;
  /* 横に走って色が変わる所を拾い、その x がマスの境に乗っているかを見る */
  const gw = W / C.cols; let edge = 0, on = 0;
  for(let y = 2; y < H-2; y += 3){
    for(let x = 1; x < W; x++){
      const i = (y*W+x)*4, j = (y*W+x-1)*4;
      const a = d[i] > 128, b2 = d[j] > 128;
      if(a === b2) continue;
      edge++;
      const k = x / gw;
      if(Math.abs(k - Math.round(k)) < 0.06) on++;   /* マスの境の上か */
    }
  }
  return { edge, on, pct: edge ? Math.round(on/edge*100) : 0 };
});
ok(step.edge > 40 && step.pct >= 92,
   '⭐⭐ 大きい字がマス目に落ちて【輪郭が階段】になる', JSON.stringify(step));

/* ── ② 長方形にまとまる（1×3 や 2×1 が出る＝四分木では作れない） ── */
const A = await cs({ txt:'埋', fill:'あいうえお', cell:96, wide:100, side:'out', ratio:'1:1' });
ok(A.n > 6, '⭐ 長方形が出る', JSON.stringify(A));
ok(A.tall > 0 && A.wide > 0,
   '⭐⭐ 縦長も平たいも出る＝四分木では作れない形（1×3 / 2×1）', 'tall '+A.tall+' / wide '+A.wide+' / 内訳 '+A.kinds);
ok(A.one < A.n * 0.5, '⭐ 半分以上が【2マス以上】に伸びている（ただのマス目でない）', A.one+' / '+A.n);

/* ── ③ 被らない（ここが木下の指摘） ── */
ok(A.hit === 0, '⭐⭐ 長方形が【字のマス】に1つも掛かっていない', '掛かり '+A.hit+' マス');
const ov = await overlap();
ok(ov.big > 500 && ov.bad === 0,
   '⭐⭐ 画素で見ても【詰めた字が大きい字に被っていない】', '大きい字 '+ov.big+' 画素 / 変わった '+ov.bad);

/* ── ④ マスの大きさが効く ── */
const B1 = await cs({ cell:40 }), B2 = await cs({ cell:200 });
ok(B1.n > B2.n && B1.cols > B2.cols,
   '⭐ マスを小さくすると長方形が増える', B2.cols+'×'+B2.rows+'/'+B2.n+' → '+B1.cols+'×'+B1.rows+'/'+B1.n);

/* ── ⑤ 字幅が効く（大きい字だけ） ── */
await cs({ cell:96, wide:100, ratio:'1:1' }); const w0 = await shape();
await cs({ wide:50 });                        const w1 = await shape();
ok(w0 !== w1, '⭐ 字幅を変えると大きい字が長体になる', w0+' → '+w1);

/* ── ⑥ 向きを縛らない ── */
const O1 = await cs({ wide:100, side:'out' }), O2 = await cs({ side:'in' });
ok(O1.n > 0 && O2.n > 0 && O1.n !== O2.n,
   '⭐ 地を埋める／字を埋める が入れ替わる', '地 '+O1.n+' → 字 '+O2.n);
ok(O2.hit === 0, '⭐ 字を埋める側でも被らない', '掛かり '+O2.hit);

/* ── ⑦ 詰める字を【欄に打って】変える（木下と同じ触り方） ── */
await cs({ side:'out', cell:96, ratio:'1:1' });
await p.evaluate(() => { const t = el('t_fill'); t.value = 'あいうえお'; t.dispatchEvent(new Event('input',{bubbles:true})); });
await new Promise(r=>setTimeout(r,600)); const f0 = await shape();
await p.evaluate(() => { const t = el('t_fill'); t.value = '○'; t.dispatchEvent(new Event('input',{bubbles:true})); });
await new Promise(r=>setTimeout(r,600)); const f1 = await shape();
ok(f0 !== f1, '⭐ 詰める字を【欄に打って】変えると絵が変わる', f0+' → '+f1);

/* ── ⑧ 欄と絵が同じ字を指している ── */
const same = await p.evaluate(() => ({ field:el('t_txt').value, txt:P.txt, ffield:el('t_fill').value, fill:P.fill }));
ok(same.field === same.txt && same.ffield === same.fill,
   '⭐⭐ 欄と絵が【同じ字】を指している', JSON.stringify(same));

/* ── ⑨ 版面が元に寄る ── */
const sq2 = await p.evaluate(() => { Object.assign(P,{txt:'AC',ratio:'auto'}); MAPKEY=''; CELLKEY=''; ASPKEY=''; render(); return sheet(); });
const sq1 = await p.evaluate(() => { Object.assign(P,{txt:'田',ratio:'auto'}); MAPKEY=''; CELLKEY=''; ASPKEY=''; render(); return sheet(); });
ok(sq2.w > sq2.h * 1.3 && Math.abs(sq1.w - sq1.h) < sq1.w * 0.35,
   '⭐ 版面が元の形に寄る（AC は横長・田はほぼ正方）', 'AC '+sq2.w+'×'+sq2.h+' / 田 '+sq1.w+'×'+sq1.h);

/* ── ⑩ PNG ── */
await p.evaluate(() => { window.__got = []; Object.assign(P,{txt:'埋',ratio:'1:1'}); MAPKEY=''; CELLKEY=''; ASPKEY=''; render();
  document.getElementById('b_png').click(); });
await new Promise(r=>setTimeout(r,1600));
const got = await p.evaluate(() => window.__got);
ok(got.some(x=>/png/.test(x.type)), 'PNG が本当に落ちる', JSON.stringify(got));

/* ⭐⭐ 指の端末で【立ち上がるか】── 2026-08-29
   🔴 外枠を隣の道具から借りたとき、その道具にしか無いつまみを触る1行が付いてきて、
      指の端末だけ立ち上げが丸ごと死んでいた（何も描かれない）。
   ⚠️ PC 幅の「JSエラーが出ない」では出ない＝【指の端末で1回開く】試験がここに要る。 */
{
  const m = await b.newPage(); const merr = [];
  m.on('pageerror', e => merr.push(e.message));
  await m.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1');
  await m.setViewport({ width:390, height:844, deviceScaleFactor:2, isMobile:true, hasTouch:true });
  await m.goto(URL_, { waitUntil:'networkidle0' });
  await new Promise(r=>setTimeout(r,3200));
  const ink = await m.evaluate(() => {
    let best = 0;
    document.querySelectorAll('canvas').forEach(c => {
      if(!c.width || !c.height) return;
      const t = document.createElement('canvas'); t.width = 48; t.height = 48;
      const g = t.getContext('2d'); g.drawImage(c, 0, 0, 48, 48);
      const d = g.getImageData(0,0,48,48).data, f = [d[0],d[1],d[2],d[3]]; let n = 0;
      for(let i=0;i<d.length;i+=4)
        if(Math.abs(d[i]-f[0])>6||Math.abs(d[i+1]-f[1])>6||Math.abs(d[i+2]-f[2])>6||Math.abs(d[i+3]-f[3])>6) n++;
      if(n > best) best = n;
    });
    return best;
  });
  ok(merr.length === 0, '⭐⭐ 指の端末で立ち上げが死なない', merr.join(' / '));
  ok(ink > 20, '⭐⭐ 指の端末でも盤に絵が出る', '違う画素 ' + ink);
  /* ⭐⭐ 指の端末だけ【別の絵】で立ち上がらない（2026-08-29）
     🔴 「指の端末は重いから既定を粗く」という上書きが入っていて、PC と違う絵が出ていた。
        実測 1〜5ms＝粗くする理由が無かった。 → [[feedback_measure_before_you_optimize]] */
  const mp = await m.evaluate(() => ({ cell:P.cell, wide:P.wide, span:P.span, gap:P.gap, ratio:P.ratio }));
  ok(JSON.stringify(mp) === JSON.stringify(DEF),
     '⭐⭐ 指の端末でも【PC と同じ絵】で立ち上がる', JSON.stringify(mp) + ' / PC ' + JSON.stringify(DEF));
  await m.close();
}

/* ⭐⭐ 指で【引いている最中に】絵が追いてくるか ── 2026-08-29
   🔴 木下＝「スライダーはモバイルで動くけどそれに合わせて反映がないなあ」。
      つまみの値は変わるのに絵が変わらない／粗いまま、が起きていた
      （隣の道具から借りた「触っている間は盤を半分にする」仕掛けのせい。実測 1〜5ms で不要だった）。
   ⚠️ 値を代入する試験（p.evaluate で P を触る）では絶対に出ない＝【指で引く】こと。 */
{
  const m = await b.newPage(); const merr = [];
  m.on('pageerror', e => merr.push(e.message));
  await m.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1');
  await m.setViewport({ width:390, height:844, deviceScaleFactor:2, isMobile:true, hasTouch:true });
  const cdp = await m.target().createCDPSession();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });   /* 実機に寄せる */
  await m.goto(URL_, { waitUntil:'networkidle0' });
  await new Promise(r=>setTimeout(r,3600));
  const hash = () => m.evaluate(() => { const c = document.getElementById('cv');
    const t = document.createElement('canvas'); t.width = 140; t.height = 140;
    const g = t.getContext('2d'); g.drawImage(c, 0, 0, 140, 140);
    const d = g.getImageData(0,0,140,140).data; let h = 2166136261;
    for(let i=0;i<d.length;i+=5){ h ^= d[i]; h = Math.imul(h, 16777619); } return h >>> 0; });
  const board = () => m.evaluate(() => { const c = document.getElementById('cv');
    return { w:c.width, h:c.height, sheet:sheet().w }; });
  const b0 = await board();
  const rows = [];
  for(const id of ['r_cell','r_wide','r_span','r_gap']){
    /* ⚠️ 1本ずつ【既定に戻してから】引く。前のつまみを端まで引いた状態が残っていると、
       升目が5×5しか無い盤で「伸び」を動かして「変わらない」と誤判定する（実際にした）。 */
    await m.evaluate(() => { [['r_cell',96],['r_wide',100],['r_span',6],['r_gap',0]].forEach(([i,v]) => {
      const r = el(i); if(r){ r.value = v; r.dispatchEvent(new Event('input',{bubbles:true})); } }); });
    await new Promise(r=>setTimeout(r,400));
    const box = await m.evaluate(i => { const r = el(i); r.scrollIntoView({ block:'center' });
      const b2 = r.getBoundingClientRect(); return { x:b2.x, y:b2.y, w:b2.width, h:b2.height }; }, id);
    await new Promise(r=>setTimeout(r,300));
    const y = box.y + box.h/2;
    /* ⚠️ 端から端まで引く。真ん中だけだと、効きが端に寄っているつまみ
       （伸び＝1〜8 でほぼ決まる）で「変わらない」と誤判定する。 */
    await m.touchscreen.touchStart(box.x + box.w*0.03, y);
    const seen = new Set(); let small = 0;
    for(let t = 1; t <= 6; t++){
      await m.touchscreen.touchMove(box.x + box.w*(0.03 + 0.94*t/6), y);
      await new Promise(r=>setTimeout(r,110));
      seen.add(await hash());
      const bb = await board(); if(bb.w < bb.sheet) small++;   /* 引いている間に盤が粗くなっていないか */
    }
    await m.touchscreen.touchEnd();
    await new Promise(r=>setTimeout(r,700));
    rows.push({ id, 途中の絵:seen.size, 粗くなった:small });
  }
  const b1 = await board();
  ok(rows.every(r => r.途中の絵 >= 3),
     '⭐⭐ 指で引いている【最中に】絵が追いてくる（1目盛りずつ変わる）',
     rows.map(r => r.id+' '+r.途中の絵+'通り').join(' / '));
  ok(rows.every(r => r.粗くなった === 0) && b0.w === b0.sheet && b1.w === b1.sheet,
     '⭐⭐ 引いている間も【盤を粗くしない】（指の端末だけ別の絵にならない）',
     '盤 '+b0.w+' → '+b1.w+'（版面 '+b0.sheet+'）');
  ok(merr.length === 0, '⭐ 指で引いてもエラーが出ない', merr.join(' / '));
  await m.close();
}

/* ⭐⭐ 選ぶボタン（seg）を【全部押しても落ちない】＋ 明朝が本当に明朝か ── 2026-08-29
   🔴🔴 木下＝「元は、フォント変えても変わらない」＝変わらないのではなく【落ちていた】。
      data-v="900 "（末尾に空白）を +"900 " で数にしていて P.font が 900（数）になり、
      次に .replace を呼んだ所で道具ごと止まっていた。以後どのつまみも効かない。
   🔴 明朝は Google Fonts が「画面のどこかで使われるまで」落ちてこないので、
      盤にしか出ない書体は **一度も読み込まれず、素の serif で描かれていた**。 */
{
  const segs = await p.evaluate(() => [...document.querySelectorAll('.seg')].map(s => s.id).filter(Boolean));
  const dead = [];
  for(const sid of segs){
    const n = await p.evaluate(s => document.querySelectorAll('#'+s+' button').length, sid);
    for(let i = 0; i < n; i++){
      const before = errs.length;
      await p.evaluate((s,i) => document.querySelectorAll('#'+s+' button')[i].click(), sid, i);
      await new Promise(r=>setTimeout(r,220));
      if(errs.length > before)
        dead.push(sid+'['+i+'] '+await p.evaluate((s,i)=>document.querySelectorAll('#'+s+' button')[i].textContent, sid, i));
    }
  }
  ok(dead.length === 0, '⭐⭐ 選ぶボタンを【全部押しても落ちない】', dead.length ? dead.join(' / ') : segs.length+' 群ぜんぶ');
  const kind = await p.evaluate(() => ({ font:typeof P.font, ffont:typeof P.ffont }));
  ok(kind.font === 'string' && (kind.ffont === 'undefined' || kind.ffont === 'string'),
     '⭐ 書体の指定が【文字列のまま】（数にならない）', JSON.stringify(kind));

  await p.evaluate(() => { const b2 = [...document.querySelectorAll('#s_font button')].find(x=>/明朝/.test(x.textContent)); if(b2) b2.click(); });
  await new Promise(r=>setTimeout(r,2500));
  const f = await p.evaluate(() => {
    const draw = fam => { const c = document.createElement('canvas'); c.width = 200; c.height = 200;
      const g = c.getContext('2d'); g.font = '900 150px ' + fam; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('埋', 100, 100); const d = g.getImageData(0,0,200,200).data; let h = 2166136261;
      for(let i = 3; i < d.length; i += 4){ h ^= d[i]; h = Math.imul(h, 16777619); } return h >>> 0; };
    return { 明朝:draw('"Zen Old Mincho",serif'), 素:draw('serif'), 読めた:document.fonts.check('900 100px "Zen Old Mincho"', '埋') };
  });
  ok(f.読めた && f.明朝 !== f.素,
     '⭐⭐ 明朝が【本当に明朝】で描かれる（素の serif に落ちていない）', JSON.stringify(f));
}

ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close(); process.exit(NG);
