# -*- coding: utf-8 -*-
# 閃SEN のパネルを HA に寄せる（木下＝「サイドパネルのUIをこれを参考にして／あとモバイルも参考に」）。
#
# 🔴 前回は hari（明るい系）に寄せたが、木下が指したのは HA（暗い系）。写す先を替える。
# ⭐ HA/index.html から実測して写す：
#    --panel rgba(28,28,30,.82) + blur(28px) saturate(1.7) / --line rgba(255,255,255,.10)
#    --dim #9a9aa0 / --fg #f2f2f4 / --btn rgba(255,255,255,.10) / --btn2 rgba(255,255,255,.16)
#    --panelW 302px / --panelH 38vh / --sheetGrip 22px
# ⭐ モバイルも HA と同じ＝【下からのシート＋掴み棒】。高さは --panelH 1本で盤と一緒に動く。
# ⭐ 補足は既定で畳む（木下＝「補足説明が多すぎるので非表示に」が HA に入っている）。右上の ? で出る。
#   ⚠️ ただし【読まないと触れないこと】は .lead として出しっぱなしにする。
#      （入っているのに見えない機能は「無い」のと同じ）
#
# 🔴 並び ── 木下＝「一番最初に文字をうつか、ボードに書くかの②を最初にした方がよい」
#   ＋ ② が2つあった（型 と 骨）。採番ミスを直す。
import sys, io
SRC, DST = sys.argv[1], sys.argv[2]
s = io.open(SRC, encoding='utf-8').read()
n = 0
def rep(old, new, why):
    global s, n
    if old not in s: raise SystemExit("✗ 空振り: " + why)
    if s.count(old) != 1: raise SystemExit("✗ %d か所ある: %s" % (s.count(old), why))
    s = s.replace(old, new); n += 1; print("  ✓", why)

# ═════════ ① 並び替え ── 「打つか、自分で置くか」を一番上へ
a = s.find('<div class="sec">② 骨 ── 打つか、自分で置くか</div>')
b = s.find('<div class="sec">③ 通すもの ── 骨に着せる</div>')
c = s.find('<div class="sec">① 何を書くか</div>')
if min(a, b, c) < 0: raise SystemExit("✗ 見出しが見つからない")
if not (c < a < b): raise SystemExit("✗ 見出しの並びが想定と違う")
blk = s[a:b]
if blk.count('<div') != blk.count('</div>'): raise SystemExit("✗ 移す塊の div が閉じていない")
s = s[:c] + blk + s[c:a] + s[b:]
n += 1; print("  ✓ 「打つか、自分で置くか」を一番上へ移した")

# ═════════ ② 採番を振り直す（② が2つあった）
for old, new in [
    ('<div class="sec">② 骨 ── 打つか、自分で置くか</div>', '<div class="sec">① 骨 ── 打つか、自分で置くか</div>'),
    ('<div class="sec">① 何を書くか</div>',                 '<div class="sec">② 何を書くか</div>'),
    ('<div class="sec">② 型 ── ひと当て</div>',             '<div class="sec">③ 型 ── ひと当て</div>'),
    ('<div class="sec">③ 通すもの ── 骨に着せる</div>',      '<div class="sec">④ 通すもの ── 骨に着せる</div>'),
    ('<div class="sec">④ 走り ── 版面の上をどう走るか</div>', '<div class="sec">⑤ 走り ── 版面の上をどう走るか</div>'),
    ('<div class="sec">⑤ 色</div>',                        '<div class="sec">⑥ 色</div>'),
    ('<div class="sec">⑥ ふち（袋文字）</div>',              '<div class="sec">⑦ ふち（袋文字）</div>'),
    ('<div class="sec">⑦ 版面</div>',                      '<div class="sec">⑧ 版面</div>'),
    ('<div class="sec">⑧ 出す</div>',                      '<div class="sec">⑨ 出す</div>'),
]:
    rep(old, new, "採番 " + new.split('>')[1].split('<')[0])

