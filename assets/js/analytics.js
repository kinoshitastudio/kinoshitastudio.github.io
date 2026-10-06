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
