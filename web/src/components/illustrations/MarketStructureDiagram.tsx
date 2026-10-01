/** Original diagram: CEX vs DEX vs hybrid DEX custody and matching flow. */
export function MarketStructureDiagram() {
  const box = "fill-paper stroke-line";
  const label = "fill-ink";
  const sub = "fill-muted";
  const col = (x: number, title: string, rows: [string, string][]) => (
    <g>
      <text x={x} y={18} fontSize="12" fontWeight="700" className={label}>{title}</text>
      {rows.map(([t, d], i) => (
        <g key={t}>
          <rect x={x} y={30 + i * 52} width={180} height={44} rx={6} className={box} strokeWidth="1.5" />
          <text x={x + 10} y={30 + i * 52 + 19} fontSize="11" fontWeight="700" className={label}>{t}</text>
          <text x={x + 10} y={30 + i * 52 + 34} fontSize="10" className={sub}>{d}</text>
          {i < rows.length - 1 && (
            <line x1={x + 90} y1={30 + i * 52 + 44} x2={x + 90} y2={30 + (i + 1) * 52} stroke="#0d9488" strokeWidth="1.5" />
          )}
        </g>
      ))}
    </g>
  );
  return (
    <svg
      viewBox="0 0 600 210"
      role="img"
      aria-label="CEX: user deposits to company then trades. DEX: wallet trades contracts directly. Hybrid: wallet keeps custody, off-chain book matches, on-chain settles."
      className="h-auto w-full text-ink"
    >
      {col(8, "CEX", [["You deposit", "company holds funds"], ["Company matches", "internal ledger"], ["Withdraw", "permissioned"]])}
      {col(210, "DEX", [["Your wallet", "you hold keys"], ["Smart contracts", "on-chain matching"], ["Settle", "on-chain, slow"]])}
      {col(412, "Hybrid (Pacifica)", [["Your wallet", "you hold keys"], ["Off-chain book", "CEX-fast matching"], ["On-chain settle", "margin + custody"]])}
    </svg>
  );
}
