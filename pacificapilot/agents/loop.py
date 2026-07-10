"""
Loop Agent — autonomous trading agent that runs on an interval.

Pipeline:
1. Fetch market data (Pacifica + Binance fallback)
2. Fetch Elfa sentiment
3. Build prompt and call AI provider
4. Parse decision (direction, confidence, size%, reasoning)
5. If confidence ≥ threshold and no open position, place order
6. Track trailing SL/TP
7. Log decision + trade to SQLite
8. Fire on-chain memo log of decision hash
"""

import time
import asyncio
from typing import Optional
from datetime import datetime

from ..core import (
    get_market_snapshot,
    place_order,
    close_position,
    get_open_positions,
    get_account_info,
    should_exit_position,
    compute_pnl,
    validate_order_params,
    calculate_position_size,
)
from ..storage import (
    load_config,
    load_secrets,
    record_decision,
    record_trade,
    upsert_position,
    delete_position,
    get_position,
)
from ..providers import get_provider
from ..sentiment import get_token_sentiment
from ..memo import log_decision_memo
from ..memory import get_memory
from solders.keypair import Keypair


class LoopAgent:
    """Autonomous trading loop agent."""

    def __init__(self):
        self.config = load_config()
        self.secrets = load_secrets()
        self.running = False
        self.paused = False
        self.keypair: Optional[Keypair] = None
        self.agent_keypair: Optional[Keypair] = None
        # Optional Supermemory-backed memory. Safe to call even when disabled.
        self.memory = get_memory()

    def pause(self):
        """Pause the loop agent."""
        self.paused = True
        print("[LoopAgent] Paused")

    def resume(self):
        """Resume the loop agent."""
        self.paused = False
        print("[LoopAgent] Resumed")

    def start(self):
        """Start the loop agent."""
        print("[LoopAgent] Starting...")

        # Load keypairs
        private_key = self.secrets.get("PACIFICA_PRIVATE_KEY")
        if not private_key:
            print("[LoopAgent] ERROR: PACIFICA_PRIVATE_KEY not found in secrets")
            return

        try:
            # Parse Solana keypair from base58 string
            import base58
            self.keypair = Keypair.from_bytes(base58.b58decode(private_key))
            print(f"[LoopAgent] Loaded keypair: {self.keypair.pubkey()}")
        except Exception as e:
            print(f"[LoopAgent] ERROR: Failed to load keypair: {e}")
            return

        # Validate config
        if not self.config.get("symbols"):
            print("[LoopAgent] ERROR: No symbols configured")
            return

        self.running = True
        self._run_loop()

    def stop(self):
        """Stop the loop agent."""
        print("[LoopAgent] Stopping...")
        self.running = False

    # --- Memory helpers -------------------------------------------------

    def _write_daily_summary_if_needed(self):
        """Write a daily performance summary to memory at most once per day."""
        from datetime import date

        if not self.memory or not self.memory.enabled:
            return

        today = date.today().isoformat()
        last_date = self.config.get("_last_daily_summary_date")
        if last_date == today:
            return

        try:
            from ..storage import get_recent_trades

            trades = get_recent_trades(limit=200)
            if not trades:
                return

            # Filter to trades closed today (UTC day)
            today_prefix = today
            todays = [
                t for t in trades
                if datetime.fromtimestamp(t.get("exit_time", 0))
                .date()
                .isoformat()
                == today_prefix
            ]
            if not todays:
                return

            trade_count = len(todays)
            daily_pnl = sum(float(t.get("realized_pnl", 0)) for t in todays)
            wins = sum(1 for t in todays if float(t.get("realized_pnl", 0)) > 0)
            win_rate = wins / trade_count if trade_count else 0

            # Per-symbol PnL
            by_symbol: dict = {}
            for t in todays:
                sym = t.get("symbol", "?")
                by_symbol[sym] = by_symbol.get(sym, 0) + float(t.get("realized_pnl", 0))
            top = sorted(by_symbol.items(), key=lambda kv: kv[1], reverse=True)
            best = top[0][0] if top else "n/a"
            worst = top[-1][0] if top else "n/a"
            symbol_summary = ", ".join(f"{s}={p:+.2f}" for s, p in top)

            self.memory.add(
                f"Daily summary {today}: {trade_count} trades, "
                f"PnL={daily_pnl:+.2f} USDC, win_rate={win_rate:.0%}. "
                f"Best: {best}, Worst: {worst}. Symbols: {symbol_summary}",
                container_tag="performance",
            )

            # Persist the date so we don't double-write today
            from ..storage import update_config

            update_config({"_last_daily_summary_date": today})
        except Exception:
            # Daily summary must never break the loop
            pass

    def _maybe_record_pattern(self, symbol: str, market_data: dict):
        """Write a pattern memory when a notable market condition is detected."""
        if not self.memory or not self.memory.enabled:
            return
        try:
            rsi_1h = market_data.get("rsi_1h")
            funding = market_data.get("funding_rate", 0) or 0
            basis = market_data.get("basis_pct")
            bits = []
            if rsi_1h is not None and (rsi_1h < 30 or rsi_1h > 70):
                bits.append(f"RSI_1h={rsi_1h}")
            if abs(funding) > 0.001:
                bits.append(f"funding={funding:.6f}")
            if basis is not None and abs(basis) > 2:
                bits.append(f"basis={basis:+.2f}%")
            if not bits:
                return
            timestamp = datetime.now().isoformat(timespec="seconds")
            self.memory.add(
                f"Pattern: {symbol} {', '.join(bits)} at {timestamp}",
                container_tag="patterns",
            )
        except Exception:
            pass

    def _run_loop(self):
        """Main loop — runs until stopped."""
        cycle = 0

        while self.running:
            # Reload config and secrets each cycle to pick up changes
            self.config = load_config()
            self.secrets = load_secrets()

            symbols = self.config["symbols"]
            interval = self.config["loop_interval_seconds"]

            # Skip processing if paused
            if self.paused:
                print(f"\n[LoopAgent] Paused - sleeping {interval}s...")
                time.sleep(interval)
                continue

            print(f"\n{'='*60}")
            print(f"[LoopAgent] Cycle #{cycle} — {symbols}")
            print(f"  Mode: {self.config['mode']} | Dry run: {self.config['dry_run']}")
            print(f"  Max position: ${self.config['max_position_usdc']}")
            print(f"  Min confidence: {self.config['min_confidence']:.0%}")
            print(f"{'='*60}")

            # Process each symbol
            for symbol in symbols:
                try:
                    self._process_symbol(symbol)
                except Exception as e:
                    print(f"[LoopAgent] ERROR processing {symbol}: {e}")
                    import traceback
                    traceback.print_exc()

            cycle += 1
            print(f"\n[LoopAgent] Sleeping {interval}s until next cycle...")
            time.sleep(interval)

    def _process_symbol(self, symbol: str):
        """Process one symbol — fetch data, get AI decision, execute if needed."""
        print(f"\n[{symbol}] Processing...")

        # Detect Binance fallback activation so we can record it in memory
        from ..core.market_data import fetch_pacifica_price
        if self.config.get("use_binance_fallback"):
            try:
                pacifica_data = fetch_pacifica_price(symbol)
            except Exception:
                pacifica_data = None
            if pacifica_data is None and self.memory and self.memory.enabled:
                try:
                    self.memory.add(
                        f"Binance fallback activated for {symbol} "
                        f"at {datetime.now().isoformat(timespec='seconds')}. "
                        f"Pacifica API returned no data",
                        container_tag="errors",
                    )
                except Exception:
                    pass

        # 1. Fetch market data
        market_data = get_market_snapshot(
            symbol, use_binance_fallback=self.config["use_binance_fallback"]
        )
        print(f"  Price: ${market_data['mark_price']:,.2f}")
        print(f"  RSI 5m: {market_data.get('rsi_5m', 'N/A')} ({market_data.get('rsi_5m_signal', 'N/A')})")
        print(f"  RSI 1h: {market_data.get('rsi_1h', 'N/A')} ({market_data.get('rsi_1h_signal', 'N/A')})")

        # MACD indicator
        if market_data.get('macd'):
            macd = market_data['macd']
            print(f"  MACD: {macd['macd']:.2f} | Signal: {macd['signal']:.2f} | Trend: {macd['trend']}")

        # Bollinger Bands
        if market_data.get('bb_1h'):
            bb = market_data['bb_1h']
            print(f"  Bollinger: {bb['position']} | Bandwidth: {bb['bandwidth']:.2f}%")

        # Volume
        if market_data.get('volume_24h'):
            print(f"  Volume 24h: {market_data['volume_signal']} ({market_data['volume_24h']:,.0f})")

        print(f"  Funding: {market_data['funding_rate']:.6f}")

        # 1b. Pattern memory (notable market conditions, no-op if disabled)
        self._maybe_record_pattern(symbol, market_data)

        # 2. Check for exit conditions (SL/TP)
        position = get_position(symbol)
        if position:
            should_exit, exit_reason = should_exit_position(
                symbol=symbol,
                current_price=market_data['mark_price'],
                entry_price=position['entry_price'],
                side=position['side'],
                stop_loss_pct=self.config['stop_loss_pct'],
                take_profit_pct=self.config['take_profit_pct'],
                trailing_high=position.get('trailing_high'),
                trailing_low=position.get('trailing_low'),
            )

            if should_exit:
                print(f"  EXIT triggered: {exit_reason}")
                self._close_position(symbol, position, market_data['mark_price'], exit_reason)
                return

            # Update trailing stops
            if position['side'] == 'bid':
                new_high = max(position.get('trailing_high', position['entry_price']), market_data['mark_price'])
                if new_high != position.get('trailing_high'):
                    upsert_position(
                        symbol=symbol,
                        side=position['side'],
                        entry_price=position['entry_price'],
                        quantity=position['quantity'],
                        size_usdc=position['size_usdc'],
                        entry_time=position['entry_time'],
                        order_id=position.get('order_id'),
                        trailing_high=new_high,
                        trailing_low=position.get('trailing_low'),
                    )
            else:
                new_low = min(position.get('trailing_low', position['entry_price']), market_data['mark_price'])
                if new_low != position.get('trailing_low'):
                    upsert_position(
                        symbol=symbol,
                        side=position['side'],
                        entry_price=position['entry_price'],
                        quantity=position['quantity'],
                        size_usdc=position['size_usdc'],
                        entry_time=position['entry_time'],
                        order_id=position.get('order_id'),
                        trailing_high=position.get('trailing_high'),
                        trailing_low=new_low,
                    )

        # 3. Fetch sentiment
        print(f"  Fetching Elfa sentiment...")
        elfa_key = self.secrets.get("ELFA_API_KEY")
        sentiment_data = get_token_sentiment(symbol, api_key=elfa_key)
        print(f"  Sentiment: {sentiment_data['sentiment_score']:.2f} | Mentions: {sentiment_data['mention_count']}")

        # 4. Get account info
        wallet_address = str(self.keypair.pubkey())
        account_info = get_account_info(wallet_address)

        # 5. Call AI provider for decision
        print(f"  Asking AI for decision...")
        # Map provider name to the actual secret key name (handles gemini→GOOGLE_API_KEY alias)
        SECRET_KEY_MAP = {
            "anthropic": "ANTHROPIC_API_KEY",
            "openai": "OPENAI_API_KEY",
            "gemini": "GOOGLE_API_KEY",
            "google": "GOOGLE_API_KEY",
            "openrouter": "OPENROUTER_API_KEY",
        }
        provider_name = self.config['loop_agent_provider']
        secret_key = SECRET_KEY_MAP.get(provider_name, f"{provider_name.upper()}_API_KEY")
        provider = get_provider(
            provider_name,
            self.secrets.get(secret_key, ""),
            self.config['loop_agent_model'],
        )

        decision = provider.generate_decision(
            symbol=symbol,
            market_data=market_data,
            sentiment_data=sentiment_data,
            account_context=account_info,
            max_position_usdc=self.config['max_position_usdc'],
        )

        print(f"  Decision: {decision['action']} (confidence: {decision['confidence']:.0%})")
        print(f"  Reasoning: {decision['reasoning']}")

        # 5b. Record provider errors (malformed responses, API failures)
        if decision.get("_error") and self.memory and self.memory.enabled:
            try:
                self.memory.add(
                    f"Provider error: {provider_name} returned malformed response "
                    f"for {symbol} at {datetime.now().isoformat(timespec='seconds')}: "
                    f"{str(decision.get('_error'))[:150]}",
                    container_tag="errors",
                )
            except Exception:
                pass

        # 6. Execute if conditions met
        if decision['action'] in ('LONG', 'SHORT'):
            self._execute_decision(symbol, decision, market_data, sentiment_data, account_info)
        else:
            print(f"  HOLD — no action taken")
            # Remember that we deliberately chose not to trade
            if self.memory and self.memory.enabled:
                try:
                    self.memory.add(
                        f"HOLD {symbol}: confidence={decision['confidence']:.0%} "
                        f"or dry_run=True. Reasoning: {decision['reasoning'][:100]}",
                        container_tag="decisions",
                    )
                except Exception:
                    pass

        # 7. Log decision
        record_decision(
            symbol=symbol,
            action=decision['action'],
            confidence=decision['confidence'],
            reasoning=decision['reasoning'],
            size_pct=decision.get('size_pct', 0),
            mark_price=market_data['mark_price'],
            rsi_5m=market_data.get('rsi_5m'),
            rsi_1h=market_data.get('rsi_1h'),
            basis_pct=market_data.get('basis_pct'),
            sentiment_score=sentiment_data['sentiment_score'],
            mention_count=sentiment_data['mention_count'],
            order_placed=False,
        )

        # 7b. Write decision memory — what the AI thought, why, and with what signals
        if self.memory and self.memory.enabled:
            try:
                self.memory.add(
                    f"Decision: {decision['action']} {symbol} "
                    f"confidence={decision['confidence']:.0%}. "
                    f"Reasoning: {decision['reasoning'][:200]}. "
                    f"Signals: RSI_1h={market_data.get('rsi_1h')}, "
                    f"RSI_5m={market_data.get('rsi_5m')}, "
                    f"funding={market_data.get('funding_rate', 0):.6f}",
                    container_tag="decisions",
                )
            except Exception:
                pass

        # 7c. Daily performance summary (no-op if already written today)
        self._write_daily_summary_if_needed()

    def _execute_decision(
        self,
        symbol: str,
        decision: dict,
        market_data: dict,
        sentiment_data: dict,
        account_info: Optional[dict],
    ):
        """Execute a trading decision if it passes validation."""
        side = "bid" if decision['action'] == "LONG" else "ask"
        confidence = decision['confidence']
        min_confidence = self.config['min_confidence']

        # Check confidence threshold
        if confidence < min_confidence:
            print(f"  Confidence {confidence:.0%} below minimum {min_confidence:.0%} — skipping")
            return

        # Check if already in position
        position = get_position(symbol)
        if position:
            print(f"  Already in {position['side'].upper()} position — skipping")
            return

        # Calculate position size with Kelly Criterion (if enabled and enough history)
        available = account_info.get('available_to_spend', 0) if account_info else 0

        if available <= 0:
            print(f"  Insufficient balance — skipping")
            return

        use_kelly = self.config.get('use_kelly_criterion', False)

        if use_kelly:
            from ..storage import get_recent_trades
            from ..core import calculate_kelly_position_size

            recent_trades = get_recent_trades(limit=50)

            if len(recent_trades) >= 10:
                actual_size, kelly_info = calculate_kelly_position_size(
                    historical_trades=recent_trades,
                    available_capital=available,
                    fractional_kelly=self.config.get('fractional_kelly', 0.5),
                    max_position_usdc=self.config['max_position_usdc'],
                )

                print(f"  Kelly sizing: ${actual_size:.2f} (win rate: {kelly_info['win_rate']:.1%}, ratio: {kelly_info['win_loss_ratio']:.2f})")
                reason = "Kelly Criterion sizing applied"
            else:
                # Fall back to traditional sizing
                base_size = self.config['max_position_usdc'] * decision.get('size_pct', 0.5)
                actual_size, reason = calculate_position_size(
                    usdc_size=base_size,
                    available_balance=available,
                    max_position_usdc=self.config['max_position_usdc'],
                )
                print(f"  Using fixed sizing (need {10 - len(recent_trades)} more trades for Kelly)")
        else:
            # Traditional position sizing
            base_size = self.config['max_position_usdc'] * decision.get('size_pct', 0.5)
            actual_size, reason = calculate_position_size(
                usdc_size=base_size,
                available_balance=available,
                max_position_usdc=self.config['max_position_usdc'],
            )

        if reason and not use_kelly:
            print(f"  {reason}")

        # Place order
        print(f"  Placing {decision['action']} ${actual_size:.2f}...")
        expected_price = market_data['mark_price']

        order_result = place_order(
            symbol=symbol,
            side=side,
            usdc_size=actual_size,
            keypair=self.keypair,
            agent_keypair=self.keypair,  # Use same keypair for now
            mark_price=expected_price,
            dry_run=self.config['dry_run'],
        )

        if order_result['success']:
            print(f"  ✓ Order placed: {order_result['message']}")

            # Calculate entry slippage
            actual_price = order_result.get('avg_price', expected_price)
            from ..core import calculate_slippage_pct
            entry_slippage = calculate_slippage_pct(expected_price, actual_price, side)

            # Record position
            if not order_result['dry_run']:
                upsert_position(
                    symbol=symbol,
                    side=side,
                    entry_price=actual_price,
                    quantity=order_result['quantity'],
                    size_usdc=actual_size,
                    entry_time=int(time.time()),
                    order_id=order_result.get('order_id'),
                    trailing_high=actual_price if side == 'bid' else None,
                    trailing_low=actual_price if side == 'ask' else None,
                )

                # Store expected price for slippage tracking
                position = get_position(symbol)
                if position:
                    position['expected_entry_price'] = expected_price
                    position['entry_slippage_pct'] = entry_slippage

            # Log decision with order info
            record_decision(
                symbol=symbol,
                action=decision['action'],
                confidence=confidence,
                reasoning=decision['reasoning'],
                size_pct=decision.get('size_pct', 0),
                mark_price=market_data['mark_price'],
                rsi_5m=market_data.get('rsi_5m'),
                rsi_1h=market_data.get('rsi_1h'),
                basis_pct=market_data.get('basis_pct'),
                sentiment_score=sentiment_data['sentiment_score'],
                mention_count=sentiment_data['mention_count'],
                order_placed=True,
                order_id=order_result.get('order_id'),
            )
        else:
            print(f"  ✗ Order failed: {order_result['message']}")

    def _close_position(
        self,
        symbol: str,
        position: dict,
        current_price: float,
        exit_reason: str,
    ):
        """Close an open position."""
        pnl = compute_pnl(
            entry_price=position['entry_price'],
            current_price=current_price,
            quantity=position['quantity'],
            side=position['side'],
        )

        print(f"  Closing position: {position['side'].upper()} {position['quantity']} {symbol}")
        print(f"  PnL: ${pnl:.2f}")

        expected_exit_price = current_price

        close_result = close_position(
            symbol=symbol,
            keypair=self.keypair,
            position_side=position['side'],
            quantity=position['quantity'],
            dry_run=self.config['dry_run'],
        )

        if close_result['success']:
            print(f"  ✓ Position closed: {close_result['message']}")

            # Calculate exit slippage
            from ..core import calculate_slippage_pct
            actual_exit_price = current_price  # In real scenario, get from close_result
            exit_slippage = calculate_slippage_pct(expected_exit_price, actual_exit_price, position['side'])

            # Record trade with slippage data
            if not close_result['dry_run']:
                record_trade(
                    symbol=symbol,
                    side=position['side'],
                    entry_price=position['entry_price'],
                    exit_price=current_price,
                    quantity=position['quantity'],
                    realized_pnl=pnl,
                    entry_time=position['entry_time'],
                    exit_time=int(time.time()),
                    exit_reason=exit_reason,
                    order_id=position.get('order_id'),
                    expected_entry_price=position.get('expected_entry_price'),
                    actual_entry_price=position['entry_price'],
                    entry_slippage_pct=position.get('entry_slippage_pct'),
                    expected_exit_price=expected_exit_price,
                    actual_exit_price=actual_exit_price,
                    exit_slippage_pct=exit_slippage,
                )

                # Remove from positions
                delete_position(symbol)

                # Write trade-outcome memory — this is what makes future decisions smarter
                if self.memory and self.memory.enabled:
                    try:
                        direction = "LONG" if position['side'] == "bid" else "SHORT"
                        duration_min = max(0, (int(time.time()) - int(position.get('entry_time', time.time()))) // 60)
                        self.memory.add(
                            f"Trade closed: {direction} {symbol} "
                            f"PnL={pnl:+.2f} USDC ({'win' if pnl > 0 else 'loss'}). "
                            f"Entry={position['entry_price']}, "
                            f"Exit={current_price}, "
                            f"Duration={duration_min}min, Reason={exit_reason}",
                            container_tag="decisions",
                        )
                    except Exception:
                        pass
        else:
            print(f"  ✗ Close failed: {close_result['message']}")
