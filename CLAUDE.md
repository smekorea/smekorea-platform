# SMERP — Claude Code 프로젝트 규칙

> 이 파일은 Claude Code가 매 대화 시작 시 자동으로 읽습니다.
> 모든 규칙은 예외 없이 적용됩니다.

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 시스템명 | SMERP (SME Enterprise Resource Platform) |
| 회사 | ㈜에스엠이코리아 (SMEKOREA) |
| 플랫폼 | GitHub Pages: `smekorea.github.io/smekorea-platform/` |
| 백엔드 | Supabase PostgreSQL (project_id: `muxuhrbsbrstmrrvlupw`, region: ap-northeast-2 Seoul) |
| 프론트엔드 | Vanilla HTML / CSS / JavaScript |
| 목적 | iCount ERP 대체 + HQ·해외법인 통합 컨트롤 타워 |
| 해외법인 | GSMEIN(인도/노이다), SMECN(중국/톈진), SMEGLOBAL(태국) |

---

## 2. 🔴 절대 원칙 — 작업 흐름

```
계획 제시 → 상무님 OK 확인 → 그 다음에 실행
```

- **OK 없이 코드 생성·파일 수정·DB 조작 금지** (예외 없음)
- DB 변경(INSERT/UPDATE/DELETE/DDL)도 동일하게 계획→승인→실행
- 수정 범위는 요청된 것만 — 언급되지 않은 부분은 건드리지 않음
- 작업 전 반드시 `node --check` + div 밸런스 검증 후 납품

---

## 3. 🔴 필수 준수 — 개발 표준 (모든 신규·수정 파일 적용)

### 폰트 표준 (2026-08-11 확정)
```css
font-family: 'Noto Sans KR', sans-serif
```
- **전체 SMERP 통일** — 숫자·코드 포함 예외 없음
- 예외: `ship_lot.html`의 `.brand-badge` / `.clock` 같은 순수 장식(Share Tech Mono 허용)
- Courier New / monospace 신규 사용 **완전 금지**

### 테이블 3대 필수 표준

**① 헤더 클릭 정렬**
```javascript
// th 클릭 → asc/desc 토글, 활성 컬럼에 ↑↓ 표시
// sortKey / sortAsc 상태 변수 관리
```
```css
th.sortable { cursor: pointer; }
th.sortable:hover { background: rgba(26,86,219,.06); }
.sort-icon { margin-left: 3px; font-size: 10px; color: var(--accent); }
```

**② 세로 테두리**
```css
tbody td { border-right: 1px solid #e8edf5; }
tbody td:last-child { border-right: none; }
```

**③ 텍스트 검정**
```css
tbody td { color: #111827; }
/* 상태 배지·강조색 등 예외는 명시적으로 지정 */
```

### 독립 컬럼 리사이즈 4원칙 (모든 테이블 필수)

① `initColResize` 진입 시 모든 컬럼 `offsetWidth`를 px로 고정
② `table-layout: fixed` / 테이블 너비 = 컬럼 합산 (절대 `width:100%` 금지)
③ 드래그 시 해당 컬럼만 변경, 나머지 고정, 테이블 총 너비 실시간 재계산
④ `localStorage`에 버전 키로 저장 (컬럼 수·순서 변경 시 버전 bump 필수)

```css
th { position: relative; user-select: none; }
.col-resizer { position: absolute; right: 0; top: 0; bottom: 0; width: 5px; cursor: col-resize; }
```

### 화면이동 네비게이션 표준 (2026-08-21 확정)

상단바 우측에 2버튼 고정 (순서 불변):
```html
<button onclick="history.back()">← 뒤로</button>
<button onclick="location.href='index.html'">⌂ 홈</button>
```
- 다국어 파일: `← 返回` / `← Back`, `⌂ 首页` / `⌂ Home`
- 기존 `← 홈으로` / `← 메인으로` / `← MAIN` 등 혼재 형태는 수정 시 통일

---

## 4. Supabase 패턴

### 신규 테이블 생성 필수 2종
```sql
ALTER TABLE new_table DISABLE ROW LEVEL SECURITY;
GRANT ALL ON new_table TO anon, authenticated;  -- 두 개 동시 필수 (하나만 하면 안 됨)
```

### 페이지네이션 (1,000행 제한 우회)
```javascript
let page = 0, all = [];
while (true) {
  const { data } = await supabase.from('table')
    .select('*').range(page * 1000, (page + 1) * 1000 - 1);
  if (!data || data.length === 0) break;
  all = all.concat(data);
  if (data.length < 1000) break;
  page++;
}
```

### 기타 패턴
- 건수만 조회: `count: 'exact', head: true`
- 타임스탬프: 항상 `new Date().toISOString()` (UTC 저장, 브라우저가 KST 변환)
- 대량 DELETE: 배치 ID 기반 반복 (REST API 단일 쿼리 불가)
- Migration 이름: snake_case 서술형 문자열

---

## 5. JS 안전 패턴

```javascript
// ❌ 절대 금지 — 전역 번역함수 t() 와 충돌
let t = someValue;

// ✅ 다른 이름 사용
let tmpVal = someValue;
```

