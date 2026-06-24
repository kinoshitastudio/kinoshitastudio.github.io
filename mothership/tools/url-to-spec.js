/* ===========================================================
   Mothership — URL → スペック抽出（Option A / ヘッドレス）
   #12「参照→スペック」の本命UX：ユーザーはURLを渡すだけ。
   relayが裏のヘッドレスブラウザでページを開き、算出スタイル+実寸+重なり順を採取。

   一回だけセットアップ：
     cd mothership
     npm i playwright
     npx playwright install chromium

   使い方：
     node tools/url-to-spec.js "https://example.com"            # → 標準出力にJSON
     node tools/url-to-spec.js "https://example.com" --w 390    # モバイル幅で採取
     node tools/url-to-spec.js "https://example.com" --out refs/example.json
   =========================================================== */
const fs = require('fs');
const path = require('path');

// --- 引数 ---
const args = process.argv.slice(2);
const url = args.find(a => /^https?:\/\//.test(a));
const getOpt = (k, d) => { const i = args.indexOf(k); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const W = parseInt(getOpt('--w', '1440'), 10);
const H = parseInt(getOpt('--h', '900'), 10);
const OUT = getOpt('--out', null);
if (!url) { console.error('Usage: node tools/url-to-spec.js "<URL>" [--w 1440] [--h 900] [--out refs/x.json]'); process.exit(1); }

// --- ページ内で走る採取関数（ref-capture.js と同一ロジック） ---
function capture(W, H) {
  const WANT = ['position','display','flexDirection','justifyContent','alignItems','gap',
    'padding','backgroundColor','backgroundImage','color','fontFamily','fontSize','fontWeight',
    'lineHeight','letterSpacing','textAlign','borderRadius','border','boxShadow','opacity',
    'zIndex','backdropFilter','mixBlendMode','textTransform'];
  const clean = (v) => v && !['none','normal','auto','0px','rgba(0, 0, 0, 0)','static','0','start','rgb(0, 0, 0)'].includes(v);
  const nodes = [];
  function walk(el, depth) {
    if (depth > 14) return;
    for (const ch of el.children) {
      const r = ch.getBoundingClientRect();
      const cs = getComputedStyle(ch);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) { walk(ch, depth + 1); continue; }
      if (r.width >= 6 && r.height >= 6 && r.top < H * 1.15 && r.bottom > -40) {
        const n = { tag: ch.tagName.toLowerCase(), x: Math.round(r.left), y: Math.round(r.top),
          w: Math.round(r.width), h: Math.round(r.height), depth };
        for (const k of WANT) { const v = cs[k]; if (clean(v)) n[k] = v; }
        if (ch.tagName === 'IMG') n.src = ch.currentSrc || ch.src;
        if (ch.tagName === 'VIDEO') n.src = ch.currentSrc || (ch.querySelector('source') || {}).src || '(video)';
        const txt = [...ch.childNodes].filter(t => t.nodeType === 3).map(t => t.textContent.trim()).join(' ').trim();
        if (txt) n.text = txt.slice(0, 140);
        nodes.push(n);
      }
      walk(ch, depth + 1);
    }
  }
  walk(document.body, 0);
  return nodes;
}

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (e) { console.error('Playwright が未インストールです。`cd mothership && npm i playwright && npx playwright install chromium` を実行してください。'); process.exit(1); }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  } catch (e) { /* networkidleに達しないサイトもある＝続行 */ }
  await page.waitForTimeout(1500); // 遅延読み込み/アニメ初期化を少し待つ

  const nodes = await page.evaluate(capture, W, H);
  const spec = { url, viewport: { w: W, h: H }, capturedAt: new Date().toISOString(), count: nodes.length, nodes };
  const json = JSON.stringify(spec, null, 2);

  if (OUT) {
    const p = path.resolve(__dirname, '..', OUT);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, json);
    console.error('✅ wrote ' + nodes.length + ' nodes → ' + OUT);
  } else {
    process.stdout.write(json + '\n');
    console.error('✅ captured ' + nodes.length + ' nodes');
  }
  await browser.close();
})();
