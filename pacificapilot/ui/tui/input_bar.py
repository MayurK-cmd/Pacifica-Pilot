"""
Input bar — fixed bottom input using textual-autocomplete.

Three rows:
  Row 1: [prompt]>  [Input widget]
  Row 2: provider · model status line
  Row 3: [/] commands  [↑↓] history  ...

Slash-command autocomplete via textual-autocomplete.
All colors via Rich markup — no hex in Python.
"""

from __future__ import annotations

from textual.app import ComposeResult
from textual.content import Content
from textual.geometry import Offset, Region, Spacing
from textual.widgets import Input, Static
from textual.widget import Widget
from textual.containers import Horizontal
from textual_autocomplete import AutoComplete, DropdownItem, TargetState

# Slash command definitions: (command, one-liner).
# Rows render as "command  description" — command first, like opencode.
COMMANDS: list[tuple[str, str]] = [
    ("/config",      "View or edit settings"),
    ("/apikey",      "Manage API keys"),
    ("/mode",        "Switch testnet / mainnet"),
    ("/status",      "Agent status + decisions"),
    ("/positions",   "Open positions + live PnL"),
    ("/account",     "Account balances"),
    ("/history",     "Recent trades"),
    ("/performance", "Win rate, Sharpe, drawdown"),
    ("/analytics",   "Monthly + per-symbol stats"),
    ("/backtest",    "Backtest a strategy"),
    ("/portfolio",   "Portfolio risk metrics"),
    ("/start",       "Start the Loop Agent"),
    ("/stop",        "Stop the Loop Agent"),
    ("/pause",       "Pause the loop"),
    ("/resume",      "Resume the loop"),
    ("/loop",        "Loop on / off"),
    ("/remote",      "Telegram remote mode"),
    ("/clear",       "Clear chat"),
    ("/help",        "All commands"),
    ("/exit",        "Quit"),
]


def _menu_item(cmd: str, desc: str) -> DropdownItem:
    """One dropdown row: bold command, dim one-liner after it."""
    return DropdownItem(
        Content.from_markup(f"[bold #fafafa]{cmd}[/]  [dim #a1a1aa]{desc}[/]")
    )


SLASH_COMMANDS = [_menu_item(cmd, desc) for cmd, desc in COMMANDS]


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
            # Fully typed command (e.g. "/help ") — nothing left to pick.
            # (Row text includes the description, so compare the command alone.)
            typed = search_string.strip()
            if any(cmd == typed for cmd, _ in COMMANDS):
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
        """Insert the command (first token — rows carry descriptions too),
        plus a trailing space, then hide the menu."""
        command = value.split()[0] if value.split() else value
        target = self.target
        with self.prevent(Input.Changed):
            target.value = ""
            target.insert_text_at_cursor(command + " ")
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
            yield Static("[bold #fafafa]>[/] ", id="input-prompt")
            input_widget = Input(placeholder="Message or /command...", id="input-field")
            yield SlashCommandAutoComplete(
                input_widget,
                SLASH_COMMANDS,
                prevent_default_enter=True,
                id="autocomplete",
            )
            yield input_widget
        yield Static("", id="input-model")
        yield Static(
            "[dim #3f3f46][/] commands  [↑↓] history  [Esc] cancel  [Ctrl+P] palette  [Ctrl+M] model[/]",
            id="input-hints",
        )
        self.call_later(self.refresh_model_line)

    def refresh_model_line(self) -> None:
        """Show `provider · model` under the input, like opencode's model row."""
        try:
            from ...storage.config import load_config

            cfg = load_config()
            provider = (cfg.get("chat_agent_provider") or "").strip()
            model = (cfg.get("chat_agent_model") or "").strip()
            if provider and model:
                text = f"[dim #a1a1aa]{provider} · {model}[/]"
            elif provider:
                text = f"[dim #a1a1aa]{provider} · model not set[/]"
            else:
                text = "[dim #a1a1aa]no provider configured — /apikey to add one[/]"
            self.query_one("#input-model", Static).update(text)
        except Exception:
            pass

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
