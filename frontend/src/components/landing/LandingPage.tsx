import { CodeBlock } from "./CodeBlock";

const GITHUB_URL = "https://github.com/pacificapilot/pacificapilot";
const DOCS_URL = "https://github.com/pacificapilot/pacificapilot#readme";

const NAV = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#setup", label: "Setup" },
  { href: "#commands", label: "Commands" },
];

const FEATURES = [
  {
    title: "BYOK — bring your own model",
    body: "Plug in Anthropic, OpenAI, Google, or any OpenRouter model. Keys live in a local config file, never on a server.",
    tag: "byok",
  },
  {
    title: "Non-custodial by design",
    body: "Your Pacifica trading key is generated and used locally. PacificaPilot signs orders on your machine — never transmitted, never logged.",
    tag: "self-custody",
  },
  {
    title: "On-chain decision logging",
    body: "Every autonomous decision and its reasoning is hashed and written to Solana devnet. Auditable, reproducible, tamper-evident.",
    tag: "verifiable",
  },
  {
    title: "Testnet-first, explicit mainnet",
    body: "Boots in testnet mode by default. Mainnet requires a deliberate /mode mainnet acknowledgement — no accidental real money.",
    tag: "safety",
  },
  {
    title: "Local SQLite + JSON",
    body: "Trades, positions, and chat history persist in a local SQLite database. No cloud, no account, no telemetry.",
    tag: "local-first",
  },
  {
    title: "Terminal + optional Telegram",
    body: "Run it where you already are: a TTY. Optionally bind a Telegram chat for remote read-only status and confirmations.",
    tag: "ergonomic",
  },
];

const COMMANDS: { cmd: string; desc: string }[] = [
  { cmd: "/config", desc: "Edit trading parameters, risk limits, and the active model." },
  { cmd: "/apikey", desc: "Add or rotate provider API keys (Anthropic, OpenAI, Google, OpenRouter)." },
  { cmd: "/mode", desc: "Switch between testnet and mainnet. Mainnet requires explicit confirmation." },
  { cmd: "/status", desc: "Print account equity, margin, open PnL, and the Loop Agent heartbeat." },
  { cmd: "/positions", desc: "List open perpetual positions with size, entry, mark, and unrealized PnL." },
  { cmd: "/history", desc: "Show recent fills, agent decisions, and the on-chain log signatures." },
  { cmd: "/pause", desc: "Halt the autonomous Loop Agent. Chat Agent remains available." },
  { cmd: "/resume", desc: "Resume the Loop Agent on its configured schedule." },
  { cmd: "/remote", desc: "Bind / unbind a Telegram chat for remote status and confirmations." },
  { cmd: "/help", desc: "List all commands with usage examples." },
];

