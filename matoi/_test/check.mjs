/* ⭐⭐ 纏 MATOI の回帰テスト ── 2026-08-28
   🔴 見るのは【この道具の芯が出ているか】：
     ⭐⭐ ① 陰を借りる＝ロゴの上に下地の暗さが乗る（乗せただけの絵と違う）
     ⭐⭐ ② しわに沿う＝下地の明暗の傾きでロゴがずれる
     ⭐⭐ ③ 借りたものが【ロゴの外へはみ出さない】（形で切れている）
     ④ 全部 0 なら「ただ貼っただけ」に戻る（つまみが嘘でない）
     ⑤ 四隅を動かすと当て込む場所が変わる／面はいくつでも足せる
     ⑥ 色を差し替えられる（白版・黒版）
     ⑦ 掴み手は出す PNG に混ざらない
   使い方: node matoi/_test/check.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL_ = process.argv[2] || 'http://localhost:8460/matoi/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1400, height:900 });
await p.goto(URL_, { waitUntil:'networkidle0' });
/* ⚠️ 立ち上げで【型と仮ロゴが非同期に入る】＝それが終わってから測る
   （待たずにセットすると、あとから上書きされて前提が崩れる） */
await new Promise(r=>setTimeout(r,2600));
let NG=0; const ok=(c,n,x)=>{ console.log((c?'  ✅ ':'  🔴 ')+n+(x!=null?' … '+x:'')); if(!c) NG=1; };
await p.evaluate(() => { window.__got = [];
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(x){ window.__got.push({ size:x.size, type:x.type }); return oc.call(URL, x); }; });

/* 下地＝左が暗く右が明るい布／ロゴ＝真っ白な四角（借りているかが一目で分かる） */
await p.evaluate(async () => {
  const c = document.createElement('canvas'); c.width=800; c.height=600;
  const q = c.getContext('2d');
  const lg = q.createLinearGradient(0,0,800,0);
  lg.addColorStop(0,'#202020'); lg.addColorStop(1,'#f0f0f0');
  q.fillStyle = lg; q.fillRect(0,0,800,600);
  const bg = new Image(); await new Promise(r => { bg.onload = r; bg.src = c.toDataURL('image/png'); });
  BG = bg; TONEKEY = '';
  const l = document.createElement('canvas'); l.width=400; l.height=200;
  const lq = l.getContext('2d'); lq.fillStyle = '#ffffff'; lq.fillRect(0,0,400,200);
  const li = new Image(); await new Promise(r => { li.onload = r; li.src = l.toDataURL('image/png'); });
  LOGO = li;
  FACES[0].pts = [[0.10,0.35],[0.90,0.35],[0.90,0.65],[0.10,0.65]];
  render();
});
await new Promise(r=>setTimeout(r,600));

/* ロゴの中の明るさを、左端と右端で読む（本体と同じ盤から） */
const read = () => p.evaluate(() => {
  const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
  c.getContext('2d').drawImage(cv, 0, 0);
  const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  const at = (fx, fy) => { const x = Math.round(c.width*fx), y = Math.round(c.height*fy);
    const i = (y*c.width + x)*4; return Math.round(d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114); };
  /* ⚠️ ロゴは【比を保って】面の中央に収まる＝面の端はロゴの外。
     測るのはロゴが確実にある所（実測で 0.275〜0.725 に入る）。 */
  return { 左:at(0.33, 0.50), 右:at(0.67, 0.50), 外上:at(0.16, 0.12), 外下:at(0.84, 0.88) };
});
const A = await read();
ok(A.右 > A.左 + 12, '⭐⭐ 陰を借りている（下地が暗い側ではロゴも暗い）', JSON.stringify(A));

/* ④ 全部 0 なら「ただ貼っただけ」＝ロゴの中は真っ白で左右同じ */
const set = (id, v) => p.evaluate(([i,x]) => { const r=document.getElementById(i); r.value=x;
  r.dispatchEvent(new Event('input',{bubbles:true})); }, [id, String(v)]);
/* ⚠️ 濃さも 1.00 にしてから見る＝既定は 0.95 なので下地がわずかに透ける（仕様どおり）。
   これを入れないと「ただ貼っただけ」との差が 8 だけ残って落ちる。 */
await set('r_sh', 0); await set('r_hi', 0); await set('r_gr', 0); await set('r_warp', 0); await set('r_op', 100);
await new Promise(r=>setTimeout(r,600));
const B = await read();
ok(Math.abs(B.右 - B.左) < 8 && B.左 > 230, '全部 0 なら【ただ貼っただけ】に戻る（つまみが嘘でない）', JSON.stringify(B));

/* ③ 借りたものがロゴの外へはみ出さない＝外は下地のまま（左が暗く右が明るい） */
await set('r_op', 95); await set('r_sh', 120); await new Promise(r=>setTimeout(r,600));
const C = await read();
ok(C.外上 < 90 && C.外下 > 180, '⭐⭐ 借りた陰がロゴの外へはみ出さない', JSON.stringify(C));
await set('r_sh', 75);

/* ② しわに沿う＝傾きがある所でロゴの形がずれる */
const shape = () => p.evaluate(() => {
  const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
  c.getContext('2d').drawImage(cv, 0, 0);
  const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  let h = 2166136261;
  for(let i=0;i<d.length;i+=4*211){ h ^= d[i]; h = Math.imul(h, 16777619); }
  return (h>>>0);
});
await set('r_warp', 0); await new Promise(r=>setTimeout(r,500));
const w0 = await shape();
await set('r_warp', 180); await new Promise(r=>setTimeout(r,500));
const w1 = await shape();
ok(w0 !== w1, '⭐⭐ しわに沿う＝形が変わる', `${w0} → ${w1}`);
await set('r_warp', 55);

/* ⑤ 面 */
const n0 = await p.evaluate(() => FACES.length);
await p.evaluate(() => document.getElementById('b_addFace').click());
await new Promise(r=>setTimeout(r,400));
ok(await p.evaluate(() => FACES.length) === n0 + 1, '面を足せる（箱の正面と側面／胸とタグ）');
await p.evaluate(() => document.getElementById('b_delFace').click());
await new Promise(r=>setTimeout(r,300));

