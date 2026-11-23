/* ============================================================================
   smerp-session.js v1.1 (2026-11-23) — 개인 계정 로그인 세션 공용 (전 화면 <head> 맨 앞)
   ── DB 단 차단(RLS) 이후: DB 요청마다 「로그인한 사람」 표시(Supabase 세션 토큰)를 붙여야 자료가 나온다
      1) 화면이 직접 부르는 REST 요청(공용 키만 붙은 것)에 로그인 토큰을 붙임 — supabase-js 요청은 이미 붙어 있음
      2) 토큰이 끝나 가면(1시간) 새로 받아 저장 (같은 세션 키를 supabase-js와 함께 씀)
      3) 로그인 안 했거나 12시간이 지나면 메인(index.html)으로 — 다시 로그인 후 원래 화면으로 돌아옴
   ============================================================================ */
(function(){
  var KEY='sb-muxuhrbsbrstmrrvlupw-auth-token';
  var BASE='https://muxuhrbsbrstmrrvlupw.supabase.co';
  var PUB='sb_publishable_RYvQTDoDvwTuVPezpIeotg_EDSd9Wbb';
  var LIFE=12*3600*1000;
  var of=window.fetch.bind(window), refreshing=null;
  function ls(k){try{return localStorage.getItem(k);}catch(e){return null;}}
  function ses(){try{return JSON.parse(ls(KEY)||'null');}catch(e){return null;}}
  function isIndex(){var p=location.pathname;return /\/(index\.html)?$/.test(p);}
  function home(){return (location.pathname.indexOf('/mfg/')>=0?'../':'')+'index.html';}

  // 로그인 확인 — 메인 외 화면
  if(!isIndex()){
    var s0=ses(), at=parseInt(ls('sme_login_at')||'0',10);
    var expired=!s0||!ls('sme_token')||(at&&Date.now()-at>LIFE);
    if(expired){
      try{
        if(at&&Date.now()-at>LIFE){['sme_token','sme_perms','sme_must_change','sme_login_at',KEY].forEach(function(k){localStorage.removeItem(k);});}
        sessionStorage.setItem('smerp_return',location.pathname.split('/').slice(-(location.pathname.indexOf('/mfg/')>=0?2:1)).join('/')+location.search);
      }catch(e){}
      location.replace(home());
      return;
    }
  }

  async function fresh(){
    var s=ses(); if(!s||!s.access_token) return null;
    var now=Math.floor(Date.now()/1000);
    if(s.expires_at&&s.expires_at-60>now) return s.access_token;
    if(!refreshing){
      refreshing=(async function(){
        try{
          var r=await of(BASE+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:PUB,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});
          if(r.ok){var j=await r.json();
            if(j&&j.access_token){if(!j.expires_at&&j.expires_in)j.expires_at=Math.floor(Date.now()/1000)+j.expires_in;localStorage.setItem(KEY,JSON.stringify(j));return j.access_token;}}
          else{var cur=ses();if(cur&&cur.access_token!==s.access_token)return cur.access_token;} // 다른 탭·supabase-js가 먼저 새로 받은 경우
        }catch(e){}
        return s.access_token;
      })();
      refreshing.then(function(){setTimeout(function(){refreshing=null;},0);});
    }
    return refreshing;
  }
  window.SMERP_SB_TOKEN=fresh;

  // 예전 공용 키(anon JWT)로 보내는 화면(출하관리·바코드 LOT·KPI 출하·일정)도 로그인 토큰으로 바꿈 (V20261123-17)
  function isAnonJwt(a){
    if(a.indexOf('Bearer eyJ')!==0) return false;
    try{var p=a.slice(7).split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(p)).role==='anon';}catch(e){return false;}
  }

  window.fetch=async function(input,init){
    try{
      var url=typeof input==='string'?input:(input&&input.url)||'';
      if(url.indexOf(BASE)===0&&url.indexOf('/rest/v1/')>0){
        var src=(init&&init.headers)||(typeof input!=='string'&&input.headers)||{};
        var h=new Headers(src);
        var a=h.get('Authorization')||'';
        if(!a||a.indexOf('Bearer sb_publishable')===0||isAnonJwt(a)){
          var tk=await fresh();
          if(tk){h.set('Authorization','Bearer '+tk);init=Object.assign({},init||{},{headers:h});}
        }
      }
    }catch(e){}
    return of(input,init);
  };
})();
