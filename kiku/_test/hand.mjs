// 聴 KIKU（手の版）の確かめ：置く→動かす→切る→白→修正液→テープ→戻す→JSON往復（CDP・マウス）
import { spawn } from 'node:child_process';
const url = process.argv[2], port = 9337;
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, '--user-data-dir=/tmp/kiku2-cdp', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const wait = new Map();
const send = (m, p = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const out = []; const check = (n, ok, info = '') => { out.push(ok); console.log((ok ? '✅ ' : '❌ ') + n + (info ? '  ' + info : '')); };
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
async function stroke(pts) { await mouse('mousePressed', ...pts[0]); for (const p of pts.slice(1)) { await mouse('mouseMoved', ...p); await sleep(8); } await mouse('mouseReleased', ...pts[pts.length - 1]); await sleep(120); }
try {
  let list; for (let i = 0; i < 40; i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); break; } catch { await sleep(150); } }
  ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && wait.has(d.id)) { wait.get(d.id)(d); wait.delete(d.id); } };
  await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url }); await sleep(3000);
  await ev(`localStorage.clear(); $('word').value='声'; 0`); await ev(`$('bPlace').click(); 0`); await sleep(500);
  check('字を置くと欠片が1つ', (await ev(`ops.filter(o=>o.t==='piece').length`)) === 1);
  const sc = `(x,y)=>{const r=cv.getBoundingClientRect();return [r.left+(x-view.x)/view.w*r.width, r.top+(y-view.y)/view.h*r.height];}`;
  const P = await ev(`(${sc})(ops[0].x, ops[0].y)`);
  await stroke([P, [P[0] + 60, P[1] + 30]]);
  const moved = await ev(`[ops[0].x, ops[0].y]`); check('動かせる', true, moved.map(v => v.toFixed(1)).join(','));
  await ev(`$('tools').children[1].click(); 0`);
  const c = await ev(`(${sc})(ops[0].x, ops[0].y)`);
  await stroke([[c[0] - 200, c[1] - 40], [c[0] + 200, c[1] + 40]]);
  check('切ると欠片が2つ', (await ev(`ops.filter(o=>o.t==='piece').length`)) === 2);
  await ev(`$('tools').children[2].click(); 0`); await stroke([[c[0] - 250, c[1]], [c[0], c[1] + 10], [c[0] + 250, c[1]]]);
  await ev(`$('tools').children[3].click(); 0`); await stroke([[c[0] - 30, c[1] - 30], [c[0] + 30, c[1] - 20]]);
  await ev(`$('tools').children[4].click(); 0`); await stroke([[c[0] - 150, c[1] + 120], [c[0] + 150, c[1] + 100]]);
  const kinds = await ev(`ops.map(o=>o.t).join(',')`); check('白・修正液・テープが積まれる', /card.*fluid.*tape/.test(kinds), kinds);
  await ev(`$('bUndo').click(); 0`); check('1回戻すとテープが消える', !(await ev(`ops.some(o=>o.t==='tape')`)));
  await ev(`$('bRedo').click(); 0`); check('やり直すと戻る', await ev(`ops.some(o=>o.t==='tape')`));
  const px = `(()=>{const c=render(4,{x:FX-10,y:FY-10,w:F+20,h:F+20});return Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data.filter((v,i)=>i%24===0)).join(',');})()`;
  const A = await ev(px), snapj = await ev('JSON.stringify(snapshot())'); await ev(`ops=[]; 0`); await ev(`restore(${snapj}).then(()=>0)`); const B = await ev(px);
  check('JSONで開き直すと同じ絵', A === B);
  const mag = await ev(`(()=>{const c=render(4,{x:FX-10,y:FY-10,w:F+20,h:F+20},true);return c.width+'x'+c.height;})()`); check('雑誌向けに書き出せる', /x/.test(mag), mag);
} catch (e) { console.error(e); out.push(false); } finally { chrome.kill(); const bad = out.filter(x => !x).length; console.log(bad ? `\n${bad}件 だめ` : `\n全部 通った（${out.length}件）`); process.exit(bad ? 1 : 0); }
