/* ⭐⭐ 音なしで動かす・動画の書き出し（2026-09-14）
   木下＝「音がなくても他のみたいに動きを出すことをできないか？アニメーションの書き出しがほしい」
   見るもの：
   ・自動で動かすと【画面が変わる】／止めると【元の姿に1画素も違わず戻る】
   ・焼いたコマ：u=0 と u=0.5 は違う／⭐u=0 と u=1（1周後）は同じ＝継ぎ目なし
   ・4つの動き方がどれも動く
   ・mp4 と PNG連番が本当に出る（大きさ・コマ数）／書き出したあと元に戻る
   使い方: node hari/_test/loop.mjs <URL> */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1300, height:900, deviceScaleFactor:1 });
await p.goto(process.argv[2], { waitUntil:'networkidle0' });
await new Promise(r => setTimeout(r, 3800));
await p.evaluate(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 4000));
const R = await p.evaluate(async () => {
  const w = ms => new Promise(r=>setTimeout(r,ms));
  const out = {};
  if(typeof loopStart !== 'function') return { 見つからない:1 };
  const cv = document.querySelector('canvas');
  const shot = () => cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
  const diff = (a,c)=>{let n=0;for(let i=0;i<a.length;i+=4){if(Math.abs(a[i]-c[i])>6||Math.abs(a[i+1]-c[i+1])>6||Math.abs(a[i+2]-c[i+2])>6)n++;}return n;};

  /* ⭐ 「元の姿」は【焼いた絵】で比べる。⚠️ 画面には選択枠・ガイド（uiLayer）が乗るので、
     音で描いた直後はそこが青く 3千画素ほど違う（書き出しには入らない層）＝絵そのものを見る */
  const still = () => { const W0 = 500, H0 = Math.round(500 * S.board.h / S.board.w) & ~1;
    const c = document.createElement('canvas'); c.width = W0; c.height = H0;
    const pc0 = document.createElement('canvas'); pc0.width = W0; pc0.height = H0; pc0.setAttribute('hidpi','off');
    const sc0 = new paper.PaperScope(); sc0.setup(pc0); paper.activate(); artLayer.activate();
    const keepOn = AUD.on; AUD.on = 0;
    vBakeFrame(c.getContext('2d'), W0, H0, W0 / S.board.w, 0, sc0, pc0, true);
    AUD.on = keepOn; sc0.remove(); paper.activate(); artLayer.activate();
    return c.getContext('2d').getImageData(0,0,W0,H0).data; };  /* ⚠️ 既存の音の道は【1度でも音で描くと 3千画素ほど戻らない】（2026-09-14 時点・この機能より前から。
     控えの版で同じ値が出るのを確かめた）。⭐ ここでは「この機能が【それ以上】ずらさないか」を見る
     ＝1度音で描いて戻した姿を基準にする。 */
  AUD.on = 1; AUD.bass = .5; AUD.mid = .4; AUD.high = .3; render(); await w(200);
  AUD.on = 0; AUD.bass = AUD.mid = AUD.high = 0; render(); await w(300);
  const base = shot(); const baseStill = still();
  /* 画面：動く／止めると戻る */
  $('loopPlay').click(); await w(700);
  const a1 = shot(); await w(450); const a2 = shot();
  out.画面が動く = Math.max(diff(base,a1), diff(a1,a2));
  $('loopOff').click(); await w(400);
  out.止めると戻る = diff(baseStill, still());
  /* 焼いたコマ */
  const q = vPlan();
  const W = 400, H = Math.round(400 * S.board.h / S.board.w) & ~1, sc = W / S.board.w;
  const mk = () => { const c = document.createElement('canvas'); c.width=W; c.height=H; return c; };
  const pc = mk(); pc.setAttribute('hidpi','off');
  const scope = new paper.PaperScope(); scope.setup(pc); paper.activate(); artLayer.activate();
  AUD.on = 1; AUD.loop = null;
  const bake = u => { const c = mk(); vBakeFrame(c.getContext('2d'), W, H, sc, u, scope, pc, true); return c.getContext('2d').getImageData(0,0,W,H).data; };
  for(const k of ['beat','wave','breath','tick']){
    LOOP.kind = k;
    const f0 = bake(0), fq = bake(0.37), f1 = bake(1);
    out['動く_' + k] = diff(f0, fq);
    out['継ぎ目_' + k] = diff(f0, f1);
  }
  LOOP.kind = 'beat';
  scope.remove(); paper.activate(); artLayer.activate();
  AUD.on = 0; AUD.bass = AUD.mid = AUD.high = 0; render(); await w(300);
  out.焼いたあと画面が元 = diff(baseStill, still());
  /* 本当に書き出す（dl を横取り） */
  const got = [];
  window.dl = (blob, name) => got.push({ name, size: blob.size, type: blob.type });
  $('loopSec').value = 10; $('loopSec').dispatchEvent(new Event('input'));
  $('vLong').value = '1080'; $('vFps').value = '24'; $('vLoops').value = 1; $('vLoops').dispatchEvent(new Event('input'));
  const q2 = vPlan(); out.予定 = q2.W + 'x' + q2.H + ' ' + q2.total + 'コマ';
  $('vFmt').value = 'mp4'; await vExport();
  $('vFmt').value = 'png'; await vExport();
  out.出たもの = got.map(g => g.name.replace(/\d{10,}/,'T') + ':' + Math.round(g.size/1024) + 'KB').join(' / ');
  out.統計 = document.getElementById('stat').textContent;
  await w(300);
  out.書き出し後も元 = diff(baseStill, still()); out.書き出し後_AUDon = AUD.on;
  return out;
});
await b.close();
console.log(JSON.stringify(R, null, 1));
let ng = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if(!c) ng++; };
ok(R.画面が動く > 200, '自動で動かすと画面が動く（' + R.画面が動く + '）');
ok(R.止めると戻る === 0, '止めると元の姿（' + R.止めると戻る + '）');
for(const k of ['beat','wave','breath','tick']){
  ok(R['動く_' + k] > 100, k + ' が動く（' + R['動く_' + k] + '）');
  ok(R['継ぎ目_' + k] < 60, k + ' は1周で元に戻る＝継ぎ目なし（' + R['継ぎ目_' + k] + '）');
}
ok(R.焼いたあと画面が元 === 0, '焼いたあと画面が元（' + R.焼いたあと画面が元 + '）');
ok(/\.mp4/.test(R.出たもの || ''), 'mp4 が出る（' + R.出たもの + '）');
ok(/_seq\.zip/.test(R.出たもの || ''), 'PNG連番が出る');
ok(R.書き出し後_AUDon === 0, '書き出し後は音の道が止まっている'); ok(R.書き出し後も元 === 0, '書き出し後も元（' + R.書き出し後も元 + '）');
ok(errs.length === 0, '例外なし ' + errs.join(' | '));
process.exit(ng ? 1 : 0);
