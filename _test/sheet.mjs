/* ⭐⭐ モバイルの「掴んで伸ばすパネル」の回帰テスト（2026-08-21 新設・道具ぜんぶ横断）
   木下「モバイルで道具を見ていたら、いくつかはパネルを掴んで伸ばしたりできない」

   🔴 見るのは「掴み手が出ている」ではない。【掴んだら本当に高さが変わったか】。
      2026-08-20 に「1pxもスクロールせずテストが通った」前科があるので、必ず実際に引く。
   ⭐ パネルの id は道具ごとに違う（#panel / #rack / #ctl）＝名前で決め打ちにしない。
   ⭐ PC で掴み手が出ないこと（＝PCは無傷）も毎回見る。

   使い方: node _test/sheet.mjs <ポート> <道具> [道具...]
   ⚠️ 大きさを変えたら【開き直す】。実機の向き変更は orientationchange で作り直されるが、
      setViewport では飛ばないので、変えっぱなしで測ると嘘の結果になる（1回それで誤検出した）。 */
import puppeteer from '/Users/kinoshitatakahiro/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const PORT = process.argv[2] || '8390';
const TOOLS = process.argv.slice(3);
if(!TOOLS.length){ console.log('🔴 道具が指定されていない'); process.exit(1); }

const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader'] });
const ng = [];
const line = (ok, t, s) => { console.log(`  ${ok?'✅':'🔴'} ${s}`); if(!ok) ng.push(`${t}／${s}`); };
/* パネルを探す式は本体と同じ順（#panel → #rack → #ctl） */
const PICK = `(document.getElementById('panel')||document.getElementById('rack')||document.getElementById('ctl'))`;

for(const t of TOOLS){
  console.log(`\n── ${t}`);
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e=>errs.push(e.message));
  await p.setViewport({ width:390, height:844, deviceScaleFactor:2, isMobile:true, hasTouch:true });
  try{
    await p.goto(`http://localhost:${PORT}/${t}/?v=${Date.now()}`, { waitUntil:'networkidle0', timeout:40000 });
  }catch(e){ line(false, t, `開けない: ${e.message}`); await p.close(); continue; }
  await new Promise(r=>setTimeout(r,2400));
  await p.evaluate(()=>{ try{ localStorage.clear(); }catch(_){} });

  const m0 = await p.evaluate(`(()=>{ const pn = ${PICK}, g = document.getElementById('sheetGrip');
    if(!pn) return { none:true };
    const pb = pn.getBoundingClientRect();
    const st = document.getElementById('stage')||document.getElementById('wrap')||document.querySelector('canvas');
    return { grip:!!g, gh: g?Math.round(g.getBoundingClientRect().height):0,
             ph:Math.round(pb.height), ptop:Math.round(pb.top), pbot:Math.round(pb.bottom),
             sh: st?Math.round(st.getBoundingClientRect().height):0, ih:innerHeight };
  })()`);
  if(m0.none){ line(false, t, 'パネル（#panel/#rack/#ctl）が見つからない'); await p.close(); continue; }
  line(m0.grip, t, `掴み手が出ている（${m0.gh}px）`);
  line(Math.abs(m0.pbot - m0.ih) <= 3, t, `パネルが画面の底にある（下端 ${m0.pbot} / 画面 ${m0.ih}）`);
  line(m0.ptop > 8, t, `上に盤がある（パネル ${m0.ptop}〜${m0.pbot}）`);

  if(m0.grip){
    const g1 = await p.evaluate(()=>{ const r=document.getElementById('sheetGrip').getBoundingClientRect();
      return { x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2) }; });
    await p.mouse.move(g1.x,g1.y); await p.mouse.down();
    for(let i=1;i<=8;i++){ await p.mouse.move(g1.x, g1.y - i*28); await new Promise(r=>setTimeout(r,30)); }
    await p.mouse.up(); await new Promise(r=>setTimeout(r,400));
    const m1 = await p.evaluate(`(()=>{ const pn = ${PICK}, pb = pn.getBoundingClientRect();
      const st = document.getElementById('stage')||document.getElementById('wrap')||document.querySelector('canvas');
      return { ph:Math.round(pb.height), pbot:Math.round(pb.bottom), ih:innerHeight,
               sh: st?Math.round(st.getBoundingClientRect().height):0 }; })()`);
    line(m1.ph > m0.ph + 80, t, `⭐引いたらパネルが伸びた（${m0.ph} → ${m1.ph}px）`);
    line(Math.abs(m1.pbot - m1.ih) <= 3, t, `伸ばしても下端が画面の底のまま（${m1.pbot} / ${m1.ih}）`);
    /* ⚠️ 盤が元から画面いっぱいの道具（three.js が style をじかに書く hori/hori2/kumi）は
       もともとパネルが盤の上に乗る形＝縮まないのが正しい。 */
    if(m0.sh >= m0.ih - 3) console.log(`  ➖ 盤は元から画面いっぱい（${m1.sh}px）＝パネルがその上に乗る形（元の見え方どおり）`);
    else line(m1.sh > 0 && m1.sh + m1.ph <= m1.ih + 6, t, `⭐盤も一緒に縮んだ（盤 ${m1.sh} ＋ パネル ${m1.ph} ≦ ${m1.ih}）`);

    const before = m1.ph;
    const g2 = await p.evaluate(()=>{ const r=document.getElementById('sheetGrip').getBoundingClientRect();
      return { x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2) }; });
    await p.mouse.click(g2.x,g2.y); await new Promise(r=>setTimeout(r,400));
    const after = await p.evaluate(`Math.round(${PICK}.getBoundingClientRect().height)`);
    line(Math.abs(after - before) > 30, t, `タップで段が切り替わる（${before} → ${after}px）`);
    const kept = await p.evaluate(()=>{ try{ return Object.keys(localStorage).some(k=>/panelH/.test(k)); }catch(_){ return false; } });
    line(kept, t, '触った高さが残る（次からその高さで開く）');
  }
  line(errs.length === 0, t, errs.length ? `JSエラー: ${errs.slice(0,2).join(' / ')}` : 'JSエラーなし');
  await p.close();

  /* ── PC では掴み手が出ない（PCは無傷）── ⚠️ 必ず開き直して測る */
  const q = await b.newPage(); const errs2 = [];
  q.on('pageerror', e=>errs2.push(e.message));
  await q.setViewport({ width:1440, height:900, deviceScaleFactor:1 });
  await q.goto(`http://localhost:${PORT}/${t}/?v=${Date.now()}`, { waitUntil:'networkidle0' });
  await new Promise(r=>setTimeout(r,2000));
  const pc = await q.evaluate(`(()=>{ const pn = ${PICK};
    return { grip: !!document.getElementById('sheetGrip'),
             pw: Math.round(pn.getBoundingClientRect().width) }; })()`);
  line(!pc.grip, t, `PC では掴み手が出ない（パネル幅 ${pc.pw}px）`);
  line(errs2.length === 0, t, errs2.length ? `PC で JSエラー: ${errs2[0]}` : 'PC も JSエラーなし');
  await q.close();
}
console.log(ng.length ? `\n🔴 だめ ${ng.length}件\n  ${ng.join('\n  ')}` : '\n✅ 掴んで伸ばすパネルは全部通った');
await b.close();
process.exit(ng.length?1:0);
