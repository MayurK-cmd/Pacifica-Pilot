export default function Hero() {
  return (
    <section id="hero">
      {/* CTA Red Panel */}
      <div className="hero-red-panel">
        <p style={{ maxWidth: '80ch', margin: '0 auto', textAlign: 'center' }}>
          Welcome to PacificaPilot — an <strong>autonomous AI trading agent</strong> for Pacifica Perpetual Futures.
          It runs entirely on your machine, combines multi-provider AI reasoning with live technical analysis,
          social sentiment, and <strong>persistent memory via Supermemory</strong> — so your agent actually remembers
          every trade, every preference, and every market pattern across sessions.{' '}
          <a href="#quickstart">pip install pacificapilot →</a>
        </p>
      </div>

      {/* Metrics strip */}
      <div className="hero-metrics-strip">
        <div className="hero-metric-cell">
          <span className="hero-metric-value">9</span>
          Trading Tools
        </div>
        <div className="hero-metric-cell">
          <span className="hero-metric-value">4</span>
          AI Providers
        </div>
        <div className="hero-metric-cell">
          <span className="hero-metric-value">24/7</span>
          Auto Trading Loop
        </div>
        <div className="hero-metric-cell">
          <span className="hero-metric-value">100%</span>
          Local &amp; Private
        </div>
      </div>
    </section>
  );
}
