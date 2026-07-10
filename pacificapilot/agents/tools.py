"""
Trading tools for AI chat agent with tool-calling support.

Defines the tool schemas and handler functions for natural language trading.
"""

from typing import Optional, Callable
from datetime import datetime
import json


# Tool definitions for Anthropic Claude tool use
TRADING_TOOLS = [
    {
        "name": "place_order",
        "description": "Place a market order to open a LONG or SHORT position on a symbol. Use this when the user wants to open/enter a position, buy, or go long/short.",
        "input_schema": {
            "type": "object",
            "properties": {
                "symbol": {
                    "type": "string",
                    "description": "Market symbol (e.g., 'BTC', 'ETH', 'SOL')",
                },
                "side": {
                    "type": "string",
                    "enum": ["LONG", "SHORT"],
                    "description": "Position direction: LONG (buy/bullish) or SHORT (sell/bearish)",
                },
                "usdc_size": {
                    "type": "number",
                    "description": "Position size in USDC (e.g., 100.0 for $100)",
                },
            },
            "required": ["symbol", "side", "usdc_size"],
        },
    },
    {
        "name": "close_position",
        "description": "Close an open position for a single symbol. Use this when the user wants to close/exit a specific position or take profit on a single symbol. For 'all positions' or 'everything' use the close_all_positions tool, not this one with a made-up symbol.",
        "input_schema": {
            "type": "object",
            "properties": {
                "symbol": {
                    "type": "string",
                    "description": "Market symbol (e.g., 'BTC', 'ETH', 'SOL')",
                },
            },
            "required": ["symbol"],
        },
    },
    {
        "name": "close_all_positions",
        "description": "Close every open position. Use this when the user says 'close all', 'close everything', 'close my positions', 'exit all', or otherwise asks to flatten the book. The user will be shown the full list of positions and PnL before any close is executed, and each position is closed individually with a single confirmation.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_positions",
        "description": "Get all currently open positions with unrealized PnL. Use this when the user asks about their positions, holdings, or what they're currently trading.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_account_balance",
        "description": "Get account balance, equity, and available capital. Use this when the user asks about their balance, funds, or how much they can trade.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_market_price",
        "description": "Get comprehensive market data for a symbol including price, RSI 5m and 1h, MACD trend, Bollinger Bands position and bandwidth, 24h volume signal, funding rate, and detected market regime (trending/ranging/volatile). Use this for any market analysis or trading advice question.",
        "input_schema": {
            "type": "object",
            "properties": {
                "symbol": {
                    "type": "string",
                    "description": "Market symbol (e.g., 'BTC', 'ETH', 'SOL')",
                },
            },
            "required": ["symbol"],
        },
    },
    {
        "name": "get_trade_history",
        "description": "Get recent trade history with PnL, entry/exit prices, duration, and win/loss status. Use when the user asks 'how did I do', 'show my trades', 'what have I traded recently'.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "number",
                    "description": "Number of recent trades to return (default 10, max 50)",
                    "default": 10,
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_performance_metrics",
        "description": "Get trading performance metrics: win rate, total PnL, profit factor, Sharpe ratio, max drawdown, best/worst performing symbols. Use when the user asks 'how am I doing', 'what's my win rate', 'performance', 'statistics'.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "number",
                    "description": "Number of recent trades to analyze (default 50, max 200)",
                    "default": 50,
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_market_regime",
        "description": "Detect the current market regime for a symbol: trending (bullish/bearish), ranging, volatile, or tight range about to break out. Provides the detected regime name, a description of what it means, and trading guidance for the current conditions. Use when the user asks 'what's the market doing', 'should I trade', 'is it a good time to trade'.",
        "input_schema": {
            "type": "object",
            "properties": {
                "symbol": {
                    "type": "string",
                    "description": "Market symbol (e.g., 'BTC', 'ETH', 'SOL')",
                },
            },
            "required": ["symbol"],
        },
    },
]