# ═════════ ③ 色と寸法を HA から写す
old_root = s[s.find(':root{'):s.find('}', s.find(':root{'))+1]
rep(old_root,
    """:root{
  /* 盤の地＝作品の地。SEN は白い紙に書く道具なので明るいまま */
  --paper:#f4f2ee; --ink:#1c1c1e; --grid:#e6e3dd;
  /* ══⭐ パネル＝HA から実測して写した（木下：「HAを参考にして」）══ */
  --panel:rgba(28,28,30,.82); --line:rgba(255,255,255,.10); --dim:#9a9aa0;
  --fg:#f2f2f4; --btn:rgba(255,255,255,.10); --btn2:rgba(255,255,255,.16);
  --panelW:302px; --panelH:38vh; --sheetGrip:22px;
  --hot:#ff8a6a;   /* 暗い地では赤が沈むので、明るい橙に置き換える */
}
@supports (height:1dvh){ :root{ --panelH:38dvh } }""",
    "色と寸法を HA から写す")

# ═════════ ④ 箱
rep("""body{margin:0;background:var(--paper);color:var(--ink);
  font:14px/1.7 -apple-system,"Zen Kaku Gothic New","Hiragino Sans",sans-serif;
  display:flex;overflow:hidden}""",
    """body{margin:0;background:#101012;color:var(--fg);
  font:400 12px/1.5 -apple-system,BlinkMacSystemFont,"SF Pro Text","Hiragino Sans",sans-serif;
  display:flex;overflow:hidden;-webkit-tap-highlight-color:transparent}""",
    "地とフォントを HA に合わせる")

rep("""#panel{width:400px;flex:0 0 auto;background:var(--pop);border-left:.5px solid var(--line);
  overflow-y:auto;padding:22px var(--padX) 90px;
  -webkit-backdrop-filter:blur(30px) saturate(180%);backdrop-filter:blur(30px) saturate(180%)}""",
    """#panel{flex:none;width:var(--panelW);background:var(--panel);
  -webkit-backdrop-filter:blur(28px) saturate(1.7);backdrop-filter:blur(28px) saturate(1.7);
  border-left:1px solid var(--line);overflow:auto;padding:14px 13px 60px;position:relative}""",
    "パネルを HA の箱にする")

# ═════════ ⑤ 見出し・文字
rep("""h1{font-size:19px;margin:0 0 4px;letter-spacing:.02em}""",
    """h1{font-size:15px;margin:0 0 2px;letter-spacing:.02em;font-weight:600}""",
    "題を HA の大きさにする")

rep(""".lead{color:var(--dim);font-size:12.5px;margin:0 0 20px;line-height:1.75}""",
    """/* ⭐ いつも見えている1行。読まないと触れないことだけをここに出す（HA と同じ作法） */
.lead{color:var(--dim);font-size:11px;line-height:1.6;margin:-2px 0 8px}
.lead b{color:#d2d2d8;font-weight:600}""",
    "リード文を HA の形にする")

rep("""/* ⭐ 見出しは【帯】。木下＝「区分けが見づらい。大きいタイトル・背景色つき・文字白抜きで」
   ⚠️ パネルの padding があるので、負の余白で端まで伸ばす（--padX と必ず対で動かす） */
.sec{font-size:12px;font-weight:640;letter-spacing:.01em;
  color:var(--headInk);background:var(--headBg);
  margin:22px calc(-1 * var(--padX)) 12px;padding:9px var(--padX) 8px}""",
    """/* ⭐ 見出しは HA と同じ【貼り付く小さな札】。スクロールしても頭に残る */
.sec{font-size:11px;letter-spacing:.06em;color:var(--dim);font-weight:400;
  margin:16px -13px 8px;padding:6px 13px 5px;position:sticky;top:-14px;z-index:2;
  background:rgba(28,28,30,.9);
  -webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}""",
    "見出しを HA の貼り付く札にする")

# ⭐ 補足は既定で畳む。ただし操作のしかたは .lead に残す（後で HTML 側を直す）
rep(""".hint,.note{color:var(--dim);font-size:11.5px;line-height:1.7;margin:9px 0 2px}""",
    """/* ⭐ 補足は既定で畳む（木下＝「補足説明が多すぎるので非表示に」が HA に入っている）。
   右上の ? で出る。⚠️ 操作のしかた（⌘Z など）は畳まない＝.lead にする。 */
.hint{display:none;color:#8a8a90;line-height:1.75;margin:6px 0 10px;font-size:11px;
  background:rgba(255,255,255,.05);border-radius:9px;padding:8px 10px}
body.help .hint{display:block}
.hint b{color:#d2d2d8;font-weight:600}
#helpBtn{position:absolute;right:13px;top:12px;width:26px;height:26px;border-radius:50%;
  border:none;background:var(--btn);color:var(--fg);cursor:pointer;font-size:12px}
body.help #helpBtn{background:#fff;color:#141416}""",
    "補足を ? で畳む")

