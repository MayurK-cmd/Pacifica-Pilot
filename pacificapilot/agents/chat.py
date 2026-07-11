"""
Chat Agent — interactive REPL with /commands and natural language trading.

Two front doors into the same handler:
- Local terminal REPL (pacifica chat)
- Telegram bot (when remote mode enabled)

All trade-related actions require explicit confirmation before execution.
"""

import sys
from typing import Optional
from datetime import datetime

from ..core import (
    get_market_snapshot,
    place_order,
    close_position,
    get_open_positions,
    get_account_info,
    compute_pnl,
)
from ..storage import (
    load_config,
    save_config,
    update_config,
    validate_config,
    load_secrets,
    save_secrets,
    update_secret,
    get_recent_decisions,
    get_recent_trades,
    get_total_pnl,
    get_all_positions,
)
from ..providers import get_provider
from ..memory import get_memory
from solders.keypair import Keypair


# Phrases that suggest the user is asking about history or memory.
# These are matched as case-insensitive substrings, so short roots like
# "prefer" catch typos ("prefernce", "prefrence") and "remem" catches
# mis-typed "remeber".
MEMORY_TRIGGER_WORDS = (
    "last", "before", "history", "why", "what happened", "pattern",
    "remem", "remember", "previously", "did you", "when did",
    "best", "worst", "prefer",
)

# Phrases that suggest the user is stating a preference we should remember.
# Broad enough to catch common typos ("neever", "dont") and phrasings
# ("too risky", "avoid", "not allowed").
PREFERENCE_TRIGGER_PHRASES = (
    "always", "never", "i want", "i prefer", "don't trade", "remind me",
    "i dont", "i don't", "i do not", "too risky", "too volatile",
    "avoid", "not want", "not allowed", "would never",
)


