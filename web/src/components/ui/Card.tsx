import type { ReactNode } from "react";
import { cx } from "../../lib/utils";

export function Card({ title, action, children, className }: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("card card-pad", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title ? <h2 className="eyebrow">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({ tone, children }: {
  tone: "up" | "down" | "muted" | "warn" | "info";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    up: "bg-green-50 text-up ring-green-200 dark:bg-green-950 dark:ring-green-800",
    down: "bg-red-50 text-down ring-red-200 dark:bg-red-950 dark:ring-red-800",
    muted: "bg-slate-100 text-muted ring-slate-200 dark:bg-slate-800 dark:ring-slate-700",
    warn: "bg-amber-50 text-warn ring-amber-200 dark:bg-amber-950 dark:ring-amber-800",
    info: "bg-cyan-50 text-teal ring-cyan-200 dark:bg-cyan-950 dark:ring-cyan-800",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
