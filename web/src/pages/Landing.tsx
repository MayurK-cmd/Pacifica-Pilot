import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useTheme, useThemeToggle } from "../lib/theme";
import { fetchMarkets } from "../api/pacifica";
import { fmtPct, fmtPrice, pnlClass } from "../lib/utils";

const INSTALL_COMMANDS: Record<string, string> = {
  pip: "pip install pacificapilot",
  npm: "npm install -g @pacifica/pilot",
  docker: "docker run -p 8080:8080 pacificapilot/core:latest",
  git: "git clone https://github.com/pacifica-pilot/core.git",
};

const FAQS = [
  {
    q: "How does PacificaPilot maintain a strictly non-custodial and read-only model?",
    a: "PacificaPilot operates purely as an audit and intelligence layer. We ingest public WebSocket feeds, decentralized perpetual protocol indexers, and public RPC endpoints directly into memory. We never integrate transaction signing libraries, we never request wallet approval signatures, and our open-source codebase contains zero key-storage logic.",
  },
  {
    q: "Can autonomous trading agents trade on my behalf through PacificaPilot?",
    a: "No. PacificaPilot does not execute trades. Your agents run in your own isolated execution environment (local server, cloud VM, or container). Agents can broadcast structured diagnostic telemetry (such as slippage parameters, target delta, and Sharpe metrics) to PacificaPilot via read-only gRPC or WebSocket channels for visualization, risk auditing, and kill-switch monitoring.",
  },
  {
    q: "What is the Pacifica Quantitative Health & Market Score?",
    a: "The Health Score is an algorithmic index (0-100) computed in sub-millisecond intervals. It aggregates order book depth within 2% of the mid-price, funding rate volatility, basis spread versus spot index, and liquidation cluster proximity to assess immediate execution risk and venue resilience.",
  },
  {
    q: "Which decentralized exchanges and perpetual protocols are supported?",
    a: "PacificaPilot directly indexes Hyperliquid, dYdX v4, GMX (Arbitrum & Avalanche), Drift Protocol (Solana), and Jupiter Perps. Cross-venue funding arbitrage and liquidation heatmaps automatically synchronize across all five venues in unified real-time panels.",
  },
  {
    q: "Is PacificaPilot free and open source?",
    a: "Yes. The core CLI, telemetry SDK, and local terminal UI are 100% open source under the MIT and Apache 2.0 licenses. Anyone can run a self-hosted node. Institutional-grade low-latency historical feeds and high-capacity multi-agent clusters are available for quantitative funds requiring co-located infrastructure.",
  },
];

