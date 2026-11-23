-- ════════════════════════════════════════════════════════════════
-- SMERP 5단계 DB 단 차단 (검토용 — 아직 적용 안 됨)
--  · 로그인 안 한 요청(anon) = 로그인 전 화면에 필요한 것(번역 사전·누락 문구·로그인 이름 목록) 외 모두 차단
--  · 본사 로그인 사용자 = 지금과 같이 전 자료 (해외법인 화면별 체크 적용은 상무님 체크 완료 후 별도)
--  · 해외 로그인 사용자 = 자기 법인 PO·직원·거래처·지시사항, 워크플로우(내 것·같은 법인·나에게 공유된 것)만
--  · 1120 상태(새 비밀번호 전)·12시간 지난 로그인은 자료가 안 나옴 (smerp_emp)
-- ════════════════════════════════════════════════════════════════
create or replace function public.smerp_hq() returns boolean language sql stable security definer set search_path to 'public'
as $$ select coalesce((select smerp_entity() = 'KOREA'), false) $$;
create or replace function public.smerp_emp_id() returns integer language sql stable security definer set search_path to 'public'
as $$ select id from employees where emp_no = smerp_emp() $$;
create or replace function public.smerp_emp_name() returns text language sql stable security definer set search_path to 'public'
as $$ select name from employees where emp_no = smerp_emp() $$;
create or replace function public.smerp_emp_dept() returns text language sql stable security definer set search_path to 'public'
as $$ select dept from employees where emp_no = smerp_emp() $$;
create or replace function public.smerp_shared_to_me(p_is_shared boolean, p_target text) returns boolean language sql stable security definer set search_path to 'public'
as $$ select coalesce(p_is_shared,false) and p_target is not null and (
     p_target like '%"' || smerp_emp_name() || '"%' or p_target like '%"emp:' || smerp_emp_id() || '"%'
  or p_target like '%"dept:' || smerp_entity() || ':' || coalesce(smerp_emp_dept(),'') || '"%' or p_target like '%"ent:' || smerp_entity() || '"%') $$;
grant execute on function public.smerp_hq(), public.smerp_emp_id(), public.smerp_emp_name(), public.smerp_emp_dept(), public.smerp_shared_to_me(boolean,text) to authenticated;

