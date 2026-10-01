import { useQuery } from "@tanstack/react-query";
import { fetchPortfolio, fetchPositions } from "../../api/pacifica";
import { fmtPct, fmtUsd } from "../../lib/utils";
import { Card } from "../ui/Card";
import { Empty, ErrorState, Loading } from "../ui/State";

export function OverviewCards({ account }: { account: string }) {
  const pf = useQuery({
    queryKey: ["portfolio", account],
    queryFn: () => fetchPortfolio(account),
    enabled: account.length > 0,
    refetchInterval: 30_000,
  });
  const pos = useQuery({
    queryKey: ["positions", account],
    queryFn: () => fetchPositions(account),
    enabled: account.length > 0,
    refetchInterval: 15_000,
  });

  if (!account) return <Empty text="Connect a Pacifica account address to see equity, PnL and positions." />;

  if (pf.isPending || pos.isPending) return <Loading text="Loading account overview..." />;
  if (pf.isError)
    return (
      <Card title="Account overview">
        <ErrorState error={pf.error} onRetry={() => pf.refetch()} />
      </Card>
    );
  if (pos.isError)
    return (
      <Card title="Account overview">
        <ErrorState error={pos.error} onRetry={() => pos.refetch()} />
      </Card>
    );

  const p = pf.data;
  const cards: { label: string; value: string; sub?: string }[] = [
    { label: "Equity", value: p.equity === null ? "—" : fmtUsd(p.equity).replace("+", "") },
    { label: "Today PnL", value: fmtUsd(p.todayPnl) },
    { label: "Unrealized", value: fmtUsd(p.unrealizedPnl) },
    {
      label: "Win rate",
      value: p.winRate === null ? "—" : fmtPct(p.winRate * 100).replace("+", ""),
      sub: `${p.totalTrades} trades`,
    },
    { label: "Open positions", value: String(pos.data.length) },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5" aria-label="Account overview">
      {cards.map((c) => (
        <div key={c.label} className="card card-pad">
          <p className="eyebrow">{c.label}</p>
          <p className="num text-metric mt-1">{c.value}</p>
          {c.sub && <p className="mt-0.5 text-[11px] text-muted">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}
