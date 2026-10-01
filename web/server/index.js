// PacificaPilot web gateway — local only (localhost:8001).
// Browser calls same-origin /api/* (vite proxy in dev); this server holds
// ELFA_API_KEY / COINGECKO_API_KEY / account reads. Never ships keys.
// Docs: docs/WEB.md §8-9. Real data only — no mocks, 503 + message when down.
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), "server", ".env") });
dotenv.config();

const app = express();
app.use(cors({ origin: ["http://localhost:5174", "http://127.0.0.1:5174"] }));
app.use(express.json({ limit: "256kb" }));

const PORT = Number(process.env.GATEWAY_PORT ?? 8001);
const PACIFICA = (process.env.PACIFICA_BASE_URL ?? "https://test-api.pacifica.fi/api/v1").replace(/\/$/, "");
const ELFA_KEY = process.env.ELFA_API_KEY ?? "";
const ELFA_BASE = "https://api.elfa.ai/v2";
const CG_KEY = process.env.COINGECKO_API_KEY ?? "";
const CG_PRO = String(process.env.COINGECKO_PRO ?? "").toLowerCase() === "true";
const CG_BASE = CG_PRO ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3";
const UA = { "User-Agent": "PacificaPilot-web/0.1.0", Accept: "application/json" };

// Pacifica symbol -> CoinGecko id -> Elfa ticker/coinIds
const SYMBOLS = {
  BTC: { cg: "bitcoin", elfa: "$BTC" },
  ETH: { cg: "ethereum", elfa: "$ETH" },
  SOL: { cg: "solana", elfa: "$SOL" },
  HYPE: { cg: "hyperliquid", elfa: "$HYPE" },
  WIF: { cg: "dogwifcoin", elfa: "$WIF" },
  BONK: { cg: "bonk", elfa: "$BONK" },
  JUP: { cg: "jupiter", elfa: "$JUP" },
  ARB: { cg: "arbitrum", elfa: "$ARB" },
};
const KNOWN = Object.keys(SYMBOLS);

// ---- tiny TTL cache (reduces CoinGecko/Elfa calls) ----
const cache = new Map();
function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.t < ttlMs) return Promise.resolve(hit.v);
  return fn().then((v) => {
    cache.set(key, { t: now, v });
    return v;
  });
}

