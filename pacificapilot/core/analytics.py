"""
Performance analytics — calculate trading metrics from historical trades.

Pure functions that take trade history and return performance metrics:
- Sharpe ratio (risk-adjusted returns)
- Max drawdown (largest peak-to-trough decline)
- Win rate (percentage of profitable trades)
- Profit factor (gross profit / gross loss)
- Expectancy (average profit per trade)
- Recovery factor (total return / max drawdown)
"""

from typing import List, Optional
import math


def calculate_performance_metrics(trades: List[dict]) -> dict:
    """
    Calculate comprehensive performance metrics from trade history.

    Args:
        trades: List of trade dicts with keys:
            - realized_pnl: float
            - entry_time: int (unix timestamp)
            - exit_time: int (unix timestamp)
            - entry_price: float
            - exit_price: float
            - quantity: float

    Returns:
        {
            "total_trades": int,
            "winning_trades": int,
            "losing_trades": int,
            "win_rate": float (0.0-1.0),
            "total_pnl": float,
            "total_return_pct": float,
            "avg_win": float,
            "avg_loss": float,
            "largest_win": float,
            "largest_loss": float,
            "profit_factor": float,
            "expectancy": float,
            "sharpe_ratio": float,
            "max_drawdown": float,
            "max_drawdown_pct": float,
            "recovery_factor": float,
            "avg_trade_duration_hours": float,
        }
    """
    if not trades:
        return _empty_metrics()

    # Separate winning and losing trades
    winning_trades = [t for t in trades if t.get("realized_pnl", 0) > 0]
    losing_trades = [t for t in trades if t.get("realized_pnl", 0) < 0]
    breakeven_trades = [t for t in trades if t.get("realized_pnl", 0) == 0]

    total_trades = len(trades)
    winning_count = len(winning_trades)
    losing_count = len(losing_trades)

    # Win rate
    win_rate = winning_count / total_trades if total_trades > 0 else 0.0

    # Total PnL
    total_pnl = sum(t.get("realized_pnl", 0) for t in trades)

    # Calculate total return percentage (assuming starting capital from first trade)
    total_return_pct = 0.0
    if trades:
        first_trade_capital = abs(trades[0].get("entry_price", 0) * trades[0].get("quantity", 0))
        if first_trade_capital > 0:
            total_return_pct = (total_pnl / first_trade_capital) * 100

    # Average win/loss
    avg_win = sum(t["realized_pnl"] for t in winning_trades) / winning_count if winning_count > 0 else 0.0
    avg_loss = sum(t["realized_pnl"] for t in losing_trades) / losing_count if losing_count > 0 else 0.0

    # Largest win/loss
    largest_win = max((t["realized_pnl"] for t in winning_trades), default=0.0)
    largest_loss = min((t["realized_pnl"] for t in losing_trades), default=0.0)

    # Profit factor: gross profit / gross loss
    gross_profit = sum(t["realized_pnl"] for t in winning_trades)
    gross_loss = abs(sum(t["realized_pnl"] for t in losing_trades))
    profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf') if gross_profit > 0 else 0.0

    # Expectancy: average profit per trade
    expectancy = total_pnl / total_trades if total_trades > 0 else 0.0

    # Sharpe ratio: return / volatility
    sharpe_ratio = _calculate_sharpe_ratio([t["realized_pnl"] for t in trades])

    # Max drawdown
    max_drawdown, max_drawdown_pct = _calculate_max_drawdown([t["realized_pnl"] for t in trades])

    # Recovery factor: total return / max drawdown
    recovery_factor = abs(total_pnl / max_drawdown) if max_drawdown != 0 else 0.0

    # Average trade duration
    durations = []
    for t in trades:
        entry_time = t.get("entry_time", 0)
        exit_time = t.get("exit_time", 0)
        if entry_time and exit_time:
            duration_seconds = exit_time - entry_time
            durations.append(duration_seconds / 3600)  # Convert to hours

    avg_trade_duration_hours = sum(durations) / len(durations) if durations else 0.0

    # Slippage analysis
    entry_slippages = [t.get("entry_slippage_pct", 0) for t in trades if t.get("entry_slippage_pct") is not None]
    exit_slippages = [t.get("exit_slippage_pct", 0) for t in trades if t.get("exit_slippage_pct") is not None]

    avg_entry_slippage = sum(entry_slippages) / len(entry_slippages) if entry_slippages else 0.0
    avg_exit_slippage = sum(exit_slippages) / len(exit_slippages) if exit_slippages else 0.0
    max_entry_slippage = max(entry_slippages) if entry_slippages else 0.0
    max_exit_slippage = max(exit_slippages) if exit_slippages else 0.0

    return {
        "total_trades": total_trades,
        "winning_trades": winning_count,
        "losing_trades": losing_count,
        "win_rate": round(win_rate, 4),
        "total_pnl": round(total_pnl, 2),
        "total_return_pct": round(total_return_pct, 2),
        "avg_win": round(avg_win, 2),
        "avg_loss": round(avg_loss, 2),
        "largest_win": round(largest_win, 2),
        "largest_loss": round(largest_loss, 2),
        "profit_factor": round(profit_factor, 2),
        "expectancy": round(expectancy, 2),
        "sharpe_ratio": round(sharpe_ratio, 2),
        "max_drawdown": round(max_drawdown, 2),
        "max_drawdown_pct": round(max_drawdown_pct, 2),
        "recovery_factor": round(recovery_factor, 2),
        "avg_trade_duration_hours": round(avg_trade_duration_hours, 2),
        "avg_entry_slippage_pct": round(avg_entry_slippage, 4),
        "avg_exit_slippage_pct": round(avg_exit_slippage, 4),
        "max_entry_slippage_pct": round(max_entry_slippage, 4),
        "max_exit_slippage_pct": round(max_exit_slippage, 4),
    }


