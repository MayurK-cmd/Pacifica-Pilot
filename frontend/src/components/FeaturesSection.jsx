const FEATURES = [
  { title: 'Persistent Memory', desc: 'Supermemory integration with 5 container tags (decisions, patterns, preferences, performance, errors). Every trade, pattern, and preference is stored and searchable across sessions via semantic recall.' },
  { title: 'Agentic Chat', desc: 'Multi-turn tool-calling loop (up to 8 iterations). The AI gathers data, calls multiple tools, reasons step-by-step, then responds with full context and data-backed answers.' },
  { title: 'Autonomous Loop Agent', desc: '8-step pipeline per cycle: market data → sentiment → AI decision → validate → execute → log → update TUI. Runs 24/7 with configurable intervals and Kelly Criterion sizing.' },
  { title: '9 Trading Tools', desc: 'place_order, close_position, close_all_positions, get_positions, get_account_balance, get_market_price, get_trade_history, get_performance_metrics, get_market_regime — all with live execution.' },
  { title: 'Non-Custodial & BYOK', desc: 'Your keys, your AI providers, your machine. Use Anthropic, OpenAI, Google/Gemini, or OpenRouter. Swap anytime with Ctrl+M. No cloud dependency, no monthly subscription.' },
  { title: 'Textual TUI', desc: '3-panel layout with live sidebar. 19 slash commands, Ctrl+P palette, Ctrl+D dry run toggle, Ctrl+R refresh, Ctrl+S settings, Ctrl+K API keys, Ctrl+T mode switch — keyboard-driven workflow.' },
  { title: 'Technical Analysis', desc: 'Live RSI 5m/1h, MACD (trend + signal + histogram), Bollinger Bands (position + bandwidth), 24h volume signal, funding rate analysis, and basis spread detection.' },
  { title: 'Market Regime Detection', desc: '6 regimes: Clean Trending, Weak Trending, Volatile Trending, Tight Range (breakout imminent), Ranging, High Volatility Whipsaw. Each with trading guidance.' },
  { title: 'Risk & Portfolio Management', desc: 'Kelly Criterion position sizing, stop loss / take profit / trailing stop logic, max drawdown tracking, correlation matrix, diversification scoring (HHI), and slippage analysis.' },
];

export default function FeaturesSection() {
  return (
    <section id="features">
      <div className="section-eyebrow section-eyebrow-salmon">
        KEY FEATURES
      </div>
      <div className="section-container">
        <p className="section-subtitle">
          Nine integrated capabilities that work together — from persistent memory to live technical
          analysis to risk management — all running on your machine.
        </p>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-card-header">
                <span style={{ color: 'var(--primary)' }}>◆</span> {f.title}
              </div>
              <div className="feature-card-body">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
