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

/* ⚠️ 立ち上げの値を控えておく。
   🔴 「選ぶボタンを全部押す」試験のあとは【最後に押したボタン】が残る（コピー二値・9:16・縦…）。
     そのまま次を測ると必ず誤判定する（2026-08-29 に2回踏んだ）。 */
const BOOT = await p.evaluate(() => JSON.parse(JSON.stringify(P)));
const back = () => p.evaluate(b2 => {
  Object.assign(P, b2);
  document.querySelectorAll('.seg').forEach(sg => {
    const k = sg.id.replace(/^s_/, '');
    sg.querySelectorAll('button').forEach(x => x.classList.toggle('on', String(P[k]) === x.dataset.v));
  });
  el('c_bg').value = P.bg; el('k_nobg').checked = !!P.nobg;
  el('r_long').value = P.long; el('r_long').dispatchEvent(new Event('input', { bubbles:true }));
  TXTKEY = ''; ASPKEY = ''; LKEY = ''; wipe(); fitSrc(); syncSize(); render();
}, BOOT);

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

await back();
/* ⭐⭐ 印刷の癖 ── 2026-08-29（木下＝「もっと印刷感があるよね」「綺麗すぎるような」）
   🔴 既定で癖が入っていること・全部0にすれば綺麗な絵へ戻せること の両方を見る。 */
{
  const shot = () => p.evaluate(() => {
    RUN = false; wipe(); fitSrc();
    const { w } = sheet(); const by = T.y; let i = 0;
    while(POS < w){ T.y = by + Math.sin(i/9) * 90; TAKE.push({ to:POS+P.speed, x:T.x, y:T.y, z:T.z }); scanTo(POS + P.speed); i++; }
    T.y = by;
    /* 🔴 縮めて撮ると粒が平均されて消える＝【原寸で切り出して】測る */
    const c = document.createElement('canvas'); c.width = 300; c.height = 300;
    const q = c.getContext('2d'); q.drawImage(paper(), 60, 60, 300, 300, 0, 0, 300, 300);
    const d = q.getImageData(0,0,300,300).data;
    let h = 2166136261, rough = 0;
    for(let k = 0; k < d.length; k += 4){ h ^= d[k]; h = Math.imul(h, 16777619); }
    /* ⭐ ざらつき＝隣の画素との差の合計（粒子・紙のムラが乗っているか） */
    for(let y = 0; y < 300; y += 2) for(let x = 1; x < 300; x++)
      rough += Math.abs(d[(y*300+x)*4] - d[(y*300+x-1)*4]);
    /* ⭐ 紙の色が残っているか＝【棒の真ん中】で見る（端は灯りのムラで沈むのが正しい） */
    const mid = (150*300 + 4) * 4;
    const corner = [d[mid], d[mid+1], d[mid+2]];
    return { hash:h >>> 0, rough, corner };
  });
  await p.evaluate(() => { P.lamp = 0; });      /* ⚠️ 端の落ちは正しい挙動＝ここでは切って焼きだけ見る */
  const on = await shot();
  const off = await p.evaluate(async () => { Object.assign(P, { smear:0, burn:0, grain:0, fiber:0, lamp:0 }); });
  const flat = await shot();
  await p.evaluate(() => Object.assign(P, { smear:30, burn:45, grain:45, fiber:30, lamp:0 }));
  const back = await shot();
  ok(on.rough > flat.rough * 1.6,
     '⭐⭐ 既定で【印刷の癖】が乗っている（ざらつき）', 'なし ' + flat.rough + ' → あり ' + on.rough);
  ok(flat.hash !== on.hash && back.hash === on.hash,
     '⭐ 癖を全部0にすれば【綺麗な絵に戻る】・戻せば同じ絵', flat.hash + ' / ' + on.hash + ' / ' + back.hash);
  /* 🔴 焼きが紙の色まで飛ばしていないか（実測で灰色になった） */
  ok(Math.abs(on.corner[0] - 0xd8) < 22 && Math.abs(on.corner[2] - 0xc9) < 22,
     '⭐⭐ 焼きが【紙の色】を飛ばさない', JSON.stringify(on.corner));
}