def _calculate_sharpe_ratio(returns: List[float], risk_free_rate: float = 0.0) -> float:
    """
    Calculate Sharpe ratio: (mean return - risk free rate) / std dev of returns.

    Higher is better. >1 is good, >2 is very good, >3 is excellent.

    Args:
        returns: List of trade returns (PnL values)
        risk_free_rate: Risk-free rate (annualized, default 0)

    Returns:
        Sharpe ratio
    """
    if not returns or len(returns) < 2:
        return 0.0

    mean_return = sum(returns) / len(returns)
    variance = sum((r - mean_return) ** 2 for r in returns) / len(returns)
    std_dev = math.sqrt(variance)

    if std_dev == 0:
        return 0.0

    sharpe = (mean_return - risk_free_rate) / std_dev
    return sharpe


def _calculate_max_drawdown(returns: List[float]) -> tuple[float, float]:
    """
    Calculate maximum drawdown: largest peak-to-trough decline in cumulative returns.

    Args:
        returns: List of trade returns (PnL values)

    Returns:
        (max_drawdown_absolute, max_drawdown_pct)
    """
    if not returns:
        return 0.0, 0.0

    # Build cumulative PnL curve
    cumulative = []
    running_total = 0.0
    for ret in returns:
        running_total += ret
        cumulative.append(running_total)

    # Find maximum drawdown
    peak = cumulative[0]
    max_dd = 0.0
    max_dd_pct = 0.0

    for value in cumulative:
        if value > peak:
            peak = value

        drawdown = peak - value
        if drawdown > max_dd:
            max_dd = drawdown
            max_dd_pct = (drawdown / peak * 100) if peak > 0 else 0.0

    return max_dd, max_dd_pct


def calculate_monthly_returns(trades: List[dict]) -> dict:
    """
    Group trades by month and calculate monthly PnL.

    Args:
        trades: List of trade dicts with exit_time and realized_pnl

    Returns:
        {
            "2024-01": 123.45,
            "2024-02": -56.78,
            ...
        }
    """
    from datetime import datetime

    monthly_pnl = {}

    for trade in trades:
        exit_time = trade.get("exit_time", 0)
        pnl = trade.get("realized_pnl", 0)

        if exit_time:
            # Convert timestamp to YYYY-MM format
            dt = datetime.fromtimestamp(exit_time)
            month_key = dt.strftime("%Y-%m")

            if month_key not in monthly_pnl:
                monthly_pnl[month_key] = 0.0

            monthly_pnl[month_key] += pnl

    # Round values
    for key in monthly_pnl:
        monthly_pnl[key] = round(monthly_pnl[key], 2)

    return dict(sorted(monthly_pnl.items()))


