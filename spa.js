/* spa.js — kinoshita.studio PJAX + BGM
   BGM modal on first visit, persistent top bar, page transitions without audio cut.
*/
(function () {
  if (window.__spa) return;
  window.__spa = true;

  // Windows PC: SPA遷移を無効化（ブラウザネイティブ遷移の方が高速）
  if (/Windows/.test(navigator.userAgent)) {
    // カスタムカーソル非表示 + デフォルトカーソル復元（全ページ共通）
    document.documentElement.classList.add('is-win');
    var ws = document.createElement('style');
    ws.textContent = '.is-win #cur-dot,.is-win #cur-ring{display:none!important}.is-win,.is-win *{cursor:auto!important}.is-win a,.is-win button{cursor:pointer!important}';
    document.head.appendChild(ws);
    // ビューポート2画面分以内の画像だけeager、それ以降はlazyのまま
    function _winEager(){
      var vh2 = window.innerHeight * 2;
      document.querySelectorAll('img[loading="lazy"]').forEach(function(img){
        var rect = img.getBoundingClientRect();
        if(rect.top < vh2) img.loading = 'eager';
      });
    }
    // ハンバーガーメニュー + サブメニューアコーディオン（SPA無効時も必須）
    function _winNav(){
      var btn = document.getElementById('nav-hamburger');
      var menu = document.getElementById('nav-menu');
      if (btn && menu) {
        var overlay = document.getElementById('nav-overlay');
        var close   = document.getElementById('nav-close');
        function _o(){ menu.classList.add('open'); if(overlay) overlay.classList.add('open'); document.body.style.overflow='hidden'; }
        function _c(){ menu.classList.remove('open'); if(overlay) overlay.classList.remove('open'); document.body.style.overflow=''; }
        btn.addEventListener('click', _o);
        if(close)   close.addEventListener('click', _c);
        if(overlay) overlay.addEventListener('click', _c);
        document.querySelectorAll('.nav-menu-link, .nav-menu a').forEach(function(a){
          a.addEventListener('click', _c);
        });
      }
      document.querySelectorAll('.nav-menu-group').forEach(function(grp){
        grp.addEventListener('click', function(){
          var subId = grp.getAttribute('data-sub');
          var sub = subId ? document.getElementById(subId) : null;
          if(!sub) return;
          var isOpen = grp.classList.contains('open');
          document.querySelectorAll('.nav-menu-group.open').forEach(function(b){
            b.classList.remove('open');
            var s = b.getAttribute('data-sub'); if(s){var el=document.getElementById(s);if(el)el.classList.remove('open');}
          });
          if(!isOpen){ grp.classList.add('open'); sub.classList.add('open'); }
        });
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function(){ _winEager(); _winNav(); });
    } else {
      _winEager(); _winNav();
    }
    return;
  }

  // ブラウザの自動スクロール復元を無効化 (back/forward で「少し下がった」問題の修正)
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // 初期URLを正規化: /index.html → / (back/forward で index.html と / が混在するのを防ぐ)
  (function() {
    var p = location.pathname.replace(/\/index\.html$/, '/');
    if (p !== location.pathname) history.replaceState({ url: p }, '', p);
    else if (!history.state) history.replaceState({ url: p }, '', p);
  }());

  /* ─── config ─── */
  const BGM_SRC = '/assets/audio/bgm.mp3';
  const EXCLUDE = new Set([
    'index2.html', 'indexcopy.html',
    'google682cc941004dfa24.html', '404.html',
    'research-admin.html'
  ]);
  const LS_BGM_KEY = 'ks_bgm_pref'; // 'on' | 'off' | null (first visit)
  const LS_BGM_VOL = 'ks_bgm_vol';  // float string, persists across reloads

  /* ─── audio element (persisted forever) ─── */
  const audio = new Audio();
  audio.loop    = true;
  audio.volume  = parseFloat(localStorage.getItem(LS_BGM_VOL) || '0.20');
  audio.preload = 'none';
  let audioReady = false;

  function loadAudio() {
    if (audioReady) return;
    audio.src = BGM_SRC;
    audioReady = true;
  }

  function playBGM() {
    loadAudio();
    audio.play().catch(() => {});
    bar.classList.add('ks-playing');
    updateBarBtn();
  }

  function pauseBGM() {
    audio.pause();
    bar.classList.remove('ks-playing');
    updateBarBtn();
  }

  function toggleBGM() {
    if (audio.paused) { playBGM(); localStorage.setItem(LS_BGM_KEY, 'on'); }
    else { pauseBGM(); localStorage.setItem(LS_BGM_KEY, 'off'); }
  }

  /* ─── inject styles ─── */
  const styleEl = document.createElement('style');
  styleEl.id = 'ks-spa-style';
  styleEl.textContent = `
    /* ── bottom bar ── */
    #ks-bar {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 9990;
      height: 40px;
      background: rgba(26,26,24,0.94);
      backdrop-filter: blur(8px) saturate(1.4);
      -webkit-backdrop-filter: blur(8px) saturate(1.4);
      display: flex; align-items: center; gap: 10px;
      padding: 0 16px;
      transform: translateY(100%) translateZ(0);
      -webkit-transform: translateY(100%) translateZ(0);
      transition: transform 0.20s cubic-bezier(.4,0,.2,1);
      will-change: transform;
      pointer-events: none;
    }
    #ks-bar.ks-visible {
      transform: translateY(0) translateZ(0);
      -webkit-transform: translateY(0) translateZ(0);
      pointer-events: auto;
    }
    #ks-bar-btn {
      background: none; border: none; padding: 0;
      color: rgba(235,232,226,0.9);
      cursor: pointer; display: flex; align-items: center;
      transition: opacity 0.2s;
      flex-shrink: 0;
    }
    #ks-bar-btn:hover { opacity: 0.6; }
    #ks-bar-btn svg { width: 14px; height: 14px; fill: currentColor; display: block; }
    #ks-bar-track {
      font-family: 'Space Mono', monospace;
      font-size: 10px; letter-spacing: 0.05em;
      color: rgba(235,232,226,0.5);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      flex: 1;
    }
    #ks-bar-dot {
      width: 5px; height: 5px; border-radius: 50%;
      background: rgba(235,232,226,0.25);
      flex-shrink: 0;
      transition: background 0.3s;
    }
    #ks-bar.ks-playing #ks-bar-dot {
      background: rgba(235,232,226,0.85);
      animation: ks-pulse 1.8s ease-in-out infinite;
    }
    @keyframes ks-pulse {
      0%,100%{opacity:1} 50%{opacity:0.3}
    }
    #ks-bar-vol {
      -webkit-appearance: none; appearance: none;
      width: 72px; height: 2px;
      background: rgba(235,232,226,0.2);
      border-radius: 1px; outline: none; cursor: pointer;
      flex-shrink: 0;
    }
    #ks-bar-vol::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px; height: 14px; border-radius: 50%;
      background: rgba(235,232,226,0.9);
    }
    /* mobile: hide vol slider by default on touch; JS shows it if volume control works (Android) */
    #ks-bar-mute {
      display: none;
      background: none; border: none; padding: 0;
      color: rgba(235,232,226,0.6);
      cursor: pointer; flex-shrink: 0;
    }
    #ks-bar-mute svg { width: 14px; height: 14px; fill: currentColor; display: block; }
    @media (hover: none) and (pointer: coarse) {
      #ks-bar-vol { display: none; }
      #ks-bar-mute { display: flex; align-items: center; }
    }
    /* ── modal ── */
    #ks-modal-wrap {
      position: fixed; inset: 0; z-index: 10000;
      background: rgba(26,26,24,0.72);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.3s;
      pointer-events: none;
    }
    #ks-modal-wrap.ks-open {
      opacity: 1; pointer-events: auto;
    }
    #ks-modal {
      background: #1a1a18;
      border: 1px solid rgba(235,232,226,0.1);
      border-radius: 2px;
      padding: 36px 32px 28px;
      width: min(340px, 90vw);
      color: #EBE8E2;
      font-family: 'Zen Kaku Gothic New', sans-serif;
      transform: translateY(12px);
      transition: transform 0.3s cubic-bezier(.4,0,.2,1);
    }
    #ks-modal-wrap.ks-open #ks-modal { transform: translateY(0); }
    #ks-modal h2 {
      font-family: 'Space Mono', monospace;
      font-size: 11px; letter-spacing: 0.1em;
      color: rgba(235,232,226,0.5);
      text-transform: uppercase;
      margin-bottom: 20px;
    }
    #ks-modal p {
      font-size: 14px; font-weight: 300; line-height: 1.7;
      color: rgba(235,232,226,0.8);
      margin-bottom: 28px;
    }
    .ks-modal-vol {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 28px;
    }
    .ks-modal-vol label {
      font-family: 'Space Mono', monospace;
      font-size: 10px; color: rgba(235,232,226,0.4);
      letter-spacing: 0.08em; white-space: nowrap;
    }
    #ks-modal-vol-range {
      -webkit-appearance: none; appearance: none;
      flex: 1; height: 2px;
      background: rgba(235,232,226,0.2);
      border-radius: 1px; outline: none; cursor: pointer;
    }
    #ks-modal-vol-range::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 12px; height: 12px; border-radius: 50%;
      background: #EBE8E2;
    }
    .ks-modal-btns {
      display: flex; gap: 10px;
    }
    #ks-modal-play {
      flex: 1;
      background: #EBE8E2; color: #1a1a18;
      border: none; border-radius: 1px;
      font-family: 'Space Mono', monospace;
      font-size: 11px; letter-spacing: 0.06em;
      padding: 11px 0; cursor: pointer;
      transition: opacity 0.2s;
    }
    #ks-modal-play:hover { opacity: 0.75; }
    #ks-modal-skip {
      background: none;
      color: rgba(235,232,226,0.20);
      border: 1px solid rgba(235,232,226,0.12);
      border-radius: 1px;
      font-family: 'Space Mono', monospace;
      font-size: 11px; letter-spacing: 0.04em;
      padding: 11px 16px; cursor: pointer;
      transition: opacity 0.2s;
    }
    #ks-modal-skip:hover { opacity: 0.6; }
    /* ── lang toggle ── */
    #ks-modal-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 20px;
    }
    #ks-modal-header h2 { margin-bottom: 0; }
    #ks-lang-toggle {
      display: flex; gap: 0;
      border: 1px solid rgba(235,232,226,0.15);
      border-radius: 1px; overflow: hidden; flex-shrink: 0;
    }
    .ks-lang-btn {
      font-family: 'Space Mono', monospace;
      font-size: 9px; letter-spacing: 0.12em;
      background: none; border: none; cursor: pointer;
      padding: 4px 8px; color: rgba(235,232,226,0.35);
      transition: background 0.2s, color 0.2s;
    }
    .ks-lang-btn.active {
      background: rgba(235,232,226,0.12);
      color: rgba(235,232,226,0.85);
    }
    /* ── unified nav base (overrides per-page CSS) ── */
    .nav-menu {
      background: #3a3a37 !important;
      border-left: 1px solid rgba(235,232,226,0.06) !important;
    }
    .nav-menu-close {
      color: rgba(235,232,226,0.6) !important;
    }
    .nav-menu-close:hover { color: rgba(235,232,226,0.95) !important; }
    .nav-menu-label {
      color: rgba(235,232,226,0.5) !important;
    }
    .nav-menu > a.nav-menu-link, .nav-menu > a {
      color: rgba(235,232,226,0.8) !important;
      border-bottom: 1px solid rgba(235,232,226,0.08) !important;
      border-top: none !important;
    }
    .nav-menu > a.nav-menu-link:hover { color: rgba(235,232,226,1) !important; }
    /* ── unified hamburger accordion ── */
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
      text-decoration: none;
      display: block; padding: 0.9rem 0;
      border-top: 1px solid rgba(235,232,226,0.08);
      transition: color 0.25s;
    }
    .nav-menu-line-link:hover { color: #06C755 !important; }
    .nav-menu-sns {
      display: flex; align-items: center; gap: 1.4rem;
      padding: 1.2rem 0 0.4rem;
      border-top: 1px solid rgba(235,232,226,0.08);
      margin-top: 0.4rem;
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
    /* ── page fade: 削除済み (各ページの pageIn アニメーションで遷移) ── */
    /* ── body offset for bar ── */
    body.ks-bar-on { padding-bottom: 40px; }
    /* ── scroll-top button: push above bar ── */
    body.ks-bar-on #scroll-top {
      bottom: calc(40px + 1.5rem) !important;
      z-index: 9995 !important;
    }
    /* ── PJAX遷移中: scroll-behavior: smooth を強制無効化 ──
       各ページが html{scroll-behavior:smooth} を持つため、
       遷移中のスクロールがアニメーション付きで見えてしまう問題の修正。 */
    html.ks-navigating, html.ks-navigating * { scroll-behavior: auto !important; }
    /* ── mobile: 横スクロール・自動ズーム防止 ──
       NOTE: overflow-x on <body> breaks position:fixed on iOS Safari.
       overflow-x on <html> alone is safe; body must stay overflow visible. */
    html { overflow-x: hidden; }
    body { max-width: 100vw; }
    /* iOS: テキスト入力でのピンチズーム防止 (font-size < 16px が原因) */
    input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]),
    textarea, select {
      font-size: max(16px, 1em) !important;
    }
    /* ダブルタップズーム・300ms遅延を無効化 */
    a, button, [onclick], label, input, textarea, select {
      touch-action: manipulation;
    }
  `;
  document.head.appendChild(styleEl);

  /* ─── build DOM ─── */
  // fade overlay を廃止 (pageIn アニメーションで代替)

  // bottom bar
  const bar = document.createElement('div');
  bar.id = 'ks-bar';
  bar.innerHTML = `
    <button id="ks-bar-btn" aria-label="BGM play/pause"></button>
    <span id="ks-bar-track">BIWAKO SILENCE</span>
    <span id="ks-bar-dot"></span>
    <input id="ks-bar-vol" type="range" min="0" max="1" step="0.01" value="0.20" aria-label="volume">
    <button id="ks-bar-mute" aria-label="mute"></button>
  `;
  // bar を <html> に append: body の overflow/transform の影響を受けず position:fixed が確実に効く
  document.documentElement.appendChild(bar);

  const barBtn  = document.getElementById('ks-bar-btn');
  const barVol  = document.getElementById('ks-bar-vol');
  const barMute = document.getElementById('ks-bar-mute');

  function svgPlay()  { return `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M5 3l9 5-9 5V3z"/></svg>`; }
  function svgPause() { return `<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12"/><rect x="9" y="2" width="4" height="12"/></svg>`; }
  function svgVol()   { return `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 5h3l4-3v12l-4-3H2z"/><path d="M10 5a5 5 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`; }
  function svgMuted() { return `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 5h3l4-3v12l-4-3H2z"/><line x1="10" y1="6" x2="14" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="14" y1="6" x2="10" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`; }

  function updateBarBtn()  { barBtn.innerHTML  = audio.paused ? svgPlay() : svgPause(); }
  function updateBarMute() { barMute.innerHTML = audio.muted  ? svgMuted() : svgVol(); }
  updateBarBtn();
  updateBarMute();

  // barVol を audio.volume に合わせる（フルリロード時もlocalStorage値を反映）
  barVol.value = audio.volume;

  // iOS は JS 音量制御不可（UA 判定）→ スライダー非表示のまま / Android 等は表示
  (function() {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!isIOS) { barVol.style.display = 'block'; barMute.style.display = 'none'; }
  })();

  barBtn.addEventListener('click', toggleBGM);
  barVol.addEventListener('input', () => {
    audio.volume = parseFloat(barVol.value);
    localStorage.setItem(LS_BGM_VOL, barVol.value);
  });
  barMute.addEventListener('click', () => {
    audio.muted = !audio.muted;
    updateBarMute();
  });

  // modal
  const modalWrap = document.createElement('div');
  modalWrap.id = 'ks-modal-wrap';
  modalWrap.innerHTML = `
    <div id="ks-modal">
      <div id="ks-modal-header">
        <h2 id="ks-modal-title">ようこそ、木下スタジオへ。</h2>
        <div id="ks-lang-toggle">
          <button class="ks-lang-btn active" data-lang="jp">JP</button>
          <button class="ks-lang-btn" data-lang="en">EN</button>
        </div>
      </div>
      <p id="ks-modal-body">木下貴博が作曲した音楽が、<br>このサイトには流れています。<br>ご不要な方はそのままSKIPでお進みください。</p>
      <div class="ks-modal-vol">
        <label>VOL</label>
        <input id="ks-modal-vol-range" type="range" min="0" max="1" step="0.01" value="0.20">
      </div>
      <div class="ks-modal-btns">
        <button id="ks-modal-play">▶ PLAY</button>
        <button id="ks-modal-skip">SKIP</button>
      </div>
    </div>
  `;
  document.documentElement.appendChild(modalWrap);

  const modalVolRange = document.getElementById('ks-modal-vol-range');
  const modalPlayBtn = document.getElementById('ks-modal-play');
  const modalSkipBtn = document.getElementById('ks-modal-skip');

  // lang toggle
  const LANG = {
    jp: {
      title: 'ようこそ、木下スタジオへ。',
      body:  '木下貴博が作曲した音楽が、<br>このサイトには流れています。<br>ご不要な方はそのままSKIPでお進みください。',
      play:  '▶ PLAY', skip: 'SKIP'
    },
    en: {
      title: 'Welcome to Kinoshita Studio.',
      body:  'Music composed by Takahiro Kinoshita<br>plays throughout this site.<br>Press SKIP if you prefer silence.',
      play:  '▶ PLAY', skip: 'SKIP'
    }
  };
  document.querySelectorAll('.ks-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      document.querySelectorAll('.ks-lang-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('ks-modal-title').textContent = LANG[lang].title;
      document.getElementById('ks-modal-body').innerHTML   = LANG[lang].body;
      modalPlayBtn.textContent = LANG[lang].play;
      modalSkipBtn.textContent = LANG[lang].skip;
    });
  });

  modalVolRange.value = audio.volume; // 保存済み音量を反映
  modalVolRange.addEventListener('input', () => {
    audio.volume = parseFloat(modalVolRange.value);
    barVol.value = modalVolRange.value;
    localStorage.setItem(LS_BGM_VOL, modalVolRange.value);
  });
  modalPlayBtn.addEventListener('click', () => { closeModal(); localStorage.setItem(LS_BGM_KEY, 'on'); playBGM(); });
  modalSkipBtn.addEventListener('click', () => { closeModal(); localStorage.setItem(LS_BGM_KEY, 'off'); });

  function openModal() {
    loadAudio();
    requestAnimationFrame(() => { modalWrap.classList.add('ks-open'); });
  }
  function closeModal() {
    modalWrap.classList.remove('ks-open');
    setTimeout(() => { modalWrap.remove(); }, 350);
    showBar();
  }

  function showBar() {
    bar.classList.add('ks-visible');
    document.body.classList.add('ks-bar-on');
  }

  /* ─── init on load ─── */
  window.addEventListener('DOMContentLoaded', () => {
    const pref = localStorage.getItem(LS_BGM_KEY);
    if (pref === null) {
      openModal();
    } else if (pref === 'on') {
      showBar();
      playBGM();
    } else {
      showBar();
    }
  });

  /* ─── グローバルマウス座標追跡 (カーソル左端固定バグ修正用) ─── */
  let _mouseX = 0, _mouseY = 0;
  document.addEventListener('mousemove', e => { _mouseX = e.clientX; _mouseY = e.clientY; }, { passive: true, capture: true });

  /* ─── Adaptive cursor color: 背景輝度に応じてカーソル色を自動切替 ─── */
  let _curColorRaf = 0;
  document.addEventListener('mousemove', function(e) {
    if (_curColorRaf) return;
    var _ex = e.clientX, _ey = e.clientY;
    _curColorRaf = requestAnimationFrame(function() {
      _curColorRaf = 0;
      if (document.body.classList.contains('cur-hover')) return;
      var dot = document.getElementById('cur-dot');
      var ring = document.getElementById('cur-ring');
      if (!dot || !ring) return;
      var el = document.elementFromPoint(_ex, _ey);
      if (!el) return;
      var bg = null, node = el;
      while (node && node !== document.documentElement) {
        var c = getComputedStyle(node).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') { bg = c; break; }
        node = node.parentElement;
      }
      if (!bg) bg = getComputedStyle(document.body).backgroundColor;
      if (!bg) return;
      var m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return;
      var lum = 0.2126*(m[1]/255) + 0.7152*(m[2]/255) + 0.0722*(m[3]/255);
      var isDark = lum < 0.4;
      dot.style.background = isDark ? 'rgba(235,232,226,0.9)' : '#1a1a18';
      ring.style.borderColor = isDark ? 'rgba(235,232,226,0.45)' : 'rgba(26,26,24,0.4)';
    });
  }, {passive: true});

  /* ─── スクロールリビール (IO の代替・補完) ─────────────────────
     IntersectionObserver は PJAX 後のタイミングで発火しないことがある。
     spa.js のスクロールハンドラが .reveal / .rv / .fade-in を確実に拾う。
  ─────────────────────────────────────────────────────────────── */
  function _revealOnScroll() {
    var h = window.innerHeight;
    document.querySelectorAll('.reveal:not(.visible),.rv:not(.visible),.fade-in:not(.visible)').forEach(function(el) {
      var r = el.getBoundingClientRect();
      if (r.top < h - 40 && r.bottom > 0) el.classList.add('visible');
    });
  }
  window.addEventListener('scroll', _revealOnScroll, { passive: true });

  /* ─── PJAX ─── */
  let _navigating = false; // concurrent navigation guard

  function isSpaLink(a) {
    const href = a.getAttribute('href') || '';
    if (a.target === '_blank') return false;
    if (/^(#|mailto:|tel:|javascript:|https?:\/\/)/.test(href)) return false;
    if (href === '' || href === '#') return false;
    // extract filename
    const filename = href.split('/').pop().split('?')[0];
    if (EXCLUDE.has(filename)) return false;
    return true;
  }

  function getPageName(url) {
    const p = new URL(url, location.href).pathname;
    return p === '/' ? 'index' : p.replace(/^\//, '').replace(/\.html$/, '').replace(/-/g, ' ');
  }

  async function navigate(url, push, restoreScrollY) {
    if (_navigating) return; // 競合ナビゲーション防止

    // リンククリック時のみ同一ページ判定 (back/forward では行わない)
    if (push) {
      const _dest = new URL(url, location.href);
      if (_dest.pathname === location.pathname) {
        if (_dest.hash) {
          const _t = document.getElementById(_dest.hash.slice(1));
          if (_t) _t.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }
      // 現在のページのスクロール位置を history state に保存してから遷移
      history.replaceState(
        Object.assign({}, history.state || {}, { scrollY: window.scrollY }),
        '', location.href
      );
    }

    _navigating = true;
    document.documentElement.classList.add('ks-navigating'); // smooth scroll 無効化

    // ローディングバー表示
    let _pbar = document.getElementById('ks-pbar');
    if (!_pbar) {
      _pbar = document.createElement('div'); _pbar.id = 'ks-pbar';
      _pbar.style.cssText = 'position:fixed;top:0;left:0;height:2px;width:0;background:#1a1a18;z-index:99999;transition:width 0.4s ease,opacity 0.3s ease;pointer-events:none;';
      document.body.appendChild(_pbar);
    }
    _pbar.style.opacity = '1'; _pbar.style.width = '40%';

    let html;
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) { _navigating = false; document.documentElement.classList.remove('ks-navigating'); _pbar.style.opacity='0'; location.href = url; return; }
      _pbar.style.width = '80%';
      html = await res.text();
    } catch (e) {
      _navigating = false; document.documentElement.classList.remove('ks-navigating'); _pbar.style.opacity='0'; location.href = url; return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    document.title = doc.title;
    updateMeta(doc);

    document.head.querySelectorAll('style:not(#ks-spa-style)').forEach(s => s.remove());
    doc.head.querySelectorAll('style').forEach(s => {
      document.head.appendChild(document.adoptNode(s));
    });

    // bar は <html> 直下にあるため body.innerHTML 差し替えの影響を受けない (削除不要)
    const modalExists = document.getElementById('ks-modal-wrap');
    if (modalExists) modalExists.remove();

    document.body.innerHTML = doc.body.innerHTML;
    document.body.className = doc.body.className;
    // body.style.animation は上書きしない → 各ページの pageIn アニメーションを自然に再生させる
    document.body.style.opacity   = '';
    document.body.style.overflow  = '';  // hamburger が残した overflow:hidden をリセット

    if (modalExists) document.documentElement.appendChild(modalExists);

    if (bar.classList.contains('ks-visible')) document.body.classList.add('ks-bar-on');

    // フェード中に即時スクロール (ks-navigating で smooth 無効済みなので instant)
    const hash = new URL(url, location.href).hash;
    // back/forward は保存済み scrollY に、通常遷移は top へ
    window.scrollTo(0, hash ? 0 : (restoreScrollY || 0));

    // カーソルスクリプトが正しい位置で初期化できるよう座標と世代番号をグローバルで渡す
    // 世代番号を上げると古い tick()/mousemove ループが自動停止する (蓄積による固まりバグの修正)
    window._ksCursorX = _mouseX;
    window._ksCursorY = _mouseY;
    window._ksCursorGen = (window._ksCursorGen || 0) + 1;

    // 各ページの inline nav script が再バインドできるようフラグをリセット
    window._ksNavDone = false;

    // 各 script を個別に try/catch して1つのエラーで navigate 全体が止まるのを防ぐ
    document.body.querySelectorAll('script').forEach(old => {
      try {
        const fresh = document.createElement('script');
        if (old.src) { fresh.src = old.src; fresh.async = false; }
        else { fresh.textContent = old.textContent; }
        old.replaceWith(fresh);
      } catch(e) { /* 個別スクリプトエラーを隔離 */ }
    });

    // load / scroll を dispatch (why-not-delivered.html 等の window.load 依存ページ対応)
    window.dispatchEvent(new Event('load'));
    window.dispatchEvent(new Event('scroll'));

    if (push) {
      let _canon = new URL(url, location.href).pathname;
      _canon = _canon.replace(/\/index\.html$/, '/'); // index.html → / に正規化
      history.pushState({ url: _canon }, '', _canon);
    } else {
      // back/forward: URL バーをコンテンツに合わせる (/index.html → / 等の正規化)
      const _canon = (new URL(url, location.href).pathname).replace(/\/index\.html$/, '/');
      if (_canon !== location.pathname) {
        history.replaceState(Object.assign({}, history.state || {}, { url: _canon }), '', _canon);
      }
    }

    const trackSpan = document.getElementById('ks-bar-track');
    if (trackSpan) trackSpan.textContent = 'BIWAKO SILENCE';

    // 1 rAF 待ってレイアウト確定後、viewport 内の reveal 要素を強制表示
    try {
      await new Promise(r => requestAnimationFrame(r));
      forceRevealViewport();

      // hash アンカーへのスクロールはフェードが上がる前に完了させる
      // (ks-navigating 有効中 = instant scroll なのでユーザーには見えない)
      if (hash) {
        const target = document.querySelector(hash);
        if (target) {
          target.scrollIntoView();
          forceRevealViewport(); // 新しいビューポート位置で再reveal
        }
      }

      await new Promise(r => setTimeout(r, 30));
    } finally {
      _navigating = false;
      document.documentElement.classList.remove('ks-navigating'); // smooth scroll 復元
      const _pb = document.getElementById('ks-pbar');
      if (_pb) { _pb.style.width = '100%'; setTimeout(() => { _pb.style.opacity='0'; setTimeout(()=>{ _pb.style.width='0'; },300); }, 150); }
    }

    bindLinks();
    bindAccordion();

    // index.html の カスタムカーソル (cur-dot/cur-ring) を最後のマウス位置に初期化
    // (PJAX後に left:0,top:0 で左端に固定される問題の修正)
    (function() {
      var cd = document.getElementById('cur-dot');
      var cr = document.getElementById('cur-ring');
      if (cd) { cd.style.left = _mouseX + 'px'; cd.style.top = _mouseY + 'px'; }
      if (cr) { cr.style.left = _mouseX + 'px'; cr.style.top = _mouseY + 'px'; }
      if (cd || cr) {
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: _mouseX, clientY: _mouseY, bubbles: true }));
      }
    }());

    // ハンバーガーメニュー 保証バインド
    // cloneNode で古いリスナーを全消しして新規バインドする (重複防止)
    (function() {
      var btn = document.getElementById('nav-hamburger');
      var menu = document.getElementById('nav-menu');
      if (!btn || !menu) return;
      var overlay = document.getElementById('nav-overlay');
      var close   = document.getElementById('nav-close');

      // cloneNode でリスナーをリセット
      var nb = btn.cloneNode(true); btn.parentNode.replaceChild(nb, btn); btn = nb;
      if (close)   { var nc = close.cloneNode(true);   close.parentNode.replaceChild(nc, close);     close   = nc; }
      if (overlay) { var no = overlay.cloneNode(true); overlay.parentNode.replaceChild(no, overlay); overlay = no; }

      function _o() { menu.classList.add('open'); if (overlay) overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
      function _c() { menu.classList.remove('open'); if (overlay) overlay.classList.remove('open'); document.body.style.overflow = ''; }
      btn.addEventListener('click', _o);
      if (close)   close.addEventListener('click', _c);
      if (overlay) overlay.addEventListener('click', _c);
      document.querySelectorAll('.nav-menu-link, .nav-menu a').forEach(function(a) {
        a.addEventListener('click', function(e) {
          _c();
          const href = a.getAttribute('href') || '';
          if (href.startsWith('#')) {
            e.preventDefault();
            var id = href.slice(1);
            var target = document.getElementById(id);
            if (target) requestAnimationFrame(function() { target.scrollIntoView({ behavior: 'smooth' }); });
          }
        });
      });
    }());
  }

  function bindAccordion() {
    document.querySelectorAll('.nav-menu-group').forEach(function(btn) {
      if (btn.__ks_acc) return;
      btn.__ks_acc = true;
      btn.addEventListener('click', function() {
        var subId = btn.getAttribute('data-sub');
        var sub = subId ? document.getElementById(subId) : null;
        if (!sub) return;
        var isOpen = btn.classList.contains('open');
        document.querySelectorAll('.nav-menu-group.open').forEach(function(b) {
          b.classList.remove('open');
          var s = b.getAttribute('data-sub');
          if (s) { var el = document.getElementById(s); if (el) el.classList.remove('open'); }
        });
        if (!isOpen) { btn.classList.add('open'); sub.classList.add('open'); }
      });
    });
  }

  function forceRevealViewport() {
    const h = window.innerHeight;

    // ① IO ベースの reveal (.fade-in / .reveal / .rv)
    document.querySelectorAll(
      '.fade-in:not(.visible), .reveal:not(.visible), .rv:not(.visible)'
    ).forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < h && r.bottom > 0) el.classList.add('visible');
    });

    // ② inline style で opacity:0 かつ animation がある要素を強制表示
    //    (index.html の style="opacity:0;animation:fadeUp..." 等の JS-set 要素対策)
    //    CSS クラスで animation だけ定義している入場アニメーション (heroIn 等) は
    //    el.style.opacity が空のため除外し、自然に再生させる
    document.querySelectorAll('*').forEach(el => {
      if (el === bar || el === modalWrap) return; // SPA管理要素はスキップ
      const r = el.getBoundingClientRect();
      if (r.top >= h || r.bottom <= 0 || r.width === 0 || r.height === 0) return;
      const s = getComputedStyle(el);
      // el.style.opacity (inline) が '0' = JS-set stuck 要素
      // s.opacity (computed) だけが '0' = CSS animation 中の入場要素 → スキップ
      if (el.style.opacity === '0' && s.animationName && s.animationName !== 'none') {
        el.style.animation = 'none';
        el.style.opacity   = '1';
        el.style.transform = 'none';
      }
    });
  }

  function updateMeta(doc) {
    const metas = ['description', 'keywords', 'og:title', 'og:description', 'og:image', 'og:url',
                   'twitter:title', 'twitter:description', 'twitter:image'];
    metas.forEach(name => {
      const isOg = name.startsWith('og:') || name.startsWith('twitter:');
      const attr = isOg ? 'property' : 'name';
      const newM = doc.head.querySelector(`meta[${attr}="${name}"]`);
      if (!newM) return;
      let curM = document.head.querySelector(`meta[${attr}="${name}"]`);
      if (!curM) { curM = document.createElement('meta'); curM.setAttribute(attr, name); document.head.appendChild(curM); }
      curM.setAttribute('content', newM.getAttribute('content'));
    });
    // canonical
    const newC = doc.head.querySelector('link[rel="canonical"]');
    if (newC) {
      let curC = document.head.querySelector('link[rel="canonical"]');
      if (!curC) { curC = document.createElement('link'); curC.rel = 'canonical'; document.head.appendChild(curC); }
      curC.href = newC.href;
    }
  }

  function bindLinks() {
    document.querySelectorAll('a[href]').forEach(a => {
      if (a.__ks_bound) return;
      a.__ks_bound = true;
      const href = a.getAttribute('href') || '';
      if (isSpaLink(a)) {
        a.addEventListener('mouseenter', () => {
          const abs = new URL(href, location.href).href;
          if (!document.head.querySelector('link[rel="prefetch"][href="' + abs + '"]')) {
            const pf = document.createElement('link'); pf.rel = 'prefetch'; pf.href = abs;
            document.head.appendChild(pf);
          }
        }, { once: true, passive: true });
        a.addEventListener('click', e => {
          e.preventDefault();
          navigate(href, true);
        });
      } else if (href.startsWith('#') && href.length > 1) {
        // ネイティブ hash ナビの代わりに scrollIntoView を使う
        // (SPA 環境で body overflow:hidden 解除タイミング等による上部スクロール問題を回避)
        a.addEventListener('click', e => {
          e.preventDefault();
          const target = document.getElementById(href.slice(1));
          if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
      }
    });
  }

  // onclick="location.href='...'" を PJAX に乗せる (capture phase)
  document.addEventListener('click', e => {
    const el = e.target.closest('[onclick]');
    if (!el) return;
    const attr = el.getAttribute('onclick') || '';
    const m = attr.match(/(?:window\.)?location\.href\s*=\s*['"]([^'"]+)['"]/);
    if (!m) return;
    const href = m[1];
    if (/^(mailto:|tel:|javascript:|https?:\/\/)/.test(href)) return;
    const filename = href.split('/').pop().split('?')[0];
    if (EXCLUDE.has(filename)) return;
    e.stopImmediatePropagation(); // onclick を実行させない
    navigate(href, true);
  }, true); // capture phase

  // popstate (back/forward)
  window.addEventListener('popstate', e => {
    let url       = (e.state && e.state.url) || location.pathname;
    url = url.replace(/\/index\.html$/, '/'); // 旧 history state の /index.html を正規化
    const scrollY = (e.state && e.state.scrollY != null) ? e.state.scrollY : 0;
    navigate(url, false, scrollY);
  });

  // initial bind
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { bindLinks(); bindAccordion(); });
  } else {
    bindLinks(); bindAccordion();
  }

})();
