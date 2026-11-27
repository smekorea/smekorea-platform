/* 해외법인 PO 엑셀 업로드 — 메이커품번 자동 채움 (V20261127)
 * 메이커품번이 비어 있거나 LG 품번과 같으면 기준정보 품번정보(maker_pn_lgpn_map → maker_pn_master)에서 찾아 채운다.
 *  - 후보 1개: 자동 입력 (미리보기에 「자동」 표시)
 *  - 후보 2개 이상: 미리보기에서 선택 (비어 있던 행은 선택 전까지 등록 불가)
 *  - 후보 없음: 비어 있던 행만 「품번정보 미등록」 경고 (등록은 가능)
 * 사용: po_gsmein / po_smecn / po_smeth — 전역 sb, curData, renderPreview 사용
 */
async function fillMakerPnFromMaster(rows){
  const targets=rows.filter(r=>r.lgpn&&(!r.mkpn||r.mkpn===r.lgpn));
  rows.forEach(r=>{r.mkAuto=false;r.mkCands=null;r.mkNeedPick=false;r.mkNoMaster=false;});
  if(!targets.length)return;
  const lgs=[...new Set(targets.map(r=>r.lgpn))];
  const map={};
  try{
    for(let i=0;i<lgs.length;i+=100){
      const {data,error}=await sb.from('maker_pn_lgpn_map')
        .select('lg_pn,maker_pn_master(brand,maker_pn)').in('lg_pn',lgs.slice(i,i+100));
      if(error)throw error;
      (data||[]).forEach(d=>{
        const mk=d.maker_pn_master&&d.maker_pn_master.maker_pn;
        if(!mk)return;
        (map[d.lg_pn]=map[d.lg_pn]||[]);
        if(!map[d.lg_pn].some(c=>c.mk===mk))map[d.lg_pn].push({mk,brand:d.maker_pn_master.brand||''});
      });
    }
  }catch(err){console.warn('[mkpn fill]',err);return;}
  targets.forEach(r=>{
    const wasBlank=!r.mkpn;
    const cands=(map[r.lgpn]||[]).filter(c=>c.mk!==r.lgpn);
    if(!cands.length){ if(wasBlank)r.mkNoMaster=true; return; }
    if(cands.length===1){ r.mkOrig=r.mkpn; r.mkpn=cands[0].mk; r.mkAuto=true; return; }
    r.mkOrig=r.mkpn; r.mkCands=cands; r.mkNeedPick=wasBlank;
  });
}
function mkpnCell(r){
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  if(r.mkCands){
    const idx=curData.indexOf(r);
    const opts=(r.mkOrig?[`<option value="${esc(r.mkOrig)}"${r.mkpn===r.mkOrig?' selected':''}>${esc(r.mkOrig)} (LG)</option>`]:[`<option value=""${!r.mkpn?' selected':''}>선택</option>`])
      .concat(r.mkCands.map(c=>`<option value="${esc(c.mk)}"${r.mkpn===c.mk?' selected':''}>${esc(c.mk)}${c.brand?' / '+esc(c.brand):''}</option>`));
    return `<td><select class="no-i18n" style="font-size:11px;max-width:170px;${r.mkNeedPick&&!r.mkpn?'border:1px solid #c8001e;':''}" onchange="pickMkpn(${idx},this.value)">${opts.join('')}</select></td>`;
  }
  if(r.mkAuto)return `<td title="품번정보에서 자동 입력">${esc(r.mkpn)} <span class="badge b-new" style="font-size:10px;">자동</span></td>`;
  if(r.mkNoMaster)return `<td>— <span class="badge b-err" style="font-size:10px;">품번정보 미등록</span></td>`;
  return `<td>${esc(r.mkpn)||'—'}</td>`;
}
function pickMkpn(idx,val){
  const r=curData[idx]; if(!r)return;
  r.mkpn=val; if(val)r.mkNeedPick=false; else if(!r.mkOrig)r.mkNeedPick=true;
  renderPreview();
}
