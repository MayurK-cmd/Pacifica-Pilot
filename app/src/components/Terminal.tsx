import { useEffect, useState } from "react";

type Line =
  | { type: "prompt"; text: string }
  | { type: "output"; text: string }
  | { type: "spacer" };

const script: Line[] = [
  { type: "prompt", text: "how are BTC markets right now?" },
  { type: "output", text: "╭── Assistant ──────────────────────────────╮" },
  { type: "output", text: "│  📊 BTC — $63,996                          │" },
  { type: "output", text: "│  Regime: Weak uptrend (MACD bullish)       │" },
  { type: "output", text: "│  RSI: 35 (leaning oversold)                │" },
  { type: "output", text: "│  → NEUTRAL with slight bullish bias        │" },
  { type: "output", text: "╰────────────────────────────────────────────╯" },
  { type: "spacer" },
  { type: "prompt", text: "open a $50 long on WIF" },
  { type: "output", text: "╭── Assistant ──────────────────────────────╮" },
  { type: "output", text: "│  ✅ Ready to place LONG order: $50 WIF     │" },
  { type: "output", text: "│  Confirm? (yes/no):                        │" },
  { type: "output", text: "╰────────────────────────────────────────────╯" },
];

export function Terminal() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [typedChars, setTypedChars] = useState(0);

  useEffect(() => {
    if (visibleLines >= script.length) return;
    const line = script[visibleLines];
    if (line.type === "prompt") {
      if (typedChars < line.text.length) {
        const t = setTimeout(() => setTypedChars((c) => c + 1), 45);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => {
          setVisibleLines((v) => v + 1);
          setTypedChars(0);
        }, 400);
        return () => clearTimeout(t);
      }
    } else {
      const t = setTimeout(() => setVisibleLines((v) => v + 1), 90);
      return () => clearTimeout(t);
    }
  }, [visibleLines, typedChars]);

  // loop
  useEffect(() => {
    if (visibleLines >= script.length) {
      const t = setTimeout(() => {
        setVisibleLines(0);
        setTypedChars(0);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [visibleLines]);

  return (
    <div className="surface-card rounded-2xl overflow-hidden shadow-[var(--shadow-card)] w-full max-w-2xl mx-auto">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-black/40">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-500/80" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <span className="h-3 w-3 rounded-full bg-green-500/80" />
        </div>
        <div className="ml-3 text-xs font-mono text-muted-foreground">pacifica — repl</div>
      </div>
      <div className="p-5 font-mono text-[13px] leading-6 bg-[oklch(0.10_0.02_260)]/80 min-h-[380px]">
        {script.slice(0, visibleLines).map((line, i) => (
          <TerminalLine key={i} line={line} />
        ))}
        {visibleLines < script.length && script[visibleLines].type === "prompt" && (
          <div className="flex">
            <span className="text-pacifica mr-2">pacifica ›</span>
            <span className="text-foreground">
              {script[visibleLines].text.slice(0, typedChars)}
              <span className="inline-block w-2 h-4 bg-pacifica ml-0.5 align-middle animate-blink" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function TerminalLine({ line }: { line: Line }) {
  if (line.type === "spacer") return <div className="h-3" />;
  if (line.type === "prompt")
    return (
      <div className="flex">
        <span className="text-pacifica mr-2">pacifica ›</span>
        <span className="text-foreground">{line.text}</span>
      </div>
    );
  return <div className="text-terminal-green whitespace-pre">{line.text}</div>;
}
