/* spa.js — kinoshita.studio PJAX + BGM
   BGM modal on first visit, persistent top bar, page transitions without audio cut.
*/
(function () {
  if (window.__spa) return;
  window.__spa = true;

  /* ─── config ─── */
  const BGM_SRC = '/assets/audio/bgm.mp3';
  const EXCLUDE = new Set([
    'index2.html', 'indexcopy.html',
    'google682cc941004dfa24.html', '404.html',
    'research-admin.html'
  ]);
  const LS_BGM_KEY = 'ks_bgm_pref'; // 'on' | 'off' | null (first visit)

  /* ─── audio element (persisted forever) ─── */
  const audio = new Audio();
  audio.loop = true;
  audio.volume = 0.35;
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
      transform: translateY(100%);
      transition: transform 0.35s cubic-bezier(.4,0,.2,1);
      pointer-events: none;
    }
    #ks-bar.ks-visible {
      transform: translateY(0);
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
      width: 56px; height: 2px;
      background: rgba(235,232,226,0.2);
      border-radius: 1px; outline: none; cursor: pointer;
      flex-shrink: 0;
    }
    #ks-bar-vol::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 10px; height: 10px; border-radius: 50%;
      background: rgba(235,232,226,0.8);
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
      color: rgba(235,232,226,0.35);
      border: 1px solid rgba(235,232,226,0.12);
      border-radius: 1px;
      font-family: 'Space Mono', monospace;
      font-size: 11px; letter-spacing: 0.04em;
      padding: 11px 16px; cursor: pointer;
      transition: opacity 0.2s;
    }
    #ks-modal-skip:hover { opacity: 0.6; }
    /* ── page fade ── */
    #ks-fade {
      position: fixed; inset: 0; z-index: 9998;
      background: #1a1a18;
      opacity: 0; pointer-events: none;
      transition: opacity 0.22s ease;
    }
    #ks-fade.ks-in { opacity: 1; pointer-events: auto; }
    /* ── body offset for bar ── */
    body.ks-bar-on { padding-bottom: 40px; }
  `;
  document.head.appendChild(styleEl);

  /* ─── build DOM ─── */
  // fade overlay
  const fade = document.createElement('div');
  fade.id = 'ks-fade';
  document.body.appendChild(fade);

  // bottom bar
  const bar = document.createElement('div');
  bar.id = 'ks-bar';
  bar.innerHTML = `
    <button id="ks-bar-btn" aria-label="BGM play/pause"></button>
    <span id="ks-bar-track">BIWAKO SILENCE</span>
    <span id="ks-bar-dot"></span>
    <input id="ks-bar-vol" type="range" min="0" max="1" step="0.01" value="0.35" aria-label="volume">
  `;
  document.body.appendChild(bar);

  const barBtn = document.getElementById('ks-bar-btn');
  const barVol = document.getElementById('ks-bar-vol');

  function svgPlay() {
    return `<svg viewBox="0 0 16 16"><path d="M5 3l9 5-9 5V3z"/></svg>`;
  }
  function svgPause() {
    return `<svg viewBox="0 0 16 16"><rect x="3" y="2" width="4" height="12"/><rect x="9" y="2" width="4" height="12"/></svg>`;
  }
  function updateBarBtn() {
    barBtn.innerHTML = audio.paused ? svgPlay() : svgPause();
  }
  updateBarBtn();

  barBtn.addEventListener('click', toggleBGM);
  barVol.addEventListener('input', () => { audio.volume = parseFloat(barVol.value); });

  // modal
  const modalWrap = document.createElement('div');
  modalWrap.id = 'ks-modal-wrap';
  modalWrap.innerHTML = `
    <div id="ks-modal">
      <h2>BGM</h2>
      <p>このサイトにはサウンドスケープが流れます。<br>音量を調整してお楽しみください。</p>
      <div class="ks-modal-vol">
        <label>VOL</label>
        <input id="ks-modal-vol-range" type="range" min="0" max="1" step="0.01" value="0.35">
      </div>
      <div class="ks-modal-btns">
        <button id="ks-modal-play">▶ PLAY</button>
        <button id="ks-modal-skip">SKIP</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalWrap);

  const modalVolRange = document.getElementById('ks-modal-vol-range');
  const modalPlayBtn = document.getElementById('ks-modal-play');
  const modalSkipBtn = document.getElementById('ks-modal-skip');

  modalVolRange.addEventListener('input', () => { audio.volume = parseFloat(modalVolRange.value); barVol.value = modalVolRange.value; });
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

  /* ─── PJAX ─── */
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

  async function navigate(url, push) {
    // fade out
    fade.classList.add('ks-in');
    await new Promise(r => setTimeout(r, 200));

    let html;
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) { location.href = url; return; }
      html = await res.text();
    } catch (e) {
      fade.classList.remove('ks-in');
      location.href = url;
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // update <title>
    document.title = doc.title;

    // update canonical / OG meta
    updateMeta(doc);

    // swap <style> in <head>: remove old page styles, inject new ones
    document.head.querySelectorAll('style:not(#ks-spa-style)').forEach(s => s.remove());
    doc.head.querySelectorAll('style').forEach(s => {
      const cloned = document.adoptNode(s);
      document.head.appendChild(cloned);
    });

    // detach bar + modal + fade from body before innerHTML swap
    bar.remove();
    fade.remove();
    // modal may already be removed; only detach if still present
    const modalExists = document.getElementById('ks-modal-wrap');
    if (modalExists) modalExists.remove();

    // swap body content
    document.body.innerHTML = doc.body.innerHTML;
    document.body.className = doc.body.className;

    // re-attach spa elements
    document.body.appendChild(fade);
    document.body.appendChild(bar);
    if (modalExists) document.body.appendChild(modalExists);

    // re-apply bar-on class
    if (bar.classList.contains('ks-visible')) document.body.classList.add('ks-bar-on');

    // re-execute inline scripts
    document.body.querySelectorAll('script').forEach(old => {
      const fresh = document.createElement('script');
      if (old.src) { fresh.src = old.src; fresh.async = false; }
      else { fresh.textContent = old.textContent; }
      old.replaceWith(fresh);
    });

    // update URL
    if (push) history.pushState({ url }, '', url);

    // update bar track name
    const trackSpan = document.getElementById('ks-bar-track');
    if (trackSpan) trackSpan.textContent = 'BIWAKO SILENCE';

    // fade in
    await new Promise(r => setTimeout(r, 30));
    fade.classList.remove('ks-in');

    // scroll to top
    window.scrollTo(0, 0);

    // re-bind spa links on new content
    bindLinks();
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
      if (!isSpaLink(a)) return;
      a.addEventListener('click', e => {
        e.preventDefault();
        const href = a.getAttribute('href');
        navigate(href, true);
      });
    });
  }

  // popstate (back/forward)
  window.addEventListener('popstate', e => {
    const url = (e.state && e.state.url) || location.href;
    navigate(url, false);
  });

  // initial bind
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindLinks);
  } else {
    bindLinks();
  }

})();