/* 四隅を動かすと当て込む場所が変わる */
const s0 = await shape();
await p.evaluate(() => { FACES[0].pts[0] = [0.05, 0.20]; render(); });
await new Promise(r=>setTimeout(r,400));
ok(await shape() !== s0, '四隅を動かすと当て込む場所が変わる');

/* ⑥ 色を差し替える */
await p.evaluate(() => { FACES[0].pts = [[0.10,0.35],[0.90,0.35],[0.90,0.65],[0.10,0.65]]; render(); });
await new Promise(r=>setTimeout(r,300));
const before = (await read()).右;
await p.evaluate(() => document.querySelectorAll('#s_tint button')[2].click());  /* 黒 */
await new Promise(r=>setTimeout(r,500));
const after = (await read()).右;
ok(after < before - 40, '色を差し替えられる（白版・黒版）', `${before} → ${after}`);
await p.evaluate(() => document.querySelectorAll('#s_tint button')[0].click());

/* ⑦ 掴み手は出す PNG に混ざらない */
await p.evaluate(() => { window.__got = []; document.getElementById('b_png').click(); });
await new Promise(r=>setTimeout(r,1200));
const got = await p.evaluate(() => window.__got);
ok(got.some(x=>/png/.test(x.type)), 'PNG が本当に落ちる', JSON.stringify(got));
ok(await p.evaluate(() => ov.id === 'ov' && ov !== cv), '掴み手は別の板に描いている（PNG に混ざらない）');
/* ⭐⭐ 木下＝「モックアップ集みたいなすでに用意された写真がたくさんあり、
   そこに入れ込みできるロゴをいれると反映される、とかではないんだね」
   ＝ 物が並んでいて、ロゴを入れるだけで次々に見られること。ここを数字で見る。 */
ok(await p.evaluate(() => KATA.length >= 6), '物（型）が並んでいる', await p.evaluate(() => KATA.map(k=>k.name).join('・')));
/* ⚠️ 一覧の最後には【＋ 写真を足す】が1つ居る（2026-09-13）＝物の数＋1 が正しい */
ok(await p.evaluate(() => document.querySelectorAll('#s_kata button').length === KATA.length + 1),
   '一覧が画面に出ている（＋ を1つ含む）');
/* ⭐ 物を押してもロゴは入れたまま／面はその物に合う */
await p.evaluate(() => { LOGO_KEEP = LOGO; useKata(2); });
await new Promise(r=>setTimeout(r,900));
ok(await p.evaluate(() => LOGO === LOGO_KEEP), '物を押してもロゴは入れたまま');
ok(await p.evaluate(() => FACES.length === KATA[2].faces.length), '面はその物に合う',
   await p.evaluate(() => FACES.length + ' 面'));

