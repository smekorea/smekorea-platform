# SME WorkFlow 설계구조 문서
**버전: v1.14 / 작성일: 2026-08-01**

> 본 문서는 v1.13 구조를 계승합니다.
> - **PART 1. 현재 전체 사양** — 매 버전마다 최신 상태로 덮어써서 갱신 (제조모듈 설계구조 문서와 동일한 방식)
> - **PART 2. 버전 변경 로그** — 버전별로 "무엇이 바뀌었는지"만 누적 기록
> - **PART 3. 미완료 / 향후 작업**

---

# PART 1. 현재 전체 사양 (v1.14 기준 최신 상태)

## 1. 시스템 개요

- **명칭**: SME WorkFlow (SMERP 내 독립 모듈)
- **파일명**: `workflow.html`
- **URL**: `https://smekorea.github.io/smekorea-platform/workflow.html`
- **Supabase**: `https://muxuhrbsbrstmrrvlupw.supabase.co`
- **Publishable Key**: `sb_publishable_RYvQTDoDvwTuVPezpIeotg_EDSd9Wbb` (하드코딩, 설정창 불필요)
- **현재 상태**: 전 직원 23명 운영 중 — 라이브 운영 파일, 수정 전 반드시 확인 후 진행

## 2. 목적 및 배경

### 배경
- 기존 PJY 업무관리(`smekorea.github.io/calendar`) — 박정용 상무 개인용으로 완성되어 운영
- 달력+일정+업무일지 통합 운영으로 개인 활용도 확인 완료
- 전 직원 확대 사용 및 주간보고 디지털화를 위해 SMERP 통합 결정

### 목적 (업무 흐름)
```
일정 등록 → 업무 진행 → 메모/이슈 기록 → 업무일지 → 부서 공유/보고
```

### 개발 방식 — 기존 앱 기반 이전
`smekorea.github.io/calendar/index.html`(PJY 업무관리)의 기존 기능을 100% 유지하면서 필요 기능만 추가하는 방식으로 개발.

## 3. 사용 대상 및 정책

| 항목 | 내용 |
|---|---|
| 대상 | 본사 전 직원 23명 |
| 사용 여부 | 자유 (강제 아님) |
| 데이터 원칙 | 개인별 완전 독립 (본인 데이터만 조회) |
| 공유 기능 | 업무일지 작성 시 공유 선택 → 공유함 + 달력에 노출 (v1.6부터 달력 연동) |
| 접근 방식 | SMERP 메인 로그인 후 WorkFlow 진입 → 개인 비번 별도 입력 (2단계 통합 로그인, 4절 참고) |

## 4. 로그인 / 세션 관리 (최종 방식 — URL 파라미터 통합 + 법인선택, v1.9)

### 로그인 흐름
```
① SMERP 메인 로그인 — index.html도 v1.9부터 법인선택(SMEKR/SMEIN/SMETH/SMECN) → employees 테이블
   실시간 조회 이름select 방식으로 통일(기존 본사 23명 하드코딩+직접입력 폐기) + 공통비번 1120
② SME WorkFlow 클릭 → window.open('workflow.html?user=이름', '_blank')
③ workflow.html이 URL 파라미터에서 이름 읽음 → 이름 자동 표시 (드롭다운 숨김, 법인선택도 함께 숨김)
④ 개인 비번 4자리만 입력 → 로그인
⑤ 세션 유지 시간 선택: 1시간 / 3시간 / 8시간 / 24시간
```
> `window.open('_blank')`은 sessionStorage를 새 창과 공유하지 않으므로, URL 파라미터(`?user=이름`) 방식으로 데이터를 전달한다. (이전에 검토했던 sessionStorage 기반 "방안 2"는 이 방식으로 대체 확정됨)

### 법인선택 (신규, v1.9)
- **적용 대상**: `?user=` URL 파라미터가 없거나 매칭 실패한 경우의 **수동 선택 로그인 화면**에만 노출(정상적인 index.html 경유 흐름에서는 이름이 자동 세팅되므로 법인선택 단계 자체가 숨겨짐)
- 법인선택(SMEKR 본사/SMEIN 인도/SMETH 태국/SMECN 중국) 전에는 이름 select가 비활성화(`disabled`) 상태이며, 법인 선택 시 `employees.entity` 값으로 필터링된 해당 법인 인원만 이름 select에 표시됨
- 화면 표시 라벨(SMEKR 등)과 DB `employees.entity` 실제 저장값(KOREA/GSMEIN/SMEGLOBAL/SMECN)은 다름 — 매핑 테이블만 화면에서 사용하고 DB 값 자체는 변경하지 않음(SME_컨텍스트 v15.24 "A안"과 동일 원칙, 전체 시스템 리네이밍은 별도 검토)
- 도입 배경: SMECN(천진법인) 첫 직원 6명 등록을 계기로, 인원이 계속 늘어나면 법인 구분 없는 단일 이름목록에서 원하는 사람을 찾기 어려워지는 문제를 사전에 해결

### 초기 비번 정책
| 조건 | 초기 비번 |
|---|---|
| 휴대폰 등록된 경우 | 휴대폰 마지막 4자리 |
| 휴대폰 미등록 | `1111` |
| 저장 방식 | plain text (`employees.wf_password`) |

- ⚙ 설정 탭에서 현재 비번 확인 후 변경 (4자리 숫자만 허용)

### 세션 관리 (localStorage 방식)
```javascript
localStorage.setItem('wf_session', JSON.stringify({
  empId, empNo, name, dept, rank,
  sessH,                         // 선택한 유지 시간
  expire: Date.now() + (sessH * 3600000)
}));

// 앱 재접속 시
var urlUser = new URLSearchParams(location.search).get('user');
if (!urlUser && wfLoadSession()) {
  await wfEnterMain();           // 세션 유효하면 자동 진입
} else {
  await wfLoadEmployees();       // 로그인 화면 표시
  if (urlUser) { /* 드롭다운 숨기고 이름 텍스트 표시, 비번 입력창 포커스 */ }
}
```
- `?user=이름` 파라미터가 있으면 세션 무시 → 비번 입력 화면 강제 표시
- 기기별 독립 적용 (PC/휴대폰 각각 다른 세션시간 설정 가능)
- 만료 후 재접속 시 로그인 화면 자동 이동
- 로그아웃 시 localStorage + sessionStorage 동시 클리어

## 5. DB 설계

### employees — 추가 컬럼
```sql
ALTER TABLE employees ADD COLUMN phone text;         -- 휴대폰번호
ALTER TABLE employees ADD COLUMN wf_password text;   -- WorkFlow 개인비번 (plain text)
```
```sql
-- wf_password 초기값 세팅
UPDATE employees SET wf_password = CASE
  WHEN phone IS NOT NULL AND length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 4
  THEN right(regexp_replace(phone, '[^0-9]', '', 'g'), 4)
  ELSE '1111'
END WHERE wf_password IS NULL;
```

### work_diary — 전체 컬럼 (기존 + 추가)
```
id, date, category, action_type, partner, dept_contact,
title, content, importance, status, follow_up, is_work_log,
origin, calendar_id, created_at, target_dept, content_type,
employee_id, emp_name, is_shared, share_target, share_type,
task_start_date, task_end_date, task_stage           -- v1.14 신규
```
> ⚠️ `activity_type` 컬럼은 **존재하지 않음** — SELECT에 절대 포함 금지 (없는 컬럼 SELECT 시 쿼리 전체 무음 실패)

- 기존 PJY 데이터 이전 완료: 박정용 상무(emp_no=2, id=2) 기준 3,910건+ 전체 `employee_id` 태깅 완료 (2011~2026년)
- **`emp_name` (v1.11 신규)**: 작성자 이름을 텍스트로 스냅샷 저장. 기존엔 `employee_id`(숫자 FK)만 저장해서, 나중에 `employees.name`이 바뀌거나 직원이 삭제되면 과거 작성 기록의 표시 이름도 따라 바뀌거나 깨지는 문제가 있어 추가. **신규 저장(INSERT) 시에만 채워지고, 수정(UPDATE) 시에는 건드리지 않음** — 다른 사람이 나중에 그 글을 수정해도 원래 작성자 이름이 바뀌지 않도록 하기 위함. 기존 데이터는 `employee_id` 조인으로 소급 채움(4,308건 완료, 2026-07-16)
- **`task_start_date`/`task_end_date`/`task_stage` (v1.14 신규)**: 과제/부서업무보고 기능용. 별도 테이블을 신설하지 않고 `work_diary`를 확장하는 방식으로 결정(6-4절 상세). `content_type`이 "과제" 또는 "부서업무보고"일 때만 값이 채워지고, 그 외에는 항상 `null`
```sql
ALTER TABLE work_diary ADD COLUMN task_start_date date;
ALTER TABLE work_diary ADD COLUMN task_end_date date;
ALTER TABLE work_diary ADD COLUMN task_stage text; -- 착수 | 진행중 | 지연 | 완료
```
- **`origin` 컬럼 용도 확정 (v1.14)**: 기존엔 과거 데이터 이전 과정에서만 채워지고 신규 저장 경로에서는 전혀 쓰이지 않던 필드였음. v1.14부터 두 가지 신규 용도로 재사용 — ① **공유내용 복사**(8절) 시 `'공유복사: {원작성자명} {원본날짜}'` 형식으로 자동 기록, ② **엑셀 업로드**(6-4절) 시 `'엑셀업로드'` 고정값으로 기록. 목록 검색 대상 텍스트(`hay`)에도 포함되어 있어 두 값 모두 검색 가능

### share_comments (공유함 코멘트, v1.14 신규)
```sql
CREATE TABLE share_comments (
  id bigserial PRIMARY KEY,
  diary_id bigint NOT NULL,      -- work_diary.id 참조 (FK 제약은 걸지 않음, 다른 테이블과 동일 패턴)
  employee_id bigint NOT NULL,
  emp_name text,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE share_comments DISABLE ROW LEVEL SECURITY;
```
- 신규 테이블은 RLS 끄고 시작하는 기존 원칙 그대로 적용
- 공유받은 사람 전원 + 원작성자가 서로 볼 수 있는 스레드형 — 개인별/1:1 구분 없음

### user_categories (업무유형/활동유형/내용구분 — 사용자 추가 항목, v1.10)
```sql
CREATE TABLE user_categories (
  id          bigserial PRIMARY KEY,
  type        text NOT NULL,   -- 'category' | 'action_type' | 'content_type'
  value       text NOT NULL,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE user_categories DISABLE ROW LEVEL SECURITY;
```
- 드롭다운의 "＋ 항목 추가"로 등록한 값을 저장. **전 직원 공용(global)** — 누가 추가하든 전 직원 화면에 다 보임(개인별 구분 없음)
- **유형별 최대 20개** 제한(v1.11, 코드에서 체크)
- ⚠️ **RLS 실사고 이력**: 초기엔 RLS가 켜진 상태로 배포되어, 항목 추가 시 화면엔 반짝 보였다가 다음 접속 시 사라지는 증상 발생(INSERT가 조용히 실패, 에러는 콘솔에만 `console.warn`으로 찍혀 사용자는 못 봄). `ALTER TABLE user_categories DISABLE ROW LEVEL SECURITY;`로 해결(2026-07-16). **신규 테이블 생성 시 RLS를 기본으로 끄고 시작하는 습관 재확인 필요**(기존 `partners`/`export_customers`/`work_diary_confirm`과 동일 패턴)

