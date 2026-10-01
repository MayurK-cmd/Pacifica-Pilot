import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchMarkets } from "../../api/pacifica";
import { fmtPrice, fmtPct, pnlClass } from "../../lib/utils";
import { ErrorState, Loading } from "../ui/State";

export function MarketStrip({ symbols }: { symbols: string[] }) {
  const q = useQuery({ queryKey: ["markets"], queryFn: fetchMarkets, refetchInterval: 15_000 });
  if (q.isPending) return <Loading text="Loading market data..." />;
  if (q.isError)
    return (
      <div className="card card-pad">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </div>
    );
  const by = new Map(q.data.map((m) => [m.symbol, m]));
  if (!symbols.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Market strip">
      {symbols.map((s) => {
        const m = by.get(s);
        return (
          <Link key={s} to={`/markets/${s}`} className="card card-pad hover:border-teal">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">{s}</span>
              <span aria-hidden className={m && (m.change24hPct ?? 0) >= 0 ? "text-up" : "text-down"}>
                {m && (m.change24hPct ?? 0) >= 0 ? "▲" : "▼"}
              </span>
            </div>
            <p className="num mt-1 text-lg font-semibold">{m ? fmtPrice(m.price) : "—"}</p>
            <p className={`num text-xs ${pnlClass(m?.change24hPct)}`}>{fmtPct(m?.change24hPct)} 24h</p>
          </Link>
        );
      })}
    </div>
  );
}
