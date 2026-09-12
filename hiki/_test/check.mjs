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

/* ⭐⭐ SVG ── 2026-09-12。出し方は2つ（輪郭／短冊）。
   🔴 見るのは「落ちたか」ではなく【Illustrator / Figma で触れる形になっているか】。
     ① 輪郭＝**掴むのは1本**（字の形そのもの）。穴が空く
     ② 短冊＝画素のまま。図形は数千枚になるが **path は色の数だけ**（木下が Figma で
        「Vector が何千個」になっているのを見つけた。まとめる鍵がうねりでずれて効いていなかった）
     ③ 地なし＝**本当に透明**。元の絵に地の色を焼いていて、ずっと効いていなかった
     ④ 地なしに地の矩形が入らない（道具の間で繋げる） */
{
  const sv = await p.evaluate(() => {
    const T = svgTrace(false), Ta = svgTrace(true), S = svgStrip(false), Sa = svgStrip(true);
    const paths = s => (s.match(/<path /g)||[]).length;
    return {
      輪郭:{ 輪:T.shapes, path:paths(T.svg), 穴:/fill-rule="evenodd"/.test(T.svg),
             画素でない:!/<image|base64/.test(T.svg), 頭:T.svg.slice(0,42) },
      短冊:{ 図形:S.shapes, path:paths(S.svg) },
      地矩形:{ 輪郭地あり:/<svg[^>]*><rect width=/.test(T.svg),
               輪郭地なし:/<svg[^>]*><rect width=/.test(Ta.svg),
               短冊地なし:/<svg[^>]*><rect width=/.test(Sa.svg) },
      地なしに形がある:{ 輪:Ta.shapes, 短冊:Sa.shapes },
    };
  });
  ok(sv.輪郭.輪 > 0 && sv.輪郭.path === 1 && sv.輪郭.穴 && sv.輪郭.画素でない && /^<\?xml/.test(sv.輪郭.頭),
     '⭐⭐ 輪郭＝【掴むのは1本】で出る（画素を貼っていない・穴が空く）', JSON.stringify(sv.輪郭));
  /* 🔴 ここが今回の本丸。図形は数千でよいが、path が数千あってはいけない */
  ok(sv.短冊.図形 > 100 && sv.短冊.path < 70,
     '🔴🔴 短冊＝図形は数千でも【掴むのは色の数だけ】（Vector が数千個にならない）',
     JSON.stringify(sv.短冊));
  ok(sv.地矩形.輪郭地あり === true && sv.地矩形.輪郭地なし === false && sv.地矩形.短冊地なし === false,
     '⭐⭐ 地なし SVG に【地の矩形が入らない】（道具の間で繋げる）', JSON.stringify(sv.地矩形));
  ok(sv.地なしに形がある.輪 > 0 && sv.地なしに形がある.短冊 > 100,
     '🔴🔴 地なしでも【形が残る】（元の絵に地を焼いていて空になっていた）',
     JSON.stringify(sv.地なしに形がある));
  /* 🔴🔴 地なしが【本当に透明】か＝画素を数える。ここを見ていなかったので気づけなかった */
  const tr = await p.evaluate(() => {
    const { w, h } = sheet();
    const c = document.createElement('canvas'); c.width = 240; c.height = 240;
    paint(c.getContext('2d'), 240, 240, true);
    const d = c.getContext('2d').getImageData(0,0,240,240).data;
    let clear = 0; for(let i = 3; i < d.length; i += 4) if(d[i] < 8) clear++;
    return { 透明な画素:clear, 全部:240*240 };
  });
  ok(tr.透明な画素 > tr.全部 * 0.1, '🔴🔴 地なしが【本当に透明】（地の色を焼き込んでいない）',
     JSON.stringify(tr));
  await p.evaluate(() => { window.__got = []; document.getElementById('b_svgo').click(); });
  await new Promise(r=>setTimeout(r,1800));
  const g2 = await p.evaluate(() => window.__got);
  ok(g2.some(x=>/svg/.test(x.type)), 'SVG が本当に落ちる', JSON.stringify(g2));
  /* ⭐ 出すときだけのつまみが、出る形に効いているか */
  const less = await p.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id);
      e.value = v; e.dispatchEvent(new Event('input',{bubbles:true})); };
    set('r_qz', 64); const hi = svgStrip(false).shapes;
    set('r_qz', 2);  const lo = svgStrip(false).shapes;
    set('r_qz', 16);
    set('r_sm', 0); const s0 = svgTrace(false).pts;
    set('r_sm', 4); const s4 = svgTrace(false).pts;
    set('r_sm', 2);
    return { 色数64:hi, 色数2:lo, なめらか0:s0, なめらか4:s4 };
  });
  ok(less.色数2 <= less.色数64, '⭐ 短冊：色数を下げると図形が減る',
     JSON.stringify({ 色数64:less.色数64, 色数2:less.色数2 }));
  ok(less.なめらか4 < less.なめらか0, '⭐⭐ 輪郭：なめらかさを上げると点が【減る】（増えない）',
     JSON.stringify({ なめらか0:less.なめらか0, なめらか4:less.なめらか4 }));

  /* 🔴🔴🔴 ここが【今まで無かった物差し】── 2026-09-12
     「1本の path で出た」「点が減った」は全部通っていたのに、出た形は【溶けていた】。
     角の丸めを《辺の長さの割合》でやっていたので、間引いたあと辺が数百 px に伸びた状態で
     角を数百 px 削っていた（木下が Illustrator で開いて発覚）。
     ⭐ 数える物差しでは出ない＝**出た SVG を焼いて、盤の絵と画素で突き合わせる**。
     ⚠️ 字は【直線が長い】ほど壊れるので、丸い字ではなく **TBT のような角の形** で見る。 */
  for(const [txt, sm] of [['TBT', 2], ['TBT', 6], ['永', 2]]){
    const r = await p.evaluate((txt, sm) => {
      Object.assign(P, { txt, sm }); MAPKEY = ''; SCANKEY = ''; render();
      const T = svgTrace(false);
      const N = 420, { w:OW, h:OH } = sheet();
      const c = document.createElement('canvas');
      c.width = N; c.height = Math.round(N * OH / OW);
      paint(c.getContext('2d'), c.width, c.height, false);
      return { svg:T.svg, pts:T.pts, W:c.width, H:c.height, board:c.toDataURL('image/png') };
    }, txt, sm);
    const pg = await b.newPage();
    await pg.setViewport({ width:r.W, height:r.H });
    await pg.goto('data:text/html,' + encodeURIComponent('<body style="margin:0">'
      + r.svg.replace(/<\?xml[^>]*\?>\n?/, '')
             .replace('<svg ', '<svg style="width:' + r.W + 'px;height:' + r.H + 'px;display:block" ')
      + '</body>'));
    await new Promise(x => setTimeout(x, 300));
    const shot = await pg.screenshot({ encoding:'base64' });
    await pg.close();
    const df = await p.evaluate(async (a, bb, W, H) => {
      const load = s => new Promise(r2 => { const i = new Image(); i.onload = () => r2(i); i.src = s; });
      const A = await load(a), B = await load('data:image/png;base64,' + bb);
      const ca = document.createElement('canvas'); ca.width = W; ca.height = H;
      const cb = document.createElement('canvas'); cb.width = W; cb.height = H;
      ca.getContext('2d').drawImage(A, 0, 0, W, H);
      cb.getContext('2d').drawImage(B, 0, 0, W, H);
      const da = ca.getContext('2d').getImageData(0, 0, W, H).data;
      const db = cb.getContext('2d').getImageData(0, 0, W, H).data;
      let bad = 0, ink = 0;
      for(let i = 0; i < da.length; i += 4){
        const la = da[i]*.299 + da[i+1]*.587 + da[i+2]*.114 > 127 ? 1 : 0;
        const lb = db[i]*.299 + db[i+1]*.587 + db[i+2]*.114 > 127 ? 1 : 0;
        if(la) ink++;
        if(la !== lb) bad++;
      }
      return { ずれ:bad, 全部:W*H, 白:ink };
    }, r.board, shot, r.W, r.H);
    const pc = df.ずれ / df.全部 * 100;
    ok(pc < 1.0, '🔴🔴🔴 輪郭が【盤の絵と同じ形】で出る（溶けない）: ' + txt + '・なめらかさ' + sm,
       'ずれ ' + pc.toFixed(2) + '%（点 ' + r.pts + '）');
  }
  await p.evaluate(() => { Object.assign(P, { txt:'永', sm:2 }); MAPKEY = ''; SCANKEY = ''; render(); });
}

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
