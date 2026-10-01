import { useQuery } from "@tanstack/react-query";
import { Moon, Sun } from "lucide-react";
import { fetchAgentStatus, fetchSystemStatus } from "../../api/agent";
import { useTheme, useThemeToggle } from "../../lib/theme";
import { fmtAgo } from "../../lib/utils";
import { Badge } from "../ui/Card";

export function Header({ account }: { account: string }) {
  const agent = useQuery({ queryKey: ["agent-status"], queryFn: fetchAgentStatus, refetchInterval: 30_000 });
  const status = useQuery({ queryKey: ["system-status"], queryFn: fetchSystemStatus, refetchInterval: 30_000 });
  const theme = useTheme();
  const toggleTheme = useThemeToggle();

  const mode = agent.data?.mode ?? "TESTNET";
  const refreshed = status.data?.updatedAt ?? null;

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-line bg-paper px-4 py-2.5">
      <h1 className="text-sm font-bold tracking-wide">PACIFICA PILOT</h1>
      <Badge tone={mode === "MAINNET" ? "warn" : "info"}>{mode}</Badge>
      {account ? (
        <Badge tone="muted">ACCOUNT {account.slice(0, 4)}…{account.slice(-4)}</Badge>
      ) : (
        <Badge tone="muted">NO ACCOUNT</Badge>
      )}
      <span className="ml-auto text-xs text-muted" aria-live="polite">
        Last updated: {fmtAgo(refreshed)}
      </span>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
        title={theme === "light" ? "Dark theme" : "Light theme"}
        className="rounded border border-line p-1.5 text-muted hover:text-ink"
      >
        {theme === "light" ? <Moon size={14} aria-hidden /> : <Sun size={14} aria-hidden />}
      </button>
    </header>
  );
}
