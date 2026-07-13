import { Link } from "@tanstack/react-router";
import { Github } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-6 w-6 rounded-sm bg-primary flex items-center justify-center">
            <div className="h-2 w-2 bg-background rounded-sm" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            PacificaPilot
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }}>
            Home
          </Link>
          <Link to="/docs" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
            Docs
          </Link>
          <Link to="/integrations" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
            Integrations
          </Link>
          <a
            href="https://youtu.be/XSp-tUbp6i8"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Demo
          </a>
          
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href="https://github.com/MayurK-cmd/Pacifica-Pilot"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-border text-xs text-foreground hover:border-foreground/30 transition-colors"
          >
            <Github className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Star on GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
