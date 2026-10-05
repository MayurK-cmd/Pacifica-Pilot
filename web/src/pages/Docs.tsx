import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

interface FAQItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "How does PacificaPilot maintain a completely non-custodial architecture?",
    a: "PacificaPilot uses ephemeral ed25519 public key verification to access open read-only RPC nodes and WebSocket endpoints on supported networks (Hyperliquid, Solana, Arbitrum). Private keys never touch PacificaPilot infrastructure, cloud storage, or client cookies. When you trigger an execution signal, the app compiles the transaction payload in your browser and dispatches it directly to your connected wallet extension (Phantom, Backpack, MetaMask, Ledger) for explicit manual hardware or software signature.",
  },
  {
    q: "Where does the Pacifica Composite Score (0-100) originate?",
    a: "The Composite Score represents a multi-factor regression model calibrated on historical order flow absorption. The components are weighted as follows: 30% Cumulative Volume Delta (CVD) divergence, 25% Open Interest and Liquidation Cluster concentration, 20% Funding Rate basis premium/discount, 15% Volatility Squeeze index (Bollinger Bands & ATR), and 10% On-chain whale address positioning. A score above 80 indicates high institutional confluence.",
  },
  {
    q: "Can I connect institutional cold storage like Ledger, Trezor, or Safe multi-sig?",
    a: "Yes. PacificaPilot seamlessly connects through standard Web3 connector libraries supporting Ledger USB/Bluetooth, Trezor Connect, and Safe Protocol multisig. Since PacificaPilot relies entirely on standard EIP-712 structured data signing or Solana transaction serialization, institutional multi-party approval workflows function natively without requiring custom smart contract delegations.",
  },
  {
    q: "What makes perpetual funding rates positive or negative?",
    a: "Perpetual futures prices fluctuate freely according to buy and sell supply in the order book. When aggressive buyers bid the perpetual contract price above the underlying spot index, the funding rate becomes positive (Contango). To rebalance the market, Longs pay Shorts. Conversely, when sellers push the perp below spot, funding becomes negative (Backwardation), and Shorts pay Longs to incentivize spot-perp price parity.",
  },
  {
    q: "How do I execute trades spotted by the Pacifica AI dispatch engine?",
    a: "Whenever an autonomous signal meets your selected risk criteria, clicking 'Execute Payload' compiles a pre-formatted order ticket with pre-calculated entry price, limit slippage buffer, Take-Profit 1/2 triggers, and hard Stop-Loss parameters. You review the exact calldata inside the execution drawer and approve it via your wallet in a single sub-second transaction.",
  },
];

const TOC_SECTIONS = [
  { category: "ARCHITECTURES", items: [{ id: "section-venues", label: "CEX vs DEX vs Hybrid", icon: "account_tree", highlight: true }] },
  {
    category: "DERIVATIVES BASICS",
    items: [
      { id: "section-perps", label: "Perpetual Futures", icon: "trending_up" },
      { id: "section-leverage", label: "Long / Short & Margin", icon: "balance" },
      { id: "section-funding", label: "Funding Rates & Basis", icon: "swap_horiz" },
      { id: "section-orders", label: "Order Execution Types", icon: "receipt_long" },
    ],
  },
  {
    category: "TECHNICAL ANALYSIS",
    items: [
      { id: "section-candlesticks", label: "Candlestick Anatomy", icon: "bar_chart" },
      { id: "section-indicators", label: "Core Quant Indicators", icon: "query_stats" },
    ],
  },
  {
    category: "PROTOCOL ARCHITECTURE",
    items: [
      { id: "section-engine", label: "4-Stage Quant Pipeline", icon: "hub" },
      { id: "section-security", label: "Zero-Key Custody Model", icon: "key_off" },
    ],
  },
  {
    category: "RISK & PROTOCOL FAQ",
    items: [
      { id: "section-risks", label: "Institutional Risk Notice", icon: "warning", isError: true },
      { id: "section-faq", label: "Knowledgebase (FAQ)", icon: "help_center" },
    ],
  },
];

