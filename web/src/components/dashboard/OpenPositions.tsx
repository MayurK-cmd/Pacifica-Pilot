import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchPositions } from "../../api/pacifica";
import { fmtFunding, fmtPrice, fmtUsd, pnlClass } from "../../lib/utils";
import { Badge, Card } from "../ui/Card";
import { Empty, ErrorState, Loading } from "../ui/State";

export function OpenPositions({ account, compact = false }: { account: string; compact?: boolean }) {
  const q = useQuery({
    queryKey: ["positions", account],
    queryFn: () => fetchPositions(account),
    enabled: account.length > 0,
    refetchInterval: 15_000,
  });

  if (!account) return <Empty text="No account connected. Connect a wallet address above." />;
  if (q.isPending) return <Loading text="Loading open positions..." />;
  if (q.isError)
    return (
      <Card title="Open positions">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Card>
    );
  if (!q.data.length) return <Empty text="No open positions" />;

  return (
    <Card
      title="Open positions"
      action={!compact ? <Link to="/portfolio" className="text-xs font-semibold text-teal">Full view →</Link> : undefined}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className="text-muted">
              <th scope="col" className="py-1 pr-2 font-semibold">Symbol</th>
              <th scope="col" className="py-1 pr-2 font-semibold">Direction</th>
              <th scope="col" className="py-1 pr-2 font-semibold">Size</th>
              <th scope="col" className="py-1 pr-2 font-semibold">Entry</th>
              <th scope="col" className="py-1 pr-2 font-semibold">Mark</th>
              <th scope="col" className="py-1 pr-2 font-semibold">Leverage</th>
              <th scope="col" className="py-1 pr-2 font-semibold">uPnL</th>
              <th scope="col" className="py-1 pr-2 font-semibold">Funding</th>
            </tr>
          </thead>
          <tbody>
            {q.data.map((p) => (
              <tr key={p.symbol} className="border-t border-line">
                <td className="py-1.5 pr-2 font-bold">
                  <Link to={`/markets/${p.symbol}`} className="hover:underline">{p.symbol}</Link>
                </td>
                <td className="py-1.5 pr-2">
                  <Badge tone={p.side === "LONG" ? "up" : "down"}>{p.side}</Badge>
                </td>
                <td className="num py-1.5 pr-2">{p.size}</td>
                <td className="num py-1.5 pr-2">{fmtPrice(p.entryPrice)}</td>
                <td className="num py-1.5 pr-2">{fmtPrice(p.markPrice)}</td>
                <td className="num py-1.5 pr-2">{p.leverage === null ? "—" : `${p.leverage}x`}</td>
                <td className={`num py-1.5 pr-2 font-semibold ${pnlClass(p.unrealizedPnl)}`}>
                  {fmtUsd(p.unrealizedPnl)}
                </td>
                <td className="num py-1.5 pr-2">{fmtFunding(p.fundingPaid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
