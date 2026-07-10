"""
Additional command handlers for performance, analytics, backtest, portfolio, and account.
These are imported by repl.py to keep the main file focused.
"""

from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich import box
from typing import List
import statistics


def cmd_performance_impl(console, args: list, get_recent_trades, PACIFICA_BLUE, PACIFICA_FG, PACIFICA_GREEN, PACIFICA_RED, PACIFICA_BORDER, PACIFICA_MUTED):
    """Show performance metrics from live Pacifica trade history."""
    from ..core.pacifica_api import get_trade_history
    from ..storage.config import load_secrets

    limit = 50
    if args and args[0].isdigit():
        limit = int(args[0])

    secrets = load_secrets()
    wallet = secrets.get("PACIFICA_PUBLIC_KEY")

    if not wallet:
        console.print(f"\n[yellow]No Pacifica wallet configured[/yellow]\n")
        return

    trades = get_trade_history(wallet, limit=limit) or []

    if not trades:
        console.print(f"\n[{PACIFICA_MUTED}]No trade history for performance analysis[/{PACIFICA_MUTED}]\n")
        return

    # Calculate metrics - use 'pnl' field from Pacifica
    pnls = [float(t.get("pnl", 0)) for t in trades]
    total_pnl = sum(pnls)
    num_trades = len(trades)
    winning_trades = [p for p in pnls if p > 0]
    losing_trades = [p for p in pnls if p < 0]

    win_rate = len(winning_trades) / num_trades * 100 if num_trades > 0 else 0
    avg_win = statistics.mean(winning_trades) if winning_trades else 0
    avg_loss = abs(statistics.mean(losing_trades)) if losing_trades else 0
    profit_factor = sum(winning_trades) / abs(sum(losing_trades)) if losing_trades and sum(losing_trades) != 0 else 0

    # Sharpe ratio approximation (simplified)
    if len(pnls) > 1:
        returns_mean = statistics.mean(pnls)
        returns_std = statistics.stdev(pnls)
        sharpe = (returns_mean / returns_std) * (252 ** 0.5) if returns_std != 0 else 0
    else:
        sharpe = 0

    # Max drawdown (simplified)
    cumulative = 0
    peak = 0
    max_dd = 0
    for pnl in pnls:
        cumulative += pnl
        if cumulative > peak:
            peak = cumulative
        drawdown = peak - cumulative
        if drawdown > max_dd:
            max_dd = drawdown

    # Create performance table
    table = Table(title=f"Performance Metrics (Last {num_trades} Trades)", box=box.ROUNDED, border_style=PACIFICA_BORDER)
    table.add_column("Metric", style=f"bold {PACIFICA_BLUE}")
    table.add_column("Value", style=PACIFICA_FG, justify="right")

    pnl_color = PACIFICA_GREEN if total_pnl >= 0 else PACIFICA_RED
    table.add_row("Total PnL", f"[{pnl_color}]${total_pnl:,.2f}[/{pnl_color}]")
    table.add_row("Total Trades", str(num_trades))
    table.add_row("Winning Trades", f"[{PACIFICA_GREEN}]{len(winning_trades)}[/{PACIFICA_GREEN}]")
    table.add_row("Losing Trades", f"[{PACIFICA_RED}]{len(losing_trades)}[/{PACIFICA_RED}]")

    table.add_section()
    wr_color = PACIFICA_GREEN if win_rate >= 50 else PACIFICA_RED
    table.add_row("Win Rate", f"[{wr_color}]{win_rate:.1f}%[/{wr_color}]")
    table.add_row("Avg Win", f"[{PACIFICA_GREEN}]${avg_win:,.2f}[/{PACIFICA_GREEN}]")
    table.add_row("Avg Loss", f"[{PACIFICA_RED}]${avg_loss:,.2f}[/{PACIFICA_RED}]")

    table.add_section()
    pf_color = PACIFICA_GREEN if profit_factor >= 1 else PACIFICA_RED
    table.add_row("Profit Factor", f"[{pf_color}]{profit_factor:.2f}[/{pf_color}]")
    sharpe_color = PACIFICA_GREEN if sharpe >= 1 else PACIFICA_MUTED if sharpe >= 0 else PACIFICA_RED
    table.add_row("Sharpe Ratio", f"[{sharpe_color}]{sharpe:.2f}[/{sharpe_color}]")
    table.add_row("Max Drawdown", f"[{PACIFICA_RED}]${max_dd:,.2f}[/{PACIFICA_RED}]")

    console.print()
    console.print(table)
    console.print(f"\n[dim]Use [bold]/performance <n>[/bold] to analyze more trades[/dim]\n")


