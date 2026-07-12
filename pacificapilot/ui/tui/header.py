"""
Header bar widget — two rows.

Row 1: title + mode badges + provider + prices
Row 2: price ticker (BTC/ETH with direction arrows)

All colors from pacificapilot.tcss via Rich markup.
Prices update every 30 seconds from PilotState.
"""

from __future__ import annotations

from datetime import datetime

from textual.app import ComposeResult
from textual.widgets import Static
from textual.widget import Widget
from textual.containers import Horizontal

from .state import get_state


class PacificaHeader(Widget):
    """Two-row header: title/badges/prices + fine print."""

    def __init__(self):
        super().__init__(id="header")

    def compose(self) -> ComposeResult:
        with Horizontal(id="header-row1"):
            yield Static(id="header-left")
            yield Static(id="header-center")
            yield Static(id="header-right")
        yield Static(id="header-prices")

    def on_mount(self) -> None:
        self.set_interval(30, self._refresh)
        self._refresh()

    def _refresh(self) -> None:
        """Refresh all header content from PilotState."""
        s = get_state().to_dict()

        # ── Left: title + version ──
        self.query_one("#header-left", Static).update(
            "[bold #3b82f6]PacificaPilot[/] [dim #475569]v0.1.0[/]"
        )

        # ── Center: badges ──
        mode = s.get("mode", "testnet")
        dry_run = s.get("dry_run", True)
        provider = s.get("provider_name", "n/a")
        badges = []
        if mode == "testnet":
            badges.append("[#3b82f6 bold on #0f1f3d] TESTNET [/]")
        else:
            badges.append("[#ef4444 bold on #3f0f0f] MAINNET [/]")
        if dry_run:
            badges.append("[#22c55e on #0f2f1a] DRY:ON [/]")
        else:
            badges.append("[#f59e0b bold on #3f2a0f] DRY:OFF [/]")
        badges.append(f"[dim #475569]{provider}[/]")
        self.query_one("#header-center", Static).update("  ".join(badges))

        # ── Right: time ──
        now = datetime.now().strftime("%H:%M:%S")
        self.query_one("#header-right", Static).update(f"[dim #475569]{now}[/]")

        # ── Price line ──
        btc = s.get("btc_price", 0)
        eth = s.get("eth_price", 0)
        btc_ch = s.get("btc_change", 0)
        eth_ch = s.get("eth_change", 0)
        parts = []
        if btc > 0:
            arrow = "▲" if btc_ch >= 0 else "▼"
            color = "#22c55e" if btc_ch >= 0 else "#ef4444"
            parts.append(f"[dim #475569]BTC[/] [#93c5fd]$ {btc:,.0f}[/] [{color}]{arrow}[/]")
        if eth > 0:
            arrow = "▲" if eth_ch >= 0 else "▼"
            color = "#22c55e" if eth_ch >= 0 else "#ef4444"
            parts.append(f"[dim #475569]ETH[/] [#93c5fd]$ {eth:,.0f}[/] [{color}]{arrow}[/]")
        self.query_one("#header-prices", Static).update(
            "  ".join(parts) if parts else "[dim #1e3a5f]no price data[/]"
        )
