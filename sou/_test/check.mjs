/* ⭐⭐ 掃 SOU の回帰テスト ── 2026-08-29
   参考＝yhhydesign「SCANNER DISTORTION LAB」。芯は【時間 × 手】。
   🔴 見るのは：
     ⭐⭐ ① 刷ると紙が【溜まる】（止めても戻らない＝紙に焼き付く）
     ⭐⭐ ② 刷っている最中に手を動かすと【像がちぎれる】＝動かさないときと別の絵になる
             🔴 ここが芯。動かしても同じ絵なら、ただの複写＝この道具である意味が無い
     ⭐ ③ 手の動きは【記録】されていて、もう一度なぞると同じ絵が出る（動画がこれを使う）
     ⭐ ④ 向き（横／縦）で刷る軸が変わり、紙は白紙に戻る
     ⭐ ⑤ 版面を変えると紙は白紙に戻る（黙って引き伸ばさない）
     ⭐ ⑥ 揺れ＝手を動かさなくても像が波打つ（機械の癖）
     ⭐ ⑦ 出るのは【刷った紙だけ】＝走査線も下見も入らない
     ⑧ 選ぶボタンを全部押しても落ちない ／ ⑨ PNG ／ ⑩ JSエラー ／ ⑪⑫ 指の端末
   使い方: node sou/_test/check.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL_ = process.argv[2] || 'http://localhost:8098/sou/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1400, height:900 });
await p.goto(URL_, { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3000));
let NG = 0; const ok = (c, n, x) => { console.log((c?'  ✅ ':'  🔴 ')+n+(x!=null?' … '+x:'')); if(!c) NG = 1; };
await p.evaluate(() => { window.__got = [];
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(x){ window.__got.push({ size:x.size, type:x.type }); return oc.call(URL, x); }; });

/* 手つきを決めて、最後まで刷る（＝実機で指を動かしたのと同じ道を通す） */
const run = (amp) => p.evaluate((amp) => {
  RUN = false; wipe(); fitSrc();
  const bx = T.x, by = T.y;
  const { w, h } = sheet(), len = (P.axis === 'x') ? w : h;
  let i = 0;
  while(POS < len){
    T.y = by + Math.sin(i / 9) * amp;      /* ⭐ これが「手」 */
    T.x = bx + Math.cos(i / 14) * amp * 0.4;
    TAKE.push({ to:Math.min(len, POS + P.speed), x:T.x, y:T.y, z:T.z });
    scanTo(POS + P.speed);
    i++;
  }
  T.x = bx; T.y = by;
  render();
  const c = document.createElement('canvas'); c.width = 200; c.height = 200;
  paint(c.getContext('2d'), 200, 200, false);
  const d = c.getContext('2d').getImageData(0,0,200,200).data;
  let hsh = 2166136261, ink = 0;
  for(let k = 0; k < d.length; k += 4){
    if(d[k] < 100) ink++;
    hsh ^= d[k]; hsh = Math.imul(hsh, 16777619);
  }
  return { hash:hsh >>> 0, ink, pos:Math.round(POS), take:TAKE.length };
}, amp);

/* ── ① 紙が溜まる（止めても戻らない） ── */
const acc = await p.evaluate(() => {
  wipe(); fitSrc();
  const a = [];
  for(let s = 0; s < 3; s++){
    for(let i = 0; i < 60; i++){ TAKE.push({ to:POS + P.speed, x:T.x, y:T.y, z:T.z }); scanTo(POS + P.speed); }
    const c = document.createElement('canvas'); c.width = 120; c.height = 120;
    paint(c.getContext('2d'), 120, 120, false);
    const d = c.getContext('2d').getImageData(0,0,120,120).data;
    let ink = 0; for(let k = 0; k < d.length; k += 4) if(d[k] < 100) ink++;
    a.push({ pos:Math.round(POS), ink });
  }
  return a;
});
ok(acc[0].pos < acc[1].pos && acc[1].pos < acc[2].pos && acc[2].ink > acc[0].ink,
   '⭐⭐ 刷るほど紙に溜まる（止めても戻らない）', JSON.stringify(acc));

