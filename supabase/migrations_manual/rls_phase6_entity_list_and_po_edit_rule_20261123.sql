-- V20261123-20 (2026-11-23 상무님 OK)
-- ① 속도: 해외법인 자료 확인을 줄마다(smerp_entity_ok) → 조회당 한 번(smerp_entities 배열)으로
--    볼 수 있는 범위는 그대로. 9개 표(po_data, po_history, shipment_po, trade_slip, trade_slip_log,
--    stock_ledger, stock_count_detail, stock_count_review, partners)
-- ② 해외 PO 수정 규칙 A안: 본사 직원은 해외법인 PO(po_data)를 볼 수만 있음 — 수정·삭제는 승인권자(시스템 관리자)만.
--    본사의 해외 PO 신규 등록과 출하 입력(shipment_po)은 지금처럼 가능. 해외법인 직원은 자기 법인 PO 그대로.

create or replace function public.smerp_entities(p_screen text)
returns text[] language sql stable security definer set search_path = public as $$
  with me as (select smerp_emp() as emp), ent as (select smerp_entity() as e)
  select case
    when (select emp from me) is null then '{}'::text[]
    when (select e from ent) <> 'KOREA' then array[(select e from ent)]
    when exists (select 1 from app_user u join app_role r on r.id = u.role_id
                 where u.emp_no = (select emp from me) and r.is_admin) then array['*','KOREA']
    else array['KOREA'] || coalesce((select array_agg(distinct entity) from app_user_entity
                 where emp_no = (select emp from me) and (screen_key = '*' or screen_key = p_screen)), '{}'::text[])
  end
$$;

create or replace function public.smerp_po_approver()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select r.is_admin from app_user u join app_role r on r.id = u.role_id
                   where u.emp_no = smerp_emp()), false)
$$;

revoke all on function public.smerp_entities(text) from public, anon;
revoke all on function public.smerp_po_approver() from public, anon;
grant execute on function public.smerp_entities(text) to authenticated;
grant execute on function public.smerp_po_approver() to authenticated;

do $$
declare r record; scr text; expr text;
begin
  for r in select * from (values
      ('po_history','po'),('shipment_po','po'),
      ('trade_slip','trade'),('trade_slip_log','trade'),
      ('stock_ledger','stock'),('stock_count_detail','stock'),('stock_count_review','stock'),
      ('partners','admin_partners')) v(tbl, scr) loop
    expr := format('(( SELECT smerp_hq() AS smerp_hq) AND ((entity = ''KOREA''::text) OR ((SELECT smerp_entities(%L)) && ARRAY[entity, ''*''::text])))', r.scr);
    execute format('alter policy smerp_hq on public.%I using %s with check %s', r.tbl, expr, expr);
  end loop;
end $$;

-- po_data: 보기·신규는 확인 범위대로, 수정·삭제는 본사 자료 또는 승인권자만
drop policy if exists smerp_hq on public.po_data;
create policy smerp_hq_read on public.po_data for select to authenticated
  using ((select smerp_hq()) and (entity = 'KOREA' or (select smerp_entities('po')) && array[entity, '*']));
create policy smerp_hq_insert on public.po_data for insert to authenticated
  with check ((select smerp_hq()) and (entity = 'KOREA' or (select smerp_entities('po')) && array[entity, '*']));
create policy smerp_hq_update on public.po_data for update to authenticated
  using ((select smerp_hq()) and (entity = 'KOREA' or (select smerp_po_approver())))
  with check ((select smerp_hq()) and (entity = 'KOREA' or (select smerp_po_approver())));
create policy smerp_hq_delete on public.po_data for delete to authenticated
  using ((select smerp_hq()) and (entity = 'KOREA' or (select smerp_po_approver())));
