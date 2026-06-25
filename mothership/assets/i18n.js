/* Mothership site — EN/JP トグル
   翻訳は各要素に data-ja / data-en（HTML可）で持たせ、切替時に innerHTML を差し替える。
   data-en を持たない要素は日本語のまま（順次対応）。 */
(function () {
  var KEY = 'ms_site_lang';
  function getLang() { try { return localStorage.getItem(KEY) || 'ja'; } catch (e) { return 'ja'; } }
  function apply(lang) {
    document.querySelectorAll('[data-en]').forEach(function (el) {
      var v = el.getAttribute('data-' + lang);
      if (v != null) el.innerHTML = v;
    });
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-langtog]').forEach(function (b) {
      b.textContent = (lang === 'ja') ? 'EN' : '日本語';
    });
  }
  window.__setLang = function (l) { try { localStorage.setItem(KEY, l); } catch (e) {} apply(l); };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-langtog]');
    if (!b) return;
    e.preventDefault();
    window.__setLang(getLang() === 'ja' ? 'en' : 'ja');
  });
  apply(getLang());

  /* ===== ライト / ダーク テーマ ===== */
  var TKEY = 'ms_site_theme';
  function getTheme() {
    try { return localStorage.getItem(TKEY) || (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); }
    catch (e) { return 'dark'; }
  }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'light' ? '#f2f0ea' : '#0a0a0b');
    document.querySelectorAll('[data-themetog]').forEach(function (b) {
      b.setAttribute('aria-label', t === 'light' ? 'ダークモードへ' : 'ライトモードへ');
      b.setAttribute('title', t === 'light' ? 'ダークモードへ' : 'ライトモードへ');
    });
  }
  window.__setTheme = function (t) { try { localStorage.setItem(TKEY, t); } catch (e) {} applyTheme(t); };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-themetog]');
    if (!b) return;
    e.preventDefault();
    var cur = document.documentElement.getAttribute('data-theme') || getTheme();
    window.__setTheme(cur === 'light' ? 'dark' : 'light');
  });
  applyTheme(getTheme());

  /* ===== モバイル: ハンバーガーメニュー ===== */
  document.addEventListener('click', function (e) {
    var nav = document.querySelector('nav');
    if (!nav) return;
    var tog = e.target.closest && e.target.closest('[data-navtoggle]');
    if (tog) { e.preventDefault(); var open = nav.classList.toggle('open'); tog.setAttribute('aria-expanded', open ? 'true' : 'false'); return; }
    // メニュー内リンク/ボタンを押したら閉じる
    if (e.target.closest && e.target.closest('nav .links a, nav .links [data-langtog]')) { nav.classList.remove('open'); return; }
    // メニュー外をタップしたら閉じる
    if (nav.classList.contains('open') && !e.target.closest('nav')) nav.classList.remove('open');
  });
})();
