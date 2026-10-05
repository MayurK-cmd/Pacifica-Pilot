import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

type CategoryGroup = "all" | "ai" | "trading" | "market" | "memory" | "comms";

interface IntegrationCardData {
  id: string;
  category: "ai" | "trading" | "market" | "memory" | "comms";
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  speed: string;
  iconText?: string;
  materialIcon?: string;
  keywords: string;
  telemetry: { label: string; value: string; isHighlight?: boolean }[];
  snippet: string;
  displayCmd: string;
  linkText: string;
  version: string;
}

const INTEGRATIONS: IntegrationCardData[] = [
  // AI Providers (BYOK)
  {
    id: "anthropic",
    category: "ai",
    name: "Anthropic",
    subtitle: "Claude 3.5 Sonnet & Haiku",
    description: "Native reasoning agent support for complex ReAct loops, multi-step market thesis generation, and post-mortem review.",
    badge: "NATIVE REASONING",
    speed: "~380ms",
    iconText: "AN",
    keywords: "anthropic claude sonnet haiku reasoning agent llm react byok",
    telemetry: [
      { label: "AUTH TYPE", value: "Local API Key" },
      { label: "CONTEXT RATIO", value: "200K Tokens" },
      { label: "STREAMING", value: "SSE Native", isHighlight: true },
      { label: "TOOL CALLS", value: "9 Native CLI" },
    ],
    snippet: "pacificapilot config set-provider anthropic --key $ANTHROPIC_API_KEY",
    displayCmd: "pacificapilot config set-provider anthropic",
    linkText: "Configure Docs →",
    version: "v2.4 Core",
  },
  {
    id: "openai",
    category: "ai",
    name: "OpenAI",
    subtitle: "GPT-4o & GPT-4o-mini",
    description: "High-throughput prompt orchestration, structured JSON function calling for the 9 native CLI tools and deterministic validation.",
    badge: "STRUCTURED JSON",
    speed: "~320ms",
    iconText: "OA",
    keywords: "openai gpt-4o gpt4 json function calling structured orchestration llm byok",
    telemetry: [
      { label: "AUTH TYPE", value: "Local API Key" },
      { label: "FUNCTION CALL", value: "Strict JSON Schema" },
      { label: "REDUNDANCY", value: "Tier-1 Multi-Region", isHighlight: true },
      { label: "QUANT ENGINE", value: "o-series Ready" },
    ],
    snippet: "pacificapilot config set-provider openai --model gpt-4o",
    displayCmd: "pacificapilot config set-provider openai",
    linkText: "Configure Docs →",
    version: "v2.1 Core",
  },
  {
    id: "gemini",
    category: "ai",
    name: "Google Gemini",
    subtitle: "Gemini 1.5 Pro & Flash",
    description: "2M token context for massive tick history ingestion, order book depth evaluation, and macro digest synthesis in single prompts.",
    badge: "2M TOKEN WINDOW",
    speed: "~290ms",
    iconText: "GG",
    keywords: "google gemini pro flash context tick history macro digest llm byok",
    telemetry: [
      { label: "AUTH TYPE", value: "AI Studio Key" },
      { label: "CONTEXT", value: "2,000,000 Tokens", isHighlight: true },
      { label: "INGEST MODE", value: "Parquet & CSV Raw" },
      { label: "SPEED", value: "Flash Sub-Second" },
    ],
    snippet: "pacificapilot config set-provider gemini --model gemini-1.5-pro",
    displayCmd: "pacificapilot config set-provider gemini",
    linkText: "Configure Docs →",
    version: "v1.9 Core",
  },
  {
    id: "openrouter",
    category: "ai",
    name: "OpenRouter",
    subtitle: "DeepSeek R1 & Llama 3",
    description: "Access decentralized and open-weight quant models with flexible routing, automatic fallback redundancy, and privacy filters.",
    badge: "FALLBACK GATEWAY",
    speed: "Dynamic",
    iconText: "OR",
    keywords: "openrouter deepseek r1 llama 3 decentralized open weight quant routing privacy byok",
    telemetry: [
      { label: "AUTH TYPE", value: "Bearer Token" },
      { label: "MODELS", value: "200+ Available" },
      { label: "ROUTING", value: "Cost / Latency Opt", isHighlight: true },
      { label: "LOGGING", value: "Zero Data Retention" },
    ],
    snippet: "pacificapilot config set-provider openrouter --route fallback",
    displayCmd: "pacificapilot config set-provider openrouter",
    linkText: "Configure Docs →",
    version: "v2.0 Core",
  },

  // Trading & On-chain
  {
    id: "pacifica-dex",
    category: "trading",
    name: "Pacifica DEX",
    subtitle: "Native Non-Custodial Perps CLOB",
    description: "Direct L2 WebSocket order placement, sub-20ms deterministic execution, sub-account isolated margins, and zero maker fees for autonomous pilot algorithms.",
    badge: "SUB-20MS DETERMINISTIC",
    speed: "18ms Roundtrip",
    materialIcon: "candlestick_chart",
    keywords: "pacifica dex clob perps orderbook websocket isolated margin zero maker fees trading on-chain",
    telemetry: [
      { label: "AUTH KEY", value: "ed25519 Ephemeral" },
      { label: "MATCHING", value: "CLOB Memory FIFO", isHighlight: true },
      { label: "PROTOCOLS", value: "WSS & Binary RPC" },
      { label: "SETTLEMENT", value: "Real-Time Isolated" },
    ],
    snippet: "pacificapilot dex init --keyfile ./vault/ephemeral.key --cluster mainnet",
    displayCmd: "pacificapilot dex init --keyfile ./vault/ephemeral.key",
    linkText: "CLOB Protocol Guide →",
    version: "Direct WS Engine",
  },
  {
    id: "solana",
    category: "trading",
    name: "Solana Blockchain",
    subtitle: "High-Throughput L1 Settlement",
    description: "Read-only account telemetry, Drift protocol margin monitoring, SPL-USDC balance tracking, and ultra-fast transaction finality without signing privileges leak.",
    badge: "400MS SLOTS",
    speed: "L1 Confirmed",
    materialIcon: "account_balance_wallet",
    keywords: "solana blockchain l1 spl usdc drift margin telemetry settlement on-chain",
    telemetry: [
      { label: "CONNECTION", value: "Yellowstone gRPC" },
      { label: "RPC SLOTS", value: "Real-time Stream", isHighlight: true },
      { label: "VAULT SECURITY", value: "Read-Only Agent" },
      { label: "FINALITY", value: "Sub-second Commit" },
    ],
    snippet: "pacificapilot solana attach --rpc-endpoint $HELIUS_RPC --watch-wallet $TRADER_PUBKEY",
    displayCmd: "pacificapilot solana attach --rpc-endpoint $HELIUS_RPC",
    linkText: "RPC Configuration →",
    version: "gRPC Geyser Compatible",
  },

  // Market Data & Signals
  {
    id: "pacifica-feed",
    category: "market",
    name: "Pacifica REST & WS API",
    subtitle: "Order Books & Real-Time Ticks",
    description: "Raw Level 2 depth feeds, real-time cumulative volume delta (CVD), liquidation clusters, and open interest expansion tracking.",
    badge: "RAW DEPTH L2",
    speed: "~12ms",
    materialIcon: "ssid_chart",
    keywords: "pacifica rest websocket api order books level 2 depth cvd volume delta liquidation clusters market data",
    telemetry: [
      { label: "DATA STREAM", value: "100ms Snapshots" },
      { label: "COMPRESSION", value: "Zstandard WS", isHighlight: true },
      { label: "ORDER TRACES", value: "Full Depth Ladder" },
      { label: "RATE LIMIT", value: "Uncapped Internal" },
    ],
    snippet: "pacificapilot feed attach --source pacifica-l2 --pairs SOL-PERP,BTC-PERP",
    displayCmd: "pacificapilot feed attach --source pacifica-l2",
    linkText: "Feed Specs →",
    version: "Direct Socket",
  },
  {
    id: "binance-oracle",
    category: "market",
    name: "Binance Fallback",
    subtitle: "Market Breadth & Liquidity Reference",
    description: "Spot and perp reference price telemetry to detect cross-venue basis arbitrage, funding rate disparities, and extreme oracle de-pegs.",
    badge: "CROSS-VENUE ORACLE",
    speed: "Reference Feed",
    materialIcon: "compare_arrows",
    keywords: "binance fallback arbitrage funding rate reference market breadth depeg oracle market data",
    telemetry: [
      { label: "USE CASE", value: "Basis Arbitrage" },
      { label: "ORACLE MODE", value: "Anomaly Detector", isHighlight: true },
      { label: "LATENCY BUFFER", value: "50ms Sliding Win" },
      { label: "AUTHENTICATION", value: "Public WS Tier" },
    ],
    snippet: "pacificapilot oracle enable binance-reference --symbols BTCUSDT,SOLUSDT",
    displayCmd: "pacificapilot oracle enable binance-reference",
    linkText: "Arbitrage Manual →",
    version: "Read-Only",
  },
  {
    id: "elfa-nlp",
    category: "market",
    name: "Elfa AI Social Sentiment",
    subtitle: "X / Farcaster Narrative NLP Feeds",
    description: "Real-time social velocity, viral token narrative clusters, sentiment scoring (0-100), and institutional smart-money mention tracking.",
    badge: "NLP STREAM",
    speed: "Real-Time Score",
    materialIcon: "psychology",
    keywords: "elfa ai social sentiment x farcaster nlp narrative smart money viral tokens market data signals",
    telemetry: [
      { label: "METRIC SCALE", value: "0 - 100 Index" },
      { label: "TRACKED FEEDS", value: "CT + Farcaster", isHighlight: true },
      { label: "SMART MONEY", value: "Curated Whitelist" },
      { label: "UPDATE FREQ", value: "5s Ingestion" },
    ],
    snippet: "pacificapilot signals attach elfa-nlp --api-key $ELFA_KEY --min-score 70",
    displayCmd: "pacificapilot signals attach elfa-nlp",
    linkText: "NLP Sentiment Guide →",
    version: "v1.2 Agent",
  },

  // Memory Systems
  {
    id: "supermemory-local",
    category: "memory",
    name: "Supermemory Local",
    subtitle: "SQLite + sqlite-vec Vector Core (Default)",
    description: "Fully sovereign, zero-cloud storage on local NVMe. Perform cosine similarity searches across thousands of historical trade post-mortems in <3ms.",
    badge: "DEFAULT CORE",
    speed: "<3ms Cosine Search",
    materialIcon: "database",
    keywords: "supermemory local sqlite sqlite-vec vector core sovereign nvme memory post-mortems",
    telemetry: [
      { label: "STORAGE LOC", value: "Local NVMe (.db)" },
      { label: "VECTOR ENGINE", value: "sqlite-vec C-Ext", isHighlight: true },
      { label: "EMBEDDINGS", value: "BGE-Small / Local" },
      { label: "ENCRYPTION", value: "AES-256-GCM" },
    ],
    snippet: "pacificapilot memory init --engine sqlite-vec --path ~/.pacifica",
    displayCmd: "pacificapilot memory init --engine sqlite-vec --path ~/.pacifica",
    linkText: "Vector Specs →",
    version: "Embedded C++",
  },
  {
    id: "supermemory-cloud",
    category: "memory",
    name: "Supermemory Cloud",
    subtitle: "Encrypted Multi-Device Sync",
    description: "Optional zero-knowledge end-to-end encrypted backup for synchronizing trade memory embeddings, risk playbooks, and model calibration across remote CLI daemons.",
    badge: "E2EE ZERO-KNOWLEDGE",
    speed: "Multi-Node Sync",
    materialIcon: "cloud_sync",
    keywords: "supermemory cloud zero knowledge e2ee sync multi-device daemons memory backup",
    telemetry: [
      { label: "CIPHER", value: "Argon2id + XChaCha" },
      { label: "HOSTING", value: "Self-Host / Managed", isHighlight: true },
      { label: "REPLICA", value: "CRDT Conflict Free" },
      { label: "CLOUD LEAKAGE", value: "0.00% Verified" },
    ],
    snippet: "pacificapilot memory sync --e2ee-key $VAULT_SYNC_KEY",
    displayCmd: "pacificapilot memory sync --e2ee-key $VAULT_SYNC_KEY",
    linkText: "Zero-Knowledge Whitepaper →",
    version: "Optional Extension",
  },

  // Communications & UI
  {
    id: "telegram-bot",
    category: "comms",
    name: "Telegram Bot",
    subtitle: "Instant Telemetry & Push Alerts",
    description: "Receive real-time trade execution notices, liquidation warnings, daily quant digests, and execute /emergency_panic_close directly via Telegram.",
    badge: "BIDIRECTIONAL",
    speed: "Instant Push",
    materialIcon: "send",
    keywords: "telegram bot telemetry push alerts notifications emergency panic close command communications",
    telemetry: [
      { label: "TRIGGER", value: "Webhooks / Longpoll" },
      { label: "COMMANDS", value: "Panic Close / Status", isHighlight: true },
      { label: "SECURITY", value: "Chat ID Whitelist" },
      { label: "THROTTLE", value: "Smart Deduplication" },
    ],
    snippet: "pacificapilot alerts setup telegram --token $TG_BOT_TOKEN --chat-id $TG_CHAT_ID",
    displayCmd: "pacificapilot alerts setup telegram --token $TG_BOT_TOKEN",
    linkText: "Bot Config Guide →",
    version: "Encrypted Dispatch",
  },
  {
    id: "textual-tui",
    category: "comms",
    name: "Textual Terminal UI",
    subtitle: "60 FPS Interactive ASCII Dashboard",
    description: "Full-featured terminal user interface built with Python Textual, featuring live ASCII candlestick charts, vim-inspired hotkey navigation, and real-time visual order books.",
    badge: "60 FPS TUI",
    speed: "Low Footprint",
    materialIcon: "terminal",
    keywords: "textual terminal ui tui ascii dashboard 60 fps hotkeys live order books charts interface",
    telemetry: [
      { label: "RUNTIME", value: "Python 3.11+ Textual" },
      { label: "CHARTS", value: "Braille / Unicode", isHighlight: true },
      { label: "SSH DAEMON", value: "Headless Capable" },
      { label: "CPU OVERHEAD", value: "< 1.2% Core" },
    ],
    snippet: "pacificapilot ui start --ascii --theme obsidian",
    displayCmd: "pacificapilot ui start --ascii --theme obsidian",
    linkText: "TUI Keybindings →",
    version: "Native Python",
  },
];

