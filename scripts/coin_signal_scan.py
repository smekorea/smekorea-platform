#!/usr/bin/env python3
# coin_signal_scan.py (v2 - 9개 지표 확장판)
# 매시 정각 GitHub Actions에서 실행
# 업비트 원화마켓 전체 종목 스캔 -> 기술적지표 9종 계산 -> 1차필터 -> Claude API 최종판단 -> Supabase 저장

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
UPBIT_ORDERBOOK_URL = "https://api.upbit.com/v1/orderbook"

REQ_INTERVAL = 0.13   # 초당 약 7.5회 페이스 (한도 10회 대비 여유)
CANDLE_COUNT = 60     # MACD(26+9)/StochRSI 계산에 필요한 넉넉한 히스토리
ORDERBOOK_BATCH = 20  # 호가 조회 1회당 묶어서 조회할 종목 수

# ---------------- 1차 필터 임계값 ----------------
RSI_THRESHOLD = 35             # 필수 조건
BB_NEAR_PCT = 2.0               # 볼린저 하단밴드 기준 근접치(%)
VOLUME_RATIO_THRESHOLD = 1.5    # 최근5일 평균 대비 거래량 배율
LOW_POSITION_THRESHOLD = 15     # 최근14일 저점 대비 위치(%)
STOCH_OVERSOLD = 20              # StochRSI 과매도 기준
ORDERBOOK_BUY_RATIO = 1.2        # 매수잔량/매도잔량 비율 기준
SECONDARY_NEEDED = 4             # RSI 외 7개 보조지표 중 몇 개 이상 충족해야 하는지


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


def get_orderbook_ratios(markets):
    """마켓을 배치로 묶어 호가 매수/매도 잔량비율 조회 (요청 수 절약)"""
    ratios = {}
    for i in range(0, len(markets), ORDERBOOK_BATCH):
        batch = markets[i:i + ORDERBOOK_BATCH]
        params = {"markets": ",".join(batch)}
        try:
            r = requests.get(UPBIT_ORDERBOOK_URL, params=params, timeout=10)
            if r.status_code == 429:
                time.sleep(1.0)
                r = requests.get(UPBIT_ORDERBOOK_URL, params=params, timeout=10)
            r.raise_for_status()
            data = r.json()
            for item in data:
                units = item.get("orderbook_units", [])
                total_bid = sum(u.get("bid_size", 0) for u in units)
                total_ask = sum(u.get("ask_size", 0) for u in units)
                if total_ask > 0:
                    ratios[item["market"]] = round(total_bid / total_ask, 3)
        except Exception as e:
            print(f"[warn] 호가 조회 실패(배치 {i // ORDERBOOK_BATCH + 1}): {e}")
        time.sleep(REQ_INTERVAL)
    return ratios


# ---------------- 지표 계산 함수 ----------------

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


def rsi_series(closes, period=14):
    """StochRSI 계산용 - 구간별 RSI 값 전체 시리즈"""
    series = [None] * len(closes)
    for i in range(period, len(closes)):
        window = closes[i - period:i + 1]
        gains, losses = [], []
        for j in range(1, len(window)):
            diff = window[j] - window[j - 1]
            gains.append(max(diff, 0))
            losses.append(max(-diff, 0))
        avg_gain = sum(gains) / period
        avg_loss = sum(losses) / period
        if avg_loss == 0:
            series[i] = 100.0
        else:
            rs = avg_gain / avg_loss
            series[i] = 100 - (100 / (1 + rs))
    return series


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


def ema_series(values, period):
    """지수이동평균 시리즈 (앞쪽 period-1개는 None)"""
    if len(values) < period:
        return [None] * len(values)
    emas = [None] * (period - 1)
    sma = sum(values[:period]) / period
    emas.append(sma)
    k = 2 / (period + 1)
    prev = sma
    for price in values[period:]:
        val = price * k + prev * (1 - k)
        emas.append(val)
        prev = val
    return emas


def calc_macd(closes, fast=12, slow=26, signal=9):
    """MACD 골든크로스 감지: (현재 macd_hist, 직전 macd_hist, 골든크로스 여부)"""
    if len(closes) < slow + signal + 2:
        return None, None, False
    ema_fast = ema_series(closes, fast)
    ema_slow = ema_series(closes, slow)
    macd_line = []
    for i in range(len(closes)):
        if ema_fast[i] is not None and ema_slow[i] is not None:
            macd_line.append(ema_fast[i] - ema_slow[i])
    if len(macd_line) < signal + 2:
        return None, None, False
    signal_line = ema_series(macd_line, signal)
    # macd_line과 signal_line 정렬 맞추기 (같은 길이, signal_line 앞쪽 None)
    hist = [macd_line[i] - signal_line[i] if signal_line[i] is not None else None for i in range(len(macd_line))]
    valid_hist = [h for h in hist if h is not None]
    if len(valid_hist) < 2:
        return None, None, False
    curr_hist = round(valid_hist[-1], 4)
    prev_hist = round(valid_hist[-2], 4)
    golden_cross = prev_hist <= 0 and curr_hist > 0
    return curr_hist, prev_hist, golden_cross


