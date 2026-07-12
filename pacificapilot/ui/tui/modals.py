"""
Modal screens — trade confirmation, provider switch, settings, API key, mode switch, quit.

All widget-level styling (borders, backgrounds, padding) via pacificapilot.tcss.
Text-level colors in Rich markup reference the TCSS variable hex values.
No inline CSS in Python code.
"""

from __future__ import annotations

from textual.app import ComposeResult
from textual.screen import ModalScreen
from textual.widgets import Static, Input, Label, Button
from textual.containers import Vertical, Horizontal

from .state import get_state


# ── Colours (mirror pacificapilot.tcss variables for Rich markup use) ──
# These are used ONLY for inline Rich markup in Static widget content.
# All widget borders/backgrounds are controlled by pacificapilot.tcss classes.
_TACCENT = "#3b82f6"
_TMUTED = "#475569"
_TERROR = "#ef4444"
_TSUCCESS = "#22c55e"
_TWARN = "#f59e0b"
_TBG = "#000000"


class TradeConfirmModal(ModalScreen[bool]):
    """Trade confirmation — Y/N keys, static content.

    Default focus: Cancel (N), user must actively confirm (Y).
    Mainnet live mode shows red border and requires typing "CONFIRM".
    """

    def __init__(self, message: str, confirmation_data: dict):
        super().__init__()
        self._data = confirmation_data

    def compose(self) -> ComposeResult:
        is_mainnet = self._data.get("mode", "testnet") == "mainnet"
        dry_run = self._data.get("dry_run", True)
        side = self._data.get("side", "?").upper()
        symbol = self._data.get("symbol", "?")
        size = self._data.get("usdc_size", 0)
        price = self._data.get("mark_price", 0)

        live_mainnet = is_mainnet and not dry_run

        box_id = "trade-confirm-box-mainnet" if live_mainnet else "trade-confirm-box"
        with Vertical(id=box_id):
            if live_mainnet:
                title = f"[bold {_TERROR}]⚠  LIVE MAINNET ORDER — REAL FUNDS AT RISK[/]"
            else:
                title = f"[bold {_TACCENT}]⚠  TRADE CONFIRMATION[/]"

            detail = ""
            detail += f"\n  [dim {_TMUTED}]Action:[/]       {side} {symbol}-PERP\n"
            detail += f"  [dim {_TMUTED}]Size:[/]         $ {size:.2f} USDC\n"
            detail += f"  [dim {_TMUTED}]Price:[/]        ~$ {price:,.2f}\n"
            detail += f"  [dim {_TMUTED}]Mode:[/]         {'MAINNET' if is_mainnet else 'TESTNET'}  |  Dry Run: {'ON' if dry_run else 'OFF'}"

            yield Static(title)
            yield Static(detail)

            if live_mainnet:
                yield Static(f"\n[{_TSUCCESS} bold]Type CONFIRM to proceed[/]  [{_TMUTED}]Esc to cancel[/]")
                yield Label(f"[dim {_TMUTED}]Type CONFIRM to confirm this mainnet order:[/]")
                yield Input(id="confirm-input", placeholder='Type "CONFIRM" to proceed')
            else:
                yield Static(f"\n[{_TSUCCESS} bold][Y] Confirm[/]  [{_TMUTED}][N] Cancel  [Esc] Cancel[/]")

    def on_mount(self) -> None:
        live_mainnet = self._data.get("mode", "testnet") == "mainnet" and not self._data.get("dry_run", True)
        if live_mainnet:
            self.query_one("#confirm-input", Input).focus()

    def on_key(self, event) -> None:
        live_mainnet = self._data.get("mode", "testnet") == "mainnet" and not self._data.get("dry_run", True)

        if live_mainnet:
            if event.key == "escape":
                self.dismiss(False)
            elif event.key == "enter":
                inp = self.query_one("#confirm-input", Input).value.strip()
                if inp == "CONFIRM":
                    self.dismiss(True)
        else:
            if event.key in ("y", "Y"):
                self.dismiss(True)
            elif event.key in ("n", "N", "escape"):
                self.dismiss(False)


class ProviderSwitchModal(ModalScreen[str | None]):
    """Provider list — press 1-4 to select or click/highlight.

    Current provider highlighted with $highlight-bg equivalent.
    """

    def compose(self) -> ComposeResult:
        from ...storage.config import load_config
        cfg = load_config()
        current = cfg.get("chat_agent_provider", "openrouter")
        self._providers = ["anthropic", "openai", "google", "openrouter"]
        names = ["Anthropic (Claude)", "OpenAI (GPT-4o)", "Google (Gemini)", "OpenRouter"]

        lines = [f"[bold {_TACCENT}]Switch AI Provider[/]\n"]
        for i, (pid, n) in enumerate(zip(self._providers, names)):
            if pid == current:
                lines.append(f"  {i+1}. [{_TACCENT} bold]●[/] [{_TACCENT} bold]{n}[/]")
            else:
                lines.append(f"  {i+1}. ○ [dim {_TMUTED}]{n}[/]")
        lines.append(f"\n[dim {_TMUTED}]Press 1-4 · Esc to close[/]")
        yield Static("\n".join(lines))

    def on_key(self, event) -> None:
        if event.key in ("1", "2", "3", "4"):
            self.dismiss(self._providers[int(event.key) - 1])
        elif event.key == "escape":
            self.dismiss(None)


