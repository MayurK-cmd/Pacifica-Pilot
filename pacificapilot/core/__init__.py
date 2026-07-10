"""
Shared trading core — market data, order execution, position management, risk checks.

This module is pure logic with no agent-specific concerns. Both Loop Agent and Chat Agent
call into these functions.
"""

from .trading import (
    place_order,
    place_limit_order,
    close_position,
    get_open_positions,
    get_account_info,
    should_exit_position,
    compute_pnl,
)
from .market_data import (
    get_market_snapshot,
    fetch_pacifica_price,
    fetch_binance_fallback,
)
from .risk import (
    check_position_limit,
    calculate_position_size,
    validate_order_params,
    calculate_kelly_criterion,
    calculate_kelly_position_size,
    calculate_risk_adjusted_size,
)
from .analytics import (
    calculate_performance_metrics,
    calculate_monthly_returns,
    calculate_symbol_performance,
    format_performance_report,
)
from .backtest import (
    Backtester,
    HistoricalData,
    load_historical_data,
    run_simple_backtest,
)
from .slippage import (
    calculate_slippage_pct,
    calculate_avg_slippage,
)
from .portfolio import (
    calculate_correlation,
    calculate_portfolio_correlation_matrix,
    check_portfolio_exposure,
    check_correlation_risk,
    calculate_diversification_score,
    get_portfolio_risk_metrics,
)
from .pacifica_api import (
    get_trade_history,
    get_account_equity_history,
    get_funding_history,
    get_account_balance_history,
    get_market_prices,
    get_market_volume,
)

__all__ = [
    # Trading
    "place_order",
    "place_limit_order",
    "close_position",
    "get_open_positions",
    "get_account_info",
    "should_exit_position",
    "compute_pnl",
    # Market data
    "get_market_snapshot",
    "fetch_pacifica_price",
    "fetch_binance_fallback",
    # Risk management
    "check_position_limit",
    "calculate_position_size",
    "validate_order_params",
    "calculate_kelly_criterion",
    "calculate_kelly_position_size",
    "calculate_risk_adjusted_size",
    # Analytics
    "calculate_performance_metrics",
    "calculate_monthly_returns",
    "calculate_symbol_performance",
    "format_performance_report",
    # Backtesting
    "Backtester",
    "HistoricalData",
    "load_historical_data",
    "run_simple_backtest",
    # Slippage
    "calculate_slippage_pct",
    "calculate_avg_slippage",
    # Portfolio
    "calculate_correlation",
    "calculate_portfolio_correlation_matrix",
    "check_portfolio_exposure",
    "check_correlation_risk",
    "calculate_diversification_score",
    "get_portfolio_risk_metrics",
    # Pacifica API
    "get_trade_history",
    "get_account_equity_history",
    "get_funding_history",
    "get_account_balance_history",
    "get_market_prices",
    "get_market_volume",
]