export function Integrations() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<CategoryGroup>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [scriptCopied, setScriptCopied] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut ⌘F / Ctrl+F focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter logic
  const filteredIntegrations = INTEGRATIONS.filter((item) => {
    const matchesFilter = activeFilter === "all" || item.category === activeFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesFilter;

    const matchesQuery =
      item.name.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.badge.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q);

    return matchesFilter && matchesQuery;
  });

  // Group filtered results by section
  const aiItems = filteredIntegrations.filter((i) => i.category === "ai");
  const tradingItems = filteredIntegrations.filter((i) => i.category === "trading");
  const marketItems = filteredIntegrations.filter((i) => i.category === "market");
  const memoryItems = filteredIntegrations.filter((i) => i.category === "memory");
  const commsItems = filteredIntegrations.filter((i) => i.category === "comms");

  const counts = {
    all: INTEGRATIONS.length,
    ai: INTEGRATIONS.filter((i) => i.category === "ai").length,
    trading: INTEGRATIONS.filter((i) => i.category === "trading").length,
    market: INTEGRATIONS.filter((i) => i.category === "market").length,
    memory: INTEGRATIONS.filter((i) => i.category === "memory").length,
    comms: INTEGRATIONS.filter((i) => i.category === "comms").length,
  };

  const copySnippet = async (id: string, snippet: string) => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (err) {
      console.warn("Clipboard failed", err);
    }
  };

  const copyQuickstartScript = async () => {
    const script = `pacificapilot integrations enable anthropic --model claude-3-5-sonnet\npacificapilot dex attach --protocol pacifica-perps --margin isolated\npacificapilot test-connection --all`;
    try {
      await navigator.clipboard.writeText(script);
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 2000);
    } catch (err) {
      console.warn("Clipboard failed", err);
    }
  };

  return (
    <div className="bg-surface text-on-surface selection:bg-primary-container selection:text-on-primary-container min-h-screen">
      {/* Main Body */}
      <main className="w-full bg-surface">
        <div className="flex flex-col w-full">
          {/* Technical Ambience Background */}
          <div className="relative w-full overflow-hidden">
            <div className="absolute -top-40 right-1/4 w-[500px] h-[500px] bg-primary-container/5 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute top-96 left-[-10%] w-[400px] h-[400px] bg-secondary-container/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Content Container */}
            <div className="w-full px-margin md:px-margin-desktop py-space-lg flex flex-col gap-space-xl max-w-[1720px] mx-auto">
              {/* Telemetry Subheader */}
              <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md p-space-md rounded bg-surface-container-lowest shadow-sm">
                <div className="flex items-center gap-space-sm flex-wrap">
                  <div className="flex items-center gap-space-xs text-primary-container">
                    <span className="material-symbols-outlined text-[18px]">hub</span>
                    <span className="font-label-caps text-label-caps tracking-widest text-primary-container uppercase">
                      ECOSYSTEM ARCHITECTURE
                    </span>
                  </div>
                  <span className="font-data-micro text-data-micro text-outline opacity-40">//</span>
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                    PLUG-AND-PLAY BYOK TELEMETRY
                  </span>
                </div>
                <div className="flex items-center gap-space-xs flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded bg-surface-container-low text-secondary">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary-container animate-pulse" />
                    <span className="font-data-micro text-data-micro uppercase font-semibold">13 PROTOCOL ADAPTERS VERIFIED</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded bg-surface-container-low text-primary-container">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                    <span className="font-data-micro text-data-micro uppercase">ZERO CLOUD DEPENDENCY LOCK-IN</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded bg-surface-container-low text-on-surface">
                    <span className="material-symbols-outlined text-[14px] text-tertiary-fixed-dim">speed</span>
                    <span className="font-data-micro text-data-micro uppercase font-medium">SUB-5MS CONNECTOR LATENCY</span>
                  </div>
                </div>
              </section>

              {/* Page Title & Filter Toolstrip */}
              <section className="flex flex-col gap-space-md relative">
                <div className="flex flex-col gap-space-xs">
                  <span className="font-label-caps text-label-caps text-primary-container uppercase tracking-widest">
                    EXTENSIBLE AGENTIC ECOSYSTEM
                  </span>
                  <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                    Wire PacificaPilot into your existing stack
                  </h1>
                  <p className="font-body-lg text-body-lg text-on-surface-variant max-w-4xl">
                    Connect local-first AI models, high-throughput decentralized exchange order books, ultra-low latency oracles, vector
                    memory cores, and notifications with zero cloud leakage. All API credentials and private keys remain securely stored in
                    your local encrypted vault.
                  </p>
                </div>

                {/* Filter Pills & Search */}
                <div className="mt-space-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-space-md pt-space-md">
                  {/* Category Filter Tabs */}
                  <div className="flex items-center gap-space-xs flex-wrap p-1 rounded bg-surface-container-lowest">
                    {[
                      { key: "all", label: "All Integrations", count: counts.all },
                      { key: "ai", label: "AI Providers", count: counts.ai },
                      { key: "trading", label: "Trading & On-chain", count: counts.trading },
                      { key: "market", label: "Market Data & Signals", count: counts.market },
                      { key: "memory", label: "Memory Systems", count: counts.memory },
                      { key: "comms", label: "Communications & UI", count: counts.comms },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveFilter(tab.key as CategoryGroup)}
                        className={`px-space-md py-1.5 rounded font-label-md text-label-md transition-colors ${
                          activeFilter === tab.key
                            ? "bg-primary-container text-on-primary-container"
                            : "bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                        }`}
                      >
                        {tab.label} <span className="font-data-micro text-data-micro ml-1 opacity-80">({tab.count})</span>
                      </button>
                    ))}
                  </div>

                  {/* Dynamic Search & Quick Matrix Direct Link */}
                  <div className="flex items-center gap-space-sm w-full xl:w-auto">
                    <div className="relative flex-1 xl:w-96">
                      <span className="material-symbols-outlined absolute left-space-sm top-1/2 -translate-y-1/2 text-outline text-[18px]">
                        search
                      </span>
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter integrations by keyword or protocol (e.g. Claude, Solana, WS)..."
                        className="w-full pl-9 pr-space-md py-2 bg-surface-container-lowest text-on-surface font-body-sm text-body-sm rounded outline-none placeholder:text-outline focus:bg-surface-container-low transition-all shadow-inner"
                      />
                      <span className="absolute right-space-sm top-1/2 -translate-y-1/2 font-data-micro text-data-micro text-outline opacity-60">
                        ⌘F
                      </span>
                    </div>
                    <a
                      href="#quickstart"
                      className="hidden sm:inline-flex items-center gap-1.5 px-space-md py-2 rounded bg-surface-container-low hover:bg-surface-container text-on-surface font-body-sm text-body-sm transition-colors whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary-container">terminal</span>
                      <span>Docs Matrix</span>
                    </a>
                  </div>
                </div>
              </section>

              {/* Group A: AI Providers */}
              {aiItems.length > 0 && (
                <section className="flex flex-col gap-space-md">
                  <div className="flex items-center justify-between pb-space-xs">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-2.5 h-2.5 rounded bg-primary-container" />
                      <h2 className="font-headline-lg text-headline-lg text-on-surface">AI Providers (BYOK)</h2>
                      <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-data-micro text-data-micro">
                        LOCAL ENCRYPTED KEYS
                      </span>
                    </div>
                    <span className="font-data-micro text-data-micro text-on-surface-variant">{aiItems.length} ADAPTERS</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-space-md">
                    {aiItems.map((item) => (
                      <IntegrationCard key={item.id} item={item} isCopied={copiedId === item.id} onCopy={() => copySnippet(item.id, item.snippet)} />
                    ))}
                  </div>
                </section>
              )}

              {/* Group B: Trading & On-chain */}
              {tradingItems.length > 0 && (
                <section className="flex flex-col gap-space-md">
                  <div className="flex items-center justify-between pb-space-xs">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-2.5 h-2.5 rounded bg-secondary-container" />
                      <h2 className="font-headline-lg text-headline-lg text-on-surface">Trading & On-chain Settlement</h2>
                      <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-secondary font-data-micro text-data-micro">
                        DETERMINISTIC EXECUTION
                      </span>
                    </div>
                    <span className="font-data-micro text-data-micro text-on-surface-variant">{tradingItems.length} PROTOCOLS</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                    {tradingItems.map((item) => (
                      <IntegrationCard key={item.id} item={item} isCopied={copiedId === item.id} onCopy={() => copySnippet(item.id, item.snippet)} />
                    ))}
                  </div>
                </section>
              )}

              {/* Group C: Market Data & Signals */}
              {marketItems.length > 0 && (
                <section className="flex flex-col gap-space-md">
                  <div className="flex items-center justify-between pb-space-xs">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-2.5 h-2.5 rounded bg-primary-fixed" />
                      <h2 className="font-headline-lg text-headline-lg text-on-surface">Market Data & Signal Feeds</h2>
                      <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-data-micro text-data-micro">
                        RAW LEVEL 2 & NLP
                      </span>
                    </div>
                    <span className="font-data-micro text-data-micro text-on-surface-variant">{marketItems.length} FEEDS</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                    {marketItems.map((item) => (
                      <IntegrationCard key={item.id} item={item} isCopied={copiedId === item.id} onCopy={() => copySnippet(item.id, item.snippet)} />
                    ))}
                  </div>
                </section>
              )}

              {/* Group D: Memory Systems */}
              {memoryItems.length > 0 && (
                <section className="flex flex-col gap-space-md">
                  <div className="flex items-center justify-between pb-space-xs">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-2.5 h-2.5 rounded bg-tertiary-fixed-dim" />
                      <h2 className="font-headline-lg text-headline-lg text-on-surface">Long-term Memory & Vector Cores</h2>
                      <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-tertiary font-data-micro text-data-micro">
                        SOVEREIGN STORAGE
                      </span>
                    </div>
                    <span className="font-data-micro text-data-micro text-on-surface-variant">{memoryItems.length} ENGINES</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                    {memoryItems.map((item) => (
                      <IntegrationCard key={item.id} item={item} isCopied={copiedId === item.id} onCopy={() => copySnippet(item.id, item.snippet)} />
                    ))}
                  </div>
                </section>
              )}

              {/* Group E: Communications & UI */}
              {commsItems.length > 0 && (
                <section className="flex flex-col gap-space-md">
                  <div className="flex items-center justify-between pb-space-xs">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-2.5 h-2.5 rounded bg-secondary-fixed" />
                      <h2 className="font-headline-lg text-headline-lg text-on-surface">Communications, Telemetry & UI</h2>
                      <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-secondary-fixed-dim font-data-micro text-data-micro">
                        PUSH CHANNELS
                      </span>
                    </div>
                    <span className="font-data-micro text-data-micro text-on-surface-variant">{commsItems.length} INTERFACES</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                    {commsItems.map((item) => (
                      <IntegrationCard key={item.id} item={item} isCopied={copiedId === item.id} onCopy={() => copySnippet(item.id, item.snippet)} />
                    ))}
                  </div>
                </section>
              )}

              {filteredIntegrations.length === 0 && (
                <div className="p-space-xl rounded bg-surface-container-lowest text-center flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-outline text-4xl">search_off</span>
                  <h3 className="font-headline-md text-headline-md text-on-surface">No integrations matched your query</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">Try searching for keywords like "Claude", "Solana", "SQLite", or clear filters.</p>
                  <button
                    onClick={() => {
                      setActiveFilter("all");
                      setSearchQuery("");
                    }}
                    className="mt-2 px-space-md py-1.5 bg-primary-container text-on-primary-container font-label-md text-label-md rounded hover:bg-primary-fixed transition-colors"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}

              {/* Quickstart Configuration Block: Interactive Terminal Simulation */}
              <section id="quickstart" className="flex flex-col lg:flex-row gap-space-lg p-space-lg rounded bg-surface-container-lowest shadow-md">
                {/* Left: Quick Instructions & Features */}
                <div className="flex flex-col justify-between flex-1 gap-space-md">
                  <div className="flex flex-col gap-space-xs">
                    <span className="font-label-caps text-label-caps text-primary-container tracking-wider uppercase">
                      SEAMLESS INTEGRATION PIPELINE
                    </span>
                    <h2 className="font-headline-lg text-headline-lg text-on-surface">Add any integration in 30 seconds via CLI</h2>
                    <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                      Every adapter is built with zero-touch hot-reloading. You can add Anthropic API tokens, link your Solana RPC endpoint,
                      or initialize the local vector memory core without restarting running autopilot loops.
                    </p>
                  </div>
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex items-start gap-space-sm">
                      <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">verified_user</span>
                      <div className="flex flex-col">
                        <span className="font-body-sm text-body-sm font-semibold text-on-surface">Client-Side Vault Encryption</span>
                        <span className="font-data-micro text-data-micro text-on-surface-variant">
                          Private keys and API credentials never touch PacificaPilot infrastructure.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-space-sm">
                      <span className="material-symbols-outlined text-primary-container text-[20px] mt-0.5">swap_calls</span>
                      <div className="flex flex-col">
                        <span className="font-body-sm text-body-sm font-semibold text-on-surface">Autonomous Redundant Routing</span>
                        <span className="font-data-micro text-data-micro text-on-surface-variant">
                          If an LLM provider rate limits or spikes latency, traffic gracefully falls back.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-space-sm">
                      <span className="material-symbols-outlined text-tertiary-fixed-dim text-[20px] mt-0.5">offline_bolt</span>
                      <div className="flex flex-col">
                        <span className="font-body-sm text-body-sm font-semibold text-on-surface">Hardware Isolation Support</span>
                        <span className="font-data-micro text-data-micro text-on-surface-variant">
                          Works seamlessly in air-gapped environments with Ollama or local GGML inference.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Documentation Matrix & SDK Link */}
                  <div className="flex items-center gap-space-sm pt-space-xs">
                    <a
                      href="https://github.com/pacificapilot/cli"
                      target="_blank"
                      rel="noreferrer"
                      className="px-space-md py-2 rounded bg-primary-container text-on-primary-container font-headline-md text-headline-md hover:bg-primary-fixed transition-colors font-medium flex items-center gap-space-xs"
                    >
                      <span className="material-symbols-outlined text-[18px]">library_books</span>
                      <span>View Full Matrix</span>
                    </a>
                    <span className="font-data-micro text-data-micro text-outline">v0.8.4 Compatible</span>
                  </div>
                </div>

                {/* Right: Tabbed CLI Terminal Box */}
                <div className="flex-1 flex flex-col rounded bg-surface-container-low overflow-hidden shadow-inner">
                  {/* Terminal Header */}
                  <div className="flex items-center justify-between px-space-md py-2 bg-surface-container-high">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-error/60" />
                      <span className="w-3 h-3 rounded-full bg-tertiary-container/60" />
                      <span className="w-3 h-3 rounded-full bg-secondary/60" />
                      <span className="ml-2 font-data-micro text-data-micro text-on-surface-variant">zsh — 84x24 terminal</span>
                    </div>
                    <div className="flex items-center gap-space-xs">
                      <button
                        onClick={copyQuickstartScript}
                        className={`flex items-center gap-1 px-space-xs py-0.5 rounded bg-surface-container text-data-micro font-data-micro transition-colors ${
                          scriptCopied ? "text-secondary font-semibold" : "text-on-surface-variant hover:text-primary-container"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">{scriptCopied ? "done" : "content_copy"}</span>
                        <span>{scriptCopied ? "Copied!" : "Copy Script"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Terminal Content Area */}
                  <div className="p-space-md font-data-tabular text-data-tabular flex flex-col gap-space-xs leading-relaxed overflow-x-auto text-on-surface selection:bg-primary-container selection:text-on-primary-container">
                    <div className="flex items-center gap-2">
                      <span className="text-secondary font-bold">~</span>
                      <span className="text-primary-container font-semibold">$</span>
                      <span className="text-on-surface">pacificapilot integrations enable anthropic --model claude-3-5-sonnet</span>
                    </div>
                    <div className="text-outline pl-4 font-data-micro text-data-micro">
                      [vault] Encrypted API secret saved to /home/trader/.pacifica/vault.enc
                      <br />
                      [adapter] anthropic_v2: model configured with max_tokens=8192
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-secondary font-bold">~</span>
                      <span className="text-primary-container font-semibold">$</span>
                      <span className="text-on-surface">pacificapilot dex attach --protocol pacifica-perps --margin isolated</span>
                    </div>
                    <div className="text-outline pl-4 font-data-micro text-data-micro">
                      [ws] Connecting to wss://api.pacifica.fi/v2/stream...
                      <br />
                      [ws] Handshake authenticated via ed25519 ephemeral keypair
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-secondary font-bold">~</span>
                      <span className="text-primary-container font-semibold">$</span>
                      <span className="text-on-surface">pacificapilot test-connection --all</span>
                    </div>

                    {/* Terminal Telemetry Diagnostics Output */}
                    <div className="p-space-sm rounded bg-surface-container-lowest mt-1 flex flex-col gap-1 font-data-micro text-data-micro">
                      <div className="flex items-center justify-between text-secondary">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          <span>Anthropic Core (Claude 3.5 Sonnet)</span>
                        </span>
                        <span>382ms [OK]</span>
                      </div>
                      <div className="flex items-center justify-between text-secondary">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          <span>Pacifica DEX Orderbook WS (L2 Feed)</span>
                        </span>
                        <span>12ms [OK]</span>
                      </div>
                      <div className="flex items-center justify-between text-secondary">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          <span>Solana L1 Account Telemetry (Yellowstone)</span>
                        </span>
                        <span>28ms [OK]</span>
                      </div>
                      <div className="flex items-center justify-between text-secondary">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          <span>Supermemory SQLite Vector Database</span>
                        </span>
                        <span>&lt;2ms [OK]</span>
                      </div>
                      <div className="flex items-center justify-between text-primary-container pt-1">
                        <span>ALL 4 ADAPTERS LIVE & SYNCHRONIZED</span>
                        <span>DAEMON READY</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-secondary font-bold">~</span>
                      <span className="text-primary-container font-semibold">$</span>
                      <span className="w-2 h-4 bg-primary-container animate-pulse inline-block" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Developer Extensibility CTA */}
              <section className="flex flex-col md:flex-row items-center justify-between gap-space-lg p-space-lg rounded bg-surface-container-low shadow-sm relative overflow-hidden">
                <div className="flex flex-col gap-space-xs z-10 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary-container text-[20px]">extension</span>
                    <span className="font-label-caps text-label-caps text-primary-container uppercase tracking-widest">
                      DEVELOPER EXTENSIBILITY
                    </span>
                  </div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">Need a custom exchange or proprietary model adapter?</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    PacificaPilot is built from the ground up as a pluggable modular SDK. Implement the abstract{" "}
                    <code className="bg-surface-container-high px-1 rounded text-primary font-data-micro">BaseExchangeAdapter</code> or{" "}
                    <code className="bg-surface-container-high px-1 rounded text-primary font-data-micro">BaseLLMProvider</code> in Python to
                    inject your internal algorithmic infrastructure seamlessly.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-space-sm z-10 w-full md:w-auto">
                  <a
                    href="https://github.com/pacificapilot/cli"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 md:flex-none px-space-md py-2.5 rounded bg-primary-container text-on-primary-container font-headline-md text-headline-md hover:bg-primary-fixed transition-colors font-medium flex items-center justify-center gap-space-xs shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">build</span>
                    <span>Build Custom Plugin</span>
                  </a>
                  <a
                    href="https://github.com/pacificapilot/cli"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 md:flex-none px-space-md py-2.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-headline-md text-headline-md transition-colors flex items-center justify-center gap-space-xs shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    <span>Plugin Marketplace</span>
                  </a>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-container-lowest mt-12 border-t border-surface-container-high/40">
        <div className="w-full px-margin-desktop py-space-xl flex flex-col md:flex-row items-center justify-between gap-space-md">
          <div className="flex flex-wrap items-center gap-space-md">
            <div className="flex items-center gap-space-xs">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              <span className="font-data-micro text-data-micro text-on-surface-variant uppercase tracking-wider">
                Network: Operational
              </span>
            </div>
            <div className="font-data-micro text-data-micro text-on-surface-variant bg-surface-container px-space-xs py-0.5 rounded">
              v0.8.4-stable
            </div>
            <div className="font-data-micro text-data-micro text-on-surface-variant">MIT Open Source License</div>
          </div>
          <div className="flex items-center gap-space-lg">
            <div className="hidden sm:flex items-center gap-space-xs text-on-surface-variant font-data-micro text-data-micro">
              <span className="bg-surface-container px-1 rounded text-on-surface">⌘K</span>
              <span>Command Palette</span>
              <span className="mx-space-xs opacity-40">/</span>
              <span className="bg-surface-container px-1 rounded text-on-surface">ESC</span>
              <span>Dismiss</span>
            </div>
            <div className="font-data-micro text-data-micro text-on-surface-variant">© 2025 PacificaPilot Systems Inc.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function IntegrationCard({
  item,
  isCopied,
  onCopy,
}: {
  item: IntegrationCardData;
  isCopied: boolean;
  onCopy: () => void;
}) {
  return (
    <article className="flex flex-col justify-between p-space-md rounded bg-surface-container-low hover:bg-surface-container transition-all group relative overflow-hidden shadow-sm border border-surface-container-high/30 hover:border-surface-container-high">
      <div className="flex flex-col gap-space-sm">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded bg-surface-container-high flex items-center justify-center text-primary-container group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors">
            {item.materialIcon ? (
              <span className="material-symbols-outlined text-[22px]">{item.materialIcon}</span>
            ) : (
              <span className="font-data-metric text-[1.1rem] font-bold">{item.iconText}</span>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="font-label-caps text-label-caps px-space-xs py-0.5 rounded bg-surface-container-highest text-primary-fixed-dim">
              {item.badge}
            </span>
            <span className="font-data-micro text-data-micro text-secondary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> {item.speed}
            </span>
          </div>
        </div>

        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface">{item.name}</h3>
          <p className="font-data-tabular text-data-tabular text-primary-container">{item.subtitle}</p>
        </div>

        <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{item.description}</p>

        {/* Technical Details Grid */}
        <div className="grid grid-cols-2 gap-space-xs p-space-xs rounded bg-surface-container-lowest font-data-micro text-data-micro">
          {item.telemetry.map((t, idx) => (
            <div key={idx} className="flex flex-col">
              <span className="text-outline">{t.label}</span>
              <span className={`font-semibold ${t.isHighlight ? "text-secondary" : "text-on-surface"}`}>{t.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer snippet & trigger */}
      <div className="mt-space-md pt-space-sm flex flex-col gap-space-xs">
        <div className="flex items-center justify-between bg-surface-container-lowest px-space-sm py-1.5 rounded">
          <code className="font-data-micro text-data-micro text-on-surface-variant truncate">{item.displayCmd}</code>
          <button
            onClick={onCopy}
            className={`transition-colors ${isCopied ? "text-secondary font-bold" : "text-outline hover:text-primary-container"}`}
            title="Copy Command"
          >
            <span className="material-symbols-outlined text-[16px]">{isCopied ? "done" : "content_copy"}</span>
          </button>
        </div>
        <div className="flex items-center justify-between text-body-sm">
          <a href="#quickstart" className="text-primary-container hover:text-primary font-label-md text-label-md flex items-center gap-1">
            {item.linkText}
          </a>
          <span className="font-data-micro text-data-micro text-outline">{item.version}</span>
        </div>
      </div>
    </article>
  );
}
