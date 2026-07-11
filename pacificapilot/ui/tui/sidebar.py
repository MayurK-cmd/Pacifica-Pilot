"""
Status sidebar — live state at a glance.

Reads from PilotState singleton. Refreshes every 10 seconds.
Never makes API calls itself.
"""

from __future__ import annotations

from textual.app import ComposeResult
from textual.widgets import Static, Label
from textual.reactive import reactive
from rich.text import Text
from rich.console import RenderableType

from .state import get_state


class Sidebar(Static):
    """Right sidebar showing agent state, positions, account, decisions, memory."""

    def on_mount(self) -> None:
        self.set_interval(5, self.refresh_content)
        self.refresh_content()

    def refresh_content(self) -> None:
        state = get_state()
        s = state.to_dict()
        lines = []

        # --- Loop Agent ---
        lines.append("[bold]Loop Agent[/]")
        if s["agent_running"]:
            if s["agent_paused"]:
                lines.append("[yellow]⏸ PAUSED[/]")
            else:
                lines.append("[green]● RUNNING[/]")
        else:
            lines.append("[red]✗ STOPPED[/]")
        if s["next_cycle_seconds"] > 0:
            m, sec = divmod(s["next_cycle_seconds"], 60)
            lines.append(f"[dim]Next cycle: {m}m {sec}s[/]")
        lines.append("")

        # --- Open Positions ---
        lines.append("[dim]───────────[/]")
        lines.append("[bold]Open Positions[/]")
        positions = s["open_positions"]
        if not positions:
            lines.append("[dim]No open positions[/]")
        else:
            for pos in positions:
                pnl = pos.unrealized_pnl
                color = "green" if pnl >= 0 else "red"
                arrow = "▲" if pnl >= 0 else "▼"
                side_tag = f"[bold green]LONG[/]" if pos.side == "LONG" else f"[bold red]SHORT[/]"
                lines.append(
                    f"{pos.symbol} {side_tag} [{color}]{pnl:+.2f} {arrow}[/]"
                )
        lines.append("")

        # --- Account ---
        lines.append("[dim]───────────[/]")
        lines.append("[bold]Account[/]")
        lines.append(f"Equity:     [bold]${s['account_equity']:,.2f}[/]")
        lines.append(f"Available:  ${s['account_available']:,.2f}")
        lines.append(f"Margin:     ${s['account_margin']:,.2f}")
        lines.append("")

        # --- Last Decisions ---
        lines.append("[dim]───────────[/]")
        lines.append("[bold]Last Decisions[/]")
        decs = s["last_decisions"]
        if not decs:
            lines.append("[dim]No decisions yet[/]")
        else:
            for symbol, dec in decs.items():
                conf = dec.confidence
                action_color = "green" if dec.action == "LONG" else ("red" if dec.action == "SHORT" else "dim")
                lines.append(
                    f"{symbol}: [{action_color}]{dec.action}[/] {conf:.0%} conf"
                )
        lines.append("")

        # --- Memory ---
        lines.append("[dim]───────────[/]")
        lines.append("[bold]Memory[/]")
        if s["memory_enabled"]:
            mode = s.get("memory_mode", "")
            mode_tag = f"[green]Local[/]" if mode == "local" else f"[green]Cloud[/]"
            lines.append(f"● {mode_tag}")
            lines.append(f"[dim]{s['memory_count']} memories[/]")
        else:
            lines.append("[dim]○ Disabled[/]")
        lines.append("")

        # --- Config Quick ---
        lines.append("[dim]───────────[/]")
        mode_color = "green" if s["mode"] == "testnet" else "red"
        dry_str = "ON" if s["dry_run"] else "OFF"
        lines.append(f"[bold]Mode:[/] [{mode_color}]{s['mode']}[/]")
        lines.append(f"[bold]Dry run:[/] {dry_str}")
        if s["provider_name"]:
            lines.append(f"[bold]AI:[/] [dim]{s['provider_name']}[/]")

        self.update("\n".join(lines))
