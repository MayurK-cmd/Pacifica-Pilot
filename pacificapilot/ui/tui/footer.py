"""
Footer bar — single-line status bar at the bottom of the chat area.

Updates reactively from PilotState via a 5-second timer.
No text content beyond Rich markup referencing TCSS variables.
"""

from __future__ import annotations

from textual.app import ComposeResult
from textual.widgets import Static

from .state import get_state


class PacificaFooter(Static):
    """Single-line status footer, reactive from PilotState."""

    def __init__(self):
        super().__init__(id="footer")

    def on_mount(self) -> None:
        self.set_interval(5, self._refresh)
        self._refresh()

    def _refresh(self) -> None:
        state = get_state()
        s = state.to_dict()
        parts = []

        # Loop status
        if s["agent_running"]:
            if s["agent_paused"]:
                parts.append("[#f59e0b bold]⏸ PAUSED[/]")
            else:
                parts.append("[#22c55e bold]● RUNNING[/]")
        else:
            parts.append("[#ef4444 bold]✗ STOPPED[/]")

        # Provider
        p = s.get("provider_name", "") or "n/a"
        parts.append(f"[dim #475569]{p}[/]")

        # Symbols summary
        parts.append("[dim #475569]BTC/ETH[/]")

        # Dry run
        dry_str = "[#22c55e]dry:ON[/]" if s["dry_run"] else "[#f59e0b]dry:OFF[/]"
        parts.append(dry_str)

        # Mode
        mode = s.get("mode", "testnet")
        mode_color = "#22c55e" if mode == "testnet" else "#ef4444"
        parts.append(f"[{mode_color}]{mode}[/]")

        self.update("  │  ".join(parts))
