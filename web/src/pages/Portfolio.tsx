import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { ShellContext } from "../components/layout/AppShell";
import { OpenPositions } from "../components/dashboard/OpenPositions";
import { EquityCurve, PerformanceSummary, PortfolioOverview } from "../components/portfolio/PortfolioPanels";
import { FundingTable, OpenOrdersTable, OrderHistoryTable, TradesTable } from "../components/portfolio/HistoryTables";

const TABS = ["Positions", "Open Orders", "Order History", "Trades", "Funding", "Performance"] as const;
type Tab = (typeof TABS)[number];

export function Portfolio() {
  const { account } = useOutletContext<ShellContext>();
  const [tab, setTab] = useState<Tab>("Positions");
  const [range, setRange] = useState("30D");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">Portfolio</h2>
        {tab === "Performance" && (
          <div className="ml-auto flex gap-1" role="group" aria-label="Performance range">
            {["24H", "7D", "30D", "ALL"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${
                  range === r
                    ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                    : "border-line bg-paper"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>
      <PortfolioOverview account={account} />
      <div className="flex flex-wrap gap-1 border-b border-line" role="tablist" aria-label="Portfolio sections">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-semibold ${
              tab === t ? "border-b-2 border-teal text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Positions" && <OpenPositions account={account} />}
      {tab === "Open Orders" && <OpenOrdersTable account={account} />}
      {tab === "Order History" && <OrderHistoryTable account={account} />}
      {tab === "Trades" && <TradesTable account={account} />}
      {tab === "Funding" && <FundingTable account={account} />}
      {tab === "Performance" && (
        <div className="space-y-3">
          <EquityCurve account={account} range={range} />
          <PerformanceSummary account={account} />
        </div>
      )}
    </div>
  );
}
