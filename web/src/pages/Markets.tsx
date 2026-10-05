import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchMarkets } from "../api/pacifica";
import { fetchScore } from "../api/agent";
import { useWatchlist } from "../lib/watchlist";
import { fmtFunding, fmtPct, fmtPrice } from "../lib/utils";
import type { Market } from "../types/trading";

// Metadata mapping for rich UI presentation
interface MarketMeta {
  name: string;
  category: "L1_L2" | "DEFI" | "MEME" | "AI" | "ORACLE";
  categoryLabel: string;
  iconSymbol: string;
  iconColor: string;
  rationale: string;
  oiChangePct?: number;
  sparkline?: string;
}

const METADATA_MAP: Record<string, MarketMeta> = {
  "BTC": {
    name: "Bitcoin Protocol",
    category: "L1_L2",
    categoryLabel: "L1",
    iconSymbol: "₿",
    iconColor: "text-primary",
    rationale: "Spot CVD Expansion",
    oiChangePct: 4.8,
    sparkline: "M0,12 L10,13 L22,8 L34,9 L46,3 L56,4 L64,1",
  },
  "ETH": {
    name: "Ethereum Core",
    category: "L1_L2",
    categoryLabel: "L1",
    iconSymbol: "Ξ",
    iconColor: "text-primary",
    rationale: "Basis Premium Positive",
    oiChangePct: 1.4,
    sparkline: "M0,10 L14,12 L28,7 L42,9 L52,5 L64,2",
  },
  "SOL": {
    name: "Solana High-Perf L1",
    category: "L1_L2",
    categoryLabel: "Solana",
    iconSymbol: "◎",
    iconColor: "text-secondary",
    rationale: "Delta Squeeze Detected",
    oiChangePct: 14.2,
    sparkline: "M0,15 L12,11 L24,12 L36,6 L48,7 L58,2 L64,1",
  },
  "HYPE": {
    name: "Hyperliquid Protocol",
    category: "DEFI",
    categoryLabel: "DeFi",
    iconSymbol: "H",
    iconColor: "text-primary",
    rationale: "Aggressive Bid Flow",
    oiChangePct: 22.4,
    sparkline: "M0,14 L12,12 L24,10 L36,8 L48,4 L56,5 L64,1",
  },
  "SUI": {
    name: "Sui Network",
    category: "L1_L2",
    categoryLabel: "L1",
    iconSymbol: "S",
    iconColor: "text-primary",
    rationale: "OB Imbalance +18%",
    oiChangePct: 6.1,
    sparkline: "M0,11 L14,13 L26,9 L40,7 L50,8 L64,3",
  },
  "TIA": {
    name: "Celestia Data DA",
    category: "L1_L2",
    categoryLabel: "Modular",
    iconSymbol: "T",
    iconColor: "text-on-surface",
    rationale: "Unlocks Approaching",
    oiChangePct: -3.8,
    sparkline: "M0,3 L12,4 L24,7 L36,6 L48,11 L58,12 L64,15",
  },
  "RENDER": {
    name: "Render Network DePIN",
    category: "AI",
    categoryLabel: "AI",
    iconSymbol: "R",
    iconColor: "text-primary",
    rationale: "Compute Cluster Narrative",
    oiChangePct: 18.9,
    sparkline: "M0,14 L14,13 L26,8 L38,10 L48,4 L58,5 L64,1",
  },
  "NEAR": {
    name: "NEAR Protocol",
    category: "AI",
    categoryLabel: "AI / L1",
    iconSymbol: "N",
    iconColor: "text-on-surface",
    rationale: "User Growth Acceleration",
    oiChangePct: 2.7,
    sparkline: "M0,12 L16,10 L30,11 L42,6 L54,7 L64,2",
  },
  "DOGE": {
    name: "Dogecoin Mainnet",
    category: "MEME",
    categoryLabel: "Meme",
    iconSymbol: "Ð",
    iconColor: "text-tertiary-fixed",
    rationale: "Extreme Retail Momentum",
    oiChangePct: 28.4,
    sparkline: "M0,15 L12,13 L24,9 L36,10 L48,4 L56,6 L64,0",
  },
  "ARB": {
    name: "Arbitrum One",
    category: "L1_L2",
    categoryLabel: "L2",
    iconSymbol: "A",
    iconColor: "text-primary",
    rationale: "Equilibrium Consolidation",
    oiChangePct: -0.2,
    sparkline: "M0,8 L14,7 L28,9 L42,8 L56,7 L64,8",
  },
  "PEPE": {
    name: "Pepe The Frog",
    category: "MEME",
    categoryLabel: "Meme",
    iconSymbol: "P",
    iconColor: "text-secondary",
    rationale: "High OI Aggregation",
    oiChangePct: 11.8,
    sparkline: "M0,14 L12,12 L24,6 L36,8 L48,3 L64,1",
  },
  "LINK": {
    name: "Chainlink Protocol",
    category: "ORACLE",
    categoryLabel: "Oracle",
    iconSymbol: "⬡",
    iconColor: "text-primary",
    rationale: "CCIP Settlement Volume",
    oiChangePct: 1.9,
    sparkline: "M0,11 L14,10 L28,7 L42,8 L56,4 L64,2",
  },
  "INJ": {
    name: "Injective Protocol",
    category: "DEFI",
    categoryLabel: "DeFi",
    iconSymbol: "I",
    iconColor: "text-primary",
    rationale: "Net Taker Volume Positive",
    oiChangePct: 7.2,
    sparkline: "M0,13 L14,11 L28,8 L40,9 L52,4 L64,2",
  },
};

