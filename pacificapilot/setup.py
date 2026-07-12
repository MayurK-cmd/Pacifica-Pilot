"""
Setup wizard — first-run configuration using InquirerPy.

10 interactive screens with validation. Everything stored in ~/.pacificapilot/.
"""

import sys

from InquirerPy import inquirer
from InquirerPy.validator import EmptyInputValidator

from .storage import save_config, save_secrets, get_config_path, get_secrets_path
from .ui.theme import PILOT_STYLE, KEY_INSTRUCTIONS, OPENROUTER_POPULAR_MODELS


def run_setup_wizard():
    """Interactive setup wizard — 10 screens."""
    from rich.console import Console
    from rich.panel import Panel
    from rich.text import Text
    _console = Console()
    _console.print()
    _console.print(Panel(
        Text.from_markup("[bold #00d4aa]PacificaPilot[/] — First Run Setup"),
        border_style="#00d4aa",
        padding=(1, 2),
    ))
    _console.print()
    _console.print("Welcome. This wizard collects your keys and trading parameters.")
    _console.print("Everything is stored locally in [bold]~/.pacificapilot/[/]")
    _console.print("Your keys never leave your machine.\n")

    # ── Screen 2: Pacifica Keys ──────────────────────────────────
    print("── Pacifica Keys ──────────────────────────────────")
    print("Get these from: https://test-app.pacifica.fi")
    print("Quick demo at:  https://pacificapilot.io     (coming soon)\n")

    pacifica_public = inquirer.text(
        message="Pacifica public key (API key):",
        validate=lambda x: len(x) > 10 or "Key too short",
        long_instruction="Found under Settings → API Keys on Pacifica",
        style=PILOT_STYLE,
    ).execute()

    pacifica_private = inquirer.secret(
        message="Pacifica private key (Solana keypair, base58):",
        validate=lambda x: len(x) > 20 or "Invalid key format",
        long_instruction="Your Solana wallet private key — stored locally, never transmitted",
        style=PILOT_STYLE,
    ).execute()

    # ── Screen 3: AI Provider ──────────────────────────────────
    print("\n── AI Provider ──────────────────────────────────")

    provider = inquirer.select(
        message="Choose your AI provider:",
        choices=[
            {"name": "OpenRouter  (recommended — all models via one key)", "value": "openrouter"},
            {"name": "Anthropic   (Claude — best reasoning quality)",     "value": "anthropic"},
            {"name": "OpenAI      (GPT-4o — fast and cost-effective)",    "value": "openai"},
            {"name": "Google      (Gemini 2.0 Flash — free tier)",        "value": "google"},
        ],
        instruction="(↑↓ arrow keys, Enter to select)",
        long_instruction="Add more providers later with /apikey",
        style=PILOT_STYLE,
        pointer="▶",
    ).execute()

    api_key = inquirer.secret(
        message=f"{provider.title()} API key:",
        validate=lambda x: len(x) > 10 or "Key too short",
        long_instruction=KEY_INSTRUCTIONS.get(provider, ""),
        style=PILOT_STYLE,
    ).execute()

    # Map provider to config model name and secret key
    PROVIDER_DEFAULTS = {
        "openrouter": ("openrouter", "OPENROUTER_API_KEY", "anthropic/claude-3.5-sonnet"),
        "anthropic":  ("anthropic",  "ANTHROPIC_API_KEY",  "claude-3-5-sonnet-20241022"),
        "openai":     ("openai",     "OPENAI_API_KEY",     "gpt-4o-mini"),
        "google":     ("google",     "GOOGLE_API_KEY",     "gemini-2.0-flash-exp"),
    }
    provider_name, key_name, default_model = PROVIDER_DEFAULTS[provider]

    # ── Screen 4: Model Selection (OpenRouter only) ────────────
    selected_model = default_model
    if provider == "openrouter":
        print("\n── Model Selection ───────────────────────────────")
        model_choice = inquirer.select(
            message="Choose or type a model:",
            choices=[
                {"name": "Select from popular models", "value": "list"},
                {"name": "Paste a custom model ID",    "value": "custom"},
            ],
            style=PILOT_STYLE,
            pointer="▶",
        ).execute()
        if model_choice == "list":
            selected_model = inquirer.fuzzy(
                message="Search and select a model:",
                choices=OPENROUTER_POPULAR_MODELS,
                long_instruction="Type to fuzzy-search. Change later with /config",
                style=PILOT_STYLE,
                match_exact=False,
            ).execute()
        else:
            selected_model = inquirer.text(
                message="Paste model ID (e.g. anthropic/claude-sonnet-4):",
                validate=lambda x: "/" in x or "Must contain a slash (provider/model)",
                long_instruction="Format: provider/model-name. See openrouter.ai/models",
                style=PILOT_STYLE,
            ).execute()

    # ── Screen 5: Trading Mode ──────────────────────────────────
    print("\n── Trading Mode ──────────────────────────────────")

    mode = inquirer.select(
        message="Trading mode:",
        choices=[
            {"name": "Testnet  (recommended — free test funds, safe to experiment)", "value": "testnet"},
            {"name": "Mainnet  (real funds — only when you know what you're doing)", "value": "mainnet"},
        ],
        default="testnet",
        style=PILOT_STYLE,
        pointer="▶",
    ).execute()

    if mode == "mainnet":
        confirmed = inquirer.confirm(
            message="⚠ MAINNET uses real funds. Are you sure?",
            default=False,
            style=PILOT_STYLE,
        ).execute()
        if not confirmed:
            mode = "testnet"
            print("  Switched to testnet. Change later with /mode")

    # ── Screen 6: Trading Parameters ────────────────────────────
    print("\n── Trading Parameters ────────────────────────────")

    symbols = inquirer.checkbox(
        message="Which symbols to trade:",
        choices=["BTC", "ETH", "SOL", "WIF", "BONK"],
        default=["BTC", "ETH"],
        instruction="(Space to select at least one, Enter to confirm)",
        validate=lambda x: len(x) > 0 or "Select at least one symbol",
        style=PILOT_STYLE,
        pointer="▶",
    ).execute()

    risk_profile = inquirer.select(
        message="Risk profile:",
        choices=[
            {"name": "Conservative   SL 2%  TP 4%  Min conf 75%", "value": "conservative"},
            {"name": "Balanced       SL 3%  TP 6%  Min conf 60%  (default)", "value": "balanced"},
            {"name": "Aggressive     SL 5%  TP 10% Min conf 45%", "value": "aggressive"},
        ],
        default="balanced",
        style=PILOT_STYLE,
        pointer="▶",
    ).execute()

    # Map risk profile to actual values
    RISK_MAP = {
        "conservative": {"stop_loss_pct": 2.0, "take_profit_pct": 4.0, "min_confidence": 0.75},
        "balanced":     {"stop_loss_pct": 3.0, "take_profit_pct": 6.0, "min_confidence": 0.60},
        "aggressive":   {"stop_loss_pct": 5.0, "take_profit_pct": 10.0, "min_confidence": 0.45},
    }
    risk_settings = RISK_MAP[risk_profile]

    max_position = inquirer.number(
        message="Max position size (USDC):",
        default=100,
        min_allowed=10,
        max_allowed=10000,
        long_instruction="Hard cap per trade — agent never exceeds this",
        style=PILOT_STYLE,
    ).execute()

    dry_run = inquirer.confirm(
        message="Enable dry run? (paper trading — no real orders):",
        default=True,
        long_instruction="Strongly recommended until you've verified the agent's behaviour",
        style=PILOT_STYLE,
    ).execute()

    # ── Screen 7: Supermemory ───────────────────────────────────
    print("\n── Supermemory Memory ────────────────────────────")

    memory_choice = inquirer.select(
        message="Add persistent memory to the Chat Agent?",
        choices=[
            {"name": "Local  — localhost:6767, fully private (recommended)", "value": "local"},
            {"name": "Cloud  — hosted by Supermemory, no local process needed", "value": "cloud"},
            {"name": "Skip   — add later with /apikey supermemory <key>", "value": "skip"},
        ],
        long_instruction="Memory lets the agent learn from trades and remember preferences",
        style=PILOT_STYLE,
        pointer="▶",
    ).execute()

    memory_key = None
    memory_mode = None
    if memory_choice == "local":
        import subprocess, time, sys as _sys, shutil, urllib.request as _req, webbrowser

        print("\n  ── Setting up Supermemory Local ──")

        # 1. Check if supermemory command exists
        supermem_cmd = shutil.which("supermemory")
        if supermem_cmd:
            print(f"  ✓ Supermemory found")
        else:
            print("  Installing Supermemory CLI via npm...")
            try:
                r = subprocess.run(
                    ["npm", "install", "-g", "supermemory"],
                    capture_output=True, text=True, timeout=120,
                    shell=_sys.platform == "win32",
                )
                ok = r.returncode == 0
            except Exception:
                ok = False
            if not ok:
                print("  ⚠ npm install failed — will use npx instead (no install needed)")
                supermem_cmd = "npx"
            else:
                supermem_cmd = "supermemory"
                print("  ✓ Supermemory CLI installed")

        # 2. Check if server already running
        server_running = False
        try:
            _req.urlopen("http://localhost:6767", timeout=2)
            server_running = True
            print("  ✓ Supermemory server already running")
        except Exception:
            pass

        # 3. Start the server if not running
        if not server_running:
            print("  Starting Supermemory local server...")
            try:
                cmd = " ".join(
                    [supermem_cmd] if supermem_cmd and supermem_cmd != "npx" else ["npx", "supermemory"]
                ) + " local"
                if _sys.platform == "win32":
                    subprocess.Popen(cmd, shell=True, creationflags=subprocess.CREATE_NEW_CONSOLE)
                else:
                    subprocess.Popen(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                time.sleep(3)
                print("  ✓ Server started")
            except Exception as e:
                print(f"  ⚠ Could not auto-start: {e}")

        # 4. Ask user to visit and grab the key
        print("\n  → Open http://localhost:6767 in your browser")
        print("  → The page shows your API key — copy and paste it below\n")
        try:
            webbrowser.open("http://localhost:6767")
        except Exception:
            pass

        memory_key = inquirer.secret(
            message="Paste your Supermemory API key:",
            validate=lambda x: len(x) > 5 or "Key too short",
            long_instruction="Open http://localhost:6767 in your browser and copy the API key shown there.",
            style=PILOT_STYLE,
        ).execute()
        memory_mode = "local"
    elif memory_choice == "cloud":
        print("\n  Get your free key at: https://app.supermemory.ai\n")
        memory_key = inquirer.secret(
            message="Supermemory API key:",
            validate=lambda x: len(x) > 5 or "Key too short",
            style=PILOT_STYLE,
        ).execute()
        memory_mode = "cloud"

    # ── Screen 8: Telegram ──────────────────────────────────────
    print("\n── Telegram (Optional) ───────────────────────────")

    enable_telegram = inquirer.confirm(
        message="Enable Telegram bot for remote trading?",
        default=False,
        long_instruction="Control the agent from your phone via Telegram",
        style=PILOT_STYLE,
    ).execute()

    telegram_token = None
    telegram_chat_id = None
    if enable_telegram:
        print("\n  Create a bot at: https://t.me/BotFather → /newbot\n")
        telegram_token = inquirer.secret(
            message="Telegram bot token:",
            validate=lambda x: ":" in x or "Invalid token format",
            style=PILOT_STYLE,
        ).execute()
        print("\n  Find your chat ID at: https://t.me/userinfobot\n")
        telegram_chat_id = inquirer.text(
            message="Your Telegram chat ID:",
            validate=lambda x: x.lstrip("-").isdigit() or "Must be a number",
            style=PILOT_STYLE,
        ).execute()

    # ── Screen 9: Review & Confirm ─────────────────────────────
    print("\n── Setup Summary ──────────────────────────────────\n")
    print(f"  Pacifica keys:    {'✓' if pacifica_public and pacifica_private else '✗'}")
    print(f"  AI Provider:      {provider} ({selected_model})")
    print(f"  Trading mode:     {mode}")
    print(f"  Symbols:          {', '.join(symbols)}")
    print(f"  Risk profile:     {risk_profile}")
    print(f"  Max position:     ${max_position}")
    print(f"  Dry run:          {'ON' if dry_run else 'OFF'}")
    print(f"  Memory:           {memory_choice if memory_choice != 'skip' else 'disabled'}")
    print(f"  Telegram:         {'enabled' if enable_telegram else 'disabled'}")
    print()

    confirmed = inquirer.confirm(
        message="Save this configuration?",
        default=True,
        style=PILOT_STYLE,
    ).execute()

    if not confirmed:
        print("\nSetup cancelled. Run pacifica init to start over.\n")
        sys.exit(0)

    # ── Build secrets ──────────────────────────────────────────
    secrets = {
        "PACIFICA_PUBLIC_KEY": pacifica_public,
        "PACIFICA_PRIVATE_KEY": pacifica_private,
        key_name: api_key,
    }
    if memory_key and memory_mode:
        secrets["SUPERMEMORY_API_KEY"] = memory_key
        secrets["SUPERMEMORY_MODE"] = memory_mode
    if telegram_token:
        secrets["TELEGRAM_BOT_TOKEN"] = telegram_token

    # ── Build config ───────────────────────────────────────────
    config = {
        "symbols": symbols,
        "loop_interval_seconds": 300,
        "max_position_usdc": float(max_position),
        "min_confidence": risk_settings["min_confidence"],
        "stop_loss_pct": risk_settings["stop_loss_pct"],
        "take_profit_pct": risk_settings["take_profit_pct"],
        "risk_profile": risk_profile,
        "mode": mode,
        "dry_run": dry_run,
        "use_binance_fallback": True,
        "remote_mode_enabled": enable_telegram,
        "telegram_chat_ids": [telegram_chat_id] if telegram_chat_id else [],
        "loop_agent_provider": provider_name,
        "loop_agent_model": selected_model,
        "chat_agent_provider": provider_name,
        "chat_agent_model": selected_model,
    }

    # ── Save ───────────────────────────────────────────────────
    save_secrets(secrets)
    save_config(config)

    # ── Screen 10: Done ───────────────────────────────────────
    print("\n" + "=" * 60)
    print("✓ Setup complete!")
    print("=" * 60)
    print(f"\n  Config saved  →  {get_config_path()}")
    print(f"  Keys saved    →  {get_secrets_path()} (chmod 600)")
    print()
    print("  You're ready. Run:")
    print()
    print("    pacifica start")
    print("      — Full TUI with live trading dashboard")
    print()
    print("  Inside the TUI:")
    print("    • Type /help for commands, or just chat naturally")
    print("    • /start to boot the Loop Agent")
    print("    • /stop to stop it")
    print("    • /config to view/edit settings")
    print("    • /apikey to manage keys")
    print()
    print("  Keyboard shortcuts:")
    print("    Ctrl+P  — Command palette")
    print("    Ctrl+M  — Switch AI provider")
    print("    Ctrl+S  — Settings toggles")
    print("    Ctrl+L  — Clear chat")
    print("    Ctrl+R  — Refresh sidebar")
    print("    Ctrl+D  — Toggle dry run")
    print("    Ctrl+Q  — Quit")
    print()
    print(f"  ⚠  Default mode: {mode.upper()} with DRY RUN: {'ON' if dry_run else 'OFF'}")
    if dry_run:
        print("     No real orders will be placed until you disable dry run.")
    print()