### category_deleted_defaults (기본항목 숨김처리, v1.11)
```sql
CREATE TABLE category_deleted_defaults (
  id          bigserial PRIMARY KEY,
  type        text NOT NULL,
  value       text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(type, value)
);
ALTER TABLE category_deleted_defaults DISABLE ROW LEVEL SECURITY;
```
- 코드에 하드코딩된 **기본 항목**(매출처/매입처/개발/... 등, `CAT_DEFAULT_OPTS`)은 DB 행이 아니라서 직접 삭제할 수 없음 → "삭제"하면 이 테이블에 기록해서 드롭다운에서만 숨기는 방식으로 처리. 실제 코드는 건드리지 않음

### work_diary_confirm (v1.4 / 공유확인 이력)
```sql
CREATE TABLE work_diary_confirm (
  id           bigserial PRIMARY KEY,
  diary_id     integer NOT NULL,
  employee_id  integer NOT NULL,
  emp_name     text,
  confirmed_at timestamptz DEFAULT now()
);
```
- RLS 비활성화 완료

### wf_weekly_report (향후 — 미착수)
```sql
CREATE TABLE wf_weekly_report (
  id              bigserial PRIMARY KEY,
  employee_id     integer,
  dept            text,
  year            integer,
  month           integer,
  week            integer,
  category        text,
  sub_category    text,
  detail          text,
  partner         text,
  scheduled_date  date,
  status          text DEFAULT '진행중',
  is_instruction  boolean DEFAULT false,
  follow_status   text,
  vendor          text,        -- 제조팀 전용
  received_date   date,        -- 제조팀 전용
  completed_date  date,        -- 제조팀 전용
  created_at      timestamptz DEFAULT now()
);
```
> 테이블은 생성 완료 상태이나 화면(입력 UI)은 아직 미개발 — PART 3 참고

### 달력/할일 테이블
| 테이블 | 용도 | 비고 |
|---|---|---|
| `cal_events` | 달력 일정 | 기존 방식 유지 |
| `cal_todos` | 할일 목록 | 기존 방식 유지 |

> ⚠️ **확인 필요**: v1.2 문서에는 달력 일정 테이블이 `sme_calendar`로 기재되어 있었으나, v1.4·SME_컨텍스트에는 `cal_events`로 기재되어 있음. SME_컨텍스트 737행 부근에는 `sme_calendar`(54건)가 별도 테이블로도 언급됨 — 동일 테이블의 개명인지, 별도 테이블인지 확인이 필요합니다 (다음 세션 확인 요망, PART 3 참고).

> **참고 (v1.6)**: 실제 달력 탭(`renderCal`)은 `cal_events`가 아닌 `diaryRecords`(= `work_diary`, 본인 `employee_id` 필터)를 기준으로 렌더링되고 있음을 코드 확인함. `cal_events`/`cal_todos`는 할일(⏰) 표시 등 일부 기능에서만 사용 중. 위 `sme_calendar` 불일치 이슈와는 별개 사안이므로 혼동 주의.

## 6. 화면 구조 (탭 구성 — 5개)

| 탭 | 내용 | 비고 |
|---|---|---|
| 📅 달력 | 월간 달력 — 음력/공휴일 표시, 스와이프 월 이동, 셀 높이 조절, **공유 항목 표시(v1.6)**, **공유 항목 클릭 시 상세보기(v1.8)**, **음력계산 근본수정+오늘배지 빨강+ISO주차 배지(v1.9)**, **중요도 "상" 강조표시(v1.13)** | 기존 calendar 앱 기능 100% 유지 + 신규 |
| 📋 일정 | 오늘 이후 일정 목록 (카테고리/월/키워드 필터) | |
| 📝 업무일지 | 전체 업무일지 기록/검색/필터/CSV다운/컬럼리사이즈, **수정 모달 드래그 이동(PC, v1.13)**, **이동복사 기능(v1.13)**, **과제/부서업무보고 필드(v1.14)**, **양식 다운로드·엑셀 업로드(v1.14)**, **페이지네이션 10개+직접입력(v1.14)** | 키워드1~3 OR 검색(v1.3에서 AND→OR로 변경) |
| 📢 공유함 | 전 직원 공유 내용 조회 (부서/개인/전체공유, 공유확인), **코멘트 스레드 + 내 업무일지로 복사(v1.14)** | |
| ⚙ 설정 | 비번변경 / 세션시간변경 / 로그아웃 / Claude AI 설정(API Key) | |

- 모바일 지원: PWA 설치 가능, PC/휴대폰 동일 사용 가능
- index.html에서 ↗ 버튼으로 새창 열기 가능 (듀얼모니터 활용)
- ~~📌 화면고정(듀얼모니터 전용창) 기능 (v1.13 신규)~~ → **v1.14에서 배너·버튼·관련 코드 전부 삭제**. 상세 사유는 6-3절 하단 및 PART2 v1.14 로그 참고

### 6-1. 달력 표시 상세 (v1.9 신규)

**음력 계산 — 근본 버그 수정**
- 기존 자체 룩업테이블(`LD` 배열)이 1900~1999년까지만 존재해, **2000년 이후 모든 날짜의 음력이 틀리게 계산**되던 문제 발견(실사용 중 "7/15인데 음력이 8/11로 나온다" 리포트로 발견)
- 홍콩천문대 원본데이터 기반 1900~2100년 전체 구간 검증 알고리즘(Microsoft `ChineseLunisolarCalendar`와 대조검증된 공개 표준 구현)으로 `LD` 테이블·`sol2lun()`·`lYearDays()` 등을 전면 교체
- 검증: 2023~2026년 설날(음력 1/1)·추석(음력 8/15) 날짜를 역산해 전부 일치 확인
- `lunarLabel()`/`isHoliday()` 등 기존 함수 시그니처는 유지 — 호출부(달력 셀 렌더링 등)는 수정 불필요

**음력 표시 형식**
- 접두 `음` 추가 — 기존 "8/11" → **"음8/11"**

**오늘 날짜 배지**
- 색상 파란색(`var(--accent)`) → **빨간색(`#E24B4A`)**으로 변경(전역 `--accent` 변수는 건드리지 않고 `.today-num` 클래스만 개별 오버라이드)

**주차 배지 (일요일 셀)**
- **ISO 8601 표준 방식**으로 확정 — 월요일 시작 기준, 그 주의 목요일이 속한 연도로 판정하는 연중 누적 주차. "W29" 형식으로 표시, 배지 색상 주황
- *(시도했다 폐기한 방식)* "그리드 줄 기준"(달력 화면에 그려진 순서상 몇 번째 줄인지, 매달 1주로 리셋) 방식도 한 차례 구현했으나, 연중 누적이 아니라 매달 초기화되는 게 사용자 기대와 달라 삭제 후 ISO 방식으로 재구현

### 6-2. 다국어(한국어/中文/English) 지원 시스템 (v1.10 신규)

**도입 배경**: SMECN(천진법인) 직원들이 실사용을 시작하면서, 중국어·영어로도 화면을 볼 수 있어야 한다는 요청. 처음엔 "탭 메뉴만"으로 범위를 좁게 시작했으나, 최종적으로 "전체 UI 텍스트(카테고리 값 포함)"까지 확장, 영어도 추가해 3개 언어로 확정.

