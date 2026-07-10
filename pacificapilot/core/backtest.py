"""
Backtesting framework — test trading strategies on historical data.

Load historical market data, simulate trades, track performance.
Uses the same trading core functions as live trading for consistency.
"""

import time
from typing import List, Optional, Callable
from datetime import datetime, timedelta
import requests

BINANCE_BASE = "https://api.binance.com/api/v3"

_session = requests.Session()
_session.headers.update({
    "Accept": "application/json",
    "User-Agent": "PacificaPilot/0.1.0"
})


class HistoricalData:
    """Container for historical market data."""

    def __init__(self, symbol: str, interval: str, start_time: int, end_time: int):
        """
        Initialize historical data.

        Args:
            symbol: Market symbol (e.g., "BTC")
            interval: Kline interval (e.g., "5m", "1h", "1d")
            start_time: Start timestamp (unix seconds)
            end_time: End timestamp (unix seconds)
        """
        self.symbol = symbol
        self.interval = interval
        self.start_time = start_time
        self.end_time = end_time
        self.candles = []

    def load_from_binance(self) -> bool:
        """
        Load historical klines from Binance.

        Returns:
            True if successful, False otherwise
        """
        binance_symbol = f"{self.symbol}USDT"
        all_klines = []

        # Binance returns max 1000 candles per request
        current_start = self.start_time * 1000  # Convert to milliseconds
        end_ms = self.end_time * 1000

        while current_start < end_ms:
            try:
                r = _session.get(
                    f"{BINANCE_BASE}/klines",
                    params={
                        "symbol": binance_symbol,
                        "interval": self.interval,
                        "startTime": current_start,
                        "endTime": end_ms,
                        "limit": 1000,
                    },
                    timeout=15,
                )
                r.raise_for_status()
                klines = r.json()

                if not klines:
                    break

                all_klines.extend(klines)

                # Move to next batch
                current_start = klines[-1][0] + 1

                # Rate limiting
                time.sleep(0.1)

            except Exception as e:
                print(f"[Backtest] Error loading data: {e}")
                return False

        # Convert to structured format
        for k in all_klines:
            self.candles.append({
                "timestamp": k[0] // 1000,  # Convert to seconds
                "open": float(k[1]),
                "high": float(k[2]),
                "low": float(k[3]),
                "close": float(k[4]),
                "volume": float(k[5]),
            })

        print(f"[Backtest] Loaded {len(self.candles)} candles for {self.symbol} ({self.interval})")
        return len(self.candles) > 0


class BacktestPosition:
    """Represents an open position during backtesting."""

    def __init__(
        self,
        symbol: str,
        side: str,
        entry_price: float,
        quantity: float,
        entry_time: int,
    ):
        self.symbol = symbol
        self.side = side
        self.entry_price = entry_price
        self.quantity = quantity
        self.entry_time = entry_time
        self.trailing_high = entry_price if side == "bid" else None
        self.trailing_low = entry_price if side == "ask" else None


