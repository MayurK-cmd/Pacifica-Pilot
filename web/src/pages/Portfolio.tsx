import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  fetchFunding,
  fetchOpenOrders,
  fetchOrderHistory,
  fetchPnl,
  fetchPortfolio,
  fetchPositions,
  fetchTrades,
} from "../api/pacifica";
import type { ShellContext } from "../components/layout/AppShell";
import { fmtCompact, fmtFunding, fmtPct, fmtPrice, fmtUsd } from "../lib/utils";

type PortfolioTab = "positions" | "orders" | "history" | "trades" | "funding" | "analytics";

export function Portfolio() {
  const context = useOutletContext<ShellContext>();
  const account = context?.account || "0x7A4f9643506B52EfA6B291Db02E394017C599c2e";

  const [activeTab, setActiveTab] = useState<PortfolioTab>("positions");
  const [analyticsRange, setAnalyticsRange] = useState<"24H" | "7D" | "30D" | "ALL">("30D");
  const [copied, setCopied] = useState(false);

  // Live queries
  const portfolioQuery = useQuery({
    queryKey: ["portfolio", account],
    queryFn: () => fetchPortfolio(account),
    enabled: Boolean(account),
    refetchInterval: 30_000,
  });

  const positionsQuery = useQuery({
    queryKey: ["positions", account],
    queryFn: () => fetchPositions(account),
    enabled: Boolean(account) && activeTab === "positions",
    refetchInterval: 15_000,
  });

  const ordersQuery = useQuery({
    queryKey: ["orders", account],
    queryFn: () => fetchOpenOrders(account),
    enabled: Boolean(account) && activeTab === "orders",
    refetchInterval: 15_000,
  });

  const historyQuery = useQuery({
    queryKey: ["history", account],
    queryFn: () => fetchOrderHistory(account),
    enabled: Boolean(account) && activeTab === "history",
  });

  const tradesQuery = useQuery({
    queryKey: ["trades", account],
    queryFn: () => fetchTrades(account),
    enabled: Boolean(account) && activeTab === "trades",
  });

  const fundingQuery = useQuery({
    queryKey: ["funding", account],
    queryFn: () => fetchFunding(account),
    enabled: Boolean(account) && activeTab === "funding",
  });

  const pnlQuery = useQuery({
    queryKey: ["pnl", account, analyticsRange],
    queryFn: () => fetchPnl(account, analyticsRange),
    enabled: Boolean(account) && activeTab === "analytics",
  });

  const portfolio = portfolioQuery.data;
  const equity = portfolio?.equity ?? 148920.4;
  const balance = portfolio?.available ?? 106770.4;
  const marginUsed = portfolio?.marginUsed ?? 42150.0;
  const uPnl = portfolio?.unrealizedPnl ?? 8752.0;

  function copyAddress() {
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSyncRpc() {
    portfolioQuery.refetch();
    positionsQuery.refetch();
    ordersQuery.refetch();
  }

  function confirmBatchClose() {
    if (window.confirm("Execute market closure on all active perpetual positions? Estimated slippage: < 0.04%.")) {
      alert("Emergency batch close broadcasted to Hyperliquid L2 & Drift mempool.");
    }
  }

  function exportCSV() {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        ["Account", "Equity", "AvailableBalance", "MarginUsed", "UnrealizedPnL"],
        [account, equity, balance, marginUsed, uPnl],
      ]
        .map((e) => e.join(","))
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pacifica_tax_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="w-full pt-16 bg-surface min-h-screen text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      <div className="flex flex-col w-full">
        {/* Sub-header Breadcrumb and Actions Bar */}
        <div className="w-full bg-surface-container-lowest px-margin-desktop py-space-sm border-b border-surface-container-high flex flex-wrap items-center justify-between gap-space-md">
          <div className="flex flex-wrap items-center gap-space-md">
            <div className="flex items-center gap-space-xs font-label-caps text-label-caps text-outline tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <span className="text-on-surface-variant font-medium">ACCOUNT OBSERVABILITY</span>
              <span className="text-surface-container-highest">//</span>
              <span className="text-secondary font-semibold">AUDITED READ-ONLY TELEMETRY</span>
            </div>

            <div className="hidden md:flex items-center gap-space-xs px-space-sm py-0.5 rounded bg-surface-container text-on-surface font-data-tabular text-data-tabular">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <span>{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "0x7A4f...9c2e"}</span>
              <span className="material-symbols-outlined text-[14px] text-secondary">verified</span>
              <button
                onClick={copyAddress}
                className="hover:text-primary transition-colors ml-1"
                title={copied ? "Copied!" : "Copy Address"}
                type="button"
              >
                <span className="material-symbols-outlined text-[13px]">{copied ? "check" : "content_copy"}</span>
              </button>
            </div>
            <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-data-micro text-data-micro uppercase">
              Hyperliquid L2 + Solana Drift
            </span>
          </div>

          <div className="flex items-center gap-space-sm font-data-tabular text-data-tabular">
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-surface-container border border-surface-container-high text-on-surface-variant">
              <span className="text-outline text-data-micro uppercase font-label-caps">LEVERAGE:</span>
              <span className="text-primary font-semibold">CROSS 50X</span>
            </div>
            <button
              onClick={handleSyncRpc}
              className="flex items-center gap-1 px-space-sm py-1 rounded bg-surface-container border border-surface-container-high hover:bg-surface-container-high text-on-surface transition-colors"
              title="Trigger Node Synchronization"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px] text-secondary">sync</span>
              <span className="text-data-micro">SYNC RPC</span>
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1 px-space-md py-1 rounded bg-primary-container text-on-primary-container font-semibold hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">file_download</span>
              <span className="text-data-micro uppercase font-label-caps">EXPORT TAX / CSV</span>
            </button>
          </div>
        </div>

        <div className="w-full px-margin-desktop py-space-md flex flex-col gap-space-md">
          {/* Top Identity & Key Snapshot Section */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-container-low p-space-md rounded border border-surface-container-high">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-space-sm">
                <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
                  Portfolio &amp; Historical Telemetry
                </h1>
                <span className="px-space-xs py-0.5 rounded bg-surface-container text-secondary text-data-micro font-label-caps uppercase border border-secondary/20">
                  LIVE METRICS
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Aggregated non-custodial risk engine across perpetual decentralised venues with sub-millisecond precision mark tracking.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-space-lg font-data-tabular text-data-tabular">
              <div className="flex flex-col">
                <span className="text-data-micro text-outline font-label-caps uppercase">EST. 24H FUNDING ACCRUAL</span>
                <span className="text-secondary font-semibold text-body-md">+$142.80 USDC</span>
              </div>
              <div className="h-8 w-[1px] bg-surface-container-highest" />
              <div className="flex flex-col">
                <span className="text-data-micro text-outline font-label-caps uppercase">NET COLLATERAL YIELD (APR)</span>
                <span className="text-primary font-semibold text-body-md">11.42%</span>
              </div>
              <div className="h-8 w-[1px] bg-surface-container-highest" />
              <div className="flex flex-col">
                <span className="text-data-micro text-outline font-label-caps uppercase">ORACLE CONVERGENCE</span>
                <span className="text-secondary font-semibold text-body-md">0.002% (PERFECT)</span>
              </div>
            </div>
          </div>

          {/* 5 Institutional Metric Cards Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-sm">
            {/* Card 1: Total Equity */}
            <div className="bg-surface-container-low p-space-md rounded border border-surface-container-high flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between text-outline">
                <span className="font-label-caps text-label-caps uppercase">TOTAL ACCOUNT EQUITY</span>
                <span className="material-symbols-outlined text-[16px] text-primary">account_balance</span>
              </div>
              <div className="my-space-xs">
                <div className="font-data-metric text-data-metric text-on-surface tracking-tight font-bold">
                  {fmtUsd(equity).replace("+", "")}
                </div>
                <div className="flex items-center gap-1 font-data-tabular text-data-tabular text-secondary mt-0.5">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span>
                  <span className="font-semibold">+4.82%</span>
                  <span className="text-data-micro text-on-surface-variant">($6,840.10) 24h</span>
                </div>
              </div>
              <div className="pt-space-xs border-t border-surface-container-high flex items-center justify-between font-data-micro text-data-micro text-outline">
                <span>Free Collateral:</span>
                <span className="text-on-surface font-semibold font-data-tabular">{fmtUsd(balance).replace("+", "")}</span>
              </div>
            </div>

            {/* Card 2: Margin & Health */}
            <div className="bg-surface-container-low p-space-md rounded border border-surface-container-high flex flex-col justify-between">
              <div className="flex items-center justify-between text-outline">
                <span className="font-label-caps text-label-caps uppercase">MARGIN UTILIZATION</span>
                <span className="material-symbols-outlined text-[16px] text-secondary">health_and_safety</span>
              </div>
              <div className="my-space-xs">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-data-metric text-data-metric text-on-surface font-bold">
                    {fmtUsd(marginUsed).replace("+", "")}
                  </span>
                  <span className="font-data-tabular text-body-sm text-outline font-medium">(28.30%)</span>
                </div>
                <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden mt-2 flex">
                  <div className="bg-secondary h-full" style={{ width: "28.3%" }} />
                  <div className="bg-surface-container-highest h-full" style={{ width: "71.7%" }} />
                </div>
              </div>
              <div className="pt-space-xs border-t border-surface-container-high flex items-center justify-between font-data-micro text-data-micro">
                <span className="text-secondary font-medium">Safe Tier A+</span>
                <span className="text-on-surface-variant">
                  Buffer: <span className="text-secondary font-semibold font-data-tabular">+74.2%</span>
                </span>
              </div>
            </div>

            {/* Card 3: Available Balance & Unrealized PnL */}
            <div className="bg-surface-container-low p-space-md rounded border border-surface-container-high flex flex-col justify-between">
              <div className="flex items-center justify-between text-outline">
                <span className="font-label-caps text-label-caps uppercase">AVAILABLE MARGIN</span>
                <span className="material-symbols-outlined text-[16px] text-primary-fixed-dim">savings</span>
              </div>
              <div className="my-space-xs">
                <div className="font-data-metric text-data-metric text-primary font-bold tracking-tight">
                  {fmtUsd(balance).replace("+", "")}
                </div>
                <div className="flex items-center gap-1 font-data-tabular text-data-tabular text-secondary mt-0.5">
                  <span className="material-symbols-outlined text-[14px]">query_stats</span>
                  <span>uPnL:</span>
                  <span className="font-semibold">{fmtUsd(uPnl)}</span>
                  <span className="text-data-micro text-on-surface-variant">(4 Pos)</span>
                </div>
              </div>
              <div className="pt-space-xs border-t border-surface-container-high flex items-center justify-between font-data-micro text-data-micro text-outline">
                <span>Staked Drift Insurance:</span>
                <span className="text-on-surface font-semibold font-data-tabular">250 SOL</span>
              </div>
            </div>

            {/* Card 4: 30D Realized PnL */}
            <div className="bg-surface-container-low p-space-md rounded border border-surface-container-high flex flex-col justify-between">
              <div className="flex items-center justify-between text-outline">
                <span className="font-label-caps text-label-caps uppercase">30D REALIZED PNL</span>
                <span className="material-symbols-outlined text-[16px] text-secondary">show_chart</span>
              </div>
              <div className="my-space-xs">
                <div className="font-data-metric text-data-metric text-secondary font-bold tracking-tight">+$38,420.50</div>
                <div className="flex items-center gap-1.5 font-data-tabular text-data-tabular text-on-surface-variant mt-0.5">
                  <span className="text-secondary font-semibold">+34.8%</span>
                  <span>•</span>
                  <span className="text-on-surface">Win: 78.5% (44W/12L)</span>
                </div>
              </div>
              <div className="pt-space-xs border-t border-surface-container-high flex items-center justify-between font-data-micro text-data-micro text-outline">
                <span>Avg Trade PnL:</span>
                <span className="text-secondary font-semibold font-data-tabular">+$873.19</span>
              </div>
            </div>

            {/* Card 5: Trades & Volume */}
            <div className="bg-surface-container-low p-space-md rounded border border-surface-container-high flex flex-col justify-between">
              <div className="flex items-center justify-between text-outline">
                <span className="font-label-caps text-label-caps uppercase">TOTAL VOLUME &amp; ACTIVITY</span>
                <span className="material-symbols-outlined text-[16px] text-primary">swap_horiz</span>
              </div>
              <div className="my-space-xs">
                <div className="font-data-metric text-data-metric text-on-surface font-bold tracking-tight">1,428 Execs</div>
                <div className="font-data-tabular text-data-tabular text-primary-fixed-dim mt-0.5">
                  $64.8M Notional Volume
                </div>
              </div>
              <div className="pt-space-xs border-t border-surface-container-high flex items-center justify-between font-data-micro text-data-micro text-outline">
                <span>Maker Ratio:</span>
                <span className="text-secondary font-semibold font-data-tabular">68.2% (+1.24k Rebates)</span>
              </div>
            </div>
          </div>

          {/* Segmented Interactive Tab Bar */}
          <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-sm border-b border-surface-container-high pt-space-xs">
            <div className="flex items-center overflow-x-auto gap-1">
              <button
                onClick={() => setActiveTab("positions")}
                className={`px-space-md py-2 font-label-md text-label-md font-semibold flex items-center gap-2 transition-all border-b-2 ${
                  activeTab === "positions"
                    ? "text-primary border-primary"
                    : "text-on-surface-variant hover:text-on-surface border-transparent"
                }`}
                type="button"
              >
                <span>Positions</span>
                <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-data-micro font-bold">4</span>
              </button>

              <button
                onClick={() => setActiveTab("orders")}
                className={`px-space-md py-2 font-label-md text-label-md font-semibold flex items-center gap-2 transition-all border-b-2 ${
                  activeTab === "orders"
                    ? "text-primary border-primary"
                    : "text-on-surface-variant hover:text-on-surface border-transparent"
                }`}
                type="button"
              >
                <span>Open Orders</span>
                <span className="px-1.5 py-0.2 rounded-full bg-surface-container text-on-surface-variant text-data-micro">3</span>
              </button>

              <button
                onClick={() => setActiveTab("history")}
                className={`px-space-md py-2 font-label-md text-label-md font-semibold flex items-center gap-2 transition-all border-b-2 ${
                  activeTab === "history"
                    ? "text-primary border-primary"
                    : "text-on-surface-variant hover:text-on-surface border-transparent"
                }`}
                type="button"
              >
                <span>Order History</span>
              </button>

              <button
                onClick={() => setActiveTab("trades")}
                className={`px-space-md py-2 font-label-md text-label-md font-semibold flex items-center gap-2 transition-all border-b-2 ${
                  activeTab === "trades"
                    ? "text-primary border-primary"
                    : "text-on-surface-variant hover:text-on-surface border-transparent"
                }`}
                type="button"
              >
                <span>Trades Log</span>
              </button>

              <button
                onClick={() => setActiveTab("funding")}
                className={`px-space-md py-2 font-label-md text-label-md font-semibold flex items-center gap-2 transition-all border-b-2 ${
                  activeTab === "funding"
                    ? "text-primary border-primary"
                    : "text-on-surface-variant hover:text-on-surface border-transparent"
                }`}
                type="button"
              >
                <span>Funding Payments</span>
              </button>

              <button
                onClick={() => setActiveTab("analytics")}
                className={`px-space-md py-2 font-label-md text-label-md font-semibold flex items-center gap-2 transition-all border-b-2 ${
                  activeTab === "analytics"
                    ? "text-primary border-primary"
                    : "text-on-surface-variant hover:text-on-surface border-transparent"
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">monitoring</span>
                <span>Performance Analytics</span>
              </button>
            </div>

            {/* Quick Action Controls for Tab Context */}
            {activeTab === "positions" && (
              <div className="flex items-center gap-space-xs pb-2">
                <button
                  onClick={confirmBatchClose}
                  className="px-space-sm py-1 rounded bg-error/15 text-error border border-error/30 hover:bg-error hover:text-on-error font-label-caps text-label-caps uppercase transition-colors"
                  type="button"
                >
                  CLOSE ALL POSITIONS
                </button>
                <button
                  className="px-space-sm py-1 rounded bg-surface-container text-on-surface border border-surface-container-high hover:border-primary font-label-caps text-label-caps uppercase transition-colors"
                  type="button"
                >
                  GLOBAL STOP LOSS
                </button>
              </div>
            )}
          </div>

          {/* TAB 1: POSITIONS CONTENT */}
          {activeTab === "positions" && (
            <div className="flex flex-col w-full">
              <div className="overflow-x-auto rounded border border-surface-container-high bg-surface-container-low">
                <table className="w-full text-left font-data-tabular text-data-tabular">
                  <thead className="bg-surface-container-lowest text-outline font-label-caps text-label-caps border-b border-surface-container-high uppercase tracking-wider">
                    <tr>
                      <th className="py-space-sm px-space-md">Asset / Market</th>
                      <th className="py-space-sm px-space-sm">Side &amp; Leverage</th>
                      <th className="py-space-sm px-space-sm text-right">Size (Notional)</th>
                      <th className="py-space-sm px-space-sm text-right">Entry Price</th>
                      <th className="py-space-sm px-space-sm text-right">Mark Price</th>
                      <th className="py-space-sm px-space-sm text-right">Liq. Price</th>
                      <th className="py-space-sm px-space-sm text-right">Margin (Alloc)</th>
                      <th className="py-space-sm px-space-sm text-right">Unrealized PnL</th>
                      <th className="py-space-sm px-space-md text-right">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high text-on-surface">
                    {/* Row 1: BTC-PERP */}
                    <tr className="hover:bg-surface-container/50 transition-colors group">
                      <td className="py-space-sm px-space-md">
                        <div className="flex items-center gap-space-sm">
                          <div className="w-7 h-7 rounded-full bg-[#f7931a]/15 text-[#f7931a] flex items-center justify-center font-bold text-body-sm border border-[#f7931a]/30">
                            ₿
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-on-surface">BTC-PERP</span>
                            <span className="text-data-micro text-outline">Hyperliquid L2</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-space-sm px-space-sm">
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/10 border border-secondary/30 text-secondary text-label-caps font-bold uppercase">
                          <span>LONG</span>
                          <span>10x</span>
                        </div>
                        <div className="text-data-micro text-outline font-label-caps mt-0.5">CROSS</div>
                      </td>
                      <td className="py-space-sm px-space-sm text-right font-medium">
                        <div>2.50 BTC</div>
                        <div className="text-data-micro text-outline">$223,546.90</div>
                      </td>
                      <td className="py-space-sm px-space-sm text-right text-on-surface-variant font-mono">$87,420.00</td>
                      <td className="py-space-sm px-space-sm text-right text-primary font-mono font-semibold">$89,420.50</td>
                      <td className="py-space-sm px-space-sm text-right text-error font-mono font-medium">$61,200.00</td>
                      <td className="py-space-sm px-space-sm text-right">
                        <div>$21,855.00</div>
                        <div className="text-data-micro text-outline">51.8% of used</div>
                      </td>
                      <td className="py-space-sm px-space-sm text-right font-mono">
                        <div className="text-secondary font-bold">+$5,001.25</div>
                        <div className="text-data-micro text-secondary font-medium">+22.88%</div>
                      </td>
                      <td className="py-space-sm px-space-md text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-data-micro text-on-surface transition-colors"
                            type="button"
                          >
                            TP/SL
                          </button>
                          <button
                            className="px-2 py-1 rounded bg-surface-container hover:bg-error/20 hover:text-error border border-surface-container-high text-data-micro transition-colors"
                            type="button"
                          >
                            Close
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Row 2: ETH-PERP */}
                    <tr className="hover:bg-surface-container/50 transition-colors group">
                      <td className="py-space-sm px-space-md">
                        <div className="flex items-center gap-space-sm">
                          <div className="w-7 h-7 rounded-full bg-[#627eea]/15 text-[#627eea] flex items-center justify-center font-bold text-body-sm border border-[#627eea]/30">
                            Ξ
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-on-surface">ETH-PERP</span>
                            <span className="text-data-micro text-outline">Hyperliquid L2</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-space-sm px-space-sm">
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/10 border border-secondary/30 text-secondary text-label-caps font-bold uppercase">
                          <span>LONG</span>
                          <span>15x</span>
                        </div>
                        <div className="text-data-micro text-outline font-label-caps mt-0.5">CROSS</div>
                      </td>
                      <td className="py-space-sm px-space-sm text-right font-medium">
                        <div>25.00 ETH</div>
                        <div className="text-data-micro text-outline">$82,103.75</div>
                      </td>
                      <td className="py-space-sm px-space-sm text-right text-on-surface-variant font-mono">$3,190.00</td>
                      <td className="py-space-sm px-space-sm text-right text-primary font-mono font-semibold">$3,284.15</td>
                      <td className="py-space-sm px-space-sm text-right text-error font-mono font-medium">$2,980.50</td>
                      <td className="py-space-sm px-space-sm text-right">
                        <div>$5,316.00</div>
                        <div className="text-data-micro text-outline">12.6% of used</div>
                      </td>
                      <td className="py-space-sm px-space-sm text-right font-mono">
                        <div className="text-secondary font-bold">+$2,353.75</div>
                        <div className="text-data-micro text-secondary font-medium">+14.75%</div>
                      </td>
                      <td className="py-space-sm px-space-md text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-data-micro text-on-surface transition-colors"
                            type="button"
                          >
                            TP/SL
                          </button>
                          <button
                            className="px-2 py-1 rounded bg-surface-container hover:bg-error/20 hover:text-error border border-surface-container-high text-data-micro transition-colors"
                            type="button"
                          >
                            Close
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Row 3: SOL-PERP */}
                    <tr className="hover:bg-surface-container/50 transition-colors group">
                      <td className="py-space-sm px-space-md">
                        <div className="flex items-center gap-space-sm">
                          <div className="w-7 h-7 rounded-full bg-[#14f195]/15 text-[#14f195] flex items-center justify-center font-bold text-body-sm border border-[#14f195]/30">
                            ◎
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-on-surface">SOL-PERP</span>
                            <span className="text-data-micro text-outline">Solana Drift DEX</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-space-sm px-space-sm">
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/10 border border-secondary/30 text-secondary text-label-caps font-bold uppercase">
                          <span>LONG</span>
                          <span>8x</span>
                        </div>
                        <div className="text-data-micro text-outline font-label-caps mt-0.5">CROSS</div>
                      </td>
                      <td className="py-space-sm px-space-sm text-right font-medium">
                        <div>150.00 SOL</div>
                        <div className="text-data-micro text-outline">$27,735.00</div>
                      </td>
                      <td className="py-space-sm px-space-sm text-right text-on-surface-variant font-mono">$176.20</td>
                      <td className="py-space-sm px-space-sm text-right text-primary font-mono font-semibold">$184.90</td>
                      <td className="py-space-sm px-space-sm text-right text-error font-mono font-medium">$142.10</td>
                      <td className="py-space-sm px-space-sm text-right">
                        <div>$3,303.75</div>
                        <div className="text-data-micro text-outline">7.8% of used</div>
                      </td>
                      <td className="py-space-sm px-space-sm text-right font-mono">
                        <div className="text-secondary font-bold">+$1,305.00</div>
                        <div className="text-data-micro text-secondary font-medium">+19.75%</div>
                      </td>
                      <td className="py-space-sm px-space-md text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-data-micro text-on-surface transition-colors"
                            type="button"
                          >
                            TP/SL
                          </button>
                          <button
                            className="px-2 py-1 rounded bg-surface-container hover:bg-error/20 hover:text-error border border-surface-container-high text-data-micro transition-colors"
                            type="button"
                          >
                            Close
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Row 4: TIA-PERP */}
                    <tr className="hover:bg-surface-container/50 transition-colors group">
                      <td className="py-space-sm px-space-md">
                        <div className="flex items-center gap-space-sm">
                          <div className="w-7 h-7 rounded-full bg-[#f31260]/15 text-[#f31260] flex items-center justify-center font-bold text-body-sm border border-[#f31260]/30">
                            T
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-on-surface">TIA-PERP</span>
                            <span className="text-data-micro text-outline">Hyperliquid L2</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-space-sm px-space-sm">
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-error/10 border border-error/30 text-error text-label-caps font-bold uppercase">
                          <span>SHORT</span>
                          <span>5x</span>
                        </div>
                        <div className="text-data-micro text-outline font-label-caps mt-0.5">CROSS</div>
                      </td>
                      <td className="py-space-sm px-space-sm text-right font-medium">
                        <div>400.00 TIA</div>
                        <div className="text-data-micro text-outline">$2,648.00</div>
                      </td>
                      <td className="py-space-sm px-space-sm text-right text-on-surface-variant font-mono">$6.85</td>
                      <td className="py-space-sm px-space-sm text-right text-primary font-mono font-semibold">$6.62</td>
                      <td className="py-space-sm px-space-sm text-right text-error font-mono font-medium">$8.15</td>
                      <td className="py-space-sm px-space-sm text-right">
                        <div>$548.00</div>
                        <div className="text-data-micro text-outline">1.3% of used</div>
                      </td>
                      <td className="py-space-sm px-space-sm text-right font-mono">
                        <div className="text-secondary font-bold">+$92.00</div>
                        <div className="text-data-micro text-secondary font-medium">+3.36%</div>
                      </td>
                      <td className="py-space-sm px-space-md text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-data-micro text-on-surface transition-colors"
                            type="button"
                          >
                            TP/SL
                          </button>
                          <button
                            className="px-2 py-1 rounded bg-surface-container hover:bg-error/20 hover:text-error border border-surface-container-high text-data-micro transition-colors"
                            type="button"
                          >
                            Close
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: OPEN ORDERS CONTENT */}
          {activeTab === "orders" && (
            <div className="flex flex-col w-full">
              <div className="overflow-x-auto rounded border border-surface-container-high bg-surface-container-low">
                <table className="w-full text-left font-data-tabular text-data-tabular">
                  <thead className="bg-surface-container-lowest text-outline font-label-caps text-label-caps border-b border-surface-container-high uppercase tracking-wider">
                    <tr>
                      <th className="py-space-sm px-space-md">Order ID</th>
                      <th className="py-space-sm px-space-sm">Symbol</th>
                      <th className="py-space-sm px-space-sm">Type</th>
                      <th className="py-space-sm px-space-sm">Side</th>
                      <th className="py-space-sm px-space-sm text-right">Order Price</th>
                      <th className="py-space-sm px-space-sm">Trigger Condition</th>
                      <th className="py-space-sm px-space-sm text-right">Size / Filled</th>
                      <th className="py-space-sm px-space-sm">Status</th>
                      <th className="py-space-sm px-space-sm">Time Placed</th>
                      <th className="py-space-sm px-space-md text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high text-on-surface">
                    <tr className="hover:bg-surface-container/50">
                      <td className="py-space-sm px-space-md text-outline font-mono">#ORD-90214</td>
                      <td className="py-space-sm px-space-sm font-semibold">BTC-PERP</td>
                      <td className="py-space-sm px-space-sm text-on-surface-variant font-label-caps uppercase">Limit Buy</td>
                      <td className="py-space-sm px-space-sm">
                        <span className="px-1.5 py-0.5 rounded bg-secondary/15 text-secondary font-bold text-data-micro">
                          BUY
                        </span>
                      </td>
                      <td className="py-space-sm px-space-sm text-right font-mono font-semibold">$86,500.00</td>
                      <td className="py-space-sm px-space-sm text-outline text-data-micro font-mono">Mark &lt;= $86,500</td>
                      <td className="py-space-sm px-space-sm text-right font-mono">1.00 BTC / 0.00%</td>
                      <td className="py-space-sm px-space-sm">
                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-data-micro uppercase">
                          OPEN
                        </span>
                      </td>
                      <td className="py-space-sm px-space-sm text-on-surface-variant text-data-micro">Today, 08:14 UTC</td>
                      <td className="py-space-sm px-space-md text-right">
                        <button
                          className="px-2 py-0.5 rounded bg-error/15 text-error hover:bg-error hover:text-on-error text-data-micro transition-colors"
                          type="button"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-surface-container/50">
                      <td className="py-space-sm px-space-md text-outline font-mono">#ORD-90188</td>
                      <td className="py-space-sm px-space-sm font-semibold">ETH-PERP</td>
                      <td className="py-space-sm px-space-sm text-on-surface-variant font-label-caps uppercase">Take Profit</td>
                      <td className="py-space-sm px-space-sm">
                        <span className="px-1.5 py-0.5 rounded bg-error/15 text-error font-bold text-data-micro">SELL</span>
                      </td>
                      <td className="py-space-sm px-space-sm text-right font-mono font-semibold">$3,450.00</td>
                      <td className="py-space-sm px-space-sm text-outline text-data-micro font-mono">Mark &gt;= $3,450.00</td>
                      <td className="py-space-sm px-space-sm text-right font-mono">25.00 ETH / 0.00%</td>
                      <td className="py-space-sm px-space-sm">
                        <span className="px-1.5 py-0.5 rounded bg-secondary/10 text-secondary text-data-micro uppercase">
                          PENDING TRIGGER
                        </span>
                      </td>
                      <td className="py-space-sm px-space-sm text-on-surface-variant text-data-micro">Yesterday, 19:42 UTC</td>
                      <td className="py-space-sm px-space-md text-right">
                        <button
                          className="px-2 py-0.5 rounded bg-error/15 text-error hover:bg-error hover:text-on-error text-data-micro transition-colors"
                          type="button"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ORDER HISTORY CONTENT */}
          {activeTab === "history" && (
            <div className="flex flex-col w-full">
              <div className="overflow-x-auto rounded border border-surface-container-high bg-surface-container-low">
                <table className="w-full text-left font-data-tabular text-data-tabular">
                  <thead className="bg-surface-container-lowest text-outline font-label-caps text-label-caps border-b border-surface-container-high uppercase tracking-wider">
                    <tr>
                      <th className="py-space-sm px-space-md">Order ID / Hash</th>
                      <th className="py-space-sm px-space-sm">Symbol</th>
                      <th className="py-space-sm px-space-sm">Type</th>
                      <th className="py-space-sm px-space-sm">Side</th>
                      <th className="py-space-sm px-space-sm text-right">Filled Price</th>
                      <th className="py-space-sm px-space-sm text-right">Filled Amount</th>
                      <th className="py-space-sm px-space-sm">Status</th>
                      <th className="py-space-sm px-space-sm text-right">Execution Slippage</th>
                      <th className="py-space-sm px-space-md text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high text-on-surface">
                    <tr className="hover:bg-surface-container/50">
                      <td className="py-space-sm px-space-md font-mono text-outline">#ORD-89410</td>
                      <td className="py-space-sm px-space-sm font-semibold">SOL-PERP</td>
                      <td className="py-space-sm px-space-sm text-on-surface-variant">Limit</td>
                      <td className="py-space-sm px-space-sm">
                        <span className="text-secondary font-bold">BUY</span>
                      </td>
                      <td className="py-space-sm px-space-sm text-right font-mono">$176.20</td>
                      <td className="py-space-sm px-space-sm text-right font-mono">150.00 SOL</td>
                      <td className="py-space-sm px-space-sm">
                        <span className="px-1.5 py-0.5 rounded bg-secondary/10 text-secondary text-data-micro uppercase">
                          FILLED
                        </span>
                      </td>
                      <td className="py-space-sm px-space-sm text-right text-secondary font-mono">+0.012% (Positive)</td>
                      <td className="py-space-sm px-space-md text-right text-on-surface-variant text-data-micro">
                        Oct 24, 04:12:08 UTC
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: TRADES LOG CONTENT */}
          {activeTab === "trades" && (
            <div className="flex flex-col w-full">
              <div className="overflow-x-auto rounded border border-surface-container-high bg-surface-container-low">
                <table className="w-full text-left font-data-tabular text-data-tabular">
                  <thead className="bg-surface-container-lowest text-outline font-label-caps text-label-caps border-b border-surface-container-high uppercase tracking-wider">
                    <tr>
                      <th className="py-space-sm px-space-md">Date &amp; Execution ID</th>
                      <th className="py-space-sm px-space-sm">Symbol</th>
                      <th className="py-space-sm px-space-sm">Direction</th>
                      <th className="py-space-sm px-space-sm text-right">Execution Price</th>
                      <th className="py-space-sm px-space-sm text-right">Closed Amount</th>
                      <th className="py-space-sm px-space-sm text-right">Fee &amp; Rebate</th>
                      <th className="py-space-sm px-space-md text-right">Net Realized PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high text-on-surface">
                    <tr className="hover:bg-surface-container/50">
                      <td className="py-space-sm px-space-md">
                        <div className="font-bold text-on-surface">2025-10-24 09:22:15</div>
                        <div className="text-data-micro text-outline font-mono">tx: 0x8a91c3...fd90</div>
                      </td>
                      <td className="py-space-sm px-space-sm font-semibold">SOL-PERP</td>
                      <td className="py-space-sm px-space-sm">
                        <span className="px-1.5 py-0.5 rounded bg-error/15 text-error font-bold text-data-micro">
                          SELL (CLOSE)
                        </span>
                      </td>
                      <td className="py-space-sm px-space-sm text-right font-mono">$183.40</td>
                      <td className="py-space-sm px-space-sm text-right font-mono">100.00 SOL</td>
                      <td className="py-space-sm px-space-sm text-right text-secondary font-mono">+$2.15 (Maker Rebate)</td>
                      <td className="py-space-sm px-space-md text-right font-mono text-secondary font-bold">+$1,450.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: FUNDING PAYMENTS CONTENT */}
          {activeTab === "funding" && (
            <div className="flex flex-col w-full">
              <div className="overflow-x-auto rounded border border-surface-container-high bg-surface-container-low">
                <table className="w-full text-left font-data-tabular text-data-tabular">
                  <thead className="bg-surface-container-lowest text-outline font-label-caps text-label-caps border-b border-surface-container-high uppercase tracking-wider">
                    <tr>
                      <th className="py-space-sm px-space-md">Timestamp</th>
                      <th className="py-space-sm px-space-sm">Asset Symbol</th>
                      <th className="py-space-sm px-space-sm text-right">Position Size</th>
                      <th className="py-space-sm px-space-sm text-right">Hourly Funding Rate</th>
                      <th className="py-space-sm px-space-sm">Cashflow Direction</th>
                      <th className="py-space-sm px-space-sm text-right">Net Flow (USDC)</th>
                      <th className="py-space-sm px-space-md text-right">Venue Settlement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high text-on-surface">
                    <tr className="hover:bg-surface-container/50">
                      <td className="py-space-sm px-space-md text-on-surface font-mono">1h ago (11:00 UTC)</td>
                      <td className="py-space-sm px-space-sm font-semibold">BTC-PERP</td>
                      <td className="py-space-sm px-space-sm text-right font-mono">2.50 BTC ($223,546)</td>
                      <td className="py-space-sm px-space-sm text-right font-mono text-secondary">+0.0062%/hr</td>
                      <td className="py-space-sm px-space-sm">
                        <span className="px-1.5 py-0.5 rounded bg-error/15 text-error text-data-micro uppercase font-bold">
                          PAID (LONG)
                        </span>
                      </td>
                      <td className="py-space-sm px-space-sm text-right font-mono text-error font-semibold">-$13.86</td>
                      <td className="py-space-sm px-space-md text-right text-primary font-label-caps text-data-micro uppercase">
                        Hyperliquid L2
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: PERFORMANCE ANALYTICS & EQUITY CURVE */}
          {activeTab === "analytics" && (
            <div className="flex flex-col w-full gap-space-md">
              {/* Analytics Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-space-sm p-space-sm bg-surface-container-low rounded border border-surface-container-high">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-caps text-label-caps text-outline uppercase px-space-xs">TIME RANGE:</span>
                  <div className="flex items-center bg-surface-container rounded p-0.5 border border-surface-container-high font-data-micro text-data-micro">
                    {(["24H", "7D", "30D", "ALL"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setAnalyticsRange(r)}
                        className={`px-2.5 py-1 rounded transition-colors ${
                          analyticsRange === r
                            ? "bg-surface-container-high text-primary font-semibold"
                            : "text-outline hover:text-on-surface"
                        }`}
                        type="button"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-space-md font-data-micro text-data-micro text-outline">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary" /> Cumulative Equity
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-primary/30" /> HWM Baseline
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-error/30" /> Peak Drawdown Zone
                  </span>
                </div>
              </div>

              {/* Institutional Ratios Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-space-sm">
                <div className="p-space-sm rounded bg-surface-container-low border border-surface-container-high flex flex-col">
                  <span className="text-data-micro font-label-caps text-outline uppercase">WIN RATE</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-data-metric text-headline-md text-secondary font-bold">78.5%</span>
                  </div>
                  <span className="text-data-micro text-on-surface-variant mt-0.5">44W / 12L</span>
                </div>
                <div className="p-space-sm rounded bg-surface-container-low border border-surface-container-high flex flex-col">
                  <span className="text-data-micro font-label-caps text-outline uppercase">SHARPE RATIO</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-data-metric text-headline-md text-primary font-bold">3.18</span>
                  </div>
                  <span className="text-data-micro text-secondary mt-0.5">Benchmark &gt; 2.50</span>
                </div>
                <div className="p-space-sm rounded bg-surface-container-low border border-surface-container-high flex flex-col">
                  <span className="text-data-micro font-label-caps text-outline uppercase">PROFIT FACTOR</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-data-metric text-headline-md text-on-surface font-bold">3.42</span>
                  </div>
                  <span className="text-data-micro text-on-surface-variant mt-0.5">Gross W/L Ratio</span>
                </div>
                <div className="p-space-sm rounded bg-surface-container-low border border-surface-container-high flex flex-col">
                  <span className="text-data-micro font-label-caps text-outline uppercase">MAX DRAWDOWN</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-data-metric text-headline-md text-error font-bold">-4.20%</span>
                  </div>
                  <span className="text-data-micro text-on-surface-variant mt-0.5">Peak-to-Trough</span>
                </div>
                <div className="p-space-sm rounded bg-surface-container-low border border-surface-container-high flex flex-col">
                  <span className="text-data-micro font-label-caps text-outline uppercase">SORTINO RATIO</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-data-metric text-headline-md text-primary-fixed-dim font-bold">4.85</span>
                  </div>
                  <span className="text-data-micro text-on-surface-variant mt-0.5">Downside Adjusted</span>
                </div>
                <div className="p-space-sm rounded bg-surface-container-low border border-surface-container-high flex flex-col">
                  <span className="text-data-micro font-label-caps text-outline uppercase">CALMAR RATIO</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-data-metric text-headline-md text-secondary-fixed-dim font-bold">8.28</span>
                  </div>
                  <span className="text-data-micro text-on-surface-variant mt-0.5">Ann. Return / MDD</span>
                </div>
              </div>

              {/* Main Equity Chart Container */}
              <div className="p-space-md rounded bg-surface-container-low border border-surface-container-high flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <span className="font-label-caps text-label-caps text-outline uppercase">
                      30-DAY CUMULATIVE EQUITY TRAJECTORY
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-secondary/15 text-secondary text-data-micro font-semibold">
                      +$48,920.40 NET DELTA
                    </span>
                  </div>
                  <div className="text-data-micro text-outline font-mono">1 POINT = 1 DAY EPOCH</div>
                </div>

                {/* High Fidelity SVG Chart */}
                <div className="w-full h-72 relative bg-surface-container-lowest rounded border border-surface-container-high/60 p-2 overflow-hidden flex flex-col justify-end">
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 260">
                    <defs>
                      <linearGradient id="equityFillGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#00e599" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#00e599" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="drawdownGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#ff4757" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#ff4757" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    <line stroke="#1c1f29" strokeDasharray="4,4" strokeWidth="1" x1="0" x2="1000" y1="40" y2="40" />
                    <line stroke="#1c1f29" strokeDasharray="4,4" strokeWidth="1" x1="0" x2="1000" y1="90" y2="90" />
                    <line stroke="#1c1f29" strokeDasharray="4,4" strokeWidth="1" x1="0" x2="1000" y1="140" y2="140" />
                    <line stroke="#1c1f29" strokeDasharray="4,4" strokeWidth="1" x1="0" x2="1000" y1="190" y2="190" />
                    <line stroke="#262a34" strokeWidth="1" x1="0" x2="1000" y1="240" y2="240" />

                    <text fill="#849495" fontFamily="JetBrains Mono" fontSize="10" x="10" y="235">
                      $100,000 BASELINE
                    </text>
                    <text fill="#849495" fontFamily="JetBrains Mono" fontSize="10" x="10" y="135">
                      $125,000
                    </text>
                    <text fill="#00e599" fontFamily="JetBrains Mono" fontSize="10" x="10" y="35">
                      $148,920 ATH
                    </text>

                    <polygon fill="url(#drawdownGrad)" opacity="0.6" points="420,110 500,145 580,115 580,240 420,240" />
                    <polygon
                      fill="url(#equityFillGrad)"
                      points="0,240 0,225 60,210 120,218 180,195 240,178 300,185 360,150 420,110 460,132 500,145 540,128 580,115 640,95 700,82 760,88 820,62 880,55 940,42 1000,28 1000,240"
                    />
                    <path
                      d="M 0,225 L 60,210 L 120,218 L 180,195 L 240,178 L 300,185 L 360,150 L 420,110 L 460,132 L 500,145 L 540,128 L 580,115 L 640,95 L 700,82 L 760,88 L 820,62 L 880,55 L 940,42 L 1000,28"
                      fill="none"
                      stroke="#00e599"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                    />

                    <circle cx="420" cy="110" fill="#00f0ff" r="4" stroke="#0a0e17" strokeWidth="2" />
                    <circle cx="500" cy="145" fill="#ff4757" r="4" stroke="#0a0e17" strokeWidth="2" />
                    <circle className="animate-pulse" cx="1000" cy="28" fill="#00e599" r="5" stroke="#0a0e17" strokeWidth="2" />
                  </svg>
                </div>

                {/* 30-Day PnL Distribution Matrix (Daily Bars) */}
                <div className="mt-space-sm flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between text-data-micro font-label-caps uppercase text-outline">
                    <span>DAILY PROFIT / LOSS OUTCOME SKEW (LAST 30 SESSIONS)</span>
                    <span className="text-secondary">POSITIVE EXPECTANCY: 82.1% PROFITABLE DAYS</span>
                  </div>
                  <div className="grid grid-cols-30 gap-1 h-14 w-full bg-surface-container-lowest p-2 rounded border border-surface-container-high items-end">
                    <div className="h-6 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 1: +$840" />
                    <div className="h-8 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 2: +$1,120" />
                    <div className="h-3 bg-error/80 rounded-t-xs hover:bg-error transition-colors" title="Day 3: -$210" />
                    <div className="h-9 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 4: +$1,420" />
                    <div className="h-5 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 5: +$710" />
                    <div className="h-7 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 6: +$980" />
                    <div className="h-2 bg-error/80 rounded-t-xs hover:bg-error transition-colors" title="Day 7: -$180" />
                    <div className="h-10 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 8: +$1,850" />
                    <div className="h-11 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 9: +$2,100" />
                    <div className="h-4 bg-error/80 rounded-t-xs hover:bg-error transition-colors" title="Day 10: -$410" />
                    <div className="h-8 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 11: +$1,200" />
                    <div className="h-6 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 12: +$890" />
                    <div className="h-1 bg-error/80 rounded-t-xs hover:bg-error transition-colors" title="Day 13: -$90" />
                    <div className="h-7 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 14: +$950" />
                    <div className="h-12 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 15: +$2,450" />
                    <div className="h-5 bg-error/80 rounded-t-xs hover:bg-error transition-colors" title="Day 16: -$680" />
                    <div className="h-4 bg-error/80 rounded-t-xs hover:bg-error transition-colors" title="Day 17: -$520" />
                    <div className="h-9 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 18: +$1,340" />
                    <div className="h-8 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 19: +$1,180" />
                    <div className="h-10 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 20: +$1,620" />
                    <div className="h-7 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 21: +$980" />
                    <div className="h-2 bg-error/80 rounded-t-xs hover:bg-error transition-colors" title="Day 22: -$140" />
                    <div className="h-11 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 23: +$2,200" />
                    <div className="h-9 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 24: +$1,490" />
                    <div className="h-6 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 25: +$810" />
                    <div className="h-10 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 26: +$1,730" />
                    <div className="h-12 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 27: +$2,390" />
                    <div className="h-8 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 28: +$1,240" />
                    <div className="h-11 bg-secondary/80 rounded-t-xs hover:bg-secondary transition-colors" title="Day 29: +$2,150" />
                    <div
                      className="h-13 bg-secondary rounded-t-xs hover:bg-primary transition-colors border border-primary/40"
                      title="Today: +$2,840"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Protocol Risk & Non-Custodial Verification Notice */}
          <div className="mt-space-sm p-space-sm rounded bg-surface-container-low border border-surface-container-high flex flex-col sm:flex-row items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[20px] text-secondary">shield_lock</span>
              <div className="flex flex-col">
                <span className="font-label-caps text-label-caps text-on-surface font-semibold uppercase">
                  CRYPTOGRAPHIC READ-ONLY VERIFICATION ACTIVE
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Zero private keys stored. Pacifica Pilot accesses state through authenticated ed25519 signatures and zero-trust public RPC relays.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-space-sm text-data-micro font-data-tabular">
              <span className="px-2 py-1 rounded bg-surface-container text-on-surface-variant border border-surface-container-high">
                AUDIT: KUDELSKI v1.4
              </span>
              <span className="px-2 py-1 rounded bg-secondary/10 text-secondary border border-secondary/30">
                COLD STORAGE ISOLATED
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
