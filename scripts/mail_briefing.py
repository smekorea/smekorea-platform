#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SMERP 메일 브리핑 자동수집
- 비즈메카EZ IMAP에서 전일 수신메일 수집
- 필터키워드 해당 메일 제외
- Claude API로 요약
- 본사(KOREA) 직원 이름 매칭
- Supabase(mail_raw / mail_briefing) 저장

실행: python scripts/mail_briefing.py
환경변수: BIZMEKA_IMAP_USER, BIZMEKA_IMAP_PASSWORD,
         SUPABASE_URL, SUPABASE_KEY, ANTHROPIC_API_KEY, TARGET_DATE(선택)
"""

import os
import re
import sys
import ssl
import time
import json
import imaplib
import email
from email.header import decode_header, make_header
from email.utils import parseaddr, parsedate_to_datetime
from datetime import datetime, timedelta, timezone

import requests

# ----------------------------------------------------------------------
# 설정
# ----------------------------------------------------------------------
IMAP_HOST = 'ezmail.bizmeka.com'
IMAP_TRY = [(993, 'ssl'), (143, 'starttls'), (143, 'plain')]

KST = timezone(timedelta(hours=9))

IMAP_USER = os.environ.get('BIZMEKA_IMAP_USER', '').strip()
IMAP_PASS = os.environ.get('BIZMEKA_IMAP_PASSWORD', '')
SUPABASE_URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')
ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
TARGET_DATE = os.environ.get('TARGET_DATE', '').strip()

CLAUDE_MODEL = 'claude-sonnet-4-5-20250929'
MAX_BODY_FOR_AI = 6000     # AI에 넘길 본문 최대 길이
MAX_BODY_STORE = 20000     # DB에 저장할 원문 최대 길이

SB_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json',
}


def log(msg):
    print('[%s] %s' % (datetime.now(KST).strftime('%H:%M:%S'), msg), flush=True)


# ----------------------------------------------------------------------
# Supabase 헬퍼
# ----------------------------------------------------------------------
def sb_select(table, params=None):
    url = '%s/rest/v1/%s' % (SUPABASE_URL, table)
    r = requests.get(url, headers=SB_HEADERS, params=params or {}, timeout=30)
    r.raise_for_status()
    return r.json()


def sb_insert(table, rows, return_rep=True):
    if not rows:
        return []
    url = '%s/rest/v1/%s' % (SUPABASE_URL, table)
    h = dict(SB_HEADERS)
    h['Prefer'] = 'return=representation' if return_rep else 'return=minimal'
    r = requests.post(url, headers=h, json=rows, timeout=60)
    if r.status_code >= 400:
        log('  ! insert 실패 %s: %s' % (r.status_code, r.text[:300]))
        r.raise_for_status()
    return r.json() if return_rep and r.text else []


# ----------------------------------------------------------------------
# 대상 날짜
# ----------------------------------------------------------------------
def resolve_target_date():
    if TARGET_DATE:
        try:
            return datetime.strptime(TARGET_DATE, '%Y-%m-%d').date()
        except ValueError:
            log('TARGET_DATE 형식 오류(%s) — 전일 기준으로 진행' % TARGET_DATE)
    return (datetime.now(KST) - timedelta(days=1)).date()


# ----------------------------------------------------------------------
# IMAP 접속 (993 SSL → 143 STARTTLS → 143 평문 순서로 폴백)
# ----------------------------------------------------------------------
def imap_connect():
    last_err = None
    for port, mode in IMAP_TRY:
        try:
            log('IMAP 접속 시도: %s:%s (%s)' % (IMAP_HOST, port, mode))
            if mode == 'ssl':
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                M = imaplib.IMAP4_SSL(IMAP_HOST, port, ssl_context=ctx, timeout=30)
            else:
                M = imaplib.IMAP4(IMAP_HOST, port, timeout=30)
                if mode == 'starttls':
                    ctx = ssl.create_default_context()
                    ctx.check_hostname = False
                    ctx.verify_mode = ssl.CERT_NONE
                    M.starttls(ssl_context=ctx)
            M.login(IMAP_USER, IMAP_PASS)
            log('  → 접속 성공 (%s:%s %s)' % (IMAP_HOST, port, mode))
            return M
        except Exception as e:
            last_err = e
            log('  → 실패: %s' % e)
            continue
    raise RuntimeError('IMAP 접속 전부 실패: %s' % last_err)


def dec(v):
    if not v:
        return ''
    try:
        return str(make_header(decode_header(v))).strip()
    except Exception:
        return str(v).strip()


def get_body(msg):
    """text/plain 우선, 없으면 text/html 태그 제거"""
    plain, html = '', ''
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_maintype() == 'multipart':
                continue
            if part.get('Content-Disposition', '').startswith('attachment'):
                continue
            ctype = part.get_content_type()
            if ctype not in ('text/plain', 'text/html'):
                continue
            try:
                payload = part.get_payload(decode=True)
                if not payload:
                    continue
                charset = part.get_content_charset() or 'utf-8'
                text = payload.decode(charset, errors='replace')
            except Exception:
                continue
            if ctype == 'text/plain' and not plain:
                plain = text
            elif ctype == 'text/html' and not html:
                html = text
    else:
        try:
            payload = msg.get_payload(decode=True)
            charset = msg.get_content_charset() or 'utf-8'
            text = payload.decode(charset, errors='replace') if payload else ''
            if msg.get_content_type() == 'text/html':
                html = text
            else:
                plain = text
        except Exception:
            pass

    body = plain
    if not body.strip() and html:
        body = re.sub(r'(?is)<(script|style).*?</\1>', ' ', html)
        body = re.sub(r'(?s)<[^>]+>', ' ', body)
        body = (body.replace('&nbsp;', ' ').replace('&lt;', '<')
                    .replace('&gt;', '>').replace('&amp;', '&').replace('&quot;', '"'))
    body = re.sub(r'[ \t]+', ' ', body)
    body = re.sub(r'\n{3,}', '\n\n', body)
    return body.strip()


def fetch_mails(M, target_date):
    """대상일 하루치 메일 수집"""
    M.select('INBOX')
    since = target_date.strftime('%d-%b-%Y')
    before = (target_date + timedelta(days=1)).strftime('%d-%b-%Y')
    typ, data = M.search(None, '(SINCE "%s" BEFORE "%s")' % (since, before))
    if typ != 'OK':
        log('IMAP search 실패')
        return []

    ids = data[0].split()
    log('대상일(%s) 메일 %d건 발견' % (target_date, len(ids)))

    mails = []
    for num in ids:
        try:
            typ, mdata = M.fetch(num, '(RFC822)')
            if typ != 'OK' or not mdata or not mdata[0]:
                continue
            msg = email.message_from_bytes(mdata[0][1])

            subject = dec(msg.get('Subject'))
            from_raw = dec(msg.get('From'))
            s_name, s_addr = parseaddr(from_raw)
            s_name = dec(s_name) or (s_addr.split('@')[0] if s_addr else '')

            try:
                rcv = parsedate_to_datetime(msg.get('Date'))
                if rcv.tzinfo is None:
                    rcv = rcv.replace(tzinfo=KST)
            except Exception:
                rcv = datetime.now(KST)

            mid = (msg.get('Message-ID') or '').strip()
            if not mid:
                mid = 'NOID-%s-%s' % (target_date, num.decode())

            mails.append({
                'message_id': mid,
                'subject': subject or '(제목없음)',
                'sender_name': s_name,
                'sender_address': s_addr,
                'received_at': rcv.astimezone(timezone.utc).isoformat(),
                'raw_body': get_body(msg)[:MAX_BODY_STORE],
            })
        except Exception as e:
            log('  ! 메일 파싱 실패(%s): %s' % (num, e))
            continue
    return mails


# ----------------------------------------------------------------------
# 필터 / 매칭
# ----------------------------------------------------------------------
def load_keywords():
    try:
        rows = sb_select('mail_briefing_keywords', {'select': 'keyword,target'})
        log('필터키워드 %d건 로드' % len(rows))
        return rows
    except Exception as e:
        log('필터키워드 로드 실패(무시): %s' % e)
        return []


def is_filtered(mail, keywords):
    for k in keywords:
        kw = (k.get('keyword') or '').strip().lower()
        if not kw:
            continue
        tgt = k.get('target') or '전체'
        if tgt == '제목':
            hay = mail['subject'].lower()
        elif tgt == '본문':
            hay = mail['raw_body'].lower()
        elif tgt == '발신자':
            hay = ('%s %s' % (mail['sender_name'], mail['sender_address'])).lower()
        else:
            hay = ('%s %s %s %s' % (mail['subject'], mail['raw_body'],
                                    mail['sender_name'], mail['sender_address'])).lower()
        if kw in hay:
            return True, kw
    return False, None


def load_employees():
    rows = sb_select('employees', {
        'select': 'id,name,entity,active',
        'entity': 'eq.KOREA',
        'active': 'is.true',
    })
    names = [r['name'].strip() for r in rows if r.get('name') and len(r['name'].strip()) >= 2]
    log('본사 직원 %d명 로드' % len(names))
    return names


def match_names(mail, emp_names):
    hay = '%s\n%s' % (mail['subject'], mail['raw_body'])
    found = []
    for n in emp_names:
        if n in hay and n not in found:
            found.append(n)
    return found


# ----------------------------------------------------------------------
# Claude 요약
# ----------------------------------------------------------------------
SUMMARY_PROMPT = """다음은 회사 대표메일로 수신된 메일입니다. 담당자가 빠르게 파악할 수 있도록 한국어로 요약하세요.

