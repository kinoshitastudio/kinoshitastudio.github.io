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

  const wait = ms => new Promise(r => setTimeout(r, ms));
  /* canvas から本物の File を作る（落とす試験に使う） */
  function fileOf(w, h, col, name){
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.fillStyle = col; x.fillRect(0,0,w,h);
    return new Promise(r => c.toBlob(b => r(new File([b], name, { type:'image/png' })), 'image/png'));
  }
  function dropOn(nx, ny, files){
    const r = cv.getBoundingClientRect();
    const dt = new DataTransfer();
    files.forEach(f => dt.items.add(f));
    const ev = new DragEvent('drop', { bubbles:true, cancelable:true, dataTransfer:dt });
    /* ⚠️ DragEvent は clientX を後から入れられないので、定義し直して投げる */
    Object.defineProperty(ev, 'clientX', { value: r.left + nx*r.width });
    Object.defineProperty(ev, 'clientY', { value: r.top  + ny*r.height });
    window.dispatchEvent(ev);
  }

  async function run(){
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

      // ══ 盤に落とす（木下＝「ボードには落とされていない」）
      clips.length = 0; sel = -1;
      seg('narabe', 0);                       // 順に繋ぐの状態から始める
      afterAdd();
      const f1 = await fileOf(300, 400, '#c33', 'drop1.png');
      dropOn(0.3, 0.7, [f1]);
      for(let i = 0; i < 60 && !clips.length; i++) await wait(50);
      ok('盤に落とすと素材が入る', clips.length === 1, clips.length + '本');
      ok('盤に落とすと【並べる】に切り替わる', P.narabe === 1);
      ok('  切り替えたことが画面のボタンにも出る',
         document.querySelector('.seg[data-seg="narabe"] button[data-v="1"]').classList.contains('on'));
      const dt = clips[0] && clips[0].tilt;
      ok('落とした所に置かれる', !!dt && Math.abs(dt.x - 0.3) < 0.2 && Math.abs(dt.y - 0.7) < 0.2,
         dt ? num(dt.x) + ',' + num(dt.y) : 'なし');
      ok('落としたものが選ばれている', sel === 0, String(sel));

      // ── 盤の外（下のタイムライン）に落とすと、今まで通り順に繋ぐのまま足される
      seg('narabe', 0);
      const f2 = await fileOf(300, 400, '#39c', 'drop2.png');
      const r0 = cv.getBoundingClientRect();
      const dt2 = new DataTransfer(); dt2.items.add(f2);
      const ev2 = new DragEvent('drop', { bubbles:true, cancelable:true, dataTransfer:dt2 });
      Object.defineProperty(ev2, 'clientX', { value: r0.left + r0.width/2 });
      Object.defineProperty(ev2, 'clientY', { value: r0.bottom + 60 });   // 盤の下＝タイムライン側
      window.dispatchEvent(ev2);
      for(let i = 0; i < 60 && clips.length < 2; i++) await wait(50);
      ok('盤の外に落としたら並べるにしない', clips.length === 2 && P.narabe === 0,
         clips.length + '本 / narabe=' + P.narabe);

      // ══ 四隅を掴んで大きさを変える（木下＝「マウスで小さくしたりもできない」）
      seg('narabe', 1);
      document.getElementById('bGrid').click();
      sel = 0; tiltNote();
      const box = document.getElementById('pkbox');
      ok('選ぶと盤に枠と掴み手が出る', box.classList.contains('on'));
      const bb = narabeBox(clips[0]), rr = cv.getBoundingClientRect();
      ok('枠が絵の位置に合っている',
         Math.abs(parseFloat(box.style.left) - (rr.left + (bb.x-bb.w/2)*rr.width)) < 1.5 &&
         Math.abs(parseFloat(box.style.width) - bb.w*rr.width) < 1.5,
         box.style.left + ' / ' + box.style.width);

      const sc0 = clips[0].tilt.sc, x0 = clips[0].tilt.x, y0 = clips[0].tilt.y;
      const undo0 = UNDO.length;
      const h = box.querySelector('.pkh.se');
      const cx = rr.left + x0*rr.width, cy = rr.top + y0*rr.height;
      const d0 = Math.hypot(bb.w*rr.width/2, bb.h*rr.height/2);
      h.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, clientX:cx + bb.w*rr.width/2, clientY:cy + bb.h*rr.height/2 }));
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles:true, clientX:cx + bb.w*rr.width/4, clientY:cy + bb.h*rr.height/4 }));
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true }));
      ok('四隅を内側へ引くと小さくなる', clips[0].tilt.sc < sc0, sc0 + ' → ' + clips[0].tilt.sc);
      ok('大きさを変えても位置は動かない',
         clips[0].tilt.x === x0 && clips[0].tilt.y === y0);
      ok('つまみにも同じ数字が出る',
         +document.getElementById('tlSc').value === Math.round(clips[0].tilt.sc),
         document.getElementById('tlSc').value + ' / ' + clips[0].tilt.sc);
      ok('掴み手のドラッグで控えが1回だけ積まれる（戻せる）',
         UNDO.length === undo0 + 1, undo0 + ' → ' + UNDO.length);

      // ── 並べていない時は掴み手を出さない
      seg('narabe', 0); tiltNote();
      ok('順に繋ぐでは掴み手を出さない', !box.classList.contains('on'));
      seg('narabe', 1); sel = 0; tiltNote();

      // ══ 回す掴み手（木下＝「角度調整もできるように」）
      const rz0 = clips[0].tilt.rz || 0;
      const rot = box.querySelector('.pkr');
      const rc = cv.getBoundingClientRect();
      const rx = rc.left + clips[0].tilt.x*rc.width, ry = rc.top + clips[0].tilt.y*rc.height;
      rot.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, clientX:rx, clientY:ry - 100 }));
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles:true, clientX:rx + 100, clientY:ry, altKey:true }));
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true }));
      ok('枠の上の丸を掴むと回る', Math.abs((clips[0].tilt.rz||0) - (rz0 + 90)) < 1.5,
         rz0 + ' → ' + clips[0].tilt.rz);
      ok('  回しても位置と大きさは変わらない',
         clips[0].tilt.x === x0 && clips[0].tilt.y === y0);
      // 15度ごとに吸い付く（alt を押していない時）
      rot.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, clientX:rx, clientY:ry - 100 }));
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles:true, clientX:rx + 3, clientY:ry - 100 }));
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true }));
      ok('  15度ごとに吸い付く', (clips[0].tilt.rz % 15) === 0, String(clips[0].tilt.rz));

      // ══ 文字を盤に置く（木下＝「テキストなども別途ボードに入れれるように」）
      clips.length = 0; sel = -1; seg('narabe', 0); afterAdd();
      document.getElementById('bText').click();
      const tc = clips[0];
      ok('文字を入れると素材になる', !!tc && tc.type === 'text', tc && tc.type);
      ok('  文字は盤の【並べる】に入る', P.narabe === 1);
      ok('  文字にも置き場が付く', !!(tc && tc.tilt), tc && tc.tilt ? Math.round(tc.tilt.sc) : '-');
      ok('  文字は絵として焼かれている（写真と同じ扱い）',
         !!(tc.el && tc.el.naturalWidth > 0 && tc.el.naturalHeight > 0),
         tc.el ? tc.el.naturalWidth + '×' + tc.el.naturalHeight : 'なし');
      const w0 = tc.el.naturalWidth;
      const ta = document.getElementById('txIn');
      ta.value = 'ここに文字ここに文字'; ta.dispatchEvent(new Event('input'));
      ok('  内容を変えると札も焼き直す', tc.el.naturalWidth > w0, w0 + ' → ' + tc.el.naturalWidth);
      const kx = tc.tilt.x, ksc = tc.tilt.sc;
      document.querySelector('#txW button[data-v="0"]').click();
      ok('  焼き直しても置き場は持ち越す', tc.tilt.x === kx && tc.tilt.sc === ksc);
      frameAt(0);
      const tb = narabeBox(tc);
      const tp = (nx, ny) => { const d = g.getImageData(Math.round(cv.width*nx), Math.round(cv.height*ny),1,1).data;
                               return d[0]+','+d[1]+','+d[2]+','+d[3]; };
      /* ⚠️ 1点だけ見ると【字と字のすきま】に当たって落ちる。線の上を何点か見る */
      const bgpx = tp(0.01, 0.01);
      /* ⚠️ 点を飛び飛びに見ると【線の幅より間隔が広くて】ほとんど当たらない（1/15 になった）。
         ⭐ 札の範囲を丸ごと読んで、地と違う画素を数える。 */
      let hits = 0;                       /* ⚠️ hit は上で使っている（同じ名前だと全部落ちる） */
      const rx0 = Math.max(0, Math.round((tb.x - tb.w/2)*cv.width));
      const ry0 = Math.max(0, Math.round((tb.y - tb.h/2)*cv.height));
      const rw = Math.min(cv.width - rx0, Math.round(tb.w*cv.width));
      const rh = Math.min(cv.height - ry0, Math.round(tb.h*cv.height));
      const idat = g.getImageData(rx0, ry0, Math.max(1,rw), Math.max(1,rh)).data;
      for(let p = 0; p < idat.length; p += 4) if(idat[p] > 128) hits++;   // 白い字
      ok('  文字が盤に写る', hits > 500, hits + '画素が白い（札 ' + rw + '×' + rh + '）');
      ok('  文字の段は文字を選んでいる時だけ出る',
         document.body.classList.contains('has-text'));
      sel = -1; tiltNote();
      ok('    選んでいなければ隠れる', !document.body.classList.contains('has-text'));

      // ══ 音（波形・ミュート）── 解く所は headless では通せないので、道具の側だけ見る
      const vv = vidClip(400, 500, 3.0, 'snd.mp4');
      vv.peaks = new Float32Array(200).map((_, i) => Math.abs(Math.sin(i/7)));
      vv.pkMax = 1;
      clips.length = 0; clips.push(vv); sel = 0; seg('narabe', 0); afterAdd();
      const bar = document.querySelector('#clipLane .clipseg');
      ok('音を持つ動画は帯に波形が出る', !!bar.querySelector('canvas.wv'));
      ok('  帯の頭の絵は引き伸ばさない（比率どおり）',
         parseFloat(bar.querySelector('video,img').style.width) < parseFloat(bar.style.width),
         bar.querySelector('video,img').style.width + ' / ' + bar.style.width);
      ok('  名前と尺が上の帯に出る', !!bar.querySelector('.cshead .nm') && !!bar.querySelector('.cshead .du'),
         bar.querySelector('.cshead .du') && bar.querySelector('.cshead .du').textContent);
      const mb = bar.querySelector('.mu');
      ok('  ミュートのボタンが出る', !!mb);
      mb.click();
      ok('  押すと止まる', clips[0].mute === true);
      ok('  もう一度押すと戻る（往復する）',
         (document.querySelector('#clipLane .clipseg .mu').click(), clips[0].mute === false));
      const noAud = vidClip(400, 500, 3.0, 'quiet.mp4');
      clips.push(noAud); afterAdd();
      ok('  音の無い動画には波形もミュートも出さない',
         !document.querySelectorAll('#clipLane .clipseg')[1].querySelector('canvas.wv') &&
         !document.querySelectorAll('#clipLane .clipseg')[1].querySelector('.mu'));

      // ══ 縁の線（木下＝「ボードの縁に線をつけれるようにして」）
      clips.length = 0; sel = -1; seg('narabe', 1); afterAdd();
      const eR = document.querySelector('input[data-p="edge"]');
      eR.value = 0; eR.dispatchEvent(new Event('input')); frameAt(0);
      const noEdge = px(0.002, 0.5);
      eR.value = 24; eR.dispatchEvent(new Event('input'));
      document.getElementById('edgeC').value = '#ff0000';
      document.getElementById('edgeC').dispatchEvent(new Event('input'));
      frameAt(0);
      ok('縁に線が引ける', px(0.004, 0.5) !== noEdge, noEdge + ' → ' + px(0.004, 0.5));
      ok('  線は版面の内側に入る（はみ出して切れない）', px(0.5, 0.004) !== noEdge, px(0.5, 0.004));
      eR.value = 0; eR.dispatchEvent(new Event('input')); frameAt(0);
      ok('  0 にすると消える', px(0.004, 0.5) === noEdge);

      // ══ 重ね順・複製・外す（重ねたら必ず要るもの）
      clips.length = 0;
      clips.push(imgClip(200,200,'#f00','a')); clips.push(imgClip(200,200,'#0f0','b'));
      seg('narabe', 1); document.getElementById('bGrid').click(); sel = 0; afterAdd(); tiltNote();
      document.getElementById('bFront').click();
      ok('前へ出すと描く順がいちばん後ろになる（＝上に乗る）',
         clips[clips.length-1].name === 'a' && sel === clips.length-1, clips.map(c=>c.name).join(','));
      document.getElementById('bBack').click();
      ok('  後ろへ送ると先頭に戻る', clips[0].name === 'a' && sel === 0, clips.map(c=>c.name).join(','));
      const n0 = clips.length;
      document.getElementById('bDup').click();
      ok('複製できる', clips.length === n0 + 1, n0 + ' → ' + clips.length);
      ok('  複製はずらして置かれる（真上に隠れない）',
         clips[clips.length-1].tilt.x !== clips[0].tilt.x);
      document.getElementById('bDel').click();
      ok('外せる', clips.length === n0, String(clips.length));

      // ══ 書き出し（木下＝「6秒のタイムラインなのに2秒しか書き出しされていない」）
      ok('1コマずつ詰める道具がある（MediaRecorder に頼らない）',
         typeof exportMovie === 'function' && typeof seekAll === 'function' && !!window.Mp4Muxer,
         window.Mp4Muxer ? 'mp4-muxer あり' : 'mp4-muxer が無い');
      /* 🔴🔴 ここは【本番と同じ大きさ】で見ないと意味が無い。
         前は 640×480 で見て ok にしていたが、本番の 1080×1350 は
         avc1.42001f（水準3.1＝1280×720 まで）では通らず、押しても何も出なかった。 */
      if(window.VideoEncoder){
        const bad = await VideoEncoder.isConfigSupported(
          { codec:'avc1.42001f', width:1080, height:1350, bitrate:4e6, framerate:26 });
        ok('  水準3.1 の決め打ちは 1080×1350 で通らない（決め打ちにしない理由）', !bad.supported);
        const cfg2 = await pickCodec(1080, 1350, 26, 4e6);
        ok('  候補を上から試すと 1080×1350 でも通る', !!cfg2, cfg2 ? cfg2.codec : '見つからない');
        const cfg3 = await pickCodec(1080, 1920, 30, 8e6);
        ok('  たて 9:16（1080×1920）でも通る', !!cfg3, cfg3 ? cfg3.codec : '見つからない');
      }
      /* ⭐⭐ 本当に1本出るところまで通す（押しても何も出なかったので、ここは端まで見る）。
         ⚠️ 大きさは小さくして速く回す。1080×1350 が通るかは上の codec の試験で見ている。 */
      if(window.VideoEncoder && window.Mp4Muxer){
        clips.length = 0; sel = -1;
        const im = imgClip(240, 240, '#c33', 'e.png'); im.dur = 0.5;
        clips.push(im);
        seg('narabe', 1); seg('shape', 0);
        const lr = document.querySelector('input[data-p="long"]');
        lr.value = 480; lr.dispatchEvent(new Event('input'));
        const fr = document.querySelector('input[data-p="fps"]');
        const fpsBak = fr.value; fr.value = 12; fr.dispatchEvent(new Event('input'));
        document.getElementById('bGrid').click();
        const orig = URL.createObjectURL;
        let got = null;
        URL.createObjectURL = b => { if(b && b.type === 'video/mp4') got = b; return orig.call(URL, b); };
        await exportMovie();
        URL.createObjectURL = orig;
        ok('⭐ 押すと mp4 が1本できる', !!got && got.size > 500,
           got ? Math.round(got.size/1024) + 'KB / ' + got.type : '出なかった');
        ok('  画面に「出した」と出る', /出した/.test(document.getElementById('outNote').textContent),
           document.getElementById('outNote').textContent.slice(0, 40));
        ok('  書き出しのあと旗が戻っている（次の再生が壊れない）', shooting === false);
        fr.value = fpsBak; fr.dispatchEvent(new Event('input'));
      }

      clips.length = 0;
      clips.push(vidClip(400, 500, 6.0, 'a.mp4'));
      clips.push(vidClip(400, 500, 2.0, 'b.mp4'));
      seg('narabe', 1); afterAdd();
      ok('尺は【いちばん長い動画】で決まる（短い文字や画像で縮まない）',
         Math.abs(total() - 6) < 0.01, num(total()));
      const txt = { type:'text', text:'x', name:'x', tf:'g', tw:1, tc:'#fff', dur:2 };
      textBake(txt); clips.push(txt); placeAt(txt, .5, .5, .3); afterAdd();
      ok('  文字（2秒）を足しても尺は 6 秒のまま', Math.abs(total() - 6) < 0.01, num(total()));
      ok('  文字はレイヤー＝ずっと出す扱い', isLayer(txt) === true);
      buildClips();
      const bars3 = [...document.querySelectorAll('#clipLane .clipseg')];
      ok('  帯も「ずっと」と出す（秒数を出すとそこで終わると読まれる）',
         bars3[2].querySelector('.du').textContent === 'ずっと',
         bars3[2].querySelector('.du').textContent);
      ok('  短い動画の帯は繰り返す分まで伸びる',
         parseFloat(bars3[1].style.width) > parseFloat(bars3[0].style.width) * 0.9,
         bars3[0].style.width + ' / ' + bars3[1].style.width);
      ok('  1周ごとに区切りが入る', bars3[1].querySelectorAll('i.rep').length >= 2,
         String(bars3[1].querySelectorAll('i.rep').length));

      // ══ 控え（JSON）── 素材ごと入るか
      const saved = await (async () => {
        const o = { tool:'REN', ver:1, P:{...P}, clips:[] };
        for(const c of clips){
          const e = { type:c.type, name:c.name, dur:c.dur, in:c.in, out:c.out,
                      mute:!!c.mute, loop:c.loop, tilt:c.tilt ? {...c.tilt} : null };
          if(c.type === 'text') Object.assign(e, { text:c.text, tf:c.tf, tw:c.tw, tc:c.tc });
          o.clips.push(e);
        }
        return o;
      })();
      ok('控えに置き方と尺が入る',
         saved.clips.every(c => c.tilt) && saved.clips.length === 3, String(saved.clips.length));
      ok('  文字は【打った内容】で控える（焼いた絵ではない）',
         saved.clips[2].text === 'x' && !saved.clips[2].data);
      ok('  控えを開く口がある', typeof renOpen === 'function' && !!document.getElementById('bSave'));

      // ── 順に繋ぐへ戻すと、今まで通り1本ずつ
      clips.length = 0; sel = -1;
      clips.push(vidClip(400, 500, 2.0, 'a.mp4'));
      clips.push(vidClip(400, 500, 5.0, 'b.mp4'));
      clips.push(imgClip(400, 500, '#e0322a', 'c.png'));
      clips.push(imgClip(300, 300, '#0a0', 'd.png'));
      seg('narabe', 1); document.getElementById('bGrid').click(); afterAdd();
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
  setTimeout(() => { run(); }, 900);
})();
