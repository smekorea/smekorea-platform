-- 5단계 DB 단 차단 되돌리기 (비상용) — rls_phase5_block_anon_and_overseas_scope_20261123 적용 전 상태로
-- 적용 전: RLS 켜진 일반 테이블 16개(아래 목록)만 정책 있음, 나머지는 RLS 꺼짐 + anon 전체 권한, 뷰는 security_invoker 꺼짐, 함수는 anon 실행 가능
do $$
declare t text; p record; v text; f record;
  rls_before text[] := array['mfg_check_status','sme_calendar','mfg_stock_move','mfg_stock_current','mfg_customer_plan','mfg_daily_plan','mfg_work_order','mfg_capa_master','mfg_model_price','ship_list','ship_list_items','wf_weekly_report','ship_schedule','category_deleted_defaults','employees','_load_stage'];
begin
  for t in select tablename from pg_tables where schemaname='public' and tablename not like 'app\_%' loop
    for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    if t = any(rls_before) then
      if t <> '_load_stage' then
        execute format('create policy allow_all on public.%I for all to anon, authenticated using (true) with check (true)', t);
        execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
      end if;
    else
      execute format('alter table public.%I disable row level security', t);
      execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
    end if;
  end loop;
  for v in select viewname from pg_views where schemaname='public' loop
    execute format('alter view public.%I set (security_invoker = false)', v);
    execute format('grant select on public.%I to anon, authenticated', v);
  end loop;
  for v in select matviewname from pg_matviews where schemaname='public' loop
    execute format('grant select on public.%I to anon, authenticated', v);
  end loop;
  for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and p.prokind='f' and p.prorettype <> 'trigger'::regtype
             and p.proname not like '\_app\_%' and p.proname not in ('_app_kill_auth') loop
    execute format('grant execute on function %s to anon, authenticated', f.sig);
  end loop;
end $$;