# ═════════ ⑥ 行・つまみ
rep("""/* ⭐ 他の道具は【1行に 名前・溝・数字】。SEN だけ2行に割れていた。
   ⚠️ SEN の名前は長い（「かすれるほど細く（速さ）」）ので、幅を広めに取る。
     だからパネルは 400px のまま（hari の 302px にすると名前が折れる）。 */
.row{display:flex;align-items:center;gap:10px;margin:9px 0}
.row .n{width:152px;flex:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row input[type=range]{flex:1;width:auto}
.row output{width:32px;flex:none;text-align:right}""",
    """/* ⭐ HA と同じ 1行＝名前(88px) → 溝 → 数字(44px)
   ⚠️ SEN の名前は長いので、はみ出す分は […] で切る（折ると行が崩れる） */
.row{display:flex;align-items:center;gap:9px;margin:0 0 6px;min-height:26px}
.row .n{flex:none;width:112px;color:var(--dim);font-size:11.5px;font-weight:400;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row input[type=range]{flex:1;min-width:0;width:auto}
.row output{flex:none;width:40px;text-align:right}""",
    "行を HA の組みにする")

rep("""output{font-variant-numeric:tabular-nums;color:var(--dim);font-size:11.5px}""",
    """output{font-variant-numeric:tabular-nums;color:var(--fg);font-size:11.5px}""",
    "数字を読める色にする")

rep("""/* ⭐ 溝4px・つまみ19pxの白玉＋影＝他の道具と同じ（iOS のスライダー） */
input[type=range]{width:100%;-webkit-appearance:none;appearance:none;height:4px;background:var(--track);
  border-radius:2px;outline:none;margin:0}
input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:var(--track)}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:19px;height:19px;border-radius:50%;
  background:#fff;cursor:pointer;border:none;margin-top:-7.5px;
  box-shadow:0 1px 3px rgba(0,0,0,.28), 0 0 0 .5px rgba(0,0,0,.04)}""",
    """input[type=range]{width:100%;-webkit-appearance:none;appearance:none;height:4px;
  background:rgba(255,255,255,.18);border-radius:3px;outline:none;margin:0}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:19px;height:19px;
  border-radius:50%;background:#fff;border:none;cursor:pointer;
  box-shadow:0 1px 3px rgba(0,0,0,.5)}""",
    "スライダーを HA の形にする")

rep(""".seg{display:flex;background:var(--track);border-radius:9px;padding:2px;gap:2px;margin:8px 0}
.seg button{flex:1;border:none;background:none;font:inherit;font-size:12px;padding:6px 4px;
  border-radius:7px;cursor:pointer;color:var(--ink);white-space:nowrap;transition:.14s}
.seg button.on{background:var(--pill);box-shadow:var(--pillsh);font-weight:600}""",
    """/* セグメント＝選んだ所に白いカプセルが浮く（HA と同じ） */
.seg{display:flex;gap:0;background:rgba(255,255,255,.09);border-radius:9px;padding:2px;margin:0 0 8px}
.seg button{flex:1;background:none;border:none;color:var(--dim);font-family:inherit;
  font-size:12px;padding:7px 0;border-radius:7px;cursor:pointer;transition:background .12s;
  white-space:nowrap}
.seg button.on{background:#fff;color:#141416;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.4)}""",
    "セグメントを HA の形にする")

rep(""".btn{width:100%;border:.5px solid var(--line);background:var(--btn);color:var(--ink);border-radius:8px;
  padding:9px;font:inherit;font-size:12.5px;cursor:pointer;margin-top:8px;transition:.14s;
  box-shadow:0 .5px 1.5px rgba(0,0,0,.06)}
.btn:hover{background:#fff}
.btn.go{background:var(--sel);color:#fff;border-color:transparent;font-weight:600;box-shadow:none}""",
    """.btn{width:100%;background:var(--btn);border:none;border-radius:10px;color:var(--fg);
  font-family:inherit;font-size:12px;padding:10px;cursor:pointer;margin:0 0 7px}
.btn:hover{background:var(--btn2)}
.btn.go{background:#fff;color:#141416;font-weight:600}""",
    "ボタンを HA の形にする")

