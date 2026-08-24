/* 絵で確かめる：1080×1350 に3本を「ずらして並べ直す」で置いた1コマ */
(function(){
  function clip(w, h, col, name){
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    const gd = x.createLinearGradient(0,0,w,h);
    gd.addColorStop(0, col); gd.addColorStop(1, '#ffffff');
    x.fillStyle = gd; x.fillRect(0,0,w,h);
    x.fillStyle = 'rgba(0,0,0,.55)';
    for(let i=0;i<12;i++) x.fillRect(i*w/12, 0, w/24, h);
    x.fillStyle = '#000'; x.font = 'bold ' + Math.round(h/6) + 'px sans-serif';
    x.fillText(name, 12, h/2);
    Object.defineProperty(c, 'naturalWidth',  { value:w });
    Object.defineProperty(c, 'naturalHeight', { value:h });
    return { type:'img', el:c, name, url:'', dur:1 };
  }
  setTimeout(() => {
    document.getElementById('bSns').click();
    clips.length = 0;
    clips.push(clip(400, 500, '#7a7ad0', '1'));
    clips.push(clip(400, 500, '#d07a7a', '2'));
    clips.push(clip(400, 500, '#7ad0a0', '3'));
    afterAdd();
    document.querySelector('.seg[data-seg="narabe"] button[data-v="1"]').click();
    document.getElementById('bScatter').click();
    document.getElementById('bText').click();          /* 文字も1枚置く */
    const t = clips[clips.length-1];
    const ta = document.getElementById('txIn');
    ta.value = 'KINOSHITA\nSTUDIO'; ta.dispatchEvent(new Event('input'));
    t.tilt.x = 0.62; t.tilt.y = 0.82; t.tilt.sc = 26; t.tilt.rz = -4;
    sel = 1; tiltNote();          /* 掴み手が出ている所まで見せる */
    frameAt(0);
  }, 800);
})();
