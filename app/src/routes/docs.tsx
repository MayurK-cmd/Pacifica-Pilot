import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CodeBlock } from "@/components/CodeBlock";
import LineSidebar from "@/components/LineSidebar.jsx";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs — PacificaPilot" },
      { name: "description", content: "Setup, configuration, memory, agents, tools, and command reference for PacificaPilot." },
      { property: "og:title", content: "PacificaPilot Documentation" },
      { property: "og:description", content: "Setup, config, agents, memory, tools, and commands." },
    ],
  }),
  component: Docs,
});

const sections = [
  { id: "install", label: "Installation" },
  { id: "quickstart", label: "Quick Start" },
  { id: "config", label: "Configuration" },
  { id: "providers", label: "AI Providers" },
  { id: "memory", label: "Memory (Supermemory)" },
  { id: "agents", label: "Agents" },
  { id: "tools", label: "Trading Tools" },
  { id: "commands", label: "Slash Commands" },
  { id: "telegram", label: "Telegram Remote" },
  { id: "risk", label: "Risk & Security" },
  { id: "tui", label: "The TUI" },
];

function Docs() {
  const [active, setActive] = useState("install");
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="mx-auto max-w-6xl px-6 py-12 grid md:grid-cols-[220px_1fr] gap-10">
        <aside className="md:sticky md:top-20 h-max">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-3">Docs</p>
          <LineSidebar
            items={sections.map((s) => s.label)}
            onItemClick={(index: number) => {
              setActive(sections[index].id);
              document.getElementById(sections[index].id)?.scrollIntoView({ behavior: "smooth" });
            }}
            accentColor="#3b82f6"
            textColor="#71717a"
            showIndex={false}
            fontSize={0.85}
          />
        </aside>

        <main className="space-y-16 max-w-3xl">
          <Section id="install" title="Installation">
            <p>PacificaPilot is a Python package. Requires Python 3.11+.</p>
            <CodeBlock code={`# Recommended — isolated with pipx\npipx install pacificapilot\n\n# Or plain pip\npip install pacificapilot\n\n# For development\ngit clone https://github.com/pacificapilot/pacificapilot\ncd pacificapilot\npip install -e ".[dev,telegram,memory]"`} lang="bash" />
          </Section>

          <Section id="quickstart" title="Quick Start">
            <p>Run the setup wizard once, then launch the TUI.</p>
            <CodeBlock code={`# First-run wizard\npacifica init\n#  → Pacifica keys (public + private Solana keypair)\n#  → AI provider (OpenRouter recommended for free tier)\n#  → Trading config (symbols, position size, confidence)\n#  → Supermemory (local, cloud, or skip)\n\n# Launch the TUI\npacifica start`} lang="bash" />
            <p>Inside the REPL you can type natural language or slash commands.</p>
          </Section>

          <Section id="config" title="Configuration">
            <p>Config lives at <span className="font-mono text-[color:var(--electric-bright)]">~/.pacificapilot/config.toml</span>. Secrets live at <span className="font-mono text-[color:var(--electric-bright)]">~/.pacificapilot/secrets.env</span> with <span className="font-mono">chmod 600</span>. Edit directly or use the CLI.</p>
            <CodeBlock code={`pacifica config set pacifica.api_key <key>\npacifica config set pacifica.api_secret <secret>\npacifica config set risk.max_position_usd 500\npacifica config set trading.symbols "BTC,ETH,SOL"\npacifica config set trading.dry_run true`} lang="bash" />
          </Section>

          <Section id="providers" title="AI Providers (BYOK)">
            <p>Configure at least one provider. Swap at runtime with <span className="font-mono text-[color:var(--electric-bright)]">/apikey</span> or <span className="font-mono text-[color:var(--electric-bright)]">/model</span>.</p>
            <CodeBlock code={`pacifica config set anthropic.api_key sk-ant-...\npacifica config set openai.api_key sk-...\npacifica config set google.api_key ...\npacifica config set openrouter.api_key ...`} lang="bash" />
            <p>Use Claude for reasoning, GPT for speed, Gemini for the free tier — no lock-in.</p>
          </Section>

          <Section id="memory" title="Memory (Supermemory)">
            <p>Memory is powered by <a className="text-[color:var(--electric-bright)] hover:text-foreground" href="https://supermemory.ai" target="_blank" rel="noreferrer">Supermemory</a>. Two deployment modes with the same SDK:</p>
            <CodeBlock code={`# Cloud mode — get a key from app.supermemory.ai\npacifica config set supermemory.api_key sm_...\npacifica config set supermemory.mode cloud\n\n# Local mode — zero data leaves your machine\nnpm i -g supermemory\nnpx supermemory local            # runs on localhost:6767\npacifica config set supermemory.mode local`} lang="bash" />
            <p>Five container tags: <span className="font-mono">decisions</span>, <span className="font-mono">patterns</span>, <span className="font-mono">preferences</span>, <span className="font-mono">performance</span>, <span className="font-mono">errors</span>. Three operations: <span className="font-mono">memory.add()</span>, <span className="font-mono">memory.recall()</span>, <span className="font-mono">memory.context()</span>.</p>
          </Section>

          <Section id="agents" title="Agents">
            <h3 className="text-lg font-semibold text-foreground">Chat Agent</h3>
            <p>Claude Code-style multi-turn tool loop. Runs up to 8 iterations per turn (configurable) before returning a final response.</p>
            <h3 className="text-lg font-semibold text-foreground pt-2">Loop Agent</h3>
            <p>Autonomous 24/7 monitoring on a configurable timer. Fetches live data, makes AI-driven trading decisions, and writes every decision + pattern to Supermemory automatically.</p>
            <CodeBlock code={`/start      # boot the autonomous Loop Agent\n/pause      # soft-pause\n/resume     # resume\n/stop       # stop entirely`} lang="bash" />
          </Section>

          <Section id="tools" title="Trading Tools">
            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ["place_order", "Open LONG/SHORT positions (with confirmation)"],
                    ["close_position", "Close a specific position"],
                    ["close_all_positions", "Flatten the entire book"],
                    ["cancel_order", "Cancel one resting order by ID (with confirmation)"],
                    ["cancel_all_orders", "Cancel all resting orders, optionally per symbol"],
                    ["set_position_tpsl", "Native exchange-side take-profit / stop-loss — survives restarts"],
                    ["get_positions", "Open positions with unrealized PnL"],
                    ["get_open_orders", "Resting limit/stop orders with prices and fill status"],
                    ["get_account_balance", "USDC balance, equity, available capital"],
                    ["get_market_price", "Price + RSI + MACD + Bollinger + volume + funding + regime"],
                    ["get_trade_history", "Past trades with PnL and duration"],
                    ["get_performance_metrics", "Win rate, Sharpe, profit factor, drawdown"],
                    ["get_market_regime", "Trending/ranging/volatile detection with guidance"],
                  ].map(([t, d]) => (
                    <tr key={t} className="border-b border-border last:border-b-0">
                      <td className="px-5 py-3 font-mono text-[color:var(--electric-bright)] w-72">{t}</td>
                      <td className="px-5 py-3 text-muted-foreground">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="commands" title="Slash Commands">
            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ["/help", "Show all commands"],
                    ["/config", "View or edit settings"],
                    ["/apikey", "Manage AI provider and Supermemory keys"],
                    ["/mode", "Switch testnet / mainnet"],
                    ["/status", "Agent status + decisions"],
                    ["/positions", "Open positions + live PnL"],
                    ["/account", "Account balances"],
                    ["/history", "Recent trades"],
                    ["/performance", "Win rate, Sharpe, drawdown"],
                    ["/analytics", "Monthly + per-symbol stats"],
                    ["/backtest", "Backtest a strategy"],
                    ["/portfolio", "Portfolio risk metrics"],
                    ["/start", "Boot the autonomous Loop Agent"],
                    ["/stop", "Stop the Loop Agent"],
                    ["/pause", "Soft-pause the loop"],
                    ["/resume", "Resume the loop"],
                    ["/loop", "Loop on / off"],
                    ["/remote", "Telegram remote mode + pairing code"],
                    ["/clear", "Clear chat context"],
                    ["/exit", "Exit"],
                  ].map(([c, d]) => (
                    <tr key={c} className="border-b border-border last:border-b-0">
                      <td className="px-5 py-3 font-mono text-[color:var(--electric-bright)] w-56">{c}</td>
                      <td className="px-5 py-3 text-muted-foreground">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="telegram" title="Telegram Remote">
            <p>Pair your Telegram chat once, then monitor positions and trade in natural language from your phone. Only paired chat IDs are allowed.</p>
            <CodeBlock code={`# In the TUI — enables remote mode and shows a one-time code\n/remote\n\n# In Telegram — open your bot and bind the chat\n/pair <code>\n\n# After pairing: all /commands work, plus plain-English chat`} lang="bash" />
            <p>You can also enable Telegram during the <span className="font-mono">pacifica init</span> setup wizard. Pairing codes expire — run <span className="font-mono">/remote</span> again for a fresh one.</p>
          </Section>

          <Section id="risk" title="Risk & Security">
            <p>Non-custodial, BYOK, human-in-the-loop. Dry-run and testnet by default.</p>
            <CodeBlock code={`[risk]\nmax_position_usd = 500\nmax_leverage = 3\ndaily_loss_limit_usd = 100\nrequire_confirmation = true\n\n[trading]\ndry_run = true\nnetwork = "testnet"`} lang="toml" />
            <ul className="list-disc pl-5 space-y-1">
              <li>Keys on your machine, nowhere else.</li>
              <li>Every trade action requires explicit yes/no.</li>
              <li>Dry-run mode simulates all trades.</li>
              <li>Testnet-first onboarding — no real money at risk.</li>
              <li>Secrets file at <span className="font-mono">~/.pacificapilot/secrets.env</span> with <span className="font-mono">chmod 600</span>.</li>
            </ul>
          </Section>

          <Section id="tui" title="The TUI">
            <p>Built with <a className="text-[color:var(--electric-bright)] hover:text-foreground" href="https://textual.textualize.io/" target="_blank" rel="noreferrer">Textual</a>. Fixed 3-panel layout:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="text-foreground">Header</span> — mode (testnet/mainnet), dry-run status, provider, live BTC/ETH prices.</li>
              <li><span className="text-foreground">Chat Panel</span> — conversation with the AI agent and command output.</li>
              <li><span className="text-foreground">Sidebar</span> — live status: agent state, positions, account, decisions, memory.</li>
              <li><span className="text-foreground">Input Bar</span> — natural language or <span className="font-mono">/commands</span> with fuzzy autocomplete.</li>
            </ul>
            <p>Keyboard: <span className="font-mono">Ctrl+P</span> palette, <span className="font-mono">Ctrl+M</span> provider switch.</p>
          </Section>
        </main>
      </div>
      <Footer />
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <div className="space-y-4 text-muted-foreground leading-relaxed text-[15px]">{children}</div>
    </section>
  );
}
