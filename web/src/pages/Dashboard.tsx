import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { ShellContext } from "../components/layout/AppShell";
import { MarketStrip } from "../components/dashboard/MarketStrip";
import { OverviewCards } from "../components/dashboard/OverviewCards";
import { AssetChart } from "../components/dashboard/AssetChart";
import { PacificaScore } from "../components/dashboard/PacificaScore";
import { AISignal } from "../components/dashboard/AISignal";
import { OpenPositions } from "../components/dashboard/OpenPositions";
import { RecentPositions } from "../components/dashboard/RecentPositions";
import { PnLChart } from "../components/dashboard/PnLChart";
import { SocialIntelligence } from "../components/dashboard/SocialIntelligence";
import { NewsFeed } from "../components/dashboard/NewsFeed";
import { SystemStatus } from "../components/dashboard/SystemStatus";
import { WatchlistManager } from "../components/dashboard/WatchlistManager";
import { useWatchlist } from "../lib/watchlist";

export function Dashboard() {
  const { account } = useOutletContext<ShellContext>();
  const { watchlist, add, remove, reset } = useWatchlist();
  const [focus, setFocus] = useState(watchlist[0] ?? "BTC");

  useEffect(() => {
    if (!watchlist.includes(focus)) setFocus(watchlist[0] ?? "BTC");
  }, [watchlist, focus]);

  return (
    <div className="space-y-3">
      <MarketStrip symbols={watchlist} />
      <OverviewCards account={account} />
      <div className="grid gap-3 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <div className="flex items-center gap-1 text-xs" role="group" aria-label="Focus asset">
            <span className="font-semibold text-muted">Focus:</span>
            {watchlist.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFocus(s)}
                aria-pressed={focus === s}
                className={`rounded border px-2 py-0.5 font-bold ${
                  focus === s
                    ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                    : "border-line bg-paper"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <AssetChart symbol={focus} />
        </div>
        <div className="space-y-3">
          <PacificaScore symbol={focus} />
          <AISignal symbol={focus} />
          <WatchlistManager watchlist={watchlist} add={add} remove={remove} reset={reset} />
        </div>
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <OpenPositions account={account} compact />
          <RecentPositions account={account} />
          <PnLChart account={account} />
        </div>
        <div className="space-y-3">
          <SocialIntelligence symbol={focus} />
          <NewsFeed symbol={focus} />
          <SystemStatus />
        </div>
      </div>
    </div>
  );
}