/* ── ② 手を動かすと像がちぎれる（ここが芯） ── */
const still = await run(0);
const moved = await run(120);
ok(still.hash !== moved.hash,
   '⭐⭐ 刷っている最中に手を動かすと【別の絵】になる', still.hash + ' → ' + moved.hash);
/* ⭐⭐ ちぎれているか＝【隣り合う1本どうしのちがい】を数える。
   手が止まっていれば隣の1本はほぼ同じ絵＝ちがいは小さい。
   手が動いていれば、その瞬間だけ別の場所から来る＝隣とのちがいが跳ね上がる。
   ⚠️ 「縦の変わり目の数」では出ない（形が滑らかにずれるだけなので増えない。実測 520→528）。 */
const gap = () => p.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 400; c.height = 400;
  paint(c.getContext('2d'), 400, 400, false);
  const d = c.getContext('2d').getImageData(0,0,400,400).data;
  let n = 0;
  for(let x = 1; x < 400; x++)
    for(let y = 0; y < 400; y += 2){
      const a = d[(y*400+x)*4] < 100, b2 = d[(y*400+x-1)*4] < 100;
      if(a !== b2) n++;
    }
  return n;
});
const tear = await gap();
await run(0);
const tearStill = await gap();
await run(120);
ok(tear > tearStill * 1.5,
   '⭐⭐ 手を動かした方が【ちぎれている】（隣り合う1本どうしのちがい）', '動かさない ' + tearStill + ' → 動かした ' + tear);

/* ── ③ 手の動きが記録されていて、なぞると同じ絵が出る ── */
const rp = await p.evaluate(() => {
  const c1 = document.createElement('canvas'); c1.width = 200; c1.height = 200;
  paint(c1.getContext('2d'), 200, 200, false);
  const h = ctx => { const d = ctx.getImageData(0,0,200,200).data; let x = 2166136261;
    for(let i = 0; i < d.length; i += 4){ x ^= d[i]; x = Math.imul(x, 16777619); } return x >>> 0; };
  const before = h(c1.getContext('2d'));
  replay(1);
  const c2 = document.createElement('canvas'); c2.width = 200; c2.height = 200;
  paint(c2.getContext('2d'), 200, 200, false);
  return { before, after:h(c2.getContext('2d')), take:TAKE.length };
});
ok(rp.before === rp.after && rp.take > 10,
   '⭐ 手の動きを【もう一度なぞると同じ絵】が出る（動画はこれを使う）', JSON.stringify(rp));

/* ── ④ 向きで軸が変わる／紙は白紙に戻る ── */
const ax = await p.evaluate(() => {
  Object.assign(P, { axis:'x' }); wipe(); fitSrc();
  /* ⚠️ 半分まで刷る。少ししか刷らないと、字がまだ来ていなくて【両側とも墨0】になる（実測 L0/R0） */
  { const { w } = sheet(); while(POS < w*0.5){ TAKE.push({ to:POS+P.speed, x:T.x, y:T.y, z:T.z }); scanTo(POS + P.speed); } }
  const c = document.createElement('canvas'); c.width = 200; c.height = 200;
  paint(c.getContext('2d'), 200, 200, false);
  const d1 = c.getContext('2d').getImageData(0,0,200,200).data;
  /* 横に刷ると【左に墨・右は紙】になる */
  let L = 0, R = 0;
  for(let y = 0; y < 200; y += 3) for(let x = 0; x < 200; x++){
    const v = d1[(y*200+x)*4] < 200; if(x < 40) L += v; if(x > 160) R += v; }
  Object.assign(P, { axis:'y' }); wipe(); fitSrc();
  const pos0 = POS;
  { const { h } = sheet(); while(POS < h*0.5){ TAKE.push({ to:POS+P.speed, x:T.x, y:T.y, z:T.z }); scanTo(POS + P.speed); } }
  const c2 = document.createElement('canvas'); c2.width = 200; c2.height = 200;
  paint(c2.getContext('2d'), 200, 200, false);
  const d2 = c2.getContext('2d').getImageData(0,0,200,200).data;
  let U = 0, D = 0;
  for(let x = 0; x < 200; x += 3) for(let y = 0; y < 200; y++){
    const v = d2[(y*200+x)*4] < 200; if(y < 40) U += v; if(y > 160) D += v; }
  Object.assign(P, { axis:'x' }); wipe();
  return { pos0, 横:{L,R}, 縦:{U,D} };
});
ok(ax.pos0 === 0, '⭐ 向きを変えると紙が白紙に戻る', '戻ったときの位置 ' + ax.pos0);
ok(ax.横.L > ax.横.R && ax.縦.U > ax.縦.D,
   '⭐ 横は左から・縦は上から刷る', JSON.stringify(ax.横) + ' / ' + JSON.stringify(ax.縦));