-- ① 모든 일반 테이블(app_* 제외): RLS 켜고 기존 정책 삭제, 본사 로그인 전체 허용, anon 권한 회수
do $$
declare t text; p record;
begin
  for t in select tablename from pg_tables where schemaname='public' and tablename not like 'app\_%' loop
    execute format('alter table public.%I enable row level security', t);
    for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('create policy smerp_hq on public.%I for all to authenticated using ((select smerp_hq())) with check ((select smerp_hq()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- ② 로그인 전에도 필요한 것
create policy smerp_pub_read on smerp_dict for select to anon, authenticated using (true);
create policy smerp_pub_read on smerp_dict_meta for select to anon, authenticated using (true);
grant select on smerp_dict, smerp_dict_meta to anon;
create policy smerp_pub_all on i18n_missing for all to anon, authenticated using (true) with check (true);
grant select, insert, update on i18n_missing to anon;
-- 로그인한 사람 누구나(해외 포함)
create policy smerp_login_all on smerp_dict for all to authenticated using ((select smerp_emp()) is not null) with check ((select smerp_emp()) is not null);
create policy smerp_login_all on smerp_dict_log for all to authenticated using ((select smerp_emp()) is not null) with check ((select smerp_emp()) is not null);
create policy smerp_login_ins on access_log for insert to authenticated with check ((select smerp_emp()) is not null);
create policy smerp_login_read on makers for select to authenticated using ((select smerp_emp()) is not null);
create policy smerp_login_read on entities for select to authenticated using ((select smerp_emp()) is not null);
create policy smerp_login_read on user_categories for select to authenticated using ((select smerp_emp()) is not null);
create policy smerp_login_read on category_deleted_defaults for select to authenticated using ((select smerp_emp()) is not null);
create policy smerp_login_read on extra_category for select to authenticated using ((select smerp_emp()) is not null);
create policy smerp_login_read on cal_events for select to authenticated using ((select smerp_emp()) is not null);

-- ③ 해외: 자기 법인 자료
create policy smerp_own_entity on po_data for all to authenticated using (entity = (select smerp_entity())) with check (entity = (select smerp_entity()));
create policy smerp_own_entity on po_history for all to authenticated using (entity = (select smerp_entity())) with check (entity = (select smerp_entity()));
create policy smerp_own_entity on shipment_po for all to authenticated using (entity = (select smerp_entity())) with check (entity = (select smerp_entity()));
create policy smerp_own_entity on partners for all to authenticated using (entity = (select smerp_entity())) with check (entity = (select smerp_entity()));
create policy smerp_own_entity on employees for all to authenticated using (entity = (select smerp_entity())) with check (entity = (select smerp_entity()));
create policy smerp_own_entity on org_entity for select to authenticated using (entity = (select smerp_entity()));
create policy smerp_own_entity on org_dept for select to authenticated using (entity = (select smerp_entity()));
create policy smerp_own_entity on sme_calendar for select to authenticated using (entity = (select smerp_entity()));
create policy smerp_own_entity on directives for select to authenticated using (entity = (select smerp_entity()));
create policy smerp_own_entity on directive_updates for select to authenticated using (exists (select 1 from directives d where d.id = directive_updates.directive_id));
create policy smerp_own_entity on directive_assignees for select to authenticated using (exists (select 1 from directives d where d.id = directive_assignees.directive_id));

-- ④ 해외: 워크플로우 (내 것 + 같은 법인 사람 것 + 나에게 공유된 것, 「전체」 공유는 본사 내부라 제외)
create policy smerp_wf_read on work_diary for select to authenticated using (
  employee_id = (select smerp_emp_id())
  or exists (select 1 from employees e where e.id = work_diary.employee_id and e.entity = (select smerp_entity()))
  or smerp_shared_to_me(is_shared, share_target));
create policy smerp_wf_write on work_diary for insert to authenticated with check (employee_id = (select smerp_emp_id()));
create policy smerp_wf_upd on work_diary for update to authenticated using (employee_id = (select smerp_emp_id())) with check (employee_id = (select smerp_emp_id()));
create policy smerp_wf_del on work_diary for delete to authenticated using (employee_id = (select smerp_emp_id()));
create policy smerp_wf on work_diary_confirm for all to authenticated
  using (employee_id = (select smerp_emp_id()) or exists (select 1 from work_diary w where w.id = work_diary_confirm.diary_id))
  with check (employee_id = (select smerp_emp_id()));
create policy smerp_wf on share_comments for all to authenticated
  using (employee_id = (select smerp_emp_id()) or exists (select 1 from work_diary w where w.id = share_comments.diary_id))
  with check (employee_id = (select smerp_emp_id()));
create policy smerp_wf on cal_todos for all to authenticated
  using (employee_id = (select smerp_emp_id()) or team_entity = (select smerp_entity()))
  with check (employee_id = (select smerp_emp_id()) or team_entity = (select smerp_entity()));
create policy smerp_wf on cal_todo_notes for all to authenticated
  using (exists (select 1 from cal_todos c where c.id = cal_todo_notes.todo_id))
  with check (exists (select 1 from cal_todos c where c.id = cal_todo_notes.todo_id));
create policy smerp_wf on wf_user_settings for all to authenticated using (emp_id = (select smerp_emp_id())) with check (emp_id = (select smerp_emp_id()));
create policy smerp_wf on wf_weekly_report for all to authenticated using (employee_id = (select smerp_emp_id())) with check (employee_id = (select smerp_emp_id()));

-- ⑤ 뷰는 부르는 사람 권한으로(RLS 적용), 요약표·함수는 anon 회수
do $$
declare v text; f record;
begin
  for v in select viewname from pg_views where schemaname='public' loop
    execute format('alter view public.%I set (security_invoker = true)', v);
    execute format('revoke all on public.%I from anon', v);
    execute format('grant select on public.%I to authenticated', v);
  end loop;
  for v in select matviewname from pg_matviews where schemaname='public' loop
    execute format('revoke all on public.%I from anon', v);
    execute format('grant select on public.%I to authenticated', v);
  end loop;
  for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and p.prokind='f' and p.prorettype <> 'trigger'::regtype
             and p.proname not in ('app_entity_modes','app_login_names','app_me','app_logout','i18n_log_missing','smerp_dict_json','smerp_dict_mark','smerp_dict_ver') loop
    execute format('revoke execute on function %s from anon, public', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
alter default privileges in schema public revoke execute on functions from anon, public;
