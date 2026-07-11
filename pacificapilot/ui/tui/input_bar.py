"""
Input bar — fixed bottom input using textual-autocomplete.

Uses the Textual-native AutoComplete widget wrapping Input for
slash command autocomplete. No custom Autocomplete widget needed.
"""

from __future__ import annotations

from textual.app import ComposeResult
from textual.widgets import Input, Static
from textual.widget import Widget
from textual_autocomplete import AutoComplete, DropdownItem

# Slash command definitions for autocomplete
SLASH_COMMANDS = [
    DropdownItem("/config",      "View or edit trading parameters"),
    DropdownItem("/apikey",      "Manage AI provider and Pacifica keys"),
    DropdownItem("/mode",        "Switch between testnet and mainnet"),
    DropdownItem("/status",      "Show agent status and recent decisions"),
    DropdownItem("/positions",   "List open positions with live PnL"),
    DropdownItem("/account",     "Fetch account stats from Pacifica"),
    DropdownItem("/history",     "Show recent trade history"),
    DropdownItem("/performance", "Performance metrics (Sharpe, win rate, drawdown)"),
    DropdownItem("/analytics",   "Monthly returns and per-symbol breakdown"),
    DropdownItem("/backtest",    "Run backtest on historical data"),
    DropdownItem("/portfolio",   "Portfolio risk metrics and correlation"),
    DropdownItem("/start",       "Boot the autonomous Loop Agent"),
    DropdownItem("/stop",        "Stop the autonomous Loop Agent"),
    DropdownItem("/pause",       "Soft-pause the Loop Agent"),
    DropdownItem("/resume",      "Resume the Loop Agent"),
    DropdownItem("/loop",        "Alias for /resume and /pause: /loop on | off"),
    DropdownItem("/remote",      "Enable or disable Telegram remote mode"),
    DropdownItem("/help",        "Show all available commands"),
    DropdownItem("/exit",        "Quit PacificaPilot"),
]


class InputBar(Widget):
    """Fixed bottom bar with text input and slash autocomplete."""

    def __init__(self, submit_callback=None):
        super().__init__()
        self._submit_callback = submit_callback
        self._history = []
        self._history_index = -1

    def compose(self) -> ComposeResult:
        input_widget = Input(placeholder="Message or /command...", id="input-field")
        yield AutoComplete(
            input_widget,
            SLASH_COMMANDS,
            prevent_default_enter=True,
        )
        yield input_widget
        yield Static(
            "[dim]\\[/] commands  [↑↓] history  [Esc] cancel  [Ctrl+P] palette[/]",
            id="hint-bar",
        )

    _input: Input

    def on_mount(self) -> None:
        self._input = self.query_one("#input-field", Input)

    def on_input_submitted(self, event: Input.Submitted) -> None:
        text = event.value.strip()
        if not text:
            return
        self._history.append(text)
        if len(self._history) > 100:
            self._history.pop(0)
        self._history_index = len(self._history)
        event.input.value = ""
        if self._submit_callback:
            self._submit_callback(text)

    def key_up(self) -> None:
        """Navigate history."""
        if self._history and self._history_index > 0:
            self._history_index -= 1
            self._input.value = self._history[self._history_index]
            self._input.cursor_position = len(self._input.value)

    def key_down(self) -> None:
        """Navigate history."""
        if self._history_index < len(self._history) - 1:
            self._history_index += 1
            self._input.value = self._history[self._history_index]
            self._input.cursor_position = len(self._input.value)

    def key_escape(self) -> None:
        """Escape — handled by AutoComplete widget."""
        pass

    def action_ctrl_p(self) -> None:
        self._input.value = "/"
        self._input.cursor_position = 1
        self._input.focus()
