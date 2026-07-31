#!/usr/bin/env python3
# coin_signal_scan.py
# 매시 정각 GitHub Actions에서 실행
# 업비트 원화마켓 전체 종목 스캔 -> 기술적지표 계산 -> 1차필터 -> Claude API 최종판단 -> Supabase 저장

import os
import sys
import time
import json
import requests
from datetime import datetime, timezone, timedelta

# ---------------- 환경변수 ----------------
def _clean_secret(name):
    """Secret 값에 섞여 들어간 공백/개행/보이지 않는 문자를 제거하고,
    헤더 전송이 불가능한 non-ASCII 문자가 있으면 즉시 에러로 알림."""
    raw = os.environ[name]
    cleaned = raw.strip()
    try:
        cleaned.encode("ascii")
    except UnicodeEncodeError as e:
        raise RuntimeError(
            f"[secret오류] {name} 값에 non-ASCII(한글/특수문자 등)가 섞여 있습니다. "
            f"GitHub Secrets에서 값을 지우고 다시 등록해주세요. 상세: {e}"
        )
    return cleaned


SUPABASE_URL = _clean_secret("SUPABASE_URL").rstrip("/")
SUPABASE_KEY = _clean_secret("SUPABASE_KEY")
ANTHROPIC_API_KEY = _clean_secret("ANTHROPIC_API_KEY")

UPBIT_MARKET_ALL_URL = "https://api.upbit.com/v1/market/all?isDetails=false"
UPBIT_CANDLE_DAYS_URL = "https://api.upbit.com/v1/candles/days"

REQ_INTERVAL = 0.13  # 초당 약 7.5회 페이스 (한도 10회 대비 여유)
CANDLE_COUNT = 30    # 최근 30일치 (RSI14/BB20 계산에 필요한 최소치 + 여유)

# 1차 필터 임계값
RSI_THRESHOLD = 35          # 필수 조건
BB_NEAR_PCT = 2.0           # 볼린저 하단밴드 기준 근접치(%)
VOLUME_RATIO_THRESHOLD = 1.5  # 최근5일 평균 대비 거래량 배율
LOW_POSITION_THRESHOLD = 15   # 최근14일 저점 대비 위치(%)
SECONDARY_NEEDED = 2         # RSI 외 3개 중 몇 개 이상 충족해야 하는지


def kst_today_str():
    kst = timezone(timedelta(hours=9))
    return datetime.now(kst).strftime("%Y-%m-%d")


def get_krw_markets():
    r = requests.get(UPBIT_MARKET_ALL_URL, timeout=10)
    r.raise_for_status()
    data = r.json()
    markets = [(d["market"], d.get("korean_name", "")) for d in data if d["market"].startswith("KRW-")]
    return markets


def get_daily_candles(market):
    params = {"market": market, "count": CANDLE_COUNT}
    r = requests.get(UPBIT_CANDLE_DAYS_URL, params=params, timeout=10)
    if r.status_code == 429:
        time.sleep(1.0)
        r = requests.get(UPBIT_CANDLE_DAYS_URL, params=params, timeout=10)
    r.raise_for_status()
    data = r.json()
    # 업비트는 최신순으로 반환 -> 오래된순으로 뒤집기
    return list(reversed(data))


def calc_rsi(closes, period=14):
    if len(closes) < period + 1:
        return None
    gains, losses = [], []
    for i in range(1, len(closes)):
        diff = closes[i] - closes[i - 1]
        gains.append(max(diff, 0))
        losses.append(max(-diff, 0))
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


def calc_bollinger(closes, period=20, k=2):
    if len(closes) < period:
        return None, None, None
    window = closes[-period:]
    sma = sum(window) / period
    variance = sum((c - sma) ** 2 for c in window) / period
    std = variance ** 0.5
    upper = sma + k * std
    lower = sma - k * std
    return sma, upper, lower


def calc_volume_ratio(volumes, recent_days=5):
    if len(volumes) < recent_days + 1:
        return None
    today_vol = volumes[-1]
    avg_prior = sum(volumes[-(recent_days + 1):-1]) / recent_days
    if avg_prior == 0:
        return None
    return round(today_vol / avg_prior, 2)


def calc_low_position(closes, lows, period=14):
    if len(lows) < period:
        return None
    recent_low = min(lows[-period:])
    price = closes[-1]
    if recent_low == 0:
        return None
    return round((price - recent_low) / recent_low * 100, 2)