/* ── ⑤ 版面を変えると白紙に戻る ── */
const sz = await p.evaluate(() => {
  wipe(); fitSrc();
  for(let i = 0; i < 60; i++){ TAKE.push({ to:POS+P.speed, x:T.x, y:T.y, z:T.z }); scanTo(POS + P.speed); }
  const was = Math.round(POS);
  const r = el('r_long'); r.value = 1000; r.dispatchEvent(new Event('input', { bubbles:true }));
  return { was, now:Math.round(POS), w:sheet().w, film:[paper().width, paper().height] };
});
ok(sz.was > 0 && sz.now === 0 && sz.film[0] === sz.w,
   '⭐ 版面を変えると白紙に戻る（黙って引き伸ばさない）', JSON.stringify(sz));

/* ── ⑥ 揺れ（機械の癖）── */
const jt = await p.evaluate(() => {
  const shot = () => { const c = document.createElement('canvas'); c.width = 200; c.height = 200;
    paint(c.getContext('2d'), 200, 200, false);
    const d = c.getContext('2d').getImageData(0,0,200,200).data; let x = 2166136261;
    for(let i = 0; i < d.length; i += 4){ x ^= d[i]; x = Math.imul(x, 16777619); } return x >>> 0; };
  const fill = () => { wipe(); fitSrc(); const { w } = sheet();
    while(POS < w){ TAKE.push({ to:POS+P.speed, x:T.x, y:T.y, z:T.z }); scanTo(POS + P.speed); } };
  const r = el('r_long'); r.value = 1400; r.dispatchEvent(new Event('input', { bubbles:true }));
  P.jit = 0;  fill(); const a = shot();
  P.jit = 90; fill(); const c2 = shot();
  P.jit = 0;
  return { なし:a, あり:c2 };
});
ok(jt.なし !== jt.あり, '⭐ 揺れ＝手を動かさなくても像が波打つ', JSON.stringify(jt));

/* ── ⑦ 出るのは刷った紙だけ（走査線も下見も入らない）── */
const clean = await p.evaluate(() => {
  wipe(); fitSrc();
  for(let i = 0; i < 40; i++){ TAKE.push({ to:POS+P.speed, x:T.x, y:T.y, z:T.z }); scanTo(POS + P.speed); }
  render();
  const c = document.createElement('canvas'); c.width = 300; c.height = 300;
  paint(c.getContext('2d'), 300, 300, false);
  const d = c.getContext('2d').getImageData(0,0,300,300).data;
  /* 走査線の緑（#12b981）が1画素でも入っていないか */
  let green = 0;
  for(let i = 0; i < d.length; i += 4)
    if(d[i] < 120 && d[i+1] > 130 && d[i+2] < 170 && d[i+1] - d[i] > 40) green++;
  /* まだ刷っていない側は【紙の色のまま】＝下見が写り込んでいないか */
  const { w } = sheet(), edge = Math.round(POS / w * 300);
  let dirty = 0;
  for(let y = 0; y < 300; y += 2) for(let x = Math.min(299, edge + 6); x < 300; x++){
    const i = (y*300+x)*4;
    if(Math.abs(d[i] - 0xd8) > 12 || Math.abs(d[i+1] - 0xd4) > 12) dirty++;
  }
  return { green, dirty, edge };
});
ok(clean.green === 0 && clean.dirty === 0,
   '⭐ 出るのは【刷った紙だけ】（走査線も下見も入らない）', JSON.stringify(clean));