class ChatAgent:
    """Interactive chat agent with /commands and natural language trading."""

    def __init__(self):
        self.config = load_config()
        self.secrets = load_secrets()
        self.keypair: Optional[Keypair] = None
        self.loop_agent_running = False
        # Optional Supermemory-backed memory. Safe to call even when disabled.
        self.memory = get_memory()
        # Hooks for TUI integration — override these to avoid blocking input()
        # inside a background thread. Both return True (confirmed) or False (cancelled).
        self._confirm_hook = None  # callable(message, data) -> bool
        self._message_hook = None  # callable(text) -> None

    def start(self):
        """Start the chat REPL."""
        print("\n" + "=" * 60)
        print("PacificaPilot Chat Agent")
        print("=" * 60)
        print("Type /help for available commands, or ask me anything.")
        print("Mode: {} | Dry run: {}".format(self.config['mode'], self.config['dry_run']))
        if self.memory and self.memory.enabled:
            print("Memory: enabled (Supermemory connected)")
        else:
            print("Memory: disabled (set SUPERMEMORY_API_KEY or use /apikey supermemory <key>)")
        print("=" * 60 + "\n")

        # Load keypair
        private_key = self.secrets.get("PACIFICA_PRIVATE_KEY")
        if private_key:
            try:
                import base58
                self.keypair = Keypair.from_bytes(base58.b58decode(private_key))
            except Exception as e:
                print(f"⚠️  Could not load keypair: {e}")

        # REPL loop
        while True:
            try:
                user_input = input("You: ").strip()
                if not user_input:
                    continue

                if user_input.lower() in ("exit", "quit", "q"):
                    print("\nGoodbye!")
                    break

                response = self.handle_message(user_input)
                if response:
                    print(f"\n{response}\n")

            except KeyboardInterrupt:
                print("\n\nGoodbye!")
                break
            except EOFError:
                break
            except Exception as e:
                print(f"\n❌ Error: {e}\n")

    def handle_message(self, message: str) -> str:
        """
        Handle a user message — either a /command or natural language.

        Returns:
            Response string to display to the user
        """
        self.config = load_config()  # Reload config each message
        self.secrets = load_secrets()

        # Check if it's a command
        if message.startswith("/"):
            return self.handle_command(message)

        # Otherwise, treat as natural language
        return self.handle_natural_language(message)

    # --- Memory helpers -----------------------------------------------

    @staticmethod
    def _should_recall(message: str) -> bool:
        """Decide if a message deserves a memory recall before answering."""
        lowered = message.lower()
        return any(trigger in lowered for trigger in MEMORY_TRIGGER_WORDS)

    @staticmethod
    def _extract_preference(message: str) -> str | None:
        """Extract a clean preference summary from a user message, if any.

        Returns None when the message doesn't look like a preference statement.
        """
        import re

        lowered = message.lower().strip()
        if not any(p in lowered for p in PREFERENCE_TRIGGER_PHRASES):
            return None

        # Clean up the message into a preference statement
        cleaned = re.sub(r"\s+", " ", message).strip().rstrip(".!?")
        # Drop any leading "you should" framing from the user speaking to the bot
        if len(cleaned) > 200:
            cleaned = cleaned[:200].rstrip() + "..."
        return f"User preference: {cleaned}"

    def handle_command(self, message: str) -> str:
        """Handle /command messages."""
        parts = message.split(maxsplit=1)
        command = parts[0].lower()
        args = parts[1] if len(parts) > 1 else ""

        if command == "/help":
            return self._cmd_help()
        elif command == "/config":
            return self._cmd_config(args)
        elif command == "/apikey":
            return self._cmd_apikey(args)
        elif command == "/mode":
            return self._cmd_mode(args)
        elif command == "/status":
            return self._cmd_status()
        elif command == "/positions":
            return self._cmd_positions()
        elif command == "/history":
            return self._cmd_history(args)
        elif command == "/performance":
            return self._cmd_performance(args)
        elif command == "/analytics":
            return self._cmd_analytics(args)
        elif command == "/backtest":
            return self._cmd_backtest(args)
        elif command == "/portfolio":
            return self._cmd_portfolio()
        elif command == "/account":
            return self._cmd_account(args)
        elif command == "/pause":
            return self._cmd_pause()
        elif command == "/resume":
            return self._cmd_resume()
        elif command == "/remote":
            return self._cmd_remote(args)
        else:
            return f"Unknown command: {command}\nType /help for available commands."

    def handle_natural_language(self, message: str) -> str:
        """Handle natural language messages via AI provider with tool-calling.

        Uses an agentic loop:
          1. Send user message + conversation history + tools to the provider
          2. If the provider returns tool_use blocks → execute each tool,
             append the result back into the conversation, and go to step 1
          3. If the provider returns a text response → we're done

        Trade actions (place_order, close_position, close_all_positions) are
        intercepted for user confirmation before the tool result is sent back
        to the AI. The loop runs at most MAX_TOOL_ITERATIONS to prevent infinite
        loops (default 5 iterations).
        """
        MAX_TOOL_ITERATIONS = 8

        # Check if we have an AI provider configured
        provider_name = self.config.get('chat_agent_provider')
        SECRET_KEY_MAP = {
            "anthropic": "ANTHROPIC_API_KEY",
            "openai": "OPENAI_API_KEY",
            "gemini": "GOOGLE_API_KEY",
            "google": "GOOGLE_API_KEY",
            "openrouter": "OPENROUTER_API_KEY",
        }
        secret_key = SECRET_KEY_MAP.get(provider_name)
        api_key = self.secrets.get(secret_key) if secret_key else None

        if not provider_name or not api_key:
            return "⚠️  No AI provider configured. Use /apikey to add one."

        from .tools import TRADING_TOOLS, execute_tool, confirm_and_execute
        from ..providers import get_provider

        try:
            provider = get_provider(provider_name, api_key, self.config.get('chat_agent_model'))
        except Exception as e:
            return f"⚠️  Failed to load provider {provider_name}: {str(e)}"

        if not hasattr(provider, 'chat_with_tools'):
            return f"⚠️  Provider {provider_name} does not support tool-calling yet."

        # --- Build system prompt ---
        mode = self.config['mode']
        dry_run = self.config['dry_run']
        system_prompt = f"""You are PacificaPilot's trading assistant — an AI that helps users trade Pacifica Perpetual Futures.

You have access to tools that let you fetch real market data, check account balances, view open positions, and execute trades.

## Persistent Memory (Supermemory)
This system has a persistent memory layer called Supermemory. When the user states a preference ("I never want to trade X", "I prefer Y", "remember this"), it is automatically saved and will be available in future sessions. When memory data is present, it will appear at the top of this prompt inside "--- MEMORY CONTEXT ---" markers.

- If you see memory context at the top of this prompt, USE IT to personalise your responses.
- When the user says "remember" or states a clear preference, tell them it's been saved.
- When asked about past trades or preferences, the "--- MEMORY CONTEXT ---" block contains what the system knows.
- If there is no memory context and the user asks about past interactions, say you don't have that information yet.

## Your behavior
- Think step by step. Before answering a market question, gather the data you need with tools.
- Use get_market_price for price/RSI/MACD/Bollinger/volume analysis.
- Use get_market_regime to check if the market is trending, ranging, or volatile.
- Use get_positions and get_account_balance when the user asks about their portfolio.
- Use get_trade_history and get_performance_metrics for performance analysis.
- Use place_order to open LONG/SHORT positions, close_position for a single symbol, and close_all_positions to flatten the book.

## Confirmation rules
- Trading actions (place_order, close_position, close_all_positions) require user confirmation. Show concise details first, then proceed only after the user confirms.
- Balance/market lookups do not need confirmation.

## Style
- Be concise but thorough. Lead with the key insight, then support it with data.
- For market analysis: state a clear view (BULLISH/BEARISH/NEUTRAL), cite the indicators that support it, then explain your reasoning.
- Surface risks: if funding is extreme, volatility is high, or volume is low, mention it.
- When a user asks for advice ("should I long/short/hold"), give your honest assessment based on the data, but remind them this is not financial advice.

Current mode: {mode.upper()} {'(DRY RUN - no real orders)' if dry_run else '(LIVE TRADING)'}
Configured symbols: {', '.join(self.config['symbols'])}
Pacifica supports many perpetual futures markets — you can help trade ANY available symbol."""

        # Inject memory context
        context_str = self.memory.context(include_profile=True) if self.memory else ""
        if context_str:
            system_prompt += (
                "\n\n--- MEMORY CONTEXT ---\n"
                f"{context_str}\n"
                "--- END MEMORY CONTEXT ---\n"
                "Use this context to give informed, specific answers. If you have no memory for something, say so — don't guess."
            )

        # Recall relevant memories
        user_message = message
        if self.memory and self.memory.enabled and self._should_recall(message):
            try:
                recalled = self.memory.recall(query=message, limit=5)
                if recalled:
                    bullets = "\n".join(f"- {r}" for r in recalled)
                    user_message = f"Relevant memories:\n{bullets}\n\n{message}"
            except Exception:
                pass

        # Persist stated preferences
        if self.memory and self.memory.enabled:
            try:
                pref = self._extract_preference(message)
                if pref:
                    self.memory.add(pref, container_tag="preferences")
            except Exception:
                pass

        # --- Conversation history ---
        # Initialise on first call if needed
        if not hasattr(self, '_messages') or self._messages is None:
            self._messages = [{"role": "user", "content": user_message}]
        else:
            self._messages.append({"role": "user", "content": user_message})

        # Keep the conversation bounded (trim oldest turns if > 20 messages)
        # We always keep the system prompt separate, so messages is pure history.
        MAX_HISTORY = 20
        if len(self._messages) > MAX_HISTORY:
            self._messages = self._messages[-(MAX_HISTORY):]

        # --- Agentic loop ---
        tool_iterations = 0
        all_tool_results_text = []
        final_text = None

        while tool_iterations < MAX_TOOL_ITERATIONS:
            tool_iterations += 1

            try:
                response = provider.chat_with_tools(
                    messages=self._messages,
                    tools=TRADING_TOOLS,
                    system=system_prompt,
                )
            except Exception as e:
                final_text = f"❌ AI provider error: {str(e)}"
                break

            content_blocks = response.get("content", [])
            tool_blocks = [b for b in content_blocks if b.get("type") == "tool_use"]
            text_blocks = [b for b in content_blocks if b.get("type") == "text"]

            # Accumulate any text the AI produced
            if text_blocks:
                final_text = "\n".join(b.get("text", "") for b in text_blocks)

            # If no tool calls, we're done
            if not tool_blocks:
                break

            # --- Process tool calls ---
            from ..core import (
                get_market_snapshot,
                place_order,
                close_position,
                get_open_positions,
                get_account_info,
            )

            wallet_address = str(self.keypair.pubkey()) if self.keypair else ""
            results_for_ai = []
            tool_results_for_user = []

            for block in tool_blocks:
                tool_name = block.get("name")
                tool_input = block.get("input", {})

                # Record the AI's tool call in conversation history
                # (append AFTER the user message that prompted it)
                assistant_msg = {"role": "assistant", "content": content_blocks}
                # We'll append the role properly after processing

                result = execute_tool(
                    tool_name=tool_name,
                    tool_input=tool_input,
                    wallet_address=wallet_address,
                    keypair=self.keypair,
                    config=self.config,
                    get_market_snapshot_fn=get_market_snapshot,
                    place_order_fn=place_order,
                    close_position_fn=close_position,
                    get_open_positions_fn=get_open_positions,
                    get_account_info_fn=get_account_info,
                )

                # --- Confirmation interception for trade actions ---
                if result.get("needs_confirmation"):
                    # Show the preview
                    preview = result.get("message", "")
                    data = result.get("confirmation_data", {})
                    dry_run = data.get("dry_run", True)

                    if self._message_hook:
                        self._message_hook(preview)
                    else:
                        print(f"\n{preview}")
                        print(f"{'⚠️  DRY RUN MODE - No real order' if dry_run else '⚠️  LIVE TRADING - Real funds'}")

                    # Use confirmation hook if set (TUI modal), else fallback to input()
                    if self._confirm_hook:
                        confirm = self._confirm_hook(preview, data)
                    else:
                        c = input("\nConfirm? (yes/no): ").strip().lower()
                        confirm = c in ("yes", "y")

                    if confirm:
                        exec_result = confirm_and_execute(
                            confirmation_data=result["confirmation_data"],
                            wallet_address=wallet_address,
                            keypair=self.keypair,
                            config=self.config,
                            place_order_fn=place_order,
                            close_position_fn=close_position,
                            get_open_positions_fn=get_open_positions,
                        )

                        if exec_result.get("success"):
                            tool_text = exec_result.get("message", "Done")
                        else:
                            tool_text = f"❌ {exec_result.get('error')}"
                    else:
                        tool_text = "Action cancelled by user"

                    tool_results_for_user.append(tool_text)
                    results_for_ai.append(tool_text)

                elif not result.get("success"):
                    error_text = f"Error ({tool_name}): {result.get('error', 'Unknown error')}"
                    results_for_ai.append(error_text)
                    tool_results_for_user.append(error_text)

                else:
                    tool_text = result.get("result", "Done")
                    results_for_ai.append(tool_text)
                    tool_results_for_user.append(tool_text)

            # --- Append the assistant message + tool results to history ---
            # The assistant message is the full response with tool_use blocks
            self._messages.append({"role": "assistant", "content": content_blocks})

            # Append each tool result. We use a provider-neutral internal format:
            # {"role": "tool", "tool_call_id": "...", "content": "..."}
            # Each provider's chat_with_tools() converts this to its own format.
            for i, block in enumerate(tool_blocks):
                tool_use_id = block.get("id", f"tool_{i}")
                result_text = results_for_ai[i] if i < len(results_for_ai) else "Error: no result"
                self._messages.append({
                    "role": "tool",
                    "tool_call_id": tool_use_id,
                    "name": block.get("name"),
                    "content": result_text,
                })

            final_text = "\n".join(tool_results_for_user)

        # --- Append the assistant's final text to history ---
        if final_text:
            self._messages.append({"role": "assistant", "content": final_text})

        if tool_iterations >= MAX_TOOL_ITERATIONS:
            final_text = (final_text or "") + "\n\n*I hit the maximum iteration limit. Please rephrase or break your request into smaller steps.*"

        return final_text or "Done."

    def _cmd_help(self) -> str:
        """Show available commands."""
        return """Available commands:

/config              View current config
/apikey              Manage AI provider keys
/mode [testnet|mainnet]  Switch mode (default: testnet)
/status              Show Loop Agent status and last decisions
/positions           List open positions with unrealized PnL
/history [limit]     Recent trade and decision history
/performance [limit] Show performance metrics (Sharpe, drawdown, etc.)
/analytics [symbol]  Detailed analytics and monthly returns
/backtest <symbol> <days>  Run backtest on historical data
/portfolio           Show portfolio risk metrics and correlation
/account [days]      Show account stats from Pacifica (equity, volume, PnL)
/pause               Stop Loop Agent (chat stays active)
/resume              Restart Loop Agent
/remote              Enable/disable Telegram remote mode
/help                Show this help message

You can also ask me questions in natural language (experimental).
"""

    def _cmd_config(self, args: str) -> str:
        """View or edit configuration."""
        if not args:
            # Display current config
            return f"""Current configuration:

Symbols: {', '.join(self.config['symbols'])}
Loop interval: {self.config['loop_interval_seconds']}s
Max position: ${self.config['max_position_usdc']}
Min confidence: {self.config['min_confidence']:.0%}
Stop loss: {self.config['stop_loss_pct']}%
Take profit: {self.config['take_profit_pct']}%
Risk profile: {self.config['risk_profile']}
Mode: {self.config['mode']}
Dry run: {self.config['dry_run']}
Use Binance fallback: {self.config['use_binance_fallback']}

Loop Agent: {self.config['loop_agent_provider']} / {self.config['loop_agent_model']}
Chat Agent: {self.config['chat_agent_provider']} / {self.config['chat_agent_model']}

To edit: /config <key> <value>
Examples:
  /config max_position_usdc 200
  /config loop_agent_model anthropic/claude-3.5-haiku
  /config symbols BTC,ETH,SOL
"""
        else:
            # Parse key=value or key value
            if "=" in args:
                key, value = args.split("=", 1)
            else:
                parts = args.split(maxsplit=1)
                if len(parts) != 2:
                    return "Usage: /config <key> <value> or /config <key>=<value>"
                key, value = parts

            key = key.strip()
            value = value.strip()

            # Type conversion
            if key in ("loop_interval_seconds", "mention_count"):
                value = int(value)
            elif key in ("max_position_usdc", "min_confidence", "stop_loss_pct", "take_profit_pct"):
                value = float(value)
            elif key == "symbols":
                value = [s.strip() for s in value.split(",")]
            elif key in ("dry_run", "use_binance_fallback", "remote_mode_enabled", "memo_enabled"):
                value = value.lower() in ("true", "yes", "1", "on")
            elif key in ("loop_agent_model", "chat_agent_model", "loop_agent_provider", "chat_agent_provider", "risk_profile", "mode", "memo_cluster"):
                # String values - keep as-is
                pass
            else:
                return f"Unknown config key: {key}\nRun /config to see available options."

            # Update and save
            self.config[key] = value
            valid, error = validate_config(self.config)
            if not valid:
                return f"❌ Invalid config: {error}"

            save_config(self.config)

            # Remember this as a user preference
            if self.memory and self.memory.enabled:
                self.memory.add(
                    f"User preference: set {key} = {value}",
                    container_tag="preferences",
                )

            return f"✓ Updated {key} = {value}"

    def _cmd_apikey(self, args: str) -> str:
        """Manage AI provider API keys."""
        if not args:
            # List configured providers
            configured = []
            for provider in ["ANTHROPIC", "OPENAI", "GOOGLE", "OPENROUTER", "TELEGRAM_BOT_TOKEN", "SUPERMEMORY"]:
                key_name = f"{provider}_API_KEY" if provider not in ("TELEGRAM_BOT_TOKEN", "SUPERMEMORY") else provider
                if provider == "SUPERMEMORY":
                    key_name = "SUPERMEMORY_API_KEY"
                if self.secrets.get(key_name):
                    configured.append(provider.lower())

            return f"""Configured providers: {', '.join(configured) if configured else 'none'}

To add/update a key:
  /apikey <provider> <key>

Providers: anthropic, openai, google, openrouter, telegram, elfa, supermemory
Supermemory syntax:
  /apikey supermemory <key>          (cloud mode, default)
  /apikey supermemory <key> local    (local mode - requires npx supermemory local)
  /apikey supermemory <key> cloud    (cloud mode, explicit)
Example: /apikey anthropic sk-ant-...
"""
        else:
            parts = args.split(maxsplit=1)
            if len(parts) != 2:
                return "Usage: /apikey <provider> <key>"

            provider, key = parts
            provider = provider.lower()

            # Map provider name to secret key name
            key_names = {
                "anthropic": "ANTHROPIC_API_KEY",
                "openai": "OPENAI_API_KEY",
                "google": "GOOGLE_API_KEY",
                "openrouter": "OPENROUTER_API_KEY",
                "telegram": "TELEGRAM_BOT_TOKEN",
                "elfa": "ELFA_API_KEY",
                "supermemory": "SUPERMEMORY_API_KEY",
            }

            key_name = key_names.get(provider)
            if not key_name:
                return f"Unknown provider: {provider}\nValid: {', '.join(key_names.keys())}"

            # Non-supermemory providers: write and done
            if provider != "supermemory":
                update_secret(key_name, key)
                self.secrets = load_secrets()
                return f"✓ Updated {provider} API key"

            # Supermemory: extract mode suffix, write key + mode, reinit singleton
            pieces = key.split(maxsplit=1)
            raw_key = pieces[0]
            sm_mode = pieces[1].lower() if len(pieces) > 1 else None

            # Guard: if the "key" looks like just a mode name, the user probably
            # typed /apikey supermemory cloud instead of /apikey supermemory <key> cloud
            if raw_key.lower() in ("local", "cloud"):
                return (
                    "⚠️  Invalid syntax. Use:\n"
                    "  /apikey supermemory <your-key>        (cloud, default)\n"
                    "  /apikey supermemory <your-key> local  (local mode)"
                )

            update_secret("SUPERMEMORY_API_KEY", raw_key)
            if sm_mode in ("local", "cloud"):
                update_secret("SUPERMEMORY_MODE", sm_mode)
            if sm_mode == "local":
                update_secret("SUPERMEMORY_LOCAL_URL", "http://localhost:6767")
            self.secrets = load_secrets()

            try:
                from ..memory import reset_memory

                new_memory = reset_memory(api_key=raw_key, mode=sm_mode)
                if new_memory.enabled:
                    try:
                        new_memory.recall("supermemory connection test", limit=1)
                    except Exception:
                        pass
                    mode_label = "local" if new_memory.mode == "local" else "cloud"
                    return f"✓ Supermemory connected ({mode_label})"
                return "⚠️  Key saved but Supermemory client failed to initialise. Check the key and mode."
            except Exception as e:
                return f"⚠️  Key saved but reinitialisation failed: {e}"

    def _cmd_mode(self, args: str) -> str:
        """Switch between testnet and mainnet."""
        if not args:
            return f"Current mode: {self.config['mode']}\nUse: /mode testnet or /mode mainnet"

        mode = args.strip().lower()
        if mode not in ("testnet", "mainnet"):
            return "Invalid mode. Use: testnet or mainnet"

        if mode == "mainnet":
            # Emphatic confirmation for mainnet
            confirm = input(
                "\n⚠️  MAINNET MODE WARNING ⚠️\n"
                "You are about to switch to MAINNET trading with REAL FUNDS.\n"
                "All orders will use your actual Pacifica account balance.\n\n"
                "Type 'YES I UNDERSTAND' to confirm: "
            )
            if confirm.strip() != "YES I UNDERSTAND":
                return "Mainnet switch cancelled."

        update_config({"mode": mode})

        if self.memory and self.memory.enabled:
            self.memory.add(
                f"User preference: switched mode to {mode}",
                container_tag="preferences",
            )

        return f"✓ Switched to {mode.upper()} mode"

    def _cmd_status(self) -> str:
        """Show Loop Agent status and recent decisions."""
        status_line = "RUNNING" if self.loop_agent_running else "STOPPED"

        # Get recent decisions per symbol
        decisions_summary = []
        for symbol in self.config['symbols']:
            recent = get_recent_decisions(symbol=symbol, limit=1)
            if recent:
                d = recent[0]
                decisions_summary.append(
                    f"{symbol}: {d['action']} ({d['confidence']:.0%}) — {d['reasoning'][:50]}..."
                )
            else:
                decisions_summary.append(f"{symbol}: No decisions yet")

        return f"""Loop Agent: {status_line}
Mode: {self.config['mode']} | Dry run: {self.config['dry_run']}

Recent decisions:
{chr(10).join('  ' + line for line in decisions_summary)}
"""

    def _cmd_positions(self) -> str:
        """List open positions with unrealized PnL."""
        if not self.keypair:
            return "⚠️  No keypair loaded. Cannot fetch positions."

        wallet_address = str(self.keypair.pubkey())
        positions = get_open_positions(wallet_address)

        if not positions:
            return "No open positions."

        lines = ["Open positions:\n"]
        for symbol, pos in positions.items():
            side_label = "LONG" if pos['side'] == 'bid' else "SHORT"
            pnl = pos.get('unrealized_pnl', 0)
            pnl_sign = "+" if pnl >= 0 else ""
            lines.append(
                f"  {symbol}: {side_label} ${pos['size']:.2f} @ ${pos['entry_price']:,.2f} "
                f"| Mark: ${pos['mark_price']:,.2f} | PnL: {pnl_sign}${pnl:.2f}"
            )

        return "\n".join(lines)

    def _cmd_history(self, args: str) -> str:
        """Show recent trade and decision history."""
        limit = 10
        if args:
            try:
                limit = int(args.strip())
            except ValueError:
                return "Usage: /history [limit]"

        trades = get_recent_trades(limit=limit)
        total_pnl = get_total_pnl()

        if not trades:
            return "No trade history yet."

        lines = [f"Recent trades (showing {len(trades)}):\n"]
        for trade in trades:
            side_label = "LONG" if trade['side'] == 'bid' else "SHORT"
            pnl_sign = "+" if trade['realized_pnl'] >= 0 else ""
            entry_ts = datetime.fromtimestamp(trade['entry_time']).strftime("%m/%d %H:%M")
            lines.append(
                f"  {trade['symbol']}: {side_label} ${trade['entry_price']:,.2f} → ${trade['exit_price']:,.2f} "
                f"| {pnl_sign}${trade['realized_pnl']:.2f} | {entry_ts} | {trade.get('exit_reason', 'N/A')}"
            )

        lines.append(f"\nTotal realized PnL: ${total_pnl:.2f}")
        return "\n".join(lines)

    def _cmd_pause(self) -> str:
        """Pause the Loop Agent."""
        self.loop_agent_running = False
        return "✓ Loop Agent paused (chat remains active)"

    def _cmd_resume(self) -> str:
        """Resume the Loop Agent."""
        self.loop_agent_running = True
        return "✓ Loop Agent resumed"

    def _cmd_remote(self, args: str) -> str:
        """Enable/disable Telegram remote mode."""
        if not args:
            enabled = self.config.get('remote_mode_enabled', False)
            return f"Remote mode: {'ENABLED' if enabled else 'DISABLED'}\nUse: /remote enable or /remote disable"

        action = args.strip().lower()
        if action == "enable":
            if not self.secrets.get("TELEGRAM_BOT_TOKEN"):
                return "⚠️  No Telegram bot token configured. Use /apikey telegram <token>"

            # Generate pairing code
            from ..telegram import generate_pairing_code
            code = generate_pairing_code()

            update_config({"remote_mode_enabled": True})

            return (
                f"✓ Remote mode enabled\n\n"
                f"Pairing code: {code}\n\n"
                f"To pair your Telegram:\n"
                f"1. Message your bot on Telegram\n"
                f"2. Send: /pair {code}\n\n"
                f"The bot will start when you run 'pacifica start'"
            )
        elif action == "disable":
            update_config({"remote_mode_enabled": False})
            return "✓ Remote mode disabled"
        else:
            return "Usage: /remote enable or /remote disable"

    def _cmd_performance(self, args: str) -> str:
        """Show performance metrics."""
        from ..core import calculate_performance_metrics, format_performance_report

        limit = 100
        if args:
            try:
                limit = int(args.strip())
            except ValueError:
                return "Usage: /performance [limit]"

        trades = get_recent_trades(limit=limit)

        if not trades:
            return "No trade history yet. Performance metrics require completed trades."

        metrics = calculate_performance_metrics(trades)
        report = format_performance_report(metrics)

        return report

    def _cmd_analytics(self, args: str) -> str:
        """Show detailed analytics."""
        from ..core import (
            calculate_performance_metrics,
            calculate_monthly_returns,
            calculate_symbol_performance,
        )

        symbol = args.strip().upper() if args else None

        # Get trades
        if symbol:
            trades = get_recent_trades(symbol=symbol, limit=1000)
            header = f"Analytics for {symbol}"
        else:
            trades = get_recent_trades(limit=1000)
            header = "Overall Analytics"

        if not trades:
            return f"No trade history found{' for ' + symbol if symbol else ''}."

        # Overall metrics
        metrics = calculate_performance_metrics(trades)

        lines = ["=" * 60, header, "=" * 60, ""]

        # Key metrics
        lines.append(f"Total Trades: {metrics['total_trades']}")
        lines.append(f"Win Rate: {metrics['win_rate']:.1%}")
        lines.append(f"Total PnL: ${metrics['total_pnl']:,.2f}")
        lines.append(f"Sharpe Ratio: {metrics['sharpe_ratio']:.2f}")
        lines.append(f"Max Drawdown: ${metrics['max_drawdown']:,.2f} ({metrics['max_drawdown_pct']:.2f}%)")
        lines.append(f"Profit Factor: {metrics['profit_factor']:.2f}")
        lines.append("")

        # Monthly returns
        monthly = calculate_monthly_returns(trades)
        if monthly:
            lines.append("Monthly Returns:")
            for month, pnl in list(monthly.items())[-6:]:  # Last 6 months
                sign = "+" if pnl >= 0 else ""
                lines.append(f"  {month}: {sign}${pnl:,.2f}")
            lines.append("")

        # Per-symbol performance (if showing all trades)
        if not symbol:
            symbol_perf = calculate_symbol_performance(trades)
            if symbol_perf:
                lines.append("Performance by Symbol:")
                for sym, data in sorted(symbol_perf.items(), key=lambda x: x[1]['total_pnl'], reverse=True):
                    sign = "+" if data['total_pnl'] >= 0 else ""
                    lines.append(
                        f"  {sym}: {sign}${data['total_pnl']:,.2f} | "
                        f"{data['trade_count']} trades | {data['win_rate']:.1%} win rate"
                    )
                lines.append("")

        lines.append("=" * 60)

        return "\n".join(lines)

    def _cmd_account(self, args: str) -> str:
        """Show account statistics from Pacifica."""
        from ..core import (
            get_account_equity_history,
            get_trade_history,
            get_funding_history,
        )

        if not self.keypair:
            return "⚠️  No keypair loaded. Cannot fetch account data."

        wallet_address = str(self.keypair.pubkey())

        # Parse time range
        time_range = "7d"
        if args:
            time_range = args.strip()

        lines = [
            "=" * 60,
            "PACIFICA ACCOUNT STATS",
            "=" * 60,
            f"Wallet: {wallet_address[:8]}...{wallet_address[-8:]}",
            "",
        ]

        # Fetch account info (balance, equity)
        account_info = get_account_info(wallet_address)
        if account_info:
            lines.append("Balance & Equity:")
            lines.append(f"  USDC Balance: ${account_info.get('balance', 0):,.2f}")
            lines.append(f"  Account Equity: ${account_info.get('account_equity', 0):,.2f}")
            lines.append(f"  Available to Trade: ${account_info.get('available_to_spend', 0):,.2f}")
            lines.append(f"  Margin Used: ${account_info.get('total_margin_used', 0):,.2f}")
            lines.append("")

            # Display spot token balances
            spot_balances = account_info.get('spot_balances', [])
            if spot_balances:
                lines.append("Tokens Owned:")
                for balance in spot_balances:
                    symbol = balance.get('symbol', 'UNKNOWN')
                    amount = float(balance.get('amount', 0))
                    available = float(balance.get('available_to_withdraw', 0))
                    pending = float(balance.get('pending_balance', 0))

                    lines.append(f"  {symbol}:")
                    lines.append(f"    Amount: {amount:.8f}")
                    lines.append(f"    Available to Withdraw: {available:.8f}")
                    if pending > 0:
                        lines.append(f"    Pending: {pending:.8f}")
                lines.append("")
        else:
            lines.append("⚠️  Could not fetch account balance")
            lines.append("")

        # Fetch positions
        positions = get_open_positions(wallet_address)
        if positions:
            total_position_value = sum(pos.get('size', 0) * pos.get('mark_price', 0) for pos in positions.values())
            total_unrealized_pnl = sum(pos.get('unrealized_pnl', 0) for pos in positions.values())

            lines.append("Open Positions:")
            lines.append(f"  Position Count: {len(positions)}")
            lines.append(f"  Total Position Value: ${total_position_value:,.2f}")
            sign = "+" if total_unrealized_pnl >= 0 else ""
            lines.append(f"  Unrealized PnL: {sign}${total_unrealized_pnl:,.2f}")
            lines.append("")

        # Fetch equity history for PnL
        equity_history = get_account_equity_history(wallet_address, time_range)
        if equity_history:
            summary = equity_history.get('summary', {})
            if summary:
                lines.append(f"Performance ({time_range}):")
                total_pnl = summary.get('total_pnl', 0)
                total_return = summary.get('total_return_pct', 0)
                sign = "+" if total_pnl >= 0 else ""
                lines.append(f"  Total PnL: {sign}${total_pnl:,.2f} ({sign}{total_return:.2f}%)")
                lines.append("")

        # Fetch trade history for volume
        trades = get_trade_history(wallet_address, limit=100)
        if trades:
            total_volume = sum(
                abs(t.get('entry_price', 0) * t.get('quantity', 0))
                for t in trades
            )
            lines.append(f"Trading Activity ({len(trades)} trades):")
            lines.append(f"  Total Trading Volume: ${total_volume:,.2f}")
            lines.append("")

        # Fetch funding history
        funding = get_funding_history(wallet_address, limit=10)
        if funding:
            total_funding = sum(f.get('payment', 0) for f in funding)
            sign = "+" if total_funding >= 0 else ""
            lines.append(f"Funding Payments (last {len(funding)}):")
            lines.append(f"  Total Funding: {sign}${total_funding:,.2f}")
            lines.append("")

        lines.append("=" * 60)

        return "\n".join(lines)

    def _cmd_backtest(self, args: str) -> str:
        """Run a backtest."""
        from ..core import run_simple_backtest

        parts = args.strip().split()
        if len(parts) != 2:
            return (
                "Usage: /backtest <symbol> <days>\n"
                "Example: /backtest BTC 30\n\n"
                "This will run a backtest on historical data and show performance metrics."
            )

        symbol = parts[0].upper()
        try:
            days = int(parts[1])
        except ValueError:
            return "Error: Days must be a number"

        if days < 1 or days > 365:
            return "Error: Days must be between 1 and 365"

        print(f"\nRunning backtest for {symbol} over {days} days...")
        print("This may take a minute...\n")

        try:
            results = run_simple_backtest(
                symbol=symbol,
                days_back=days,
                initial_capital=self.config.get('max_position_usdc', 1000) * 10,
            )

            if results.get('error'):
                return f"Backtest failed: {results['error']}"

            # Format results
            metrics = results['metrics']
            lines = [
                "\n" + "=" * 60,
                f"BACKTEST RESULTS: {symbol} ({days} days)",
                "=" * 60,
                "",
                f"Initial Capital: ${results.get('final_capital', 0) - results.get('total_return', 0):,.2f}",
                f"Final Capital: ${results.get('final_capital', 0):,.2f}",
                f"Total Return: ${results.get('total_return', 0):,.2f} ({results.get('total_return_pct', 0):.2f}%)",
                "",
                f"Total Trades: {metrics['total_trades']}",
                f"Win Rate: {metrics['win_rate']:.1%}",
                f"Profit Factor: {metrics['profit_factor']:.2f}",
                f"Sharpe Ratio: {metrics['sharpe_ratio']:.2f}",
                f"Max Drawdown: ${metrics['max_drawdown']:,.2f} ({metrics['max_drawdown_pct']:.2f}%)",
                "",
                "=" * 60,
            ]

            return "\n".join(lines)

        except Exception as e:
            return f"Backtest error: {str(e)}"

    def _cmd_portfolio(self) -> str:
        """Show portfolio risk metrics."""
        from ..core import get_portfolio_risk_metrics

        if not self.keypair:
            return "⚠️  No keypair loaded. Cannot fetch portfolio data."

        wallet_address = str(self.keypair.pubkey())
        positions = get_open_positions(wallet_address)

        if not positions:
            return "No open positions. Portfolio metrics require active positions."

        # Get historical trades for correlation analysis
        trades_by_symbol = {}
        for symbol in positions.keys():
            trades = get_recent_trades(symbol=symbol, limit=50)
            if trades:
                trades_by_symbol[symbol] = trades

        max_exposure = self.config.get('max_portfolio_exposure_usdc', 1000.0)

        metrics = get_portfolio_risk_metrics(
            positions=positions,
            trades_by_symbol=trades_by_symbol,
            max_total_exposure_usdc=max_exposure,
        )

        lines = [
            "=" * 60,
            "PORTFOLIO RISK METRICS",
            "=" * 60,
            "",
            f"Total Exposure: ${metrics['total_exposure']:,.2f}",
            f"Max Exposure: ${max_exposure:,.2f}",
            f"Utilization: {metrics['exposure_utilization_pct']:.1f}%",
            f"Position Count: {metrics['position_count']}",
            f"Diversification Score: {metrics['diversification_score']:.2f}",
            f"Within Limits: {'✓ Yes' if metrics['within_limits'] else '✗ No'}",
            "",
        ]

        # Correlation matrix
        if metrics.get('correlation_matrix'):
            lines.append("Correlation Matrix:")
            symbols = list(metrics['correlation_matrix'].keys())
            for sym_a in symbols:
                corr_strs = []
                for sym_b in symbols:
                    if sym_a != sym_b:
                        corr = metrics['correlation_matrix'][sym_a].get(sym_b, 0)
                        corr_strs.append(f"{sym_b}:{corr:+.2f}")
                if corr_strs:
                    lines.append(f"  {sym_a} → {', '.join(corr_strs)}")
            lines.append("")

        lines.append("=" * 60)

        return "\n".join(lines)