def analyze_market(market, korean_name):
    try:
        candles = get_daily_candles(market)
    except Exception as e:
        print(f"[warn] {market} candle fetch failed: {e}")
        return None

    if len(candles) < 21:
        return None

    closes = [c["trade_price"] for c in candles]
    volumes = [c["candle_acc_trade_volume"] for c in candles]
    lows = [c["low_price"] for c in candles]
    price = closes[-1]

    rsi = calc_rsi(closes)
    sma, upper, lower = calc_bollinger(closes)
    volume_ratio = calc_volume_ratio(volumes)
    low_position_pct = calc_low_position(closes, lows)

    if rsi is None or lower is None:
        return None

    bb_position = round((price - lower) / lower * 100, 2)  # 0에 가까울수록 하단밴드 근접, 음수면 이탈

    criteria_met = {
        "rsi": rsi <= RSI_THRESHOLD,
        "bb": bb_position <= BB_NEAR_PCT,
        "volume": (volume_ratio is not None and volume_ratio >= VOLUME_RATIO_THRESHOLD),
        "low": (low_position_pct is not None and low_position_pct <= LOW_POSITION_THRESHOLD),
    }

    secondary_count = sum([criteria_met["bb"], criteria_met["volume"], criteria_met["low"]])
    passed_filter = criteria_met["rsi"] and secondary_count >= SECONDARY_NEEDED

    return {
        "market": market,
        "coin_name": korean_name,
        "price": price,
        "rsi": rsi,
        "bb_position": bb_position,
        "volume_ratio": volume_ratio,
        "low_position_pct": low_position_pct,
        "criteria_met": criteria_met,
        "passed_filter": passed_filter,
    }


def call_claude_for_signals(candidates):
    """1차 필터 통과 종목들을 묶어 Claude API에 최종 판단 요청"""
    if not candidates:
        return {}

    payload_for_prompt = [
        {
            "market": c["market"],
            "coin_name": c["coin_name"],
            "price": c["price"],
            "rsi": c["rsi"],
            "bb_position_pct": c["bb_position"],
            "volume_ratio": c["volume_ratio"],
            "low_position_pct": c["low_position_pct"],
        }
        for c in candidates
    ]

    system_prompt = (
        "당신은 7일 이내 단기매매 관점의 암호화폐 기술적 분석 보조입니다. "
        "아래 JSON 배열의 각 종목에 대해, 제공된 지표만 근거로 저점매수 신호 여부를 판단하세요. "
        "투자 확정 조언이 아니라 '기술적으로 저점권 근접 신호가 감지됨'을 알리는 용도입니다. "
        "반드시 JSON만 응답하고 다른 텍스트는 포함하지 마세요. "
        "형식: {\"results\":[{\"market\":\"KRW-XXX\",\"signal\":true/false,\"reason\":\"한글 2문장 이내 근거\"}]}"
    )

    body = {
        "model": "claude-sonnet-5",
        "max_tokens": 2000,
        "system": system_prompt,
        "messages": [
            {"role": "user", "content": json.dumps(payload_for_prompt, ensure_ascii=False)}
        ],
    }

    r = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json=body,
        timeout=60,
    )
    r.raise_for_status()
    data = r.json()
    text = "".join(block.get("text", "") for block in data.get("content", []) if block.get("type") == "text")
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text.replace("json\n", "", 1)
    try:
        parsed = json.loads(text)
    except Exception as e:
        print(f"[warn] Claude 응답 JSON 파싱 실패: {e}\n원문: {text[:500]}")
        return {}

    result_map = {}
    for item in parsed.get("results", []):
        result_map[item["market"]] = {
            "signal": bool(item.get("signal", False)),
            "reason": item.get("reason", ""),
        }
    return result_map


def save_to_supabase(rows):
    if not rows:
        print("저장할 행 없음 (필터 통과 종목 0건)")
        return
    url = f"{SUPABASE_URL}/rest/v1/coin_signal"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    r = requests.post(url, headers=headers, json=rows, timeout=30)
    if r.status_code not in (200, 201):
        print(f"[error] Supabase 저장 실패: {r.status_code} {r.text}")
        r.raise_for_status()
    print(f"Supabase 저장 완료: {len(rows)}건")


def main():
    date_str = kst_today_str()
    checked_at = datetime.now(timezone.utc).isoformat()

    markets = get_krw_markets()
    print(f"원화마켓 종목 수: {len(markets)}")

    candidates = []
    for market, name in markets:
        result = analyze_market(market, name)
        time.sleep(REQ_INTERVAL)
        if result and result["passed_filter"]:
            candidates.append(result)

    print(f"1차 필터 통과: {len(candidates)}건")

    claude_results = call_claude_for_signals(candidates)

    rows = []
    for c in candidates:
        cr = claude_results.get(c["market"], {"signal": False, "reason": "판단 실패"})
        rows.append({
            "date": date_str,
            "market": c["market"],
            "coin_name": c["coin_name"],
            "price": c["price"],
            "rsi": c["rsi"],
            "bb_position": c["bb_position"],
            "volume_ratio": c["volume_ratio"],
            "low_position_pct": c["low_position_pct"],
            "criteria_met": c["criteria_met"],
            "signal": cr["signal"],
            "reason_text": cr["reason"],
            "checked_at": checked_at,
        })

    save_to_supabase(rows)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[fatal] 스크립트 실행 실패: {e}")
        sys.exit(1)
