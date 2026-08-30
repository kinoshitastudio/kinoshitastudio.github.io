/* ══ 噂 UWASA 回帰テスト ══════════════════════════════════════
   使い方：node uwasa/_test/run.mjs [URL]
   ⚠️ 落ちないテストは意味がない。最後に「わざと壊したら落ちるか」の検算あり。
   見ているのは
     ① 立ち上がって、元の字から【輪郭】が取れているか
     ② ⭐⭐ 崩しが【全部の字に同じ規則で】掛かるか ＝ ここが「書体」の定義
     ③ ⭐ 太らせると【太る】か（🔴 法線が内を向いて細っていた／巻き方でも直らなかった）
     ④ 字幅・字高が別々に効くか（縦に長く・横に長く）
     ⑤ ⭐ 組みの3本（向き・字送り・行間・折り返し）が【大きく】にも【試し組み】にも効くか
     ⑥ 打った字が【全部】出るか（🔴 1字しか出していなかった）
     ⑦ はみ出しを数字で言うか／「収める」でつまみ自体が動くか
     ⑧ SVG が輪郭（path）で出るか
     ⑨ 種を変えると崩れ方が変わるか（種の1発目が潰れていないか）
   ══════════════════════════════════════════════════════════ */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL0 = process.argv[2] || 'http://localhost:8123/uwasa/index.html';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); let err = 0;
p.on('pageerror', e => { err++; console.log('🔴', e.message); });
await p.setViewport({ width:1400, height:900, deviceScaleFactor:1 });
await p.goto(URL0, { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3200));