/* ⭐⭐ ロゴは【比を保って】収まる＝歪まない（モックアップとして致命的な所） */
const fit = await p.evaluate(() => {
  /* 横長のロゴを入れて、縦長の面に置いても比が変わらないことを見る */
  const c = document.createElement('canvas'); c.width = 400; c.height = 100;
  const q = c.getContext('2d'); q.fillStyle = '#000'; q.fillRect(0,0,400,100);
  /* ⚠️ ここは【黒い画素の広がり】で比を測る＝下地が暗いと使えない。
     物が写真になって暗い下地が入るようになったので、明るい下地を自分で用意する。 */
  const bg = document.createElement('canvas'); bg.width = 800; bg.height = 600;
  const bq = bg.getContext('2d'); bq.fillStyle = '#f0f0f0'; bq.fillRect(0, 0, 800, 600);
  setBG(bg);
  /* ⚠️ 直前に物を押しているので、その物のつまみ（紙を敷く・色・明るさ…）が入ったまま。
     ここは【形だけ】を見たいので、素直な値に戻してから測る。 */
  Object.assign(P, { warp:0, sh:0, hi:0, gr:0, col:0, bri:1, con:1, op:1,
                     blend:'normal', tint:'none', fill:false });
  return new Promise(res => {
    const im = new Image();
    im.onload = () => {
      LOGO = im; LOGOKEY++;
      FACES = [{ on:true, pts:[[0.30,0.20],[0.50,0.20],[0.50,0.80],[0.30,0.80]] }];  /* 縦長の面 */
      render();
      const cc = document.createElement('canvas'); cc.width = cv.width; cc.height = cv.height;
      cc.getContext('2d').drawImage(cv, 0, 0);
      const d = cc.getContext('2d').getImageData(0,0,cc.width,cc.height).data;
      let x0=1e9,x1=-1,y0=1e9,y1=-1;
      for(let y=0;y<cc.height;y+=2) for(let x=0;x<cc.width;x+=2){
        const i=(y*cc.width+x)*4;
        if(d[i]<60 && d[i+1]<60 && d[i+2]<60){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
      }
      res({ w:x1-x0, h:y1-y0, 比:((x1-x0)/Math.max(1,(y1-y0))).toFixed(2) });
    };
    im.src = c.toDataURL('image/png');
  });
});
ok(Math.abs(+fit.比 - 4) < 0.8, '⭐⭐ ロゴは比を保って収まる（歪まない）', '4.00 のはずが ' + fit.比);

/* ⚠️ ここにあった「Tシャツが布に見えるか」の3本（胸の張り・縫い目・しわが部位ごと）は
   2026-08-29 に落とした ── 木下が【描いた型8つを削除】して、物が写真だけになったため。
   ⭐ 何を見ていたかは memory（project_matoi）に残してある：
     布に見えるかは形ではなく「縫い目と厚み／胸の張り／落ち感／しわを部位ごとに集める」。
   ⭐ 下地を描き直すことになったら、この3本を戻す（道具＝fold/folds/cloth/seam は残してある）。 */

/* ══⭐⭐ 白い地のロゴ ── 2026-08-28 ══
   木下＝「svg で入れているのに、線だけでなく背景も出ている。png の背景透過も同じでは？」
   ⭐ 道具は透明をちゃんと通していた（地は素材の側）。それでも道具の側で抜く。
   ⚠️ 見るのは2つ：**地が乗らないこと**と、**切れば元のまま出ること**（つまみが嘘でない）。 */
const cut = await p.evaluate(async () => {
  const bg = document.createElement('canvas'); bg.width = 800; bg.height = 600;
  const bq = bg.getContext('2d');
  const g = bq.createLinearGradient(0, 0, 800, 0);
  g.addColorStop(0, '#404040'); g.addColorStop(1, '#c0c0c0');
  bq.fillStyle = g; bq.fillRect(0, 0, 800, 600);
  const bi = new Image(); await new Promise(r => { bi.onload = r; bi.src = bg.toDataURL('image/png'); });
  /* ⚠️ 下地を替えると【盤の縦横も変わる】＝先に描いて盤を確定してから面を作る
     （これを忘れて面が正方形にならず、測る所がロゴの外になった） */
  BG = bi; BGKEY++; TONEKEY = ''; render();
  const c = document.createElement('canvas'); c.width = 200; c.height = 200;
  const q = c.getContext('2d');
  q.fillStyle = '#ffffff'; q.fillRect(0, 0, 200, 200);          /* 白い地 */
  q.fillStyle = '#111'; q.beginPath(); q.arc(100, 100, 60, 0, 7); q.fill();
  const im = new Image(); await new Promise(r => { im.onload = r; im.src = c.toDataURL('image/png'); });
  const h = 0.30 * cv.width / cv.height;                        /* 面を正方形に＝面の隅＝ロゴの隅 */
  FACES = [{ on:true, pts:[[0.35,0.30],[0.65,0.30],[0.65,0.30+h],[0.35,0.30+h]] }];
  const read = () => {
    const cc = document.createElement('canvas'); cc.width = cv.width; cc.height = cv.height;
    cc.getContext('2d').drawImage(cv, 0, 0);
    const d = cc.getContext('2d').getImageData(0, 0, cc.width, cc.height).data;
    const x = Math.round(cc.width*0.358), y = Math.round(cc.height*(0.30 + h*0.03));
    const i = (y*cc.width + x)*4;
    return Math.round(d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114);
  };
  P.cut = true;  setLOGO(im, 'test.png'); render(); const 抜く = read();
  P.cut = false; setLOGO(im, 'test.png'); render(); const そのまま = read();
  P.cut = true;  setLOGO(im, 'test.png'); render(); const もどす = read();
  return { 抜く, そのまま, もどす };
});
/* ⚠️ 白は 255 のままではない＝陰を借りるので少し暗い（実測 223）。境目は余裕を取る */
ok(cut.そのまま > 200 && cut.抜く < 150 && cut.もどす === cut.抜く,
   '⭐⭐ 白い地のロゴを入れても地が乗らない（「そのまま入れる」で元にも戻せる）', JSON.stringify(cut));

/* ══⭐⭐ 写真の物 ── 2026-08-28 ══
   木下＝「モックアップのものとかかなりあるので画像を引っ張ってくる方が早い。あとはなじませるだけ」
   ＝ 描いた物と【同じ道】を通ること（押せば下地になり、面もその物のものが入る）。
   ⚠️ 比は写真そのものから決まる（型に書いた ratio ではない）。 */
const mock = await p.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 600; c.height = 400;
  const q = c.getContext('2d');
  const g = q.createLinearGradient(0, 0, 600, 0);
  g.addColorStop(0, '#303030'); g.addColorStop(1, '#e8e8e8');
  q.fillStyle = g; q.fillRect(0, 0, 600, 400);
  const n0 = KATA.length;
  KATA.push({ id:'mock_test', name:'写真の試し', ratio:1,
    faces:[[[0.25,0.35],[0.75,0.35],[0.75,0.65],[0.25,0.65]]], photo:c.toDataURL('image/png') });
  renderKata();
  useKata(KATA.length - 1);
  await new Promise(r => setTimeout(r, 1200));
  return { 比:+(P.ratio).toFixed(2), 面:FACES.length, 下地:BG && BG.tagName,
           /* ⚠️ 一覧の最後には【＋ 写真を足す】が1つ居る（2026-09-13）＝物の数＋1 が正しい */
           一覧:document.querySelectorAll('#s_kata button').length === KATA.length + 1
                && KATA.length === n0 + 1 };
});
ok(mock.下地 === 'IMG' && Math.abs(mock.比 - 1.5) < 0.02 && mock.一覧,
   '⭐⭐ 写真の物も同じ道で使える（一覧に並ぶ・比は写真から決まる）', JSON.stringify(mock));

/* ══⭐⭐ 動画も置ける ── 2026-08-29 ══
   木下＝「今ロゴしか掲載できない状態だけど画像と画像も載せれるようにして」
   ⭐ 画像は元から置けた（入口の言葉が「ロゴ」だっただけ）。足したのは動画。
   ⭐ 見るのは3つ：置けること／面の上でコマが進むこと／**mp4 が本当に落ちること**。
   ⚠️ sample.mp4 は「黒い四角がコマごとに横へ動く」だけの2秒＝絵が変わったかを画素で見られる。 */
/* ⚠️ パスに日本語が入ると URL は %E5… に化ける＝戻さないと開けない（黙って読まれない） */
const vpath = decodeURIComponent(new URL('./sample.mp4', import.meta.url).pathname);
await (await p.$('#f_logo')).uploadFile(vpath);
await new Promise(r => setTimeout(r, 1800));
const v0 = await p.evaluate(() => ({ 種:LOGO && LOGO.tagName, 幅:assetSize(LOGO)[0],
  秒:LOGO && LOGO.duration ? +LOGO.duration.toFixed(1) : 0,
  出す欄:el('vidout').style.display !== 'none' }));
ok(v0.種 === 'VIDEO' && v0.幅 > 0 && v0.出す欄,
   '⭐⭐ 動画も置ける（動かす欄と出す欄も一緒に出る）', JSON.stringify(v0));

const vshape = () => p.evaluate(() => {
  const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
  c.getContext('2d').drawImage(cv, 0, 0);
  const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  let h = 2166136261;
  for(let i=0;i<d.length;i+=4*97){ h ^= d[i]; h = Math.imul(h, 16777619); }
  return (h>>>0);
});
const f0 = await vshape();
await p.evaluate(() => { const r = el('r_time'); r.value = 600;
  r.dispatchEvent(new Event('input', { bubbles:true })); });
