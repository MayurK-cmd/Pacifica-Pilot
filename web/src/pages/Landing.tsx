import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Copy, Moon, Sun } from "lucide-react";

function CopyCommandButton({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = command;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : "Copy install command"}
      className="shrink-0 rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
    >
      {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
    </button>
  );
}
import { useQuery } from "@tanstack/react-query";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import GhostFibers from "../components/GhostFibers.jsx";
import SpecularButton from "../components/SpecularButton.jsx";
import MagicBento from "../components/MagicBento.jsx";
import GlassSurface from "../components/GlassSurface.jsx";
import { useTheme, useThemeToggle } from "../lib/theme";


import { fetchMarkets } from "../api/pacifica";
import { fmtPct, fmtPrice, pnlClass } from "../lib/utils";

// Backpack-style: sleek black canvas, blue accents (Pacifica blue).
// Landing is intentionally fixed-dark; the app pages keep the theme toggle.
const BLUE = "#3b82f6";
const BLUE_TEXT = "#60a5fa";

function TickerStrip() {
  const q = useQuery({ queryKey: ["markets"], queryFn: fetchMarkets, refetchInterval: 15_000 });
  const symbols = ["BTC", "ETH", "SOL", "HYPE"];
  const by = new Map((q.data ?? []).map((m) => [m.symbol, m]));
  return (
    <div className="border-y border-zinc-800 bg-black" aria-label="Live prices">
      <div className="mx-auto flex max-w-5xl items-center gap-6 overflow-x-auto px-4 py-2.5">
        {symbols.map((s) => {
          const m = by.get(s);
          return (
            <Link key={s} to={`/markets/${s}`} className="flex shrink-0 items-baseline gap-2 hover:opacity-80">
              <span className="text-xs font-bold text-white">{s}</span>
              <span className="num text-xs text-zinc-300">{m ? fmtPrice(m.price) : "—"}</span>
              <span className={`num text-[11px] ${pnlClass(m?.change24hPct)}`}>{fmtPct(m?.change24hPct)}</span>
            </Link>
          );
        })}
        <span className="ml-auto hidden shrink-0 text-[11px] text-zinc-500 sm:inline">Live from Pacifica</span>
      </div>
    </div>
  );
}

