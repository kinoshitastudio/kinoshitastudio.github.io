/* common.js (spa.js) — kinoshita.studio shared nav styles + accordion + cursor
   PJAX・BGM 削除済み。HTML ネイティブナビゲーションに切り替え。
*/
(function () {
  if (window.__spa) return;
  window.__spa = true;

  /* ─── Windows: カスタムカーソル無効 + lazy eager ─── */
  var isWin = /Windows/.test(navigator.userAgent);
  if (isWin) {
    document.documentElement.classList.add('is-win');
    var ws = document.createElement('style');
    ws.textContent = '.is-win #cur-dot,.is-win #cur-ring{display:none!important}.is-win,.is-win *{cursor:auto!important}.is-win a,.is-win button{cursor:pointer!important}';
    document.head.appendChild(ws);
  }

  /* ─── inject shared styles ─── */
  var styleEl = document.createElement('style');
  styleEl.id = 'ks-spa-style';
  styleEl.textContent = `
    /* ── unified nav base ── */
    .nav-menu {
      background: #3a3a37 !important;
      border-left: 1px solid rgba(235,232,226,0.06) !important;
    }
    .nav-menu-close { color: rgba(235,232,226,0.6) !important; }
    .nav-menu-close:hover { color: rgba(235,232,226,0.95) !important; }
    .nav-menu-label { color: rgba(235,232,226,0.5) !important; }
    .nav-menu > a.nav-menu-link, .nav-menu > a {
      color: rgba(235,232,226,0.8) !important;
      border-bottom: 1px solid rgba(235,232,226,0.08) !important;
      border-top: none !important;
    }
    .nav-menu > a.nav-menu-link:hover { color: rgba(235,232,226,1) !important; }
    /* ── accordion ── */
    .nav-menu-group {
      font-family: 'Space Mono', monospace;
      font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase;
      color: rgba(235,232,226,0.8);
      padding: 0.8rem 0;
      border: none; border-bottom: 1px solid rgba(235,232,226,0.1);
      display: flex; justify-content: space-between; align-items: center;
      cursor: pointer; background: none; width: 100%;
      text-align: left; transition: color 0.3s; user-select: none;
    }
    .nav-menu-group:hover, .nav-menu-group.open { color: rgba(235,232,226,1); }
    .nmg-arrow {
      display: inline-block; font-style: normal;
      transition: transform 0.25s cubic-bezier(.4,0,.2,1);
      font-size: 1em; line-height: 1;
    }
    .nav-menu-group.open .nmg-arrow { transform: rotate(45deg); }
    .nav-menu-sub {
      max-height: 0; overflow: hidden;
      transition: max-height 0.20s cubic-bezier(.4,0,.2,1);
      flex-shrink: 0;
    }
    .nav-menu-sub.open { max-height: 800px; }
    .nav-menu-sub .nav-menu-link, .nav-menu-sub a {
      font-size: 0.6rem !important; padding-left: 1.2rem !important;
      color: rgba(235,232,226,0.65) !important; border-top: none !important;
    }
    .nav-menu-sub .nav-menu-link:hover, .nav-menu-sub a:hover {
      color: rgba(235,232,226,0.95) !important;
    }
    .nav-menu-line-link {
      font-family: 'Space Mono', monospace;
      font-size: 0.58rem; letter-spacing: 0.18em;
      color: rgba(6,199,85,0.65) !important;
      text-decoration: none; display: block; padding: 0.9rem 0;
      border-top: 1px solid rgba(235,232,226,0.08); transition: color 0.25s;
    }
    .nav-menu-line-link:hover { color: #06C755 !important; }
    .nav-menu-sns {
      display: flex; align-items: center; gap: 1.4rem;
      padding: 1.2rem 0 0.4rem;
      border-top: 1px solid rgba(235,232,226,0.08); margin-top: 0.4rem;
    }
    .nav-menu-sns a {
      color: rgba(235,232,226,0.55); transition: color 0.25s;
      display: flex; align-items: center; text-decoration: none;
      font-family: 'Space Mono', monospace; font-size: 0.52rem; letter-spacing: 0.12em;
    }
    .nav-menu-sns a:hover { color: rgba(235,232,226,0.95); }
    .footer-sns { display: flex; align-items: center; gap: 1.6rem; }
    .footer-sns a {
      color: #7a7a77; transition: color 0.25s;
      display: flex; align-items: center; text-decoration: none;
      font-family: 'Space Mono', monospace; font-size: 0.5rem; letter-spacing: 0.12em;
    }
    .footer-sns a:hover { color: var(--ink, #1a1a18); }
    /* ── mobile: zoom 防止 (overflow-x は html/body に設定しない → iOS position:fixed が壊れる) ── */
    body { max-width: 100vw; overflow-x: clip; }
    input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]),
    textarea, select { font-size: max(16px, 1em) !important; }
    a, button, [onclick], label, input, textarea, select { touch-action: manipulation; }
  `;
  document.head.appendChild(styleEl);

  /* ─── accordion delegation (iOS touchend + desktop click) ─── */
  function _accToggle(target) {
    var grp = target && target.closest ? target.closest('.nav-menu-group') : null;
    if (!grp) return;
    var subId = grp.getAttribute('data-sub');
    var sub = subId ? document.getElementById(subId) : null;
    if (!sub) return;
    var isOpen = grp.classList.contains('open');
    document.querySelectorAll('.nav-menu-group.open').forEach(function(b) {
      b.classList.remove('open');
      var s = b.getAttribute('data-sub');
      if (s) { var el = document.getElementById(s); if (el) el.classList.remove('open'); }
    });
    if (!isOpen) { grp.classList.add('open'); sub.classList.add('open'); }
  }

  document.addEventListener('touchend', function(e) {
    if (!e.target.closest('.nav-menu-group')) return;
    e.preventDefault();
    _accToggle(e.target);
  }, { capture: true, passive: false });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.nav-menu-group')) return;
    e.stopImmediatePropagation();
    _accToggle(e.target);
  }, true);

  /* ─── Windows eager image loading ─── */
  if (isWin) {
    function _winEager() {
      var vh2 = window.innerHeight * 2;
      document.querySelectorAll('img[loading="lazy"]').forEach(function(img) {
        if (img.getBoundingClientRect().top < vh2) img.loading = 'eager';
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _winEager);
    } else {
      _winEager();
    }
    return;
  }

  /* ─── Adaptive cursor color (非Windows のみ) ─── */
  var _curRaf = 0;
  document.addEventListener('mousemove', function(e) {
    if (_curRaf) return;
    var ex = e.clientX, ey = e.clientY;
    _curRaf = requestAnimationFrame(function() {
      _curRaf = 0;
      if (document.body.classList.contains('cur-hover')) return;
      var dot  = document.getElementById('cur-dot');
      var ring = document.getElementById('cur-ring');
      if (!dot || !ring) return;
      var el = document.elementFromPoint(ex, ey);
      if (!el) return;
      var bg = null, node = el;
      while (node && node !== document.documentElement) {
        var c = getComputedStyle(node).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') { bg = c; break; }
        node = node.parentElement;
      }
      if (!bg) bg = getComputedStyle(document.body).backgroundColor;
      var m = bg && bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return;
      var lum = 0.2126*(m[1]/255) + 0.7152*(m[2]/255) + 0.0722*(m[3]/255);
      var dark = lum < 0.4;
      dot.style.background   = dark ? 'rgba(235,232,226,0.9)' : '#1a1a18';
      ring.style.borderColor = dark ? 'rgba(235,232,226,0.45)' : 'rgba(26,26,24,0.4)';
    });
  }, { passive: true });

  /* ─── scroll reveal fallback ─── */
  function _reveal() {
    var h = window.innerHeight;
    document.querySelectorAll('.reveal:not(.visible),.rv:not(.visible),.fade-in:not(.visible)').forEach(function(el) {
      var r = el.getBoundingClientRect();
      if (r.top < h - 40 && r.bottom > 0) el.classList.add('visible');
    });
  }
  window.addEventListener('scroll', _reveal, { passive: true });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _reveal);
  } else {
    _reveal();
  }

}());