export function Landing() {
  const navigate = useNavigate();
  const theme = useTheme();
  const toggleTheme = useThemeToggle();

  // Install command state
  const [installTab, setInstallTab] = useState<"pip" | "npm" | "docker" | "git">("pip");
  const [copied, setCopied] = useState(false);

  // Timeframe chart state
  const [activeTf, setActiveTf] = useState("15m");

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Fetch live market data if available
  const marketsQuery = useQuery({ queryKey: ["markets"], queryFn: fetchMarkets, refetchInterval: 15_000 });
  const marketMap = new Map((marketsQuery.data ?? []).map((m) => [m.symbol, m]));

  const copyCmd = async () => {
    const cmd = INSTALL_COMMANDS[installTab];
    try {
      await navigator.clipboard.writeText(cmd);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = cmd;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPriceDisplay = (sym: string, fallbackPrice: string, fallbackChange: string, isDown = false) => {
    const m = marketMap.get(sym);
    if (!m) return { price: fallbackPrice, change: fallbackChange, isDown };
    return {
      price: fmtPrice(m.price),
      change: fmtPct(m.change24hPct),
      isDown: (m.change24hPct ?? 0) < 0,
    };
  };

  const btcData = getPriceDisplay("BTC", "$89,420.50", "+3.42%");
  const ethData = getPriceDisplay("ETH", "$3,284.15", "+5.18%");
  const solData = getPriceDisplay("SOL", "$184.90", "+8.64%");
  const hypeData = getPriceDisplay("HYPE", "$28.45", "+14.20%");

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.4)]">
        <div className="h-16 w-full px-margin-desktop flex items-center justify-between gap-gutter-desktop">
          <div className="flex items-center gap-space-md">
            <Link to="/" className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-primary-container text-body-lg">token</span>
              </div>
              <span className="font-headline-md text-headline-md tracking-tight text-on-surface font-bold uppercase">
                PACIFICA PILOT
              </span>
            </Link>
            <span className="hidden sm:inline-flex items-center font-label-caps text-label-caps px-space-xs py-0.5 rounded bg-surface-container-high text-secondary border border-secondary-container/20 tracking-wider">
              NON-CUSTODIAL INTELLIGENCE
            </span>
          </div>
          <nav className="hidden lg:flex items-center gap-space-xs">
            <Link
              to="/dashboard"
              className="px-space-md py-space-xs font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors rounded"
            >
              Dashboard
            </Link>
            <Link
              to="/markets"
              className="px-space-md py-space-xs font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors rounded"
            >
              Markets
            </Link>
            <Link
              to="/portfolio"
              className="px-space-md py-space-xs font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors rounded"
            >
              Portfolio
            </Link>
            <Link
              to="/agents"
              className="px-space-md py-space-xs font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors rounded"
            >
              Agents
            </Link>
            <Link
              to="/docs"
              className="px-space-md py-space-xs font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors rounded"
            >
              Docs
            </Link>
          </nav>
          <div className="flex items-center gap-space-sm">
            <button
              aria-label="Toggle theme"
              onClick={toggleTheme}
              className="p-space-xs rounded bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-body-lg">
                {theme === "dark" ? "light_mode" : "dark_mode"}
              </span>
            </button>
            <Link
              to="/docs"
              className="hidden md:flex items-center p-space-xs rounded bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-body-lg">menu_book</span>
            </Link>
            <span className="pp-wallet-btn">
              <WalletMultiButton />
            </span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="w-full pt-16 bg-surface">
        <div className="flex flex-col w-full">
          {/* 1. Live Ticker Strip (Perpetuals Market Bar) */}
          <section className="w-full bg-surface-container-lowest overflow-hidden select-none">
            <div className="flex items-center w-full px-margin-desktop py-space-xs overflow-x-auto no-scrollbar gap-space-lg text-on-surface">
              {/* BTC-PERP */}
              <Link to="/markets/BTC" className="flex items-center gap-space-sm shrink-0 bg-surface-container-low/70 px-space-sm py-1 rounded hover:bg-surface-container transition-colors">
                <span className="font-label-caps text-label-caps text-primary tracking-wider font-bold">BTC-PERP</span>
                <span className="font-data-tabular text-data-tabular font-semibold text-on-surface">{btcData.price}</span>
                <span className={`font-data-micro text-data-micro flex items-center ${btcData.isDown ? 'text-error' : 'text-secondary'}`}>{btcData.change}</span>
                <svg className={`w-12 h-4 stroke-current fill-none stroke-1 shrink-0 ${btcData.isDown ? 'text-error' : 'text-secondary'}`} viewBox="0 0 48 16">
                  <polyline points="0,13 8,11 16,12 24,7 32,8 40,3 48,2"></polyline>
                </svg>
                <span className="font-data-micro text-data-micro text-outline-variant">Vol $2.4B</span>
              </Link>

              {/* ETH-PERP */}
              <Link to="/markets/ETH" className="flex items-center gap-space-sm shrink-0 bg-surface-container-low/70 px-space-sm py-1 rounded hover:bg-surface-container transition-colors">
                <span className="font-label-caps text-label-caps text-primary tracking-wider font-bold">ETH-PERP</span>
                <span className="font-data-tabular text-data-tabular font-semibold text-on-surface">{ethData.price}</span>
                <span className={`font-data-micro text-data-micro flex items-center ${ethData.isDown ? 'text-error' : 'text-secondary'}`}>{ethData.change}</span>
                <svg className={`w-12 h-4 stroke-current fill-none stroke-1 shrink-0 ${ethData.isDown ? 'text-error' : 'text-secondary'}`} viewBox="0 0 48 16">
                  <polyline points="0,14 10,13 20,9 30,10 40,4 48,3"></polyline>
                </svg>
                <span className="font-data-micro text-data-micro text-outline-variant">Vol $1.1B</span>
              </Link>

              {/* SOL-PERP */}
              <Link to="/markets/SOL" className="flex items-center gap-space-sm shrink-0 bg-surface-container-low/70 px-space-sm py-1 rounded hover:bg-surface-container transition-colors">
                <span className="font-label-caps text-label-caps text-primary tracking-wider font-bold">SOL-PERP</span>
                <span className="font-data-tabular text-data-tabular font-semibold text-on-surface">{solData.price}</span>
                <span className={`font-data-micro text-data-micro flex items-center ${solData.isDown ? 'text-error' : 'text-secondary'}`}>{solData.change}</span>
                <svg className={`w-12 h-4 stroke-current fill-none stroke-1 shrink-0 ${solData.isDown ? 'text-error' : 'text-secondary'}`} viewBox="0 0 48 16">
                  <polyline points="0,15 12,12 22,10 32,6 40,2 48,1"></polyline>
                </svg>
                <span className="font-data-micro text-data-micro text-outline-variant">Vol $840M</span>
              </Link>

              {/* HYPE-PERP */}
              <Link to="/markets/HYPE" className="flex items-center gap-space-sm shrink-0 bg-surface-container-low/70 px-space-sm py-1 rounded hover:bg-surface-container transition-colors">
                <span className="font-label-caps text-label-caps text-primary tracking-wider font-bold">HYPE-PERP</span>
                <span className="font-data-tabular text-data-tabular font-semibold text-on-surface">{hypeData.price}</span>
                <span className={`font-data-micro text-data-micro flex items-center ${hypeData.isDown ? 'text-error' : 'text-secondary'}`}>{hypeData.change}</span>
                <svg className={`w-12 h-4 stroke-current fill-none stroke-1 shrink-0 ${hypeData.isDown ? 'text-error' : 'text-secondary'}`} viewBox="0 0 48 16">
                  <polyline points="0,14 10,15 20,8 28,9 36,3 48,1"></polyline>
                </svg>
                <span className="font-data-micro text-data-micro text-outline-variant">Vol $310M</span>
              </Link>

              {/* SUI-PERP */}
              <div className="flex items-center gap-space-sm shrink-0 bg-surface-container-low/70 px-space-sm py-1 rounded">
                <span className="font-label-caps text-label-caps text-outline tracking-wider font-bold">SUI-PERP</span>
                <span className="font-data-tabular text-data-tabular font-semibold text-on-surface">$3.12</span>
                <span className="font-data-micro text-data-micro text-error flex items-center">-1.05%</span>
                <svg className="w-12 h-4 text-error stroke-current fill-none stroke-1 shrink-0" viewBox="0 0 48 16">
                  <polyline points="0,3 12,5 20,10 32,9 40,14 48,15"></polyline>
                </svg>
                <span className="font-data-micro text-data-micro text-outline-variant">Vol $180M</span>
              </div>

              {/* Aggregated Funding & OI Telemetry */}
              <div className="ml-auto hidden xl:flex items-center gap-space-md shrink-0 font-data-micro text-data-micro">
                <div className="flex items-center gap-space-xs bg-surface-container-high px-space-sm py-1 rounded">
                  <span className="text-on-surface-variant uppercase">Agg Funding:</span>
                  <span className="text-secondary font-medium">+0.0042%/1h</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping"></span>
                </div>
                <div className="flex items-center gap-space-xs bg-surface-container-high px-space-sm py-1 rounded">
                  <span className="text-on-surface-variant uppercase">Global OI:</span>
                  <span className="text-primary-container font-semibold">$14.82B</span>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Hero Section */}
          <section className="relative w-full px-margin-desktop py-space-xl lg:py-20 flex flex-col items-center text-center overflow-hidden">
            <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center gap-space-lg">
              {/* Badge Pill */}
              <div className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container-high text-primary font-label-caps text-label-caps tracking-widest shadow-sm">
                <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
                <span>v0.8.4 PUBLIC BETA • 100% NON-CUSTODIAL & READ-ONLY</span>
              </div>

              {/* Hero Headline */}
              <h1 className="font-headline-xl text-headline-xl lg:text-[3.25rem] lg:leading-[3.75rem] font-bold text-on-surface tracking-tight max-w-3xl">
                Watch the market. Watch the agent. <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-secondary to-primary-fixed">
                  Touch nothing.
                </span>
              </h1>

              {/* Subtext */}
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">
                Institutional-grade perpetuals intelligence, autonomous agent monitoring, and real-time orderflow analytics. Zero private keys required. Pure observation power.
              </p>

              {/* Action Group */}
              <div className="flex flex-wrap items-center justify-center gap-space-md pt-space-xs w-full">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center justify-center gap-space-sm px-space-xl py-space-md rounded bg-primary-container text-on-primary-container font-label-md text-label-md font-bold shadow-lg hover:shadow-primary-container/20 hover:bg-primary-fixed transition-all"
                  type="button"
                >
                  <span>Open the dashboard</span>
                  <span className="material-symbols-outlined text-body-lg">arrow_forward</span>
                </button>
                <a
                  href="#how-it-works"
                  className="flex items-center justify-center gap-space-sm px-space-xl py-space-md rounded bg-surface-container-high text-on-surface font-label-md text-label-md font-medium hover:bg-surface-bright transition-all"
                >
                  <span className="material-symbols-outlined text-body-lg">visibility</span>
                  <span>Learn how trading works</span>
                </a>
              </div>

              {/* Inline Terminal Installation Command Box */}
              <div className="w-full max-w-2xl mt-space-md rounded-xl bg-surface-container-lowest/90 backdrop-blur-md shadow-2xl p-space-md text-left flex flex-col gap-space-sm">
                {/* Terminal Header */}
                <div className="flex items-center justify-between pb-space-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#ff5f56]"></span>
                    <span className="w-3 h-3 rounded-full bg-[#ffbd2e]"></span>
                    <span className="w-3 h-3 rounded-full bg-[#27c93f]"></span>
                    <span className="ml-2 font-data-micro text-data-micro text-outline">
                      pacificapilot-agent-cli — bash
                    </span>
                  </div>
                  {/* Switcher tabs */}
                  <div className="flex items-center gap-space-xs text-data-micro font-data-micro">
                    {(["pip", "npm", "docker", "git"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setInstallTab(tab)}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          installTab === tab
                            ? "bg-surface-container text-primary font-medium"
                            : "text-outline hover:text-on-surface"
                        }`}
                      >
                        {tab === "git" ? "git clone" : tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Terminal Command Line */}
                <div className="flex items-center justify-between bg-surface-container-low px-space-md py-space-sm rounded">
                  <div className="flex items-center gap-space-sm font-data-tabular text-data-tabular">
                    <span className="text-secondary select-none">$</span>
                    <span className="text-primary font-medium">{INSTALL_COMMANDS[installTab]}</span>
                  </div>
                  <button
                    type="button"
                    onClick={copyCmd}
                    className="flex items-center gap-1 px-space-sm py-1 rounded bg-surface-container-high text-on-surface-variant hover:text-primary hover:bg-surface-bright font-data-micro text-data-micro transition-all"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {copied ? "check" : "content_copy"}
                    </span>
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>

                {/* Terminal Verification Status line */}
                <div className="flex items-center justify-between text-data-micro font-data-micro text-outline px-1">
                  <div className="flex items-center gap-space-xs">
                    <span className="text-secondary">✓</span>
                    <span>verified package • 0 key permissions • read-only socket initialized</span>
                  </div>
                  <span className="text-outline-variant">SHA256: 4f98...d71a</span>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Live Metrics Banner / Social Proof */}
          <section className="w-full px-margin-desktop py-space-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
              {/* Metric 1 */}
              <div className="p-space-lg rounded-xl bg-surface-container-low shadow-sm flex flex-col gap-space-xs hover:bg-surface-container transition-colors">
                <div className="flex items-center justify-between text-outline-variant">
                  <span className="font-label-caps text-label-caps tracking-wider text-on-surface-variant uppercase">
                    Monitored Volume
                  </span>
                  <span className="material-symbols-outlined text-body-lg text-primary-container">
                    monitoring
                  </span>
                </div>
                <div className="font-data-metric text-data-metric text-primary font-bold tracking-tight">
                  $4.2B+
                </div>
                <div className="font-body-sm text-body-sm text-outline">
                  Across 5 major decentralized perpetual venues (24h)
                </div>
              </div>

              {/* Metric 2 */}
              <div className="p-space-lg rounded-xl bg-surface-container-low shadow-sm flex flex-col gap-space-xs hover:bg-surface-container transition-colors">
                <div className="flex items-center justify-between text-outline-variant">
                  <span className="font-label-caps text-label-caps tracking-wider text-on-surface-variant uppercase">
                    Custody Model
                  </span>
                  <span className="material-symbols-outlined text-body-lg text-secondary">
                    verified_user
                  </span>
                </div>
                <div className="font-data-metric text-data-metric text-secondary font-bold tracking-tight">
                  0 Keys
                </div>
                <div className="font-body-sm text-body-sm text-outline">
                  Zero private keys handled. Non-custodial architectural guarantee
                </div>
              </div>

              {/* Metric 3 */}
              <div className="p-space-lg rounded-xl bg-surface-container-low shadow-sm flex flex-col gap-space-xs hover:bg-surface-container transition-colors">
                <div className="flex items-center justify-between text-outline-variant">
                  <span className="font-label-caps text-label-caps tracking-wider text-on-surface-variant uppercase">
                    Socket Latency
                  </span>
                  <span className="material-symbols-outlined text-body-lg text-primary">bolt</span>
                </div>
                <div className="font-data-metric text-data-metric text-on-surface font-bold tracking-tight">
                  &lt; 12ms
                </div>
                <div className="font-body-sm text-body-sm text-outline">
                  Direct WebSocket pipeline to Hyperliquid & dYdX v4 matching engines
                </div>
              </div>

              {/* Metric 4 */}
              <div className="p-space-lg rounded-xl bg-surface-container-low shadow-sm flex flex-col gap-space-xs hover:bg-surface-container transition-colors">
                <div className="flex items-center justify-between text-outline-variant">
                  <span className="font-label-caps text-label-caps tracking-wider text-on-surface-variant uppercase">
                    Active Quant Agents
                  </span>
                  <span className="material-symbols-outlined text-body-lg text-tertiary-fixed-dim">
                    smart_toy
                  </span>
                </div>
                <div className="font-data-metric text-data-metric text-tertiary-fixed-dim font-bold tracking-tight">
                  42,000+
                </div>
                <div className="font-body-sm text-body-sm text-outline">
                  Autonomous execution bots broadcasting observability telemetry
                </div>
              </div>
            </div>
          </section>

          {/* 4. Features Section (Modular Capability Grid) */}
          <section className="w-full px-margin-desktop py-space-xl lg:py-24 flex flex-col gap-space-xl" id="how-it-works">
            <div className="flex flex-col gap-space-xs max-w-2xl">
              <div className="flex items-center gap-space-xs text-primary font-label-caps text-label-caps tracking-widest uppercase">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span>Quantitative Architecture</span>
              </div>
              <h2 className="font-headline-xl text-headline-xl font-bold text-on-surface tracking-tight">
                Engineered for Quantitative Precision
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Everything you need to monitor high-frequency decentralized derivatives without exposing your capital or signing keys.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
              {/* Card 1 */}
              <div className="p-space-xl rounded-xl bg-surface-container-low shadow-md hover:bg-surface-container transition-all flex flex-col justify-between group">
                <div className="flex flex-col gap-space-md">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-container group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[28px]">query_stats</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md font-semibold text-on-surface">
                    Live Market Intelligence
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    Real-time order flow footprint, liquidation heatmaps, funding rate skew predictions, and volume delta indicators across cross-chain DEX perpetual venues.
                  </p>
                </div>
                <div className="mt-space-lg pt-space-md bg-surface-container-lowest/60 p-space-sm rounded-lg flex flex-col gap-space-xs">
                  <div className="flex justify-between font-data-micro text-data-micro text-outline">
                    <span>Cumulative Volume Delta</span>
                    <span className="text-secondary font-medium">+1,420 BTC</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden flex">
                    <div className="bg-secondary h-full w-[68%]"></div>
                    <div className="bg-error h-full w-[32%]"></div>
                  </div>
                  <div className="flex justify-between font-data-micro text-data-micro text-outline-variant">
                    <span>Long Aggression 68%</span>
                    <span>Short Exhaustion 32%</span>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-space-xl rounded-xl bg-surface-container-low shadow-md hover:bg-surface-container transition-all flex flex-col justify-between group">
                <div className="flex flex-col gap-space-md">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[28px]">robot_2</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md font-semibold text-on-surface">
                    Autonomous Agent Telemetry
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    Track trading bots and AI execution agents in real time. Inspect decision trees, risk slippage boundaries, Sharpe ratios, and drawdowns without giving up wallet signing authority.
                  </p>
                </div>
                <div className="mt-space-lg pt-space-md bg-surface-container-lowest/60 p-space-sm rounded-lg flex flex-col gap-space-xs">
                  <div className="flex justify-between font-data-micro text-data-micro text-outline">
                    <span>Agent #0492 • Delta-Neutral Maker</span>
                    <span className="text-primary font-medium">Sharpe 3.42</span>
                  </div>
                  <div className="flex items-center gap-space-xs font-data-micro text-data-micro">
                    <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-secondary">
                      ACTIVE
                    </span>
                    <span className="text-outline-variant">Max DD: -1.8% • Win Rate: 74.2%</span>
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-space-xl rounded-xl bg-surface-container-low shadow-md hover:bg-surface-container transition-all flex flex-col justify-between group">
                <div className="flex flex-col gap-space-md">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-fixed group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[28px]">key_off</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md font-semibold text-on-surface">
                    Read-Only Cryptographic Security
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    PacificaPilot operates strictly via public RPCs, read-only viewing keys, and on-chain event streams. Never prompt for seed phrases, never sign transactions.
                  </p>
                </div>
                <div className="mt-space-lg pt-space-md bg-surface-container-lowest/60 p-space-sm rounded-lg flex flex-col gap-space-xs">
                  <div className="flex justify-between font-data-micro text-data-micro text-outline">
                    <span>Zero-Trust Protocol Boundary</span>
                    <span className="text-secondary font-medium">AUDITED</span>
                  </div>
                  <div className="flex items-center gap-space-xs font-data-micro text-data-micro text-outline-variant">
                    <span className="material-symbols-outlined text-[14px] text-secondary">lock</span>
                    <span>Client sandbox • Read sockets only</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 5. Anatomy of a Perp Chart Section (Exploded Terminal Breakdown) */}
          <section className="w-full px-margin-desktop py-space-xl lg:py-24 bg-surface-container-lowest">
            <div className="max-w-7xl mx-auto flex flex-col gap-space-xl">
              {/* Section Titles */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
                <div className="flex flex-col gap-space-xs">
                  <span className="font-label-caps text-label-caps text-primary-container tracking-wider uppercase">
                    Interactive Terminal Telemetry
                  </span>
                  <h2 className="font-headline-xl text-headline-xl font-bold text-on-surface">
                    Anatomy of a Perpetual Contract Interface
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
                    Deep architectural visibility into every layer of perpetuals market mechanics.
                  </p>
                </div>
                {/* Architectural Callout Pill Tags */}
                <div className="flex flex-wrap items-center gap-space-xs font-label-caps text-label-caps">
                  <span className="px-space-sm py-1 rounded bg-surface-container-high text-primary">
                    1. Dynamic Mark Price Engine
                  </span>
                  <span className="px-space-sm py-1 rounded bg-surface-container-high text-secondary">
                    2. Real-Time Liquidation Cluster
                  </span>
                  <span className="px-space-sm py-1 rounded bg-surface-container-high text-tertiary-fixed-dim">
                    3. Zero-Slippage Depth
                  </span>
                </div>
              </div>

              {/* High-Fidelity Terminal Visual Workbench */}
              <div className="w-full rounded-xl bg-surface-container shadow-2xl p-space-md grid grid-cols-1 lg:grid-cols-12 gap-space-md overflow-hidden">
                {/* Left / Primary: Charting Canvas (7 Cols) */}
                <div className="lg:col-span-7 bg-surface-container-low rounded-lg p-space-md flex flex-col gap-space-md">
                  {/* Chart Header */}
                  <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-sm bg-surface-container-lowest/40 p-space-xs rounded">
                    <div className="flex items-center gap-space-sm">
                      <span className="font-headline-md text-headline-md font-bold text-on-surface">
                        BTC/USD PERP
                      </span>
                      <span className="font-label-caps text-label-caps px-1.5 py-0.5 rounded bg-primary-container/20 text-primary-container">
                        HYPERLIQUID
                      </span>
                      <span className="font-data-tabular text-data-tabular font-semibold text-secondary">
                        $89,420.50
                      </span>
                    </div>
                    {/* Timeframe switcher */}
                    <div className="flex items-center gap-1 font-data-micro text-data-micro">
                      {(["1m", "5m", "15m", "1h", "4h", "1D"] as const).map((tf) => (
                        <button
                          key={tf}
                          type="button"
                          onClick={() => setActiveTf(tf)}
                          className={`px-2 py-0.5 rounded transition-colors ${
                            activeTf === tf
                              ? "bg-surface-container-high text-primary font-bold"
                              : "text-outline hover:text-on-surface"
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Candlestick Visualizer Canvas */}
                  <div className="relative w-full h-72 sm:h-80 bg-surface-container-lowest rounded overflow-hidden flex flex-col justify-between p-space-sm">
                    {/* Annotation Badge 1: Mark Price Engine */}
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-surface-container-high/90 px-2 py-1 rounded font-data-micro text-data-micro text-primary">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                      <span>Mark Price Engine: Index $89,418.20 (Basis +$2.30)</span>
                    </div>
                    {/* Annotation Badge 2: Liquidation Cluster Warning */}
                    <div className="absolute bottom-16 right-3 z-10 flex items-center gap-1.5 bg-surface-container-high/90 px-2 py-1 rounded font-data-micro text-data-micro text-error">
                      <span className="material-symbols-outlined text-[14px]">warning</span>
                      <span>Liq Cluster: $87,900 ($28.4M Longs)</span>
                    </div>
                    {/* Technical Chart Vector */}
                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 600 240">
                      {/* Grid lines */}
                      <line stroke="#31353f" strokeDasharray="3,3" strokeWidth="0.5" x1="0" x2="600" y1="60" y2="60"></line>
                      <line stroke="#31353f" strokeDasharray="3,3" strokeWidth="0.5" x1="0" x2="600" y1="120" y2="120"></line>
                      <line stroke="#31353f" strokeDasharray="3,3" strokeWidth="0.5" x1="0" x2="600" y1="180" y2="180"></line>
                      {/* EMA 20 Line */}
                      <path d="M 20 180 Q 120 170, 200 130 T 400 90 T 580 45" fill="none" stroke="#00f0ff" strokeOpacity="0.8" strokeWidth="1.5"></path>
                      {/* VWAP Line */}
                      <path d="M 20 160 Q 150 140, 300 110 T 580 65" fill="none" stroke="#70ffba" strokeDasharray="4,2" strokeWidth="1"></path>

                      {/* Simulated Candlesticks */}
                      <line stroke="#70ffba" strokeWidth="1" x1="40" x2="40" y1="160" y2="210"></line>
                      <rect fill="#70ffba" height="30" rx="1" width="8" x="36" y="170"></rect>

                      <line stroke="#ffb4ab" strokeWidth="1" x1="80" x2="80" y1="150" y2="195"></line>
                      <rect fill="#ffb4ab" height="25" rx="1" width="8" x="76" y="160"></rect>

                      <line stroke="#70ffba" strokeWidth="1" x1="120" x2="120" y1="140" y2="180"></line>
                      <rect fill="#70ffba" height="30" rx="1" width="8" x="116" y="145"></rect>

                      <line stroke="#70ffba" strokeWidth="1" x1="160" x2="160" y1="120" y2="170"></line>
                      <rect fill="#70ffba" height="35" rx="1" width="8" x="156" y="130"></rect>

                      <line stroke="#ffb4ab" strokeWidth="1" x1="200" x2="200" y1="115" y2="160"></line>
                      <rect fill="#ffb4ab" height="20" rx="1" width="8" x="196" y="125"></rect>

                      <line stroke="#70ffba" strokeWidth="1" x1="240" x2="240" y1="100" y2="145"></line>
                      <rect fill="#70ffba" height="30" rx="1" width="8" x="236" y="105"></rect>

                      <line stroke="#70ffba" strokeWidth="1" x1="280" x2="280" y1="90" y2="135"></line>
                      <rect fill="#70ffba" height="32" rx="1" width="8" x="276" y="95"></rect>

                      <line stroke="#ffb4ab" strokeWidth="1" x1="320" x2="320" y1="85" y2="130"></line>
                      <rect fill="#ffb4ab" height="25" rx="1" width="8" x="316" y="95"></rect>

                      <line stroke="#70ffba" strokeWidth="1" x1="360" x2="360" y1="75" y2="115"></line>
                      <rect fill="#70ffba" height="25" rx="1" width="8" x="356" y="80"></rect>

                      <line stroke="#70ffba" strokeWidth="1" x1="400" x2="400" y1="55" y2="105"></line>
                      <rect fill="#70ffba" height="40" rx="1" width="8" x="396" y="60"></rect>

                      <line stroke="#ffb4ab" strokeWidth="1" x1="440" x2="440" y1="50" y2="90"></line>
                      <rect fill="#ffb4ab" height="20" rx="1" width="8" x="436" y="55"></rect>

                      <line stroke="#70ffba" strokeWidth="1" x1="480" x2="480" y1="35" y2="80"></line>
                      <rect fill="#70ffba" height="35" rx="1" width="8" x="476" y="40"></rect>

                      <line stroke="#70ffba" strokeWidth="1" x1="520" x2="520" y1="30" y2="70"></line>
                      <rect fill="#70ffba" height="30" rx="1" width="8" x="516" y="32"></rect>

                      <line stroke="#00f0ff" strokeWidth="1.5" x1="560" x2="560" y1="20" y2="60"></line>
                      <rect fill="#00f0ff" height="26" rx="1" width="8" x="556" y="24"></rect>

                      {/* Liquidation Cluster Visual marker */}
                      <circle cx="320" cy="140" fill="#ffb4ab" opacity="0.6" r="5"></circle>
                      <circle cx="320" cy="140" fill="none" r="10" stroke="#ffb4ab" strokeDasharray="2,2" strokeWidth="0.75"></circle>

                      {/* Volume Sub-bars bottom */}
                      <rect fill="#70ffba" height="15" opacity="0.4" width="8" x="36" y="220"></rect>
                      <rect fill="#ffb4ab" height="10" opacity="0.4" width="8" x="76" y="225"></rect>
                      <rect fill="#70ffba" height="20" opacity="0.4" width="8" x="116" y="215"></rect>
                      <rect fill="#70ffba" height="25" opacity="0.4" width="8" x="156" y="210"></rect>
                      <rect fill="#ffb4ab" height="13" opacity="0.4" width="8" x="196" y="222"></rect>
                      <rect fill="#70ffba" height="23" opacity="0.4" width="8" x="236" y="212"></rect>
                      <rect fill="#70ffba" height="17" opacity="0.4" width="8" x="276" y="218"></rect>
                      <rect fill="#ffb4ab" height="11" opacity="0.4" width="8" x="316" y="224"></rect>
                      <rect fill="#70ffba" height="27" opacity="0.4" width="8" x="356" y="208"></rect>
                      <rect fill="#70ffba" height="35" opacity="0.4" width="8" x="396" y="200"></rect>
                      <rect fill="#ffb4ab" height="12" opacity="0.4" width="8" x="436" y="223"></rect>
                      <rect fill="#70ffba" height="30" opacity="0.4" width="8" x="476" y="205"></rect>
                      <rect fill="#70ffba" height="25" opacity="0.4" width="8" x="516" y="210"></rect>
                      <rect fill="#00f0ff" height="40" opacity="0.6" width="8" x="556" y="195"></rect>
                    </svg>
                  </div>

                  {/* Bottom Telemetry subrow */}
                  <div className="flex flex-wrap items-center justify-between font-data-micro text-data-micro text-on-surface-variant pt-space-xs">
                    <div className="flex items-center gap-space-md">
                      <span>EMA(20): <span className="text-primary-container font-mono">89,280.40</span></span>
                      <span>VWAP: <span className="text-secondary font-mono">89,195.10</span></span>
                      <span>24h High: <span className="text-on-surface font-mono">90,140.00</span></span>
                      <span>24h Low: <span className="text-on-surface font-mono">86,520.00</span></span>
                    </div>
                    <div className="text-outline">Latency: 8.4ms (Direct ws://)</div>
                  </div>
                </div>

                {/* Center-Right: Real-time Order Book Depth (3 Cols) */}
                <div className="lg:col-span-3 bg-surface-container-low rounded-lg p-space-md flex flex-col justify-between">
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between pb-space-xs">
                      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                        Order Book Depth
                      </span>
                      <span className="font-data-micro text-data-micro text-secondary">Spread $0.50</span>
                    </div>

                    {/* Asks (Red) */}
                    <div className="flex flex-col gap-1 font-data-tabular text-data-tabular">
                      <div className="relative flex justify-between px-1 py-0.5 text-error overflow-hidden rounded">
                        <div className="absolute inset-y-0 right-0 bg-error/15 w-[85%]"></div>
                        <span className="relative z-10 font-medium">89,422.00</span>
                        <span className="relative z-10 text-outline">4.18 BTC</span>
                      </div>
                      <div className="relative flex justify-between px-1 py-0.5 text-error overflow-hidden rounded">
                        <div className="absolute inset-y-0 right-0 bg-error/15 w-[65%]"></div>
                        <span className="relative z-10 font-medium">89,421.50</span>
                        <span className="relative z-10 text-outline">2.84 BTC</span>
                      </div>
                      <div className="relative flex justify-between px-1 py-0.5 text-error overflow-hidden rounded">
                        <div className="absolute inset-y-0 right-0 bg-error/15 w-[42%]"></div>
                        <span className="relative z-10 font-medium">89,421.00</span>
                        <span className="relative z-10 text-outline">1.95 BTC</span>
                      </div>
                    </div>

                    {/* Mid-Market Current Price Indicator */}
                    <div className="py-1 px-space-sm bg-surface-container-high rounded flex items-center justify-between font-data-tabular text-data-tabular">
                      <span className="text-secondary font-bold text-sm">$89,420.50</span>
                      <span className="text-outline-variant text-data-micro">↑ Mark Index</span>
                    </div>

                    {/* Bids (Green) */}
                    <div className="flex flex-col gap-1 font-data-tabular text-data-tabular">
                      <div className="relative flex justify-between px-1 py-0.5 text-secondary overflow-hidden rounded">
                        <div className="absolute inset-y-0 right-0 bg-secondary/15 w-[48%]"></div>
                        <span className="relative z-10 font-medium">89,420.00</span>
                        <span className="relative z-10 text-outline">2.14 BTC</span>
                      </div>
                      <div className="relative flex justify-between px-1 py-0.5 text-secondary overflow-hidden rounded">
                        <div className="absolute inset-y-0 right-0 bg-secondary/15 w-[72%]"></div>
                        <span className="relative z-10 font-medium">89,419.50</span>
                        <span className="relative z-10 text-outline">3.88 BTC</span>
                      </div>
                      <div className="relative flex justify-between px-1 py-0.5 text-secondary overflow-hidden rounded">
                        <div className="absolute inset-y-0 right-0 bg-secondary/15 w-[94%]"></div>
                        <span className="relative z-10 font-medium">89,419.00</span>
                        <span className="relative z-10 text-outline">6.25 BTC</span>
                      </div>
                    </div>
                  </div>

                  {/* Matching Trades Live Feed */}
                  <div className="flex flex-col gap-1 pt-space-md">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                      Recent Executions
                    </span>
                    <div className="flex justify-between font-data-micro text-data-micro text-secondary">
                      <span>08:42:19</span>
                      <span>89,420.50</span>
                      <span>+0.850 BTC</span>
                    </div>
                    <div className="flex justify-between font-data-micro text-data-micro text-secondary">
                      <span>08:42:18</span>
                      <span>89,420.50</span>
                      <span>+0.320 BTC</span>
                    </div>
                    <div className="flex justify-between font-data-micro text-data-micro text-error">
                      <span>08:42:15</span>
                      <span>89,420.00</span>
                      <span>-1.200 BTC</span>
                    </div>
                  </div>
                </div>

                {/* Far-Right: Order Ticket & Execution Simulator (2 Cols / Compact) */}
                <div className="lg:col-span-2 bg-surface-container-low rounded-lg p-space-md flex flex-col justify-between gap-space-md">
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between pb-space-xs">
                      <span className="font-label-caps text-label-caps text-outline uppercase">
                        Simulated Order
                      </span>
                      <span className="font-label-caps text-label-caps px-1 py-0.5 rounded bg-surface-container-high text-primary">
                        READ-ONLY
                      </span>
                    </div>

                    {/* Position Type toggle */}
                    <div className="grid grid-cols-2 gap-1 p-1 bg-surface-container-lowest rounded text-center font-label-md text-label-md">
                      <span className="py-1 rounded bg-secondary/20 text-secondary font-semibold">
                        LONG
                      </span>
                      <span className="py-1 rounded text-outline hover:text-on-surface">SHORT</span>
                    </div>

                    {/* Leverage Slider Mockup */}
                    <div className="flex flex-col gap-1 pt-space-xs">
                      <div className="flex justify-between font-data-micro text-data-micro">
                        <span className="text-outline">Leverage</span>
                        <span className="text-primary font-bold">20x Cross</span>
                      </div>
                      <div className="w-full h-1 bg-surface-container-high rounded overflow-hidden">
                        <div className="h-full bg-primary-container w-[40%]"></div>
                      </div>
                    </div>

                    {/* Margin & Est Liquidation */}
                    <div className="flex flex-col gap-1.5 pt-space-xs font-data-micro text-data-micro">
                      <div className="flex justify-between">
                        <span className="text-outline">Margin Req</span>
                        <span className="text-on-surface font-mono">4,471 USDC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-outline">Est. Liq Price</span>
                        <span className="text-error font-mono font-semibold">$85,120.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-outline">Liquidity Score</span>
                        <span className="text-secondary font-mono">98 / 100</span>
                      </div>
                    </div>
                  </div>

                  {/* Non-Custodial Disabled Execution Callout */}
                  <div className="p-space-sm rounded bg-surface-container-lowest flex flex-col gap-1 text-center">
                    <span className="font-label-caps text-label-caps text-primary tracking-wide">
                      OBSERVABILITY ONLY
                    </span>
                    <p className="font-data-micro text-data-micro text-outline">
                      Simulated execution pipeline. No key access permitted.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 6. Interactive FAQ Section */}
          <section className="w-full px-margin-desktop py-space-xl lg:py-24 max-w-4xl mx-auto flex flex-col gap-space-xl">
            <div className="flex flex-col gap-space-xs text-center items-center">
              <span className="font-label-caps text-label-caps text-secondary tracking-widest uppercase">
                Protocol Integrity
              </span>
              <h2 className="font-headline-xl text-headline-xl font-bold text-on-surface">
                Frequently Asked Questions
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-lg">
                Everything you need to know about PacificaPilot's architecture, keyless observability, and agent tracking.
              </p>
            </div>

            {/* Accordion List */}
            <div className="flex flex-col gap-space-sm w-full">
              {FAQS.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} className="rounded-xl bg-surface-container-low overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="w-full p-space-lg flex items-center justify-between text-left gap-space-md hover:bg-surface-container transition-colors"
                    >
                      <span className="font-headline-md text-headline-md font-semibold text-on-surface">
                        {faq.q}
                      </span>
                      <span className={`material-symbols-outlined text-outline shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-space-lg pb-space-lg pt-0 text-on-surface-variant font-body-md text-body-md leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 7. Bottom CTA Ribbon */}
          <section className="w-full px-margin-desktop py-space-xl pb-24 flex justify-center">
            <div className="w-full max-w-5xl rounded-2xl p-space-xl lg:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-space-lg bg-surface-container-high">
              <div className="flex flex-col gap-space-xs text-left max-w-lg">
                <span className="font-label-caps text-label-caps text-primary-container tracking-wider uppercase">
                  Instant Zero-Permission Telemetry
                </span>
                <h3 className="font-headline-lg text-headline-lg font-bold text-on-surface">
                  Ready to monitor decentralized order flow?
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  No account required. Connect any read-only address or explore live global perpetuals metrics right now.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-space-sm shrink-0 w-full md:w-auto">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="w-full sm:w-auto px-space-xl py-space-md rounded bg-primary-container text-on-primary-container font-label-md text-label-md font-bold text-center hover:bg-primary-fixed transition-colors shadow-md"
                  type="button"
                >
                  Launch Live Terminal
                </button>
                <Link
                  to="/docs"
                  className="w-full sm:w-auto px-space-xl py-space-md rounded bg-surface-container-lowest text-on-surface font-label-md text-label-md font-medium text-center hover:bg-surface-dim transition-colors"
                >
                  View Documentation
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-surface-container-lowest">
        <div className="w-full px-margin-desktop py-space-xl flex flex-col gap-space-lg">
          <div className="flex flex-wrap items-center justify-between gap-space-sm py-space-xs px-space-md rounded bg-surface-container-low font-data-micro text-data-micro text-on-surface-variant">
            <div className="flex items-center gap-space-xs">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              <span className="text-secondary font-medium">SYSTEM STATUS: 100% OPERATIONAL</span>
            </div>
            <div className="flex items-center gap-space-md">
              <span className="text-on-surface-variant">SOLANA RPC: <span className="text-primary font-medium">18ms</span></span>
              <span className="text-outline-variant">•</span>
              <span className="text-on-surface-variant">HYPERLIQUID WS: <span className="text-secondary font-medium">CONNECTED</span></span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-space-xl items-start">
            <div className="md:col-span-6 flex flex-col gap-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary-container text-body-lg">token</span>
                <span className="font-headline-md text-headline-md tracking-tight text-on-surface font-bold uppercase">
                  PACIFICA PILOT
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
                Read-only quantitative market intelligence protocol. Non-custodial, keyless architecture delivering precision algorithmic signals and execution telemetry.
              </p>
              <p className="font-data-micro text-data-micro text-outline max-w-md">
                Released under Apache 2.0 & MIT License. Safe, audited, read-only analytics.
              </p>
            </div>

            <div className="md:col-span-6 flex flex-col md:items-end gap-space-sm">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                Protocol Resources
              </span>
              <div className="flex flex-wrap md:justify-end gap-x-space-lg gap-y-space-xs font-data-tabular text-data-tabular">
                <a href="https://github.com/MayurK-cmd/Pacifica-Pilot" target="_blank" rel="noreferrer" className="text-on-surface-variant hover:text-primary transition-colors">
                  GitHub (v0.8.4)
                </a>
                <a href="https://pypi.org/project/pacificapilot/" target="_blank" rel="noreferrer" className="text-on-surface-variant hover:text-secondary transition-colors">
                  pip install pacificapilot
                </a>
                <Link to="/docs" className="text-on-surface-variant hover:text-on-surface transition-colors">
                  Docs
                </Link>
                <Link to="/docs" className="text-on-surface-variant hover:text-on-surface transition-colors">
                  API Reference
                </Link>
              </div>
            </div>
          </div>

          <div className="pt-space-md flex flex-col sm:flex-row items-center justify-between gap-space-xs font-body-sm text-body-sm text-outline">
            <p>© 2026 PacificaPilot Foundation. All telemetry non-custodial.</p>
            <div className="flex items-center gap-space-md">
              <Link to="/docs" className="hover:text-on-surface transition-colors">Privacy Policy</Link>
              <Link to="/docs" className="hover:text-on-surface transition-colors">Terms of Service</Link>
              <Link to="/docs" className="hover:text-on-surface transition-colors">Security Disclosures</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
