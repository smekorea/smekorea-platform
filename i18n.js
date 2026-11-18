/* ══════════════════════════════════════════════════════════════
   i18n.js — SMERP 공용 다국어 엔진 (V20261118, 한국어 / English / 中文)
   사용: <head> 안에  <script src="i18n.js?v=1"></script>   (mfg 폴더는 ../i18n.js)
   ── 동작
      · 언어 = localStorage 'wf_lang' (index·workflow·PO와 같은 키). 없으면 법인 기본값
        (KOREA=ko, SMECN=zh, 그 외=en). 직원별 선택값은 employees.lang 에 저장
      · ko 이면 아무것도 하지 않음 (본사 화면 영향 0)
      · en/zh 이면 i18n-dict.js(공용 사전)를 불러와 화면 글자를 사전으로 바꿔 보여줌
        - 정적 글자 + 나중에 그려지는 표·팝업(MutationObserver) + placeholder/title + alert/confirm
        - 화면 표시만 바꾸고 DB 값·입력값·select 의 value 는 그대로 (value 없는 option 은 원문을 value 로 고정)
        - 사전에 없는 글자는 원문 그대로 둠
      · 번역 제외: class="no-i18n" 또는 translate="no" 가 달린 요소와 그 안쪽, 입력칸·textarea
   ── API (window.SMERP_I18N)
      lang() / setLang(l,{save}) / t(s) / orig(el) / onLogin(entity,name,empNo) / entityDefault(entity)
   ── 사전에 없는 문구는 en/zh 사용 중 자동으로 DB i18n_missing 에 모임 (화면당 최대 300개, 15초마다 전송)
   ── 주의: 전역 t() 를 만들지 않음 (workflow 의 t() 와 충돌 방지)
   ══════════════════════════════════════════════════════════════ */
