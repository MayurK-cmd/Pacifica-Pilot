import { Link } from "react-router-dom";
import { Activity, ArrowRight, Bell, Brain, Lock, Moon, ShieldAlert, Sun, Terminal, Wrench, LineChart, Cpu } from "lucide-react";
import { ArchitectureDiagram } from "../components/illustrations/ArchitectureDiagram";
import { useTheme, useThemeToggle } from "../lib/theme";

const features = [
  { icon: Brain, title: "Persistent memory", body: "Every trade, pattern and preference is stored and recalled across sessions — set a rule once and the agent keeps it." },
  { icon: Terminal, title: "Terminal-native agent", body: "A chat agent for natural-language commands plus an autonomous loop agent that watches markets on a timer." },
  { icon: Wrench, title: "9 trading tools", body: "Place and close orders, read positions and balances, pull market snapshots, regime checks and performance metrics." },
  { icon: LineChart, title: "Live technicals", body: "RSI, MACD, Bollinger Bands, funding rates, volume signals and regime detection feed every decision." },
  { icon: Cpu, title: "Bring your own key", body: "Anthropic, OpenAI, Google Gemini or OpenRouter — your AI keys go to your provider, nothing else." },
  { icon: Lock, title: "Non-custodial", body: "Solana keys stay on your machine. Every order needs an explicit yes, dry-run is on by default, testnet first." },
  { icon: Bell, title: "Telegram remote", body: "Pair a bot and monitor or command the agent from your phone with the same confirmation rules." },
  { icon: ShieldAlert, title: "Guardrailed autonomy", body: "Max position size, minimum confidence, stop-loss and take-profit bounds constrain every autonomous action." },
];

const steps = [
  { cmd: "pip install pacificapilot", text: "Install the CLI from PyPI." },
  { cmd: "pacifica init", text: "Guided setup: Pacifica keys, AI provider, risk profile, memory, Telegram." },
  { cmd: "pacifica start", text: "Launch the trading terminal. Type /help or just chat naturally." },
];

export function Landing() {
  const theme = useTheme();
  const toggleTheme = useThemeToggle();

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            <Activity size={16} aria-hidden />
          </span>
          <span className="text-sm font-bold tracking-wide">PACIFICA PILOT</span>
          <nav className="ml-6 hidden items-center gap-4 text-xs font-medium text-muted sm:flex" aria-label="Site">
            <Link to="/dashboard" className="hover:text-ink">Dashboard</Link>
            <Link to="/markets" className="hover:text-ink">Markets</Link>
            <Link to="/portfolio" className="hover:text-ink">Portfolio</Link>
            <Link to="/docs" className="hover:text-ink">Docs</Link>
          </nav>
          <span className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
              className="rounded border border-line p-1.5 text-muted hover:text-ink"
            >
              {theme === "light" ? <Moon size={14} aria-hidden /> : <Sun size={14} aria-hidden />}
            </button>
            <Link
              to="/dashboard"
              className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
            >
              Open app
            </Link>
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        <section className="py-14 md:py-20">
          <p className="eyebrow">AI trading agent for Pacifica perpetuals</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight md:text-5xl">
            Your terminal co-pilot for perpetual futures.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted md:text-base">
            PacificaPilot runs on your machine, watches Pacifica markets around the clock,
            remembers what it learns, and asks before it ever trades. Your keys never leave
            your computer.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
            >
              Open the dashboard <ArrowRight size={15} aria-hidden />
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center gap-1.5 rounded border border-line bg-paper px-4 py-2 text-sm font-semibold"
            >
              Learn how trading works
            </Link>
          </div>
          <div className="card card-pad mt-8 font-mono text-xs" aria-label="Quick install">
            <p className="text-muted">$ get started in your terminal</p>
            <p className="mt-1">pip install pacificapilot <span className="text-muted">→</span> pacifica init <span className="text-muted">→</span> pacifica start</p>
          </div>
        </section>

        <section className="card card-pad" aria-label="Architecture">
          <ArchitectureDiagram />
        </section>

        <section className="border-t border-line py-10" aria-label="Features">
          <h2 className="text-xl font-bold">What the agent does</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title} className="card card-pad">
                <Icon size={16} aria-hidden className="text-teal" />
                <h3 className="mt-2 text-[13px] font-bold">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-line py-10" aria-label="How it works">
          <h2 className="text-xl font-bold">Three commands to running</h2>
          <ol className="mt-4 space-y-2">
            {steps.map((s, i) => (
              <li key={s.cmd} className="card card-pad flex flex-wrap items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                  {i + 1}
                </span>
                <code className="rounded bg-wash px-2 py-1 font-mono text-xs ring-1 ring-inset ring-line">{s.cmd}</code>
                <span className="text-xs text-muted">{s.text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-line py-10" aria-label="Safety">
          <h2 className="text-xl font-bold">Safety model</h2>
          <ul className="mt-4 grid gap-2 text-xs leading-relaxed text-muted sm:grid-cols-2">
            <li className="card card-pad">Keys are stored locally with restricted file permissions and are never uploaded anywhere.</li>
            <li className="card card-pad">Paper trading is on by default; live orders always require explicit confirmation.</li>
            <li className="card card-pad">Testnet is the default environment; mainnet requires a deliberate, confirmed switch.</li>
            <li className="card card-pad">Every autonomous trade is bounded by your max position size, confidence threshold and stop rules.</li>
          </ul>
          <p className="mt-4 text-xs text-muted">
            Perpetual futures carry significant risk, including total loss through liquidation.
            This software is experimental and educational — not financial advice.
          </p>
        </section>
      </main>

      <footer className="border-t border-line bg-paper">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-4 text-xs text-muted">
          <span>PacificaPilot — MIT licensed, open source.</span>
          <span className="ml-auto flex gap-3">
            <Link to="/dashboard" className="hover:text-ink">Dashboard</Link>
            <Link to="/docs" className="hover:text-ink">Docs</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
