"""
Risk management — position sizing, limits, and validation.

Pure functions — no state, no side effects.
"""

from typing import Optional


def check_position_limit(
    current_positions: dict,
    symbol: str,
    new_usdc_size: float,
    max_position_usdc: float,
) -> tuple[bool, str]:
    """
    Check if a new order would exceed position limits.

    Args:
        current_positions: Dict of open positions {symbol: {...}}
        symbol: Symbol to check
        new_usdc_size: Proposed order size in USDC
        max_position_usdc: Maximum allowed position size per symbol

    Returns:
        (is_allowed: bool, reason: str)
    """
    if symbol in current_positions:
        current_size = current_positions[symbol].get("size", 0)
        if current_size + new_usdc_size > max_position_usdc:
            return False, f"Would exceed max position ${max_position_usdc:.2f} (current: ${current_size:.2f}, new: ${new_usdc_size:.2f})"

    if new_usdc_size > max_position_usdc:
        return False, f"Order size ${new_usdc_size:.2f} exceeds max ${max_position_usdc:.2f}"

    return True, ""


def calculate_position_size(
    usdc_size: float,
    available_balance: float,
    max_position_usdc: float,
    balance_utilization_pct: float = 0.9,
) -> tuple[float, str]:
    """
    Calculate actual position size respecting balance and limits.

    Args:
        usdc_size: Requested USDC size
        available_balance: Available USDC balance
        max_position_usdc: Max position size per config
        balance_utilization_pct: Max fraction of available balance to use

    Returns:
        (adjusted_size: float, reason: str)
    """
    max_from_balance = available_balance * balance_utilization_pct

    if usdc_size <= 0:
        return 0, "Invalid size: must be positive"

    if usdc_size > max_position_usdc:
        return max_position_usdc, f"Capped to max position ${max_position_usdc:.2f}"

    if usdc_size > max_from_balance:
        return max_from_balance, f"Capped to available balance ${max_from_balance:.2f} ({balance_utilization_pct:.0%} of ${available_balance:.2f})"

    return usdc_size, ""


def validate_order_params(
    symbol: str,
    side: str,
    usdc_size: float,
    confidence: float,
    min_confidence: float,
    current_positions: dict,
    available_balance: float,
    max_position_usdc: float,
) -> tuple[bool, str]:
    """
    Validate all order parameters before placing an order.

    Returns:
        (is_valid: bool, reason: str)
    """
    if not symbol or symbol.strip() == "":
        return False, "Invalid symbol"

    if side not in ("bid", "ask"):
        return False, f"Invalid side: {side} (must be 'bid' or 'ask')"

    if usdc_size <= 0:
        return False, "Order size must be positive"

    if confidence < min_confidence:
        return False, f"Confidence {confidence:.0%} below minimum {min_confidence:.0%}"

    if available_balance <= 0:
        return False, "Insufficient balance"

    # Check if already in same-direction position
    if symbol in current_positions:
        existing_side = current_positions[symbol].get("side")
        if existing_side == side:
            return False, f"Already in {side.upper()} position for {symbol}"

    # Check position limits
    allowed, reason = check_position_limit(current_positions, symbol, usdc_size, max_position_usdc)
    if not allowed:
        return False, reason

    return True, ""


def calculate_risk_adjusted_size(
    base_size: float,
    confidence: float,
    risk_profile: str = "balanced",
) -> float:
    """
    Adjust position size based on confidence and risk profile.

    Args:
        base_size: Base position size in USDC
        confidence: AI confidence score (0.0 to 1.0)
        risk_profile: "conservative" | "balanced" | "aggressive"

    Returns:
        Adjusted position size in USDC
    """
    risk_multipliers = {
        "conservative": 0.5,
        "balanced": 1.0,
        "aggressive": 1.5,
    }

    multiplier = risk_multipliers.get(risk_profile, 1.0)

    # Scale size by confidence: 60% conf = 0.6x, 100% conf = 1.0x
    confidence_factor = max(0.5, min(1.0, confidence))

    adjusted = base_size * multiplier * confidence_factor
    return round(adjusted, 2)


