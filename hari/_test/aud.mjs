/* ⭐⭐ 音の効かせ方（2026-08-27）
   木下＝「音のビートの動きだがもっと他の動きも追加できるか？」
   　　　「配置している画像に対してはアニメーションがついていない。色を変えるとか、
   　　　その他で何らかアニメーションをいくつかつけて」

   ⭐ これまでは【大きさ・字間・揺れ】が**同時に**効くだけだった
     ＝どれを効かせるか選べるようにして、字に4つ・**図に5つ**足した。
   ⚠️ 足した分は既定 0＝**これまでと1画素も変わらない**（分岐ごと通らない）。
   ⚠️ 本物の音は headless で鳴らせない＝音の値を直接入れて「効くか」を見る。
   ⚠️ 「揺れ（行）」は張る・札に効く（沿うでは効かない）＝ここでは数えない。
   使い方: node hari/_test/aud.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--allow-file-access-from-files','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1300, height:900, deviceScaleFactor:1 });
await p.goto(process.argv[2], { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3800));
const R = await p.evaluate(async () => {
  const w = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  const cv = document.querySelector('canvas');
  const shot = () => cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
  const diff = (a,c)=>{let n=0;for(let i=0;i<a.length;i+=4){if(Math.abs(a[i]-c[i])>6)n++;}return n;};
  /* ⚠️ 本物の音は headless で鳴らせない＝音の値を直接入れて「効くか」を見る */
  /* ⭐ 図にも音が効くか見るため、画像を1つ置いてから測る */
  {
    const c = document.createElement('canvas'); c.width=160; c.height=120;
    c.getContext('2d').fillStyle='#2b6cf6'; c.getContext('2d').fillRect(0,0,160,120);
    const blob = await new Promise(r=> c.toBlob(r,'image/png'));
    const n0 = S.pieces.length;
    takeFile(new File([blob],'a.png',{type:'image/png'}));
    for(let i=0;i<40 && S.pieces.length===n0;i++) await w(100);
    S.sel = { kind:null, i:null }; syncPanel(); render(); await w(400);
  }
  const base = shot();
  AUD.on = 1; AUD.bass = 0.8; AUD.mid = 0.6; AUD.high = 0.5;
  ['mSize','mTrack','mRot','mFlow','mWave','mCol','mPiece','mPRot','mPMove','mPFade','mPCol']
    .forEach(k => AUD[k] = 0);
  render(); await w(300);
  out.ぜんぶ0 = diff(base, shot());
  const one = async (k) => { AUD[k] = 120; render(); await w(300);
    const d = diff(base, shot()); AUD[k] = 0; render(); await w(200); return d; };
  out.大きさ = await one('mSize');
  out.字間   = await one('mTrack');
  out.揺れ   = await one('mRot');
  out.流れる = await one('mFlow');
  out.波打つ = await one('mWave');
  out.明滅   = await one('mCol');
  out.図が跳ねる = await one('mPiece');
  out.図が回る   = await one('mPRot');
  out.図が揺れる = await one('mPMove');
  out.図が明滅   = await one('mPFade');
  out.図に色     = await one('mPCol');
  AUD.on = 0; render(); await w(300);
  out.止めると戻る = diff(base, shot());
  return out;
});
await b.close();
let ng = 0;
const ok = (c,n,note)=>{ console.log(`  ${c?'✅':'🔴'} ${n}${note?'  '+note:''}`); if(!c) ng++; };
console.log('── ⭐⭐ 音の効かせ方（字に4つ・図に5つ足した）');
ok(errs.length === 0, 'JSエラーが出ない', errs.length + '件' + (errs[0] ? ' → ' + errs[0] : ''));
ok(R.ぜんぶ0 === 0, '⚠️ ぜんぶ0＝音が鳴っていても【1画素も変わらない】', R.ぜんぶ0 + '画素');
ok(R.大きさ > 3000, '⭐ 大きさが脈打つ', R.大きさ + '画素');
ok(R.字間 > 3000, '⭐ 字間が開く', R.字間 + '画素');
ok(R.流れる > 3000, '⭐⭐ 【流れる】＝字が経路を走る', R.流れる + '画素');
ok(R.波打つ > 3000, '⭐⭐ 【波打つ】＝経路そのものが揺れる', R.波打つ + '画素');
ok(R.明滅 > 3000, '⭐⭐ 【明滅】＝字の色が明るく暗く', R.明滅 + '画素');
ok(R.図が跳ねる > 5000, '⭐⭐ 図が跳ねる（置いた画像も動く）', R.図が跳ねる + '画素');
ok(R.図が回る > 5000, '⭐ 図が回る', R.図が回る + '画素');
ok(R.図が揺れる > 5000, '🔴 図が揺れる（置いたあとに足さないと上書きされて効かない）', R.図が揺れる + '画素');
ok(R.図が明滅 > 5000, '🔴 図が明滅（「1から引く」式だと1に張り付いて効かなかった）', R.図が明滅 + '画素');
ok(R.図に色 > 5000, '⭐⭐ 図に色がつく（音の色の膜を重ねる）', R.図に色 + '画素');
ok(R.止めると戻る < 6000, '⭐ 止めれば元の姿（音は描くときだけ掛かる）', R.止めると戻る + '画素');
process.exit(ng ? 1 : 0);
