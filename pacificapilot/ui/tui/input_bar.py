"""
Input bar — fixed bottom input using textual-autocomplete.

Two rows:
  Row 1: [#3b82f6 bold]> [/]   [Input widget]
  Row 2: [dim #1e3a5f][/] commands  [↑↓] history  ...

Slash-command autocomplete via textual-autocomplete.
All colors via Rich markup — no hex in Python.
"""

from __future__ import annotations

from textual.app import ComposeResult
from textual.geometry import Offset, Region, Spacing
from textual.widgets import Input, Static
from textual.widget import Widget
from textual.containers import Horizontal
from textual_autocomplete import AutoComplete, DropdownItem, TargetState

# Slash command definitions for autocomplete
# main = plain command text (what gets inserted into input on select)
# prefix = description (shown as secondary text in dropdown)
# Color is applied via TCSS autocomplete-* classes, NOT Rich markup in strings.
SLASH_COMMANDS = [
    DropdownItem("/config",      prefix="View or edit trading parameters"),
    DropdownItem("/apikey",      prefix="Manage AI provider and Pacifica keys"),
    DropdownItem("/mode",        prefix="Switch between testnet and mainnet"),
    DropdownItem("/status",      prefix="Show agent status and recent decisions"),
    DropdownItem("/positions",   prefix="List open positions with live PnL"),
    DropdownItem("/account",     prefix="Fetch account stats from Pacifica"),
    DropdownItem("/history",     prefix="Show recent trade history"),
    DropdownItem("/performance", prefix="Performance metrics (Sharpe, win rate, drawdown)"),
    DropdownItem("/analytics",   prefix="Monthly returns and per-symbol breakdown"),
    DropdownItem("/backtest",    prefix="Run backtest on historical data"),
    DropdownItem("/portfolio",   prefix="Portfolio risk metrics and correlation"),
    DropdownItem("/start",       prefix="Boot the autonomous Loop Agent"),
    DropdownItem("/stop",        prefix="Stop the autonomous Loop Agent"),
    DropdownItem("/pause",       prefix="Soft-pause the Loop Agent"),
    DropdownItem("/resume",      prefix="Resume the Loop Agent"),
    DropdownItem("/loop",        prefix="Alias for /resume and /pause: /loop on | off"),
    DropdownItem("/remote",      prefix="Enable or disable Telegram remote mode"),
    DropdownItem("/clear",       prefix="Clear the chat panel"),
    DropdownItem("/help",        prefix="Show all available commands"),
    DropdownItem("/exit",        prefix="Quit PacificaPilot"),
]


class SlashCommandAutoComplete(AutoComplete):
    """Claude Code-style slash menu: opens on `/`, shows all commands,
    fuzzy-filters as you type, and renders ABOVE the bottom-docked input
    (the base class aligns below the cursor, which is off-screen here)."""

    def get_search_string(self, target_state: TargetState) -> str:
        text = target_state.text[: target_state.cursor_position]
        # Only slash commands trigger the menu — normal chat text hides it.
        # A lone "/" yields every command since all candidates start with "/".
        return text if text.startswith("/") else ""

    def should_show_dropdown(self, search_string: str) -> bool:
        if not search_string.startswith("/"):
            return False
        option_count = self.option_list.option_count
        if option_count == 0:
            return False
        if option_count == 1:
            only = self.option_list.get_option_at_index(0).prompt
            text = only.plain if hasattr(only, "plain") else only
            # Fully typed command (e.g. "/help") — nothing left to pick.
            if text == search_string:
                return False
        return True

    def _align_to_target(self) -> None:
        """Place the dropdown above the input, clamped inside the screen."""
        x, y = self.target.cursor_screen_offset
        dropdown = self.option_list
        width, height = dropdown.outer_size
        if height <= 0:
            height = min(max(dropdown.option_count + 2, 4), 22)
        # y - height puts the bottom edge one row above the input line.
        x, y, _w, _h = Region(x - 1, y - height, width, height).constrain(
            "inside",
            "none",
            Spacing.all(0),
            self.screen.scrollable_content_region,
        )
        self.absolute_offset = Offset(x, y)

    def apply_completion(self, value: str, state: TargetState) -> None:
        """Insert the command plus a trailing space, then hide the menu."""
        target = self.target
        with self.prevent(Input.Changed):
            target.value = ""
            target.insert_text_at_cursor(value + " ")
        new_state = self._get_target_state()
        self._rebuild_options(new_state, self.get_search_string(new_state))
        self.post_completion()


class InputBar(Widget):
    """Fixed bottom bar with text input and slash autocomplete."""

    def __init__(self, submit_callback=None):
        super().__init__(id="input-bar")
        self._submit_callback = submit_callback
        self._history = []
        self._history_index = -1

    def compose(self) -> ComposeResult:
        with Horizontal(id="input-row"):
            yield Static("[bold #3b82f6]>[/] ", id="input-prompt")
            input_widget = Input(placeholder="Message or /command...", id="input-field")
            yield SlashCommandAutoComplete(
                input_widget,
                SLASH_COMMANDS,
                prevent_default_enter=True,
                id="autocomplete",
            )
            yield input_widget
        yield Static(
            "[dim #1e3a5f][/] commands  [↑↓] history  [Esc] cancel  [Ctrl+P] palette  [Ctrl+M] model[/]",
            id="input-hints",
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
