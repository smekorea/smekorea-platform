/* ══════════════════════════════════════════════════════════════
   smerp-auth.js v1.0 (2026-10-30) — 개인 계정 권한 적용 (전 화면 공통)
   사용: <script src="smerp-auth.js?v=1" data-screen="trade"></script>  (mfg 폴더는 ../smerp-auth.js)
   ── 개인 계정(사번·개인 비밀번호, localStorage sme_token)으로 로그인한 경우만 작동
      · 화면 조회 권한이 없으면 화면을 가리고 홈 버튼만 보여줌
      · 등록(c)·수정(u)·삭제(d)·확정·승인(f) 권한이 없는 버튼은 숨김 (버튼 글자로 판단)
        - 버튼에 data-perm="c|u|d|f" 를 달면 그 권한으로 판단, data-perm="v" 는 항상 보임
        - 탭·필터·닫기 버튼은 판단에서 제외
      · 화면을 열 때 로그인 만료(12시간)·계정 중지를 확인 → 만료면 다시 로그인
   ── 기존 방식(공통 비밀번호) 로그인은 아무것도 바꾸지 않음
   ── 화면 단위 보호이며 DB 접근 제한(RLS)은 3단계에서 적용
   ══════════════════════════════════════════════════════════════ */
(function(){
  var SB_URL='https://muxuhrbsbrstmrrvlupw.supabase.co';
  var SB_KEY='sb_publishable_RYvQTDoDvwTuVPezpIeotg_EDSd9Wbb';
  var cur=document.currentScript;
  var screenKey=(cur&&cur.getAttribute('data-screen'))||'';
  var base=((cur&&cur.getAttribute('src'))||'').replace(/smerp-auth\.js.*$/,'');
  var home=base+'index.html';
  function ls(k){try{return localStorage.getItem(k);}catch(e){return null;}}
  var token=ls('sme_token');
  var perms={};try{perms=JSON.parse(ls('sme_perms')||'{}')||{};}catch(e){perms={};}

  var api={
    screen:screenKey, personal:!!token,
    can:function(a,k){if(!token)return true;var p=perms[k||screenKey];return !!(p&&p[a||'v']);},
    perms:function(){return perms;},
    apply:function(root){applyButtons(root||document);}
  };
  window.SMERP_AUTH=api;
  if(!token||!screenKey)return;

  // ── 조회 권한 없음: 화면을 가림 ──
  var lang=(ls('sme_lang')||ls('idx_lang')||'ko');
  var MSG={ko:['이 화면을 열 권한이 없습니다','필요하면 관리자에게 권한을 요청하세요.','⌂ 홈으로'],
           en:['You do not have permission to open this page','Ask your administrator for access if you need it.','⌂ Home'],
           zh:['您没有打开此页面的权限','如需使用，请向管理员申请权限。','⌂ 首页']};
  function msg(i){return (MSG[lang]||MSG.ko)[i];}
  function block(){
    var st=document.createElement('style');
    st.textContent='body>*:not(#smerpAuthBlock){display:none!important}#smerpAuthBlock{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#F3F5F8;z-index:2147483647;font-family:"Noto Sans KR",sans-serif}#smerpAuthBlock .bx{background:#fff;border:1px solid #d6dce5;border-top:4px solid #1B3A6B;padding:28px 36px;text-align:center;max-width:420px}#smerpAuthBlock b{display:block;font-size:17px;color:#111827;margin-bottom:8px}#smerpAuthBlock p{font-size:13px;color:#565C64;margin:0 0 18px}#smerpAuthBlock a{display:inline-block;padding:8px 18px;background:#1B3A6B;color:#fff;text-decoration:none;font-size:13px;font-weight:700}';
    (document.head||document.documentElement).appendChild(st);
    var put=function(){if(document.getElementById('smerpAuthBlock'))return;var d=document.createElement('div');d.id='smerpAuthBlock';
      d.innerHTML='<div class="bx"><b>'+msg(0)+'</b><p>'+msg(1)+'</p><a href="'+home+'">'+msg(2)+'</a></div>';document.body.appendChild(d);};
    if(document.body)put();else document.addEventListener('DOMContentLoaded',put);
  }
  var p0=perms[screenKey];
  if(!(p0&&p0.v)){block();verify(true);return;}

  // ── 버튼 숨김: 글자로 필요한 권한 판단 ──
  var RULES=[
    ['d',/삭제|delete|删除/i],
    ['f',/확정|승인|마감\s*(작성|처리|확정|실행)|강제\s*완료|approve|confirm|确认|审批/i],
    ['c',/등록|추가|업로드|신규|새\s|＋|^\+|create|upload|新增|添加|上传/i],
    ['u',/저장|수정|편집|save|edit|保存|修改/i]
  ];
  var SKIP_CLASS=/tab|nav|filter|chip|seg|lang|close|sort|page|toggle|view/i;
  function needOf(el){
    var a=el.getAttribute('data-perm');if(a)return a;
    if(el.closest('[data-perm="v"],.tab-bar,.tabs,.tab-group,[role=tablist],nav'))return null;
    if(SKIP_CLASS.test(el.className&&el.className.baseVal!==undefined?el.className.baseVal:(el.className||'')))return null;
    var tx=(el.textContent||el.value||'').replace(/\s+/g,' ').trim();
    if(!tx||tx.length>18)return null;
    if(/다운로드|download|조회|검색|보기|새로고침|닫기|취소|출력|인쇄|미리보기/i.test(tx))return null;
    for(var i=0;i<RULES.length;i++){if(RULES[i][1].test(tx))return RULES[i][0];}
    return null;
  }
  function applyButtons(root){
    var list=root.querySelectorAll?root.querySelectorAll('button,input[type=button],input[type=submit],a.btn,label.btn,.btn,.row-btn,.up-btn,.big-btn'):[];
    for(var i=0;i<list.length;i++){
      var el=list[i];var n=needOf(el);
      if(n&&n!=='v'&&!api.can(n)){if(el.getAttribute('data-perm-hidden')!=='1'){el.setAttribute('data-perm-hidden','1');el.style.setProperty('display','none','important');}}
      else if(el.getAttribute('data-perm-hidden')==='1'){el.removeAttribute('data-perm-hidden');el.style.removeProperty('display');}
    }
  }
  var need=['c','u','d','f'].some(function(a){return !api.can(a);});
  if(need){
    var tm=null;
    var run=function(){tm=null;applyButtons(document);};
    var start=function(){
      run();
      try{new MutationObserver(function(){if(!tm)tm=setTimeout(run,60);}).observe(document.body,{childList:true,subtree:true});}catch(e){}
    };
    if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
  }
  verify(false);

  // ── 로그인 만료·계정 중지 확인, 권한 최신화 ──
  function verify(blocked){
    fetch(SB_URL+'/rest/v1/rpc/app_me',{method:'POST',headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:token})})
      .then(function(r){return r.ok?r.json():undefined;})
      .then(function(me){
        if(me===undefined)return;            // 네트워크 오류 — 저장된 권한으로 계속
        if(!me){
          ['sme_user','sme_auth','sme_hq_auth','sme_token','sme_emp_no','sme_perms'].forEach(function(k){try{localStorage.removeItem(k);}catch(e){}});
          alert(lang==='en'?'Your login has expired. Please sign in again.':(lang==='zh'?'登录已过期，请重新登录。':'로그인이 만료되었습니다. 다시 로그인해주세요.'));
          location.href=home;return;
        }
        var np=me.perms||{};
        try{localStorage.setItem('sme_perms',JSON.stringify(np));}catch(e){}
        var changed=JSON.stringify(np[screenKey]||{})!==JSON.stringify(perms[screenKey]||{});
        perms=np;
        if(changed){
          if(blocked&&np[screenKey]&&np[screenKey].v){location.reload();return;}
          if(!blocked&&!(np[screenKey]&&np[screenKey].v)){block();return;}
          applyButtons(document);
        }
      }).catch(function(){});
  }
})();
