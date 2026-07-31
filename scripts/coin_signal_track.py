#!/usr/bin/env python3
# coin_signal_track.py
# 30분마다 GitHub Actions에서 실행
# 최근 7일 이내 발생한 signal=true 신호들의 현재가를 재조회해 등락률 추적 저장

import os
import sys
import time
import json
import requests
from datetime import datetime, timezone, timedelta

TRACK_DAYS = 7
TICKER_BATCH = 80  # 업비트 ticker 1회 호출당 묶어서 조회할 종목 수
REQ_INTERVAL = 0.2


def _clean_secret(name):
    raw = os.environ[name]
    cleaned = raw.strip()
    try:
        cleaned.encode("ascii")
    except UnicodeEncodeError as e:
        raise RuntimeError(
            f"[secret오류] {name} 값에 non-ASCII 문자가 섞여 있습니다. 상세: {e}"
        )
    return cleaned


SUPABASE_URL = _clean_secret("SUPABASE_URL").rstrip("/")
SUPABASE_KEY = _clean_secret("SUPABASE_KEY")

SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


def get_active_signals():
    """최근 TRACK_DAYS일 이내 signal=true인 신호 전체 조회 (1000행 페이지네이션)"""
    since = (datetime.now(timezone.utc) - timedelta(days=TRACK_DAYS)).isoformat()
    rows = []
    offset = 0
    page_size = 1000
    base_url = f"{SUPABASE_URL}/rest/v1/coin_signal"
    while True:
        params = {
            "select": "id,market,price,checked_at",
            "signal": "eq.true",
            "checked_at": f"gte.{since}",
            "order": "id.asc",
        }
        headers = dict(SB_HEADERS)
        headers["Range"] = f"{offset}-{offset + page_size - 1}"
        r = requests.get(base_url, headers=headers, params=params, timeout=30)
        if r.status_code not in (200, 206):
            print(f"[error] 신호 조회 실패: {r.status_code} {r.text}")
            break
        data = r.json()
        rows.extend(data)
        if len(data) < page_size:
            break
        offset += page_size
    return rows


def get_ticker_prices(markets):
    """마켓들을 배치로 묶어 현재가 조회"""
    prices = {}
    unique_markets = list(dict.fromkeys(markets))
    for i in range(0, len(unique_markets), TICKER_BATCH):
        batch = unique_markets[i:i + TICKER_BATCH]
        params = {"markets": ",".join(batch)}
        try:
            r = requests.get("https://api.upbit.com/v1/ticker", params=params, timeout=10)
            if r.status_code == 429:
                time.sleep(1.0)
                r = requests.get("https://api.upbit.com/v1/ticker", params=params, timeout=10)
            r.raise_for_status()
            for item in r.json():
                prices[item["market"]] = item["trade_price"]
        except Exception as e:
            print(f"[warn] ticker 조회 실패(배치 {i // TICKER_BATCH + 1}): {e}")
        time.sleep(REQ_INTERVAL)
    return prices


def save_tracking_rows(rows):
    if not rows:
        print("저장할 추적 행 없음")
        return
    url = f"{SUPABASE_URL}/rest/v1/coin_signal_price_track"
    headers = dict(SB_HEADERS)
    headers["Prefer"] = "return=minimal"
    r = requests.post(url, headers=headers, json=rows, timeout=30)
    if r.status_code not in (200, 201):
        print(f"[error] 추적 저장 실패: {r.status_code} {r.text}")
        r.raise_for_status()
    print(f"추적 저장 완료: {len(rows)}건")


def main():
    signals = get_active_signals()
    print(f"추적 대상 신호(최근 {TRACK_DAYS}일 이내): {len(signals)}건")
    if not signals:
        return

    markets = [s["market"] for s in signals]
    prices = get_ticker_prices(markets)
    print(f"현재가 조회 완료: {len(prices)}종목")

    now = datetime.now(timezone.utc)
    rows = []
    for s in signals:
        current_price = prices.get(s["market"])
        if current_price is None:
            continue
        base_price = s["price"]
        if not base_price:
            continue
        checked_dt = datetime.fromisoformat(s["checked_at"].replace("Z", "+00:00"))
        minutes_after = int((now - checked_dt).total_seconds() / 60)
        if minutes_after < 0:
            continue
        pct_change = round((current_price - base_price) / base_price * 100, 3)
        rows.append({
            "signal_id": s["id"],
            "market": s["market"],
            "base_price": base_price,
            "minutes_after": minutes_after,
            "price": current_price,
            "pct_change": pct_change,
            "checked_at": now.isoformat(),
        })

    save_tracking_rows(rows)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback
        print(f"[fatal] 스크립트 실행 실패: {e}")
        traceback.print_exc()
        sys.exit(1)
