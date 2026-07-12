export function MemoryGraph() {
  const nodes = [
    { id: "core", label: "Memory", x: 300, y: 180, r: 46, primary: true },
    { id: "n1", label: "LONG BTC $50", x: 90, y: 70, r: 38 },
    { id: "n2", label: "RSI was 35", x: 500, y: 70, r: 34 },
    { id: "n3", label: "Never trade SOL", x: 60, y: 290, r: 40 },
    { id: "n4", label: "Daily PnL +$12.50", x: 520, y: 300, r: 38 },
    { id: "n5", label: "Prefers 3x leverage", x: 300, y: 20, r: 32 },
    { id: "n6", label: "Regime: uptrend", x: 300, y: 340, r: 32 },
  ];
  const edges = nodes.slice(1).map((n) => ({ from: nodes[0], to: n }));

  return (
    <svg viewBox="0 0 600 380" className="w-full h-auto">
      <defs>
        <radialGradient id="core-grad" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#5B9FFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" />
        </radialGradient>
        <linearGradient id="edge-grad" x1="0" x2="1">
          <stop offset="0%" stopColor="#5B9FFF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#c084fc" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      {edges.map((e, i) => (
        <line
          key={i}
          x1={e.from.x}
          y1={e.from.y}
          x2={e.to.x}
          y2={e.to.y}
          stroke="url(#edge-grad)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="16" dur="1.6s" repeatCount="indefinite" />
        </line>
      ))}
      {nodes.map((n) => (
        <g key={n.id}>
          <circle
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill={n.primary ? "url(#core-grad)" : "rgba(91,159,255,0.12)"}
            stroke={n.primary ? "#5B9FFF" : "rgba(91,159,255,0.5)"}
            strokeWidth="1.2"
          />
          <text
            x={n.x}
            y={n.y + 4}
            textAnchor="middle"
            fontSize={n.primary ? 14 : 10}
            fontWeight={n.primary ? 700 : 500}
            fill="#fff"
            fontFamily="Inter, sans-serif"
          >
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
