import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { fetchMarkets } from "../../api/pacifica";
import { fetchScore } from "../../api/agent";
import { PAGE_SIZE } from "../../lib/watchlist";
import { fmtFunding, fmtPct, fmtPrice, pnlClass } from "../../lib/utils";
import { Card } from "../ui/Card";
import { Empty, ErrorState, Loading } from "../ui/State";

type SortKey = "symbol" | "price" | "change24hPct" | "volume24h" | "funding";

function ScoreCell({ symbol }: { symbol: string }) {
  const q = useQuery({ queryKey: ["score", symbol], queryFn: () => fetchScore(symbol), staleTime: 120_000 });
  if (q.isPending) return <span className="text-muted">…</span>;
  if (q.isError || !q.data) return <span className="text-muted">—</span>;
  return <span className="num font-semibold">{q.data.score}</span>;
}

export function MarketTable({
  query,
  watchlist,
  onToggleWatch,
}: {
  query: string;
  watchlist: string[];
  onToggleWatch: (symbol: string) => void;
}) {
  const markets = useQuery({ queryKey: ["markets"], queryFn: fetchMarkets, refetchInterval: 15_000 });
  const [sortKey, setSortKey] = useState<SortKey>("volume24h");
  const [dir, setDir] = useState<1 | -1>(-1);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [query]);

  if (markets.isPending) return <Loading text="Loading market scanner..." />;
  if (markets.isError)
    return (
      <Card title="Markets">
        <ErrorState error={markets.error} onRetry={() => markets.refetch()} />
      </Card>
    );

  const q = query.trim().toUpperCase();
  const rows = markets.data.filter((m) => !q || m.symbol.includes(q));
  if (!rows.length) return <Empty text={q ? `No markets match "${query}".` : "No markets available."} />;

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? Number.NEGATIVE_INFINITY;
    const bv = b[sortKey] ?? Number.NEGATIVE_INFINITY;
    if (typeof av === "string") return dir * av.localeCompare(bv as string);
    return dir * ((av as number) - (bv as number));
  });

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visible = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function toggle(k: SortKey) {
    if (k === sortKey) setDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(k);
      setDir(-1);
    }
  }

  const headers: { key: SortKey; label: string }[] = [
    { key: "symbol", label: "Asset" },
    { key: "price", label: "Price" },
    { key: "change24hPct", label: "24h" },
    { key: "volume24h", label: "Volume" },
    { key: "funding", label: "Funding" },
  ];

  const btn =
    "rounded border px-2 py-0.5 text-[11px] font-semibold border-line bg-paper disabled:opacity-40";

  return (
    <div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead>
            <tr className="border-b border-line text-muted">
              <th scope="col" className="px-2 py-2 font-semibold" aria-label="Watch">
                ★
              </th>
              {headers.map((h) => (
                <th key={h.key} scope="col" className="px-3 py-2 font-semibold">
                  <button type="button" onClick={() => toggle(h.key)} className="hover:text-ink">
                    {h.label} {sortKey === h.key ? (dir === -1 ? "▼" : "▲") : ""}
                  </button>
                </th>
              ))}
              <th scope="col" className="px-3 py-2 font-semibold">Score</th>
              <th scope="col" className="px-3 py-2 font-semibold">Bias</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => {
              const bias = (m.change24hPct ?? 0) > 1.5 ? "LONG" : (m.change24hPct ?? 0) < -1.5 ? "SHORT" : "NEUTRAL";
              const watched = watchlist.includes(m.symbol);
              return (
                <tr key={m.symbol} className="border-t border-line hover:bg-wash">
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => onToggleWatch(m.symbol)}
                      aria-label={watched ? `Remove ${m.symbol} from watchlist` : `Add ${m.symbol} to watchlist`}
                      aria-pressed={watched}
                      className={watched ? "text-warn" : "text-muted hover:text-ink"}
                    >
                      <Star size={14} aria-hidden fill={watched ? "currentColor" : "none"} />
                    </button>
                  </td>
                  <td className="px-3 py-2 font-bold">
                    <Link to={`/markets/${m.symbol}`} className="hover:underline">{m.symbol}</Link>
                  </td>
                  <td className="num px-3 py-2">{fmtPrice(m.price)}</td>
                  <td className={`num px-3 py-2 ${pnlClass(m.change24hPct)}`}>{fmtPct(m.change24hPct)}</td>
                  <td className="num px-3 py-2">{m.volume24h === null ? "—" : `$${(m.volume24h / 1e6).toFixed(1)}M`}</td>
                  <td className="num px-3 py-2">{fmtFunding(m.funding)}</td>
                  <td className="px-3 py-2"><ScoreCell symbol={m.symbol} /></td>
                  <td className="px-3 py-2 font-semibold">{bias}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <button type="button" className={btn} disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>
          ← Prev
        </button>
        <span className="text-muted" aria-live="polite">
          Page {safePage} of {pages} · {sorted.length} symbols · {PAGE_SIZE} per page
        </span>
        <button type="button" className={btn} disabled={safePage >= pages} onClick={() => setPage((p) => p + 1)}>
          Next →
        </button>
      </div>
    </div>
  );
}
