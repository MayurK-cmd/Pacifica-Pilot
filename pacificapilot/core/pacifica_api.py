"""
Pacifica API client for portfolio, PnL, and trading data.

Implements missing endpoints: trade history, equity history, funding history, balance history.
"""

from typing import Optional, List
import requests

from .urls import get_base_url

_session = requests.Session()
_session.headers.update({
    "Accept": "application/json",
    "User-Agent": "PacificaPilot/0.1.0"
})


def _paginate_cursor(
    path: str,
    params: dict,
    limit: int,
    timeout: int = 10,
) -> List[dict]:
    """
    Follow Pacifica cursor pagination (next_cursor/has_more) until `limit`
    records are collected or the cursor is exhausted.
    """
    items: List[dict] = []
    cursor = None
    while len(items) < limit:
        page_params = dict(params)
        page_params["limit"] = min(limit - len(items), 100)
        if cursor:
            page_params["cursor"] = cursor
        r = _session.get(f"{get_base_url()}{path}", params=page_params, timeout=timeout)
        r.raise_for_status()
        data = r.json()
        batch = data.get("data", [])
        if not isinstance(batch, list):
            break
        items.extend(batch)
        if not data.get("has_more") or not data.get("next_cursor"):
            break
        cursor = data["next_cursor"]
    return items[:limit]


# Live trade-event sides per docs (GET /trades/history).
# open_long/open_short = position opened; close_long/close_short = closed.
TRADE_SIDE_TO_DIRECTION = {
    "open_long": "LONG",
    "close_long": "LONG",
    "open_short": "SHORT",
    "close_short": "SHORT",
    "bid": "LONG",  # legacy/back-compat
    "ask": "SHORT",
}


def get_trade_history(
    wallet_address: str,
    limit: int = 100,
    symbol: Optional[str] = None,
) -> Optional[List[dict]]:
    """
    Fetch trade history from Pacifica API.

    Uses GET /api/v1/trades/history?account=... (no signing required for GET).
    Follows cursor pagination. Each record carries:
    symbol, side (open_long/open_short/close_long/close_short), amount,
    price, entry_price, fee, pnl, event_type, created_at.

    Returns actual executed trades with PnL data from Pacifica.
    """
    try:
        params = {"account": wallet_address}
        if symbol:
            params["symbol"] = symbol
        return _paginate_cursor("/trades/history", params, limit)
    except Exception as e:
        import sys
        print(f"[get_trade_history] Error: {e}", file=sys.stderr)
        return None


def _time_range_cutoff_ms(time_range: str) -> Optional[int]:
    """Convert a range label to an epoch-ms cutoff, or None for 'all'."""
    import time

    days = {"24h": 1, "1d": 1, "7d": 7, "14d": 14, "30d": 30}.get(time_range.lower())
    if days is None:
        return None  # "all" or unknown -> no cutoff
    return int(time.time() * 1000) - days * 86_400_000


def get_account_equity_history(
    wallet_address: str,
    time_range: str = "7d"
) -> Optional[dict]:
    """
    Fetch account equity and PnL history from Pacifica.

    Primary source is GET /api/v1/portfolio?account=...&time_range=...
    (valid ranges: 1d, 7d, 14d, 30d, all), which returns
    [{account_equity, pnl, timestamp}, ...] directly. Falls back to
    reconstructing equity from GET /api/v1/account/balance/history
    balance events when the portfolio endpoint is unavailable.

    Args:
        wallet_address: Wallet address
        time_range: Time range (e.g., "1d", "7d", "30d", "all")

    Returns:
        {
            "equity_history": [{"timestamp": int, "equity": float, "pnl": float}, ...],
            "summary": {"total_pnl": float, "total_return_pct": float}
        }
    """
    normalized = time_range.lower()
    if normalized in ("24h",):
        normalized = "1d"
    if normalized not in ("1d", "7d", "14d", "30d", "all"):
        normalized = "7d"

    # Preferred: dedicated portfolio endpoint with server-side PnL.
    try:
        r = _session.get(
            f"{get_base_url()}/portfolio",
            params={"account": wallet_address, "time_range": normalized},
            timeout=10,
        )
        r.raise_for_status()
        points = r.json().get("data", [])
        if isinstance(points, list) and points:
            equity_history = [
                {
                    "timestamp": p.get("timestamp", 0),
                    "equity": float(p.get("account_equity", 0)),
                    "pnl": float(p.get("pnl", 0)),
                }
                for p in points
            ]
            last = equity_history[-1]
            first_equity = equity_history[0]["equity"]
            total_pnl = last["pnl"]
            total_return_pct = (total_pnl / first_equity * 100) if first_equity > 0 else 0
            return {
                "equity_history": equity_history,
                "summary": {
                    "total_pnl": total_pnl,
                    "total_return_pct": total_return_pct,
                },
            }
    except Exception:
        pass  # fall through to balance-history reconstruction

    # Fallback: rebuild equity from balance events (client-side time filter —
    # the endpoint accepts only account/limit/cursor, no time_range).
    try:
        records = _paginate_cursor(
            "/account/balance/history", {"account": wallet_address}, 500
        )
        if not records:
            return None

        cutoff = _time_range_cutoff_ms(normalized)
        equity_history = []
        for record in records:
            created_at = record.get("created_at", 0)
            if cutoff and created_at and created_at < cutoff:
                continue
            try:
                balance = float(record.get("balance", 0))
            except (TypeError, ValueError):
                continue
            equity_history.append({
                "timestamp": created_at,
                "equity": balance,
                "pnl": 0,  # individual pnl not tracked per event
            })

        equity_history.sort(key=lambda e: e["timestamp"])
        if len(equity_history) >= 2:
            first_balance = equity_history[0]["equity"]
            last_balance = equity_history[-1]["equity"]
            total_pnl = last_balance - first_balance
            total_return_pct = (total_pnl / first_balance * 100) if first_balance > 0 else 0
        else:
            total_pnl = 0
            total_return_pct = 0

        return {
            "equity_history": equity_history,
            "summary": {
                "total_pnl": total_pnl,
                "total_return_pct": total_return_pct,
            }
        }
    except Exception as e:
        import sys
        print(f"[get_account_equity_history] Error: {e}", file=sys.stderr)
        return None


