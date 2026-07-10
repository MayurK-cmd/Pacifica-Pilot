"""
JSON file storage — trades, positions, decisions log.

Storage files:
- trades.json: Completed trade history with entry/exit and realized PnL
- decisions.json: AI decision log with full reasoning, confidence, and outcome
- memos.json: On-chain memo transaction signatures linked to decisions

Note: positions.json is managed separately in positions module
"""

import json
from pathlib import Path
from typing import Optional, List, Dict
from datetime import datetime

from .config import get_config_dir


def get_trades_path() -> Path:
    """Get the trades.json file path."""
    return get_config_dir() / "trades.json"


def get_decisions_path() -> Path:
    """Get the decisions.json file path."""
    return get_config_dir() / "decisions.json"


def get_memos_path() -> Path:
    """Get the memos.json file path."""
    return get_config_dir() / "memos.json"


def get_positions_path() -> Path:
    """Get the positions.json file path."""
    return get_config_dir() / "positions.json"


def _load_json_file(file_path: Path) -> List[Dict]:
    """Load JSON file, return empty list if not found."""
    if not file_path.exists():
        return []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception:
        return []


def _save_json_file(file_path: Path, data: List[Dict]) -> bool:
    """Save data to JSON file with atomic write."""
    try:
        # Write to temp file first, then rename (atomic on most systems)
        temp_path = file_path.with_suffix(".tmp")
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        temp_path.replace(file_path)
        return True
    except Exception:
        return False


def init_db():
    """Initialize JSON storage files if they don't exist."""
    config_dir = get_config_dir()
    config_dir.mkdir(parents=True, exist_ok=True)

    # Create empty JSON files if they don't exist
    for path in [get_trades_path(), get_decisions_path(), get_memos_path(), get_positions_path()]:
        if not path.exists():
            if path.name == "positions.json":
                # positions.json is a dict, not a list
                with open(path, "w", encoding="utf-8") as f:
                    json.dump({}, f)
            else:
                _save_json_file(path, [])


def record_trade(
    symbol: str,
    side: str,
    entry_price: float,
    exit_price: float,
    quantity: float,
    realized_pnl: float,
    entry_time: int,
    exit_time: int,
    exit_reason: Optional[str] = None,
    order_id: Optional[str] = None,
    expected_entry_price: Optional[float] = None,
    actual_entry_price: Optional[float] = None,
    entry_slippage_pct: Optional[float] = None,
    expected_exit_price: Optional[float] = None,
    actual_exit_price: Optional[float] = None,
    exit_slippage_pct: Optional[float] = None,
) -> int:
    """
    Record a completed trade with slippage tracking.

    Returns:
        Trade ID (index in trades list)
    """
    trades = _load_json_file(get_trades_path())

    trade = {
        "id": len(trades) + 1,
        "symbol": symbol,
        "side": side,
        "entry_price": entry_price,
        "exit_price": exit_price,
        "quantity": quantity,
        "realized_pnl": realized_pnl,
        "entry_time": entry_time,
        "exit_time": exit_time,
        "exit_reason": exit_reason,
        "order_id": order_id,
        "expected_entry_price": expected_entry_price,
        "actual_entry_price": actual_entry_price,
        "entry_slippage_pct": entry_slippage_pct,
        "expected_exit_price": expected_exit_price,
        "actual_exit_price": actual_exit_price,
        "exit_slippage_pct": exit_slippage_pct,
        "created_at": int(datetime.now().timestamp())
    }

    trades.append(trade)
    _save_json_file(get_trades_path(), trades)

    return trade["id"]


def upsert_position(
    symbol: str,
    side: str,
    entry_price: float,
    quantity: float,
    size_usdc: float,
    entry_time: int,
    order_id: Optional[str] = None,
    trailing_high: Optional[float] = None,
    trailing_low: Optional[float] = None,
):
    """Insert or update an open position."""
    positions_path = get_positions_path()

    # Load positions dict
    if positions_path.exists():
        with open(positions_path, "r", encoding="utf-8") as f:
            positions = json.load(f)
    else:
        positions = {}

    positions[symbol] = {
        "symbol": symbol,
        "side": side,
        "entry_price": entry_price,
        "quantity": quantity,
        "size_usdc": size_usdc,
        "trailing_high": trailing_high,
        "trailing_low": trailing_low,
        "entry_time": entry_time,
        "order_id": order_id,
        "updated_at": int(datetime.now().timestamp())
    }

    with open(positions_path, "w", encoding="utf-8") as f:
        json.dump(positions, f, indent=2, ensure_ascii=False)


