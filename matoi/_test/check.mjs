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
ok(await p.evaluate(() => document.querySelectorAll('#s_kata button').length === KATA.length),
   '一覧が画面に出ている');
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
           一覧:document.querySelectorAll('#s_kata button').length === n0 + 1 };
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

ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close(); process.exit(NG);
