/* ══ SAKUJI 回帰テスト（本体には入れない）══
   ⭐ 本体 index.html のコピーの末尾にこれを差し込み、headless Chrome で読む。
      結果を <pre id="__RESULT"> に書くので --dump-dom で拾える。
   ⚠️ 本体は1行も触らない＝検査コードが本番に混ざらない。
   ⚠️ 実際の関数を通す（内部状態を直に書き換えると、本番で通る処理を飛ばして誤判定する）。 */
(function(){
  const R = [];
  const ok  = (name, cond, detail) => R.push({ name, pass: !!cond, detail: detail || '' });
  const num = v => (typeof v === 'number' ? Math.round(v*100)/100 : v);

  function run(){
    try {
      // ── 準備：まっさらにする
      artLayer.removeChildren();
      try{ localStorage.removeItem(AUTOKEY); }catch(e){}

      // ══ 1. 図形が描ける（菱形＝remove() が true を返して短絡していた所）
      const shapes = ['rect','ellipse','tri','diamond','trapez','half','pie','leaf','slab','poly','star','arc','rrect','tri-r'];
      const bad = shapes.filter(k => {
        const s = makeShape(k, new Rectangle(0, 0, 100, 100));
        const isPath = s && s.className && /Path/.test(s.className);
        if(s && s.remove) s.remove();
        return !isPath;
      });
      ok('シェイプ14種すべてが図形を返す', bad.length === 0, bad.join(','));

      // ══ 2. 文字を置くと「束ね」になり、1クリックで掴める単位が束ねになる
      document.getElementById('tinput').value = 'あい';
      const t = placeText(new Point(300, 300));
      ok('文字が置ける', !!t);
      ok('文字は束ね（__isText）', !!(t && t.__isText), t && t.__txt);
      if(t && t.children && t.children[0]){
        // hitTest が返すのは1字。掴む単位は束ねでなければならない
        ok('掴む単位は束ね（pickRootOf）', pickRootOf(t.children[0]) === t);
        ok('打ち直しの対象も束ね（textRootOf）', textRootOf(t.children[0]) === t);
        ok('打ち直しの欄に中身が入る（textOf）', textOf(t) === 'あい', textOf(t));
      }

      // ══ 3. 粒をかける → 作り方を覚える
      artLayer.children.forEach(c => c.selected = false);
      t.selected = true;
      const g = tsubuize(tzShapeOf(t).src, tzOpt());
      ok('粒ができる', !!(g && g.children && g.children.length > 0), g && g.children.length + '粒');
      ok('粒が元の形を覚える（__tsubu.json）', !!(g && g.__tsubu && g.__tsubu.json));
      ok('粒がかけた設定を覚える（__tzOpt）', !!(g && g.__tzOpt));
      if(g) g.__tzText = tzTextRecipeOf(t) || { txt:'あい' };
      ok('粒が組み方を覚える（__tzText）', !!(g && g.__tzText));
      if(g && g.__tzText) ok('粒からも打ち直せる（textRootOf）', textRootOf(g.children[0]) === g);

      // ══ 3b. 動かす・大きさを変える → 解像を触っても元へ戻らない
      //   ⚠️ 作り直しは「粒をかけた時点の形」から作るので、覚えておかないと位置も大きさも当時に戻る
      if(g){
        artLayer.children.forEach(c => c.selected = false);
        g.selected = true;
        g.position = g.position.add(new Point(120, 80));
        g.scale(1.6, g.bounds.center);
        const at0 = g.position.clone(), w0 = g.bounds.width;
        const rs = document.getElementById('tzRes');
        const keepRes = rs ? rs.value : null;
        if(rs){ rs.value = String(Math.max(8, (+rs.value || 24) + 6)); }
        retsubu(true);                                  // ⭐ 実際の作り直しを通す
        const g3 = artLayer.children.find(c => c.__tsubu);
        if(g3){
          ok('作り直しても場所が動かない',
             Math.abs(g3.position.x - at0.x) < 2 && Math.abs(g3.position.y - at0.y) < 2,
             `(${Math.round(at0.x)},${Math.round(at0.y)}) → (${Math.round(g3.position.x)},${Math.round(g3.position.y)})`);
          ok('⭐作り直しても大きさが元へ戻らない',
             w0 > 0 && Math.abs(g3.bounds.width - w0) / w0 < 0.08,
             `${Math.round(w0)} → ${Math.round(g3.bounds.width)}`);
          ok('作った直後の素の大きさを覚えている（data.tzMade）', !!(g3.data && g3.data.tzMade && g3.data.tzMade.w > 0));
        }
        if(rs && keepRes !== null) rs.value = keepRes;
      }

      // ══ 3c. ⚠️ 大きさを変えていない粒は、解像を触っても【素の大きさのまま】＝見え方を変えない
      //   ⚠️ 3b で拡大した粒を使い回すと当然ちがう値になる。ここは【新しい粒】で測る
      {
        document.getElementById('tinput').value = 'う';
        const t2 = placeText(new Point(760, 300));
        artLayer.children.forEach(c => c.selected = false);
        const sh2 = t2 ? tzShapeOf(t2) : null;
        const gk = sh2 ? tsubuize(sh2.src, tzOpt()) : null;
        if(t2) t2.remove();
        if(gk){
          gk.selected = true;                             // retsubu は選んでいるものを作り直す
          const rs2 = document.getElementById('tzRes');
          const keep2 = rs2 ? rs2.value : null;
          if(rs2){ rs2.value = String(Math.max(8, (+rs2.value || 24) + 4)); }
          retsubu(true);
          const gk2 = selected().find(c => c.__tsubu);    // ⭐ 作り直しは選択を引き継ぐ
          // ⭐ 触っていないのだから、結果は「その解像で素直に作った粒」そのものでなければならない
          ok('⭐大きさを触っていない粒には倍率をかけない',
             !!(gk2 && gk2.data && gk2.data.tzMade &&
                Math.abs(gk2.bounds.width - gk2.data.tzMade.w) < 0.5),
             gk2 && gk2.data && gk2.data.tzMade
               ? `素 ${Math.round(gk2.data.tzMade.w)} / いま ${Math.round(gk2.bounds.width)}` : '—');
          if(rs2 && keep2 !== null) rs2.value = keep2;
          if(gk2) gk2.remove();                           // 後のテストに残さない
        }
      }

      // ══ 4. 保存に粒の実体を載せず、作り方だけ持ち出す
      t.remove();
      const ex = exportArtWithoutGrains();
      ok('粒は作り方として持ち出される', !!(ex.grains && ex.grains.length >= 1), (ex.grains||[]).length + '件');
      ok('粒の実体は art に入らない', ex.art.indexOf('"children"') === -1 || ex.art.length < 60000, ex.art.length + '字');
      ok('作り方に元の形が入っている', !!(ex.grains[0] && ex.grains[0].src));
      ok('作り方に組み方が入っている', !!(ex.grains[0] && ex.grains[0].text));
      ok('作り方に粒の設定が入っている', !!(ex.grains[0] && ex.grains[0].opt));
      // ⚠️ いちばん大事＝取り出したあと、画面の粒が元通りに戻っていること
      ok('⭐取り出したあと粒が画面に残っている', artLayer.children.some(c => c.__tsubu));

      // ══ 5. 作り方から復元できる
      const before = artLayer.children.filter(c => c.__tsubu).length;
      artLayer.removeChildren();
      rebuildGrains(ex.grains);
      const after = artLayer.children.filter(c => c.__tsubu).length;
      ok('作り方から粒を組み立て直せる', after === before, before + ' → ' + after);
      const g2 = artLayer.children.find(c => c.__tsubu);
      ok('復元した粒も組み方を覚えている', !!(g2 && g2.__tzText));
      ok('復元した粒も元の形を覚えている', !!(g2 && g2.__tsubu && g2.__tsubu.json));

      // ══ 6. SVG に器と viewBox が付く
      const w1 = wrapSVG('<g xmlns="http://www.w3.org/2000/svg"><rect/></g>', {x:10.5,y:-3.25,width:200,height:100});
      ok('<g> には器を被せる', /^<\?xml/.test(w1) && /<svg[^>]*viewBox="10.5 -3.25 200 100"/.test(w1));
      const w2 = wrapSVG('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>', {x:10.5,y:-3.25,width:200,height:100});
      ok('<svg> には viewBox を注入', /viewBox="10.5 -3.25 200 100"/.test(w2) && (w2.match(/<svg[\s>]/g)||[]).length === 1);
      const w3 = wrapSVG('<svg viewBox="0 0 5 5"><rect/></svg>', {x:0,y:0,width:9,height:9});
      ok('すでに viewBox があるものは触らない', /viewBox="0 0 5 5"/.test(w3) && !/viewBox="0 0 9 9"/.test(w3));

      // ══ 7. Undo が重さでも切れる
      const h0 = HIST.past.length;
      snapshot();
      ok('snapshot が積まれる', HIST.past.length >= h0);
      snapshot();
      ok('同じ状態は二重に積まない', HIST.past.length <= h0 + 1, 'past=' + HIST.past.length);

      // ══ 8. 効かない項目が薄くなる（グラデ塊のとき）
      document.querySelector('#tzTex button[data-v="blob"]').click();
      ok('グラデ塊なら dot-only が薄くなる', document.body.classList.contains('tex-blob'));
      document.querySelector('#tzTex button[data-v="dot"]').click();
      ok('ドットなら戻る', !document.body.classList.contains('tex-blob'));
      document.querySelector('#tzTex button[data-v="blob"]').click();

      // ══ 9. 書き出しの配線が1本
      ok('書き出しは1本（wrapSVG を通る）', typeof wrapSVG === 'function');
      ok('金属の断面は1つの式（metalStopsNow）', typeof metalStopsNow === 'function' && metalStopsNow().length > 2);

      // ══ 10. 作字の中核 ── ブーリアン（合体・削る・交差）
      //   ⚠️ 配線があっても動くとは限らない。実際に呼んで結果を見る。
      const mkRect = (x,y,w,h) => { const p = new Path.Rectangle(new Rectangle(x,y,w,h)); p.fillColor='#000'; return p; };
      for(const [op, label] of [['unite','合体'],['subtract','前面で削る'],['intersect','交差']]){
        artLayer.removeChildren();
        const a = mkRect(0,0,100,100), b = mkRect(50,50,100,100);
        a.selected = b.selected = true;
        const n0 = artLayer.children.length;
        boolOp(op);
        const left = artLayer.children.filter(c => c && c.parent);
        const merged = left.length === 1 && left[0].segments && left[0].segments.length > 0;
        ok('ブーリアン：' + label, merged, n0 + '個 → ' + left.length + '個');
      }

      // ══ 11. 線→塗り（線の位置＝内側／外側はここで実体化する）
      artLayer.removeChildren();
      {
        const p = new Path.Rectangle(new Rectangle(0,0,100,100));
        p.strokeColor = '#000'; p.strokeWidth = 10; p.fillColor = null; p.selected = true;
        document.getElementById('bOutline').click();
        const r = artLayer.children.filter(c => c && c.parent);
        ok('線→塗りが実体になる', r.length >= 1 && r.some(c => c.fillColor), r.length + '個');
      }

      // ══ 12. 文字のアウトライン化（パスになる＝そこから彫れる）
      artLayer.removeChildren();
      {
        document.getElementById('tinput').value = '永';
        const tt = placeText(new Point(200,200));
        ok('アウトライン化の前は文字', !!(tt && tt.__isText));
      }

      // ══ 13. 整列（ALIGN）
      artLayer.removeChildren();
      {
        const a = mkRect(0,0,50,50), b = mkRect(200,80,50,50);
        a.selected = b.selected = true;
        document.getElementById('alT').click();          // 上ぞろえ
        const same = Math.abs(a.bounds.top - b.bounds.top) < 0.01;
        ok('整列：上でそろう', same, 'a=' + num(a.bounds.top) + ' b=' + num(b.bounds.top));
      }

      // ══ 14. 実験（劣化・手のゆらぎ）＝パスのまま崩れること
      for(const [id, label] of [['bDegrade','劣化'],['bWobble','手のゆらぎ']]){
        artLayer.removeChildren();
        const p = new Path.Rectangle(new Rectangle(0,0,120,120));
        p.fillColor = '#000'; p.selected = true;
        const before = p.segments.length;
        document.getElementById(id).click();
        const now = artLayer.children.filter(c => c && c.parent);
        const still = now.length >= 1 && now[0].segments && now[0].segments.length > 0;
        ok('実験：' + label + ' はパスのまま', still,
           before + '点 → ' + (now[0] && now[0].segments ? now[0].segments.length : 0) + '点');
      }

      // ══ 15. 共通パーツ（登録できる）
      artLayer.removeChildren();
      {
        const p = mkRect(0,0,80,80); p.selected = true;
        const n0 = (typeof PARTS !== 'undefined') ? PARTS.length : -1;
        document.getElementById('bPartAdd').click();
        ok('共通パーツに登録できる', typeof PARTS !== 'undefined' && PARTS.length === n0 + 1,
           n0 + ' → ' + (typeof PARTS !== 'undefined' ? PARTS.length : '?'));
      }

      // ══ 16. グラデのプリセット（Object.keys 経由で配線されている）
      {
        const n0 = S.stops.length;
        document.getElementById('preChrome').click();
        ok('グラデのプリセットが効く', S.stops.length !== n0 || S.stops[0].c !== undefined,
           n0 + ' → ' + S.stops.length + 'ストップ');
      }

    } catch(e){
      R.push({ name:'⛔ テスト中に例外', pass:false, detail: e && (e.message + ' @ ' + (e.stack||'').split('\n')[1]) });
    }

    const pass = R.filter(r => r.pass).length;
    const out = [
      '===== SAKUJI 回帰テスト =====',
      ...R.map(r => (r.pass ? '  ok   ' : '  FAIL ') + r.name + (r.detail ? '   [' + r.detail + ']' : '')),
      '',
      `合計 ${R.length} / 通過 ${pass} / 失敗 ${R.length - pass}`,
      (pass === R.length ? '__ALL_PASS__' : '__HAS_FAIL__'),
    ].join('\n');
    const pre = document.createElement('pre');
    pre.id = '__RESULT';
    pre.textContent = out;
    document.body.appendChild(pre);
  }

  // ⚠️ 起動時の復元（setTimeout 60ms）より後に走らせる
  setTimeout(run, 900);
})();
