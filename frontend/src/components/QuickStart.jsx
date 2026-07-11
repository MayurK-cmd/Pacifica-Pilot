import { useState } from 'react';

export default function QuickStart() {
  const [copied, setCopied] = useState(false);

  const install = `pip install pacificapilot`;
  const setup = `pacifica init`;
  const start = `pacifica start`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${install}\n${setup}\n${start}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* no clipboard */ }
  };

  return (
    <section id="quickstart">
      <div className="section-eyebrow section-eyebrow-olive">
        GET STARTED
      </div>
      <div className="section-container">
        <p className="section-subtitle">
          No cloud setup, no Docker, no monthly subscriptions. Install, init, and start trading — three commands.
        </p>

        <div className="quickstart-steps">
          {/* Install */}
          <div className="quickstart-step" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <span className="quickstart-step-num" style={{ marginBottom: '8px' }}>STEP 1 — Install</span>
            <div className="code-block">
              <pre style={{ fontSize: '15px' }}><span className="prompt">$</span> {install}</pre>
            </div>
          </div>

          {/* Init */}
          <div className="quickstart-step" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <span className="quickstart-step-num" style={{ marginBottom: '8px' }}>STEP 2 — Setup</span>
            <div className="code-block">
              <pre style={{ fontSize: '15px' }}><span className="prompt">$</span> {setup}</pre>
            </div>
            <div style={{ marginTop: '8px', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-muted)' }}>
              The wizard walks you through: Pacifica keys → AI provider → trading config → Supermemory → Telegram (optional)
            </div>
          </div>

          {/* Start */}
          <div className="quickstart-step" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <span className="quickstart-step-num" style={{ marginBottom: '8px' }}>STEP 3 — Launch</span>
            <div className="code-block">
              <pre style={{ fontSize: '15px' }}><span className="prompt">$</span> {start}</pre>
            </div>
            <div style={{ marginTop: '8px', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-muted)' }}>
              Opens the Textual TUI. Or use <code>pacifica start --legacy</code> for the classic REPL.
            </div>
          </div>
        </div>

        {/* Natural Language Demo */}
        <div style={{ marginTop: '32px' }}>
          <div className="sub-section-title">Natural Language Demo</div>
          <div className="demo-block">
            <div className="demo-block-header">
              <span style={{ color: 'var(--primary)' }}>$</span> Terminal Session
            </div>
            <div className="demo-block-body">
              <span className="user-msg">You:</span>  "how are BTC markets right now should I go long or short?"{'\n\n'}
              <span className="agent-text">Agent:{'\n'}  📊 BTC — $63,996{'\n'}  Regime: Weak uptrend (MACD bullish, histogram stable){'\n'}  RSI 5m: 35 (leaning oversold) | RSI 1h: 51 (neutral){'\n'}  Bollinger: Upper half, bandwidth 4.2%{'\n'}  Funding: 0.000013 (neutral){'\n'}  Volume: 1.8x average (high - confirms the move){'\n'}  → NEUTRAL with slight bullish bias. Room to move up but no clear entry yet.</span>
            </div>
          </div>
        </div>

        {/* TUI Layout Mockup */}
        <div style={{ marginTop: '32px' }}>
          <div className="sub-section-title">TUI Layout</div>
          <div className="tui-mockup">
            <div className="tui-mockup-header"><span>◆</span> PacificaPilot — testnet — dry run — AI: Claude — BTC: $64,002 ▲ ETH: $3,521 ▼</div>
            <div className="tui-mockup-row">
              <div className="tui-mockup-panel" style={{ flex: 2, borderRight: '2px solid var(--frame-ink)' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Chat Panel (65%)</span>
                <br />[USER] how are BTC markets?
                <br />[AGENT] Analyzing... calling get_market_price("BTC")...
                <br />[SYSTEM] Data received. Analyzing...
                <br />[AGENT] BTC is in a weak uptrend. RSI neutral, MACD bullish.
              </div>
              <div className="tui-mockup-panel" style={{ flex: 1 }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Sidebar (35%)</span>
                <br />◆ Agent: Running
                <br />◆ Positions: 2 open
                <br />◆ Equity: $12,450
                <br />◆ Decisions: 3 today
              </div>
            </div>
            <div className="tui-mockup-header" style={{ borderTop: '2px solid var(--frame-ink)', borderBottom: 'none' }}>
              <span>&gt;</span> / Type a message or /command...  (Ctrl+P palette)
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div style={{ marginTop: '32px' }}>
          <div className="sub-section-title">Keyboard Shortcuts</div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Shortcut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><code>Ctrl+P</code></td><td>Command palette (opens / in input)</td></tr>
                <tr><td><code>Ctrl+M</code></td><td>Switch AI provider</td></tr>
                <tr><td><code>Ctrl+D</code></td><td>Toggle dry run mode</td></tr>
                <tr><td><code>Ctrl+S</code></td><td>Settings toggles</td></tr>
                <tr><td><code>Ctrl+K</code></td><td>API key management</td></tr>
                <tr><td><code>Ctrl+T</code></td><td>Switch testnet/mainnet</td></tr>
                <tr><td><code>Ctrl+R</code></td><td>Refresh sidebar</td></tr>
                <tr><td><code>Ctrl+L</code></td><td>Clear chat</td></tr>
                <tr><td><code>Ctrl+C / Q</code></td><td>Quit with confirmation</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Slash Commands */}
        <div style={{ marginTop: '32px' }}>
          <div className="sub-section-title">Slash Commands</div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Command</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><code>/start</code></td><td>Boot the autonomous Loop Agent</td></tr>
                <tr><td><code>/stop</code></td><td>Stop the Loop Agent</td></tr>
                <tr><td><code>/pause</code></td><td>Soft-pause the loop</td></tr>
                <tr><td><code>/resume</code></td><td>Resume the loop</td></tr>
                <tr><td><code>/config</code></td><td>View/edit trading parameters</td></tr>
                <tr><td><code>/apikey</code></td><td>Manage AI provider and Supermemory keys</td></tr>
                <tr><td><code>/mode</code></td><td>Switch testnet/mainnet</td></tr>
                <tr><td><code>/status</code></td><td>View system status</td></tr>
                <tr><td><code>/positions</code></td><td>View open positions</td></tr>
                <tr><td><code>/history</code></td><td>Trade history</td></tr>
                <tr><td><code>/performance</code></td><td>Win rate, Sharpe, PnL</td></tr>
                <tr><td><code>/backtest</code></td><td>Run a backtest</td></tr>
                <tr><td><code>/remote</code></td><td>Generate Telegram pairing code</td></tr>
                <tr><td><code>/help</code></td><td>Show all commands</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
