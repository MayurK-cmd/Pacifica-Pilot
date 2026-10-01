import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchAgentEvents } from "../../api/agent";
import { fmtAgo, fmtTime } from "../../lib/utils";
import { Card } from "../ui/Card";
import { Empty, ErrorState, Loading } from "../ui/State";

export function AgentActivity() {
  const q = useQuery({ queryKey: ["agent-events"], queryFn: () => fetchAgentEvents(12), refetchInterval: 20_000 });
  if (q.isPending) return <Loading text="Loading agent activity..." />;
  if (q.isError)
    return (
      <Card title="Agent activity">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Card>
    );
  if (!q.data.length)
    return (
      <Card title="Agent activity">
        <Empty text="No agent activity yet. The Loop Agent writes an event each scan cycle." />
      </Card>
    );
  return (
    <Card title="Agent activity" action={<Link to="/agent" className="text-xs font-semibold text-teal">Agent →</Link>}>
      <ul className="divide-y divide-line text-xs">
        {q.data.map((e, i) => (
          <li key={`${e.t}-${i}`} className="flex gap-2 py-1.5">
            <span className="num w-16 shrink-0 text-muted" title={fmtTime(e.t)}>{fmtAgo(e.t)}</span>
            <span>{e.text}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
