export default function ArchitectureSection() {
  return (
    <section id="architecture">
      <div className="section-eyebrow section-eyebrow-steel">
        ARCHITECTURE
      </div>
      <div className="section-container">
        <p className="section-subtitle">
          Two AI agents, a shared trading core, persistent memory, a Textual TUI, and an optional Telegram bot —
          all running on your machine with zero cloud dependencies.
        </p>

        <div className="arch-diagram">
          <div className="arch-box highlight">You (Chat / Telegram / TUI)</div>
          <div className="arch-connector">⬇ ⬆</div>
          <div className="arch-row">
            <div className="arch-box">Chat Agent (tool loop)</div>
            <div className="arch-box">Loop Agent (autonomous)</div>
          </div>
          <div className="arch-connector">⬇ ⬆</div>
          <div className="arch-box highlight" style={{ minWidth: '200px' }}>Orchestrator</div>
          <div className="arch-connector">⬇ ⬆</div>
          <div className="arch-row">
            <div className="arch-box signal">Supermemory<br /><span style={{ fontSize: '10px', fontFamily: 'var(--font-body)', textTransform: 'none', fontWeight: 400 }}>5 container tags</span></div>
            <div className="arch-box">Trading Core<br /><span style={{ fontSize: '10px', fontFamily: 'var(--font-body)', textTransform: 'none', fontWeight: 400 }}>market_data · trading · risk · analytics</span></div>
            <div className="arch-box">Telegram Bot<br /><span style={{ fontSize: '10px', fontFamily: 'var(--font-body)', textTransform: 'none', fontWeight: 400 }}>/pair · remote trading</span></div>
          </div>
          <div className="arch-connector">⬇</div>
          <div className="arch-box">Pacifica API (REST) + Binance Fallback</div>
        </div>

        <div className="arch-desc-grid">
          <div className="arch-desc-card">
            <div className="arch-desc-card-title">Chat Agent</div>
            <div className="arch-desc-card-body">
              Multi-turn reasoning loop (up to 8 iterations). Receives natural language, decides tools to call, executes them, chains results, and returns data-backed answers. Detects and auto-saves user preferences. All trade actions require confirmation.
            </div>
          </div>
          <div className="arch-desc-card">
            <div className="arch-desc-card-title">Loop Agent</div>
            <div className="arch-desc-card-body">
              8-step autonomous pipeline: fetch market data → sentiment analysis → AI decision → validate → execute → log → write memory → update TUI. Configurable interval, Kelly Criterion sizing, trailing SL/TP tracking.
            </div>
          </div>
          <div className="arch-desc-card">
            <div className="arch-desc-card-title">Orchestrator</div>
            <div className="arch-desc-card-body">
              Runs all three agents concurrently via asyncio. If one crashes the others keep running. Manages graceful shutdown on SIGINT/SIGTERM. Prints startup banner with mode, dry run status, and symbols.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