/* ⭐⭐ 癖に乱数を使っていない（＝なぞり直すと1画素まで同じ）── 2026-08-29
   🔴 Math.random を使うと、刷った紙と動画が食い違う。 */
{
  const same = await p.evaluate(() => {
    const h = () => { const c = document.createElement('canvas'); c.width = 220; c.height = 220;
      paint(c.getContext('2d'), 220, 220, false);
      const d = c.getContext('2d').getImageData(0,0,220,220).data; let x = 2166136261;
      for(let i = 0; i < d.length; i += 4){ x ^= d[i]; x = Math.imul(x, 16777619); } return x >>> 0; };
    const a = h(); replay(1); const b2 = h(); replay(1); const c2 = h();
    return { a, b2, c2 };
  });
  ok(same.a === same.b2 && same.b2 === same.c2,
     '⭐⭐ 癖に乱数を使っていない（なぞり直すと同じ絵）', JSON.stringify(same));
}

await back();
/* ⭐ 盤が【真ん中】に来る ── 2026-08-29（木下＝「ボード自体が左端で小さい」）*/
{
  const v = await p.evaluate(() => {
    fitView();
    const r = stage.getBoundingClientRect(), s2 = sheet();
    const cx = V.x + s2.w * V.z / 2, cy = V.y + s2.h * V.z / 2;
    return { dx:Math.round(cx - r.width/2), dy:Math.round(cy - r.height/2),
             覆い:Math.round(Math.max(s2.w * V.z / r.width, s2.h * V.z / r.height) * 100) };
  });
  ok(Math.abs(v.dx) <= 2 && Math.abs(v.dy) <= 2 && v.覆い >= 80,
     '⭐⭐ 盤が画面の【真ん中】に来て、十分大きい', JSON.stringify(v));
}

/* ⭐ 元の大きさ ── つまみで変えられ、手で動かしても数字が追いてくる */
{
  const z = await p.evaluate(() => {
    fitSrc(); syncSize();
    const v0 = +el('r_size').value, z0 = T.z;
    const r = el('r_size'); r.value = 180; r.dispatchEvent(new Event('input', { bubbles:true }));
    const z1 = T.z, v1 = +el('r_size').value;
    /* 手で拡大したときに数字が追いてくるか */
    T.z = z1 * 0.5; syncSize();
    const v2 = +el('r_size').value;
    r.value = v0; r.dispatchEvent(new Event('input', { bubbles:true }));
    return { v0, z0:+z0.toFixed(3), v1, z1:+z1.toFixed(3), v2 };
  });
  ok(z.z1 > z.z0 && z.v1 === 180 && z.v2 < z.v1 * 0.7,
     '⭐ 元の大きさ＝つまみで変わり、手で動かしても数字が追いてくる', JSON.stringify(z));
}

/* ⭐ 打った字が【全部】焼かれる ── 2026-08-29（木下＝「入力した文字の一部がみえない」）
   🔴 測る側と描く側で揃え方が違っていて、墨の左半分が紙の外へ出ていた。 */
{
  const t = await p.evaluate(() => {
    const one = () => { P.txt = 'そ'; TXTKEY = ''; const s2 = source(); return s2.width; };
    const two = () => { P.txt = 'そう'; TXTKEY = ''; const s2 = source(); return s2.width; };
    const w1 = one(), w2 = two();
    /* 2文字の紙に、墨が【左端にも右端にも】乗っているか */
    const s2 = source();
    const c = document.createElement('canvas'); c.width = s2.width; c.height = s2.height;
    const q = c.getContext('2d'); q.drawImage(s2, 0, 0);
    const d = q.getImageData(0, 0, s2.width, s2.height).data;
    const band = (x0, x1) => { let n = 0;
      for(let y = 0; y < s2.height; y += 2) for(let x = x0; x < x1; x++)
        if(d[(y*s2.width+x)*4+3] > 60) n++;
      return n; };
    const L = band(0, Math.round(s2.width*0.22)), R = band(Math.round(s2.width*0.78), s2.width);
    P.txt = '掃'; TXTKEY = ''; fitSrc(); syncSize();
    return { w1, w2, L, R };
  });
  ok(t.w2 > t.w1 * 1.5 && t.L > 0 && t.R > 0,
     '⭐⭐ 打った字が【全部】焼かれる（左端にも右端にも墨がある）', JSON.stringify(t));
}