def calculate_kelly_criterion(
    historical_trades: list,
    fractional_kelly: float = 0.5,
) -> dict:
    """
    Calculate optimal position size using Kelly Criterion.

    Kelly formula: f* = (bp - q) / b
    Where:
        f* = optimal position size as fraction of capital
        b = odds (average win / average loss ratio)
        p = probability of winning
        q = probability of losing (1 - p)

    Args:
        historical_trades: List of completed trades with 'realized_pnl' field
        fractional_kelly: Fraction of Kelly to use (0.5 = half Kelly, more conservative)

    Returns:
        {
            "kelly_pct": float (0.0-1.0),
            "win_rate": float,
            "avg_win": float,
            "avg_loss": float,
            "win_loss_ratio": float,
            "recommended_size_pct": float (fractional Kelly applied),
            "full_kelly_pct": float (raw Kelly before fractional adjustment),
        }
    """
    if not historical_trades or len(historical_trades) < 10:
        # Need at least 10 trades for meaningful Kelly calculation
        return {
            "kelly_pct": 0.0,
            "win_rate": 0.0,
            "avg_win": 0.0,
            "avg_loss": 0.0,
            "win_loss_ratio": 0.0,
            "recommended_size_pct": 0.0,
            "full_kelly_pct": 0.0,
            "error": "Insufficient trade history (need at least 10 trades)",
        }

    # Separate winners and losers
    winning_trades = [t for t in historical_trades if t.get("realized_pnl", 0) > 0]
    losing_trades = [t for t in historical_trades if t.get("realized_pnl", 0) < 0]

    if not winning_trades or not losing_trades:
        # Need both wins and losses for Kelly
        return {
            "kelly_pct": 0.0,
            "win_rate": 0.0,
            "avg_win": 0.0,
            "avg_loss": 0.0,
            "win_loss_ratio": 0.0,
            "recommended_size_pct": 0.0,
            "full_kelly_pct": 0.0,
            "error": "Need both winning and losing trades for Kelly calculation",
        }

    # Calculate win rate (p)
    win_rate = len(winning_trades) / len(historical_trades)
    loss_rate = 1 - win_rate  # q

    # Calculate average win and loss
    avg_win = sum(t["realized_pnl"] for t in winning_trades) / len(winning_trades)
    avg_loss = abs(sum(t["realized_pnl"] for t in losing_trades) / len(losing_trades))

    # Calculate win/loss ratio (b)
    win_loss_ratio = avg_win / avg_loss if avg_loss > 0 else 0.0

    # Kelly formula: f* = (bp - q) / b
    kelly_numerator = (win_loss_ratio * win_rate) - loss_rate
    kelly_pct = kelly_numerator / win_loss_ratio if win_loss_ratio > 0 else 0.0

    # Cap Kelly at 1.0 (100% of capital)
    kelly_pct = max(0.0, min(1.0, kelly_pct))

    # Apply fractional Kelly for more conservative sizing
    recommended_size_pct = kelly_pct * fractional_kelly

    return {
        "kelly_pct": round(kelly_pct, 4),
        "win_rate": round(win_rate, 4),
        "avg_win": round(avg_win, 2),
        "avg_loss": round(avg_loss, 2),
        "win_loss_ratio": round(win_loss_ratio, 2),
        "recommended_size_pct": round(recommended_size_pct, 4),
        "full_kelly_pct": round(kelly_pct, 4),
    }


def calculate_kelly_position_size(
    historical_trades: list,
    available_capital: float,
    fractional_kelly: float = 0.5,
    max_position_usdc: Optional[float] = None,
) -> tuple[float, dict]:
    """
    Calculate position size using Kelly Criterion.

    Args:
        historical_trades: List of completed trades
        available_capital: Available USDC to trade with
        fractional_kelly: Fraction of Kelly to use (0.25-1.0 range)
        max_position_usdc: Optional hard cap on position size

    Returns:
        (position_size: float, kelly_info: dict)
    """
    kelly_result = calculate_kelly_criterion(historical_trades, fractional_kelly)

    if kelly_result.get("error"):
        # Fall back to conservative fixed sizing if Kelly can't be calculated
        position_size = available_capital * 0.1  # 10% of capital
        kelly_result["fallback_used"] = True
    else:
        # Use Kelly-recommended percentage
        position_size = available_capital * kelly_result["recommended_size_pct"]

    # Apply max position cap if provided
    if max_position_usdc and position_size > max_position_usdc:
        position_size = max_position_usdc
        kelly_result["capped_by_max"] = True

    # Ensure minimum viable position size
    position_size = max(position_size, 10.0)

    return round(position_size, 2), kelly_result
