// Typed data models — docs/WEB.md §31. No `any`. All fields reflect
// real provider shapes (Pacifica / Elfa / CoinGecko) via the local gateway.

export type SignalDirection = "LONG" | "SHORT" | "NEUTRAL" | "WAIT";

export type MarketRegime = "TRENDING" | "RANGING" | "VOLATILE" | "UNKNOWN";

export interface Market {
  symbol: string;
  price: number | null;
  change24hPct: number | null;
  volume24h: number | null;
  openInterest: number | null;
  funding: number | null;
  nextFunding: number | null;
  mark: number | null;
  oracle: number | null;
  marketCap: number | null;
  updatedAt: number;
  unavailable?: boolean;
}

export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface Technicals {
  symbol: string;
  rsi14: number | null;
  macd: { value: number; signal: number; histogram: number } | null;
  bollinger: { upper: number; middle: number; lower: number } | null;
  regime: MarketRegime;
  unavailable: boolean;
}

export interface Position {
  symbol: string;
  side: "LONG" | "SHORT";
  size: number;
  entryPrice: number;
  markPrice: number | null;
  leverage: number | null;
  unrealizedPnl: number | null;
  pnlPct: number | null;
  fundingPaid: number | null;
  status: string;
}

export interface ClosedPosition {
  symbol: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  size: number;
  realizedPnl: number;
  durationSecs: number | null;
  openedAt: number | null;
  closedAt: number | null;
}

export interface PnLPoint {
  t: number;
  cumulativePnl: number;
  realizedPnl: number;
}

export interface SpotBalance {
  symbol: string;
  amount: number | null;
}

export interface Portfolio {
  equity: number | null;
  balance: number | null;
  available: number | null;
  availableToWithdraw: number | null;
  marginUsed: number | null;
  spotBalances: SpotBalance[];
  positionsCount: number | null;
  ordersCount: number | null;
  todayPnl: number | null;
  unrealizedPnl: number | null;
  realizedPnl: number | null;
  winRate: number | null;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number | null;
  avgLoss: number | null;
  profitFactor: number | null;
  avgDurationSecs: number | null;
  largestWin: number | null;
  largestLoss: number | null;
  maxDrawdown: number | null;
  unavailable: boolean;
  message?: string;
}

export interface OpenOrder {
  orderId: number;
  clientOrderId: string | null;
  symbol: string;
  side: "LONG" | "SHORT";
  price: number | null;
  amount: number | null;
  filledAmount: number;
  orderType: string | null;
  reduceOnly: boolean;
  createdAt: number | null;
  updatedAt: number | null;
}

export interface OrderRecord {
  orderId: number;
  clientOrderId: string | null;
  symbol: string;
  side: "LONG" | "SHORT";
  price: number | null;
  averageFilledPrice: number | null;
  amount: number | null;
  filledAmount: number;
  status: string | null;
  orderType: string | null;
  createdAt: number | null;
  updatedAt: number | null;
}

export interface TradeEvent {
  symbol: string;
  side: string | null;
  amount: number | null;
  price: number | null;
  entryPrice: number | null;
  fee: number | null;
  pnl: number | null;
  eventType: string | null;
  createdAt: number | null;
}

export interface FundingPayment {
  symbol: string;
  side: "LONG" | "SHORT";
  amount: number | null;
  payout: number | null;
  rate: number | null;
  createdAt: number | null;
}

export interface ScoreFactor {
  key: "technical" | "momentum" | "social" | "news" | "funding" | "risk";
  label: string;
  points: number;
  detail: string;
  unavailable?: boolean;
}

export interface ScoreBreakdown {
  symbol: string;
  score: number;
  factors: ScoreFactor[];
  explanation: string;
  computedAt: number;
}

export interface Signal {
  symbol: string;
  direction: SignalDirection;
  confidence: number;
  factors: ScoreFactor[];
  note: string;
  updatedAt: number;
}

export interface SocialIntelligence {
  symbol: string;
  mentions: number | null;
  mentionsChangePct: number | null;
  mindsharePct: number | null;
  sentiment: "bullish" | "bearish" | "neutral" | "unknown";
  trending: boolean;
  topLinks: { url: string; label: string; likes: number; reposts: number }[];
  unavailable: boolean;
  message?: string;
}

export interface TrendingToken {
  token: string;
  currentCount: number;
  previousCount: number;
  changePct: number;
}

export interface Narrative {
  narrative: string;
  sourceLinks: string[];
}

export interface NewsItem {
  id: string;
  asset: string;
  source: string;
  kind: "news" | "social";
  timestamp: number | null;
  title: string;
  url: string;
  sentiment: "bullish" | "bearish" | "neutral" | "unknown";
}

export interface AgentEvent {
  t: number;
  kind: string;
  text: string;
}

export type IntelAction = "setup" | "explain" | "markets" | "summary";

export interface IntelReply {
  reply: string;
  sessionId: string | null;
  creditsConsumed: number | null;
  model?: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  creditsConsumed?: number | null;
}

export interface DigestMover {
  symbol: string;
  change24hPct: number | null;
  price?: number | null;
  funding?: number | null;
  id?: string;
}

export interface DailyDigest {
  generatedAt: number;
  market: {
    totalMarketCap: number | null;
    marketCapChange24hPct: number | null;
    btcDominancePct: number | null;
    ethDominancePct: number | null;
  };
  gainers: DigestMover[];
  losers: DigestMover[];
  perps: DigestMover[];
  trending: string[];
  elfa: { trending: { token: string; changePct: number | null }[]; narratives: string[] };
  elfaUnavailable: boolean;
}

export interface AgentStatus {
  online: boolean;
  mode: string;
  dryRun: boolean | null;
  currentAsset: string | null;
  currentRegime: MarketRegime;
  lastHeartbeat: number | null;
  lastAnalysis: number | null;
  message?: string;
}

export interface SystemStatus {
  services: { name: string; state: "operational" | "degraded" | "down"; detail: string }[];
  updatedAt: number;
}
