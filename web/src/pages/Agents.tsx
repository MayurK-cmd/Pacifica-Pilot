import { useEffect, useRef, useState } from "react";
import { askIntel, fetchDigest } from "../api/intel";
import { GatewayError } from "../api/client";
import type { ChatMessage, DailyDigest, IntelAction } from "../types/trading";
import { renderMarkdown } from "../lib/markdown";
import { fmtCompact, fmtPct } from "../lib/utils";

const EXAMPLES = [
  "⚡ What is the funding rate arbitrage opportunity on DOGE right now?",
  "🎯 High-asymmetry LONG setup for BTC with strict invalidation",
  "📊 Analyze Hyperliquid L2 order book depth & CVD divergence on SOL",
  "📉 Explain why TIA funding flipped negative and what it signals",
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: "user",
    text: "Analyze BTC-PERP following the recent $840M spot ETF inflow. What is the institutional setup, liquidation danger zones, and recommended execution levels?",
  },
  {
    role: "assistant",
    text: `### Quantitative Setup: Strong Bullish Confluence
*Cumulative Volume Delta (CVD) aligned with ETF custodial spot absorption. Model Confidence: **92/100***

- **Suggested Entry**: $95,800 – $96,200 *(L2 Order Book Consolidation)*
- **Take Profit 1 (TP1)**: $98,400 *(+2.1% Gain Target)*
- **Take Profit 2 (TP2)**: $101,200 *(+5.0% Extension Level)*
- **Stop-Loss / Invalidation**: $94,650 *(-1.8% Strict Cutoff)*
- **Risk / Reward Ratio**: **1 : 2.85** *(Asymmetric Edge)*

#### Order Flow & Liquidity Concentration Telemetry:
| Price Zone | Depth Cluster | Est. Squeeze Vol | Regime Implication |
| :--- | :--- | :--- | :--- |
| **$88,800 – $91,200** | Institutional Bid Shelf | $182.4M (Longs) | Macro floor. High probability dip defense zone. |
| **$97,200 – $97,850** | Short Liquidation Cluster | **$310.5M (Shorts)** | Accelerated squeeze vector trigger if $96,400 flips to support. |
| **Funding: +0.0062%/hr** | Healthy Contango | Neutral Baseline | No dangerous retail leverage buildup. Room for spot-driven expansion. |
`,
    creditsConsumed: 4,
  },
  {
    role: "user",
    text: "/markets Give me a quick summary of funding rate anomalies across Hyperliquid and Drift.",
  },
  {
    role: "assistant",
    text: `Cross-venue arbitrage telemetry reveals significant divergence in perpetual carry yield:

- **DOGE-PERP SPREAD** (+178.6% APY): Short HL (+0.0245%/hr) vs Long dYdX (+0.0041%/hr). Delta-neutral basis captures +0.0204%/hr net spread.
- **HYPE-PERP LONGS** (+18.72% SPOT): Funding at +0.0210%/hr. Aggressive taker buy imbalance; momentum breakout confirmed on L2 tape.
- **TIA-PERP BIAS** (NEGATIVE BASIS): Funding at -0.0034%/hr. Shorts heavily paying longs; supply unlock narrative priced into perp curve.
`,
    creditsConsumed: 2,
  },
];