(function(){
  if(window.SMERP_I18N) return;
  var LS='wf_lang', VER='20261119a';
  var SB_URL='https://muxuhrbsbrstmrrvlupw.supabase.co';
  var SB_KEY='sb_publishable_RYvQTDoDvwTuVPezpIeotg_EDSd9Wbb';
  var cur=document.currentScript;
  var base=((cur&&cur.getAttribute('src'))||'').replace(/i18n\.js.*$/,'');
  function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
  function lsSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
  function entityDefault(ent){ent=String(ent||'').toUpperCase();if(!ent||ent==='KOREA'||ent==='SMEKR')return 'ko';if(ent==='SMECN')return 'zh';return 'en';}
  var lang=lsGet(LS);
  if(lang!=='ko'&&lang!=='en'&&lang!=='zh'){lang=entityDefault(lsGet('sme_entity'));if(lsGet('sme_entity'))lsSet(LS,lang);}
  var IDX={en:0,zh:1};
  var KO=/[가-힣]/;
  var DICT=null, PATS=null, SPLITS=null;
  var tracked=new Set();
  var busy=false;

  /* ── 사전 ── */
  function buildPats(){
    PATS=[];
    for(var k in DICT){
      if(k.indexOf('{}')<0) continue;
      var parts=k.split('{}');
      var re='^'+parts.map(function(p){return p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}).join('(.+?)')+'$';
      var litKo=k.replace(/\{\}/g,'').replace(/[^가-힣]/g,'').length;
      try{PATS.push([new RegExp(re),k,litKo]);}catch(e){}
    }
    PATS.sort(function(a,b){return b[1].length-a[1].length;});
  }
  function look(s){
    var e=DICT[s]; if(!e) return null;
    var v=e[IDX[lang]]; return (v==null||v==='')?null:v;
  }
  function fill(tpl,args){var i=0;return tpl.replace(/\{\}/g,function(){var a=args[i++];return a==null?'':tr(a)||a;});}
  // 한 덩어리 번역 (앞뒤 기호 보존 → 정확일치 → 패턴 → 구분자 단위 부분번역)
  function tr(s){
    if(!DICT||lang==='ko'||!s||!KO.test(s)) return null;
    var m=s.match(/^(\s*)([\s\S]*?)(\s*)$/), lead=m[1], core=m[2].replace(/\s+/g,' '), tail=m[3];
    if(core==='님') return lead+tail;
    var v=look(core);
    if(v==null){ var mn=core.match(/^(.*\S)\s*님$/); if(mn){ var vn=tr(mn[1]); return lead+(vn==null?mn[1]:vn)+tail; } }
    if(v==null){
      var m2=core.match(/^([^가-힣A-Za-z0-9(\[「]*)([\s\S]*?)([^가-힣A-Za-z0-9)\]」.?!%]*)$/);
      if(m2&&m2[2]&&m2[2]!==core){var v2=look(m2[2])||pat(m2[2]);if(v2!=null)v=m2[1]+v2+m2[3];}
    }
    if(v==null&&/\d\s*(년|월|일|주차)/.test(core)){ var dc=dates(core); if(dc!==core) v=KO.test(dc)?(pieces(dc)||null):dc; }
    if(v==null) v=pat(core);
    if(v==null) v=pieces(core);
    return v==null?null:lead+v+tail;
  }
  function pat(s){
    if(!PATS) return null;
    for(var i=0;i<PATS.length;i++){
      var m=s.match(PATS[i][0]); if(!m) continue;
      // 글자가 짧은 패턴(예: 「{}월{}」)은 바뀌는 자리에 한글 단어가 들어가면 엉뚱하게 맞으므로 제외
      if(PATS[i][2]<4&&m.slice(1).some(function(g){return /[가-힣]/.test(g)&&!/^[\d.,\-~\s]+[가-힣]{1,2}$/.test(g);})) continue;
      var tpl=look(PATS[i][1]); if(tpl!=null) return fill(tpl,m.slice(1));
    }
    return null;
  }
  // 「A · B / C (D)」 처럼 구분자로 이어진 글자는 조각마다 번역
  function pieces(s){
    var toks=s.split(/(\s*[·\/|:,，、()\[\]「」{}<>~→←↔+=]\s*|\s+-\s+|\n)/);
    if(toks.length<2) return wordsTr(s);
    var changed=false;
    for(var i=0;i<toks.length;i+=2){
      var tk=toks[i]; if(!tk||!KO.test(tk)) continue;
      var tt=tk.trim(); if(tt.replace(/[^가-힣]/g,'').length<2&&!/\d/.test(tt)) continue;   // 조각 속 한 글자(수·월 등)는 뜻이 갈려 번역 안 함
      var v=look(tt)||pat(tt);
      if(v==null){ var dv=dates(tt); if(dv!==tt) v=KO.test(dv)?wordsTr(dv):dv; }
      if(v==null) v=wordsTr(tt);
      if(v!=null&&!KO.test(v)){toks[i]=tk.replace(tt,v);changed=true;}
    }
    return changed?toks.join(''):null;
  }
  // 날짜 (2026년 11월 18일 / 11월 18일 / 2026년 11월 / 11월)
  var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function dates(s){
    if(lang==='zh') return s.replace(/(\d{2,4})년\s*/g,'$1年').replace(/(\d{1,2})월\s*/g,'$1月').replace(/(\d{1,2})일(?![가-힣])/g,'$1日').replace(/(\d+)주차/g,'第$1周');
    return s.replace(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일(?![가-힣])/g,function(m,y,mo,d){return MON[+mo-1]+' '+(+d)+', '+y;})
            .replace(/(\d{4})년\s*(\d{1,2})월(?![가-힣])/g,function(m,y,mo){return MON[+mo-1]+' '+y;})
            .replace(/(\d{1,2})월\s*(\d{1,2})일(?![가-힣])/g,function(m,mo,d){return MON[+mo-1]+' '+(+d);})
            .replace(/(\d{4})년(?![가-힣])/g,'$1')
            .replace(/(?:^|(?<=\s))(\d{1,2})월(?![가-힣])/g,function(m,mo){return +mo>=1&&+mo<=12?MON[+mo-1]:m;})
            .replace(/(\d+)주차/g,'Wk $1');
  }
  // 숫자+단위 (예: 3건, 12명, 5일, 2026년 11월) 와 공백 단위 단어 조합
  var UNIT={'건':['','件'],'명':['','人'],'개':['','个'],'일':['d','日'],'년':['','年'],'월':['','月'],'주':['wk','周'],'시간':['h','小时'],'분':['min','分钟'],'초':['s','秒'],'원':[' KRW','韩元'],'회':['x','次'],'차':['th','次'],'주차':['wk','周'],'개월':[' mo','个月'],'층':['F','层'],'시':['h','时'],'번':['#','号'],'위':['#','名'],'점':['pts','分'],'장':['','张'],'EA':[' EA',' EA']};
  function wordsTr(s){
    if(!KO.test(s)) return null;
    var ws=s.split(/(\s+)/), changed=false;
    for(var i=0;i<ws.length;i+=2){
      var w=ws[i]; if(!w||!KO.test(w)) continue;
      var v=w.replace(/[가-힣]/g,'').length===0&&w.length<2?null:look(w);   // 한 글자 단어(수·월·화 등)는 단독 번역 안 함
      if(v==null){var mu=w.match(/^([\d.,\-~]+)([가-힣]+)$/);if(mu&&UNIT[mu[2]]){var u=UNIT[mu[2]][IDX[lang]];v=mu[1]+u;}}
      if(v!=null){ws[i]=v;changed=true;}
    }
    if(!changed) return null;
    var out=ws.join('');
    return KO.test(out)?null:out;   // 문장 안 일부만 바뀌는 어색한 혼합은 하지 않음
  }

  /* ── 사전에 없는 문구 자동 수집 (en/zh 사용 중 한국어로 남은 문구 → DB i18n_missing) ── */
  var MISS_Q=[], MISS_SEEN=new Set(), MISS_MAX=300, missTimer=null;
  var SCREEN=(location.pathname.split('/').pop()||'index.html');
  function miss(s){
    if(lang==='ko'||!DICT||!s) return;
    var k=String(s).replace(/\s+/g,' ').trim();
    if(k.length>300||k.replace(/[^가-힣]/g,'').length<2) return;
    if(MISS_SEEN.has(k)||MISS_SEEN.size>=MISS_MAX) return;
    MISS_SEEN.add(k); MISS_Q.push(k);
    if(!missTimer) missTimer=setTimeout(flushMiss,15000);
  }
  function flushMiss(keep){
    missTimer=null; if(!MISS_Q.length) return;
    var items=MISS_Q.splice(0,MISS_Q.length);
    try{fetch(SB_URL+'/rest/v1/rpc/i18n_log_missing',{method:'POST',keepalive:!!keep,
      headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({p_items:items,p_lang:lang,p_screen:SCREEN,p_entity:lsGet('sme_entity'),p_user:lsGet('sme_user')})}).catch(function(){});}catch(e){}
  }
  window.addEventListener('pagehide',function(){flushMiss(true);});

  /* ── 화면 적용 ── */
  var SKIP_TAG={SCRIPT:1,STYLE:1,TEXTAREA:1,NOSCRIPT:1,CODE:1,PRE:0};
  function skipEl(el){
    for(var p=el;p&&p.nodeType===1;p=p.parentNode){
      if(SKIP_TAG[p.tagName]) return true;
      if(p.isContentEditable) return true;
      if(p.classList&&p.classList.contains('no-i18n')) return true;
      if(p.getAttribute&&p.getAttribute('translate')==='no') return true;
    }
    return false;
  }
  function doText(n){
    var cv=n.nodeValue;
    if(n.__i18nDone!=null&&cv===n.__i18nDone) return;           // 우리가 바꾼 그대로
    if(!KO.test(cv)) return;
    var par=n.parentNode; if(!par||par.nodeType!==1||skipEl(par)) return;
    if(par.tagName==='OPTION'&&!par.hasAttribute('value')) par.setAttribute('value',par.textContent);
    var v=tr(cv); if(v==null||v===cv){ if(KO.test(cv)) miss(cv); return; }
    if(KO.test(v)) miss(cv);   // 일부만 번역된 경우도 수집
    n.__i18nOrig=cv; n.__i18nDone=v; n.nodeValue=v; tracked.add(n);
  }
  var ATTRS=['placeholder','title','aria-label','data-tip'];
  function doAttrs(el){
    if(el.nodeType!==1||skipEl(el)) return;
    var o=el.__i18nAttr||null;
    for(var i=0;i<ATTRS.length;i++){
      var a=ATTRS[i], cv=el.getAttribute(a); if(!cv||!KO.test(cv)) continue;
      if(o&&o[a]&&o[a][1]===cv) continue;
      var v=tr(cv); if(v==null||v===cv){ miss(cv); continue; }
      o=o||(el.__i18nAttr={}); o[a]=[cv,v]; el.setAttribute(a,v); tracked.add(el);
    }
    if(el.tagName==='INPUT'&&/^(button|submit|reset)$/i.test(el.type)&&KO.test(el.value)){
      var vv=tr(el.value); if(vv!=null){o=o||(el.__i18nAttr={}); o.__val=[el.value,vv]; el.value=vv; tracked.add(el);}
    }
  }
  function walk(root){
    if(!root) return;
    if(root.nodeType===3){doText(root);return;}
    if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11) return;
    if(root.nodeType===1){ if(SKIP_TAG[root.tagName]) return; doAttrs(root); }
    var w=document.createTreeWalker(root,5/*ELEMENT|TEXT*/,null), n;
    while((n=w.nextNode())){
      if(n.nodeType===3) doText(n);
      else if(SKIP_TAG[n.tagName]) { /* 안쪽 텍스트는 doText 에서 걸러짐 */ }
      else doAttrs(n);
    }
  }
  function applyAll(){
    if(lang==='ko'||!DICT) return;
    busy=true;
    try{
      if(document.title&&KO.test(document.title)){var tv=tr(document.title);if(tv){document.__i18nTitle=[document.title,tv];document.title=tv;}}
      walk(document.body||document.documentElement);
    }finally{busy=false;}
  }
  function restoreAll(){
    busy=true;
    try{
      tracked.forEach(function(n){
        if(!n.isConnected) return;
        if(n.nodeType===3){ if(n.nodeValue===n.__i18nDone) n.nodeValue=n.__i18nOrig; n.__i18nDone=null; }
        else if(n.__i18nAttr){
          var o=n.__i18nAttr;
          for(var a in o){ if(a==='__val'){ if(n.value===o[a][1]) n.value=o[a][0]; } else if(n.getAttribute(a)===o[a][1]) n.setAttribute(a,o[a][0]); }
          n.__i18nAttr=null;
        }
      });
      tracked.clear();
      if(document.__i18nTitle&&document.title===document.__i18nTitle[1]) document.title=document.__i18nTitle[0];
    }finally{busy=false;}
  }
  var mo=null;
  function startObserver(){
    if(mo||typeof MutationObserver==='undefined') return;
    mo=new MutationObserver(function(list){
      if(busy||lang==='ko'||!DICT) return;
      busy=true;
      try{
        for(var i=0;i<list.length;i++){
          var r=list[i];
          if(r.type==='childList'){ for(var j=0;j<r.addedNodes.length;j++) walk(r.addedNodes[j]); }
          else if(r.type==='characterData'){ doText(r.target); }
          else if(r.type==='attributes'){ doAttrs(r.target); }
        }
        if(document.title&&KO.test(document.title)){var tv=tr(document.title);if(tv)document.title=tv;}
      }finally{busy=false;}
      if(tracked.size>40000){ tracked.forEach(function(n){ if(!n.isConnected) tracked.delete(n); }); }
    });
    mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS.concat(['value'])});
  }

  /* ── alert / confirm / prompt 문구 ── */
  function trMsg(s){
    if(lang==='ko'||!DICT||s==null) return s;
    s=String(s); if(!KO.test(s)) return s;
    return s.split('\n').map(function(line){var v=tr(line);if(v==null&&KO.test(line))miss(line);return v==null?line:v;}).join('\n');
  }
  var _alert=window.alert, _confirm=window.confirm, _prompt=window.prompt;
  window.alert=function(m){return _alert.call(window,trMsg(m));};
  window.confirm=function(m){return _confirm.call(window,trMsg(m));};
  window.prompt=function(m,d){return _prompt.call(window,trMsg(m),d);};

  /* ── 사전 불러오기 ── */
  var loading=null;
  function dictReady(){
    DICT=window.SMERP_I18N_DICT||{}; buildPats();
    document.documentElement.setAttribute('lang',lang==='zh'?'zh-CN':lang);
    applyAll(); startObserver();
    try{document.dispatchEvent(new CustomEvent('smerp-lang',{detail:{lang:lang}}));}catch(e){}
  }
  function loadDict(cb){
    if(window.SMERP_I18N_DICT){ if(!DICT) dictReady(); cb&&cb(); return; }
    if(loading){ loading.push(cb); return; }
    loading=[cb];
    var s=document.createElement('script'); s.src=base+'i18n-dict.js?v='+VER;
    s.onload=function(){ dictReady(); var q=loading; loading=null; q.forEach(function(f){f&&f();}); };
    s.onerror=function(){ loading=null; };
    (document.head||document.documentElement).appendChild(s);
  }

  /* ── 언어 저장 (직원별) ── */
  function saveLangDb(l){
    var name=lsGet('sme_user'), ent=lsGet('sme_entity'), no=lsGet('sme_emp_no');
    if(!name||!ent) return;
    var q=no?('emp_no=eq.'+encodeURIComponent(no)+'&entity=eq.'+encodeURIComponent(ent)):('name=eq.'+encodeURIComponent(name)+'&entity=eq.'+encodeURIComponent(ent)+'&active=eq.true');
    try{fetch(SB_URL+'/rest/v1/employees?'+q,{method:'PATCH',headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({lang:l})}).catch(function(){});}catch(e){}
  }
  function setLang(l,opt){
    if(l!=='ko'&&l!=='en'&&l!=='zh') return;
    opt=opt||{};
    var prev=lang; lang=l; lsSet(LS,l);
    if(opt.save!==false) saveLangDb(l);
    document.documentElement.setAttribute('lang',l==='zh'?'zh-CN':l);
    if(l==='ko'){ restoreAll(); }
    else if(prev!==l){ restoreAll(); if(DICT){ applyAll(); startObserver(); } else loadDict(); }
    else if(!DICT) loadDict();
    try{document.dispatchEvent(new CustomEvent('smerp-lang',{detail:{lang:l}}));}catch(e){}
  }
  // 로그인 직후: 로그인창에서 직접 고른 값(저장) → 직원 저장값 → 법인 기본값
  function onLogin(entity,name,empNo,picked){
    var q=empNo?('emp_no=eq.'+encodeURIComponent(empNo)+'&entity=eq.'+encodeURIComponent(entity)):('name=eq.'+encodeURIComponent(name)+'&entity=eq.'+encodeURIComponent(entity)+'&active=eq.true');
    return fetch(SB_URL+'/rest/v1/employees?select=lang&'+q,{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}})
      .then(function(r){return r.json();})
      .then(function(rows){
        var saved=rows&&rows[0]&&rows[0].lang;
        if(picked){ setLang(picked,{save:picked!==saved}); return picked; }
        if(saved){ setLang(saved,{save:false}); return saved; }
        var d=entityDefault(entity); setLang(d,{save:false}); return d;
      }).catch(function(){ return lang; });
  }
  // 버튼 원문 (권한 판단 등 로직용) — 번역 전 글자
  function orig(el){
    if(!el) return '';
    if(el.nodeType===3) return el.__i18nOrig!=null&&el.nodeValue===el.__i18nDone?el.__i18nOrig:el.nodeValue;
    var out='', w=document.createTreeWalker(el,4,null), n;
    while((n=w.nextNode())) out+=(n.__i18nOrig!=null&&n.nodeValue===n.__i18nDone)?n.__i18nOrig:n.nodeValue;
    return out;
  }
  window.SMERP_I18N={
    lang:function(){return lang;}, setLang:setLang, onLogin:onLogin, entityDefault:entityDefault,
    t:function(s){var v=tr(String(s));return v==null?s:v;}, msg:trMsg, orig:orig, apply:applyAll
  };
  // 다른 탭에서 언어를 바꾸면 따라감
  window.addEventListener('storage',function(e){ if(e.key===LS&&e.newValue&&e.newValue!==lang) setLang(e.newValue,{save:false}); });

  if(lang!=='ko'){
    if(document.readyState==='loading'&&!window.SMERP_I18N_DICT){
      // 화면이 그려지기 전에 사전을 받아 한국어가 잠깐 보이는 것을 줄임
      document.write('<script src="'+base+'i18n-dict.js?v='+VER+'"><\/script>');
      document.write('<script>window.SMERP_I18N&&window.SMERP_I18N.__boot&&window.SMERP_I18N.__boot();<\/script>');
      window.SMERP_I18N.__boot=function(){ if(!DICT) dictReady(); };
    } else loadDict();
  }
})();