def calc_stoch_rsi(closes, rsi_period=14, stoch_period=14, smooth_k=3, smooth_d=3):
    """StochRSI %K/%D 및 과매도권 반전 여부"""
    rsis = rsi_series(closes, rsi_period)
    valid_idx = [i for i, v in enumerate(rsis) if v is not None]
    if len(valid_idx) < stoch_period + smooth_k + smooth_d:
        return None, None, False

    valid_rsis = [rsis[i] for i in valid_idx]
    raw_k = [None] * len(valid_rsis)
    for i in range(stoch_period - 1, len(valid_rsis)):
        window = valid_rsis[i - stoch_period + 1:i + 1]
        lo, hi = min(window), max(window)
        if hi - lo == 0:
            raw_k[i] = 50.0
        else:
            raw_k[i] = (valid_rsis[i] - lo) / (hi - lo) * 100

    valid_raw_k = [v for v in raw_k if v is not None]
    if len(valid_raw_k) < smooth_k + smooth_d + 1:
        return None, None, False

    def sma_series(vals, period):
        out = [None] * len(vals)
        for i in range(period - 1, len(vals)):
            out[i] = sum(vals[i - period + 1:i + 1]) / period
        return out

    k_series = sma_series(valid_raw_k, smooth_k)
    valid_k = [v for v in k_series if v is not None]
    if len(valid_k) < smooth_d + 1:
        return None, None, False
    d_series = sma_series(valid_k, smooth_d)
    valid_d = [v for v in d_series if v is not None]
    if len(valid_d) < 2 or len(valid_k) < 2:
        return None, None, False

    curr_k, prev_k = round(valid_k[-1], 2), round(valid_k[-2], 2)
    curr_d, prev_d = round(valid_d[-1], 2), round(valid_d[-2], 2)
    # 과매도권(20 이하)에서 %K가 %D를 상향 돌파
    reversal = (prev_k <= prev_d) and (curr_k > curr_d) and (curr_k <= STOCH_OVERSOLD + 10)
    return curr_k, curr_d, reversal


def calc_ma_cross(closes, short=5, long=20):
    """이동평균 골든크로스 임박/발생 여부"""
    if len(closes) < long + 2:
        return None, None, False
    sma_short_curr = sum(closes[-short:]) / short
    sma_long_curr = sum(closes[-long:]) / long
    sma_short_prev = sum(closes[-short - 1:-1]) / short
    sma_long_prev = sum(closes[-long - 1:-1]) / long
    golden_cross = sma_short_prev <= sma_long_prev and sma_short_curr > sma_long_curr
    diff_pct = round((sma_short_curr - sma_long_curr) / sma_long_curr * 100, 2)
    return diff_pct, None, golden_cross


def calc_atr(highs, lows, closes, period=14):
    """평균 실질 변동폭 (참고용 - 필터 조건 아님, Claude 맥락 제공용)"""
    if len(closes) < period + 1:
        return None
    trs = []
    for i in range(1, len(closes)):
        tr = max(
            highs[i] - lows[i],
            abs(highs[i] - closes[i - 1]),
            abs(lows[i] - closes[i - 1]),
        )
        trs.append(tr)
    atr = sum(trs[-period:]) / period
    price = closes[-1]
    if price == 0:
        return None
    return round(atr / price * 100, 2)  # 가격 대비 %로 표현


def analyze_market(market, korean_name, orderbook_ratio):
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
    highs = [c["high_price"] for c in candles]
    price = closes[-1]

    rsi = calc_rsi(closes)
    sma, upper, lower = calc_bollinger(closes)
    volume_ratio = calc_volume_ratio(volumes)
    low_position_pct = calc_low_position(closes, lows)
    macd_hist, macd_hist_prev, macd_golden = calc_macd(closes)
    stoch_k, stoch_d, stoch_reversal = calc_stoch_rsi(closes)
    ma_diff_pct, _, ma_golden = calc_ma_cross(closes)
    atr_pct = calc_atr(highs, lows, closes)

    if rsi is None or lower is None:
        return None

    bb_position = round((price - lower) / lower * 100, 2)  # 0에 가까울수록 하단밴드 근접, 음수면 이탈
    orderbook_signal = orderbook_ratio is not None and orderbook_ratio >= ORDERBOOK_BUY_RATIO

    criteria_met = {
        "rsi": rsi <= RSI_THRESHOLD,
        "bb": bb_position <= BB_NEAR_PCT,
        "volume": (volume_ratio is not None and volume_ratio >= VOLUME_RATIO_THRESHOLD),
        "low": (low_position_pct is not None and low_position_pct <= LOW_POSITION_THRESHOLD),
        "macd": bool(macd_golden),
        "stoch": bool(stoch_reversal),
        "ma_cross": bool(ma_golden),
        "orderbook": bool(orderbook_signal),
    }

    secondary_keys = ["bb", "volume", "low", "macd", "stoch", "ma_cross", "orderbook"]
    secondary_count = sum(criteria_met[k] for k in secondary_keys)
    passed_filter = criteria_met["rsi"] and secondary_count >= SECONDARY_NEEDED

    return {
        "market": market,
        "coin_name": korean_name,
        "price": price,
        "rsi": rsi,
        "bb_position": bb_position,
        "volume_ratio": volume_ratio,
        "low_position_pct": low_position_pct,
        "macd_hist": macd_hist,
        "stoch_k": stoch_k,
        "stoch_d": stoch_d,
        "ma_diff_pct": ma_diff_pct,
        "atr_pct": atr_pct,
        "orderbook_ratio": orderbook_ratio,
        "criteria_met": criteria_met,
        "passed_filter": passed_filter,
    }


