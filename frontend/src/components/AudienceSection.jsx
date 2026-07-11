const AUDIENCES = [
  { title: 'Crypto Traders', desc: 'Automate your Pacifica perpetual futures strategies with AI that learns from your trading style. 24/7 market monitoring, live technical indicators, and persistent memory that remembers your preferences.' },
  { title: 'AI/ML Enthusiasts', desc: 'See how LLM tool-calling works in a real financial application. Multi-provider AI (Anthropic, OpenAI, Google, OpenRouter), persistent memory via Supermemory, agentic tool loops — all in Python.' },
  { title: 'Hackathon Participants', desc: 'End-to-end local AI agent with zero cloud dependencies, polished Textual TUI, persistent memory that improves over time, and multi-provider AI with graceful fallback.' },
  { title: 'Developers', desc: 'Clean Python architecture, clear separation of concerns, BYOK model. Easy to extend with new tools, AI providers, or memory containers. Great reference architecture for AI agents with tool-calling.' },
];

export default function AudienceSection() {
  return (
    <section id="audience">
      <div className="section-eyebrow section-eyebrow-lime">
        WHO IT'S FOR
      </div>
      <div className="section-container">
        <p className="section-subtitle">
          Whether you're automating trading strategies, exploring AI agent architectures, competing in
          hackathons, or building the next generation of trading tools — PacificaPilot is designed for you.
        </p>
        <div className="audience-grid">
          {AUDIENCES.map((a, i) => (
            <div key={i} className="audience-card">
              <div className="audience-card-header">◆ {a.title}</div>
              <div className="audience-card-body">{a.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
