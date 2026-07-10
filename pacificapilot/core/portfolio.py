"""
Portfolio management — correlation analysis, exposure limits, diversification.

Manages risk across multiple positions to ensure portfolio-level safety.
"""

from typing import List, Dict, Optional
import math


def calculate_correlation(trades_a: List[dict], trades_b: List[dict]) -> float:
    """
    Calculate Pearson correlation between two assets' returns.

    Args:
        trades_a: List of trades for asset A
        trades_b: List of trades for asset B

    Returns:
        Correlation coefficient (-1 to 1)
        1 = perfect positive correlation
        0 = no correlation
        -1 = perfect negative correlation
    """
    if not trades_a or not trades_b:
        return 0.0

    # Extract returns (PnL percentage)
    returns_a = []
    returns_b = []

    for trade in trades_a:
        if trade.get('entry_price') and trade.get('exit_price'):
            pnl_pct = ((trade['exit_price'] - trade['entry_price']) / trade['entry_price']) * 100
            if trade['side'] == 'ask':  # Short position
                pnl_pct = -pnl_pct
            returns_a.append(pnl_pct)

    for trade in trades_b:
        if trade.get('entry_price') and trade.get('exit_price'):
            pnl_pct = ((trade['exit_price'] - trade['entry_price']) / trade['entry_price']) * 100
            if trade['side'] == 'ask':  # Short position
                pnl_pct = -pnl_pct
            returns_b.append(pnl_pct)

    # Need at least 3 data points for meaningful correlation
    min_length = min(len(returns_a), len(returns_b))
    if min_length < 3:
        return 0.0

    # Use only matching length
    returns_a = returns_a[:min_length]
    returns_b = returns_b[:min_length]

    # Calculate Pearson correlation
    mean_a = sum(returns_a) / len(returns_a)
    mean_b = sum(returns_b) / len(returns_b)

    numerator = sum((a - mean_a) * (b - mean_b) for a, b in zip(returns_a, returns_b))

    sum_sq_a = sum((a - mean_a) ** 2 for a in returns_a)
    sum_sq_b = sum((b - mean_b) ** 2 for b in returns_b)

    denominator = math.sqrt(sum_sq_a * sum_sq_b)

    if denominator == 0:
        return 0.0

    correlation = numerator / denominator
    return round(correlation, 4)


def calculate_portfolio_correlation_matrix(trades_by_symbol: Dict[str, List[dict]]) -> Dict[str, Dict[str, float]]:
    """
    Calculate correlation matrix for all pairs of symbols in the portfolio.

    Args:
        trades_by_symbol: Dict mapping symbol to list of trades

    Returns:
        {
            "BTC": {"ETH": 0.85, "SOL": 0.72, ...},
            "ETH": {"BTC": 0.85, "SOL": 0.68, ...},
            ...
        }
    """
    symbols = list(trades_by_symbol.keys())
    matrix = {}

    for symbol_a in symbols:
        matrix[symbol_a] = {}
        for symbol_b in symbols:
            if symbol_a == symbol_b:
                matrix[symbol_a][symbol_b] = 1.0
            else:
                correlation = calculate_correlation(
                    trades_by_symbol[symbol_a],
                    trades_by_symbol[symbol_b]
                )
                matrix[symbol_a][symbol_b] = correlation

    return matrix


def check_portfolio_exposure(
    positions: Dict[str, dict],
    max_total_exposure_usdc: float,
) -> tuple[bool, float, str]:
    """
    Check if total portfolio exposure is within limits.

    Args:
        positions: Dict of open positions {symbol: position_dict}
        max_total_exposure_usdc: Maximum total USDC exposure

    Returns:
        (is_within_limits, current_exposure, message)
    """
    total_exposure = sum(pos.get('size_usdc', 0) for pos in positions.values())

    if total_exposure <= max_total_exposure_usdc:
        return True, total_exposure, f"Portfolio exposure ${total_exposure:.2f} within limit ${max_total_exposure_usdc:.2f}"
    else:
        return False, total_exposure, f"Portfolio exposure ${total_exposure:.2f} exceeds limit ${max_total_exposure_usdc:.2f}"


