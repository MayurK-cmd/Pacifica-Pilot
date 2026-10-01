# PacificaPilot Web — read-only trading intelligence (docs/WEB.md)

New, independent `web/` app. Does not touch `app/` or the Python TUI.

## Run

```bash
cd web
cp server/.env.example server/.env   # add ELFA_API_KEY / COINGECKO_API_KEY (optional)
npm install
npm run dev:all  # gateway :8001 + UI :5174 together (keys stay in gateway)
# or two terminals: `npm run server`  and  `npm run dev`
```

> If every `/api/*` call returns 500, the gateway isn't running — the UI
> alone can't fetch data. Start `npm run server` (or `dev:all`) and retry.

## Routes

- `/` — landing page (product intro, safety model, install steps).
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
- `/agents` — read-only intelligence chat (Elfa: trade-setup ideas, token
  explainers, macro overviews, summaries) with session continuity, plus a
  daily-digest button composing the last 24h from CoinGecko + Pacifica (+ Elfa
  narratives when keyed). Cannot trade; trading stays in terminal/Telegram.
- `/docs` — beginner education: CEX vs DEX vs hybrid, Pacifica, trading
  basics, chart reading, how the terminal agent works, risks.

There is intentionally **no `/agent` route** — the agent is accessed via the
terminal or Telegram only. Light and dark themes (toggle in header, persisted).

## Wallet connection (Portfolio route)

- `@solana/web3.js` + wallet-adapter (`ConnectionProvider`, `WalletProvider`).
- Explicit adapters: **Phantom**, **Backpack**. **MetaMask (Solana)**,
  **Jupiter** and other Wallet Standard wallets are auto-detected into the
  same connect modal — no extra package needed.
- Connection is **address-only**: Portfolio reads Pacifica perps data for the
  connected address via the gateway; SOL balance is read live from Solana RPC.
  The browser never signs, never sees keys. A watch-only address fallback
  remains under "Or watch an address without connecting".

## Rules

- No mock data (`mock.ts`, fake PnL/prices) — ever. Unavailable = loading/empty/error + Retry.
- No trading, no chat, no start/stop, no API-key forms in browser.
- Pacifica = account/PnL truth. Elfa = social/narratives. CoinGecko = market context.
- Pacifica Score is computed in `server/index.js` from live inputs, never fetched externally.