class Backtester:
    """
    Backtesting engine for trading strategies.

    Simulates trades on historical data and tracks performance.
    """

    def __init__(
        self,
        initial_capital: float = 10000.0,
        max_position_usdc: float = 1000.0,
        stop_loss_pct: float = 5.0,
        take_profit_pct: float = 10.0,
    ):
        """
        Initialize backtester.

        Args:
            initial_capital: Starting USDC balance
            max_position_usdc: Max position size per trade
            stop_loss_pct: Stop loss percentage
            take_profit_pct: Take profit percentage
        """
        self.initial_capital = initial_capital
        self.capital = initial_capital
        self.max_position_usdc = max_position_usdc
        self.stop_loss_pct = stop_loss_pct
        self.take_profit_pct = take_profit_pct

        # State tracking
        self.positions: dict[str, BacktestPosition] = {}
        self.trades: List[dict] = []
        self.decisions: List[dict] = []
        self.equity_curve: List[tuple[int, float]] = []

    def run(
        self,
        historical_data: HistoricalData,
        strategy_fn: Callable[[dict, dict], dict],
        min_confidence: float = 0.6,
    ) -> dict:
        """
        Run backtest on historical data.

        Args:
            historical_data: HistoricalData object with loaded candles
            strategy_fn: Strategy function that takes (candle, context) and returns decision dict
                Decision format: {"action": "LONG"|"SHORT"|"HOLD", "confidence": float, "reasoning": str}
            min_confidence: Minimum confidence to place trades

        Returns:
            Backtest results dict with trades, metrics, equity curve
        """
        print(f"\n[Backtest] Starting backtest for {historical_data.symbol}")
        print(f"  Initial capital: ${self.capital:,.2f}")
        print(f"  Candles: {len(historical_data.candles)}")
        print(f"  Period: {datetime.fromtimestamp(historical_data.start_time)} to {datetime.fromtimestamp(historical_data.end_time)}")

        for i, candle in enumerate(historical_data.candles):
            current_price = candle["close"]
            timestamp = candle["timestamp"]

            # Update equity curve
            unrealized_pnl = self._calculate_unrealized_pnl(current_price)
            equity = self.capital + unrealized_pnl
            self.equity_curve.append((timestamp, equity))

            # Check for exit conditions on open positions
            self._check_exits(historical_data.symbol, current_price, timestamp)

            # Get strategy decision (only if no open position)
            if historical_data.symbol not in self.positions:
                context = {
                    "capital": self.capital,
                    "equity": equity,
                    "trades": self.trades,
                    "max_position_usdc": self.max_position_usdc,
                }

                decision = strategy_fn(candle, context)
                self.decisions.append({
                    "timestamp": timestamp,
                    "symbol": historical_data.symbol,
                    "price": current_price,
                    **decision,
                })

                # Execute trade if conditions met
                if decision["action"] in ("LONG", "SHORT") and decision["confidence"] >= min_confidence:
                    self._execute_trade(
                        symbol=historical_data.symbol,
                        side="bid" if decision["action"] == "LONG" else "ask",
                        price=current_price,
                        timestamp=timestamp,
                        confidence=decision["confidence"],
                    )

            # Progress indicator
            if (i + 1) % 100 == 0 or i == len(historical_data.candles) - 1:
                progress = (i + 1) / len(historical_data.candles) * 100
                print(f"  Progress: {progress:.1f}% | Equity: ${equity:,.2f} | Trades: {len(self.trades)}")

        # Close any remaining positions at final price
        if self.positions:
            final_candle = historical_data.candles[-1]
            for symbol in list(self.positions.keys()):
                self._close_position(symbol, final_candle["close"], final_candle["timestamp"], "Backtest ended")

        # Calculate performance metrics
        from .analytics import calculate_performance_metrics

        metrics = calculate_performance_metrics(self.trades)

        return {
            "trades": self.trades,
            "decisions": self.decisions,
            "equity_curve": self.equity_curve,
            "metrics": metrics,
            "final_capital": self.capital,
            "total_return": self.capital - self.initial_capital,
            "total_return_pct": ((self.capital - self.initial_capital) / self.initial_capital) * 100,
        }

    def _execute_trade(
        self,
        symbol: str,
        side: str,
        price: float,
        timestamp: int,
        confidence: float,
    ):
        """Execute a trade (open position)."""
        # Calculate position size
        position_size_usdc = min(self.max_position_usdc, self.capital * 0.9)

        if position_size_usdc < 10:
            return  # Too small to trade

        # Calculate quantity
        quantity = position_size_usdc / price

        # Deduct from capital (simulating margin usage)
        self.capital -= position_size_usdc

        # Open position
        self.positions[symbol] = BacktestPosition(
            symbol=symbol,
            side=side,
            entry_price=price,
            quantity=quantity,
            entry_time=timestamp,
        )

        print(f"  [{datetime.fromtimestamp(timestamp)}] OPEN {side.upper()}: {quantity:.4f} {symbol} @ ${price:,.2f}")

    def _close_position(self, symbol: str, price: float, timestamp: int, reason: str):
        """Close an open position."""
        if symbol not in self.positions:
            return

        position = self.positions[symbol]

        # Calculate PnL
        if position.side == "bid":
            pnl = (price - position.entry_price) * position.quantity
        else:
            pnl = (position.entry_price - price) * position.quantity

        # Return capital + PnL
        position_value = position.quantity * price
        self.capital += position_value

        # Record trade
        self.trades.append({
            "symbol": symbol,
            "side": position.side,
            "entry_price": position.entry_price,
            "exit_price": price,
            "quantity": position.quantity,
            "realized_pnl": pnl,
            "entry_time": position.entry_time,
            "exit_time": timestamp,
            "exit_reason": reason,
        })

        print(f"  [{datetime.fromtimestamp(timestamp)}] CLOSE {position.side.upper()}: {reason} | PnL: ${pnl:,.2f}")

        # Remove position
        del self.positions[symbol]

    def _check_exits(self, symbol: str, current_price: float, timestamp: int):
        """Check if any positions should be closed (SL/TP)."""
        if symbol not in self.positions:
            return

        position = self.positions[symbol]

        # Update trailing stops
        if position.side == "bid":
            if position.trailing_high is None or current_price > position.trailing_high:
                position.trailing_high = current_price
        else:
            if position.trailing_low is None or current_price < position.trailing_low:
                position.trailing_low = current_price

        # Check exit conditions
        from .trading import should_exit_position

        should_exit, reason = should_exit_position(
            symbol=symbol,
            current_price=current_price,
            entry_price=position.entry_price,
            side=position.side,
            stop_loss_pct=self.stop_loss_pct,
            take_profit_pct=self.take_profit_pct,
            trailing_high=position.trailing_high,
            trailing_low=position.trailing_low,
        )

        if should_exit:
            self._close_position(symbol, current_price, timestamp, reason)

    def _calculate_unrealized_pnl(self, current_price: float) -> float:
        """Calculate total unrealized PnL from open positions."""
        total = 0.0
        for position in self.positions.values():
            if position.side == "bid":
                pnl = (current_price - position.entry_price) * position.quantity
            else:
                pnl = (position.entry_price - current_price) * position.quantity
            total += pnl
        return total


