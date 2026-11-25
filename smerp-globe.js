// SMERP 회전 지구 로고 (V20261125) — <span class="smerp-globe" style="width:..px"></span> 에 그림
// 띠(아이보리) 위 빨간 SMERP 글자가 지구를 따라 계속 회전. 홈 화면 아이콘(icons/)과 같은 디자인
(function(){
  var RX=114, RY=36, N=3, FS=36, PERIOD=9000, uid=0, items=[];
  var L=Math.PI*(3*(RX+RY)-Math.sqrt((3*RX+RY)*(RX+3*RY)));
  function band(c,id){
    return '<ellipse rx="'+RX+'" ry="'+RY+'" fill="none" stroke="'+c+'" stroke-width="53" filter="url(#b'+id+')" opacity=".85"/>'+
           '<ellipse rx="'+RX+'" ry="'+RY+'" fill="none" stroke="'+c+'" stroke-width="34.5" filter="url(#c'+id+')"/>';
  }
  function texts(id){
    var s='';
    for(var k=0;k<N;k++) s+='<text font-family="\'Noto Sans KR\',sans-serif" font-size="'+FS+'" font-weight="900" dominant-baseline="central"><textPath class="sg-tp" href="#p'+id+'" text-anchor="middle">SMERP</textPath></text>';
    return s;
  }
  function build(el){
    if(el.getAttribute('data-sg')) return;
    var id=++uid; el.setAttribute('data-sg',id);
    var a='A '+RX+' '+RY+' 0 0 0 '+RX+' 0 A '+RX+' '+RY+' 0 0 0 -'+RX+' 0';
    el.innerHTML='<svg viewBox="0 0 240 240" width="100%" height="100%" style="display:block;overflow:visible" role="img" aria-label="SMERP"><defs>'+
      '<filter id="b'+id+'" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="5"/></filter>'+
      '<filter id="c'+id+'" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="1.5"/></filter>'+
      '<clipPath id="k'+id+'"><rect x="-200" y="-200" width="400" height="200"/></clipPath>'+
      '<clipPath id="g'+id+'"><circle r="78"/></clipPath>'+
      '<linearGradient id="l'+id+'" gradientUnits="userSpaceOnUse" x1="0" y1="-6" x2="0" y2="14"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>'+
      '<mask id="m'+id+'" maskUnits="userSpaceOnUse" x="-200" y="-200" width="400" height="400"><rect x="-200" y="-200" width="400" height="400" fill="url(#l'+id+')"/></mask>'+
      '<path id="p'+id+'" d="M -'+RX+' 0 '+a+' '+a+'"/></defs>'+
      '<g transform="translate(120 120) scale(.92)">'+
      '<g transform="rotate(-14)">'+band('#F1ECE0',id)+'<g fill="#E53935" opacity=".28" clip-path="url(#k'+id+')">'+texts(id)+'</g></g>'+
      '<circle r="78" fill="#1565C0"/>'+
      '<g clip-path="url(#g'+id+')" fill="#43A047"><path d="M-50 -40 q20 -25 45 -15 q10 15 -5 30 q-20 5 -15 25 q-15 10 -25 -5 q-15 -15 0 -35z"/><path d="M10 -55 q30 -10 50 10 q5 20 -15 25 q-10 15 5 30 q-10 20 -30 10 q-5 -25 -15 -35 q-10 -25 5 -40z"/><path d="M-30 20 q15 0 18 20 q-2 25 -15 35 q-10 -20 -12 -35z"/><g fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1.2"><ellipse rx="30" ry="78"/><ellipse rx="60" ry="78"/></g></g>'+
      '<g transform="rotate(-14)" mask="url(#m'+id+')">'+band('#F1ECE0',id)+'<g fill="#E53935">'+texts(id)+'</g></g>'+
      '</g></svg>';
    items.push(el); place(el,0);
  }
  function place(el,ph){
    var tps=el.querySelectorAll('.sg-tp');
    for(var i=0;i<tps.length;i++){
      var k=i%N, f=((ph+k/N+0.75)%1+1)%1;
      tps[i].setAttribute('startOffset',(0.5*L+f*L).toFixed(1));
    }
  }
  var start=null, still=false;
  try{ still=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
  function loop(ts){
    if(!document.hidden){
      if(start===null) start=ts;
      var ph=((ts-start)/PERIOD)%1;
      for(var i=0;i<items.length;i++) if(items[i].offsetParent!==null) place(items[i],ph);
    }
    requestAnimationFrame(loop);
  }
  function init(){
    var els=document.querySelectorAll('.smerp-globe');
    for(var i=0;i<els.length;i++) build(els[i]);
    if(!still && items.length) requestAnimationFrame(loop);
  }
  window.SMERP_GLOBE={init:init};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
