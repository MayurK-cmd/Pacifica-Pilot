const TOOLS = [
  { name: 'place_order', desc: 'Open LONG/SHORT positions with confirmation. Specify symbol, direction, and USDC size. Includes dry-run mode for safe testing.' },
  { name: 'close_position', desc: 'Close an open position for a single symbol. Displays current PnL and requires confirmation before execution.' },
  { name: 'close_all_positions', desc: 'Flatten the entire book. Shows a full preview of every open position with PnL, then closes each one individually with batch confirmation.' },
  { name: 'get_positions', desc: 'View all open positions with unrealized PnL, entry price, mark price, size, and side (LONG/SHORT).' },
  { name: 'get_account_balance', desc: 'Check USDC balance, account equity, available capital, margin used, and spot token balances.' },
  { name: 'get_market_price', desc: 'Full market snapshot: price, RSI 5m/1h, MACD trend + histogram, Bollinger Bands, volume signal, funding rate, basis spread, and market regime.' },
  { name: 'get_trade_history', desc: 'Recent trades with PnL, entry/exit prices, duration in minutes, exit reason, and win/loss status.' },
  { name: 'get_performance_metrics', desc: 'Win rate, total PnL, profit factor, Sharpe ratio, max drawdown, average win/loss, best/worst performing symbols — configurable sample size.' },
  { name: 'get_market_regime', desc: 'Detect current regime: Clean Trending, Weak Trending, Volatile Trending, Tight Range, Ranging, or High Volatility Whipsaw. Each with trading guidance.' },
];

export default function ToolsSection() {
  return (
    <section id="tools">
      <div className="section-eyebrow section-eyebrow-periwinkle">
        TRADING TOOLS
      </div>
      <div className="section-container">
        <p className="section-subtitle">
          Nine tools the AI can call autonomously — from market analysis to order execution to performance
          tracking. Trade actions require user confirmation before execution.
        </p>
        <div className="tools-grid">
          {TOOLS.map((t, i) => (
            <div key={i} className="tool-card">
              <div className="tool-card-title">
                <span style={{ color: 'var(--primary)' }}>$</span> {t.name}
              </div>
              <div className="tool-card-body">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
