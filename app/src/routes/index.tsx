import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Brain,
  MessageSquare,
  Database,
  LineChart,
  ShieldAlert,
  Wrench,
  Terminal as TerminalIcon,
  ArrowRight,
  Cpu,
  Network,
  Zap,
  Lock,
  Server,
  Repeat,
  Sparkles,
  Check,
  X,
} from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CodeBlock } from "@/components/CodeBlock";
import { GlowingCard } from "@/components/effects/GlowingCard";
import { Aurora } from "@/components/effects/Aurora";
import { SpotlightButton } from "@/components/effects/SpotlightButton";
import { BeamBorder } from "@/components/effects/BeamBorder";
import { DotGrid } from "@/components/effects/DotGrid";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PacificaPilot — AI trading agent with persistent memory" },
      { name: "description", content: "Local-first AI trading agent for Pacifica perpetual futures. Multi-provider LLMs, Supermemory persistence, agentic tool loop, 9 trading tools — all in your terminal. MIT." },
      { property: "og:title", content: "PacificaPilot — AI trading agent with persistent memory" },
      { property: "og:description", content: "The AI trading agent that actually learns from every trade. Local-first, BYOK, MIT." },
    ],
  }),
  component: Home,
});

const features = [
  { icon: Brain, title: "Persistent memory", body: "Supermemory stores every trade, pattern, and preference. Said once, remembered forever — across sessions and models." },
  { icon: MessageSquare, title: "Agentic tool loop", body: "Claude Code-style multi-turn reasoning. The AI gathers data, calls tools, reasons step-by-step, then responds." },
  { icon: Repeat, title: "Autonomous loop agent", body: "24/7 market monitoring with AI-driven trading decisions. Every decision written to memory automatically." },
  { icon: Wrench, title: "9 trading tools", body: "Place orders, close positions, check balances, run TA, detect market regime, pull performance metrics." },
  { icon: LineChart, title: "Live technical analysis", body: "RSI 5m/1h, MACD, Bollinger Bands, funding rates, volume signals, and regime detection wired into every prompt." },
  { icon: Cpu, title: "Multi-provider BYOK", body: "Anthropic, OpenAI, Google Gemini, or OpenRouter. Swap providers at runtime with /apikey. No lock-in." },
  { icon: ShieldAlert, title: "Human-in-the-loop", body: "Every order requires explicit yes/no. Dry-run by default. Testnet first. Nothing hits the exchange without you." },
  { icon: Lock, title: "Non-custodial & local", body: "Your keys stay on your machine. With local Supermemory mode, zero data ever leaves the box." },
  { icon: TerminalIcon, title: "Textual TUI", body: "Fixed 3-panel layout, slash autocomplete, live status sidebar, trade confirmation modals — not a debug REPL." },
];

const tools = [
  ["place_order", "Open LONG/SHORT positions (with confirmation)"],
  ["close_position", "Close a specific position"],
  ["close_all_positions", "Flatten the entire book (batch confirmation)"],
  ["get_positions", "View open positions with unrealized PnL"],
  ["get_account_balance", "Check USDC balance, equity, available capital"],
  ["get_market_price", "Full snapshot: price, RSI, MACD, Bollinger, volume, funding, regime"],
  ["get_trade_history", "Past trades with PnL, duration, entry/exit"],
  ["get_performance_metrics", "Win rate, Sharpe, profit factor, drawdown"],
  ["get_market_regime", "Detect trending/ranging/volatile with trading guidance"],
];

const nlExamples = [
  { q: `"open a $50 long on WIF"`, a: "Places order with confirmation" },
  { q: `"close all my positions"`, a: "Batch closes everything" },
  { q: `"how are BTC markets?"`, a: "Full market analysis with AI reasoning" },
  { q: `"what's my performance?"`, a: "Win rate, Sharpe, PnL" },
  { q: `"I never want to trade BONK"`, a: "Saved to Supermemory permanently" },
  { q: `"what did I trade last week?"`, a: "Recalled from Supermemory" },
];