def cmd_analytics_impl(console, args: list, get_recent_trades, PACIFICA_BLUE, PACIFICA_FG, PACIFICA_GREEN, PACIFICA_RED, PACIFICA_BORDER, PACIFICA_MUTED):
    """Show detailed analytics from live Pacifica trade history."""
    from datetime import datetime
    from collections import defaultdict
    from ..core.pacifica_api import get_trade_history
    from ..storage.config import load_secrets

    symbol = args[0] if args else None

    secrets = load_secrets()
    wallet = secrets.get("PACIFICA_PUBLIC_KEY")

    if not wallet:
        console.print(f"\n[yellow]No Pacifica wallet configured[/yellow]\n")
        return

    # Fetch live trades from Pacifica
    all_trades = get_trade_history(wallet, limit=100) or []

    if symbol:
        trades = [t for t in all_trades if t.get("symbol") == symbol.upper()]
    else:
        trades = all_trades

    if not trades:
        console.print(f"\n[{PACIFICA_MUTED}]No trade history for analytics[/{PACIFICA_MUTED}]\n")
        return

    # Group by month
    monthly_pnl = defaultdict(float)
    symbol_pnl = defaultdict(float)

    for trade in trades:
        pnl = float(trade.get("pnl", 0))
        timestamp = trade.get("created_at", 0) / 1000 if trade.get("created_at") else 0  # ms to seconds

        # Monthly PnL
        if timestamp:
            month = datetime.fromtimestamp(timestamp).strftime("%Y-%m")
            monthly_pnl[month] += pnl

        # Symbol PnL
        sym = trade.get("symbol", "UNKNOWN")
        symbol_pnl[sym] += pnl

    # Monthly returns table
    table = Table(title=f"Monthly Returns{f' for {symbol}' if symbol else ''}", box=box.ROUNDED, border_style=PACIFICA_BORDER)
    table.add_column("Month", style=f"bold {PACIFICA_BLUE}")
    table.add_column("PnL", style=PACIFICA_FG, justify="right")
    table.add_column("Trades", style=PACIFICA_FG, justify="right")

    for month in sorted(monthly_pnl.keys(), reverse=True):
        pnl = monthly_pnl[month]
        month_trades = sum(
            1 for t in trades
            if t.get("created_at")
            and datetime.fromtimestamp(t["created_at"] / 1000).strftime("%Y-%m") == month
        )
        pnl_color = PACIFICA_GREEN if pnl >= 0 else PACIFICA_RED
        table.add_row(month, f"[{pnl_color}]${pnl:,.2f}[/{pnl_color}]", str(month_trades))

    console.print()
    console.print(table)

    # Symbol breakdown
    if not symbol:
        table2 = Table(title="Performance by Symbol", box=box.ROUNDED, border_style=PACIFICA_BORDER)
        table2.add_column("Symbol", style=f"bold {PACIFICA_BLUE}")
        table2.add_column("PnL", style=PACIFICA_FG, justify="right")
        table2.add_column("Trades", style=PACIFICA_FG, justify="right")

        for sym in sorted(symbol_pnl.keys()):
            pnl = symbol_pnl[sym]
            sym_trades = sum(1 for t in trades if t.get("symbol") == sym)
            pnl_color = PACIFICA_GREEN if pnl >= 0 else PACIFICA_RED
            table2.add_row(sym, f"[{pnl_color}]${pnl:,.2f}[/{pnl_color}]", str(sym_trades))

        console.print()
        console.print(table2)

    console.print(f"\n[dim]Use [bold]/analytics <symbol>[/bold] to filter by symbol[/dim]\n")


