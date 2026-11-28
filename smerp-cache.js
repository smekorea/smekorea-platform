/* ══════════════════════════════════════════════════════════════
   smerp-cache.js V20261128 — 데이터 전송량(Egress) 절감용 브라우저 저장소
   ── 한 번 받은 자료를 PC(IndexedDB)에 두고, 다음부터는 바뀐 것만 받게 하는 공용 도구
   ── 저장 키에 로그인 사용자(사번·이름)를 붙여 같은 PC의 다른 사용자와 섞이지 않게 함
   ── IndexedDB를 못 쓰는 브라우저(사생활 보호 모드 등)에서는 조용히 실패 → 화면은 예전처럼 전체 조회
   사용: SmerpCache.get(key) / SmerpCache.set(key,value) / SmerpCache.del(key) / SmerpCache.user()
   ══════════════════════════════════════════════════════════════ */
(function(){
  var DB='smerp_cache', ST='kv', VER=1, dbp=null;
  function open(){
    if(dbp) return dbp;
    dbp=new Promise(function(res,rej){
      try{
        if(!window.indexedDB) return rej(new Error('no indexedDB'));
        var r=indexedDB.open(DB,VER);
        r.onupgradeneeded=function(){ if(!r.result.objectStoreNames.contains(ST)) r.result.createObjectStore(ST); };
        r.onsuccess=function(){ res(r.result); };
        r.onerror=function(){ rej(r.error); };
        r.onblocked=function(){ rej(new Error('indexedDB blocked')); };
      }catch(e){ rej(e); }
    });
    dbp.catch(function(){ dbp=null; });
    return dbp;
  }
  function ls(k){ try{ return localStorage.getItem(k)||''; }catch(e){ return ''; } }
  function user(){ return (ls('sme_emp_no')||'-')+'@'+(ls('sme_user')||'-'); }
  function k(key){ return user()+'|'+key; }
  async function get(key){
    try{
      var db=await open();
      return await new Promise(function(res){
        try{ var q=db.transaction(ST,'readonly').objectStore(ST).get(k(key)); q.onsuccess=function(){ res(q.result); }; q.onerror=function(){ res(undefined); }; }
        catch(e){ res(undefined); }
      });
    }catch(e){ return undefined; }
  }
  async function set(key,val){
    try{
      var db=await open();
      await new Promise(function(res){
        try{ var tx=db.transaction(ST,'readwrite'); tx.objectStore(ST).put(val,k(key)); tx.oncomplete=res; tx.onerror=res; tx.onabort=res; }
        catch(e){ res(); }
      });
    }catch(e){}
  }
  async function del(key){
    try{
      var db=await open();
      await new Promise(function(res){
        try{ var tx=db.transaction(ST,'readwrite'); tx.objectStore(ST).delete(k(key)); tx.oncomplete=res; tx.onerror=res; tx.onabort=res; }
        catch(e){ res(); }
      });
    }catch(e){}
  }
  function clone(v){ try{ return structuredClone(v); }catch(e){ return JSON.parse(JSON.stringify(v)); } }
  window.SmerpCache={get:get,set:set,del:del,user:user,clone:clone};
})();
