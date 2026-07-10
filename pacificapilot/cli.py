"""
CLI entry point for PacificaPilot.

Usage:
    pacifica init    - First-run setup wizard
    pacifica start   - Launch Chat Agent + Loop Agent (interactive UI with background trading)
"""

import sys


def main():
    """Entry point for the pacifica CLI."""
    if len(sys.argv) < 2:
        # Default: show usage
        print("PacificaPilot CLI")
        print()
        print("Usage:")
        print("  pacifica init    - First-run setup wizard")
        print("  pacifica start   - Start trading agent (interactive UI + background Loop Agent)")
        print()
        print("For help: https://github.com/yourusername/pacificapilot")
        return

    command = sys.argv[1]

    if command == "init":
        from .setup import run_setup_wizard
        run_setup_wizard()
    elif command == "start":
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