def cmd_backtest_impl(console, args: list, PACIFICA_BLUE, PACIFICA_RED, PACIFICA_MUTED, PACIFICA_GREEN):
    """Run backtest on historical data."""
    if len(args) < 2:
        console.print(f"\n[yellow]Usage: /backtest <symbol> <days>[/yellow]")
        console.print(f"[dim]Example: [bold]/backtest BTC 30[/bold][/dim]\n")
        return

    symbol = args[0].upper()
    try:
        days = int(args[1])
    except ValueError:
        console.print(f"\n[{PACIFICA_RED}]Invalid number of days: {args[1]}[/{PACIFICA_RED}]\n")
        return

    console.print(f"\n[{PACIFICA_BLUE}]Running backtest for {symbol} over {days} days...[/{PACIFICA_BLUE}]\n")

    try:
        from ..core.backtest import run_simple_backtest

        results = run_simple_backtest(symbol=symbol, days_back=days, initial_capital=10000.0)

        if "error" in results:
            console.print(f"\n[{PACIFICA_RED}]Backtest failed: {results['error']}[/{PACIFICA_RED}]\n")
            return

        # Display results
        metrics = results.get("metrics", {})
        trades = results.get("trades", [])

        # Summary table
        table = Table(title=f"Backtest Results: {symbol} ({days} days)", box=box.ROUNDED, border_style=f"{PACIFICA_BLUE}")
        table.add_column("Metric", style=f"bold {PACIFICA_BLUE}")
        table.add_column("Value", justify="right")

        # Capital metrics
        final_capital = results.get("final_capital", 0)
        total_return = results.get("total_return", 0)
        total_return_pct = results.get("total_return_pct", 0)

        return_color = PACIFICA_GREEN if total_return >= 0 else PACIFICA_RED
        table.add_row("Initial Capital", f"${10000:,.2f}")
        table.add_row("Final Capital", f"[{return_color}]${final_capital:,.2f}[/{return_color}]")
        table.add_row("Total Return", f"[{return_color}]${total_return:,.2f} ({total_return_pct:+.2f}%)[/{return_color}]")

        # Trade metrics
        table.add_section()
        table.add_row("Total Trades", str(len(trades)))

        if metrics:
            win_rate = metrics.get("win_rate", 0)
            wr_color = PACIFICA_GREEN if win_rate >= 50 else PACIFICA_RED
            table.add_row("Win Rate", f"[{wr_color}]{win_rate:.1f}%[/{wr_color}]")

            avg_win = metrics.get("avg_win", 0)
            avg_loss = metrics.get("avg_loss", 0)
            table.add_row("Avg Win", f"[{PACIFICA_GREEN}]${avg_win:,.2f}[/{PACIFICA_GREEN}]")
            table.add_row("Avg Loss", f"[{PACIFICA_RED}]${avg_loss:,.2f}[/{PACIFICA_RED}]")

            profit_factor = metrics.get("profit_factor", 0)
            pf_color = PACIFICA_GREEN if profit_factor >= 1 else PACIFICA_RED
            table.add_row("Profit Factor", f"[{pf_color}]{profit_factor:.2f}[/{pf_color}]")

        console.print(table)
        console.print(f"\n[dim]Backtest complete. See output above for details.[/dim]\n")

    except ImportError as e:
        console.print(f"\n[{PACIFICA_RED}]Failed to import backtest module: {e}[/{PACIFICA_RED}]\n")
    except Exception as e:
        console.print(f"\n[{PACIFICA_RED}]Backtest error: {e}[/{PACIFICA_RED}]\n")


