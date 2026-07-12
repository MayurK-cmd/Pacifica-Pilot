"""
CLI entry point for PacificaPilot.

Usage:
    pacifica init          - First-run setup wizard
    pacifica start         - Launch TUI (Textual) with optional Loop Agent in background
    pacifica start --legacy - Fall back to the old prompt-toolkit REPL
"""

import sys


def main():
    """Entry point for the pacifica CLI."""
    if len(sys.argv) < 2:
        print("PacificaPilot CLI")
        print()
        print("Usage:")
        print("  pacifica init          - First-run setup wizard")
        print("  pacifica start         - Start trading TUI (Textual interface)")
        print("  pacifica start --legacy - Fall back to old REPL")
        print()
        print("For help: https://github.com/yourusername/pacificapilot")
        return

    command = sys.argv[1]

    if command == "init":
        from .setup import run_setup_wizard
        run_setup_wizard()
    elif command == "start":
        use_legacy = "--legacy" in sys.argv

        if use_legacy:
            from .ui.repl import start_repl
            start_repl()
            return

        # Launch the Textual TUI with visual overhaul
        try:
            from .ui.tui.app import PacificaPilotApp
            app = PacificaPilotApp()
            app.run()
        except Exception as e:
            print(f"TUI failed to start: {e}")
            print("Falling back to legacy REPL...")
            from .ui.repl import start_repl
            start_repl()
    else:
        print(f"Unknown command: {command}")
        print()
        print("Available commands:")
        print("  init    - First-run setup wizard")
        print("  start   - Start trading agent")
        sys.exit(1)


if __name__ == "__main__":
    main()
