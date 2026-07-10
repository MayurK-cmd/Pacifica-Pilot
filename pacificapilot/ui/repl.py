"""
Interactive REPL with command autocomplete and styled output.

Features:
- Welcome banner with Pacifica branding
- Command autocomplete when "/" is typed
- Syntax highlighting
- Command history
- Fully implemented commands connected to backend
"""

from prompt_toolkit import PromptSession
from prompt_toolkit.completion import WordCompleter
from prompt_toolkit.styles import Style
from prompt_toolkit.formatted_text import HTML
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.table import Table
from rich import box
import sys
from typing import Optional

from pacificapilot.storage.config import (
    load_config,
    save_config,
    load_secrets,
    update_secret,
    validate_config,
)
from pacificapilot.storage.database import (
    get_all_positions,
    get_recent_trades,
    get_recent_decisions,
    get_total_pnl,
)
from pacificapilot.ui.repl_commands import (
    cmd_performance_impl,
    cmd_analytics_impl,
    cmd_backtest_impl,
    cmd_portfolio_impl,
    cmd_account_impl,
)


# Pacifica Pilot brand colors (converted from oklch to RGB approximations)
PACIFICA_BLUE = "#5B9FFF"  # oklch(0.74 0.13 230)
PACIFICA_BG = "#1A1D2E"    # oklch(0.16 0.012 240)
PACIFICA_FG = "#F5F5F7"    # oklch(0.96 0.005 90)
PACIFICA_MUTED = "#6B7280" # oklch(0.65 0.015 240)
PACIFICA_BORDER = "#3E4A5E" # oklch(0.3 0.018 230)
PACIFICA_GREEN = "#4ADE80"  # Success/profit color
PACIFICA_RED = "#F87171"    # Error/loss color

# Available commands
COMMANDS = [
    "/config",
    "/apikey",
    "/mode",
    "/status",
    "/positions",
    "/history",
    "/performance",
    "/analytics",
    "/backtest",
    "/portfolio",
    "/account",
    "/start",
    "/stop",
    "/pause",
    "/resume",
    "/remote",
    "/help",
    "/exit",
    "/quit",
]

# Command descriptions
COMMAND_HELP = {
    "/config": "View or edit trading parameters and risk limits",
    "/apikey": "Add or rotate provider API keys",
    "/mode": "Switch between testnet and mainnet",
    "/status": "Show account equity, positions, and Loop Agent status",
    "/positions": "List open perpetual positions",
    "/history": "Show recent trades and decisions",
    "/performance": "Show performance metrics (Sharpe, drawdown, win rate)",
    "/analytics": "Detailed analytics and monthly returns",
    "/backtest": "Run backtest on historical data",
    "/portfolio": "Show portfolio risk metrics and correlation",
    "/account": "Show account stats from Pacifica (equity, volume, PnL)",
    "/start": "Boot the autonomous Loop Agent in the background",
    "/stop": "Stop the autonomous Loop Agent",
    "/pause": "Soft-pause the Loop Agent (skips cycles but keeps the process)",
    "/resume": "Resume a soft-paused Loop Agent",
    "/remote": "Bind/unbind a Telegram chat for remote status",
    "/help": "List all commands with usage examples",
    "/exit": "Exit the CLI",
    "/quit": "Exit the CLI",
}


def create_welcome_banner() -> Panel:
    """Create the Pacifica Pilot welcome banner."""
    logo = Text()
    logo.append("  +===========================================+\n", style=f"bold {PACIFICA_BLUE}")
    logo.append("  |                                           |\n", style=f"bold {PACIFICA_BLUE}")
    logo.append("  |        ", style=f"bold {PACIFICA_BLUE}")
    logo.append("P A C I F I C A   P I L O T", style=f"bold white")
    logo.append("        |\n", style=f"bold {PACIFICA_BLUE}")
    logo.append("  |                                           |\n", style=f"bold {PACIFICA_BLUE}")
    logo.append("  |     ", style=f"bold {PACIFICA_BLUE}")
    logo.append("Autonomous Trading Agent for Pacifica", style=f"{PACIFICA_MUTED}")
    logo.append("     |\n", style=f"bold {PACIFICA_BLUE}")
    logo.append("  |                                           |\n", style=f"bold {PACIFICA_BLUE}")
    logo.append("  +===========================================+", style=f"bold {PACIFICA_BLUE}")

    info = Text("\n\n")
    info.append("Type ", style=PACIFICA_FG)
    info.append("/help", style=f"bold {PACIFICA_BLUE}")
    info.append(" to see available commands, or start chatting with the agent.\n", style=PACIFICA_FG)
    info.append("Commands start with ", style=PACIFICA_MUTED)
    info.append("/", style=f"bold {PACIFICA_BLUE}")
    info.append(" and will autocomplete as you type.\n", style=PACIFICA_MUTED)

    content = Text()
    content.append(logo)
    content.append(info)

    panel = Panel(
        content,
        border_style=PACIFICA_BORDER,
        box=box.ROUNDED,
        padding=(1, 2),
        style=f"on {PACIFICA_BG}",
    )

    return panel


def create_prompt_style() -> Style:
    """Create the prompt_toolkit style matching Pacifica colors."""
    return Style.from_dict({
        'prompt': f'{PACIFICA_BLUE} bold',
        'command': f'{PACIFICA_BLUE} bold',
        'completion-menu': f'bg:{PACIFICA_BG} {PACIFICA_FG}',
        'completion-menu.completion': f'bg:{PACIFICA_BG} {PACIFICA_FG}',
        'completion-menu.completion.current': f'bg:{PACIFICA_BLUE} #000000 bold',
        'completion-menu.meta.completion': f'bg:{PACIFICA_BG} {PACIFICA_MUTED}',
        'completion-menu.meta.completion.current': f'bg:{PACIFICA_BLUE} #000000',
    })


