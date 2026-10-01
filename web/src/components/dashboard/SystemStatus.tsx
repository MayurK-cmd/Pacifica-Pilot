import { useQuery } from "@tanstack/react-query";
import { fetchSystemStatus } from "../../api/agent";
import { Card } from "../ui/Card";
import { ErrorState, Loading } from "../ui/State";

export function SystemStatus() {
  const q = useQuery({ queryKey: ["system-status"], queryFn: fetchSystemStatus, refetchInterval: 30_000 });
  if (q.isPending) return <Loading text="Checking system status..." />;
  if (q.isError)
    return (
      <Card title="System status">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Card>
    );
  return (
    <Card title="System status">
      <ul className="space-y-1 text-xs">
        {q.data.services.map((s) => (
          <li key={s.name} className="flex items-center gap-2">
            <span
              aria-hidden
              className={s.state === "operational" ? "text-up" : s.state === "degraded" ? "text-warn" : "text-down"}
            >
              ●
            </span>
            <span className="font-medium">{s.name}</span>
            <span className="text-muted">{s.state === "operational" ? "Operational" : s.state === "degraded" ? `Degraded — ${s.detail}` : `Down — ${s.detail}`}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
