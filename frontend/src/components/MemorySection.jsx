const CONTAINERS = [
  { tag: 'decisions', desc: 'Every LONG/SHORT/HOLD with confidence, reasoning, and signals' },
  { tag: 'patterns', desc: 'Funding spikes, RSI extremes, basis divergences, market observations' },
  { tag: 'preferences', desc: 'User config changes and stated trading preferences' },
  { tag: 'performance', desc: 'Daily summaries with win rate, best/worst symbols, PnL' },
  { tag: 'errors', desc: 'API failures, Binance fallback activations, system errors' },
];

export default function MemorySection() {
  return (
    <section id="memory">
      <div className="section-eyebrow section-eyebrow-sky">
        THE SUPERMEMORY ADVANTAGE
      </div>
      <div className="section-container">
        <p className="section-subtitle">
          Every trading agent starts from zero every session — until now. Supermemory gives PacificaPilot
          persistent, searchable memory that survives restarts, improves over time, and never blocks trading
          if the memory service is unavailable.
        </p>

        {/* Containers */}
        <div className="sub-section-title">Memory Containers</div>
        <div className="table-wrapper" style={{ marginBottom: '32px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Container</th>
                <th>What's stored</th>
                <th>Written by</th>
                <th>Read by</th>
              </tr>
            </thead>
            <tbody>
              {CONTAINERS.map((c) => (
                <tr key={c.tag}>
                  <td><code style={{ fontWeight: 700 }}>{c.tag}</code></td>
                  <td>{c.desc}</td>
                  <td>{c.tag === 'preferences' ? 'Chat Agent' : c.tag === 'errors' ? 'Both' : 'Loop Agent'}</td>
                  <td>{c.tag === 'performance' ? 'Chat Agent' : 'Both agents'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Memory Flow */}
        <div className="sub-section-title">How Memory Flows</div>
        <div className="memory-flow" style={{ marginBottom: '32px' }}>
          <div className="memory-step">
            <span className="memory-step-num">1</span>
            <span>User says <em>"never trade SOL"</em> or <em>"how did I do on BTC?"</em></span>
          </div>
          <div className="arch-connector">⬇</div>
          <div className="memory-step">
            <span className="memory-step-num">2</span>
            <span>Chat Agent detects preference trigger or memory keyword → calls <code>memory.add()</code> or <code>memory.recall()</code></span>
          </div>
          <div className="arch-connector">⬇</div>
          <div className="memory-step">
            <span className="memory-step-num">3</span>
            <span>Data stored in or retrieved from Supermemory with the appropriate container tag</span>
          </div>
          <div className="arch-connector">⬇</div>
          <div className="memory-step">
            <span className="memory-step-num">4</span>
            <span>Next session: <code>memory.context()</code> injects full profile into AI system prompt</span>
          </div>
          <div className="arch-connector">⬇</div>
          <div className="memory-step">
            <span className="memory-step-num">5</span>
            <span>AI sees <strong>"User preference: never trade SOL"</strong> — remembered forever</span>
          </div>
        </div>

        {/* Three Operations */}
        <div className="sub-section-title">Key Operations</div>
        <div className="grid-3" style={{ marginBottom: '32px' }}>
          {[
            { name: 'memory.add()', desc: 'Save a fact to Supermemory with a container tag. Dreaming mode ("instant" or "dynamic").', when: 'After every trade decision, position close, pattern detection, preference statement, daily summary.' },
            { name: 'memory.recall()', desc: 'Search memories by natural language query. Can filter by container tag or search all containers.', when: 'Before the Chat Agent answers a history, preference, or performance question.' },
            { name: 'memory.context()', desc: 'Get full user profile across all containers. Returns static facts, dynamic timeline, and bucket contents.', when: 'At every Chat Agent session start — injected directly into the AI system prompt.' },
          ].map((op, i) => (
            <div key={i} className="tool-card">
              <div className="tool-card-title">◆ {op.name}</div>
              <div className="tool-card-body" style={{ background: i === 0 ? 'var(--tint-periwinkle)' : i === 1 ? 'var(--tint-steel)' : 'var(--tint-olive)' }}>
                <p style={{ marginBottom: '8px' }}>{op.desc}</p>
                <p style={{ fontSize: '12px', fontStyle: 'italic' }}><strong>When:</strong> {op.when}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Deployment Modes */}
        <div className="sub-section-title">Deployment Modes</div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Aspect</th>
                <th>Cloud</th>
                <th>Local</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Setup</td><td>Get key from app.supermemory.ai</td><td><code>npx supermemory local</code></td></tr>
              <tr><td>Data Location</td><td>Supermemory servers</td><td><code>./.supermemory</code> on your machine</td></tr>
              <tr><td>Privacy</td><td>Data leaves your machine</td><td>Zero data leaves your machine — fully offline</td></tr>
              <tr><td>Best For</td><td>Remote servers, VMs, convenience</td><td>Privacy-sensitive users, hackathon submission</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
