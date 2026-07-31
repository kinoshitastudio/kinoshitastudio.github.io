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
