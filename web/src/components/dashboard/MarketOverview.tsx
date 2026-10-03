import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchMarkets } from "../../api/pacifica";
import { useTheme } from "../../lib/theme";
import { fmtPct, fmtPrice } from "../../lib/utils";
import { Card } from "../ui/Card";
import { Empty, ErrorState, Loading } from "../ui/State";

/** Share of tracked markets up vs down over 24h, with counts and a split bar. */
export function MarketBreadth() {
  const q = useQuery({ queryKey: ["markets"], queryFn: fetchMarkets, refetchInterval: 30_000 });
  const theme = useTheme();
  if (q.isPending) return <Loading text="Loading market breadth..." />;
  if (q.isError)
    return (
      <Card title="Market breadth">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Card>
    );
  const priced = q.data.filter((m) => m.change24hPct !== null && !/[-/]/.test(m.symbol));
  if (!priced.length) return <Empty text="No market data." />;
  const up = priced.filter((m) => (m.change24hPct ?? 0) > 0);
  const down = priced.filter((m) => (m.change24hPct ?? 0) < 0);
  const upPct = (up.length / priced.length) * 100;
  const downPct = (down.length / priced.length) * 100;
  const upColor = theme === "dark" ? "#4ade80" : "#15803d";
  const downColor = theme === "dark" ? "#f87171" : "#b91c1c";

  return (
    <Card title={`Market breadth — ${priced.length} markets, 24h`}>
      <div className="flex items-baseline gap-6">
        <div>
          <p className="num text-4xl font-bold" style={{ color: upColor }}>
            {upPct.toFixed(0)}%
          </p>
          <p className="text-xs text-muted">up ({up.length})</p>
        </div>
        <div>
          <p className="num text-4xl font-bold" style={{ color: downColor }}>
            {downPct.toFixed(0)}%
          </p>
          <p className="text-xs text-muted">down ({down.length})</p>
        </div>
        <p className="ml-auto hidden text-xs text-muted sm:block">
          {priced.length - up.length - down.length} flat
        </p>
      </div>
      <div
        className="mt-3 flex h-3 overflow-hidden rounded"
        role="img"
        aria-label={`${upPct.toFixed(0)} percent of markets up, ${downPct.toFixed(0)} percent down over 24 hours`}
      >
        <div style={{ width: `${upPct}%`, background: upColor }} />
        <div style={{ width: `${downPct}%`, background: downColor }} />
      </div>
    </Card>
  );
}

/** Top 5 symbols by 24h volume. */
export function TopVolume() {
  const q = useQuery({ queryKey: ["markets"], queryFn: fetchMarkets, refetchInterval: 30_000 });
  if (q.isPending) return <Loading text="Loading volumes..." />;
  if (q.isError)
    return (
      <Card title="Top traded">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Card>
    );
  const top = [...q.data]
    .filter((m) => m.volume24h !== null && !/[-/]/.test(m.symbol))
    .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
    .slice(0, 5);
  if (!top.length) return <Empty text="No volume data." />;
  return (
    <Card title="Top 5 traded — 24h volume">
      <ol className="divide-y divide-line">
        {top.map((m, i) => (
          <li key={m.symbol} className="flex items-baseline gap-2 py-1.5 text-xs">
            <span className="w-4 font-bold text-muted">{i + 1}</span>
            <Link to={`/markets/${m.symbol}`} className="font-bold hover:underline">
              {m.symbol}
            </Link>
            <span className="num ml-auto">{fmtPrice(m.price)}</span>
            <span className="num w-20 text-right text-muted">
              {m.volume24h !== null ? `$${(m.volume24h / 1e6).toFixed(1)}M` : "—"}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/** Tile heatmap: color = 24h change intensity, size grows with volume. */
export function MarketHeatmap() {
  const q = useQuery({ queryKey: ["markets"], queryFn: fetchMarkets, refetchInterval: 60_000 });
  const theme = useTheme();
  if (q.isPending) return <Loading text="Loading heatmap..." />;
  if (q.isError)
    return (
      <Card title="Market heatmap">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Card>
    );
  const rows = q.data.filter((m) => m.change24hPct !== null && !/[-/]/.test(m.symbol));
  if (!rows.length) return <Empty text="No market data." />;
  const vols = rows.map((m) => Math.log10((m.volume24h ?? 0) + 1));
  const vMin = Math.min(...vols);
  const vMax = Math.max(...vols);
  const span = Math.max(vMax - vMin, 1e-6);

  const tile = (chg: number) => {
    const mag = Math.min(Math.abs(chg) / 8, 1);
    const alpha = 0.15 + mag * 0.75;
    const base = theme === "dark" ? "74,222,128" : "21,128,61";
    const red = theme === "dark" ? "248,113,113" : "185,28,28";
    return chg >= 0 ? `rgba(${base},${alpha.toFixed(2)})` : `rgba(${red},${alpha.toFixed(2)})`;
  };

  return (
    <Card title="Market heatmap — 24h change × volume">
      <div className="flex flex-wrap gap-1" role="img" aria-label="Heatmap of 24 hour price changes sized by volume">
        {rows.map((m, i) => {
          const grow = 1 + ((vols[i] - vMin) / span) * 4;
          return (
            <Link
              key={m.symbol}
              to={`/markets/${m.symbol}`}
              title={`${m.symbol}: ${fmtPct(m.change24hPct)}${m.volume24h !== null ? ` · vol $${(m.volume24h / 1e6).toFixed(1)}M` : ""}`}
              className="rounded px-2 py-1.5 font-mono hover:opacity-80"
              style={{ background: tile(m.change24hPct ?? 0), flexGrow: grow, flexBasis: 76 }}
            >
              <span className="block text-[11px] font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">{m.symbol}</span>
              <span className="num block text-[10px] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">{fmtPct(m.change24hPct)}</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
