# -*- coding: utf-8 -*-
# 閃SEN のパネルを、他の道具（hari / moya）と同じ SwiftUI の見た目に寄せる。
#
# 🔴 色は自分で決めない。hari/index.html から実測した値をそのまま使う。
#    --track:rgba(120,120,128,.16)  ＝ iOS systemFill
#    --dim  :rgba(60,60,67,.62)     ＝ iOS secondaryLabel
#    --sel  :#0a84ff                ＝ iOS systemBlue
#    --pop  :rgba(252,252,253,.78) ＋ backdrop-filter blur(30px) saturate(180%)
#    見出しの帯 --headBg:#1c1c1e / --headInk:#fff
#      ＝ 木下の指摘「区分けが見づらい。大きいタイトル・背景色つき・文字白抜きで」が入った形
#
# ⚠️ 盤（stage / canvas）の地は【作品の地】なので触らない。木下が言ったのは「パネルは」。
import sys, io
SRC, DST = sys.argv[1], sys.argv[2]
s = io.open(SRC, encoding='utf-8').read()
n = 0
def rep(old, new, why):
    global s, n
    if old not in s: raise SystemExit("✗ 空振り: " + why)
    if s.count(old) != 1: raise SystemExit("✗ %d か所ある: %s" % (s.count(old), why))
    s = s.replace(old, new); n += 1; print("  ✓", why)

# ───────── ① 他の道具と同じ token を足す（盤の色は残す）
rep(":root{ --paper:#f4f2ee; --ink:#1c1c1e; --grid:#e6e3dd; --fg:#fff; --mut:#7a7772; --hot:#c0392b; }",
    """:root{
  /* 盤の地＝作品の地。ここは道具ごとに違ってよい */
  --paper:#f4f2ee; --ink:#1c1c1e; --grid:#e6e3dd; --fg:#fff; --mut:#7a7772; --hot:#c0392b;
  /* ══⭐ パネル＝他の道具（hari / moya）と同じ SwiftUI の言葉 ══
     値は hari/index.html から実測して写した。自分で決めていない。 */
  --dim:rgba(60,60,67,.62);          /* iOS secondaryLabel */
  --line:rgba(0,0,0,.11);
  --pop:rgba(252,252,253,.78);       /* すりガラスの地 */
  --btn:rgba(255,255,255,.92);
  --track:rgba(120,120,128,.16);     /* iOS systemFill＝溝・セグメントの地 */
  --edge:rgba(120,120,128,.22);
  --sel:#0a84ff;                     /* iOS systemBlue */
  --pill:#ffffff; --pillsh:0 1px 3px rgba(0,0,0,.16);
  --headBg:#1c1c1e; --headInk:#ffffff; --headSub:rgba(255,255,255,.55);
  --padX:22px;                       /* ⭐ 見出しの帯を端まで伸ばすのに使う */
}""",
    "他の道具と同じ token を足す")

# ───────── ② パネルの箱
rep("""#panel{width:400px;flex:0 0 auto;background:var(--fg);border-left:1px solid var(--grid);
  overflow-y:auto;padding:22px 22px 90px}""",
    """#panel{width:400px;flex:0 0 auto;background:var(--pop);border-left:.5px solid var(--line);
  overflow-y:auto;padding:22px var(--padX) 90px;
  -webkit-backdrop-filter:blur(30px) saturate(180%);backdrop-filter:blur(30px) saturate(180%)}""",
    "パネルをすりガラスにする")

# ───────── ③ 見出し＝帯（木下の指摘が入った hari の形）
rep(""".sec{font-size:12px;color:var(--mut);letter-spacing:.06em;margin:22px 0 10px;
  padding-bottom:6px;border-bottom:1px solid var(--grid)}""",
    """/* ⭐ 見出しは【帯】。木下＝「区分けが見づらい。大きいタイトル・背景色つき・文字白抜きで」
   ⚠️ パネルの padding があるので、負の余白で端まで伸ばす（--padX と必ず対で動かす） */
.sec{font-size:12px;font-weight:640;letter-spacing:.01em;
  color:var(--headInk);background:var(--headBg);
  margin:22px calc(-1 * var(--padX)) 12px;padding:9px var(--padX) 8px}""",
    "見出しを帯にする")