const commands = [
  ["/start", "Boot the autonomous Loop Agent"],
  ["/stop", "Stop the Loop Agent"],
  ["/pause", "Soft-pause the loop"],
  ["/resume", "Resume the loop"],
  ["/config", "View/edit trading parameters"],
  ["/apikey", "Manage AI provider and Supermemory keys"],
  ["/mode", "Switch testnet/mainnet"],
  ["/status", "View system status"],
  ["/help", "Show all commands"],
];

const comparison: Array<[string, string, string]> = [
  ["Persistent memory", "Cross-session via Supermemory", "None — starts from zero"],
  ["AI providers", "BYOK: Anthropic, OpenAI, Google, OpenRouter", "Usually one vendor"],
  ["UI", "Textual TUI — 3-panel, live sidebar", "Basic CLI prints or web dashboard"],
  ["Reasoning", "Multi-turn agentic tool loop", "One-shot ask & respond"],
  ["Data locality", "100% local, non-custodial", "Often a hosted backend"],
  ["Technical analysis", "Live RSI, MACD, Bollinger, funding, regime", "Basic or none"],
  ["Install", "pip install pacificapilot", "Docker / Kubernetes setup"],
  ["Cost", "Free + your API keys", "Monthly SaaS fees"],
];

function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <QuickInstall />
      <WhatItDoes />
      <MemorySection />
      <HowItWorks />
      <NaturalLanguage />
      <ToolsSection />
      <ComparisonSection />
      <SecuritySection />
      <SetupGuide />
      <CommandsRef />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <Aurora />
      <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 border border-border rounded px-3 py-1 text-xs text-muted-foreground font-mono mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-primary blink" />
            v0.1 — open source, MIT · built for Supermemory hackathon
          </div>
          <h1 className="shimmer-text text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight">
            The AI trading agent that actually learns from every trade.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            PacificaPilot is a local-first agent for Pacifica perpetual futures. It combines
            multi-provider AI reasoning with live technical analysis, social sentiment, and
            persistent memory via Supermemory — so your agent remembers every trade, every
            preference, and every pattern across sessions.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <SpotlightButton href="#install">
              Get started <ArrowRight className="h-4 w-4" />
            </SpotlightButton>
            <SpotlightButton href="/docs" variant="ghost">
              Read the docs
            </SpotlightButton>
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-xs font-mono text-muted-foreground">
            <span>◆ No cloud dependency</span>
            <span>◆ Your keys, your machine</span>
            <span>◆ BYOK · 4 AI providers</span>
          </div>
        </div>

        <div className="mt-16">
          <TerminalHero />
        </div>
      </div>
    </section>
  );
}

const heroScript = [
  { p: "$ pacifica start", d: 500 },
  { o: "» loading providers ......... anthropic ✓ openai ✓ openrouter ✓", d: 300 },
  { o: "» connecting to pacifica dex ..... ok", d: 300 },
  { o: "» memory: supermemory://pacificapilot (1,204 entries)", d: 300 },
  { o: "» agent ready", d: 500 },
  { p: "> how are BTC markets right now, should I go long or short?", d: 800 },
  { o: "◆ BTC — $63,996  |  regime: weak uptrend (MACD bullish)", d: 350 },
  { o: "◆ RSI 5m: 35 (oversold)  |  RSI 1h: 51 (neutral)", d: 350 },
  { o: "◆ Bollinger: upper half, bandwidth 4.2%  |  funding 0.000013", d: 400 },
  { o: "◆ recall: last long here (Oct 12) closed +2.1%. context favorable.", d: 400 },
  { o: "→ NEUTRAL with slight bullish bias. no clean entry until RSI > 45.", d: 900 },
];