def call_claude_for_signals(candidates):
    """1차 필터 통과 종목들을 30개씩 나눠 Claude API에 최종 판단 요청 (max_tokens 한도 방지)"""
    if not candidates:
        return {}

    system_prompt = (
        "당신은 7일 이내 단기매매 관점의 암호화폐 기술적 분석 보조입니다. "
        "아래 JSON 배열의 각 종목에 대해, 제공된 9개 지표(RSI/볼린저위치/거래량배율/저점대비%/"
        "MACD히스토그램/StochRSI %K,%D/이평차이%/ATR%/호가매수비율)를 종합해 저점매수 신호 여부를 판단하세요. "
        "투자 확정 조언이 아니라 '기술적으로 저점권 근접 신호가 감지됨'을 알리는 용도입니다. "
        "reason은 반드시 30자 이내 한 문장으로, 가장 결정적인 근거 1~2개만 언급하세요. "
        "반드시 JSON만 응답하고 다른 텍스트(코드블럭 표시 포함)는 포함하지 마세요. "
        "형식: {\"results\":[{\"market\":\"KRW-XXX\",\"signal\":true/false,\"reason\":\"30자 이내 근거\"}]}"
    )

    CHUNK_SIZE = 25
    result_map = {}

    for i in range(0, len(candidates), CHUNK_SIZE):
        chunk = candidates[i:i + CHUNK_SIZE]
        payload_for_prompt = [
            {
                "market": c["market"],
                "coin_name": c["coin_name"],
                "price": c["price"],
                "rsi": c["rsi"],
                "bb_position_pct": c["bb_position"],
                "volume_ratio": c["volume_ratio"],
                "low_position_pct": c["low_position_pct"],
                "macd_hist": c["macd_hist"],
                "stoch_k": c["stoch_k"],
                "stoch_d": c["stoch_d"],
                "ma_diff_pct": c["ma_diff_pct"],
                "atr_pct": c["atr_pct"],
                "orderbook_ratio": c["orderbook_ratio"],
            }
            for c in chunk
        ]

        body = {
            "model": "claude-sonnet-5",
            "max_tokens": 4000,
            "thinking": {"type": "disabled"},
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": json.dumps(payload_for_prompt, ensure_ascii=False)}
            ],
        }

        try:
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
            print(f"[info] Claude API 청크 {i // CHUNK_SIZE + 1} 응답 상태코드: {r.status_code}")
            r.raise_for_status()
            data = r.json()
            print(f"[info] 청크 {i // CHUNK_SIZE + 1} stop_reason: {data.get('stop_reason')}, usage: {data.get('usage')}")
            text = "".join(block.get("text", "") for block in data.get("content", []) if block.get("type") == "text")
            text = text.strip()
            if text.startswith("```"):
                text = text.strip("`")
                if text.startswith("json"):
                    text = text[4:]
            parsed = json.loads(text)
            for item in parsed.get("results", []):
                result_map[item["market"]] = {
                    "signal": bool(item.get("signal", False)),
                    "reason": item.get("reason", ""),
                }
        except Exception as e:
            print(f"[warn] 청크 {i // CHUNK_SIZE + 1} 처리 실패: {e}")
            continue

        time.sleep(0.5)  # 청크 간 짧은 대기

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

    market_codes = [m for m, _ in markets]
    print("호가 데이터 조회 중...")
    orderbook_ratios = get_orderbook_ratios(market_codes)
    print(f"호가 조회 완료: {len(orderbook_ratios)}건")

    candidates = []
    for market, name in markets:
        result = analyze_market(market, name, orderbook_ratios.get(market))
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
            "macd_hist": c["macd_hist"],
            "stoch_k": c["stoch_k"],
            "stoch_d": c["stoch_d"],
            "ma_diff_pct": c["ma_diff_pct"],
            "atr_pct": c["atr_pct"],
            "orderbook_ratio": c["orderbook_ratio"],
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
        import traceback
        print(f"[fatal] 스크립트 실행 실패: {e}")
        traceback.print_exc()
        sys.exit(1)
