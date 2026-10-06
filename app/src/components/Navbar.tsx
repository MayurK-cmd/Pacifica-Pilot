import { Link } from "@tanstack/react-router";
import { Github } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import GlassSurface from "./GlassSurface.jsx";

export function Navbar() {
  return (
    <div className="sticky top-3 z-50 mx-auto flex max-w-6xl items-center gap-3 px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-3 bottom-[-60px]"
        style={{
          background:
            "radial-gradient(ellipse 55% 90% at 50% 0%, rgba(59,130,246,0.16), transparent 70%)",
        }}
      />
      <Link
        to="/"
        className="relative shrink-0 text-sm font-semibold tracking-tight text-foreground"
      >
        PacificaPilot
      </Link>
      <header className="flex min-w-0 flex-1 items-center justify-center">
        <GlassSurface
          width="auto"
          height="auto"
          borderRadius={999}
          borderWidth={0.07}
          brightness={50}
          opacity={0.93}
          blur={11}
          displace={0}
          backgroundOpacity={0}
          saturation={1}
          distortionScale={-180}
          redOffset={0}
          greenOffset={10}
          blueOffset={20}
          xChannel="R"
          yChannel="G"
          mixBlendMode="difference"
          className="max-w-full shadow-[0_8px_32px_rgba(59,130,246,0.12)]"
          style={{ border: "1px solid rgba(59,130,246,0.3)" }}
        >
          <nav
            className="relative hidden items-center justify-center gap-8 px-8 py-2.5 text-sm text-muted-foreground md:flex"
            aria-label="Site"
          >
            <Link
              to="/"
              className="hover:text-foreground transition-colors"
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-foreground" }}
            >
              Home
            </Link>
            <Link
              to="/docs"
              className="hover:text-foreground transition-colors"
              activeProps={{ className: "text-foreground" }}
            >
              Docs
            </Link>
            <Link
              to="/integrations"
              className="hover:text-foreground transition-colors"
              activeProps={{ className: "text-foreground" }}
            >
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
          <nav
            className="relative flex items-center justify-center gap-6 px-6 py-2.5 text-sm text-muted-foreground md:hidden"
            aria-label="Site"
          >
            <Link
              to="/"
              className="hover:text-foreground transition-colors"
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-foreground" }}
            >
              Home
            </Link>
            <Link
              to="/docs"
              className="hover:text-foreground transition-colors"
              activeProps={{ className: "text-foreground" }}
            >
              Docs
            </Link>
            <Link
              to="/integrations"
              className="hover:text-foreground transition-colors"
              activeProps={{ className: "text-foreground" }}
            >
              Integrations
            </Link>
          </nav>
        </GlassSurface>
      </header>
      <span className="relative flex shrink-0 items-center gap-2">
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
      </span>
    </div>
  );
}