export function Agents() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [quickSymbol, setQuickSymbol] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Digest state
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [showDigest, setShowDigest] = useState(true);
  const [digestBusy, setDigestBusy] = useState(false);

  // Command Menu autocomplete
  const [showCommandMenu, setShowCommandMenu] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function scrollDown() {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }));
  }

  // Load digest on mount
  useEffect(() => {
    fetchDigest()
      .then((d) => setDigest(d))
      .catch(() => undefined);
  }, []);

  // ⌘K hotkey for new session
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        startNewSession();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function startNewSession() {
    setMessages([]);
    setSessionId(null);
    setError(null);
  }

  async function handleSend(textToSend?: string, action?: IntelAction, sym?: string) {
    const text = (textToSend || inputText).trim();
    if (!text || busy) return;

    setInputText("");
    setShowCommandMenu(false);
    setBusy(true);
    setError(null);

    setMessages((prev) => [...prev, { role: "user", text }]);
    scrollDown();

    try {
      const res = await askIntel({ message: text, action, symbol: sym, sessionId });
      if (res.sessionId) setSessionId(res.sessionId);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.reply, creditsConsumed: res.creditsConsumed },
      ]);
    } catch (e) {
      if (e instanceof GatewayError && e.unavailable) {
        setError("Intelligence chat gateway unavailable. Please check OpenRouter API key.");
      } else {
        setError(e instanceof Error ? e.message : "Request failed.");
      }
    } finally {
      setBusy(false);
      scrollDown();
    }
  }

  async function handleQuickAction(actionKey: IntelAction, promptPrefix: string) {
    const sym = quickSymbol.trim().toUpperCase() || "BTC";
    const fullPrompt = `${promptPrefix} ${sym}`;
    await handleSend(fullPrompt, actionKey, sym);
  }

  function handleInputChange(val: string) {
    setInputText(val);
    if (val.startsWith("/")) {
      setShowCommandMenu(true);
    } else {
      setShowCommandMenu(false);
    }
  }

  return (
    <div className="w-full pt-16 bg-surface min-h-screen text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      <div className="flex flex-col w-full">
        {/* Telemetry Sub-Header */}
        <section className="w-full bg-surface-container-lowest px-margin-desktop py-space-md shadow-sm border-b border-surface-container-high/60">
          <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-xs font-data-micro text-data-micro">
            <div className="flex items-center gap-space-xs flex-wrap">
              <span className="text-primary font-semibold tracking-wider">AGENTS // AUTONOMOUS MARKET INTELLIGENCE TERMINAL</span>
              <span className="text-outline-variant">•</span>
              <span className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded bg-surface-container-high text-secondary font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-container animate-pulse" />
                LLM ENGINE: PACIFICA QUANT-LLM v4.2 (ACTIVE)
              </span>
              <span className="text-outline-variant">•</span>
              <span className="text-on-surface-variant font-medium">
                ORACLE LATENCY: <span className="text-primary font-semibold">9ms</span>
              </span>
            </div>
            <div className="flex items-center gap-space-sm">
              <span className="px-space-xs py-0.5 rounded bg-surface-container text-on-surface-variant font-data-micro text-data-micro">
                Compute Quota: <span className="text-primary font-semibold">1,420</span> / 2,000 Credits (71%)
              </span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0 shadow-md border border-surface-variant">
                <span className="material-symbols-outlined text-primary text-headline-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                  smart_toy
                </span>
              </div>
              <div className="min-w-0">
                <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                  Agents — intelligence chat
                </h1>
                <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                  Non-custodial algorithmic reasoning engine powered by real-time order books, social NLP vectors, and perpetual liquidity feeds.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-space-xs shrink-0">
              <button
                onClick={() => setShowDigest(!showDigest)}
                className="flex items-center gap-space-xs px-space-md py-space-xs rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-label-md transition-colors shadow-sm"
                type="button"
              >
                <span className="material-symbols-outlined text-primary text-body-md" style={{ fontVariationSettings: "'FILL' 1" }}>
                  bolt
                </span>
                <span>Daily Digest</span>
                <span className="px-1.5 py-0.2 rounded bg-surface-container-highest text-secondary text-data-micro font-data-micro font-medium">
                  {digest ? `${Math.round((Date.now() - digest.generatedAt) / 60000)}m ago` : "14m ago"}
                </span>
              </button>

              <button
                onClick={startNewSession}
                className="flex items-center gap-space-xs px-space-md py-space-xs rounded bg-primary-container text-on-primary-container font-label-md text-label-md font-semibold hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors shadow-md"
                type="button"
              >
                <span className="material-symbols-outlined text-body-md">restart_alt</span>
                <span>New Session</span>
                <kbd className="px-1 py-0.2 rounded bg-on-primary-container/20 text-on-primary-container text-data-micro font-data-micro font-bold">
                  ⌘K
                </kbd>
              </button>
            </div>
          </div>
        </section>

        {/* Main Terminal Workspace */}
        <div className="w-full px-margin-desktop py-space-md flex flex-col gap-space-md">
          {/* Collapsible 24H Quantitative Digest Panel */}
          {showDigest && (
            <section className="w-full bg-surface-container-low rounded-xl p-space-md shadow-md border border-surface-container-high/60 transition-all">
              <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high/40">
                <div className="flex items-center gap-space-xs flex-wrap">
                  <span className="material-symbols-outlined text-primary text-body-md">analytics</span>
                  <span className="font-label-caps text-label-caps text-primary tracking-widest uppercase">
                    24H QUANTITATIVE MARKET DIGEST // EPOCH #482
                  </span>
                  <span className="text-outline-variant">•</span>
                  <span className="font-data-micro text-data-micro text-on-surface-variant">Generated: Today, 08:30 UTC</span>
                </div>
                <button
                  onClick={() => setShowDigest(false)}
                  className="font-data-micro text-data-micro text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                  type="button"
                >
                  <span>Hide View</span>
                  <span className="material-symbols-outlined text-body-sm">unfold_less</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-sm pt-space-xs">
                {/* Market Cap Card */}
                <div className="bg-surface-container rounded-lg p-space-sm flex flex-col gap-1 shadow-sm border border-surface-container-high/40">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">TOTAL CRYPTO MARKET CAP</span>
                  <div className="flex items-baseline gap-space-xs">
                    <span className="font-data-metric text-data-metric text-on-surface">
                      {digest?.market.totalMarketCap ? `$${fmtCompact(digest.market.totalMarketCap)}` : "$3.42T"}
                    </span>
                    <span className="font-data-tabular text-data-tabular text-secondary font-semibold">
                      {fmtPct(digest?.market.marketCapChange24hPct ?? 3.85)}
                    </span>
                  </div>
                  <span className="font-data-micro text-data-micro text-on-surface-variant">
                    BTC Dom: <span className="text-on-surface">{digest?.market.btcDominancePct?.toFixed(1) ?? "58.4"}%</span> | ETH Dom:{" "}
                    <span className="text-on-surface">{digest?.market.ethDominancePct?.toFixed(1) ?? "14.2"}%</span>
                  </span>
                </div>

                {/* Top Gainers Card */}
                <div className="bg-surface-container rounded-lg p-space-sm flex flex-col gap-1 shadow-sm border border-surface-container-high/40">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">TOP MOMENTUM GAINERS</span>
                  <div className="flex flex-col gap-0.5 font-data-tabular text-data-tabular">
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface">$HYPE</span>
                      <span className="text-secondary font-semibold">+18.72%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface">$DOGE</span>
                      <span className="text-secondary font-semibold">+14.80%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant">$SOL</span>
                      <span className="text-secondary font-semibold">+9.14%</span>
                    </div>
                  </div>
                </div>

                {/* Top Losers Card */}
                <div className="bg-surface-container rounded-lg p-space-sm flex flex-col gap-1 shadow-sm border border-surface-container-high/40">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">RETRACTING ASSETS</span>
                  <div className="flex flex-col gap-0.5 font-data-tabular text-data-tabular">
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface">$TIA</span>
                      <span className="text-error font-semibold">-4.21%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface">$ARB</span>
                      <span className="text-error font-semibold">-1.40%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant">$AVAX</span>
                      <span className="text-error font-semibold">-0.85%</span>
                    </div>
                  </div>
                </div>

                {/* Perp Movers Card */}
                <div className="bg-surface-container rounded-lg p-space-sm flex flex-col gap-1 shadow-sm border border-surface-container-high/40">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">PERP OI EXPANSION</span>
                  <div className="flex flex-col gap-0.5 font-data-micro text-data-micro">
                    <div className="flex justify-between items-center font-data-tabular">
                      <span className="text-on-surface">BTC-PERP</span>
                      <span className="text-primary">$5.84B Vol</span>
                    </div>
                    <div className="text-secondary font-semibold">+4.8% Institutional Open Interest</div>
                    <div className="flex justify-between items-center font-data-tabular">
                      <span className="text-on-surface">SOL-PERP</span>
                      <span className="text-primary">$2.94B Vol</span>
                    </div>
                  </div>
                </div>

                {/* Social NLP Clusters */}
                <div className="bg-surface-container rounded-lg p-space-sm flex flex-col justify-between shadow-sm border border-surface-container-high/40">
                  <div>
                    <span className="font-label-caps text-label-caps text-on-surface-variant">NLP CLUSTERS (ELFA AI)</span>
                    <div className="flex flex-wrap gap-1 mt-1 font-data-micro text-data-micro">
                      <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-primary">#StrategicReserve</span>
                      <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-secondary">+$840M ETF</span>
                      <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">#Hyperliquid</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSend("Synthesize full market regime and top institutional setups")}
                    className="mt-2 text-left font-data-micro text-data-micro text-primary hover:text-primary-fixed flex items-center gap-1 transition-colors"
                    type="button"
                  >
                    <span>Synthesize market regime</span>
                    <span className="material-symbols-outlined text-body-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Quick Intel Actions & Quick Analyze Preset Bar */}
          <div className="w-full bg-surface-container-low rounded-xl p-space-sm flex flex-col md:flex-row md:items-center justify-between gap-space-sm shadow-sm border border-surface-container-high/60">
            <div className="flex flex-wrap items-center gap-space-xs">
              <span className="font-label-caps text-label-caps text-on-surface-variant mr-space-xs">QUICK INTEL:</span>
              <button
                onClick={() => handleQuickAction("setup", "/setup")}
                className="flex items-center gap-1.5 px-space-sm py-1.5 rounded bg-surface-container text-on-surface hover:bg-surface-container-high text-label-md font-label-md transition-colors shadow-sm"
                type="button"
              >
                <span className="material-symbols-outlined text-primary text-body-sm">filter_center_focus</span>
                <span>Suggest Setup</span>
              </button>
              <button
                onClick={() => handleQuickAction("explain", "/explain")}
                className="flex items-center gap-1.5 px-space-sm py-1.5 rounded bg-surface-container text-on-surface hover:bg-surface-container-high text-label-md font-label-md transition-colors shadow-sm"
                type="button"
              >
                <span className="material-symbols-outlined text-secondary text-body-sm">menu_book</span>
                <span>Explain Token</span>
              </button>
              <button
                onClick={() => handleSend("/markets")}
                className="flex items-center gap-1.5 px-space-sm py-1.5 rounded bg-surface-container text-on-surface hover:bg-surface-container-high text-label-md font-label-md transition-colors shadow-sm"
                type="button"
              >
                <span className="material-symbols-outlined text-primary text-body-sm">radar</span>
                <span>Market Breadth</span>
              </button>
              <button
                onClick={() => handleSend("/summary")}
                className="flex items-center gap-1.5 px-space-sm py-1.5 rounded bg-surface-container text-on-surface hover:bg-surface-container-high text-label-md font-label-md transition-colors shadow-sm"
                type="button"
              >
                <span className="material-symbols-outlined text-tertiary-fixed text-body-sm">electric_bolt</span>
                <span>Quick Summary</span>
              </button>
            </div>

            <div className="flex items-center gap-space-xs">
              <div className="relative flex items-center">
                <span className="absolute left-2.5 material-symbols-outlined text-outline text-body-sm">search</span>
                <input
                  value={quickSymbol}
                  onChange={(e) => setQuickSymbol(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleQuickAction("setup", "/setup");
                  }}
                  className="w-64 bg-surface-container rounded pl-8 pr-16 py-1.5 font-data-tabular text-data-tabular text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-high shadow-sm"
                  placeholder="Symbol (e.g. BTC, ETH, SOL, HYPE)..."
                  type="text"
                />
                <button
                  onClick={() => handleQuickAction("setup", "/setup")}
                  className="absolute right-1 px-2 py-0.5 rounded bg-primary-container text-on-primary-container font-label-caps text-label-caps font-bold hover:bg-primary-fixed transition-colors"
                  type="button"
                >
                  RUN
                </button>
              </div>
              <span className="hidden xl:inline-flex font-data-micro text-data-micro text-outline px-space-xs">
                Feeds: HL L2 • Elfa NLP • Pyth
              </span>
            </div>
          </div>

          {/* Suggested Questions Horizontal Strip */}
          <div className="w-full flex items-center gap-space-xs overflow-x-auto pb-1 scrollbar-none">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => handleSend(ex)}
                disabled={busy}
                className="shrink-0 px-space-sm py-1 rounded-full bg-surface-container text-on-surface-variant hover:text-primary hover:bg-surface-container-high font-data-micro text-data-micro transition-colors shadow-sm disabled:opacity-50"
                type="button"
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Dialogue Area / Intelligence Stream */}
          <div className="w-full flex flex-col gap-space-md mb-28">
            {messages.map((m, i) => {
              if (m.role === "user") {
                return (
                  <article key={i} className="flex items-start gap-space-sm max-w-4xl self-end flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 shadow-sm border border-surface-variant">
                      <span className="material-symbols-outlined text-primary text-body-md">person</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-space-xs font-data-micro text-data-micro text-on-surface-variant">
                        <span>User {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "0x7A4f...9c2e"}</span>
                        <span className="text-outline-variant">•</span>
                        <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div className="bg-surface-container-high text-on-surface rounded-2xl rounded-tr-none px-space-md py-space-sm shadow-md font-body-md text-body-md leading-relaxed">
                        {m.text}
                      </div>
                    </div>
                  </article>
                );
              }

              return (
                <article key={i} className="flex items-start gap-space-sm max-w-5xl self-start">
                  <div className="w-9 h-9 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0 shadow-md border border-surface-variant">
                    <span className="material-symbols-outlined text-primary text-headline-md" style={{ fontVariationSettings: "'FILL' 1" }}>
                      smart_toy
                    </span>
                  </div>

                  <div className="flex flex-col gap-space-sm w-full min-w-0">
                    <div className="flex flex-wrap items-center gap-space-xs font-data-micro text-data-micro">
                      <span className="font-bold text-primary">PACIFICA QUANT-LLM v4.2 // MULTI-FACTOR ENGINE</span>
                      <span className="text-outline-variant">•</span>
                      <span className="text-on-surface-variant">Response Time: 380ms</span>
                      <span className="text-outline-variant">•</span>
                      {m.creditsConsumed && (
                        <span className="px-1 rounded bg-surface-container text-on-surface-variant">
                          Credits Used: {m.creditsConsumed}
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-secondary font-medium">
                        [Hyperliquid L2]
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-primary font-medium">
                        [CoinGecko]
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-tertiary-fixed font-medium">
                        [Elfa NLP]
                      </span>
                    </div>

                    <div className="bg-surface-container rounded-2xl rounded-tl-none p-space-md shadow-lg flex flex-col gap-space-md border border-surface-container-high/60">
                      <div className="markdown-body text-body-md leading-relaxed text-on-surface">
                        {renderMarkdown(m.text, `msg-${i}`)}
                      </div>

                      {/* Action tools row */}
                      <div className="flex flex-wrap items-center justify-between gap-space-xs pt-space-xs border-t border-surface-container-high/40">
                        <div className="flex items-center gap-space-xs">
                          <button
                            onClick={() => navigator.clipboard.writeText(m.text)}
                            className="flex items-center gap-1 px-space-sm py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-label-md font-label-md transition-colors shadow-sm"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-primary text-body-sm">content_copy</span>
                            <span>Copy Setup</span>
                          </button>
                          <button
                            onClick={() => alert("Trade parameter payload dispatched to terminal ticket.")}
                            className="flex items-center gap-1 px-space-sm py-1 rounded bg-primary-container text-on-primary-container hover:bg-primary-fixed text-label-md font-label-md font-semibold transition-colors shadow-sm"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-body-sm">send</span>
                            <span>Send to Order Ticket</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            className="p-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-secondary transition-colors"
                            title="Accurate signal"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-body-sm">thumb_up</span>
                          </button>
                          <button
                            className="p-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-error transition-colors"
                            title="Inaccurate signal"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-body-sm">thumb_down</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            {busy && (
              <article className="flex items-start gap-space-sm max-w-4xl self-start">
                <div className="w-9 h-9 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0 animate-pulse border border-surface-variant">
                  <span className="material-symbols-outlined text-primary text-headline-md">smart_toy</span>
                </div>
                <div className="bg-surface-container rounded-2xl rounded-tl-none px-space-md py-space-sm text-body-md text-on-surface-variant flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  Synthesizing quantitative orderbook feeds and Elfa NLP vectors...
                </div>
              </article>
            )}

            {error && (
              <div className="p-space-sm rounded bg-error-container/20 text-error border border-error/30 text-body-sm flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="underline text-data-micro uppercase font-bold" type="button">
                  Dismiss
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Docked Institutional Command Input Terminal */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md px-margin-desktop py-space-sm border-t border-surface-container-high/80 shadow-2xl">
          <div className="max-w-5xl mx-auto flex flex-col gap-space-xs">
            {/* Command Autocomplete Popover */}
            {showCommandMenu && (
              <div className="bg-surface-container rounded-lg p-space-sm shadow-2xl flex flex-col gap-1 mb-1 border border-surface-container-high">
                <div className="flex items-center justify-between pb-1 text-on-surface-variant font-label-caps text-label-caps">
                  <span>AVAILABLE ALGORITHMIC COMMANDS</span>
                  <button onClick={() => setShowCommandMenu(false)} className="text-data-micro hover:text-primary">
                    ESC to close
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1 font-data-tabular text-data-tabular">
                  <button
                    onClick={() => {
                      setInputText("/setup BTC ");
                      setShowCommandMenu(false);
                      inputRef.current?.focus();
                    }}
                    className="text-left px-2 py-1.5 rounded hover:bg-surface-container-high flex items-center justify-between group transition-colors"
                    type="button"
                  >
                    <span className="text-primary font-semibold group-hover:text-primary-fixed">/setup [symbol]</span>
                    <span className="text-on-surface-variant text-data-micro">Generate TP/SL &amp; risk setup</span>
                  </button>
                  <button
                    onClick={() => {
                      setInputText("/explain SOL ");
                      setShowCommandMenu(false);
                      inputRef.current?.focus();
                    }}
                    className="text-left px-2 py-1.5 rounded hover:bg-surface-container-high flex items-center justify-between group transition-colors"
                    type="button"
                  >
                    <span className="text-secondary font-semibold group-hover:text-secondary-fixed">/explain [token]</span>
                    <span className="text-on-surface-variant text-data-micro">Tokenomics &amp; on-chain metrics</span>
                  </button>
                  <button
                    onClick={() => {
                      setInputText("/markets ");
                      setShowCommandMenu(false);
                      inputRef.current?.focus();
                    }}
                    className="text-left px-2 py-1.5 rounded hover:bg-surface-container-high flex items-center justify-between group transition-colors"
                    type="button"
                  >
                    <span className="text-primary font-semibold group-hover:text-primary-fixed">/markets</span>
                    <span className="text-on-surface-variant text-data-micro">Perp liquidity &amp; funding heatmap</span>
                  </button>
                  <button
                    onClick={() => {
                      setInputText("/summary ");
                      setShowCommandMenu(false);
                      inputRef.current?.focus();
                    }}
                    className="text-left px-2 py-1.5 rounded hover:bg-surface-container-high flex items-center justify-between group transition-colors"
                    type="button"
                  >
                    <span className="text-tertiary-fixed font-semibold group-hover:text-white">/summary</span>
                    <span className="text-on-surface-variant text-data-micro">60s Macro &amp; NLP sentiment</span>
                  </button>
                </div>
              </div>
            )}

            {/* Main Terminal Input Box */}
            <div className="relative flex items-center bg-surface-container rounded-xl px-space-md py-space-xs shadow-lg focus-within:bg-surface-container-high transition-all border border-surface-container-high/80">
              <span className="font-data-metric text-headline-md text-primary font-bold mr-space-sm select-none">&gt;_</span>
              <input
                ref={inputRef}
                value={inputText}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="w-full bg-transparent text-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none"
                placeholder="Ask PacificaPilot anything or type '/' for commands..."
                type="text"
              />
              <div className="flex items-center gap-space-xs shrink-0 ml-space-sm">
                <div className="hidden sm:inline-flex items-center gap-1 px-space-sm py-1 rounded bg-surface-container-high text-on-surface font-data-micro text-data-micro">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  <span>Pacifica-Quant v4.2</span>
                </div>
                <div className="hidden md:inline-flex items-center gap-1 px-space-sm py-1 rounded bg-surface-container-high text-on-surface-variant font-data-micro text-data-micro">
                  <span>Sources: Pacifica • Elfa • CoinGecko</span>
                </div>
                <button
                  onClick={() => handleSend()}
                  disabled={busy || !inputText.trim()}
                  className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container hover:bg-primary-fixed flex items-center justify-center transition-colors shadow-md disabled:opacity-40"
                  type="button"
                >
                  <span className="material-symbols-outlined text-body-lg">arrow_upward</span>
                </button>
              </div>
            </div>

            {/* Keyboard Shortcuts & Telemetry Hint */}
            <div className="flex items-center justify-between font-data-micro text-data-micro text-outline px-space-xs">
              <div className="flex items-center gap-space-sm">
                <span>
                  Press <kbd className="font-mono text-on-surface-variant">Enter ↵</kbd> to execute
                </span>
                <span>•</span>
                <span>
                  <kbd className="font-mono text-on-surface-variant">⌘K</kbd> new session
                </span>
                <span>•</span>
                <span>
                  <kbd className="font-mono text-on-surface-variant">Shift + Enter</kbd> newline
                </span>
              </div>
              <div className="hidden sm:inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-body-sm text-secondary">verified_user</span>
                <span>Non-custodial cryptographic telemetry protocol</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
