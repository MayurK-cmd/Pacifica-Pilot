import { useState } from "react";
import { cn } from "@/lib/utils";

type Token = { text: string; cls?: string };

function highlightShell(line: string): Token[] {
  // Comment line
  if (line.trim().startsWith("#")) {
    return [{ text: line, cls: "text-syntax-comment" }];
  }
  const tokens: Token[] = [];
  // Split off leading prompt
  let rest = line;
  const promptMatch = rest.match(/^(\$|>|❯)\s+/);
  if (promptMatch) {
    tokens.push({ text: promptMatch[0], cls: "text-primary" });
    rest = rest.slice(promptMatch[0].length);
  }
  // Tokenize words
  const parts = rest.split(/(\s+|"[^"]*"|'[^']*')/g).filter(Boolean);
  let isFirstWord = true;
  for (const p of parts) {
    if (/^\s+$/.test(p)) {
      tokens.push({ text: p });
      continue;
    }
    if (/^["'].*["']$/.test(p)) {
      tokens.push({ text: p, cls: "text-syntax-string" });
      continue;
    }
    if (/^-{1,2}[A-Za-z]/.test(p)) {
      tokens.push({ text: p, cls: "text-syntax-flag" });
      continue;
    }
    if (isFirstWord) {
      tokens.push({ text: p, cls: "text-syntax-keyword font-medium" });
      isFirstWord = false;
      continue;
    }
    tokens.push({ text: p, cls: "text-foreground/90" });
  }
  return tokens;
}

interface CodeBlockProps {
  code: string;
  label?: string;
  className?: string;
}

export function CodeBlock({ code, label = "shell", className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  const lines = code.split("\n");

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-md border border-[var(--color-terminal-border)] bg-[var(--color-terminal)]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-terminal-border)] px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-syntax-flag/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-syntax-string/80" />
          <span className="ml-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copy code"
          className="rounded border border-transparent px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-[var(--color-terminal-border)] hover:text-foreground"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-4 font-mono text-[13px] leading-relaxed">
        <code>
          {lines.map((ln, i) => (
            <div key={i} className="whitespace-pre">
              {highlightShell(ln).map((t, j) => (
                <span key={j} className={t.cls}>
                  {t.text}
                </span>
              ))}
              {ln.length === 0 ? "\u00A0" : ""}
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}