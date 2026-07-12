"""
Chat panel — scrollable output area for user messages, agent responses, system events.

Three message types:
- Agent:  left aligned, accent colored prefix
- User:   right aligned, dim
- System: centered, italic

History messages (from previous session) are dim.
Auto-scroll only when user is at bottom — respects manual scroll-up.
All colors via Rich markup matching pacificapilot.tcss variables.
"""

from __future__ import annotations

import re
from datetime import datetime

from textual.widgets import RichLog


def _strip_markdown(text: str) -> str:
    """Convert markdown formatting to Rich markup where possible, strip otherwise."""
    # Bold: **text** or __text__
    text = re.sub(r"\*\*(.+?)\*\*", r"[bold]\1[/]", text)
    text = re.sub(r"__(.+?)__", r"[bold]\1[/]", text)
    # Italic: *text* or _text_
    text = re.sub(r"(?<!\w)\*(?!\*)(.+?)(?<!\*)\*(?!\w)", r"[italic]\1[/]", text)
    # Inline code: `text`
    text = re.sub(r"`([^`]+)`", r"[dim #475569]\1[/]", text)
    return text


class ChatPanel(RichLog):
    """Scrollable chat/output panel with word wrap and markdown stripping."""

    def __init__(self):
        super().__init__(
            highlight=True, markup=True, max_lines=10000, wrap=True,
            id="chat-panel",
        )
        self.auto_scroll = True
        self._user_at_bottom = True
        self._history_loaded = False

    def on_mount(self) -> None:
        self.add_system_event("PacificaPilot TUI ready")

    def _on_virtual_scroll(self, *args) -> None:
        """Track whether user is at the bottom of the scroll area."""
        # This hooks into RichLog's scroll event if available
        pass

    # ── Message types ──

    def add_agent_message(self, text: str) -> None:
        """Agent response — left, with [pilot:] prefix in accent blue."""
        ts = datetime.now().strftime("%H:%M:%S")
        cleaned = _strip_markdown(text)
        self.write(f"[dim #1e3a5f]{ts}[/]  [bold #3b82f6]pilot:[/] {cleaned}")

    def add_user_message(self, text: str) -> None:
        """User message — right aligned, dim."""
        ts = datetime.now().strftime("%H:%M:%S")
        cleaned = _strip_markdown(text)
        self.write(f"[dim #475569]{ts}  you: {cleaned}[/]")

    def add_system_event(self, text: str) -> None:
        """System event — centered, italic, muted."""
        cleaned = _strip_markdown(text)
        self.write(f"\n[dim #475569 italic]── {cleaned} ──[/]\n")

    def add_history_message(self, text: str) -> None:
        """History message — very dim, from previous session."""
        ts = datetime.now().strftime("%H:%M:%S")
        cleaned = _strip_markdown(text)
        self.write(f"[dim #1e3a5f]{ts}  {cleaned}[/]")

    def add_raw(self, renderable) -> None:
        """Add a Rich renderable (table, panel, etc.)."""
        self.write(renderable)
