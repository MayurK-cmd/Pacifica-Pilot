"""
Chat panel — scrollable output area for user messages, agent responses, system events.

Three message types: USER (right/dim), AGENT (left/accent), SYSTEM (center/italic).
Strips markdown formatting (**bold**, __italic__) that RichLog can't render.
No horizontal scroll — text wraps to panel width.
"""

from __future__ import annotations

import re
from datetime import datetime

from textual.widgets import RichLog


def _strip_markdown(text: str) -> str:
    """Convert markdown formatting to Rich markup where possible, strip otherwise.

    - **bold** or __bold__ → Rich [bold]
    - *italic* or _italic_ → Rich [italic]
    - `code` → [dim]code[/]
    - Removes markdown-style bold markers that Rich can't render.
    """
    # Bold: **text** or __text__
    text = re.sub(r"\*\*(.+?)\*\*", r"[bold]\1[/]", text)
    text = re.sub(r"__(.+?)__", r"[bold]\1[/]", text)
    # Italic: *text* or _text_ (but only if not part of a word)
    text = re.sub(r"(?<!\w)\*(?!\*)(.+?)(?<!\*)\*(?!\w)", r"[italic]\1[/]", text)
    # Inline code: `text`
    text = re.sub(r"`([^`]+)`", r"[dim]\1[/]", text)
    return text


class ChatPanel(RichLog):
    """Scrollable chat/output panel with word wrap and markdown stripping."""

    BORDER_TITLE = "Chat"

    def __init__(self):
        super().__init__(highlight=True, markup=True, max_lines=10000, wrap=True)
        self.auto_scroll = True

    def on_mount(self) -> None:
        self.add_system_event("PacificaPilot TUI ready")

    def add_user_message(self, text: str) -> None:
        ts = datetime.now().strftime("%H:%M:%S")
        cleaned = _strip_markdown(text)
        self.write(f"[dim]{ts}  [bold]you:[/bold] {cleaned}[/]")

    def add_agent_message(self, text: str) -> None:
        ts = datetime.now().strftime("%H:%M:%S")
        cleaned = _strip_markdown(text)
        self.write(f"{ts}  [bold #5B9FFF]pilot:[/] {cleaned}")

    def add_system_event(self, text: str) -> None:
        cleaned = _strip_markdown(text)
        self.write(f"\n[dim italic]── {cleaned} ──[/]\n")

    def add_raw(self, renderable) -> None:
        """Add a Rich renderable (table, panel, etc.)."""
        self.write(renderable)
