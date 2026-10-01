import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { fetchIntelligenceNews } from "../../api/elfa";
import { fmtAgo } from "../../lib/utils";
import { Badge, Card } from "../ui/Card";
import { ErrorState, Loading } from "../ui/State";

export function NewsFeed({ symbol }: { symbol?: string }) {
  const q = useQuery({
    queryKey: ["intel-news", symbol ?? "all"],
    queryFn: () => fetchIntelligenceNews(symbol),
    refetchInterval: 300_000,
  });
  if (q.isPending) return <Loading text="Loading news..." />;
  if (q.isError)
    return (
      <Card title="News / narrative feed">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Card>
    );
  if (!q.data.length)
    return (
      <Card title="News / narrative feed">
        <p className="py-2 text-xs text-muted">No news items right now.</p>
      </Card>
    );
  return (
    <Card title="News / narrative feed">
      <ul className="divide-y divide-line">
        {q.data.slice(0, 8).map((n) => (
          <li key={n.id} className="py-2">
            <div className="flex items-center gap-1.5 text-[11px] text-muted">
              <Badge tone={n.kind === "news" ? "info" : "muted"}>{n.kind === "news" ? "NEWS" : "SOCIAL"}</Badge>
              <span className="font-bold text-ink">{n.asset}</span>
              <span>{n.source}</span>
              <span aria-hidden>·</span>
              <span>{fmtAgo(n.timestamp)}</span>
            </div>
            <a
              href={n.url}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 inline-flex items-start gap-1 text-[13px] font-medium hover:underline"
            >
              {n.title}
              <ExternalLink size={12} aria-hidden className="mt-0.5 shrink-0" />
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted">
        Social posts are shown as social-source intelligence, never as newswire articles.
      </p>
    </Card>
  );
}
