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
        self.set_interval(1, self._refresh_clock)
        self._refresh()
        self._refresh_clock()

    def _refresh_clock(self) -> None:
        """Tick the top-right clock every second."""
        try:
            now = datetime.now().strftime("%H:%M:%S")
            self.query_one("#header-right", Static).update(f"[dim #a1a1aa]{now}[/]")
        except Exception:
            pass

    def _refresh(self) -> None:
        """Refresh all header content from PilotState."""
        s = get_state().to_dict()

        # ── Left: title + version ──
        self.query_one("#header-left", Static).update(
            "[bold #fafafa]PacificaPilot[/] [dim #a1a1aa]v0.1.0[/]"
        )

        # ── Center: badges ──
        mode = s.get("mode", "testnet")
        dry_run = s.get("dry_run", True)
        provider = s.get("provider_name", "n/a")
        badges = []
        if mode == "testnet":
            badges.append("[#fafafa bold on #26262b] TESTNET [/]")
        else:
            badges.append("[#ef4444 bold on #3f0f0f] MAINNET [/]")
        if dry_run:
            badges.append("[#22c55e on #0f2f1a] DRY:ON [/]")
        else:
            badges.append("[#f59e0b bold on #3f2a0f] DRY:OFF [/]")
        badges.append(f"[dim #a1a1aa]{provider}[/]")
        self.query_one("#header-center", Static).update("  ".join(badges))

        # ── Right: time ──
        now = datetime.now().strftime("%H:%M:%S")
        self.query_one("#header-right", Static).update(f"[dim #a1a1aa]{now}[/]")

        # ── Price line ──
        btc = s.get("btc_price", 0)
        eth = s.get("eth_price", 0)
        btc_ch = s.get("btc_change", 0)
        eth_ch = s.get("eth_change", 0)
        parts = []
        if btc > 0:
            arrow = "▲" if btc_ch >= 0 else "▼"
            color = "#22c55e" if btc_ch >= 0 else "#ef4444"
            parts.append(f"[dim #a1a1aa]BTC[/] [#d4d4d8]$ {btc:,.0f}[/] [{color}]{arrow}[/]")
        if eth > 0:
            arrow = "▲" if eth_ch >= 0 else "▼"
            color = "#22c55e" if eth_ch >= 0 else "#ef4444"
            parts.append(f"[dim #a1a1aa]ETH[/] [#d4d4d8]$ {eth:,.0f}[/] [{color}]{arrow}[/]")
        self.query_one("#header-prices", Static).update(
            "  ".join(parts) if parts else "[dim #3f3f46]no price data[/]"
        )