async function fetchJson(url, { headers = {}, timeoutMs = 12000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { ...UA, ...headers }, signal: ctrl.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err = new Error(`Upstream ${res.status} for ${url}`);
      err.status = res.status;
      err.body = text.slice(0, 300);
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const num = (v) => {
  const n = typeof v === "string" ? Number.parseFloat(v) : typeof v === "number" ? v : Number.NaN;
  return Number.isFinite(n) ? n : null;
};
const errJson = (res, status, error, extra = {}) => res.status(status).json({ error, ...extra });

// ---- local pilot files (best-effort; missing => empty states, never mock) ----
function pilotDir() {
  return path.join(os.homedir(), ".pacificapilot");
}
function readJsonFile(name) {
  try {
    const raw = fs.readFileSync(path.join(pilotDir(), name), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ---- Pacifica upstream ----
async function pacificaPrices() {
  // GET /api/v1/info/prices (Pacifica MCP: mark/mid/oracle/funding/volume_24h/...)
  const data = await fetchJson(`${PACIFICA}/info/prices`);
  const arr = Array.isArray(data?.data) ? data.data : [];
  return arr.map((p) => {
    const mark = num(p.mark);
    const oracle = num(p.oracle);
    const y = num(p.yesterday_price);
    const ref = mark ?? oracle;
    // Spot pairs (BTC-USDC) and some indices lack yesterday_price — guard
    // against garbage readings (|change| > 150% is treated as unavailable).
    let change = ref !== null && y ? ((ref - y) / y) * 100 : null;
    if (change !== null && !Number.isFinite(change)) change = null;
    if (change !== null && Math.abs(change) > 150) change = null;
    return {
      symbol: String(p.symbol ?? "").toUpperCase(),
      price: ref,
      change24hPct: change,
      volume24h: num(p.volume_24h),
      openInterest: num(p.open_interest),
      funding: num(p.funding),
      nextFunding: num(p.next_funding),
      mark,
      oracle,
      marketCap: null,
      updatedAt: num(p.timestamp) ?? Date.now(),
    };
  });
}

async function pacificaKlines(symbol, interval, limit) {
  // GET /api/v1/kline?symbol&interval&start_time&end_time (Pacifica MCP)
  const spans = { "15m": 15, "1h": 60, "4h": 240, "1d": 1440 };
  const mins = spans[interval] ?? 60;
  const end = Date.now();
  const start = end - Math.min(limit, 500) * mins * 60_000;
  const url = `${PACIFICA}/kline?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&start_time=${start}&end_time=${end}`;
  const data = await fetchJson(url);
  const arr = Array.isArray(data?.data) ? data.data : [];
  return arr
    .map((k) => ({ t: num(k.t) ?? 0, o: num(k.o) ?? 0, h: num(k.h) ?? 0, l: num(k.l) ?? 0, c: num(k.c) ?? 0, v: num(k.v) ?? 0 }))
    .filter((k) => k.t > 0)
    .slice(-limit);
}

function rsi14(closes) {
  if (closes.length < 15) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - 14; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d;
    else losses -= d;
  }
  if (losses === 0) return 100;
  const rs = gains / 14 / (losses / 14);
  return 100 - 100 / (1 + rs);
}

function technicalsFromCandles(symbol, candles) {
  if (candles.length < 15) {
    return { symbol, rsi14: null, macd: null, bollinger: null, regime: "UNKNOWN", unavailable: true };
  }
  const closes = candles.map((c) => c.c);
  const rsi = rsi14(closes);
  const ema = (n) => {
    const k = 2 / (n + 1);
    let e = closes[0];
    for (let i = 1; i < closes.length; i++) e = closes[i] * k + e * (1 - k);
    return e;
  };
  const macdValue = ema(12) - ema(26);
  const mean = closes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, closes.length);
  const sd = Math.sqrt(
    closes.slice(-20).reduce((a, b) => a + (b - mean) ** 2, 0) / Math.min(20, closes.length),
  );
  const first = closes[0];
  const last = closes[closes.length - 1];
  const drift = first ? Math.abs((last - first) / first) * 100 : 0;
  const vol = mean ? (sd / mean) * 100 : 0;
  const regime = vol > 4 ? "VOLATILE" : drift > 2 ? "TRENDING" : "RANGING";
  return {
    symbol,
    rsi14: rsi === null ? null : Math.round(rsi * 10) / 10,
    macd: { value: macdValue, signal: macdValue, histogram: 0 },
    bollinger: { upper: mean + 2 * sd, middle: mean, lower: mean - 2 * sd },
    regime,
    unavailable: false,
  };
}

// ---- CoinGecko upstream (server-side only; browser has no CORS/keys) ----
function cgHeaders() {
  if (!CG_KEY) return {};
  return CG_PRO ? { "x-cg-pro-api-key": CG_KEY } : { "x-cg-demo-api-key": CG_KEY };
}
async function cgMarkets() {
  const ids = KNOWN.map((s) => SYMBOLS[s].cg).join(",");
  const url = `${CG_BASE}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(ids)}&sparkline=false&price_change_percentage=24h`;
  return fetchJson(url, { headers: cgHeaders() });
}
async function cgCoin(id) {
  const url = `${CG_BASE}/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=true&sparkline=false`;
  return fetchJson(url, { headers: cgHeaders() });
}

// ---- Elfa upstream (server-side only) ----
function elfaHeaders() {
  return { "x-elfa-api-key": ELFA_KEY };
}
async function elfaTopMentions(ticker, timeWindow = "24h", pageSize = 10) {
  const url = `${ELFA_BASE}/data/top-mentions?ticker=${encodeURIComponent(ticker)}&timeWindow=${timeWindow}&pageSize=${pageSize}`;
  return fetchJson(url, { headers: elfaHeaders() });
}
async function elfaTrending(timeWindow = "24h") {
  const url = `${ELFA_BASE}/aggregations/trending-tokens?timeWindow=${timeWindow}&pageSize=20&minMentions=5`;
  return fetchJson(url, { headers: elfaHeaders() });
}
async function elfaNarratives() {
  const url = `${ELFA_BASE}/data/trending-narratives?timeFrame=day&maxNarratives=7&maxTweetsPerNarrative=3`;
  return fetchJson(url, { headers: elfaHeaders() });
}
async function elfaTokenNews(coinId) {
  const url = `${ELFA_BASE}/data/token-news?coinIds=${encodeURIComponent(coinId)}&timeWindow=7d&pageSize=10`;
  return fetchJson(url, { headers: elfaHeaders() });
}

// ---- routes ----
app.get("/api/health", (_req, res) => res.json({ ok: true, mode: "read-only" }));

app.get("/api/status", async (_req, res) => {
  const services = [];
  const probe = async (name, fn) => {
    try {
      await fn();
      services.push({ name, state: "operational", detail: "OK" });
    } catch (e) {
      services.push({ name, state: e?.status === 429 ? "degraded" : "down", detail: String(e?.message ?? e).slice(0, 120) });
    }
  };
  await probe("Pacifica API", () => cached("probe:pac", 20_000, pacificaPrices));
  await probe("CoinGecko API", () =>
    cached("probe:cg", 60_000, () => fetchJson(`${CG_BASE}/ping`, { headers: cgHeaders() })),
  );
  if (ELFA_KEY) await probe("Elfa API", () => cached("probe:elfa", 60_000, () => elfaTrending("1h")));
  else services.push({ name: "Elfa API", state: "degraded", detail: "ELFA_API_KEY not configured" });
  const cfg = readJsonFile("config.json");
  services.push({
    name: "Agent",
    state: cfg ? "operational" : "degraded",
    detail: cfg ? `mode ${cfg.mode ?? "unknown"}` : "No local config.json found",
  });
  services.push({ name: "Market Stream", state: "operational", detail: "REST polling" });
  res.json({ services, updatedAt: Date.now() });
});

app.get("/api/markets", async (_req, res) => {
  try {
    const prices = await cached("pac:prices", 15_000, pacificaPrices);
    res.json(prices.filter((m) => m.symbol));
  } catch (e) {
    errJson(res, 503, "Pacifica market data unavailable.", { unavailable: true });
  }
});

app.get("/api/markets/:symbol", async (req, res) => {
  const symbol = String(req.params.symbol).toUpperCase();
  try {
    const prices = await cached("pac:prices", 15_000, pacificaPrices);
    const m = prices.find((x) => x.symbol === symbol);
    if (!m) return errJson(res, 404, `Market ${symbol} not found on Pacifica.`);
    res.json(m);
  } catch {
    errJson(res, 503, "Pacifica market data unavailable.", { unavailable: true });
  }
});

app.get("/api/klines", async (req, res) => {
  const symbol = String(req.query.symbol ?? "BTC").toUpperCase();
  const interval = String(req.query.interval ?? "1h");
  const limit = Math.min(Number.parseInt(String(req.query.limit ?? "120"), 10) || 120, 500);
  try {
    res.json(await cached(`kline:${symbol}:${interval}:${limit}`, 30_000, () => pacificaKlines(symbol, interval, limit)));
  } catch {
    errJson(res, 503, "Historical market data unavailable.", { unavailable: true });
  }
});

app.get("/api/technicals/:symbol", async (req, res) => {
  const symbol = String(req.params.symbol).toUpperCase();
  try {
    const candles = await cached(`kline:${symbol}:1h:120`, 60_000, () => pacificaKlines(symbol, "1h", 120));
    res.json(technicalsFromCandles(symbol, candles));
  } catch {
    res.json({ symbol, rsi14: null, macd: null, bollinger: null, regime: "UNKNOWN", unavailable: true });
  }
});

app.get("/api/positions", async (req, res) => {
  const account = String(req.query.account ?? "").trim();
  if (!account) return errJson(res, 400, "Missing ?account wallet address.");
  try {
    // GET /api/v1/positions?account=... (no signing for GET)
    const data = await fetchJson(`${PACIFICA}/positions?account=${encodeURIComponent(account)}`);
    const arr = Array.isArray(data?.data) ? data.data : [];
    const marks = await cached("pac:prices", 15_000, pacificaPrices).catch(() => []);
    const markBy = new Map(marks.map((m) => [m.symbol, m.price]));
    res.json(
      arr.map((p) => {
        const symbol = String(p.symbol ?? "").toUpperCase();
        const side = p.side === "ask" ? "SHORT" : "LONG";
        const entry = num(p.entry_price);
        const mark = markBy.get(symbol) ?? null;
        const size = num(p.amount) ?? 0;
        const upnl = entry !== null && mark !== null ? (side === "LONG" ? mark - entry : entry - mark) * size : null;
        return {
          symbol,
          side,
          size,
          entryPrice: entry ?? 0,
          markPrice: mark,
          leverage: null,
          unrealizedPnl: upnl,
          pnlPct: upnl !== null && entry ? (upnl / (entry * size)) * 100 : null,
          fundingPaid: num(p.funding),
          status: "open",
        };
      }),
    );
  } catch {
    errJson(res, 503, "Position data unavailable.", { unavailable: true });
  }
});

app.get("/api/positions/recent", async (req, res) => {
  const account = String(req.query.account ?? "").trim();
  if (!account) return errJson(res, 400, "Missing ?account wallet address.");
  try {
    const data = await fetchJson(`${PACIFICA}/trades/history?account=${encodeURIComponent(account)}&limit=20`);
    const arr = Array.isArray(data?.data) ? data.data : [];
    res.json(
      arr.slice(0, 20).map((t) => ({
        symbol: String(t.symbol ?? "?").toUpperCase(),
        side: t.side === "ask" ? "SHORT" : "LONG",
        entryPrice: num(t.entry_price) ?? 0,
        exitPrice: num(t.exit_price) ?? 0,
        size: num(t.size ?? t.amount) ?? 0,
        realizedPnl: num(t.realized_pnl ?? t.pnl) ?? 0,
        durationSecs: t.entry_time && t.exit_time ? Math.max(0, t.exit_time - t.entry_time) : null,
        openedAt: t.entry_time ? t.entry_time * 1000 : null,
        closedAt: t.exit_time ? t.exit_time * 1000 : null,
      })),
    );
  } catch {
    errJson(res, 503, "Trade history unavailable.", { unavailable: true });
  }
});

app.get("/api/portfolio", async (req, res) => {
  const account = String(req.query.account ?? "").trim();
  if (!account) return errJson(res, 400, "Missing ?account wallet address.");
  try {
    const [posRes, balRes, histRes, acctRes] = await Promise.allSettled([
      fetch(`http://localhost:${PORT}/api/positions?account=${encodeURIComponent(account)}`).then((r) => {
        if (!r.ok) throw new Error("positions");
        return r.json();
      }),
      fetchJson(`${PACIFICA}/account/balance/history?account=${encodeURIComponent(account)}`).catch(() => null),
      fetch(`http://localhost:${PORT}/api/positions/recent?account=${encodeURIComponent(account)}`).then((r) => {
        if (!r.ok) throw new Error("history");
        return r.json();
      }),
      // GET /api/v1/account — equity, available, margin, spot balances
      fetchJson(`${PACIFICA}/account?account=${encodeURIComponent(account)}`).catch(() => null),
    ]);
    const positions = posRes.status === "fulfilled" ? posRes.value : [];
    const closed = histRes.status === "fulfilled" ? histRes.value : [];
    const unrealized = positions.reduce((a, p) => a + (p.unrealizedPnl ?? 0), 0);
    const wins = closed.filter((t) => t.realizedPnl > 0);
    const losses = closed.filter((t) => t.realizedPnl <= 0);
    const realized = closed.reduce((a, t) => a + t.realizedPnl, 0);
    const balances = balRes.status === "fulfilled" && balRes.value ? balRes.value.data ?? [] : [];
    const lastBal = balances.length ? num(balances[balances.length - 1]?.balance) : null;
    const acct = acctRes.status === "fulfilled" && acctRes.value ? acctRes.value.data ?? {} : {};
    res.json({
      equity: num(acct.account_equity) ?? lastBal,
      balance: num(acct.balance),
      available: num(acct.available_to_spend),
      availableToWithdraw: num(acct.available_to_withdraw),
      marginUsed: num(acct.total_margin_used),
      spotBalances: Array.isArray(acct.spot_balances)
        ? acct.spot_balances.map((s) => ({ symbol: s.symbol, amount: num(s.amount) }))
        : [],
      positionsCount: num(acct.positions_count) ?? positions.length,
      ordersCount: num(acct.orders_count),
      todayPnl: null,
      unrealizedPnl: positions.length ? unrealized : null,
      realizedPnl: closed.length ? realized : null,
      winRate: closed.length ? wins.length / closed.length : null,
      totalTrades: closed.length,
      winningTrades: wins.length,
      losingTrades: losses.length,
      avgWin: wins.length ? wins.reduce((a, t) => a + t.realizedPnl, 0) / wins.length : null,
      avgLoss: losses.length ? losses.reduce((a, t) => a + t.realizedPnl, 0) / losses.length : null,
      profitFactor:
        losses.length && losses.reduce((a, t) => a + Math.abs(t.realizedPnl), 0) > 0
          ? wins.reduce((a, t) => a + t.realizedPnl, 0) / losses.reduce((a, t) => a + Math.abs(t.realizedPnl), 0)
          : null,
      avgDurationSecs: closed.length
        ? closed.reduce((a, t) => a + (t.durationSecs ?? 0), 0) / closed.length
        : null,
      largestWin: wins.length ? Math.max(...wins.map((t) => t.realizedPnl)) : null,
      largestLoss: losses.length ? Math.min(...losses.map((t) => t.realizedPnl)) : null,
      maxDrawdown: null,
      unavailable: false,
    });
  } catch {
    errJson(res, 503, "Portfolio data unavailable.", { unavailable: true });
  }
});

app.get("/api/pnl", async (req, res) => {
  const account = String(req.query.account ?? "").trim();
  const range = String(req.query.range ?? "7D").toUpperCase();
  if (!account) return errJson(res, 400, "Missing ?account wallet address.");
  try {
    const data = await fetchJson(`${PACIFICA}/account/balance/history?account=${encodeURIComponent(account)}`);
    const rows = Array.isArray(data?.data) ? data.data : [];
    const spans = { "24H": 1, "7D": 7, "30D": 30, ALL: 3650 };
    const days = spans[range] ?? 7;
    const cutoff = Date.now() - days * 86_400_000;
    const pts = rows
      .map((r) => ({ t: num(r.timestamp ?? r.created_at) ?? 0, b: num(r.balance) ?? 0 }))
      .filter((p) => p.t >= cutoff)
      .sort((a, b) => a.t - b.t);
    if (!pts.length) return res.json([]);
    const base = pts[0].b;
    let cum = 0;
    res.json(
      pts.map((p) => {
        cum = p.b - base;
        return { t: p.t, cumulativePnl: cum, realizedPnl: cum };
      }),
    );
  } catch {
    errJson(res, 503, "Performance history unavailable.", { unavailable: true });
  }
});

// ---- Elfa-backed social ----
app.get("/api/social/:symbol", async (req, res) => {
  const symbol = String(req.params.symbol).toUpperCase();
  const map = SYMBOLS[symbol];
  if (!map) return errJson(res, 404, `No social mapping for ${symbol}.`);
  if (!ELFA_KEY)
    return res.json({
      symbol, mentions: null, mentionsChangePct: null, mindsharePct: null,
      sentiment: "unknown", trending: false, topLinks: [], unavailable: true,
      message: "ELFA_API_KEY not configured on the gateway.",
    });
  try {
    const [mentions, trend] = await Promise.all([
      cached(`elfa:top:${symbol}`, 120_000, () => elfaTopMentions(map.elfa, "24h", 10)),
      cached("elfa:trend:24h", 300_000, () => elfaTrending("24h")).catch(() => null),
    ]);
    const items = Array.isArray(mentions?.data) ? mentions.data : [];
    const total = mentions?.metadata?.total ?? items.length;
    const t = trend?.data?.data?.find?.((x) => String(x.token).toUpperCase() === symbol || String(x.token).toUpperCase() === `$${symbol}`);
    const smart = items.reduce((a, m) => a + (m?.repostBreakdown?.smart ?? 0), 0);
    res.json({
      symbol,
      mentions: total,
      mentionsChangePct: t ? num(t.change_percent) : null,
      mindsharePct: null,
      sentiment: smart > 5 ? "bullish" : total > 50 ? "neutral" : "unknown",
      trending: Boolean(t && (t.change_percent ?? 0) > 20),
      topLinks: items.slice(0, 5).map((m, i) => ({
        url: m.link,
        label: `Top mention ${i + 1} — ${m.likeCount ?? 0} likes`,
        likes: m.likeCount ?? 0,
        reposts: m.repostCount ?? 0,
      })),
      unavailable: false,
    });
  } catch (e) {
    errJson(res, e?.status === 429 ? 503 : 503, "Social intelligence unavailable.", { unavailable: true });
  }
});

app.get("/api/social/trending", async (_req, res) => {
  if (!ELFA_KEY) return res.json([]);
  try {
    const trend = await cached("elfa:trend:24h", 300_000, () => elfaTrending("24h"));
    const arr = trend?.data?.data ?? [];
    res.json(
      arr.slice(0, 12).map((x) => ({
        token: String(x.token).replace(/^\$/, "").toUpperCase(),
        currentCount: num(x.current_count) ?? 0,
        previousCount: num(x.previous_count) ?? 0,
        changePct: num(x.change_percent) ?? 0,
      })),
    );
  } catch {
    errJson(res, 503, "Trending data unavailable.", { unavailable: true });
  }
});

app.get("/api/social/narratives", async (_req, res) => {
  if (!ELFA_KEY) return res.json([]);
  try {
    const n = await cached("elfa:narr", 600_000, elfaNarratives);
    res.json((n?.data?.trending_narratives ?? []).map((x) => ({ narrative: x.narrative, sourceLinks: x.source_links ?? [] })));
  } catch {
    errJson(res, 503, "Narratives unavailable.", { unavailable: true });
  }
});

app.get("/api/intelligence-news", async (req, res) => {
  const symbol = String(req.query.symbol ?? "").toUpperCase();
  const out = [];
  // CoinGecko news first (real snippets), then Elfa social links.
  try {
    const cgId = symbol && SYMBOLS[symbol] ? SYMBOLS[symbol].cg : undefined;
    const url = cgId
      ? `${CG_BASE}/news?coin_id=${encodeURIComponent(cgId)}&per_page=8`
      : `${CG_BASE}/news?per_page=8`;
    const cg = await cached(`cg:news:${cgId ?? "all"}`, 300_000, () => fetchJson(url, { headers: cgHeaders() })).catch(() => null);
    const items = Array.isArray(cg) ? cg : cg?.data ?? [];
    for (const n of items.slice(0, 6)) {
      out.push({
        id: n.url, asset: symbol || (n.related_coin_ids?.[0] ?? "MARKET"), source: n.source_name ?? "CoinGecko",
        kind: "news", timestamp: n.posted_at ? Date.parse(n.posted_at) : null, title: n.title, url: n.url, sentiment: "unknown",
      });
    }
  } catch { /* CoinGecko /news is plan-gated; fall through to Elfa */ }
  if (ELFA_KEY && symbol && SYMBOLS[symbol]) {
    try {
      const tn = await cached(`elfa:news:${symbol}`, 300_000, () => elfaTokenNews(SYMBOLS[symbol].cg));
      const items = Array.isArray(tn?.data) ? tn.data : [];
      for (const m of items.slice(0, 5)) {
        out.push({
          id: m.tweetId, asset: symbol, source: "X (via Elfa)", kind: "social",
          timestamp: m.mentionedAt ? Date.parse(m.mentionedAt) : null,
          title: `Social mention — ${m.likeCount ?? 0} likes, ${m.repostCount ?? 0} reposts`,
          url: m.link, sentiment: "unknown",
        });
      }
    } catch { /* partial failure is fine */ }
  }
  res.json(out);
});

// ---- CoinGecko context ----
app.get("/api/context/markets", async (_req, res) => {
  try {
    const rows = await cached("cg:markets", 60_000, cgMarkets);
    res.json(
      rows.map((c) => ({
        symbol: String(c.symbol ?? "").toUpperCase(), price: num(c.current_price),
        change24hPct: num(c.price_change_percentage_24h), volume24h: num(c.total_volume),
        openInterest: null, funding: null, nextFunding: null, mark: null, oracle: null,
        marketCap: num(c.market_cap), updatedAt: Date.now(),
      })),
    );
  } catch {
    errJson(res, 503, "Market context unavailable.", { unavailable: true });
  }
});

app.get("/api/context/coin/:symbol", async (req, res) => {
  const symbol = String(req.params.symbol).toUpperCase();
  const map = SYMBOLS[symbol];
  if (!map) return errJson(res, 404, `No CoinGecko mapping for ${symbol}.`);
  try {
    const c = await cached(`cg:coin:${map.cg}`, 300_000, () => cgCoin(map.cg));
    const md = c.market_data ?? {};
    res.json({
      id: c.id, symbol, name: c.name ?? symbol,
      marketCap: num(md.market_cap?.usd), fdv: num(md.fully_diluted_valuation?.usd),
      circulatingSupply: num(md.circulating_supply), totalSupply: num(md.total_supply),
      marketCapRank: num(c.market_cap_rank), ath: num(md.ath?.usd), atl: num(md.atl?.usd),
      unavailable: false,
    });
  } catch {
    res.json({ id: map.cg, symbol, name: symbol, marketCap: null, fdv: null, circulatingSupply: null, totalSupply: null, marketCapRank: null, ath: null, atl: null, unavailable: true });
  }
});

app.get("/api/context/news", async (req, res) => {
  const coinId = String(req.query.coin_id ?? "");
  try {
    const url = coinId ? `${CG_BASE}/news?coin_id=${encodeURIComponent(coinId)}&per_page=10` : `${CG_BASE}/news?per_page=10`;
    const data = await cached(`cg:news:${coinId || "all"}`, 300_000, () => fetchJson(url, { headers: cgHeaders() }));
    const items = Array.isArray(data) ? data : data?.data ?? [];
    res.json(items.map((n) => ({
      id: n.url, asset: coinId || "MARKET", source: n.source_name ?? "CoinGecko", kind: "news",
      timestamp: n.posted_at ? Date.parse(n.posted_at) : null, title: n.title, url: n.url, sentiment: "unknown",
    })));
  } catch {
    errJson(res, 503, "Crypto news unavailable (requires CoinGecko Analyst plan).", { unavailable: true });
  }
});

// ---- Pacifica Score + signal (computed here from REAL inputs, never fetched) ----
async function scoreInputs(symbol) {
  const [prices, tech, social] = await Promise.all([
    cached("pac:prices", 15_000, pacificaPrices).catch(() => []),
    fetch(`http://localhost:${PORT}/api/technicals/${encodeURIComponent(symbol)}`).then((r) => r.json()).catch(() => null),
    fetch(`http://localhost:${PORT}/api/social/${encodeURIComponent(symbol)}`).then((r) => r.json()).catch(() => null),
  ]);
  return { market: prices.find((m) => m.symbol === symbol) ?? null, tech, social };
}

function buildScore(symbol, { market, tech, social }) {
  const factors = [];
  // Technical: RSI mean-reversion + regime
  if (tech && !tech.unavailable && tech.rsi14 !== null) {
    const rsi = tech.rsi14;
    const pts = rsi < 30 ? 18 : rsi < 40 ? 8 : rsi > 70 ? -12 : rsi > 60 ? -4 : 4;
    factors.push({ key: "technical", label: "Technical", points: pts, detail: `RSI ${rsi}, regime ${tech.regime}` });
  } else {
    factors.push({ key: "technical", label: "Technical", points: 0, detail: "Indicators unavailable", unavailable: true });
  }
  // Momentum: 24h change
  const chg = market?.change24hPct;
  factors.push({
    key: "momentum", label: "Momentum",
    points: chg === null || chg === undefined ? 0 : chg > 3 ? 10 : chg > 1 ? 5 : chg < -3 ? -8 : chg < -1 ? -3 : 0,
    detail: chg === null || chg === undefined ? "24h change unavailable" : `24h ${chg.toFixed(2)}%`,
    ...(chg === null || chg === undefined ? { unavailable: true } : {}),
  });
  // Social
  if (social && !social.unavailable) {
    const pts = social.trending ? 12 : (social.mentions ?? 0) > 30 ? 6 : 0;
    factors.push({ key: "social", label: "Social", points: pts, detail: `${social.mentions ?? 0} mentions/24h${social.trending ? ", trending" : ""}` });
  } else {
    factors.push({ key: "social", label: "Social", points: 0, detail: "Elfa unavailable", unavailable: true });
  }
  // News: no standalone newswire score; folded into social to avoid double-count
  factors.push({ key: "news", label: "News", points: 0, detail: "Covered by social/narratives; no separate newswire score" });
  // Funding: crowded longs penalized
  const f = market?.funding;
  factors.push({
    key: "funding", label: "Funding",
    points: f === null || f === undefined ? 0 : Math.abs(f) > 0.001 ? -6 : Math.abs(f) > 0.0003 ? -2 : 4,
    detail: f === null || f === undefined ? "Funding unavailable" : `Funding ${(f * 100).toFixed(4)}%`,
    ...(f === null || f === undefined ? { unavailable: true } : {}),
  });
  // Risk: volatility regime penalty
  const risk = tech && !tech.unavailable && tech.regime === "VOLATILE" ? -10 : tech?.regime === "UNKNOWN" ? -4 : 0;
  factors.push({ key: "risk", label: "Risk", points: risk, detail: `Regime ${tech?.regime ?? "UNKNOWN"}` });
  const score = Math.max(0, Math.min(100, 50 + factors.reduce((a, x) => a + x.points, 0)));
  return {
    symbol, score,
    factors,
    explanation: `Pacifica Score blends live Pacifica market data (momentum, funding), computed technicals (RSI/regime) and Elfa social breadth for ${symbol}. Unavailable inputs contribute 0 and are labeled. Base 50, clamped 0–100.`,
    computedAt: Date.now(),
  };
}

app.get("/api/score/:symbol", async (req, res) => {
  const symbol = String(req.params.symbol).toUpperCase();
  try {
    res.json(buildScore(symbol, await scoreInputs(symbol)));
  } catch {
    errJson(res, 503, "Score unavailable.", { unavailable: true });
  }
});

app.get("/api/signal/:symbol", async (req, res) => {
  const symbol = String(req.params.symbol).toUpperCase();
  try {
    const s = buildScore(symbol, await scoreInputs(symbol));
    const direction = s.score >= 65 ? "LONG" : s.score <= 35 ? "SHORT" : s.score >= 55 ? "WAIT" : "NEUTRAL";
    res.json({
      symbol, direction, confidence: s.score, factors: s.factors,
      note: "Read-only model output. Execution requires TUI confirmation.",
      updatedAt: Date.now(),
    });
  } catch {
    errJson(res, 503, "Signal unavailable.", { unavailable: true });
  }
});

// ---- orders / trades / funding (mirror test-app portfolio tabs) ----
app.get("/api/orders/open", async (req, res) => {
  const account = String(req.query.account ?? "").trim();
  if (!account) return errJson(res, 400, "Missing ?account wallet address.");
  try {
    // GET /api/v1/orders?account=... (open orders)
    const data = await fetchJson(`${PACIFICA}/orders?account=${encodeURIComponent(account)}`);
    const arr = Array.isArray(data?.data) ? data.data : [];
    res.json(
      arr.map((o) => ({
        orderId: o.order_id,
        clientOrderId: o.client_order_id ?? null,
        symbol: String(o.symbol ?? "").toUpperCase(),
        side: o.side === "ask" ? "SHORT" : "LONG",
        price: num(o.price),
        amount: num(o.initial_amount),
        filledAmount: num(o.filled_amount) ?? 0,
        orderType: o.order_type ?? null,
        reduceOnly: Boolean(o.reduce_only),
        createdAt: num(o.created_at),
        updatedAt: num(o.updated_at),
      })),
    );
  } catch {
    errJson(res, 503, "Open orders unavailable.", { unavailable: true });
  }
});

app.get("/api/orders/history", async (req, res) => {
  const account = String(req.query.account ?? "").trim();
  const limit = Math.min(Number.parseInt(String(req.query.limit ?? "50"), 10) || 50, 200);
  if (!account) return errJson(res, 400, "Missing ?account wallet address.");
  try {
    // GET /api/v1/orders/history?account=...&limit=... (cursor-paged)
    const items = [];
    let cursor = null;
    while (items.length < limit) {
      const url =
        `${PACIFICA}/orders/history?account=${encodeURIComponent(account)}` +
        `&limit=${Math.min(limit - items.length, 100)}` +
        (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");
      const data = await fetchJson(url);
      const batch = Array.isArray(data?.data) ? data.data : [];
      items.push(...batch);
      if (!data?.has_more || !data?.next_cursor) break;
      cursor = data.next_cursor;
    }
    res.json(
      items.slice(0, limit).map((o) => ({
        orderId: o.order_id,
        clientOrderId: o.client_order_id ?? null,
        symbol: String(o.symbol ?? "").toUpperCase(),
        side: o.side === "ask" ? "SHORT" : "LONG",
        price: num(o.initial_price ?? o.price),
        averageFilledPrice: num(o.average_filled_price),
        amount: num(o.amount),
        filledAmount: num(o.filled_amount) ?? 0,
        status: o.order_status ?? null,
        orderType: o.order_type ?? null,
        createdAt: num(o.created_at),
        updatedAt: num(o.updated_at),
      })),
    );
  } catch {
    errJson(res, 503, "Order history unavailable.", { unavailable: true });
  }
});

app.get("/api/trades", async (req, res) => {
  const account = String(req.query.account ?? "").trim();
  const limit = Math.min(Number.parseInt(String(req.query.limit ?? "50"), 10) || 50, 200);
  const symbol = String(req.query.symbol ?? "").toUpperCase() || null;
  if (!account) return errJson(res, 400, "Missing ?account wallet address.");
  try {
    // GET /api/v1/trades/history — side: open_long/open_short/close_long/close_short
    const items = [];
    let cursor = null;
    while (items.length < limit) {
      const url =
        `${PACIFICA}/trades/history?account=${encodeURIComponent(account)}` +
        `&limit=${Math.min(limit - items.length, 100)}` +
        (symbol ? `&symbol=${encodeURIComponent(symbol)}` : "") +
        (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");
      const data = await fetchJson(url);
      const batch = Array.isArray(data?.data) ? data.data : [];
      items.push(...batch);
      if (!data?.has_more || !data?.next_cursor) break;
      cursor = data.next_cursor;
    }
    res.json(
      items.slice(0, limit).map((t) => ({
        symbol: String(t.symbol ?? "").toUpperCase(),
        side: t.side ?? null,
        amount: num(t.amount),
        price: num(t.price),
        entryPrice: num(t.entry_price),
        fee: num(t.fee),
        pnl: num(t.pnl),
        eventType: t.event_type ?? null,
        createdAt: num(t.created_at),
      })),
    );
  } catch {
    errJson(res, 503, "Trade history unavailable.", { unavailable: true });
  }
});

app.get("/api/funding", async (req, res) => {
  const account = String(req.query.account ?? "").trim();
  const limit = Math.min(Number.parseInt(String(req.query.limit ?? "50"), 10) || 50, 200);
  if (!account) return errJson(res, 400, "Missing ?account wallet address.");
  try {
    // GET /api/v1/funding/history — payout is the USD payment
    const items = [];
    let cursor = null;
    while (items.length < limit) {
      const url =
        `${PACIFICA}/funding/history?account=${encodeURIComponent(account)}` +
        `&limit=${Math.min(limit - items.length, 100)}` +
        (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");
      const data = await fetchJson(url);
      const batch = Array.isArray(data?.data) ? data.data : [];
      items.push(...batch);
      if (!data?.has_more || !data?.next_cursor) break;
      cursor = data.next_cursor;
    }
    res.json(
      items.slice(0, limit).map((f) => ({
        symbol: String(f.symbol ?? "").toUpperCase(),
        side: f.side === "ask" ? "SHORT" : "LONG",
        amount: num(f.amount),
        payout: num(f.payout),
        rate: num(f.rate),
        createdAt: num(f.created_at),
      })),
    );
  } catch {
    errJson(res, 503, "Funding history unavailable.", { unavailable: true });
  }
});

// ---- intelligence chat (Elfa /v2/chat proxied, key stays server-side) ----
// Read-only Q&A: trade-setup ideas, token explainers, market overviews.
// This is NOT the trading agent and cannot place orders.
const CHAT_ACTIONS = {
  setup: {
    analysisType: "chat",
    prompt: (symbol) =>
      `Suggest a trade setup for ${symbol} on perpetual futures: bias, entry zone, ` +
      `invalidation, take-profit levels and key risks. Educational analysis only.`,
  },
  explain: { analysisType: "tokenIntro", needsSymbol: true },
  markets: { analysisType: "macro" },
  summary: { analysisType: "summary" },
};

app.post("/api/agents/chat", async (req, res) => {
  const { message, action, symbol, sessionId, speed } = req.body ?? {};
  if (!ELFA_KEY) {
    return errJson(res, 503, "Intelligence chat unavailable — ELFA_API_KEY not configured on the gateway.", {
      unavailable: true,
    });
  }
  const act = CHAT_ACTIONS[action] ?? null;
  let analysisType = "chat";
  let text = typeof message === "string" ? message.trim() : "";
  let assetMetadata;
  if (act) {
    analysisType = act.analysisType;
    if (act.needsSymbol) {
      if (!symbol) return errJson(res, 400, "This action needs a token symbol (e.g. {\"action\":\"explain\",\"symbol\":\"SOL\"}).");
      assetMetadata = { symbol: String(symbol).toUpperCase() };
    } else if (act.prompt) {
      text = act.prompt(symbol ? String(symbol).toUpperCase() : "BTC");
    }
  }
  if (!text) return errJson(res, 400, "Provide a message or a valid action.");
  if (text.length > 2000) return errJson(res, 400, "Message too long (max 2000 chars).");
  try {
    const body = {
      message: text,
      analysisType,
      speed: speed === "fast" ? "fast" : "expert",
    };
    if (sessionId) body.sessionId = String(sessionId);
    if (assetMetadata) body.assetMetadata = assetMetadata;
    // POST with a JSON body (fetchJson helper is GET-only).
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 60000);
    let data;
    try {
      const r = await fetch(`${ELFA_BASE}/chat`, {
        method: "POST",
        headers: { ...UA, ...elfaHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!r.ok) throw new Error(`Elfa chat ${r.status}`);
      data = await r.json();
    } finally {
      clearTimeout(t);
    }
    if (!data?.success) throw new Error("Elfa returned success=false");
    res.json({
      reply: data.data.message,
      sessionId: data.data.sessionId ?? null,
      creditsConsumed: data.data.creditsConsumed ?? null,
    });
  } catch {
    errJson(res, 503, "Intelligence chat unavailable (Elfa error).", { unavailable: true });
  }
});

// ---- daily digest (composed from real data, no Elfa key required) ----
app.get("/api/digest", async (_req, res) => {
  try {
    const [global, cgMarkets, cgTrending, pacifica] = await Promise.all([
      cached("cg:global", 300_000, () =>
        fetchJson(`${CG_BASE}/global`, { headers: cgHeaders() }),
      ).catch(() => null),
      cached("cg:markets:100", 120_000, () =>
        fetchJson(
          `${CG_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h`,
          { headers: cgHeaders() },
        ),
      ).catch(() => []),
      cached("cg:trending", 300_000, () =>
        fetchJson(`${CG_BASE}/search/trending`, { headers: cgHeaders() }),
      ).catch(() => null),
      cached("pac:prices", 15_000, pacificaPrices).catch(() => []),
    ]);

    const coins = Array.isArray(cgMarkets) ? cgMarkets : [];
    const withChg = coins.filter((c) => typeof c.price_change_percentage_24h_in_currency === "number");
    const gainers = [...withChg]
      .sort((a, b) => b.price_change_percentage_24h_in_currency - a.price_change_percentage_24h_in_currency)
      .slice(0, 5)
      .map((c) => ({ id: c.id, symbol: String(c.symbol).toUpperCase(), change24hPct: c.price_change_percentage_24h_in_currency, price: num(c.current_price) }));
    const losers = [...withChg]
      .sort((a, b) => a.price_change_percentage_24h_in_currency - b.price_change_percentage_24h_in_currency)
      .slice(0, 5)
      .map((c) => ({ id: c.id, symbol: String(c.symbol).toUpperCase(), change24hPct: c.price_change_percentage_24h_in_currency, price: num(c.current_price) }));

    const perps = (pacifica ?? [])
      .filter((m) => m.change24hPct !== null && !/[-/]/.test(m.symbol))
      .sort((a, b) => Math.abs(b.change24hPct) - Math.abs(a.change24hPct))
      .slice(0, 5)
      .map((m) => ({ symbol: m.symbol, change24hPct: m.change24hPct, funding: m.funding }));

    const g = global?.data ?? {};
    const elfa = { trending: [], narratives: [] };
    if (ELFA_KEY) {
      try {
        const trend = await cached("elfa:trend:24h", 300_000, () => elfaTrending("24h"));
        elfa.trending = (trend?.data?.data ?? []).slice(0, 5).map((x) => ({
          token: String(x.token).replace(/^\$/, "").toUpperCase(),
          changePct: num(x.change_percent),
        }));
      } catch { /* partial */ }
      try {
        const narr = await cached("elfa:narr", 600_000, elfaNarratives);
        elfa.narratives = (narr?.data?.trending_narratives ?? []).slice(0, 5).map((x) => x.narrative);
      } catch { /* partial */ }
    }

    res.json({
      generatedAt: Date.now(),
      market: {
        totalMarketCap: num(g.total_market_cap?.usd),
        marketCapChange24hPct: num(g.market_cap_change_percentage_24h_usd),
        btcDominancePct: num(g.market_cap_percentage?.btc),
        ethDominancePct: num(g.market_cap_percentage?.eth),
      },
      gainers,
      losers,
      perps,
      trending: (cgTrending?.coins ?? []).slice(0, 5).map((c) => c?.item?.symbol?.toUpperCase()).filter(Boolean),
      elfa,
      elfaUnavailable: !ELFA_KEY,
    });
  } catch {
    errJson(res, 503, "Digest unavailable.", { unavailable: true });
  }
});

// ---- agent observability (local files only; never chat/controls) ----
app.get("/api/agent/status", (_req, res) => {
  const cfg = readJsonFile("config.json");
  const decisions = readJsonFile("decisions.json");
  const list = Array.isArray(decisions) ? decisions : decisions?.decisions ?? [];
  const last = list.length ? list[list.length - 1] : null;
  res.json({
    online: Boolean(cfg),
    mode: cfg?.mode?.toUpperCase?.() ?? "TESTNET",
    dryRun: cfg ? Boolean(cfg.dry_run) : null,
    currentAsset: last?.symbol ?? cfg?.symbols?.[0] ?? null,
    currentRegime: last?.regime ?? "UNKNOWN",
    lastHeartbeat: null,
    lastAnalysis: last?.timestamp ? new Date(last.timestamp).getTime() : null,
    message: cfg ? undefined : "No local config.json — agent not initialized on this machine.",
  });
});

app.get("/api/agent/events", (req, res) => {
  const limit = Math.min(Number.parseInt(String(req.query.limit ?? "30"), 10) || 30, 100);
  const decisions = readJsonFile("decisions.json");
  const list = Array.isArray(decisions) ? decisions : decisions?.decisions ?? [];
  const events = list.slice(-limit).reverse().map((d, i) => ({
    t: d.timestamp ? new Date(d.timestamp).getTime() : Date.now() - i * 60_000,
    kind: "decision",
    text: `${d.symbol ?? "?"}: ${d.action ?? d.signal ?? "scan"}${d.confidence ? ` (${Math.round(d.confidence * 100)}%)` : ""}${d.reasoning ? ` — ${String(d.reasoning).slice(0, 140)}` : ""}`,
  }));
  res.json(events);
});

app.use((req, res) => res.status(404).json({ error: `Unknown API route: ${req.path}` }));

app.listen(PORT, "127.0.0.1", () => {
  console.log(`[gateway] listening on http://127.0.0.1:${PORT} (read-only, local only)`);
  console.log(`[gateway] pacifica=${PACIFICA} elfa=${ELFA_KEY ? "key set" : "MISSING"} coingecko=${CG_PRO ? "pro" : "demo"}${CG_KEY ? "" : " (no key)"}`);
});
