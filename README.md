# PacificaPilot 🤖⚡

**AI trading agent for Pacifica Perpetual Futures — with persistent memory, multi-provider AI, and natural language trading.**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-green.svg)](https://python.org)
[![Status](https://img.shields.io/badge/status-active--development-brightgreen.svg)]()

[![YouTube](https://img.shields.io/badge/Watch-Demo-red?logo=youtube)](https://youtu.be/XSp-tUbp6i8)

```bash
pip install pacificapilot
pacifica init
pacifica start
```

## Features

- **Persistent memory** — Every trade, pattern, and preference stored in Supermemory across sessions (local or cloud)
- **Agentic chat** — Multi-turn tool loop: gathers data, reasons, then responds
- **Autonomous loop agent** — 24/7 AI-driven market monitoring
- **9 trading tools** — place/close orders, market analysis, performance metrics, regime detection
- **Live technical analysis** — RSI, MACD, Bollinger Bands, funding, volume, market regime
- **Multi-provider AI** — Anthropic, OpenAI, Google Gemini, OpenRouter (BYOK)
- **Textual TUI** — 3-panel layout with slash autocomplete, live sidebar, keyboard shortcuts
- **Non-custodial** — Your keys, your machine. Nothing leaves.
- **Dual-mode memory** — Local (`localhost:6767`) or cloud (Supermemory API)

## Quick Start

```bash
# Install
pip install pacificapilot

# Setup wizard
pacifica init
# → Pacifica keys → AI provider → Trading config → Supermemory → Telegram

# Launch TUI
pacifica start
```

Inside the TUI:
- Type `/help` for commands, or just chat naturally
- `/start` boots the Loop Agent, `/stop` stops it
- `/config` to view/edit settings
- `/apikey supermemory <key> [local|cloud]`

### Keyboard shortcuts

```
Ctrl+P — Command palette    Ctrl+M — Switch AI provider
Ctrl+S — Settings toggles   Ctrl+L — Clear chat
Ctrl+R — Refresh sidebar     Ctrl+D — Toggle dry run
Ctrl+K — API key management  Ctrl+T — Mode switch
Ctrl+Q — Quit
```

### Example

```
You:  how are BTC markets right now?
Agent: BTC — $63,996
  Regime: Weak uptrend (MACD bullish)
  RSI 5m: 35 (leaning oversold) | RSI 1h: 51 (neutral)
  Bollinger: Upper half, bandwidth 4.2%
  → NEUTRAL with slight bullish bias. No clear entry.
```

## Architecture

```
Chat Agent (tool loop) ←→ Trading Core ←→ Pacifica API
     ↕                       ↕
Loop Agent (autonomous)   Supermemory
     ↕
Textual TUI (3-panel)
```

## Tools

`place_order` · `close_position` · `close_all_positions` · `get_positions` · `get_account_balance` · `get_market_price` (enriched) · `get_trade_history` · `get_performance_metrics` · `get_market_regime`

## Supermemory

Every AI decision, market pattern, user preference, and daily summary is stored in Supermemory — a persistent, searchable memory layer that survives restarts.

```
decisions    → "LONG BTC, confidence 75%, RSI 35"
patterns     → "Funding spike on ETH: 0.003"
preferences  → "Never trade BONK" — said once, remembered forever
performance  → "Daily: 3 trades, +$12.50, 67% win rate"
```

**Two modes:**

- **Cloud** — `https://app.supermemory.ai` (default, cross-platform)
- **Local** — `npx supermemory local` (offline, zero data leaves your machine)

> **Windows users:** Supermemory's local server only works on Linux and macOS.  
> To use local mode on Windows, install [WSL](https://learn.microsoft.com/en-us/windows/wsl/install), then inside WSL run:
> ```bash
> npx supermemory local
> ```
> Copy the API key printed in the terminal and paste it back in the setup wizard.

## Security

- **Non-custodial** — Keys stored in `~/.pacificapilot/secrets.env` (chmod 600)
- **BYOK** — Your AI keys go directly to your provider
- **Confirmation prompts** — Every trade requires explicit yes/no
- **Testnet first** — Dry run by default, mainnet with confirmation

## Links

- [GitHub](https://github.com/MayurK-cmd/Pacifica-Pilot)
- [Issues](https://github.com/MayurK-cmd/Pacifica-Pilot/issues)
- [License](LICENSE) — MIT
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Contributing](CONTRIBUTING.md)

**Disclaimer:** PacificaPilot is experimental software for educational purposes. Trading perpetual futures carries significant risk. AI decisions are not financial advice. Start with testnet.
