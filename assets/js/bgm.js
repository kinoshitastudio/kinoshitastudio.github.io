(function(){
  'use strict';

  var AUDIO_SRC = '/assets/Ishin%20Denshin%20_%20%E4%BB%A5%E5%BF%83%E4%BC%9D%E5%BF%83.mp3';
  var KEY_PLAYING = 'bgm_playing';
  var KEY_VOLUME  = 'bgm_volume';
  var KEY_SHOWN   = 'bgm_modal_shown';
  var DEFAULT_VOL = 0.20; // デフォルト音量（低め）
  var FADE_STEPS  = 80;   // フェードイン: 80ステップ×60ms = 約5秒でゆっくり上昇
  var FADE_MS     = 60;
  var FADEOUT_STEPS = 25;
  var FADEOUT_MS    = 30;

  // ── CSS 注入 ──────────────────────────────────────────────────
  if (!document.getElementById('bgm-styles')) {
    var style = document.createElement('style');
    style.id = 'bgm-styles';
    style.textContent = [
      '#bgm-overlay{position:fixed;inset:0;z-index:8000;background:rgba(10,10,8,.72);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1.5rem;opacity:0;pointer-events:none;transition:opacity .5s ease;}',
      '#bgm-overlay.show{opacity:1;pointer-events:all;}',
      '#bgm-modal{background:#EBE8E2;max-width:420px;width:100%;padding:3rem 2.5rem;}',
      '.bgm-eyebrow{font-family:"Space Mono",monospace;font-size:.48rem;letter-spacing:.32em;color:#a89060;text-transform:uppercase;margin-bottom:1.6rem;}',
      '.bgm-title{font-family:"Zen Kaku Gothic New",sans-serif;font-size:1.5rem;font-weight:400;color:#1a1a18;line-height:1.3;margin-bottom:.4rem;}',
      '.bgm-subtitle{font-family:"Space Mono",monospace;font-size:.58rem;letter-spacing:.14em;color:#7a7770;margin-bottom:1.8rem;}',
      '.bgm-desc{font-family:"Zen Kaku Gothic New",sans-serif;font-size:.8rem;color:#3a3a34;line-height:2.2;margin-bottom:2rem;border-left:1px solid #a89060;padding-left:1rem;}',
      '.bgm-vol-row{display:flex;align-items:center;gap:1rem;margin-bottom:2rem;}',
      '.bgm-vol-label{font-family:"Space Mono",monospace;font-size:.48rem;letter-spacing:.2em;color:#7a7770;white-space:nowrap;}',
      '#bgm-vol-slider{-webkit-appearance:none;appearance:none;flex:1;height:2px;background:linear-gradient(to right,#a89060 20%,rgba(26,26,24,.18) 20%);outline:none;cursor:none;touch-action:none;}',
      '#bgm-vol-slider::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#a89060;cursor:none;-webkit-tap-highlight-color:transparent;}',
      '#bgm-vol-slider::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#a89060;border:none;cursor:none;}',
      '.bgm-actions{display:flex;gap:1rem;}',
      '#bgm-play-btn{flex:1;background:#1a1a18;color:#EBE8E2;border:none;padding:.9rem 1.5rem;font-family:"Space Mono",monospace;font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;cursor:none;transition:background .2s;}',
      '#bgm-play-btn:hover{background:#a89060;}',
      '#bgm-skip-btn{background:none;color:#7a7770;border:1px solid rgba(26,26,24,.18);padding:.9rem 1.2rem;font-family:"Space Mono",monospace;font-size:.58rem;letter-spacing:.15em;cursor:none;transition:border-color .2s,color .2s;}',
      '#bgm-skip-btn:hover{border-color:#7a7770;color:#1a1a18;}',
      '#bgm-float{position:fixed;bottom:4.5rem;right:2rem;z-index:8500;display:none;align-items:center;gap:.6rem;opacity:0;pointer-events:none;transition:opacity .4s ease;}',
      '#bgm-float.visible{opacity:1;pointer-events:all;}',
      '#bgm-mute-btn{background:none;border:none;cursor:none;padding:0;display:flex;align-items:center;opacity:.45;transition:opacity .2s;}',
      '#bgm-mute-btn:hover{opacity:.9;}',
      '#bgm-mute-btn svg{width:18px;height:18px;stroke:#1a1a18;fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;}',
      '#bgm-nav-slider{-webkit-appearance:none;appearance:none;width:60px;height:2px;background:linear-gradient(to right,#1a1a18 20%,rgba(26,26,24,.18) 20%);outline:none;cursor:none;touch-action:none;}',
      '#bgm-nav-slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#1a1a18;cursor:none;-webkit-tap-highlight-color:transparent;}',
      '#bgm-nav-slider::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#1a1a18;border:none;cursor:none;}',
      '@media(max-width:600px){#bgm-modal{padding:2rem 1.5rem;}#bgm-nav-slider{width:44px;}#bgm-float{bottom:5.5rem;right:1.5rem;}}'
    ].join('');
    document.head.appendChild(style);
  }

  // ── モーダル HTML 注入 ────────────────────────────────────────
  if (!document.getElementById('bgm-overlay')) {
    var wrap = document.createElement('div');
    wrap.innerHTML = '<div id="bgm-overlay"><div id="bgm-modal" role="dialog" aria-modal="true">' +
      '<p class="bgm-eyebrow">— Biwako Silence / 木下貴博</p>' +
      '<p class="bgm-title">以心伝心</p>' +
      '<p class="bgm-subtitle">Ishin Denshin</p>' +
      '<p class="bgm-desc">このサイトでは、木下貴博が滋賀県・琼琥湖で<br>制作したアンビエント音楽が流れます。<br>音量を調整してお楽しみください。</p>' +
      '<div class="bgm-vol-row"><span class="bgm-vol-label">— Volume</span><input type="range" id="bgm-vol-slider" min="0" max="100" value="20"></div>' +
      '<div class="bgm-actions"><button id="bgm-play-btn">再生する →</button><button id="bgm-skip-btn">Skip</button></div>' +
      '</div></div>';
    document.body.insertBefore(wrap.firstChild, document.body.firstChild);
  }

  // ── フローティングコントロール 注入 ──────────────────────────
  if (!document.getElementById('bgm-float')) {
    var fc = document.createElement('div');
    fc.id = 'bgm-float';
    fc.innerHTML =
      '<button id="bgm-mute-btn" aria-label="BGMミュート">' +
        '<svg id="bgm-icon-on" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>' +
        '<svg id="bgm-icon-off" viewBox="0 0 24 24" style="display:none"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>' +
      '</button>' +
      '<input type="range" id="bgm-nav-slider" min="0" max="100" value="20" aria-label="音量">';
    document.body.appendChild(fc);
  }

  // ── Audio 要素 ────────────────────────────────────────────────
  var audio = document.getElementById('bgm-audio');
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = 'bgm-audio';
    audio.loop = true;
    audio.preload = 'none';
    var src = document.createElement('source');
    src.src = AUDIO_SRC;
    src.type = 'audio/mpeg';
    audio.appendChild(src);
    document.body.appendChild(audio);
  }

  // ── 状態読み込み ──────────────────────────────────────────────
  var savedVol   = parseFloat(localStorage.getItem(KEY_VOLUME) || DEFAULT_VOL);
  var isPlaying  = localStorage.getItem(KEY_PLAYING) === 'yes';
  var modalShown = localStorage.getItem(KEY_SHOWN)   === '1';

  // スライダー初期値を保存音量に合わせる
  function initSliders() {
    var pct = Math.round(savedVol * 100);
    var ms = document.getElementById('bgm-vol-slider');
    var ns = document.getElementById('bgm-nav-slider');
    if (ms) { ms.value = pct; updateGrad(ms, pct); }
    if (ns) { ns.value = pct; updateGrad(ns, pct); }
  }
  initSliders();

  function updateGrad(el, val) {
    var c = el.id === 'bgm-nav-slider' ? '#1a1a18' : '#a89060';
    el.style.background = 'linear-gradient(to right,' + c + ' ' + val + '%,rgba(26,26,24,.18) ' + val + '%)';
  }

  function showFloat() {
    var f = document.getElementById('bgm-float');
    if (!f) return;
    f.style.display = 'flex';
    setTimeout(function(){ f.classList.add('visible'); }, 30);
  }

  function hideFloat() {
    var f = document.getElementById('bgm-float');
    if (f) { f.classList.remove('visible'); setTimeout(function(){ f.style.display = 'none'; }, 400); }
  }

  // ── フェードイン（ゆっくり） ──────────────────────────────────
  function fadeIn(targetVol) {
    audio.volume = 0;
    var step = 0;
    var iv = setInterval(function(){
      step++;
      audio.volume = Math.min(targetVol, (targetVol / FADE_STEPS) * step);
      if (step >= FADE_STEPS) clearInterval(iv);
    }, FADE_MS);
  }

  // ── フェードアウト ────────────────────────────────────────────
  function fadeOut(cb) {
    var vol = audio.volume;
    var step = 0;
    var iv = setInterval(function(){
      step++;
      audio.volume = Math.max(0, vol - (vol / FADEOUT_STEPS) * step);
      if (step >= FADEOUT_STEPS) { clearInterval(iv); if (cb) cb(); }
    }, FADEOUT_MS);
  }

  // ── 前ページで再生中なら自動再開 ─────────────────────────────
  if (isPlaying) {
    var startBgm = function(){
      audio.play().then(function(){
        fadeIn(savedVol);
        showFloat();
      }).catch(function(){
        localStorage.setItem(KEY_PLAYING, 'no');
      });
    };
    if (document.readyState === 'complete') {
      startBgm();
    } else {
      window.addEventListener('load', startBgm);
    }
  } else if (!modalShown) {
    // 初回モーダル表示
    setTimeout(function(){
      var ov = document.getElementById('bgm-overlay');
      if (ov) ov.classList.add('show');
    }, 800);
  }

  // ── ページ遷移前フェードアウト ────────────────────────────────
  document.addEventListener('click', function(e){
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (a.target === '_blank' || /^(#|mailto:|tel:|javascript:|https?:\/\/)/.test(href)) return;
    if (!audio.paused) fadeOut();
  }, true);

  // ── クリックイベント（委譲） ──────────────────────────────────
  document.addEventListener('click', function(e){
    var t = e.target;

    // 再生ボタン
    if (t.id === 'bgm-play-btn') {
      var ov  = document.getElementById('bgm-overlay');
      var vs  = document.getElementById('bgm-vol-slider');
      var vol = vs ? (parseInt(vs.value) / 100) : DEFAULT_VOL;
      if (ov) ov.classList.remove('show');
      localStorage.setItem(KEY_PLAYING, 'yes');
      localStorage.setItem(KEY_VOLUME,  vol);
      localStorage.setItem(KEY_SHOWN,   '1');
      savedVol = vol;
      audio.play().then(function(){ fadeIn(vol); showFloat(); }).catch(function(){});
    }

    // スキップ
    if (t.id === 'bgm-skip-btn') {
      var ov = document.getElementById('bgm-overlay');
      if (ov) ov.classList.remove('show');
      localStorage.setItem(KEY_SHOWN,   '1');
      localStorage.setItem(KEY_PLAYING, 'no');
    }

    // ミュートボタン
    var muteEl = t.id === 'bgm-mute-btn' ? t : (t.closest ? t.closest('#bgm-mute-btn') : null);
    if (muteEl) {
      audio.muted = !audio.muted;
      var on  = document.getElementById('bgm-icon-on');
      var off = document.getElementById('bgm-icon-off');
      if (on)  on.style.display  = audio.muted ? 'none'  : 'block';
      if (off) off.style.display = audio.muted ? 'block' : 'none';
      muteEl.style.opacity = audio.muted ? '0.2' : '0.45';
    }
  });

  // ── 音量スライダー ────────────────────────────────────────────
  document.addEventListener('input', function(e){
    var t = e.target;
    if (t.id === 'bgm-vol-slider') {
      updateGrad(t, t.value);
    }
    if (t.id === 'bgm-nav-slider') {
      var vol = t.value / 100;
      audio.volume = vol;
      savedVol = vol;
      localStorage.setItem(KEY_VOLUME, vol);
      updateGrad(t, t.value);
      if (audio.muted) {
        audio.muted = false;
        var on  = document.getElementById('bgm-icon-on');
        var off = document.getElementById('bgm-icon-off');
        if (on)  on.style.display  = 'block';
        if (off) off.style.display = 'none';
        document.getElementById('bgm-mute-btn').style.opacity = '0.45';
      }
    }
  });

})();
