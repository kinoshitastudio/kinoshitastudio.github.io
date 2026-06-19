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
})();