export function Landing() {
  const navigate = useNavigate();
  const theme = useTheme();
  const toggleTheme = useThemeToggle();

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0 opacity-50" aria-hidden="true">
        <GhostFibers
          lightMode={false}
          lineColor="#1e3a8a"
          glowColor="#2563eb"
          vignette={0}
          speed={0.15}
        />
      </div>

      <div className="sticky top-3 z-40 flex items-center gap-3 px-4">
        <span className="shrink-0 text-[15px] font-bold tracking-wide text-white">PACIFICA PILOT</span>
        <header className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-zinc-800/80">
          <GlassSurface
            width={"100%" as unknown as number}
            height={"100%" as unknown as number}
            borderRadius={16}
            brightness={40}
            opacity={0.85}
          >
          <div className="relative flex items-center justify-center gap-2 py-2.5">
            <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-400 md:flex" aria-label="Site">
              <Link to="/dashboard" className="hover:text-white">Dashboard</Link>
              <Link to="/markets" className="hover:text-white">Markets</Link>
              <Link to="/portfolio" className="hover:text-white">Portfolio</Link>
              <Link to="/agents" className="hover:text-white">Agents</Link>
            </nav>
            <nav className="flex items-center gap-6 text-sm font-medium text-zinc-400 md:hidden" aria-label="Site">
              <Link to="/dashboard" className="hover:text-white">Dashboard</Link>
              <Link to="/markets" className="hover:text-white">Markets</Link>
              <Link to="/portfolio" className="hover:text-white">Portfolio</Link>
              <Link to="/agents" className="hover:text-white">Agents</Link>
            </nav>
          </div>
          </GlassSurface>
        </header>
        <span className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="p-1.5 text-zinc-400 hover:text-white"
          >
            {theme === "dark" ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
          </button>
          <span className="pp-wallet-btn pp-wallet-light">
            <WalletMultiButton />
          </span>
        </span>
      </div>

      <main className="relative">
        <section className="mx-auto max-w-5xl px-4 py-16 md:py-24" aria-label="Intro">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: BLUE_TEXT }}>
            PacificaPilot web — read-only dashboard
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[1.05] tracking-tight text-white md:text-6xl">
            Watch the market. Watch the agent. Touch nothing.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
            The visual companion to the PacificaPilot terminal agent: live perps prices, your
            portfolio, AI market intelligence with a daily digest, and beginner-friendly docs —
            all read-only. Trading and agent control stay in your terminal and Telegram, where
            every order needs your explicit yes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <SpecularButton
              size="lg"
              textColor="#ffffff"
              tint="#2563eb"
              tintOpacity={1}
              lineColor={BLUE}
              baseColor="#2563eb"
              onClick={() => navigate("/dashboard")}
              className="ring-1 ring-inset ring-blue-400/50"
            >
              Open the dashboard
            </SpecularButton>
            <SpecularButton
              size="lg"
              textColor="#ffffff"
              tint="#ffffff"
              tintOpacity={0}
              lineColor={BLUE}
              baseColor="transparent"
              onClick={() => navigate("/docs")}
              className="ring-1 ring-inset ring-zinc-700"
            >
              Learn how trading works
            </SpecularButton>
          </div>
        </section>

        <TickerStrip />

        <section className="mx-auto max-w-5xl px-4 py-14" aria-label="Features">
          <h2 className="text-2xl font-display tracking-tight text-white md:text-3xl">What the agent does</h2>
          <p className="mt-1 text-xs text-zinc-500">The terminal agent behind this dashboard — hover a card.</p>
          <div className="mt-5 cursor-pointer">
            <MagicBento glowColor="59, 130, 246" textAutoHide={false} enableTilt={false} />
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-14" aria-label="Reading perp charts">
          <h2 className="text-2xl font-display tracking-tight text-white md:text-3xl">Anatomy of a perp chart</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Candles, volume and hourly funding — the three things moving every perpetual market.{" "}
            <Link to="/docs" className="font-semibold hover:underline" style={{ color: BLUE_TEXT }}>
              Full guide
            </Link>
          </p>
          <figure className="mt-5 overflow-hidden rounded-md border border-zinc-800">
            <img
              src="/images/pacifica-perp-chart.png"
              alt="Pacifica perpetual futures trading screen for SOL: candlestick chart with volume, order book with bids and asks, and the Long/Buy order ticket"
              loading="lazy"
              className="h-auto w-full"
            />
            <figcaption className="border-t border-zinc-800 bg-zinc-950 px-4 py-2 text-[11px] text-zinc-500">
              A real Pacifica perps screen — price chart, order book depth and the order ticket, the three panels every perp trader watches.
            </figcaption>
          </figure>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-14 text-center" aria-label="Get started">
          <h2 className="text-2xl font-display tracking-tight text-white md:text-3xl">
            Built for <span style={{ color: BLUE_TEXT }}>aggressive traders</span>
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-zinc-400 md:text-sm">
            PacificaPilot is a non-custodial AI trading agent that watches Pacifica perpetuals
            around the clock — and asks before it ever trades.
          </p>
          <div className="mx-auto mt-8 grid max-w-3xl gap-8 text-left sm:grid-cols-2">
            <div>
              <h3 className="text-lg font-bold text-white">Trade now</h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Connect your wallet and read live perps — prices, funding, open interest —
                then track positions and PnL on the dashboard. Execution itself stays where it
                belongs: your terminal, with your explicit yes on every order.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Win now</h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Ask the intelligence chat for setups, token explainers and market overviews,
                or grab the daily digest — direction, movers and narratives for the last 24
                hours, composed from live data.
              </p>
            </div>
          </div>
          <div className="mx-auto mt-6 flex max-w-xl items-stretch justify-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2.5">
              <span className="select-none font-mono text-xs text-zinc-500" aria-hidden="true">$</span>
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-100">pip install pacificapilot</code>
              <CopyCommandButton command="pip install pacificapilot" />
            </div>
            <SpecularButton
              size="sm"
              textColor="#ffffff"
              tint="#2563eb"
              tintOpacity={1}
              lineColor={BLUE}
              baseColor="#2563eb"
              onClick={() => navigate("/dashboard")}
              className="shrink-0 ring-1 ring-inset ring-blue-400/50"
            >
              Open dashboard
            </SpecularButton>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-14" aria-label="FAQ">
          <h2 className="text-2xl font-display tracking-tight text-white md:text-3xl">FAQ</h2>
          <div className="mt-5 space-y-2">
            {[
              ["Can I place trades from this website?", "No — it is read-only by design. Trading happens in the terminal agent or Telegram, where every live order needs your explicit confirmation."],
              ["Do I need the terminal agent running?", "No for market data, portfolio and intelligence — those come from the local gateway. The terminal agent is only needed to actually trade."],
              ["Where do I connect my wallet?", "On the Portfolio page. Connection is address-only: the browser never signs transactions and never sees private keys."],
              ["What does it cost?", "The dashboard is free. Data comes from public endpoints plus API keys you configure yourself (CoinGecko, Elfa, OpenRouter), each with its own free tier and limits."],
              ["What is the Pacifica Score?", "A 0–100 reading computed locally on this machine from live momentum, technicals, funding, social breadth and risk — never fetched from outside."],
              ["Is this financial advice?", "No. Everything here — scores, signals, chat answers, digests — is educational market intelligence. Leveraged trading can liquidate your full position."],
            ].map(([q, a]) => (
              <details key={q} className="rounded-md border border-zinc-800 bg-zinc-950 p-4 group">
                <summary className="cursor-pointer list-none text-[13px] font-bold text-white [&::-webkit-details-marker]:hidden">
                  <span className="mr-2 inline-block transition-transform group-open:rotate-90" style={{ color: BLUE_TEXT }} aria-hidden="true">▸</span>
                  {q}
                </summary>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative border-t border-zinc-800 bg-black/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-5 text-xs text-zinc-500">
          <span>PacificaPilot — MIT licensed, open source.</span>
          <span className="ml-auto flex flex-wrap gap-4">
            <Link to="/dashboard" className="hover:text-white">Dashboard</Link>
            <Link to="/docs" className="hover:text-white">Docs</Link>
            <a href="https://github.com/MayurK-cmd/Pacifica-Pilot" target="_blank" rel="noreferrer" className="hover:text-white">GitHub</a>
            <a href="https://pypi.org/project/pacificapilot/" target="_blank" rel="noreferrer" className="hover:text-white">PyPI</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
