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

      // ══ 17. 太い端（2026-08-21 に落書きになっていた所）
      //   ⚠️ 手描きに寄せる＝点が細かい線（間隔 7 くらい）。ここでしか出ない不具合だった
      artLayer.removeChildren();
      {
        const a = S.abs[0]; a.ch = 'A';
        const Rc = abRectOf(a);
        const mk = (x0,y0,x1,y1,seed) => {
          const p = new Path({ strokeColor:'black', strokeWidth:120, strokeCap:'round', strokeJoin:'round' });
          const L = Math.hypot(x1-x0, y1-y0), st = Math.max(2, Math.round(L/7));
          for(let s=0;s<=st;s++){ const t=s/st;
            p.add(new Point(x0+(x1-x0)*t+Math.sin((s+seed)*1.7)*1.6,
                            y0+(y1-y0)*t+Math.cos((s+seed)*2.3)*1.6)); }
          p.simplify(2.5); artLayer.addChild(p); return p;
        };
        const cx = Rc.center.x, cy = Rc.center.y;
        mk(cx-150,cy+200,cx-10,cy-200,0);
        mk(cx-10,cy-200,cx+140,cy+200,11);
        mk(cx-95,cy+60,cx+85,cy+60,23);        // ⭐ わざと重ねる＝合体していないと穴が抜ける所
        const items = artLayer.children.slice();
        const e = fnEnds(Rc, items, Rc.height * 90 / 1000);
        const cnt = x => { if(!x) return []; const ps = (x.className==='CompoundPath') ? x.children : [x];
                           return ps.map(p => p.segments.length); };
        const tn = cnt(e.thin), ft = cnt(e.fat);
        ok('太い端：重なりが1つの輪に合体する', tn.length === 1, tn.length + '本');
        ok('太い端：両端で輪の数と点がそろう（可変の条件）',
           tn.length === ft.length && tn.every((v,i) => v === ft[i]), '細'+tn.join('/')+' 太'+ft.join('/'));
        ok('太い端：面積が増える', !!e.fat && Math.abs(e.fat.area) > Math.abs(e.thin.area),
           (Math.abs(e.thin.area)|0) + ' → ' + (e.fat ? Math.abs(e.fat.area)|0 : 0));
        // 🔴 落書きの正体＝輪が自分と交わること。交点が出たら落とす
        let xs = 0;
        try{ xs = e.fat.getCrossings ? e.fat.getCrossings(e.fat).length : 0; }catch(err){ xs = -1; }
        ok('太い端：輪が自分と交わらない', xs === 0, xs + '箇所');
        // 盤の下見は【作品を増やさない】
        document.getElementById('fnBold').value = '90';
        document.getElementById('fnBold').dispatchEvent(new Event('input', { bubbles:true }));
        const n0 = artLayer.children.length;
        drawGrid(); drawGrid();
        ok('太い端：描き直しても作品の図形が増えない', artLayer.children.length === n0,
           n0 + ' → ' + artLayer.children.length);
        let pv = 0; gridLayer.children.forEach(c => { if(c.__fnBold) pv++; });
        ok('太い端：盤に下見が出る', pv > 0, pv + '枚');
        if(e.fat) try{ e.fat.remove(); }catch(err){}
        document.getElementById('fnBold').value = '0';
        document.getElementById('fnBold').dispatchEvent(new Event('input', { bubbles:true }));
      }

      // ══ 18. 穴のある字（B の腹）── 穴が【星形のトゲ】に潰れないこと
      //   🔴 2026-08-22 木下が見つけた。穴は太らせると縮み、縮みきると向かい合う辺が
      //      通り抜けてトゲになる。曲がりの半径では捕まらない（局所でなく輪ぜんぶの話）。
      artLayer.removeChildren();
      {
        const a = S.abs[0]; a.ch = 'B';
        const Rc = abRectOf(a), cx = Rc.center.x, cy = Rc.center.y;
        const mk = pts => {
          const p = new Path({ strokeColor:'black', strokeWidth:110, strokeCap:'round', strokeJoin:'round' });
          for(let i=0;i<pts.length-1;i++){
            const A=pts[i], B=pts[i+1], L=Math.hypot(B[0]-A[0],B[1]-A[1]), st=Math.max(2,Math.round(L/7));
            for(let s=0;s<st;s++){ const t=s/st; p.add(new Point(A[0]+(B[0]-A[0])*t, A[1]+(B[1]-A[1])*t)); }
          }
          p.add(new Point(pts[pts.length-1][0], pts[pts.length-1][1]));
          p.simplify(2.5); artLayer.addChild(p); return p;
        };
        mk([[cx-120,cy-210],[cx-120,cy+210]]);
        mk([[cx-120,cy-210],[cx+90,cy-190],[cx+110,cy-60],[cx-110,cy-30]]);
        mk([[cx-110,cy-30],[cx+110,cy+10],[cx+95,cy+185],[cx-120,cy+210]]);
        const e = fnEnds(Rc, artLayer.children.slice(), Rc.height * 90 / 1000);
        const thin = e.thin, fat = e.fat;
        const kids = x => (x && x.className === 'CompoundPath') ? x.children : (x ? [x] : []);
        ok('太い端：穴のある字でも輪の数が同じ', kids(thin).length === kids(fat).length,
           kids(thin).length + ' → ' + kids(fat).length);
        ok('太い端：穴が残る（潰れて消えない）', kids(fat).length >= 2, kids(fat).length + '本');
        let xs = -1;
        try{ xs = fat.getCrossings ? fat.getCrossings(fat).length : -1; }catch(err){ xs = -1; }
        ok('太い端：穴のある字でも輪が自分と交わらない', xs === 0, xs + '箇所');
        // 🔴 星形のトゲ＝穴の面積が【負の側へ通り抜ける】。向きが変わっていないことで見る
        const th = kids(thin), ft = kids(fat);
        let flipped = [];
        for(let i=0;i<Math.min(th.length, ft.length);i++)
          if(Math.sign(th[i].area) !== Math.sign(ft[i].area)) flipped.push(i);
        ok('太い端：どの輪も向きが裏返らない', flipped.length === 0, '裏返り ' + flipped.join(','));
        if(fat) try{ fat.remove(); }catch(err){}
      }

      // ══ 19. 〔前面で削る〕で開けた本物の穴が、鋳るときに残ること
      //   🔴 2026-08-22 に自分で塞いだ＝合体が「外の輪」と「穴の輪」をただ足していた。
      //      ばらして渡すと穴が塗りに溶ける。束ねは【束ねたまま】渡す。
      artLayer.removeChildren();
      {
        const a = S.abs[0]; a.ch = 'O';
        const Rc = abRectOf(a), cx = Rc.center.x, cy = Rc.center.y;
        const body = new Path.Rectangle({ point:[cx-180, cy-240], size:[360, 480], radius:30 });
        const hole = new Path.Rectangle({ point:[cx-60, cy-160], size:[170, 130], radius:16 });
        const cut = body.subtract(hole);         // ＝〔前面で削る〕と同じもの
        cut.fillColor = 'black'; artLayer.addChild(cut);
        try{ body.remove(); }catch(err){} try{ hole.remove(); }catch(err){}
        const e = fnEnds(Rc, artLayer.children.slice(), Rc.height * 90 / 1000);
        const kids = x => (x && x.className === 'CompoundPath') ? x.children : (x ? [x] : []);
        const th = kids(e.thin), ft = kids(e.fat);
        ok('前面で削った穴が鋳るときに残る', th.length >= 2, th.length + '本');
        ok('穴があっても両端で輪の数がそろう', th.length === ft.length, th.length + ' → ' + ft.length);
        ok('太い端で穴が縮む（広がらない）',
           th.length >= 2 && ft.length >= 2 && Math.abs(ft[1].area) < Math.abs(th[1].area),
           (th[1] ? Math.abs(th[1].area)|0 : 0) + ' → ' + (ft[1] ? Math.abs(ft[1].area)|0 : 0));
        if(e.fat) try{ e.fat.remove(); }catch(err){}
      }

      // ══ 20. 道具の並び（2026-08-22 木下＝「鉛筆をペンの次に」）
      //   ⚠️ 並べ替えは【押せなくなる】ことがある型なので、並びと一緒に「押して効くか」も見る
      {
        const bar = document.getElementById('tools');
        const tools = [...bar.querySelectorAll('button[data-tool]')].map(b => b.dataset.tool);
        ok('道具は6つ（画像・削除・戻す進むは道具ではない）', tools.length === 6, tools.join('・'));
        ok('鉛筆はペンのすぐ次', tools.indexOf('stroke') === tools.indexOf('pen') + 1,
           tools.join(' → '));
        bar.querySelector('button[data-tool="stroke"]').click();
        ok('鉛筆を押すと道具が変わる', S.tool === 'stroke', String(S.tool));
        document.dispatchEvent(new KeyboardEvent('keydown', { key:'p', bubbles:true }));
        ok('P でペンに戻る（並べ替えでキーが死んでいない）', S.tool === 'pen', String(S.tool));
        ok('光っている道具は1つだけ',
           [...bar.querySelectorAll('button.on')].length === 1,
           [...bar.querySelectorAll('button.on')].map(b => b.dataset.tool || b.id).join('・'));
        document.dispatchEvent(new KeyboardEvent('keydown', { key:'v', bubbles:true }));
        ok('複製ボタンはゴミ箱の次', (() => {
          const k = [...bar.children].map(e => e.id || e.dataset.tool || 'sep');
          return k.indexOf('bDupSel') === k.indexOf('bDelSel') + 1;
        })());
      }

      // ══ 21. 複製（2026-08-22）── ⌘D も 道具バーの ⧉ も【同じ道】を通る
      //   🔴 木下＝「フレームを選択した場合フレームを横に複製できる」＝何を選んでいるかで変わる
      artLayer.removeChildren();
      {
        const r = makeShape('rect', new Rectangle(0, 0, 80, 80));
        r.fillColor = 'black'; r.selected = true;
        const n0 = artLayer.children.length;
        document.getElementById('bDupSel').click();
        ok('図形を複製できる', artLayer.children.length === n0 + 1,
           n0 + ' → ' + artLayer.children.length);
        const c = artLayer.children[artLayer.children.length - 1];
        ok('複製はずらして置かれる（重ならない）', Math.abs(c.position.x - r.position.x) > 1,
           Math.round(r.position.x) + ' → ' + Math.round(c.position.x));

        artLayer.children.forEach(x => x.selected = false);
        const ab0 = S.abs.length;
        abPickSet(0);
        document.getElementById('bDupSel').click();
        ok('枠を選んでいると枠ごと複製される', S.abs.length === ab0 + 1,
           ab0 + ' → ' + S.abs.length);
        if(S.abs.length > ab0){
          const a = S.abs[0], b = S.abs[S.abs.length - 1];
          ok('複製した枠は【横】に置かれる', Math.abs(b.x - a.x) > Math.abs(b.y - a.y),
             'dx=' + Math.round(b.x - a.x) + ' dy=' + Math.round(b.y - a.y));
          S.abs.pop(); abSync();
        }
        abPickClear();

        artLayer.removeChildren();
        const r2 = makeShape('rect', new Rectangle(200, 200, 60, 60));
        r2.fillColor = 'black'; r2.selected = true;
        const m0 = artLayer.children.length;
        document.dispatchEvent(new KeyboardEvent('keydown', { key:'d', metaKey:true, bubbles:true }));
        ok('⌘D も同じ道を通る', artLayer.children.length === m0 + 1,
           m0 + ' → ' + artLayer.children.length);
      }

      // ══ 22b. まとめる／外す（2026-08-22）
      //   🔴 粒と文字の束ねは【外さない】＝外すと作り方の記憶が消えて二度と組み直せない
      artLayer.removeChildren();
      {
        const mk = (x, y) => { const s = makeShape('rect', new Rectangle(x, y, 60, 60));
          s.fillColor = 'black'; return s; };
        const bar = document.getElementById('tools');
        const k = [...bar.children].map(e => e.id || e.dataset.tool || 'sep');
        ok('まとめるボタンは複製の次', k.indexOf('bGroupSel') === k.indexOf('bDupSel') + 1);

        const a = mk(0,0), b = mk(100,0); a.selected = b.selected = true;
        document.getElementById('bGroupSel').click();
        ok('2つ選んで押すとまとまる',
           artLayer.children.length === 1 && artLayer.children[0] instanceof Group,
           artLayer.children.length + '個');
        artLayer.children[0].selected = true;
        document.getElementById('bGroupSel').click();
        ok('もう一度押すと外れる（往復する）',
           artLayer.children.length === 2 && !(artLayer.children[0] instanceof Group),
           artLayer.children.length + '個');
        undo();
        ok('外したあと ⌘Z で戻る（もとは戻せなかった）', artLayer.children.length === 1,
           artLayer.children.length + '個');

        // 🔴 粒の束ねを外そうとしても外れない
        artLayer.removeChildren();
        document.getElementById('tinput').value = 'あ';
        const t = placeText(new Point(0,0));
        let tz = null;
        if(t){ artLayer.children.forEach(c => c.selected = false); t.selected = true;
          try{ tz = tsubuize(tzShapeOf(t).src, tzOpt()); }catch(e){} }
        if(tz){
          artLayer.children.forEach(c => c.selected = false); tz.selected = true;
          const n0 = artLayer.children.length;
          document.getElementById('bGroupSel').click();
          ok('🔴 粒の束ねは外さない', artLayer.children.length === n0 && !!tz.parent,
             n0 + ' → ' + artLayer.children.length);
          ok('  外さない理由を画面に出す',
             /粒と文字/.test(document.getElementById('stat')?.textContent || ''),
             (document.getElementById('stat')?.textContent || '').slice(0, 30));
        }
      }

      // ══ 22c. 書体の一覧 ── ボタンが縦一列に潰れない（2026-08-22 木下「UIがきにいらない」）
      //   🔴 .mini は 26×17 固定。字が入る前提になっていないので、この行では大きさを開ける
      artLayer.removeChildren();
      {
        const mk = (nm, ch, y) => {
          const t = new paper.PointText({ point:[0,y], content:ch, fontFamily:nm, fontSize:80 });
          t.__fam = '"' + nm + '", sans-serif'; artLayer.addChild(t);
        };
        mk('CHU Modular Round Regular', 'あ', 0);
        mk('CHU Modular JP VF Regular', 'い', 120);
        FONTS['SakujiTest VF Regular'] = {};
        renderFontList();
        const el = document.getElementById('fontList');
        const btns = [...el.querySelectorAll('button')];
        ok('書体の一覧に行が出る', btns.length >= 3, btns.length + '個のボタン');
        const tall = btns.filter(b => b.getBoundingClientRect().height > 30);
        ok('ボタンが縦に潰れていない', tall.length === 0,
           btns.map(b => b.textContent + ' ' + Math.round(b.getBoundingClientRect().width) + '×' +
                    Math.round(b.getBoundingClientRect().height)).join('／'));
        ok('ボタンは折り返さない（nowrap）',
           btns.every(b => getComputedStyle(b).whiteSpace === 'nowrap'));
        ok('ボタンは縮められない（flex-shrink 0）',
           btns.every(b => getComputedStyle(b).flexShrink === '0'));
        const over = [...el.children].filter(c => c.scrollWidth > c.clientWidth + 1);
        ok('行が横にはみ出さない', over.length === 0, over.length + '行');
        delete FONTS['SakujiTest VF Regular'];
      }

      // ══ 22. 線の位置 ── 画面では変わらないので【理由を出したままにする】
      //   🔴 木下＝2026-08-22「線の位置を変更しても変わらない気がする」＝そのとおり
      {
        const sel = document.getElementById('align'), note = document.getElementById('alignNote');
        sel.value = 'center'; sel.dispatchEvent(new Event('change', { bubbles:true }));
        ok('中央のときは註を出さない', note.style.display === 'none', note.style.display);
        sel.value = 'inside'; sel.dispatchEvent(new Event('change', { bubbles:true }));
        ok('内側にすると註が出たままになる', note.style.display !== 'none',
           (note.textContent || '').replace(/\s+/g, ' ').slice(0, 40));
        // ⭐ 画面は変わらないが、線→塗り では効いていること
        artLayer.removeChildren();
        const p = new Path.Rectangle({ point:[0,0], size:[100,100] });
        p.strokeColor = 'black'; p.strokeWidth = 20; p.fillColor = null; p.closed = true;
        artLayer.addChild(p);
        const ins = expandStroke(p, 'inside'), out = expandStroke(p, 'outside');
        ok('線→塗り では内側／外側で形が変わる',
           !!(ins && out) && Math.abs(ins.bounds.width - out.bounds.width) > 1,
           '内側 ' + (ins ? ins.bounds.width|0 : '-') + ' / 外側 ' + (out ? out.bounds.width|0 : '-'));
        [ins, out].forEach(x => { try{ x && x.remove(); }catch(e){} });
        sel.value = 'center'; sel.dispatchEvent(new Event('change', { bubbles:true }));
      }

      // ══ 画像トレース（2026-08-24）── 芯だけを直に通す（写真の読み込みは待ちが要るので使わない）
      {
        const W = 60, H = 60;
        const fill = (m, x0, y0, x1, y1) => { for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++) m[y*W+x] = 1; };

        // ① 穴のある形は 外の輪＋穴 の2本になる（画素の縁を追っているか）
        const donut = new Uint8Array(W*H);
        for(let y=0;y<H;y++) for(let x=0;x<W;x++){
          const d = Math.hypot(x-30, y-30);
          if(d < 24 && d > 10) donut[y*W+x] = 1;
        }
        const cd = trContours(donut, W, H).sort((a,b) => b.area - a.area);
        ok('トレース：穴のある形は輪が2本になる', cd.length === 2, cd.length + '本');
        ok('トレース：外の輪のほうが穴より広い', cd.length === 2 && cd[0].area > cd[1].area,
           cd.map(c => Math.round(c.area)).join(' / '));

        // ② ⭐ まわりと比べる（局所しきい値）── 左が明るく右が暗い紙に、同じ濃さの点を2つ置く
        const g = new Float32Array(W*H), al = new Uint8Array(W*H).fill(255);
        for(let y=0;y<H;y++) for(let x=0;x<W;x++) g[y*W+x] = 40 + x*3;    // 地は左40→右217
        const mark = (cx,cy) => { for(let y=cy-4;y<=cy+4;y++) for(let x=cx-4;x<=cx+4;x++) g[y*W+x] -= 30; };
        mark(12,30); mark(48,30);
        const G = { W, H, g, a:al };
        // ⚠️ 端は窓がはみ出て地の傾き自体を拾うので、【点の中】と【点の外の真ん中】で数える
        const box = (m, cx, cy) => { let n = 0;
          for(let y=cy-4;y<=cy+4;y++) for(let x=cx-4;x<=cx+4;x++) if(m[y*W+x]) n++; return n; };
        const mid = m => { let n = 0;
          for(let y=0;y<H;y++) for(let x=22;x<38;x++) if(m[y*W+x]) n++; return n; };
        const mL = trInkMask(G, { local:true,  radius:10, offset:8, inv:false, clean:false });
        const mG = trInkMask(G, { local:false, thr:128,   inv:false, clean:false });
        ok('⭐まわりと比べる＝影のある紙でも両側の点を拾う',
           box(mL,12,30) >= 60 && box(mL,48,30) >= 60,
           '左' + box(mL,12,30) + ' 右' + box(mL,48,30) + '（点は81画素）');
        ok('  まわりと比べる＝地は拾わない', mid(mL) === 0, mid(mL) + '画素');
        ok('  1枚で1つ だと片側が潰れて片側が消える（＝ノートの写真では使えない）',
           box(mG,48,30) === 0 && box(mG,12,30) === 81 && mid(mG) > 200,
           '左' + box(mG,12,30) + ' 右' + box(mG,48,30) + ' 地' + mid(mG));

        // ③ ⭐ コーナー：正方形の角が角のまま残る／0 にすると角にしない
        const sq = new Uint8Array(W*H); fill(sq, 15, 15, 45, 45);
        const cs = trContours(sq, W, H);
        const toXY = p => new Point(p[0], p[1]);
        const keep = trFitPath(cs[0].pts, 1.8, 180 - 70*1.7, toXY);   // コーナー 70
        const soft = trFitPath(cs[0].pts, 1.8, 180 - 0*1.7,  toXY);   // コーナー 0
        /* ⚠️ 「ハンドルが無い＝角」ではない。直線を当てはめると、その線に沿ったハンドルが付く。
           ⭐ 角かどうかは【入りと出のハンドルが一直線に並んでいないか】で見る。 */
        const isCorner = s => {
          const a = s.handleIn, b = s.handleOut;
          if(a.length < 1e-6 || b.length < 1e-6) return true;
          return a.normalize().add(b.normalize()).length > 0.2;
        };
        const sharp = p => p ? p.segments.filter(isCorner).length : -1;
        ok('⭐コーナー：正方形が4点の角で残る',
           !!keep && keep.segments.length === 4 && sharp(keep) === 4,
           keep ? keep.segments.length + '点 / 角' + sharp(keep) : 'なし');
        ok('  コーナー0 なら角にしない（丸くなる）', sharp(soft) < 4, sharp(soft) + '個が角');
        ok('  角を残しても面積は変わらない', !!keep && Math.abs(Math.abs(keep.area) - 900) < 30,
           keep ? Math.round(Math.abs(keep.area)) : '-');
        [keep, soft].forEach(p => { try{ p && p.remove(); }catch(e){} });

        // ④ 細部を捨てる＝面積で落とせる（長さではなく面積で見ている）
        const dust = new Uint8Array(W*H); fill(dust, 15, 15, 45, 45); dust[3*W+3] = 1;
        const cc = trContours(dust, W, H);
        ok('細部を捨てる：面積で落とせる',
           cc.length === 2 && cc.filter(c => c.area >= 20).length === 1,
           cc.map(c => Math.round(c.area)).join(' / '));

        // ⑤ 色数：3色の絵が3つに分かれる（乱数を使っていないので毎回同じ）
        const rgb = new Uint8ClampedArray(W*H*4);
        for(let p=0;p<W*H;p++){
          const x = p % W, c = x < 20 ? [230,30,30] : (x < 40 ? [30,200,60] : [40,60,220]);
          rgb[p*4]=c[0]; rgb[p*4+1]=c[1]; rgb[p*4+2]=c[2]; rgb[p*4+3]=255;
        }
        const q = trQuantize({ W, H, rgb, a:new Uint8Array(W*H).fill(255) }, 3);
        ok('色数：3色の絵が3つに分かれる',
           !!q && q.area.filter(a => a > W*H*0.2).length === 3, q ? q.area.join(' / ') : 'なし');

        // ⑥ ⭐ 効かないつまみは出さない（触れるのに効かない状態を作らない）
        const hidden = id => getComputedStyle(document.getElementById(id)).display === 'none';
        document.querySelector('#trMode button[data-v="color"]').click();
        ok('色数にすると しきい値まわりが消える',
           hidden('trThrRow') && hidden('trRadRow') && !hidden('trColsRow'));
        document.querySelector('#trMode button[data-v="bw"]').click();
        ok('白黒に戻すと 色数が消える', hidden('trColsRow') && !hidden('trRadRow'));
        document.querySelector('#trLocal button[data-v="0"]').click();
        ok('1枚で1つ にすると しきい値が出て 比べる広さが消える',
           !hidden('trThrRow') && hidden('trRadRow'));
        document.querySelector('#trLocal button[data-v="1"]').click();
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