# ───────── ④ 値・溝・つまみ
rep("""output{font-variant-numeric:tabular-nums;color:var(--mut);font-size:12.5px}""",
    """output{font-variant-numeric:tabular-nums;color:var(--dim);font-size:11.5px}""",
    "数字の色を揃える")

rep("""input[type=range]{width:100%;-webkit-appearance:none;appearance:none;height:3px;background:var(--grid);
  border-radius:2px;outline:none;margin:0}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:17px;height:17px;border-radius:50%;
  background:var(--ink);cursor:pointer;border:none}""",
    """/* ⭐ 溝4px・つまみ19pxの白玉＋影＝他の道具と同じ（iOS のスライダー） */
input[type=range]{width:100%;-webkit-appearance:none;appearance:none;height:4px;background:var(--track);
  border-radius:2px;outline:none;margin:0}
input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:var(--track)}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:19px;height:19px;border-radius:50%;
  background:#fff;cursor:pointer;border:none;margin-top:-7.5px;
  box-shadow:0 1px 3px rgba(0,0,0,.28), 0 0 0 .5px rgba(0,0,0,.04)}""",
    "スライダーを iOS の形にする")

# ───────── ⑤ セグメント（白いピル）
rep(""".seg{display:flex;background:var(--paper);border-radius:10px;padding:3px;gap:3px;margin:8px 0}
.seg button{flex:1;border:none;background:none;font:inherit;font-size:12.5px;padding:7px 4px;
  border-radius:8px;cursor:pointer;color:var(--mut);white-space:nowrap}
.seg button.on{background:var(--fg);color:var(--ink);font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,.08)}""",
    """.seg{display:flex;background:var(--track);border-radius:9px;padding:2px;gap:2px;margin:8px 0}
.seg button{flex:1;border:none;background:none;font:inherit;font-size:12px;padding:6px 4px;
  border-radius:7px;cursor:pointer;color:var(--ink);white-space:nowrap;transition:.14s}
.seg button.on{background:var(--pill);box-shadow:var(--pillsh);font-weight:600}""",
    "セグメントを白いピルにする")

# ───────── ⑥ ボタン・入力欄
rep(""".btn{width:100%;border:1px solid var(--grid);background:var(--paper);border-radius:9px;
  padding:10px;font:inherit;font-size:13px;cursor:pointer;margin-top:8px}
.btn:hover{background:var(--grid)}
.btn.go{background:var(--ink);color:var(--fg);border-color:var(--ink);font-weight:700}""",
    """.btn{width:100%;border:.5px solid var(--line);background:var(--btn);color:var(--ink);border-radius:8px;
  padding:9px;font:inherit;font-size:12.5px;cursor:pointer;margin-top:8px;transition:.14s;
  box-shadow:0 .5px 1.5px rgba(0,0,0,.06)}
.btn:hover{background:#fff}
.btn.go{background:var(--sel);color:#fff;border-color:transparent;font-weight:600;box-shadow:none}""",
    "ボタンを iOS の形にする（既定は systemBlue）")

rep("""textarea,input[type=text]{width:100%;border:1px solid var(--grid);border-radius:9px;background:var(--paper);
  padding:11px 12px;font:inherit;color:var(--ink);resize:vertical;outline:none}
textarea:focus{border-color:#bdb9b1}""",
    """textarea,input[type=text]{width:100%;border:.5px solid var(--line);border-radius:9px;background:var(--btn);
  padding:11px 12px;font:inherit;color:var(--ink);resize:vertical;outline:none;
  box-shadow:0 .5px 1.5px rgba(0,0,0,.05)}
textarea:focus{border-color:var(--sel);box-shadow:0 0 0 3px rgba(10,132,255,.16)}""",
    "入力欄を iOS の形にする")

rep("""input[type=color]{width:100%;height:36px;border:1px solid var(--grid);border-radius:9px;
  background:var(--paper);padding:3px;cursor:pointer;margin-top:6px}""",
    """input[type=color]{width:100%;height:34px;border:.5px solid var(--line);border-radius:8px;
  background:var(--btn);padding:3px;cursor:pointer;margin-top:6px}""",
    "色の升を揃える")

# ───────── ⑦ 文字まわり
rep(""".lead{color:#3a3a3e;font-size:13px;margin:0 0 20px;line-height:1.75}""",
    """.lead{color:var(--dim);font-size:12.5px;margin:0 0 20px;line-height:1.75}""",
    "リード文の色を揃える")

