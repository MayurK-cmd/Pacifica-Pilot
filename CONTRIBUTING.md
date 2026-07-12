# Contributing to PacificaPilot

## Getting Started

1. Fork the repo
2. `pip install -e ".[dev,memory]"`
3. Create a branch: `git checkout -b feature/my-feature`

## Development

```bash
# Run tests
python -m pytest tests/unit

# Code style
ruff check pacificapilot/
```

## Project Structure

```
pacificapilot/
├── agents/       # Chat Agent + Loop Agent
├── core/         # Trading, market data, risk
├── providers/    # AI adapters (Anthropic, OpenAI, Google, OpenRouter)
├── memory/       # Supermemory wrapper (PilotMemory)
├── ui/           # Textual TUI + legacy REPL
├── storage/      # Config JSON + secrets
```

## Pull Request Checklist

- [ ] Tests pass (`python -m pytest tests/unit`)
- [ ] New features include tests
- [ ] No `print()` or `input()` in agent code (use hooks for TUI)
- [ ] `SUPERMEMORY_API_KEY` is optional — memory failure never blocks trading

## Adding a New Tool

1. Add tool schema to `TRADING_TOOLS` in `agents/tools.py`
2. Add `elif tool_name == "your_tool":` handler in `execute_tool()`
3. Add tests in `tests/unit/`

## Code of Conduct

All contributors must follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT — see [LICENSE](LICENSE).