def calculate_symbol_performance(trades: List[dict]) -> dict:
    """
    Calculate performance metrics per trading symbol.

    Args:
        trades: List of trade dicts with symbol and realized_pnl

    Returns:
        {
            "BTC": {"total_pnl": 123.45, "trade_count": 10, "win_rate": 0.60},
            "ETH": {"total_pnl": -56.78, "trade_count": 8, "win_rate": 0.375},
            ...
        }
    """
    symbol_data = {}

    for trade in trades:
        symbol = trade.get("symbol", "UNKNOWN")
        pnl = trade.get("realized_pnl", 0)

        if symbol not in symbol_data:
            symbol_data[symbol] = {
                "trades": [],
            }

        symbol_data[symbol]["trades"].append(trade)

    # Calculate metrics per symbol
    result = {}
    for symbol, data in symbol_data.items():
        symbol_trades = data["trades"]
        winning = [t for t in symbol_trades if t.get("realized_pnl", 0) > 0]

        result[symbol] = {
            "total_pnl": round(sum(t.get("realized_pnl", 0) for t in symbol_trades), 2),
            "trade_count": len(symbol_trades),
            "win_rate": round(len(winning) / len(symbol_trades), 4) if symbol_trades else 0.0,
        }

    return result


def _empty_metrics() -> dict:
    """Return empty metrics structure when no trades available."""
    return {
        "total_trades": 0,
        "winning_trades": 0,
        "losing_trades": 0,
        "win_rate": 0.0,
        "total_pnl": 0.0,
        "total_return_pct": 0.0,
        "avg_win": 0.0,
        "avg_loss": 0.0,
        "largest_win": 0.0,
        "largest_loss": 0.0,
        "profit_factor": 0.0,
        "expectancy": 0.0,
        "sharpe_ratio": 0.0,
        "max_drawdown": 0.0,
        "max_drawdown_pct": 0.0,
        "recovery_factor": 0.0,
        "avg_trade_duration_hours": 0.0,
    }


def format_performance_report(metrics: dict) -> str:
    """
    Format performance metrics into a human-readable report.

    Args:
        metrics: Dict returned from calculate_performance_metrics()

    Returns:
        Formatted string report
    """
    report = []
    report.append("=" * 60)
    report.append("PERFORMANCE REPORT")
    report.append("=" * 60)
    report.append("")

    report.append("Trade Statistics:")
    report.append(f"  Total Trades: {metrics['total_trades']}")
    report.append(f"  Winning Trades: {metrics['winning_trades']}")
    report.append(f"  Losing Trades: {metrics['losing_trades']}")
    report.append(f"  Win Rate: {metrics['win_rate']:.1%}")
    report.append("")

    report.append("Returns:")
    sign = "+" if metrics['total_pnl'] >= 0 else ""
    report.append(f"  Total PnL: {sign}${metrics['total_pnl']:,.2f}")
    report.append(f"  Total Return: {sign}{metrics['total_return_pct']:.2f}%")
    report.append(f"  Average Win: +${metrics['avg_win']:,.2f}")
    report.append(f"  Average Loss: ${metrics['avg_loss']:,.2f}")
    report.append(f"  Largest Win: +${metrics['largest_win']:,.2f}")
    report.append(f"  Largest Loss: ${metrics['largest_loss']:,.2f}")
    report.append("")

    report.append("Risk Metrics:")
    report.append(f"  Profit Factor: {metrics['profit_factor']:.2f}")
    report.append(f"  Expectancy: ${metrics['expectancy']:,.2f} per trade")
    report.append(f"  Sharpe Ratio: {metrics['sharpe_ratio']:.2f}")
    report.append(f"  Max Drawdown: ${metrics['max_drawdown']:,.2f} ({metrics['max_drawdown_pct']:.2f}%)")
    report.append(f"  Recovery Factor: {metrics['recovery_factor']:.2f}")
    report.append("")

    report.append("Trade Duration:")
    report.append(f"  Average: {metrics['avg_trade_duration_hours']:.2f} hours")
    report.append("")

    # Slippage metrics (if available)
    if metrics.get('avg_entry_slippage_pct') is not None or metrics.get('avg_exit_slippage_pct') is not None:
        report.append("Slippage Analysis:")
        if metrics.get('avg_entry_slippage_pct') is not None:
            report.append(f"  Avg Entry Slippage: {metrics['avg_entry_slippage_pct']:.2f}%")
            report.append(f"  Max Entry Slippage: {metrics['max_entry_slippage_pct']:.2f}%")
        if metrics.get('avg_exit_slippage_pct') is not None:
            report.append(f"  Avg Exit Slippage: {metrics['avg_exit_slippage_pct']:.2f}%")
            report.append(f"  Max Exit Slippage: {metrics['max_exit_slippage_pct']:.2f}%")
        report.append("")

    report.append("=" * 60)

    return "\n".join(report)