rep("""textarea,input[type=text]{width:100%;border:.5px solid var(--line);border-radius:9px;background:var(--btn);
  padding:11px 12px;font:inherit;color:var(--ink);resize:vertical;outline:none;
  box-shadow:0 .5px 1.5px rgba(0,0,0,.05)}
textarea:focus{border-color:var(--sel);box-shadow:0 0 0 3px rgba(10,132,255,.16)}""",
    """textarea,input[type=text]{width:100%;border:1px solid var(--line);border-radius:9px;
  background:var(--btn);padding:9px 10px;font-family:inherit;font-size:12px;color:var(--fg);
  resize:vertical;outline:none}
textarea:focus{border-color:rgba(255,255,255,.30)}""",
    "入力欄を HA の形にする")

rep("""input[type=color]{width:100%;height:34px;border:.5px solid var(--line);border-radius:8px;
  background:var(--btn);padding:3px;cursor:pointer;margin-top:6px}""",
    """input[type=color]{width:100%;height:30px;padding:0;background:none;
  border:1px solid var(--line);border-radius:8px;cursor:pointer;margin-top:6px}""",
    "色の升を HA の形にする")

rep(""".n{font-weight:500;font-size:12.5px;color:var(--ink)}""",
    """.n{font-weight:400;font-size:11.5px;color:var(--dim)}""",
    "つまみの名前を HA の色にする")

# ═════════ ⑦ 盤の上に浮く物（HA は暗いガラス）
rep("""#zoom{position:absolute;left:16px;bottom:16px;display:flex;gap:6px;align-items:center;
  background:var(--pop);border:.5px solid var(--line);border-radius:10px;padding:6px 10px;
  box-shadow:0 8px 28px rgba(0,0,0,.10);z-index:5;
  -webkit-backdrop-filter:blur(30px) saturate(180%);backdrop-filter:blur(30px) saturate(180%)}""",
    """#zoom{position:absolute;left:14px;bottom:38px;display:flex;gap:2px;align-items:center;
  background:rgba(20,20,22,.8);border-radius:11px;padding:4px 6px;font-size:11px;color:#d8d8dc;z-index:5;
  -webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px)}""",
    "倍率の升を HA の暗いガラスにする")

rep("""#zoom button{border:none;background:none;font:inherit;cursor:pointer;padding:2px 8px;border-radius:6px}
#zoom button:hover{background:var(--track)}""",
    """#zoom button{background:none;border:none;color:#d8d8dc;font-family:inherit;font-size:14px;
  min-width:26px;height:26px;border-radius:7px;cursor:pointer;padding:0 6px}
#zoom button:hover{background:rgba(255,255,255,.14)}
#zoom #zVal{min-width:46px;text-align:center;font-variant-numeric:tabular-nums}""",
    "倍率ボタンを HA の形にする")

rep("""#note{position:absolute;left:16px;bottom:64px;right:420px;color:var(--dim);font-size:12px;z-index:5}""",
    """#note{position:absolute;left:14px;bottom:12px;right:14px;color:#6a6a6a;font-size:11px;z-index:5}""",
    "盤の説明を HA の位置にする")

# ═════════ ⑧ モバイル ── HA と同じ「下からのシート＋掴み棒」
old_media = s[s.find('/* ══⭐⭐ モバイル'):s.find('</style>')]
rep(old_media,
    """/* ══ モバイル／iPad ── HA と同じ作法 ══════════════════════════
   ⭐ 高さは CSS 変数 --panelH ひとつ＝盤とパネルが一緒に動く（2箇所に書かない）
   ⚠️ 100vh から引き算しない（iOS の 100vh は見え高さと食い違う）。余りは盤が取る
   🔴 iOS は入力欄が16px未満だと勝手に寄る。user-scalable=no は無視される */
@media (max-width:820px){
  body{ flex-direction:column }
  #stage{ flex:1 1 auto; min-height:0 }
  #panel{ flex:none; width:100%; height:var(--panelH); border-left:none;
    border-top:1px solid var(--line); padding:10px 12px calc(26px + env(safe-area-inset-bottom)) }
  .sec{ margin:12px -12px 6px; padding:6px 12px 5px; top:-10px }
  .row{ margin-bottom:2px }
  .row .n{ width:96px }
  .btn{ padding:11px; min-height:40px }
  .seg button{ padding:9px 0; min-height:38px }
  input[type=color]{ height:34px }
  #note{ bottom:12px; right:14px }
  #zoom{ bottom:12px }
  #sheetGrip{ position:fixed; left:0; right:0; z-index:60;
    bottom:calc(var(--panelH) - 1px); height:var(--sheetGrip);
    display:flex; align-items:center; justify-content:center;
    touch-action:none; cursor:ns-resize; user-select:none; -webkit-user-select:none }
  /* 🔴 印を currentColor にすると盤の上で見えない（他の道具で踏んだ）。白い棒＋黒い縁 */
  #sheetGrip::before{ content:""; width:44px; height:5px; border-radius:5px;
    background:rgba(255,255,255,.94);
    box-shadow:0 0 0 1px rgba(0,0,0,.45), 0 1px 3px rgba(0,0,0,.45) }
  #sheetGrip.dragging::before{ background:#fff; box-shadow:0 0 0 1px rgba(0,0,0,.6), 0 2px 7px rgba(0,0,0,.5) }
}
@media (max-width:760px), (pointer:coarse) and (max-width:1024px){
  input:not([type=range]):not([type=color]), select, textarea{ font-size:16px !important }
}
""",
    "モバイルを HA の下シートにする")

