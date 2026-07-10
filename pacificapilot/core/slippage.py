"""
Slippage calculation utilities.

Slippage measures the difference between expected and actual execution prices.
"""


def calculate_slippage_pct(expected_price: float, actual_price: float, side: str) -> float:
    """
    Calculate slippage percentage.

    Args:
        expected_price: Price we expected to execute at (mark price)
        actual_price: Price we actually executed at (fill price)
        side: "bid" (long) or "ask" (short)

    Returns:
        Slippage as percentage (positive = worse than expected)
    """
    if expected_price == 0:
        return 0.0

    if side == "bid":
        # For longs: paying MORE than expected is negative slippage
        slippage = ((actual_price - expected_price) / expected_price) * 100
    else:
        # For shorts: receiving LESS than expected is negative slippage
        slippage = ((expected_price - actual_price) / expected_price) * 100

    return round(slippage, 4)


def calculate_avg_slippage(trades: list) -> dict:
    """
    Calculate average slippage metrics from trade history.

    Args:
        trades: List of trade dicts with slippage fields

    Returns:
        {
            "avg_entry_slippage_pct": float,
            "avg_exit_slippage_pct": float,
            "avg_total_slippage_pct": float,
        }
    """
    entry_slippages = [
        t.get("entry_slippage_pct", 0)
        for t in trades
        if t.get("entry_slippage_pct") is not None
    ]

    exit_slippages = [
        t.get("exit_slippage_pct", 0)
        for t in trades
        if t.get("exit_slippage_pct") is not None
    ]

    avg_entry = sum(entry_slippages) / len(entry_slippages) if entry_slippages else 0.0
    avg_exit = sum(exit_slippages) / len(exit_slippages) if exit_slippages else 0.0

    # Total slippage = entry + exit
    total_slippages = []
    for t in trades:
        entry = t.get("entry_slippage_pct", 0) or 0
        exit = t.get("exit_slippage_pct", 0) or 0
        total_slippages.append(entry + exit)

    avg_total = sum(total_slippages) / len(total_slippages) if total_slippages else 0.0

    return {
        "avg_entry_slippage_pct": round(avg_entry, 4),
        "avg_exit_slippage_pct": round(avg_exit, 4),
        "avg_total_slippage_pct": round(avg_total, 4),
    }