def check_correlation_risk(
    symbol: str,
    side: str,
    positions: Dict[str, dict],
    correlation_matrix: Dict[str, Dict[str, float]],
    max_correlation: float = 0.8,
) -> tuple[bool, str]:
    """
    Check if adding a position would create excessive correlation risk.

    Args:
        symbol: Symbol of new position to add
        side: Side of new position ("bid" or "ask")
        positions: Dict of current open positions
        correlation_matrix: Correlation matrix for all symbols
        max_correlation: Maximum allowed correlation with existing positions

    Returns:
        (is_safe, message)
    """
    if not positions:
        return True, "No existing positions, no correlation risk"

    if symbol not in correlation_matrix:
        return True, f"No correlation data for {symbol}, allowing trade"

    # Check correlation with each existing position
    high_correlation_positions = []

    for pos_symbol, position in positions.items():
        if pos_symbol == symbol:
            # Already have position in this symbol
            if position['side'] == side:
                return False, f"Already have {side.upper()} position in {symbol}"
            else:
                # Opposite side = hedging, actually reduces correlation risk
                return True, f"Adding opposite side to {symbol} (hedging)"

        # Check correlation
        correlation = correlation_matrix.get(symbol, {}).get(pos_symbol, 0)

        # If both long or both short on correlated assets = risky
        if position['side'] == side and abs(correlation) > max_correlation:
            high_correlation_positions.append((pos_symbol, correlation))

    if high_correlation_positions:
        corr_str = ", ".join(f"{sym} ({corr:.2f})" for sym, corr in high_correlation_positions)
        return False, f"High correlation risk with existing positions: {corr_str}"

    return True, "Correlation risk acceptable"


def calculate_diversification_score(positions: Dict[str, dict]) -> float:
    """
    Calculate portfolio diversification using Herfindahl-Hirschman Index (HHI).

    Args:
        positions: Dict of open positions

    Returns:
        Diversification score (0-1)
        1 = perfectly diversified
        0 = completely concentrated
    """
    if not positions:
        return 1.0

    # Calculate total exposure
    total_exposure = sum(pos.get('size_usdc', 0) for pos in positions.values())

    if total_exposure == 0:
        return 1.0

    # Calculate market share squared for each position
    hhi = sum((pos.get('size_usdc', 0) / total_exposure) ** 2 for pos in positions.values())

    # Convert HHI to diversification score (inverse)
    # HHI ranges from 1/n (perfect diversification) to 1 (complete concentration)
    # We want score of 1 for diversified, 0 for concentrated
    n = len(positions)
    min_hhi = 1 / n if n > 0 else 1
    max_hhi = 1

    if max_hhi == min_hhi:
        return 1.0

    diversification = 1 - ((hhi - min_hhi) / (max_hhi - min_hhi))
    return round(diversification, 4)


def get_portfolio_risk_metrics(
    positions: Dict[str, dict],
    trades_by_symbol: Dict[str, List[dict]],
    max_total_exposure_usdc: float,
) -> dict:
    """
    Calculate comprehensive portfolio risk metrics.

    Args:
        positions: Dict of open positions
        trades_by_symbol: Historical trades by symbol
        max_total_exposure_usdc: Maximum total exposure

    Returns:
        {
            "total_exposure": float,
            "exposure_utilization_pct": float,
            "diversification_score": float,
            "position_count": int,
            "correlation_matrix": dict,
            "within_limits": bool,
        }
    """
    total_exposure = sum(pos.get('size_usdc', 0) for pos in positions.values())
    exposure_utilization = (total_exposure / max_total_exposure_usdc * 100) if max_total_exposure_usdc > 0 else 0

    diversification = calculate_diversification_score(positions)

    correlation_matrix = {}
    if trades_by_symbol:
        correlation_matrix = calculate_portfolio_correlation_matrix(trades_by_symbol)

    within_limits, _, _ = check_portfolio_exposure(positions, max_total_exposure_usdc)

    return {
        "total_exposure": round(total_exposure, 2),
        "exposure_utilization_pct": round(exposure_utilization, 2),
        "diversification_score": diversification,
        "position_count": len(positions),
        "correlation_matrix": correlation_matrix,
        "within_limits": within_limits,
    }
