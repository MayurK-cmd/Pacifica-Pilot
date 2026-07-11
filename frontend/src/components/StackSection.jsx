const STACK = [
  { layer: 'Language', tech: 'Python 3.11+', why: 'Universal, library-rich, perfect for AI/ML and trading' },
  { layer: 'CLI / TUI', tech: 'Textual', why: '3-panel reactive layout, 19 slash commands, keyboard bindings, trade modals, autocomplete' },
  { layer: 'AI Providers', tech: 'Anthropic + OpenAI + Google + OpenRouter', why: 'BYOK — bring your own key, swap anytime. One abstraction over 4 providers.' },
  { layer: 'Memory', tech: 'Supermemory SDK', why: 'Persistent, searchable, cross-session memory with 5 container tags. Local or cloud.' },
  { layer: 'Market Data', tech: 'Pacifica API + Binance fallback', why: 'Live prices, RSI, MACD, Bollinger Bands, volume, funding rate. Binance as fallback.' },
  { layer: 'Sentiment', tech: 'Elfa AI', why: 'Social sentiment signals that feed into AI trading decisions alongside technical indicators.' },
  { layer: 'Blockchain', tech: 'Solana (solders + base58)', why: 'On-chain trade execution, Solana keypair signing, and on-chain memo logging' },
  { layer: 'Storage', tech: 'JSON + SQLite', why: 'Config + secrets in JSON. Trade history, positions, decisions in SQLite.' },
  { layer: 'Trading', tech: 'Pacifica Perpetual Futures', why: 'Non-custodial on-chain perps. REST API, testnet, no KYC.' },
  { layer: 'Backtesting', tech: 'Core analytics engine', why: 'Kelly Criterion, Sharpe ratio, max drawdown, correlation matrix, slippage analysis, Binance historical data' },
  { layer: 'Telegram', tech: 'python-telegram-bot', why: 'Optional remote trading via Telegram. One-time /pair binding, same Chat Agent backend.' },
];

export default function StackSection() {
  return (
    <section id="stack">
      <div className="section-eyebrow section-eyebrow-peach">
        TECH STACK
      </div>
      <div className="section-container">
        <p className="section-subtitle">
          Purpose-built components selected for reliability, privacy, and developer experience —
          all running locally on your machine.
        </p>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Layer</th>
                <th>Technology</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {STACK.map((s, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{s.layer}</td>
                  <td style={{ fontWeight: 600 }}>{s.tech}</td>
                  <td style={{ fontStyle: 'italic' }}>{s.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
