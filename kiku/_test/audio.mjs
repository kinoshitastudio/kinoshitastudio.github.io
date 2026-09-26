// 聴 KIKU の確かめ：本物の音を鳴らしながら枠をなぞる（CDP）。静か→大きい→中 の12秒
// node --experimental-websocket kiku/_test/audio.mjs <url> <wav>
import { spawn } from 'node:child_process';
const [url, wav] = process.argv.slice(2), port = 9336;
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${port}`, '--user-data-dir=/tmp/kiku-cdp', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const wait = new Map();
const send = (m, p = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const out = []; const check = (n, ok, info = '') => { out.push(ok); console.log((ok ? '✅ ' : '❌ ') + n + (info ? '  ' + info : '')); };
try {
  let list; for (let i = 0; i < 40; i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); break; } catch { await sleep(150); } }
  ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && wait.has(d.id)) { wait.get(d.id)(d); wait.delete(d.id); } };
  await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('DOM.enable'); await send('Page.navigate', { url }); await sleep(3000);
  await ev(`localStorage.clear(); $('where').children[1].click(); 0`);          // どこでも置く（字の形に左右されずに数える）
  const doc = await send('DOM.getDocument'); const q = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '#file' });
  await send('DOM.setFileInputFiles', { nodeId: q.result.nodeId, files: [wav] }); await sleep(800);
  check('曲を入れると「鳴らす」が押せる', await ev(`!$('bPlay').disabled`), await ev(`$('song').textContent`));
  // 鳴らす前になぞっても置けない
  const fr = await ev(`(() => { const r = cv.getBoundingClientRect(); const k = r.width / view.w; return { x: r.left + (FX - view.x) * k, y: r.top + (FY - view.y) * k, s: F * k }; })()`);
  const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
  async function scribble(row) { const y = fr.y + fr.s * row; await mouse('mousePressed', fr.x + 5, y); for (let k = 0; k <= 30; k++) { await mouse('mouseMoved', fr.x + 5 + (fr.s - 10) * k / 30, y + Math.sin(k) * 6); await sleep(12); } await mouse('mouseReleased', fr.x + fr.s - 5, y); }
  await scribble(0.5);
  check('鳴らす前は置けない', (await ev('cells.length')) === 0);
  await ev(`$('bPlay').click(); 0`); await sleep(2200);
  await scribble(0.2); const c1 = await ev('cells.length'), n1 = await ev('[...new Set(cells.map(c=>c.n))].join(",")');
  await sleep(3200);                                  // 大きい所（4〜8秒）へ
  await scribble(0.5); const n2 = await ev('[...new Set(cells.slice(' + c1 + ').map(c=>c.n))].join(",")');
  await sleep(3500);                                  // 中くらい（8〜12秒）
  await scribble(0.8); const c3 = await ev('cells.length');
  check('静かな所は細かい升（res が大きい）', /32|24/.test(n1), `静か: res ${n1}`);
  check('大きい所は粗い升（res が小さい）', /8|12/.test(n2), `大きい: res ${n2}`);
  await sleep(3500);
  check('曲が終わると完成になる', await ev('done'), await ev(`$('stat').textContent`));
  const c4 = await ev('cells.length'); await scribble(0.3);
  check('完成したら置けない', (await ev('cells.length')) === c4);
  check('これまでに1枚並ぶ', (await ev(`JSON.parse(localStorage.getItem('kiku.gallery')||'[]').length`)) === 1);
  const rec = await ev('recordText().join(" | ")'); check('記録に日付・曲名・res が入る', /res \d+–\d+/.test(rec), rec);
  // JSON 往復
  const snap = await ev('JSON.stringify(snapshot())'); const px = `(() => { const c = render(1, {x:0,y:0,w:SW,h:SH}); return Array.from(c.getContext('2d').getImageData(0,0,SW,SH).data.filter((v,i)=>i%16===0)).join(','); })()`;
  const A = await ev(px); await ev(`newPiece(true); 0`); await ev(`restore(${snap}).then(()=>0)`); const B = await ev(px);
  check('JSONで開き直すと同じ絵', A === B, `升 ${c3}→${await ev('cells.length')}`);
} catch (e) { console.error(e); out.push(false); } finally { chrome.kill(); const bad = out.filter(x => !x).length; console.log(bad ? `\n${bad}件 だめ` : `\n全部 通った（${out.length}件）`); process.exit(bad ? 1 : 0); }
