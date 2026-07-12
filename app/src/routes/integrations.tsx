import { createFileRoute } from "@tanstack/react-router";
import {
  Brain,
  Sparkles,
  Bot,
  Cpu,
  LineChart,
  Coins,
  Radar,
  Send,
  Database,
  Terminal,
  HardDrive,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { GlowingCard } from "@/components/effects/GlowingCard";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — PacificaPilot" },
      { name: "description", content: "All the providers and services PacificaPilot connects to: AI models, Pacifica DEX, Solana, Elfa, Telegram, Supermemory." },
      { property: "og:title", content: "PacificaPilot Integrations" },
      { property: "og:description", content: "AI providers, DEX, on-chain, social, memory, and UI integrations." },
    ],
  }),
  component: Integrations,
});

const groups = [
  {
    title: "AI Providers (BYOK)",
    items: [
      { icon: Sparkles, name: "Anthropic", desc: "Claude models via the official API. Best for deep reasoning about market context." },
      { icon: Bot, name: "OpenAI", desc: "GPT-4o and o-series reasoning models. Fastest tool-calling." },
      { icon: Cpu, name: "Google", desc: "Gemini models via Vertex or AI Studio. Free tier available." },
      { icon: Brain, name: "OpenRouter", desc: "Route to any hosted model with a single key. Recommended default." },
    ],
  },
  {
    title: "Trading & On-chain",
    items: [
      { icon: LineChart, name: "Pacifica DEX", desc: "Native REST integration for perpetual futures orders, positions, and account state." },
      { icon: Coins, name: "Solana", desc: "On-chain settlement, wallet signing via solders + base58, and memo logging." },
    ],
  },
  {
    title: "Market Data & Signals",
    items: [
      { icon: LineChart, name: "Pacifica API", desc: "Live prices, order book, funding rates for supported perpetual markets." },
      { icon: HardDrive, name: "Binance Fallback", desc: "Automatic fallback for market data resiliency when Pacifica is unreachable." },
      { icon: Radar, name: "Elfa AI", desc: "Realtime social sentiment and narrative detection." },
    ],
  },
  {
    title: "Memory",
    items: [
      { icon: Database, name: "Supermemory (Cloud)", desc: "Hosted, persistent, semantically searchable memory — no local process needed." },
      { icon: HardDrive, name: "Supermemory (Local)", desc: "Runs on localhost:6767. Zero data leaves your machine." },
    ],
  },
  {
    title: "Comms & UI",
    items: [
      { icon: Send, name: "Telegram", desc: "Optional bridge for trade confirmations and alerts from your phone." },
      { icon: Terminal, name: "Textual TUI", desc: "3-panel terminal UI with autocomplete, sidebar, and modals." },
    ],
  },
];

function Integrations() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-3">
          Integrations
        </p>
        <h1 className="text-4xl md:text-5xl font-bold max-w-2xl">
          Wire PacificaPilot into your existing stack
        </h1>
        <p className="mt-5 text-muted-foreground max-w-2xl leading-relaxed">
          Every integration is optional and configured with a single key. Start with an AI
          provider and Pacifica — add the rest as you need them.
        </p>

        <div className="mt-16 space-y-14">
          {groups.map((g) => (
            <div key={g.title}>
              <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-5">
                {g.title}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((it) => (
                  <GlowingCard key={it.name} className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 border border-border rounded flex items-center justify-center bg-background">
                        <it.icon className="h-4 w-4 text-[color:var(--electric-bright)]" strokeWidth={1.5} />
                      </div>
                      <h3 className="text-base font-semibold">{it.name}</h3>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{it.desc}</p>
                  </GlowingCard>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
