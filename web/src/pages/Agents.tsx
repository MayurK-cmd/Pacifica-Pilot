import { useRef, useState } from "react";
import { Bot, CalendarDays, RotateCcw, Send } from "lucide-react";
import { askIntel, fetchDigest } from "../api/intel";
import { GatewayError } from "../api/client";
import type { ChatMessage, DailyDigest, IntelAction } from "../types/trading";
import { renderMarkdown } from "../lib/markdown";
import { fmtCompact, fmtPct, fmtTime, pnlClass } from "../lib/utils";
import { Badge, Card } from "../components/ui/Card";
import { Empty, Loading } from "../components/ui/State";

const ACTIONS: { key: IntelAction; label: string; needsSymbol: boolean; hint: string }[] = [
  { key: "setup", label: "Suggest Trade Setup", needsSymbol: true, hint: "Bias, entry zone, invalidation, targets" },
  { key: "explain", label: "Explain Token", needsSymbol: true, hint: "What a token is and does" },
  { key: "markets", label: "Understand Markets", needsSymbol: false, hint: "Macro overview" },
  { key: "summary", label: "Quick Summary", needsSymbol: false, hint: "Market snapshot" },
];

const EXAMPLES = [
  "Is SOL's rally backed by rising open interest or just spot chasing?",
  "What would invalidate the current bullish structure on ETH?",
  "Which perps show funding getting crowded right now?",
  "What narratives gained the most mindshare in the last 24 hours?",
];

