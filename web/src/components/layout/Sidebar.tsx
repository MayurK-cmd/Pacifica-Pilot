import { Link, NavLink } from "react-router-dom";
import { Activity, LayoutDashboard, CandlestickChart, Wallet, BookOpen, Bot } from "lucide-react";
import { cx } from "../../lib/utils";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/markets", label: "Markets", icon: CandlestickChart, end: false },
  { to: "/portfolio", label: "Portfolio", icon: Wallet, end: true },
  { to: "/agents", label: "Agents", icon: Bot, end: true },
  { to: "/docs", label: "Docs", icon: BookOpen, end: false },
];

export function Sidebar() {
  return (
    <nav aria-label="Primary" className="flex flex-col gap-1 p-3">
      <Link to="/" className="flex items-center gap-2 px-2 pb-3 pt-1">
        <span className="flex h-7 w-7 items-center justify-center rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
          <Activity size={16} aria-hidden />
        </span>
        <div className="leading-tight">
          <p className="text-[13px] font-bold tracking-wide">PACIFICA PILOT</p>
          <p className="text-[10px] uppercase tracking-widest text-muted">Web · read-only</p>
        </div>
      </Link>
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cx(
              "flex items-center gap-2 rounded px-2.5 py-2 text-[13px] font-medium",
              isActive
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-ink hover:bg-slate-100 dark:hover:bg-slate-800",
            )
          }
        >
          <Icon size={15} aria-hidden />
          {label}
        </NavLink>
      ))}
      <p className="px-2 pt-4 text-[10px] leading-relaxed text-muted">
        Observability only. Trading and the agent live in the terminal and Telegram. No keys in this browser session.
      </p>
    </nav>
  );
}
