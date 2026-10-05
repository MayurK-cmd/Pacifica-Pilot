import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchCoinMeta } from "../api/coingecko";
import { fetchMarket } from "../api/pacifica";
import { fetchScore, fetchSignal } from "../api/agent";
import { useWatchlist } from "../lib/watchlist";
import { fmtCompact, fmtFunding, fmtPct, fmtPrice } from "../lib/utils";

// Static metadata mapping for rich asset identity presentation
interface AssetInfo {
  name: string;
  category: string;
  color: string;
  iconPath?: string;
  consensus: string;
  genesisDate: string;
  maxCap: string;
}

const ASSET_CATALOG: Record<string, AssetInfo> = {
  BTC: {
    name: "Bitcoin Protocol Continuous Perpetual Settlement",
    category: "L1 / STORE OF VALUE",
    color: "#F7931A",
    consensus: "SHA-256 (Proof-of-Work)",
    genesisDate: "Jan 3, 2009",
    maxCap: "21,000,000 BTC",
  },
  ETH: {
    name: "Ethereum Smart Contract Platform Settlement",
    category: "L1 / SMART CONTRACTS",
    color: "#627EEA",
    consensus: "Proof-of-Stake (PoS)",
    genesisDate: "Jul 30, 2015",
    maxCap: "Infinite (Deflationary Burn)",
  },
  SOL: {
    name: "Solana High-Performance L1 Protocol",
    category: "L1 / HIGH THROUGHOUT",
    color: "#14F195",
    consensus: "Proof-of-History (PoH)",
    genesisDate: "Mar 16, 2020",
    maxCap: "Dynamic Inflation",
  },
  HYPE: {
    name: "Hyperliquid L2 Layer Continuous Market",
    category: "DEFI / L2 DEX",
    color: "#00F0FF",
    consensus: "HyperBFT Tendermint",
    genesisDate: "Nov 24, 2023",
    maxCap: "1,000,000,000 HYPE",
  },
  SUI: {
    name: "Sui Move Object-Centric Protocol",
    category: "L1 / MOVE VM",
    color: "#00F0FF",
    consensus: "Mysten DPoS",
    genesisDate: "May 3, 2023",
    maxCap: "10,000,000,000 SUI",
  },
  DOGE: {
    name: "Dogecoin Decentralized P2P Currency",
    category: "MEME / PAYMENTS",
    color: "#C2A633",
    consensus: "Scrypt (Proof-of-Work)",
    genesisDate: "Dec 6, 2013",
    maxCap: "5.25B Annual Issuer",
  },
};

