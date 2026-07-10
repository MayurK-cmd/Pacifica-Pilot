"""Storage layer — config.json and SQLite database management."""

from .config import (
    load_config,
    save_config,
    update_config,
    validate_config,
    load_secrets,
    save_secrets,
    update_secret,
    get_config_path,
    get_secrets_path,
)
from .database import (
    init_db,
    record_trade,
    upsert_position,
    delete_position,
    get_position,
    get_all_positions,
    record_decision,
    record_memo,
    get_recent_decisions,
    get_recent_trades,
    get_total_pnl,
)

__all__ = [
    "load_config",
    "save_config",
    "update_config",
    "validate_config",
    "load_secrets",
    "save_secrets",
    "update_secret",
    "get_config_path",
    "get_secrets_path",
    "init_db",
    "record_trade",
    "upsert_position",
    "delete_position",
    "get_position",
    "get_all_positions",
    "record_decision",
    "record_memo",
    "get_recent_decisions",
    "get_recent_trades",
    "get_total_pnl",
]
