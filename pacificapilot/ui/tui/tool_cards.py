"""
Tool call cards — collapsible cards for agent tool executions.

Collapsed (default):  [▶ tool_name(args) → result]
Expanded:            [▼ tool_name with full params]
Active border changes from $border to $border-active while running.

All styling via pacificapilot.tcss class names — no hex in Python.
"""

from __future__ import annotations

from textual.app import ComposeResult
from textual.widgets import Static
from textual.widget import Widget
from textual.containers import Vertical
from datetime import datetime


class ToolCallCard(Widget):
    """A single tool call card (collapsed/expandable)."""

    DEFAULT_CSS = ""  # All styling from pacificapilot.tcss

    def __init__(
        self,
        tool_name: str,
        args: dict,
        result: str | None = None,
        is_running: bool = False,
        error: str | None = None,
    ):
        super().__init__()
        self._tool_name = tool_name
        self._args = args
        self._result = result
        self._is_running = is_running
        self._error = error
        self._expanded = False
        self.classes = "tool-card"

    def compose(self) -> ComposeResult:
        yield Static(id="tool-card-content")

    def on_mount(self) -> None:
        self._render()

    def _render(self) -> None:
        content = self.query_one("#tool-card-content", Static)
        if self._expanded:
            content.update(self._render_expanded())
        else:
            content.update(self._render_collapsed())
        # Update border for active state
        if self._is_running:
            self.classes = "tool-card tool-card-active"
        else:
            self.classes = "tool-card"

    def _render_collapsed(self) -> str:
        icon = "[bold #3b82f6]▶[/]"
        name = f"[bold]{self._tool_name}[/]"
        args_str = ", ".join(f"{k}={v}" for k, v in self._args.items())
        if self._is_running:
            status = "[dim #475569]running...[/]"
        elif self._error:
            status = f"[#ef4444]✗ {self._error}[/]"
        elif self._result:
            status = f"[#22c55e]✓ {self._result[:60]}[/]"
        else:
            status = "[dim #475569]done[/]"
        return f"{icon}  {name}({args_str})  {status}"

    def _render_expanded(self) -> str:
        icon = "[bold #3b82f6]▼[/]"
        name = f"[bold]{self._tool_name}[/]"
        lines = [f"{icon}  {name}"]
        for k, v in self._args.items():
            lines.append(f"  [dim #475569]{k}:[/]  {v}")
        if self._result:
            lines.append(f"  [dim #1e3a5f]────────────────[/]")
            lines.append(f"  [dim #475569]result:[/]  {self._result}")
        if self._error:
            lines.append(f"  [#ef4444]error:[/]  {self._error}")
        return "\n".join(lines)

    def toggle(self) -> None:
        self._expanded = not self._expanded
        self._render()

    def set_running(self, running: bool) -> None:
        self._is_running = running
        self._render()

    def set_result(self, result: str, error: str | None = None) -> None:
        self._result = result
        self._error = error
        self._is_running = False
        self._render()


class ToolCallCardContainer(Widget):
    """Container for tool call cards — rendered between sidebar and footer."""

    def __init__(self):
        super().__init__(id="tool-card-container")
        self._cards: list[ToolCallCard] = []

    def compose(self) -> ComposeResult:
        yield Vertical(id="tool-cards")

    def add_card(
        self,
        tool_name: str,
        args: dict,
        result: str | None = None,
        is_running: bool = False,
        error: str | None = None,
    ) -> ToolCallCard:
        card = ToolCallCard(tool_name, args, result, is_running, error)
        self._cards.append(card)
        self.query_one("#tool-cards").mount(card)
        return card

    def expand_latest(self) -> None:
        if self._cards:
            self._cards[-1].toggle()

    def collapse_latest(self) -> None:
        if self._cards:
            self._cards[-1].toggle()

    def clear(self) -> None:
        self._cards.clear()
        self.query_one("#tool-cards").remove_children()