# ═════════ ⑨ ? ボタンと、操作のしかたは畳まない
rep("""<div id="panel">
  <h1>閃 SEN</h1>""",
    """<div id="panel">
  <button id="helpBtn" title="補足を出す／畳む">?</button>
  <h1>閃 SEN</h1>""",
    "? ボタンを置く")

# 操作のしかた（⌘Z・⇧ドラッグ・⌫）は畳まない＝lead にする
rep("""    <p class="note">打った字を<b>薄く下に敷ける</b>ので、字の形を覚えていなくていい。その上を盤で直になぞる。<br>
    <b>置くのは骨だけ。</b>速さ・太さ・払い・連綿は筆が作る。<b>打った字は消えない</b>（手の骨は足される）。</p>""",
    """    <p class="lead">打った字を<b>薄く下に敷ける</b>ので、字の形を覚えていなくていい。
    <b>置くのは骨だけ。</b>速さ・太さ・払い・連綿は筆が作る。</p>""",
    "なぞる説明は出しっぱなしにする")

rep("""    <p class="note"><b>直す</b>＝線を掴むと点が出る。<b>点を掴んで動かす</b>／<b>⇧ドラッグで線ごと移す</b>／
    <b>⌫ で1画消す</b>。<b>⌘Z</b> でどれも戻る。</p>""",
    """    <p class="lead"><b>直す</b>＝線を掴むと点が出る。<b>点を動かす</b>／<b>⇧ドラッグで線ごと移す</b>／
    <b>⌫ で1画消す</b>／<b>⌘Z</b> で戻る。</p>""",
    "直し方は出しっぱなしにする（隠すと機能が無いのと同じ）")

rep("""document.querySelectorAll('#segMode button').forEach(b => b.onclick = () => {""",
    """$('helpBtn').onclick = () => document.body.classList.toggle('help');
document.querySelectorAll('#segMode button').forEach(b => b.onclick = () => {""",
    "? を繋ぐ")

