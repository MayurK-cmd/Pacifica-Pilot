# PacificaPilot Web — read-only trading intelligence (docs/WEB.md)

New, independent `web/` app. Does not touch `app/` or the Python TUI.

## Run

```bash
cd web
cp server/.env.example server/.env   # add keys (see below, all optional)
npm install
npm run dev:all  # gateway :8001 + UI :5174 together (keys stay in gateway)
# or two terminals: `npm run server`  and  `npm run dev`
```

> If every `/api/*` call returns 500, the gateway isn't running — the UI
> alone can't fetch data. Start `npm run server` (or `dev:all`) and retry.

## Routes

- `/` — landing page (product intro, architecture diagram, safety model, install steps).
- `/dashboard` — market strip (configurable watchlist, default BTC/ETH/SOL),
  account overview, focus-asset chart + Pacifica Score + AI signal, positions,
  PnL, social/news, system status.
- `/markets` — every Pacifica symbol, search/sort, ★ watchlist toggles,
  30-per-page pagination.
- `/markets/:symbol` — asset detail (chart, technicals, score, signal,
  CoinGecko metadata, news).
- `/portfolio` — wallet connect (Phantom, Backpack, MetaMask/Jupiter via
  Wallet Standard) or watch-only address; mirrors test-app portfolio:
  account overview, Positions / Open Orders / Order History / Trades /
  Funding / Performance tabs.
- `/agents` — read-only intelligence chat plus daily digest (see below).
- `/docs` — beginner education: CEX vs DEX vs hybrid, Pacifica, trading
  basics, chart reading (with diagrams), how the terminal agent works, risks.

There is intentionally **no `/agent` route** — the trading agent is accessed
via the terminal or Telegram only. Light and dark themes (toggle in header,
persisted).

## Intelligence chat (`/agents`)

An OpenRouter tool-loop agent answers trade-setup ideas, token explainers,
macro overviews and summaries, with session continuity:

- `web/server/intel-agent.js` — system-prompt rules (read-only, numbers only
  from tools, cite figures, structured answers, educational disclaimer) plus 4
  live-data tools: `get_market` (Pacifica + RSI/regime/score), `get_token_social`
  (Elfa), `get_market_breadth` (CoinGecko + Pacifica movers), `get_narratives`.
- Default model: `cohere/north-mini-code:free` (override with `INTEL_MODEL`;
  must support function calling). Model shown in the chat UI.
- Needs `OPENROUTER_API_KEY` on the gateway; without it the page shows
  "unavailable" but the digest still works. Elfa is only a *data* source here.
- Cannot trade; trading stays in terminal/Telegram.

The **daily digest** button composes the last 24h without any LLM: market
direction, cap change, BTC/ETH dominance, top gainers/losers (CoinGecko),
biggest perp movers (Pacifica), trending searches (+ Elfa narratives when keyed).

## Wallet connection (Portfolio route)

- `@solana/web3.js` + wallet-adapter (`ConnectionProvider`, `WalletProvider`).
- Explicit adapters: **Phantom**, **Backpack**. **MetaMask (Solana)**,
  **Jupiter** and other Wallet Standard wallets are auto-detected into the
  same connect modal — no extra package needed.
- Connection is **address-only**: Portfolio reads Pacifica perps data for the
  connected address via the gateway; SOL balance is read live from Solana RPC
  (`VITE_SOLANA_RPC_URL`, default mainnet-beta). The browser never signs,
  never sees keys. A watch-only address fallback remains under "Or watch an
  address without connecting".

## Gateway (`web/server/index.js`, localhost:8001)

Keys stay here; browser calls same-origin `/api/*` (Vite proxies in dev).
Real data only — no mocks; unavailable = 503 + message.

- Markets: `/api/markets`, `/api/markets/:symbol`, `/api/klines`, `/api/technicals/:symbol`
- Account: `/api/positions`, `/api/positions/recent`, `/api/portfolio`, `/api/pnl`,
  `/api/orders/open`, `/api/orders/history`, `/api/trades`, `/api/funding`
- Intel: `/api/score/:symbol`, `/api/signal/:symbol`, `/api/social/:symbol`,
  `/api/social/trending`, `/api/social/narratives`, `/api/intelligence-news`,
  `POST /api/agents/chat`, `/api/digest`, `/api/agent/status`, `/api/status`
- Context: `/api/context/markets`, `/api/context/coin/:symbol`, `/api/context/news`

## Rules

- No mock data (`mock.ts`, fake PnL/prices) — ever. Unavailable = loading/empty/error + Retry.
- No trading, no chat-with-trader, no start/stop, no API-key forms in browser.
- Pacifica = account/PnL truth. Elfa = social/narratives. CoinGecko = market context.
- Pacifica Score is computed in `server/index.js` from live inputs, never fetched externally.
