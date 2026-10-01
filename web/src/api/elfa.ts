// Elfa domain API — social/narrative intelligence only.
// Elfa "token news" is social-source intelligence, not a newswire (§8.2).
// V2 returns links + engagement, never raw post text.
import { apiGet } from "./client";
import type { Narrative, NewsItem, SocialIntelligence, TrendingToken } from "../types/trading";

export function fetchSocial(symbol: string): Promise<SocialIntelligence> {
  return apiGet.get<SocialIntelligence>(`/api/social/${encodeURIComponent(symbol)}`);
}

export function fetchTrendingTokens(): Promise<TrendingToken[]> {
  return apiGet.get<TrendingToken[]>("/api/social/trending");
}

export function fetchNarratives(): Promise<Narrative[]> {
  return apiGet.get<Narrative[]>("/api/social/narratives");
}

export function fetchIntelligenceNews(symbol?: string): Promise<NewsItem[]> {
  const q = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
  return apiGet.get<NewsItem[]>(`/api/intelligence-news${q}`);
}
