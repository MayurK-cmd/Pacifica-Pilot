import { useState } from "react";
import { MarketTable } from "../components/markets/MarketTable";
import { useWatchlist } from "../lib/watchlist";

export function Markets() {
  const [query, setQuery] = useState("");
  const { watchlist, toggle } = useWatchlist();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">Markets</h2>
        <span className="text-xs text-muted">Every symbol listed on Pacifica. ★ adds to your dashboard watchlist.</span>
        <label className="ml-auto flex items-center gap-2 text-xs">
          Search
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="BTC…"
            className="w-40 rounded border border-line bg-paper px-2 py-1 text-xs"
          />
        </label>
      </div>
      <MarketTable query={query} watchlist={watchlist} onToggleWatch={toggle} />
      <p className="text-[11px] text-muted">
        Prices and funding from Pacifica perps and spot markets. Score is PacificaPilot intelligence,
        bias is a momentum heuristic — not a trading instruction.
      </p>
    </div>
  );
}
