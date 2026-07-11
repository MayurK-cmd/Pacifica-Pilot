# PacificaPilot 🤖⚡

**The AI trading agent that actually learns from every trade.**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-green.svg)](https://python.org)
[![Status](https://img.shields.io/badge/status-active--development-brightgreen.svg)]()

PacificaPilot is an **autonomous AI trading agent** for [Pacifica Perpetual Futures](https://pacifica.fi). It runs entirely on your machine, combines multi-provider AI reasoning with live technical analysis (RSI, MACD, Bollinger Bands), social sentiment, and **persistent memory via Supermemory** — so your agent actually remembers every trade, every preference, and every market pattern across sessions.

**No cloud dependency. No data leaving your machine. Your keys, your agent, your trades.**

---

## 🚀 Quick Start

```bash
# Install
pip install pacificapilot

# Setup once (keys, config, optional memory)
pacifica init

# Launch the TUI
pacifica start

# Inside the REPL, control the agent:
# Type natural language or /commands
```

### Natural Language Demo

```
You:  "how are BTC markets right now should I go long or short?"

Agent:
  📊 BTC — $63,996
  Regime: Weak uptrend (MACD bullish, histogram stable)
  RSI 5m: 35 (leaning oversold) | RSI 1h: 51 (neutral)
  Bollinger: Upper half, bandwidth 4.2%
  Funding: 0.000013 (neutral)
  Volume: 1.8x average (high — confirms the move)
  → **NEUTRAL with slight bullish bias.** Room to move up but no clear entry yet.
```

---

## ✨ Why PacificaPilot?

| Problem | Solution |
|---|---|
| Trading agents start from zero every session | **Supermemory** remembers every trade, pattern, and preference |
| AI hallucinates past trades | Memory layer gives the AI real data to answer from |
| You have to re-state preferences constantly | "never trade SOL" — said once, remembered forever |
| CLI tools feel like debug sessions | **Textual TUI** — proper 3-panel layout, autocomplete, live sidebar |
| One AI provider locks you in | **BYOK** — Anthropic, OpenAI, Google, OpenRouter — swap anytime |
| Trading agents are opaque black boxes | **Agentic tool loop** — the AI shows its reasoning, calls tools, gathers data before answering |

### Key Features

- 🧠 **Persistent Memory** — Supermemory integration. Every trade decision, market pattern, user preference, and daily summary is stored and searchable across sessions
- 💬 **Agentic Chat** — Claude Code-style multi-turn tool loop. The AI gathers data, calls multiple tools, reasons step-by-step, then responds
- 🤖 **Autonomous Loop Agent** — 24/7 market monitoring with AI-driven trading decisions
- 🔄 **9 Trading Tools** — place orders, close positions, check balances, market analysis, performance metrics, regime detection
- 🔐 **Non-Custodial & BYOK** — Your keys, your AI providers, your machine. Nothing leaves
- 🎮 **Textual TUI** — Fixed 3-panel layout with slash autocomplete, live status sidebar, trade confirmation modals
- 📊 **Technical Analysis** — Live RSI 5m/1h, MACD trend, Bollinger Bands, funding rates, volume signals, market regime detection
- 📱 **Telegram Bot** (optional) — Trade and monitor from your phone
- 🔌 **Multi-Provider AI** — Anthropic, OpenAI, Google Gemini, OpenRouter — use any, swap anytime

---

## Who Is This For?

| Audience | Why |
|---|---|
| **Crypto Traders** | Automate your Pacifica perpetual futures strategies with AI that learns from your trading style |
| **AI/ML Enthusiasts** | See how LLM tool-calling works in a real financial application with persistent memory |
| **Hackathon Judges** | End-to-end local AI agent with live market data, tool execution, and cross-session memory — zero cloud dependencies |
| **Privacy-Conscious Users** | Fully local mode with Supermemory running on localhost — zero data leaves your machine |
| **Developers** | Clean Python architecture, BYOK model, easy to extend with new tools or AI providers |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   YOUR MACHINE                          │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │  Chat Agent  │    │  Loop Agent  │                   │
│  │ (tool loop)  │    │ (autonomous) │                   │
│  └──────┬───────┘    └──────┬───────┘                   │
│         │                   │                            │
│         └──────┬────────────┘                            │
│                │                                         │
│        ┌───────▼────────┐                                │
│        │  Trading Core  │                                │
│        └───────┬────────┘                                │
│                │                                         │
│  ┌─────────────▼─────────────┐  ┌──────────────────────┐ │
│  │  Supermemory (persistent  │  │  Config & Secrets    │ │
│  │  memory across sessions)  │  │  ~/.pacificapilot/   │ │
│  └───────────────────────────┘  └──────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Textual TUI (3-panel layout)                    │   │
│  │  Header | Chat Panel + Sidebar | Input Bar      │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ Pacifica API│
                    │ (REST)      │
                    └─────────────┘
```

---

## 🧠 The Supermemory Advantage

**The problem:** Every trading agent starts from zero every session. Open the CLI, and the AI has no idea what it traded yesterday, what patterns it noticed, or what you told it. This causes hallucination ("yes, I remember that trade that never happened"), repetitive questions, and zero learning over time.

**The solution:** PacificaPilot integrates [Supermemory](https://supermemory.ai) — a persistent, searchable memory layer that survives restarts.

| Container | What's stored | Written by | Read by |
|---|---|---|---|
| `decisions` | Every LONG/SHORT/HOLD with confidence, reasoning, and signals | Loop Agent | Chat Agent |
| `patterns` | Funding spikes, RSI extremes, basis divergences | Loop Agent | Both agents |
| `preferences` | User config changes and stated preferences | Chat Agent | Chat Agent |
| `performance` | Daily summaries with win rate, best/worst symbols | Loop Agent | Chat Agent |

**How it's used:**
- **Session start** — Your full memory profile is injected into the AI's system prompt via `--- MEMORY CONTEXT ---`
- **History questions** — "what did I trade last week?" triggers semantic recall from memory
- **Preferences** — "never trade SOL" or "always confirm over $200" — said once, remembered forever

**Two deployment modes:**
- **Cloud** — Hosted by Supermemory, no local process needed (default)
- **Local** — Supermemory runs on `localhost:6767`, zero data leaves your machine

---

## 🛠 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Language** | Python 3.11+ | Universal, library-rich, perfect for AI/ML |
| **CLI Framework** | Textual | Proper TUI with 3-panel layout, autocomplete, reactive widgets |
| **AI Providers** | Anthropic, OpenAI, Google, OpenRouter | BYOK — bring your own key, swap anytime |
| **Memory** | Supermemory SDK | Persistent, searchable, cross-session memory |
| **Market Data** | Pacifica API + Binance fallback | Live prices, RSI, MACD, Bollinger, volume |
| **Sentiment** | Elfa AI | Social sentiment signals for trading decisions |
| **Blockchain** | Solana (solders + base58) | On-chain trade execution and memo logging |
| **Storage** | JSON + SQLite | Config, secrets, trade history, decisions |
| **Trading** | Pacifica Perpetual Futures | Non-custodial on-chain perps |

### Why This Stack?

- **BYOK AI** — No vendor lock-in. Use Claude for reasoning, GPT for speed, Gemini for free tier
- **Supermemory** — First trading agent to integrate persistent memory — this is the hackathon differentiator
- **Textual** — Rich interactive TUI without web dependencies. Works in any terminal
- **Local-first** — Everything runs on your machine. Pacifica API calls go direct, no middleman

---

## 🎮 9 Tools at Your Command

| Tool | What it does |
|---|---|
| `place_order` | Open LONG/SHORT positions (with confirmation) |
| `close_position` | Close a specific position |
| `close_all_positions` | Flatten the entire book (batch confirmation) |
| `get_positions` | View open positions with unrealized PnL |
| `get_account_balance` | Check USDC balance, equity, available capital |
| `get_market_price` | Full snapshot: price, RSI, MACD, Bollinger, volume, funding, regime |
| `get_trade_history` | Past trades with PnL, duration, entry/exit |
| `get_performance_metrics` | Win rate, Sharpe, profit factor, drawdown |
| `get_market_regime` | Detect trending/ranging/volatile with trading guidance |

---

## 💬 Agents

### Loop Agent (Autonomous)
Runs on a configurable timer, fetches live market data, and makes AI-driven trading decisions — no human intervention needed. Writes every decision, pattern, and outcome to Supermemory automatically.

### Chat Agent (Agentic Tool Loop)
A Claude Code-style multi-turn reasoning loop. The AI:
1. Receives your question
2. Decides what tools to call (market data, positions, balance, etc.)
3. Executes them, feeds results back to itself
4. Can chain multiple tools, gather context, then respond
5. Returns a clear, data-backed answer

---

## 🔐 Security Model

- **Non-custodial**: Keys on your machine, nowhere else
- **BYOK**: Your AI keys go directly to your provider
- **Confirmation prompts**: Every trade action requires explicit yes/no
- **Dry run mode**: All trades simulated by default
- **Testnet first**: New setups start on testnet with no real money
- **Restricted perms**: Secrets file at `~/.pacificapilot/secrets.env` with `chmod 600`
- **Memory optional**: Supermemory is additive — trading works without it

---

## 📦 Installation & Setup

```bash
# Via pipx (recommended — isolated)
pipx install pacificapilot

# Or pip
pip install pacificapilot

# For development
git clone https://github.com/yourusername/pacificapilot.git
cd pacificapilot
pip install -e ".[dev,telegram,memory]"

# First-run setup
pacifica init
# → Pacifica keys → AI provider → Trading config → Supermemory (optional)
```

---

## 📊 Supported Markets

Pacifica offers perpetual futures on a wide range of assets including BTC, ETH, SOL, WIF, BONK, DOGE, PEPE, and many more through the [Pacifica API](https://docs.pacifica.fi).

---

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.

**Disclaimer:** PacificaPilot is experimental software for educational and research purposes. Trading perpetual futures carries significant risk of loss. AI decisions are not financial advice. Past performance does not guarantee future results. You are responsible for all trades executed by the agent. Start with testnet and small positions. Never risk more than you can afford to lose.

---

Built for the [Supermemory](https://supermemory.ai) hackathon (July 2025) and the [Pacifica](https://pacifica.fi) ecosystem.