const SETUP_STEPS = [
  {
    title: "Install the CLI",
    body: "Recommended: pipx, which isolates pacificapilot in its own virtualenv. Plain pip also works.",
    code: "# isolated install (recommended)\npipx install pacificapilot\n\n# or, with pip\npip install --user pacificapilot",
  },
  {
    title: "Initialize a workspace",
    body: "Creates ~/.pacificapilot with a config file, an empty SQLite database, and a fresh local keypair scaffold.",
    code: "pacifica init",
  },
  {
    title: "Add your Pacifica trading key",
    body: "Paste an existing Solana keypair or let pacifica generate one. The private key is written only to your local config — never transmitted.",
    code: "pacifica keys add --pacifica\n# follow the prompt to paste or generate",
  },
  {
    title: "Add an AI provider key",
    body: "Choose your model provider. You can register more than one and switch with /apikey at runtime.",
    code: "pacifica keys add --provider anthropic\npacifica keys add --provider openai\npacifica keys add --provider openrouter",
  },
  {
    title: "Stay on testnet",
    body: "Testnet is the default. Confirm it before launching the agent. Switch to mainnet later with /mode mainnet.",
    code: "pacifica mode testnet",
  },
  {
    title: "Start the agent",
    body: "Boots the Loop Agent on its schedule and drops you into the Chat Agent prompt for manual control.",
    code: "pacifica start",
  },
];

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.18c-3.2.69-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.07 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.6.23 2.78.11 3.07.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56C20.22 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-primary/40 bg-primary/10 font-mono text-[13px] font-semibold text-primary">
        pp
      </span>
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <a href="#top" className="flex items-center gap-2.5">
          <Logo />
          <span className="font-mono text-sm font-semibold tracking-tight">PacificaPilot</span>
        </a>
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <GithubIcon className="h-3.5 w-3.5" />
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden border-b border-border/60">
      <div className="grid-bg absolute inset-0 opacity-60" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, var(--accent-glow) 0%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-20 md:pt-28">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
          v0 · testnet-first · MIT
        </div>
        <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          A terminal-native AI trading agent for{" "}
          <span className="text-primary">Pacifica Perpetuals</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          A fully terminal-based, non-custodial AI trading agent for Pacifica Perpetuals —
          your keys, your machine, your rules. Open source. No cloud. No account.
        </p>

        <div className="mt-10 max-w-2xl">
          <CodeBlock label="install" code="$ pipx install pacificapilot" />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <GithubIcon className="h-4 w-4" />
            View on GitHub
          </a>
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card/40 px-4 py-2.5 text-sm text-foreground transition-colors hover:border-primary/40"
          >
            Read the docs
            <ArrowIcon className="h-3.5 w-3.5" />
          </a>
          <a
            href="#setup"
            className="inline-flex items-center gap-2 px-2 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Or jump to setup
            <ArrowIcon className="h-3.5 w-3.5" />
          </a>
        </div>

        <dl className="mt-16 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-4 border-t border-border/60 pt-8 text-sm md:grid-cols-4">
          {[
            ["DEX", "Pacifica"],
            ["Chain", "Solana"],
            ["Custody", "Self"],
            ["License", "MIT"],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {k}
              </dt>
              <dd className="mt-1 font-mono text-base text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="mb-12 max-w-2xl">
      <div className="font-mono text-[11px] uppercase tracking-wider text-primary">{eyebrow}</div>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
      {desc ? <p className="mt-4 text-muted-foreground">{desc}</p> : null}
    </div>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <SectionHeader
          eyebrow="// architecture"
          title="Two agents, one process."
          desc="A scheduled Loop Agent makes autonomous decisions in the background. A Chat Agent gives you a conversational REPL — every real order is confirmed before it hits the wire."
        />

        <div className="grid gap-5 md:grid-cols-2">
          <article className="relative rounded-lg border border-border bg-card/40 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                agent · loop
              </div>
              <div className="font-mono text-[11px] text-primary">autonomous</div>
            </div>
            <h3 className="text-xl font-semibold">Loop Agent</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Runs on a tick interval. Pulls market state, asks the model for a trade thesis,
              applies your risk limits, and submits orders. Each decision is appended to the
              local journal and hashed on-chain.
            </p>
            <ul className="mt-5 space-y-2 font-mono text-[13px] text-muted-foreground">
              <li>· schedule · cron-like tick</li>
              <li>· input · market + positions + memory</li>
              <li>· output · order intent + reasoning</li>
              <li>· audit · sha256 → solana devnet memo</li>
            </ul>
          </article>

          <article className="relative rounded-lg border border-border bg-card/40 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                agent · chat
              </div>
              <div className="font-mono text-[11px] text-primary">interactive</div>
            </div>
            <h3 className="text-xl font-semibold">Chat Agent</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              A natural-language REPL in your terminal. Ask questions, request trades, or
              issue /commands. Every real order requires an explicit yes/no confirmation —
              optionally mirrored to a Telegram chat you control.
            </p>
            <ul className="mt-5 space-y-2 font-mono text-[13px] text-muted-foreground">
              <li>· surface · tty + optional telegram</li>
              <li>· input · prompts + /commands</li>
              <li>· guard · y/n before any signed tx</li>
              <li>· memory · shared sqlite journal</li>
            </ul>
          </article>
        </div>

        <div className="mt-8">
          <CodeBlock
            label="example · chat agent"
            code={`❯ pacifica start
pacificapilot · testnet · loop=ON · model=claude-sonnet-4

❯ short sol 0.5x, tight stop
→ proposal: open SHORT SOL-PERP  size=0.5  lev=1x  stop=+1.2%
  reasoning: 1h trend down, funding +0.011%/h, vol expanding
  confirm? [y/N] y
✓ signed locally · tx 4f7q...e2 · journaled #1834`}
          />
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <SectionHeader
          eyebrow="// features"
          title="Built for traders who actually read the code."
        />
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex flex-col bg-background p-6 transition-colors hover:bg-card/40"
            >
              <div className="font-mono text-[11px] uppercase tracking-wider text-primary">
                {f.tag}
              </div>
              <h3 className="mt-3 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Setup() {
  return (
    <section id="setup" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <SectionHeader
          eyebrow="// setup"
          title="From zero to your first paper trade in six steps."
          desc="Python 3.10+ recommended. macOS, Linux, and WSL2 are tested."
        />
        <ol className="space-y-10">
          {SETUP_STEPS.map((s, i) => (
            <li
              key={s.title}
              className="grid gap-6 border-l border-border pl-6 md:grid-cols-[1fr_1.4fr] md:gap-10 md:pl-8"
            >
              <div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-primary">
                  step {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
              <CodeBlock label="shell" code={s.code} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Commands() {
  return (
    <section id="commands" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <SectionHeader
          eyebrow="// commands"
          title="Slash commands available in the Chat Agent."
          desc="Type /help inside the agent for the live reference."
        />
        <div className="overflow-hidden rounded-lg border border-border bg-card/30">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-background/40">
              <tr className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="w-[180px] border-b border-border px-5 py-3 font-medium">command</th>
                <th className="border-b border-border px-5 py-3 font-medium">description</th>
              </tr>
            </thead>
            <tbody>
              {COMMANDS.map((c) => (
                <tr key={c.cmd} className="border-b border-border/60 last:border-b-0">
                  <td className="px-5 py-3.5 font-mono text-[13px] text-primary">{c.cmd}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{c.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-background">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <div className="font-mono text-sm font-semibold">PacificaPilot</div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                MIT licensed · v0
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <GithubIcon className="h-4 w-4" /> GitHub
            </a>
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Docs
            </a>
            <a
              href="https://pacifica.fi"
              target="_blank"
              rel="noreferrer noopener"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              pacifica.fi
            </a>
          </div>
        </div>

        <div className="mt-10 rounded-md border border-border/60 bg-card/30 p-5 text-xs leading-relaxed text-muted-foreground">
          <span className="font-mono uppercase tracking-wider text-foreground">Disclaimer · </span>
          Trading perpetual futures involves substantial risk and may result in the loss of all
          capital deployed. PacificaPilot is independent open-source software provided as-is,
          without warranty of any kind. It is not affiliated with or endorsed by Pacifica.
          Nothing here is financial advice. You are solely responsible for any orders signed and
          submitted from your machine.
        </div>

        <div className="mt-8 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          © {new Date().getFullYear()} pacificapilot contributors
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Setup />
        <Commands />
      </main>
      <Footer />
    </div>
  );
}