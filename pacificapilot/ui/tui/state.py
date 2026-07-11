"""
Shared live state dataclass for the TUI.

A singleton that the Loop Agent and Chat Agent write to after each cycle.
The sidebar reads from it on a 10-second timer. No agent logic here — just
a shared data container.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional


@dataclass
class PositionState:
    symbol: str
    side: str  # "LONG" / "SHORT"
    size: float
    entry_price: float
    mark_price: float
    unrealized_pnl: float


@dataclass
class DecisionState:
    action: str  # "LONG" / "SHORT" / "HOLD"
    confidence: float
    reasoning: str = ""
    timestamp: float = 0.0


@dataclass
class PilotState:
    """Aggregate state shared between agents and the TUI sidebar."""

    # Agent
    agent_running: bool = False
    agent_paused: bool = False
    next_cycle_seconds: int = 0
    last_cycle_start: Optional[datetime] = None

    # Account
    account_equity: float = 0.0
    account_available: float = 0.0
    account_margin: float = 0.0

    # Positions
    open_positions: list[PositionState] = field(default_factory=list)

    # Decisions
    last_decisions: dict[str, DecisionState] = field(default_factory=dict)

    # Prices (updated by header timer)
    btc_price: float = 0.0
    btc_change: float = 0.0  # +1 or -1 direction
    eth_price: float = 0.0
    eth_change: float = 0.0

    # Config
    mode: str = "testnet"
    dry_run: bool = True
    provider_name: str = ""

    # Memory
    memory_enabled: bool = False
    memory_count: int = 0
    memory_mode: str = ""  # "local" or "cloud"

    # Keypair loaded
    has_keypair: bool = False

    def __post_init__(self):
        self._lock = threading.Lock()

    def update(self, **kwargs):
        with self._lock:
            for k, v in kwargs.items():
                if hasattr(self, k):
                    setattr(self, k, v)

    def get(self, key: str, default=None):
        with self._lock:
            return getattr(self, key, default)

    def set_position(self, symbol: str, pos: Optional[PositionState]):
        with self._lock:
            if pos is None:
                self.open_positions = [p for p in self.open_positions if p.symbol != symbol]
            else:
                existing = [p for p in self.open_positions if p.symbol == symbol]
                if existing:
                    self.open_positions = [pos if p.symbol == symbol else p for p in self.open_positions]
                else:
                    self.open_positions.append(pos)

    def set_decision(self, symbol: str, decision: DecisionState):
        with self._lock:
            self.last_decisions[symbol] = decision

    def to_dict(self) -> dict:
        with self._lock:
            return {
                "agent_running": self.agent_running,
                "agent_paused": self.agent_paused,
                "next_cycle_seconds": self.next_cycle_seconds,
                "account_equity": self.account_equity,
                "account_available": self.account_available,
                "account_margin": self.account_margin,
                "open_positions": list(self.open_positions),
                "last_decisions": dict(self.last_decisions),
                "btc_price": self.btc_price,
                "btc_change": self.btc_change,
                "eth_price": self.eth_price,
                "eth_change": self.eth_change,
                "mode": self.mode,
                "dry_run": self.dry_run,
                "provider_name": self.provider_name,
                "memory_enabled": self.memory_enabled,
                "memory_count": self.memory_count,
                "memory_mode": self.memory_mode,
                "has_keypair": self.has_keypair,
            }


# --- Singleton ---

_singleton: Optional[PilotState] = None
_singleton_lock = threading.Lock()


def get_state() -> PilotState:
    global _singleton
    if _singleton is None:
        with _singleton_lock:
            if _singleton is None:
                _singleton = PilotState()
    return _singleton
