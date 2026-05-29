(function () {
  // 同一サイト内のナビゲーション（カテゴリ・記事間の移動）ではモーダルをスキップ
  // 判定1: sessionStorage（同タブ内ナビゲーション）
  // 判定2: referrer が同じホスト（同サイトのリンクから新タブを開いたケース）
  const skipModal = (() => {
    try { if (sessionStorage.getItem('__ENOUGH__')) return true; } catch (e) {}
    try {
      if (document.referrer) {
        const ref = new URL(document.referrer);
        if (ref.hostname === location.hostname) return true;
      }
    } catch (e) {}
    return false;
  })();

  const DEFAULT_MESSAGE = '数字は、あなたじゃない。';
  const DEFAULT_DURATION = 1;

  let overlay = null;
  let remaining = DEFAULT_DURATION;
  let tick = null;

  function startTimer(duration) {
    if (!overlay) return;
    remaining = duration;
    const timerEl = overlay.querySelector('#enough-timer');
    if (timerEl) timerEl.textContent = remaining;
    if (tick) clearInterval(tick);
    tick = setInterval(() => {
      remaining--;
      const el = overlay && overlay.querySelector('#enough-timer');
      if (el) el.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(tick);
        overlay.classList.add('enough-out');
        setTimeout(() => { if (overlay) overlay.remove(); }, 600);
      }
    }, 1000);
  }

  // モーダルは初回のみ表示
  if (!skipModal) {
    try { sessionStorage.setItem('__ENOUGH__', '1'); } catch (e) {}
    overlay = document.createElement('div');
    overlay.id = 'enough-overlay';
    overlay.innerHTML = `
      <div id="enough-title">ENOUGH</div>
      <div id="enough-message">${DEFAULT_MESSAGE}</div>
      <div id="enough-timer">${DEFAULT_DURATION}</div>
    `;
    (document.documentElement || document.body || document.head).appendChild(overlay);
    startTimer(DEFAULT_DURATION);
  }

  // メトリクス非表示: storage を確認してから実行
  // 200ms 以内に応答がなければフォールバックで実行（コールバック不発対策）
  let _metricsStarted = false;
  const _startMetrics = () => { if (!_metricsStarted) { _metricsStarted = true; setupMetrics(); } };
  const _metricsTimer = setTimeout(_startMetrics, 200);

  try {
    chrome.storage.sync.get(
      { message: '', duration: DEFAULT_DURATION, hideMetrics: true },
      (data) => {
        clearTimeout(_metricsTimer);
        if (chrome.runtime.lastError) { _startMetrics(); return; }
        if (data.hideMetrics !== false) _startMetrics();
        if (overlay) {
          const message = (data.message || '').trim() || DEFAULT_MESSAGE;
          const duration = Math.min(30, Math.max(1, data.duration || DEFAULT_DURATION));
          const msgEl = overlay.querySelector('#enough-message');
          if (msgEl) msgEl.textContent = message;
          startTimer(duration);
        }
      }
    );
  } catch (e) {
    clearTimeout(_metricsTimer);
    _startMetrics();
  }


  // ─── メトリクス非表示 ──────────────────────────────────
  function setupMetrics() {
    const host = location.hostname;

    if (host.includes('x.com') || host.includes('twitter.com')) { setupX(); return; }
    if (host.includes('tiktok.com'))  { setupTikTok(); return; }
    if (host.includes('bsky.app'))    { setupBluesky(); return; }
    if (host.includes('reddit.com'))  { setupReddit(); return; }
    if (host.includes('twitch.tv'))   { setupTwitch(); return; }
    if (host.includes('instagram.com'))  { setupInstagram(); return; }
    if (host.includes('threads.net') || host.includes('threads.com')) { setupThreads(); return; }
    if (host.includes('facebook.com'))   { setupFacebook(); return; }
    if (host.includes('linkedin.com'))   { setupLinkedIn(); return; }
    if (host.includes('soundcloud.com')) { setupSoundCloud(); return; }
    if (host.includes('youtube.com'))    { setupYouTube(); return; }
    if (host.includes('note.com'))       { setupNote(); return; }
  }

  function setupX() {
    injectCSS(xCSS());
    setupJsHide(false);
  }

  function setupTikTok() {
    injectCSS(tiktokCSS());

    const NUMERIC = /^\d[\d,.KMBkmb万千億]*$/;
    const hide = () => {
      // data-e2e ベース（動画ページ）
      document.querySelectorAll(
        '[data-e2e="like-count"],[data-e2e="comment-count"],[data-e2e="share-count"],' +
        '[data-e2e="followers-count"],[data-e2e="following-count"],[data-e2e="video-like-count"]'
      ).forEach(el => el.style.setProperty('visibility', 'hidden', 'important'));

      // プロフィール: DivCounterWrapper / DivNumber（React コンポーネント名）
      document.querySelectorAll('[class*="CounterWrapper"],[class*="DivNumber"],[class*="StrongNumber"]').forEach(el => {
        el.style.setProperty('visibility', 'hidden', 'important');
      });

      // 数値 + 単位テキストのテキストスキャン
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const t = node.textContent.trim();
        if (t.length < 15 && /^\d[\d,.]*\s*(万|千|K|M)?$/.test(t)) {
          const p = node.parentElement;
          if (p && !p.dataset.enoughHidden) {
            p.style.setProperty('visibility', 'hidden', 'important');
            p.dataset.enoughHidden = '1';
          }
        }
      }
    };

    const start = () => {
      [0, 500, 1500, 3000].forEach(ms => setTimeout(hide, ms));
      const obs = new MutationObserver(hide);
      obs.observe(document.body, { childList: true, subtree: true });
      setInterval(hide, 3000);
    };

    document.body ? start() : document.addEventListener('DOMContentLoaded', start);
  }

  function setupBluesky() {
    injectCSS(blueskyCSS());
    setupJsHide(false);
  }

  function setupReddit() {
    injectCSS(`
      faceplate-number { display: none !important; }
      [id^="vote-arrows"] span, [id^="vote-arrows"] faceplate-number,
      shreddit-post [slot="vote-bar"] faceplate-number,
      .score, .points, [class*="karma"],
      [data-testid="post-total-votes"],
      [data-click-id="upvote"] + span,
      [aria-label*="upvote"] ~ faceplate-number { visibility: hidden !important; }
    `);

    const NUMERIC = /^\d[\d,.]+[KMBkmb万千億]?$|^\d+$/;

    const hideEl = (el) => {
      if (!el || el === document.body) return;
      el.style.setProperty('visibility', 'hidden', 'important');
    };

    const hide = () => {
      // faceplate-number カスタム要素（新 Reddit UI）
      // 親 button の visibility:visible に負けるため display:none で対応
      document.querySelectorAll('faceplate-number').forEach(el => {
        el.style.setProperty('display', 'none', 'important');
      });

      // vote-arrows コンテナ内の数値
      document.querySelectorAll('[id^="vote-arrows"]').forEach(el => {
        el.querySelectorAll('span, div, faceplate-number').forEach(child => {
          if (!child.children.length && NUMERIC.test(child.textContent.trim())) hideEl(child);
        });
        // Shadow DOM 対応
        if (el.shadowRoot) {
          el.shadowRoot.querySelectorAll('span, faceplate-number').forEach(child => {
            if (NUMERIC.test(child.textContent.trim())) hideEl(child);
          });
        }
      });

      // コメント数・シェア数（投稿カード下部）
      document.querySelectorAll(
        '[data-testid="comment-count"], [data-click-id="comments"] span, ' +
        'a[href*="/comments/"] span, [aria-label*="comment"] span'
      ).forEach(el => {
        if (!el.children.length && NUMERIC.test(el.textContent.trim())) hideEl(el);
      });

      // プロフィール karma
      document.querySelectorAll('[class*="karma"], [id*="karma"]').forEach(el => {
        el.style.setProperty('visibility', 'hidden', 'important');
      });

      // テキストスキャン: 数値のみのノード
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const t = node.textContent.trim();
        if (t.length < 12 && NUMERIC.test(t)) {
          const p = node.parentElement;
          if (!p || p.dataset.enoughHidden || p === document.body) continue;
          // vote-arrows や post-footer 付近のみ対象（誤爆防止）
          let ancestor = p;
          for (let i = 0; i < 6; i++) {
            if (!ancestor) break;
            const id = ancestor.id || '';
            const cls = ancestor.className || '';
            if (/vote|score|karma|comment|share|award/i.test(id + cls)) {
              hideEl(p);
              p.dataset.enoughHidden = '1';
              break;
            }
            ancestor = ancestor.parentElement;
          }
        }
      }
    };

    const start = () => {
      [0, 500, 1500, 3000, 5000].forEach(ms => setTimeout(hide, ms));
      const obs = new MutationObserver(hide);
      obs.observe(document.body, { childList: true, subtree: true });
      setInterval(hide, 3000);
    };

    document.body ? start() : document.addEventListener('DOMContentLoaded', start);
  }

  function injectCSS(css) {
    if (!css) return;
    const existing = document.getElementById('enough-metrics-hide');
    if (existing) { existing.textContent += '\n' + css; return; }
    const style = document.createElement('style');
    style.id = 'enough-metrics-hide';
    style.textContent = css;
    document.documentElement.appendChild(style);
  }

  // ─── CSS 定義 ─────────────────────────────────────────
  function xCSS() { return `
    [data-testid="like"] span[data-testid="app-text-transition-container"],
    [data-testid="unlike"] span[data-testid="app-text-transition-container"],
    [data-testid="retweet"] span[data-testid="app-text-transition-container"],
    [data-testid="unretweet"] span[data-testid="app-text-transition-container"],
    [data-testid="reply"] span[data-testid="app-text-transition-container"],
    [data-testid="bookmark"] span[data-testid="app-text-transition-container"],
    a[href*="/followers"] span,
    a[href*="/following"] span,
    a[href*="/verified_followers"] span { visibility: hidden !important; }
  `; }

  function tiktokCSS() { return `
    [data-e2e="like-count"], [data-e2e="comment-count"],
    [data-e2e="share-count"], [data-e2e="followers-count"],
    [data-e2e="following-count"], [data-e2e="video-like-count"] { visibility: hidden; }
  `; }

  function setupYouTube() {
    const SELECTORS = [
      // 高評価数
      '#top-level-buttons-computed yt-formatted-string',
      'like-button-view-model yt-formatted-string',
      'like-button-view-model span',
      'segmented-like-dislike-button-view-model yt-formatted-string',
      '#segmented-like-button yt-formatted-string',
      // チャンネル登録者数（旧 + 新コンポーネント）
      '#subscriber-count',
      'yt-formatted-string#owner-sub-count',
      'ytd-subscribe-button-renderer yt-formatted-string',
      'yt-content-metadata-view-model',
      '#channel-subscriber-count',
      // 再生回数
      '#count .view-count',
      'span.view-count',
      '.ytd-video-meta-block span.ytd-video-meta-block',
      'ytd-video-meta-block yt-formatted-string',
    ].join(',');

    const hide = () => {
      document.querySelectorAll(SELECTORS).forEach(el => {
        el.style.setProperty('visibility', 'hidden', 'important');
      });

      // テキストベース: 「チャンネル登録者数」を含む要素を検出
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const toHide = [];
      let node;
      while ((node = walker.nextNode())) {
        const text = node.textContent.trim();
        if (/チャンネル登録者数|登録者数|\d[\d,.]*\s*(万|千)?人/.test(text) && text.length < 80) {
          toHide.push(node.parentElement);
        }
      }
      toHide.forEach(el => {
        if (el) el.style.setProperty('visibility', 'hidden', 'important');
      });
    };

    const start = () => {
      [0, 500, 1000, 2000, 4000].forEach(ms => setTimeout(hide, ms));
      const obs = new MutationObserver(hide);
      obs.observe(document.body, { childList: true, subtree: true });
      setInterval(hide, 3000);
    };

    document.body ? start() : document.addEventListener('DOMContentLoaded', start);
  }

  function blueskyCSS() { return `
    [data-testid="likeCount"], [data-testid="repostCount"],
    [data-testid="replyCount"], [data-testid="quoteCount"],
    a[href$="/followers"] span, a[href$="/follows"] span { visibility: hidden; }
  `; }

  function setupSoundCloud() {
    injectCSS(`
      .sc-ministats-item, .sc-button-counter,
      .soundTitle__playCount, .soundBadge__stats,
      .sc-button-like .sc-button-count,
      .sc-button-repost .sc-button-count,
      [class*="likeCount"], [class*="like_count"],
      [class*="repostCount"], [class*="playCount"],
      .soundStats__item, .soundStats,
      sc-formatted-number { visibility: hidden !important; }
    `);

    const NUMERIC = /^\d[\d,.KMBkmb万千億]*$/;

    const hide = () => {
      document.querySelectorAll('[class*="infoStats"]').forEach(el => {
        el.style.setProperty('display', 'none', 'important');
      });
      document.querySelectorAll('sc-formatted-number').forEach(el => {
        el.style.setProperty('visibility', 'hidden', 'important');
      });
      document.querySelectorAll('a[href*="/followers"], a[href*="/following"]').forEach(el => {
        el.style.setProperty('visibility', 'hidden', 'important');
      });
      // like/repost ボタン周辺の数値 span を消す
      document.querySelectorAll(
        'button[class*="like"], button[class*="Like"], button[title*="like"], button[title*="Like"],' +
        'button[class*="repost"], button[class*="Repost"]'
      ).forEach(btn => {
        [btn, btn.parentElement].forEach(el => {
          if (!el) return;
          el.querySelectorAll('span, div').forEach(child => {
            if (!child.children.length && NUMERIC.test(child.textContent.trim())) {
              child.style.setProperty('visibility', 'hidden', 'important');
            }
          });
        });
      });
      // soundActions 内の数値を消す
      document.querySelectorAll('[class*="soundActions"] span, [class*="soundAction"] span').forEach(el => {
        if (!el.children.length && NUMERIC.test(el.textContent.trim())) {
          el.style.setProperty('visibility', 'hidden', 'important');
        }
      });
    };

    const start = () => {
      [0, 500, 1500, 3000, 5000].forEach(ms => setTimeout(hide, ms));
      const obs = new MutationObserver(hide);
      obs.observe(document.body, { childList: true, subtree: true });
      setInterval(hide, 3000);
    };

    document.body ? start() : document.addEventListener('DOMContentLoaded', start);
  }

  function setupTwitch() {
    injectCSS(`
      [data-a-target="animated-channel-viewers-count"],
      [data-a-target="followers-count"],
      [data-a-target*="follower"],
      .tw-animated-number { visibility: hidden !important; }
    `);

    const TWITCH_RE = /フォロワー|followers?|\d[\d,.]*\s*(万|千)?\s*(人|viewers?)/i;

    const hide = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const t = node.textContent.trim();
        if (t.length < 60 && TWITCH_RE.test(t)) {
          const p = node.parentElement;
          if (p && !p.dataset.enoughHidden) {
            p.style.setProperty('visibility', 'hidden', 'important');
            p.dataset.enoughHidden = '1';
          }
        }
      }
    };

    const start = () => {
      [0, 500, 1500, 3000].forEach(ms => setTimeout(hide, ms));
      setInterval(hide, 3000);
      const obs = new MutationObserver(hide);
      obs.observe(document.body, { childList: true, subtree: true });
    };

    document.body ? start() : document.addEventListener('DOMContentLoaded', start);
  }

  function setupNote() {
    injectCSS(`
      a[href*="/followers"], a[href*="/following"] { visibility: hidden !important; }
      button[aria-label*="スキ"] ~ span, button[aria-label*="スキ"] ~ div,
      button[aria-label*="ハート"] ~ span, button[aria-label*="ハート"] ~ div,
      button[aria-label*="ハート"] + span, button[aria-label*="ハート"] + div,
      button[aria-label*="ハート"] span { visibility: hidden !important; }
      .n-noteAction_item span, [class*="noteAction"] span,
      [class*="nv-action"] span, [class*="action_like"] span,
      [class*="gl-z-font-secondary"], span.gl-z-font-secondary,
      [class*="noteStatus"], [class*="likeCount"], [class*="like_count"],
      [class*="articleStatus"], [class*="note-like"], [class*="noteLike"],
      button:has(svg) span, button:has(svg) + span, button:has(svg) ~ span,
      button:has(svg) + div, button:has(svg) ~ div,
      a:has(svg) span, a:has(svg) + span, a:has(svg) ~ span,
      a:has(svg) + div, a:has(svg) ~ div { visibility: hidden !important; }
    `);

    const NUMERIC = /^\d[\d,.]*([KMBkmb万千億]|\s*スキ|\s*件)?$|^\d+$/;
    const NOTE_RE = /フォロワー|フォロー|スキ|\d[\d,.]*\s*(万|千)?\s*人/;

    const hideEl = (el) => {
      if (!el || el === document.body) return;
      el.style.setProperty('visibility', 'hidden', 'important');
      el.dataset.enoughHidden = '1';
    };

    const hideDescendantCounts = (container) => {
      container.querySelectorAll('span, div, p').forEach(child => {
        if (!child.children.length && NUMERIC.test(child.textContent.trim())) hideEl(child);
      });
    };

    const hide = () => {
      // SVG 起点: 親・祖父の兄弟にある数値を消す
      document.querySelectorAll('svg').forEach(svg => {
        const parent = svg.parentElement;
        if (!parent) return;
        const isNumeric = (el) => NUMERIC.test(el.textContent.trim());
        [svg.nextElementSibling, svg.previousElementSibling].forEach(s => {
          if (s && isNumeric(s)) hideEl(s);
        });
        for (let up = 0; up < 3; up++) {
          const target = [parent, parent.parentElement, parent.parentElement?.parentElement][up];
          if (!target || target === document.body) break;
          let s = target.nextElementSibling;
          while (s) {
            if (isNumeric(s)) hideEl(s);
            hideDescendantCounts(s);
            s = s.nextElementSibling;
          }
          s = target.previousElementSibling;
          while (s) {
            if (isNumeric(s)) hideEl(s);
            hideDescendantCounts(s);
            s = s.previousElementSibling;
          }
        }
      });

      // ハートボタン直接: ボタン自体の兄弟 + 親コンテナの兄弟も消す
      document.querySelectorAll('button[aria-label*="スキ"], button[aria-label*="ハート"]').forEach(btn => {
        let sib = btn.nextElementSibling;
        while (sib) { hideEl(sib); hideDescendantCounts(sib); sib = sib.nextElementSibling; }
        sib = btn.previousElementSibling;
        while (sib) { hideEl(sib); hideDescendantCounts(sib); sib = sib.previousElementSibling; }
        btn.querySelectorAll('span, div').forEach(child => {
          if (/\d/.test(child.textContent)) hideEl(child);
        });
        // 親コンテナの兄弟も対象
        const p = btn.parentElement;
        if (p && p !== document.body) {
          let s = p.nextElementSibling;
          while (s) { hideEl(s); hideDescendantCounts(s); s = s.nextElementSibling; }
        }
      });

      // likes リンク経由のカウント
      document.querySelectorAll('a[href*="/likes"]').forEach(a => {
        a.querySelectorAll('span, div').forEach(child => {
          if (/\d/.test(child.textContent.trim())) hideEl(child);
        });
        if (NUMERIC.test(a.textContent.trim())) hideEl(a);
      });

      // テキストノードスキャン: フォロワー/スキ 含む要素を消す
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const t = node.textContent.trim();
        if (t.length < 40 && NOTE_RE.test(t)) {
          const p = node.parentElement;
          if (p && !p.dataset.enoughHidden) hideEl(p);
        }
      }
    };

    const start = () => {
      [0, 300, 800, 1500, 3000, 6000].forEach(ms => setTimeout(hide, ms));
      const obs = new MutationObserver(hide);
      obs.observe(document.body, { childList: true, subtree: true });
      setInterval(hide, 2000);
    };

    document.body ? start() : document.addEventListener('DOMContentLoaded', start);
  }

  function setupFacebook() {
    injectCSS(`
      a[href*="followers"] { visibility: hidden !important; }
      a[href*="/friends"] span { visibility: hidden !important; }
    `);

    const METRICS_RE = /フォロワー|followers?|友達\s*\d|共通の友達|\d[\d,]*\s*(万|千)?\s*人|件の(反応|コメント|シェア)|\d[\d,]*\s*(reaction|comment|share)/i;

    const hide = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const t = node.textContent.trim();
        if (t.length < 80 && METRICS_RE.test(t)) {
          // 親→祖父→曾祖父と最大3段上まで隠す（Facebookの再レンダリング対策）
          let el = node.parentElement;
          for (let i = 0; i < 3; i++) {
            if (!el || el === document.body) break;
            if (!el.dataset.enoughHidden) {
              el.style.setProperty('visibility', 'hidden', 'important');
              el.dataset.enoughHidden = '1';
            }
            // 兄弟要素も含む親まで上がれたら十分
            if (el.parentElement && el.parentElement.childElementCount <= 4) {
              el = el.parentElement;
            } else {
              break;
            }
          }
        }
      }
    };

    const start = () => {
      [0, 300, 800, 1500, 3000, 6000].forEach(ms => setTimeout(hide, ms));
      setInterval(hide, 2000);
      const obs = new MutationObserver(hide);
      obs.observe(document.body, { childList: true, subtree: true });
    };

    document.body ? start() : document.addEventListener('DOMContentLoaded', start);
    setupJsHide(false);
  }

  // ─── Instagram ────────────────────────────────────────
  function setupInstagram() {
    injectCSS(`
      a[href$="/followers/"] span > span,
      a[href$="/following/"] span > span { visibility: hidden; }
    `);
    setupJsHide(true);
  }

  // ─── Threads ──────────────────────────────────────────
  function setupThreads() {
    injectCSS(`
      div:has(> [role="button"]:has(svg)) > span,
      div:has(> [role="button"]:has(svg)) > span span,
      div:has(svg) + span,
      div:has(svg) ~ span { visibility: hidden; }
    `);
    setupJsHide(true);
  }

  // ─── LinkedIn ─────────────────────────────────────────
  function setupLinkedIn() {
    injectCSS(`
      .social-details-social-counts__reactions-count,
      .social-details-social-counts__comments,
      [data-test-id="social-actions__social-count"] { visibility: hidden; }
    `);
    setupJsHide(true);
  }

  // ─── JS ヒューリスティック ─────────────────────────────
  function setupJsHide(useInterval) {
    const NUMERIC = /^\d[\d,.]*[KMBkmb万千億]?$|^\d+$/;

    function hideCountsIn(root) {
      if (!root || !root.querySelectorAll) return;
      root.querySelectorAll('span').forEach(span => {
        if (span.dataset.enoughHidden) return;
        const text = span.textContent.trim();
        if (!NUMERIC.test(text)) return;
        let el = span;
        for (let i = 0; i < 10; i++) {
          if (!el.parentElement) break;
          el = el.parentElement;
          if (el.querySelector('svg')) {
            span.style.visibility = 'hidden';
            span.dataset.enoughHidden = '1';
            break;
          }
        }
      });
    }

    const start = () => {
      [0, 300, 800, 1500, 3000].forEach(ms =>
        setTimeout(() => hideCountsIn(document.body), ms)
      );
      const obs = new MutationObserver((mutations) => {
        mutations.forEach(m => {
          m.addedNodes.forEach(node => {
            if (node.nodeType === 1) hideCountsIn(node);
          });
        });
      });
      obs.observe(document.body, { childList: true, subtree: true });
      if (useInterval) setInterval(() => hideCountsIn(document.body), 2000);
    };

    document.body ? start() : document.addEventListener('DOMContentLoaded', start);
  }

})();
