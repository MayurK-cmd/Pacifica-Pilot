// Pacifica domain API — primary source for account/trading truth.
// Backed by GET /api/v1/info/prices, /api/v1/kline, positions & history
// via the local gateway (Pacifica MCP docs). Never CoinGecko for PnL.
import { apiGet } from "./client";
import type {
  Candle,
  ClosedPosition,
  FundingPayment,
  Market,
  OpenOrder,
  OrderRecord,
  PnLPoint,
  Portfolio,
  Position,
  Technicals,
  TradeEvent,
} from "../types/trading";

export function fetchMarkets(): Promise<Market[]> {
  return apiGet.get<Market[]>("/api/markets");
}

export function fetchMarket(symbol: string): Promise<Market> {
  return apiGet.get<Market>(`/api/markets/${encodeURIComponent(symbol)}`);
}

export function fetchKlines(symbol: string, interval = "1h", limit = 120): Promise<Candle[]> {
  return apiGet.get<Candle[]>(
    `/api/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`,
  );
}

export function fetchTechnicals(symbol: string): Promise<Technicals> {
  return apiGet.get<Technicals>(`/api/technicals/${encodeURIComponent(symbol)}`);
}

export function fetchPositions(account: string): Promise<Position[]> {
  return apiGet.get<Position[]>(`/api/positions?account=${encodeURIComponent(account)}`);
}

export function fetchRecentPositions(account: string): Promise<ClosedPosition[]> {
  return apiGet.get<ClosedPosition[]>(`/api/positions/recent?account=${encodeURIComponent(account)}`);
}

export function fetchPortfolio(account: string): Promise<Portfolio> {
  return apiGet.get<Portfolio>(`/api/portfolio?account=${encodeURIComponent(account)}`);
}

export function fetchPnl(account: string, range: string): Promise<PnLPoint[]> {
  return apiGet.get<PnLPoint[]>(
    `/api/pnl?account=${encodeURIComponent(account)}&range=${encodeURIComponent(range)}`,
  );
}

export function fetchOpenOrders(account: string): Promise<OpenOrder[]> {
  return apiGet.get<OpenOrder[]>(`/api/orders/open?account=${encodeURIComponent(account)}`);
}

export function fetchOrderHistory(account: string, limit = 50): Promise<OrderRecord[]> {
  return apiGet.get<OrderRecord[]>(
    `/api/orders/history?account=${encodeURIComponent(account)}&limit=${limit}`,
  );
}

export function fetchTrades(account: string, limit = 50): Promise<TradeEvent[]> {
  return apiGet.get<TradeEvent[]>(
    `/api/trades?account=${encodeURIComponent(account)}&limit=${limit}`,
  );
}

export function fetchFunding(account: string, limit = 50): Promise<FundingPayment[]> {
  return apiGet.get<FundingPayment[]>(
    `/api/funding?account=${encodeURIComponent(account)}&limit=${limit}`,
  );
}