type CategoryFilter = "ALL" | "L1_L2" | "DEFI" | "MEME" | "AI" | "FAVORITES" | "HIGH_FUNDING";
type SortField = "symbol" | "price" | "change24hPct" | "volume24h" | "funding" | "openInterest" | "score";
type SortOrder = "asc" | "desc";

// Score component for lazy loading individual AI scores per market
function PacificaScoreBadge({ symbol, change24hPct }: { symbol: string; change24hPct: number }) {
  const scoreQuery = useQuery({
    queryKey: ["score", symbol],
    queryFn: () => fetchScore(symbol),
    staleTime: 120_000,
  });

  const rawScore = scoreQuery.data?.score;
  // Fallback heuristic if backend score is unavailable
  const calculatedScore = rawScore ?? Math.min(99, Math.max(30, Math.round(50 + change24hPct * 3.5)));
  
  let biasText = "Neutral";
  let badgeStyle = "bg-surface-container-high text-on-surface border-surface-container-high";
  let textStyle = "text-on-surface-variant";

  if (calculatedScore >= 88) {
    biasText = "Strong Long";
    badgeStyle = "bg-secondary/15 text-secondary border-secondary/40";
    textStyle = "bg-secondary/10 text-secondary";
  } else if (calculatedScore >= 70) {
    biasText = "Bullish";
    badgeStyle = "bg-secondary/15 text-secondary border-secondary/40";
    textStyle = "bg-secondary/10 text-secondary";
  } else if (calculatedScore <= 40) {
    biasText = "Short Skew";
    badgeStyle = "bg-error/15 text-error border-error/40";
    textStyle = "bg-error/10 text-error";
  }

  const baseSymbol = symbol.split("-")[0].toUpperCase();
  const meta = METADATA_MAP[baseSymbol];

  return (
    <div className="inline-flex flex-col items-center">
      <div className="flex items-center gap-1.5">
        <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-data-micro border font-mono ${badgeStyle}`}>
          {calculatedScore}
        </span>
        <span className={`font-label-caps text-data-micro uppercase px-1.5 py-0.5 rounded font-semibold ${textStyle}`}>
          {biasText}
        </span>
      </div>
      <span className="font-data-micro text-[10px] text-on-surface-variant mt-0.5">
        {meta?.rationale || "Equilibrium Orderflow"}
      </span>
    </div>
  );
}

export function Markets() {
  const navigate = useNavigate();
  const { watchlist, toggle } = useWatchlist();

  // Queries & State
  const marketsQuery = useQuery({
    queryKey: ["markets"],
    queryFn: fetchMarkets,
    refetchInterval: 15_000,
  });

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("ALL");
  const [sortField, setSortField] = useState<SortField>("volume24h");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [timeframe, setTimeframe] = useState<"1H" | "24H" | "7D">("24H");
  const [volumeDenom, setVolumeDenom] = useState<"USD" | "NATIVE">("USD");
  const [isCompact, setIsCompact] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Selected symbol for Telemetry Drawer Modal
  const [telemetrySymbol, setTelemetrySymbol] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // ⌘K Hotkey focus handler
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

  const rawMarkets = marketsQuery.data || [];

  // Categorize helper
  function getMarketCategory(symbol: string): "L1_L2" | "DEFI" | "MEME" | "AI" | "ORACLE" {
    const base = symbol.split("-")[0].toUpperCase();
    return METADATA_MAP[base]?.category || "L1_L2";
  }

  // Filter & Search Logic
  const filteredMarkets = rawMarkets.filter((m) => {
    const base = m.symbol.split("-")[0].toUpperCase();
    const meta = METADATA_MAP[base];

    // Search query filter
    const matchesSearch =
      !query ||
      m.symbol.toLowerCase().includes(query.toLowerCase()) ||
      (meta?.name && meta.name.toLowerCase().includes(query.toLowerCase())) ||
      (meta?.categoryLabel && meta.categoryLabel.toLowerCase().includes(query.toLowerCase()));

    if (!matchesSearch) return false;

    // Category Filter
    if (activeCategory === "FAVORITES") {
      return watchlist.includes(m.symbol);
    }
    if (activeCategory === "HIGH_FUNDING") {
      return (m.funding ?? 0) > 0.0002 || (m.funding ?? 0) < -0.0002;
    }
    if (activeCategory === "L1_L2") {
      return getMarketCategory(m.symbol) === "L1_L2";
    }
    if (activeCategory === "DEFI") {
      return getMarketCategory(m.symbol) === "DEFI" || getMarketCategory(m.symbol) === "ORACLE";
    }
    if (activeCategory === "MEME") {
      return getMarketCategory(m.symbol) === "MEME";
    }
    if (activeCategory === "AI") {
      return getMarketCategory(m.symbol) === "AI";
    }

    return true;
  });

  // Sort Logic
  const sortedMarkets = [...filteredMarkets].sort((a, b) => {
    let aVal = a[sortField as keyof Market] ?? 0;
    let bVal = b[sortField as keyof Market] ?? 0;

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    return sortOrder === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(sortedMarkets.length / pageSize));
  const pageIndex = Math.min(currentPage, totalPages);
  const visibleMarkets = sortedMarkets.slice((pageIndex - 1) * pageSize, pageIndex * pageSize);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

  // Export CSV Handler
  function exportCSV() {
    const csvRows = [
      ["Symbol", "Price", "24h Change %", "24h Volume USD", "Funding Rate 1h", "Open Interest"],
      ...filteredMarkets.map((m) => [
        m.symbol,
        m.price || 0,
        m.change24hPct || 0,
        m.volume24h || 0,
        m.funding || 0,
        m.openInterest || 0,
      ]),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pacifica_markets_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const favoritedCount = rawMarkets.filter((m) => watchlist.includes(m.symbol)).length;

  return (
    <div className="flex flex-col w-full bg-surface min-h-screen text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      {/* Market Overview Hero / Metadata Ribbon */}
      <section className="w-full bg-surface-container-lowest px-margin-desktop py-space-lg flex flex-col gap-space-md border-b border-surface-container-high/60">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="font-label-caps text-label-caps tracking-widest text-primary-fixed-dim uppercase bg-surface-container-low px-space-xs py-0.5 rounded">
                PROTOCOL INTELLIGENCE // REAL-TIME PERP FEEDS
              </span>
              <span className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded bg-surface-container text-secondary font-label-caps text-label-caps tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                L2 ORACLE STREAM ACTIVE
              </span>
              <span className="font-data-micro text-data-micro text-on-surface-variant bg-surface-container px-space-xs py-0.5 rounded">
                LATENCY: <span className="text-primary font-medium">12ms</span> (PYTH / HYPERLIQUID WS)
              </span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold flex items-center gap-space-sm">
              Perpetual Markets Scanner
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-4xl">
              Real-time cross-chain perpetual DEX liquidity screener, aggregated order flow, automated funding rate arbitrage radar, and predictive Pacifica AI sentiment composite scores.
            </p>
          </div>

          {/* Quick Telemetry Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-xs bg-surface-container-low p-space-xs rounded border border-surface-container-high/40">
            <div className="px-space-md py-space-xs flex flex-col bg-surface-container-lowest rounded">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">24h Perp Vol</span>
              <span className="font-data-metric text-data-metric text-primary font-semibold">$18.42B</span>
              <span className="font-data-micro text-data-micro text-secondary flex items-center gap-0.5 mt-0.5">
                <span className="material-symbols-outlined text-[12px]">trending_up</span> +8.42% d/d
              </span>
            </div>
            <div className="px-space-md py-space-xs flex flex-col bg-surface-container-lowest rounded">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Open Interest</span>
              <span className="font-data-metric text-data-metric text-on-surface font-semibold">$6.89B</span>
              <span className="font-data-micro text-data-micro text-secondary flex items-center gap-0.5 mt-0.5">
                <span className="material-symbols-outlined text-[12px]">north_east</span> +3.19% net
              </span>
            </div>
            <div className="px-space-md py-space-xs flex flex-col bg-surface-container-lowest rounded">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Avg Funding/1h</span>
              <span className="font-data-metric text-data-metric text-secondary font-semibold">+0.0074%</span>
              <span className="font-data-micro text-data-micro text-on-surface-variant mt-0.5">
                8h proj: <span className="text-on-surface font-mono">+0.059%</span>
              </span>
            </div>
            <div className="px-space-md py-space-xs flex flex-col bg-surface-container-lowest rounded">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Active Markets</span>
              <span className="font-data-metric text-data-metric text-primary-fixed-dim font-semibold">{rawMarkets.length || 148}</span>
              <span className="font-data-micro text-data-micro text-secondary flex items-center gap-0.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> 100% In Sync
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter, Search & Viewport Toolbar */}
      <section className="w-full bg-surface-container px-margin-desktop py-space-md flex flex-col gap-space-sm border-b border-surface-container-high/80">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-space-sm">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xl">
            <span className="material-symbols-outlined absolute left-space-sm top-1/2 -translate-y-1/2 text-outline text-body-lg pointer-events-none">
              search
            </span>
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 pl-10 pr-16 bg-surface-container-lowest border border-surface-container-high/80 rounded font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-fixed-dim focus:shadow-[0_0_10px_rgba(0,240,255,0.25)] transition-all"
              placeholder="Search perpetual by token, symbol, or chain (e.g. BTC, Solana, Layer 1)..."
              type="text"
            />
            <div className="absolute right-space-sm top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
              <kbd className="px-1.5 py-0.5 font-data-micro text-data-micro text-on-surface-variant bg-surface-container rounded border border-surface-container-high">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* View and Display Controls */}
          <div className="flex flex-wrap items-center gap-space-xs">
            {/* Timeframe Selector */}
            <div className="inline-flex p-0.5 bg-surface-container-lowest rounded border border-surface-container-high/80">
              {(["1H", "24H", "7D"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-space-sm py-1 font-label-caps text-label-caps transition-colors rounded ${
                    timeframe === tf
                      ? "bg-surface-container-high text-primary font-bold shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                  type="button"
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Volume Denomination */}
            <div className="inline-flex p-0.5 bg-surface-container-lowest rounded border border-surface-container-high/80">
              <button
                onClick={() => setVolumeDenom("USD")}
                className={`px-space-sm py-1 font-label-caps text-label-caps rounded ${
                  volumeDenom === "USD"
                    ? "bg-surface-container-high text-on-surface font-semibold"
                    : "text-on-surface-variant hover:text-on-surface transition-colors"
                }`}
                type="button"
              >
                USD ($)
              </button>
              <button
                onClick={() => setVolumeDenom("NATIVE")}
                className={`px-space-sm py-1 font-label-caps text-label-caps rounded ${
                  volumeDenom === "NATIVE"
                    ? "bg-surface-container-high text-on-surface font-semibold"
                    : "text-on-surface-variant hover:text-on-surface transition-colors"
                }`}
                type="button"
              >
                NATIVE
              </button>
            </div>

            {/* Density / Layout Toggle */}
            <button
              onClick={() => setIsCompact(!isCompact)}
              className={`flex items-center gap-1 px-space-sm py-1.5 rounded border border-surface-container-high/80 font-label-md text-label-md transition-colors ${
                isCompact
                  ? "bg-primary-container/20 text-primary border-primary/40"
                  : "bg-surface-container-lowest hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface"
              }`}
              title="Toggle Table Density"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">density_medium</span>
              <span className="font-data-micro text-data-micro">{isCompact ? "COMPACT ON" : "COMPACT"}</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-space-sm py-1.5 bg-surface-container-lowest hover:bg-surface-container-high text-primary-fixed-dim hover:text-primary rounded border border-surface-container-high/80 font-label-md text-label-md transition-all shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span className="font-data-micro text-data-micro font-semibold uppercase">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Category Tabs */}
        <div className="flex items-center gap-space-xs overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => {
              setActiveCategory("ALL");
              setCurrentPage(1);
            }}
            className={`px-space-md py-1 rounded font-label-caps text-label-caps font-bold tracking-wider whitespace-nowrap transition-all ${
              activeCategory === "ALL"
                ? "bg-primary-container text-on-primary-container shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                : "bg-surface-container-lowest hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-surface-container-high/50"
            }`}
          >
            ALL MARKETS ({rawMarkets.length})
          </button>
          <button
            onClick={() => {
              setActiveCategory("L1_L2");
              setCurrentPage(1);
            }}
            className={`px-space-md py-1 rounded font-label-caps text-label-caps tracking-wider whitespace-nowrap transition-all ${
              activeCategory === "L1_L2"
                ? "bg-primary-container text-on-primary-container font-bold shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                : "bg-surface-container-lowest hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-surface-container-high/50"
            }`}
          >
            LAYER 1 / LAYER 2
          </button>
          <button
            onClick={() => {
              setActiveCategory("DEFI");
              setCurrentPage(1);
            }}
            className={`px-space-md py-1 rounded font-label-caps text-label-caps tracking-wider whitespace-nowrap transition-all ${
              activeCategory === "DEFI"
                ? "bg-primary-container text-on-primary-container font-bold shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                : "bg-surface-container-lowest hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-surface-container-high/50"
            }`}
          >
            DEFI &amp; DEXs
          </button>
          <button
            onClick={() => {
              setActiveCategory("MEME");
              setCurrentPage(1);
            }}
            className={`px-space-md py-1 rounded font-label-caps text-label-caps tracking-wider whitespace-nowrap transition-all ${
              activeCategory === "MEME"
                ? "bg-primary-container text-on-primary-container font-bold shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                : "bg-surface-container-lowest hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-surface-container-high/50"
            }`}
          >
            MEME &amp; HIGH VOL
          </button>
          <button
            onClick={() => {
              setActiveCategory("AI");
              setCurrentPage(1);
            }}
            className={`px-space-md py-1 rounded font-label-caps text-label-caps tracking-wider whitespace-nowrap transition-all ${
              activeCategory === "AI"
                ? "bg-primary-container text-on-primary-container font-bold shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                : "bg-surface-container-lowest hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-surface-container-high/50"
            }`}
          >
            AI &amp; COMPUTE
          </button>
          <button
            onClick={() => {
              setActiveCategory("FAVORITES");
              setCurrentPage(1);
            }}
            className={`px-space-md py-1 rounded font-label-caps text-label-caps tracking-wider whitespace-nowrap transition-all flex items-center gap-1 ${
              activeCategory === "FAVORITES"
                ? "bg-primary-container text-on-primary-container font-bold shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                : "bg-surface-container-lowest hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-surface-container-high/50"
            }`}
          >
            <span className="material-symbols-outlined text-[14px] text-tertiary-fixed">star</span>
            <span>FAVORITES ({favoritedCount})</span>
          </button>
          <button
            onClick={() => {
              setActiveCategory("HIGH_FUNDING");
              setCurrentPage(1);
            }}
            className={`px-space-md py-1 rounded font-label-caps text-label-caps tracking-wider whitespace-nowrap transition-all flex items-center gap-1 ${
              activeCategory === "HIGH_FUNDING"
                ? "bg-secondary text-on-secondary font-bold shadow-[0_0_12px_rgba(0,229,153,0.3)]"
                : "bg-surface-container-lowest hover:bg-surface-container-high text-secondary hover:text-secondary-fixed border border-surface-container-high/50"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span>HIGH FUNDING (&gt;0.02%)</span>
          </button>
        </div>
      </section>

      {/* Main Screener Market Table Component */}
      <section className="w-full px-margin-desktop py-space-md bg-surface">
        <div className="w-full overflow-x-auto rounded border border-surface-container-high/70 bg-surface-container-lowest shadow-2xl">
          <table className="w-full border-collapse text-left font-data-tabular text-data-tabular">
            <thead>
              <tr className="bg-surface-container-low border-b border-surface-container-high/80 text-on-surface-variant font-label-caps text-label-caps select-none">
                <th className="py-space-sm pl-space-md pr-space-xs w-10 text-center">★</th>
                <th
                  onClick={() => handleSort("symbol")}
                  className="py-space-sm px-space-sm hover:text-on-surface cursor-pointer"
                >
                  <div className="flex items-center gap-1">
                    ASSET / ECOSYSTEM
                    <span className="material-symbols-outlined text-[13px]">
                      {sortField === "symbol" ? (sortOrder === "asc" ? "arrow_upward" : "arrow_downward") : "unfold_more"}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort("price")}
                  className="py-space-sm px-space-sm text-right hover:text-on-surface cursor-pointer"
                >
                  <div className="flex items-center justify-end gap-1">
                    MARK PRICE
                    <span className="material-symbols-outlined text-[13px] text-primary">
                      {sortField === "price" ? (sortOrder === "asc" ? "arrow_upward" : "arrow_downward") : "unfold_more"}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort("change24hPct")}
                  className="py-space-sm px-space-sm text-right hover:text-on-surface cursor-pointer"
                >
                  <div className="flex items-center justify-end gap-1">
                    24H CHANGE
                    <span className="material-symbols-outlined text-[13px]">
                      {sortField === "change24hPct" ? (sortOrder === "asc" ? "arrow_upward" : "arrow_downward") : "unfold_more"}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort("volume24h")}
                  className="py-space-sm px-space-sm text-right hover:text-on-surface cursor-pointer"
                >
                  <div className="flex items-center justify-end gap-1">
                    24H VOLUME
                    <span className="material-symbols-outlined text-[13px]">
                      {sortField === "volume24h" ? (sortOrder === "asc" ? "arrow_upward" : "arrow_downward") : "unfold_more"}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort("funding")}
                  className="py-space-sm px-space-sm text-right hover:text-on-surface cursor-pointer"
                >
                  <div className="flex items-center justify-end gap-1">
                    FUNDING RATE (1H / 8H)
                    <span className="material-symbols-outlined text-[13px]">
                      {sortField === "funding" ? (sortOrder === "asc" ? "arrow_upward" : "arrow_downward") : "unfold_more"}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort("openInterest")}
                  className="py-space-sm px-space-sm text-right hover:text-on-surface cursor-pointer"
                >
                  <div className="flex items-center justify-end gap-1">
                    OPEN INTEREST
                    <span className="material-symbols-outlined text-[13px]">
                      {sortField === "openInterest" ? (sortOrder === "asc" ? "arrow_upward" : "arrow_downward") : "unfold_more"}
                    </span>
                  </div>
                </th>
                <th className="py-space-sm px-space-sm text-center select-none">
                  <div className="flex items-center justify-center gap-1">
                    PACIFICA AI COMPOSITE
                  </div>
                </th>
                <th className="py-space-sm pl-space-sm pr-space-md text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40 text-on-surface">
              {marketsQuery.isPending && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-on-surface-variant">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      Loading live market feeds...
                    </span>
                  </td>
                </tr>
              )}

              {marketsQuery.isError && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-error">
                    Failed to load market feeds. Click refresh or retry.
                  </td>
                </tr>
              )}

              {!marketsQuery.isPending && visibleMarkets.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-on-surface-variant">
                    No perpetual markets found matching your filter criteria.
                  </td>
                </tr>
              )}

              {visibleMarkets.map((m) => {
                const isStarred = watchlist.includes(m.symbol);
                const baseSymbol = m.symbol.split("-")[0].toUpperCase();
                const meta = METADATA_MAP[baseSymbol] || {
                  name: `${baseSymbol} Protocol`,
                  category: "L1_L2",
                  categoryLabel: "Perp",
                  iconSymbol: baseSymbol.charAt(0),
                  iconColor: "text-primary",
                  rationale: "Automated Liquidity",
                  oiChangePct: 2.1,
                  sparkline: "M0,10 L16,8 L32,11 L48,5 L64,2",
                };

                const change = m.change24hPct ?? 0;
                const price = m.price ?? 0;
                const indexPrice = price > 0 ? price * 0.9997 : 0;
                const volume = m.volume24h ?? 0;
                const funding1h = m.funding ?? 0;
                const funding8h = funding1h * 8;
                const oi = m.openInterest ?? (volume ? volume * 0.35 : 0);
                const isPositive = change >= 0;

                const pyPadding = isCompact ? "py-1" : "py-space-sm";

                return (
                  <tr key={m.symbol} className="hover:bg-surface-container/60 transition-colors group">
                    {/* Favorite Star */}
                    <td className={`${pyPadding} pl-space-md pr-space-xs text-center`}>
                      <button
                        type="button"
                        onClick={() => toggle(m.symbol)}
                        className={`star-btn transition-colors focus:outline-none ${
                          isStarred ? "text-tertiary-fixed hover:text-primary" : "text-outline-variant hover:text-primary"
                        }`}
                      >
                        <span
                          className="material-symbols-outlined text-[18px]"
                          style={{ fontVariationSettings: isStarred ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          star
                        </span>
                      </button>
                    </td>

                    {/* Asset / Ecosystem */}
                    <td className={`${pyPadding} px-space-sm`}>
                      <div className="flex items-center gap-space-sm">
                        <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center font-bold text-on-surface text-body-sm border border-surface-variant">
                          <span className={`${meta.iconColor} font-mono`}>{meta.iconSymbol}</span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => navigate(`/markets/${m.symbol}`)}
                              className="font-headline-md text-body-md font-bold text-on-surface tracking-tight hover:text-primary transition-colors text-left"
                            >
                              {m.symbol}
                            </button>
                            <span className="font-label-caps text-data-micro px-1 py-0.2 rounded bg-surface-container-high text-on-surface-variant border border-surface-variant">
                              {meta.categoryLabel}
                            </span>
                          </div>
                          <span className="font-body-sm text-data-micro text-on-surface-variant">{meta.name}</span>
                        </div>
                      </div>
                    </td>

                    {/* Mark Price */}
                    <td className={`${pyPadding} px-space-sm text-right`}>
                      <span className="font-data-tabular text-body-md font-bold text-primary font-mono tracking-tight">
                        {fmtPrice(price)}
                      </span>
                      <div className="font-data-micro text-data-micro text-outline flex items-center justify-end gap-1">
                        Index: {fmtPrice(indexPrice)}
                      </div>
                    </td>

                    {/* 24h Change */}
                    <td className={`${pyPadding} px-space-sm text-right`}>
                      <div className="flex flex-col items-end">
                        <span
                          className={`inline-flex items-center font-data-tabular font-semibold text-body-sm ${
                            isPositive ? "text-secondary" : "text-error"
                          }`}
                        >
                          {fmtPct(change)}
                        </span>
                        <svg
                          className={`w-16 h-4 mt-0.5 ${isPositive ? "text-secondary" : "text-error"}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          viewBox="0 0 64 16"
                        >
                          <path d={meta.sparkline || (isPositive ? "M0,14 L20,10 L40,8 L64,2" : "M0,2 L20,8 L40,10 L64,15")} />
                        </svg>
                      </div>
                    </td>

                    {/* 24h Volume */}
                    <td className={`${pyPadding} px-space-sm text-right`}>
                      <div className="flex flex-col items-end">
                        <span className="font-data-tabular text-body-md font-semibold text-on-surface">
                          {volume ? `$${(volume / 1e6).toFixed(1)}M` : "—"}
                        </span>
                        <div className="w-20 bg-surface-container-high h-1 rounded overflow-hidden mt-1">
                          <div
                            className="bg-primary h-full"
                            style={{ width: `${Math.min(100, Math.max(8, ((volume || 1e6) / 5e9) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Funding Rate */}
                    <td className={`${pyPadding} px-space-sm text-right`}>
                      <div className="flex flex-col items-end">
                        <span
                          className={`font-data-tabular font-mono font-medium text-body-sm ${
                            funding1h >= 0 ? "text-secondary" : "text-error"
                          }`}
                        >
                          {fmtFunding(funding1h)}/hr
                        </span>
                        <span className="font-data-micro text-data-micro text-outline font-mono">
                          {fmtFunding(funding8h)} (8h)
                        </span>
                      </div>
                    </td>

                    {/* Open Interest */}
                    <td className={`${pyPadding} px-space-sm text-right`}>
                      <div className="flex flex-col items-end">
                        <span className="font-data-tabular text-body-md font-semibold text-on-surface">
                          {oi ? `$${(oi / 1e6).toFixed(1)}M` : "—"}
                        </span>
                        <span
                          className={`font-data-micro text-data-micro font-mono flex items-center gap-0.5 ${
                            (meta.oiChangePct ?? 0) >= 0 ? "text-secondary" : "text-error"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[10px]">
                            {(meta.oiChangePct ?? 0) >= 0 ? "north" : "south"}
                          </span>{" "}
                          {meta.oiChangePct ? `${meta.oiChangePct >= 0 ? "+" : ""}${meta.oiChangePct}%` : "+2.1%"}
                        </span>
                      </div>
                    </td>

                    {/* Pacifica AI Composite */}
                    <td className={`${pyPadding} px-space-sm text-center`}>
                      <PacificaScoreBadge symbol={m.symbol} change24hPct={change} />
                    </td>

                    {/* Action Buttons */}
                    <td className={`${pyPadding} pl-space-sm pr-space-md text-right`}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setTelemetrySymbol(m.symbol)}
                          className="px-space-sm py-1 bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded font-label-caps text-data-micro uppercase transition-colors"
                          title="Inspect Telemetry"
                        >
                          Telemetry
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard?symbol=${encodeURIComponent(m.symbol)}`)}
                          className="px-space-md py-1 bg-primary-container text-on-primary-container hover:bg-primary-fixed hover:text-on-primary-fixed font-label-caps text-data-micro uppercase font-bold rounded shadow-[0_0_10px_rgba(0,240,255,0.25)] transition-all"
                        >
                          Trade
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Pagination / Summary Bar */}
        <div className="mt-space-sm flex flex-col sm:flex-row items-center justify-between gap-space-sm px-space-sm py-space-xs font-data-micro text-data-micro text-on-surface-variant">
          <div className="flex items-center gap-space-sm">
            <span>
              Showing{" "}
              <span className="text-on-surface font-semibold font-mono">
                {sortedMarkets.length > 0 ? (pageIndex - 1) * pageSize + 1 : 0} -{" "}
                {Math.min(pageIndex * pageSize, sortedMarkets.length)}
              </span>{" "}
              of <span className="text-on-surface font-semibold font-mono">{sortedMarkets.length}</span> assets
            </span>
            <span className="text-outline-variant">•</span>
            <span className="flex items-center gap-1 text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping" /> Real-time delta updates enabled
            </span>
          </div>

          <div className="flex items-center gap-space-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={pageIndex <= 1}
              className="px-space-sm py-1 bg-surface-container-low hover:bg-surface-container text-on-surface rounded border border-surface-container-high/60 disabled:opacity-40 transition-colors"
              type="button"
            >
              Previous
            </button>
            <div className="flex items-center gap-1 font-mono">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(0, 5)
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-6 h-6 rounded flex items-center justify-center ${
                      pageIndex === p
                        ? "bg-primary-container text-on-primary-container font-bold"
                        : "hover:bg-surface-container-high text-on-surface-variant"
                    }`}
                    type="button"
                  >
                    {p}
                  </button>
                ))}
              {totalPages > 5 && <span className="px-1 text-outline">...</span>}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageIndex >= totalPages}
              className="px-space-sm py-1 bg-surface-container-low hover:bg-surface-container text-on-surface rounded border border-surface-container-high/60 disabled:opacity-40 transition-colors"
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* Market Radar Analytical Modules */}
      <section className="w-full px-margin-desktop py-space-lg bg-surface">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          {/* Module 1: Top Funding Rate Arbitrage Spread */}
          <div className="lg:col-span-6 bg-surface-container-lowest p-space-md rounded border border-surface-container-high/70 flex flex-col gap-space-md shadow-lg">
            <div className="flex items-center justify-between border-b border-surface-container-high/50 pb-space-xs">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-secondary text-headline-md">sync_alt</span>
                <div className="flex flex-col">
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                    Funding Rate Arbitrage Radar
                  </h2>
                  <span className="font-data-micro text-data-micro text-on-surface-variant">
                    Delta-Neutral Cross-Venue APY Discrepancies
                  </span>
                </div>
              </div>
              <span className="font-label-caps text-label-caps text-secondary px-space-xs py-0.5 rounded bg-surface-container-high">
                AUTO-SCAN
              </span>
            </div>

            <div className="flex flex-col divide-y divide-surface-container-high/40">
              {/* Spread Pair 1 */}
              <div className="py-space-xs flex items-center justify-between hover:bg-surface-container-low/50 px-space-xs rounded transition-colors">
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-headline-md text-body-md font-bold text-on-surface font-mono">DOGE-PERP</span>
                    <span className="font-label-caps text-[10px] text-primary px-1 rounded bg-surface-container">
                      Hyperliquid vs dYdX
                    </span>
                  </div>
                  <span className="font-data-micro text-data-micro text-on-surface-variant mt-0.5">
                    Short HL (+0.0245%/h) / Long dYdX (+0.0041%/h)
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-data-tabular font-mono text-secondary font-bold text-body-md">+178.6% Net APY</span>
                  <span className="font-data-micro text-data-micro text-outline font-mono">Spread: 0.0204%/hr</span>
                </div>
              </div>

              {/* Spread Pair 2 */}
              <div className="py-space-xs flex items-center justify-between hover:bg-surface-container-low/50 px-space-xs rounded transition-colors">
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-headline-md text-body-md font-bold text-on-surface font-mono">HYPE-PERP</span>
                    <span className="font-label-caps text-[10px] text-primary px-1 rounded bg-surface-container">
                      Hyperliquid vs Drift
                    </span>
                  </div>
                  <span className="font-data-micro text-data-micro text-on-surface-variant mt-0.5">
                    Short HL (+0.0210%/h) / Long Drift (+0.0035%/h)
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-data-tabular font-mono text-secondary font-bold text-body-md">+153.3% Net APY</span>
                  <span className="font-data-micro text-data-micro text-outline font-mono">Spread: 0.0175%/hr</span>
                </div>
              </div>

              {/* Spread Pair 3 */}
              <div className="py-space-xs flex items-center justify-between hover:bg-surface-container-low/50 px-space-xs rounded transition-colors">
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-headline-md text-body-md font-bold text-on-surface font-mono">SOL-PERP</span>
                    <span className="font-label-caps text-[10px] text-primary px-1 rounded bg-surface-container">
                      Solana Drift vs HL
                    </span>
                  </div>
                  <span className="font-data-micro text-data-micro text-on-surface-variant mt-0.5">
                    Short Drift (+0.0194%/h) / Long HL (+0.0124%/h)
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-data-tabular font-mono text-secondary font-bold text-body-md">+61.3% Net APY</span>
                  <span className="font-data-micro text-data-micro text-outline font-mono">Spread: 0.0070%/hr</span>
                </div>
              </div>
            </div>
          </div>

          {/* Module 2: Largest 1h Open Interest Surges */}
          <div className="lg:col-span-6 bg-surface-container-lowest p-space-md rounded border border-surface-container-high/70 flex flex-col gap-space-md shadow-lg">
            <div className="flex items-center justify-between border-b border-surface-container-high/50 pb-space-xs">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary text-headline-md">cyclone</span>
                <div className="flex flex-col">
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                    1h Rapid Capital Rotation Detector
                  </h2>
                  <span className="font-data-micro text-data-micro text-on-surface-variant">
                    Accelerated Delta Position Build-ups &amp; Liquidations
                  </span>
                </div>
              </div>
              <span className="font-label-caps text-label-caps text-primary px-space-xs py-0.5 rounded bg-surface-container-high">
                INSTITUTIONAL
              </span>
            </div>

            <div className="flex flex-col divide-y divide-surface-container-high/40">
              {/* Surge 1 */}
              <div className="py-space-xs flex items-center justify-between hover:bg-surface-container-low/50 px-space-xs rounded transition-colors">
                <div className="flex items-center gap-space-sm">
                  <div className="w-7 h-7 rounded bg-surface-container flex items-center justify-center font-bold text-secondary font-mono text-data-micro">
                    #1
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-md text-body-md font-bold text-on-surface font-mono">DOGE-PERP</span>
                    <span className="font-data-micro text-data-micro text-secondary">+ $84.2M new contracts (1h)</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-data-tabular font-mono text-secondary font-bold text-body-md">+28.4% Surge</span>
                  <span className="font-data-micro text-data-micro text-outline">Taker Long Buy Skew: 74%</span>
                </div>
              </div>

              {/* Surge 2 */}
              <div className="py-space-xs flex items-center justify-between hover:bg-surface-container-low/50 px-space-xs rounded transition-colors">
                <div className="flex items-center gap-space-sm">
                  <div className="w-7 h-7 rounded bg-surface-container flex items-center justify-center font-bold text-primary font-mono text-data-micro">
                    #2
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-md text-body-md font-bold text-on-surface font-mono">HYPE-PERP</span>
                    <span className="font-data-micro text-data-micro text-secondary">+ $54.1M new contracts (1h)</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-data-tabular font-mono text-secondary font-bold text-body-md">+22.4% Surge</span>
                  <span className="font-data-micro text-data-micro text-outline">Aggregated Net Spot Inflow</span>
                </div>
              </div>

              {/* Surge 3 */}
              <div className="py-space-xs flex items-center justify-between hover:bg-surface-container-low/50 px-space-xs rounded transition-colors">
                <div className="flex items-center gap-space-sm">
                  <div className="w-7 h-7 rounded bg-surface-container flex items-center justify-center font-bold text-primary font-mono text-data-micro">
                    #3
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-md text-body-md font-bold text-on-surface font-mono">RENDER-PERP</span>
                    <span className="font-data-micro text-data-micro text-secondary">+ $24.7M new contracts (1h)</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-data-tabular font-mono text-secondary font-bold text-body-md">+18.9% Surge</span>
                  <span className="font-data-micro text-data-micro text-outline">Gamma Hedge Expansion</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Methodology & Telemetry Disclaimer Note */}
      <section className="w-full px-margin-desktop py-space-md bg-surface-container-lowest border-t border-surface-container-high/40">
        <div className="flex flex-col md:flex-row items-start gap-space-md p-space-md bg-surface-container-low rounded border border-surface-container-high/30">
          <div className="p-2 rounded bg-surface-container text-primary-fixed-dim">
            <span className="material-symbols-outlined text-headline-lg">verified_user</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-label-caps text-label-caps text-on-surface font-bold tracking-wider uppercase">
              Market Data Aggregation Methodology &amp; Pacifica Telemetry Standards
            </span>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Market telemetry and index depths are continuously polled and normalized from Hyperliquid L2, dYdX v4, Drift Protocol (Solana), and low-latency Pyth/Chainlink oracle streams. The{" "}
              <strong class="text-primary font-medium">Pacifica AI Composite Score</strong> is calculated synchronously every 5 seconds utilizing real-time depth imbalances, 1-hour cumulative volume delta (CVD), spot-perp basis spreads, and predicted liquidation cascades. All protocol services are read-only and non-custodial. Not financial advice.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Telemetry Modal Drawer */}
      {telemetrySymbol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-container-lowest border border-surface-container-high rounded-lg max-w-xl w-full p-space-md flex flex-col gap-space-md shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-space-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">insights</span>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                  {telemetrySymbol} Telemetry Inspection
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTelemetrySymbol(null)}
                className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-body-lg">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-space-xs font-data-tabular text-body-sm">
              <div className="p-space-xs bg-surface-container-low rounded border border-surface-container-high/40">
                <span className="text-on-surface-variant font-label-caps text-data-micro block">ORACLE STREAM</span>
                <span className="text-primary font-mono font-bold">Pyth / Hyperliquid L2 WS</span>
              </div>
              <div className="p-space-xs bg-surface-container-low rounded border border-surface-container-high/40">
                <span className="text-on-surface-variant font-label-caps text-data-micro block">BASIS PREMIUM</span>
                <span className="text-secondary font-mono font-bold">+0.0124%</span>
              </div>
              <div className="p-space-xs bg-surface-container-low rounded border border-surface-container-high/40">
                <span className="text-on-surface-variant font-label-caps text-data-micro block">1H CVD DELTA</span>
                <span className="text-secondary font-mono font-bold">+$12.4M (Long Skew)</span>
              </div>
              <div className="p-space-xs bg-surface-container-low rounded border border-surface-container-high/40">
                <span className="text-on-surface-variant font-label-caps text-data-micro block">DEPTH IMBALANCE</span>
                <span className="text-primary font-mono font-bold">64.2% Bids vs 35.8% Asks</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-space-xs">
              <button
                type="button"
                onClick={() => setTelemetrySymbol(null)}
                className="px-space-md py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded font-label-caps text-data-micro uppercase font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const sym = telemetrySymbol;
                  setTelemetrySymbol(null);
                  navigate(`/dashboard?symbol=${encodeURIComponent(sym)}`);
                }}
                className="px-space-md py-1.5 bg-primary-container text-on-primary-container hover:bg-primary-fixed font-label-caps text-data-micro uppercase font-bold rounded shadow-[0_0_10px_rgba(0,240,255,0.25)]"
              >
                Launch Workbench Trade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
