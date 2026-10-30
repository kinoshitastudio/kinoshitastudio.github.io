/* ══ 靴擦れ間近の戯言 ── 縦組みの読書（kumi/ の DOKUSHO から 2026-10-30）══════
   ⭐ 記事の本文は <article id="src"> に【書いたまま】置く。ここではページに割るだけ。
   ⭐ ページ割り＝1ページの箱に【入るだけ】字を入れる（二分探索）。縦組みのはみ出しは scrollWidth で測る。
   ⭐ 1ページ目の頭に題と日付を置く（data-title / data-date）。
   ⭐ 読んでいた場所は【何文字目か】で記事ごとに覚える。この端末の中だけ。 */
(function(){
  const src = document.getElementById('src');
  const R = document.getElementById('reader'), box = document.getElementById('rd-text'), box2 = document.getElementById('rd-text2');
  const num = document.getElementById('rd-num'), prog = document.getElementById('rd-prog');
  const THEMES = [ { paper:'#fbf0dc', ink:'#5c4a37' },   /* ⭐ 見本（木下 10-30）＝生成りの紙にこげ茶 */
                   { paper:'#f4f2ee', ink:'#1a1a1a' },
                   { paper:'#ffffff', ink:'#111111' },
                   { paper:'#141414', ink:'#cfc9bd' } ];
  let st = { size: innerWidth < 760 ? 18 : 21, theme: 0 };
  try{ Object.assign(st, JSON.parse(localStorage.getItem('zaregoto_read_v1') || '{}')); }catch(_){}
  const saveSt = () => { try{ localStorage.setItem('zaregoto_read_v1', JSON.stringify(st)); }catch(_){} };

  /* ⭐ 本文の前後の空白だけ落とす。中の改行・言い回しは触らない */
  const raw = src.textContent.replace(/\r/g, '').replace(/^\s*\n/, '').replace(/\s+$/, '');
  /* ⭐ 段落の頭を1字下げる（見本と同じ）。表示のときだけ＝本文は書いたまま。
     ⚠️ すでに空白・括弧で始まる行と、空行は下げない */
  const text = raw.split('\n').map(l => l && !/^[\s　「『（(]/.test(l) ? '　' + l : l).join('\n');
  const cps = [...text];
  const posKey = 'zaregoto_pos_' + location.pathname;
  let spread = false, starts = [0], page = 0;

  /* ⭐ 1ページ目の頭（題・日付）。測るときも同じものを入れる＝割り方がずれない */
  function head(){
    const f = document.createDocumentFragment();
    const el = (c, s) => { const e = document.createElement('span'); e.className = c; e.textContent = s; return e; };
    const no = (location.pathname.match(/(\d{3})\/?(index\.html)?$/) || [])[1] || '';
    f.append(el('rd-mark', '戯言'), el('rd-rule', ''), el('rd-no', no), '　', el('rd-date', src.dataset.date || ''), '\n',
             el('rd-title', src.dataset.title || ''), '\n\n');
    return f;
  }
  function fill(el, a, e){
    el.textContent = '';
    if(a === 0) el.append(head());
    el.append(cps.slice(a, e).join(''));
  }
  const setSpread = () => { spread = innerWidth >= 900 && innerWidth > innerHeight * 1.1; R.classList.toggle('spread', spread); };
  function paint(){
    const t = THEMES[st.theme] || THEMES[0];
    document.body.style.setProperty('--rd-paper', t.paper); document.body.style.setProperty('--rd-ink', t.ink);
    R.style.setProperty('--rd-size', st.size + 'px');
  }
  const fits = () => box.scrollWidth <= box.clientWidth + 1 && box.scrollHeight <= box.clientHeight + 1;
  function paginate(){
    starts = [0];
    let a = 0, guard = 0;
    while(a < cps.length && guard++ < 20000){
      let lo, hi = cps.length, ok = a + 1, step = 256;
      /* ⭐ まず倍々で上限を探してから二分探索 */
      while(true){
        const e = Math.min(a + step, cps.length);
        fill(box, a, e);
        if(fits()){ ok = e; if(e >= cps.length) break; step *= 2; } else { hi = e - 1; break; }
      }
      lo = ok;
      while(lo < hi){
        const m = Math.ceil((lo + hi) / 2);
        fill(box, a, m);
        if(fits()){ lo = m; ok = m; } else { hi = m - 1; }
      }
      /* ⭐ 行の途中で切らない＝できれば句点・改行の後ろで切る */
      if(ok < cps.length){
        for(let k = ok; k > a + (ok - a) * 0.66; k--){ if('。」』！？\n'.includes(cps[k - 1])){ ok = k; break; } }
      }
      if(ok <= a) ok = a + 1;
      starts.push(ok); a = ok;
    }
    starts.pop();
    if(!starts.length) starts = [0];
  }
  function show(i, anim){
    page = Math.max(0, Math.min(starts.length - 1, i));
    if(spread) page -= page % 2;                    /* ⭐ 見開きは右ページ（偶数）から */
    const put = () => {
      const end = k => starts[k + 1] ?? cps.length;
      fill(box, starts[page], end(page));
      if(spread && page + 1 < starts.length) fill(box2, starts[page + 1], end(page + 1)); else box2.textContent = '';
      const last = spread ? Math.min(page + 2, starts.length) : page + 1;
      num.textContent = (spread && last > page + 1 ? (page + 1) + '–' + last : String(page + 1)) + ' / ' + starts.length;
      prog.style.width = (last / starts.length * 100) + '%';
      try{ localStorage.setItem(posKey, String(starts[page])); }catch(_){}
    };
    if(anim){ box.classList.add('turn'); box2.classList.add('turn');
      setTimeout(() => { put(); box.classList.remove('turn'); box2.classList.remove('turn'); }, 140); } else put();
  }
  const pageOf = ch => { let i = 0; for(let k = 0; k < starts.length; k++) if(starts[k] <= ch) i = k; return i; };
  function reflow(keep){
    const ch = keep ?? starts[page] ?? 0;
    setSpread(); paint(); paginate(); show(pageOf(ch), false);
  }
  const next = () => { const k = spread ? 2 : 1; if(page + k < starts.length) show(page + k, true); };
  const prev = () => { const k = spread ? 2 : 1; if(page > 0) show(page - k, true); };

  document.getElementById('rd-tapL').onclick = () => { next(); R.classList.add('calm'); };
  document.getElementById('rd-tapR').onclick = () => { prev(); R.classList.add('calm'); };
  /* ⭐ 真ん中をタップ＝上のボタンを出す／隠す */
  box.addEventListener('click', () => R.classList.toggle('calm'));
  box2.addEventListener('click', () => R.classList.toggle('calm'));
  document.getElementById('rd-small').onclick = () => { st.size = Math.max(13, st.size - 2); saveSt(); reflow(); };
  document.getElementById('rd-big').onclick   = () => { st.size = Math.min(40, st.size + 2); saveSt(); reflow(); };
  document.getElementById('rd-theme').onclick = () => { st.theme = (st.theme + 1) % THEMES.length; saveSt(); paint(); };
  addEventListener('keydown', e => {
    if(e.key === 'ArrowLeft' || e.key === ' ' || e.key === 'PageDown'){ e.preventDefault(); next(); }
    else if(e.key === 'ArrowRight' || e.key === 'PageUp'){ e.preventDefault(); prev(); }
    else if(e.key === 'Escape') location.href = document.getElementById('rd-close').href;
  });
  /* ⭐ スワイプ＝指を右へ払うと次（右から左へ進む本と同じ向き） */
  let sx = null, sy = 0;
  R.addEventListener('touchstart', e => { if(e.touches.length === 1){ sx = e.touches[0].clientX; sy = e.touches[0].clientY; } }, { passive:true });
  R.addEventListener('touchend', e => {
    if(sx === null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if(Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)){ dx > 0 ? next() : prev(); R.classList.add('calm'); }
  }, { passive:true });
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => reflow(), 200); });

  let saved = 0; try{ saved = +localStorage.getItem(posKey) || 0; }catch(_){}
  setSpread(); paint(); fill(box, 0, Math.min(200, cps.length));   /* ⭐ 先に字を置く＝書体の読み込みが始まる */
  /* ⚠️ 書体が読み込まれる前に割ると、あとで字幅が変わってはみ出す＝読み込みを待つ */
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(() => { paginate(); show(pageOf(saved), false); }));
})();
