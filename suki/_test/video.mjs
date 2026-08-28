/* ⭐ 動かす・動画で書き出す ── 霧 KIRI 2026-08-28
   木下＝「盤面の書き出しや、アニメーション、動画書き出しなども他道具に揃えて」
   見るのは：① 再生で絵が動く ② 止めたら元の絵に戻る（値を戻し忘れない）
            ③ 頭と尻が同じ絵（継ぎ目なしループ） ④ 動画が本当に落ちる ⑤ 撮ったあと元に戻る */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL_ = process.argv[2] || 'http://localhost:8460/suki/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width:1400, height:900 });
await p.goto(URL_, { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,1500));
let NG=0; const ok=(c,n,x)=>{ console.log((c?'  ✅ ':'  🔴 ')+n+(x!=null?' … '+x:'')); if(!c) NG=1; };
await p.evaluate(() => { window.__got = [];
  const oc = URL.createObjectURL;
  URL.createObjectURL = function(x){ window.__got.push({ size:x.size, type:x.type }); return oc.call(URL, x); }; });

const set = (id, v) => p.evaluate(([i,x]) => { const r=document.getElementById(i); r.value=x;
  r.dispatchEvent(new Event('input',{bubbles:true})); }, [id, String(v)]);
await set('r_long', 600); await set('r_pitch', 20);
await new Promise(r=>setTimeout(r,700));

/* 絵の指紋（本体と同じ scatter から取る） */
const sig = () => p.evaluate(() => { const d = lay(); let h = 2166136261;
  for(let i=0;i<Math.min(3000,d.n);i++){ h ^= (d.xs[i]*53)|0; h = Math.imul(h,16777619); h ^= (d.ys[i]*47)|0; h = Math.imul(h,16777619); }
  return (h>>>0); });
const before = await sig();
const keep = await p.evaluate(() => ({ ang:P.ang, pitch:P.pitch, grow:P.grow }));

/* ① 再生で動く */
await p.evaluate(() => document.getElementById('b_play').click());
await new Promise(r=>setTimeout(r,700));
const during = await sig();
ok(during !== before, '再生すると絵が動く', `${before} → ${during}`);
ok(await p.evaluate(() => P.pitch >= 14), '再生の間は升目を粗くして軽く出す', await p.evaluate(() => P.pitch));

/* ② 止めたら元に戻る */
await p.evaluate(() => document.getElementById('b_play').click());
await new Promise(r=>setTimeout(r,600));
const back = await p.evaluate(() => ({ ang:P.ang, pitch:P.pitch, grow:P.grow }));
ok(JSON.stringify(back) === JSON.stringify(keep), '止めたら値が元に戻る', JSON.stringify(back));
ok(await sig() === before, '止めたら絵も元に戻る');

/* ③ 頭と尻が同じ絵（継ぎ目なし） */
const at = u => p.evaluate(x => { setPhase(x, { ang:P.ang, pitch:P.pitch, grow:P.grow }); }, u);
const base = await p.evaluate(() => ({ ang:P.ang, pitch:P.pitch, grow:P.grow }));
const headSig = await p.evaluate(b => { setPhase(0, b); const d = lay(); let h=2166136261;
  for(let i=0;i<Math.min(3000,d.n);i++){ h ^= (d.xs[i]*53)|0; h=Math.imul(h,16777619); } return (h>>>0); }, base);
const tailSig = await p.evaluate(b => { setPhase(1, b); const d = lay(); let h=2166136261;
  for(let i=0;i<Math.min(3000,d.n);i++){ h ^= (d.xs[i]*53)|0; h=Math.imul(h,16777619); } return (h>>>0); }, base);
ok(headSig === tailSig, '⭐ 頭（u=0）と尻（u=1）が同じ絵＝継ぎ目なしで繰り返せる', `${headSig} / ${tailSig}`);
await p.evaluate(b => { anRestore(b); render(); }, base);

/* ④ 動画（PNG連番で確かめる＝どの端末でも通る道） */
await p.evaluate(() => { document.querySelectorAll('#s_vfmt button')[1].click(); });
await set('r_vsec', 10); await set('r_vfps', 8);
await p.evaluate(() => { window.__got = []; document.getElementById('b_video').click(); });
await new Promise(r=>setTimeout(r,9000));
const got = await p.evaluate(() => window.__got);
ok(got.some(x => /zip/.test(x.type)), '動画（PNG連番）が本当に落ちる', JSON.stringify(got));

/* ⑤ 撮ったあと元に戻る */
const after = await p.evaluate(() => ({ ang:P.ang, pitch:P.pitch, grow:P.grow }));
ok(JSON.stringify(after) === JSON.stringify(base), '撮ったあと値が元に戻る', JSON.stringify(after));
ok(errs.length === 0, 'JSエラーが出ない', errs.join(' / '));
await b.close(); process.exit(NG);