# ═════════ ⑩ 下シートの掴み棒（HA の module をそのまま持ってくる）
rep("""addEventListener('resize', () => { fit(); });
/* ⭐ 縦積みだと画面の回転・アドレスバーの出入りで高さが変わる。合わせ直す。 */
addEventListener('orientationchange', () => setTimeout(fit, 250));""",
    """addEventListener('resize', () => { fit(); });
addEventListener('orientationchange', () => setTimeout(fit, 250));

/* ══⭐⭐ 下からのシート（HA と同じ）══
   掴み棒を上下に引くと高さが変わる。タップで 26 / 42 / 78vh の段を回る。
   ⭐ 高さは --panelH 1本。盤は「余り」を取るので、2か所に書かなくていい。
   ⭐ 開けた高さは覚える（次に来たとき同じ高さ）。 */
(function(){
  'use strict';
  const KEY = location.pathname.replace(/\\W+/g,'_') + '.panelH.v1';
  const SNAP = [26, 42, 78];
  let grip = null;
  const panel = () => document.getElementById('panel');
  const isSheet = () => {
    const p = panel(); if(!p) return false;
    const b = p.getBoundingClientRect();
    return b.width >= innerWidth-3 && b.bottom >= innerHeight-3 && b.top > 8;
  };
  const clamp = v => Math.max(18, Math.min(innerHeight < 500 ? 62 : 86, v));
  const setH = vh => { document.documentElement.style.setProperty('--panelH', clamp(vh).toFixed(1)+'vh');
    try{ window.dispatchEvent(new Event('resize')); }catch(_){} };
  const curH = () => { const p=panel(); return p ? p.getBoundingClientRect().height/innerHeight*100 : 0; };
  function build(){
    if(grip) return;
    grip = document.createElement('div'); grip.id='sheetGrip';
    grip.title='ドラッグで高さを変える／タップで段を切り替える';
    document.body.appendChild(grip);
    let drag=null;
    grip.addEventListener('pointerdown', e => { e.preventDefault();
      try{ grip.setPointerCapture(e.pointerId); }catch(_){}
      grip.classList.add('dragging'); drag={y:e.clientY, h:curH(), moved:false}; });
    grip.addEventListener('pointermove', e => { if(!drag) return;
      const d=(drag.y-e.clientY)/innerHeight*100; if(Math.abs(d)>1) drag.moved=true; setH(drag.h+d); });
    const end = () => { if(!drag) return; grip.classList.remove('dragging');
      if(!drag.moved){ const h=curH(); const next=SNAP.find(v=>clamp(v)>h+2);
        setH(next===undefined?SNAP[0]:next); }
      try{ localStorage.setItem(KEY, String(Math.round(curH()*10)/10)); }catch(_){}
      drag=null; };
    grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
  }
  function drop(){ if(!grip) return; grip.remove(); grip=null;
    document.documentElement.style.removeProperty('--panelH'); }
  function sync(){ if(isSheet()){ build();
      let v=null; try{ v=parseFloat(localStorage.getItem(KEY)); }catch(_){}
      if(v>0) setH(v); } else drop(); }
  addEventListener('resize', () => { if(!grip) sync(); });
  addEventListener('orientationchange', () => setTimeout(sync, 200));
  if(document.readyState==='loading') addEventListener('DOMContentLoaded', sync); else sync();
})();""",
    "下シートの掴み棒を足す")


# ═════════ ⑪ 実測で出た穴2つ
# 🔴 ①「走らせる／字見本」が盤の上で消えていた。
#    .seg の地は rgba(255,255,255,.09)＝【暗いパネルの中】用。明るい盤の上では地と同じ色になる。
#    実測：帯の地(245,243,239) と 盤(244,242,238) がほぼ同値＝見えない。
#    ⭐ 盤の上に浮く物は HA の #tools と同じ【暗いガラス】にする。
rep("""#modes{position:absolute;left:50%;top:14px;transform:translateX(-50%);z-index:5}""",
    """/* 🔴 盤の上に置く帯は .seg の地（白の9%）では見えない。実測で盤と同じ色だった。
   ⭐ HA の #tools と同じ暗いガラスにする。 */
#modes{position:absolute;left:50%;top:14px;transform:translateX(-50%);z-index:5;
  background:rgba(20,20,22,.8);border-radius:12px;padding:4px;gap:3px;
  -webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px)}
#modes button{color:#d8d8dc}
#modes button.on{background:#fff;color:#141416}""",
    "盤の上の帯を暗いガラスにする（明るい盤で消えていた）")

# 🔴 ② つまみの名前が5本切れていた（112px に対し 115〜138px）。
#    HA の名前は短い（「刃の角度」）が、SEN の名前は長い（「かすれるほど細く（速さ）」）。
#    ⭐ 名前は木下の言葉なので勝手に縮めない。【パネルを広げる】。
rep("--panelW:302px; --panelH:38vh; --sheetGrip:22px;",
    """--panelW:360px; --panelH:38vh; --sheetGrip:22px;
  /* ⚠️ HA は 302px だが、SEN の名前は長い（実測で5本が切れた）。
     名前は木下の言葉なので縮めず、パネルの方を広げる。 */""",
    "パネルを 360px にする（名前を縮めないため）")

rep(""".row .n{flex:none;width:112px;color:var(--dim);font-size:11.5px;font-weight:400;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}""",
    """.row .n{flex:none;width:150px;color:var(--dim);font-size:11.5px;font-weight:400;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}""",
    "名前の幅を150pxにする")

rep("  .row .n{ width:96px }", "  .row .n{ width:150px }", "モバイルの名前幅も広げる（実測で1本切れていた）")

io.open(DST, 'w', encoding='utf-8').write(s)
print("\n%d か所 直した → %s" % (n, DST))
