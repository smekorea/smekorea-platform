// SMERP PC 시작 화면 (V20261126-12) — PC에서 로그아웃 상태로 메인을 열면 회전 지구 화면, 누르면 로그인 창, 로그인하면 사라짐
// 디자인은 휴대폰 앱 시작 화면(smerp-splash.js)과 같음. 휴대폰(768px 이하)에는 나오지 않음
(function(){
  try{ if(!(window.matchMedia&&window.matchMedia('(min-width:769px)').matches)) return; }catch(e){ return; }
  function authed(){ try{ return localStorage.getItem('sme_auth')==='1'; }catch(e){ return false; } }

  var css=document.createElement('style');
  css.textContent=
    '#smeIntro{position:fixed;inset:0;z-index:190;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:opacity .5s;user-select:none}'+
    '#smeIntro.off{opacity:0;pointer-events:none}'+
    '#smeIntro .sg{width:240px;height:240px;margin-top:-40px;opacity:0;transform:scale(.92);transition:opacity .7s,transform 1s cubic-bezier(.2,.8,.2,1)}'+
    '#smeIntro .wm{margin-top:26px;font-family:\'Noto Sans KR\',sans-serif;font-weight:700;font-size:16px;letter-spacing:7px;padding-left:7px;color:#0B0C0E;opacity:0;transition:opacity .7s .45s}'+
    '#smeIntro .ent{margin-top:8px;font-family:\'Noto Sans KR\',sans-serif;font-size:12px;letter-spacing:.3px;color:#9CA3AF;white-space:nowrap;opacity:0;transition:opacity .7s .6s}'+
    '#smeIntro .ent b{font-weight:400;color:#6B7280}#smeIntro .ent i{font-style:normal;margin:0 4px;color:#D1D5DB}'+
    '#smeIntro .go{margin-top:28px;font-family:\'Noto Sans KR\',sans-serif;font-size:13px;color:#D32F2F;letter-spacing:.5px;opacity:0;transition:opacity .7s .8s}'+
    '#smeIntro.on .sg{opacity:1;transform:none}#smeIntro.on .wm,#smeIntro.on .ent{opacity:1}#smeIntro.on .go{opacity:1;animation:siBlink 2.2s ease-in-out 1.6s infinite}'+
    '@keyframes siBlink{0%,100%{opacity:1}50%{opacity:.35}}'+
    'body.sme-intro-on .overlay{background:rgba(0,0,0,.28)}';
  document.head.appendChild(css);

  var R=106,RY=30,TILT=-14,PER=8000,WORD='SMERP',REP=4,LS=0.19;
  var wordA=WORD.length*LS,gapA=(2*Math.PI-REP*wordA)/REP,L=[];
  for(var r=0;r<REP;r++)for(var k=0;k<WORD.length;k++)L.push({c:WORD.charAt(k),a:r*(wordA+gapA)+k*LS});
  var land='<path d="M-30 -2 C-38 -6 -44 4 -41 14 C-37 24 -27 28 -18 30 C-14 40 -10 52 -4 62 C0 70 6 72 10 64 C14 54 18 44 24 36 C30 30 31 22 33 14 C40 8 44 0 40 -6 C34 -10 28 -16 22 -20 C14 -22 6 -20 -2 -18 C-10 -16 -20 -10 -30 -2Z"/>'+
    '<path d="M-18 -30 C-14 -40 -6 -46 2 -44 C8 -52 18 -57 28 -53 C40 -56 54 -50 62 -40 C68 -32 66 -24 57 -22 C48 -20 40 -26 32 -24 C24 -26 16 -22 8 -27 C0 -24 -8 -26 -18 -30Z"/>'+
    '<path d="M42 -8 C50 -9 58 -2 61 8 C55 15 47 11 42 2Z"/><ellipse cx="38" cy="44" rx="3" ry="8" transform="rotate(15 38 44)"/>'+
    '<path d="M-77 -22 C-66 -26 -58 -14 -60 0 C-62 14 -70 26 -77 32Z"/><path d="M-46 -62 C-36 -69 -22 -67 -24 -58 C-30 -53 -41 -54 -46 -62Z"/><path d="M-6 -52 C-2 -60 6 -60 6 -54 C2 -50 -3 -49 -6 -52Z"/>';
  var grid='<ellipse rx="19" ry="76"/><ellipse rx="38" ry="76"/><ellipse rx="57" ry="76"/><line x1="0" y1="-76" x2="0" y2="76"/>';
  [-57,-38,-19,0,19,38,57].forEach(function(y){grid+='<line x1="-80" y1="'+y+'" x2="80" y2="'+y+'"/>';});
  function band(c){return '<ellipse rx="'+R+'" ry="'+RY+'" fill="none" stroke="'+c+'" stroke-width="42" filter="url(#sibb)" opacity=".6"/><ellipse rx="'+R+'" ry="'+RY+'" fill="none" stroke="'+c+'" stroke-width="28" filter="url(#sibc)" opacity=".72"/>';}
  var lt='';
  L.forEach(function(o,i){lt+='<text data-i="'+i+'" font-family="\'Noto Sans KR\',sans-serif" font-size="28.6" font-weight="900" text-anchor="middle" dominant-baseline="central" fill="#D32F2F" stroke="#D32F2F" stroke-width="1.1" stroke-linejoin="round">'+o.c+'</text>';});
  var svg='<svg viewBox="0 0 240 240" width="100%" height="100%" style="overflow:visible;display:block" aria-hidden="true"><defs>'+
    '<radialGradient id="sishd" cx="36%" cy="30%" r="78%"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>'+
    '<radialGradient id="sigs" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>'+
    '<filter id="sibb" x="-30%" y="-90%" width="160%" height="280%"><feGaussianBlur stdDeviation="5"/></filter><filter id="sibc" x="-30%" y="-90%" width="160%" height="280%"><feGaussianBlur stdDeviation="1.6"/></filter>'+
    '<clipPath id="sigc"><circle r="76"/></clipPath><clipPath id="sitop"><rect x="-200" y="-200" width="400" height="200"/></clipPath>'+
    '<linearGradient id="silf" gradientUnits="userSpaceOnUse" x1="0" y1="-4" x2="0" y2="12"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>'+
    '<mask id="sifm" maskUnits="userSpaceOnUse" x="-200" y="-200" width="400" height="400"><rect x="-200" y="-200" width="400" height="400" fill="url(#silf)"/></mask></defs>'+
    '<g transform="translate(120 120)"><ellipse cy="97" rx="60" ry="7" fill="url(#sigs)"/>'+
    '<g transform="rotate('+TILT+')"><g clip-path="url(#sitop)">'+band('#E5E7EB')+'</g><g id="siBack"></g></g>'+
    '<circle r="76" fill="#16181C"/>'+
    '<g clip-path="url(#sigc)"><g fill="#EDEFF2">'+land+'</g><g fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.3">'+grid+'</g><circle r="76" fill="url(#sishd)"/></g>'+
    '<circle r="76" fill="none" stroke="#0B0C0E" stroke-width="2.5"/>'+
    '<g transform="rotate('+TILT+')"><g mask="url(#sifm)">'+band('#F3F4F6')+'</g><g id="siFront">'+lt+'</g></g></g></svg>';


  var sp=null,back,front,ts,alive=false,st=null;
  function build(){
    sp=document.createElement('div');
    sp.id='smeIntro';
    sp.innerHTML='<div class="sg no-i18n" translate="no">'+svg+'</div><div class="wm no-i18n" translate="no">SMEKOREA</div>'+
      '<div class="ent no-i18n" translate="no"><b>SMEKR</b><i>·</i>SMECN<i>·</i>SMETH<i>·</i>SMEIN</div><div class="go" data-i18n="클릭하여 시작">클릭하여 시작</div>';
    document.body.appendChild(sp);
    sp.addEventListener('click',function(){ if(typeof window.openWithPW==='function') window.openWithPW(''); });
    back=sp.querySelector('#siBack'),front=sp.querySelector('#siFront');
    ts=[].slice.call(front.querySelectorAll('text'));
  }
  function place(ph){
    var base=ph*2*Math.PI;
    ts.forEach(function(el){
      var th=L[+el.getAttribute('data-i')].a+base,c=Math.cos(th),x=R*Math.sin(th),y=RY*c,fr=c>0;
      var op=fr?Math.min(1,0.15+c*1.6):0.16*Math.min(1,-c*1.6);
      var sx=(c<0?-1:1)*Math.max(0.03,Math.abs(c));
      el.setAttribute('transform','translate('+x.toFixed(2)+' '+y.toFixed(2)+') scale('+sx.toFixed(3)+' 1)');
      el.setAttribute('opacity',op.toFixed(3));
      var want=fr?front:back;if(el.parentNode!==want)want.appendChild(el);
    });
  }
  function loop(t){ if(!alive) return; if(st===null) st=t; place(((t-st)/PER)%1); requestAnimationFrame(loop); }
  function show(){
    if(!sp) build();
    document.body.classList.add('sme-intro-on');
    sp.classList.remove('off'); sp.style.display='flex';
    if(!alive){ alive=true; st=null; place(0); requestAnimationFrame(loop); }
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ sp.classList.add('on'); }); });
  }
  function hide(){
    if(!sp||sp.classList.contains('off')) return;
    document.body.classList.remove('sme-intro-on');
    sp.classList.add('off');
    setTimeout(function(){ if(sp.classList.contains('off')){ sp.style.display='none'; sp.classList.remove('on'); alive=false; } },550);
  }
  function sync(){ if(authed()) hide(); else show(); }
  function init(){ sync(); setInterval(sync,500); window.addEventListener('storage',sync); }
  window.SME_INTRO={show:show,hide:hide};
  if(document.body) init(); else document.addEventListener('DOMContentLoaded',init);
})();