[요약 규칙]
- 3~5줄로 작성
- 누가 / 무엇을 / 언제까지 가 드러나게 작성
- 금액, 수량, 납기일, 품번, 발주번호 등 구체적인 숫자·코드는 절대 생략하지 말고 그대로 표기
- "~에 대한 안내입니다" 같이 뭉뚱그린 표현 금지
- 회신이나 조치가 필요하면 마지막 줄에 [조치필요] 를 붙일 것
- 요약문만 출력하고 다른 말은 쓰지 말 것

[발신자] {sender}
[제목] {subject}
[본문]
{body}
"""


def summarize(mail):
    if not ANTHROPIC_KEY:
        return (mail['raw_body'][:200] or '(본문없음)')
    try:
        r = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={
                'x-api-key': ANTHROPIC_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            json={
                'model': CLAUDE_MODEL,
                'max_tokens': 500,
                'messages': [{
                    'role': 'user',
                    'content': SUMMARY_PROMPT.format(
                        sender='%s <%s>' % (mail['sender_name'], mail['sender_address']),
                        subject=mail['subject'],
                        body=mail['raw_body'][:MAX_BODY_FOR_AI] or '(본문없음)',
                    )
                }],
            },
            timeout=90,
        )
        if r.status_code >= 400:
            log('  ! Claude %s: %s' % (r.status_code, r.text[:200]))
            return mail['raw_body'][:200] or '(요약실패)'
        data = r.json()
        parts = [c.get('text', '') for c in data.get('content', []) if c.get('type') == 'text']
        return ('\n'.join(parts)).strip() or '(요약없음)'
    except Exception as e:
        log('  ! Claude 호출 오류: %s' % e)
        return mail['raw_body'][:200] or '(요약실패)'


# ----------------------------------------------------------------------
# 메인
# ----------------------------------------------------------------------
def main():
    missing = [k for k, v in [
        ('BIZMEKA_IMAP_USER', IMAP_USER), ('BIZMEKA_IMAP_PASSWORD', IMAP_PASS),
        ('SUPABASE_URL', SUPABASE_URL), ('SUPABASE_KEY', SUPABASE_KEY)] if not v]
    if missing:
        log('환경변수 누락: %s' % ', '.join(missing))
        sys.exit(1)

    target_date = resolve_target_date()
    log('=== 메일브리핑 시작 (대상일 %s) ===' % target_date)

    # 1) 메일 수집
    M = imap_connect()
    try:
        mails = fetch_mails(M, target_date)
    finally:
        try:
            M.logout()
        except Exception:
            pass

    if not mails:
        log('수집된 메일 없음 — 종료')
        return

    # 2) 중복 제거 (이미 mail_raw 에 있는 message_id)
    existing = set()
    try:
        rows = sb_select('mail_raw', {
            'select': 'message_id',
            'received_at': 'gte.%s' % target_date.isoformat(),
        })
        existing = {r['message_id'] for r in rows}
    except Exception as e:
        log('기존 message_id 조회 실패(무시): %s' % e)

    new_mails = [m for m in mails if m['message_id'] not in existing]
    log('신규 %d건 / 중복제외 %d건' % (len(new_mails), len(mails) - len(new_mails)))
    if not new_mails:
        log('신규 메일 없음 — 종료')
        return

    # 3) 필터키워드 적용
    keywords = load_keywords()
    passed = []
    for m in new_mails:
        hit, kw = is_filtered(m, keywords)
        if hit:
            log('  [제외] %s (키워드: %s)' % (m['subject'][:40], kw))
        else:
            passed.append(m)
    log('필터 통과 %d건' % len(passed))
    if not passed:
        log('필터 통과 메일 없음 — 종료')
        return

    # 4) 직원명 로드
    try:
        emp_names = load_employees()
    except Exception as e:
        log('직원 로드 실패: %s' % e)
        emp_names = []

    # 5) 요약 + 매칭 + 저장
    ok, fail = 0, 0
    for i, m in enumerate(passed, 1):
        log('(%d/%d) %s' % (i, len(passed), m['subject'][:50]))
        try:
            raw_rows = sb_insert('mail_raw', [m])
            raw_id = raw_rows[0]['id'] if raw_rows else None

            summary = summarize(m)
            matched = match_names(m, emp_names)

            sb_insert('mail_briefing', [{
                'mail_raw_id': raw_id,
                'date': target_date.isoformat(),
                'subject': m['subject'],
                'summary': summary,
                'sender_name': m['sender_name'] or m['sender_address'],
                'matched_names': matched,
                'require_confirm': len(matched) > 0,
            }], return_rep=False)

            log('   → 저장완료 (담당자: %s)' % (', '.join(matched) if matched else '없음/참조용'))
            ok += 1
            time.sleep(0.5)
        except Exception as e:
            log('   ! 처리 실패: %s' % e)
            fail += 1
            continue

    log('=== 완료: 성공 %d건 / 실패 %d건 ===' % (ok, fail))


if __name__ == '__main__':
    main()
