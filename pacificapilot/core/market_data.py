"""
Market data fetching and technical indicators.

Fetches price data from Pacifica and Binance, calculates RSI, MACD, Bollinger Bands, and Volume.
"""

from typing import Optional
import time
import requests

from .urls import get_base_url

BINANCE_BASE = "https://api.binance.com/api/v3"

# Pacifica-native kline intervals (docs: 1m,3m,5m,15m,30m,1h,2h,4h,8h,12h,1d)
PACIFICA_INTERVAL_MS = {
    "1m": 60_000, "3m": 180_000, "5m": 300_000, "15m": 900_000,
    "30m": 1_800_000, "1h": 3_600_000, "2h": 7_200_000, "4h": 14_400_000,
    "8h": 28_800_000, "12h": 43_200_000, "1d": 86_400_000,
}

_session = requests.Session()
_session.headers.update({
    "Accept": "application/json",
    "User-Agent": "PacificaPilot/0.1.0"
})


def fetch_pacifica_klines(symbol: str, interval: str = "1h", limit: int = 100) -> Optional[list]:
    """
    Fetch candles from Pacifica GET /api/v1/kline.

    Returns [{t, o, h, l, c, v}] (floats) or None on failure/unsupported interval.
    """
    span = PACIFICA_INTERVAL_MS.get(interval)
    if span is None:
        return None
    try:
        limit = max(2, min(int(limit), 500))
        end = int(time.time() * 1000)
        start = end - limit * span
        r = _session.get(
            f"{get_base_url()}/kline",
            params={
                "symbol": symbol,
                "interval": interval,
                "start_time": start,
                "end_time": end,
            },
            timeout=10,
        )
        r.raise_for_status()
        data = r.json().get("data", [])
        candles = []
        for k in data:
            try:
                candles.append({
                    "t": int(k.get("t", 0)),
                    "o": float(k.get("o", 0)),
                    "h": float(k.get("h", 0)),
                    "l": float(k.get("l", 0)),
                    "c": float(k.get("c", 0)),
                    "v": float(k.get("v", 0)),
                })
            except (TypeError, ValueError):
                continue
        return candles or None
    except Exception:
        return None


def _fetch_candles(symbol: str, interval: str, limit: int) -> list:
    """
    Pacifica klines first, Binance fallback. Always returns a (possibly empty)
    list of {t,o,h,l,c,v} dicts so indicator math stays source-agnostic.
    """
    candles = fetch_pacifica_klines(symbol, interval, limit)
    if candles:
        return candles
    try:
        r = _session.get(
            f"{BINANCE_BASE}/klines",
            params={"symbol": f"{symbol}USDT", "interval": interval, "limit": limit},
            timeout=10,
        )
        r.raise_for_status()
        out = []
        for k in r.json():
            try:
                out.append({
                    "t": int(k[0]), "o": float(k[1]), "h": float(k[2]),
                    "l": float(k[3]), "c": float(k[4]), "v": float(k[5]),
                })
            except (TypeError, ValueError, IndexError):
                continue
        return out
    except Exception:
        return []


def _calculate_macd(symbol: str, interval: str) -> Optional[dict]:
    """
    Calculate MACD (Moving Average Convergence Divergence) for trend detection.

    MACD = 12-period EMA - 26-period EMA
    Signal line = 9-period EMA of MACD
    Histogram = MACD - Signal

    How it works:
    - Positive MACD above signal = bullish (uptrend)
    - Negative MACD below signal = bearish (downtrend)
    - MACD crossing above signal = buy signal
    - MACD crossing below signal = sell signal
    """
    try:
        # Need 35 candles for 26-period EMA + 9-period signal
        candles = _fetch_candles(symbol, interval, 35)

        if len(candles) < 35:
            return None

        closes = [c["c"] for c in candles]

        # Calculate EMAs
        ema_12 = _calculate_ema(closes, 12)
        ema_26 = _calculate_ema(closes, 26)

        if ema_12 is None or ema_26 is None:
            return None

        # MACD line
        macd_line = ema_12 - ema_26

        # Signal line (9-period EMA of MACD)
        # For simplicity, use SMA as approximation
        macd_values = []
        for i in range(len(closes) - 26):
            e12 = _calculate_ema(closes[:26+i+1], 12)
            e26 = _calculate_ema(closes[:26+i+1], 26)
            if e12 and e26:
                macd_values.append(e12 - e26)

        if len(macd_values) < 9:
            signal_line = macd_line
        else:
            signal_line = sum(macd_values[-9:]) / 9

        histogram = macd_line - signal_line

        # Determine trend signal
        if macd_line > signal_line and macd_line > 0:
            trend = "strong_bullish"
        elif macd_line > signal_line:
            trend = "bullish"
        elif macd_line < signal_line and macd_line < 0:
            trend = "strong_bearish"
        elif macd_line < signal_line:
            trend = "bearish"
        else:
            trend = "neutral"

        return {
            "macd": round(macd_line, 2),
            "signal": round(signal_line, 2),
            "histogram": round(histogram, 2),
            "trend": trend,
        }
    except Exception:
        return None


