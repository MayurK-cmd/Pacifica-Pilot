import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Moon, Sun } from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useTheme, useThemeToggle } from "../../lib/theme";

export function Navbar() {
  const { pathname } = useLocation();
  const theme = useTheme();
  const toggleTheme = useThemeToggle();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const NAV_LINKS = [
    { path: "/", label: "Overview", exact: true },
    { path: "/dashboard", label: "Dashboard" },
    { path: "/markets", label: "Markets" },
    { path: "/portfolio", label: "Portfolio" },
    { path: "/agents", label: "Agents" },
    { path: "/integrations", label: "Integrations" },
    { path: "/docs", label: "Docs" },
  ];

  const isActive = (item: { path: string; exact?: boolean }) => {
    if (item.exact) return pathname === "/";
    return pathname === item.path || pathname.startsWith(`${item.path}/`);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.12)] border-b border-surface-container-high/40">
      <div className="h-16 w-full max-w-[1920px] mx-auto px-margin md:px-margin-desktop flex items-center justify-between gap-space-md">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-space-lg">
          <Link className="flex items-center gap-2.5 group" to="/">
            <div className="h-7 w-7 rounded bg-primary flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <div className="h-2.5 w-2.5 bg-surface rounded-xs"></div>
            </div>
            <span className="font-headline-md text-headline-md tracking-tight text-on-surface font-bold">
              PacificaPilot
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-space-xs">
            {NAV_LINKS.map((link) => {
              const active = isActive(link);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`font-body-md text-body-md px-space-sm py-1.5 rounded transition-all ${
                    active
                      ? "text-on-surface font-semibold bg-surface-container shadow-inner border border-outline-variant/30"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-space-sm">
          {/* GitHub Star Badge */}
          <a
            className="hidden sm:flex items-center gap-space-xs bg-surface-container-low px-space-sm py-1.5 rounded hover:bg-surface-container-high transition-colors border border-outline-variant/20"
            href="https://github.com/pacificapilot/cli"
            rel="noreferrer"
            target="_blank"
          >
            <span className="font-data-micro text-data-micro text-secondary">★</span>
            <span className="font-data-tabular text-data-tabular text-on-surface-variant">Star</span>
            <span className="font-data-tabular text-data-tabular text-on-surface font-semibold">2.4k</span>
          </a>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            className="p-2 rounded bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors border border-outline-variant/20"
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Solana Wallet Button */}
          <div className="pp-wallet-btn shrink-0 hidden md:block">
            <WalletMultiButton />
          </div>

          {/* Install CTA */}
          <Link
            className="bg-primary-container text-on-primary-container font-headline-md text-headline-md px-space-md py-1.5 rounded hover:bg-primary-fixed transition-colors font-medium flex items-center gap-space-xs shadow-sm"
            to="/docs"
          >
            <span className="font-label-caps text-label-caps text-on-primary-container">$</span>
            <span className="hidden xs:inline">Install</span>
          </Link>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="xl:hidden p-2 rounded bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-surface-container-lowest border-b border-surface-container-high p-space-md flex flex-col gap-space-sm shadow-xl">
          <nav className="flex flex-col gap-space-xs">
            {NAV_LINKS.map((link) => {
              const active = isActive(link);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-space-md py-2 rounded text-body-md ${
                    active
                      ? "text-on-surface font-semibold bg-surface-container"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="pt-space-xs border-t border-surface-container-high flex flex-col gap-space-xs">
            <div className="pp-wallet-btn w-full">
              <WalletMultiButton />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
