"""
Configuration management — read/write config.json with validation.

Config structure:
- symbols: List of markets to trade (e.g., ["BTC", "ETH"])
- loop_interval_seconds: How often the Loop Agent runs (default 300)
- max_position_usdc: Max USDC position size per symbol
- min_confidence: Minimum AI confidence to place trades (0.0-1.0)
- stop_loss_pct: Stop loss percentage
- take_profit_pct: Take profit percentage
- risk_profile: "conservative" | "balanced" | "aggressive"
- mode: "testnet" | "mainnet"
- dry_run: If True, no real orders are placed
- use_binance_fallback: Use Binance for kline/RSI data
- remote_mode_enabled: Enable Telegram bot
- telegram_chat_ids: List of allowed Telegram chat IDs
- loop_agent_provider: AI provider for Loop Agent
- loop_agent_model: Model name for Loop Agent
- chat_agent_provider: AI provider for Chat Agent
- chat_agent_model: Model name for Chat Agent
"""

import json
from pathlib import Path
from typing import Optional

DEFAULT_CONFIG = {
    "symbols": ["BTC", "ETH"],
    "loop_interval_seconds": 300,
    "max_position_usdc": 100.0,
    "min_confidence": 0.60,
    "stop_loss_pct": 5.0,
    "take_profit_pct": 10.0,
    "risk_profile": "balanced",
    "mode": "testnet",
    "dry_run": True,
    "use_binance_fallback": True,
    "remote_mode_enabled": False,
    "telegram_chat_ids": [],
    "loop_agent_provider": "openrouter",
    "loop_agent_model": "anthropic/claude-3.5-sonnet",
    "chat_agent_provider": "openrouter",
    "chat_agent_model": "anthropic/claude-3.5-sonnet",
    "memo_cluster": "devnet",
    "memo_enabled": True,
    "use_kelly_criterion": False,
    "fractional_kelly": 0.5,
    "use_limit_orders": False,
    "limit_order_offset_pct": 0.1,
    "max_portfolio_exposure_usdc": 1000.0,
    "max_correlation": 0.8,
    "enable_portfolio_management": True,
}


def get_config_dir() -> Path:
    """Get the config directory path (~/.pacificapilot)."""
    config_dir = Path.home() / ".pacificapilot"
    config_dir.mkdir(parents=True, exist_ok=True)
    return config_dir


def get_config_path() -> Path:
    """Get the config.json file path."""
    return get_config_dir() / "config.json"


def load_config() -> dict:
    """
    Load config from config.json, or return defaults if not found.

    Returns:
        Config dictionary
    """
    config_path = get_config_path()

    if not config_path.exists():
        return DEFAULT_CONFIG.copy()

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)

        # Merge with defaults to handle new fields
        merged = DEFAULT_CONFIG.copy()
        merged.update(config)
        return merged
    except Exception:
        return DEFAULT_CONFIG.copy()


def save_config(config: dict) -> bool:
    """
    Save config to config.json.

    Args:
        config: Config dictionary to save

    Returns:
        True if saved successfully, False otherwise
    """
    config_path = get_config_path()

    try:
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        return True
    except Exception:
        return False


def update_config(updates: dict) -> dict:
    """
    Update specific config fields and save.

    Args:
        updates: Dictionary of fields to update

    Returns:
        Updated config dictionary
    """
    config = load_config()
    config.update(updates)
    save_config(config)
    return config


