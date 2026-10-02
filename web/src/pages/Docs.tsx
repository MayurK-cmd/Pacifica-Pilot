import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { MarketStructureDiagram } from "../components/illustrations/MarketStructureDiagram";
import { CandleDiagram } from "../components/illustrations/CandleDiagram";

const toc = [
  ["cex", "What is a CEX?"],
  ["dex", "What is a DEX?"],
  ["hybrid", "What is a hybrid DEX?"],
  ["pacifica", "What is Pacifica?"],
  ["trading", "Trading crypto: the basics"],
  ["charts", "How to read charts"],
  ["pilot", "How PacificaPilot works"],
  ["risks", "Risks (read this first)"],
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-label={title} className="card card-pad scroll-mt-4">
      <h2 className="text-base font-bold">{title}</h2>
      <div className="mt-2 space-y-2 text-[13px] leading-relaxed text-ink/90">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

export function Docs() {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold">Docs — learn to trade</h2>
        <p className="text-xs text-muted">
          A newcomer-friendly primer: market structure, trading mechanics, chart reading, and what
          PacificaPilot actually does. Educational only — not financial advice.
        </p>
      </div>

      <Card title="Contents">
        <nav aria-label="Docs sections">
          <ol className="grid gap-1 text-[13px] sm:grid-cols-2">
            {toc.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="font-medium text-teal hover:underline">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </Card>

      <Section id="cex" title="What is a CEX?">
        <P>
          A <strong>centralized exchange (CEX)</strong> — e.g. Binance, Coinbase — is a company that
          holds your funds, runs its own matching engine on private servers, and settles trades in
          its internal ledger. You deposit crypto or fiat, trade against other users through their
          order books, and withdraw when you leave.
        </P>
        <P>
          Trade-offs: deep liquidity and fast, beginner-friendly apps — but you trust the company
          with custody. If it freezes withdrawals, mismanages funds or is hacked, your balance is at
          risk. It can also delist assets, restrict regions, and sees all your activity.
        </P>
      </Section>

      <Section id="dex" title="What is a DEX?">
        <P>
          A <strong>decentralized exchange (DEX)</strong> — e.g. Uniswap, Jupiter — is a set of smart
          contracts on a blockchain. You trade directly from your own wallet; nothing is ever
          deposited with a company. Settlement is on-chain and visible to anyone.
        </P>
        <P>
          Trade-offs: self-custody and censorship resistance — but every action is a blockchain
          transaction (fees, confirmation waits), interfaces assume more knowledge, and mistakes
          like sending funds to the wrong address are irreversible. Classic on-chain DEXes
          historically struggled to match CEX speed and order-book depth.
        </P>
      </Section>

      <Section id="hybrid" title="What is a hybrid DEX?">
        <P>
          A <strong>hybrid DEX</strong> splits the job: a fast off-chain engine matches orders with
          CEX-like speed, while settlement, custody and margin accounting stay on-chain in audited
          programs. You keep your keys and funds remain verifiable on the ledger, but trading feels
          instant instead of block-by-block.
        </P>
        <P>
          The trust question changes rather than disappears: you still rely on the operator's
          matching engine being fair and available, and on the smart contracts being correct. In
          return you get order books, leverage and conditional orders without giving up custody.
        </P>
        <div className="card card-pad mt-2">
          <MarketStructureDiagram />
        </div>
      </Section>

      <Section id="pacifica" title="What is Pacifica?">
        <P>
          <strong>Pacifica</strong> is a hybrid perpetual-futures exchange on Solana. Perpetual
          futures ("perps") let you go long or short on crypto prices with leverage, without owning
          the underlying asset and without expiry dates. Pacifica combines an off-chain central
          limit order book with on-chain settlement, fund security and margin logic.
        </P>
        <P>
          What you interact with on this dashboard maps directly to Pacifica concepts:{" "}
          <strong>mark price</strong> (the fair reference price used for PnL),{" "}
          <strong>funding rate</strong> (hourly payments between longs and shorts that tether the
          perp to spot), <strong>open interest</strong> (how much is positioned), and your{" "}
          <strong>account equity, margin usage and liquidation price</strong> (shown on the{" "}
          <Link to="/portfolio" className="text-teal hover:underline">Portfolio</Link> page).
        </P>
      </Section>

      <Section id="trading" title="Trading crypto: the basics">
        <P>
          <strong>Spot vs perps.</strong> Spot = buying the actual coin. Perps = contracts tracking
          the price; you post margin as collateral and profit (or lose) from price moves. Perps never
          expire, which is why funding payments exist to keep them aligned with spot.
        </P>
        <P>
          <strong>Long vs short.</strong> Long profits when price rises; short profits when it falls.
          On the exchange these are the <strong>bid</strong> (buy/long) and <strong>ask</strong>{" "}
          (sell/short) sides you'll see on positions and orders.
        </P>
        <P>
          <strong>Leverage and margin.</strong> Leverage multiplies exposure relative to collateral:
          5x means a 20% adverse move wipes the position. Margin is the collateral locked against
          open positions; as losses eat into it you approach <strong>liquidation</strong>, where the
          exchange force-closes you. Higher leverage = closer liquidation price.
        </P>
        <P>
          <strong>Funding.</strong> Every hour, the side in the majority pays the minority a small
          rate. Persistently high positive funding means crowded longs — a contrarian warning sign,
          not free yield.
        </P>
        <P>
          <strong>Order types.</strong> <em>Market</em> fills immediately at the best available
          price (fast, pays spread). <em>Limit</em> rests on the book at your price (cheap, may never
          fill). <em>Stop / take-profit</em> trigger at set prices to cap losses or lock gains.{" "}
          <em>Reduce-only</em> means an order can only shrink a position, never flip it bigger.
        </P>
      </Section>

      <Section id="charts" title="How to read charts">
        <div className="card card-pad">
          <CandleDiagram />
        </div>
        <P>
          <strong>Candles.</strong> Each candle shows open, high, low and close for its interval.
          Green/ up candles closed higher than they opened; long wicks mean rejection of an extreme.
          The <strong>close</strong> series (the line on this dashboard) filters noise; candle bodies
          show conviction.
        </P>
        <P>
          <strong>Volume.</strong> Bars under the chart. Moves on rising volume are more trustworthy
          than moves on thin participation; breakouts that fail on low volume often reverse.
        </P>
        <P>
          <strong>RSI (0–100).</strong> Momentum oscillator. Below ~30 = oversold (selling may be
          exhausted); above ~70 = overbought. It marks stretched conditions, not exact turning
          points — strong trends can stay overbought for a long time.
        </P>
        <P>
          <strong>MACD.</strong> Trend-following: the MACD line above its signal line suggests
          bullish momentum and vice versa. Best for confirming a trend's direction, worst for
          timing entries in choppy markets.
        </P>
        <P>
          <strong>Bollinger Bands.</strong> A moving average with volatility envelopes. Price
          riding the upper band = strong trend (not automatically a sell); a squeeze (narrow bands)
          often precedes a large move in either direction.
        </P>
        <P>
          <strong>What to actually conclude.</strong> Combine, don't cherry-pick: trend (higher
          highs/lows or not?) + momentum (RSI/MACD extreme or healthy?) + positioning (funding
          crowded? open interest rising with price = new money; rising against you = squeeze risk).
          The dashboard's <strong>regime badge</strong> compresses this into TRENDING, RANGING or
          VOLATILE — trend tools work in the first, mean-reversion in the second, and small size in
          the third.
        </P>
      </Section>

      <Section id="pilot" title="How PacificaPilot works">
        <P>
          PacificaPilot is a <strong>terminal-native, non-custodial trading agent</strong>: a
          command-line program that runs on your own machine and trades Pacifica perps through two
          cooperating parts. The <strong>Loop Agent</strong> wakes on a timer, fetches market data
          and social sentiment, asks an AI model for a LONG / SHORT / HOLD decision, and acts only
          inside your configured guardrails (max position size, minimum confidence, stop-loss and
          take-profit bounds). The <strong>Chat Agent</strong> is the interactive terminal (plus an
          optional Telegram bot) that accepts natural-language commands and slash commands.
        </P>
        <P>
          What it factually provides: you bring your own AI provider keys (Anthropic, OpenAI,
          Google or OpenRouter); Pacifica keys stay in a restricted local file and are never
          uploaded; paper trading is the default and every live order needs explicit confirmation,
          with testnet as the starting environment; trade memory persists across sessions; each AI
          decision hash is logged on-chain for auditability.
        </P>
        <P>
          What problem that solves: markets move around the clock and humans can't watch
          everything — the loop agent monitors continuously; discretionary trading is emotional and
          inconsistent — guardrails plus mandatory confirmations enforce the plan; hosted trading
          bots demand your keys — running locally removes that custody trade-off. None of this
          removes market risk: the agent can be wrong, and leveraged positions can still be
          liquidated.
        </P>
        <P>
          This web app is the agent's read-only dashboard: same data, no controls. Starting,
          stopping and commanding the agent happen in the terminal (<code>pacifica init</code>,{" "}
          <code>pacifica start</code>) or Telegram — never here.
        </P>
        <P>
          The dashboard's <strong>Agents page</strong> adds a separate, deliberately limited
          intelligence chat: an OpenRouter-powered Q&A agent (default model{" "}
          <code>cohere/north-mini-code:free</code>, configurable) that answers setup, token and
          market questions using live Pacifica, CoinGecko and Elfa data through tools, with a
          rules prompt that keeps it read-only and educational. It needs an{" "}
          <code>OPENROUTER_API_KEY</code> on the local gateway, keeps conversation sessions so
          follow-ups work, and also offers a one-click daily digest of the last 24 hours. It is a
          research assistant, not the trading agent, and it cannot place orders.
        </P>
      </Section>

      <Section id="risks" title="Risks (read this first)">
        <P>
          Perpetual futures with leverage can lose more than you expect, fast: liquidations close
          positions automatically, funding bleeds crowded sides, and gaps/slippage mean fills differ
          from screen prices. AI decisions are probabilistic outputs, not advice, and past
          performance — the agent's or anyone's — does not predict future returns.
        </P>
        <P>
          Practical rules: start on testnet with paper trading, size positions so any single loss is
          boring, understand your liquidation price before opening anything, and never trade money
          you need. This software is experimental and educational.
        </P>
      </Section>
    </div>
  );
}