const R = await p.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const set = (id, v) => { const e = document.getElementById(id); e.value = v;
    e.dispatchEvent(new Event('input', { bubbles:true })); };
  const bbox = c => { let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    glyph(c).forEach(r => r.forEach(q => { x0=Math.min(x0,q[0]); x1=Math.max(x1,q[0]);
      y0=Math.min(y0,q[1]); y1=Math.max(y1,q[1]); }));
    return [Math.round(x1-x0), Math.round(y1-y0)]; };
  const area = c => { let a = 0;
    glyph(c).forEach(r => { for(let i=0;i<r.length;i++){ const q=r[i], w=r[(i+1)%r.length];
      a += q[0]*w[1] - w[0]*q[1]; } });
    return Math.abs(a/2); };

  /* ① 輪郭が取れている */
  out['①囲みの数'] = glyph('爆').length;
  out['①点の数'] = glyph('爆').reduce((s,r)=>s+r.length,0);

  /* ② ⭐⭐ 崩しが全部の字に効く（1字だけ変わるのは「書体」ではない） */
  const chs = ['爆','あ','ん'];
  const b0 = chs.map(c => JSON.stringify(glyph(c)));
  set('rough', 90); await wait(120);
  const b1 = chs.map(c => JSON.stringify(glyph(c)));
  out['②変わった字'] = b0.filter((v,i) => v !== b1[i]).length;
  out['②全部'] = chs.length;
  set('rough', 34); await wait(80);

  /* ③ 太らせると太る */
  const a0 = area('爆'); set('fat', 40); await wait(120);
  out['③太らせの面積比'] = +(area('爆')/a0).toFixed(3);
  set('fat', -40); await wait(120);
  out['③細らせの面積比'] = +(area('爆')/a0).toFixed(3);
  set('fat', 0); await wait(80);

  /* ④ 字幅・字高が別々 */
  const s0 = bbox('あ');
  set('wide', 180); await wait(100); const sw = bbox('あ'); set('wide', 100); await wait(60);
  set('tall', 180); await wait(100); const sh = bbox('あ'); set('tall', 100); await wait(60);
  out['④素'] = s0; out['④横に長く'] = sw; out['④縦に長く'] = sh;

  /* ⑤⑥ 組みの3本が【大きく】にも効く／打った字が全部出る */
  S.text = 'なんだろう';
  document.getElementById('tText').value = 'なんだろう';
  document.getElementById('tText').dispatchEvent(new Event('input', { bubbles:true }));
  await wait(250);
  out['⑥大きくの字数'] = bigChars().length;
  S.view = 'one'; layout(); render(); await wait(120);
  const P0 = JSON.stringify(runPos(5,640).pos), B0 = JSON.stringify(boardSize());
  set('kLine', 260); await wait(200);
  out['⑤行間が効く'] = JSON.stringify(runPos(5,640).pos) !== P0;
  out['⑤版面も伸びる'] = JSON.stringify(boardSize()) !== B0;
  set('kLine', 150); await wait(120);
  document.querySelector('#segDir button[data-v="h"]').click(); await wait(200);
  const yoko = boardSize();
  document.querySelector('#segDir button[data-v="v"]').click(); await wait(200);
  const tate = boardSize();
  out['⑤横縦で入れ替わる'] = (yoko[0] === tate[1] && yoko[1] === tate[0]);
  set('kWrap', 2); await wait(150);
  out['⑤折り返し2の行数'] = runPos(5,640).lines;
  set('kWrap', 4); await wait(120);

  /* ⑦ はみ出しを言う／収めるでつまみが動く */
  S.view = 'lay'; layout(); render(); await wait(150);
  set('mSize', 400); await wait(150);
  const over = layOver();
  out['⑦はみ出しを数える'] = (over.top + over.bottom + over.left + over.right) > 0;
  document.getElementById('bFitText').click(); await wait(250);
  const o2 = layOver();
  out['⑦収めたら0'] = (o2.top + o2.bottom + o2.left + o2.right) === 0;
  out['⑦つまみも動く'] = (+document.getElementById('mSize').value === S.lay.size);

  /* ⑧ SVG は輪郭で出る */
  { const g = document.createElement('canvas').getContext('2d');
    const body = paint(g, S.lay.w, S.lay.h, { svg:true });
    out['⑧pathの数'] = body.filter(s => s.startsWith('<path')).length; }

  /* ⑳ ⭐⭐ 粒立ち ── 線の中が粒でできる／芯は残る（参考＝映画『ちるらん』題字）
     ㉑ 🔴🔴 抜きは【地まで食う】── 板を字の形で切っていないと版面に穴が空く */
  { const zone = () => {
      const N=340, c=document.createElement('canvas'); c.width=c.height=N;
      const g2=c.getContext('2d'); g2.fillStyle='#fff'; g2.fillRect(0,0,N,N);
      drawGlyph(g2,'O',N/2,N/2,250,'#000',null);
      const a=g2.getImageData(0,0,N,N).data;
      tsubuOver(g2,'O',N/2,N/2,250);
      const b2=g2.getImageData(0,0,N,N).data;
      const cc=document.createElement('canvas'); cc.width=cc.height=N;
      const gc=cc.getContext('2d'); gc.fillStyle='#000';
      const rings=coreRings('O', S.cut.core/100*1000*0.075), k=250/1000;
      gc.save(); gc.translate(N/2-125, N/2-125); gc.scale(k,k);
      gc.beginPath(); rings.forEach(r2=>{ gc.moveTo(r2[0][0],r2[0][1]);
        for(let i=1;i<r2.length;i++) gc.lineTo(r2[i][0],r2[i][1]); gc.closePath(); });
      gc.fill('evenodd'); gc.restore();
      const cd=gc.getImageData(0,0,N,N).data;
      let cw=0,cn=0,ew=0,en=0, outside=0;
      for(let i=0;i<a.length;i+=4){
        const was=a[i+3]>128&&a[i]<128, now=b2[i+3]>128&&b2[i]<128;
        /* ㉑ 字の外の地が抜かれていないか（抜かれると alpha が落ちる） */
        if(!was && a[i+3]>128 && b2[i+3]<128) outside++;
        if(!was) continue;
        if(cd[i+3]>128){ cw++; if(now) cn++; } else { ew++; if(now) en++; }
      }
      return { 芯:+(cn/Math.max(1,cw)).toFixed(3), 縁:+(en/Math.max(1,ew)).toFixed(3), 地を食った:outside };
    };
    S.cut.tsubu=0; cutCache.clear(); const z0 = zone();
    S.cut.tsubu=70; cutCache.clear(); const z1 = zone();
    S.cut.core=0;  cutCache.clear(); const z2 = zone();
    S.cut.tsubu=0; S.cut.core=46; cutCache.clear();
    out['⑳粒立ちは縁を食う'] = z0.縁 + ' → ' + z1.縁;
    out['⑳芯は残る'] = z1.芯;
    out['⑳芯0なら芯も食う'] = z2.芯;
    out['㉑地を食っていない'] = z1.地を食った; }

  /* ⑲ ⭐ 毛羽・飛沫の形（2026-08-31 木下「小さな三角をもっと歪に／量もランダムに」）
     ⚠️ 「縦横比のばらつき」で測ろうとしたが 0.71→0.60 と**逆に出た**（形が伸びると
        比は揃う方向にも動く）＝測り方が悪い。⭐ 確かめられる所で測る：
        ・毛羽は【折れた形】＝5点（前は二等辺三角の3点だった）
        ・飛沫の点数が【複数種類】に散る（前は5〜7で固定に近かった）
        ・ムラを上げると【出る数】そのものが変わる（一様に撒いていない） */
  { S.cut.hair=54; S.cut.spat=48; S.cut.wonk=58; S.cut.clump=0;
    outCache.clear(); cutCache.clear();
    const small = () => glyph('O').slice(1).map(r2 => r2.length);
    const a = small();
    out['⑲毛羽は折れた形（5点）'] = a.filter(v => v === 5).length > 0;
    out['⑲飛沫の点数の種類'] = [...new Set(a.filter(v => v !== 5))].sort((x,y)=>x-y);
    const n0 = a.length;
    S.cut.clump = 100; cutCache.clear();
    out['⑲ムラで出る数が変わる'] = (small().length !== n0);
    out['⑲数'] = n0 + ' → ' + small().length;
    S.cut.hair=0; S.cut.spat=0; S.cut.clump=62; cutCache.clear(); }

  /* ⑱ ⭐⭐ 片寄り＝欠けが【一方向に寄る】（全周に均等だと「摩耗」に見える）
     測り方＝抜けた所の重心が、字の真ん中からどれだけ離れるか。 */
  { const off = () => { const c=document.createElement('canvas'); c.width=c.height=320;
      const g2=c.getContext('2d'); g2.fillStyle='#fff'; g2.fillRect(0,0,320,320);
      drawGlyph(g2,'O',160,160,260,'#000',null);
      const a=g2.getImageData(0,0,320,320).data;
      breakOver(g2,'O',160,160,260);
      const b2=g2.getImageData(0,0,320,320).data;
      /* ⭐ 測るのは【角度の集中度】＝抜けた所が字のまわりのどれだけ狭い方向に固まっているか。
         🔴 「重心のずれ」で測ったら 44→51（1.16倍）しか出ず、効いているのに落ちた。
           ⚠️ 塊がランダムでも重心はずれるので、ずれの大きさでは分からない。
         ⭐ 角度を単位ベクトルにして足す（円周の集中度）。散っていれば打ち消し合って 0 に近い。 */
      let vx=0, vy=0, k=0;
      for(let i=0;i<a.length;i+=4){
        const was = a[i+3]>128 && a[i]<128, now = b2[i+3]>128 && b2[i]<128;
        if(was && !now){ const p=(i/4)|0, px=p%320, py=(p/320)|0;
          const th=Math.atan2(py-160, px-160); vx+=Math.cos(th); vy+=Math.sin(th); k++; }
      }
      if(!k) return 0;
      return +(Math.hypot(vx,vy)/k).toFixed(3);            /* 0＝散る／1＝一方向 */
    };
    /* ⚠️ 塊が少ないと、片寄り0でも偏って見える（6個で 0.772）＝差が出ない。
       ⭐ **測れる条件で測る** ── 塊を多くして「散る／寄る」がはっきり分かれる所で比べる。 */
    S.cut.brk = 45; S.cut.bn = 14; S.cut.bias = 0; cutCache.clear();
    out['⑱片寄り0の集中度'] = off();
    S.cut.bias = 100; cutCache.clear();
    out['⑱片寄り100の集中度'] = off();
    S.cut.brk = 0; S.cut.bn = 5; S.cut.bias = 0; cutCache.clear(); }

  /* ⑯ ⭐ かすれが【グレーの汚れ】を作らない（抜くときは完全に抜く）
     🔴 直す前は濃さで効かせていたので、白地の上で中間色になり「汚れ」に見えた。 */
  { const grey = () => { const c=document.createElement('canvas'); c.width=c.height=320;
      const g2=c.getContext('2d'); g2.fillStyle='#fff'; g2.fillRect(0,0,320,320);
      drawGlyph(g2,'G',160,160,260,'#000',null); dryOver(g2,'G',160,160,260);   /* ⚠️ 字ごと・字の形で切る形に変わった */
      const d=g2.getImageData(0,0,320,320).data;
      let mid=0, tot=0;
      for(let i=0;i<d.length;i+=4){ if(d[i+3]<10) continue; tot++;
        if(d[i]>60 && d[i]<200) mid++; }
      return +(mid/tot*100).toFixed(2); };
    const ink2 = () => { const c=document.createElement('canvas'); c.width=c.height=320;
      const g2=c.getContext('2d'); g2.fillStyle='#fff'; g2.fillRect(0,0,320,320);
      drawGlyph(g2,'G',160,160,260,'#000',null); dryOver(g2,'G',160,160,260);   /* ⚠️ 字ごと・字の形で切る形に変わった */
      const d=g2.getImageData(0,0,320,320).data;
      let k=0; for(let i=0;i<d.length;i+=4) if(d[i+3]>128 && d[i]<128) k++; return k; };
    S.cut.dry=0; cutCache.clear(); const m0=grey(), a0=ink2();
    S.cut.dry=80; cutCache.clear();
    out['⑯かすれ0の中間色%'] = m0;
    out['⑯かすれ80の中間色%'] = grey();
    out['⑯かすれ80で残る墨'] = +(ink2()/a0).toFixed(3);
    S.cut.dry=0; cutCache.clear(); }

  /* ⑰ ⭐ 字の色・地の色／白黒の入れ替え（参考は暗い地の白抜き） */
  { S.ink='#111111'; S.bg='#ffffff'; S.inv=0;
    out['⑰そのままの字色'] = inkCol(); out['⑰そのままの地色'] = bgCol();
    S.inv=1;
    out['⑰入れ替えた字色'] = inkCol(); out['⑰入れ替えた地色'] = bgCol();
    S.inv=0; }

  /* ⑮ ⭐⭐ 割れ＝塊で持っていく（縁のさざ波ではない）＝墨が【まとまって】減る */
  { const ink = () => { const c = document.createElement('canvas');
      c.width = c.height = 300; const g2 = c.getContext('2d');
      g2.fillStyle='#fff'; g2.fillRect(0,0,300,300);
      drawGlyph(g2,'G',150,150,240,'#000',null);
      breakOver(g2,'G',150,150,240);
      const d = g2.getImageData(0,0,300,300).data;
      /* 🔴 色だけで数えると【抜いた所も墨】に数えてしまう ──
         destination-out で抜けた画素は alpha=0 だが RGB は 0（黒）のまま。
         ⭐ alpha も一緒に見る。実測：見ないと「割れを入れたら墨が1.365倍に増えた」になる。 */
      let k=0; for(let i=0;i<d.length;i+=4) if(d[i+3] > 128 && d[i] < 128) k++;
      return k; };
    S.cut.brk = 0; cutCache.clear(); const i0 = ink();
    S.cut.brk = 60; S.cut.bn = 5; cutCache.clear(); const i1 = ink();
    out['⑮割れで墨が減る'] = +(i1/i0).toFixed(3);
    S.cut.brk = 100; cutCache.clear(); const i2 = ink();
    out['⑮振り切っても消えない'] = (i2/i0) > 0.15;   /* 字が丸ごと消えない */
    S.cut.brk = 0; cutCache.clear(); }

  /* ⑭ ⭐ 型＝押すとつまみ自体がその値になる／素へ必ず戻れる（2026-08-31） */
  document.querySelector('#segKata button[data-v="sure"]').click(); await wait(350);
  out['⑭型でつまみが動く'] = (+document.getElementById('chip').value === S.cut.chip && S.cut.chip > 0);
  out['⑭型で絵が変わる'] = (glyph('G').length > 1);      /* 毛羽・飛沫が別の囲みとして増える */
  document.querySelector('#segKata button[data-v="su"]').click(); await wait(300);
  out['⑭素へ戻る'] = (S.cut.chip === 0 && S.cut.rough === 0 && S.cut.hair === 0 && S.cut.spat === 0);
  out['⑭素は囲み1つ'] = (glyph('G').length === 1);
  /* ⚠️ つまみを触ったら型の印が外れる（絵と印が食い違わない） */
  set('rough', 70); await wait(200);
  out['⑭触ると印が外れる'] = document.querySelectorAll('#segKata button.on').length === 0;
  /* ⚠️⚠️ ここで【素のまま】にすると、次の⑨（種で変わるか）が
     崩しゼロのせいで落ちる ── 本体ではなく試験の置き方の問題。既定へ戻す。 */
  set('rough', 34); set('fat', 0); set('smooth', 18); await wait(200);

  /* ⑨ 種で崩れ方が変わる（🔴 種の1発目が潰れていると変わらない） */
  const g1 = JSON.stringify(glyph('あ'));
  set('seed', 42); await wait(150);
  out['⑨種で変わる'] = JSON.stringify(glyph('あ')) !== g1;
  const firsts = [3,14,25,36,47].map(k => +rnd(k)().toFixed(3));
  out['⑨種ごとの1発目'] = firsts;
  out['⑨散らばり'] = +(Math.max(...firsts) - Math.min(...firsts)).toFixed(3);
  return out;
});