def validate_config(config: dict) -> tuple[bool, str]:
    """
    Validate config structure and values.

    Returns:
        (is_valid: bool, error_message: str)
    """
    if not isinstance(config.get("symbols"), list) or not config["symbols"]:
        return False, "symbols must be a non-empty list"

    if not isinstance(config.get("loop_interval_seconds"), (int, float)) or config["loop_interval_seconds"] < 60:
        return False, "loop_interval_seconds must be >= 60"

    if not isinstance(config.get("max_position_usdc"), (int, float)) or config["max_position_usdc"] <= 0:
        return False, "max_position_usdc must be positive"

    min_conf = config.get("min_confidence", 0)
    if not isinstance(min_conf, (int, float)) or not (0.0 <= min_conf <= 1.0):
        return False, "min_confidence must be between 0.0 and 1.0"

    if config.get("mode") not in ("testnet", "mainnet"):
        return False, "mode must be 'testnet' or 'mainnet'"

    if config.get("risk_profile") not in ("conservative", "balanced", "aggressive"):
        return False, "risk_profile must be 'conservative', 'balanced', or 'aggressive'"

    # Whitelist: only the 4 supported AI providers (matching Claude Code's pattern)
    # Accept "google" as alias for "gemini"
    ALLOWED_PROVIDERS = {"anthropic", "openai", "gemini", "google", "openrouter"}
    for provider_key in ("loop_agent_provider", "chat_agent_provider"):
        provider = config.get(provider_key)
        if provider is not None and provider.lower() not in ALLOWED_PROVIDERS:
            return False, f"{provider_key} must be one of: {', '.join(sorted(ALLOWED_PROVIDERS - {'google'}))}"

    # Normalize "google" → "gemini" in saved config
    for provider_key in ("loop_agent_provider", "chat_agent_provider"):
        if config.get(provider_key, "").lower() == "google":
            config[provider_key] = "gemini"

    return True, ""


def get_secrets_path() -> Path:
    """Get the secrets.env file path."""
    return get_config_dir() / "secrets.env"


def load_secrets() -> dict:
    """
    Load secrets from secrets.env.

    Expected format:
        PACIFICA_PUBLIC_KEY=...
        PACIFICA_PRIVATE_KEY=...
        ANTHROPIC_API_KEY=...
        OPENAI_API_KEY=...
        GOOGLE_API_KEY=...
        OPENROUTER_API_KEY=...
        TELEGRAM_BOT_TOKEN=...

    Returns:
        Dictionary of secrets
    """
    secrets_path = get_secrets_path()
    secrets = {}

    if not secrets_path.exists():
        return secrets

    try:
        with open(secrets_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, value = line.split("=", 1)
                    secrets[key.strip()] = value.strip()
    except Exception:
        pass

    return secrets


def save_secrets(secrets: dict) -> bool:
    """
    Save secrets to secrets.env.

    Args:
        secrets: Dictionary of secret key-value pairs

    Returns:
        True if saved successfully, False otherwise
    """
    secrets_path = get_secrets_path()

    try:
        # Track which keys we've written
        written_keys = set()

        with open(secrets_path, "w", encoding="utf-8") as f:
            f.write("# PacificaPilot secrets - DO NOT COMMIT\n")
            f.write("# Pacifica keys\n")
            for key in ["PACIFICA_PUBLIC_KEY", "PACIFICA_PRIVATE_KEY"]:
                if key in secrets:
                    f.write(f"{key}={secrets[key]}\n")
                    written_keys.add(key)

            f.write("\n# AI provider keys\n")
            for key in ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GOOGLE_API_KEY", "OPENROUTER_API_KEY"]:
                if key in secrets:
                    f.write(f"{key}={secrets[key]}\n")
                    written_keys.add(key)

            f.write("\n# Telegram\n")
            if "TELEGRAM_BOT_TOKEN" in secrets:
                f.write(f"TELEGRAM_BOT_TOKEN={secrets['TELEGRAM_BOT_TOKEN']}\n")
                written_keys.add("TELEGRAM_BOT_TOKEN")

            # Write any remaining keys (like ELFA_API_KEY, custom keys, etc.)
            remaining = {k: v for k, v in secrets.items() if k not in written_keys}
            if remaining:
                f.write("\n# Other keys\n")
                for key, value in remaining.items():
                    f.write(f"{key}={value}\n")

        # Restrict permissions on Unix-like systems
        try:
            secrets_path.chmod(0o600)
        except Exception:
            pass

        return True
    except Exception:
        return False


def update_secret(key: str, value: str) -> bool:
    """
    Update a single secret and save.

    Args:
        key: Secret key
        value: Secret value

    Returns:
        True if saved successfully, False otherwise
    """
    secrets = load_secrets()
    secrets[key] = value
    return save_secrets(secrets)