def get_funding_history(
    wallet_address: str,
    symbol: Optional[str] = None,
    limit: int = 50
) -> Optional[List[dict]]:
    """
    Fetch funding payment history from Pacifica.

    Uses GET /api/v1/funding/history?account=...&limit=...&cursor=...
    (the endpoint takes `account`, not `wallet`, and has no symbol filter —
    symbol is applied client-side). Follows cursor pagination.

    Args:
        wallet_address: Wallet address
        symbol: Optional symbol filter (applied locally)
        limit: Max number of payments to return

    Returns:
        List of funding payments: history_id, symbol, side (bid/ask),
        amount, payout (USD), rate, created_at.
    """
    try:
        # Over-fetch when filtering by symbol so the limit still holds.
        fetch_limit = limit * 3 if symbol else limit
        records = _paginate_cursor(
            "/funding/history", {"account": wallet_address}, fetch_limit
        )
        if symbol:
            records = [r for r in records if r.get("symbol") == symbol]
        return records[:limit]
    except Exception:
        return None


def get_account_balance_history(
    wallet_address: str,
    time_range: str = "7d"
) -> Optional[dict]:
    """
    Fetch account balance history from Pacifica.

    GET /api/v1/account/balance/history accepts only account/limit/cursor,
    so time_range is applied as a client-side created_at filter.
    Tracks deposits, withdrawals, and balance changes over time.
    """
    try:
        records = _paginate_cursor(
            "/account/balance/history", {"account": wallet_address}, 500
        )
        cutoff = _time_range_cutoff_ms(time_range)
        if cutoff:
            records = [r for r in records if (r.get("created_at") or 0) >= cutoff]
        return {"data": records}
    except Exception:
        return None


def get_market_prices(symbol: Optional[str] = None) -> Optional[dict]:
    """
    Fetch market prices from Pacifica /info/prices endpoint.

    Returns mark prices, funding rates, 24h volume, and stats for all or specific symbol.
    """
    try:
        params = {}
        if symbol:
            params["symbol"] = symbol

        r = _session.get(
            f"{get_base_url()}/info/prices",
            params=params,
            timeout=10
        )
        r.raise_for_status()
        data = r.json()

        prices_data = data.get("data", [])

        if symbol and isinstance(prices_data, list):
            # Find matching symbol in the response
            symbol_data = next((p for p in prices_data if p.get("symbol") == symbol), None)
            if symbol_data:
                # Normalize field names (Pacifica uses "mark" and "funding")
                return {
                    "symbol": symbol_data.get("symbol"),
                    "mark_price": float(symbol_data.get("mark", 0)),
                    "funding_rate": float(symbol_data.get("funding", 0)),
                    "volume_24h": float(symbol_data.get("volume_24h", 0)),
                }
            return None

        return prices_data
    except Exception:
        return None


def get_market_volume(symbol: str) -> Optional[float]:
    """
    Get 24h trading volume for a symbol from Pacifica (not Binance).

    Returns volume in the quote currency (USDC).
    """
    try:
        prices = get_market_prices(symbol)
        if prices:
            return float(prices.get("volume_24h", 0))
        return None
    except Exception:
        return None