const NG = [];
const ok = (k, cond) => { console.log((cond?'  ✅ ':'  🔴 ') + k + ' … ' + JSON.stringify(R[k])); if(!cond) NG.push(k); };
console.log('── 噂 UWASA（書体を崩して作る）');
ok('①囲みの数', R['①囲みの数'] > 0);
ok('①点の数', R['①点の数'] > 100);
ok('②変わった字', R['②変わった字'] === R['②全部']);
ok('③太らせの面積比', R['③太らせの面積比'] > 1.1);
ok('③細らせの面積比', R['③細らせの面積比'] < 0.9);
ok('④横に長く', R['④横に長く'][0] > R['④素'][0]*1.3 && R['④横に長く'][1] === R['④素'][1]);
ok('④縦に長く', R['④縦に長く'][1] > R['④素'][1]*1.3 && R['④縦に長く'][0] === R['④素'][0]);
ok('⑥大きくの字数', R['⑥大きくの字数'] === 5);
ok('⑤行間が効く', R['⑤行間が効く'] === true);
ok('⑤版面も伸びる', R['⑤版面も伸びる'] === true);
ok('⑤横縦で入れ替わる', R['⑤横縦で入れ替わる'] === true);
ok('⑤折り返し2の行数', R['⑤折り返し2の行数'] === 3);
ok('⑦はみ出しを数える', R['⑦はみ出しを数える'] === true);
ok('⑦収めたら0', R['⑦収めたら0'] === true);
ok('⑦つまみも動く', R['⑦つまみも動く'] === true);
ok('⑧pathの数', R['⑧pathの数'] >= 5);
/* 🔴 ok() は R[キー] を表示する。R に無いキーで呼ぶと **undefined が出て通る** ＝
   判定は効いていても「動いていないテスト」に見える。⭐ 出す値をそのキーに入れる。 */
