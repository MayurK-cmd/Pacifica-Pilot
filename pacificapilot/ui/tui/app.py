"""
PacificaPilotApp — main Textual App with 3-panel layout.

Header (top fixed) | Chat + Sidebar (middle) | Input (bottom fixed)
"""

from __future__ import annotations

import asyncio
import threading
from typing import Optional

from textual.app import App, ComposeResult
from textual.widgets import Header, Footer, Static
from textual.containers import Horizontal, Vertical
from textual.binding import Binding
from textual.reactive import reactive
from rich.table import Table
from rich.panel import Panel as RichPanel

from .header import PacificaHeader
from .chat_panel import ChatPanel
from .sidebar import Sidebar
from .input_bar import InputBar
from .modals import (
    TradeConfirmModal,
    ProviderSwitchModal,
    SettingsModal,
    ApiKeyModal,
    ModeSwitchModal,
    QuitConfirmModal,
)
from .state import get_state, PilotState

from ..repl_commands import (
    cmd_performance_impl,
    cmd_analytics_impl,
    cmd_backtest_impl,
    cmd_portfolio_impl,
    cmd_account_impl,
)
from ...storage.config import (
    load_config,
    save_config,
    load_secrets,
    update_secret,
    validate_config,
)
from ...storage.database import (
    get_all_positions,
    get_recent_trades,
    get_recent_decisions,
    get_total_pnl,
)


# Brand colors
PACIFICA_BLUE = "#5B9FFF"
PACIFICA_GREEN = "#4ADE80"
PACIFICA_RED = "#F87171"
PACIFICA_MUTED = "#6B7280"


