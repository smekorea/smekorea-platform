// smerp-auth — SMERP 개인 계정 로그인·비밀번호 (2026-11-23, V20261123-02)
// 로그인: 법인·사번·비밀번호 → Supabase Auth 세션 + app_session 토큰
// 비밀번호는 4~6자, 첫 비밀번호·초기화 = 1120 (must_change=true → 새 비밀번호 전까지 SMERP 사용 불가)
// Auth에 저장되는 비밀번호는 HMAC(pepper, 사번|비밀번호) — pepper는 app_secret(서비스 키만 읽음)
// 배포: Supabase MCP deploy_edge_function (verify_jwt=false, 함수 안에서 토큰 확인)
import { createClient } from "npm:@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const opt = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL_, SRK, opt);
const INIT = "1120";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const J = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
class UErr extends Error {}

let PEPPER: string | null = null;
async function pepper() {
  if (PEPPER) return PEPPER;
  const { data, error } = await admin.from("app_secret").select("v").eq("k", "pw_pepper").single();
  if (error) throw error;
  PEPPER = data.v as string;
  return PEPPER;
}
async function derive(no: number, pw: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(await pepper()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(no + "|" + pw));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const emailOf = (no: number) => `e${no}@smerp.local`;
const pwOk = (p: unknown) => typeof p === "string" && [...p].length >= 4 && [...p].length <= 6 && !/\s/.test(p);
const now = () => new Date().toISOString();

async function signIn(no: number, pw: string) {
  const c = createClient(URL_, ANON, opt);
  const { data, error } = await c.auth.signInWithPassword({ email: emailOf(no), password: await derive(no, pw) });
  if (error) console.log("signIn fail", no, error.message);
  return error ? null : data.session;
}
async function log(emp_no: number | null, entity: string | null, event: string, detail?: string | null, by_emp?: number) {
  await admin.from("app_auth_log").insert({ emp_no, entity, event, detail: detail ?? null, by_emp: by_emp ?? null });
}
async function findAuthUserByEmail(email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email === email);
    if (u) return u.id;
    if (data.users.length < 200) break;
  }
  return null;
}
// Auth 계정을 만들거나 비밀번호를 바꿈
async function setAuthPassword(no: number, pw: string) {
  const p = await derive(no, pw);
  const { data: u } = await admin.from("app_user").select("auth_uid").eq("emp_no", no).maybeSingle();
  if (u?.auth_uid) {
    const { error } = await admin.auth.admin.updateUserById(u.auth_uid, { password: p });
    if (!error) return u.auth_uid as string;
  }
  let uid: string | null = null;
  const { data, error } = await admin.auth.admin.createUser({ email: emailOf(no), password: p, email_confirm: true, app_metadata: { emp_no: no } });
  if (error) {
    uid = await findAuthUserByEmail(emailOf(no));
    if (!uid) throw error;
    const r = await admin.auth.admin.updateUserById(uid, { password: p });
    if (r.error) throw r.error;
  } else uid = data.user.id;
  await admin.from("app_user").update({ auth_uid: uid }).eq("emp_no", no);
  return uid;
}
async function caller(token: string) {
  if (!token) throw new UErr("로그인이 만료되었습니다. 다시 로그인해주세요");
  const { data, error } = await admin.rpc("_app_caller", { p_token: token });
  if (error) throw error;
  const c = (data || [])[0];
  if (!c) throw new UErr("로그인이 만료되었습니다. 다시 로그인해주세요");
  return c as { emp_no: number; entity: string; name: string; role_id: number; is_admin: boolean; can_manage: boolean };
}
async function manager(token: string, empNo: number | null, entity?: string) {
  const c = await caller(token);
  const { data: mu } = await admin.from("app_user").select("must_change").eq("emp_no", c.emp_no).single();
  if (mu?.must_change) throw new UErr("새 비밀번호를 먼저 입력하세요");
  const all = c.is_admin || (c.can_manage && c.entity === "KOREA");
  if (!all && !c.can_manage) throw new UErr("권한이 없습니다");
  if (!all) {
    if (empNo != null) {
      const { data: e } = await admin.from("employees").select("entity").eq("emp_no", empNo).maybeSingle();
      if (!e || e.entity !== c.entity) throw new UErr("다른 법인 직원은 관리할 수 없습니다");
    }
    if (entity && entity !== c.entity) throw new UErr("다른 법인은 관리할 수 없습니다");
  }
  return { ...c, all };
}
async function defaultRole(no: number) {
  const { data: e } = await admin.from("employees").select("entity,dept").eq("emp_no", no).maybeSingle();
  if (!e) return null;
  const name = e.entity === "KOREA" ? String(e.dept || "").replace(/팀$/, "") : "해외 실무";
  const { data: r } = await admin.from("app_role").select("id").eq("name", name).maybeSingle();
  return r?.id ?? null;
}
// 1120으로 초기화 (계정이 없으면 만들고 기본 역할 지정)
async function resetTo1120(no: number, by: { emp_no: number; name: string }) {
  const { data: u } = await admin.from("app_user").select("emp_no,role_id").eq("emp_no", no).maybeSingle();
  if (!u) await admin.from("app_user").insert({ emp_no: no, role_id: await defaultRole(no), updated_by: by.name });
  else if (!u.role_id) await admin.from("app_user").update({ role_id: await defaultRole(no) }).eq("emp_no", no);
  await setAuthPassword(no, INIT);
  await admin.from("app_user").update({ must_change: true, locked: false, fail_count: 0, active: true, updated_at: now(), updated_by: by.name }).eq("emp_no", no);
  await admin.from("app_session").delete().eq("emp_no", no);
  await admin.rpc("_app_kill_auth", { p_emp_no: no });
  await log(no, null, "비밀번호 초기화(1120)", null, by.emp_no);
}

