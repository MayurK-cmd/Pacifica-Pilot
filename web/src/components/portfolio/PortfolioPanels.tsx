import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchPnl, fetchPortfolio } from "../../api/pacifica";
import { chartPalette, useTheme } from "../../lib/theme";
import { fmtDuration, fmtTime, fmtUsd } from "../../lib/utils";
import { Card } from "../ui/Card";
import { Empty, ErrorState, Loading } from "../ui/State";

/** Native SOL balance of the connected wallet, read via @solana/web3.js. */
export function SolBalanceCard() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [lamports, setLamports] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!publicKey) {
      setLamports(null);
      setError(false);
      return;
    }
    let cancelled = false;
    const key: PublicKey = publicKey;
    connection
      .getBalance(key, "confirmed")
      .then((b) => {
        if (!cancelled) setLamports(b);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [connection, publicKey]);

  if (!publicKey) return null;
  return (
    <div className="rounded border border-line p-3">
      <dt className="eyebrow">Wallet SOL</dt>
      <dd className="num text-metric mt-1">
        {error ? "—" : lamports === null ? "…" : `${(lamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`}
      </dd>
    </div>
  );
}

export function PortfolioOverview({ account }: { account: string }) {
  const q = useQuery({
    queryKey: ["portfolio", account],
    queryFn: () => fetchPortfolio(account),
    enabled: account.length > 0,
    refetchInterval: 30_000,
  });
  if (!account) return <Empty text="Connect a Pacifica account address to see portfolio." />;
  if (q.isPending) return <Loading text="Loading portfolio..." />;
  if (q.isError)
    return (
      <Card title="Portfolio">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Card>
    );
  const p = q.data;
  if (p.unavailable)
    return (
      <Card title="Portfolio">
        <Empty text={p.message ?? "Portfolio data unavailable."} />
      </Card>
    );
  const money = (n: number | null) => (n === null ? "—" : fmtUsd(n).replace("+", ""));
  const rows: [string, string][] = [
    ["Equity", money(p.equity)],
    ["Balance", money(p.balance)],
    ["Available", money(p.available)],
    ["Unrealized", fmtUsd(p.unrealizedPnl)],
    ["Margin used", money(p.marginUsed)],
    ["Positions", p.positionsCount === null ? "—" : String(p.positionsCount)],
    ["Open orders", p.ordersCount === null ? "—" : String(p.ordersCount)],
    ["Win rate", p.winRate === null ? "—" : `${(p.winRate * 100).toFixed(1)}%`],
  ];
  return (
    <Card title="Account overview">
      <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {rows.map(([k, v]) => (
          <div key={k} className="rounded border border-line p-3">
            <dt className="eyebrow">{k}</dt>
            <dd className="num text-metric mt-1">{v}</dd>
          </div>
        ))}
        <SolBalanceCard />
      </dl>
      {p.spotBalances.length > 0 && (
        <div className="mt-3">
          <p className="eyebrow mb-1">Spot balances</p>
          <ul className="flex flex-wrap gap-1.5 text-xs">
            {p.spotBalances.map((s) => (
              <li key={s.symbol} className="rounded bg-slate-100 px-2 py-0.5 font-mono dark:bg-slate-800">
                {s.symbol} {s.amount ?? "—"}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted">
        Positions, equity and PnL come from Pacifica for the connected address; SOL is read
        live from Solana via @solana/web3.js. Read-only — nothing here can sign or trade.
      </p>
    </Card>
  );
}

export function PerformanceSummary({ account }: { account: string }) {
  const q = useQuery({
    queryKey: ["portfolio", account],
    queryFn: () => fetchPortfolio(account),
    enabled: account.length > 0,
  });
  if (!account || q.isPending || q.isError || q.data.unavailable) return null;
  const p = q.data;
  const rows: [string, string][] = [
    ["Total trades", String(p.totalTrades)],
    ["Winners / losers", `${p.winningTrades} / ${p.losingTrades}`],
    ["Avg win", fmtUsd(p.avgWin)],
    ["Avg loss", fmtUsd(p.avgLoss)],
    ["Profit factor", p.profitFactor === null ? "—" : p.profitFactor.toFixed(2)],
    ["Avg duration", fmtDuration(p.avgDurationSecs)],
    ["Largest win", fmtUsd(p.largestWin)],
    ["Largest loss", fmtUsd(p.largestLoss)],
    ["Max drawdown", fmtUsd(p.maxDrawdown)],
  ];
  return (
    <Card title="Trading statistics">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs md:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-line py-1">
            <dt className="text-muted">{k}</dt>
            <dd className="num font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function EquityCurve({ account, range }: { account: string; range: string }) {
  const pal = chartPalette(useTheme());
  const q = useQuery({
    queryKey: ["pnl", account, range],
    queryFn: () => fetchPnl(account, range),
    enabled: account.length > 0,
  });
  if (!account) return null;
  if (q.isPending) return <Loading text="Loading equity curve..." />;
  if (q.isError)
    return (
      <Card title="Performance">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Card>
    );
  if (!q.data.length) return <Empty text="No performance history for this range." />;
  return (
    <Card title="Performance">
      <div className="h-60" role="img" aria-label="Equity curve">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={q.data.map((p) => ({ ...p, label: fmtTime(p.t) }))}>
            <CartesianGrid stroke={pal.grid} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: pal.tick }} minTickGap={48} />
            <YAxis tick={{ fontSize: 10, fill: pal.tick }} domain={["auto", "auto"]} />
            <Tooltip />
            <Area type="monotone" dataKey="cumulativePnl" name="Cumulative PnL" stroke={pal.line} fill={pal.area} strokeWidth={1.75} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
