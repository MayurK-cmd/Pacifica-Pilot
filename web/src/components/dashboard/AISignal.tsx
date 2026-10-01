import { useQuery } from "@tanstack/react-query";
import { fetchSignal } from "../../api/agent";
import { Badge, Card } from "../ui/Card";
import { ErrorState, Loading } from "../ui/State";

const tone = (d: string): "up" | "down" | "warn" | "muted" =>
  d === "LONG" ? "up" : d === "SHORT" ? "down" : d === "WAIT" ? "warn" : "muted";

export function AISignal({ symbol }: { symbol: string }) {
  const q = useQuery({ queryKey: ["signal", symbol], queryFn: () => fetchSignal(symbol), refetchInterval: 60_000 });
  if (q.isPending) return <Loading text="Loading agent signal..." />;
  if (q.isError)
    return (
      <Card title={`AI signal — ${symbol}`}>
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Card>
    );
  const s = q.data;
  return (
    <Card title={`AI signal — ${symbol}`}>
      <div className="flex items-center gap-2">
        <Badge tone={tone(s.direction)}>{s.direction === "WAIT" ? "WAIT FOR CONFIRMATION" : `${s.direction} BIAS`}</Badge>
        <span className="num text-sm">Confidence {s.confidence}/100</span>
      </div>
      <ul className="mt-2 space-y-1 text-xs">
        {s.factors.map((f) => (
          <li key={f.key} className="flex justify-between">
            <span>{f.label}</span>
            <span className="num">{f.points > 0 ? `+${f.points}` : f.points}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">{s.note}</p>
      <p className="mt-1 text-[11px] text-muted">Read-only intelligence. Execution happens in the TUI.</p>
    </Card>
  );
}
