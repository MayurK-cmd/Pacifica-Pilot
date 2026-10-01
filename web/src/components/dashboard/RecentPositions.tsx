import { useQuery } from "@tanstack/react-query";
import { fetchRecentPositions } from "../../api/pacifica";
import { fmtDuration, fmtPrice, fmtTime, fmtUsd, pnlClass } from "../../lib/utils";
import { Badge, Card } from "../ui/Card";
import { Empty, ErrorState, Loading } from "../ui/State";

export function RecentPositions({ account }: { account: string }) {
  const q = useQuery({
    queryKey: ["recent-positions", account],
    queryFn: () => fetchRecentPositions(account),
    enabled: account.length > 0,
    refetchInterval: 60_000,
  });
  if (!account) return null;
  if (q.isPending) return <Loading text="Loading recent positions..." />;
  if (q.isError)
    return (
      <Card title="Recent positions">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Card>
    );
  if (!q.data.length) return <Empty text="No closed positions yet." />;
  return (
    <Card title="Last 5 positions">
      <ul className="divide-y divide-line text-xs">
        {q.data.slice(0, 5).map((t, i) => (
          <li key={`${t.symbol}-${t.closedAt ?? i}`} className="flex items-center gap-2 py-2">
            <span className="w-12 font-bold">{t.symbol}</span>
            <Badge tone={t.side === "LONG" ? "up" : "down"}>{t.side}</Badge>
            <span className={`num font-semibold ${pnlClass(t.realizedPnl)}`}>{fmtUsd(t.realizedPnl)}</span>
            <span className="num text-muted">{fmtDuration(t.durationSecs)}</span>
            <span className="ml-auto hidden text-muted sm:inline">
              {fmtPrice(t.entryPrice)} → {fmtPrice(t.exitPrice)} · {fmtTime(t.closedAt)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
