import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border mt-24">
      <div className="mx-auto max-w-6xl px-6 py-12 grid gap-10 md:grid-cols-4 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-5 w-5 rounded-sm bg-primary" />
            <span className="text-foreground font-semibold">PacificaPilot</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            A terminal-native AI trading agent for Pacifica perpetuals. Open source, MIT.
          </p>
        </div>
        <div>
          <h4 className="text-foreground text-xs uppercase tracking-widest mb-3">Project</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/docs" className="hover:text-foreground">Documentation</Link></li>
            <li><Link to="/integrations" className="hover:text-foreground">Integrations</Link></li>
            <li><a href="https://github.com/MayurK-cmd/Pacifica-Pilot" target="_blank" rel="noreferrer" className="hover:text-foreground">GitHub</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-foreground text-xs uppercase tracking-widest mb-3">Resources</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><a href="https://pacifica.fi" target="_blank" rel="noreferrer" className="hover:text-foreground">Pacifica DEX</a></li>
            <li><a href="https://solana.com" target="_blank" rel="noreferrer" className="hover:text-foreground">Solana</a></li>
            <li><a href="https://supermemory.ai" target="_blank" rel="noreferrer" className="hover:text-foreground">Supermemory</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-foreground text-xs uppercase tracking-widest mb-3">Disclaimer</h4>
          <p className="text-muted-foreground leading-relaxed text-xs">
            Trading perpetual futures involves substantial risk. PacificaPilot is provided as-is
            under MIT. Not financial advice.
          </p>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} PacificaPilot</span>
          <span className="font-mono">MIT License</span>
        </div>
      </div>
    </footer>
  );
}
