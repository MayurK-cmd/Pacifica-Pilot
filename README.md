# PacificaPilot 🤖⚡

**Terminal-native AI trading agent for Pacifica Perpetual Futures — with persistent memory, multi-provider AI, and natural language trading.**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-green.svg)](https://python.org)
[![Status](https://img.shields.io/badge/status-active--development-brightgreen.svg)]()

PacificaPilot is an **autonomous AI trading agent** that runs entirely on your machine. It combines on-chain perpetual futures trading with multi-provider AI reasoning, technical analysis (RSI, MACD, Bollinger Bands), social sentiment, and **persistent memory via Supermemory** — so your agent actually learns from every trade and remembers your preferences across sessions.

---

## 🚀 Quick Demo

```bash
# Install
pip install pacificapilot

# Setup once
pacifica init

# Launch
pacifica start
```

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

## ✨ Features

### 🧠 Autonomous Loop Agent
Runs on a configurable timer, fetches live market data, and makes AI-driven trading decisions — all without human intervention.

- **Market analysis** — Real-time RSI 5m/1h, MACD trend, Bollinger Bands, volume, funding rates, basis spreads
- **AI decision engine** — Supports Anthropic, OpenAI, Google Gemini, and OpenRouter
- **Risk management** — Position sizing, stop-loss, take-profit, Kelly Criterion, trailing stops
- **Social sentiment** — Elfa AI integration for crowd sentiment signals
- **On-chain memos** — Every decision logged on Solana

### 💬 Chat Agent (Agentic Tool Loop)
Natural language interface with true **tool-calling capability** — the AI can chain multiple tools, gather data, and reason before responding, just like Claude Code.

| What you say | What happens |
|---|---|
| "open a $50 long on WIF" | Places order with confirmation prompt |
| "close all my positions" | Batch closes every open position |
| "how are BTC markets?" | Fetches full snapshot (price, RSI, MACD, Bollinger, volume, regime) |
| "what's my performance?" | Returns win rate, Sharpe, PnL, best/worst symbol |
| "never trade BONK" | Saves preference to persistent memory |
| "what did I trade last week?" | Recalls from Supermemory |

**9 tools available:**
`place_order` · `close_position` · `close_all_positions` · `get_positions` · `get_account_balance` · `get_market_price` (enriched) · `get_trade_history` · `get_performance_metrics` · `get_market_regime`

### 🧠 Persistent Memory (Supermemory)
Every trade decision, market observation, and user preference is stored in a searchable memory layer that survives restarts.

- **Decisions** — Every LONG/SHORT/HOLD with confidence, reasoning, and signals
- **Patterns** — Funding spikes, RSI extremes, basis divergences automatically detected
- **Preferences** — "never trade SOL", "max position $200" — remembered forever
- **Performance** — Daily summaries, win rates, best/worst symbols
- **Cross-session** — Exit the CLI, come back tomorrow, the agent remembers everything

### 🔐 Security
- **Non-custodial** — Your keys never leave your machine
- **BYOK (Bring Your Own Key)** — Use your own AI provider keys
- **Confirmation prompts** — Every trade requires explicit yes/no
- **Dry run mode** — Paper trade by default, flip to live when ready
- **Testnet first** — All new setups start on Pacifica testnet

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   YOUR MACHINE (all local)              │
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
│        │ (shared logic) │                                │
│        └───────┬────────┘                                │
│                │                                         │
│  ┌─────────────▼─────────────┐  ┌──────────────────────┐ │
│  │  Supermemory (persistent  │  │  Config & Secrets    │ │
│  │  memory across sessions)  │  │  ~/.pacificapilot/   │ │
│  └───────────────────────────┘  └──────────────────────┘ │
└──────────────────────────┬──────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ Pacifica API│
                    │ (REST)      │
                    └─────────────┘
```

### Project Structure

```
pacificapilot/
├── agents/           # Chat Agent (tool-calling loop) + Loop Agent (autonomous)
├── core/             # Trading execution, market data, risk, analytics
├── providers/        # AI provider adapters (Anthropic, OpenAI, Gemini, OpenRouter)
├── memory/           # Supermemory wrapper for persistent cross-session memory
├── storage/          # Config JSON, secrets, SQLite trade history
├── telegram/         # Optional Telegram bot integration
├── memo/             # On-chain decision logging (Solana)
├── ui/               # Rich REPL with autocomplete + command system
├── sentiment.py      # Elfa AI social sentiment integration
├── orchestrator.py   # Multi-agent coordinator
├── cli.py            # CLI entry point
└── setup.py          # First-run wizard
```

---

## 🛠 Installation

```bash
# Via pipx (recommended — isolated environment)
pipx install pacificapilot

# Or pip
pip install pacificapilot

# For development
git clone https://github.com/yourusername/pacificapilot.git
cd pacificapilot
pip install -e ".[dev,telegram,memory]"
```

### First-Run Setup

```bash
pacifica init
```

The wizard collects:
1. Pacifica public/private keys (Solana keypair)
2. AI provider choice and API key
3. Trading parameters (symbols, position limits, confidence threshold)
4. Optional: Supermemory API key for persistent memory

---

## 🎮 Usage

### Start the REPL

```bash
pacifica start
```

This opens the interactive terminal — the Loop Agent does **not** auto-start. You control it with `/start` and `/stop`.

### Commands

| Command | What it does |
|---|---|
| `/start` | Boot the autonomous Loop Agent in background |
| `/stop` | Stop the Loop Agent |
| `/pause` | Soft-pause the loop (process stays alive) |
| `/resume` | Un-pause the loop |
| `/config` | View/edit trading parameters |
| `/apikey` | Manage AI provider and Supermemory keys |
| `/mode` | Switch testnet / mainnet |
| `/status` | Account equity, positions, agent status |
| `/positions` | List open perpetual positions |
| `/history` | Recent trades and decisions |
| `/performance` | Sharpe, drawdown, win rate metrics |
| `/analytics` | Monthly returns, per-symbol breakdown |
| `/backtest` | Run backtest on historical data |
| `/portfolio` | Portfolio risk metrics + correlation |
| `/account` | Account stats from Pacifica |
| `/remote` | Telegram remote mode |
| `/help` | Show all commands |

### Natural Language Trading

```
You: open a $50 long on WIF
You: what's my balance?
You: close my ETH position
You: how are the markets for BTC?
You: what was my best trade ever?
You: I never want to trade BONK
```

---

## 🔌 AI Providers

| Provider | Models | Best For |
|----------|--------|----------|
| **OpenRouter** | All models via one API | Recommended default |
| **Anthropic** | Claude 3.5/4 Sonnet, Haiku, Opus | Best reasoning & tool use |
| **OpenAI** | GPT-4o, GPT-4o-mini | Fast, cost-effective |
| **Google Gemini** | Gemini 2.0 Flash, 1.5 Pro | Free tier available |

Configure with `/apikey <provider> <key>`.

---

## 🧠 Supermemory Integration

PacificaPilot is one of the first trading agents to integrate [Supermemory](https://app.supermemory.ai) for persistent, searchable memory across sessions.

**What gets remembered:**
- Every trade decision (direction, confidence, reasoning, signals)
- Every position close (PnL, entry/exit, duration, win/loss)
- Market patterns (funding spikes, RSI extremes, basis divergences)
- User preferences and config changes
- Daily performance summaries
- Provider errors and fallback activations

**How it's used:**
- **Session start** — Your full profile is injected into the AI's system prompt
- **Natural questions** — "what did I trade last week?" triggers semantic recall
- **Preferences** — "never trade SOL" is remembered forever

Get a free key at [app.supermemory.ai](https://app.supermemory.ai) and run:
```
/apikey supermemory sm_your_key_here
```

---

## 📊 Supported Markets

Pacifica offers perpetual futures on a wide range of assets:

**Major:** BTC, ETH, SOL
**Alt:** WIF, BONK, DOGE, PEPE, and many more

All available through the [Pacifica API](https://docs.pacifica.fi).

---

## ⚙️ Configuration

All stored in `~/.pacificapilot/`:

| File | What it stores |
|---|---|
| `config.json` | Trading parameters, AI models, risk settings |
| `secrets.env` | API keys and private keys (chmod 600) |
| `trades.json` | Trade history |
| `decisions.json` | AI decision log |
| `positions.json` | Current position state |

### Key Settings

| Setting | Default | Description |
|---|---|---|
| `symbols` | `["BTC", "ETH"]` | Markets to trade |
| `max_position_usdc` | `100.0` | Max USDC per position |
| `min_confidence` | `0.6` | Min AI confidence to trade |
| `stop_loss_pct` | `5.0` | Stop loss |
| `take_profit_pct` | `10.0` | Take profit |
| `risk_profile` | `balanced` | conservative / balanced / aggressive |
| `dry_run` | `True` | Paper trading by default |
| `use_kelly_criterion` | `False` | Kelly position sizing |

---

## 🔧 Development

```bash
# Setup
git clone https://github.com/yourusername/pacificapilot.git
cd pacificapilot
pip install -e ".[dev,telegram,memory]"

# Run tests
python -m pytest tests/unit

# Run full test suite
python -m pytest tests/
```

---

## ☁️ Supermemory

**What it is:** A memory engine that persists trading knowledge across sessions. Every trade decision, market pattern, user preference, and performance summary is stored and searchable.

**Why it matters:** The agent learns over time — it doesn't start from zero every session. It remembers your preferences, past trades, and market observations.

**How to use it:**
1. Get a free key at [app.supermemory.ai](https://app.supermemory.ai)
2. Run `pacifica init` and enter the key at the prompt
3. Or inside the REPL: `/apikey supermemory sm_your_key`
4. The agent starts remembering everything automatically

---

## 🧪 Agentic Tool Loop

Unlike traditional chat bots that make one API call and respond, PacificaPilot uses a **multi-turn agentic loop**:

1. User asks a question
2. AI decides which tool(s) to call
3. Tools are executed, results fed back to the AI
4. AI can call more tools or produce a final answer
5. Loop repeats up to 8 iterations

This means the AI can:
- Fetch market data, THEN analyze it, THEN give a recommendation
- Check positions, THEN calculate performance, THEN summarize
- Gather multiple data points before responding

---

## 🔐 Security Model

- **Non-custodial**: Keys on your machine, nowhere else
- **BYOK**: Your AI keys go directly to your provider
- **Confirmation**: Every trade action requires explicit user yes/no
- **Dry run**: All trades simulated by default
- **Testnet first**: New setups start on testnet with no real money
- **Restricted perms**: Secrets file at `~/.pacificapilot/secrets.env` with `chmod 600`

---

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.

**Disclaimer:** PacificaPilot is experimental software for educational and research purposes. Trading perpetual futures carries significant risk of loss. AI decisions are not financial advice. Past performance does not guarantee future results. You are responsible for all trades executed by the agent. Start with testnet and small positions. Never risk more than you can afford to lose.

---

## 🤝 Contributing

PRs welcome! Check the [issues](https://github.com/yourusername/pacificapilot/issues) for good first issues.

Built for the [Supermemory](https://supermemory.ai) hackathon (July 2025) and [Pacifica](https://pacifica.fi) ecosystem.