R['⑯かすれで汚れない'] = { 素:R['⑯かすれ0の中間色%'], かすれ80:R['⑯かすれ80の中間色%'] };
R['⑱片寄りで一方に寄る'] = R['⑱片寄り0の集中度'] + ' → ' + R['⑱片寄り100の集中度'];
ok('⑳粒立ちは縁を食う', R['⑳粒立ちは縁を食う'] === '1 → ' + R['⑳粒立ちは縁を食う'].split(' → ')[1] && parseFloat(R['⑳粒立ちは縁を食う'].split(' → ')[1]) < 0.8);
ok('⑳芯は残る', R['⑳芯は残る'] > 0.95);
ok('⑳芯0なら芯も食う', R['⑳芯0なら芯も食う'] < 0.8);
ok('㉑地を食っていない', R['㉑地を食っていない'] === 0);
ok('⑲毛羽は折れた形（5点）', R['⑲毛羽は折れた形（5点）'] === true);
ok('⑲飛沫の点数の種類', R['⑲飛沫の点数の種類'].length >= 3);
ok('⑲ムラで出る数が変わる', R['⑲ムラで出る数が変わる'] === true);
ok('⑱片寄りで一方に寄る', R['⑱片寄り100の集中度'] > R['⑱片寄り0の集中度'] + 0.15);
ok('⑯かすれで汚れない', R['⑯かすれ80の中間色%'] <= R['⑯かすれ0の中間色%'] + 0.2);
ok('⑯かすれ80で残る墨', R['⑯かすれ80で残る墨'] < 0.85);
R['⑰白黒が入れ替わる'] = R['⑰そのままの字色'] + '/' + R['⑰そのままの地色']
  + ' → ' + R['⑰入れ替えた字色'] + '/' + R['⑰入れ替えた地色'];
