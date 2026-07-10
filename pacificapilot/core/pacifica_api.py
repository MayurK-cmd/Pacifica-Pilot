"""
Pacifica API client for portfolio, PnL, and trading data.

Implements missing endpoints: trade history, equity history, funding history, balance history.
"""

from typing import Optional, List
import requests

BASE_URL = "https://test-api.pacifica.fi/api/v1"

_session = requests.Session()
_session.headers.update({
    "Accept": "application/json",
    "User-Agent": "PacificaPilot/0.1.0"
})


def get_trade_history(wallet_address: str, limit: int = 100) -> Optional[List[dict]]:
    """
    Fetch trade history from Pacifica API.

    Uses GET /api/v1/trades/history?account=... (no signing required for GET).

    Returns actual executed trades with PnL data from Pacifica.
    """
    try:
        r = _session.get(
            f"{BASE_URL}/trades/history",
            params={"account": wallet_address, "limit": limit},
            timeout=10
        )
        r.raise_for_status()
        data = r.json()
        return data.get("data", [])
    except Exception as e:
        import sys
        print(f"[get_trade_history] Error: {e}", file=sys.stderr)
        return None


def get_account_equity_history(
    wallet_address: str,
    time_range: str = "7d"
) -> Optional[dict]:
    """
    Fetch account equity and PnL history from Pacifica.

    Uses GET /api/v1/account/balance/history?account=... which returns
    balance events (deposits, trades, funding, etc). We compute equity
    and PnL from the balance changes over time.

    Args:
        wallet_address: Wallet address
        time_range: Time range (e.g., "1d", "7d", "30d", "all")

    Returns:
        {
            "equity_history": [{"timestamp": int, "equity": float, "pnl": float}, ...],
            "summary": {"total_pnl": float, "total_return_pct": float}
        }
    """
    try:
        r = _session.get(
            f"{BASE_URL}/account/balance/history",
            params={"account": wallet_address},
            timeout=10
        )
        r.raise_for_status()
        response = r.json()
        records = response.get("data", [])

        if not records or not isinstance(records, list):
            return None

        # Build equity history from balance events
        equity_history = []
        for record in records:
            balance = float(record.get("balance", 0))
            pending = float(record.get("pending_balance", 0))
            created_at = record.get("created_at", 0)

            equity_history.append({
                "timestamp": created_at,
                "equity": balance,
                "pnl": 0,  # individual pnl not tracked per event
            })

        # Compute summary - pnl = current balance - first balance
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

    Args:
        wallet_address: Wallet address
        symbol: Optional symbol filter
        limit: Max number of payments to return

    Returns:
        List of funding payments with timestamp, symbol, rate, payment amount
    """
    try:
        params = {"wallet": wallet_address, "limit": limit}
        if symbol:
            params["symbol"] = symbol

        r = _session.get(
            f"{BASE_URL}/funding/history",
            params=params,
            timeout=10
        )
        r.raise_for_status()
        data = r.json()
        return data.get("data", [])
    except Exception:
        return None


def get_account_balance_history(
    wallet_address: str,
    time_range: str = "7d"
) -> Optional[dict]:
    """
    Fetch account balance history from Pacifica.

    Tracks deposits, withdrawals, and balance changes over time.
    """
    try:
        r = _session.get(
            f"{BASE_URL}/account/balance/history",
            params={"account": wallet_address, "time_range": time_range},
            timeout=10
        )
        r.raise_for_status()
        data = r.json()
        return data.get("data", {})
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
            f"{BASE_URL}/info/prices",
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