async function login(b: any) {
  const no = parseInt(b.emp_no, 10), ent = String(b.entity || ""), pw = String(b.pw ?? "");
  const { data: e } = await admin.from("employees").select("emp_no,name,dept,entity,active").eq("emp_no", no).eq("entity", ent).maybeSingle();
  if (!e || !e.active) return { ok: false, error: "직원 정보를 확인해주세요" };
  const { data: u } = await admin.from("app_user").select("*").eq("emp_no", no).maybeSingle();
  // 첫 시스템 관리자(사번 2) 계정 만들기 — 일회용 비밀번호(app_secret.bootstrap_pw)로 한 번만
  if (u && !u.auth_uid && no === 2) {
    const { data: bp } = await admin.from("app_secret").select("v").eq("k", "bootstrap_pw").maybeSingle();
    if (bp && pw === bp.v) {
      u.auth_uid = await setAuthPassword(no, pw);
      await admin.from("app_user").update({ must_change: true, fail_count: 0, locked: false }).eq("emp_no", no);
      u.must_change = true; u.fail_count = 0; u.locked = false;
      await admin.from("app_secret").delete().eq("k", "bootstrap_pw");
      await log(no, ent, "첫 관리자 계정 생성");
    }
  }
  if (!u || !u.role_id || !u.auth_uid) return { ok: false, error: "계정이 아직 발급되지 않았습니다. 관리자에게 문의하세요" };
  if (!u.active) return { ok: false, error: "사용 중지된 계정입니다" };
  if (u.locked) return { ok: false, error: "비밀번호 5회 오류로 잠겼습니다. 관리자에게 잠금 해제를 요청하세요" };
  const ses = await signIn(no, pw);
  if (!ses) {
    const n = (u.fail_count || 0) + 1;
    await admin.from("app_user").update({ fail_count: n, locked: n >= 5, updated_at: now() }).eq("emp_no", no);
    await log(no, ent, n >= 5 ? "잠금" : "로그인 실패", n + "/5");
    return { ok: false, error: n >= 5 ? "비밀번호 5회 오류로 잠겼습니다. 관리자에게 잠금 해제를 요청하세요" : `비밀번호가 올바르지 않습니다 (${n}/5)` };
  }
  await admin.from("app_user").update({ fail_count: 0, last_login: now() }).eq("emp_no", no);
  await admin.from("app_session").delete().lt("expires_at", now());
  const { data: s, error } = await admin.from("app_session").insert({ emp_no: no, expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString() }).select("token").single();
  if (error) throw error;
  await log(no, ent, "로그인");
  return { ok: true, token: s.token, session: ses, must_change: !!u.must_change, emp_no: no, name: e.name, dept: e.dept, entity: e.entity };
}

async function changePw(b: any) {
  const c = await caller(b.token);
  const { data: u } = await admin.from("app_user").select("must_change").eq("emp_no", c.emp_no).single();
  const nw = String(b.new ?? ""), old = String(b.old ?? "");
  if (!u.must_change) {
    if (!(await signIn(c.emp_no, old))) return { ok: false, error: "현재 비밀번호가 올바르지 않습니다" };
    if (nw === old) return { ok: false, error: "현재 비밀번호와 다른 비밀번호를 쓰세요" };
  }
  if (!pwOk(nw)) return { ok: false, error: "새 비밀번호는 4~6자로 입력하세요 (띄어쓰기 제외)" };
  if (nw === INIT) return { ok: false, error: "1120은 새 비밀번호로 쓸 수 없습니다" };
  await setAuthPassword(c.emp_no, nw);
  await admin.from("app_user").update({ must_change: false, pw_changed_at: now(), updated_at: now() }).eq("emp_no", c.emp_no);
  await log(c.emp_no, c.entity, "비밀번호 변경");
  const ses = await signIn(c.emp_no, nw); // 새 Auth 세션 (변경 후 계속 사용)
  return { ok: true, session: ses };
}

async function adminReset(b: any) {
  const no = parseInt(b.emp_no, 10);
  const m = await manager(b.token, no);
  await resetTo1120(no, m);
  return { ok: true };
}

async function adminIssue(b: any) {
  const ent = String(b.entity || "");
  const m = await manager(b.token, null, ent);
  const { data: emps } = await admin.from("employees").select("emp_no,name,dept,rank,entity").eq("entity", ent).eq("active", true).order("emp_no");
  const { data: users } = await admin.from("app_user").select("emp_no,role_id,auth_uid,active");
  const map = new Map((users || []).map((x: any) => [x.emp_no, x]));
  const out: any[] = [];
  for (const e of emps || []) {
    const u: any = map.get(e.emp_no);
    if (!u || !u.role_id || !u.active || u.auth_uid) continue;
    await setAuthPassword(e.emp_no, INIT);
    await admin.from("app_user").update({ must_change: true, locked: false, fail_count: 0, updated_at: now(), updated_by: m.name }).eq("emp_no", e.emp_no);
    await log(e.emp_no, ent, "계정 발급(1120)", null, m.emp_no);
    out.push({ ...e, temp: INIT });
  }
  return { ok: true, issued: out };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const b = await req.json();
    switch (b.action) {
      case "login": return J(await login(b));
      case "change_pw": return J(await changePw(b));
      case "admin_reset": return J(await adminReset(b));
      case "admin_issue": return J(await adminIssue(b));
      default: return J({ ok: false, error: "unknown action" }, 400);
    }
  } catch (e) {
    if (e instanceof UErr) return J({ ok: false, error: e.message });
    console.error(e);
    return J({ ok: false, error: "처리 중 오류가 발생했습니다" }, 500);
  }
});