await new Promise(r => setTimeout(r, 1200));
const f1 = await vshape();
ok(f0 !== f1, '⭐ コマを送ると面の上の絵が変わる', `${f0} → ${f1}`);

/* ⭐⭐ 動画の地も抜ける ── 2026-08-29 ══
   木下＝「動画だとなじませにくいか？」── 画面を見たら【白い地が四角く残っていた】。
   ⭐ なじまない原因は、しわでも陰でもなく地。四角い白が乗っている限り物の上には見えない。
   ⚠️ 動画は1コマ目で色を決めて、あとは毎コマ同じ色を抜く（毎コマ判定するとちらつく）。 */
const vcut = await p.evaluate(() => {
  const h = 0.30 * cv.width / cv.height;
  FACES = [{ on:true, pts:[[0.35,0.30],[0.65,0.30],[0.65,0.30+h],[0.35,0.30+h]] }];
  const read = () => {
    render();
    const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
    c.getContext('2d').drawImage(cv, 0, 0);
    const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    const x = Math.round(c.width*0.358), y = Math.round(c.height*(0.30 + h*0.03));
    const i = (y*c.width + x)*4;
    return Math.round(d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114);
  };
  const v = LOGO_SRC;
  P.cut = true;  setLOGO(v, 'v.mp4'); const 抜く = read();
  P.cut = false; setLOGO(v, 'v.mp4'); const そのまま = read();
  P.cut = true;  setLOGO(v, 'v.mp4'); const もどす = read();
  return { 抜く, そのまま, もどす, 抜く色: VCUT ? [VCUT.r,VCUT.g,VCUT.b].join(',') : 'なし' };
});
ok(vcut.そのまま > 200 && vcut.抜く < 150 && vcut.もどす === vcut.抜く,
   '⭐⭐ 動画の白い地も抜ける（切れば元のまま）', JSON.stringify(vcut));

/* ⭐⭐ mp4 が本当に落ちる。⚠️ 1コマずつ焼くので、試験は小さい盤・24コマ/秒で回す */
/* ⚠️ 仕掛けるのは【出す直前】＝入れた動画の分と混ざらない
   （大きさで区別しようとしたら、絵が軽くなった日に落ちた。混ざらない所で見るのが正しい） */
await p.evaluate(() => { window.__mp4 = [];
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(x){ if(x && x.type === 'video/mp4') window.__mp4.push(x.size);
    return oc.call(URL, x); };
  P.long = 320; document.querySelectorAll('#s_fps button')[0].click(); render(); });
await p.evaluate(() => el('b_mp4').click());
for(let i = 0; i < 90; i++){
  await new Promise(r => setTimeout(r, 700));
  if(!/やめる/.test(await p.evaluate(() => el('b_mp4').textContent))) break;
}
const vout = await p.evaluate(() => ({ 落ちた:window.__mp4, 知らせ:el('stat').textContent }));
ok(vout.落ちた.length > 0 && /mp4 を出した/.test(vout.知らせ),
   '⭐⭐ 動画（mp4）が本当に落ちる', JSON.stringify(vout));

/* ══⭐⭐ 道具の棚（選ぶ・隅・ペン）── 2026-08-29 ══
   木下＝「ロゴの位置が違う。ツールパネルに選択を追加させ、ボード上で動かせるように」
        「サイドパネルでスライダーもいいが、直接ボードの四角で触って調整もできるように」
        「曲線部分は SAKUJI 同様アンカー追加のペンを用意し、アンカーの近くで＋表記させパスを追加」
   ⭐ 見るのは4つ：面ごと動く／盤で回る／辺に点が増える／点を押すとカーブになる。
   ⚠️ 触っているのは【つまみと同じ値】＝盤で回すとスライダーも動く（2つの真実を作らない）。 */
await p.evaluate(() => { useKata(0); });
await new Promise(r => setTimeout(r, 1200));
const scr = (u, v) => p.evaluate(([u2,v2]) => { const r = stage.getBoundingClientRect();
  return [r.left + V.x + u2*cv.width*V.z, r.top + V.y + v2*cv.height*V.z]; }, [u,v]);
const drag = async (a, b2) => { const A = await scr(...a), B = await scr(...b2);
  await p.mouse.move(A[0],A[1]); await p.mouse.down();
  await p.mouse.move((A[0]+B[0])/2,(A[1]+B[1])/2); await p.mouse.move(B[0],B[1]);
  await p.mouse.up(); await new Promise(r => setTimeout(r, 500)); };
const facePts = () => p.evaluate(() => JSON.stringify(FACES[0].pts.map(q => q.map(v => +v.toFixed(3)))));

await p.evaluate(() => document.querySelector('#tools button[data-t="move"]').click());
const mv0 = await facePts();
const ctr = await p.evaluate(() => { const q = FACES[0].pts;
  return [(q[0][0]+q[2][0])/2, (q[0][1]+q[2][1])/2]; });
await drag(ctr, [ctr[0]+0.08, ctr[1]+0.05]);
ok(await facePts() !== mv0, '⭐⭐ 選ぶ＝面ごと掴んで動かせる', mv0 + ' → ' + await facePts());

const hitR = await p.evaluate(() => 0.045 / Math.max(0.4, V.z / 1.2));
const cor = await p.evaluate(() => FACES[0].pts[1]);
const rl0 = await p.evaluate(() => (FACES[0].rot || {}).roll || 0);
await drag([cor[0]+hitR*1.5, cor[1]-hitR*1.5], [cor[0]+hitR*2.0, cor[1]+hitR*1.2]);
const rl1 = await p.evaluate(() => (FACES[0].rot || {}).roll || 0);
ok(rl0 !== rl1 && +(await p.evaluate(() => document.getElementById('r_roll').value)) === rl1,
   '⭐⭐ 盤の上で回せる（スライダーも同じ値になる）', `${rl0}° → ${rl1}°`);

/* ══⭐⭐ 隅でも【四角ごと】動かせる ── 2026-09-13 ══
   木下＝「四角をボード上で自分で自由に移動できるようにして」。
   🔴 隅は1つずつ動かせていたのに、**四角ごと運ぶ道が無かった**（中を掴むと盤がパンしていた）。
   ⚠️ 当て込みは四隅がずれた所から始まる＝まず四角ごと物の上へ運んでから隅で詰める。
   ⭐ 見るのは3つ：中を掴むと四角ごと動く／隅は1つずつのまま／外を掴めばパンは残っている。 */
