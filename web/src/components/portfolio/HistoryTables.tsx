import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchFunding, fetchOpenOrders, fetchOrderHistory, fetchTrades } from "../../api/pacifica";
import { fmtFunding, fmtPrice, fmtTime, fmtUsd, pnlClass } from "../../lib/utils";
import { TRADE_DIRECTION } from "../../lib/trades";
import { Badge, Card } from "../ui/Card";
import { Empty, ErrorState, Loading } from "../ui/State";

function Table({ children, minWidth = 640 }: { children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

function Head({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b border-line text-muted">
        {cols.map((c) => (
          <th key={c} scope="col" className="px-3 py-2 font-semibold">
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function OpenOrdersTable({ account }: { account: string }) {
  const q = useQuery({
    queryKey: ["open-orders", account],
    queryFn: () => fetchOpenOrders(account),
    enabled: account.length > 0,
    refetchInterval: 15_000,
  });
  if (!account) return <Empty text="Connect a wallet to see open orders." />;
  if (q.isPending) return <Loading text="Loading open orders..." />;
  if (q.isError)
    return (
      <Card title="Open orders">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Card>
    );
  if (!q.data.length) return <Empty text="No open orders." />;
  return (
    <Card title={`Open orders (${q.data.length})`}>
      <Table minWidth={720}>
        <Head cols={["Symbol", "Side", "Type", "Price", "Amount", "Filled", "Reduce", "Placed"]} />
        <tbody>
          {q.data.map((o) => (
            <tr key={o.orderId} className="border-t border-line">
              <td className="px-3 py-1.5 font-bold">
                <Link to={`/markets/${o.symbol}`} className="hover:underline">{o.symbol}</Link>
              </td>
              <td className="px-3 py-1.5">
                <Badge tone={o.side === "LONG" ? "up" : "down"}>{o.side}</Badge>
              </td>
              <td className="px-3 py-1.5">{o.orderType ?? "—"}</td>
              <td className="num px-3 py-1.5">{fmtPrice(o.price)}</td>
              <td className="num px-3 py-1.5">{o.amount ?? "—"}</td>
              <td className="num px-3 py-1.5">{o.filledAmount}</td>
              <td className="px-3 py-1.5">{o.reduceOnly ? "Yes" : "No"}</td>
              <td className="px-3 py-1.5 text-muted">{fmtTime(o.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

export function OrderHistoryTable({ account }: { account: string }) {
  const q = useQuery({
    queryKey: ["order-history", account],
    queryFn: () => fetchOrderHistory(account, 50),
    enabled: account.length > 0,
    refetchInterval: 30_000,
  });
  if (!account) return <Empty text="Connect a wallet to see order history." />;
  if (q.isPending) return <Loading text="Loading order history..." />;
  if (q.isError)
    return (
      <Card title="Order history">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Card>
    );
  if (!q.data.length) return <Empty text="No orders yet." />;
  return (
    <Card title="Order history">
      <Table minWidth={760}>
        <Head cols={["Symbol", "Side", "Type", "Status", "Price", "Avg fill", "Amount", "Filled", "Time"]} />
        <tbody>
          {q.data.map((o) => (
            <tr key={o.orderId} className="border-t border-line">
              <td className="px-3 py-1.5 font-bold">{o.symbol}</td>
              <td className="px-3 py-1.5">
                <Badge tone={o.side === "LONG" ? "up" : "down"}>{o.side}</Badge>
              </td>
              <td className="px-3 py-1.5">{o.orderType ?? "—"}</td>
              <td className="px-3 py-1.5">{o.status ?? "—"}</td>
              <td className="num px-3 py-1.5">{fmtPrice(o.price)}</td>
              <td className="num px-3 py-1.5">{fmtPrice(o.averageFilledPrice)}</td>
              <td className="num px-3 py-1.5">{o.amount ?? "—"}</td>
              <td className="num px-3 py-1.5">{o.filledAmount}</td>
              <td className="px-3 py-1.5 text-muted">{fmtTime(o.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

export function TradesTable({ account }: { account: string }) {
  const q = useQuery({
    queryKey: ["trades", account],
    queryFn: () => fetchTrades(account, 50),
    enabled: account.length > 0,
    refetchInterval: 30_000,
  });
  if (!account) return <Empty text="Connect a wallet to see trades." />;
  if (q.isPending) return <Loading text="Loading trades..." />;
  if (q.isError)
    return (
      <Card title="Trades">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Card>
    );
  if (!q.data.length) return <Empty text="No trades yet." />;
  return (
    <Card title="Trades">
      <Table minWidth={720}>
        <Head cols={["Symbol", "Event", "Price", "Entry", "Amount", "Fee", "PnL", "Time"]} />
        <tbody>
          {q.data.map((t, i) => {
            const dir = TRADE_DIRECTION[t.side ?? ""] ?? null;
            return (
              <tr key={`${t.createdAt ?? i}-${i}`} className="border-t border-line">
                <td className="px-3 py-1.5 font-bold">{t.symbol}</td>
                <td className="px-3 py-1.5">
                  {dir ? <Badge tone={dir === "LONG" ? "up" : "down"}>{t.side}</Badge> : (t.side ?? "—")}
                </td>
                <td className="num px-3 py-1.5">{fmtPrice(t.price)}</td>
                <td className="num px-3 py-1.5">{fmtPrice(t.entryPrice)}</td>
                <td className="num px-3 py-1.5">{t.amount ?? "—"}</td>
                <td className="num px-3 py-1.5">{t.fee ?? "—"}</td>
                <td className={`num px-3 py-1.5 font-semibold ${pnlClass(t.pnl)}`}>{fmtUsd(t.pnl)}</td>
                <td className="px-3 py-1.5 text-muted">{fmtTime(t.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}

export function FundingTable({ account }: { account: string }) {
  const q = useQuery({
    queryKey: ["funding", account],
    queryFn: () => fetchFunding(account, 50),
    enabled: account.length > 0,
    refetchInterval: 60_000,
  });
  if (!account) return <Empty text="Connect a wallet to see funding payments." />;
  if (q.isPending) return <Loading text="Loading funding..." />;
  if (q.isError)
    return (
      <Card title="Funding">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Card>
    );
  if (!q.data.length) return <Empty text="No funding payments yet." />;
  return (
    <Card title="Funding payments">
      <Table minWidth={560}>
        <Head cols={["Symbol", "Side", "Rate", "Payment", "Time"]} />
        <tbody>
          {q.data.map((f, i) => (
            <tr key={`${f.createdAt ?? i}-${i}`} className="border-t border-line">
              <td className="px-3 py-1.5 font-bold">{f.symbol}</td>
              <td className="px-3 py-1.5">
                <Badge tone={f.side === "LONG" ? "up" : "down"}>{f.side}</Badge>
              </td>
              <td className="num px-3 py-1.5">{fmtFunding(f.rate)}</td>
              <td className={`num px-3 py-1.5 font-semibold ${pnlClass(f.payout)}`}>{fmtUsd(f.payout)}</td>
              <td className="px-3 py-1.5 text-muted">{fmtTime(f.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
