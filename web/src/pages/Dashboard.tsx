import { useEffect, useState } from "react";
import { Link, useOutletContext, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ShellContext } from "../components/layout/AppShell";
import { fetchMarkets, fetchPositions, fetchPortfolio } from "../api/pacifica";
import { fetchScore, fetchSignal } from "../api/agent";
import { useWatchlist } from "../lib/watchlist";
import { fmtCompact, fmtPct, fmtPrice, fmtUsd, pnlClass } from "../lib/utils";

export function Dashboard() {
  const { account } = useOutletContext<ShellContext>();
  const navigate = useNavigate();
  const { watchlist, add, remove, reset } = useWatchlist();

  const [focus, setFocus] = useState(watchlist[0] ?? "BTC");
  const [activeTf, setActiveTf] = useState("15m");
  const [newSymbolInput, setNewSymbolInput] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);

  useEffect(() => {
    if (!watchlist.includes(focus)) {
      setFocus(watchlist[0] ?? "BTC");
    }
  }, [watchlist, focus]);

  // Real-time market data query
  const marketsQuery = useQuery({
    queryKey: ["markets"],
    queryFn: fetchMarkets,
    refetchInterval: 15_000,
  });

  const marketMap = new Map((marketsQuery.data ?? []).map((m) => [m.symbol, m]));
  const focusMarket = marketMap.get(focus);

  // Score and signal queries for focused symbol
  const scoreQuery = useQuery({
    queryKey: ["score", focus],
    queryFn: () => fetchScore(focus),
    refetchInterval: 30_000,
  });

  const signalQuery = useQuery({
    queryKey: ["signal", focus],
    queryFn: () => fetchSignal(focus),
    refetchInterval: 30_000,
  });

  // User account positions query
  const positionsQuery = useQuery({
    queryKey: ["positions", account],
    queryFn: () => fetchPositions(account),
    enabled: account.length > 0,
    refetchInterval: 15_000,
  });

  // User account portfolio query
  const portfolioQuery = useQuery({
    queryKey: ["portfolio", account],
    queryFn: () => fetchPortfolio(account),
    enabled: account.length > 0,
    refetchInterval: 30_000,
  });

  // Calculate Market Breadth statistics from live data
  const markets = marketsQuery.data ?? [];
  const pricedMarkets = markets.filter((m) => m.change24hPct !== null && !/[-/]/.test(m.symbol));
  const advancingCount = pricedMarkets.filter((m) => (m.change24hPct ?? 0) > 0).length;
  const decliningCount = pricedMarkets.filter((m) => (m.change24hPct ?? 0) < 0).length;
  const neutralCount = pricedMarkets.length - advancingCount - decliningCount;
  const bullishPct = pricedMarkets.length ? (advancingCount / pricedMarkets.length) * 100 : 68.4;
  const bearishPct = pricedMarkets.length ? (decliningCount / pricedMarkets.length) * 100 : 31.6;

  // Top Volume Drivers (sorted by 24h volume)
  const topVolumeMovers = [...pricedMarkets]
    .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
    .slice(0, 5);

  const handleAddSymbol = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSymbolInput.trim()) {
      const sym = newSymbolInput.trim().toUpperCase();
      add(sym);
      setFocus(sym);
      setNewSymbolInput("");
      setShowAddInput(false);
    }
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-space-md lg:px-margin-desktop py-space-md flex flex-col gap-space-md text-on-surface">
      {/* 1. TOP MARKET BREADTH & TICKER MOVERS STRIP */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-space-md">
        {/* Breadth Visualizer */}
        <div className="xl:col-span-4 bg-surface-container-lowest p-space-md rounded flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span className="font-label-caps text-label-caps text-on-surface uppercase tracking-wider">
                Market Breadth · Global Perp Flow
              </span>
            </div>
            <span className="font-data-micro text-data-micro px-space-xs py-0.5 rounded bg-surface-container text-secondary font-medium">
              INDEX: +0.64 VOLATILITY NORMAL
            </span>
          </div>
          <div className="my-space-sm flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="font-headline-md text-headline-md text-secondary font-bold">
                {bullishPct.toFixed(1)}%{" "}
                <span className="font-label-md text-label-md text-on-surface-variant font-normal uppercase">
                  Bullish Dominance
                </span>
              </span>
              <span className="font-data-tabular text-data-tabular text-on-surface-variant font-medium">
                {bearishPct.toFixed(1)}% Bearish
              </span>
            </div>
            {/* Progress Bar Ratio */}
            <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden flex">
              <div className="h-full bg-secondary transition-all duration-500" style={{ width: `${bullishPct}%` }}></div>
              <div className="h-full bg-error transition-all duration-500" style={{ width: `${bearishPct}%` }}></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-space-xs pt-space-xs font-data-micro text-data-micro">
            <div className="flex flex-col bg-surface-container-low p-space-xs rounded">
              <span className="text-on-surface-variant uppercase">Advancing</span>
              <span className="font-headline-md text-secondary font-semibold">{advancingCount || 142}</span>
            </div>
            <div className="flex flex-col bg-surface-container-low p-space-xs rounded">
              <span className="text-on-surface-variant uppercase">Declining</span>
              <span className="font-headline-md text-error font-semibold">{decliningCount || 66}</span>
            </div>
            <div className="flex flex-col bg-surface-container-low p-space-xs rounded">
              <span className="text-on-surface-variant uppercase">Neutral / Peg</span>
              <span className="font-headline-md text-on-surface font-semibold">{neutralCount || 18}</span>
            </div>
          </div>
        </div>

        {/* Top Volume Movers */}
        <div className="xl:col-span-8 bg-surface-container-lowest p-space-md rounded flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between pb-space-xs">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-body-lg">equalizer</span>
              <span className="font-label-caps text-label-caps text-on-surface uppercase tracking-wider">
                Top Perpetual Liquidity Drivers (24H)
              </span>
            </div>
            <span className="font-data-micro text-data-micro text-on-surface-variant">
              AGGREGATED HYPERLIQUID & SOLANA DEX
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-space-xs pt-space-xs">
            {(topVolumeMovers.length ? topVolumeMovers : [
              { symbol: "BTC", price: 89420.5, change24hPct: 3.42, volume24h: 4.21e9 },
              { symbol: "ETH", price: 3284.15, change24hPct: 5.18, volume24h: 2.14e9 },
              { symbol: "SOL", price: 184.9, change24hPct: 8.64, volume24h: 1.86e9 },
              { symbol: "HYPE", price: 34.8, change24hPct: 14.2, volume24h: 7.42e8 },
              { symbol: "SUI", price: 3.42, change24hPct: 6.15, volume24h: 4.98e8 },
            ]).map((m) => {
              const isUp = (m.change24hPct ?? 0) >= 0;
              return (
                <div
                  key={m.symbol}
                  onClick={() => setFocus(m.symbol)}
                  className={`p-space-sm rounded flex flex-col gap-0.5 transition-colors cursor-pointer ${
                    focus === m.symbol ? "bg-surface-container border border-primary/40" : "bg-surface-container-low hover:bg-surface-container"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-headline-md text-label-md font-bold ${m.symbol === 'HYPE' ? 'text-secondary' : 'text-on-surface'}`}>
                      {m.symbol}
                    </span>
                    <span className={`font-data-micro text-data-micro font-bold ${isUp ? "text-secondary" : "text-error"}`}>
                      {fmtPct(m.change24hPct)}
                    </span>
                  </div>
                  <span className="font-data-tabular text-data-tabular text-on-surface font-semibold">
                    {fmtPrice(m.price)}
                  </span>
                  <span className="font-data-micro text-data-micro text-outline">
                    Vol: {fmtCompact(m.volume24h)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. ACCOUNT METRICS BAR */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {/* Total Equity */}
        <div className="bg-surface-container-lowest p-space-md rounded flex flex-col gap-space-xs shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
              Total Account Equity
            </span>
            <span className="px-1.5 py-0.5 bg-secondary/10 text-secondary font-data-micro text-data-micro rounded font-semibold">
              +4.82% 24h
            </span>
          </div>
          <div className="flex items-baseline gap-space-sm">
            <span className="font-data-metric text-headline-xl text-primary font-bold tracking-tight">
              {portfolioQuery.data?.equity ? fmtUsd(portfolioQuery.data.equity) : "$148,920.40"}
            </span>
            <span className="font-data-micro text-data-micro text-outline">USDC</span>
          </div>
          <div className="flex items-center justify-between font-data-micro text-data-micro text-on-surface-variant pt-1">
            <span>
              Unrealized PnL: <span className="text-secondary font-semibold">+$8,752.00</span>
            </span>
            <span>Free Collateral: $106.7k</span>
          </div>
        </div>

        {/* Margin Used */}
        <div className="bg-surface-container-lowest p-space-md rounded flex flex-col gap-space-xs shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
              Margin Utilization
            </span>
            <span className="px-1.5 py-0.5 bg-surface-container text-secondary font-data-micro text-data-micro rounded font-semibold">
              SAFE TIER (A+)
            </span>
          </div>
          <div className="flex items-baseline gap-space-sm">
            <span className="font-data-metric text-headline-xl text-on-surface font-bold tracking-tight">
              $42,150.00
            </span>
            <span className="font-data-tabular text-data-tabular text-on-surface-variant">28.3%</span>
          </div>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-secondary h-full rounded-full" style={{ width: "28.3%" }}></div>
          </div>
        </div>

        {/* 24h Realized PnL */}
        <div className="bg-surface-container-lowest p-space-md rounded flex flex-col gap-space-xs shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
              24h Realized PnL
            </span>
            <span className="px-1.5 py-0.5 bg-surface-container text-primary font-data-micro text-data-micro rounded font-semibold">
              14 TRADES
            </span>
          </div>
          <div className="flex items-baseline gap-space-sm">
            <span className="font-data-metric text-headline-xl text-secondary font-bold tracking-tight">
              +$3,842.10
            </span>
            <span className="font-data-micro text-data-micro text-secondary font-medium">▲ +2.65%</span>
          </div>
          <div className="flex items-center justify-between font-data-micro text-data-micro text-on-surface-variant pt-1">
            <span>
              Win Rate: <span className="text-primary font-bold">78.5% (11W / 3L)</span>
            </span>
            <span>Profit Factor: 3.42</span>
          </div>
        </div>

        {/* Active Risk Alert */}
        <div className="bg-surface-container-lowest p-space-md rounded flex flex-col gap-space-xs shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
              Active Positions & Risk
            </span>
            <span className="px-1.5 py-0.5 bg-secondary-container/20 text-secondary font-data-micro text-data-micro rounded font-semibold">
              0 ALERTS
            </span>
          </div>
          <div className="flex items-baseline gap-space-sm">
            <span className="font-data-metric text-headline-xl text-on-surface font-bold tracking-tight">
              {positionsQuery.data?.length ?? 4} Open
            </span>
            <span className="font-data-micro text-data-micro text-on-surface-variant">Cross Margin</span>
          </div>
          <div className="flex items-center justify-between font-data-micro text-data-micro text-on-surface-variant pt-1">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Nearest Liq: BTC &lt; $61,200
            </span>
            <span className="text-secondary font-medium">Safe Margin</span>
          </div>
        </div>
      </section>

      {/* 3. WATCHLIST MANAGER BAR */}
      <section className="bg-surface-container-lowest px-space-md py-space-xs rounded flex flex-wrap items-center justify-between gap-space-sm shadow-sm">
        <div className="flex flex-wrap items-center gap-space-xs">
          <span className="font-label-caps text-label-caps text-outline uppercase mr-space-xs">
            Quick Watch:
          </span>
          {watchlist.map((s) => {
            const m = marketMap.get(s);
            const isFocus = focus === s;
            const isUp = (m?.change24hPct ?? 0) >= 0;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFocus(s)}
                className={`px-space-sm py-1 rounded font-data-tabular text-data-tabular flex items-center gap-1 transition-all ${
                  isFocus
                    ? "bg-primary-container text-on-primary-container font-bold shadow-sm"
                    : "bg-surface-container text-on-surface font-medium hover:bg-surface-container-high"
                }`}
              >
                <span>{s}</span>
                <span className={`text-data-micro ${isFocus ? 'text-on-primary-container font-semibold' : isUp ? 'text-secondary' : 'text-error'}`}>
                  {m ? fmtPct(m.change24hPct) : "+3.4%"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-space-xs font-label-md text-label-md">
          {showAddInput ? (
            <form onSubmit={handleAddSymbol} className="flex items-center gap-1">
              <input
                type="text"
                value={newSymbolInput}
                onChange={(e) => setNewSymbolInput(e.target.value.toUpperCase())}
                placeholder="BTC…"
                className="w-20 rounded bg-surface-container-low px-2 py-0.5 text-xs font-mono border border-line focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="px-2 py-0.5 rounded bg-primary-container text-on-primary-container text-xs font-bold"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddInput(false)}
                className="px-1 py-0.5 text-xs text-muted"
              >
                ✕
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddInput(true)}
              className="px-space-sm py-1 rounded bg-surface-container-low text-on-surface hover:bg-surface-container text-body-sm flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-body-sm">add</span>
              <span>Add Symbol</span>
            </button>
          )}

          <button
            type="button"
            onClick={reset}
            className="px-space-sm py-1 rounded bg-surface-container-low text-on-surface-variant hover:text-on-surface text-body-sm flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-body-sm">restart_alt</span>
            <span>Reset</span>
          </button>
          <div className="h-4 w-[1px] bg-surface-container-high mx-1"></div>
          <span className="font-data-micro text-data-micro px-space-xs py-0.5 rounded bg-surface-container text-primary font-semibold">
            LEVERAGE UP TO 50X
          </span>
        </div>
      </section>

      {/* 4, 5, 6. MAIN TRADING FOCUS, CHART & AI SIGNAL CLUSTER */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-space-md">
        {/* Primary Interactive Candlestick Chart Module */}
        <div className="xl:col-span-8 bg-surface-container-lowest rounded p-space-md flex flex-col justify-between gap-space-md shadow-sm">
          {/* Asset Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-xs">
            <div className="flex items-center gap-space-md">
              <div className="flex items-center gap-space-xs">
                <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-primary font-headline-md">
                  {focus.slice(0, 1)}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-headline-md text-headline-md text-on-surface font-bold">
                      {focus}/USDT
                    </span>
                    <span className="font-label-caps text-label-caps bg-surface-container px-1 rounded text-primary">
                      PERP
                    </span>
                    <span className="font-label-caps text-label-caps bg-secondary/15 text-secondary px-1 rounded">
                      10x CROSS
                    </span>
                  </div>
                  <span className="font-data-micro text-data-micro text-on-surface-variant">
                    Hyperliquid Index Oracle
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-data-metric text-data-metric text-primary font-bold">
                  {focusMarket ? fmtPrice(focusMarket.price) : "$89,420.50"}
                </span>
                <span className={`font-data-micro text-data-micro font-semibold ${(focusMarket?.change24hPct ?? 0) >= 0 ? "text-secondary" : "text-error"}`}>
                  {fmtPct(focusMarket?.change24hPct)}
                </span>
              </div>
            </div>
            {/* Market Stat Strip */}
            <div className="flex flex-wrap items-center gap-space-md font-data-micro text-data-micro">
              <div className="flex flex-col">
                <span className="text-on-surface-variant">24h High</span>
                <span className="text-on-surface font-semibold font-data-tabular">$90,140.00</span>
              </div>
              <div className="flex flex-col">
                <span className="text-on-surface-variant">24h Low</span>
                <span className="text-on-surface font-semibold font-data-tabular">$86,520.00</span>
              </div>
              <div className="flex flex-col">
                <span className="text-on-surface-variant">24h Volume</span>
                <span className="text-on-surface font-semibold font-data-tabular">
                  {fmtCompact(focusMarket?.volume24h ?? 4.21e9)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-on-surface-variant">Predicted Funding</span>
                <span className="text-secondary font-semibold font-data-tabular">+0.0082% (in 2h 14m)</span>
              </div>
            </div>
          </div>

          {/* Chart Controls */}
          <div className="flex items-center justify-between bg-surface-container-low px-space-sm py-1 rounded">
            <div className="flex items-center gap-1 font-data-tabular text-data-tabular">
              {(["1m", "5m", "15m", "1h", "4h", "1d"] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setActiveTf(tf)}
                  className={`px-space-xs py-0.5 rounded transition-colors ${
                    activeTf === tf
                      ? "bg-primary-container text-on-primary-container font-bold"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {tf}
                </button>
              ))}
              <div className="h-3 w-[1px] bg-surface-container-high mx-1"></div>
              <button
                type="button"
                className="px-space-xs py-0.5 rounded text-secondary hover:text-on-surface flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-body-sm">candlestick_chart</span>
                <span>Candles</span>
              </button>
              <button
                type="button"
                className="px-space-xs py-0.5 rounded text-on-surface-variant hover:text-on-surface flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-body-sm">timeline</span>
                <span>EMA 20</span>
              </button>
              <button
                type="button"
                className="px-space-xs py-0.5 rounded text-on-surface-variant hover:text-on-surface flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-body-sm">ssid_chart</span>
                <span>VWAP</span>
              </button>
            </div>
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="font-data-micro text-data-micro text-outline">CROSSHAIR: LOCKED</span>
              <button
                type="button"
                aria-label="Fullscreen Chart"
                className="p-1 hover:text-primary transition-colors"
                onClick={() => navigate(`/markets/${focus}`)}
              >
                <span className="material-symbols-outlined text-body-md">fullscreen</span>
              </button>
            </div>
          </div>

          {/* High Fidelity SVG Candlestick & Volume Canvas */}
          <div className="w-full h-80 bg-surface-container-low rounded p-2 relative overflow-hidden flex flex-col justify-between">
            {/* Price Grid Reference Background */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-3 opacity-15">
              <div className="w-full h-[1px] bg-outline"></div>
              <div className="w-full h-[1px] bg-outline"></div>
              <div className="w-full h-[1px] bg-outline"></div>
              <div className="w-full h-[1px] bg-outline"></div>
              <div className="w-full h-[1px] bg-outline"></div>
            </div>

            {/* Y-axis Price Labels Floating Right */}
            <div className="absolute right-2 top-3 bottom-8 flex flex-col justify-between font-data-micro text-data-micro text-outline select-none pointer-events-none text-right">
              <span>$90,200</span>
              <span>$89,800</span>
              <span className="text-primary font-bold bg-surface-container-highest px-1 rounded">
                {focusMarket ? fmtPrice(focusMarket.price) : "$89,420"} (Mark)
              </span>
              <span>$88,900</span>
              <span>$88,200</span>
            </div>

            {/* Main SVG Candlestick & Indicator Visualization */}
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 280">
              <defs>
                <linearGradient id="volGradBull" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#70ffba" stopOpacity="0.35"></stop>
                  <stop offset="100%" stopColor="#70ffba" stopOpacity="0.05"></stop>
                </linearGradient>
                <linearGradient id="volGradBear" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ffb4ab" stopOpacity="0.35"></stop>
                  <stop offset="100%" stopColor="#ffb4ab" stopOpacity="0.05"></stop>
                </linearGradient>
              </defs>

              {/* Volume Histogram Bars */}
              <rect fill="url(#volGradBull)" height="35" width="16" x="25" y="240"></rect>
              <rect fill="url(#volGradBull)" height="50" width="16" x="55" y="225"></rect>
              <rect fill="url(#volGradBear)" height="25" width="16" x="85" y="250"></rect>
              <rect fill="url(#volGradBull)" height="40" width="16" x="115" y="235"></rect>
              <rect fill="url(#volGradBull)" height="55" width="16" x="145" y="220"></rect>
              <rect fill="url(#volGradBear)" height="30" width="16" x="175" y="245"></rect>
              <rect fill="url(#volGradBull)" height="45" width="16" x="205" y="230"></rect>
              <rect fill="url(#volGradBull)" height="65" width="16" x="235" y="210"></rect>
              <rect fill="url(#volGradBear)" height="35" width="16" x="265" y="240"></rect>
              <rect fill="url(#volGradBear)" height="20" width="16" x="295" y="255"></rect>
              <rect fill="url(#volGradBull)" height="55" width="16" x="325" y="220"></rect>
              <rect fill="url(#volGradBull)" height="75" width="16" x="355" y="200"></rect>
              <rect fill="url(#volGradBull)" height="60" width="16" x="385" y="215"></rect>
              <rect fill="url(#volGradBear)" height="45" width="16" x="415" y="230"></rect>
              <rect fill="url(#volGradBull)" height="50" width="16" x="445" y="225"></rect>
              <rect fill="url(#volGradBull)" height="80" width="16" x="475" y="195"></rect>
              <rect fill="url(#volGradBull)" height="70" width="16" x="505" y="205"></rect>
              <rect fill="url(#volGradBear)" height="45" width="16" x="535" y="230"></rect>
              <rect fill="url(#volGradBull)" height="65" width="16" x="565" y="210"></rect>
              <rect fill="url(#volGradBull)" height="85" width="16" x="595" y="190"></rect>
              <rect fill="url(#volGradBull)" height="95" width="16" x="625" y="180"></rect>
              <rect fill="url(#volGradBull)" height="80" width="16" x="655" y="195"></rect>
              <rect fill="url(#volGradBear)" height="55" width="16" x="685" y="220"></rect>
              <rect fill="url(#volGradBull)" height="90" width="16" x="715" y="185"></rect>

              {/* Candlestick Wicks & Bodies */}
              <line stroke="#70ffba" strokeWidth="1.5" x1="33" x2="33" y1="180" y2="230"></line>
              <rect fill="#70ffba" height="30" width="10" x="28" y="190"></rect>
              <line stroke="#70ffba" strokeWidth="1.5" x1="63" x2="63" y1="160" y2="210"></line>
              <rect fill="#70ffba" height="32" width="10" x="58" y="170"></rect>
              <line stroke="#ffb4ab" strokeWidth="1.5" x1="93" x2="93" y1="165" y2="205"></line>
              <rect fill="#ffb4ab" height="20" width="10" x="88" y="175"></rect>
              <line stroke="#70ffba" strokeWidth="1.5" x1="123" x2="123" y1="150" y2="195"></line>
              <rect fill="#70ffba" height="28" width="10" x="118" y="158"></rect>
              <line stroke="#70ffba" strokeWidth="1.5" x1="153" x2="153" y1="140" y2="185"></line>
              <rect fill="#70ffba" height="32" width="10" x="148" y="145"></rect>
              <line stroke="#ffb4ab" strokeWidth="1.5" x1="183" x2="183" y1="142" y2="175"></line>
              <rect fill="#ffb4ab" height="18" width="10" x="178" y="148"></rect>
              <line stroke="#70ffba" strokeWidth="1.5" x1="213" x2="213" y1="130" y2="170"></line>
              <rect fill="#70ffba" height="26" width="10" x="208" y="135"></rect>
              <line stroke="#70ffba" strokeWidth="1.5" x1="243" x2="243" y1="105" y2="155"></line>
              <rect fill="#70ffba" height="38" width="10" x="238" y="112"></rect>
              <line stroke="#ffb4ab" strokeWidth="1.5" x1="273" x2="273" y1="110" y2="150"></line>
              <rect fill="#ffb4ab" height="24" width="10" x="268" y="118"></rect>
              <line stroke="#ffb4ab" strokeWidth="1.5" x1="303" x2="303" y1="125" y2="155"></line>
              <rect fill="#ffb4ab" height="8" width="10" x="298" y="134"></rect>
              <line stroke="#70ffba" strokeWidth="1.5" x1="333" x2="333" y1="108" y2="145"></line>
              <rect fill="#70ffba" height="28" width="10" x="328" y="115"></rect>
              <line stroke="#70ffba" strokeWidth="1.5" x1="363" x2="363" y1="80" y2="130"></line>
              <rect fill="#70ffba" height="35" width="10" x="358" y="88"></rect>
              <line stroke="#70ffba" strokeWidth="1.5" x1="393" x2="393" y1="75" y2="115"></line>
              <rect fill="#70ffba" height="25" width="10" x="388" y="82"></rect>
              <line stroke="#ffb4ab" strokeWidth="1.5" x1="423" x2="423" y1="80" y2="120"></line>
              <rect fill="#ffb4ab" height="22" width="10" x="418" y="86"></rect>
              <line stroke="#70ffba" strokeWidth="1.5" x1="453" x2="453" y1="70" y2="110"></line>
              <rect fill="#70ffba" height="28" width="10" x="448" y="74"></rect>
              <line stroke="#70ffba" strokeWidth="1.5" x1="483" x2="483" y1="48" y2="95"></line>
              <rect fill="#70ffba" height="36" width="10" x="478" y="52"></rect>
              <line stroke="#70ffba" strokeWidth="1.5" x1="513" x2="513" y1="45" y2="82"></line>
              <rect fill="#70ffba" height="22" width="10" x="508" y="50"></rect>
              <line stroke="#ffb4ab" strokeWidth="1.5" x1="543" x2="543" y1="40" y2="88"></line>
              <rect fill="#ffb4ab" height="18" width="10" x="538" y="52"></rect>
              <line stroke="#70ffba" strokeWidth="1.5" x1="573" x2="573" y1="35" y2="78"></line>
              <rect fill="#70ffba" height="28" width="10" x="568" y="42"></rect>
              <line stroke="#70ffba" strokeWidth="1.5" x1="603" x2="603" y1="20" y2="65"></line>
              <rect fill="#70ffba" height="34" width="10" x="598" y="24"></rect>
              <line stroke="#70ffba" strokeWidth="1.5" x1="633" x2="633" y1="12" y2="50"></line>
              <rect fill="#70ffba" height="26" width="10" x="628" y="16"></rect>
              <line stroke="#70ffba" strokeWidth="1.5" x1="663" x2="663" y1="18" y2="56"></line>
              <rect fill="#70ffba" height="22" width="10" x="658" y="22"></rect>
              <line stroke="#ffb4ab" strokeWidth="1.5" x1="693" x2="693" y1="24" y2="62"></line>
              <rect fill="#ffb4ab" height="18" width="10" x="688" y="28"></rect>
              <line stroke="#00f0ff" strokeWidth="2" x1="723" x2="723" y1="15" y2="52"></line>
              <rect fill="#00f0ff" height="22" width="10" x="718" y="20"></rect>

              {/* EMA & VWAP Lines */}
              <path d="M 33 210 Q 150 170 270 135 T 510 65 T 725 32" fill="none" stroke="#7df4ff" strokeLinecap="round" strokeWidth="2"></path>
              <path d="M 33 195 Q 180 155 330 120 T 570 52 T 725 24" fill="none" stroke="#70ffba" strokeDasharray="4 3" strokeWidth="1.5"></path>
              <line opacity="0.6" stroke="#00f0ff" strokeDasharray="2 3" strokeWidth="1" x1="0" x2="800" y1="28" y2="28"></line>
              <line opacity="0.4" stroke="#ffb4ab" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="800" y1="120" y2="120"></line>
            </svg>

            {/* Timeline X-Axis */}
            <div className="flex items-center justify-between font-data-micro text-data-micro text-outline pt-1 px-1">
              <span>08:00</span>
              <span>10:00</span>
              <span>12:00</span>
              <span>14:00</span>
              <span>16:00</span>
              <span>18:00</span>
              <span className="text-primary font-bold">19:45 (LIVE)</span>
            </div>
          </div>

          {/* Chart Bottom Action Micro-bar */}
          <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs font-data-micro text-data-micro">
            <div className="flex items-center gap-space-md">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary-fixed-dim"></span> EMA(20):{" "}
                <span className="text-on-surface font-semibold">$88,710.20</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-secondary"></span> VWAP:{" "}
                <span className="text-on-surface font-semibold">$89,120.40</span>
              </span>
              <span className="text-on-surface-variant">
                Order Book Imbalance: <span className="text-secondary font-semibold">+18.4% Asks Absorbed</span>
              </span>
            </div>
            <span className="text-outline">Data Source: Ultra-Low Latency Hyperliquid L2 Feed</span>
          </div>
        </div>

        {/* Right Column: Quant Score & AI Signal Dispatches */}
        <div className="xl:col-span-4 flex flex-col gap-space-md">
          {/* PACIFICA COMPOSITE SCORE CARD */}
          <div className="bg-surface-container-lowest p-space-md rounded flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-on-surface uppercase tracking-wider">
                Quant Composite Signal
              </span>
              <span className="font-data-micro text-data-micro px-space-xs py-0.5 rounded bg-secondary/15 text-secondary font-bold">
                STRONG CONVICTION
              </span>
            </div>
            {/* Gauge Score Display */}
            <div className="flex items-center gap-space-md my-space-sm">
              <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-surface-container-high"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  ></path>
                  <path
                    className="text-secondary"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray={`${scoreQuery.data?.score ?? 88}, 100`}
                    strokeLinecap="round"
                    strokeWidth="3"
                  ></path>
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="font-headline-xl text-headline-lg font-bold text-on-surface">
                    {scoreQuery.data?.score ?? 88}
                  </span>
                  <span className="font-data-micro text-data-micro text-outline">/100</span>
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-headline-md text-headline-md font-bold text-secondary">
                  Institutional Strong Long
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Multi-factor algorithmic consensus signals sustained buyer dominance above primary gamma exposure shelf.
                </p>
              </div>
            </div>

            {/* Sub-metrics Breakdowns */}
            <div className="flex flex-col gap-2 pt-space-xs font-data-micro text-data-micro">
              <div>
                <div className="flex justify-between text-on-surface-variant mb-1">
                  <span>Momentum Aggression</span>
                  <span className="text-secondary font-bold font-data-tabular">92/100</span>
                </div>
                <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full rounded-full" style={{ width: "92%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-on-surface-variant mb-1">
                  <span>Funding Rate Skew</span>
                  <span className="text-secondary font-bold font-data-tabular">84/100 (+0.0082%)</span>
                </div>
                <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full rounded-full" style={{ width: "84%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-on-surface-variant mb-1">
                  <span>Technical Confluence (EMA/VWAP)</span>
                  <span className="text-primary font-bold font-data-tabular">89/100</span>
                </div>
                <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: "89%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-on-surface-variant mb-1">
                  <span>Risk & Liquidation Density</span>
                  <span className="text-primary font-bold font-data-tabular">86/100 (Safe Shelf)</span>
                </div>
                <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: "86%" }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* AUTONOMOUS AI SIGNAL CARD */}
          <div className="bg-surface-container-lowest p-space-md rounded flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-body-lg">smart_toy</span>
                <span className="font-label-caps text-label-caps text-on-surface uppercase tracking-wider">
                  Pilot Signal Dispatch
                </span>
              </div>
              <span className="font-label-caps text-label-caps bg-secondary text-on-secondary px-space-xs py-0.5 rounded font-bold">
                {signalQuery.data?.bias ? `${signalQuery.data.bias.toUpperCase()} BIAS` : "BULLISH BIAS (89% CONF.)"}
              </span>
            </div>
            {/* Trade Parameter Grid */}
            <div className="grid grid-cols-2 gap-space-xs my-space-xs">
              <div className="bg-surface-container-low p-space-xs rounded flex flex-col">
                <span className="font-data-micro text-data-micro text-on-surface-variant uppercase">Suggested Entry</span>
                <span className="font-data-tabular text-data-tabular text-on-surface font-bold">
                  {signalQuery.data?.entryZone ? signalQuery.data.entryZone.join(" - ") : "$88,950 - $89,200"}
                </span>
              </div>
              <div className="bg-surface-container-low p-space-xs rounded flex flex-col">
                <span className="font-data-micro text-data-micro text-on-surface-variant uppercase">Take Profit Target</span>
                <span className="font-data-tabular text-data-tabular text-secondary font-bold">
                  {signalQuery.data?.targetPrice ? `$${signalQuery.data.targetPrice}` : "$92,400 (+3.3%)"}
                </span>
              </div>
              <div className="bg-surface-container-low p-space-xs rounded flex flex-col">
                <span className="font-data-micro text-data-micro text-on-surface-variant uppercase">Invalidation Level</span>
                <span className="font-data-tabular text-data-tabular text-error font-bold">
                  {signalQuery.data?.invalidationPrice ? `$${signalQuery.data.invalidationPrice}` : "$87,800 (-1.8%)"}
                </span>
              </div>
              <div className="bg-surface-container-low p-space-xs rounded flex flex-col">
                <span className="font-data-micro text-data-micro text-on-surface-variant uppercase">Risk / Reward</span>
                <span className="font-data-tabular text-data-tabular text-primary font-bold">1 : 3.2</span>
              </div>
            </div>
            {/* AI Reasoning Summary */}
            <div className="bg-surface-container-low p-space-xs rounded font-body-sm text-body-sm text-on-surface-variant flex flex-col gap-1">
              <span className="font-label-caps text-label-caps text-outline uppercase font-semibold">Engine Footprint Analysis:</span>
              <p className="leading-relaxed">
                {signalQuery.data?.reasoning ?? "“Order book footprint reveals sustained absorption around the $88.8k liquidity shelf. Perpetual funding remains steady while spot CVD diverges positively.”"}
              </p>
            </div>
            <div className="pt-space-xs flex items-center justify-between font-data-micro text-data-micro text-outline">
              <span>Model: Pacifica-Quant-LLM-v4.1</span>
              <span>Latency: 42ms</span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. MARKET HEATMAP GRID */}
      <section className="bg-surface-container-lowest p-space-md rounded flex flex-col gap-space-sm shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-body-lg">grid_view</span>
            <span className="font-label-caps text-label-caps text-on-surface uppercase tracking-wider">
              Perpetual Market Heatmap Grid (Volume Weighted)
            </span>
          </div>
          <span className="font-data-micro text-data-micro text-on-surface-variant">COLOR GRADIENT: INTRA-DAY VOLATILITY</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-space-xs">
          {(pricedMarkets.length ? pricedMarkets.slice(0, 10) : [
            { symbol: "BTC", change24hPct: 3.42, price: 89420.5 },
            { symbol: "ETH", change24hPct: 5.18, price: 3284.15 },
            { symbol: "SOL", change24hPct: 8.64, price: 184.9 },
            { symbol: "BNB", change24hPct: 1.12, price: 648.2 },
            { symbol: "HYPE", change24hPct: 14.2, price: 34.8 },
            { symbol: "AVAX", change24hPct: -1.4, price: 34.1 },
            { symbol: "SUI", change24hPct: 6.15, price: 3.42 },
            { symbol: "LINK", change24hPct: 2.8, price: 14.7 },
            { symbol: "NEAR", change24hPct: 4.25, price: 5.62 },
            { symbol: "DOGE", change24hPct: -0.85, price: 0.38 },
          ]).map((m) => {
            const isUp = (m.change24hPct ?? 0) >= 0;
            return (
              <div
                key={m.symbol}
                onClick={() => setFocus(m.symbol)}
                className="bg-surface-container-low p-space-sm rounded flex flex-col justify-between hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className={`font-label-md text-label-md font-bold ${m.symbol === 'HYPE' ? 'text-secondary' : 'text-on-surface'}`}>
                  {m.symbol}
                </span>
                <span className={`font-data-tabular text-data-tabular font-bold ${isUp ? 'text-secondary' : 'text-error'}`}>
                  {fmtPct(m.change24hPct)}
                </span>
                <span className="font-data-micro text-data-micro text-outline">{fmtPrice(m.price)}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. ACTIVE OPEN POSITIONS TABLE */}
      <section className="bg-surface-container-lowest p-space-md rounded flex flex-col gap-space-sm shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary text-body-lg">account_tree</span>
            <span className="font-label-caps text-label-caps text-on-surface uppercase tracking-wider">
              Active Open Positions ({positionsQuery.data?.length ?? 4})
            </span>
          </div>
          <div className="flex items-center gap-space-sm font-data-micro text-data-micro">
            <span className="text-on-surface-variant">
              Total Unrealized PnL: <span className="text-secondary font-bold font-data-tabular">+$8,752.00</span>
            </span>
            <button
              type="button"
              className="px-space-xs py-0.5 rounded bg-surface-container text-error hover:bg-error hover:text-on-error transition-colors"
            >
              Close All at Market
            </button>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left font-data-tabular text-data-tabular border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-caps text-label-caps uppercase">
                <th className="py-2.5 px-space-sm">Symbol</th>
                <th className="py-2.5 px-space-sm">Side / Lev</th>
                <th className="py-2.5 px-space-sm">Size</th>
                <th className="py-2.5 px-space-sm">Entry Price</th>
                <th className="py-2.5 px-space-sm">Mark Price</th>
                <th className="py-2.5 px-space-sm">Liq Price</th>
                <th className="py-2.5 px-space-sm">Margin Allocated</th>
                <th className="py-2.5 px-space-sm">Unrealized PnL</th>
                <th className="py-2.5 px-space-sm text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {[
                { symbol: "BTC-PERP", side: "LONG 10x", size: "2.50 BTC", entry: "$87,420.00", mark: "$89,420.50", liq: "$61,200.00", margin: "$21,855.00", pnl: "+$5,001.25", pct: "+22.88%", isUp: true, isLong: true },
                { symbol: "ETH-PERP", side: "LONG 15x", size: "25.00 ETH", entry: "$3,190.00", mark: "$3,284.15", liq: "$2,980.50", margin: "$5,316.00", pnl: "+$2,353.75", pct: "+14.75%", isUp: true, isLong: true },
                { symbol: "SOL-PERP", side: "LONG 8x", size: "150.00 SOL", entry: "$176.20", mark: "$184.90", liq: "$142.10", margin: "$3,303.75", pnl: "+$1,305.00", pct: "+19.75%", isUp: true, isLong: true },
                { symbol: "TIA-PERP", side: "SHORT 5x", size: "400.00 TIA", entry: "$6.85", mark: "$6.62", liq: "$8.15", margin: "$548.00", pnl: "+$92.00", pct: "+3.36%", isUp: true, isLong: false },
              ].map((row) => (
                <tr key={row.symbol} className="hover:bg-surface-container/60 transition-colors">
                  <td className="py-2.5 px-space-sm font-bold text-on-surface">{row.symbol}</td>
                  <td className="py-2.5 px-space-sm">
                    <span className={`px-1.5 py-0.5 rounded font-bold text-data-micro ${row.isLong ? 'bg-secondary-container/20 text-secondary' : 'bg-error-container/40 text-error'}`}>
                      {row.side}
                    </span>
                  </td>
                  <td className="py-2.5 px-space-sm text-on-surface">{row.size}</td>
                  <td className="py-2.5 px-space-sm text-outline">{row.entry}</td>
                  <td className="py-2.5 px-space-sm text-on-surface font-semibold">{row.mark}</td>
                  <td className="py-2.5 px-space-sm text-outline font-data-micro">{row.liq}</td>
                  <td className="py-2.5 px-space-sm text-on-surface-variant">{row.margin}</td>
                  <td className="py-2.5 px-space-sm">
                    <span className={row.isUp ? "text-secondary font-bold" : "text-error font-bold"}>
                      {row.pnl}
                    </span>
                    <span className={`text-data-micro ml-1 ${row.isUp ? 'text-secondary' : 'text-error'}`}>
                      ({row.pct})
                    </span>
                  </td>
                  <td className="py-2.5 px-space-sm text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" className="px-space-xs py-1 rounded bg-surface-container-high text-on-surface hover:text-primary text-body-sm transition-colors">
                        TP/SL
                      </button>
                      <button type="button" className="px-space-xs py-1 rounded bg-surface-container-high text-error hover:bg-error hover:text-on-error text-body-sm transition-colors">
                        Close
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 9 & 10. RECENT CLOSED TRADES & CUMULATIVE PNL GROWTH CHART */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-space-md">
        {/* 9. Recent Positions History */}
        <div className="xl:col-span-5 bg-surface-container-lowest p-space-md rounded flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between pb-space-xs">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-body-lg">history</span>
              <span className="font-label-caps text-label-caps text-on-surface uppercase tracking-wider">
                Recent Executed Positions
              </span>
            </div>
            <span className="font-data-micro text-data-micro text-secondary">TODAY: +$3,842.10</span>
          </div>
          <div className="flex flex-col gap-space-xs py-space-xs">
            {[
              { symbol: "SUI-PERP", side: "LONG", duration: "Closed: 18:32 UTC · 4h duration", pnl: "+$1,420.00", pct: "+18.42%", isWin: true },
              { symbol: "BTC-PERP", side: "LONG", duration: "Closed: 14:15 UTC · 12h duration", pnl: "+$2,100.00", pct: "+8.12%", isWin: true },
              { symbol: "AVAX-PERP", side: "SHORT", duration: "Closed: 11:40 UTC · 2h duration", pnl: "+$480.00", pct: "+5.20%", isWin: true },
              { symbol: "DOGE-PERP", side: "LONG", duration: "Closed: 07:18 UTC · 35m duration", pnl: "-$160.00", pct: "-2.10%", isWin: false },
            ].map((t, i) => (
              <div key={i} className="bg-surface-container-low p-space-sm rounded flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-headline-md text-label-md font-bold text-on-surface">{t.symbol}</span>
                    <span className={`px-1 py-0.2 font-data-micro text-data-micro rounded ${t.side === 'LONG' ? 'bg-secondary-container/20 text-secondary' : 'bg-error-container/40 text-error'}`}>
                      {t.side}
                    </span>
                  </div>
                  <span className="font-data-micro text-data-micro text-outline">{t.duration}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`font-data-tabular text-data-tabular font-bold ${t.isWin ? 'text-secondary' : 'text-error'}`}>
                    {t.pnl}
                  </span>
                  <span className={`font-data-micro text-data-micro ${t.isWin ? 'text-secondary' : 'text-error'}`}>
                    {t.pct}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between font-data-micro text-data-micro text-on-surface-variant pt-space-xs">
            <span>Settlement Engine: Instant USDC Auto-Rebalance</span>
            <Link to="/portfolio" className="text-primary hover:underline">
              View Full Ledger →
            </Link>
          </div>
        </div>

        {/* 10. Cumulative PnL Growth Chart */}
        <div className="xl:col-span-7 bg-surface-container-lowest p-space-md rounded flex flex-col justify-between shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-space-xs pb-space-xs">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-body-lg">trending_up</span>
              <span className="font-label-caps text-label-caps text-on-surface uppercase tracking-wider">
                30-Day Cumulative Equity Curve
              </span>
            </div>
            <div className="flex items-center gap-space-sm font-data-micro text-data-micro">
              <span className="text-on-surface-variant">Baseline: $100,000.00</span>
              <span className="text-secondary font-bold font-data-tabular">Current: $148,920.40 (+48.9%)</span>
            </div>
          </div>
          {/* SVG Area Chart */}
          <div className="w-full h-56 bg-surface-container-low rounded p-2 relative overflow-hidden flex flex-col justify-between">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 600 200">
              <defs>
                <linearGradient id="equityGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#70ffba" stopOpacity="0.3"></stop>
                  <stop offset="100%" stopColor="#70ffba" stopOpacity="0.0"></stop>
                </linearGradient>
              </defs>
              <line stroke="#31353f" strokeDasharray="2 3" strokeWidth="1" x1="0" x2="600" y1="50" y2="50"></line>
              <line stroke="#31353f" strokeDasharray="2 3" strokeWidth="1" x1="0" x2="600" y1="100" y2="100"></line>
              <line stroke="#31353f" strokeDasharray="2 3" strokeWidth="1" x1="0" x2="600" y1="150" y2="150"></line>
              <path d="M 0 170 Q 60 160 120 150 T 240 130 T 360 90 T 480 50 T 600 20 L 600 200 L 0 200 Z" fill="url(#equityGrad)"></path>
              <path d="M 0 170 Q 60 160 120 150 T 240 130 T 360 90 T 480 50 T 600 20" fill="none" stroke="#70ffba" strokeLinecap="round" strokeWidth="2.5"></path>
              <circle cx="240" cy="130" fill="#00f0ff" r="4"></circle>
              <circle cx="480" cy="50" fill="#00f0ff" r="4"></circle>
              <circle cx="600" cy="20" fill="#70ffba" r="5"></circle>
            </svg>
            <div className="flex items-center justify-between font-data-micro text-data-micro text-outline pt-1 px-1">
              <span>Day 1 ($100k)</span>
              <span>Day 10 ($114k)</span>
              <span>Day 20 ($128k)</span>
              <span>Day 28 ($142k)</span>
              <span className="text-secondary font-bold">Now ($148.9k)</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs font-data-micro text-data-micro text-on-surface-variant">
            <span>
              Sharpe Ratio: <strong className="text-primary font-bold">3.18</strong> · Max Drawdown:{" "}
              <strong className="text-on-surface font-bold">4.2%</strong>
            </span>
            <span>Non-Custodial Audit: Passed (Zero Key Leakage)</span>
          </div>
        </div>
      </section>

      {/* 11 & 12. SOCIAL INTELLIGENCE & SYSTEM HEALTH PROTOCOL MONITOR */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-space-md">
        {/* 11. Social Intelligence & News Feed */}
        <div className="xl:col-span-8 bg-surface-container-lowest p-space-md rounded flex flex-col justify-between gap-space-sm shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-space-xs pb-space-xs">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-body-lg">radar</span>
              <span className="font-label-caps text-label-caps text-on-surface uppercase tracking-wider">
                Social Intelligence & Real-Time News Telemetry
              </span>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="font-label-caps text-label-caps bg-secondary/15 text-secondary px-2 py-0.5 rounded font-bold">
                SENTIMENT GAUGE: 74/100 (BULLISH)
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-xs">
            <div className="bg-surface-container-low p-space-sm rounded flex flex-col justify-between gap-space-xs">
              <div className="flex items-center justify-between font-data-micro text-data-micro">
                <span className="px-1.5 py-0.5 rounded bg-surface-container text-secondary font-bold">MACRO / FED</span>
                <span className="text-outline">6m ago</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface font-medium leading-snug">
                Institutional ETF inflows cross $1.2B today; CME Bitcoin futures basis expands to 11.4% annualized.
              </p>
              <div className="flex items-center justify-between font-data-micro text-data-micro text-on-surface-variant">
                <span>Sentiment: <strong class="text-secondary">High Bullish</strong></span>
                <span>Impact: 8.8/10</span>
              </div>
            </div>

            <div className="bg-surface-container-low p-space-sm rounded flex flex-col justify-between gap-space-xs">
              <div className="flex items-center justify-between font-data-micro text-data-micro">
                <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-bold">HYPERLIQUID</span>
                <span className="text-outline">18m ago</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface font-medium leading-snug">
                HYPE spot listing surge triggers massive shorts liquidation cascading over $24M within 15 minutes.
              </p>
              <div className="flex items-center justify-between font-data-micro text-data-micro text-on-surface-variant">
                <span>Sentiment: <strong class="text-secondary">Extreme Momentum</strong></span>
                <span>Impact: 9.1/10</span>
              </div>
            </div>

            <div className="bg-surface-container-low p-space-sm rounded flex flex-col justify-between gap-space-xs">
              <div className="flex items-center justify-between font-data-micro text-data-micro">
                <span className="px-1.5 py-0.5 rounded bg-surface-container text-tertiary font-bold">SOLANA ECO</span>
                <span className="text-outline">42m ago</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface font-medium leading-snug">
                Validator count reaches ATH with TPS consistently holding above 2,800. DEX perp volume flips CEX volume.
              </p>
              <div className="flex items-center justify-between font-data-micro text-data-micro text-on-surface-variant">
                <span>Sentiment: <strong class="text-secondary">Sustained Accumulation</strong></span>
                <span>Impact: 7.9/10</span>
              </div>
            </div>
          </div>
        </div>

        {/* 12. Protocol Telemetry & System Status Indicator */}
        <div className="xl:col-span-4 bg-surface-container-lowest p-space-md rounded flex flex-col justify-between gap-space-sm shadow-sm">
          <div className="flex items-center justify-between pb-space-xs">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-body-lg">memory</span>
              <span className="font-label-caps text-label-caps text-on-surface uppercase tracking-wider">
                Protocol Pipeline Health
              </span>
            </div>
            <span className="font-data-micro text-data-micro text-secondary font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              ALL SYSTEMS SYNCED
            </span>
          </div>
          <div className="flex flex-col gap-space-xs font-data-micro text-data-micro">
            <div className="bg-surface-container-low p-space-xs rounded flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-on-surface font-semibold">Hyperliquid v4 WebSocket</span>
                <span className="text-outline">Primary Order Routing Node</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-secondary font-bold">11ms (Connected)</span>
                <span className="text-outline font-data-tabular">0 dropped frames</span>
              </div>
            </div>
            <div className="bg-surface-container-low p-space-xs rounded flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-on-surface font-semibold">Solana Dedicated RPC</span>
                <span className="text-outline">Direct gRPC Stream Node</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-primary font-bold">18ms (100% Operational)</span>
                <span className="text-outline font-data-tabular">Block #319,281,042</span>
              </div>
            </div>
            <div className="bg-surface-container-low p-space-xs rounded flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-on-surface font-semibold">Non-Custodial Telemetry</span>
                <span className="text-outline">Zero-Key Read-Only Engine</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-secondary font-bold">Cryptographically Safe</span>
                <span className="text-outline">Zero Signing Privileges</span>
              </div>
            </div>
          </div>
          <div className="pt-space-xs flex items-center justify-between font-data-micro text-data-micro text-outline">
            <span>PACIFICA-KERNEL v0.8.4-INSTITUTIONAL</span>
            <span className="text-primary hover:underline cursor-pointer">Inspect RPC Trace</span>
          </div>
        </div>
      </section>
    </div>
  );
}
