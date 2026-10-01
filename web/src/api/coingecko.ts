// CoinGecko domain API — broad market context + asset metadata only.
// Never the source of truth for positions/PnL/equity (§8.3).
import { apiGet } from "./client";
import type { Market, NewsItem } from "../types/trading";

export interface CoinMeta {
  id: string;
  symbol: string;
  name: string;
  marketCap: number | null;
  fdv: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  marketCapRank: number | null;
  ath: number | null;
  atl: number | null;
  unavailable: boolean;
}

export function fetchMarketContext(): Promise<Market[]> {
  return apiGet.get<Market[]>("/api/context/markets");
}

export function fetchCoinMeta(symbol: string): Promise<CoinMeta> {
  return apiGet.get<CoinMeta>(`/api/context/coin/${encodeURIComponent(symbol)}`);
}

export function fetchCryptoNews(coinId?: string): Promise<NewsItem[]> {
  const q = coinId ? `?coin_id=${encodeURIComponent(coinId)}` : "";
  return apiGet.get<NewsItem[]>(`/api/context/news${q}`);
}
