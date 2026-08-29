/* ⭐⭐ 曳 HIKI の回帰テスト ── 2026-08-29
   🔴 見るのは【この道具の芯が出ているか】：
     ⭐⭐ ① 効き 0 なら【元のまま】（読む速さが一定＝この道具の意味が出ない側）
     ⭐⭐ ② 効きを上げると読む速さがばらつく＝【伸びる所と縮む所】ができる
     ⭐⭐ ③ 止まる所があれば【帯】／戻る所があれば【鏡】が出る
     ④ 効きはマイナスにもできる（向きを縛らない）
     ⑤ 横にも縦にも走れる
     ⑥ 端で止める＝元の外を読まない（絵が切れない）
     ⑦ 絵の明暗から読む速さを決められる（絵が自分で自分を引き伸ばす）
     ⑧ PNG が本当に落ちる
   使い方: node hiki/_test/check.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL_ = process.argv[2] || 'http://localhost:8098/hiki/';
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

/* 読む速さの内訳（この道具のすべてがここに出る） */
const spd = (set) => p.evaluate((set) => {
  Object.assign(P, set); MAPKEY = ''; SCANKEY = ''; render();
  const S2 = scan(); let mn = 9e9, mx = -9e9, back = 0, flat = 0;
  for(let i = 1; i < S2.n; i++){
    const v = S2.src[i] - S2.src[i-1];
    if(v < mn) mn = v; if(v > mx) mx = v;
    if(v < -0.001) back++;
    if(Math.abs(v) < 0.02) flat++;
  }
  return { 遅い:+mn.toFixed(3), 速い:+mx.toFixed(3), 戻る:back, 止まる:flat, 本:S2.n,
           端:[+S2.src[0].toFixed(2), +S2.src[S2.n-1].toFixed(2)] };
}, set);

const A = await spd({ way:'wave', amp:0, freq:2, ph:0, sh:0, axis:'x' });
ok(Math.abs(A.遅い - 1) < 0.01 && Math.abs(A.速い - 1) < 0.01,
   '⭐⭐ 効き 0 なら【元のまま】（読む速さが一定）', JSON.stringify(A));

const B = await spd({ amp:0.6 });
ok(B.速い > A.速い + 0.05 && B.遅い < A.遅い - 0.05,
   '⭐⭐ 効きを上げると【伸びる所と縮む所】ができる', JSON.stringify(B));

const C = await spd({ amp:1.6, freq:6 });
ok(C.戻る > 0, '⭐⭐ 強く効かせると【戻る所】が出る＝鏡になる', JSON.stringify(C));

const D = await spd({ way:'step', amp:1.0, freq:10 });
ok(D.止まる > 0, '⭐⭐ 段＝【止まる所】が出る＝帯になる', JSON.stringify(D));

const E = await spd({ way:'wave', amp:-0.6, freq:2 });
ok(E.速い > 1.05 && E.遅い < 0.95, '⭐ 効きはマイナスにもできる（向きを縛らない）', JSON.stringify(E));

const F = await spd({ way:'wave', amp:1.8, freq:3 });
ok(F.端[0] >= 0 && F.端[1] <= F.本 - 1,
   '⭐ 端で止める＝元の外を読まない（絵が切れない）', JSON.stringify(F.端) + ' / 本 ' + F.本);

const G = await spd({ axis:'y', amp:0.6, way:'wave' });
ok(G.本 > 0 && G.速い > 1.0, '⭐ 縦にも走れる', JSON.stringify({ 本:G.本, 速い:G.速い }));

const H = await spd({ axis:'x', way:'tone', amp:0.9 });
ok(Math.abs(H.速い - H.遅い) > 0.01,
   '⭐⭐ 絵の明暗から読む速さが決まる（絵が自分で自分を引き伸ばす）', JSON.stringify(H));

/* 絵が実際に変わっているか（画素で） */
const shape = () => p.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 90; c.height = 90;
  c.getContext('2d').drawImage(cv, 0, 0, 90, 90);
  const d = c.getContext('2d').getImageData(0,0,90,90).data;
  let h = 2166136261;
  for(let i=0;i<d.length;i+=4){ h ^= d[i]; h = Math.imul(h, 16777619); }
  return (h>>>0);
});
await spd({ way:'wave', amp:0, freq:2, axis:'x', sh:0 });
const s0 = await shape();
await spd({ amp:0.8 });
const s1 = await shape();
ok(s0 !== s1, '⭐⭐ つまみを回すと【絵が本当に変わる】', `${s0} → ${s1}`);

await p.evaluate(() => { window.__got = []; document.getElementById('b_png').click(); });
await new Promise(r=>setTimeout(r,1400));
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
  /* 盤に本当に絵が乗っているか＝一色でないこと */
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
  await m.close();
}

/* ⭐⭐ 指で【引いている最中に】絵が追いてくるか ── 2026-08-29
   🔴 木下＝「スライダーはモバイルで動くけどそれに合わせて反映がないなあ」。
      つまみの値は変わるのに絵が変わらない／粗いまま、が起きていた
      （隣の道具から借りた「触っている間は盤を半分にし列を1本おきにする」仕掛けのせい。実測 8ms で不要だった）。
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
  for(const id of ['r_amp','r_freq','r_ph','r_sh']){
    /* ⚠️ 1本ずつ【既定に戻してから】引く。前のつまみを端まで引いた状態が残っていると、
       升目が5×5しか無い盤で「伸び」を動かして「変わらない」と誤判定する（実際にした）。 */
    await m.evaluate(() => { [['r_amp',100],['r_freq',3],['r_ph',0],['r_sh',0]].forEach(([i,v]) => {
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

ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close(); process.exit(NG);
