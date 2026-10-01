import { useQuery } from "@tanstack/react-query";
import { fetchScore } from "../../api/agent";
import { Card } from "../ui/Card";
import { Empty, ErrorState, Loading } from "../ui/State";

export function PacificaScore({ symbol }: { symbol: string }) {
  const q = useQuery({ queryKey: ["score", symbol], queryFn: () => fetchScore(symbol), refetchInterval: 60_000 });
  if (q.isPending) return <Loading text="Calculating Pacifica Score..." />;
  if (q.isError)
    return (
      <Card title={`Pacifica Score — ${symbol}`}>
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Card>
    );
  const s = q.data;
  if (!s.factors.length) return <Empty text="Insufficient data to score this asset." />;
  return (
    <Card title={`Pacifica Score — ${symbol}`}>
      <div className="flex items-baseline gap-2">
        <span className="num text-4xl font-bold">{s.score}</span>
        <span className="text-sm text-muted">/ 100</span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {s.factors.map((f) => (
          <li key={f.key} title={f.detail}>
            <div className="flex justify-between text-xs">
              <span className="font-medium">{f.label}{f.unavailable ? " (unavailable)" : ""}</span>
              <span className="num">{f.points > 0 ? `+${f.points}` : f.points}</span>
            </div>
            <div className="mt-0.5 h-1.5 rounded bg-slate-100 dark:bg-slate-800" aria-hidden>
              <div
                className={`h-1.5 rounded ${f.points >= 0 ? "bg-teal" : "bg-down"}`}
                style={{ width: `${Math.min(100, Math.abs(f.points) * 4)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-muted">{s.explanation}</p>
    </Card>
  );
}
