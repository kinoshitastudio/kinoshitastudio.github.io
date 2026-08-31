/* ══⭐⭐ 靄MOYA → 貼HARI の連動 ══ 2026-09-01
   🔴 木下＝「HARI 連動いこう」。設計＝Obsidian の提案 ⑥
     「MOYA の JSON を読んで、**素材ごとPNG を同じ位置で版面に並べる**」
     ＝1枚に焼かず【バラのまま】渡るので、MOYA で作った空気の中身を HARI で組み直せる。
   見るのは4つ：
     ① MOYA の【HARI へ渡す】JSON が作れる（空気を着せた板＋置き方）
     ② HARI がそれを MOYA のものだと分かって読む
     ③ **置き方（位置・大きさ）が MOYA と1つも食い違わない**
     ④ ⌘Z で読む前に戻る（HARI の控えに入っている）
   使い方: node hari/_test/moya.mjs [PORT]  */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const PORT = process.argv[2] || process.env.PORT || 8098;
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox', '--disable-dev-shm-usage'] });
const wait = ms => new Promise(r => setTimeout(r, ms));
let NG = 0;
const ok = (c, n, x) => { console.log((c ? '  ✅ ' : '  🔴 ') + n + (x != null ? ' … ' + x : '')); if(!c) NG = 1; };
console.log('── 靄MOYA → 貼HARI（空気ごと・置き方ごと渡す）');

/* ① MOYA で【HARI へ渡す】JSON を作る */
const p1 = await b.newPage(); const e1 = [];
p1.on('pageerror', e => e1.push(e.message));
await p1.goto('http://localhost:' + PORT + '/moya/', { waitUntil:'networkidle0' });
await wait(2600);
const moya = await p1.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  /* 空気を強くする＝渡った先で「空気ごと」かどうかが分かる */
  const put = (id, v) => { const e = document.getElementById(id); e.value = v;
    e.dispatchEvent(new Event('input', { bubbles:true })); };
  put('r_haze', 80); put('r_fade', 70);
  LAYERS.forEach(x => x._key = ''); COARSE = 0; render(); await w(700);
  const ボタン = !!document.getElementById('b_tohari');
  /* b_tohari と同じ道で JSON を作る（落とさずに中身だけ見る） */
  const f = outSheet(), W = f.w, H = f.h;
  const keep = COARSE; COARSE = 0; LAYERS.forEach(L => L._key = '');
  const out = { tool:'moya', forHari:true, paper:{ ratio:P.ratio, w:W, h:H }, layers:[] };
  const order = LAYERS.map((L, i) => ({ L, i })).sort((a, b) => zOf(b.L) - zOf(a.L));
  for(const { L } of order){
    if(L.kind === 'adj' || !L.on || !L.img) continue;
    const plate = layerPlate(L, W, H); if(!plate) continue;
    out.layers.push({ name:L.name, x:L.x, y:L.y, rot:L.rot || 0, s:plate.width / W,
      op:L.op == null ? 1 : L.op, img:plate.toDataURL('image/png') });
  }
  COARSE = keep;
  return { txt:JSON.stringify(out), ボタン, 枚:out.layers.length,
           置き方:out.layers.map(l => ({ x:+l.x.toFixed(3), y:+l.y.toFixed(3), s:+l.s.toFixed(3) })) };
});
await p1.close();
ok(moya.ボタン, '⭐ MOYA に［貼HARI へ渡す］がある');
ok(moya.枚 >= 3 && moya.txt.length > 1000,
   '⭐⭐ 空気を着せた板＋置き方の JSON が作れる',
   moya.枚 + ' 枚・' + (moya.txt.length/1024/1024).toFixed(2) + 'MB');

/* ②③④ HARI で読む */
const p2 = await b.newPage(); const e2 = [];
p2.on('pageerror', e => e2.push(e.message));
await p2.goto('http://localhost:' + PORT + '/hari/index.html', { waitUntil:'networkidle0' });
await wait(3000);
const r = await p2.evaluate(async (txt) => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const d = JSON.parse(txt);
  const 分かる = isMoyaJSON(d);
  const 前 = S.pieces.length;
  fromMOYA(d);
  await w(3500);
  const 置き方 = S.pieces.map(p => ({ x:+(p.x/S.board.w).toFixed(3), y:+(p.y/S.board.h).toFixed(3),
    s:+((p.item.bounds.width * p.sc / 100) / S.board.w).toFixed(3) }));
  const 文 = document.getElementById('stat') ? document.getElementById('stat').textContent : '';
  /* ⚠️ 数は【戻す前】に取る（return の中で数えると undo のあとの数になる） */
  const 後 = S.pieces.length;
  const ボタン = !!document.getElementById('bMoya');
  /* ⌘Z で読む前に戻るか */
  undo(); await w(600);
  return { 分かる, 前, 後, 置き方, 文, ボタン, 戻した:S.pieces.length };
}, moya.txt);
ok(r.分かる && r.ボタン, '⭐ HARI が MOYA の JSON だと分かる／［靄MOYA から読む］がある');
ok(r.後 === r.前 + moya.枚, '⭐⭐ MOYA の素材が【1枚ずつ】版面に置かれる',
   r.前 + ' → ' + r.後);
{
  const zure = moya.置き方.map((a, i) => {
    const b2 = r.置き方[i]; if(!b2) return 99;
    return Math.max(Math.abs(a.x-b2.x), Math.abs(a.y-b2.y), Math.abs(a.s-b2.s));
  });
  const max = Math.max(...zure);
  ok(max <= 0.01, '⭐⭐ 置き方（位置・大きさ）が MOYA と食い違わない',
     'ずれ ' + max + '（割合）');
}
ok(/空気ごと/.test(r.文), '⭐ 「空気ごと」渡ったことを言う', r.文.slice(0, 60));
ok(r.戻した === r.前, '⭐ ⌘Z で読む前に戻る（HARI の控えに入っている）',
   r.後 + ' → ' + r.戻した);
ok(e1.length === 0 && e2.length === 0, '例外なし', [...e1, ...e2].join(' | '));
await b.close();
console.log(NG ? '── 落ちた' : '── 通過');
process.exit(NG ? 1 : 0);