await p.evaluate(() => document.querySelector('#tools button[data-t="corner"]').click());
{
  const before = await facePts();
  const c2 = await p.evaluate(() => { const q = FACES[0].pts;
    return [(q[0][0]+q[2][0])/2, (q[0][1]+q[2][1])/2]; });
  await drag(c2, [c2[0]+0.09, c2[1]+0.06]);
  const after = await facePts();
  const B4 = JSON.parse(before), A4 = JSON.parse(after);
  const moved = A4.every((q, i) => Math.abs(q[0]-B4[i][0] - (A4[0][0]-B4[0][0])) < 0.01
                                && Math.abs(q[1]-B4[i][1] - (A4[0][1]-B4[0][1])) < 0.01);
  ok(before !== after && moved,
     '⭐⭐ 隅でも【四角ごと】動かせる（4隅が同じだけ平行に動く）', before + ' → ' + after);

  /* ⚠️ 1つずつ動かす方は殺していない（隅を掴んだら その隅だけ） */
  const b1 = JSON.parse(await facePts());
  const c1 = await p.evaluate(() => FACES[0].pts[0]);
  await drag(c1, [c1[0]+0.06, c1[1]+0.04]);
  const a1 = JSON.parse(await facePts());
  ok(JSON.stringify(a1[0]) !== JSON.stringify(b1[0])
     && JSON.stringify(a1.slice(1)) === JSON.stringify(b1.slice(1)),
     '⭐ 隅は【1つずつ】のまま（他の3隅は動かない）', JSON.stringify(a1));

  /* ⚠️ 四角の外を掴めば盤が動く＝パンを奪っていない */
  const pv0 = await p.evaluate(() => [Math.round(V.x), Math.round(V.y)]);
  const far = await p.evaluate(() => {                 /* 四角から離れた所を選ぶ */
    for(const q of [[0.03,0.03],[0.97,0.03],[0.03,0.97],[0.97,0.97],[0.5,0.02]])
      if(!inFace(FACES[0], q[0], q[1])) return q;
    return [0.02,0.02]; });
  await drag(far, [far[0]+0.10, far[1]+0.06]);
  const pv1 = await p.evaluate(() => [Math.round(V.x), Math.round(V.y)]);
  ok(pv0[0] !== pv1[0] || pv0[1] !== pv1[1],
     '⭐ 四角の外を掴めば【盤が動く】（パンを奪っていない）', pv0 + ' → ' + pv1);
}

await p.evaluate(() => document.querySelector('#tools button[data-t="pen"]').click());
const pn0 = await p.evaluate(() => (FACES[0].clip || []).length);
const edge = await p.evaluate(() => { const cp = FACES[0].clip;
  return [(cp[0].x+cp[1].x)/2, (cp[0].y+cp[1].y)/2]; });
const E = await scr(...edge); await p.mouse.click(E[0], E[1]);
await new Promise(r => setTimeout(r, 500));
const pn1 = await p.evaluate(() => (FACES[0].clip || []).length);
ok(pn1 === pn0 + 1, '⭐⭐ ペン＝辺を押すと点が増える', `${pn0} → ${pn1}`);

const P2 = await scr(...(await p.evaluate(() => { const q = FACES[0].clip[1]; return [q.x, q.y]; })));
await p.mouse.click(P2[0], P2[1]); await new Promise(r => setTimeout(r, 500));
ok(await p.evaluate(() => !!FACES[0].clip[1].r), '⭐ 点を押すと 角⇄カーブ が入れ替わる');

/* ⭐ 切り抜きが本当に効く＝パスの外は下地のまま（角丸で収まる） */
const clipped = await p.evaluate(async () => {
  FACES = [{ on:true, pts:[[0.2,0.2],[0.8,0.2],[0.8,0.8],[0.2,0.8]] }];
  const c = document.createElement('canvas'); c.width = 200; c.height = 200;
  const q = c.getContext('2d'); q.fillStyle = '#111'; q.fillRect(0,0,200,200);
  const im = new Image(); await new Promise(r => { im.onload = r; im.src = c.toDataURL('image/png'); });
  P.cut = false; setLOGO(im, 'k.png'); P.fill = false; render();
  const read = () => { const cc = document.createElement('canvas');
    cc.width = cv.width; cc.height = cv.height;
    cc.getContext('2d').drawImage(cv, 0, 0);
    const d = cc.getContext('2d').getImageData(0,0,cc.width,cc.height).data;
    /* ⚠️ 置いたものは【比を保って】収まる＝面の隅は空いている。
       測るのは「ロゴが確かにある所」かつ「切ると消える所」＝左上の切り欠きの中。 */
    const x = Math.round(cc.width*0.26), y = Math.round(cc.height*0.36), i = (y*cc.width + x)*4;
    return Math.round(d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114); };
  const 切る前 = read();
  /* 左上だけ大きく削ったパスにする */
  FACES[0].clip = [{x:0.65,y:0.2,r:false},{x:0.8,y:0.2,r:false},
                   {x:0.8,y:0.8,r:false},{x:0.2,y:0.8,r:false},{x:0.2,y:0.65,r:false}];
  render();
  return { 切る前, 切った後: read() };
});
ok(clipped.切った後 > clipped.切る前 + 40,
   '⭐⭐ パスの外は切れる（角丸のような形に収まる）', JSON.stringify(clipped));

