/** Original diagram: how PacificaPilot fits together. Theme-aware via currentColor. */
export function ArchitectureDiagram() {
  const box = "fill-paper stroke-line";
  const label = "fill-ink";
  const sub = "fill-muted";
  return (
    <svg
      viewBox="0 0 640 250"
      role="img"
      aria-label="Architecture: terminal agents on your machine connect to Pacifica, Elfa, CoinGecko and Solana; the web dashboard only reads"
      className="h-auto w-full text-ink"
    >
      {/* Your machine */}
      <rect x="8" y="30" width="616" height="212" rx="8" fill="none" strokeWidth="1.5" className="stroke-line" strokeDasharray="6 4" />
      <text x="20" y="22" fontSize="11" fontWeight="700" className={sub}>YOUR MACHINE — keys never leave</text>

      {/* Terminal */}
      <rect x="24" y="60" width="130" height="120" rx="6" className={box} strokeWidth="1.5" />
      <text x="38" y="86" fontSize="12" fontWeight="700" className={label}>Terminal</text>
      <text x="38" y="104" fontSize="10" className={sub}>pacifica start</text>
      <rect x="38" y="116" width="102" height="22" rx="3" fill="#0d9488" opacity="0.15" />
      <text x="46" y="131" fontSize="10" className={label}>Loop Agent</text>
      <rect x="38" y="144" width="102" height="22" rx="3" fill="#0d9488" opacity="0.15" />
      <text x="46" y="159" fontSize="10" className={label}>Chat Agent</text>

      {/* Arrows to services */}
      <line x1="154" y1="110" x2="196" y2="80" stroke="#0d9488" strokeWidth="1.5" />
      <line x1="154" y1="130" x2="196" y2="130" stroke="#0d9488" strokeWidth="1.5" />
      <line x1="154" y1="150" x2="196" y2="180" stroke="#0d9488" strokeWidth="1.5" />

      {/* Services */}
      {[
        { y: 48, title: "Pacifica", desc: "perps orders + data" },
        { y: 108, title: "Elfa AI", desc: "social intelligence" },
        { y: 168, title: "CoinGecko", desc: "market context" },
      ].map((s) => (
        <g key={s.title}>
          <rect x="196" y={s.y} width="170" height="44" rx="6" className={box} strokeWidth="1.5" />
          <text x="208" y={s.y + 19} fontSize="11" fontWeight="700" className={label}>{s.title}</text>
          <text x="208" y={s.y + 34} fontSize="10" className={sub}>{s.desc}</text>
        </g>
      ))}

      {/* Web dashboard read-only */}
      <rect x="396" y="84" width="220" height="92" rx="6" className={box} strokeWidth="1.5" />
      <text x="410" y="110" fontSize="12" fontWeight="700" className={label}>Web dashboard</text>
      <text x="410" y="128" fontSize="10" className={sub}>this app — reads only</text>
      <text x="410" y="144" fontSize="10" className={sub}>no trading · no keys</text>
      <text x="410" y="160" fontSize="10" className={sub}>charts · portfolio · docs</text>
      <line x1="366" y1="130" x2="396" y2="130" strokeWidth="1.5" className="stroke-line" strokeDasharray="4 3" />

      {/* Solana memo */}
      <rect x="196" y="216" width="170" height="0" fill="none" />
      <text x="380" y="228" fontSize="10" className={sub}>decision hashes → Solana memo</text>
    </svg>
  );
}
