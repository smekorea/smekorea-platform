-- V20261124-04 (상무님 OK 10:25 B안, 재진행 11:47): 직원관리에서 퇴직 처리(active → false)하면 계정 자동 정리
-- 적용: Supabase migration employee_retire_auto_account_cleanup_20261124
create or replace function public._emp_retire_cleanup()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare uid uuid; n_ent int;
begin
  if coalesce(old.active, true) and not coalesce(new.active, true) and exists (select 1 from app_user where emp_no = new.emp_no) then
    select auth_uid into uid from app_user where emp_no = new.emp_no;
    update app_user set active = false, updated_at = now(), updated_by = '퇴직 처리(자동)' where emp_no = new.emp_no;
    delete from app_user_entity where emp_no = new.emp_no;  get diagnostics n_ent = row_count;
    delete from app_session where emp_no = new.emp_no;
    if uid is not null then delete from auth.sessions where user_id = uid; end if;
    insert into app_auth_log(emp_no, event, detail, by_emp)
    values (new.emp_no, '퇴직 자동 정리', '계정 사용 중지 · 해외법인 자료 체크 ' || n_ent || '건 삭제 · 로그인 기록 삭제 (퇴직일 ' || coalesce(new.retire_date::text, '-') || ')', null);
  end if;
  return new;
end $$;
revoke all on function public._emp_retire_cleanup() from public, anon, authenticated;
drop trigger if exists trg_emp_retire_cleanup on public.employees;
create trigger trg_emp_retire_cleanup after update of active on public.employees
  for each row execute function public._emp_retire_cleanup();
-- 되돌리기: drop trigger trg_emp_retire_cleanup on public.employees; drop function public._emp_retire_cleanup();