/* ══⭐⭐ 影を落とす ── 2026-09-13 ══
   木下＝「ドロップシャドウなども付けれるか？ サインなどは svg や画像で渡す想定としても
     ないと不自然だ」。
   ⭐⭐ 他のつまみは全部【借りる】側。これだけは【こちらが作る】＝切り文字は壁から浮いていて、
     その影は下の写真に写っていないので借りようがない。
   ⭐ 見るのは4つ：既定は今までの絵のまま／効かせるとロゴの【外】が暗くなる／
     向きで影の行き先が変わる／物を押し直すと消える（印刷ものに影が残らない）。 */
{
  const shot = () => p.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 300;
    c.height = Math.round(300 * cv.height / cv.width);
    c.getContext('2d').drawImage(cv, 0, 0, c.width, c.height);
    const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let s = 0; for(let i = 0; i < d.length; i += 4) s = (s*31 + d[i] + d[i+1] + d[i+2]) >>> 0;
    return s; });
  /* ⭐ 影は【ロゴの外】に出るもの＝盤ぜんぶの明るさで見る（1点で測ると
     ロゴの中に当たって「変わらない」になる。⚠️ 実際1回それで落ちた） */
  const around = () => p.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 400;
    c.height = Math.round(400 * cv.height / cv.width);
    c.getContext('2d').drawImage(cv, 0, 0, c.width, c.height);
    const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let s = 0, n = 0;
    for(let i = 0; i < d.length; i += 4){ s += d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114; n++; }
    return +(s/n).toFixed(2); });
  await p.evaluate(() => { useKata(0); });
  await new Promise(r => setTimeout(r, 1200));
  await p.evaluate(() => { P.dsh = 0; syncKnobs(); render(); });
  await new Promise(r => setTimeout(r, 300));
  const off = await shot(), offL = await around();
  ok(+(await p.evaluate(() => document.getElementById('r_dsh').value)) === 0,
     '⭐⭐ 影の既定は 0（新しいつまみで今までの絵を変えない）');
  await p.evaluate(() => { P.dsh = 0.8; P.dsd = 3; P.dsb = 1; P.dsa = 135; syncKnobs(); render(); });
  await new Promise(r => setTimeout(r, 400));
  const on = await shot(), onL = await around();
  ok(on !== off && onL < offL - 0.5,
     '⭐⭐ 影を落とすと盤が暗くなる（ロゴの外に本当に影が落ちている）', offL + ' → ' + onL);
  await p.evaluate(() => { P.dsa = 315; render(); });
  await new Promise(r => setTimeout(r, 300));
  ok(await shot() !== on, '⭐ 影の向きを変えると絵が変わる');
  /* 🔴 物を押し直したら影は消える（印刷ものに切り文字の影が残らない） */
  await p.evaluate(() => { useKata(1); });
  await new Promise(r => setTimeout(r, 1400));
  ok(await p.evaluate(() => P.dsh) === 0
     && +(await p.evaluate(() => document.getElementById('r_dsh').value)) === 0,
     '🔴🔴 物を押し直すと影は消える（棒も戻る）');
}

/* ══⭐⭐ 一覧の【＋】で版を足せる ── 2026-09-13 ══
   木下＝「追加する項目をプラスなどで版を追加できるようにしてくれるとさらに触りやすくなりそうだ」。
   ⭐ 下の「自分の写真を使う」は下地を差し替えるだけで一覧に残らなかった＝押し比べができない。 */
{
  const n0 = await p.evaluate(() => KATA.length);
  ok(await p.evaluate(() => !!document.getElementById('b_kataAdd')),
     '⭐ 一覧のいちばん後ろに【＋】がある');
  await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 600; c.height = 400;
    const q = c.getContext('2d'); q.fillStyle = '#bbb'; q.fillRect(0,0,600,400);
    const im = new Image(); await new Promise(r => { im.onload = r; im.src = c.toDataURL('image/png'); });
    KATA.push({ id:'own_test', name:'＋ 試し', ratio:1,
      faces:[[[0.3,0.35],[0.7,0.35],[0.7,0.6],[0.3,0.6]]], fill:false, knobs:null, img:im });
    useKata(KATA.length - 1); renderKata();
  });
  await new Promise(r => setTimeout(r, 900));
  ok(await p.evaluate(() => KATA.length) === n0 + 1
     && await p.evaluate(() => [...document.querySelectorAll('#s_kata button')]
          .some(b => b.textContent.trim() === '＋ 試し')),
     '⭐⭐ 足した版が【一覧に残る】（押せば何度でも戻れる）');
  ok(await p.evaluate(() => !!BG && (BG.naturalWidth || BG.width) === 600),
     '⭐ 足した版がそのまま下地になる（読み直していない）');
}