/* ── ⑧ 選ぶボタンを全部押しても落ちない ── */
{
  const segs = await p.evaluate(() => [...document.querySelectorAll('.seg')].map(s => s.id).filter(Boolean));
  const dead = [];
  for(const sid of segs){
    const n = await p.evaluate(s => document.querySelectorAll('#'+s+' button').length, sid);
    for(let i = 0; i < n; i++){
      const before = errs.length;
      await p.evaluate((s,i) => document.querySelectorAll('#'+s+' button')[i].click(), sid, i);
      await new Promise(r => setTimeout(r, 200));
      if(errs.length > before)
        dead.push(sid + '[' + i + ']');
    }
  }
  ok(dead.length === 0, '⭐⭐ 選ぶボタンを【全部押しても落ちない】', dead.length ? dead.join(' / ') : segs.length + ' 群ぜんぶ');
}

/* ── ⑨ PNG ── */
await p.evaluate(() => { window.__got = [];
  Object.assign(P, { axis:'x' }); wipe(); fitSrc();
  const { w } = sheet();
  while(POS < w){ TAKE.push({ to:POS+P.speed, x:T.x, y:T.y, z:T.z }); scanTo(POS + P.speed); }
  render(); document.getElementById('b_png').click(); });
await new Promise(r => setTimeout(r, 1600));
const got = await p.evaluate(() => window.__got);
ok(got.some(x => /png/.test(x.type)), 'PNG が本当に落ちる', JSON.stringify(got));

/* ── ⑪⑫ 指の端末 ── */
{
  const m = await b.newPage(); const merr = [];
  m.on('pageerror', e => merr.push(e.message));
  await m.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1');
  await m.setViewport({ width:390, height:844, deviceScaleFactor:2, isMobile:true, hasTouch:true });
  await m.goto(URL_, { waitUntil:'networkidle0' });
  await new Promise(r => setTimeout(r, 3200));
  const ink = await m.evaluate(() => {
    const c = document.getElementById('cv');
    const t = document.createElement('canvas'); t.width = 48; t.height = 48;
    const g2 = t.getContext('2d'); g2.drawImage(c, 0, 0, 48, 48);
    const d = g2.getImageData(0,0,48,48).data, f = [d[0],d[1],d[2]]; let n = 0;
    for(let i = 0; i < d.length; i += 4)
      if(Math.abs(d[i]-f[0]) > 6 || Math.abs(d[i+1]-f[1]) > 6 || Math.abs(d[i+2]-f[2]) > 6) n++;
    return n;
  });
  /* ⭐⭐ 指の端末でも【なぞって元が動く】か（この道具はここが命） */
  const drag = await m.evaluate(async () => {
    const c = document.getElementById('cv'), r = c.getBoundingClientRect();
    const before = { x:T.x, y:T.y };
    const ev = (t, x, y) => c.dispatchEvent(new PointerEvent(t, { pointerId:1, bubbles:true,
      clientX:x, clientY:y, pointerType:'touch', isPrimary:true }));
    ev('pointerdown', r.left + r.width*0.4, r.top + r.height*0.4);
    for(let i = 1; i <= 5; i++) ev('pointermove', r.left + r.width*(0.4 + 0.1*i), r.top + r.height*0.4);
    ev('pointerup', r.left + r.width*0.9, r.top + r.height*0.4);
    return { moved:Math.round(Math.abs(T.x - before.x)) };
  });
  ok(merr.length === 0, '⭐⭐ 指の端末で立ち上げが死なない', merr.join(' / '));
  ok(ink > 20, '⭐⭐ 指の端末でも盤に絵が出る', '違う画素 ' + ink);
  ok(drag.moved > 40, '⭐⭐ 指の端末でも【なぞると元が動く】', '動いた ' + drag.moved + ' px');
  await m.close();
}

ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close(); process.exit(NG);