def _calculate_ema(prices: list, period: int) -> Optional[float]:
    """Calculate Exponential Moving Average."""
    if len(prices) < period:
        return None

    multiplier = 2 / (period + 1)
    ema = sum(prices[:period]) / period  # Start with SMA

    for price in prices[period:]:
        ema = (price - ema) * multiplier + ema

    return ema


def _calculate_bollinger_bands(symbol: str, interval: str, current_price: float) -> Optional[dict]:
    """
    Calculate Bollinger Bands for volatility assessment.

    How it works:
    - Middle Band = 20-period SMA
    - Upper Band = Middle + (2 * standard deviation)
    - Lower Band = Middle - (2 * standard deviation)
    - Bandwidth = (Upper - Lower) / Middle * 100

    Signals:
    - Price near upper band = overbought, potential reversal down
    - Price near lower band = oversold, potential reversal up
    - Narrow bands (low bandwidth) = low volatility, breakout coming
    - Wide bands (high bandwidth) = high volatility
    - Price breaking outside bands = strong momentum
    """
    period = 20
    std_dev_multiplier = 2

    try:
        candles = _fetch_candles(symbol, interval, period + 1)

        if len(candles) < period:
            return None

        closes = [c["c"] for c in candles]

        # Calculate middle band (SMA)
        middle = sum(closes[-period:]) / period

        # Calculate standard deviation
        variance = sum((x - middle) ** 2 for x in closes[-period:]) / period
        std_dev = variance ** 0.5

        # Calculate bands
        upper = middle + (std_dev_multiplier * std_dev)
        lower = middle - (std_dev_multiplier * std_dev)

        # Calculate bandwidth (volatility indicator)
        bandwidth = ((upper - lower) / middle) * 100

        # Determine position relative to bands
        if current_price > upper:
            position = "above_upper"  # Overbought, strong momentum
        elif current_price > middle + (std_dev * 1):
            position = "upper_half"  # Approaching overbought
        elif current_price < lower:
            position = "below_lower"  # Oversold, strong momentum
        elif current_price < middle - (std_dev * 1):
            position = "lower_half"  # Approaching oversold
        else:
            position = "middle"  # Normal range

        return {
            "upper": round(upper, 2),
            "middle": round(middle, 2),
            "lower": round(lower, 2),
            "bandwidth": round(bandwidth, 2),
            "position": position,
        }
    except Exception:
        return None


def _fetch_volume_24h(symbol: str) -> Optional[dict]:
    """
    Fetch 24-hour trading volume and compare to average.

    How it works:
    - High volume = strong interest, move is likely sustainable
    - Low volume = weak interest, move may reverse
    - Volume confirms price moves: price up + volume up = strong trend
    """
    try:
        # Prefer Pacifica-native hourly candles: last 24h vs prior 24h.
        candles = _fetch_candles(symbol, "1h", 49)
        volumes = None
        if len(candles) >= 48:
            recent = sum(c["v"] for c in candles[-24:])
            prior = sum(c["v"] for c in candles[-48:-24]) or 1e-9
            volumes = (recent, prior)

        if volumes is None:
            # Binance fallback: 24h ticker vs 7-day average
            binance_symbol = f"{symbol}USDT"
            r = _session.get(
                f"{BINANCE_BASE}/ticker/24hr",
                params={"symbol": binance_symbol},
                timeout=5,
            )
            r.raise_for_status()
            data = r.json()

            volume_24h = float(data.get("volume", 0))

            r2 = _session.get(
                f"{BINANCE_BASE}/klines",
                params={
                    "symbol": binance_symbol,
                    "interval": "1d",
                    "limit": 7,
                },
                timeout=10,
            )
            r2.raise_for_status()
            klines = r2.json()

            if len(klines) >= 7:
                avg_volume = sum(float(k[5]) for k in klines) / len(klines)
            else:
                return {"volume": round(volume_24h, 2), "signal": "normal"}

            if volume_24h > avg_volume * 1.5:
                signal = "high"  # 50% above average
            elif volume_24h < avg_volume * 0.5:
                signal = "low"  # 50% below average
            else:
                signal = "normal"

            return {"volume": round(volume_24h, 2), "signal": signal}

        recent, prior = volumes
        ratio = recent / prior if prior > 0 else 1.0
        if ratio > 1.5:
            signal = "high"
        elif ratio < 0.5:
            signal = "low"
        else:
            signal = "normal"

        return {"volume": round(recent, 2), "signal": signal}
    except Exception:
        return None


