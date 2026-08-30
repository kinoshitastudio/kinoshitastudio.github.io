/* ══ 奔 HON 回帰テスト ══════════════════════════════════════
   使い方：node hon/_test/run.mjs [URL]
   ⚠️ 落ちないテストは意味がない。最後に「わざと壊したら落ちるか」の検算あり。
     ① 骨が全字ぶんあるか／打った字に骨が無ければ【画面で名指しする】か
     ② ⭐ 筆の太さが【字の高さに対する割合】で効くか
        🔴 直す前は 10倍していて、線幅が字の高さの62%＝字が1つの塊に潰れていた
     ③ 入り抜き＝端で細るか（真ん中より端が細い）
     ④ はみ出し＝端が骨より外へ伸びるか
     ⑤ ⭐ 手のぶれが【全部の字に同じ規則で】掛かるか（1字だけ変わるのは書体ではない）
     ⑥ 種を変えると走り方が変わる（種の1発目が潰れていないか）
     ⑦ 版面に収める＝つまみ自体が動くか／はみ出しを数字で言うか
     ⑧ SVG が筆の形（path）で出るか
   ══════════════════════════════════════════════════════════ */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL0 = process.argv[2] || 'http://localhost:8123/hon/index.html';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); let err = 0;
p.on('pageerror', e => { err++; console.log('🔴', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(URL0, { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 1500));

const R = await p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const set = (id, v) => { const e = document.getElementById(id); e.value = v;
    e.dispatchEvent(new Event('input', { bubbles:true })); };
  /* 帯の太さ＝法線方向の広がりを測る（em1000 に対して） */
  const bandW = (ch, i) => {
    const g = glyph(ch, i); if(!g.length) return 0;
    const r = g[0], n = r.length/2;
    let s = 0, c = 0;
    for(let k = Math.floor(n*0.35); k < Math.floor(n*0.65); k++){
      const a = r[k], bq = r[r.length-1-k];
      s += Math.hypot(a[0]-bq[0], a[1]-bq[1]); c++;
    }
    return c ? s/c : 0;
  };
  const box = (ch,i) => { let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    glyph(ch,i).forEach(r=>r.forEach(q=>{x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);
      y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}));
    return [x1-x0, y1-y0]; };

  /* ① 骨 */
  out['①骨の字数'] = Object.keys(BONE).length;
  out['①A–Zが揃う'] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').every(c => !!boneOf(c));
  S.text = 'YASUKO'; document.getElementById('tText').value='YASUKO';
  document.getElementById('tText').dispatchEvent(new Event('input',{bubbles:true})); await wait(150);
  /* 骨が無い字は画面で名指しするか */
  S.text = 'YASUKOあ'; render(); await wait(120);
  out['①無い字を名指し'] = document.getElementById('meter').textContent.includes('骨が無い字');
  S.text = 'YASUKO'; document.getElementById('tText').value='YASUKO'; render(); await wait(120);

  /* ② 太さが割合で効く（🔴 10倍していて塊になっていた） */
  set('taper', 0); set('jit', 0); await wait(150);
  const w1 = bandW('I', 0); set('pW', 120); await wait(150);
  const w2 = bandW('I', 0);
  out['②太さ58の帯'] = Math.round(w1);
  out['②太さ120の帯'] = Math.round(w2);
  out['②字の高さに対して%'] = +(w1/1000*100).toFixed(1);
  set('pW', 58); await wait(120);

  /* ③ 入り抜き＝端で細る */
  set('taper', 90); await wait(150);
  { const g = glyph('I',0)[0], n = g.length/2;
    const mid = Math.hypot(g[(n/2)|0][0]-g[g.length-1-((n/2)|0)][0], g[(n/2)|0][1]-g[g.length-1-((n/2)|0)][1]);
    const end = Math.hypot(g[1][0]-g[g.length-2][0], g[1][1]-g[g.length-2][1]);
    out['③真ん中の太さ'] = Math.round(mid); out['③端の太さ'] = Math.round(end); }
  set('taper', 46); await wait(120);

  /* ⑨ ⭐ 線幅のムラ＝曲がる所が太る（速さから作っている） */
  set('vary', 0); set('jit', 0); set('taper', 0); await wait(200);
  const flat = (() => { const g = glyph('O',0)[0], n = g.length/2, ws = [];
    for(let k=2;k<n-2;k++) ws.push(Math.hypot(g[k][0]-g[g.length-1-k][0], g[k][1]-g[g.length-1-k][1]));
    return { max:Math.max(...ws), min:Math.min(...ws) }; })();
  set('vary', 90); await wait(200);
  const wavy = (() => { const g = glyph('O',0)[0], n = g.length/2, ws = [];
    for(let k=2;k<n-2;k++) ws.push(Math.hypot(g[k][0]-g[g.length-1-k][0], g[k][1]-g[g.length-1-k][1]));
    return { max:Math.max(...ws), min:Math.min(...ws) }; })();
  out['⑨ムラ0の幅の開き'] = +(flat.max/flat.min).toFixed(3);
  out['⑨ムラ90の幅の開き'] = +(wavy.max/wavy.min).toFixed(3);
  set('vary', 54); set('jit', 30); set('taper', 46); await wait(150);

  /* ④ はみ出し */
  set('over', 0); await wait(150); const h0 = box('I',0)[1];
  set('over', 90); await wait(150); const h1 = box('I',0)[1];
  out['④はみ出し前'] = Math.round(h0); out['④はみ出し後'] = Math.round(h1);
  set('over', 34); await wait(120);

  /* ⑤ 手のぶれが全部の字に */
  set('jit', 0); await wait(150);
  const before = [...'YASUKO'].map((c,i)=>JSON.stringify(glyph(c,i)));
  set('jit', 90); await wait(200);
  const after = [...'YASUKO'].map((c,i)=>JSON.stringify(glyph(c,i)));
  out['⑤変わった字'] = before.filter((v,i)=>v!==after[i]).length;
  out['⑤全部'] = before.length;
  set('jit', 30); await wait(120);

  /* ⑥ 種 */
  const g1 = JSON.stringify(glyph('S',2));
  set('seed', 44); await wait(200);
  out['⑥種で変わる'] = JSON.stringify(glyph('S',2)) !== g1;
  const firsts = [3,14,25,36,47].map(k => +rnd(k)().toFixed(3));
  out['⑥散らばり'] = +(Math.max(...firsts)-Math.min(...firsts)).toFixed(3);

  /* ⑦ 収める */
  set('size', 800); await wait(200);
  out['⑦大きいとはみ出す'] = document.getElementById('meter').textContent.includes('版面から出ている');
  document.getElementById('bFit').click(); await wait(300);
  out['⑦収めたら消える'] = !document.getElementById('meter').textContent.includes('版面から出ている');
  out['⑦つまみも動く'] = (+document.getElementById('size').value === S.run.size);

  /* ⑧ SVG */
  { const g = document.createElement('canvas').getContext('2d');
    out['⑧pathの数'] = paint(g, S.run.w, S.run.h, { svg:true }).filter(s=>s.startsWith('<path')).length; }
  return out;
});