function TerminalHero() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= heroScript.length) {
      const t = setTimeout(() => setStep(0), 5000);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep(step + 1), heroScript[step].d);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="border border-border rounded bg-card shadow-[0_20px_80px_-20px_rgba(59,130,246,0.25)]">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-[color:var(--surface-soft)]">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        </div>
        <span className="ml-3 text-[11px] font-mono text-muted-foreground">
          ~/pacificapilot — pacifica
        </span>
      </div>
      <div className="p-6 font-mono text-[13px] leading-[1.7] min-h-[360px]">
        {heroScript.slice(0, step).map((l, i) => (
          <div key={i}>
            {"p" in l && l.p ? (
              <div className="text-foreground">
                <span className="text-primary">›</span> {l.p.replace("$ ", "").replace("> ", "")}
              </div>
            ) : (
              <div className="text-muted-foreground">{"o" in l ? l.o : ""}</div>
            )}
          </div>
        ))}
        <span className="inline-block h-4 w-2 bg-primary blink align-middle" />
      </div>
    </div>
  );
}

function QuickInstall() {
  const tabs = [
    { id: "pipx", label: "pipx", code: "pipx install pacificapilot" },
    { id: "pip", label: "pip", code: "pip install pacificapilot" },
    { id: "src", label: "from source", code: "git clone https://github.com/pacificapilot/pacificapilot\ncd pacificapilot && pip install -e '.[dev,telegram,memory]'" },
  ];
  const [tab, setTab] = useState(tabs[0].id);
  const active = tabs.find((t) => t.id === tab)!;
  return (
    <section id="install" className="mx-auto max-w-6xl px-6 py-20">
      <div className="grid md:grid-cols-2 gap-10 items-start">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-3">01 — Install</p>
          <h2 className="text-3xl md:text-4xl font-bold">One command. Runs locally.</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed max-w-md">
            PacificaPilot ships as a Python package (3.11+). It runs entirely on your machine —
            your keys never leave the box. Run <span className="font-mono text-[color:var(--electric-bright)]">pacifica init</span> once
            to set keys, config, and optional memory.
          </p>
        </div>
        <div>
          <div className="flex items-center border-b border-border mb-3">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-xs font-mono transition-colors -mb-px border-b ${
                  tab === t.id
                    ? "text-foreground border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <BeamBorder>
            <CodeBlock code={active.code} lang="bash" className="border-0" />
          </BeamBorder>
        </div>
      </div>
    </section>
  );
}

function WhatItDoes() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-2xl mb-12">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-3">02 — Capabilities</p>
        <h2 className="text-3xl md:text-4xl font-bold">What it does</h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          A focused set of primitives — not a bloated platform. Each capability composes
          into the agent's tool loop.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <GlowingCard key={f.title} className="p-6">
            <f.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
            <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
          </GlowingCard>
        ))}
      </div>
    </section>
  );
}

const memoryContainers = [
  { tag: "decisions", body: "LONG BTC at $50k, confidence 75%, RSI was 35", w: "Loop Agent", r: "Chat Agent" },
  { tag: "patterns", body: "Funding rate spike on ETH: 0.003 at 14:30", w: "Loop Agent", r: "Both" },
  { tag: "preferences", body: "User never wants to trade BONK", w: "Chat Agent", r: "Chat Agent" },
  { tag: "performance", body: "Daily: 3 trades, +$12.50 USDC, 67% win rate", w: "Loop Agent", r: "Chat Agent" },
  { tag: "errors", body: "Binance fallback activated for BTC at 14:30", w: "Both", r: "Both" },
];

