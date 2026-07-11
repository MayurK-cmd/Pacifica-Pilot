const ROWS = [
  { feature: 'Memory', pacifica: 'Supermemory (persistent, 5 containers, searchable)', other: 'None — start from zero every session' },
  { feature: 'AI Providers', pacifica: 'BYOK — 4 providers + OpenRouter pass-through', other: 'Usually one (OpenAI API)' },
  { feature: 'UI', pacifica: 'Textual TUI — 3-panel, keyboard-driven, slash commands', other: 'CLI output, basic REPL, or web dashboard' },
  { feature: 'Tool Loop', pacifica: 'Multi-turn agentic loop (8 iterations, tool-calling)', other: 'One-shot ask-and-respond' },
  { feature: 'Data Locality', pacifica: '100% local — your machine, your keys', other: 'Often requires hosted backend' },
  { feature: 'Technical Analysis', pacifica: 'RSI 5m/1h, MACD, Bollinger, volume, funding, basis', other: 'May not have real indicators' },
  { feature: 'Market Regime', pacifica: '6 regimes with specific trading guidance', other: 'Usually not detected' },
  { feature: 'Risk Management', pacifica: 'Kelly Criterion, SL/TP, trailing stops, correlation', other: 'Basic or none' },
  { feature: 'Backtesting', pacifica: 'Integrated backtester with Binance historical data', other: 'Separate tool needed' },
  { feature: 'Remote Access', pacifica: 'Optional Telegram bot with one-time pairing', other: 'Usually not available' },
  { feature: 'Install', pacifica: 'pip install pacificapilot', other: 'Complex Docker/Kubernetes setup' },
  { feature: 'Cost', pacifica: 'Free (MIT) + your API keys only', other: 'Monthly SaaS fees + API costs' },
];

export default function ComparisonSection() {
  return (
    <section id="comparison">
      <div className="section-eyebrow section-eyebrow-sage">
        HOW WE STACK UP
      </div>
      <div className="section-container">
        <p className="section-subtitle">
          Compared to other trading bots and AI agents, PacificaPilot is the first with persistent
          cross-session memory, full local operation, BYOK AI provider choice, and integrated backtesting.
        </p>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '140px' }}>Feature</th>
                <th style={{ color: 'var(--primary)', width: '40%' }}>PacificaPilot</th>
                <th>Other Trading Bots</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{r.feature}</td>
                  <td><span style={{ color: 'var(--primary)' }}>✓</span> {r.pacifica}</td>
                  <td style={{ fontStyle: 'italic' }}>{r.other}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