export function Docs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeSection, setActiveSection] = useState("section-venues");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ⌘K Hotkey handler for search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Active section scroll observer
  useEffect(() => {
    function handleScroll() {
      const sections = document.querySelectorAll("section[id]");
      const scrollPos = window.scrollY + 140;

      sections.forEach((sec) => {
        const top = (sec as HTMLElement).offsetTop;
        const height = (sec as HTMLElement).offsetHeight;
        const id = sec.getAttribute("id");
        if (id && scrollPos >= top && scrollPos < top + height) {
          setActiveSection(id);
        }
      });
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function shareUrl() {
    navigator.clipboard.writeText(window.location.href);
    alert("Specification URL copied to clipboard.");
  }

  function exportPdf() {
    window.print();
  }

  return (
    <div className="w-full pt-16 bg-surface min-h-screen text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      <div className="w-full max-w-[1720px] mx-auto px-margin md:px-margin-desktop py-space-lg">
        <div className="flex flex-col lg:flex-row gap-gutter-desktop items-start">
          {/* STICKY LEFT SIDEBAR NAVIGATION */}
          <aside className="w-full lg:w-72 lg:sticky lg:top-20 shrink-0 bg-surface-container-low rounded-xl p-space-md shadow-xl flex flex-col gap-space-md z-20 border border-surface-container-high/60">
            {/* Sidebar Brand / Version */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-label-caps text-label-caps text-primary tracking-widest uppercase">DOCS // v1.2</span>
              </div>
              <span className="px-space-xs py-0.5 rounded bg-surface-container font-data-micro text-data-micro text-on-surface-variant">
                SPEC_BUILD_482
              </span>
            </div>

            {/* Filter / Quick Search */}
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-on-surface-variant text-[16px] pointer-events-none">
                search
              </span>
              <input
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline font-data-tabular text-data-tabular rounded-lg pl-8 pr-8 py-1.5 focus:outline-none focus:bg-surface-container-high transition-colors border border-surface-container-high/40"
                placeholder="Quick jump... ⌘K"
                type="text"
              />
              <kbd className="absolute right-2 top-2 px-1 rounded bg-surface-container font-data-micro text-data-micro text-outline pointer-events-none">
                ⌘K
              </kbd>
            </div>

            {/* Navigation Table of Contents */}
            <nav className="flex flex-col gap-space-md overflow-y-auto max-h-[calc(100vh-16rem)] pr-1 font-body-sm text-body-sm scrollbar-none">
              {TOC_SECTIONS.map((sec) => (
                <div key={sec.category} className="flex flex-col gap-1">
                  <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider px-2 py-1">
                    {sec.category}
                  </span>
                  {sec.items
                    .filter((item) => !searchTerm || item.label.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((item) => {
                      const isActive = activeSection === item.id;
                      return (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all ${
                            isActive
                              ? "bg-surface-container text-primary font-medium shadow-sm"
                              : "hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
                          }`}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <span
                              className={`material-symbols-outlined text-[15px] ${
                                item.isError ? "text-error" : isActive ? "text-primary" : ""
                              }`}
                            >
                              {item.icon}
                            </span>
                            <span>{item.label}</span>
                          </span>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />}
                        </a>
                      );
                    })}
                </div>
              ))}
            </nav>

            {/* Sidebar Floating Action Card */}
            <div className="mt-auto p-space-sm rounded-lg bg-surface-container-high flex flex-col gap-space-xs border border-surface-container-high/60">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps text-secondary">ACTIVE TELEMETRY</span>
                <span className="font-data-micro text-data-micro text-outline">v0.8.4</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Looking for algorithmic portfolio inspection or sub-second trade triggers?
              </p>
              <div className="grid grid-cols-2 gap-space-xs pt-1">
                <Link
                  to="/agents"
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded bg-surface-container-low hover:bg-surface-container font-label-md text-label-md text-primary transition-colors text-center"
                >
                  <span>Terminal</span>
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </Link>
                <Link
                  to="/portfolio"
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded bg-primary-container text-on-primary-container hover:bg-primary-fixed font-label-md text-label-md font-semibold transition-colors text-center"
                >
                  <span>Portfolio</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT STREAM */}
          <article className="flex-1 w-full min-w-0 flex flex-col gap-space-xl">
            {/* HEADER HERO PANEL */}
            <header className="p-space-lg md:p-space-xl rounded-xl bg-surface-container-low shadow-xl flex flex-col gap-space-md relative overflow-hidden border border-surface-container-high/60">
              <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-primary-container/5 blur-3xl pointer-events-none" />

              {/* Top Status Pill */}
              <div className="flex flex-wrap items-center justify-between gap-space-sm">
                <span className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded bg-surface-container-high font-label-caps text-label-caps text-primary tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  PRIMER &amp; SPECIFICATION // ZERO-KNOWLEDGE CRYPTO DERIVATIVES
                </span>
                <div className="flex items-center gap-space-sm">
                  <button
                    onClick={shareUrl}
                    className="flex items-center gap-1 px-space-sm py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-label-md text-label-md transition-colors"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[15px]">link</span>
                    <span>Share</span>
                  </button>
                  <button
                    onClick={exportPdf}
                    className="flex items-center gap-1 px-space-sm py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-label-md text-label-md transition-colors"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[15px]">download</span>
                    <span>Export PDF</span>
                  </button>
                </div>
              </div>

              {/* Page Title & Pitch */}
              <div className="flex flex-col gap-space-xs">
                <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">
                  Crypto Trading Primer &amp; Protocol Architecture
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-4xl">
                  An institutional reference guide to decentralized perpetual contracts, execution liquidity mechanics, mathematical risk formulations, and the non-custodial quantitative AI dispatching pipeline behind PacificaPilot.
                </p>
              </div>

              {/* Metadata Ribbon */}
              <div className="flex flex-wrap items-center gap-x-space-lg gap-y-space-xs pt-space-xs font-data-micro text-data-micro text-outline">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                  <span>
                    READ TIME: <span className="text-on-surface font-semibold">14 MIN</span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-secondary">verified</span>
                  <span>
                    VERIFIED: <span className="text-secondary font-semibold">KUDELSKI &amp; PACIFICA QUANT CORE</span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">sync</span>
                  <span>
                    REVISION: <span className="text-on-surface font-semibold">EPOCH #482 (TODAY)</span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-primary-fixed">lock_clock</span>
                  <span>
                    PROTOCOL: <span className="text-primary-fixed font-semibold">ZERO-KEY READ-ONLY</span>
                  </span>
                </div>
              </div>
            </header>

            {/* SECTION 1: CEX vs DEX vs Hybrid DEX */}
            <section
              id="section-venues"
              className="p-space-lg md:p-space-xl rounded-xl bg-surface-container-low shadow-xl flex flex-col gap-space-lg border border-surface-container-high/60 scroll-mt-24"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-caps text-label-caps text-primary tracking-widest">01 // MARKET VENUES</span>
                  <span className="h-px flex-1 bg-surface-container-high" />
                </div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                  Execution Architecture: CEX vs. AMM DEX vs. Hybrid DEX
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  High-frequency derivatives require deterministic latency and transparent order matching. Understanding the architectural differences between custodial exchanges, legacy automated market makers, and next-generation hybrid on-chain order books is critical for capital safety.
                </p>
              </div>

              {/* ARCHITECTURE SVG DIAGRAM */}
              <div className="w-full bg-surface-container-lowest p-space-md rounded-xl overflow-x-auto border border-surface-container-high/40">
                <svg
                  className="w-full min-w-[700px] h-64 text-on-surface"
                  fill="none"
                  viewBox="0 0 880 240"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect fill="#181b25" height="200" rx="8" width="250" x="20" y="20" />
                  <text fill="#dfe2ef" fontFamily="Plus Jakarta Sans" fontSize="14" fontWeight="700" x="35" y="45">
                    CENTRALIZED EXCHANGES (CEX)
                  </text>
                  <text fill="#ffb4ab" fontFamily="JetBrains Mono" fontSize="10" x="35" y="62">
                    High Regulatory &amp; Custodial Risk
                  </text>
                  <rect fill="#0f131c" height="32" rx="4" width="220" x="35" y="80" />
                  <text fill="#b9cacb" fontFamily="Inter" fontSize="11" x="45" y="100">
                    Off-chain Proprietary Book
                  </text>
                  <rect fill="#0f131c" height="32" rx="4" width="220" x="35" y="122" />
                  <text fill="#ffb4ab" fontFamily="Inter" fontSize="11" x="45" y="142">
                    Exchange Custodies Private Keys
                  </text>
                  <rect fill="#31353f" height="36" rx="4" width="220" x="35" y="164" />
                  <text fill="#dfe2ef" fontFamily="JetBrains Mono" fontSize="10" x="45" y="186">
                    Latency: 1-5ms | Solvency: Opaque
                  </text>

                  <rect fill="#181b25" height="200" rx="8" width="250" x="315" y="20" />
                  <text fill="#dfe2ef" fontFamily="Plus Jakarta Sans" fontSize="14" fontWeight="700" x="330" y="45">
                    LEGACY AMM DEX (V2/V3)
                  </text>
                  <text fill="#849495" fontFamily="JetBrains Mono" fontSize="10" x="330" y="62">
                    Non-Custodial / Passive Liquidity
                  </text>
                  <rect fill="#0f131c" height="32" rx="4" width="220" x="330" y="80" />
                  <text fill="#b9cacb" fontFamily="Inter" fontSize="11" x="340" y="100">
                    Formulaic Pricing: x * y = k
                  </text>
                  <rect fill="#0f131c" height="32" rx="4" width="220" x="330" y="122" />
                  <text fill="#ffb4ab" fontFamily="Inter" fontSize="11" x="340" y="142">
                    Severe MEV &amp; Toxic Sandwiching
                  </text>
                  <rect fill="#31353f" height="36" rx="4" width="220" x="330" y="164" />
                  <text fill="#dfe2ef" fontFamily="JetBrains Mono" fontSize="10" x="340" y="186">
                    Latency: Blocktime | Slippage: High
                  </text>

                  <rect fill="#1c1f29" height="200" rx="8" stroke="#00f0ff" strokeWidth="1.5" width="250" x="610" y="20" />
                  <text fill="#00f0ff" fontFamily="Plus Jakarta Sans" fontSize="14" fontWeight="700" x="625" y="45">
                    HYBRID PERP DEX (PACIFICA)
                  </text>
                  <text fill="#70ffba" fontFamily="JetBrains Mono" fontSize="10" x="625" y="62">
                    Sub-Second CLOB + On-Chain Settlement
                  </text>
                  <rect fill="#0a0e17" height="32" rx="4" width="220" x="625" y="80" />
                  <text fill="#dbfcff" fontFamily="Inter" fontSize="11" x="635" y="100">
                    Off-chain / App-chain Order Matching
                  </text>
                  <rect fill="#0a0e17" height="32" rx="4" width="220" x="625" y="122" />
                  <text fill="#70ffba" fontFamily="Inter" fontSize="11" x="635" y="142">
                    Non-Custodial Vaults &amp; User Custody
                  </text>
                  <rect fill="#00363a" height="36" rx="4" width="220" x="625" y="164" />
                  <text fill="#00f0ff" fontFamily="JetBrains Mono" fontSize="10" x="635" y="186">
                    Latency: &lt;20ms | MEV: Immune
                  </text>
                </svg>
              </div>

              {/* COMPARISON MATRIX TABLE */}
              <div className="overflow-x-auto rounded-lg bg-surface-container-lowest border border-surface-container-high/40">
                <table className="w-full text-left font-data-tabular text-data-tabular">
                  <thead className="bg-surface-container font-label-caps text-label-caps text-outline uppercase">
                    <tr>
                      <th className="p-space-sm">Architecture Property</th>
                      <th className="p-space-sm">Custodial CEX (Binance, Bybit)</th>
                      <th className="p-space-sm">AMM DEX (Uniswap, Raydium)</th>
                      <th className="p-space-sm text-primary">Hybrid CLOB (Hyperliquid, Drift)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high/40 text-on-surface-variant">
                    <tr className="hover:bg-surface-container/50 transition-colors">
                      <td className="p-space-sm font-semibold text-on-surface">Asset Custody</td>
                      <td className="p-space-sm text-error">Centralized Database Ledger</td>
                      <td className="p-space-sm text-secondary">Self-Custodial Smart Contract</td>
                      <td className="p-space-sm text-primary font-semibold">Self-Custodial (Non-Custodial Vaults)</td>
                    </tr>
                    <tr className="hover:bg-surface-container/50 transition-colors">
                      <td className="p-space-sm font-semibold text-on-surface">Order Execution Model</td>
                      <td className="p-space-sm">Central Limit Order Book (CLOB)</td>
                      <td className="p-space-sm">Constant Product Formula</td>
                      <td className="p-space-sm text-primary font-semibold">High-Throughput L1/L2 CLOB</td>
                    </tr>
                    <tr className="hover:bg-surface-container/50 transition-colors">
                      <td className="p-space-sm font-semibold text-on-surface">Execution Speed / Latency</td>
                      <td className="p-space-sm text-secondary">Sub-10ms</td>
                      <td className="p-space-sm text-error">Slot Dependent (400ms - 12s)</td>
                      <td className="p-space-sm text-primary font-semibold">Sub-25ms (Sub-second finality)</td>
                    </tr>
                    <tr className="hover:bg-surface-container/50 transition-colors">
                      <td className="p-space-sm font-semibold text-on-surface">MEV &amp; Front-running Risk</td>
                      <td className="p-space-sm">Internal Market-Maker Privileges</td>
                      <td className="p-space-sm text-error">Extremely High (Sandwich bots)</td>
                      <td className="p-space-sm text-secondary font-semibold">Deterministic FIFO (Zero MEV)</td>
                    </tr>
                    <tr className="hover:bg-surface-container/50 transition-colors">
                      <td className="p-space-sm font-semibold text-on-surface">Funding Settlement</td>
                      <td className="p-space-sm">Internal 8h Clocks</td>
                      <td className="p-space-sm">Virtual AMM Slippage</td>
                      <td className="p-space-sm text-primary font-semibold">Block-by-Block / Hourly Dynamic</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECTION 2: Perpetual Futures Mechanics */}
            <section
              id="section-perps"
              className="p-space-lg md:p-space-xl rounded-xl bg-surface-container-low shadow-xl flex flex-col gap-space-lg border border-surface-container-high/60 scroll-mt-24"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-caps text-label-caps text-primary tracking-widest">
                    02 // DERIVATIVE MECHANICS
                  </span>
                  <span className="h-px flex-1 bg-surface-container-high" />
                </div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                  Perpetual Futures: Spot vs. Perps, Leverage &amp; Funding Mechanics
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Unlike traditional dated futures, perpetual contracts have no expiration date. The perpetual price is continuously anchored to the spot index via regular cash transfers known as the <em>Funding Rate</em>.
                </p>
              </div>

              {/* 3-COL FEATURE CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                <div className="p-space-md rounded-xl bg-surface-container flex flex-col gap-space-xs shadow-md border border-surface-container-high/40">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">currency_exchange</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">Spot vs. Perpetual</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Spot purchases transfer physical token ownership into your wallet. Perpetuals represent synthetic exposure to price movements without settling the underlying asset, allowing directional trade with leveraged capital.
                  </p>
                </div>

                <div
                  id="section-leverage"
                  className="p-space-md rounded-xl bg-surface-container flex flex-col gap-space-xs shadow-md border border-surface-container-high/40 scroll-mt-24"
                >
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[20px]">tune</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">Margin Multipliers</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Initial Margin is collateral locked to open a position. As leverage scales up to 50x, the distance to your Liquidation Level collapses exponentially, drastically elevating insolvency danger.
                  </p>
                </div>

                <div
                  id="section-funding"
                  className="p-space-md rounded-xl bg-surface-container flex flex-col gap-space-xs shadow-md border border-surface-container-high/40 scroll-mt-24"
                >
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined text-[20px]">sync_alt</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">Funding Mechanics</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    When Perp price &gt; Spot (contango), Longs pay Shorts. When Perp price &lt; Spot (backwardation), Shorts pay Longs. This peer-to-peer premium payment occurs every 1 to 8 hours.
                  </p>
                </div>
              </div>

              {/* LIQUIDATION FORMULATION & CODE BLOCK */}
              <div className="p-space-md rounded-xl bg-surface-container-lowest flex flex-col gap-space-sm border border-surface-container-high/40">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-label-caps text-secondary uppercase">
                    MATHEMATICAL FORMULATION // LIQUIDATION PRICE
                  </span>
                  <span className="font-data-micro text-data-micro text-outline">ISOLATED / CROSS FORMULA</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md items-center">
                  <div className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant">
                    <p>
                      Isolated liquidation price (<code className="text-primary font-data-tabular">P_liq</code>) is the exact threshold where your remaining position margin fails to meet the Maintenance Margin Requirement (MMR):
                    </p>
                    <div className="p-space-sm rounded bg-surface-container-high font-data-metric text-headline-md text-primary font-bold tracking-wider">
                      P_liq(Long) = Entry × [ 1 − (1 / Lev) + MMR ]
                    </div>
                    <div className="p-space-sm rounded bg-surface-container-high font-data-metric text-headline-md text-error font-bold tracking-wider">
                      P_liq(Short) = Entry × [ 1 + (1 / Lev) − MMR ]
                    </div>
                  </div>

                  {/* Sample Calculator View */}
                  <div className="p-space-md rounded-lg bg-surface-container flex flex-col gap-space-xs border border-surface-container-high/40">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">
                      SAMPLE: SOL-PERP (ENTRY $210.00 | 20x LEV | 2.5% MMR)
                    </span>
                    <div className="grid grid-cols-2 gap-space-xs pt-1 font-data-tabular text-data-tabular">
                      <div className="p-2 rounded bg-surface-container-low flex flex-col">
                        <span className="text-outline text-data-micro">LONG LIQ PRICE</span>
                        <span className="text-error font-bold text-headline-md">$204.75</span>
                        <span className="text-data-micro text-error font-mono">-2.50% to Liquidation</span>
                      </div>
                      <div className="p-2 rounded bg-surface-container-low flex flex-col">
                        <span className="text-outline text-data-micro">SHORT LIQ PRICE</span>
                        <span className="text-secondary font-bold text-headline-md">$215.25</span>
                        <span className="text-data-micro text-secondary font-mono">+2.50% to Liquidation</span>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-error h-full w-[12%]" />
                    </div>
                    <span className="text-data-micro text-outline">
                      High-Leverage Cluster Warning: 20x allows only 5% nominal variance prior to full loss.
                    </span>
                  </div>
                </div>
              </div>

              {/* ORDER TYPES BREAKDOWN */}
              <div id="section-orders" className="flex flex-col gap-space-xs scroll-mt-24">
                <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Institutional Order Types &amp; Slippage Profiles
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-sm">
                  <div className="p-space-sm rounded-lg bg-surface-container flex flex-col gap-1 border border-surface-container-high/40">
                    <div className="flex items-center justify-between">
                      <span className="font-data-tabular text-data-tabular text-primary font-bold">Limit Order</span>
                      <span className="font-data-micro text-data-micro px-1 rounded bg-secondary/10 text-secondary">
                        Maker (Earn Rebate)
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Executes strictly at the specified price or better. Fills passive depth without aggressive market impact.
                    </p>
                  </div>
                  <div className="p-space-sm rounded-lg bg-surface-container flex flex-col gap-1 border border-surface-container-high/40">
                    <div className="flex items-center justify-between">
                      <span className="font-data-tabular text-data-tabular text-on-surface font-bold">Market Order</span>
                      <span className="font-data-micro text-data-micro px-1 rounded bg-error/10 text-error">
                        Taker (Pays Fee)
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Crosses the spread immediately to fill against top of book. Vulnerable to slippage in volatile order books.
                    </p>
                  </div>
                  <div className="p-space-sm rounded-lg bg-surface-container flex flex-col gap-1 border border-surface-container-high/40">
                    <div className="flex items-center justify-between">
                      <span className="font-data-tabular text-data-tabular text-secondary font-bold">Post-Only (ALO)</span>
                      <span className="font-data-micro text-data-micro px-1 rounded bg-primary/10 text-primary">
                        Strict Maker
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Guarantees maker liquidity. Auto-cancels if the order would instantly cross existing order book bids/asks.
                    </p>
                  </div>
                  <div className="p-space-sm rounded-lg bg-surface-container flex flex-col gap-1 border border-surface-container-high/40">
                    <div className="flex items-center justify-between">
                      <span className="font-data-tabular text-data-tabular text-error font-bold">Stop-Market</span>
                      <span className="font-data-micro text-data-micro px-1 rounded bg-surface-container-high text-outline">
                        Contingent
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Triggers a market order once the index or oracle breaches a price threshold. Standard stop-loss guard.
                    </p>
                  </div>
                  <div className="p-space-sm rounded-lg bg-surface-container flex flex-col gap-1 border border-surface-container-high/40">
                    <div className="flex items-center justify-between">
                      <span className="font-data-tabular text-data-tabular text-primary-container font-bold">Trailing Stop</span>
                      <span className="font-data-micro text-data-micro px-1 rounded bg-surface-container-high text-outline">
                        Dynamic Delta
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Follows positive price expansion by an offset buffer, locking in unrealized gains during continuous momentum runs.
                    </p>
                  </div>
                  <div className="p-space-sm rounded-lg bg-surface-container flex flex-col gap-1 border border-surface-container-high/40">
                    <div className="flex items-center justify-between">
                      <span className="font-data-tabular text-data-tabular text-tertiary-fixed font-bold">TWAP Slicer</span>
                      <span className="font-data-micro text-data-micro px-1 rounded bg-secondary/10 text-secondary">
                        Algorithmic
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Time-Weighted Average Price slicing orders into discrete micro-slices over duration to minimize market foot-print.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 3: Candlestick Anatomy & Technical Indicators */}
            <section
              id="section-candlesticks"
              className="p-space-lg md:p-space-xl rounded-xl bg-surface-container-low shadow-xl flex flex-col gap-space-lg border border-surface-container-high/60 scroll-mt-24"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-caps text-label-caps text-primary tracking-widest">
                    03 // QUANTITATIVE ANALYSIS
                  </span>
                  <span className="h-px flex-1 bg-surface-container-high" />
                </div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                  Candlestick Anatomy &amp; Core Algorithmic Indicators
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Every candlestick encapsulates four critical data boundaries: Open, High, Low, and Close (OHLC). PacificaPilot's neural models digest these micro-structures along with volume aggression vectors to determine signal confidence.
                </p>
              </div>

              {/* CANDLESTICK ANATOMY DIAGRAM */}
              <div className="w-full bg-surface-container-lowest p-space-md rounded-xl flex flex-col md:flex-row items-center justify-around gap-space-md border border-surface-container-high/40">
                {/* Bullish Candle SVG */}
                <div className="flex flex-col items-center gap-space-xs">
                  <span className="font-label-caps text-label-caps text-secondary uppercase font-bold">
                    BULLISH EXPANSION (CLOSE &gt; OPEN)
                  </span>
                  <svg className="w-48 h-64" fill="none" viewBox="0 0 180 240">
                    <line stroke="#70ffba" strokeDasharray="2 2" strokeWidth="2" x1="90" x2="90" y1="20" y2="220" />
                    <rect fill="#003822" height="110" rx="4" stroke="#70ffba" strokeWidth="2" width="80" x="50" y="60" />
                    <text fill="#dfe2ef" fontFamily="JetBrains Mono" fontSize="10" x="100" y="30">
                      High (Peak)
                    </text>
                    <text fill="#70ffba" fontFamily="JetBrains Mono" fontSize="11" fontWeight="700" x="140" y="70">
                      Close
                    </text>
                    <line stroke="#70ffba" strokeWidth="1" x1="130" x2="137" y1="67" y2="67" />
                    <text fill="#dfe2ef" fontFamily="Inter" fontSize="11" x="100" y="115">
                      Real Body
                    </text>
                    <text fill="#dfe2ef" fontFamily="JetBrains Mono" fontSize="11" x="140" y="172">
                      Open
                    </text>
                    <line stroke="#dfe2ef" strokeWidth="1" x1="130" x2="137" y1="169" y2="169" />
                    <text fill="#dfe2ef" fontFamily="JetBrains Mono" fontSize="10" x="100" y="215">
                      Low (Floor)
                    </text>
                    <text fill="#849495" fontFamily="JetBrains Mono" fontSize="9" x="15" y="45">
                      Upper Shadow
                    </text>
                    <text fill="#849495" fontFamily="JetBrains Mono" fontSize="9" x="15" y="195">
                      Lower Shadow
                    </text>
                  </svg>
                </div>

                {/* Bearish Candle SVG */}
                <div className="flex flex-col items-center gap-space-xs">
                  <span className="font-label-caps text-label-caps text-error uppercase font-bold">
                    BEARISH CONTRACTION (CLOSE &lt; OPEN)
                  </span>
                  <svg className="w-48 h-64" fill="none" viewBox="0 0 180 240">
                    <line stroke="#ffb4ab" strokeDasharray="2 2" strokeWidth="2" x1="90" x2="90" y1="20" y2="220" />
                    <rect fill="#690005" height="110" rx="4" stroke="#ffb4ab" strokeWidth="2" width="80" x="50" y="60" />
                    <text fill="#dfe2ef" fontFamily="JetBrains Mono" fontSize="10" x="100" y="30">
                      High (Peak)
                    </text>
                    <text fill="#dfe2ef" fontFamily="JetBrains Mono" fontSize="11" x="140" y="70">
                      Open
                    </text>
                    <line stroke="#dfe2ef" strokeWidth="1" x1="130" x2="137" y1="67" y2="67" />
                    <text fill="#dfe2ef" fontFamily="Inter" fontSize="11" x="100" y="115">
                      Real Body
                    </text>
                    <text fill="#ffb4ab" fontFamily="JetBrains Mono" fontSize="11" fontWeight="700" x="140" y="172">
                      Close
                    </text>
                    <line stroke="#ffb4ab" strokeWidth="1" x1="130" x2="137" y1="169" y2="169" />
                    <text fill="#dfe2ef" fontFamily="JetBrains Mono" fontSize="10" x="100" y="215">
                      Low (Floor)
                    </text>
                    <text fill="#849495" fontFamily="JetBrains Mono" fontSize="9" x="15" y="45">
                      Upper Shadow
                    </text>
                    <text fill="#849495" fontFamily="JetBrains Mono" fontSize="9" x="15" y="195">
                      Lower Shadow
                    </text>
                  </svg>
                </div>

                <div className="max-w-xs flex flex-col gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
                  <span className="font-label-caps text-label-caps text-primary uppercase">MOMENTUM INTERPRETATION</span>
                  <p>
                    <strong className="text-on-surface">Long wicks:</strong> Strong rejection of prices by liquidity providers at extreme ranges.
                  </p>
                  <p>
                    <strong className="text-on-surface">Wide Real Body:</strong> Conviction aggression where takers deplete opposing passive resting orders.
                  </p>
                  <p>
                    <strong className="text-on-surface">Doji (Zero Body):</strong> Equilibrium between buyers and sellers, often preceding volatility breakouts.
                  </p>
                </div>
              </div>

              {/* 4 CORE INDICATORS BREAKDOWN */}
              <div id="section-indicators" className="flex flex-col gap-space-xs scroll-mt-24">
                <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Core Quantitative Signals Monitored by Pacifica
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                  <div className="p-space-md rounded-xl bg-surface-container flex flex-col gap-space-xs shadow-md border border-surface-container-high/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                        <h4 className="font-headline-md text-headline-md text-on-surface font-bold">Relative Strength Index (RSI 14)</h4>
                      </div>
                      <span className="font-data-micro text-data-micro px-1.5 py-0.5 rounded bg-surface-container-high text-primary">
                        MOMENTUM OSCILLATOR
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Calculates velocity and magnitude of directional price movements on a scale of 0 to 100.
                    </p>
                    <div className="p-2 rounded bg-surface-container-lowest font-data-tabular text-data-tabular flex justify-between items-center text-data-micro">
                      <span>Overbought: &gt;70 (Mean Reversion Watch)</span>
                      <span>Oversold: &lt;30 (Capitulation Rebound)</span>
                    </div>
                    <p className="text-data-micro text-outline">
                      <strong>Quant Edge:</strong> Bullish divergence (lower price lows paired with higher RSI lows) signals severe seller exhaustion.
                    </p>
                  </div>

                  <div className="p-space-md rounded-xl bg-surface-container flex flex-col gap-space-xs shadow-md border border-surface-container-high/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                        <h4 className="font-headline-md text-headline-md text-on-surface font-bold">MACD (12, 26, 9)</h4>
                      </div>
                      <span className="font-data-micro text-data-micro px-1.5 py-0.5 rounded bg-surface-container-high text-secondary">
                        TREND ACCELERATION
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Moving Average Convergence Divergence tracks relationship between two exponential moving averages.
                    </p>
                    <div className="p-2 rounded bg-surface-container-lowest font-data-tabular text-data-tabular flex justify-between items-center text-data-micro">
                      <span>Fast Line: 12 EMA - 26 EMA</span>
                      <span>Signal Line: 9-day EMA of MACD</span>
                    </div>
                    <p className="text-data-micro text-outline">
                      <strong>Quant Edge:</strong> Histogram flip from negative to positive over zero-line flags algorithmic trend shifts.
                    </p>
                  </div>

                  <div className="p-space-md rounded-xl bg-surface-container flex flex-col gap-space-xs shadow-md border border-surface-container-high/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
                        <h4 className="font-headline-md text-headline-md text-on-surface font-bold">Cumulative Volume Delta (CVD)</h4>
                      </div>
                      <span className="font-data-micro text-data-micro px-1.5 py-0.5 rounded bg-surface-container-high text-primary-container">
                        ORDER FLOW AGGRESSION
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Measures net difference between taker market buy volume and taker market sell volume over continuous windows.
                    </p>
                    <div className="p-2 rounded bg-surface-container-lowest font-data-tabular text-data-tabular flex justify-between items-center text-data-micro">
                      <span>Delta = Taker Buy Vol − Taker Sell Vol</span>
                      <span>Absorption Detection</span>
                    </div>
                    <p className="text-data-micro text-outline">
                      <strong>Quant Edge:</strong> Price flat while CVD skyrockets flags passive limit absorption by institutional market makers.
                    </p>
                  </div>

                  <div className="p-space-md rounded-xl bg-surface-container flex flex-col gap-space-xs shadow-md border border-surface-container-high/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-tertiary" />
                        <h4 className="font-headline-md text-headline-md text-on-surface font-bold">Bollinger Bands (20, 2)</h4>
                      </div>
                      <span className="font-data-micro text-data-micro px-1.5 py-0.5 rounded bg-surface-container-high text-tertiary">
                        VOLATILITY ENVELOPE
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Envelopes plotted at two standard deviations above and below a 20-period simple moving average.
                    </p>
                    <div className="p-2 rounded bg-surface-container-lowest font-data-tabular text-data-tabular flex justify-between items-center text-data-micro">
                      <span>Bandwidth Squeeze: Imminent Expansion</span>
                      <span>Statistical Mean: SMA-20</span>
                    </div>
                    <p className="text-data-micro text-outline">
                      <strong>Quant Edge:</strong> Volatility squeezes compress standard deviation to cyclical lows before parabolic perp breakouts.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 4: How PacificaPilot Works (4-Stage Pipeline) */}
            <section
              id="section-engine"
              className="p-space-lg md:p-space-xl rounded-xl bg-surface-container-low shadow-xl flex flex-col gap-space-lg border border-surface-container-high/60 scroll-mt-24"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-caps text-label-caps text-primary tracking-widest">
                    04 // PROTOCOL PIPELINE
                  </span>
                  <span className="h-px flex-1 bg-surface-container-high" />
                </div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                  How PacificaPilot Works: Non-Custodial Algorithmic Intelligence
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  PacificaPilot operates as an autonomous mathematical abstraction layer above decentralized exchanges. Our nodes observe order flow telemetry, synthesize multi-factor risk scores, and present cryptographically verifiable trade setups without ever custodying user funds.
                </p>
              </div>

              {/* 4-STAGE PIPELINE CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-sm relative">
                <div className="p-space-md rounded-xl bg-surface-container flex flex-col gap-space-xs shadow-md border border-surface-container-high/40">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-primary">STAGE 01</span>
                    <span className="material-symbols-outlined text-primary text-[20px]">sensors</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Multi-Venue Ingestion</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Direct WebSocket feeds from Hyperliquid L2 nodes, Solana Drift RPC endpoints, Pyth Network oracle ticks, and social sentiment indexers.
                  </p>
                  <div className="mt-auto pt-2">
                    <span className="text-data-micro font-data-micro text-outline block">INGEST SPEED: 12,000 MSG/S</span>
                  </div>
                </div>

                <div className="p-space-md rounded-xl bg-surface-container flex flex-col gap-space-xs shadow-md border border-surface-container-high/40">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-secondary">STAGE 02</span>
                    <span className="material-symbols-outlined text-secondary text-[20px]">calculate</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Quant Normalization</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Mathematical normalization of Cumulative Volume Delta (CVD), open interest skew, liquidation pools, and real-time funding arbitrage spreads.
                  </p>
                  <div className="mt-auto pt-2">
                    <span className="text-data-micro font-data-micro text-outline block">COMPUTE LATENCY: 4.8MS</span>
                  </div>
                </div>

                <div className="p-space-md rounded-xl bg-surface-container flex flex-col gap-space-xs shadow-md border border-surface-container-high/40">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-primary-container">STAGE 03</span>
                    <span className="material-symbols-outlined text-primary-container text-[20px]">psychology</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-bold">AI Dispatch Engine</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Pacifica-Quant LLM evaluates risk profiles against Bayesian probabilistic setups, generating discrete entry, TP1/TP2, and invalidation stops.
                  </p>
                  <div className="mt-auto pt-2">
                    <span className="text-data-micro font-data-micro text-outline block">SCORING SCALE: 0 - 100 PTS</span>
                  </div>
                </div>

                <div
                  id="section-security"
                  className="p-space-md rounded-xl bg-surface-container flex flex-col gap-space-xs shadow-md border border-surface-container-high/40 scroll-mt-24"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-tertiary-fixed">STAGE 04</span>
                    <span className="material-symbols-outlined text-tertiary-fixed text-[20px]">security</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Client Observability</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Zero private keys. Read-only encrypted telemetry directly rendered in user's browser. Execution triggers sign payloads locally on user wallets.
                  </p>
                  <div className="mt-auto pt-2">
                    <span className="text-data-micro font-data-micro text-secondary block">100% NON-CUSTODIAL</span>
                  </div>
                </div>
              </div>

              {/* LIVE TELEMETRY INTERFACE PREVIEW BANNER */}
              <div className="p-space-md rounded-xl bg-surface-container-high flex flex-col lg:flex-row items-center justify-between gap-space-md border border-surface-container-high/60">
                <div className="flex items-center gap-space-md">
                  <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined text-[32px]">speed</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-label-caps text-label-caps text-secondary font-bold">COMPOSITE PROTOCOL GAUGE</span>
                      <span className="px-1.5 py-0.5 rounded bg-secondary/10 text-secondary font-data-micro text-data-micro">
                        GRADE: S-TIER
                      </span>
                    </div>
                    <h4 className="font-headline-md text-headline-md text-on-surface font-bold">
                      Pacifica Engine Telemetry: 92/100 Confidence Index
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Real-time cross-filtering active on 42 perpetual market pairs.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-space-sm w-full lg:w-auto">
                  <Link
                    to="/markets"
                    className="flex-1 lg:flex-none text-center px-space-md py-space-xs rounded bg-surface-container hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-colors"
                  >
                    Inspect Markets
                  </Link>
                  <Link
                    to="/dashboard"
                    className="flex-1 lg:flex-none text-center px-space-md py-space-xs rounded bg-primary-container text-on-primary-container hover:bg-primary-fixed font-label-md text-label-md font-semibold transition-colors"
                  >
                    Launch Dashboard
                  </Link>
                </div>
              </div>
            </section>

            {/* SECTION 5: Institutional Risk Warnings & Disclaimers */}
            <section
              id="section-risks"
              className="p-space-lg md:p-space-xl rounded-xl bg-surface-container-low shadow-xl flex flex-col gap-space-md border border-surface-container-high/60 scroll-mt-24"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-caps text-label-caps text-error tracking-widest">05 // RISK &amp; COMPLIANCE</span>
                  <span className="h-px flex-1 bg-surface-container-high" />
                </div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                  Institutional Risk Warnings &amp; Non-Custodial Disclosure
                </h2>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-high flex flex-col gap-space-sm border border-error/30">
                <div className="flex items-center gap-2 text-error">
                  <span className="material-symbols-outlined text-[24px]">crisis_alert</span>
                  <span className="font-headline-md text-headline-md font-bold tracking-tight">
                    HIGH-VOLATILITY DERIVATIVES WARNING
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface">
                  Trading cryptocurrency perpetual futures, options, and structured derivatives involves substantial risk of catastrophic capital loss. Leverage can work against you as aggressively as it can work for you.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm pt-2 font-body-sm text-body-sm text-on-surface-variant">
                  <div className="p-space-sm rounded bg-surface-container flex flex-col gap-1 border border-surface-container-high/40">
                    <span className="font-label-caps text-label-caps text-error">LIQUIDATION CASCADE RISK</span>
                    <p>During extreme network congestion or sudden market crashes, liquidation engines may cause extreme slippage and unrecoverable margin loss.</p>
                  </div>
                  <div className="p-space-sm rounded bg-surface-container flex flex-col gap-1 border border-surface-container-high/40">
                    <span className="font-label-caps text-label-caps text-on-surface">ORACLE DEVIATION &amp; STALE TICKS</span>
                    <p>Decentralized oracles (Pyth, Chainlink) may undergo latency divergence from off-chain venue prints during high volatility spikes.</p>
                  </div>
                  <div className="p-space-sm rounded bg-surface-container flex flex-col gap-1 border border-surface-container-high/40">
                    <span className="font-label-caps text-label-caps text-primary">STRICT READ-ONLY INTELLIGENCE</span>
                    <p>PacificaPilot is strictly an analytics dashboard and mathematical copilot. The protocol does not custody funds or provide financial advice.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 6: Frequently Asked Questions (FAQ) */}
            <section
              id="section-faq"
              className="p-space-lg md:p-space-xl rounded-xl bg-surface-container-low shadow-xl flex flex-col gap-space-lg border border-surface-container-high/60 scroll-mt-24"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-caps text-label-caps text-primary tracking-widest">06 // KNOWLEDGEBASE</span>
                  <span className="h-px flex-1 bg-surface-container-high" />
                </div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                  Frequently Asked Questions (FAQ)
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  In-depth operational details regarding non-custodial telemetry, mathematical factor weighting, and DEX order generation.
                </p>
              </div>

              {/* FAQ ACCORDION */}
              <div className="flex flex-col gap-space-xs">
                {FAQ_ITEMS.map((item, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div key={idx} className="rounded-xl bg-surface-container overflow-hidden transition-all border border-surface-container-high/40">
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="w-full p-space-md flex items-center justify-between text-left hover:bg-surface-container-high transition-colors"
                        type="button"
                      >
                        <span className="font-headline-md text-headline-md text-on-surface font-semibold">{item.q}</span>
                        <span
                          className="material-symbols-outlined text-on-surface-variant text-[20px] transition-transform"
                          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                        >
                          expand_more
                        </span>
                      </button>
                      {isOpen && (
                        <div className="p-space-md pt-0 text-on-surface-variant font-body-md text-body-md border-t border-surface-container-high/20">
                          <p>{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* SECTION 7: Footer Navigation & Next Steps */}
            <footer className="p-space-lg rounded-xl bg-surface-container-low shadow-md flex flex-col sm:flex-row items-center justify-between gap-space-md border border-surface-container-high/60">
              <Link
                to="/agents"
                className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Return to Agents Intelligence</span>
              </Link>
              <div className="flex items-center gap-space-sm">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-space-md py-space-xs rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">terminal</span>
                  <span>Open Terminal</span>
                </Link>
                <Link
                  to="/portfolio"
                  className="flex items-center gap-2 px-space-md py-space-xs rounded bg-primary-container text-on-primary-container hover:bg-primary-fixed font-label-md text-label-md font-semibold transition-colors"
                >
                  <span>Inspect Portfolio</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              </div>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
}
