"""
Status sidebar — live state at a glance.

Reads from PilotState singleton. Refreshes every 10 seconds.
Never makes API calls itself.

All colors via Rich markup matching pacificapilot.tcss variables.
"""

from __future__ import annotations

from textual.app import ComposeResult
from textual.widgets import Static
from textual.reactive import reactive
from rich.text import Text

from .state import get_state


SIDEBAR_WIDTH = 30  # characters for dashes padding


def _dim_line(label: str) -> str:
    """Render a section header line like '─── Positions ───'."""
    dashes = "─" * (SIDEBAR_WIDTH - len(label) - 2)
    return f"[dim #1e3a5f]─── {label} {dashes}[/]"


class Sidebar(Static):
    """Right sidebar showing agent state, positions, account, decisions, memory."""

    def __init__(self):
        super().__init__(id="sidebar")

    def on_mount(self) -> None:
        self.set_interval(10, self.refresh_content)
        self.refresh_content()

    def refresh_content(self) -> None:
        state = get_state()
        s = state.to_dict()
        lines = []

        # ── Loop Agent ──
        lines.append("[bold #1e3a5f]Loop Agent[/]")
        if s["agent_running"]:
            if s["agent_paused"]:
                lines.append("[#f59e0b bold]⏸ PAUSED[/]")
            else:
                lines.append("[#22c55e bold]● RUNNING[/]")
        else:
            lines.append("[#ef4444 bold]✗ STOPPED[/]")
        if s["next_cycle_seconds"] > 0:
            m, sec = divmod(s["next_cycle_seconds"], 60)
            lines.append(f"[dim #475569]Next cycle: {m}m {sec}s[/]")
        lines.append("")

        # ── Positions ──
        lines.append(_dim_line("Positions"))
        positions = s["open_positions"]
        if not positions:
            lines.append("[dim #1e3a5f]—  no position[/]")
        else:
            for pos in positions:
                pnl = pos.unrealized_pnl
                color = "#22c55e" if pnl >= 0 else "#ef4444"
                arrow = "▲" if pnl >= 0 else "▼"
                side_tag = f"[bold #22c55e]LONG[/]" if pos.side == "LONG" else f"[bold #ef4444]SHORT[/]"
                lines.append(
                    f"[bold]{pos.symbol}[/] {side_tag}  [{color}]{pnl:+.2f} {arrow}[/]"
                )
        lines.append("")

        # ── Account ──
        lines.append(_dim_line("Account"))
        lines.append(f"[dim #475569]Equity:   [/][#93c5fd]$ {s['account_equity']:,.2f}[/]")
        lines.append(f"[dim #475569]Available: [/][#93c5fd]$ {s['account_available']:,.2f}[/]")
        lines.append(f"[dim #475569]Margin:   [/][#93c5fd]$ {s['account_margin']:,.2f}[/]")
        lines.append("")

        # ── Last Decisions ──
        lines.append(_dim_line("Last Decision"))
        decs = s["last_decisions"]
        if not decs:
            lines.append("[dim #1e3a5f]No decisions yet[/]")
        else:
            for symbol, dec in decs.items():
                conf = dec.confidence
                if dec.action == "LONG":
                    action_colored = f"[#22c55e]LONG[/]"
                elif dec.action == "SHORT":
                    action_colored = f"[#ef4444]SHORT[/]"
                else:
                    action_colored = f"[dim #475569]HOLD[/]"
                lines.append(
                    f"[bold]{symbol}[/] {action_colored}  [dim #475569]{conf:.0%} conf[/]"
                )
        lines.append("")

        # ── Memory ──
        lines.append(_dim_line("Memory"))
        if s["memory_enabled"]:
            mode = s.get("memory_mode", "")
            mode_tag = f"[#3b82f6 bold]● {'Local' if mode == 'local' else 'Cloud'}[/]"
            lines.append(f"{mode_tag}")
        else:
            lines.append("[dim #1e3a5f]○ Disabled[/]")

        self.update("\n".join(lines))