def cmd_portfolio_impl(console, get_all_positions, load_config, PACIFICA_BLUE, PACIFICA_FG, PACIFICA_GREEN, PACIFICA_RED, PACIFICA_BORDER, PACIFICA_MUTED):
    """Show portfolio risk metrics from live Pacifica positions."""
    from ..core.trading import get_open_positions
    from ..storage.config import load_secrets

    secrets = load_secrets()
    wallet = secrets.get("PACIFICA_PUBLIC_KEY")

    if not wallet:
        console.print(f"\n[yellow]No Pacifica wallet configured[/yellow]\n")
        return

    # Fetch live positions from Pacifica API
    positions_dict = get_open_positions(wallet)
    config = load_config()

    if not positions_dict:
        console.print(f"\n[{PACIFICA_MUTED}]No open positions for portfolio analysis[/{PACIFICA_MUTED}]\n")
        return

    # Convert to list for processing
    positions = list(positions_dict.values())

    # Calculate portfolio metrics using entry_price * amount as exposure proxy
    total_exposure = sum(
        float(p.get("entry_price", 0)) * float(p.get("amount", 0))
        for p in positions
    )
    max_exposure = config.get("max_portfolio_exposure_usdc", 1000.0)
    exposure_pct = (total_exposure / max_exposure * 100) if max_exposure > 0 else 0

    num_positions = len(positions)
    symbols = [p["symbol"] for p in positions]

    # Directional breakdown
    long_exposure = sum(
        float(p.get("entry_price", 0)) * float(p.get("amount", 0))
        for p in positions if p.get("side") == "bid"
    )
    short_exposure = sum(
        float(p.get("entry_price", 0)) * float(p.get("amount", 0))
        for p in positions if p.get("side") == "ask"
    )
    net_exposure = long_exposure - short_exposure

    # Total unrealized PnL
    total_unrealized = sum(float(p.get("unrealized_pnl", 0)) for p in positions)

    # Portfolio metrics table
    table = Table(title="Portfolio Risk Metrics", box=box.ROUNDED, border_style=PACIFICA_BORDER)
    table.add_column("Metric", style=f"bold {PACIFICA_BLUE}")
    table.add_column("Value", style=PACIFICA_FG, justify="right")

    table.add_row("Total Positions", str(num_positions))
    table.add_row("Symbols", ", ".join(symbols))

    table.add_section()
    exp_color = PACIFICA_RED if exposure_pct > 80 else PACIFICA_GREEN if exposure_pct < 50 else PACIFICA_MUTED
    table.add_row("Total Exposure", f"${total_exposure:,.2f}")
    table.add_row("Max Allowed", f"${max_exposure:,.2f}")
    table.add_row("Utilization", f"[{exp_color}]{exposure_pct:.1f}%[/{exp_color}]")

    table.add_section()
    table.add_row("Long Exposure", f"[{PACIFICA_GREEN}]${long_exposure:,.2f}[/{PACIFICA_GREEN}]")
    table.add_row("Short Exposure", f"[{PACIFICA_RED}]${short_exposure:,.2f}[/{PACIFICA_RED}]")
    net_color = PACIFICA_GREEN if net_exposure >= 0 else PACIFICA_RED
    table.add_row("Net Exposure", f"[{net_color}]${net_exposure:,.2f}[/{net_color}]")

    table.add_section()
    upnl_color = PACIFICA_GREEN if total_unrealized >= 0 else PACIFICA_RED
    upnl_sign = "+" if total_unrealized >= 0 else ""
    table.add_row("Unrealized PnL", f"[{upnl_color}]{upnl_sign}${total_unrealized:,.2f}[/{upnl_color}]")

    console.print()
    console.print(table)
    console.print(f"\n[dim]Correlation matrix requires more historical data[/dim]\n")