def delete_position(symbol: str):
    """Delete a position (called when closed)."""
    positions_path = get_positions_path()

    if not positions_path.exists():
        return

    with open(positions_path, "r", encoding="utf-8") as f:
        positions = json.load(f)

    if symbol in positions:
        del positions[symbol]

    with open(positions_path, "w", encoding="utf-8") as f:
        json.dump(positions, f, indent=2, ensure_ascii=False)


def get_position(symbol: str) -> Optional[dict]:
    """
    Get an open position by symbol.

    Returns:
        Position dict or None if not found
    """
    positions_path = get_positions_path()

    if not positions_path.exists():
        return None

    with open(positions_path, "r", encoding="utf-8") as f:
        positions = json.load(f)

    return positions.get(symbol)


def get_all_positions() -> list[dict]:
    """Get all open positions."""
    positions_path = get_positions_path()

    if not positions_path.exists():
        return []

    with open(positions_path, "r", encoding="utf-8") as f:
        positions = json.load(f)

    return list(positions.values())


def record_decision(
    symbol: str,
    action: str,
    confidence: float,
    reasoning: str,
    size_pct: Optional[float] = None,
    mark_price: Optional[float] = None,
    rsi_5m: Optional[float] = None,
    rsi_1h: Optional[float] = None,
    basis_pct: Optional[float] = None,
    sentiment_score: Optional[float] = None,
    mention_count: Optional[int] = None,
    order_placed: bool = False,
    order_id: Optional[str] = None,
    outcome: Optional[str] = None,
    pnl_usdc: Optional[float] = None,
) -> int:
    """
    Record an AI decision.

    Returns:
        Decision ID
    """
    decisions = _load_json_file(get_decisions_path())

    decision = {
        "id": len(decisions) + 1,
        "symbol": symbol,
        "action": action,
        "confidence": confidence,
        "reasoning": reasoning,
        "size_pct": size_pct,
        "mark_price": mark_price,
        "rsi_5m": rsi_5m,
        "rsi_1h": rsi_1h,
        "basis_pct": basis_pct,
        "sentiment_score": sentiment_score,
        "mention_count": mention_count,
        "order_placed": 1 if order_placed else 0,
        "order_id": order_id,
        "outcome": outcome,
        "pnl_usdc": pnl_usdc,
        "created_at": int(datetime.now().timestamp())
    }

    decisions.append(decision)
    _save_json_file(get_decisions_path(), decisions)

    return decision["id"]


def record_memo(
    decision_id: int,
    tx_signature: str,
    memo_hash: str,
    cluster: str = "devnet",
) -> int:
    """
    Record an on-chain memo transaction.

    Returns:
        Memo ID
    """
    memos = _load_json_file(get_memos_path())

    memo = {
        "id": len(memos) + 1,
        "decision_id": decision_id,
        "tx_signature": tx_signature,
        "memo_hash": memo_hash,
        "cluster": cluster,
        "created_at": int(datetime.now().timestamp())
    }

    memos.append(memo)
    _save_json_file(get_memos_path(), memos)

    return memo["id"]


def get_recent_decisions(symbol: Optional[str] = None, limit: int = 20) -> list[dict]:
    """
    Get recent AI decisions, optionally filtered by symbol.

    Args:
        symbol: Filter by symbol (optional)
        limit: Max number of decisions to return

    Returns:
        List of decision dicts
    """
    decisions = _load_json_file(get_decisions_path())

    if symbol:
        decisions = [d for d in decisions if d.get("symbol") == symbol]

    # Sort by created_at descending
    decisions = sorted(decisions, key=lambda x: x.get("created_at", 0), reverse=True)

    return decisions[:limit]


def get_recent_trades(symbol: Optional[str] = None, limit: int = 20) -> list[dict]:
    """
    Get recent completed trades, optionally filtered by symbol.

    Args:
        symbol: Filter by symbol (optional)
        limit: Max number of trades to return

    Returns:
        List of trade dicts
    """
    trades = _load_json_file(get_trades_path())

    if symbol:
        trades = [t for t in trades if t.get("symbol") == symbol]

    # Sort by created_at descending
    trades = sorted(trades, key=lambda x: x.get("created_at", 0), reverse=True)

    return trades[:limit]


def get_total_pnl(symbol: Optional[str] = None) -> float:
    """
    Calculate total realized PnL, optionally filtered by symbol.

    Returns:
        Total PnL in USDC
    """
    trades = _load_json_file(get_trades_path())

    if symbol:
        trades = [t for t in trades if t.get("symbol") == symbol]

    return sum(t.get("realized_pnl", 0.0) for t in trades)
