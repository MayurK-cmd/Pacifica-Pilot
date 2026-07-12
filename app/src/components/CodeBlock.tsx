import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  lang = "bash",
  className,
}: {
  code: string;
  lang?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={cn("group relative border border-border bg-card rounded overflow-hidden", className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-[color:var(--surface-soft)]">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
          {lang}
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Copy"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-[color:var(--electric-bright)]" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <pre className="p-4 text-[13px] font-mono text-foreground overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