class SettingsModal(ModalScreen[dict | None]):
    """Settings — keyboard-navigable toggle list. Esc to close."""

    def compose(self) -> ComposeResult:
        from ...storage.config import load_config
        cfg = load_config()
        dry = "x" if cfg.get("dry_run", True) else " "
        state = get_state().to_dict()
        loop_marker = "x" if state.get("agent_running") else " "
        mem_marker = "x" if state.get("memory_enabled", False) else " "

        toggle_on = f"[{_TSUCCESS} bold]"
        toggle_off = f"[{_TMUTED}]"

        lines = [f"[bold {_TACCENT}]Settings[/]\n"]
        lines.append(f"[dim {_TMUTED}]──────────────────────────────────────[/]")
        lines.append(f"  [{'x' if dry == 'x' else ' '}] {'[#22c55e bold]Dry Run' if dry == 'x' else '[dim]Dry Run'}[/]  [dim {_TMUTED}]Ctrl+D[/]")
        lines.append(f"  [{'x' if loop_marker == 'x' else ' '}] {'[#22c55e bold]Loop Agent' if loop_marker == 'x' else '[dim]Loop Agent'}[/]  [dim {_TMUTED}]Ctrl+P[/]")
        lines.append(f"  [ ] {'[dim]Show tool output'}[/]  [dim {_TMUTED}]Ctrl+O[/]")
        lines.append(f"  [{'x' if mem_marker == 'x' else ' '}] {'[#22c55e bold]Memory' if mem_marker == 'x' else '[dim]Memory'}[/]  [dim {_TMUTED}]Ctrl+E[/]")
        lines.append(f"  [ ] {'[dim]Verbose logs'}[/]  [dim {_TMUTED}]Ctrl+V[/]")
        lines.append(f"[dim {_TMUTED}]──────────────────────────────────────[/]")
        lines.append(f"[dim {_TMUTED}]Space to toggle · Esc to close[/]")

        yield Static("\n".join(lines))

    def on_key(self, event) -> None:
        if event.key == "escape":
            self.dismiss(None)
        elif event.key == " ":
            # Space toggles focused item — for now just dismiss
            pass


class ApiKeyModal(ModalScreen[dict | None]):
    """In-TUI API key management with text inputs."""

    def compose(self) -> ComposeResult:
        yield Static(f"[bold {_TACCENT}]Add / Update API Key[/]\n")
        yield Static(f"  [dim {_TMUTED}]Choose a provider and paste your key.[/]")
        yield Label(f"[dim {_TMUTED}]Provider (anthropic/openai/google/openrouter/supermemory):[/]")
        yield Input(id="api-provider", placeholder="e.g. openrouter")
        yield Label(f"[dim {_TMUTED}]API Key:[/]")
        yield Input(id="api-key", placeholder="sk-...", password=True)
        yield Static(f"[dim {_TMUTED}][Enter] save  [Esc] cancel[/]")

    def on_mount(self) -> None:
        self.query_one("#api-provider", Input).focus()

    def on_key(self, event) -> None:
        if event.key == "escape":
            self.dismiss(None)
        elif event.key == "enter":
            p = self.query_one("#api-provider", Input).value.strip()
            k = self.query_one("#api-key", Input).value.strip()
            if p and k:
                self.dismiss({"provider": p, "key": k})


class ModeSwitchModal(ModalScreen[str | None]):
    """Mode switcher — 1/2 keys."""

    def compose(self) -> ComposeResult:
        yield Static(
            f"[bold {_TACCENT}]Switch Mode[/]\n"
            f"  [{_TSUCCESS}]1. Testnet[/]  [dim {_TMUTED}]Recommended — free test funds[/]\n"
            f"  [{_TERROR}]2. Mainnet[/]   [dim {_TMUTED}]Real funds — requires confirmation[/]\n"
            f"\n[dim {_TMUTED}]Press 1 or 2 · Esc to close[/]"
        )

    def on_key(self, event) -> None:
        if event.key == "1":
            self.dismiss("testnet")
        elif event.key == "2":
            self.dismiss("mainnet")
        elif event.key == "escape":
            self.dismiss(None)


class QuitConfirmModal(ModalScreen[bool]):
    """Quit confirmation — Yes/No buttons with arrow-key navigation."""

    def compose(self) -> ComposeResult:
        with Vertical(id="trade-confirm-box"):
            yield Static(f"[bold {_TACCENT}]Exit PacificaPilot?[/]")
            yield Static("")  # spacer
            with Horizontal(classes="quit-buttons"):
                yield Button("Yes", id="quit-yes", variant="primary", classes="quit-btn")
                yield Button("No", id="quit-no", variant="default", classes="quit-btn")

    def on_mount(self) -> None:
        # Focus "No" first (safety — always default to not quitting)
        self.query_one("#quit-no", Button).focus()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "quit-yes":
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
        elif event.key in ("left", "right"):
            # Cycle focus between buttons
            buttons = self.query(".quit-btn")
            current = self.focused
            idx = 0
            for i, b in enumerate(buttons):
                if b.id == current.id:
                    idx = i
                    break
            if event.key == "right":
                next_idx = (idx + 1) % len(buttons)
            else:
                next_idx = (idx - 1) % len(buttons)
            buttons[next_idx].focus()