rep(""".hint{color:var(--mut);font-size:12px;line-height:1.7;margin:8px 0 0}""",
    """.hint,.note{color:var(--dim);font-size:11.5px;line-height:1.7;margin:9px 0 2px}""",
    "小さい説明の色を揃える")

rep(""".n{font-weight:600;font-size:13px}""",
    """.n{font-weight:500;font-size:12.5px;color:var(--ink)}""",
    "つまみの名前を揃える")

# ───────── ⑧ 盤の上に浮く物（倍率・説明）もガラスに
rep("""#zoom{position:absolute;left:16px;bottom:16px;display:flex;gap:6px;align-items:center;
  background:var(--fg);border-radius:10px;padding:6px 10px;box-shadow:0 2px 12px rgba(0,0,0,.08);z-index:5}""",
    """#zoom{position:absolute;left:16px;bottom:16px;display:flex;gap:6px;align-items:center;
  background:var(--pop);border:.5px solid var(--line);border-radius:10px;padding:6px 10px;
  box-shadow:0 8px 28px rgba(0,0,0,.10);z-index:5;
  -webkit-backdrop-filter:blur(30px) saturate(180%);backdrop-filter:blur(30px) saturate(180%)}""",
    "倍率の升をガラスにする")

rep("""#zoom button:hover{background:var(--grid)}""",
    """#zoom button:hover{background:var(--track)}""",
    "倍率ボタンの色を揃える")

rep("""#note{position:absolute;left:16px;bottom:64px;right:420px;color:var(--mut);font-size:12.5px;z-index:5}""",
    """#note{position:absolute;left:16px;bottom:64px;right:420px;color:var(--dim);font-size:12px;z-index:5}""",
    "説明の色を揃える")

# ───────── ⑨ モバイル：帯の端合わせ（--padX を一緒に動かす）
rep("""  #panel{ width:100%; flex:1 1 auto; border-left:none;
          border-top:1px solid var(--grid); padding:18px 16px 64px; overflow-y:visible; }""",
    """  #panel{ width:100%; flex:1 1 auto; border-left:none;
          border-top:.5px solid var(--line); --padX:16px;
          padding:18px var(--padX) 64px; overflow-y:visible; }""",
    "モバイルでも帯を端まで伸ばす")

rep("""  #panel{ padding:14px 12px 56px; }""",
    """  #panel{ --padX:12px; padding:14px var(--padX) 56px; }""",
    "小さい画面でも帯を端まで伸ばす")


# ───────── ⑩ 行を1行にする（hari も moya も「名前 → 溝 → 数字」が一列）
rep(""".row{display:flex;justify-content:space-between;align-items:baseline;margin:14px 0 5px}""",
    """/* ⭐ 他の道具は【1行に 名前・溝・数字】。SEN だけ2行に割れていた。
   ⚠️ SEN の名前は長い（「かすれるほど細く（速さ）」）ので、幅を広めに取る。
     だからパネルは 400px のまま（hari の 302px にすると名前が折れる）。 */
.row{display:flex;align-items:center;gap:10px;margin:9px 0}
.row .n{width:152px;flex:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row input[type=range]{flex:1;width:auto}
.row output{width:32px;flex:none;text-align:right}""",
    "行を1行に組む")

# 名前と溝は HTML 上で兄弟なので、立ち上げに1回だけ寄せる
rep("syncAll(); toolUI(); modeUI(); layout(); fit(); draw();",
    """/* ⭐ 「名前＋数字」の行と、その次のスライダーを1行にまとめる。
   ⚠️ HTML を書き換えず【動かすだけ】にする。要素を動かしても、
     付いている handler も id も生きたまま残る＝つまみが1つも死なない。 */
(function oneLine(){
  document.querySelectorAll('#panel .row').forEach(row => {
    const nx = row.nextElementSibling;
    if(!nx || nx.tagName !== 'INPUT' || nx.type !== 'range') return;
    const out = row.querySelector('output');
    row.insertBefore(nx, out || null);      /* 溝を 名前 と 数字 の間へ */
  });
})();
syncAll(); toolUI(); modeUI(); layout(); fit(); draw();""",
    "立ち上げに1回だけ、溝を行の中へ動かす")

io.open(DST, 'w', encoding='utf-8').write(s)
print("\n%d か所 直した → %s" % (n, DST))