await back();
/* ⭐⭐ 刷ったあとでも【全部のつまみが効く】── 2026-08-29
   🔴 木下＝「パネルの機械のくせはスライダー調整しても何もかわらず、これは想定できない」
        「色も印刷後でも調整できるように」「長編をいじると元に戻った」。
   ⭐ 版（走査線がどこで何を読んだか）と 紙（現像したもの）を分けたので、
     版はそのままに何度でも現像し直せる。 */
{
  const fill = () => p.evaluate(() => {
    RUN = false; wipe(); fitSrc();
    const { w } = sheet(); const by = T.y; let i = 0;
    while(POS < w){ T.y = by + Math.sin(i/9) * 90; TAKE.push({ to:POS+P.speed, x:T.x, y:T.y, z:T.z }); scanTo(POS + P.speed); i++; }
    T.y = by; render();
  });
  const h = () => p.evaluate(() => { const c = document.createElement('canvas'); c.width = 200; c.height = 200;
    const q = c.getContext('2d'); q.drawImage(paper(), 0, 0, 200, 200);
    const d = q.getImageData(0,0,200,200).data; let x = 2166136261;
    for(let i = 0; i < d.length; i += 4){ x ^= d[i]; x = Math.imul(x, 16777619); } return x >>> 0; });
  await fill();
  const dead = [];
  const knob = async (name, fn, wait) => {
    const before = await h();
    await p.evaluate(fn); await new Promise(r => setTimeout(r, wait || 400));
    if(await h() === before) dead.push(name);
  };
  await knob('粒子',   () => { const r = el('r_grain'); r.value = 95; r.dispatchEvent(new Event('input',{bubbles:true})); });
  await knob('焼き',   () => { const r = el('r_burn');  r.value = 95; r.dispatchEvent(new Event('input',{bubbles:true})); });
  await knob('にじみ', () => { const r = el('r_smear'); r.value = 90; r.dispatchEvent(new Event('input',{bubbles:true})); });
  await knob('紙のムラ',() => { const r = el('r_fiber'); r.value = 95; r.dispatchEvent(new Event('input',{bubbles:true})); });
  await knob('灯りのムラ',() => { const r = el('r_lamp'); r.value = 90; r.dispatchEvent(new Event('input',{bubbles:true})); });
  await knob('揺れ',   () => { const r = el('r_jit');   r.value = 80; r.dispatchEvent(new Event('input',{bubbles:true})); }, 1000);
  await knob('紙の色', () => { const c = el('c_bg'); c.value = '#ffd7a0'; c.dispatchEvent(new Event('input',{bubbles:true})); });
  await knob('白黒',   () => document.querySelectorAll('#s_mono button')[1].click());
  await knob('コピー二値', () => document.querySelectorAll('#s_mono button')[2].click());
  ok(dead.length === 0, '⭐⭐ 刷ったあとでも【全部のつまみが効く】', dead.length ? '効かない: ' + dead.join(' / ') : '9本ぜんぶ効く');

  /* ⭐⭐ 版面を変えても【刷った紙が消えない】 */
  const keep = await p.evaluate(async () => {
    const was = { pos:Math.round(POS), len:sheet().w };
    const r = el('r_long'); r.value = 1000; r.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(x => setTimeout(x, 900));
    return { was, now:{ pos:Math.round(POS), len:sheet().w } };
  });
  ok(keep.was.pos > 0 && keep.now.pos > keep.now.len * 0.95,
     '⭐⭐ 版面を変えても【刷った紙が消えない】（一緒に伸び縮みする）', JSON.stringify(keep));

  /* ⭐ 現像し直しても、刷りながら現像したのと同じ絵になる */
  await back(); await fill();
  const same = await p.evaluate(() => {
    const h2 = () => { const c = document.createElement('canvas'); c.width = 220; c.height = 220;
      const q = c.getContext('2d'); q.drawImage(paper(), 0, 0, 220, 220);
      const d = q.getImageData(0,0,220,220).data; let x = 2166136261;
      for(let i = 0; i < d.length; i += 4){ x ^= d[i]; x = Math.imul(x, 16777619); } return x >>> 0; };
    const a = h2(); develop(0); const b2 = h2(); develop(0); const c2 = h2();
    return { a, b2, c2 };
  });
  ok(same.a === same.b2 && same.b2 === same.c2,
     '⭐⭐ 現像し直しても【刷りながら現像したのと同じ絵】', JSON.stringify(same));

  /* ⭐ 現像は指の端末でも待たされない速さか */
  const ms = await p.evaluate(() => { const a = [];
    for(let k = 0; k < 3; k++){ P.grain = 40 + k*5; const t0 = performance.now(); develop(0); a.push(performance.now() - t0); }
    P.grain = 45; develop(0);
    return Math.round(a.sort((x,y) => x-y)[1]); });
  ok(ms < 400, '⭐ 現像し直しが速い（つまみが待たされない）', ms + ' ms');
}

ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close(); process.exit(NG);