**아키텍처**
- `I18N_T` 딕셔너리(203개 키, 한국어 원문 텍스트 자체를 key로 사용) + `t(key)` 조회 함수 + `applyI18n()` (모든 `[data-i18n]`/`[data-i18n-ph]`/`[data-i18n-title]` 요소를 훑어서 텍스트/placeholder/title 갱신)
- 언어 상태는 `WF_LANG` 전역변수, `localStorage.wf_lang`에 저장되어 재접속해도 유지
- **정적 HTML**: 버튼/라벨/옵션 등에 `data-i18n="원문"` 속성을 붙이고, `applyI18n()`이 현재 언어로 텍스트를 교체
- **동적 JS 렌더링**(달력/일정/업무일지/공유함 테이블 등): 템플릿 리터럴 안에서 직접 `t(변수)`를 호출 — 예: `${t(r.status)}`, `${t(r.category)}`
- **DB 저장값은 절대 번역하지 않음**: `work_diary.category`/`status`/`content_type` 등은 계속 한국어 원문 그대로 저장(예: `category='매출처'`). 화면 표시만 번역하고, 검색·필터·admin_log.html 등 타 화면과의 데이터 정합성은 그대로 유지
- **직원 이름은 번역하지 않음**: `직원관리(employees.name)`에 등록된 이름을 그대로 표시 — 처음에 이름 뒤에 언어별 문법(님의/的/'s)을 붙였다가, 실제 이름과 문법이 섞여 어색해 보이는 문제가 있어 **가운데점(·)으로만 구분**하는 방식으로 수정 확정 (`박정용 · 달력` / `박정용 · 日历` / `박정용 · Calendar`)
- **자유텍스트(사용자 직접 입력)는 번역 대상 아님**: 업무일지 제목/내용, AI 채팅 등은 원문 그대로

**언어 선택 UI**
- 로그인 화면 상단 + ⚙ 설정 탭, 두 곳에 한국어/中文/English 버튼(`.wf-lang-btn`, active 시 빨간 배경)
- **index.html(SMERP 메인 로그인 팝업)에도 동일하게 언어선택 추가**(v1.10) — `localStorage.wf_lang` 키를 workflow.html과 **공유**하도록 만들어, SMERP 로그인 단계에서 언어를 선택하면 워크플로우 진입 후에도 그 언어가 유지됨. index.html은 별도의 경량 `IDX_I18N_T`/`idxT()`/`applyIdxI18n()` 세트를 갖고 있음(supabase-js 없이 raw fetch만 쓰는 기존 코드 스타일 유지)

**상단바 구조 재설계 (v1.10)**
- 기존엔 이름표시(`nav-sub`)와 년월(`month-label`)이 세로 2줄로 쌓여 있었음 → **가로 1줄**로 변경(`.nav-title{flex-direction:row}`)
- `nav-sub` = `{이름} · {현재탭이름}` 형식으로 동적 표시, 탭 전환마다·언어 전환마다 갱신
- `month-label`(년월)은 **달력 탭에서만** 표시, 다른 탭에서는 비움
- 탭 이름 변경: "월간"→"**달력**", "공유함"→"**업무공유**" (3개 언어 전부 반영)

**번역 범위**: 로그인화면(법인선택 포함), 탭메뉴 5개, 화면설정, 달력(요일/월/음력접두/범례/오늘배지), 일정·할일·업무일지·공유함의 테이블 헤더 및 상태·업무유형·활동유형 값(구 분류 "근무/휴무"·"영업/거래처관리"·"설비/투자" 포함), 각 모달(추가/수정 타이틀 포함)의 라벨·버튼·placeholder, WF설정(비번변경/세션시간 안내문/로그아웃), 통계 요약("총 X건"), 주요 로그인·에러 메시지

**개발 중 발견한 버그 (전부 v1.10에서 수정 완료)**
1. **`nav-sub` 되돌아가는 버그**: "PJY 업무관리" 초기 텍스트에 `data-i18n`을 붙였는데, 로그인 후 이름으로 덮어써지는 자리라서 탭 전환마다 다시 "PJY 업무관리"로 리셋되던 문제 → 해당 요소는 `data-i18n` 제거(동적 전용 자리로 확정)
2. **모달 제목류 4곳 동일 패턴 버그**: "일정 추가"↔"일정 수정", "할 일 추가"↔"할 일 수정", "업무일지 작성"↔"업무일지 수정", "공유할 부서 선택"↔"공유할 직원 선택" — 전부 JS로 상황에 따라 textContent가 바뀌는데 초기 정적 `data-i18n`만 믿고 있어서 언어 전환 시점에 따라 엉뚱한 모드 텍스트로 되돌아갈 수 있었음 → 전부 해당 변경 시점에 `t()`로 직접 갱신하도록 수정
3. **⚠️ 지역변수명이 번역함수 `t()`를 가리는 버그 (총 4곳, 그 중 1곳은 실제 크래시 유발)**: `renderTodos()`, `editTodo()`, `saveEditedTodo()`, `confirmCompleteTodo()`, `onShareTypeChange()`에서 기존 코드가 반복문 변수나 지역변수 이름으로 `t`를 쓰고 있었는데, 그 스코프 안에서 번역함수 `t()`를 호출하려 하면 지역변수가 함수를 가려버림. 특히 `editTodo()`는 `const t=...` 상태에서 `t('할 일 수정')` 호출을 넣어 **"객체를 함수처럼 호출" 런타임 에러가 날 뻔한 상태**였음 — 발견 즉시 지역변수명을 `td`/`shareTypeSel` 등으로 전부 변경. **(교훈: 앞으로 `t`라는 짧은 변수명은 이 파일 전체에서 예약어처럼 취급 — 번역함수와 충돌 확인 없이 재사용 금지)**
4. **동적으로 다시 그려지는 안내문구가 언어전환 대상에서 누락**: 법인선택 후 이름 select의 첫 옵션(`— 선택해주세요 —`)을 `textContent`로만 바꾸고 `data-i18n` 속성은 안 바꿔서, 이후 언어 전환 시 엉뚱한 상태 문구로 되돌아가는 문제(index.html에도 동일 유형 있었음, 둘 다 수정) — 요소 재작성 시 `data-i18n` 속성도 함께 갱신하도록 원칙 확정
5. **달력 범례(`renderLegend()`)가 언어 전환 시 재렌더 목록에서 누락**되어 있던 문제(단순 누락, 추가로 해결)
6. **통계줄("총 X건") 및 세션 안내문("현재: X시간 / 만료: ...")**이 번역 처리가 아예 안 되어 있던 것을 발견해 추가 처리(세션 만료일시는 언어별 로케일(`ko-KR`/`zh-CN`/`en-US`)까지 반영)

**검증 방법**: 정적 `data-i18n` 속성 203개, 동적 `t()` 호출 38개 전부 딕셔너리에 zh/en 번역이 있는지 스크립트로 전수 대조. `t` 변수명 충돌 가능 지점도 전체 파일 grep으로 전수 조사.

**미해결/보류**: 일부 alert/confirm 메시지(비밀번호 변경, API Key 저장 등)와 AI 채팅 프롬프트는 이번엔 번역하지 않음 — 필요 시 후속 작업.

### 6-2. ⚙설정 탭 서브메뉴 구조 (v1.11 신규)

기존엔 언어/비밀번호변경/로그인유지시간/추가항목관리/AI설정/로그아웃 카드가 세로로 전부 나열되어 있었는데, 항목이 늘어나면서 스크롤이 길어져 서브탭 방식으로 재구성.

```
[🌐 언어] [🔑 비밀번호] [🏷️ 추가항목 관리]   ← 서브탭 버튼(클릭한 것만 파란 배경)
─────────────────────────────────────
(선택한 서브탭 내용만 표시)
─────────────────────────────────────
[로그아웃]  ← 서브탭과 무관하게 항상 하단 고정
```
- **언어**: 언어선택 버튼 3개만
- **비밀번호**: 비밀번호 변경 + 로그인 유지 시간 + AI 설정(박정용 empId=2 전용, 기존과 동일하게 다른 직원에겐 안 보임)을 하나로 통합
- **추가항목 관리**: 7절 "＋ 항목 추가 기능 및 관리" 참고
- 구현: `switchWfSetSub(sub)` 함수로 3개 패널(`#wfSetSub-lang`/`#wfSetSub-pw`/`#wfSetSub-cat`) 중 하나만 표시, 버튼엔 `.wf-set-subtab.active` 클래스 토글. "추가항목 관리" 서브탭 클릭 시마다 `renderCategoryManager()` 재호출(최신 건수 반영)

### 6-3. 일정관리 UX 개선 4건 + 📌 화면고정(듀얼모니터) 기능 (v1.13 신규)

**① 중요도 "상" 캘린더 강조 표시**
- event-chip 생성 로직에서 `r.importance==='상'`이면 배경 `#FFF9C4`(노랑)+텍스트 `#E24B4A`(빨강, 굵게)로 강제 표시, 기존 상태별(진행중/지시·후속필요/완료) 색상 로직보다 우선 적용
- **버그 발견·수정**: 전역 CSS `.event-chip{color:#111 !important}` 규칙이 인라인 색상을 덮어써서 배경만 노랗고 글자색은 안 바뀌는 문제 발생 → 인라인 스타일에도 `!important`를 붙여야 이긴다는 점 확인(교훈: `!important` 규칙이 걸린 요소에 인라인으로 색상을 오버라이드할 땐 인라인에도 동일하게 `!important` 필요)

**② 이동복사(원본유지) 기능**
- **배경**: 며칠 전 등록해둔 "진행중" 상태의 일정을 오늘 "완료"로 정리하려면, 기존엔 오늘 날짜에 처음부터 재입력해야 하는 번거로움이 있었음
- 업무일지 수정 모달 하단에 "이동복사" 버튼 신규 추가(신규 작성 시엔 숨김, `diary-del-btn`과 동일 조건)
- 클릭 → 별도 날짜선택 팝업(`movecopy-modal-overlay`) 오픈, 기본값은 원래 일정의 날짜
- 날짜 선택 후 "복사" 클릭 → **현재 수정 폼에 입력되어 있는 내용을 그대로** 새 레코드로 `work_diary`에 insert(원본 레코드는 건드리지 않음 — 원본유지/삭제 두 방식 중 원본유지로 확정)
- 수정 모달의 대상(`diaryEditId`)이 새로 생성된 레코드로 전환되고 모달은 계속 열린 상태 유지 → 이어서 상태 등을 고쳐서 기존 "저장" 버튼으로 마무리하면 됨

**③ 일정입력창(diary-modal) 드래그 이동 (PC 전용)**
- PC(너비 521px 이상)에서 모달 제목(`#diary-modal-title`, "업무일지 작성/수정")에 `cursor:move` 부여, mousedown/touchstart로 드래그 시작 → 뷰포트 밖으로 못 벗어나게 clamp 처리하며 이동
- 모바일(바텀시트 UI)은 기존 방식 그대로 유지(드래그 비활성)
- 모달을 닫으면(`closeDiaryModal()`) `position`/`left`/`top`/`margin` 인라인 스타일을 초기화해, 다음에 열 때는 항상 중앙 위치로 복귀

**④ 📌 화면고정(듀얼모니터 전용창) 기능**
- **목적**: 듀얼모니터 환경에서 워크플로우를 한쪽 모니터에 "바탕화면처럼" 상시 배치해두고 쓰고 싶다는 요청
- **1차 설계(폐기)**: 📌 클릭 시 별도 창을 새로 열고, 다시 클릭하면 그 창을 닫는 방식 → 이미 브라우저 탭으로 열려있는 상태에서 클릭하면 **창이 2개가 되고**, 원래 탭을 닫으면 고정창도 같이 닫히는 문제가 있어 사용자 피드백으로 **창 1개 구조로 재설계**
- **최종 설계(v1.13)**:
  1. 접속 시(주소창 있는 일반 탭) 상단에 안내 배너 표시: "📌 이 화면을 주소창 없는 전용 창으로 열까요? [전용 창 열기] [닫기]"
  2. **"전용 창 열기" 버튼 클릭**(사용자 제스처) → `window.open()`으로 주소창 없는 창(`menubar=no,toolbar=no,location=no,status=no`, `window.name='wf_main'`)을 재오픈, URL에 `?popped=1` 파라미터 부여해 재귀 방지 → 원래 탭은 `window.close()` 시도(스크립트로 안 열린 탭은 브라우저가 닫기를 막을 수 있어, 실패 시 "이 탭은 닫아주세요" 안내로 전환)
  3. 전용 창(`window.name==='wf_main'`) 안에서 📌 버튼 클릭 → `window.screenX/screenY/outerWidth/outerHeight`를 저장해두고 `window.moveTo`+`window.resizeTo`로 **현재 창이 위치한 모니터의 화면 전체 크기**(`screen.availLeft/availTop/availWidth/availHeight`)로 리사이즈·이동(고정), 다시 클릭하면 저장해둔 이전 크기/위치로 복원
  4. 사용법: 전용 창을 제목표시줄로 잡아 두 번째 모니터로 드래그해서 옮긴 뒤 📌 클릭 → 그 모니터에 꽉 차게 고정
  5. 전용 창이 아닌 일반 탭 상태(`window.name!=='wf_main'`)에서 📌를 누르면 "화면고정은 별도 창(주소창 없는 창)에서만 사용 가능합니다" 안내만 표시하고 동작하지 않음
- **⚠️ 중요 버그 발견·재발방지 원칙**: 최초엔 페이지 로드 시 **사용자 클릭 없이 자동으로** `window.open()`을 호출하는 방식으로 구현했으나, 실사용 스크린샷으로 확인한 결과 브라우저(Edge/Chrome) **팝업 차단 정책 때문에 대부분 조용히 차단**되어 아무 반응도 없는 것처럼 보였음(에러도 안 뜨고, 원래 탭이 정상 동작해서 원인 파악이 어려웠음) → **`window.open()`은 반드시 사용자의 직접 클릭 이벤트 핸들러 안에서만 호출해야 성공률이 보장된다는 원칙 확정**. 앞으로 새 창을 자동으로 띄우는 기능을 설계할 때는 항상 클릭 유도 UI(배너/버튼)를 경유하도록 할 것
- **🗑️ v1.14: 기능 전체 폐기·삭제** — 실사용 화면을 스크린샷으로 다시 확인한 결과 배너 UX가 불필요하다고 판단되어 사용자 요청으로 제거 결정. 배너 스크립트(파일 최상단 IIFE), CSS(`#pin-btn.pinned`), 상단바 📌 버튼(`#pin-btn`), `togglePinWindow()`/`pinPrevRect` 전부 코드에서 삭제. **화면고정 버튼은 브라우저 보안정책상 `window.open()`으로 직접 연 창에서만 크기·위치 조절이 가능**해 이 배너 없이는 애초에 동작할 수 없는 구조였으므로, 배너 삭제 = 화면고정 기능 자체의 폐기와 동일함(사용자에게 이 의존관계를 사전 안내 후 폐기 확정)

### 6-4. 과제/부서업무보고 + 양식 다운로드·업로드 + 페이지네이션 확장 (v1.14 신규)

**배경**: 달력→업무일지 연결→공유업무 확장 순으로 발전해온 흐름의 다음 단계로, "과제 진척사항"이나 "부서업무보고" 형태의 관리가 필요해짐. 동시에 직원들이 주간 단위로 메모해둔 내용을 재정리해서 업무일지에 일괄 반영하고 싶다는 요청, 목록 페이지 탐색이 불편하다는 요청이 함께 있어 한 라운드로 진행. **과제 관리 기준(진행률 표시 방식 등)은 아직 확정된 정답이 없다고 판단해, 우선 가장 단순한 형태로 배포 후 실사용하면서 개선하는 방침으로 진행**(진행률 %는 근거가 부족해 배제, 상태단계+기간 자동계산 조합으로 시작).

**① 과제/부서업무보고 (work_diary 확장)**
- 별도 테이블 신설 없이 기존 `work_diary`를 확장하는 방식으로 결정 — 신규 업무유형 체계를 또 만들기보다, 이미 있는 "기록유형(content_type)" 드롭다운에 사용자가 "＋ 항목 추가"로 "과제"/"부서업무보고" 값을 직접 등록하는 방식 채택("＋ 항목 추가 기능 및 관리" 섹션의 기존 메커니즘 그대로 재사용, 코드 변경 없이 값만 추가하면 동작)
- 작성/수정 모달에서 기록유형이 "과제" 또는 "부서업무보고"일 때만 **시작일·종료일·진행단계** 3개 입력란이 조건부로 펼쳐짐(`onContentTypeChange()`에서 토글, `#dm-task-row`) — 평소엔 선택창이 늘어나지 않도록 하기 위함
- 진행단계는 **착수 → 진행중 → 지연 → 완료** 4단계 고정(자유 입력 아님, select)
- 진행률(%)은 채택하지 않음 — 대신 목록에서 진행단계 + 종료일 기준 D-day를 자동계산해 함께 노출(`taskBadgeHtml()`), 주관적 숫자 입력 없이 "시간이 얼마나 지났는지"만 기계적으로 계산
- 목록 표시: 제목 셀 하단에 `🗓 진행중 · D-12` 형태 배지(진행단계별 색상: 착수 회색/진행중 파랑/지연 빨강/완료 초록)
- "이동복사"(6-3절 ②) 시에도 과제 필드가 함께 복사되도록 반영

**② 양식 다운로드 / 엑셀 업로드**
- 업무일지 탭 상단에 "양식 다운로드"/"업로드" 버튼 신규 추가, SheetJS(xlsx CDN)를 지연 로딩(`loadXlsxSDK()`, Supabase SDK와 동일한 지연로딩 패턴)
- **양식 다운로드**: 엑셀 2개 시트 — "업무일지"(입력용 헤더+샘플 1행), "작성가이드"(컬럼별 입력 가능 값 설명). 컬럼: 날짜/업무유형/활동유형/거래처/담당부서/기록유형/제목/내용/후속조치/중요도/상태/시작일/종료일/진행단계/공유/공유대상
- **업로드**: 파일 선택 → 파싱 → **미리보기 팝업**(최대 30건 표시 + 전체 건수) → "일괄 등록" 클릭 시에만 `work_diary`에 insert. 날짜가 비어있는 행은 자동으로 건너뛰고 건너뛴 건수를 안내
- 공유 컬럼값(공유안함/부서공유/개인공유/법인공유/전체공유)을 기존 `is_shared`/`share_target`/`share_type` 저장 형식(8절)으로 매핑, 공유대상은 콤마(,) 구분 텍스트를 배열로 변환
- 업로드로 생성된 레코드는 `origin='엑셀업로드'`로 자동 기록(위 5절 origin 용도 참고), `employee_id`/`emp_name`은 업로드를 실행한 사람 기준

**③ 페이지네이션 확장**
- 기존 현재 페이지 기준 좌우 2개씩(최대 5개) 노출 방식을 **최대 10개**로 확장(`renderDiary()` 페이지네이션 로직)
- 페이지 번호 직접 입력창 신규 추가 — 숫자 입력 후 Enter 또는 "이동" 버튼 클릭 시 해당 페이지로 즉시 이동(`diaryGoPageInput()`)

### 업무유형
```
매출처 / 매입처 / 개발 / 품질 / 사내관리 / 인사 / 조직 / 출장 / 개인업무
```
> 기존 데이터(영업/거래처, 설비/투자 등 구 분류)는 그대로 유지 — 과거 데이터 변경 없음, 신규 작성분부터만 새 분류 적용

### 활동유형
```
방문 / 미팅 / 회의 / 식사 / 접대 / 라운딩 / 계약 / 협의 / 점검 / 정비 / 교육 / 심사 / 행사 / 행정처리
```

### 내용구분 (3개) — 대상부서 연동 폐지 (v1.12)
```
일반기록 / 전달사항 / 지시사항
```
> **⚠️ v1.12부터 "대상부서" 입력이 없어짐**: 원래 전달사항/지시사항 선택 시 대상부서(전체부서/개발기획팀/자재구매팀/개발구매팀/출하팀/제조팀/재경팀) 선택란이 나타났었는데, 실제로는 **공유(공유 드롭다운의 부서공유)와 완전히 분리된 별개 필드**로, 대상부서를 골라도 자동으로 공유되지 않고 필수 검증도 없어 — "전달사항이라고 부서를 골라놨는데 정작 아무한테도 전달 안 되는" 실질적으로 의미 없는 이중입력이었음이 확인됨. **작성/수정 모달에서만 제거**했고, 업무일지 목록의 "대상부서" 컬럼·필터·검색 대상 텍스트는 기존 데이터 조회용으로 그대로 유지(`work_diary.target_dept` 컬럼 자체도 유지, 신규 저장분만 계속 공란).

### 진행상태
```
완료 / 진행중 / 보류 / 후속필요 / 지시
```

### AI 프롬프트 매핑
```
category: 매출처|매입처|개발|품질|사내관리|인사|조직|출장|개인업무
action_type: 방문|미팅|회의|식사|접대|라운딩|계약|협의|점검|정비|교육|심사|행사|행정처리
```

### ＋ 항목 추가 기능 및 관리 (v1.11 신규)

**배경**: 업무유형/활동유형/내용구분 3개 드롭다운 맨 아래 "＋ 항목 추가"로 사용자가 새 값을 등록할 수 있는 기능이 기존에 있었는데, (1) 몇 개까지 추가되는지 제한이 없었고, (2) 한 번 추가하면 지우거나 고칠 방법이 전혀 없어서 관리 필요성이 제기됨.

**저장 방식 확인**
- `user_categories` 테이블(5-절 참고)에 전 직원 공용(global)으로 저장 — **개인별이 아니라 한 사람이 추가하면 전 직원 화면에 다 보임**
- **유형별 최대 20개** 제한 추가(초과 시 안내 후 추가 차단)

**관리 UI (⚙설정 → 추가항목 관리)**
- 업무유형/활동유형/내용구분 3개 유형별로 지금까지 등록된 항목 + 각 항목이 실제로 몇 건의 `work_diary` 기록에서 쓰이는지(건수) 표시
- **✏️ 수정(이름변경)**: `user_categories.value`뿐 아니라, **이미 그 값으로 저장된 기존 `work_diary` 기록도 새 이름으로 함께 UPDATE** — 그래야 기존 자료가 붕 뜨지 않음
- **🗑 삭제**: 사용 중인 기록이 있으면 **"대체할 항목을 선택하세요"** 모달이 뜸(드롭다운, 기본값 "기타") → 확인 시 기존 기록을 그 항목으로 일괄 변경한 뒤 삭제. 사용 중인 기록이 없으면 바로 삭제
- **건수 집계 방법**: Supabase 1,000행 제한(중요 원칙 참고) 대응을 위해 `range()` 페이지네이션으로 전체를 끝까지 훑어서 클라이언트에서 집계(`countCategoryUsage()`)

**기본 항목(코드에 하드코딩된 값)도 관리 대상에 포함 (v1.11 확장)**
- 최초 구현 시엔 "＋항목추가"로 나중에 넣은 값만 관리 가능했는데, "기존에 원래 있던 기본 항목(매출처/매입처/방문/미팅 등)은 왜 관리가 안 되냐"는 피드백으로 확장
- 기본 항목은 DB 행이 아니라 코드(`CAT_DEFAULT_OPTS`)에 고정된 값이라 직접 삭제 불가 → **`category_deleted_defaults` 테이블(5절 참고)에 기록해서 드롭다운에서만 숨김 처리**하는 방식으로 우회 구현
- 관리 목록에서 기본 항목은 "기본" 배지로 구분 표시
- 기본 항목 수정 = 내부적으로는 "새 이름으로 `user_categories`에 추가 + 기존 기록 일괄 변경 + 원래 기본항목은 숨김 처리"로 동작(사실상 기본항목이 사용자항목으로 전환)

**⚠️ RLS 실사고 (2026-07-16)**: `user_categories`에 RLS가 켜진 채로 배포되어, 항목 추가 시 화면엔 반짝 보였다가 실제로는 저장되지 않아 다음 접속 시 사라지는 증상 발생. `ALTER TABLE user_categories DISABLE ROW LEVEL SECURITY;`로 해결. **원인 파악 과정에서 "추가항목 관리" 화면 자체가 진단 도구 역할을 했음** — DB를 직접 조회해서 보여주는 화면이라, 로컬 화면엔 보이는데 관리 화면엔 "0/20"으로 안 뜨는 것을 보고 저장 실패를 확정할 수 있었음

## 8. 공유 기능 설계 (최종, v1.8 — 달력 연동 + 오늘 날짜 강조 + 상세보기 연동)

### share_target 저장 형식
```
공유안함: is_shared=false, share_target=null
부서공유: is_shared=true,  share_target='["자재구매팀","개발기획팀"]'
개인공유: is_shared=true,  share_target='["박정용"]', share_type='person'
법인공유: is_shared=true,  share_target='["KOREA","SMECN"]', share_type='corp'   ← v1.11 신규
전체공유: is_shared=true,  share_target='전체'
```

### 법인공유 (v1.11 신규)

**배경**: 해외법인이 계속 추가되면서, 부서/개인 단위로는 "우리 법인 전체"에 공유하기가 번거로워짐(예: SMECN 전 직원에게 공유하려면 부서를 여러 개 체크해야 함). 법인 단위 통짜 공유 옵션 추가.

- 공유 드롭다운에 **"법인공유"** 추가 (공유안함/부서공유/개인공유/**법인공유**/전체공유)
- 선택 시 SMEKR(본사)/SMEIN(인도)/SMETH(태국)/SMECN(중국) 체크박스 표시, 다중 선택 가능
- `share_target`에는 표시코드(SMEKR 등)가 아니라 **DB `entity` 실제값**(KOREA/GSMEIN/SMEGLOBAL/SMECN)을 저장 — 로그인 화면과 동일하게 "화면 라벨만 매핑, DB 값은 변경 안 함" 원칙(6-12절 A안)을 여기서도 동일 적용
- 이 기능을 위해 **`wfSession`에 `entity` 필드 신규 추가**(기존엔 이름/부서/직급만 저장하고 있었음) — 로그인 시 `employees.entity`를 함께 조회해서 세션에 저장
- 공유대상 컬럼 표시 시 raw 코드(KOREA 등)가 아니라 `CORP_DISPLAY_LABEL` 매핑을 거쳐 "SMEKR (본사)"처럼 사람이 읽기 좋은 라벨로 변환해서 표시
- 확인 대상자 수(N/M) 계산 시에도 법인공유는 "그 법인 소속 전 직원 수"를 분모로 정확히 반영
- DB 스키마 변경 없음 — 기존 `share_target`/`share_type` 컬럼을 그대로 재사용(값만 `share_type='corp'` 추가)

### 부서공유 선택 목록 (v1.9 확장 — 8개 → 11개)
```
재경팀 / 개발기획팀 / 자재구매팀 / 개발구매팀 / 출하팀 / 제조팀 / 대표이사 / 상무이사 /
법인장(SMECN) / 구매영업(SMECN) / 재무(SMECN)
```

### 개인공유 대상 목록 (v1.9 — 법인별 그룹핑)
- `employees` 테이블에서 `active=true` 직원 전체를 동적 로드(체크박스 다중 선택)하되, **법인별(본사/천진/태국/인도) 소제목으로 그룹핑**해서 표시 — 인원이 늘어날수록 단일 목록에서 찾기 어려워지는 문제 대응(4절 로그인 법인선택과 동일한 배경)
- 그룹 순서: KOREA(본사) → SMECN(천진) → SMEGLOBAL(태국) → GSMEIN(인도)
- 체크박스 자체는 여전히 전 법인 인원을 동시에 다중 선택 가능(법인 간 교차 공유 제한 없음) — 로그인 화면의 "법인 먼저 선택" 방식과 달리 여기서는 필터가 아닌 그룹핑(시각적 구분)만 적용

### 공유 표시 필터 로직 (공유함 `loadShareView` / 달력 `loadSharedCalRecords` 공통)
```javascript
// SELECT — activity_type 포함하면 오류 (work_diary에 없는 컬럼)
.select('id,employee_id,date,title,content,content_type,category,status,is_shared,share_target,share_type')

// 표시 조건
if (isAdmin) return true;                                  // 대표이사/상무이사 전체 조회
if (r.share_target === '전체') return true;                // 전체공유
if (r.employee_id === wfSession.empId) return true;         // 공유자 본인도 확인 가능 (공유함만 해당)
var targets = JSON.parse(r.share_target);
if (targets.indexOf(myDept) >= 0) return true;              // 부서공유
if (targets.some(t => t.trim() === myName)) return true;    // 개인공유
```

### 공유함 UI
- sticky 헤더: `overflow-y:auto;max-height:600px` + `thead{position:sticky;top:0;z-index:5}` — 스크롤해도 헤더 고정 (v15.10)
- 컬럼 순서: 날짜 / 공유자 / 공유대상 / 업무유형 / 내용구분 / 제목 / 내용 / 상태 / 공유확인
- 필터: 내용구분(shareTypeFilter) / 업무유형(shareCatFilter) / 상태(shareStatusFilter) / 키워드(shareKwFilter) / **공유자(shareAuthorFilter, v1.12 신규)** / **공유대상(shareTargetTextFilter, v1.12 신규)** / **제목(shareTitleFilter, v1.12 신규)** / 공유확인 상태(전체/미확인/확인완료, v15.10 추가)

### 공유자/공유대상/제목 자동완성 검색 + 조회버튼 방식 전환 (v1.12 신규)

**자동완성 검색 3종 추가**
- 공유자/공유대상/제목 3개 텍스트 입력창을 HTML5 `<input list="...">` + `<datalist>` 조합으로 구현 — 브라우저 기본 자동완성 UI로 타이핑 시 실제 존재하는 값 목록이 제안됨
- `datalist` 옵션은 매 조회 시 **권한범위(내가 볼 수 있는 공유 항목) 내에서, 텍스트 필터 적용 전 전체 기준**으로 채워짐(부분 입력 중에도 전체 제안이 유지되도록)
- 필터링은 `.includes()` 방식(부분 문자열 포함이면 매치) — 예: "1"로 검색하면 "123"/"145"/"981" 전부 걸림(시작 글자 일치가 아니라 어디든 포함되면 매치)

**조회 버튼 방식으로 전환 (기존: 입력/선택 즉시 자동조회)**
- 기존엔 모든 필터(select `onchange`, input `oninput`)가 값이 바뀌는 즉시 `loadShareView()`를 호출해 자동으로 결과가 갱신되었음
- **v1.12부터 자동조회 제거** — 8개 필터(내용구분/업무유형/상태/키워드/공유자/공유대상/제목/공유확인) 전부 `onchange`/`oninput` 제거, 대신 **"🔍 조회" 버튼**을 눌러야 결과 반영
- 텍스트 입력창 4개(키워드/공유자/공유대상/제목)는 `onkeydown`으로 **Enter 키 입력 시에도 즉시 조회**되도록 편의 기능 유지
- 탭 최초 진입 시(`switchTab('share')` → `loadShareView()`)는 이 변경과 무관하게 그대로 자동 로드됨

### 오늘 날짜 항목 최상단 고정 + 강조 (신규, v1.7)

**배경**: 공유함을 열었을 때 오늘 날짜에 공유된 내용을 가장 먼저 확인하고 싶다는 요청. 정렬(`sortShare`)이나 컬럼필터 상태와 무관하게 항상 오늘 날짜 항목이 최상단에 오도록 개선.

**구현 위치**: `renderShareTable(items)` 함수 — 렌더링 직전, 인자로 받은 `items` 배열을 다시 한번 파티셔닝
```javascript
var todayItems = items.filter(function(r){ return (r.date||'').slice(0,10) === todayStr; });
var restItems  = items.filter(function(r){ return (r.date||'').slice(0,10) !== todayStr; });
items = todayItems.concat(restItems);
```
- `sortShare()`(헤더 클릭 정렬)나 `renderShareFiltered()`(컬럼필터)를 거친 뒤에도 `renderShareTable()`을 최종적으로 항상 거치므로, 어떤 경로로 와도 오늘 날짜 항목이 항상 최상단에 고정됨

**강조 스타일** — 기존 공유확인 상태 배경(미확인 아이보리 `#fdf8ee` / 전체확인 흰색)보다 **우선 적용**:
```
오늘 날짜 행: 배경 #FFF3B0(노란색) + font-weight:700(굵은 글씨) + 날짜 앞 🔔 아이콘
```
- 공유확인 상태(👁 배지)는 오늘 날짜 행에서도 그대로 표시되어 확인 여부는 계속 구분 가능 (배경색만 오늘 우선 적용, 배지 정보는 손실 없음)

### 달력 공유 표시 (신규, v1.6)

**배경**: 기존에는 공유된 업무일지가 📢 공유함 탭에서만 조회 가능했고, 달력 탭에는 노출되지 않아 일정 흐름 속에서 공유 내용을 놓치기 쉬웠음. 달력에서도 "타인이 나에게(내 부서/나/전체) 공유한 항목"이 함께 보이도록 개선.

**데이터 로드**
- 전역 변수 `sharedCalRecords` 신규 추가 (기존 `diaryRecords`와 별도)
- 함수 `loadSharedCalRecords()`: `work_diary`에서 `is_shared=true` AND `employee_id != 본인` 조건으로 조회 후, 공유함과 동일한 필터 로직(위 참조)으로 "내가 볼 수 있는" 항목만 남김
- 호출 시점: ① `wfEnterMain()` 진입 시 (`loadDiary()` 직후), ② 달력 탭(`switchTab('cal')`) 진입 시마다 갱신 (캐시로 먼저 렌더 후 최신 데이터로 재렌더)
- 본인이 작성/공유한 항목은 이미 `diaryRecords`에 있으므로 `sharedCalRecords`에서는 쿼리 단계에서 제외 (중복 방지)

**표시 방식**
| 구분 | 색상 | 텍스트 |
|---|---|---|
| 기존 일정/업무일지 | 파란(예정)/주황(진행중)/빨강(지시·후속)/초록(완료) | 제목 그대로 |
| **공유 항목 (신규)** | **보라색** 배경 `#F3E9FF` / 테두리 `#8E5FC7` | **📢 + 제목** |

- 달력 상단 범례에 `📢 공유` (보라색 점) 항목 추가
- 날짜 셀: 기존 칩 아래에 공유 칩을 이어서 표시 (`renderCal()` 내 `sharedChips`)
- 날짜 클릭 팝업(`openDayPopup`/`renderDayPopupList`): 공유 항목도 함께 표시하되, **읽기 전용**(수정/삭제 버튼 없음) — "공유자: OOO" 텍스트로 작성자 표기
- ~~공유 항목 클릭 시 별도 상세 모달은 없음~~ → **(v1.8부터 변경)** 아래 "공유 항목 상세보기 연동" 참조; 공유확인(👁) 처리는 기존과 동일하게 공유함 탭에서 수행

**주의사항**
- `sharedCalRecords`는 `wf_password` 등 민감정보 없이 `id,employee_id,date,title,content,category,status,is_shared,share_target,share_type`만 조회
- 실시간 반영은 아님 — 공유 설정 직후 달력에 바로 보이려면 달력 탭 재진입(탭 전환) 필요 (매 탭 전환 시 자동 갱신되므로 새로고침 불필요)

### 공유 항목 상세보기 연동 (신규, v1.8)

**배경**: 날짜팝업(`renderDayPopupList`)에서 공유 항목의 `content`를 80자로 잘라 `...` 처리하고 있었는데, 클릭해도 전체 내용을 볼 방법이 없어 긴 공유 내용이 사실상 어디서도 확인 불가능했음.

**구현**: 공유함 탭에서 이미 쓰이던 상세보기 팝업 `openShareConfirmPopup(r)`(제목/전체내용/공유확인 현황 표시 + 확인 버튼)을 그대로 재사용. 날짜팝업의 `dp-item-shared` 요소에 클릭 이벤트를 연결하여, 레코드를 `encodeURIComponent(JSON.stringify(r))`로 인코딩해 전달 후 `decodeURIComponent`로 복원하는 기존 인코딩 패턴(`openShareConfirmPopup(rEncoded)`)을 그대로 따름.
```javascript
onclick="openShareConfirmPopup(decodeURIComponent('${encodeURIComponent(JSON.stringify(r))}'))"
```
- 새 화면/모달을 만든 것이 아니라 기존 공유함 상세팝업을 한 곳 더 연결한 것 — 공유확인 처리 로직은 기존과 동일
- 상세팝업 내 공유자 이름(`r._empName`) 표시 스타일을 강조: `font-size:14px; font-weight:700; color:#1a1612` (기존 날짜/업무유형은 11px 회색 `#9a8e82` 유지)

### 모달 닫기 정책 변경 (신규, v1.8)

**배경**: 일정 추가/수정 중 입력창이 아닌 다른 곳(오버레이 영역)을 클릭하면 작성 중이던 내용이 저장되지 않은 채로 모달이 사라지는 문제.

**변경 내용**: 아래 두 모달의 오버레이에 걸려있던 `onclick="if(event.target===this)close...()"` 바깥 클릭 자동 닫힘 코드를 제거.
| 모달 | id | 비고 |
|---|---|---|
| 일정 추가/수정 모달 | `modal-overlay` | |
| 업무일지/일정 작성 모달 (실제 "+ 일정 추가" 버튼 → `openModalFromPopup()` → `openDiaryModal()` 경로로 열리는 모달) | `diary-modal-overlay` | 실사용 중인 진짜 일정 추가 모달 |

- 이제 두 모달 모두 `확인`/`저장`/`취소` 등 명시적 버튼을 눌러야만 닫힘
- **주의**: 향후 신규 모달 추가 시에도 이 정책(오버레이 바깥 클릭으로 자동 닫히지 않도록)을 기본으로 적용할 것

### 공유함 코멘트 (신규, v1.14)

**배경**: 공유받은 내용을 보다가 수정하거나 추가할 내용이 있을 때, 공유함 안에서 바로 의견을 남기고 싶다는 요청.

- 신규 테이블 `share_comments`(5절 참고)
- 공유확인 팝업(`openShareConfirmPopup`) 하단에 코멘트 스레드 섹션 추가 — **공유받은 사람 전원 + 원작성자가 서로 열람 가능**(1:1 비공개 아님), 입력창 + "등록" 버튼, Enter 키로도 등록 가능
- `loadShareComments()`/`renderShareComments()`/`addShareComment()` 함수로 구성, 팝업이 열릴 때마다 해당 `diary_id` 기준으로 재조회
- 모바일 사용성을 고려해 입력창 높이를 터치하기 쉬운 크기(42px)로 확보

### 공유내용 → 내 업무일지로 복사 (신규, v1.14)

**배경**: 같은 미팅에 여러 명이 참석했을 때, 한 사람이 공유한 내용을 나머지가 각자 처음부터 다시 입력하는 이중작업을 줄이기 위함.

- 공유확인 팝업에 "📋 내 업무일지로 복사" 버튼 추가(원작성자 본인에게는 노출 안 함, `!isOwner` 조건)
- 클릭 시 **팝업을 닫고 업무일지 작성모달을 새 글 상태로 오픈**한 뒤, 공유 레코드의 날짜/업무유형/활동유형/거래처/담당부서/기록유형/과제필드/제목/내용/중요도/상태 값으로 미리 채움 — **바로 저장하지 않고 편집 화면을 먼저 열어 사용자가 수정 후 저장**하도록 확정(6-3절 ②의 "이동복사"와 동일하게 "복사 후 이어서 고쳐 쓰는" 패턴)
- 저장 시 새 레코드로 `insert`(원본은 건드리지 않음), `origin` 필드에 `'공유복사: {원작성자명} {원본날짜}'` 자동 기록(5절 참고)
- 전역변수 `shareDetailRecord`(현재 열린 팝업의 원본 레코드), `diaryCopyOrigin`(저장 시 origin에 반영할 값, 저장 완료 후 매번 초기화)로 구현

## 9. 컬럼 필터 설계 (헤더 값선택 방식, v1.4)

### 방식
헤더 `▾` 클릭 → 해당 컬럼 고유값 드롭다운 → 선택 시 해당 값만 표시

### 전역 상태 및 핵심 함수
```javascript
var _colFilters = { diary:{}, list:{}, share:{} };
var _colFilterDrop = null;

openColFilter(event, table, key)  // 드롭다운 열기
setColFilter(table, key, val)     // 필터 적용 (val='' 이면 초기화)
closeColFilter()                  // 드롭다운 닫기
```

### 적용 흐름
- diary: `getDiaryFiltered()`에서 `_colFilters['diary']` 적용
- list: `renderList()`에서 `_colFilters['list']` 적용
- share: `renderShareFiltered()`에서 `_colFilters['share']` 적용 후 `renderShareTable()` 호출

## 10. 반복 일정 기능 (v1.4)

### UI
- 업무일지 작성/수정 모달 하단 "반복 설정" 섹션
- 반복 설정 드롭다운: 반복없음 / 매년 / 매월 / 매주
- 종료 연도 선택: 2027~2032
- 신규 작성: 라벨 "반복 설정"
- 수정: 라벨 "반복 설정 (이 날짜부터 추가 생성)"

### 저장 로직
```javascript
// 신규 작성 — 첫 날짜부터 생성
var current = new Date(obj.date);
while (current.getFullYear() <= repeatUntil) {
  toInsert.push(Object.assign({}, obj, {date: ...}));
  if (yearly)  current.setFullYear(current.getFullYear()+1);
  if (monthly) current.setMonth(current.getMonth()+1);
  if (weekly)  current.setDate(current.getDate()+7);
}
await SB.from('work_diary').insert(toInsert).select();

// 수정 — 현재 건 UPDATE + 다음 날짜부터 INSERT (반복 옵션은 수정 시 비활성화, 단건만 수정 가능했던 v1.3 제약은 v1.4에서 해제)
await SB.from('work_diary').update(obj).eq('id', diaryEditId);
```

### ⚠️ 구조적 한계 — "반복 시리즈"라는 개념이 없음 (실사고 사례, v1.11 기록)

**실제 발생한 사고**: SMECN 천진법인(손태영)이 매주 월요일 "천진법인 주간회의"를 반복설정으로 등록(부서공유: 법인장/구매영업/재무). 이후 **이 반복일정을 수정**하면서(제목을 "7월3주차 천진법인 주간회의"로 변경, 공유를 전체공유로 변경) 반복 설정을 다시 걸고 저장 → 그 날짜부터 **완전히 새로운 반복 시리즈가 별도로 추가 생성**되었고, **기존 시리즈는 지워지지 않고 그대로 남음**. 그 결과 2027-02-01부터 매주 월요일마다 제목이 다른 두 개의 회의 항목이 동시에 존재하게 됨(수십~백 건 규모). SQL로 일괄 삭제해서 정리함(2026-07-16~17).

**근본 원인**: 이 앱은 반복일정을 "하나의 시리즈"로 관리하지 않는다. 매주/매월/매년치를 **전부 개별 행으로 미리 생성**하는 방식이라서:
- 반복 항목들을 하나로 묶어주는 `series_id` 같은 연결고리가 전혀 없음
- 수정 시 "이 날짜부터 추가 생성"은 **말 그대로 추가만 하고, 기존 미래 인스턴스를 지우거나 대체하지 않음**
- 결과적으로 반복일정을 "고친다"는 행위가 실제로는 "그 시점부터 새 시리즈를 하나 더 만드는 것"이 되어버려, 사용자 입장에서는 "수정이 반영 안 되는 것처럼" 보임(사실은 안 지워진 옛 것과 새로 생긴 것이 둘 다 존재하는 상태)
- 삭제도 마찬가지 — 화면에서 반복일정을 지우려면 달력을 넘겨가며 한 건씩 클릭해서 지워야 함(몇 년치면 현실적으로 불가능한 수준)

**임시 대응(현재)**: 이런 중복/정리가 필요한 상황은 SQL로 직접 처리 (예: `WHERE emp_name='손태영' AND title LIKE '%주간회의%'`로 일괄 확인 후 DELETE)

**두 번째 발생 사례 (v1.12)**: SMECN 정미화가 "COSMO PSI 점검"(공유대상: 박정용 개인공유)을 반복설정으로 등록했다가 마찬가지로 잘못 생성되어 전량 삭제 처리(`WHERE emp_name='정미화' AND title='COSMO PSI 점검'`). **한 달 사이 동일 유형 사고가 2건 발생** — 임시 SQL 대응만으로는 재발을 못 막고 있음을 보여줌. `series_id` 도입의 우선순위를 "높음"에서 더 끌어올릴 필요 있음(PART 3 참고).

**근본 해결책 (미착수, PART 3 참고)**: `work_diary`에 `series_id`(uuid) 컬럼을 추가해 같은 반복설정으로 생성된 행들을 하나로 묶고, ① 수정 시 "이 시리즈 전체 수정" 옵션 제공(기존 미래 인스턴스 삭제 후 재생성 or 일괄 UPDATE), ② 설정 탭에 "반복일정 일괄삭제/일괄수정" 기능 추가 — 사용자가 제목+날짜범위로 한 번에 정리할 수 있게

## 11. 공유확인 기능 설계 (work_diary_confirm, v1.4)

### 공유함 목록 표시
```
행 배경: 미확인=#fdf8ee(연한 아이보리), 전체확인=흰색
텍스트: 미확인=#3a3530, 전체확인=#1a4fa0(파란색)
배지: 👁 확인수/대상자수 (툴팁: 확인자 이름)
```

### 대상자 수 계산
```javascript
if (share_target === '전체') → empMap 전체
else if (부서명)             → 해당 부서 직원 전체
else (이름)                  → 그대로 사용
```

### 팝업 확인 버튼
```javascript
// innerHTML 팝업에서 this 사용 금지 → id 부여 방식
'<button id="shareConfirmBtn" onclick="confirmShare(' + r.id + ')">'

async function confirmShare(diaryId) {
  var btn = document.getElementById('shareConfirmBtn');
  await SB.from('work_diary_confirm').insert({...});
  await loadShareView(); // 갱신
}
```

### 공유함 컬럼 폭 (localStorage, 버전키 `share_col_v1`)
| 날짜 | 공유자 | 공유대상 | 업무유형 | 내용구분 | 제목 | 내용 | 상태 | 공유확인 |
|---|---|---|---|---|---|---|---|---|
|90|80|100|120|90|200|400|100|90|

## 12. 독립 컬럼 리사이즈 (v15.10 최종 통일)

- 업무일지/일정/공유함 3개 탭 모두 공유함 방식(`initShareResizable`)과 완전히 동일한 방식으로 통일
- `table-layout:fixed` CSS 정적 부여, JS에서 `tbl.style.width` 강제 계산 절대 금지
- 버전키 + localStorage 저장 (SME_컨텍스트 8절 "리사이저블 컬럼 전체 코드" 표준과 동일)
- 예전 방식(구버전 `initColResize`, JS 강제 폭 계산)을 지키지 않아 컬럼이 비정상적으로 넓어지는 버그가 있었으나 v15.10에서 수정 완료

## 13. Claude AI 통합 (empId=2 전용)

### 설정
- ⚙ 설정 탭 → Claude AI 설정 → API Key 입력/저장 (`localStorage: wf_api_key`)
- API Key 없으면 AI 섹션 자동 숨김
- `wfSession.empId === 2` 조건 — `wfEnterMain()` 및 모달 오픈 시(`openDiaryModal`, `editDiary`) 모두 체크

### 기능 1 — 메모 → 업무일지 자동 변환
```
업무일지 작성 모달 하단 (API Key 있을 때만 표시)
✨ AI 자동 작성 섹션
→ 메모 입력 → [변환] 버튼
→ Claude가 JSON 형식으로 양식 자동 채움
   (날짜/업무유형/활동유형/거래처/제목/내용/상태/후속조치)
→ 확인 후 [저장]
```

### 기능 2 — 업무일지 AI 채팅
```
업무일지 탭 → 🤖 AI 버튼 → 채팅 패널
→ 현재 로드된 업무일지 100건 컨텍스트 전달
→ 자유 질문/분석/요약
   예) "이번 달 LG전자 방문 요약해줘"
       "후속조치 필요한 건 알려줘"
       "진행중인 업무 목록 보여줘"
```

### API 설정
```javascript
// 모델: claude-sonnet-4-6
// max_tokens: 1500
// 헤더: anthropic-dangerous-direct-browser-access: true (브라우저 직접 호출)
// API Key: localStorage('wf_api_key')
```

## 14. Supabase 연동

```javascript
// workflow.html: 하드코딩 (설정창 불필요)
const SME_URL = 'https://muxuhrbsbrstmrrvlupw.supabase.co';
const SME_KEY = 'sb_publishable_RYvQTDoDvwTuVPezpIeotg_EDSd9Wbb';
SB = window.supabase.createClient(SME_URL, SME_KEY);
```

| 테이블 | 용도 | 조회 조건 |
|---|---|---|
| `employees` | 직원 목록 / 비번 확인·변경 | active=true |
| `work_diary` | 업무일지 CRUD | employee_id=본인 |
| `work_diary` | 공유함 조회 | is_shared=true (8절 필터 로직 적용) |
| `work_diary` | **달력 공유 표시 (v1.6)** | is_shared=true AND employee_id≠본인 (8절 필터 로직 동일 적용) |
| `work_diary_confirm` | 공유확인 이력 | RLS 비활성 |
| `cal_events`(또는 `sme_calendar`, 5절 확인 필요) | 달력 일정 | 기존 방식 유지(할일 등 일부 기능) |
| `cal_todos` | 할일 목록 | 기존 방식 유지 |

## 15. admin_log.html 연동

### 직원관리 탭
- **WF비번** 컬럼 추가 (●●●● 마스킹 표시), 모달에 WF비번 입력 필드
- **📱 휴대폰 자동설정 버튼**: 휴대폰 뒷 4자리 자동 입력 (없으면 1111)
```javascript
function autoSetWfPw() {
  const phone = document.getElementById('emp-in-phone').value.trim();
  const digits = phone.replace(/[^0-9]/g, '');
  document.getElementById('emp-in-wfpw').value = digits.length >= 4 ? digits.slice(-4) : '1111';
}
```
- 엑셀 다운로드 시 WF비번 제외 (보안)

### index.html 연동
- SMERP 메인(index.html) → 커뮤니케이션 섹션 → SME WorkFlow → (새창 ↗ 가능)
- SME WorkFlow 클릭 시 새창으로 자동 열림 (`workflow.html?user=이름`)

## 16. 파일 구조

```
smekorea-platform/
└── workflow.html        ← SME WorkFlow 메인 파일

calendar/ (기존 개인용 — 백업 유지)
├── index.html           ← PJY 업무관리 원본
├── manifest.json
└── sw.js
```

## 17. 주요 용어

| 용어 | 설명 |
|---|---|
| `wf_password` | WorkFlow 개인 비번 (4자리, plain text, `employees` 테이블) |
| `wf_session` | localStorage 세션 객체 (`empId`/`name`/`dept`/`rank`/`sessH`/`expire`) |
| `wfSession` | 위 세션 객체를 담는 JS 전역 변수 (스크립트 내 단일 선언 유지 — `var`) |
| `employee_id` | `employees.id` 참조 (work_diary 본인 필터 기준) |
| `is_shared` | 공유 여부 (true = 공유함/달력에 노출) |
| `share_target` | 공유 대상 (부서 배열 JSON / 개인 배열 JSON / `'전체'`) |
| `share_type` | 공유 종류 구분 (`'person'` = 개인공유) |
| `work_diary_confirm` | 공유확인 이력 테이블 |
| `wf_weekly_report` | 주간보고 테이블 (생성 완료, 화면 미개발) |
| `empId=2` | 박정용 상무 — WorkFlow AI 기능 표시 기준 ID |
| `diaryRecords` | 본인 `work_diary` 전체 캐시 (JS 전역 배열) |
| `sharedCalRecords` | **(v1.6 신규)** 달력 표시용 — 타인이 나에게 공유한 `work_diary` 항목 캐시 (JS 전역 배열) |
| `task_stage` | **(v1.14 신규)** 과제/부서업무보고 진행단계 — 착수/진행중/지연/완료 4단계 고정값 |
| `share_comments` | **(v1.14 신규)** 공유함 코멘트 테이블 — 공유받은 전원+원작성자가 열람 가능한 스레드 |
| `origin` | **(v1.14 용도 확정)** 신규 저장 경로에서 출처 기록용 — 공유복사 시 `'공유복사: {이름} {날짜}'`, 엑셀업로드 시 `'엑셀업로드'` |
| `diaryCopyOrigin` | **(v1.14 신규)** 공유내용 복사 시 저장할 origin 값을 임시로 담아두는 JS 전역 변수 (저장 완료 후 매번 초기화) |
| `shareDetailRecord` | **(v1.14 신규)** 현재 열린 공유확인 팝업의 원본 레코드를 담는 JS 전역 변수 (복사 버튼에서 참조) |

## 18. 주요 설계 원칙 및 주의사항

| 항목 | 내용 |
|---|---|
| 기존 기능 완전 보존 | calendar 앱 기능 100% 유지, 추가만 진행 |
| 개인 독립 | 로그인 = 본인 데이터만 조회 |
| 자동 태깅 | employee_id 수동 입력 없음 — 로그인 정보로 자동 적용 |
| 단계적 확장 | 1단계 기본 완성 후 사용하면서 추가 |
| SMERP 통합 | 별도 앱이 아닌 SMERP 내 모듈로 운영 |
| 운영 중 파일 | 전 직원 23명 사용 중 — 수정 전 반드시 확인 후 진행 |
| `activity_type` | work_diary에 없는 컬럼 — SELECT 절대 금지 |
| 기존 데이터 | 업무유형 변경은 신규만 적용 — 기존 데이터(영업/거래처 등) 그대로 유지 |
| `empId=2` | AI 기능은 박정용 상무만 표시 |
| KST 시각 | UTC로 저장, 브라우저 자동 변환 — 이중변환 금지 |
| URL 파라미터 | `?user=이름` 있으면 세션 무시 → 로그인 화면 강제 표시 |
| innerHTML 팝업 | `this` 사용 금지 → `id` 부여 + `getElementById` 사용 |
| `debouncedSearch` | 단일 선언 유지 (중복 시 JS 전체 오류) |
| `wfEnterMain()` | `initSb()` 호출 금지 (초기화 블록에서 이미 호출, 중복 시 데이터 로드 실패) |
| 파일 순서 | index.html → workflow.html 순서로 수정 (로그인 통합 관련 작업 시) |
| **달력 공유 데이터 (v1.6)** | `sharedCalRecords`는 타인 소유 데이터이므로 화면에서 수정/삭제 버튼을 노출하지 않음(읽기 전용) — 실수로 CRUD 버튼 추가하지 않도록 주의 |
| **모달 바깥클릭 닫힘 금지 (v1.8)** | `modal-overlay`/`diary-modal-overlay` 모두 오버레이 클릭 시 자동 닫히던 기존 동작 제거 — 버튼(확인/저장/취소)으로만 닫힘. 신규 모달 추가 시에도 이 정책 기본 적용 |
| **분류값 확장은 ＋항목추가로 (v1.14)** | "과제"/"부서업무보고"처럼 새로운 분류가 필요할 때, 새 컬럼·새 드롭다운을 만들기보다 기존 `content_type` 등 사용자 확장 가능한 필드에 값만 추가하는 방식을 우선 검토 — 선택창이 늘어나 UX가 번거로워지는 것을 방지 |
| **CDN 라이브러리 지연로딩 (v1.14)** | SheetJS(xlsx)도 Supabase SDK와 동일하게 `window.XLSX` 존재 여부 체크 후 필요한 시점에만 `<script>` 태그를 동적 삽입해서 로드 — 안 쓰는 사람은 초기 로딩 비용 없음 |
| **`window.open()`으로 안 연 창은 크기·위치 조절 불가 (v1.14, 화면고정 폐기 사유)** | 브라우저 보안정책상 스크립트가 `moveTo`/`resizeTo`를 쓰려면 그 창을 스크립트 자신이 `window.open()`으로 열었어야 함 — 향후 유사 기능(창 제어) 설계 시 이 제약을 사전에 감안할 것 |
| **아직 기준이 없는 기능은 최소 형태로 배포 후 개선 (v1.14)** | 과제/업무보고처럼 관리 기준 자체가 회사 내에서도 아직 정립되지 않은 영역은, 완벽한 설계를 먼저 확정하려 하기보다 가장 단순한 형태로 배포해 실사용 피드백을 받으며 다음 단계를 결정하는 방식을 채택 |

---

# PART 2. 버전 변경 로그

| Ver | 일자 | 주요 변경 내용 |
|-----|------|--------------|
| v1.14 | 2026-08-01 | **과제/부서업무보고 + 공유함 코멘트 + 공유내용 복사 + 엑셀 업로드 + 페이지네이션 확장 + 📌 화면고정 기능 삭제** — ① `work_diary`에 `task_start_date`/`task_end_date`/`task_stage` 컬럼 추가, 기록유형이 "과제"/"부서업무보고"일 때만 조건부로 입력란 노출, 진행률(%) 대신 진행단계(착수/진행중/지연/완료)+D-day 자동계산 조합으로 확정(6-4절). ② `share_comments` 테이블 신규 — 공유확인 팝업에 전원 열람 가능한 코멘트 스레드 추가(8절). ③ 공유확인 팝업에 "내 업무일지로 복사" 버튼 추가 — 편집화면을 먼저 열어 수정 후 저장하는 방식으로 확정, `origin` 필드를 이 용도로 재사용 시작(5절, 8절). ④ 업무일지 탭에 엑셀 양식 다운로드/업로드 신규 — SheetJS 지연로딩, 업로드 전 미리보기 팝업에서 확인 후 일괄 등록, 날짜 없는 행은 자동 스킵(6-4절). ⑤ 페이지네이션을 5개→10개 노출로 확장하고 페이지 직접입력 이동 기능 추가. ⑥ **v1.13에서 신규 도입했던 📌 화면고정(듀얼모니터 전용창) 배너·버튼 전체 삭제** — 사용자 확인 결과 불필요 판단, 배너 없이는 브라우저 보안정책상 화면고정 자체가 동작할 수 없는 구조라 배너 삭제와 기능 폐기를 함께 진행(6-3절 하단 참고). **과제/업무보고 관리 기준은 아직 확정된 정답이 없다는 전제 하에, 우선 최소 형태로 배포 후 실사용하며 개선하는 방침으로 진행 중** |
| v1.13 | 2026-07-22 | **일정관리 UX 개선 4건 + 📌 화면고정(듀얼모니터 전용창) 기능** — ① 중요도 "상" 일정 캘린더 노란배경+빨간굵은텍스트 강조(CSS `!important` 충돌 버그 발견·해결). ② 이동복사(원본유지) 기능 신규 — 날짜 선택 후 현재 폼 내용을 새 레코드로 복사, 원본은 유지한 채 상태 등을 고쳐 저장하는 방식으로 반복입력 해소. ③ 업무일지 수정 모달 제목 드래그로 위치 이동(PC 전용). ④ 📌 버튼으로 주소창 없는 전용 창을 열고(전용 창 안에서만) 현재 모니터 전체크기로 고정/해제 토글 — **1차 설계(별도 창을 계속 새로 여는 방식)는 창 중복·연쇄 종료 문제로 폐기하고 창 1개 구조로 재설계**, **자동 `window.open()`은 팝업차단으로 실패함을 실사용 스크린샷으로 확인**해 클릭 유도 배너 방식으로 전환(6-3절 상세) |
| v1.12 | 2026-07-17 | **업무공유 검색 강화 + 조회버튼 전환 + 대상부서 폐지 + 반복일정 2차 실사고** — ① 업무공유 탭에 공유자/공유대상/제목 자동완성 검색(`<datalist>`) 3종 신규 추가. ② 기존 8개 필터 전부 자동조회(onchange/oninput)를 제거하고 "🔍 조회" 버튼 방식으로 전환(텍스트 입력 4종은 Enter키로도 조회 가능). ③ 업무일지 작성/수정 모달에서 "대상부서" 입력 제거 — 공유(부서공유)와 완전히 분리된 채 자동 연동 없이 이중입력만 시키던 죽은 필드였음이 확인되어 폐지(목록 컬럼·필터·기존데이터는 유지, DB 컬럼도 유지). ④ SMECN 정미화 "COSMO PSI 점검" 건에서 **반복일정 중복생성 사고가 재발**(10절 참고, 손태영 건에 이어 한 달 내 2번째) — `series_id` 도입 필요성 재확인, Part 3 우선순위 상향 |
| v1.11 | 2026-07-17 | **법인공유 + 항목추가 관리 + emp_name 저장 + 설정탭 재구성** — ① `work_diary.emp_name` 컬럼 신규 추가(작성자 이름 텍스트 스냅샷, 신규저장 시에만 채워짐, 기존 4,308건 소급 완료). ② 공유 옵션에 "법인공유" 추가(`share_type='corp'`), 이를 위해 `wfSession.entity` 신규 저장. ③ "＋ 항목 추가"에 유형별 20개 제한, ⚙설정에 "추가항목 관리" 신설(수정 시 기존 기록도 일괄 변경, 삭제 시 대체항목 선택 후 일괄 변경) — 이후 **기본 항목(코드 하드코딩)까지 관리 대상 확장**, `category_deleted_defaults` 테이블로 숨김처리 방식 구현. ④ **`user_categories` RLS 실사고** — 항목 추가가 화면엔 보이지만 실제 저장 안 되는 문제, RLS 비활성화로 해결(신규 테이블은 RLS 끄고 시작하는 습관 재확인). ⑤ ⚙설정 탭을 언어/비밀번호(+세션시간+AI설정)/추가항목관리 3개 서브탭으로 재구성. ⑥ **반복일정 구조적 결함 발견 및 실사고 기록** — "시리즈" 개념이 없어 반복일정 수정 시 기존 미래 인스턴스가 안 지워지고 새 시리즈가 추가로 생겨 중복 발생(SMECN 주간회의 사례, SQL로 정리) — `series_id` 도입이 근본해결책이나 이번엔 미착수(PART 3) |
| v1.10 | 2026-07-16 | **다국어(한국어/中文/English) 지원 시스템 신규 구축** — `I18N_T` 딕셔너리(203개 키)+`t()`+`applyI18n()` 엔진, 로그인화면·설정탭에 언어선택 버튼, `localStorage.wf_lang`로 유지. index.html(SMERP 로그인)에도 동일 방식 확대 적용, 같은 localStorage 키를 공유해 SMERP→워크플로우 진입 시 언어 유지. 상단바를 세로2줄→가로1줄로 재설계, `nav-sub`를 "{이름} · {탭명}" 형식으로 확정(이름은 번역 안 함, 언어별 문법(님의/的/'s) 결합은 어색해서 폐기하고 가운데점 방식으로 확정). 탭명 "월간"→"달력", "공유함"→"업무공유"로 변경. 개발 중 **총 6종의 버그** 발견·수정 — 그 중 "지역변수 `t`가 번역함수를 가리는 버그"(4곳, 1곳은 실제 크래시 유발 직전)가 가장 중요하며 향후 재발 방지 원칙 확정(6-2절 상세) |
| v1.9 | 2026-07-15 | **로그인 법인선택 + 음력계산 근본수정 + 오늘배지/ISO주차** — ① 로그인 화면(수동선택 경로)에 법인선택(SMEKR/SMEIN/SMETH/SMECN) 신규 추가, 선택 전 이름 select 비활성화·선택 시 해당 법인 인원만 표시(SMECN 첫 직원 6명 등록 계기, `employees.entity` 값은 KOREA/GSMEIN/SMEGLOBAL/SMECN 그대로 유지하고 화면 라벨만 매핑 — SME_컨텍스트 v15.24 "A안"과 동일 원칙). ② index.html 자체도 하드코딩 이름목록(본사 23명+직접입력)을 폐기하고 동일한 법인선택→DB조회 방식으로 통일(4절). ③ 개인공유 체크박스를 법인별(본사/천진/태국/인도) 그룹핑 표시로 개선, 부서공유 목록에 SMECN 3개 부서(법인장/구매영업/재무) 추가(8절). ④ **음력 계산 근본 버그 수정** — 기존 자체 룩업테이블이 1900~1999년까지만 있어 2000년 이후(즉 현재 포함 모든 최근 날짜) 음력이 전부 틀리게 표시되던 문제를, 홍콩천문대 원본데이터 기반 1900~2100년 전체 구간 검증 알고리즘(MS ChineseLunisolarCalendar 대조검증됨)으로 전면 교체 — 최근 4개년 설날·추석 날짜 역산 검증 통과(6절). ⑤ 달력 UI 3건: 오늘 날짜 배지 파란색→빨간색, 음력 표시 형식 "8/11"→"음8/11"(접두 추가), 일요일 셀에 ISO 8601 기준 연중 누적 주차 배지("W29" 형식, 주황색) 신규 추가(6절). *(참고: 그리드 줄 기준 "N주" 방식도 시도했으나 매달 1주로 리셋되어 혼동 우려로 폐기, ISO 방식으로 최종 확정)* |
| v1.8 | 2026-07-13 | **모달 닫기 정책 변경 + 공유 항목 상세보기 연동** — `modal-overlay`/`diary-modal-overlay` 오버레이 바깥 클릭 시 자동 닫힘 코드 제거(확인/저장/취소 버튼으로만 닫힘). 날짜팝업(`openDayPopup`) 내 공유(📢) 항목 클릭 시 공유함 상세보기 팝업(`openShareConfirmPopup`) 연동 — 80자로 잘려 보이지 않던 긴 공유 내용을 전체 확인 가능. 상세팝업 내 공유자 이름 스타일 강조(14px/bold/`#1a1612`) |
| v1.7 | 2026-07-09 | **공유함 — 오늘 날짜 항목 최상단 고정 + 강조 추가** — `renderShareTable()`에서 렌더링 직전 오늘 날짜(`date===todayStr`) 항목을 항상 최상단으로 재배치(정렬/필터 상태와 무관하게 적용). 오늘 날짜 행은 노란 배경(`#FFF3B0`) + 굵은 글씨 + 🔔 아이콘으로 강조, 기존 공유확인 배지(👁)는 그대로 유지 |
| v1.6 | 2026-07-09 | **달력 공유 표시 기능 추가** — 공유함에만 노출되던 공유 업무일지를 달력 탭에도 표시. 신규 전역 `sharedCalRecords` + `loadSharedCalRecords()` 함수(공유함과 동일 필터 로직 재사용). 날짜 셀·일자 팝업에 보라색(`#8E5FC7`/`#F3E9FF`) + 📢 아이콘으로 구분 표시, 팝업 내 읽기전용(수정/삭제 버튼 없음). 범례에 `📢 공유` 항목 추가 |
| v1.5 | 2026-07-09 | **문서 구조 개편** — PART1(현재 전체 사양, 누적갱신) + PART2(버전 로그) 이원화. v1.0~v1.4 및 SME_컨텍스트(v15.5~v15.10)에 흩어져 있던 내용 통합. 신규 발견 미해결 이슈: `cal_events` vs `sme_calendar` 테이블명 불일치 확인 필요 (5절) |
| v1.4 | 2026-06-26 | 로그인통합(URL파라미터), 컬럼필터(값선택), 반복일정(작성+수정), 공유확인기능, 공유함UI개선, 버그수정 |
| v1.3 | 2026-06-26 | 로그인 통합 설계(SMERP→WF, 방안2), 공유함 버그수정, 필터기능, 반복일정, 업무유형 항목 개편 |
| v1.2 | 2026-06-25 | 공유 개인선택 추가, 공유대상 컬럼, 리사이즈 수정, 탭 타이틀 변경, wfSession 중복 오류 수정 |
| v1.1 | 2026-06-25 | 공유 기능 개선(부서별 다중선택), Claude AI 통합, 달력 날짜 수정, 모바일 대응, 관리자 비번 9901 |
| v1.0 | 2026-06-25 | 최초 작성 — 로그인/세션/업무일지/일정/공유함/설정 개발 완료 |
| (v15.10)* | 2026-07-07 | *SME_컨텍스트에서 통합* — 독립 컬럼 리사이즈 표준 확정(공유함 방식 통일), 공유함 sticky 헤더, 부서공유 대상 확장(대표이사/상무이사 추가), 공유확인 상태 필터 추가 |
| (v15.7)* | 2026-06-26 | *SME_컨텍스트에서 통합* — workflow.html 완성 선언, AI기능 empId=2 조건 모달 적용, 공유확인 파란색 텍스트 확정, 전체 테스트 완료 |

> *(v15.x)* 표시 항목은 SME_WorkFlow 문서 자체에는 기록되지 않고 SME_컨텍스트에만 기록되어 있던 변경사항입니다. v1.5 통합 과정에서 발견하여 로그에 추가했습니다.

---

# PART 3. 미완료 / 향후 작업

| 항목 | 내용 | 우선순위 |
|---|---|---|
| 공유확인 최종 검증 | DB insert 정상 동작 최종 확인 | 즉시 |
| 일정관리 UX 3건 실사용 검증 (v1.13) | 중요도 강조 색상이 실제로 잘 보이는지, 이동복사 후 원본·복사본 데이터 정합성, 모달 드래그가 다양한 해상도에서 문제없는지 확인 (📌 화면고정 항목은 v1.14에서 기능 자체가 삭제되어 검증 대상에서 제외) | 즉시 |
| 과제/부서업무보고 실사용 검증 (v1.14 신규) | 진행단계+D-day 조합이 실제로 충분한지, 목록 배지 가독성, 실사용하면서 진행률 표시방식(마일스톤/체크리스트 등 대안) 재검토 필요 여부 확인 — **관리 기준 자체가 아직 미확정이므로 지속적인 개선 전제** | 즉시 |
| 공유함 코멘트 + 공유내용 복사 실사용 검증 (v1.14 신규) | 코멘트 스레드가 모바일에서 실제로 불편함 없이 쓰이는지, 코멘트 알림(현재는 배지/알림 없음)이 필요한지, 복사 후 origin 표기가 검색·필터에서 혼동을 주지 않는지 확인 | 즉시 |
| 엑셀 업로드 실사용 검증 (v1.14 신규) | 실제 직원들이 양식을 채워서 업로드했을 때 날짜 형식 오류·공유대상 오타 등 실패 케이스 빈도 확인, 필요 시 업로드 전 컬럼별 유효성 검증(현재는 날짜 누락만 체크) 강화 검토 | 즉시 |
| `cal_events`/`sme_calendar` 테이블명 확인 | 5절 참고 — 동일 테이블 여부 확인 | 즉시 |
| 달력 공유 표시 실사용 검증 (v1.6 신규) | 여러 계정으로 부서공유/개인공유/전체공유 각각 테스트, 색상·아이콘 가독성 현업 피드백 수렴 | 즉시 |
| 공유함 오늘 날짜 강조 실사용 검증 (v1.7 신규) | 노란 배경 톤/🔔 아이콘이 실제 화면에서 과하지 않은지, 최상단 고정이 대량 데이터에서도 자연스러운지 확인 | 즉시 |
| 모달 닫기 정책 변경 실사용 검증 (v1.8 신규) | 바깥 클릭으로 안 닫히는 것이 오히려 불편하지 않은지(오조작 시 닫을 방법이 버튼뿐임) 현업 피드백 수렴 | 즉시 |
| 로그인 법인선택 + 음력계산 수정 실사용 검증 (v1.9 신규) | index.html/workflow.html 배포 후 실제 SMECN 직원 로그인 테스트, 음력 표시 정확성 재확인(특히 윤달이 있는 달), ISO주차 배지가 실제 화면에서 방해되지 않는지 확인 | 즉시 |
| 다국어 시스템 alert/confirm 메시지 잔여분 번역 (v1.10 신규) | 비밀번호 변경/API Key 저장 등 일부 alert, AI 채팅 프롬프트는 이번엔 번역 안 함 — 필요 시 후속 작업 | 이후 |
| **반복일정 `series_id` 도입 (v1.11 신규, 실사고 재발방지)** | 반복일정을 하나의 시리즈로 묶는 연결고리가 없어, 수정 시 기존 미래 인스턴스가 안 지워지고 중복 생성되는 구조적 결함 발견(10절 참고). `series_id`(uuid) 컬럼 추가 + "이 시리즈 전체 수정/삭제" 기능, 설정탭에 반복일정 일괄정리 기능 필요. **v1.12: 한 달 내 동일 사고 2번째 재발(정미화 건)** | **최우선 — 임시 SQL 대응으로 못 막고 재발 중** |
| 협업개발 메뉴 | SMERP 개선요청 등록/처리/이력 → collab.html로 별도 구현됨 (완료, 본 문서 범위 아님) | - |
| 주간보고 입력 화면 | `wf_weekly_report` 테이블은 생성 완료, 입력 UI 미개발 | 이후 |
| 주간회의 발표 모드 | 부서 선택 → 전주 지시사항 이행현황/신규거래/이슈사항/출하현황(SMERP연동)/재고매입매출(SMERP연동)/금주계획 구성 (v1.2 설계 원안 유지) | 이후 |
| 부서별 고유 항목 | 제조팀(업체명/접수일/완료일), 개발기획팀(신규개발 마스터 탭) | 이후 |
| **팀별 주간업무보고 자동화 (v1.14 논의, 착수 보류)** | 업무일지 내용을 팀별 주간업무보고 자료로 자동 변환하는 아이디어 — 구체적인 방식(집계 기준, 양식)은 아직 구상 전이라 이번 라운드에서는 반영하지 않고 별도로 구상 예정 | 이후 |
