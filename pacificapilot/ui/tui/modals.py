"""
Modal screens for PacificaPilot TUI — trade confirmation, provider switcher,
settings panel, API key management, mode switching.
"""

from __future__ import annotations

from textual.app import ComposeResult
from textual.screen import ModalScreen
from textual.widgets import Static, Input, Label, Button
from textual.containers import Vertical, Horizontal
from textual.binding import Binding
from rich.text import Text

from .state import get_state


class TradeConfirmModal(ModalScreen[bool]):
    """Trade confirmation modal — clear buttons, Tab to focus, Enter to activate."""

    def __init__(self, message: str, confirmation_data: dict):
        super().__init__()
        self._message = message
        self._data = confirmation_data

    def compose(self) -> ComposeResult:
        is_mainnet = self._data.get("mode", "testnet") == "mainnet"
        dry_run = self._data.get("dry_run", True)
        side = self._data.get("side", "?").upper()
        symbol = self._data.get("symbol", "?")
        size = self._data.get("usdc_size", 0)
        price = self._data.get("mark_price", 0)

        border_style = "red" if is_mainnet and not dry_run else "#00d4aa"
        title = "⚠  LIVE MAINNET ORDER" if is_mainnet and not dry_run else "⚠  TRADE CONFIRMATION"

        yield Static("", id="confirm-spacer-top")
        yield Static(
            f"[bold {border_style}]{title}[/]",
            id="confirm-title",
        )
        yield Static(
            f"\n"
            f"  [bold]Action:[/]   {side} {symbol}\n"
            f"  [bold]Size:[/]     ${size:.2f}\n"
            f"  [bold]Price:[/]    ${price:,.2f}\n"
            f"\n"
            f"  [bold]Mode:[/]     {'[red]MAINNET[/]' if is_mainnet else '[green]TESTNET[/]'}\n"
            f"  [bold]Dry Run:[/]  {'[green]ON[/]' if dry_run else '[red]OFF[/]'}\n",
            id="confirm-details",
        )
        with Horizontal(id="confirm-buttons"):
            yield Button("  ✅ Confirm  ", id="confirm-yes", variant="success")
            yield Button("  ❌ Cancel   ", id="confirm-no", variant="default")
        yield Static(
            "\n[dim]Tab between buttons · Enter to select · Esc to cancel[/]",
            id="confirm-hint",
        )

    def on_mount(self) -> None:
        """Focus the Cancel button by default — safety first."""
        self.query_one("#confirm-no", Button).focus()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "confirm-yes":
            self.dismiss(True)
        else:
            self.dismiss(False)

    def on_key(self, event) -> None:
        if event.key == "escape":
            self.dismiss(False)
        elif event.key in ("y", "Y"):
            self.dismiss(True)
        elif event.key in ("n", "N"):
            self.dismiss(False)


class ProviderSwitchModal(ModalScreen[str | None]):
    """Provider switcher — shows live provider list from PilotState."""

    def compose(self) -> ComposeResult:
        from ...storage.config import load_config
        cfg = load_config()
        current = cfg.get("chat_agent_provider", "openrouter")
        PROVIDERS = [
            ("anthropic",  "Claude Sonnet 4"),
            ("openai",     "GPT-4o"),
            ("google",     "Gemini 2.0 Flash"),
            ("openrouter", "OpenRouter"),
        ]
        lines = ["[bold]Switch AI Provider[/]\n"]
        for pid, pname in PROVIDERS:
            marker = "●" if pid == current else "○"
            lines.append(f"  {marker} {pname:20} [dim]({pid})[/]")
        lines.append("\n[dim]↑↓  Enter select  Esc close[/]")
        yield Static("\n".join(lines))
        self._providers = [p[0] for p in PROVIDERS]
        self._current = current
        self._selected_index = 0

    def on_key(self, event) -> None:
        if event.key == "up" and self._selected_index > 0:
            self._selected_index -= 1
        elif event.key == "down" and self._selected_index < len(self._providers) - 1:
            self._selected_index += 1
        elif event.key == "enter":
            self.dismiss(self._providers[self._selected_index])
        elif event.key == "escape":
            self.dismiss(None)


class SettingsModal(ModalScreen[dict | None]):
    """Settings panel — live toggles for Dry Run, Loop Agent, etc."""

    def compose(self) -> ComposeResult:
        from ...storage.config import load_config
        cfg = load_config()
        dry_run = cfg.get("dry_run", True)
        dry_m = "x" if dry_run else " "
        state = get_state().to_dict()
        loop_m = "x" if state.get("agent_running") else " "
        lines = [
            "[bold]Settings[/]\n",
            f"  [[{dry_m}]] Dry Run           [dim]Ctrl+D[/]\n",
            f"  [[{loop_m}]] Loop Agent        [dim]Ctrl+P[/]\n",
            "  [ ] Show tool output  [dim]Ctrl+O[/]\n",
            "  [x] Memory            [dim]Ctrl+E[/]\n",
            "  [ ] Verbose logs      [dim]Ctrl+V[/]\n",
            "\n[dim]Esc to close[/]",
        ]
        yield Static("".join(lines))

    def on_key(self, event) -> None:
        if event.key == "escape":
            self.dismiss(None)


class ApiKeyModal(ModalScreen[dict | None]):
    """In-TUI API key management — provider select + masked input."""

    def compose(self) -> ComposeResult:
        yield Static("[bold]Add / Update API Key[/]\n")
        yield Static("  [dim]Choose a provider and paste your key.[/]\n")
        yield Label("Provider (anthropic/openai/google/openrouter/supermemory):")
        yield Input(id="api-provider", placeholder="e.g. openrouter")
        yield Label("API Key:")
        yield Input(id="api-key", placeholder="sk-...", password=True)
        yield Static("\n[dim][Enter] save  [Esc] cancel[/]")
        self._provider_input = None
        self._key_input = None

    def on_mount(self) -> None:
        self.query_one("#api-provider", Input).focus()

    def on_key(self, event) -> None:
        if event.key == "escape":
            self.dismiss(None)
        elif event.key == "enter":
            prov = self.query_one("#api-provider", Input).value.strip()
            key = self.query_one("#api-key", Input).value.strip()
            if prov and key:
                self.dismiss({"provider": prov, "key": key})


class ModeSwitchModal(ModalScreen[str | None]):
    """In-TUI mode switching — testnet / mainnet with confirm."""

    def compose(self) -> ComposeResult:
        yield Static("[bold]Switch Mode[/]\n")
        yield Static("  [green]1. Testnet[/]  (recommended — free test funds)")
        yield Static("  [red]2. Mainnet[/]   (real funds — requires confirmation)")
        yield Static("\n[dim]Enter choice or Esc to cancel[/]")

    def on_key(self, event) -> None:
        if event.key == "1":
            self.dismiss("testnet")
        elif event.key == "2":
            self.dismiss("mainnet")
        elif event.key == "escape":
            self.dismiss(None)


class QuitConfirmModal(ModalScreen[bool]):
    """Confirm quit with Y/N."""

    def compose(self) -> ComposeResult:
        yield Static("[bold]Exit PacificaPilot?[/]\n")
        yield Static("  [dim][Y] Yes   [N] No[/]")

    def on_key(self, event) -> None:
        if event.key in ("y", "Y"):
            self.dismiss(True)
        elif event.key in ("n", "N", "escape"):
            self.dismiss(False)
