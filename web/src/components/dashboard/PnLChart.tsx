import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchPnl } from "../../api/pacifica";
import { chartPalette, useTheme } from "../../lib/theme";
import { fmtTime } from "../../lib/utils";
import { Card } from "../ui/Card";
import { Empty, ErrorState, Loading } from "../ui/State";

const RANGES = ["24H", "7D", "30D", "ALL"] as const;

export function PnLChart({ account }: { account: string }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("7D");
  const pal = chartPalette(useTheme());
  const q = useQuery({
    queryKey: ["pnl", account, range],
    queryFn: () => fetchPnl(account, range),
    enabled: account.length > 0,
    refetchInterval: 60_000,
  });

  return (
    <Card
      title="PnL chart"
      action={
        <div className="flex gap-1" role="group" aria-label="PnL range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${
                range === r
                ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                : "border-line bg-paper"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      }
    >
      {!account ? (
        <Empty text="Connect an account to see performance." />
      ) : q.isPending ? (
        <Loading text="Loading performance..." />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <Empty text="No performance history yet." />
      ) : (
        <div className="h-52" role="img" aria-label="Cumulative PnL chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={q.data.map((p) => ({ ...p, label: fmtTime(p.t) }))}>
              <CartesianGrid stroke={pal.grid} strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: pal.tick }} minTickGap={48} />
              <YAxis tick={{ fontSize: 10, fill: pal.tick }} domain={["auto", "auto"]} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="cumulativePnl"
                name="Cumulative PnL"
                stroke={pal.line}
                fill={pal.area}
                strokeWidth={1.75}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
