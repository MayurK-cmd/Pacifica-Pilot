import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { fetchNarratives, fetchSocial, fetchTrendingTokens } from "../../api/elfa";
import { fmtPct } from "../../lib/utils";
import { Badge, Card } from "../ui/Card";
import { ErrorState, Loading } from "../ui/State";

export function SocialIntelligence({ symbol }: { symbol: string }) {
  const social = useQuery({
    queryKey: ["social", symbol],
    queryFn: () => fetchSocial(symbol),
    refetchInterval: 120_000,
  });
  const trending = useQuery({ queryKey: ["trending"], queryFn: fetchTrendingTokens, refetchInterval: 300_000 });
  const narratives = useQuery({ queryKey: ["narratives"], queryFn: fetchNarratives, refetchInterval: 600_000 });

  return (
    <Card title="Social intelligence">
      {social.isPending ? (
        <Loading text="Loading social intelligence..." />
      ) : social.isError ? (
        <ErrorState error={social.error} onRetry={() => social.refetch()} />
      ) : social.data.unavailable ? (
        <p className="py-2 text-xs text-muted">
          Social intelligence unavailable — {social.data.message ?? "Elfa API key not configured."}
        </p>
      ) : (
        <div className="text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold">{social.data.symbol}</span>
            <Badge
              tone={social.data.sentiment === "bullish" ? "up" : social.data.sentiment === "bearish" ? "down" : "muted"}
            >
              {social.data.sentiment.toUpperCase()}
            </Badge>
            {social.data.trending && <Badge tone="info">TRENDING</Badge>}
          </div>
          <dl className="mt-1 grid grid-cols-3 gap-1">
            <div>Mentions <span className="num font-semibold">{social.data.mentions ?? "—"}</span></div>
            <div>Change <span className="num">{fmtPct(social.data.mentionsChangePct)}</span></div>
            <div>Mindshare <span className="num">{social.data.mindsharePct === null ? "—" : `${social.data.mindsharePct.toFixed(1)}%`}</span></div>
          </dl>
          {social.data.topLinks.length > 0 && (
            <ul className="mt-2 space-y-1">
              {social.data.topLinks.slice(0, 3).map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal hover:underline">
                    {l.label} <ExternalLink size={11} aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="mt-3 border-t border-line pt-2 text-xs">
        <p className="eyebrow mb-1">Trending assets</p>
        {trending.isError || !trending.data?.length ? (
          <p className="text-muted">{trending.isError ? "Trending data unavailable." : "No trending data."}</p>
        ) : (
          <ul className="flex flex-wrap gap-1">
            {trending.data.slice(0, 6).map((t) => (
              <li key={t.token} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">
                {t.token} {fmtPct(t.changePct)}
              </li>
            ))}
          </ul>
        )}
        <p className="eyebrow mb-1 mt-2">Trending narratives</p>
        {narratives.isError || !narratives.data?.length ? (
          <p className="text-muted">Narratives unavailable.</p>
        ) : (
          <ul className="list-disc space-y-0.5 pl-4">
            {narratives.data.slice(0, 4).map((n) => (
              <li key={n.narrative}>{n.narrative}</li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