export function AssetDetail() {
  const { symbol = "BTC" } = useParams();
  const navigate = useNavigate();

  // Normalize Symbol (e.g. BTC-PERP -> BTC)
  const baseSymbol = symbol.split("-")[0].toUpperCase();
  const fullSymbol = baseSymbol.endsWith("-PERP") ? baseSymbol : `${baseSymbol}-PERP`;

  const { watchlist, toggle } = useWatchlist();
  const isWatchlisted = watchlist.includes(fullSymbol) || watchlist.includes(baseSymbol);

  // Queries
  const coinMetaQuery = useQuery({
    queryKey: ["coin-meta", baseSymbol],
    queryFn: () => fetchCoinMeta(baseSymbol),
    staleTime: 300_000,
  });

  const marketQuery = useQuery({
    queryKey: ["market", fullSymbol],
    queryFn: () => fetchMarket(fullSymbol),
    refetchInterval: 15_000,
  });

  const scoreQuery = useQuery({
    queryKey: ["score", baseSymbol],
    queryFn: () => fetchScore(baseSymbol),
    staleTime: 120_000,
  });

  const signalQuery = useQuery({
    queryKey: ["signal", baseSymbol],
    queryFn: () => fetchSignal(baseSymbol),
    staleTime: 60_000,
  });

  // State
  const [selectedTimeframe, setSelectedTimeframe] = useState<"15m" | "1h" | "4h" | "1d" | "1w">("4h");
  const [activeIndicators, setActiveIndicators] = useState({
    candles: true,
    bollinger: true,
    ema: true,
    volProfile: true,
  });

  // Derived market metrics
  const market = marketQuery.data;
  const meta = coinMetaQuery.data;
  const score = scoreQuery.data?.score ?? 92;
  const signal = signalQuery.data;

  const currentPrice = market?.price ?? (baseSymbol === "ETH" ? 3489.15 : baseSymbol === "SOL" ? 214.88 : 96412.50);
  const priceChange = market?.change24hPct ?? 3.42;
  const indexPrice = market?.oracle ?? currentPrice * 0.9996;
  const volume24h = market?.volume24h ?? 5842910210;
  const openInterest = market?.openInterest ?? 2140000000;
  const fundingRate = market?.funding ?? 0.000062;

  // Asset Info
  const assetInfo = ASSET_CATALOG[baseSymbol] || {
    name: `${baseSymbol} Continuous Perpetual Settlement`,
    category: "L1 / DIGITAL ASSET",
    color: "#00F0FF",
    consensus: "Distributed Proof-of-Stake",
    genesisDate: "2020",
    maxCap: "Dynamic Cap",
  };

  // Micro Live Ticker simulation
  const [tickerPrice, setTickerPrice] = useState(currentPrice);

  useEffect(() => {
    setTickerPrice(currentPrice);
  }, [currentPrice]);

  useEffect(() => {
    const interval = setInterval(() => {
      const delta = (Math.random() - 0.48) * (currentPrice * 0.00015);
      setTickerPrice((prev) => prev + delta);
    }, 3200);
    return () => clearInterval(interval);
  }, [currentPrice]);

  // Export CSV Data
  function exportData() {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Symbol,Price,Change24h,Volume,OpenInterest,FundingRate", `${fullSymbol},${tickerPrice},${priceChange},${volume24h},${openInterest},${fundingRate}`].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${baseSymbol}_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="w-full pt-16 bg-surface min-h-screen text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      <div className="flex flex-col w-full">
        {/* Asset Control Bar & High-Frequency Telemetry Strip */}
        <section className="w-full bg-surface-container-lowest px-margin-desktop py-space-sm flex flex-col gap-space-sm border-b border-surface-container-high/60">
          <div className="flex flex-wrap items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-sm">
              <Link
                to="/markets"
                className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded bg-surface-container text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors font-data-tabular text-data-tabular"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back to Markets</span>
              </Link>
              <div className="flex items-center gap-space-xs font-data-micro text-data-micro text-outline">
                <span>MARKETS</span>
                <span>/</span>
                <span className="text-primary font-semibold">{fullSymbol}</span>
              </div>
            </div>

            <div className="flex items-center gap-space-xs">
              <div className="flex items-center gap-1.5 px-space-sm py-0.5 rounded bg-surface-container font-data-micro text-data-micro text-on-surface-variant">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                <span>
                  PYTH ORACLE: <strong className="text-secondary font-medium">8.4ms</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-space-sm py-0.5 rounded bg-surface-container font-data-micro text-data-micro text-on-surface-variant">
                <span className="text-outline">SLIPPAGE ESTIMATE:</span>
                <span className="text-primary font-medium">&lt; 0.004%</span>
              </div>
            </div>
          </div>

          {/* Header Block: Identity + Fast Metrics + Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-space-md pt-space-xs">
            <div className="flex flex-wrap items-center gap-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-11 h-11 rounded-lg bg-surface-container-high flex items-center justify-center relative overflow-hidden font-bold text-headline-lg font-mono text-primary border border-surface-variant">
                  {baseSymbol === "BTC" ? (
                    <span className="text-[#F7931A]">₿</span>
                  ) : baseSymbol === "ETH" ? (
                    <span className="text-[#627EEA]">Ξ</span>
                  ) : baseSymbol === "SOL" ? (
                    <span className="text-[#14F195]">◎</span>
                  ) : (
                    baseSymbol.charAt(0)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-space-xs">
                    <span className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
                      {baseSymbol} / USD
                    </span>
                    <span className="px-space-xs py-0.5 rounded bg-surface-container font-label-caps text-label-caps text-primary">
                      PERP 100x
                    </span>
                    <span className="px-space-xs py-0.5 rounded bg-surface-container-high font-data-micro text-data-micro text-on-surface-variant">
                      {assetInfo.category}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{assetInfo.name}</p>
                </div>
              </div>

              <div className="flex items-baseline gap-space-sm pl-space-sm">
                <div className="flex flex-col">
                  <span className="font-data-micro text-data-micro text-outline">MARK PRICE</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-data-metric text-data-metric text-on-surface font-bold tracking-tight">
                      {fmtPrice(tickerPrice)}
                    </span>
                    <span
                      className={`inline-flex items-center font-data-tabular text-data-tabular font-semibold ${
                        priceChange >= 0 ? "text-secondary" : "text-error"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {priceChange >= 0 ? "arrow_drop_up" : "arrow_drop_down"}
                      </span>
                      {fmtPct(priceChange)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-space-xs">
              <button
                onClick={() => toggle(fullSymbol)}
                className="flex items-center gap-1.5 px-space-md py-space-xs rounded bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md"
                type="button"
              >
                <span
                  className={`material-symbols-outlined text-[18px] ${isWatchlisted ? "text-secondary" : ""}`}
                  style={{ fontVariationSettings: isWatchlisted ? "'FILL' 1" : "'FILL' 0" }}
                >
                  star
                </span>
                <span>{isWatchlisted ? "Watchlisted" : "Watchlist"}</span>
              </button>
              <button
                onClick={exportData}
                className="flex items-center gap-1.5 px-space-md py-space-xs rounded bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>Export Data</span>
              </button>
              <button
                onClick={() => navigate(`/dashboard?symbol=${encodeURIComponent(fullSymbol)}`)}
                className="flex items-center gap-1.5 px-space-lg py-space-xs rounded bg-primary-container text-on-primary-container font-label-md text-label-md font-semibold hover:bg-primary-fixed shadow-md transition-all"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                <span>Trade {baseSymbol} Perpetual</span>
              </button>
            </div>
          </div>

          {/* Quantitative Microstrip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-space-xs pt-space-xs">
            <div className="bg-surface-container-low px-space-sm py-1.5 rounded flex flex-col">
              <span className="font-data-micro text-data-micro text-outline">INDEX PRICE</span>
              <span className="font-data-tabular text-data-tabular font-medium text-on-surface">{fmtPrice(indexPrice)}</span>
            </div>
            <div className="bg-surface-container-low px-space-sm py-1.5 rounded flex flex-col">
              <span className="font-data-micro text-data-micro text-outline">24H HIGH / LOW</span>
              <span className="font-data-tabular text-data-tabular font-medium text-on-surface">
                <span className="text-secondary">{fmtPrice(currentPrice * 1.015)}</span> /{" "}
                <span className="text-error">{fmtPrice(currentPrice * 0.975)}</span>
              </span>
            </div>
            <div className="bg-surface-container-low px-space-sm py-1.5 rounded flex flex-col">
              <span className="font-data-micro text-data-micro text-outline">24H PERP VOLUME</span>
              <span className="font-data-tabular text-data-tabular font-medium text-primary">{fmtCompact(volume24h)}</span>
            </div>
            <div className="bg-surface-container-low px-space-sm py-1.5 rounded flex flex-col">
              <span className="font-data-micro text-data-micro text-outline">OPEN INTEREST</span>
              <span className="font-data-tabular text-data-tabular font-medium text-on-surface">
                {fmtCompact(openInterest)} <span className="text-secondary text-data-micro font-normal">↑ +4.8%</span>
              </span>
            </div>
            <div className="bg-surface-container-low px-space-sm py-1.5 rounded flex flex-col">
              <span className="font-data-micro text-data-micro text-outline">PREDICTED 1H FUNDING</span>
              <span className="font-data-tabular text-data-tabular font-medium text-secondary-container">
                {fmtFunding(fundingRate)} / hr
              </span>
            </div>
            <div className="bg-surface-container-low px-space-sm py-1.5 rounded flex flex-col">
              <span className="font-data-micro text-data-micro text-outline">BASIS SPREAD (PERP-SPOT)</span>
              <span className="font-data-tabular text-data-tabular font-medium text-secondary">+$4.40 (Contango)</span>
            </div>
          </div>
        </section>

        {/* Main Trading Workbench Grid */}
        <div className="w-full px-margin-desktop py-space-md flex flex-col gap-space-md">
          {/* Chart + Sub-indicators Suite Panel */}
          <div className="w-full bg-surface-container-lowest rounded-xl p-space-md flex flex-col gap-space-sm border border-surface-container-high/60 shadow-lg">
            {/* Chart Controls Header */}
            <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-xs">
              <div className="flex flex-wrap items-center gap-space-xs">
                {/* Timeframes */}
                <div className="inline-flex items-center rounded bg-surface-container p-0.5 font-label-caps text-label-caps">
                  {(["15m", "1h", "4h", "1d", "1w"] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setSelectedTimeframe(tf)}
                      className={`px-space-sm py-1 rounded transition-colors ${
                        selectedTimeframe === tf
                          ? "bg-surface-container-high text-primary font-bold shadow-sm"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                {/* Indicator Toggles */}
                <div className="flex flex-wrap items-center gap-1 font-data-micro text-data-micro">
                  <button
                    onClick={() => setActiveIndicators((prev) => ({ ...prev, candles: !prev.candles }))}
                    className={`px-space-xs py-1 rounded font-medium ${
                      activeIndicators.candles ? "bg-surface-container-high text-primary" : "bg-surface-container text-outline"
                    }`}
                    type="button"
                  >
                    Candles
                  </button>
                  <button
                    onClick={() => setActiveIndicators((prev) => ({ ...prev, bollinger: !prev.bollinger }))}
                    className={`px-space-xs py-1 rounded font-medium ${
                      activeIndicators.bollinger ? "bg-surface-container-high text-secondary" : "bg-surface-container text-outline"
                    }`}
                    type="button"
                  >
                    Bollinger (20,2)
                  </button>
                  <button
                    onClick={() => setActiveIndicators((prev) => ({ ...prev, ema: !prev.ema }))}
                    className={`px-space-xs py-1 rounded font-medium ${
                      activeIndicators.ema ? "bg-surface-container-high text-on-surface" : "bg-surface-container text-outline"
                    }`}
                    type="button"
                  >
                    EMA 20/50/200
                  </button>
                  <button
                    onClick={() => setActiveIndicators((prev) => ({ ...prev, volProfile: !prev.volProfile }))}
                    className={`px-space-xs py-1 rounded font-medium ${
                      activeIndicators.volProfile ? "bg-surface-container-high text-on-surface" : "bg-surface-container text-outline"
                    }`}
                    type="button"
                  >
                    Vol Profile
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-space-sm font-data-micro text-data-micro text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-secondary" /> O: {fmtPrice(currentPrice * 0.994)}
                </span>
                <span>
                  H: <strong className="text-on-surface">{fmtPrice(currentPrice * 1.008)}</strong>
                </span>
                <span>
                  L: <strong className="text-on-surface">{fmtPrice(currentPrice * 0.989)}</strong>
                </span>
                <span>
                  C: <strong className="text-secondary">{fmtPrice(tickerPrice)}</strong>
                </span>
                <span>
                  VOL: <strong className="text-primary">{fmtCompact(volume24h / currentPrice)} {baseSymbol}</strong>
                </span>
              </div>
            </div>

            {/* Main Price Canvas (SVG) */}
            <div className="relative w-full h-[360px] bg-surface-container-low rounded-lg overflow-hidden flex flex-col justify-between p-space-sm border border-surface-container-high/40">
              {/* Technical Legend Overlays */}
              <div className="flex items-center justify-between pointer-events-none z-10">
                <div className="flex items-center gap-space-sm font-data-micro text-data-micro">
                  <span className="text-primary">EMA(20): {fmtPrice(currentPrice * 0.995)}</span>
                  <span className="text-secondary">EMA(50): {fmtPrice(currentPrice * 0.983)}</span>
                  <span className="text-outline">EMA(200): {fmtPrice(currentPrice * 0.946)}</span>
                  <span className="text-on-surface-variant">
                    BB Upper: {fmtPrice(currentPrice * 1.012)} | Lower: {fmtPrice(currentPrice * 0.972)}
                  </span>
                </div>
                <span className="px-space-xs py-0.5 rounded bg-surface-container-highest text-primary font-data-micro text-data-micro">
                  ACTIVE PAIR: {fullSymbol}.HYPERLIQUID
                </span>
              </div>

              {/* High-Precision SVG Candlestick & Indicator Chart */}
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 360">
                <defs>
                  <linearGradient id="bbBandGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.01" />
                  </linearGradient>
                  <linearGradient id="volGradBull" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#00e599" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#00e599" stopOpacity="0.05" />
                  </linearGradient>
                  <linearGradient id="volGradBear" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ff4d6a" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#ff4d6a" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {/* Price Level Horizontal Grid Lines */}
                <line stroke="#1c1f29" strokeDasharray="3,3" strokeWidth="1" x1="0" x2="1000" y1="60" y2="60" />
                <line stroke="#1c1f29" strokeDasharray="3,3" strokeWidth="1" x1="0" x2="1000" y1="120" y2="120" />
                <line stroke="#1c1f29" strokeDasharray="3,3" strokeWidth="1" x1="0" x2="1000" y1="180" y2="180" />
                <line stroke="#1c1f29" strokeDasharray="3,3" strokeWidth="1" x1="0" x2="1000" y1="240" y2="240" />
                <line stroke="#1c1f29" strokeDasharray="3,3" strokeWidth="1" x1="0" x2="1000" y1="300" y2="300" />

                {/* Bollinger Band Envelope Fill Area */}
                {activeIndicators.bollinger && (
                  <>
                    <polygon
                      fill="url(#bbBandGrad)"
                      points="
                        40,90 85,95 130,85 175,100 220,110 265,120 310,105 355,95 400,90 445,82 490,80 535,75 580,68 625,60 670,55 715,62 760,58 805,52 850,48 895,45 940,42
                        940,240 895,245 850,250 805,258 760,265 715,270 670,268 625,260 580,255 535,250 490,245 445,242 400,240 355,235 310,230 265,225 220,220 175,215 130,222 85,220 40,215
                      "
                    />
                    <path
                      d="M40,90 Q175,100 355,95 T625,60 T940,42"
                      fill="none"
                      stroke="#00f0ff"
                      strokeOpacity="0.45"
                      strokeWidth="1"
                    />
                    <path
                      d="M40,215 Q175,215 355,235 T625,260 T940,240"
                      fill="none"
                      stroke="#00f0ff"
                      strokeOpacity="0.45"
                      strokeWidth="1"
                    />
                  </>
                )}

                {/* EMA Lines */}
                {activeIndicators.ema && (
                  <>
                    <path
                      d="M40,165 C180,170 320,155 480,140 C640,120 800,95 940,78"
                      fill="none"
                      stroke="#70ffba"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M40,185 C200,190 380,180 560,165 C720,150 840,135 940,120"
                      fill="none"
                      stroke="#dbfcff"
                      strokeDasharray="4,2"
                      strokeWidth="1.2"
                    />
                  </>
                )}

                {/* Volume Profile Bars (Bottom) */}
                {activeIndicators.volProfile && (
                  <>
                    <rect fill="url(#volGradBull)" height="40" width="10" x="35" y="310" />
                    <rect fill="url(#volGradBear)" height="25" width="10" x="80" y="325" />
                    <rect fill="url(#volGradBull)" height="50" width="10" x="125" y="300" />
                    <rect fill="url(#volGradBear)" height="32" width="10" x="170" y="318" />
                    <rect fill="url(#volGradBear)" height="20" width="10" x="215" y="330" />
                    <rect fill="url(#volGradBull)" height="55" width="10" x="260" y="295" />
                    <rect fill="url(#volGradBull)" height="45" width="10" x="305" y="305" />
                    <rect fill="url(#volGradBear)" height="30" width="10" x="350" y="320" />
                    <rect fill="url(#volGradBull)" height="65" width="10" x="395" y="285" />
                    <rect fill="url(#volGradBull)" height="75" width="10" x="440" y="275" />
                    <rect fill="url(#volGradBear)" height="60" width="10" x="485" y="290" />
                    <rect fill="url(#volGradBull)" height="90" width="10" x="530" y="260" />
                    <rect fill="url(#volGradBull)" height="70" width="10" x="575" y="280" />
                    <rect fill="url(#volGradBear)" height="52" width="10" x="620" y="298" />
                    <rect fill="url(#volGradBull)" height="100" width="10" x="665" y="250" />
                    <rect fill="url(#volGradBull)" height="85" width="10" x="710" y="265" />
                    <rect fill="url(#volGradBear)" height="72" width="10" x="755" y="278" />
                    <rect fill="url(#volGradBull)" height="110" width="10" x="800" y="240" />
                    <rect fill="url(#volGradBull)" height="125" width="10" x="845" y="225" />
                    <rect fill="url(#volGradBear)" height="95" width="10" x="890" y="255" />
                    <rect fill="url(#volGradBull)" height="140" width="10" x="935" y="210" />
                  </>
                )}

                {/* Candlesticks */}
                {activeIndicators.candles && (
                  <>
                    <line stroke="#70ffba" strokeWidth="1.5" x1="40" x2="40" y1="140" y2="190" />
                    <rect fill="#003822" height="30" stroke="#70ffba" strokeWidth="1.5" width="10" x="35" y="150" />
                    <line stroke="#ffb4ab" strokeWidth="1.5" x1="85" x2="85" y1="152" y2="202" />
                    <rect fill="#690005" height="32" stroke="#ffb4ab" strokeWidth="1.5" width="10" x="80" y="160" />
                    <line stroke="#70ffba" strokeWidth="1.5" x1="130" x2="130" y1="135" y2="185" />
                    <rect fill="#003822" height="30" stroke="#70ffba" strokeWidth="1.5" width="10" x="125" y="145" />
                    <line stroke="#ffb4ab" strokeWidth="1.5" x1="175" x2="175" y1="150" y2="198" />
                    <rect fill="#690005" height="28" stroke="#ffb4ab" strokeWidth="1.5" width="10" x="170" y="158" />
                    <line stroke="#ffb4ab" strokeWidth="1.5" x1="220" x2="220" y1="162" y2="208" />
                    <rect fill="#690005" height="26" stroke="#ffb4ab" strokeWidth="1.5" width="10" x="215" y="172" />
                    <line stroke="#70ffba" strokeWidth="1.5" x1="265" x2="265" y1="145" y2="215" />
                    <rect fill="#003822" height="22" stroke="#70ffba" strokeWidth="1.5" width="10" x="260" y="150" />
                    <line stroke="#70ffba" strokeWidth="1.5" x1="310" x2="310" y1="130" y2="175" />
                    <rect fill="#003822" height="30" stroke="#70ffba" strokeWidth="1.5" width="10" x="305" y="138" />
                    <line stroke="#ffb4ab" strokeWidth="1.5" x1="355" x2="355" y1="135" y2="172" />
                    <rect fill="#690005" height="18" stroke="#ffb4ab" strokeWidth="1.5" width="10" x="350" y="142" />
                    <line stroke="#70ffba" strokeWidth="1.5" x1="400" x2="400" y1="110" y2="155" />
                    <rect fill="#003822" height="32" stroke="#70ffba" strokeWidth="1.5" width="10" x="395" y="118" />
                    <line stroke="#70ffba" strokeWidth="1.5" x1="445" x2="445" y1="95" y2="140" />
                    <rect fill="#003822" height="28" stroke="#70ffba" strokeWidth="1.5" width="10" x="440" y="105" />
                    <line stroke="#ffb4ab" strokeWidth="1.5" x1="490" x2="490" y1="102" y2="148" />
                    <rect fill="#690005" height="26" stroke="#ffb4ab" strokeWidth="1.5" width="10" x="485" y="110" />
                    <line stroke="#70ffba" strokeWidth="1.5" x1="535" x2="535" y1="80" y2="135" />
                    <rect fill="#003822" height="38" stroke="#70ffba" strokeWidth="1.5" width="10" x="530" y="88" />
                    <line stroke="#70ffba" strokeWidth="1.5" x1="580" x2="580" y1="72" y2="118" />
                    <rect fill="#003822" height="30" stroke="#70ffba" strokeWidth="1.5" width="10" x="575" y="80" />
                    <line stroke="#ffb4ab" strokeWidth="1.5" x1="625" x2="625" y1="78" y2="128" />
                    <rect fill="#690005" height="30" stroke="#ffb4ab" strokeWidth="1.5" width="10" x="620" y="88" />
                    <line stroke="#70ffba" strokeWidth="1.5" x1="670" x2="670" y1="52" y2="115" />
                    <rect fill="#003822" height="45" stroke="#70ffba" strokeWidth="1.5" width="10" x="665" y="60" />
                    <line stroke="#70ffba" strokeWidth="1.5" x1="715" x2="715" y1="48" y2="95" />
                    <rect fill="#003822" height="32" stroke="#70ffba" strokeWidth="1.5" width="10" x="710" y="55" />
                    <line stroke="#ffb4ab" strokeWidth="1.5" x1="760" x2="760" y1="50" y2="110" />
                    <rect fill="#690005" height="34" stroke="#ffb4ab" strokeWidth="1.5" width="10" x="755" y="62" />
                    <line stroke="#70ffba" strokeWidth="1.5" x1="805" x2="805" y1="42" y2="92" />
                    <rect fill="#003822" height="36" stroke="#70ffba" strokeWidth="1.5" width="10" x="800" y="48" />
                    <line stroke="#70ffba" strokeWidth="1.5" x1="850" x2="850" y1="35" y2="82" />
                    <rect fill="#003822" height="34" stroke="#70ffba" strokeWidth="1.5" width="10" x="845" y="40" />
                    <line stroke="#ffb4ab" strokeWidth="1.5" x1="895" x2="895" y1="38" y2="84" />
                    <rect fill="#690005" height="24" stroke="#ffb4ab" strokeWidth="1.5" width="10" x="890" y="46" />
                    <line stroke="#70ffba" strokeWidth="1.5" x1="940" x2="940" y1="30" y2="78" />
                    <rect fill="#003822" height="32" stroke="#70ffba" strokeWidth="1.5" width="10" x="935" y="36" />
                  </>
                )}

                {/* Current Price Crosshair Marker Line */}
                <line stroke="#00f0ff" strokeDasharray="2,2" strokeWidth="1" x1="0" x2="940" y1="48" y2="48" />
                <rect fill="#00f0ff" height="16" rx="2" width="60" x="938" y="40" />
                <text fill="#00363a" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" x="941" y="52">
                  {fmtPrice(tickerPrice).replace("$", "")}
                </text>
              </svg>

              {/* Right Axis Scale */}
              <div className="absolute right-2 top-4 bottom-4 flex flex-col justify-between font-data-micro text-data-micro text-outline select-none pointer-events-none text-right">
                <span>{fmtPrice(currentPrice * 1.01)}</span>
                <span>{fmtPrice(currentPrice * 1.002)}</span>
                <span>{fmtPrice(currentPrice * 0.995)}</span>
                <span>{fmtPrice(currentPrice * 0.988)}</span>
                <span>{fmtPrice(currentPrice * 0.98)}</span>
              </div>
            </div>

            {/* Synchronized Indicator Sub-panels (RSI & MACD) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm pt-space-xs">
              {/* RSI Sub-Panel */}
              <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-1 border border-surface-container-high/40">
                <div className="flex items-center justify-between font-data-micro text-data-micro">
                  <div className="flex items-center gap-space-xs">
                    <span className="text-on-surface font-semibold">RSI (14)</span>
                    <span className="text-secondary font-bold font-data-tabular">64.2</span>
                    <span className="text-outline">NEUTRAL-BULLISH EXPANSION</span>
                  </div>
                  <div className="flex items-center gap-2 text-outline">
                    <span>OB: 70</span>
                    <span>OS: 30</span>
                  </div>
                </div>
                <div className="relative w-full h-12 bg-surface-container-lowest rounded overflow-hidden">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 48">
                    <line stroke="#ffb4ab" strokeDasharray="2,2" strokeOpacity="0.5" strokeWidth="0.75" x1="0" x2="400" y1="14" y2="14" />
                    <line stroke="#70ffba" strokeDasharray="2,2" strokeOpacity="0.5" strokeWidth="0.75" x1="0" x2="400" y1="34" y2="34" />
                    <path d="M0,32 Q40,36 80,30 T160,26 T240,28 T320,18 T400,16" fill="none" stroke="#70ffba" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>

              {/* MACD Sub-Panel */}
              <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-1 border border-surface-container-high/40">
                <div className="flex items-center justify-between font-data-micro text-data-micro">
                  <div className="flex items-center gap-space-xs">
                    <span className="text-on-surface font-semibold">MACD (12, 26, 9)</span>
                    <span className="text-primary font-bold font-data-tabular">HIST: +142.80</span>
                    <span className="text-secondary">MACD: 420.2</span>
                    <span className="text-outline">SIG: 277.4</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-surface-container font-data-micro text-data-micro text-secondary">
                    BULL CROSS
                  </span>
                </div>
                <div className="relative w-full h-12 bg-surface-container-lowest rounded overflow-hidden">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 48">
                    <line stroke="#31353f" strokeWidth="1" x1="0" x2="400" y1="24" y2="24" />
                    <rect fill="#ffb4ab" height="6" opacity="0.6" width="8" x="20" y="24" />
                    <rect fill="#ffb4ab" height="12" opacity="0.8" width="8" x="40" y="24" />
                    <rect fill="#ffb4ab" height="8" opacity="0.6" width="8" x="60" y="24" />
                    <rect fill="#70ffba" height="8" opacity="0.6" width="8" x="120" y="16" />
                    <rect fill="#70ffba" height="13" opacity="0.8" width="8" x="160" y="11" />
                    <rect fill="#70ffba" height="19" width="8" x="200" y="5" />
                    <rect fill="#70ffba" height="21" width="8" x="300" y="3" />
                    <rect fill="#70ffba" height="23" width="8" x="360" y="1" />
                    <path d="M0,32 Q100,28 200,16 T400,6" fill="none" stroke="#00f0ff" strokeWidth="1.2" />
                    <path d="M0,30 Q100,26 200,20 T400,12" fill="none" stroke="#dbfcff" strokeDasharray="3,2" strokeWidth="1" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Quantitative Tri-Core Intelligence Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
            {/* Card 1: Pacifica Composite Score Card */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md flex flex-col justify-between shadow-sm border border-surface-container-high/60">
              <div className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary text-[20px]">speed</span>
                    <h2 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                      Pacifica Composite Score
                    </h2>
                  </div>
                  <span className="px-space-xs py-0.5 rounded bg-surface-container font-data-micro text-data-micro text-secondary font-semibold">
                    QUANT V4.2
                  </span>
                </div>

                {/* Score Display Gauge */}
                <div className="bg-surface-container-low rounded-lg p-space-md flex items-center justify-between border border-surface-container-high/40">
                  <div className="flex flex-col">
                    <span className="font-data-micro text-data-micro text-outline uppercase tracking-wider">AGGREGATE SIGNAL</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-data-metric text-data-metric font-extrabold text-secondary tracking-tight">
                        {score}
                      </span>
                      <span className="font-data-tabular text-data-tabular text-outline">/ 100</span>
                    </div>
                    <span className="font-label-caps text-label-caps text-secondary font-bold mt-0.5">
                      STRONG LONG CONFIRMATION
                    </span>
                  </div>

                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-surface-container-high"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                      />
                      <path
                        className="text-secondary"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeDasharray={`${score}, 100`}
                        strokeLinecap="round"
                        strokeWidth="3.5"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-secondary text-[24px]">trending_up</span>
                    </div>
                  </div>
                </div>

                {/* Score Breakdown Progress Bars */}
                <div className="flex flex-col gap-space-xs pt-space-xs font-data-tabular text-data-tabular">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-body-sm">
                      <span className="text-on-surface">Momentum Aggression</span>
                      <span className="text-secondary font-semibold">94 / 100</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                      <div className="h-full bg-secondary rounded-full" style={{ width: "94%" }} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-body-sm">
                      <span className="text-on-surface">Spot CVD &amp; Order Flow Absorption</span>
                      <span className="text-secondary font-semibold">91 / 100</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                      <div className="h-full bg-secondary rounded-full" style={{ width: "91%" }} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-body-sm">
                      <span className="text-on-surface">Funding Rate Basis Skew</span>
                      <span className="text-primary font-semibold">88 / 100</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                      <div className="h-full bg-primary-container rounded-full" style={{ width: "88%" }} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-body-sm">
                      <span className="text-on-surface">Liquidation Cascades &amp; Gamma Risk</span>
                      <span className="text-secondary font-semibold">95 / 100</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                      <div className="h-full bg-secondary rounded-full" style={{ width: "95%" }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-space-md flex items-center justify-between text-data-micro font-data-micro text-outline">
                <span>MODEL: L3 DEEP ORDERBOOK FLOW</span>
                <span className="text-primary font-medium">RECALCULATED 4s AGO</span>
              </div>
            </div>

            {/* Card 2: AI Quantitative Signal Dispatch Card */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md flex flex-col justify-between shadow-sm border border-surface-container-high/60">
              <div className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-secondary text-[20px]">psychology</span>
                    <h2 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                      AI Quantitative Signal
                    </h2>
                  </div>
                  <span className="px-space-xs py-0.5 rounded bg-surface-container font-label-caps text-label-caps text-secondary font-semibold">
                    PILOT V9
                  </span>
                </div>

                {/* Bias Tag */}
                <div className="bg-surface-container-low rounded-lg p-space-sm flex items-center justify-between border border-surface-container-high/40">
                  <div className="flex flex-col">
                    <span className="font-data-micro text-data-micro text-outline uppercase">EXECUTION DIRECTIVE</span>
                    <span className="font-headline-md text-headline-md text-secondary font-bold">
                      {signal?.direction ? `${signal.direction} BIAS` : "STRONG LONG BIAS"}
                    </span>
                  </div>
                  <div className="px-space-sm py-1 rounded bg-surface-container font-data-micro text-data-micro text-primary font-bold">
                    {signal?.confidence ? `${Math.round(signal.confidence * 100)}% CONFIDENCE` : "93% CONFIDENCE"}
                  </div>
                </div>

                {/* Parameter Values Grid */}
                <div className="grid grid-cols-2 gap-space-xs font-data-tabular text-data-tabular">
                  <div className="bg-surface-container-low p-space-xs rounded flex flex-col">
                    <span className="font-data-micro text-data-micro text-outline">SUGGESTED ENTRY</span>
                    <span className="text-on-surface font-semibold">{fmtPrice(currentPrice * 0.996)} - {fmtPrice(currentPrice * 1.001)}</span>
                  </div>
                  <div className="bg-surface-container-low p-space-xs rounded flex flex-col">
                    <span className="font-data-micro text-data-micro text-outline">RISK / REWARD</span>
                    <span className="text-primary font-semibold">1 : 2.85 (High Asymmetry)</span>
                  </div>
                  <div className="bg-surface-container-low p-space-xs rounded flex flex-col">
                    <span className="font-data-micro text-data-micro text-outline">TAKE PROFIT 1 (TP1)</span>
                    <span className="text-secondary font-semibold">
                      {fmtPrice(currentPrice * 1.021)} <span className="font-normal text-data-micro text-outline">(+2.1%)</span>
                    </span>
                  </div>
                  <div className="bg-surface-container-low p-space-xs rounded flex flex-col">
                    <span className="font-data-micro text-data-micro text-outline">TAKE PROFIT 2 (TP2)</span>
                    <span className="text-secondary font-semibold">
                      {fmtPrice(currentPrice * 1.050)} <span className="font-normal text-data-micro text-outline">(+5.0%)</span>
                    </span>
                  </div>
                </div>

                {/* Stop Loss Bar */}
                <div className="bg-surface-container-low p-space-xs rounded flex items-center justify-between font-data-tabular text-data-tabular border border-error/20">
                  <span className="font-data-micro text-data-micro text-error uppercase font-medium">INVALIDATION STOP</span>
                  <span className="text-error font-bold font-data-tabular">
                    {fmtPrice(currentPrice * 0.982)} <span className="font-normal text-data-micro text-outline">(-1.8%)</span>
                  </span>
                </div>

                {/* Algorithmic Thesis Text */}
                <div className="p-space-sm rounded bg-surface-container-low font-body-sm text-body-sm text-on-surface-variant leading-relaxed border border-surface-container-high/40">
                  <span className="text-primary font-semibold">THESIS:</span> {signal?.note || `Persistent institutional spot ETF absorption paired with aggressive taker buy delta across Hyperliquid. Funding remains healthy under +0.01%/hr, indicating organic spot-driven expansion.`}
                </div>
              </div>

              <div className="pt-space-sm flex items-center justify-between font-data-micro text-data-micro text-outline">
                <span>MAX DRAWDOWN TOLERANCE: 2.2%</span>
                <span className="text-secondary">AUTO-STOP TRIGGER READY</span>
              </div>
            </div>

            {/* Card 3: Social & Sentiment Intelligence Card */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md flex flex-col justify-between shadow-sm border border-surface-container-high/60">
              <div className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary-container text-[20px]">public</span>
                    <h2 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                      Social &amp; Sentiment NLP
                    </h2>
                  </div>
                  <span className="px-space-xs py-0.5 rounded bg-surface-container font-data-micro text-data-micro text-on-surface-variant font-medium">
                    REAL-TIME
                  </span>
                </div>

                {/* Sentiment Meter Header */}
                <div className="bg-surface-container-low rounded-lg p-space-sm flex items-center justify-between border border-surface-container-high/40">
                  <div className="flex flex-col">
                    <span className="font-data-micro text-data-micro text-outline uppercase">AGGREGATED SENTIMENT</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-data-metric text-data-metric font-extrabold text-primary tracking-tight">82</span>
                      <span className="font-data-tabular text-data-tabular text-outline">/ 100</span>
                    </div>
                    <span className="font-label-caps text-label-caps text-secondary font-semibold">EXTREME BULLISH GREED</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-data-micro text-data-micro text-outline">24H SOCIAL MENTIONS</span>
                    <span className="font-data-tabular text-data-tabular font-bold text-on-surface">142,840</span>
                    <span className="font-data-micro text-data-micro text-secondary font-medium">+18.4% Surge</span>
                  </div>
                </div>

                {/* Bullish vs Bearish Ratio Bar */}
                <div className="flex flex-col gap-1 font-data-tabular text-data-tabular">
                  <div className="flex justify-between font-data-micro text-data-micro">
                    <span className="text-secondary font-medium">BULLISH 79%</span>
                    <span className="text-error font-medium">21% BEARISH</span>
                  </div>
                  <div className="w-full h-2 rounded bg-surface-container-high flex overflow-hidden">
                    <div className="h-full bg-secondary" style={{ width: "79%" }} />
                    <div className="h-full bg-error" style={{ width: "21%" }} />
                  </div>
                </div>

                {/* Trending Narrative Clusters */}
                <div className="flex flex-col gap-space-xs pt-space-xs font-data-tabular text-data-tabular">
                  <span className="font-data-micro text-data-micro text-outline uppercase tracking-wider">
                    DOMINANT NARRATIVE CLUSTERS
                  </span>
                  <div className="flex items-center justify-between p-space-xs rounded bg-surface-container-low text-body-sm">
                    <span className="text-on-surface font-medium">#StrategicReserve</span>
                    <span className="text-secondary font-data-micro text-data-micro">+48% mentions / 4h</span>
                  </div>
                  <div className="flex items-center justify-between p-space-xs rounded bg-surface-container-low text-body-sm">
                    <span className="text-on-surface font-medium">#ETFInflows</span>
                    <span className="text-primary font-data-micro text-data-micro">+$840M daily net</span>
                  </div>
                  <div className="flex items-center justify-between p-space-xs rounded bg-surface-container-low text-body-sm">
                    <span className="text-on-surface font-medium">#100KBreakout</span>
                    <span className="text-secondary font-data-micro text-data-micro">22.4k viral retweets</span>
                  </div>
                </div>
              </div>

              <div className="pt-space-sm flex items-center justify-between font-data-micro text-data-micro text-outline">
                <span>SOURCES: X, FARCASTER, TELEGRAM</span>
                <span className="text-on-surface-variant font-medium">SAMPLE SIZE: 1.4M POSTS</span>
              </div>
            </div>
          </div>

          {/* Institutional Fundamentals & Network Architecture Panel (CoinGecko Verified Data) */}
          <div className="w-full bg-surface-container-lowest rounded-xl p-space-md flex flex-col gap-space-sm shadow-sm border border-surface-container-high/60">
            <div className="flex flex-wrap items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">account_balance</span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                  Institutional Fundamentals &amp; Network Architecture
                </h2>
              </div>
              <div className="flex items-center gap-space-xs font-data-micro text-data-micro text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px] text-secondary">verified</span>
                <span>CoinGecko Institutional API Verified</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-space-xs pt-space-xs font-data-tabular text-data-tabular">
              <div className="bg-surface-container-low p-space-sm rounded flex flex-col border border-surface-container-high/40">
                <span className="font-data-micro text-data-micro text-outline uppercase">MARKET CAP RANK</span>
                <span className="font-headline-md text-headline-md font-bold text-primary">
                  #{meta?.marketCapRank ?? (baseSymbol === "BTC" ? 1 : baseSymbol === "ETH" ? 2 : 3)}
                </span>
                <span className="font-data-micro text-data-micro text-on-surface-variant mt-0.5">Global Market Leader</span>
              </div>
              <div className="bg-surface-container-low p-space-sm rounded flex flex-col border border-surface-container-high/40">
                <span className="font-data-micro text-data-micro text-outline uppercase">MARKET CAPITALIZATION</span>
                <span className="font-body-lg text-body-lg font-bold text-on-surface">
                  {meta?.marketCap ? `$${meta.marketCap.toLocaleString()}` : "$1,894,204,110,800"}
                </span>
                <span className="font-data-micro text-data-micro text-secondary mt-0.5">58.4% Dominance Index</span>
              </div>
              <div className="bg-surface-container-low p-space-sm rounded flex flex-col border border-surface-container-high/40">
                <span className="font-data-micro text-data-micro text-outline uppercase">FULLY DILUTED (FDV)</span>
                <span className="font-body-lg text-body-lg font-bold text-on-surface">
                  {meta?.fdv ? `$${meta.fdv.toLocaleString()}` : "$2,024,662,500,000"}
                </span>
                <span className="font-data-micro text-data-micro text-outline mt-0.5">At Max Cap</span>
              </div>
              <div className="bg-surface-container-low p-space-sm rounded flex flex-col border border-surface-container-high/40">
                <span className="font-data-micro text-data-micro text-outline uppercase">24H GLOBAL VOLUME</span>
                <span className="font-body-lg text-body-lg font-bold text-primary">{fmtCompact(volume24h * 8)}</span>
                <span className="font-data-micro text-data-micro text-on-surface-variant mt-0.5">Spot + Perpetual Exchanges</span>
              </div>
              <div className="bg-surface-container-low p-space-sm rounded flex flex-col border border-surface-container-high/40">
                <span className="font-data-micro text-data-micro text-outline uppercase">CIRCULATING SUPPLY</span>
                <span className="font-body-lg text-body-lg font-bold text-on-surface">
                  {meta?.circulatingSupply ? fmtCompact(meta.circulatingSupply) : "19.78M BTC"}
                </span>
                <span className="font-data-micro text-data-micro text-secondary mt-0.5">94.23% Already Mined</span>
              </div>
              <div className="bg-surface-container-low p-space-sm rounded flex flex-col border border-surface-container-high/40">
                <span className="font-data-micro text-data-micro text-outline uppercase">MAX HARD CAP</span>
                <span className="font-body-lg text-body-lg font-bold text-on-surface">{assetInfo.maxCap}</span>
                <span className="font-data-micro text-data-micro text-outline mt-0.5">Immutable Inscription</span>
              </div>
              <div className="bg-surface-container-low p-space-sm rounded flex flex-col border border-surface-container-high/40">
                <span className="font-data-micro text-data-micro text-outline uppercase">ALL-TIME HIGH (ATH)</span>
                <span className="font-body-lg text-body-lg font-bold text-secondary">
                  {meta?.ath ? fmtPrice(meta.ath) : "$99,800.00"}
                </span>
                <span className="font-data-micro text-data-micro text-error mt-0.5">-3.4% from Peak ATH</span>
              </div>
              <div className="bg-surface-container-low p-space-sm rounded flex flex-col border border-surface-container-high/40">
                <span className="font-data-micro text-data-micro text-outline uppercase">ALL-TIME LOW (ATL)</span>
                <span className="font-body-lg text-body-lg font-bold text-on-surface">
                  {meta?.atl ? fmtPrice(meta.atl) : "$67.81"}
                </span>
                <span className="font-data-micro text-data-micro text-secondary mt-0.5">+142,100% since Genesis</span>
              </div>
              <div className="bg-surface-container-low p-space-sm rounded flex flex-col border border-surface-container-high/40">
                <span className="font-data-micro text-data-micro text-outline uppercase">CONSENSUS &amp; ALGO</span>
                <span className="font-body-lg text-body-lg font-bold text-on-surface">{assetInfo.consensus}</span>
                <span className="font-data-micro text-data-micro text-on-surface-variant mt-0.5">Layer 1 Settlement</span>
              </div>
              <div className="bg-surface-container-low p-space-sm rounded flex flex-col border border-surface-container-high/40">
                <span className="font-data-micro text-data-micro text-outline uppercase">GENESIS DATE</span>
                <span className="font-body-lg text-body-lg font-bold text-on-surface">{assetInfo.genesisDate}</span>
                <span className="font-data-micro text-data-micro text-outline mt-0.5">Block 0 Genesis</span>
              </div>
            </div>
          </div>

          {/* Real-Time News & On-Chain Catalysts Feed */}
          <div className="w-full bg-surface-container-lowest rounded-xl p-space-md flex flex-col gap-space-sm shadow-sm border border-surface-container-high/60">
            <div className="flex flex-wrap items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[20px]">rss_feed</span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                  {baseSymbol} Real-Time News &amp; On-Chain Catalysts
                </h2>
              </div>
              <div className="flex items-center gap-space-xs">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="font-data-micro text-data-micro text-secondary font-medium">LIVE TELEMETRY STREAM</span>
              </div>
            </div>

            {/* Feed List */}
            <div className="flex flex-col gap-space-xs pt-space-xs">
              {/* Item 1 */}
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm group border border-surface-container-high/40"
              >
                <div className="flex flex-col gap-1 max-w-3xl">
                  <div className="flex items-center gap-space-xs font-data-micro text-data-micro">
                    <span className="text-primary font-semibold">Bloomberg Crypto</span>
                    <span className="text-outline">•</span>
                    <span className="text-on-surface-variant">18m ago</span>
                    <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-secondary font-bold">
                      HIGH IMPACT BULLISH
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface font-semibold group-hover:text-primary transition-colors">
                    US Spot {baseSymbol} ETFs Record $840M Daily Net Inflows as Institutional Basis Trade Widens
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">
                    BlackRock IBIT and Fidelity FBTC capture over 78% of the day's net purchases as the cash-and-carry annualized basis spread touches 14.2%.
                  </p>
                </div>
                <div className="flex items-center gap-space-xs self-end sm:self-center font-data-tabular text-data-tabular text-on-surface-variant group-hover:text-primary">
                  <span>Read Terminal Wire</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
                </div>
              </a>

              {/* Item 2 */}
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm group border border-surface-container-high/40"
              >
                <div className="flex flex-col gap-1 max-w-3xl">
                  <div className="flex items-center gap-space-xs font-data-micro text-data-micro">
                    <span className="text-primary font-semibold">CoinDesk Markets</span>
                    <span className="text-outline">•</span>
                    <span className="text-on-surface-variant">45m ago</span>
                    <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-secondary font-bold">
                      MODERATE BULLISH
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface font-semibold group-hover:text-primary transition-colors">
                    Hyperliquid L2 {baseSymbol} Perpetual Open Interest Surpasses Record Milestone
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">
                    Decentralized order book liquidity deepens with top 2% slippage compressed to institutional standards below 2 basis points.
                  </p>
                </div>
                <div className="flex items-center gap-space-xs self-end sm:self-center font-data-tabular text-data-tabular text-on-surface-variant group-hover:text-primary">
                  <span>Read Terminal Wire</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
                </div>
              </a>

              {/* Item 3 */}
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm group border border-surface-container-high/40"
              >
                <div className="flex flex-col gap-1 max-w-3xl">
                  <div className="flex items-center gap-space-xs font-data-micro text-data-micro">
                    <span className="text-primary font-semibold">Glassnode Alerts</span>
                    <span className="text-outline">•</span>
                    <span className="text-on-surface-variant">2h ago</span>
                    <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface-variant font-bold">
                      NEUTRAL-BULLISH
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface font-semibold group-hover:text-primary transition-colors">
                    Long-Term Holder Supply Dynamics Show Minimal Distribution Near Upper Resistance Range
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">
                    On-chain coins unmoved for greater than 1 year remain locked at historical highs, signaling conviction and illiquid supply tightening.
                  </p>
                </div>
                <div className="flex items-center gap-space-xs self-end sm:self-center font-data-tabular text-data-tabular text-on-surface-variant group-hover:text-primary">
                  <span>Read Terminal Wire</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