ok('⑰白黒が入れ替わる', R['⑰そのままの字色'] === R['⑰入れ替えた地色'] && R['⑰そのままの地色'] === R['⑰入れ替えた字色']);
ok('⑮割れで墨が減る', R['⑮割れで墨が減る'] > 0.3 && R['⑮割れで墨が減る'] < 0.95);
ok('⑮振り切っても消えない', R['⑮振り切っても消えない'] === true);
ok('⑭型でつまみが動く', R['⑭型でつまみが動く'] === true);
ok('⑭素へ戻る', R['⑭素へ戻る'] === true);
ok('⑭型で絵が変わる', R['⑭型で絵が変わる'] === true);
ok('⑭素は囲み1つ', R['⑭素は囲み1つ'] === true);
ok('⑭触ると印が外れる', R['⑭触ると印が外れる'] === true);
ok('⑨種で変わる', R['⑨種で変わる'] === true);
ok('⑨散らばり', R['⑨散らばり'] > 0.4);
console.log('  ' + (err ? '🔴 例外 ' + err + '件' : '✅ 例外なし'));

/* ⚠️ 検算＝わざと壊したら落ちるか */
const bad = await p.evaluate(() => {
  const g0 = JSON.stringify(glyph('あ'));
  S.cut.rough = 0; S.cut.fat = 0; S.cut.smooth = 0; S.cut.wide = 100; S.cut.tall = 100;
  cutCache.clear();                                       /* 崩しを全部切る */
  return JSON.stringify(glyph('あ')) === g0;
});
console.log('  ── 検算：崩しを全部切ったら字が変わった＝ ' + (!bad)
  + '（ここが false なら つまみが効いていない＝②③が落ちる）');

if(NG.length || err){ console.log('  🔴 落ち：' + NG.join('／')); await b.close(); process.exit(1); }
console.log('  ── 通過（36項目）');
await b.close();