/* ══⭐⭐ 2026-09-13 の4つ ══
   木下＝「もうひとつ入れる場合にこんがらがるな」（面が2つあるのに置くものは1つ）／
     「地の色も選べるといいな、カラーピッカーで」／
     「点線からはみ出したのは基本みえなくなるように」／「コマンドzで戻れるようにもして」 */
{
  const shot = () => p.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 200;
    c.height = Math.round(200 * cv.height / cv.width);
    c.getContext('2d').drawImage(cv, 0, 0, c.width, c.height);
    const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let h = 2166136261;
    for(let i = 0; i < d.length; i += 4){ h ^= d[i]; h = Math.imul(h, 16777619); }
    return h >>> 0; });

  /* ⭐⭐ 面ごとに別のものを置ける（＝共通のものは触らない） */
  const f2 = await p.evaluate(async () => {
    document.getElementById('b_addFace').click();
    const c = document.createElement('canvas'); c.width = 400; c.height = 200;
    const q = c.getContext('2d'); q.fillStyle = '#c00'; q.fillRect(0,0,400,200);
    const im = new Image(); await new Promise(r => { im.onload = r; im.src = c.toDataURL('image/png'); });
    const fc = FACES[1];
    fc.asset = im; fc.assetKey = 1; fc.edge = '#cc0000'; fc.assetName = '赤'; fc._c = null;
    renderFaces(); render();
    return { 面:FACES.length, 面2は別:!!FACES[1].asset, 面1は共通:!FACES[0].asset,
             行:[...document.querySelectorAll('#faces button')].map(b => b.textContent.trim()) };
  });
  ok(f2.面 === 2 && f2.面2は別 && f2.面1は共通,
     '⭐⭐ 面ごとに【別のものを置ける】（共通のものは触らない）', JSON.stringify(f2.行));

  /* ⭐ 敷く紙の色＝つまんだら「選ぶ」に移る（触ったのに効かない、を作らない） */
  const fc2 = await p.evaluate(() => {
    setFill(true);
    const c = document.getElementById('c_fill'); c.value = '#00ff88';
    c.dispatchEvent(new Event('input', { bubbles:true }));
    return { fillAuto:P.fillAuto, fillCol:P.fillCol, fill:P.fill }; });
  ok(fc2.fillAuto === false && fc2.fillCol === '#00ff88' && fc2.fill === true,
     '⭐⭐ 紙の色をカラーピッカーで選べる（つまむと【選ぶ】へ移る）', JSON.stringify(fc2));

  /* ⭐⭐ 点線の外は切る。⚠️ はみ出す正体は「しわに沿う」なので、強くしてから見る */
  await p.evaluate(() => { Object.assign(P, { warp:2.0 }); FACES.forEach(f => f._c = null);
    setClipFace(false); render(); });
  await new Promise(r => setTimeout(r, 400));
  const noclip = await shot();
  await p.evaluate(() => { setClipFace(true); FACES.forEach(f => f._c = null); render(); });
  await new Promise(r => setTimeout(r, 400));
  const clipped2 = await shot();
  ok(noclip !== clipped2 && await p.evaluate(() => P.clipFace) === true,
     '⭐⭐ 点線（面）の外は切れる／既定は切る', noclip + ' → ' + clipped2);

  /* ⌘Z：戻る・進む・🔴 控えが【写し】であること */
  const u = await p.evaluate(() => {
    Object.assign(P, { warp:0.55 }); FACES.forEach(f => f._c = null); render();
    const before = JSON.stringify(FACES[0].pts);
    snap();
    FACES[0].pts = [[0.1,0.1],[0.6,0.1],[0.6,0.5],[0.1,0.5]]; FACES[0]._c = null; render();
    const moved = JSON.stringify(FACES[0].pts);
    undo(); const back = JSON.stringify(FACES[0].pts);
    redo(); const fwd = JSON.stringify(FACES[0].pts);
    return { before, moved, back, fwd }; });
  ok(u.moved !== u.before && u.back === u.before, '⭐⭐ ⌘Z で1つ戻る', u.before + ' → ' + u.back);
  ok(u.fwd === u.moved, '⭐ ⌘⇧Z で1つ進む');
  const cp = await p.evaluate(() => {
    snap(); const want = JSON.stringify(FACES[0].pts);
    FACES[0].pts[0][0] = 0.999; FACES[0]._c = null; render();   /* 控えの中身を直に触る形 */
    undo(); return { 戻り:JSON.stringify(FACES[0].pts), 期待:want }; });
  ok(cp.戻り === cp.期待,
     '🔴🔴 ⌘Z の控えは【写し】＝あとで書き換えても汚れない', cp.戻り);
}

/* ══⭐⭐ 作品の色が【そのまま】出せるか ── 2026-09-13 ══
   木下＝「背景色を地に入れるとそれに合わない」「この色がのらないなあ」。
   ⭐ 地つきの1枚（濃い緑に白い字）を入れたときに見えた2つ：
     ① 面に紙を敷くと、余った所だけ別の色になって【帯】に見える
        → 読んだ時に紙の色を【置いたものの地の色】にそろえる
     ② 光・色を借りる＋濃さ 0.95 のぶん、作品の色がズレて出る（実測 #3a6b45 → #59745b）
        → 「作品の色をそのまま出す」で3つだけ戻すと #3a6b45 ぴったりに戻る */
{
  await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 1800; c.height = 385;
    const q = c.getContext('2d'); q.fillStyle = '#3a6b45'; q.fillRect(0,0,1800,385);
    q.fillStyle = '#fff'; q.font = 'bold 90px sans-serif'; q.textBaseline = 'middle';
    q.fillText('TBT', 420, 200);
    const im = new Image(); await new Promise(r => { im.onload = r; im.src = c.toDataURL('image/png'); });
    setLOGO(im, 'green.png'); render();
  });
  await new Promise(r => setTimeout(r, 900));
  const paper = await p.evaluate(() => ({ 棒:document.getElementById('c_fill').value, 値:P.fillCol }));
  ok(paper.棒 === '#3a6b45' && paper.値 === '#3a6b45',
     '⭐⭐ 置くものを読むと【紙の色】がその地の色になる（帯にならない）', JSON.stringify(paper));

  await p.evaluate(() => { setFill(true); document.querySelector('#s_fillm button[data-v="0"]').click(); });
  await new Promise(r => setTimeout(r, 400));
  ok(await p.evaluate(() => P.fillCol) === '#3a6b45',
     '⭐ 「色を選ぶ」に移してもピッカーと値が食い違わない');

  const read = () => p.evaluate(() => {
    const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
    c.getContext('2d').drawImage(cv, 0, 0);
    const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    const q = FACES[0].pts;
    const X = Math.round((q[0][0]*0.85 + q[1][0]*0.15) * c.width);
    const Y = Math.round((q[0][1] + (q[3][1]-q[0][1])*0.5) * c.height);
    const i = (Y*c.width + X)*4;
    return '#' + [d[i],d[i+1],d[i+2]].map(v => v.toString(16).padStart(2,'0')).join('');
  });
  await p.evaluate(() => { Object.assign(P, { sh:0.75, hi:0.30, gr:0.30, col:0.30, op:0.95 });
    FACES.forEach(f => f._c = null); syncKnobs(); render(); });
  await new Promise(r => setTimeout(r, 450));
  const before = await read();
  await p.evaluate(() => document.getElementById('b_truecol').click());
  await new Promise(r => setTimeout(r, 500));
  const after = await read();
  ok(before !== '#3a6b45' && after === '#3a6b45',
     '⭐⭐ 「作品の色をそのまま出す」で素材の色ぴったりに戻る', before + ' → ' + after);
  ok(await p.evaluate(() => P.sh) > 0.5,
     '⚠️ 陰・質感は残る（物に嵌まって見えるのはそちらの仕事）');

  /* 🔴🔴 ⌘Z が「効かない」に見えていた正体＝同じ絵を何枚も積んでいた */
  const u = await p.evaluate(() => {
    UNDO.length = 0; REDO.length = 0;
    snap(); snap(); snap();
    const 空打ち = UNDO.length;
    const 前 = JSON.stringify(FACES[0].pts);
    snap(); FACES[0].pts = [[0.1,0.1],[0.6,0.1],[0.6,0.5],[0.1,0.5]]; FACES[0]._c = null; render();
    snap(); snap();
    undo();
    return { 空打ち, 戻り:JSON.stringify(FACES[0].pts), 前 };
  });
  ok(u.空打ち === 1, '⭐⭐ 同じ絵は控えに積まない（空打ちで増えない）', '3回押して ' + u.空打ち + ' 枚');
  ok(u.戻り === u.前, '🔴🔴 ⌘Z は1回で【必ず絵が変わる】（同じ控えは飛ばす）');
}