class PacificaPilotApp(App):
    """Main TUI application."""

    TITLE = "PacificaPilot"
    SUB_TITLE = "AI Trading Agent"
    ENABLE_MOUSE_SUPPORT = False  # Allow terminal text selection

    CSS = """
    Screen {
        background: #1A1D2E;
    }

    #main-layout {
        height: 1fr;
    }

    PacificaHeader {
        height: 3;
        dock: top;
        padding: 0 1;
        background: #232742;
        color: #F5F5F7;
    }

    #chat-sidebar-container {
        height: 1fr;
    }

    #chat-sidebar-container > Horizontal {
        height: 100%;
    }

    ChatPanel {
        width: 65%;
        height: 100%;
        max-width: 65%;
        border-right: solid #3E4A5E;
        padding: 0 1;
    }

    Sidebar {
        width: 35%;
        height: 100%;
        padding: 0 1;
        overflow-y: auto;
    }

    /* Footer between chat and input bar */
    #footer-bar {
        dock: bottom;
        height: 1;
        background: #0a0a0a;
        color: #6B7280;
        padding: 0 1;
    }

    InputBar {
        dock: bottom;
        height: 3;
        background: #232742;
        padding: 0 1;
    }

    /* textual-autocomplete dropdown */
    Dropdown {
        background: #111111;
        border: solid #00d4aa;
    }

    DropdownItem {
        padding: 0 2;
    }

    DropdownItem.-highlight {
        background: #00d4aa;
        color: #000;
    }

    InputBar > #input-field {
        width: 100%;
        background: #2D3250;
        color: #F5F5F7;
        border: none;
        padding: 0 1;
        height: 1;
    }

    InputBar > #hint-bar {
        height: 1;
        color: #6B7280;
    }

    ModalScreen {
        background: rgba(0, 0, 0, 0.7);
        align: center middle;
    }

    /* Trade confirmation modal */
    #confirm-title {
        width: 60;
        text-align: center;
        padding: 1 2;
    }

    #confirm-details {
        width: 60;
        border: solid #5B9FFF;
        padding: 1 2;
        background: #1A1D2E;
    }

    #confirm-buttons {
        width: 60;
        align: center middle;
        height: 3;
    }

    #confirm-yes {
        margin: 0 2;
        background: #22c55e;
        color: #000;
    }

    #confirm-no {
        margin: 0 2;
        background: #6B7280;
        color: #fff;
    }

    #confirm-hint {
        width: 60;
        text-align: center;
        color: #6B7280;
    }

    #provider-title, #settings-title {
        text-align: center;
    }
    """

    BINDINGS = [
        Binding("ctrl+c", "quit", "Quit"),
        Binding("ctrl+q", "quit_confirm", "Quit?"),
        Binding("ctrl+p", "command_palette", "Palette"),
        Binding("ctrl+m", "switch_provider", "Provider"),
        Binding("ctrl+s", "open_settings", "Settings"),
        Binding("ctrl+o", "toggle_tool_card", "Tool card"),
        Binding("ctrl+l", "clear_chat", "Clear"),
        Binding("ctrl+r", "refresh_sidebar", "Refresh"),
        Binding("ctrl+d", "toggle_dry_run", "Dry run"),
        Binding("ctrl+k", "open_apikey", "API Key"),
        Binding("ctrl+t", "mode_switch", "Mode"),
    ]

    def __init__(self, loop_agent=None):
        super().__init__()
        self._loop_agent = loop_agent
        self._chat_agent = None
        self._loop_started_internally = False
        self._tool_cards_visible = False

    def action_copy(self) -> None:
        """Ctrl+Shift+C — copy selected text or fallback to system clipboard."""
        try:
            import pyperclip
            focused = self.focused
            if focused and hasattr(focused, "selected_text") and focused.selected_text:
                pyperclip.copy(focused.selected_text)
            elif focused and hasattr(focused, "value"):
                pyperclip.copy(str(focused.value))
        except Exception:
            pass

    def compose(self) -> ComposeResult:
        yield PacificaHeader()
        with Horizontal(id="chat-sidebar-container"):
            yield ChatPanel()
            yield Sidebar()
        yield Static(id="footer-bar")
        yield InputBar(submit_callback=self._on_submit)

    def on_mount(self) -> None:
        self._init_chat_agent()

        # Footer timer — update every 5 seconds
        self.set_interval(5, self._refresh_footer)
        self._refresh_footer()

        # Sidebar timer — refresh every 10 seconds
        self.set_interval(10, self._refresh_sidebar_if_running)

        chat = self.query_one(ChatPanel)

        # Load session history from SQLite (non-blocking)
        self.call_later(self._load_session_history)

        chat.add_system_event("TUI ready — type a message or /help")

    def _refresh_sidebar_if_running(self) -> None:
        """Refresh sidebar data from shared state."""
        try:
            self.query_one(Sidebar).refresh_content()
        except Exception:
            pass

    def _refresh_footer(self) -> None:
        """Update the footer bar with live state."""
        try:
            s = get_state().to_dict()
            parts = []
            # Loop status
            if s["agent_running"]:
                loop_status = "[green]● RUNNING[/]" if not s["agent_paused"] else "[yellow]⏸ PAUSED[/]"
            else:
                loop_status = "[red]✗ STOPPED[/]"
            parts.append(f"loop: {loop_status}")
            # Provider
            p = s.get("provider_name", "") or "n/a"
            parts.append(f"provider: [dim]{p}[/]")
            # Dry run
            dry_str = f"[green]dry:ON[/]" if s["dry_run"] else f"[yellow]dry:OFF[/]"
            parts.append(dry_str)
            # Mode
            mode_color = "green" if s["mode"] == "testnet" else "red"
            parts.append(f"[{mode_color}]{s['mode']}[/]")
            footer = self.query_one("#footer-bar")
            footer.update("  |  ".join(parts))
        except Exception:
            pass

    def _load_session_history(self) -> None:
        """Load last 50 trades from SQLite into chat panel as dim history."""
        try:
            from ...storage.database import get_recent_trades, get_recent_decisions
            trades = get_recent_trades(limit=50)
            chat = self.query_one(ChatPanel)
            if trades:
                chat.add_system_event(f"Loaded {len(trades)} trades from previous session")
                for t in trades[:10]:  # Show last 10
                    side = "LONG" if t.get("side") == "bid" else "SHORT"
                    pnl = float(t.get("realized_pnl", 0))
                    pnl_s = f"+${pnl:.2f}" if pnl >= 0 else f"-${abs(pnl):.2f}"
                    chat.write(f"[dim]{t.get('symbol', '?')} {side} {pnl_s}[/]")
        except Exception:
            pass

    def _init_chat_agent(self) -> None:
        """Lazy init the chat agent on first message."""
        if self._chat_agent is not None:
            return
        from ...agents.chat import ChatAgent
        from solders.keypair import Keypair
        import base58

        self._chat_agent = ChatAgent()

        # Load keypair
        private_key = self._chat_agent.secrets.get("PACIFICA_PRIVATE_KEY")
        if private_key:
            try:
                self._chat_agent.keypair = Keypair.from_bytes(base58.b58decode(private_key))
                get_state().update(has_keypair=True)
            except Exception as e:
                chat = self.query_one(ChatPanel)
                chat.add_system_event(f"⚠ Keypair load failed: {e}")

        # Sync config to state
        self._sync_config_to_state()

    def _sync_config_to_state(self) -> None:
        if not self._chat_agent:
            return
        cfg = self._chat_agent.config
        get_state().update(
            mode=cfg.get("mode", "testnet"),
            dry_run=cfg.get("dry_run", True),
            provider_name=cfg.get("chat_agent_provider", ""),
        )
        # Memory status
        from ...memory import get_memory
        mem = get_memory()
        get_state().update(
            memory_enabled=mem.enabled,
            memory_count=0,
            memory_mode=mem.mode if mem.enabled else "",
        )
        # Fetch live account data (async via thread)
        self._fetch_account_data()

    def _fetch_account_data(self) -> None:
        """Fetch live account data from Pacifica API in background thread."""
        try:
            from ...storage.config import load_secrets
            wallet = load_secrets().get("PACIFICA_PUBLIC_KEY")
            if not wallet:
                return
        except Exception:
            return

        def _fetch():
            try:
                from ...core.trading import get_account_info, get_open_positions
                info = get_account_info(wallet)
                positions = get_open_positions(wallet)
                if info:
                    def update_state():
                        get_state().update(
                            account_equity=float(info.get("account_equity", info.get("accountEquity", 0))),
                            account_available=float(info.get("available_to_spend", info.get("availableToSpend", 0))),
                            account_margin=float(info.get("total_margin_used", info.get("usedMargin", 0))),
                        )
                    self.call_from_thread(update_state)
                if positions:
                    from .state import PositionState
                    def update_positions():
                        for sym, p in positions.items():
                            ps = PositionState(
                                symbol=sym,
                                side="LONG" if p.get("side") == "bid" else "SHORT",
                                size=float(p.get("size", 0)),
                                entry_price=float(p.get("entry_price", 0)),
                                mark_price=float(p.get("mark_price", 0)),
                                unrealized_pnl=float(p.get("unrealized_pnl", 0)),
                            )
                            get_state().set_position(sym, ps)
                    self.call_from_thread(update_positions)
                def refresh():
                    self.query_one(Sidebar).refresh_content()
                self.call_from_thread(refresh)
            except Exception:
                pass
        thread = threading.Thread(target=_fetch, daemon=True, name="AccountFetch")
        thread.start()

    def _on_submit(self, text: str) -> None:
        chat = self.query_one(ChatPanel)
        chat.add_user_message(text)

        if text.startswith("/"):
            self._handle_command(text)
        else:
            self._handle_chat(text)

    def _handle_command(self, text: str) -> None:
        parts = text.split()
        cmd = parts[0].lower()
        args = parts[1:] if len(parts) > 1 else []
        chat = self.query_one(ChatPanel)

        try:
            if cmd == "/help":
                self._show_help()
            elif cmd == "/config":
                self._cmd_config(args)
            elif cmd == "/apikey":
                self._cmd_apikey(args)
            elif cmd == "/mode":
                self._cmd_mode(args)
            elif cmd == "/status":
                self._cmd_status()
            elif cmd == "/positions":
                self._cmd_positions()
            elif cmd == "/history":
                self._cmd_history(args)
            elif cmd == "/performance":
                self._cmd_performance(args)
            elif cmd == "/analytics":
                self._cmd_analytics(args)
            elif cmd == "/backtest":
                self._cmd_backtest(args)
            elif cmd == "/portfolio":
                self._cmd_portfolio()
            elif cmd == "/account":
                self._cmd_account(args)
            elif cmd in ("/start",):
                self._cmd_start()
            elif cmd in ("/stop",):
                self._cmd_stop()
            elif cmd in ("/pause", "/loop", "/loop off"):
                self._cmd_pause()
            elif cmd in ("/resume", "/loop on"):
                self._cmd_resume()
            elif cmd == "/remote":
                chat.add_agent_message("Telegram mode: /remote enable | disable")
            elif cmd in ("/exit", "/quit"):
                self.action_quit_confirm()
            else:
                chat.add_agent_message(f"Unknown command: {cmd}\nType /help to see available commands.")
        except Exception as e:
            chat.add_system_event(f"Error: {e}")

    def _handle_chat(self, text: str) -> None:
        chat = self.query_one(ChatPanel)
        if not self._chat_agent:
            chat.add_agent_message("Chat agent not initialised.")
            return

        # Reload config and secrets from file (chat agent does this too,
        # but we check here to give a helpful message before submission)
        from ...storage.config import load_config, load_secrets
        cfg = load_config()
        secrets = load_secrets()

        provider = cfg.get("chat_agent_provider")
        secret_map = {
            "anthropic": "ANTHROPIC_API_KEY",
            "openai": "OPENAI_API_KEY",
            "gemini": "GOOGLE_API_KEY",
            "google": "GOOGLE_API_KEY",
            "openrouter": "OPENROUTER_API_KEY",
        }
        sk = secret_map.get(provider)
        has_key = secrets.get(sk) if sk else None

        if not provider or not has_key:
            chat.add_agent_message("⚠️  No AI provider configured. Use /apikey <provider> <key> then /config chat_agent_provider <provider>.")
            return

        # Set up confirmation hooks so the Chat Agent uses TUI modals
        # instead of blocking input() in the background thread.
        def on_message(msg: str):
            def _show():
                chat.add_agent_message(msg)
            self.call_from_thread(_show)
        self._chat_agent._message_hook = on_message
        self._chat_agent._confirm_hook = self._tui_confirm

        # Run in thread so UI stays responsive
        def run_chat():
            try:
                response = self._chat_agent.handle_natural_language(text)
                self.call_from_thread(self._sync_config_to_state)
                if response:
                    def show_response():
                        chat.add_agent_message(response)
                    self.call_from_thread(show_response)
            except Exception as e:
                def show_error():
                    chat.add_system_event(f"Chat error: {e}")
                self.call_from_thread(show_error)

        thread = threading.Thread(target=run_chat, daemon=True)
        thread.start()

    def _tui_confirm(self, message: str, data: dict) -> bool:
        """Called from background thread — blocks until user confirms/cancels via modal."""
        import threading as _t
        result = [False]
        event = _t.Event()

        def on_modal_result(val):
            result[0] = val
            event.set()

        def show_modal():
            self.push_screen(TradeConfirmModal(message, data), on_modal_result)

        # show_modal runs on the main thread via call_from_thread.
        # Inside show_modal we call push_screen DIRECTLY (no nested call_from_thread)
        # because we're already on the main thread.
        self.call_from_thread(show_modal)
        event.wait(timeout=300)
        return result[0]

    def _show_help(self) -> None:
        chat = self.query_one(ChatPanel)
        from .input_bar import SLASH_COMMANDS
        lines = ["[bold]Available commands:[/]\n"]
        for item in SLASH_COMMANDS:
            cmd = item.main
            desc = item.prompt if hasattr(item, "prompt") else ""
            lines.append(f"  [bold]{cmd:15}[/] [dim]{desc}[/]")
        lines.append("")
        lines.append("[dim]Also type anything in natural language to chat with the AI agent.[/]")
        chat.add_agent_message("\n".join(lines))

    def _cmd_config(self, args: list) -> None:
        chat = self.query_one(ChatPanel)
        if not args:
            config = load_config()
            lines = ["[bold]Configuration:[/]\n"]
            for k, v in config.items():
                lines.append(f"  [bold]{k}:[/] {v}")
            chat.add_agent_message("\n".join(lines))
        elif len(args) >= 2:
            key = args[0]
            val = " ".join(args[1:])
            config = load_config()
            config[key] = self._parse_config_value(key, val)
            # Ensure symbols is never empty
            if not config.get("symbols"):
                config["symbols"] = ["BTC", "ETH"]
            valid, err = validate_config(config)
            if not valid:
                chat.add_agent_message(f"❌ {err}")
                return
            save_config(config)
            # Reload chat agent config so it picks up changes immediately
            if self._chat_agent:
                self._chat_agent.config = load_config()
                self._chat_agent.secrets = load_secrets()
            self._sync_config_to_state()
            chat.add_agent_message(f"✓ Updated {key} = {config[key]}")

    def _cmd_apikey(self, args: list) -> None:
        chat = self.query_one(ChatPanel)
        if not args:
            secrets = load_secrets()
            lines = ["[bold]API Keys:[/]\n"]
            for key in ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GOOGLE_API_KEY", "OPENROUTER_API_KEY", "SUPERMEMORY_API_KEY"]:
                val = secrets.get(key, "")
                masked = f"{val[:4]}...{val[-4:]}" if len(val) > 8 else "Not set"
                lines.append(f"  {key}: {masked}")
            chat.add_agent_message("\n".join(lines))
        elif len(args) >= 2:
            provider = args[0].lower()
            key_val = " ".join(args[1:])
            provider_map = {
                "anthropic": "ANTHROPIC_API_KEY",
                "openai": "OPENAI_API_KEY",
                "google": "GOOGLE_API_KEY",
                "openrouter": "OPENROUTER_API_KEY",
                "telegram": "TELEGRAM_BOT_TOKEN",
                "supermemory": "SUPERMEMORY_API_KEY",
            }
            key_name = provider_map.get(provider)
            if not key_name:
                chat.add_agent_message(f"Unknown provider: {provider}")
                return
            update_secret(key_name, key_val)
            if provider == "supermemory":
                from ...memory import reset_memory
                pieces = key_val.split(maxsplit=1)
                raw_key = pieces[0]
                sm_mode = pieces[1].lower() if len(pieces) > 1 else None
                if raw_key.lower() in ("local", "cloud"):
                    chat.add_agent_message("Invalid syntax. Use: /apikey supermemory <key> [local|cloud]")
                    return
                update_secret("SUPERMEMORY_API_KEY", raw_key)
                if sm_mode in ("local", "cloud"):
                    update_secret("SUPERMEMORY_MODE", sm_mode)
                new_mem = reset_memory(api_key=raw_key, mode=sm_mode)
                if new_mem.enabled:
                    get_state().update(memory_enabled=True)
                    chat.add_agent_message(f"✓ Supermemory connected ({new_mem.mode})")
                else:
                    chat.add_agent_message("⚠ Key saved but connection failed.")
            else:
                chat.add_agent_message(f"✓ Updated {provider} API key")
            self._sync_config_to_state()

    def _cmd_mode(self, args: list) -> None:
        chat = self.query_one(ChatPanel)
        if not args:
            chat.add_agent_message(f"Current mode: {load_config().get('mode', 'testnet')}")
            return
        mode = args[0].lower()
        from ...storage.config import update_config
        if mode == "mainnet":
            chat.add_agent_message("⚠ Use /mode mainnet with confirmation from /config")
            return
        update_config({"mode": mode})
        get_state().update(mode=mode)
        chat.add_agent_message(f"✓ Switched to {mode}")

    def _cmd_status(self) -> None:
        self.query_one(Sidebar).refresh_content()

    def _cmd_positions(self) -> None:
        chat = self.query_one(ChatPanel)
        from ...core.trading import get_open_positions
        from ...storage.config import load_secrets
        wallet = load_secrets().get("PACIFICA_PUBLIC_KEY")
        if not wallet:
            chat.add_agent_message("No wallet configured.")
            return
        positions = get_open_positions(wallet)
        if not positions:
            chat.add_agent_message("No open positions.")
            return
        table = Table(title="Open Positions", box=None)
        table.add_column("Symbol")
        table.add_column("Side")
        table.add_column("Size")
        table.add_column("Entry")
        table.add_column("PnL")
        for sym, pos in positions.items():
            color = "green" if pos.get("unrealized_pnl", 0) >= 0 else "red"
            table.add_row(sym, pos["side"].upper(), f"${pos['size']:.2f}", f"${pos['entry_price']:,.2f}", f"[{color}]${pos['unrealized_pnl']:,.2f}[/]")
        chat.add_raw(table)

    def _cmd_history(self, args: list) -> None:
        chat = self.query_one(ChatPanel)
        limit = int(args[0]) if args and args[0].isdigit() else 10
        trades = get_recent_trades(limit=limit)
        total = get_total_pnl()
        if not trades:
            chat.add_agent_message("No trade history.")
            return
        lines = [f"Recent trades (last {len(trades)}):\n"]
        for t in trades:
            side = "LONG" if t["side"] == "bid" else "SHORT"
            pnl = t["realized_pnl"]
            pnl_s = f"+${pnl:.2f}" if pnl >= 0 else f"-${abs(pnl):.2f}"
            lines.append(f"  {t['symbol']} {side} ${t['entry_price']:,.2f}→${t['exit_price']:,.2f} {pnl_s}")
        lines.append(f"\nTotal realized PnL: ${total:.2f}")
        chat.add_agent_message("\n".join(lines))

    def _cmd_performance(self, args: list) -> None:
        from ...storage.config import load_secrets
        wallet = load_secrets().get("PACIFICA_PUBLIC_KEY")
        if not wallet:
            self.query_one(ChatPanel).add_agent_message("No wallet configured.")
            return
        # Use the existing rich impl
        from rich.console import Console
        console = Console()
        cmd_performance_impl(
            console, args, get_recent_trades,
            PACIFICA_BLUE, "#F5F5F7", PACIFICA_GREEN, PACIFICA_RED, "#3E4A5E", PACIFICA_MUTED,
        )

    def _cmd_analytics(self, args: list) -> None:
        from ...storage.config import load_secrets
        wallet = load_secrets().get("PACIFICA_PUBLIC_KEY")
        if not wallet:
            self.query_one(ChatPanel).add_agent_message("No wallet configured.")
            return
        from rich.console import Console
        console = Console()
        cmd_analytics_impl(
            console, args, get_recent_trades,
            PACIFICA_BLUE, "#F5F5F7", PACIFICA_GREEN, PACIFICA_RED, "#3E4A5E", PACIFICA_MUTED,
        )

    def _cmd_backtest(self, args: list) -> None:
        self.query_one(ChatPanel).add_agent_message("Running backtest... (use via REPL for now)")

    def _cmd_portfolio(self) -> None:
        from rich.console import Console
        console = Console()
        cmd_portfolio_impl(
            console, get_all_positions, load_config,
            PACIFICA_BLUE, "#F5F5F7", PACIFICA_GREEN, PACIFICA_RED, "#3E4A5E", PACIFICA_MUTED,
        )

    def _cmd_account(self, args: list) -> None:
        from rich.console import Console
        console = Console()
        cmd_account_impl(
            console, args, PACIFICA_BLUE, PACIFICA_MUTED,
            PACIFICA_GREEN, PACIFICA_RED, "#F5F5F7", "#3E4A5E",
        )

    def _cmd_start(self) -> None:
        chat = self.query_one(ChatPanel)
        if self._loop_agent and getattr(self._loop_agent, "running", False):
            chat.add_agent_message("Loop Agent is already running.")
            return
        import threading
        from ...agents.loop import LoopAgent

        self._loop_agent = LoopAgent()
        t = threading.Thread(target=self._loop_agent.start, daemon=True, name="LoopAgent")
        t.start()
        get_state().update(agent_running=True, agent_paused=False)
        chat.add_system_event("Loop Agent started")
        self.query_one(Sidebar).refresh_content()

    def _cmd_stop(self) -> None:
        chat = self.query_one(ChatPanel)
        if not self._loop_agent or not getattr(self._loop_agent, "running", False):
            chat.add_agent_message("Loop Agent is not running.")
            return
        self._loop_agent.running = False
        self._loop_agent = None
        get_state().update(agent_running=False, agent_paused=False)
        chat.add_system_event("Loop Agent stopped")
        self.query_one(Sidebar).refresh_content()

    def _cmd_pause(self) -> None:
        chat = self.query_one(ChatPanel)
        if not self._loop_agent or not getattr(self._loop_agent, "running", False):
            chat.add_agent_message("Loop Agent is not running.")
            return
        self._loop_agent.pause()
        get_state().update(agent_paused=True)
        chat.add_system_event("Loop Agent paused")
        self.query_one(Sidebar).refresh_content()

    def _cmd_resume(self) -> None:
        chat = self.query_one(ChatPanel)
        if not self._loop_agent or not getattr(self._loop_agent, "running", False):
            chat.add_agent_message("Loop Agent is not running.")
            return
        self._loop_agent.resume()
        get_state().update(agent_paused=False)
        chat.add_system_event("Loop Agent resumed")
        self.query_one(Sidebar).refresh_content()

    def action_quit_confirm(self) -> None:
        self.push_screen(QuitConfirmModal(), self._on_quit_result)

    def _on_quit_result(self, confirmed: bool) -> None:
        if confirmed:
            if self._loop_agent:
                self._loop_agent.running = False
            self.exit(0)

    def action_command_palette(self) -> None:
        inp = self.query_one("#input-field")
        inp.focus()
        inp.value = "/"
        inp.cursor_position = 1

    def action_switch_provider(self) -> None:
        """Ctrl+M — provider switcher modal."""
        self.push_screen(ProviderSwitchModal(), self._on_provider_selected)

    def _on_provider_selected(self, result) -> None:
        if result:
            from ...storage.config import update_config
            update_config({"chat_agent_provider": result})
            if self._chat_agent:
                from ...storage.config import load_config
                self._chat_agent.config = load_config()
            self._sync_config_to_state()
            self.query_one(ChatPanel).add_system_event(f"Switched provider to {result}")

    def action_open_settings(self) -> None:
        """Ctrl+S — settings modal."""
        self.push_screen(SettingsModal())

    def action_toggle_dry_run(self) -> None:
        """Toggle dry run in config.json."""
        from ...storage.config import load_config, save_config
        cfg = load_config()
        current = cfg.get("dry_run", True)
        new_val = not current
        if not new_val:
            # Confirm before turning DRY RUN OFF
            chat = self.query_one(ChatPanel)
            chat.add_system_event("⚠ Dry Run OFF — orders will be real")
        cfg["dry_run"] = new_val
        save_config(cfg)
        get_state().update(dry_run=new_val)
        self.query_one(Sidebar).refresh_content()

    def action_clear_chat(self) -> None:
        """Ctrl+L — clear the chat panel."""
        chat = self.query_one(ChatPanel)
        chat.clear()
        chat.add_system_event("Chat cleared")

    def action_refresh_sidebar(self) -> None:
        """Ctrl+R — force-refresh sidebar data."""
        self._sync_config_to_state()
        self.query_one(Sidebar).refresh_content()
        self.query_one(ChatPanel).add_system_event("Sidebar refreshed")

    def action_toggle_tool_card(self) -> None:
        self._tool_cards_visible = not self._tool_cards_visible

    def action_open_apikey(self) -> None:
        """Open in-TUI API key modal."""
        self.push_screen(ApiKeyModal(), self._on_apikey_result)

    def _on_apikey_result(self, result) -> None:
        if not result:
            return
        provider = result["provider"].lower()
        key = result["key"]
        from ...storage.config import update_secret
        from ...storage.config import load_config
        provider_map = {
            "anthropic": "ANTHROPIC_API_KEY",
            "openai": "OPENAI_API_KEY",
            "google": "GOOGLE_API_KEY",
            "openrouter": "OPENROUTER_API_KEY",
            "supermemory": "SUPERMEMORY_API_KEY",
        }
        key_name = provider_map.get(provider)
        if not key_name:
            self.query_one(ChatPanel).add_system_event(f"Unknown provider: {provider}")
            return
        update_secret(key_name, key)
        if provider == "supermemory":
            from ...memory import reset_memory
            pieces = key.split(maxsplit=1)
            raw_key = pieces[0]
            sm_mode = pieces[1].lower() if len(pieces) > 1 else None
            if raw_key.lower() in ("local", "cloud"):
                self.query_one(ChatPanel).add_agent_message("Invalid: use <key> [local|cloud]")
                return
            update_secret("SUPERMEMORY_API_KEY", raw_key)
            if sm_mode in ("local", "cloud"):
                update_secret("SUPERMEMORY_MODE", sm_mode)
            reset_memory(api_key=raw_key, mode=sm_mode)
        self._sync_config_to_state()
        if self._chat_agent:
            self._chat_agent.secrets = load_config()
        self.query_one(ChatPanel).add_system_event(f"Updated {provider} key")

    def action_mode_switch(self) -> None:
        """Open in-TUI mode switch modal."""
        self.push_screen(ModeSwitchModal(), self._on_mode_result)

    def _on_mode_result(self, mode) -> None:
        if mode:
            from ...storage.config import update_config
            if mode == "mainnet":
                self.query_one(ChatPanel).add_agent_message("Use /config mode mainnet with confirmation")
                return
            update_config({"mode": mode})
            get_state().update(mode=mode)
            self.query_one(ChatPanel).add_system_event(f"Switched to {mode}")

    @staticmethod
    def _parse_config_value(key: str, val: str):
        # Model names always stay as strings (they contain / and :)
        if key.endswith("_model") or key.endswith("_provider"):
            return val
        # Symbols need special handling
        if key == "symbols":
            return [s.strip() for s in val.replace("[", "").replace("]", "").split(",") if s.strip()]
        if val.lower() in ("true", "false"):
            return val.lower() == "true"
        try:
            if "." in val:
                return float(val)
            return int(val)
        except ValueError:
            return val
