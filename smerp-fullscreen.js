/* ============================================================================
   smerp-fullscreen.js v1.0 (V20261126) — 전체화면 버튼 전 화면 공통
   ── 상단 「← 뒤로」 버튼 바로 앞(메인은 언어선택 앞)에 ⛶ 버튼을 붙임
      못 찾으면 오른쪽 아래 떠있는 버튼으로 표시
   ── 브라우저 제한: 버튼으로만 켜짐, ESC 해제, 다른 화면으로 이동하면 해제됨
   ── 휴대폰(≤768px) 숨김 · workflow.html은 자체 버튼(#fs-btn)이 있어 제외
   ============================================================================ */
(function(){
  if(!document.documentElement.requestFullscreen) return;
  var L={
    ko:['전체화면','전체화면 해제'],
    en:['Full screen','Exit full screen'],
    zh:['全屏','退出全屏']
  };
  var ICON_ON='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h2M4 16v2a2 2 0 0 0 2 2h2M16 4h2a2 2 0 0 1 2 2v2M16 20h2a2 2 0 0 0 2-2v-2"/></svg>';
  var ICON_OFF='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9h2a2 2 0 0 0 2-2V5M15 5v2a2 2 0 0 0 2 2h2M5 15h2a2 2 0 0 1 2 2v2M15 19v-2a2 2 0 0 1 2-2h2"/></svg>';

  function lang(){var v='ko';try{v=localStorage.getItem('wf_lang')||'ko';}catch(e){}return L[v]?v:'ko';}
  function tip(on){return L[lang()][on?1:0];}

  function addStyle(){
    var s=document.createElement('style');
    s.textContent=
      '.smerp-fs-btn{display:inline-flex;align-items:center;justify-content:center;width:32px;min-width:32px;height:30px;padding:0;margin:0 4px 0 0;'+
      'background:transparent;color:inherit;border:1px solid currentColor;border-radius:2px;cursor:pointer;opacity:.7;flex:0 0 auto;font-family:inherit;}'+
      '.smerp-fs-btn:hover{opacity:1;}'+
      '.smerp-fs-btn.float{position:fixed;right:14px;bottom:14px;z-index:9000;width:38px;height:38px;margin:0;background:#fff;color:#1B3A6B;border-color:#1B3A6B;opacity:.85;box-shadow:0 2px 8px rgba(0,0,0,.18);}'+
      '@media (max-width:768px){.smerp-fs-btn{display:none!important;}}';
    document.head.appendChild(s);
  }

  function findAnchor(){
    var lang=document.querySelector('.tb-lang');            // 메인(index.html)
    if(lang) return lang;
    var els=document.querySelectorAll('button,a');
    for(var i=0;i<els.length;i++){
      var tx=(els[i].textContent||'').replace(/\s+/g,'');
      if(tx==='←뒤로'||tx==='←返回'||tx==='←Back') return els[i];
    }
    return null;
  }

  function sync(){
    var b=document.getElementById('smerp-fs-btn'); if(!b) return;
    var on=!!document.fullscreenElement;
    b.innerHTML=on?ICON_OFF:ICON_ON;
    b.title=tip(on);
    b.setAttribute('aria-label',b.title);
  }

  function toggle(){
    try{
      if(document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    }catch(e){console.warn('fullscreen',e);}
  }

  function init(){
    if(document.getElementById('fs-btn')||document.getElementById('smerp-fs-btn')) return; // workflow 자체 버튼
    addStyle();
    var b=document.createElement('button');
    b.type='button'; b.id='smerp-fs-btn'; b.className='smerp-fs-btn';
    b.addEventListener('click',toggle);
    var a=findAnchor();
    if(a&&a.parentNode){
      var h=a.offsetHeight; if(h>=24&&h<=44) b.style.height=h+'px';
      try{var c=getComputedStyle(a).color; if(c) b.style.color=c;}catch(e){}   // 어두운 상단바에서도 보이게 「뒤로」 글자색을 따름
      a.parentNode.insertBefore(b,a);
    }else{
      b.className+=' float'; document.body.appendChild(b);
    }
    sync();
    document.addEventListener('fullscreenchange',sync);
    window.addEventListener('storage',function(e){if(e.key==='wf_lang')sync();});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