def execute_tool(
    tool_name: str,
    tool_input: dict,
    wallet_address: str,
    keypair,
    config: dict,
    get_market_snapshot_fn: Callable,
    place_order_fn: Callable,
    close_position_fn: Callable,
    get_open_positions_fn: Callable,
    get_account_info_fn: Callable,
) -> dict:
    """
    Execute a tool call and return the result.

    Args:
        tool_name: Name of the tool to execute
        tool_input: Input parameters for the tool
        wallet_address: User's wallet address
        keypair: User's Solana keypair
        config: Trading config
        get_market_snapshot_fn: Function to get market snapshot
        place_order_fn: Function to place orders
        close_position_fn: Function to close positions
        get_open_positions_fn: Function to get open positions
        get_account_info_fn: Function to get account info

    Returns:
        Dict with success status and result/error message
    """
    try:
        if tool_name == "place_order":
            symbol = tool_input["symbol"].upper()
            side_str = tool_input["side"].upper()
            side = "bid" if side_str == "LONG" else "ask"
            usdc_size = float(tool_input["usdc_size"])

            # Get current market price
            market_data = get_market_snapshot_fn(symbol, config.get("use_binance_fallback", True))
            mark_price = market_data.get("mark_price", 0)

            if mark_price <= 0:
                return {
                    "success": False,
                    "error": f"Could not fetch market price for {symbol}",
                }

            # Return order details for confirmation
            return {
                "success": True,
                "needs_confirmation": True,
                "confirmation_data": {
                    "symbol": symbol,
                    "side": side_str,
                    "usdc_size": usdc_size,
                    "mark_price": mark_price,
                    "dry_run": config.get("dry_run", True),
                },
                "message": f"Ready to place {side_str} order: {usdc_size} USDC worth of {symbol} at ~${mark_price:,.2f}",
            }

        elif tool_name == "close_position":
            symbol = tool_input["symbol"].upper()

            # Get current position
            positions = get_open_positions_fn(wallet_address)
            if symbol not in positions:
                return {
                    "success": False,
                    "error": f"No open position for {symbol}",
                }

            position = positions[symbol]

            # Return position details for confirmation
            return {
                "success": True,
                "needs_confirmation": True,
                "confirmation_data": {
                    "symbol": symbol,
                    "position": position,
                    "dry_run": config.get("dry_run", True),
                },
                "message": f"Ready to close {position['side'].upper()} position: {position['quantity']} {symbol} with PnL ${position.get('unrealized_pnl', 0):.2f}",
            }

        elif tool_name == "close_all_positions":
            # Build a per-symbol preview of every open position. The actual
            # closes happen in confirm_and_execute so the user only gets one
            # confirmation prompt covering the entire batch.
            positions = get_open_positions_fn(wallet_address)
            if not positions:
                return {
                    "success": True,
                    "result": "No open positions to close",
                }

            preview_lines = ["Ready to close ALL open positions:"]
            for symbol, pos in positions.items():
                side_label = "LONG" if pos["side"] == "bid" else "SHORT"
                pnl = float(pos.get("unrealized_pnl", 0))
                pnl_sign = "+" if pnl >= 0 else ""
                preview_lines.append(
                    f"  {symbol}: {side_label} {pos.get('quantity', 0)} "
                    f"@ ${float(pos.get('entry_price', 0)):,.2f} "
                    f"| PnL {pnl_sign}${pnl:.2f}"
                )

            return {
                "success": True,
                "needs_confirmation": True,
                "confirmation_data": {
                    "close_all": True,
                    "symbols": list(positions.keys()),
                    "dry_run": config.get("dry_run", True),
                },
                "message": "\n".join(preview_lines),
            }

        elif tool_name == "get_positions":
            positions = get_open_positions_fn(wallet_address)

            if not positions:
                return {
                    "success": True,
                    "result": "No open positions",
                }

            lines = []
            for symbol, pos in positions.items():
                side_label = "LONG" if pos["side"] == "bid" else "SHORT"
                pnl = pos.get("unrealized_pnl", 0)
                pnl_sign = "+" if pnl >= 0 else ""
                lines.append(
                    f"{symbol}: {side_label} ${pos['size']:.2f} @ ${pos['entry_price']:,.2f} "
                    f"| Mark: ${pos['mark_price']:,.2f} | PnL: {pnl_sign}${pnl:.2f}"
                )

            return {
                "success": True,
                "result": "\n".join(lines),
            }

        elif tool_name == "get_account_balance":
            account_info = get_account_info_fn(wallet_address)

            if not account_info:
                return {
                    "success": False,
                    "error": "Could not fetch account balance",
                }

            result_lines = [
                f"USDC Balance: ${account_info.get('balance', 0):,.2f}",
                f"Account Equity: ${account_info.get('account_equity', 0):,.2f}",
                f"Available to Trade: ${account_info.get('available_to_spend', 0):,.2f}",
                f"Margin Used: ${account_info.get('total_margin_used', 0):,.2f}",
            ]

            # Add token balances if available
            spot_balances = account_info.get('spot_balances', [])
            if spot_balances:
                result_lines.append("\nTokens Owned:")
                for balance in spot_balances:
                    symbol = balance.get('symbol', 'UNKNOWN')
                    amount = float(balance.get('amount', 0))
                    result_lines.append(f"  {symbol}: {amount:.8f}")

            return {
                "success": True,
                "result": "\n".join(result_lines),
            }

        elif tool_name == "get_market_price":
            symbol = tool_input["symbol"].upper()
            market_data = get_market_snapshot_fn(symbol, config.get("use_binance_fallback", True))

            if not market_data or market_data.get("mark_price", 0) <= 0:
                return {
                    "success": False,
                    "error": f"Could not fetch market data for {symbol}",
                }

            lines = [
                f"=== {symbol} Market Data ===",
                f"Price: ${market_data['mark_price']:,.2f}",
                f"Funding: {market_data.get('funding_rate', 0):.6f}",
            ]

            if market_data.get("rsi_5m") is not None:
                lines.append(f"RSI 5m: {market_data['rsi_5m']:.1f} ({market_data.get('rsi_5m_signal', 'neutral')})")
            if market_data.get("rsi_1h") is not None:
                lines.append(f"RSI 1h: {market_data['rsi_1h']:.1f} ({market_data.get('rsi_1h_signal', 'neutral')})")

            macd = market_data.get("macd")
            if macd:
                lines.append(f"MACD: {macd['macd']:.2f} | Signal: {macd['signal']:.2f} | Histogram: {macd['histogram']:.2f} | Trend: {macd['trend']}")

            bb = market_data.get("bb_1h")
            if bb:
                lines.append(f"Bollinger: Price is {bb['position']} | Bandwidth: {bb['bandwidth']:.2f}%")
                lines.append(f"  Upper: ${bb['upper']:,.2f} | Middle: ${bb['middle']:,.2f} | Lower: ${bb['lower']:,.2f}")

            vol = market_data.get("volume_24h")
            if vol:
                lines.append(f"24h Volume: {market_data['volume_signal']} ({vol:,.0f})")

            basis = market_data.get("basis_pct")
            if basis is not None:
                lines.append(f"Basis Spread: {basis:+.2f}% ({market_data.get('basis_signal', 'normal')})")

            return {
                "success": True,
                "result": "\n".join(lines),
            }

        elif tool_name == "get_trade_history":
            from ..storage import get_recent_trades
            limit = min(int(tool_input.get("limit", 10)), 50)
            trades = get_recent_trades(limit=limit)
            if not trades:
                return {"success": True, "result": "No trade history yet."}
            lines = [f"Recent trades (last {len(trades)}):"]
            for t in trades:
                side = "LONG" if t.get("side") == "bid" else "SHORT"
                pnl = float(t.get("realized_pnl", 0))
                pnl_s = f"+${pnl:.2f}" if pnl >= 0 else f"-${abs(pnl):.2f}"
                entry_ts = datetime.fromtimestamp(t["entry_time"]).strftime("%m/%d %H:%M")
                dur = max(0, (t.get("exit_time", 0) - t.get("entry_time", 0)) // 60)
                lines.append(
                    f"  {t['symbol']} {side} ${t['entry_price']:,.2f}→${t['exit_price']:,.2f} "
                    f"{pnl_s} ({dur}min) {t.get('exit_reason', '')} | {entry_ts}"
                )
            return {"success": True, "result": "\n".join(lines)}

        elif tool_name == "get_performance_metrics":
            from ..storage import get_recent_trades
            limit = min(int(tool_input.get("limit", 50)), 200)
            trades = get_recent_trades(limit=limit)
            if not trades:
                return {"success": True, "result": "Not enough trade data for performance metrics."}
            pnls = [float(t.get("realized_pnl", 0)) for t in trades]
            total_pnl = sum(pnls)
            n = len(pnls)
            wins = [p for p in pnls if p > 0]
            losses = [p for p in pnls if p < 0]
            win_rate = len(wins) / n * 100 if n else 0
            avg_win = sum(wins) / len(wins) if wins else 0
            avg_loss = abs(sum(losses) / len(losses)) if losses else 0
            profit_factor = sum(wins) / abs(sum(losses)) if losses and sum(losses) else float("inf")
            try:
                import statistics
                sharpe = (statistics.mean(pnls) / statistics.stdev(pnls)) * (252 ** 0.5) if len(pnls) > 1 and statistics.stdev(pnls) > 0 else 0
            except Exception:
                sharpe = 0
            cumulative = 0; peak = 0; max_dd = 0
            for p in pnls:
                cumulative += p
                if cumulative > peak: peak = cumulative
                dd = peak - cumulative
                if dd > max_dd: max_dd = dd
            # Per-symbol
            by_sym = {}
            for t in trades:
                s = t.get("symbol", "?")
                by_sym.setdefault(s, []).append(float(t.get("realized_pnl", 0)))
            best_sym = max(by_sym, key=lambda s: sum(by_sym[s]))
            worst_sym = min(by_sym, key=lambda s: sum(by_sym[s]))
            lines = [
                f"Performance (last {n} trades):",
                f"  Win Rate: {win_rate:.1f}%",
                f"  Total PnL: ${total_pnl:+.2f}",
                f"  Avg Win: ${avg_win:.2f} | Avg Loss: ${avg_loss:.2f}",
                f"  Profit Factor: {profit_factor:.2f}",
                f"  Sharpe Ratio: {sharpe:.2f}",
                f"  Max Drawdown: ${max_dd:.2f}",
                f"  Best Symbol: {best_sym} (${sum(by_sym[best_sym]):+.2f})",
                f"  Worst Symbol: {worst_sym} (${sum(by_sym[worst_sym]):+.2f})",
            ]
            return {"success": True, "result": "\n".join(lines)}

        elif tool_name == "get_market_regime":
            symbol = tool_input["symbol"].upper()
            market_data = get_market_snapshot_fn(symbol, config.get("use_binance_fallback", True))
            if not market_data:
                return {"success": False, "error": f"Could not fetch data for {symbol}"}
            # Detect regime using the same logic as the Loop Agent's prompt builder
            macd = market_data.get("macd", {})
            bb = market_data.get("bb_1h", {})
            macd_trend = macd.get("trend", "neutral")
            bb_bw = bb.get("bandwidth", 3.0)
            bb_pos = bb.get("position", "middle")
            if macd_trend in ("strong_bullish", "strong_bearish"):
                if bb_bw > 4.0:
                    regime = "Volatile Trending"
                    desc = "Strong trend with high volatility — expect larger moves but also reversals"
                    guidance = "Use wider stops, scale into positions, take profits on extensions"
                else:
                    regime = "Clean Trending"
                    desc = "Clear directional trend with normal volatility — best trading environment"
                    guidance = "Follow the trend, use trailing stops, let winners run"
            elif macd_trend in ("bullish", "bearish"):
                regime = "Weak Trending"
                desc = "Mild trend forming — could strengthen or reverse"
                guidance = "Smaller positions, tighter stops, monitor for trend confirmation"
            elif bb_bw < 2.0:
                regime = "Tight Range"
                desc = "Low volatility compression — breakout likely coming"
                guidance = "Wait for breakout confirmation, avoid trades inside the range"
            elif bb_bw > 5.0 and bb_pos in ("above_upper", "below_lower"):
                regime = "High Volatility Whipsaw"
                desc = "Extreme volatility with price outside bands — choppy"
                guidance = "Reduce size significantly or stay flat"
            else:
                regime = "Ranging"
                desc = "No clear trend — price oscillating in a range"
                guidance = "Mean reversion: buy low, sell high, or wait for breakout"
            return {
                "success": True,
                "result": (
                    f"=== {symbol} Market Regime ===\n"
                    f"Regime: {regime}\n"
                    f"{desc}\n"
                    f"Guidance: {guidance}"
                ),
            }

        else:
            return {
                "success": False,
                "error": f"Unknown tool: {tool_name}",
            }

    except Exception as e:
        return {
            "success": False,
            "error": f"Tool execution error: {str(e)}",
        }


def confirm_and_execute(
    confirmation_data: dict,
    wallet_address: str,
    keypair,
    config: dict,
    place_order_fn: Callable,
    close_position_fn: Callable,
    get_open_positions_fn: Callable,
) -> dict:
    """
    Execute a confirmed trade action.

    Args:
        confirmation_data: Data from the confirmation prompt
        wallet_address: User's wallet address
        keypair: User's Solana keypair
        config: Trading config
        place_order_fn: Function to place orders
        close_position_fn: Function to close positions
        get_open_positions_fn: Function to get open positions

    Returns:
        Dict with execution result
    """
    try:
        # Check if this is an order placement
        if "side" in confirmation_data:
            symbol = confirmation_data["symbol"]
            side = "bid" if confirmation_data["side"] == "LONG" else "ask"
            usdc_size = confirmation_data["usdc_size"]
            mark_price = confirmation_data["mark_price"]

            result = place_order_fn(
                symbol=symbol,
                side=side,
                usdc_size=usdc_size,
                keypair=keypair,
                agent_keypair=keypair,
                mark_price=mark_price,
                dry_run=config.get("dry_run", True),
            )

            if result["success"]:
                return {
                    "success": True,
                    "message": f"✓ {result['message']}",
                }
            else:
                return {
                    "success": False,
                    "error": f"Order failed: {result['message']}",
                }

        # Check if this is a position close
        elif "position" in confirmation_data:
            symbol = confirmation_data["symbol"]
            position = confirmation_data["position"]

            result = close_position_fn(
                symbol=symbol,
                keypair=keypair,
                position_side=position["side"],
                quantity=position["quantity"],
                dry_run=config.get("dry_run", True),
            )

            if result["success"]:
                return {
                    "success": True,
                    "message": f"✓ {result['message']}",
                }
            else:
                return {
                    "success": False,
                    "error": f"Close failed: {result['message']}",
                }

        # Check if this is a "close all" batch — iterate through every symbol
        # the user approved. We re-fetch positions at execution time so the
        # list reflects current state, not stale state from the preview.
        elif confirmation_data.get("close_all"):
            symbols = confirmation_data.get("symbols", [])
            results = []
            any_failed = False
            for symbol in symbols:
                current_positions = get_open_positions_fn(wallet_address)
                if symbol not in current_positions:
                    results.append(f"⚠ {symbol}: no longer open, skipped")
                    continue
                pos = current_positions[symbol]
                close_result = close_position_fn(
                    symbol=symbol,
                    keypair=keypair,
                    position_side=pos["side"],
                    quantity=pos["quantity"],
                    dry_run=config.get("dry_run", True),
                )
                if close_result["success"]:
                    results.append(f"✓ {symbol}: {close_result['message']}")
                else:
                    any_failed = True
                    results.append(f"✗ {symbol}: {close_result['message']}")
            return {
                "success": not any_failed,
                "message": "\n".join(results) if results else "No positions to close",
            }

        else:
            return {
                "success": False,
                "error": "Unknown confirmation type",
            }

    except Exception as e:
        return {
            "success": False,
            "error": f"Execution error: {str(e)}",
        }
