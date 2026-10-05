import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, Moon, Sun } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import JellyRadio from "../JellyRadio.jsx";
import GlassSurface from "../GlassSurface.jsx";
import { useTheme, useThemeToggle } from "../../lib/theme";

const links = [
  { value: "/dashboard", label: "Dashboard" },
  { value: "/markets", label: "Markets" },
  { value: "/portfolio", label: "Portfolio" },
  { value: "/agents", label: "Agents" },
  { value: "/integrations", label: "Integrations" },
  { value: "/docs", label: "Docs" },
];

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const { publicKey } = useWallet();
  const theme = useTheme();
  const toggleTheme = useThemeToggle();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Connected wallet address, if any. Read-only — the browser never signs.
  const account = publicKey ? publicKey.toBase58() : "";
  const current =
    links.find((l) => pathname === l.value || pathname.startsWith(`${l.value}/`))?.label ?? "Dashboard";

  const jelly = (onPick?: () => void) => (
    <JellyRadio
      items={links.map((l) => l.label)}
      value={current}
      defaultValue="Dashboard"
      onChange={(label: string) => {
        const link = links.find((l) => l.label === label);
        if (link) {
          navigate(link.value);
          onPick?.();
        }
      }}
      chipColor={theme === "dark" ? "#18181b" : "#f1f5f9"}
      activeColor="#2563eb"
      textColor={theme === "dark" ? "#a1a1aa" : "#475569"}
      activeTextColor="#ffffff"
      size="sm"
      ariaLabel="Primary"
    />
  );

  return (
    <div className="min-h-screen">
      <div className="sticky top-3 z-40 mx-auto flex max-w-[1440px] items-center gap-3 px-4">
        <Link to="/" className="shrink-0 text-[13px] font-bold tracking-wide">
          PACIFICA PILOT
        </Link>
        <header className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-line">
          <GlassSurface
            width={"100%" as unknown as number}
            height={"100%" as unknown as number}
            borderRadius={16}
            brightness={40}
            opacity={0.85}
          >
            <div className="relative hidden items-center justify-center py-1.5 md:flex">
              {jelly()}
            </div>
            <div className="relative flex items-center gap-2 px-3 py-1.5 md:hidden">
              <button
                type="button"
                className="rounded border border-line p-1.5"
                aria-label="Toggle navigation"
                onClick={() => setNavOpen((v) => !v)}
              >
                <Menu size={16} />
              </button>
              <span className="text-xs text-muted">{current}</span>
            </div>
          </GlassSurface>
        </header>
        <span className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            className="rounded border border-line p-1.5 text-muted hover:text-ink"
          >
            {theme === "light" ? <Moon size={14} aria-hidden /> : <Sun size={14} aria-hidden />}
          </button>
          <span className="pp-wallet-btn">
            <WalletMultiButton />
          </span>
        </span>
      </div>
      {navOpen && (
        <div className="mx-auto max-w-[1440px] px-4 pt-2 md:hidden">
          <div className="[&_.jelly-radio]:flex-wrap [&_.jelly-radio]:p-1">{jelly(() => setNavOpen(false))}</div>
        </div>
      )}
      <div className="mx-auto max-w-[1440px]">
        <main className="p-3 md:p-4">
          <Outlet context={{ account }} />
        </main>
      </div>
    </div>
  );
}

export interface ShellContext {
  account: string;
}
