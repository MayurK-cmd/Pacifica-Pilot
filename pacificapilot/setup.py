"""
Setup wizard for first-run configuration.

Collects Pacifica keys, AI provider keys, and initial config.
"""

from .storage import save_config, save_secrets, get_config_path, get_secrets_path


def run_setup_wizard():
    """Interactive setup wizard for first-run configuration."""
    print("\n" + "=" * 60)
    print("PacificaPilot — Setup Wizard")
    print("=" * 60)
    print("\nWelcome! Let's configure PacificaPilot.\n")

    # Collect Pacifica keys
    print("1. Pacifica Keys")
    print("-" * 40)
    pacifica_public = input("Pacifica public key (Solana address): ").strip()
    pacifica_private = input("Pacifica private key (base58): ").strip()

    # Collect AI provider keys
    print("\n2. AI Provider")
    print("-" * 40)
    print("Choose a provider:")
    print("  1. OpenRouter (recommended — one API for all models)")
    print("  2. Anthropic (Claude direct)")
    print("  3. OpenAI (GPT direct)")
    print("  4. Google (Gemini direct)")

    provider_choice = input("Choice [1]: ").strip() or "1"
    provider_map = {
        "1": ("openrouter", "OPENROUTER_API_KEY", "anthropic/claude-3.5-sonnet"),
        "2": ("anthropic", "ANTHROPIC_API_KEY", "claude-3-5-sonnet-20241022"),
        "3": ("openai", "OPENAI_API_KEY", "gpt-4o-mini"),
        "4": ("google", "GOOGLE_API_KEY", "gemini-2.0-flash-exp"),
    }

    provider, key_name, default_model = provider_map.get(provider_choice, provider_map["1"])
    api_key = input(f"{provider.capitalize()} API key: ").strip()

    # Build secrets
    secrets = {
        "PACIFICA_PUBLIC_KEY": pacifica_public,
        "PACIFICA_PRIVATE_KEY": pacifica_private,
        key_name: api_key,
    }

    # Build config
    print("\n3. Trading Config")
    print("-" * 40)
    symbols_input = input("Symbols to trade (comma-separated) [BTC,ETH]: ").strip() or "BTC,ETH"
    symbols = [s.strip() for s in symbols_input.split(",")]

    max_position = input("Max position size (USDC) [100]: ").strip() or "100"
    max_position = float(max_position)

    min_confidence = input("Min confidence (0.0-1.0) [0.60]: ").strip() or "0.60"
    min_confidence = float(min_confidence)

    config = {
        "symbols": symbols,
        "loop_interval_seconds": 300,
        "max_position_usdc": max_position,
        "min_confidence": min_confidence,
        "stop_loss_pct": 5.0,
        "take_profit_pct": 10.0,
        "risk_profile": "balanced",
        "mode": "testnet",
        "dry_run": True,
        "use_binance_fallback": True,
        "remote_mode_enabled": False,
        "telegram_chat_ids": [],
        "loop_agent_provider": provider,
        "loop_agent_model": default_model,
        "chat_agent_provider": provider,
        "chat_agent_model": default_model,
    }

    # Save
    save_secrets(secrets)
    save_config(config)

    # Optional: Supermemory key — gives the Chat Agent persistent memory
    print("\n4. Supermemory (Optional)")
    print("-" * 40)
    print("Gives the Chat Agent persistent memory across sessions.")
    print("Get a free key at: https://app.supermemory.ai")
    supermemory_key = input("Press Enter to skip: ").strip()

    if supermemory_key:
        secrets["SUPERMEMORY_API_KEY"] = supermemory_key
        save_secrets(secrets)
        print("✓ Memory enabled — the agent will learn from every session")
    else:
        print("Memory disabled — you can enable it later with:")
        print("  /apikey supermemory sm_...")

    print("\n" + "=" * 60)
    print("✓ Setup complete!")
    print("=" * 60)
    print(f"\nConfig saved to: {get_config_path()}")
    print(f"Secrets saved to: {get_secrets_path()}")
    print("\nNext steps:")
    print("  pacifica chat   — Start the interactive chat agent")
    print("  pacifica start  — Launch both Loop Agent and Chat Agent")
    print("\n⚠️  Default mode: TESTNET with DRY RUN enabled")
    print("    No real orders will be placed until you disable dry run.\n")
