/** Original diagram: candlestick anatomy + volume + funding flow. */
export function CandleDiagram() {
  const label = "fill-ink";
  const sub = "fill-muted";
  return (
    <svg
      viewBox="0 0 600 220"
      role="img"
      aria-label="Candlestick anatomy: wick from low to high, body from open to close, volume bars below; funding flows from the crowded side to the other side each hour"
      className="h-auto w-full text-ink"
    >
      {/* Candle 1: up */}
      <line x1="70" y1="20" x2="70" y2="130" strokeWidth="2" className="stroke-muted" />
      <rect x="52" y="45" width="36" height="60" rx="2" fill="#15803d" />
      <text x="30" y="20" fontSize="10" className={sub}>high</text>
      <text x="96" y="50" fontSize="10" className={label}>open</text>
      <text x="96" y="108" fontSize="10" className={label}>close</text>
      <text x="30" y="133" fontSize="10" className={sub}>low</text>

      {/* Candle 2: down */}
      <line x1="170" y1="40" x2="170" y2="150" strokeWidth="2" className="stroke-muted" />
      <rect x="152" y="60" width="36" height="65" rx="2" fill="#b91c1c" />

      {/* Candle 3: small */}
      <line x1="260" y1="70" x2="260" y2="140" strokeWidth="2" className="stroke-muted" />
      <rect x="242" y="95" width="36" height="25" rx="2" fill="#15803d" />
      <text x="230" y="160" fontSize="10" className={sub}>indecision</text>

      {/* Volume bars */}
      {[70, 170, 260].map((x, i) => (
        <rect key={x} x={x - 18} y={195 - [30, 48, 18][i]} width={36} height={[30, 48, 18][i]} rx="2" fill="#0d9488" opacity="0.45" />
      ))}
      <text x="300" y="200" fontSize="10" className={sub}>volume — conviction behind the move</text>

      {/* Funding flow */}
      <rect x="380" y="30" width="200" height="120" rx="6" fill="none" strokeWidth="1.5" className="stroke-line" />
      <text x="392" y="52" fontSize="11" fontWeight="700" className={label}>Funding (hourly)</text>
      <text x="392" y="70" fontSize="10" className={sub}>crowded longs pay shorts</text>
      <line x1="400" y1="92" x2="540" y2="92" stroke="#b91c1c" strokeWidth="1.5" />
      <text x="392" y="108" fontSize="10" className={label}>high + funding → caution</text>
      <line x1="540" y1="122" x2="400" y2="122" stroke="#15803d" strokeWidth="1.5" />
      <text x="392" y="138" fontSize="10" className={label}>negative funding → shorts pay</text>
    </svg>
  );
}