function DigestCard({ digest }: { digest: DailyDigest }) {
  const up = (digest.market.marketCapChange24hPct ?? 0) >= 0;
  const mover = (m: { symbol: string; change24hPct: number | null }) => (
    <li key={m.symbol} className="flex justify-between py-0.5">
      <span className="font-mono font-bold">{m.symbol}</span>
      <span className={`num ${pnlClass(m.change24hPct)}`}>{fmtPct(m.change24hPct)}</span>
    </li>
  );
  return (
    <Card title={`Daily digest — ${fmtTime(digest.generatedAt)}`}>
      <div className="flex items-center gap-2 text-sm">
        <Badge tone={up ? "up" : "down"}>{up ? "▲ MARKET UP" : "▼ MARKET DOWN"}</Badge>
        <span className="num text-xs text-muted">
          Cap {digest.market.totalMarketCap ? `$${fmtCompact(digest.market.totalMarketCap)}` : "—"}
          {" · "}
          {fmtPct(digest.market.marketCapChange24hPct)} 24h · BTC dom{" "}
          {digest.market.btcDominancePct === null ? "—" : `${digest.market.btcDominancePct.toFixed(1)}%`}
        </span>
      </div>
      <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
        <div>
          <p className="eyebrow mb-1">Top gainers 24h</p>
          <ul>{digest.gainers.map(mover)}</ul>
        </div>
        <div>
          <p className="eyebrow mb-1">Top losers 24h</p>
          <ul>{digest.losers.map(mover)}</ul>
        </div>
        <div>
          <p className="eyebrow mb-1">Biggest perp movers</p>
          <ul>{digest.perps.map(mover)}</ul>
        </div>
      </div>
      {(digest.trending.length > 0 || digest.elfa.narratives.length > 0) && (
        <div className="mt-3 border-t border-line pt-2 text-xs">
          {digest.trending.length > 0 && (
            <p className="text-muted">Trending searches: <span className="font-mono">{digest.trending.join(" · ")}</span></p>
          )}
          {digest.elfa.narratives.length > 0 && (
            <ul className="mt-1 list-disc pl-4">
              {digest.elfa.narratives.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
          {digest.elfaUnavailable && <p className="mt-1 text-muted">Social narratives unavailable (Elfa key not configured).</p>}
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted">Movers from CoinGecko + Pacifica perps data. Educational snapshot, not advice.</p>
    </Card>
  );
}

export function Agents() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [symbol, setSymbol] = useState("BTC");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatUnavailable, setChatUnavailable] = useState(false);
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [digestBusy, setDigestBusy] = useState(false);
  const [digestError, setDigestError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  function scrollDown() {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: "end" }));
  }

  async function send(message: string, action?: IntelAction, sym?: string) {
    const text = message.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    setMessages((m) => [...m, { role: "user", text }]);
    scrollDown();
    try {
      const r = await askIntel({ message: text, action, symbol: sym, sessionId });
      if (r.sessionId) setSessionId(r.sessionId);
      if (r.model) setModel(r.model);
      setMessages((m) => [...m, { role: "assistant", text: r.reply, creditsConsumed: r.creditsConsumed }]);
    } catch (e) {
      if (e instanceof GatewayError && e.unavailable) setChatUnavailable(true);
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
      scrollDown();
    }
  }

  async function runAction(key: IntelAction) {
    const needs = ACTIONS.find((a) => a.key === key)?.needsSymbol;
    const sym = symbol.trim().toUpperCase() || "BTC";
    // Actions map to Elfa analysis types server-side; the label is the message.
    await send(ACTIONS.find((a) => a.key === key)!.label, key, needs ? sym : undefined);
  }

  async function loadDigest() {
    setDigestBusy(true);
    setDigestError(null);
    try {
      setDigest(await fetchDigest());
    } catch (e) {
      setDigestError(e instanceof Error ? e.message : "Digest failed.");
    } finally {
      setDigestBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Bot size={18} aria-hidden /> Agents — intelligence chat
        </h2>
        <button
          type="button"
          onClick={loadDigest}
          disabled={digestBusy}
          className="ml-auto inline-flex items-center gap-1.5 rounded border border-line bg-paper px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          <CalendarDays size={13} aria-hidden />
          {digestBusy ? "Building digest…" : "Get daily digest"}
        </button>
      </div>
      <p className="text-xs text-muted">
        Ask about setups, tokens and market structure. An OpenRouter-powered agent answers using
        live Pacifica, CoinGecko and Elfa data — read-only, educational, not financial advice.
        This chat cannot trade; trading stays in the terminal and Telegram.
      </p>

      {digest && <DigestCard digest={digest} />}
      {digestError && <p role="alert" className="text-xs text-down">{digestError}</p>}
      {digestBusy && !digest && <Loading text="Composing digest from live market data..." />}

      <Card title="Ask">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Intelligence actions">
          {ACTIONS.map((a) => (
            <button
              key={a.key}
              type="button"
              disabled={busy || chatUnavailable}
              onClick={() => runAction(a.key)}
              title={a.hint}
              className="rounded border border-line bg-paper px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
            >
              {a.label}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-1 text-xs text-muted">
            Symbol
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-20 rounded border border-line bg-paper px-1.5 py-1 font-mono text-xs"
              maxLength={12}
            />
          </label>
          {(messages.length > 0 || sessionId) && (
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setSessionId(null);
                setError(null);
              }}
              className="inline-flex items-center gap-1 rounded border border-line px-2.5 py-1 text-xs font-semibold"
            >
              <RotateCcw size={12} aria-hidden /> New conversation
            </button>
          )}
        </div>
        {messages.length === 0 && (
          <div className="mt-3">
            <p className="eyebrow mb-1.5">Try asking</p>
            <ul className="space-y-1.5">
              {EXAMPLES.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    disabled={busy || chatUnavailable}
                    onClick={() => send(q)}
                    className="block w-full rounded border border-line bg-wash px-2.5 py-1.5 text-left text-xs hover:border-teal disabled:opacity-50"
                  >
                    “{q}”
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {chatUnavailable ? (
        <Card title="Conversation">
          <Empty text="Intelligence chat is unavailable — the gateway has no OpenRouter API key configured (web/server/.env). The daily digest above still works from CoinGecko + Pacifica data." />
        </Card>
      ) : (
        <Card
          title={sessionId ? "Conversation (continued)" : "Conversation"}
          action={model ? <span className="font-mono text-[10px] text-muted">{model}</span> : undefined}
        >
          {messages.length === 0 && !busy && <Empty text="No messages yet — pick an action or ask anything." />}
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[85%] rounded-md px-3 py-2 text-[13px] leading-relaxed ${
                    m.role === "user" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "card card-pad"
                  }`}
                >
                  <div className="space-y-1.5">{renderMarkdown(m.text, `m${i}`)}</div>
                  {m.role === "assistant" && m.creditsConsumed !== null && m.creditsConsumed !== undefined && (
                    <p className="mt-1.5 text-[10px] text-muted">Elfa credits used: {m.creditsConsumed}</p>
                  )}
                </div>
              </div>
            ))}
            {busy && <Loading text="Thinking…" />}
            <div ref={bottomRef} />
          </div>
          {error && (
            <p role="alert" className="mt-2 text-xs text-down">
              {error} <button type="button" onClick={() => setError(null)} className="underline">Dismiss</button>
            </p>
          )}
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
              setInput("");
            }}
          >
            <label htmlFor="intel-input" className="sr-only">Ask the intelligence agent</label>
            <input
              id="intel-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a setup, a token, or the market…"
              autoComplete="off"
              className="min-w-0 flex-1 rounded border border-line bg-paper px-2.5 py-2 text-[13px]"
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="rounded bg-slate-900 px-3 text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
            >
              <Send size={15} aria-hidden />
            </button>
          </form>
          <p className="mt-2 text-[11px] text-muted">
            Follow-ups continue the same Elfa session. Answers may reference X posts via links —
            open them to read the originals.
          </p>
        </Card>
      )}
    </div>
  );
}
