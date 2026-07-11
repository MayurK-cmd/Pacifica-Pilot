export default function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div>
          <a href="#" className="header-brand">PACIFICAPILOT</a>
          <div className="header-tagline">AI Trading Agent for Pacifica Perpetual Futures</div>
        </div>
        <nav className="header-nav">
          {['Features', 'Architecture', 'Memory', 'Tools', 'Quick Start', 'GitHub'].map((label) => (
            <a
              key={label}
              href={label === 'GitHub' ? 'https://github.com/MayurK-cmd/pacificapilot' : `#${label.toLowerCase().replace(/\s+/g, '')}`}
              target={label === 'GitHub' ? '_blank' : undefined}
              rel={label === 'GitHub' ? 'noopener noreferrer' : undefined}
            >
              {label === 'GitHub' ? '⟨⟩' : label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