```javascript
// ✅ template literal 내 </script> 이스케이프 필수
`<\/script>`
```

### 납품 전 검증 (필수)
```bash
# 1. script 블록 추출
python3 -c "
import re, sys
s=open('file.html',encoding='utf-8').read()
js=''.join(re.findall(r'<script(?![^>]*src=)[^>]*>(.*?)<\/script>',s,re.S))
open('chk.js','w',encoding='utf-8').write(js)
print('div open', len(re.findall(r'<div\b',s)), 'close', len(re.findall(r'<\/div>',s)))
"

# 2. 문법 검증
node --check chk.js

# 3. 잔여물 확인 (필요시)
grep -n "Courier\|monospace" file.html
```

### Regex 규칙
- 단일행 패턴: `[^\n]*` 사용 (`.` + DOTALL 금지 — 대형 코드블록 소실 위험)

---

## 6. 주요 파일 목록

| 파일 | 설명 |
|---|---|
| `index.html` | 메인 허브 (로그인·메뉴) |
| `shipment.html` | 출하관리 |
| `ship_lot.html` | 바코드 LOT 관리 |
| `po_hub.html` | PO 허브 (법인별 분기) |
| `po_gsmein.html` | GSMEIN PO |
| `po_smecn.html` | SMECN PO |
| `po_master.html` | 본사 HQ PO |
| `po_monitor.html` | PO 모니터 |
| `hq_analysis.html` | HQ 공급분석 |
| `admin_log.html` | 관리자 설정 (11탭) |
| `workflow.html` | 업무 워크플로우 (23명 운영 중 — 수정 주의) |
| `mfg_admin.html` | 제조 관리 |
| `mfg_lot.html` | 제조 LOT |
| `mfg_stock.html` | 제조 재고 |
| `mfg_production.html` | 생산관리 |
| `kpi_shipping.html` | KPI 출하관리 |
| `import.html` | 수입통관 (개발 예정) |

---

## 7. 인증 정보

| 항목 | 값 |
|---|---|
| SMERP 공통 비밀번호 | `1120` |
| 관리자 전용 비밀번호 | `9901` |
| 담당자 (상무) empId | `2` (박정용) |

---

## 8. 주요 Supabase 테이블

`purchase_data` / `sales_data` (+ `_v` 뷰, `brand_std`) / `stock_inventory` /
`po_data` / `shipment_po` / `ship_schedule` / `ship_lot_item` / `ship_lot_log` /
`ship_lot_item_lot` / `maker_pn_master` / `maker_pn_lgpn_map` / `maker_pn_itemcode_map` /
`employees` / `partners` / `export_customers` / `maker_alias` / `brand_stock_rule` /
`work_diary` / `work_diary_confirm` / `cal_todos` / `mfg_*` / `kpi_time_setting` /
`extra_time_reason_master` / `customer_extra_time_rule` / `po_history` /
`lot_force_reason_master` / `extra_category` / `smerp_request`

---

## 9. 컨텍스트 문서 (docs 폴더)

| 파일 | 내용 |
|---|---|
| `docs/SME_컨텍스트_최신.md` | 전체 개발 이력·설계 결정 사항 |
| `docs/SME_WorkFlow_설계구조_최신.md` | WorkFlow 모듈 설계 |
| `docs/SME_제조모듈_설계구조_최신.md` | 제조 모듈 설계 |

**문서 관리 원칙**: 추가만 가능, 삭제 금지. 줄 수 감소 불허.

---

## 10. 핵심 비즈니스 로직 메모

### PO 출하 차감 (ETD 순차)
1. DB 수정 없음 — 화면에서 재계산
2. ETD 오름차순 → 동일 ETD 내 qty 내림차순 정렬
3. `if((po.order_date||'') > date) continue` — 출하일보다 늦은 PO는 차감 제외
4. 그룹핑 키: `entity + maker_pn` (qty 포함 필수)

### 공급유형 정규화
```javascript
// 'LG사급' / 'LG 사급' → 모두 'LG사급' 그룹
normalizeSupplyKey(type)
```

### Excel 날짜 처리
```javascript
// 숫자 시리얼 감지 → YYYY-MM-DD 변환
excelDateToStr(val)
```

### 바코드 스캔 타이머 (제조)
```javascript
// 3초 버퍼 후 일괄 처리 (멀티라인 릴 바코드 대응)
let scanBuffer = [], scanTimer = null;
```

---

## 11. 금지사항 요약

| 금지 | 이유 |
|---|---|
| `width: 100%` on table | 리사이즈 표준 위반 |
| `Courier New` / `monospace` 신규 사용 | 폰트 표준 위반 |
| 지역변수 `t` | 전역 번역함수 충돌 |
| DOTALL regex `.*?` + s flag | 대형 코드블록 소실 사고 |
| 단독 `GRANT` (RLS disable 누락) | Supabase 접근 불가 |
| `node --check` 생략 납품 | JS 오류 배포 위험 |
| OK 전 코드 생성 | 작업 흐름 위반 |