def cmd_account_impl(console, args: list, PACIFICA_BLUE, PACIFICA_MUTED, PACIFICA_GREEN, PACIFICA_RED, PACIFICA_FG, PACIFICA_BORDER):
    """Show account stats from Pacifica."""
    days = 30
    if args and args[0].isdigit():
        days = int(args[0])

    console.print(f"\n[{PACIFICA_BLUE}]Fetching account data from Pacifica API...[/{PACIFICA_BLUE}]\n")

    try:
        from ..core.pacifica_api import (
            get_trade_history,
            get_account_equity_history,
            get_funding_history,
        )
        from ..core.trading import get_account_info
        from ..storage.config import load_secrets

        secrets = load_secrets()
        wallet = secrets.get("PACIFICA_PUBLIC_KEY")

        if not wallet:
            console.print(f"\n[yellow]No Pacifica wallet configured[/yellow]")
            console.print(f"[dim]Use [bold]/apikey pacifica_public <address>[/bold] to configure[/dim]\n")
            return

        # Fetch data
        time_range = f"{days}d"

        equity_data = get_account_equity_history(wallet, time_range)
        trade_data = get_trade_history(wallet, limit=50)
        funding_data = get_funding_history(wallet, limit=20)
        account_info = get_account_info(wallet)

        # Display equity summary
        if equity_data:
            summary = equity_data.get("summary", {})
            total_pnl = summary.get("total_pnl", 0)
            total_return_pct = summary.get("total_return_pct", 0)

            table = Table(title=f"Account Summary (Last {days} days)", box=box.ROUNDED, border_style=PACIFICA_BORDER)
            table.add_column("Metric", style=f"bold {PACIFICA_BLUE}")
            table.add_column("Value", style=PACIFICA_FG, justify="right")

            pnl_color = PACIFICA_GREEN if total_pnl >= 0 else PACIFICA_RED
            table.add_row("Wallet", wallet[:8] + "..." + wallet[-6:])
            table.add_row("Total PnL", f"[{pnl_color}]${total_pnl:,.2f}[/{pnl_color}]")
            table.add_row("Return", f"[{pnl_color}]{total_return_pct:+.2f}%[/{pnl_color}]")

            console.print(table)
            console.print()
        else:
            console.print(f"[{PACIFICA_MUTED}]No equity history available[/{PACIFICA_MUTED}]\n")

        # Display account balances (USDC + token holdings)
        if account_info:
            table = Table(title="Account Balances", box=box.ROUNDED, border_style=PACIFICA_BORDER)
            table.add_column("Asset", style=f"bold {PACIFICA_BLUE}")
            table.add_column("Amount", style=PACIFICA_FG, justify="right")
            table.add_column("USD Value", style=PACIFICA_FG, justify="right")

            # USDC balance
            usdc_balance = float(account_info.get("balance", 0))
            table.add_row("USDC", f"{usdc_balance:,.2f}", f"${usdc_balance:,.2f}")

            # Spot token balances
            spot_balances = account_info.get("spot_balances", [])
            for balance in spot_balances:
                symbol = balance.get("symbol", "UNKNOWN")
                amount = float(balance.get("amount", 0))
                # Try to get USD value if provided, else skip
                table.add_row(symbol, f"{amount:.8f}", "-")

            console.print(table)
            console.print()

        # Display recent trades
        if trade_data:
            table = Table(title="Recent Trades", box=box.ROUNDED, border_style=PACIFICA_BORDER)
            table.add_column("Symbol", style=f"bold {PACIFICA_BLUE}")
            table.add_column("Side", style=PACIFICA_FG)
            table.add_column("Size", style=PACIFICA_FG, justify="right")
            table.add_column("PnL", style=PACIFICA_FG, justify="right")

            for trade in trade_data[:10]:
                symbol = trade.get("symbol", "UNKNOWN")
                side = trade.get("side", "UNKNOWN").upper()
                size = float(trade.get("size", 0))
                pnl = float(trade.get("pnl", 0))

                side_color = PACIFICA_GREEN if side == "BID" else PACIFICA_RED
                pnl_color = PACIFICA_GREEN if pnl >= 0 else PACIFICA_RED

                table.add_row(
                    symbol,
                    f"[{side_color}]{side}[/{side_color}]",
                    f"{size:.4f}",
                    f"[{pnl_color}]${pnl:,.2f}[/{pnl_color}]"
                )

            console.print(table)
            console.print()
        else:
            console.print(f"[{PACIFICA_MUTED}]No trade history available[/{PACIFICA_MUTED}]\n")

        # Display funding payments
        if funding_data:
            table = Table(title="Recent Funding Payments", box=box.ROUNDED, border_style=PACIFICA_BORDER)
            table.add_column("Symbol", style=f"bold {PACIFICA_BLUE}")
            table.add_column("Rate", style=PACIFICA_FG, justify="right")
            table.add_column("Payment", style=PACIFICA_FG, justify="right")

            for payment in funding_data[:5]:
                symbol = payment.get("symbol", "UNKNOWN")
                rate = float(payment.get("rate", 0))
                amount = float(payment.get("amount", 0))

                payment_color = PACIFICA_GREEN if amount >= 0 else PACIFICA_RED

                table.add_row(
                    symbol,
                    f"{rate:.6f}",
                    f"[{payment_color}]${amount:,.2f}[/{payment_color}]"
                )

            console.print(table)
            console.print()
        else:
            console.print(f"[{PACIFICA_MUTED}]No funding history available[/{PACIFICA_MUTED}]\n")

    except ImportError as e:
        console.print(f"\n[yellow]Failed to import Pacifica API module: {e}[/yellow]\n")
    except Exception as e:
        console.print(f"\n[yellow]Account data fetch error: {e}[/yellow]")
        console.print(f"[dim]Make sure you're connected to the internet and the Pacifica API is accessible[/dim]\n")
