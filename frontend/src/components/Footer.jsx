export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p className="footer-copy">
          &copy; {year} PacificaPilot — MIT License. Built for the Supermemory hackathon and the Pacifica ecosystem.
        </p>
        <nav className="footer-links">
          <a href="https://github.com/MayurK-cmd/pacificapilot" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://pacifica.fi" target="_blank" rel="noopener noreferrer">Pacifica</a>
          <a href="https://supermemory.ai" target="_blank" rel="noopener noreferrer">Supermemory</a>
        </nav>
      </div>
      <div className="footer-legal">
        PacificaPilot is experimental software for educational and research purposes. Trading perpetual futures
        carries significant risk of loss. AI decisions are not financial advice. Past performance does not
        guarantee future results. Start with testnet and small positions.
      </div>
    </footer>
  );
}