def get_prompt_message() -> HTML:
    """Get the formatted prompt message."""
    return HTML(f'<prompt>pacifica</prompt> <b>›</b> ')


class PacificaREPL:
    """Interactive REPL for Pacifica Pilot."""

    def __init__(self):
        self.console = Console()
        self.session = None
        self.running = True

    def start(self):
        """Start the interactive REPL."""
        # Display welcome banner
        self.console.print()
        self.console.print(create_welcome_banner())
        self.console.print()

        # Create command completer
        command_completer = WordCompleter(
            COMMANDS,
            meta_dict=COMMAND_HELP,
            sentence=True,
        )

        # Create prompt session
        self.session = PromptSession(
            completer=command_completer,
            style=create_prompt_style(),
            complete_while_typing=True,
            enable_history_search=True,
        )

        # Main REPL loop
        while self.running:
            try:
                # Use patch_stdout to defer Loop Agent's print() output until
                # the prompt is idle, then redraw the prompt at the bottom.
                # Without this, output interleaves with the prompt and pushes
                # the cursor down on every line.
                from prompt_toolkit.patch_stdout import patch_stdout
                with patch_stdout():
                    user_input = self.session.prompt(get_prompt_message())

                if not user_input.strip():
                    continue

                # Handle exit commands
                if user_input.strip() in ["/exit", "/quit"]:
                    self.console.print("\n[dim]Goodbye! 👋[/dim]\n")
                    break

                # Process command or chat message
                self.process_input(user_input)

            except KeyboardInterrupt:
                self.console.print("\n[dim]Use /exit or /quit to exit[/dim]")
                continue
            except EOFError:
                break

        sys.exit(0)

    def process_input(self, user_input: str):
        """Process user input (command or chat message)."""
        if user_input.startswith("/"):
            self.handle_command(user_input)
        else:
            self.handle_chat(user_input)

    def handle_command(self, command: str):
        """Handle a slash command."""
        parts = command.split()
        cmd = parts[0].lower()
        args = parts[1:] if len(parts) > 1 else []

        try:
            if cmd == "/help":
                self.show_help()
            elif cmd == "/config":
                self.cmd_config(args)
            elif cmd == "/apikey":
                self.cmd_apikey(args)
            elif cmd == "/mode":
                self.cmd_mode(args)
            elif cmd == "/status":
                self.cmd_status()
            elif cmd == "/positions":
                self.cmd_positions()
            elif cmd == "/history":
                self.cmd_history(args)
            elif cmd == "/performance":
                self.cmd_performance(args)
            elif cmd == "/analytics":
                self.cmd_analytics(args)
            elif cmd == "/backtest":
                self.cmd_backtest(args)
            elif cmd == "/portfolio":
                self.cmd_portfolio()
            elif cmd == "/account":
                self.cmd_account(args)
            elif cmd == "/start":
                self.cmd_start()
            elif cmd == "/stop":
                self.cmd_stop()
            elif cmd == "/pause":
                self.cmd_pause()
            elif cmd == "/resume":
                self.cmd_resume()
            elif cmd == "/remote":
                self.cmd_remote(args)
            elif cmd in COMMANDS:
                self.console.print(f"\n[yellow]Command {cmd} is not yet implemented[/yellow]\n")
            else:
                self.console.print(f"\n[red]Unknown command: {cmd}[/red]")
                self.console.print("[dim]Type /help to see available commands[/dim]\n")
        except Exception as e:
            self.console.print(f"\n[red]Error executing {cmd}: {str(e)}[/red]\n")

    def cmd_config(self, args: list):
        """Show or edit configuration."""
        if not args:
            # Show current config
            config = load_config()

            table = Table(title="Configuration", box=box.ROUNDED, border_style=PACIFICA_BORDER)
            table.add_column("Setting", style=f"bold {PACIFICA_BLUE}")
            table.add_column("Value", style=PACIFICA_FG)

            # Group settings by category
            trading_settings = ["symbols", "max_position_usdc", "min_confidence", "stop_loss_pct", "take_profit_pct"]
            ai_settings = ["loop_agent_provider", "loop_agent_model", "chat_agent_provider", "chat_agent_model"]
            risk_settings = ["risk_profile", "use_kelly_criterion", "fractional_kelly"]
            mode_settings = ["mode", "dry_run"]

            for key in trading_settings:
                if key in config:
                    value = config[key]
                    if key == "symbols" and isinstance(value, list):
                        value = ", ".join(value)
                    table.add_row(key, str(value))

            table.add_section()
            for key in ai_settings:
                if key in config:
                    table.add_row(key, str(config[key]))

            table.add_section()
            for key in risk_settings:
                if key in config:
                    table.add_row(key, str(config[key]))

            table.add_section()
            for key in mode_settings:
                if key in config:
                    value = str(config[key])
                    if key == "mode":
                        color = PACIFICA_GREEN if config[key] == "testnet" else PACIFICA_RED
                        value = f"[{color}]{value}[/{color}]"
                    table.add_row(key, value)

            self.console.print()
            self.console.print(table)
            self.console.print(f"\n[dim]Use [bold]/config <key> <value>[/bold] to update a setting[/dim]")
            self.console.print(f"[dim]Symbols: [bold]/config symbols add/remove <SYMBOL>[/bold] (e.g., /config symbols add ETH)[/dim]")
            self.console.print(f"[dim]Example: [bold]/config max_position_usdc 200[/bold][/dim]\n")

        elif args[0] == "symbols" and len(args) >= 2:
            # Special handling for symbols add/remove
            config = load_config()
            symbols = list(config.get("symbols", []))

            action = args[1].lower()
            if action == "add":
                if len(args) < 3:
                    self.console.print(f"\n[yellow]Usage: /config symbols add <SYMBOL>[/yellow]")
                    self.console.print(f"[dim]Example: /config symbols add ETH[/dim]\n")
                    return
                new_symbol = args[2].upper().strip()
                if new_symbol in symbols:
                    self.console.print(f"\n[yellow]{new_symbol} is already in your symbols list[/yellow]\n")
                    return
                symbols.append(new_symbol)
                config["symbols"] = symbols
                valid, error = validate_config(config)
                if not valid:
                    self.console.print(f"\n[red]Validation error: {error}[/red]\n")
                    return
                save_config(config)
                self.console.print(f"\n[green]✓ Added {new_symbol} to symbols[/green]")
                self.console.print(f"[dim]Current symbols: {', '.join(symbols)}[/dim]\n")

            elif action == "remove":
                if len(args) < 3:
                    self.console.print(f"\n[yellow]Usage: /config symbols remove <SYMBOL>[/yellow]")
                    self.console.print(f"[dim]Example: /config symbols remove ETH[/dim]\n")
                    return
                remove_symbol = args[2].upper().strip()
                if remove_symbol not in symbols:
                    self.console.print(f"\n[yellow]{remove_symbol} is not in your symbols list[/yellow]\n")
                    return
                symbols.remove(remove_symbol)
                config["symbols"] = symbols
                valid, error = validate_config(config)
                if not valid:
                    self.console.print(f"\n[red]Validation error: {error}[/red]\n")
                    return
                save_config(config)
                self.console.print(f"\n[green]✓ Removed {remove_symbol} from symbols[/green]")
                self.console.print(f"[dim]Current symbols: {', '.join(symbols)}[/dim]\n")

            elif action == "list" or action == "show":
                self.console.print(f"\n[bold]Configured symbols:[/bold] {', '.join(symbols) if symbols else '(none)'}\n")
                self.console.print(f"[dim]Add: /config symbols add <SYMBOL>[/dim]")
                self.console.print(f"[dim]Remove: /config symbols remove <SYMBOL>[/dim]\n")

            else:
                self.console.print(f"\n[yellow]Unknown symbols action: {action}[/yellow]")
                self.console.print(f"[dim]Use: add, remove, or list[/dim]\n")

        elif args[0] in ["add", "remove", "list"]:
            # User typed /config add BTC or /config remove SOL without the 'symbols' keyword
            # Redirect them to the correct syntax
            if args[0] == "list":
                self.cmd_config(["symbols", "list"])
                return
            if len(args) < 2:
                self.console.print(f"\n[yellow]Did you mean: /config symbols {args[0]} <SYMBOL>?[/yellow]")
                self.console.print(f"[dim]Usage: /config symbols add <SYMBOL> or /config symbols remove <SYMBOL>[/dim]\n")
                return
            # Forward to symbols subcommand handler
            self.cmd_config(["symbols"] + args)
            return

        elif len(args) >= 2:
            # Update config
            key = args[0]
            value_str = " ".join(args[1:])

            # Reject reserved/command-like keys that aren't real config keys
            if key in ["add", "remove", "list", "delete", "show", "get", "set"]:
                self.console.print(f"\n[red]'{key}' is not a valid config key[/red]")
                self.console.print(f"[dim]Did you mean: /config symbols {key} <SYMBOL>?[/dim]")
                self.console.print(f"[dim]Run /config to see all valid keys[/dim]\n")
                return

            # Whitelist: provider keys can only be set to one of the 4 supported providers
            # Accept "google" as alias for "gemini" since users commonly search for "Google AI"
            ALLOWED_PROVIDERS = ["anthropic", "openai", "gemini", "google", "openrouter"]
            if key in ("loop_agent_provider", "chat_agent_provider"):
                normalized = value_str.lower()
                if normalized == "google":
                    normalized = "gemini"  # normalize to canonical name
                if normalized not in ALLOWED_PROVIDERS:
                    self.console.print(f"\n[red]Invalid provider: '{value_str}'[/red]")
                    self.console.print(f"[dim]Allowed providers: anthropic, openai, gemini, openrouter[/dim]\n")
                    return
                # Save normalized value
                value_str = normalized

            config = load_config()

            # Parse value based on type
            try:
                if value_str.lower() in ["true", "false"]:
                    value = value_str.lower() == "true"
                elif value_str.replace(".", "").replace("-", "").isdigit():
                    value = float(value_str) if "." in value_str else int(value_str)
                elif value_str.startswith("[") and value_str.endswith("]"):
                    value = [v.strip().strip('"\'') for v in value_str[1:-1].split(",")]
                else:
                    value = value_str

                config[key] = value

                # Validate before saving
                valid, error = validate_config(config)
                if not valid:
                    self.console.print(f"\n[red]Validation error: {error}[/red]\n")
                    return

                save_config(config)
                self.console.print(f"\n[green]Updated {key} = {value}[/green]\n")
            except Exception as e:
                self.console.print(f"\n[red]Error parsing value: {str(e)}[/red]\n")
        else:
            self.console.print(f"\n[yellow]Usage: /config [key] [value][/yellow]\n")

    def cmd_apikey(self, args: list):
        """Manage API keys."""
        if not args:
            # Show which keys are configured
            secrets = load_secrets()

            table = Table(title="API Keys", box=box.ROUNDED, border_style=PACIFICA_BORDER)
            table.add_column("Provider", style=f"bold {PACIFICA_BLUE}")
            table.add_column("Status", style=PACIFICA_FG)

            providers = [
                ("ANTHROPIC_API_KEY", "Anthropic"),
                ("OPENAI_API_KEY", "OpenAI"),
                ("GOOGLE_API_KEY", "Google"),
                ("OPENROUTER_API_KEY", "OpenRouter"),
                ("PACIFICA_PUBLIC_KEY", "Pacifica Public"),
                ("PACIFICA_PRIVATE_KEY", "Pacifica Private"),
                ("TELEGRAM_BOT_TOKEN", "Telegram"),
                ("SUPERMEMORY_API_KEY", "Supermemory (chat memory)"),
            ]

            for key_name, display_name in providers:
                if key_name in secrets and secrets[key_name]:
                    # Show first and last 4 chars
                    key_value = secrets[key_name]
                    if len(key_value) > 8:
                        masked = f"{key_value[:4]}...{key_value[-4:]}"
                    else:
                        masked = "***"
                    status = f"[{PACIFICA_GREEN}]✓[/{PACIFICA_GREEN}] {masked}"
                else:
                    status = f"[{PACIFICA_MUTED}]Not set[/{PACIFICA_MUTED}]"

                table.add_row(display_name, status)

            self.console.print()
            self.console.print(table)
            self.console.print(f"\n[dim]Use [bold]/apikey <provider> <key>[/bold] to set a key[/dim]")
            self.console.print(f"[dim]Example: [bold]/apikey anthropic sk-ant-...[/bold][/dim]\n")

        elif len(args) >= 2:
            provider = args[0].upper()
            key_value = " ".join(args[1:])

            # Map provider names to env var names
            provider_map = {
                "ANTHROPIC": "ANTHROPIC_API_KEY",
                "OPENAI": "OPENAI_API_KEY",
                "GOOGLE": "GOOGLE_API_KEY",
                "OPENROUTER": "OPENROUTER_API_KEY",
                "PACIFICA_PUBLIC": "PACIFICA_PUBLIC_KEY",
                "PACIFICA_PRIVATE": "PACIFICA_PRIVATE_KEY",
                "TELEGRAM": "TELEGRAM_BOT_TOKEN",
                "ELFA": "ELFA_API_KEY",
                "SUPERMEMORY": "SUPERMEMORY_API_KEY",
            }

            key_name = provider_map.get(provider)
            if not key_name:
                self.console.print(f"\n[red]Unknown provider: {provider}[/red]")
                self.console.print(f"[dim]Valid providers: {', '.join([k.lower() for k in provider_map.keys()])}[/dim]\n")
                return

            update_secret(key_name, key_value)

            # For supermemory, also reinit the PilotMemory singleton so the
            # new key is picked up without a restart of the CLI.
            if provider == "SUPERMEMORY":
                try:
                    from ..memory import reset_memory

                    new_memory = reset_memory()
                    if new_memory.enabled:
                        try:
                            new_memory.recall("supermemory connection test", limit=1)
                        except Exception:
                            pass
                        self.console.print(
                            f"\n[green]✓ supermemory connected[/green]\n"
                        )
                    else:
                        self.console.print(
                            f"\n[yellow]⚠ Key saved but Supermemory client failed to initialise. Check the key.[/yellow]\n"
                        )
                except Exception as e:
                    self.console.print(
                        f"\n[yellow]⚠ Key saved but reinitialisation failed: {e}[/yellow]\n"
                    )
                return

            self.console.print(f"\n[green]Updated {provider.lower()} API key[/green]\n")
        else:
            self.console.print(f"\n[yellow]Usage: /apikey [provider] [key][/yellow]\n")

    def cmd_mode(self, args: list):
        """Switch between testnet and mainnet."""
        config = load_config()
        current_mode = config.get("mode", "testnet")

        if not args:
            # Show current mode
            color = PACIFICA_GREEN if current_mode == "testnet" else PACIFICA_RED
            self.console.print(f"\n[bold]Current mode:[/bold] [{color}]{current_mode}[/{color}]\n")
            self.console.print(f"[dim]Use [bold]/mode testnet[/bold] or [bold]/mode mainnet[/bold] to switch[/dim]\n")
        else:
            new_mode = args[0].lower()
            if new_mode not in ["testnet", "mainnet"]:
                self.console.print(f"\n[red]Invalid mode: {new_mode}[/red]")
                self.console.print(f"[dim]Valid modes: testnet, mainnet[/dim]\n")
                return

            if new_mode == "mainnet":
                self.console.print(f"\n[{PACIFICA_RED}]⚠ WARNING: Switching to MAINNET mode![/{PACIFICA_RED}]")
                self.console.print(f"[{PACIFICA_RED}]This will use REAL MONEY for trading.[/{PACIFICA_RED}]")
                confirm = input("Type 'MAINNET' to confirm: ")
                if confirm != "MAINNET":
                    self.console.print(f"\n[yellow]Mode change cancelled[/yellow]\n")
                    return

            config["mode"] = new_mode
            save_config(config)
            color = PACIFICA_GREEN if new_mode == "testnet" else PACIFICA_RED
            self.console.print(f"\n[bold]Switched to [{color}]{new_mode}[/{color}] mode[/bold]\n")

    def cmd_status(self):
        """Show system status with live Pacifica data."""
        from ..core.trading import get_open_positions, get_account_info
        from ..core.pacifica_api import get_trade_history
        from ..storage.config import load_secrets

        config = load_config()
        secrets = load_secrets()
        wallet = secrets.get("PACIFICA_PUBLIC_KEY")

        # Fetch live data from Pacifica
        positions = {}
        account_info = None
        trades = []
        if wallet:
            positions = get_open_positions(wallet)
            account_info = get_account_info(wallet)
            trades = get_trade_history(wallet, limit=100) or []

        # Calculate total PnL from trade history
        total_pnl = 0.0
        for trade in trades:
            try:
                pnl = float(trade.get("pnl", 0))
                total_pnl += pnl
            except (ValueError, TypeError):
                pass

        # Calculate unrealized PnL from open positions
        unrealized_pnl = sum(float(p.get("unrealized_pnl", 0)) for p in positions.values())

        # Status panel
        status_text = Text()

        # Mode
        mode = config.get("mode", "testnet")
        mode_color = PACIFICA_GREEN if mode == "testnet" else PACIFICA_RED
        status_text.append("Mode: ", style="bold")
        status_text.append(f"{mode}\n", style=mode_color)

        # Dry run
        dry_run = config.get("dry_run", True)
        status_text.append("Dry Run: ", style="bold")
        status_text.append(f"{dry_run}\n", style=PACIFICA_MUTED)

        # Wallet
        if wallet:
            status_text.append("Wallet: ", style="bold")
            status_text.append(f"{wallet[:8]}...{wallet[-6:]}\n", style=PACIFICA_MUTED)

        # Account equity
        if account_info:
            equity = float(account_info.get("account_equity", 0))
            balance = float(account_info.get("balance", 0))
            status_text.append("Account Equity: ", style="bold")
            status_text.append(f"${equity:,.2f}\n", style=PACIFICA_FG)
            status_text.append("USDC Balance: ", style="bold")
            status_text.append(f"${balance:,.2f}\n\n", style=PACIFICA_FG)

        # Positions
        status_text.append("Open Positions: ", style="bold")
        status_text.append(f"{len(positions)}\n", style=PACIFICA_FG)

        if positions:
            for symbol, pos in positions.items():
                side_label = "LONG" if pos["side"] == "bid" else "SHORT"
                pnl = float(pos.get("unrealized_pnl", 0))
                pnl_color = PACIFICA_GREEN if pnl >= 0 else PACIFICA_RED
                pnl_sign = "+" if pnl >= 0 else ""
                status_text.append(
                    f"  {symbol} {side_label} @ ${float(pos['entry_price']):,.2f} "
                    f"[{pnl_color}]{pnl_sign}${pnl:.2f}[/{pnl_color}]\n",
                )

        # Total PnL
        status_text.append("\nRealized PnL: ", style="bold")
        pnl_color = PACIFICA_GREEN if total_pnl >= 0 else PACIFICA_RED
        status_text.append(f"${total_pnl:,.2f}\n", style=pnl_color)

        if unrealized_pnl != 0:
            status_text.append("Unrealized PnL: ", style="bold")
            upnl_color = PACIFICA_GREEN if unrealized_pnl >= 0 else PACIFICA_RED
            upnl_sign = "+" if unrealized_pnl >= 0 else ""
            status_text.append(f"{upnl_sign}${unrealized_pnl:,.2f}\n", style=upnl_color)

        # Loop Agent status
        status_text.append("\nLoop Agent: ", style="bold")
        if hasattr(self, 'loop_agent') and self.loop_agent:
            if self.loop_agent.paused:
                status_text.append("Paused", style=PACIFICA_MUTED)
            elif self.loop_agent.running:
                status_text.append("Running", style=PACIFICA_GREEN)
            else:
                status_text.append("Stopped", style=PACIFICA_MUTED)
        else:
            status_text.append("Not running", style=PACIFICA_MUTED)
            status_text.append(" (use ", style="dim")
            status_text.append("/start", style=f"bold {PACIFICA_BLUE}")
            status_text.append(")", style="dim")

        panel = Panel(
            status_text,
            title="[bold]System Status[/bold]",
            border_style=PACIFICA_BORDER,
            box=box.ROUNDED,
            padding=(1, 2),
        )

        self.console.print()
        self.console.print(panel)
        self.console.print()

    def cmd_positions(self):
        """Show all open positions from Pacifica API."""
        from ..core.trading import get_open_positions
        from ..storage.config import load_secrets

        secrets = load_secrets()
        wallet = secrets.get("PACIFICA_PUBLIC_KEY")

        if not wallet:
            self.console.print(f"\n[yellow]No Pacifica wallet configured[/yellow]")
            self.console.print(f"[dim]Use [bold]/apikey pacifica_public <address>[/bold] to configure[/dim]\n")
            return

        # Fetch live positions from Pacifica API
        positions = get_open_positions(wallet)

        if not positions:
            self.console.print(f"\n[{PACIFICA_MUTED}]No open positions[/{PACIFICA_MUTED}]\n")
            return

        table = Table(title="Open Positions", box=box.ROUNDED, border_style=PACIFICA_BORDER)
        table.add_column("Symbol", style=f"bold {PACIFICA_BLUE}")
        table.add_column("Side", style=PACIFICA_FG)
        table.add_column("Entry", style=PACIFICA_FG, justify="right")
        table.add_column("Mark", style=PACIFICA_FG, justify="right")
        table.add_column("Quantity", style=PACIFICA_FG, justify="right")
        table.add_column("PnL", style=PACIFICA_FG, justify="right")

        for symbol, pos in positions.items():
            side_color = PACIFICA_GREEN if pos["side"] == "bid" else PACIFICA_RED
            pnl = pos.get("unrealized_pnl", 0)
            pnl_color = PACIFICA_GREEN if pnl >= 0 else PACIFICA_RED
            pnl_sign = "+" if pnl >= 0 else ""

            table.add_row(
                symbol,
                f"[{side_color}]{pos['side'].upper()}[/{side_color}]",
                f"${pos['entry_price']:,.2f}",
                f"${pos['mark_price']:,.2f}",
                f"{pos['quantity']:.4f}",
                f"[{pnl_color}]{pnl_sign}${pnl:.2f}[/{pnl_color}]",
            )

        self.console.print()
        self.console.print(table)
        self.console.print()

    def cmd_history(self, args: list):
        """Show trade history from Pacifica."""
        from ..core.pacifica_api import get_trade_history
        from ..storage.config import load_secrets

        limit = 10
        if args and args[0].isdigit():
            limit = int(args[0])

        secrets = load_secrets()
        wallet = secrets.get("PACIFICA_PUBLIC_KEY")

        if not wallet:
            self.console.print(f"\n[yellow]No Pacifica wallet configured[/yellow]")
            self.console.print(f"[dim]Use [bold]/apikey pacifica_public <address>[/bold] to configure[/dim]\n")
            return

        trades = get_trade_history(wallet, limit=limit)

        if not trades:
            self.console.print(f"\n[{PACIFICA_MUTED}]No trade history[/{PACIFICA_MUTED}]\n")
            return

        table = Table(title=f"Recent Trades (Last {len(trades)})", box=box.ROUNDED, border_style=PACIFICA_BORDER)
        table.add_column("Time", style=PACIFICA_FG)
        table.add_column("Symbol", style=f"bold {PACIFICA_BLUE}")
        table.add_column("Side", style=PACIFICA_FG)
        table.add_column("Price", style=PACIFICA_FG, justify="right")
        table.add_column("Amount", style=PACIFICA_FG, justify="right")
        table.add_column("PnL", style=PACIFICA_FG, justify="right")

        from datetime import datetime
        for trade in trades:
            symbol = trade.get("symbol", "UNKNOWN")
            side = trade.get("side", "UNKNOWN").upper()
            price = float(trade.get("price", 0))
            amount = float(trade.get("amount", 0))
            pnl = float(trade.get("pnl", 0))
            created_at = trade.get("created_at", 0)

            # Color side based on open/close
            if "open" in side.lower():
                side_color = PACIFICA_BLUE
            elif "close" in side.lower():
                side_color = PACIFICA_MUTED
            else:
                side_color = PACIFICA_FG

            pnl_color = PACIFICA_GREEN if pnl >= 0 else PACIFICA_RED
            pnl_sign = "+" if pnl >= 0 else ""

            time_str = datetime.fromtimestamp(created_at / 1000).strftime("%m/%d %H:%M") if created_at else "N/A"

            table.add_row(
                time_str,
                symbol,
                f"[{side_color}]{side}[/{side_color}]",
                f"${price:,.4f}",
                f"{amount:.4f}",
                f"[{pnl_color}]{pnl_sign}${pnl:,.2f}[/{pnl_color}]",
            )

        self.console.print()
        self.console.print(table)
        self.console.print(f"\n[dim]Use [bold]/history <n>[/bold] to show more trades[/dim]\n")

    def cmd_performance(self, args: list):
        """Show performance metrics."""
        cmd_performance_impl(
            self.console, args, get_recent_trades,
            PACIFICA_BLUE, PACIFICA_FG, PACIFICA_GREEN, PACIFICA_RED, PACIFICA_BORDER, PACIFICA_MUTED
        )

    def cmd_analytics(self, args: list):
        """Show detailed analytics and monthly returns."""
        cmd_analytics_impl(
            self.console, args, get_recent_trades,
            PACIFICA_BLUE, PACIFICA_FG, PACIFICA_GREEN, PACIFICA_RED, PACIFICA_BORDER, PACIFICA_MUTED
        )

    def cmd_backtest(self, args: list):
        """Run backtest on historical data."""
        cmd_backtest_impl(self.console, args, PACIFICA_BLUE, PACIFICA_RED, PACIFICA_MUTED, PACIFICA_GREEN)

    def cmd_portfolio(self):
        """Show portfolio risk metrics and correlation."""
        cmd_portfolio_impl(
            self.console, get_all_positions, load_config,
            PACIFICA_BLUE, PACIFICA_FG, PACIFICA_GREEN, PACIFICA_RED, PACIFICA_BORDER, PACIFICA_MUTED
        )

    def cmd_account(self, args: list):
        """Show account stats from Pacifica."""
        cmd_account_impl(
            self.console, args, PACIFICA_BLUE, PACIFICA_MUTED,
            PACIFICA_GREEN, PACIFICA_RED, PACIFICA_FG, PACIFICA_BORDER
        )

    def cmd_start(self):
        """Boot the Loop Agent in a background thread."""
        # Guard: don't boot a second instance while one is still running
        if (
            hasattr(self, "loop_agent")
            and self.loop_agent is not None
            and getattr(self.loop_agent, "running", False)
        ):
            self.console.print("\n[yellow]Loop Agent is already running[/yellow]")
            self.console.print("[dim]Use /pause to soft-pause, /stop to terminate[/dim]\n")
            return

        import threading
        from ..agents.loop import LoopAgent

        self.loop_agent = LoopAgent()
        self.loop_thread = threading.Thread(
            target=self.loop_agent.start,
            daemon=True,
            name="LoopAgent",
        )
        self.loop_thread.start()

        self.console.print("\n[green]✓ Loop Agent started[/green]")
        self.console.print(
            "[dim]Use /pause to soft-pause, /stop to terminate[/dim]\n"
        )

    def cmd_stop(self):
        """Terminate the Loop Agent."""
        if (
            not hasattr(self, "loop_agent")
            or self.loop_agent is None
            or not getattr(self.loop_agent, "running", False)
        ):
            self.console.print("\n[yellow]Loop Agent is not running[/yellow]")
            self.console.print("[dim]Use /start to boot it[/dim]\n")
            return

        # Flip the loop's own flag — LoopAgent._run_loop() checks `while self.running:`
        self.loop_agent.running = False
        # Drop the reference so a follow-up /start boots a fresh agent
        self.loop_agent = None

        self.console.print("\n[green]✓ Loop Agent stopped[/green]")
        self.console.print("[dim]Use /start to boot it again[/dim]\n")

    def cmd_pause(self):
        """Pause the Loop Agent (soft-pause — process stays alive)."""
        if (
            not hasattr(self, "loop_agent")
            or self.loop_agent is None
            or not getattr(self.loop_agent, "running", False)
        ):
            self.console.print("\n[yellow]Loop Agent is not running[/yellow]")
            self.console.print("[dim]Use /start to boot it first[/dim]\n")
            return
        self.loop_agent.pause()
        self.console.print(f"\n[green]✓ Loop Agent paused[/green]")
        self.console.print(f"[dim]Use [bold]/resume[/bold] to un-pause, [bold]/stop[/bold] to terminate[/dim]\n")

    def cmd_resume(self):
        """Resume a soft-paused Loop Agent."""
        if (
            not hasattr(self, "loop_agent")
            or self.loop_agent is None
            or not getattr(self.loop_agent, "running", False)
        ):
            self.console.print("\n[yellow]Loop Agent is not running[/yellow]")
            self.console.print("[dim]Use /start to boot it first[/dim]\n")
            return
        self.loop_agent.resume()
        self.console.print(f"\n[green]✓ Loop Agent resumed[/green]\n")

    def cmd_remote(self, args: list):
        """Manage Telegram remote access."""
        self.console.print(f"\n[yellow]Telegram remote access configuration[/yellow]")
        self.console.print(f"[dim]This feature requires the Telegram bot to be configured and running[/dim]")
        self.console.print(f"[dim]Add your [bold]TELEGRAM_BOT_TOKEN[/bold] with [bold]/apikey telegram <token>[/bold][/dim]\n")

    def handle_chat(self, message: str):
        """Handle a chat message to the agent."""
        from ..agents.chat import ChatAgent
        from solders.keypair import Keypair
        import base58

        # Initialize ChatAgent if not already done
        if not hasattr(self, 'chat_agent'):
            self.chat_agent = ChatAgent()

            # Load keypair for trade execution
            private_key = self.chat_agent.secrets.get("PACIFICA_PRIVATE_KEY")
            if private_key:
                try:
                    self.chat_agent.keypair = Keypair.from_bytes(base58.b58decode(private_key))
                except Exception as e:
                    self.console.print(f"\n[yellow]Warning: Could not load keypair for trade execution: {e}[/yellow]")
                    self.console.print(f"[dim]Read-only commands will work, but you cannot place/close orders[/dim]\n")

        # Show thinking indicator
        with self.console.status(f"[{PACIFICA_BLUE}]Thinking...[/{PACIFICA_BLUE}]", spinner="dots"):
            try:
                # Use ChatAgent's natural language handler with tool-calling support
                response = self.chat_agent.handle_natural_language(message)

                # Display response
                self.console.print()
                panel = Panel(
                    response,
                    title=f"[bold {PACIFICA_BLUE}]Assistant[/bold {PACIFICA_BLUE}]",
                    border_style=PACIFICA_BORDER,
                    padding=(1, 2),
                )
                self.console.print(panel)
                self.console.print()

            except Exception as e:
                self.console.print(f"\n[red]Chat error: {e}[/red]\n")

    def _build_chat_context(self, config, user_message: str) -> str:
        """Build context for the AI chat including market data, positions, etc."""
        from ..storage.database import get_all_positions, get_recent_trades

        context_parts = []

        # System info
        context_parts.append("=== SYSTEM INFO ===")
        context_parts.append(f"Mode: {config.get('mode', 'testnet')}")
        context_parts.append(f"Dry Run: {config.get('dry_run', True)}")
        context_parts.append(f"Symbols: {', '.join(config.get('symbols', []))}")
        context_parts.append("")

        # Open positions
        try:
            positions = get_all_positions()
            if positions:
                context_parts.append("=== OPEN POSITIONS ===")
                for pos in positions[:5]:  # Limit to 5
                    context_parts.append(
                        f"- {pos['symbol']}: {pos['side'].upper()} "
                        f"{pos['quantity']:.4f} @ ${pos['entry_price']:,.2f} "
                        f"(${pos['size_usdc']:,.2f})"
                    )
                context_parts.append("")
        except Exception:
            pass

        # Recent trades
        try:
            trades = get_recent_trades(limit=5)
            if trades:
                context_parts.append("=== RECENT TRADES ===")
                for trade in trades:
                    pnl = trade.get('realized_pnl', 0)
                    pnl_str = f"+${pnl:,.2f}" if pnl >= 0 else f"-${abs(pnl):,.2f}"
                    context_parts.append(
                        f"- {trade['symbol']}: {trade['side'].upper()} "
                        f"PnL: {pnl_str}"
                    )
                context_parts.append("")
        except Exception:
            pass

        return "\n".join(context_parts)

    def _call_ai_provider(self, provider, context: str, user_message: str) -> str:
        """Call the AI provider and return the response."""
        from ..storage.config import load_config

        config = load_config()
        provider_name = config.get('chat_agent_provider', '').lower()

        # Build the full prompt
        system_prompt = """You are a trading assistant for PacificaPilot, a perpetual futures trading bot on Pacifica.

Your role:
- Answer questions about markets, positions, and trading strategies
- Provide insights based on the user's current positions and recent trades
- Explain trading concepts and help with configuration
- Be concise and actionable in your responses

Important:
- The user is trading perpetual futures (LONG/SHORT positions)
- You can see their open positions and recent trades in the context
- Always consider risk management when discussing trading
- If asked to execute trades, remind them to use the trading commands (/positions, /history, etc.)

Keep responses under 200 words unless the user asks for more detail."""

        full_prompt = f"""{system_prompt}

{context}

User: {user_message}"""

        # Call the appropriate provider API
        try:
            if provider_name == 'anthropic':
                return self._call_anthropic(provider, system_prompt, context, user_message)
            elif provider_name == 'openai':
                return self._call_openai(provider, full_prompt)
            elif provider_name == 'google':
                return self._call_google(provider, full_prompt)
            elif provider_name == 'openrouter':
                return self._call_openrouter(provider, system_prompt, context, user_message)
            else:
                return f"Unsupported provider: {provider_name}"
        except Exception as e:
            return f"Error calling AI provider: {str(e)}"

    def _call_anthropic(self, provider, system_prompt: str, context: str, user_message: str) -> str:
        """Call Anthropic API."""
        import anthropic

        client = anthropic.Anthropic(api_key=provider.api_key)

        full_message = f"{context}\n\nUser: {user_message}"

        message = client.messages.create(
            model=provider.model,
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": full_message}]
        )

        return message.content[0].text

    def _call_openai(self, provider, full_prompt: str) -> str:
        """Call OpenAI API."""
        from openai import OpenAI

        client = OpenAI(api_key=provider.api_key)

        response = client.chat.completions.create(
            model=provider.model,
            messages=[{"role": "user", "content": full_prompt}],
            max_tokens=1024
        )

        return response.choices[0].message.content

    def _call_google(self, provider, full_prompt: str) -> str:
        """Call Google Gemini API."""
        # Try new API first, fall back to deprecated one
        try:
            from google import genai
            genai.configure(api_key=provider.api_key)
            model = genai.GenerativeModel(provider.model)
        except ImportError:
            import google.generativeai as genai
            genai.configure(api_key=provider.api_key)
            model = genai.GenerativeModel(provider.model)

        response = model.generate_content(full_prompt)
        return response.text

    def _call_openrouter(self, provider, system_prompt: str, context: str, user_message: str) -> str:
        """Call OpenRouter API (OpenAI-compatible)."""
        from openai import OpenAI

        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=provider.api_key,
        )

        full_message = f"{context}\n\nUser: {user_message}"

        response = client.chat.completions.create(
            model=provider.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": full_message}
            ],
            max_tokens=1024
        )

        return response.choices[0].message.content

    def show_help(self):
        """Display help information."""
        self.console.print()

        help_panel = Panel(
            self._format_help_text(),
            title="[bold]Available Commands[/bold]",
            border_style=PACIFICA_BORDER,
            box=box.ROUNDED,
            padding=(1, 2),
        )

        self.console.print(help_panel)
        self.console.print()

    def _format_help_text(self) -> Text:
        """Format the help text."""
        text = Text()

        for cmd in COMMANDS:
            if cmd in ["/exit", "/quit"]:
                continue
            text.append(f"{cmd:15}", style=f"bold {PACIFICA_BLUE}")
            text.append(f" {COMMAND_HELP.get(cmd, '')}\n", style=PACIFICA_FG)

        text.append("\n")
        text.append("Navigation:\n", style="bold underline")
        text.append(f"{'↑/↓':15}", style=f"bold {PACIFICA_BLUE}")
        text.append(" Navigate command history\n", style=PACIFICA_FG)
        text.append(f"{'Tab':15}", style=f"bold {PACIFICA_BLUE}")
        text.append(" Autocomplete commands\n", style=PACIFICA_FG)
        text.append(f"{'Ctrl+C':15}", style=f"bold {PACIFICA_BLUE}")
        text.append(" Cancel current input\n", style=PACIFICA_FG)
        text.append(f"{'/exit, /quit':15}", style=f"bold {PACIFICA_BLUE}")
        text.append(" Exit the CLI\n", style=PACIFICA_FG)

        return text


def start_repl():
    """Start the Pacifica REPL.

    The Loop Agent is *not* started here — the user controls it from inside
    the REPL via /start and /stop. /pause and /resume still soft-toggle the
    loop while it is running.
    """
    repl = PacificaREPL()
    repl.start()


if __name__ == "__main__":
    start_repl()
