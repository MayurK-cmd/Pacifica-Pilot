import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, Wallet } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppShell() {
  // Watch-only fallback for users without a wallet extension.
  const [manual, setManual] = useState(() => localStorage.getItem("pp-account") ?? "");
  const [draft, setDraft] = useState(manual);
  const [navOpen, setNavOpen] = useState(false);
  const { publicKey, connected } = useWallet();

  // Connected wallet wins; otherwise fall back to the saved watch address.
  // Read-only in both cases — the browser never signs or sends keys.
  const account = publicKey ? publicKey.toBase58() : manual;

  function saveManual(e: React.FormEvent) {
    e.preventDefault();
    const v = draft.trim();
    setManual(v);
    if (v) localStorage.setItem("pp-account", v);
    else localStorage.removeItem("pp-account");
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-[1440px]">
        <aside className="hidden w-56 shrink-0 border-r border-line bg-paper md:block" aria-label="Sidebar">
          <div className="sticky top-0">
            <Sidebar />
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 border-b border-line bg-paper px-3 py-1 md:hidden">
            <button
              type="button"
              className="rounded border border-line p-1.5"
              aria-label="Toggle navigation"
              onClick={() => setNavOpen((v) => !v)}
            >
              <Menu size={16} />
            </button>
            <span className="text-xs font-bold tracking-wide">PACIFICA PILOT</span>
          </div>
          {navOpen && (
            <div className="border-b border-line bg-paper md:hidden">
              <Sidebar />
            </div>
          )}
          <Header account={account} />
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper px-4 py-2">
            <Wallet className="text-muted" size={14} aria-hidden />
            <span className="text-xs font-semibold text-muted">
              {connected && publicKey
                ? `Connected ${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)} — portfolio reads Pacifica for this address`
                : "Connect a Solana wallet — portfolio reads Pacifica for its address"}
            </span>
            <span className="pp-wallet-btn ml-auto">
              <WalletMultiButton />
            </span>
            <details className="w-full text-xs">
              <summary className="cursor-pointer text-muted hover:text-ink">
                Or watch an address without connecting
              </summary>
              <form onSubmit={saveManual} className="mt-1 flex flex-wrap items-center gap-2">
                <label htmlFor="pp-account" className="sr-only">
                  Pacifica account address (read-only)
                </label>
                <input
                  id="pp-account"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="e.g. 42trU9A5…"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={connected}
                  className="w-72 max-w-full rounded border border-line bg-paper px-2 py-1 font-mono text-xs disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={connected}
                  className="rounded bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
                >
                  {manual ? "Update" : "Watch"}
                </button>
                {manual && !connected && (
                  <button
                    type="button"
                    className="rounded border border-line px-3 py-1 text-xs font-semibold"
                    onClick={() => {
                      setManual("");
                      setDraft("");
                      localStorage.removeItem("pp-account");
                    }}
                  >
                    Clear
                  </button>
                )}
              </form>
            </details>
          </div>
          <main className="p-3 md:p-4">
            <Outlet context={{ account }} />
          </main>
        </div>
      </div>
    </div>
  );
}

export interface ShellContext {
  account: string;
}
