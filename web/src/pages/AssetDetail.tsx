import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchCoinMeta } from "../api/coingecko";
import { AssetChart } from "../components/dashboard/AssetChart";
import { PacificaScore } from "../components/dashboard/PacificaScore";
import { AISignal } from "../components/dashboard/AISignal";
import { SocialIntelligence } from "../components/dashboard/SocialIntelligence";
import { NewsFeed } from "../components/dashboard/NewsFeed";
import { fmtCompact } from "../lib/utils";
import { Card } from "../components/ui/Card";

export function AssetDetail() {
  const { symbol = "BTC" } = useParams();
  const sym = symbol.toUpperCase();
  const meta = useQuery({ queryKey: ["coin-meta", sym], queryFn: () => fetchCoinMeta(sym), staleTime: 300_000 });

  return (
    <div className="space-y-3">
      <nav className="text-xs text-muted" aria-label="Breadcrumb">
        <Link to="/markets" className="hover:underline">Markets</Link> / <span className="font-bold text-ink">{sym}</span>
      </nav>
      <AssetChart symbol={sym} />
      <div className="grid gap-3 xl:grid-cols-3">
        <PacificaScore symbol={sym} />
        <AISignal symbol={sym} />
        <SocialIntelligence symbol={sym} />
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <Card title="Market metadata (CoinGecko)">
          {meta.isPending ? (
            <p className="text-xs text-muted">Loading metadata...</p>
          ) : meta.isError || meta.data.unavailable ? (
            <p className="text-xs text-muted">Metadata unavailable for {sym}.</p>
          ) : (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex justify-between border-b border-line py-1"><dt className="text-muted">Name</dt><dd className="font-medium">{meta.data.name}</dd></div>
              <div className="flex justify-between border-b border-line py-1"><dt className="text-muted">Rank</dt><dd className="num">{meta.data.marketCapRank ?? "—"}</dd></div>
              <div className="flex justify-between border-b border-line py-1"><dt className="text-muted">Market cap</dt><dd className="num">{fmtCompact(meta.data.marketCap)}</dd></div>
              <div className="flex justify-between border-b border-line py-1"><dt className="text-muted">FDV</dt><dd className="num">{fmtCompact(meta.data.fdv)}</dd></div>
              <div className="flex justify-between border-b border-line py-1"><dt className="text-muted">Circulating</dt><dd className="num">{fmtCompact(meta.data.circulatingSupply)}</dd></div>
              <div className="flex justify-between border-b border-line py-1"><dt className="text-muted">Total supply</dt><dd className="num">{fmtCompact(meta.data.totalSupply)}</dd></div>
            </dl>
          )}
        </Card>
        <NewsFeed symbol={sym} />
      </div>
    </div>
  );
}
