/* 手書きの添え書き（2026-10-26）
   設計事例の一覧（cases.html）と各事例（case-*.html）に、手書きの一言・見出しの下線・付箋を足す。
   一言の正本はここ（NOTES）。一覧の札と記事の付箋は同じ文を使う。 */
(function(){
  var NOTES = {
    'case-atelier':'音楽を「消費」から「場所」へ。',
    'case-avenir':'作品集ではなく、「自分の未来」を探す場所に。',
    'case-bmboard':'デザイナーとエンジニアが、同じキャンバスを見る。',
    'case-branding-jutaku-home':'社名の3文字から、性格の違う2案。',
    'case-concept-design':'「デザイン」を、筆で書いてみた。',
    'case-concept-onzou':'見えない音楽を、見えるものに。',
    'case-concept-sleeping':'寝袋を、「地に還る器」として描く。',
    'case-ddd':'1日5つ。ピクセル1マスが、1日の重み。',
    'case-enough':'SNSを開く前に、5秒の問いを置く。',
    'case-flyer-awapack':'飾らない、削ぎ落とした一冊。',
    'case-flyer-brand-poster':'余白と構造だけで、世界観を。',
    'case-flyer-sound':'告知のフライヤーが、額に入って会場へ。',
    'case-flyer-strawberry':'甘いイチゴを、暗い色で反転させる。',
    'case-flyer-zine':'初めての打ち合わせで渡す「最初の体験」。',
    'case-himekuri':'献立を「選ばない」という自由。',
    'case-kiyamagokin':'仕様の羅列を、「ここに頼みたい」に。',
    'case-kodoco':'情報ではなく、今日の答えを1つ。',
    'case-library':'Kindleで失くした本棚を、窓の光ごと。',
    'case-manjuya':'メニューではなく、「店に行く体験」を。',
    'case-maruichi':'チェーンと戦わず、「相談できる店」に。',
    'case-mirise':'2つの事業を、ひとつの顔に。',
    'case-mothership':'AIが作る前の「なぜ」を立てる。',
    'case-noa':'外にいても、iPhoneから自分のMacを。',
    'case-oto':'配置が、そのまま音楽になる。',
    'case-rincars':'スペックではなく、会社の思想を。',
    'case-ui-figma':'UIではなく、UIを生む仕組みを。',
    'case-ui-login':'ログインに、気持ちのスイッチを。',
    'case-ui-wireframe':'捨てられる手描きを、額に入れる。',
    'case-yataimura-poster':'「体験したつもり」との差を、ポスターに。',
    'case-yataimura':'「食べに行く」から「祭りに行く」へ。'
  };
  var UL = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 14' preserveAspectRatio='none'%3E%3Cpath d='M2 9 C40 4 80 11 120 6 C150 3 176 8 198 4' fill='none' stroke='%23c9a24f' stroke-width='2.4' stroke-linecap='round'/%3E%3C/svg%3E\")";
  var css = ''
   + '.hand-font{font-family:"Yomogi",cursive!important;letter-spacing:.02em}'
   + '.hand-sticky{display:inline-block;margin:1.4rem 0 .4rem;background:#efe6cf;color:#2a2620;font-family:"Yomogi",cursive;font-size:1.05rem;line-height:1.55;padding:.75rem 1.1rem .85rem;transform:rotate(-1.8deg);box-shadow:0 8px 20px rgba(0,0,0,.28);position:relative;max-width:min(30rem,88vw);text-align:left;font-weight:400;letter-spacing:.02em}'
   + '.hand-sticky::before{content:"";position:absolute;left:50%;top:-9px;width:64px;height:18px;margin-left:-32px;background:rgba(200,190,170,.55);transform:rotate(2deg)}'
   + '.hand-sticky b{font-weight:400;color:#8a6a2a}'
   + '.hand-u{background-image:' + UL + ';background-repeat:no-repeat;background-position:0 100%;background-size:100% .55em;padding-bottom:.28em}'
   + '.hand-tag{display:block;font-family:"Yomogi",cursive!important;color:#b08a3e!important;font-size:16px!important;line-height:1.4!important;letter-spacing:.04em;margin:0 0 .5rem;transform:rotate(-1deg);transform-origin:left;font-weight:400;text-transform:none}'
   + '.hand-card{font-family:"Yomogi",cursive;color:#a07c34;font-size:.95rem;line-height:1.5;margin-top:.45rem;transform:rotate(-.6deg);transform-origin:left}'
   + '.hand-hero{display:block;font-family:"Yomogi",cursive;color:#a07c34;font-size:clamp(1.1rem,2.2vw,1.45rem);margin-top:1rem;transform:rotate(-1deg);transform-origin:left}';
  function addFont(){
    if(document.querySelector('link[href*="family=Yomogi"]')) return;
    var l=document.createElement('link'); l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family=Yomogi&display=swap'; document.head.appendChild(l);
  }
  function addCss(){ var s=document.createElement('style'); s.textContent=css; document.head.appendChild(s); }
  function slug(path){ var m=path.match(/([^\/]+)\.html$/); return m?m[1]:''; }
  function underline(h){
    if(h.querySelector('.hand-u')) return;
    var sp=document.createElement('span'); sp.className='hand-u';
    while(h.firstChild) sp.appendChild(h.firstChild); h.appendChild(sp);
  }
  function casePage(key){
    var note=NOTES[key]; if(!note) return;
    var h1=document.querySelector('h1'); if(!h1) return;
    var st=document.createElement('div'); st.className='hand-sticky';
    st.innerHTML='<b>ひとことで：</b>'+note;
    h1.insertAdjacentElement('afterend', st);
    var h2s=[].slice.call(document.querySelectorAll('h2')).filter(function(h){
      return h.textContent.trim().length>3 && !h.closest('nav,footer,.related,.next-link,.nav-menu,[class*="related"],[class*="next"]') && h.offsetParent!==null;
    });
    h2s.forEach(underline);
    if(h2s.length){
      var t=document.createElement('span'); t.className='hand-tag'; t.textContent='はじまり ↓';
      h2s[0].insertBefore(t, h2s[0].firstChild);
      if(h2s.length>2){ var e=document.createElement('span'); e.className='hand-tag'; e.textContent='こうなった ↓';
        var L=h2s[h2s.length-1]; L.insertBefore(e, L.firstChild); }
    }
  }
  function casesPage(){
    document.querySelectorAll('a.work-card[href]').forEach(function(a){
      var n=NOTES[slug(a.getAttribute('href'))]; if(!n || a.querySelector('.hand-card')) return;
      var d=document.createElement('div'); d.className='hand-card'; d.textContent=n;
      var t=a.querySelector('.work-cat')||a.querySelector('.work-title'); if(t) t.insertAdjacentElement('afterend', d);
    });
    var h1=document.querySelector('.page-hero-title');
    if(h1 && !document.querySelector('.hand-hero')){
      var s=document.createElement('span'); s.className='hand-hero'; s.textContent='どれも、設計から実装まで ひとりで。';
      h1.insertAdjacentElement('afterend', s);
    }
    document.querySelectorAll('h2.section-label').forEach(underline);
  }
  function run(){
    addFont(); addCss();
    var key=slug(location.pathname);
    if(key==='cases') casesPage(); else if(key.indexOf('case-')===0) casePage(key);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
