import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { fetchKlines, fetchMarket, fetchTechnicals } from "../../api/pacifica";
import { chartPalette, useTheme } from "../../lib/theme";
import { fmtFunding, fmtPct, fmtPrice } from "../../lib/utils";
import { Badge, Card } from "../ui/Card";
import { Empty, ErrorState, Loading } from "../ui/State";

export function AssetChart({ symbol }: { symbol: string }) {
  const [interval, setInterval] = useState("1h");
  const pal = chartPalette(useTheme());
  const market = useQuery({
    queryKey: ["market", symbol],
    queryFn: () => fetchMarket(symbol),
    refetchInterval: 15_000,
  });
  const klines = useQuery({
    queryKey: ["klines", symbol, interval],
    queryFn: () => fetchKlines(symbol, interval, 120),
    refetchInterval: 30_000,
  });
  const tech = useQuery({ queryKey: ["technicals", symbol], queryFn: () => fetchTechnicals(symbol) });

  return (
    <Card
      title={`Main asset intelligence — ${symbol}`}
      action={
        <label className="flex items-center gap-1 text-xs text-muted">
          Interval
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="rounded border border-line bg-paper px-1 py-0.5 text-xs"
          >
            {["15m", "1h", "4h", "1d"].map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
      }
    >
      {market.isPending || klines.isPending ? (
        <Loading text="Loading market data..." />
      ) : market.isError ? (
        <ErrorState error={market.error} onRetry={() => market.refetch()} />
      ) : klines.isError ? (
        <ErrorState error={klines.error} onRetry={() => klines.refetch()} />
      ) : klines.data.length === 0 ? (
        <Empty text="Historical market data unavailable" />
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="num text-2xl font-bold">{fmtPrice(market.data.price)}</span>
            <span className="num text-sm text-muted">{fmtPct(market.data.change24hPct)} 24h</span>
            <span className="text-xs text-muted">Funding {fmtFunding(market.data.funding)}</span>
            {tech.data && !tech.data.unavailable ? (
              <>
                <span className="text-xs text-muted">
                  RSI {tech.data.rsi14 === null ? "—" : tech.data.rsi14.toFixed(1)}
                </span>
                <Badge tone={tech.data.regime === "TRENDING" ? "up" : tech.data.regime === "VOLATILE" ? "warn" : "muted"}>
                  {tech.data.regime}
                </Badge>
              </>
            ) : (
              <Badge tone="muted">REGIME UNKNOWN</Badge>
            )}
          </div>
          <div className="mt-2 h-64" role="img" aria-label={`${symbol} price chart`}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={klines.data.map((k) => ({ t: new Date(k.t).toLocaleString(), c: k.c, v: k.v }))}
              >
                <CartesianGrid stroke={pal.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: pal.tick }} minTickGap={48} />
                <YAxis
                  yAxisId="price"
                  orientation="right"
                  tick={{ fontSize: 10, fill: pal.tick }}
                  domain={["auto", "auto"]}
                />
                <YAxis yAxisId="vol" hide />
                <Tooltip />
                <Bar yAxisId="vol" dataKey="v" fill={pal.bar} name="Volume" />
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="c"
                  stroke={pal.line}
                  strokeWidth={1.75}
                  dot={false}
                  name="Close"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {tech.isError || tech.data?.unavailable ? (
            <p className="mt-2 text-xs text-muted">Indicators unavailable for this symbol/interval.</p>
          ) : (
            tech.data && (
              <dl className="mt-2 grid grid-cols-2 gap-1 text-xs md:grid-cols-4">
                <div>MACD <span className="num">{tech.data.macd ? tech.data.macd.value.toFixed(2) : "—"}</span></div>
                <div>Bollinger <span className="num">{tech.data.bollinger ? tech.data.bollinger.middle.toFixed(2) : "—"}</span></div>
                <div>Volume <span className="num">{market.data.volume24h ? `$${(market.data.volume24h / 1e6).toFixed(1)}M` : "—"}</span></div>
                <div>Regime <span className="font-semibold">{tech.data.regime}</span></div>
              </dl>
            )
          )}
        </>
      )}
    </Card>
  );
}
