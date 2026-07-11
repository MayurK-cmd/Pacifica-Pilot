"""
Header bar widget — shows project name, mode badge, prices.

Fixed at top, refreshes prices every 30 seconds from PilotState.
"""

from __future__ import annotations

from datetime import datetime

from textual.app import ComposeResult
from textual.widgets import Static
from textual.reactive import reactive

from .state import get_state


class PacificaHeader(Static):
    """Top header bar showing project info, mode, and live prices."""

    btc_text = reactive("")
    eth_text = reactive("")
    mode_text = reactive("")
    provider_text = reactive("")

    def on_mount(self) -> None:
        self.set_interval(30, self._refresh_prices)
        self._refresh_prices()
        self._refresh_mode()

    def _refresh_prices(self) -> None:
        state = get_state()
        btc = state.get("btc_price", 0)
        eth = state.get("eth_price", 0)
        btc_ch = state.get("btc_change", 0)
        eth_ch = state.get("eth_change", 0)
        btc_arrow = "▲" if btc_ch >= 0 else "▼"
        eth_arrow = "▲" if eth_ch >= 0 else "▼"
        btc_color = "green" if btc_ch >= 0 else "red"
        eth_color = "green" if eth_ch >= 0 else "red"
        self.btc_text = f"[{btc_color}]{btc_arrow} $ {btc:,.0f}[/]" if btc > 0 else ""
        self.eth_text = f"[{eth_color}]{eth_arrow} $ {eth:,.0f}[/]" if eth > 0 else ""

    def _refresh_mode(self) -> None:
        state = get_state()
        mode = state.get("mode", "testnet")
        dry_run = state.get("dry_run", True)
        provider = state.get("provider_name", "n/a")
        mode_color = "green" if mode == "testnet" else "red"
        dry_color = "green" if dry_run else "yellow"
        self.mode_text = f"[{mode_color}]{mode.upper()}[/] [bold]{'DRY RUN: ON' if dry_run else 'DRY RUN: OFF'}[/]"
        self.provider_text = f"[dim]{provider}[/]"

    def watch_btc_text(self, val: str) -> None:
        self.refresh()

    def watch_eth_text(self, val: str) -> None:
        self.refresh()

    def render(self) -> str:
        now = datetime.now().strftime("%H:%M:%S")
        parts = [
            f"[bold]PacificaPilot[/]",
            f"[dim]{now}[/]",
            f"[reverse] {self.mode_text} [/]",
            f"{self.provider_text}",
        ]
        prices = []
        if self.btc_text:
            prices.append(f"BTC {self.btc_text}")
        if self.eth_text:
            prices.append(f"ETH {self.eth_text}")
        if prices:
            parts.append("  ".join(prices))
        return "  |  ".join(parts)
