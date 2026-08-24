/* ══ 連 REN 並べる 自己試験（本体には入れない）══
   ⭐ 本体のコピーの末尾に差し込み、headless Chrome で読む。<pre id="__RESULT"> に書く。
   ⚠️ 実際の関数を通す（clips に直に押し込むのではなく、addFiles と同じ形の素材を作る）。 */
(function(){
  const R = [];
  const ok = (n, c, d) => R.push({ n, p: !!c, d: d || '' });
  const num = v => (typeof v === 'number' ? Math.round(v*100)/100 : v);

  /* 素材は canvas から作る（FileReader を待たない）。⚠️ 動画は headless で作れないので
     「動画のふり」＝videoWidth/videoHeight/duration/currentTime を持つ札を使う。 */
  function imgClip(w, h, col, name){
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.fillStyle = col; x.fillRect(0,0,w,h);
    x.fillStyle = '#fff'; x.fillRect(w*0.25, h*0.25, w*0.5, h*0.5);
    /* ⚠️ 本体は寸法を naturalWidth（画像）／videoWidth（動画）で読む。canvas は両方持たないので足す */
    Object.defineProperty(c, 'naturalWidth',  { value:w });
    Object.defineProperty(c, 'naturalHeight', { value:h });
    return { type:'img', el:c, name, url:'' , dur:1.0 };
  }
  function vidClip(w, h, dur, name){
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.fillStyle = '#0af'; x.fillRect(0,0,w,h);
    /* canvas に videoWidth 等を足して「動画の札」にする＝drawImage はそのまま通る */
    Object.defineProperty(c, 'videoWidth',  { value:w });
    Object.defineProperty(c, 'videoHeight', { value:h });
    c.duration = dur; c.currentTime = 0;
    c.play = () => Promise.resolve();
    return { type:'vid', el:c, name, url:'', in:0, out:dur };
  }

  function run(){
    try{
      const seg = (k, v) => document.querySelector('.seg[data-seg="'+k+'"] button[data-v="'+v+'"]').click();
      const px = (nx, ny) => {
        const d = g.getImageData(Math.round(cv.width*nx), Math.round(cv.height*ny), 1, 1).data;
        return d[0]+','+d[1]+','+d[2];
      };

      // ── 版面：SNS の定型が【出せる】か（前は40刻みで 1350 が出せなかった）
      document.getElementById('bSns').click();
      ok('SNS 1080×1350 が1押しで出せる', cv.width === 1080 && cv.height === 1350, cv.width+'×'+cv.height);

      // ── 素材3本（縦長・尺ちがい）
      clips.length = 0;
      clips.push(vidClip(400, 500, 2.0, 'a.mp4'));
      clips.push(vidClip(400, 500, 5.0, 'b.mp4'));
      clips.push(imgClip(400, 500, '#e0322a', 'c.png'));
      afterAdd();

      // ── 順に繋ぐ＝足し算 ／ 同時に並べる＝いちばん長いもの
      ok('順に繋ぐ尺は足し算', Math.abs(total() - (2+5+1)) < 0.01, num(total()));
      seg('narabe', 1);
      ok('同時に並べる尺は【いちばん長いもの】', Math.abs(total() - 5) < 0.01, num(total()));

      // ── 置き場が3つ配られ、重ならない（升目）
      document.getElementById('bGrid').click();
      const places = clips.map(c => c.tilt);
      ok('3本ぜんぶに置き場が付く', places.every(t => t && t.sc > 0),
         places.map(t => t ? Math.round(t.x*100)+','+Math.round(t.y*100) : '-').join(' / '));
      ok('升目は同じ所に重ねない',
         new Set(places.map(t => Math.round(t.x*100)+','+Math.round(t.y*100))).size === 3);
      ok('置き場は版面の中に入っている',
         places.every(t => t.x > 0 && t.x < 1 && t.y > 0 && t.y < 1));
      ok('升目では傾けない（台形にしない）', places.every(t => !t.rx && !t.ry && !t.ps));

      // ── ずらして並べても版面から出ない（右上が切れていた）
      document.getElementById('bScatter').click();
      const out = clips.filter(c => {
        const b = narabeBox(c);
        return !b || b.x - b.w/2 < -0.002 || b.x + b.w/2 > 1.002
                  || b.y - b.h/2 < -0.002 || b.y + b.h/2 > 1.002;
      });
      ok('ずらして並べても版面からはみ出さない', out.length === 0,
         clips.map(c => { const b = narabeBox(c);
           return Math.round((b.x-b.w/2)*100) + '〜' + Math.round((b.x+b.w/2)*100); }).join(' / '));
      document.getElementById('bGrid').click();

      // ── 1コマの絵に【3本ぜんぶ】写るか（画素で見る）
      frameAt(0);
      const hit = clips.map(c => {
        const b = narabeBox(c);
        return b ? px(b.x, b.y) : 'なし';
      });
      const bg = px(0.01, 0.01);
      ok('1コマに3本ぜんぶ写る', hit.every(v => v !== bg && v !== 'なし'), hit.join(' / ') + '（地=' + bg + '）');

      // ── 短いものは繰り返す（止まって最後の1コマにならない）
      const a = clips[0];
      frameAt(0.5); const t1 = a.el.currentTime;
      frameAt(2.5); const t2 = a.el.currentTime;   // 尺2.0 なので 0.5 に戻るはず
      ok('短いものは自分の尺で繰り返す', Math.abs(t2 - 0.5) < 0.2 && Math.abs(t1 - 0.5) < 0.2,
         '0.5s→' + num(t1) + ' / 2.5s→' + num(t2));

      // ── 触った絵をそのまま掴める（掴み分けができている）
      const b2 = narabeBox(clips[2]);
      ok('触った所の絵を拾える', narabePick(b2.x, b2.y) === 2, '拾った=' + narabePick(b2.x, b2.y));
      ok('何も無い所は拾わない', narabePick(0.02, 0.02) === -1);

      // ── 大きさのつまみが【選んだ1枚だけ】に効く（他へ乗り移らない）
      sel = 1; tiltNote();
      const scEl = document.getElementById('tlSc');
      ok('選ぶとつまみにその1枚の値が出る', +scEl.value === Math.round(clips[1].tilt.sc),
         'つまみ' + scEl.value + ' / 絵' + Math.round(clips[1].tilt.sc));
      const other0 = Math.round(clips[0].tilt.sc), keepXY = clips[1].tilt.x;
      scEl.value = 30; scEl.dispatchEvent(new Event('input'));
      ok('大きさは選んだ1枚だけ変わる',
         Math.round(clips[1].tilt.sc) === 30 && Math.round(clips[0].tilt.sc) === other0,
         '選=' + num(clips[1].tilt.sc) + ' 他=' + num(clips[0].tilt.sc));
      ok('大きさを変えても位置は動かない', Math.abs(clips[1].tilt.x - keepXY) < 1e-9);

      // ── 傾けボタンは【置き場を消さない】（消すと版面いっぱいに戻って全部覆う）
      document.getElementById('bTilt').click();
      ok('傾けても置き場は消えない', !!clips[1].tilt, clips[1].tilt ? '有' : '無');
      ok('傾けると角度が付く', !!(clips[1].tilt.rx || clips[1].tilt.ry || clips[1].tilt.ps));
      document.getElementById('bTilt').click();
      ok('もう一度押すとまっすぐに戻る（置き場は残る）',
         !!clips[1].tilt && !clips[1].tilt.rx && !clips[1].tilt.ry && !clips[1].tilt.ps);

      // ── タイムラインも【同時】に見せる（順番の帯のまま出すと嘘になる）
      buildClips();
      const bars = [...document.querySelectorAll('#clipLane .clipseg')];
      ok('タイムラインの帯は全部左端から始まる',
         bars.length === 3 && bars.every(b => parseFloat(b.style.left) === 0),
         bars.map(b => b.style.left).join(' '));
      ok('帯は段に積まれる（重ねて隠さない）',
         new Set(bars.map(b => b.style.top)).size === 3, bars.map(b => b.style.top).join(' '));

      // ── 素材を足しても、木下が動かした置き方を壊さない
      const before = clips.map(c => c.tilt.x + ',' + c.tilt.y).join('|');
      clips.push(imgClip(300, 300, '#0a0', 'd.png'));
      afterAdd();
      ok('素材を足しても前の置き方が消えない',
         clips.slice(0,3).map(c => c.tilt.x + ',' + c.tilt.y).join('|') === before);
      ok('足した1枚にも置き場が付く', !!(clips[3] && clips[3].tilt));

      // ── 順に繋ぐへ戻すと、今まで通り1本ずつ
      seg('narabe', 0);
      ok('戻すと尺が足し算に戻る', Math.abs(total() - (2+5+1+1)) < 0.01, num(total()));
      buildClips();
      const bars2 = [...document.querySelectorAll('#clipLane .clipseg')];
      ok('戻すと帯も順番に並ぶ', parseFloat(bars2[1].style.left) > 0, bars2[1].style.left);

    }catch(e){
      R.push({ n:'⛔ 試験中に例外', p:false, d: e && (e.message + ' @ ' + (e.stack||'').split('\n')[1]) });
    }
    const pass = R.filter(r => r.p).length;
    const pre = document.createElement('pre'); pre.id = '__RESULT';
    pre.textContent = [
      '===== 連 REN 並べる 試験 =====',
      ...R.map(r => (r.p ? '  ok   ' : '  FAIL ') + r.n + (r.d ? '   [' + r.d + ']' : '')),
      '', `合計 ${R.length} / 通過 ${pass} / 失敗 ${R.length - pass}`,
      (pass === R.length ? '__ALL_PASS__' : '__HAS_FAIL__')
    ].join('\n');
    document.body.appendChild(pre);
  }
  setTimeout(run, 900);
})();