function MemorySection() {
  return (
    <section className="relative overflow-hidden py-24 border-y border-border">
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-3">03 — The Supermemory Advantage</p>
            <h2 className="text-3xl md:text-4xl font-bold">Memory that survives restarts.</h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              Every other trading agent starts from zero every session. Open the CLI, and the
              AI has no idea what it traded yesterday, what patterns it noticed, or what you
              told it. This causes hallucination, repetitive questions, and zero learning.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              PacificaPilot integrates <a href="https://supermemory.ai" target="_blank" rel="noreferrer" className="text-[color:var(--electric-bright)] hover:text-foreground">Supermemory</a>{" "}
              as a persistent, searchable memory layer. Every trade decision, pattern, and
              preference is stored under container tags and injected into the AI's system
              prompt on every session.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="border border-border rounded p-4">
                <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">Cloud mode</div>
                <p className="text-sm text-foreground">Hosted by Supermemory — no local process needed.</p>
              </div>
              <div className="border border-border rounded p-4">
                <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">Local mode</div>
                <p className="text-sm text-foreground">Runs on <span className="font-mono">localhost:6767</span>. Zero data leaves.</p>
              </div>
            </div>
          </div>

          <div className="border border-border rounded bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-[color:var(--surface-soft)] flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">memory containers</span>
              <Database className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="divide-y divide-[color:var(--border)]">
              {memoryContainers.map((m) => (
                <div key={m.tag} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-[color:var(--electric-bright)]">{m.tag}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      w: {m.w}  ·  r: {m.r}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground font-mono">"{m.body}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="relative overflow-hidden py-24">
      <DotGrid />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="max-w-2xl mb-14">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-3">04 — Architecture</p>
          <h2 className="text-3xl md:text-4xl font-bold">A two-agent loop</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            A <strong className="text-foreground">Loop Agent</strong> runs autonomously on a
            timer, fetching live data and making AI-driven decisions. A{" "}
            <strong className="text-foreground">Chat Agent</strong> handles your prompts with
            a multi-turn tool loop. Both share the same trading core and write to Supermemory.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <ArchNode icon={Brain} title="Chat Agent" body="Multi-turn tool loop. Gathers data, reasons step-by-step, then responds. Up to 8 iterations per turn." step="01" />
          <ArchNode icon={Repeat} title="Loop Agent" body="Autonomous 24/7 monitoring. Fetches data, decides trades, writes every decision and pattern to memory." step="02" />
          <ArchNode icon={Network} title="Memory Core" body="Supermemory — 5 container tags, semantic recall, profile injection. Cloud or fully local." step="03" />
        </div>

        <div className="mt-12 border border-border rounded bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-[color:var(--surface-soft)]">
            <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">agentic tool loop — one turn</span>
          </div>
          <pre className="p-5 text-[12px] font-mono text-muted-foreground overflow-x-auto leading-6">
{`User → "How are BTC markets, should I trade?"
   ↓
[1] AI decides to call get_market_price("BTC")
[2] Execute → { price, RSI, MACD, Bollinger, volume, funding }
[3] Feed result back to AI (not user)
[4] AI calls get_market_regime("BTC")
[5] Execute → { regime: "weak uptrend", guidance: ... }
[6] Feed result back to AI
[7] AI has full context — produces final response
   ↓
User ← "BTC is in a weak uptrend. RSI neutral, MACD bullish.
       Volume confirms. I'd hold for now."`}
          </pre>
        </div>
      </div>
    </section>
  );
}

function ArchNode({ icon: Icon, title, body, step }: { icon: typeof Brain; title: string; body: string; step: string }) {
  return (
    <div className="border border-border bg-card rounded p-6 relative">
      <span className="absolute top-4 right-4 text-[10px] font-mono text-muted-foreground">{step}</span>
      <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

function NaturalLanguage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-2xl mb-12">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-3">05 — Natural Language</p>
        <h2 className="text-3xl md:text-4xl font-bold">Talk to it like a co-trader.</h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          No DSL, no rigid syntax. Slash commands when you want structure — plain English for
          everything else.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {nlExamples.map((ex) => (
          <div key={ex.q} className="border border-border rounded p-4 bg-card flex items-start justify-between gap-4">
            <span className="font-mono text-sm text-foreground">{ex.q}</span>
            <span className="text-xs text-muted-foreground text-right whitespace-nowrap flex items-center gap-1">
              <ArrowRight className="h-3 w-3 text-primary" /> {ex.a}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ToolsSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-2xl mb-12">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-3">06 — Tools</p>
        <h2 className="text-3xl md:text-4xl font-bold">9 tools at your command</h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          The AI decides which of these to call — you never have to remember function
          signatures. Trade actions always require confirmation.
        </p>
      </div>
      <div className="border border-border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-[color:var(--surface-soft)]">
              <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground w-64">Tool</th>
              <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">What it does</th>
            </tr>
          </thead>
          <tbody>
            {tools.map(([t, d]) => (
              <tr key={t} className="border-b border-border last:border-b-0 hover:bg-[color:var(--surface-soft)]">
                <td className="px-5 py-3 font-mono text-[color:var(--electric-bright)]">{t}</td>
                <td className="px-5 py-3 text-muted-foreground">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-2xl mb-12">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-3">07 — Comparison</p>
        <h2 className="text-3xl md:text-4xl font-bold">Why it's different</h2>
      </div>
      <div className="border border-border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-[color:var(--surface-soft)] font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="text-left px-5 py-3">Feature</th>
              <th className="text-left px-5 py-3">PacificaPilot</th>
              <th className="text-left px-5 py-3">Other bots</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map(([f, a, b]) => (
              <tr key={f} className="border-b border-border last:border-b-0">
                <td className="px-5 py-3 text-foreground font-medium">{f}</td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-2 text-foreground">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    {a}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <X className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                    {b}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const security = [
  { icon: Lock, title: "Non-custodial", body: "Keys stored on your machine, nowhere else." },
  { icon: Zap, title: "BYOK AI", body: "Your API keys go directly to your provider — no proxy." },
  { icon: ShieldAlert, title: "Confirmation prompts", body: "Every trade action requires explicit yes/no." },
  { icon: Sparkles, title: "Dry-run default", body: "All trades simulated by default until you flip the switch." },
  { icon: Server, title: "Testnet first", body: "New setups start on testnet — no real money at risk." },
  { icon: Database, title: "Memory optional", body: "Supermemory is additive. Trading works without it." },
];

function SecuritySection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-2xl mb-12">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-3">08 — Security</p>
        <h2 className="text-3xl md:text-4xl font-bold">Your keys. Your machine. Your trades.</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {security.map((s) => (
          <div key={s.title} className="border border-border bg-card rounded p-5">
            <s.icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SetupGuide() {
  const steps = [
    { t: "Install the CLI", code: "pipx install pacificapilot" },
    { t: "Run the setup wizard", code: "pacifica init\n# → Pacifica keys → AI provider → config → Supermemory" },
    { t: "Add an AI provider", code: "pacifica config set anthropic.api_key sk-ant-..." },
    { t: "Launch the TUI", code: "pacifica start" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-2xl mb-12">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-3">09 — Setup</p>
        <h2 className="text-3xl md:text-4xl font-bold">Four steps to first trade</h2>
      </div>
      <div className="space-y-6">
        {steps.map((s, i) => (
          <div key={i} className="grid md:grid-cols-[64px_1fr_1fr] gap-6 items-start">
            <div className="font-mono text-sm text-primary border border-border rounded px-3 py-2 text-center bg-card">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{s.t}</h3>
            </div>
            <CodeBlock code={s.code} lang="bash" />
          </div>
        ))}
      </div>
    </section>
  );
}

function CommandsRef() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-2xl mb-12">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-3">10 — Reference</p>
        <h2 className="text-3xl md:text-4xl font-bold">Slash commands</h2>
      </div>
      <div className="border border-border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-[color:var(--surface-soft)]">
              <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground w-48">Command</th>
              <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Description</th>
            </tr>
          </thead>
          <tbody>
            {commands.map(([cmd, desc]) => (
              <tr key={cmd} className="border-b border-border last:border-b-0 hover:bg-[color:var(--surface-soft)]">
                <td className="px-5 py-3 font-mono text-[color:var(--electric-bright)]">{cmd}</td>
                <td className="px-5 py-3 text-muted-foreground">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-10 flex items-center gap-3">
        <SpotlightButton href="/docs">
          Full documentation <ArrowRight className="h-4 w-4" />
        </SpotlightButton>
        <SpotlightButton href="/integrations" variant="ghost">
          <TerminalIcon className="h-4 w-4" />
          Browse integrations
        </SpotlightButton>
      </div>
    </section>
  );
}
