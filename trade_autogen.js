/* SMERP 매출전표 자동 생성 공통 모듈 (2026-11-03)
   - 출하LOT관리(ship_lot.html) 「출고검수 완료 확정」과 매입매출관리(trade.html) 자동 생성이 같이 쓴다.
   - 출하 1건(ship_schedule) → 매출 전표 초안(작성중). 직거래·LG사급이 섞이면 전표 2장(사급 = 수량만, 금액 0).
   - 중복은 DB 고유키(trade_slip_source_uq: source_type+source_id+supply_kind)로 막힌다(409 → 건너뜀).
   - 본사(KOREA) 출하 기준. */
(function(){
  const SB_URL='https://muxuhrbsbrstmrrvlupw.supabase.co';
  const SB_KEY='sb_publishable_RYvQTDoDvwTuVPezpIeotg_EDSd9Wbb';
  const H={apikey:SB_KEY,Authorization:'Bearer '+SB_KEY,'Content-Type':'application/json'};
  const ENTITY='KOREA';
  const P_SEL='partners?select=id,name,alias1,alias2&entity=eq.';

  async function api(path,opt){
    opt=opt||{};
    const r=await fetch(SB_URL+'/rest/v1/'+path,Object.assign({},opt,{headers:Object.assign({},H,opt.headers||{})}));
    const tx=await r.text();
    if(!r.ok){let m='';try{const j=JSON.parse(tx);m=j.message||j.hint||'';}catch(e){m=tx;}const err=new Error(m||('HTTP '+r.status));err.status=r.status;throw err;}
    return tx?JSON.parse(tx):null;
  }
  async function getAll(path){
    const out=[];const size=1000;
    for(let from=0;;from+=size){
      const r=await fetch(SB_URL+'/rest/v1/'+path,{headers:Object.assign({},H,{'Range-Unit':'items','Range':from+'-'+(from+size-1)})});
      if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.message||('HTTP '+r.status));}
      const d=await r.json();out.push(...d);if(d.length<size)break;
    }
    return out;
  }
  const post=(tb,body)=>api(tb,{method:'POST',body:JSON.stringify(body),headers:{Prefer:'return=representation'}});
  const num=v=>{const n=Number(String(v==null?'':v).replace(/,/g,''));return isFinite(n)?n:0;};
  const inCodes=arr=>'in.('+arr.map(v=>'"'+String(v).replace(/"/g,'\\"')+'"').map(encodeURIComponent).join(',')+')';

  // 기준정보 (화면당 1회 로드)
  let M=null;
  async function master(){
    if(M)return M;
    const [st,locs,maps,pts,emps]=await Promise.all([
      api('trade_setting?entity=eq.'+ENTITY),
      api('stock_location?entity=eq.'+ENTITY+'&is_active=eq.true&order=sort_no,id'),
      getAll('stock_location_partner?select=location_id,partner_id'),
      getAll(P_SEL+ENTITY+'&order=name,id'),
      getAll('employees?select=name,dept,emp_no&active=eq.true&entity=eq.'+ENTITY+'&order=emp_no')
    ]);
    const locIds=(locs||[]).map(l=>l.id);
    M={setting:(st&&st[0])||{default_vat_pct:10,default_currency:'KRW'},locs:locs||[],
       locmap:maps.filter(m=>locIds.includes(m.location_id)),partners:pts,emps:emps,supplyYm:null};
    try{const lt=await api('stock_inventory?select=ym&order=ym.desc&limit=1');M.supplyYm=lt&&lt[0]?lt[0].ym:null;}catch(e){}
    return M;
  }
  function findPartner(name){
    if(!name)return null;const n=String(name).trim();
    return M.partners.find(p=>p.name===n)||M.partners.find(p=>p.alias1===n||p.alias2===n)||null;
  }
  function partnerLocation(pid){const m=M.locmap.find(x=>x.partner_id===pid);return m?m.location_id:(M.locs[0]&&M.locs[0].id)||null;}
  function emp(name){return M.emps.find(e=>e.name===name)||{};}

  async function itemInfo(codes){
    const info={},supply={};if(!codes.length)return {info,supply};
    for(let i=0;i<codes.length;i+=100){
      const part=codes.slice(i,i+100);
      try{(await getAll('item_lookup_mv?select=item_code,description,spec,brand&item_code='+inCodes(part))).forEach(x=>info[x.item_code]=x);}catch(e){}
      if(M.supplyYm){
        try{(await getAll('stock_inventory?select=item_code,supply_type&ym=eq.'+M.supplyYm+'&item_code='+inCodes(part)))
          .forEach(x=>{supply[x.item_code]=String(x.supply_type||'').replace(/\s/g,'')==='LG사급'?'LG사급':'직거래';});}catch(e){}
      }
    }
    return {info,supply};
  }

  async function createKind(s,its,kind,info,by){
    const p=findPartner(s.customer);
    const vp=num(M.setting.default_vat_pct);const dl=kind==='LG사급';
    const lines=its.map((x,i)=>{
      const q=num(x.qty_scanned);const pr=num(x.unit_price);const sup=dl?0:Math.round(q*pr);
      const it=info[x.item_code]||{};
      return {line_no:i+1,item_code:x.item_code,description:x.description||it.description||'',spec:it.spec||null,brand:x.maker||it.brand||null,
        qty:q,unit_price:pr,supply_amt:sup,vat_amt:dl?0:Math.round(sup*vp/100),source_line_id:x.id,
        note:num(x.qty_required)!==q?('요구 '+num(x.qty_required)):null};
    });
    const sup=lines.reduce((a,b)=>a+b.supply_amt,0),vat=lines.reduce((a,b)=>a+b.vat_amt,0);
    const e=emp(s.manager);
    const head={entity:ENTITY,slip_type:'매출',slip_date:s.ship_date,partner_id:p?p.id:null,partner_name:p?p.name:s.customer,
      dept:e.dept||s.recv_dept||null,manager:s.manager||null,emp_no:e.emp_no||null,
      location_id:p?partnerLocation(p.id):(M.locs[0]&&M.locs[0].id)||null,currency:M.setting.default_currency||'KRW',vat_type:'과세',
      status:'작성중',source_type:'출하',source_id:s.id,supply_kind:kind,supply_total:sup,vat_total:vat,total:sup+vat,created_by:by};
    try{
      const r=await post('trade_slip',head);
      await post('trade_slip_line',lines.map(l=>Object.assign({slip_id:r[0].id},l)));
      return true;
    }catch(err){if(err.status===409)return false;throw err;}
  }

  // ships: [{id,customer,ship_date,manager,recv_dept,ship_done}] → 새로 만든 전표 수
  async function createForShips(ships,by){
    if(!ships||!ships.length)return 0;
    await master();
    const start=M.setting.auto_start_date||'2026-11-01';
    ships=ships.filter(s=>(s.ship_date||'')>=start);if(!ships.length)return 0;
    const ids=ships.map(s=>s.id);const done=new Set();
    for(let i=0;i<ids.length;i+=150){
      (await getAll('trade_slip?select=source_id&source_type=eq.출하&source_id=in.('+ids.slice(i,i+150).join(',')+')')).forEach(x=>done.add(x.source_id));
    }
    const todo=ships.filter(s=>!done.has(s.id));
    let made=0;
    for(let i=0;i<todo.length;i+=40){
      const chunk=todo.slice(i,i+40);
      const items=await getAll('ship_lot_item?select=id,ship_schedule_id,item_code,description,qty_required,qty_scanned,unit_price,maker&ship_schedule_id=in.('+chunk.map(s=>s.id).join(',')+')&order=id');
      const {info,supply}=await itemInfo([...new Set(items.map(x=>x.item_code).filter(Boolean))]);
      for(const s of chunk){
        const its=items.filter(x=>x.ship_schedule_id===s.id);if(!its.length)continue;
        const g={};its.forEach(x=>{const k=supply[x.item_code]||'직거래';(g[k]=g[k]||[]).push(x);});
        const who=by||(s.ship_done==='완료'?'자동(출하완료)':'자동(검수완료)');
        let any=false;for(const k of Object.keys(g)){if(await createKind(s,g[k],k,info,who))any=true;}
        if(any)made++;
      }
    }
    return made;
  }

  // 출하 1건의 전표 상태 → [{slip_no,status,supply_kind}]
  async function slipsForShip(shipId){
    return await api('trade_slip?select=id,slip_no,status,supply_kind&source_type=eq.출하&source_id=eq.'+shipId+'&order=id')||[];
  }

  window.TradeAutoGen={createForShips,slipsForShip};
})();
