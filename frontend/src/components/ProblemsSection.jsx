const PROBLEMS = [
  {
    quote: '"Why did you make that trade last Tuesday?" "Based on the RSI being overbought, I decided to short BTC." — The trade never happened. The AI hallucinated it.',
    solution: 'Supermemory stores every trade decision, pattern, and preference. When you ask about past trades, the AI searches memory and responds from real data — not imagination.',
  },
  {
    quote: 'Session 1: "I never want to trade SOL." Session 2: "I told you last time, no SOL." Session 3: "WHY DO I KEEP SAYING THIS."',
    solution: 'Preferences are stored in Supermemory and injected into the AI\'s system prompt at every session start. Said once, remembered forever.',
  },
  {
    quote: 'CLI trading tools feel like debug sessions — raw JSON output, no visual hierarchy, no sense of what the agent is doing.',
    solution: 'A Textual TUI with 3-panel layout: styled chat panel, live sidebar with positions and account, slash autocomplete with 19 commands, and keyboard-driven workflows (Ctrl+P palette, Ctrl+M provider switch, Ctrl+D dry run toggle, and more).',
  },
  {
    quote: 'Most trading bots tie you to one AI provider or require a hosted backend with monthly subscriptions.',
    solution: 'BYOK — Bring Your Own Key. Use Anthropic, OpenAI, Google Gemini, or OpenRouter. Swap any time with Ctrl+M or /apikey. No accounts, no lock-in, no recurring fees.',
  },
  {
    quote: 'Most trading bots are black boxes — you don\'t know why they made a trade. They show you a result with no reasoning.',
    solution: 'The agentic tool loop shows every step. The AI explains what it\'s doing, calls tools to gather data, shows results, and explains its reasoning. Every decision is logged to Supermemory with the full rationale.',
  },
];

export default function ProblemsSection() {
  return (
    <section id="problems">
      <div className="section-eyebrow section-eyebrow-olive">
        WHY PACIFICAPILOT?
      </div>
      <div className="section-container">
        <p className="section-subtitle">
          Every trading agent starts from zero every session. PacificaPilot fixes that — with persistent memory,
          transparent reasoning, and complete data privacy.
        </p>
        <div className="problems-grid">
          {PROBLEMS.map((p, i) => (
            <div key={i} className="problem-card">
              <div className="problem-q">
                <p className="problem-quote">{p.quote}</p>
              </div>
              <div className="problem-solution">
                <span>{p.solution}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
