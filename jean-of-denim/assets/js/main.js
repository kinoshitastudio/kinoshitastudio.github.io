/* ═══════════════════════════════════════════════════════
   JEAN OF DENIM (デニムのジーン) — 共通スクリプト
   - テーマ切替（light / dark）＋ localStorage 保存
   - スクロール連動フェードイン（prefers-reduced-motion 尊重）
   - 目次サイドバーの現在位置ハイライト
   - ウェイトスライダー（material/weight.html 用）
   ═══════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const THEME_KEY = 'indigoIndex.theme';

  // ─────────────────────────────────────────
  // Theme toggle
  // ─────────────────────────────────────────
  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  }

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.textContent = t === 'dark' ? '☀︎ Light' : '☾ Dark';
      btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  function setupTheme() {
    applyTheme(getPreferredTheme());
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        localStorage.setItem(THEME_KEY, next);
        applyTheme(next);
      });
    }
  }

  // ─────────────────────────────────────────
  // Fade-in on scroll (respects prefers-reduced-motion)
  // ─────────────────────────────────────────
  function setupFadeIn() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.fade-in').forEach((el) => el.classList.add('on'));
      return;
    }
    const els = document.querySelectorAll('.fade-in');
    if (!els.length || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('on'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('on');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });
    els.forEach((el) => io.observe(el));
  }

  // ─────────────────────────────────────────
  // Auto-mark current chapter in shared sidebar
  // (each page's <a> whose href resolves to current URL gets .current)
  // ─────────────────────────────────────────
  function setupTocCurrent() {
    const here = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.toc-list a, .site-nav a').forEach((a) => {
      const href = a.getAttribute('href') || '';
      const last = href.split('/').pop().split('#')[0];
      if (last === here) {
        a.classList.add('current');
        a.classList.add('active');
        // open enclosing <details>
        const det = a.closest('details');
        if (det) det.setAttribute('open', '');
      }
    });
  }

  // ─────────────────────────────────────────
  // Weight slider (material/weight.html)
  //   Deja rough OZ → fabric category mapping
  // ─────────────────────────────────────────
  function setupWeightSlider() {
    const sl = document.getElementById('weightSlider');
    if (!sl) return;
    const val = document.getElementById('weightValue');
    const cat = document.getElementById('weightFabric');
    const info = [
      { max:  8,  name: '薄手（サマーウェイト）', desc: '初夏〜夏向け、軽くて涼しい。シャツや薄手ジーンズに。' },
      { max: 11,  name: 'ミッドライト',           desc: 'オールシーズンで履きやすい。色落ちも比較的ゆっくり。' },
      { max: 13.5, name: 'レギュラーウェイト',   desc: 'スタンダード。多くのジーンズが このあたり。' },
      { max: 15,  name: 'ヘビーウェイト',         desc: '厚手でしっかり。最初は固いが、穿き込みの色落ちが深い。' },
      { max: 17,  name: 'セルヴィッジ定番',       desc: '13.5〜16oz の本格デニム。耳付きの多くがこの帯。' },
      { max: 99,  name: 'スーパーヘビー',         desc: '17oz以上の超厚手。鎧のような存在感。履き込みの変化も劇的。' },
    ];
    function update() {
      const oz = parseFloat(sl.value);
      val && (val.textContent = oz.toFixed(1) + ' oz');
      const row = info.find((x) => oz <= x.max) || info[info.length - 1];
      if (cat) cat.innerHTML = '<strong>' + row.name + '</strong><br/>' + row.desc;
    }
    sl.addEventListener('input', update);
    update();
  }

  // ─────────────────────────────────────────
  // Mobile hamburger + drawer (auto-injected)
  //   既存のインラインnavから項目をコピーしてドロワーに。
  //   HTMLは触らずに動くように、JSで全て生成。
  // ─────────────────────────────────────────
  function setupMobileNav() {
    const inner = document.querySelector('header.site .site-inner');
    const nav   = inner && inner.querySelector('.site-nav');
    if (!inner || !nav) return;
    if (document.querySelector('.site-hamburger')) return;

    // Hamburger button
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'site-hamburger';
    btn.setAttribute('aria-label', 'メニューを開く');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span></span><span></span><span></span>';

    // 挿入位置：テーマトグルの直前（無ければ末尾）
    const toggle = inner.querySelector('#themeToggle');
    if (toggle) inner.insertBefore(btn, toggle);
    else inner.appendChild(btn);

    // Drawer
    const drawer = document.createElement('div');
    drawer.className = 'site-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'サイト目次');
    drawer.innerHTML = [
      '<div class="site-drawer-bg" data-drawer-close></div>',
      '<div class="site-drawer-panel">',
      '  <div class="site-drawer-head">',
      '    <img src="' + (document.querySelector('link[rel="icon"]')?.getAttribute('href') || '') + '" alt="">',
      '    <div class="site-drawer-title">JEAN OF DENIM<small>デニムのジーン · No.01</small></div>',
      '    <button type="button" class="site-drawer-close" data-drawer-close aria-label="閉じる">✕</button>',
      '  </div>',
      '  <nav class="site-drawer-nav"></nav>',
      '  <div class="site-drawer-foot">© 2026 kinoshita studio</div>',
      '</div>'
    ].join('');
    document.body.appendChild(drawer);

    // コピー：既存のsite-nav<a>をドロワーに複製（番号ラベル付与）
    const numbers = ['01','02','03','04','05','06'];
    const drawerNav = drawer.querySelector('.site-drawer-nav');
    [...nav.querySelectorAll('a')].forEach((src, i) => {
      const a = document.createElement('a');
      a.href = src.getAttribute('href') || '#';
      a.innerHTML = '<span class="ni">' + (numbers[i] || '') + '</span><span>' + src.textContent.trim() + '</span>';
      if (src.classList.contains('current') || src.classList.contains('active')) a.classList.add('current');
      drawerNav.appendChild(a);
    });

    function openDrawer() {
      drawer.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      btn.setAttribute('aria-label', 'メニューを閉じる');
      document.body.classList.add('drawer-open');
    }
    function closeDrawer() {
      drawer.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'メニューを開く');
      document.body.classList.remove('drawer-open');
    }
    btn.addEventListener('click', () => {
      if (drawer.classList.contains('open')) closeDrawer(); else openDrawer();
    });
    drawer.addEventListener('click', (e) => {
      if (e.target.matches('[data-drawer-close]') || e.target.closest('a')) closeDrawer();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
    });
  }

  // ─────────────────────────────────────────
  // Hero — Jean expression cycler (index.html)
  //   data-jean-pack 内の .hero-idx-jean を巡回フェード
  // ─────────────────────────────────────────
  function setupHeroJean() {
    const pack = document.querySelector('[data-jean-pack]');
    if (!pack) return;
    const imgs = pack.querySelectorAll('.hero-idx-jean');
    if (!imgs.length) return;
    // respect reduced motion
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // show first immediately
    imgs[0].classList.add('on');
    if (reduce || imgs.length < 2) return;
    let i = 0;
    setInterval(() => {
      imgs[i].classList.remove('on');
      i = (i + 1) % imgs.length;
      imgs[i].classList.add('on');
    }, 2400);

    // クリックで即切り替え
    pack.addEventListener('click', () => {
      imgs[i].classList.remove('on');
      i = (i + 1) % imgs.length;
      imgs[i].classList.add('on');
    });
  }

  // ─────────────────────────────────────────
  // Hero — Parallax tilt on the Jean pedestal
  // ─────────────────────────────────────────
  function setupHeroParallax() {
    const hero = document.querySelector('.hero-idx');
    const art  = document.querySelector('.hero-idx-jean-wrap');
    if (!hero || !art) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    hero.addEventListener('mousemove', (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5;
      const y = (e.clientY - r.top)  / r.height - 0.5;
      art.style.setProperty('transform',
        'translate(' + (x * 18).toFixed(1) + 'px,' + (y * 14).toFixed(1) + 'px) rotate(' + (x * 4).toFixed(2) + 'deg)'
      );
    });
    hero.addEventListener('mouseleave', () => {
      art.style.removeProperty('transform');
    });
  }

  // ─────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    setupTheme();
    setupTocCurrent();
    setupMobileNav();
    setupFadeIn();
    setupWeightSlider();
    setupHeroJean();
    setupHeroParallax();
  });
})();