/* ══⭐⭐ 置くものの【大きさ・位置】── 2026-09-13 ══
   木下＝「以前入れた画像を大きくしたり小さくしたりすることができないね」。
   ⭐ 置くものは面いっぱいに比を保って入るだけで、面の中での大きさ・位置を触れなかった。
   ⚠️ 面ごとの値＝面を切り替えたら棒もその面に戻る（回すのと同じ扱い）。 */
{
  /* ⚠️ 測るものをはっきりさせる＝【真っ白な四角】を置く（字だと画素が少なすぎて数えられない） */
  await p.evaluate(async () => {
    useKata(0); setFill(false);
    const c = document.createElement('canvas'); c.width = 400; c.height = 200;
    const q = c.getContext('2d'); q.fillStyle = '#ffffff'; q.fillRect(0,0,400,200);
    const im = new Image(); await new Promise(r => { im.onload = r; im.src = c.toDataURL('image/png'); });
    P.cut = false; setLOGO(im, 'white.png'); FACES.forEach(f => f._c = null); render();
  });
  /* ⚠️ 立ち上げ直後に測ると【まだ置くものが乗っていない】＝1枚目が 0 になる（1回踏んだ） */
  await new Promise(r => setTimeout(r, 2200));
  const inFaceInk = () => p.evaluate(() => {
    const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
    c.getContext('2d').drawImage(cv, 0, 0);
    const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    const q = FACES[0].pts.map(([x,y]) => [x*c.width, y*c.height]);
    const inq = (x,y) => { let s = false;
      for(let i = 0, j = 3; i < 4; j = i++){ const [xi,yi] = q[i], [xj,yj] = q[j];
        if((yi>y) !== (yj>y) && x < (xj-xi)*(y-yi)/(yj-yi)+xi) s = !s; } return s; };
    let n = 0, sy = 0, m = 0;
    for(let y = 0; y < c.height; y += 2) for(let x = 0; x < c.width; x += 2){
      if(!inq(x,y)) continue; const i = (y*c.width+x)*4;
      const l = d[i]*.299 + d[i+1]*.587 + d[i+2]*.114;
      if(l > 200){ n++; sy += y; m++; } }        /* 白いロゴなので明るい方を数える */
    return { 量:n, 重心:m ? Math.round(sy/m) : 0 };
  });
  const set = async (id, v) => { await p.evaluate((i,x) => { const e = document.getElementById(i);
    e.value = x; e.dispatchEvent(new Event('input',{bubbles:true})); }, id, v);
    await new Promise(r => setTimeout(r, 450)); };
  const a100 = await inFaceInk();
  await set('r_zoom', 40);  const a40 = await inFaceInk();
  await set('r_zoom', 250); const a250 = await inFaceInk();
  await set('r_zoom', 100);
  ok(a40.量 < a100.量 * 0.5 && a250.量 > a100.量 * 1.2,
     '⭐⭐ 置くものの【大きさ】が効く', `40%:${a40.量} 100%:${a100.量} 250%:${a250.量}`);
  const c0 = await inFaceInk();
  await set('r_oy', -25); const c1 = await inFaceInk();
  await set('r_oy', 0);
  ok(c1.重心 < c0.重心 - 10, '⭐ 【縦にずらす】が効く', c0.重心 + ' → ' + c1.重心);
  /* ⚠️ 面ごとの値＝切り替えたら棒も戻る（2つの真実を作らない） */
  await p.evaluate(() => { document.getElementById('b_addFace').click(); });
  await new Promise(r => setTimeout(r, 600));
  await set('r_zoom', 180);
  const two = await p.evaluate(() => ({ 面1:FACES[0].zoom == null ? 1 : FACES[0].zoom, 面2:FACES[1].zoom }));
  await p.evaluate(() => { cur = 0; renderFaces(); syncRot(); drawHandles(); });
  await new Promise(r => setTimeout(r, 400));
  const bar = await p.evaluate(() => document.getElementById('r_zoom').value);
  ok(two.面1 === 1 && Math.abs(two.面2 - 1.8) < 0.01 && bar === '100',
     '⭐⭐ 大きさは【面ごと】＝面を切り替えると棒もその面に戻る', JSON.stringify(two) + ' 棒:' + bar);
  /* ⭐ 大きくしても点線の外へは出ない */
  await p.evaluate(() => { cur = 1; renderFaces(); syncRot(); });
  await set('r_zoom', 300);
  const out = await p.evaluate(() => {
    const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
    c.getContext('2d').drawImage(cv, 0, 0);
    const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    const q = FACES[1].pts.map(([x,y]) => [x*c.width, y*c.height]);
    const inq = (x,y) => { let s = false;
      for(let i = 0, j = 3; i < 4; j = i++){ const [xi,yi] = q[i], [xj,yj] = q[j];
        if((yi>y) !== (yj>y) && x < (xj-xi)*(y-yi)/(yj-yi)+xi) s = !s; } return s; };
    const mnx = Math.min(...q.map(a=>a[0])), mxx = Math.max(...q.map(a=>a[0]));
    const mny = Math.min(...q.map(a=>a[1])), mxy = Math.max(...q.map(a=>a[1]));
    let n = 0;
    for(let y = Math.max(0,mny-50); y < Math.min(c.height,mxy+50); y += 2)
      for(let x = Math.max(0,mnx-50); x < Math.min(c.width,mxx+50); x += 2){
        if(inq(x,y)) continue; const i = (y*c.width+x)*4;
        if(d[i]*.299 + d[i+1]*.587 + d[i+2]*.114 > 210) n++; }
    return n; });
  ok(out === 0, '⭐ 300% にしても【点線の外へは出ない】（切れている）', '外に出た画素 ' + out);
  await p.evaluate(() => { document.getElementById('b_delFace').click(); });
  await new Promise(r => setTimeout(r, 400));
}

ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close(); process.exit(NG);