const NG = [];
const ok = (k, cond) => { console.log((cond?'  ✅ ':'  🔴 ')+k+' … '+JSON.stringify(R[k])); if(!cond) NG.push(k); };
console.log('── 奔 HON（骨で書いた欧文を、筆で走らせる）');
ok('①骨の字数', R['①骨の字数'] >= 36);
ok('①A–Zが揃う', R['①A–Zが揃う'] === true);
ok('①無い字を名指し', R['①無い字を名指し'] === true);
ok('②字の高さに対して%', R['②字の高さに対して%'] > 2 && R['②字の高さに対して%'] < 12);
ok('②太さ120の帯', R['②太さ120の帯'] > R['②太さ58の帯']*1.7);
ok('③端の太さ', R['③端の太さ'] < R['③真ん中の太さ']*0.6);
ok('④はみ出し後', R['④はみ出し後'] > R['④はみ出し前']*1.05);
ok('⑤変わった字', R['⑤変わった字'] === R['⑤全部']);
ok('⑥種で変わる', R['⑥種で変わる'] === true);
ok('⑥散らばり', R['⑥散らばり'] > 0.4);
ok('⑦大きいとはみ出す', R['⑦大きいとはみ出す'] === true);
ok('⑦収めたら消える', R['⑦収めたら消える'] === true);
ok('⑦つまみも動く', R['⑦つまみも動く'] === true);
ok('⑧pathの数', R['⑧pathの数'] >= 6);
ok('⑨ムラ0の幅の開き', R['⑨ムラ0の幅の開き'] < 1.05);
ok('⑨ムラ90の幅の開き', R['⑨ムラ90の幅の開き'] > 1.5);
console.log('  ' + (err ? '🔴 例外 '+err+'件' : '✅ 例外なし'));

/* ⚠️ 検算＝わざと壊したら落ちるか */
const bad = await p.evaluate(() => {
  const w0 = JSON.stringify(glyph('I',0));
  S.pen.w = 4; cache.clear();                   /* 筆を極細にする */
  return JSON.stringify(glyph('I',0)) !== w0;
});
console.log('  ── 検算：筆を極細にしたら帯が変わった＝ ' + bad + '（false なら②が落ちる）');

if(NG.length || err){ console.log('  🔴 落ち：'+NG.join('／')); await b.close(); process.exit(1); }
console.log('  ── 通過（16項目）');
await b.close();
