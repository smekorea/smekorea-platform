// SMERP 앱 시작 화면 (V20261126-03) — 휴대폰 홈 화면 아이콘으로 앱을 켤 때만 한 번
// 검은 지구 + 고리를 따라 도는 빨간 SMERP · SMEKOREA · 법인 줄 · 빨간 진행선, 3초 후 사라짐 (누르면 바로 넘어감)
(function(){
  try{
    var app=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;
    var phone=window.matchMedia&&window.matchMedia('(pointer: coarse)').matches;
    if(!app||!phone)return;
    if(sessionStorage.getItem('sme_splash'))return;   // 앱을 닫지 않고 다시 띄우거나 ⌂홈으로 돌아올 때는 안 나옴
    sessionStorage.setItem('sme_splash','1');
  }catch(e){return;}

  var css=document.createElement('style');
  css.textContent=
    '#smeSplash{position:fixed;inset:0;z-index:2147483000;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:opacity .45s;-webkit-tap-highlight-color:transparent}'+
    '#smeSplash .sg{width:200px;height:200px;margin-top:-40px;opacity:0;transform:scale(.92);transition:opacity .7s,transform 1s cubic-bezier(.2,.8,.2,1)}'+
    '#smeSplash .wm{margin-top:22px;font-family:\'Noto Sans KR\',sans-serif;font-weight:700;font-size:14px;letter-spacing:6px;padding-left:6px;color:#0B0C0E;opacity:0;transition:opacity .7s .45s}'+
    '#smeSplash .ent{margin-top:7px;font-family:\'Noto Sans KR\',sans-serif;font-size:11px;letter-spacing:.3px;color:#9CA3AF;white-space:nowrap;opacity:0;transition:opacity .7s .6s}'+
    '#smeSplash .ent b{font-weight:400;color:#6B7280}#smeSplash .ent i{font-style:normal;margin:0 4px;color:#D1D5DB}'+
    '#smeSplash .bar{margin-top:16px;width:72px;height:2px;background:#F1D5D5;border-radius:2px;overflow:hidden;opacity:0;transition:opacity .5s .55s}'+
    '#smeSplash .bar i{display:block;height:100%;width:0;background:#D32F2F}'+
    '#smeSplash.on .sg{opacity:1;transform:none}#smeSplash.on .wm,#smeSplash.on .ent,#smeSplash.on .bar{opacity:1}';
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
  function band(c){return '<ellipse rx="'+R+'" ry="'+RY+'" fill="none" stroke="'+c+'" stroke-width="42" filter="url(#ssbb)" opacity=".6"/><ellipse rx="'+R+'" ry="'+RY+'" fill="none" stroke="'+c+'" stroke-width="28" filter="url(#ssbc)" opacity=".72"/>';}
  var lt='';
  L.forEach(function(o,i){lt+='<text data-i="'+i+'" font-family="\'Noto Sans KR\',sans-serif" font-size="28.6" font-weight="900" text-anchor="middle" dominant-baseline="central" fill="#D32F2F" stroke="#D32F2F" stroke-width="1.1" stroke-linejoin="round">'+o.c+'</text>';});
  var svg='<svg viewBox="0 0 240 240" width="100%" height="100%" style="overflow:visible;display:block" aria-hidden="true"><defs>'+
    '<radialGradient id="ssshd" cx="36%" cy="30%" r="78%"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>'+
    '<radialGradient id="ssgs" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>'+
    '<filter id="ssbb" x="-30%" y="-90%" width="160%" height="280%"><feGaussianBlur stdDeviation="5"/></filter><filter id="ssbc" x="-30%" y="-90%" width="160%" height="280%"><feGaussianBlur stdDeviation="1.6"/></filter>'+
    '<clipPath id="ssgc"><circle r="76"/></clipPath><clipPath id="sstop"><rect x="-200" y="-200" width="400" height="200"/></clipPath>'+
    '<linearGradient id="sslf" gradientUnits="userSpaceOnUse" x1="0" y1="-4" x2="0" y2="12"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>'+
    '<mask id="ssfm" maskUnits="userSpaceOnUse" x="-200" y="-200" width="400" height="400"><rect x="-200" y="-200" width="400" height="400" fill="url(#sslf)"/></mask></defs>'+
    '<g transform="translate(120 120)"><ellipse cy="97" rx="60" ry="7" fill="url(#ssgs)"/>'+
    '<g transform="rotate('+TILT+')"><g clip-path="url(#sstop)">'+band('#E5E7EB')+'</g><g id="ssBack"></g></g>'+
    '<circle r="76" fill="#16181C"/>'+
    '<g clip-path="url(#ssgc)"><g fill="#EDEFF2">'+land+'</g><g fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.3">'+grid+'</g><circle r="76" fill="url(#ssshd)"/></g>'+
    '<circle r="76" fill="none" stroke="#0B0C0E" stroke-width="2.5"/>'+
    '<g transform="rotate('+TILT+')"><g mask="url(#ssfm)">'+band('#F3F4F6')+'</g><g id="ssFront">'+lt+'</g></g></g></svg>';

  var sp=document.createElement('div');
  sp.id='smeSplash';sp.className='no-i18n';sp.setAttribute('translate','no');
  sp.innerHTML='<div class="sg">'+svg+'</div><div class="wm">SMEKOREA</div>'+
    '<div class="ent"><b>SMEKR</b><i>·</i>SMECN<i>·</i>SMETH<i>·</i>SMEIN</div><div class="bar"><i></i></div>';
  (document.body||document.documentElement).appendChild(sp);

  var back=sp.querySelector('#ssBack'),front=sp.querySelector('#ssFront');
  var ts=[].slice.call(front.querySelectorAll('text'));
  var alive=true,st=null;
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
  function loop(t){if(!alive)return;if(st===null)st=t;place(((t-st)/PER)%1);requestAnimationFrame(loop);}
  place(0);requestAnimationFrame(loop);
  requestAnimationFrame(function(){requestAnimationFrame(function(){
    sp.classList.add('on');var b=sp.querySelector('.bar i');b.style.transition='width 2.4s linear .5s';b.style.width='100%';
  });});

  var t0=Date.now(),loaded=document.readyState==='complete',done=false;
  function close(){
    if(done)return;done=true;sp.style.opacity='0';sp.style.pointerEvents='none';
    setTimeout(function(){alive=false;if(sp.parentNode)sp.parentNode.removeChild(sp);},500);
  }
  function tryClose(){if(loaded&&Date.now()-t0>=3000)close();}
  window.addEventListener('load',function(){loaded=true;tryClose();});
  setTimeout(tryClose,3000);
  setTimeout(close,6000);          // 느린 망에서도 6초 넘게 붙잡지 않음
  sp.addEventListener('click',close);
})();