def fetch_pacifica_price(symbol: str) -> Optional[dict]:
    """
    Fetch current mark price from Pacifica API.

    Args:
        symbol: Market symbol (e.g., "BTC", "WIF")

    Returns:
        {"mark_price": float, "funding_rate": float} or None

    Checks the shared WebSocket feed first (if running), then REST.
    """
    try:
        from .wsfeed import live_price

        live = live_price(symbol)
        if live:
            # WS gives price only; funding still needs REST below.
            funding = None
            try:
                from .urls import get_base_url as _gbu

                r0 = _session.get(f"{_gbu()}/info/prices", params={"symbol": symbol}, timeout=5)
                r0.raise_for_status()
                for p in r0.json().get("data", []):
                    if p.get("symbol") == symbol:
                        funding = float(p.get("funding", 0))
                        break
            except Exception:
                funding = None
            return {"mark_price": live, "funding_rate": funding or 0}
    except Exception:
        pass
    try:
        # Try fetching single symbol first
        from .urls import get_base_url
        r = _session.get(
            f"{get_base_url()}/info/prices",
            params={"symbol": symbol},
            timeout=5
        )
        r.raise_for_status()
        data = r.json()

        prices_data = data.get("data", [])

        if isinstance(prices_data, list) and len(prices_data) > 0:
            # The /info/prices endpoint may return ALL symbols even when filtered
            # Find our specific symbol
            symbol_data = next((p for p in prices_data if p.get("symbol") == symbol), None)

            if symbol_data is None and len(prices_data) == 1:
                # Only one result and no match - might be the requested symbol with different field
                symbol_data = prices_data[0]

            if symbol_data:
                # Pacifica returns "mark" and "funding" fields (not mark_price/funding_rate)
                mark = float(symbol_data.get("mark", 0))
                funding = float(symbol_data.get("funding", 0))

                if mark > 0:
                    return {"mark_price": mark, "funding_rate": funding}

        return None
    except Exception:
        return None


def fetch_binance_fallback(symbol: str) -> Optional[dict]:
    """
    Fetch price data from Binance as fallback.

    Args:
        symbol: Market symbol (e.g., "BTC")

    Returns:
        {"price": float} or None
    """
    binance_symbol = f"{symbol}USDT"

    try:
        r = _session.get(
            f"{BINANCE_BASE}/ticker/price",
            params={"symbol": binance_symbol},
            timeout=5,
        )
        r.raise_for_status()
        data = r.json()

        return {"price": float(data.get("price", 0))}
    except Exception:
        return None


def _calculate_rsi(symbol: str, interval: str, period: int = 14) -> Optional[dict]:
    """
    Calculate RSI (Relative Strength Index).

    Args:
        symbol: Market symbol
        interval: Kline interval (e.g., "5m", "1h")
        period: RSI period (default 14)

    Returns:
        {"rsi": float, "signal": str} or None
    """
    try:
        candles = _fetch_candles(symbol, interval, period + 1)

        if len(candles) < period + 1:
            return None

        closes = [c["c"] for c in candles]
        gains = []
        losses = []

        for i in range(1, len(closes)):
            change = closes[i] - closes[i - 1]
            if change > 0:
                gains.append(change)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(change))

        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period

        if avg_loss == 0:
            rsi = 100
        else:
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))

        # Determine signal
        if rsi < 30:
            signal = "oversold"
        elif rsi > 70:
            signal = "overbought"
        else:
            signal = "neutral"

        return {"rsi": round(rsi, 2), "signal": signal}

    except Exception:
        return None


def get_market_snapshot(symbol: str, use_binance_fallback: bool = True) -> dict:
    """
    Get comprehensive market snapshot with price and technical indicators.

    Args:
        symbol: Market symbol (e.g., "BTC")
        use_binance_fallback: Use Binance for indicators if Pacifica fails

    Returns:
        Market snapshot dict with price, funding, RSI, MACD, Bollinger, Volume
    """
    # Fetch price from Pacifica
    pacifica_data = fetch_pacifica_price(symbol)

    if pacifica_data:
        mark_price = pacifica_data["mark_price"]
        funding_rate = pacifica_data["funding_rate"]
    elif use_binance_fallback:
        # Fallback to Binance
        binance_data = fetch_binance_fallback(symbol)
        mark_price = binance_data["price"] if binance_data else 0
        funding_rate = 0
    else:
        mark_price = 0
        funding_rate = 0

    snapshot = {
        "symbol": symbol,
        "mark_price": mark_price,
        "funding_rate": funding_rate,
    }

    # Calculate technical indicators from Binance
    if use_binance_fallback and mark_price > 0:
        # RSI 5m
        rsi_5m = _calculate_rsi(symbol, "5m", period=14)
        if rsi_5m:
            snapshot["rsi_5m"] = rsi_5m["rsi"]
            snapshot["rsi_5m_signal"] = rsi_5m["signal"]

        # RSI 1h
        rsi_1h = _calculate_rsi(symbol, "1h", period=14)
        if rsi_1h:
            snapshot["rsi_1h"] = rsi_1h["rsi"]
            snapshot["rsi_1h_signal"] = rsi_1h["signal"]

        # MACD
        macd = _calculate_macd(symbol, "1h")
        if macd:
            snapshot["macd"] = macd

        # Bollinger Bands
        bb = _calculate_bollinger_bands(symbol, "1h", mark_price)
        if bb:
            snapshot["bb_1h"] = bb

        # Volume
        volume = _fetch_volume_24h(symbol)
        if volume:
            snapshot["volume_24h"] = volume["volume"]
            snapshot["volume_signal"] = volume["signal"]

    return snapshot
