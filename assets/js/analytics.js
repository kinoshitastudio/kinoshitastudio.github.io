/* ───────────────────────────────────────────────
   2026-11-25 木下「触ると色が変わるなど、画像などユーザーがわかるように（他ページも含めて）」
   ⭐ 押せる画像（リンクの中の、幅 160px 以上の画像）に、触ると反応する見た目を足す。
      このファイルは主なページ全部が読むので、ここに置いた（アナリティクスとは別の働き。手元でも動く）
      ・マウス＝少し浮く・影・色が少し明るく／同じリンクの「→」は右へ
      ・指（スマホ）＝押した瞬間に少し沈む
      ・メニューのロゴなど小さい画像には付けない／自分で触った見た目を持つ所（.no-hover）には付けない
   ─────────────────────────────────────────────── */
(function () {
  var CSS =
    '.ks-imglink{cursor:pointer}' +
    '.ks-imglink img.ks-hit{transition:transform .35s cubic-bezier(.2,.7,.2,1),box-shadow .35s,filter .35s;will-change:transform}' +
    '@media (hover:hover){.ks-imglink:hover img.ks-hit,.ks-imglink:focus-visible img.ks-hit{transform:translateY(-4px);box-shadow:0 14px 30px rgba(20,18,14,.18);filter:brightness(1.05) saturate(1.08)}}' +
    '.ks-imglink:active img.ks-hit{transform:translateY(1px) scale(.99);filter:brightness(.94)}' +
    '.ks-imglink .ks-arrow{display:inline-block;transition:transform .35s cubic-bezier(.2,.7,.2,1)}' +
    '@media (hover:hover){.ks-imglink:hover .ks-arrow{transform:translateX(6px)}}' +
    '@media (prefers-reduced-motion:reduce){.ks-imglink img.ks-hit,.ks-imglink .ks-arrow{transition:none}.ks-imglink:hover img.ks-hit{transform:none}}';
  function mark(root) {
    var imgs = (root || document).querySelectorAll('a img');
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i], a = im.closest('a');
      if (!a || a.classList.contains('no-hover') || a.closest('.no-hover, nav, header, .nav-menu, .ks-menu-btn, .nav-hamburger')) continue;
      var w = im.getBoundingClientRect().width || +im.getAttribute('width') || 0;
      if (w < 160) continue;
      a.classList.add('ks-imglink'); im.classList.add('ks-hit');
      // 同じリンクの中の「→」を包んで、触ると右へ
      var tw = document.createTreeWalker(a, NodeFilter.SHOW_TEXT, null), n, hits = [];
      while ((n = tw.nextNode())) if (n.nodeValue.indexOf('→') > -1 && !(n.parentNode.classList && n.parentNode.classList.contains('ks-arrow'))) hits.push(n);
      hits.forEach(function (t) {
        var parts = t.nodeValue.split('→'), f = document.createDocumentFragment();
        parts.forEach(function (p, k) { if (p) f.appendChild(document.createTextNode(p)); if (k < parts.length - 1) { var sp = document.createElement('span'); sp.className = 'ks-arrow'; sp.textContent = '→'; f.appendChild(sp); } });
        t.parentNode.replaceChild(f, t);
      });
    }
  }
  function init() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    mark();
    window.addEventListener('load', function () { mark(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* ───────────────────────────────────────────────
   Google アナリティクス（GA4）── 木下スタジオ
   🔴 ここの ID を差し替えるだけで、全ページが動き出す。
      差し替えるまでは【何も読み込まない】ので、入れたままでも害はない。

   ⭐ kinoshita.studio と kinoshitastudio.com は【同じ測定ID】にする。
      別々にすると、本店 → LP の送客が「よそから来た人」になって切れる。
   ─────────────────────────────────────────────── */
(function () {
  var ID = 'G-HNJKG7MC6E';            // ← 🔴 ここだけ差し替える

  if (location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1') return; // 手元の確認では数えない

  /* ⭐ 自分の閲覧を数えない（2026-10-06）
     そのブラウザで1回だけ「?notrack」を付けて開く → 以後そのブラウザでは数えない。
     「?track」を付けて開けば元に戻る。サイトが2つ（kinoshita.studio と kinoshitastudio.com）なので、両方で1回ずつ。
     ⚠️ スマホ・別のブラウザは、それぞれで1回ずつ開く */
  try {
    var q = location.search;
    if (/[?&]notrack\b/.test(q)) localStorage.setItem('ks_notrack', '1');
    if (/[?&]track\b/.test(q))   localStorage.removeItem('ks_notrack');
    if (localStorage.getItem('ks_notrack') === '1') return;
  } catch (e) {}

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', ID, {
    // 2つのドメインを1つのサイトとして数える
    linker: { domains: ['kinoshita.studio', 'kinoshitastudio.com'] }
  });
})();