def simple_rsi_strategy(candle: dict, context: dict) -> dict:
    """
    Simple RSI-based strategy for backtesting.

    Strategy:
    - LONG when RSI < 30 (oversold)
    - SHORT when RSI > 70 (overbought)
    - HOLD otherwise

    Args:
        candle: Current candle data
        context: Backtest context (capital, trades, etc.)

    Returns:
        Decision dict
    """
    # This is a placeholder - in real backtesting, you'd calculate RSI from historical candles
    # For now, return HOLD to demonstrate the framework
    return {
        "action": "HOLD",
        "confidence": 0.5,
        "reasoning": "Simple strategy placeholder",
    }


def load_historical_data(
    symbol: str,
    days_back: int = 30,
    interval: str = "1h",
) -> Optional[HistoricalData]:
    """
    Load historical data for backtesting.

    Args:
        symbol: Market symbol (e.g., "BTC")
        days_back: Number of days of history to load
        interval: Candle interval (e.g., "5m", "1h", "1d")

    Returns:
        HistoricalData object with loaded candles, or None on failure
    """
    end_time = int(time.time())
    start_time = end_time - (days_back * 86400)

    data = HistoricalData(
        symbol=symbol,
        interval=interval,
        start_time=start_time,
        end_time=end_time,
    )

    if data.load_from_binance():
        return data

    return None


def run_simple_backtest(
    symbol: str = "BTC",
    days_back: int = 30,
    initial_capital: float = 10000.0,
) -> dict:
    """
    Run a simple backtest with default parameters.

    Args:
        symbol: Market symbol
        days_back: Days of history to test
        initial_capital: Starting capital

    Returns:
        Backtest results dict
    """
    # Load data
    print(f"[Backtest] Loading {days_back} days of data for {symbol}...")
    data = load_historical_data(symbol, days_back, interval="1h")

    if not data:
        return {"error": "Failed to load historical data"}

    # Create backtester
    backtester = Backtester(
        initial_capital=initial_capital,
        max_position_usdc=1000.0,
        stop_loss_pct=5.0,
        take_profit_pct=10.0,
    )

    # Run backtest
    results = backtester.run(
        historical_data=data,
        strategy_fn=simple_rsi_strategy,
        min_confidence=0.6,
    )

    # Print summary
    from .analytics import format_performance_report

    print("\n" + format_performance_report(results["metrics"]))
    print(f"\nFinal Capital: ${results['final_capital']:,.2f}")
    print(f"Total Return: ${results['total_return']:,.2f} ({results['total_return_pct']:.2f}%)")

    return results
