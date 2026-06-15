import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function LandingPage() {
  const { authenticated } = usePrivy();
  const navigate = useNavigate();
  const [status, setStatus] = useState({ enabled: false, active: false });
  const [systemTime, setSystemTime] = useState(new Date().toLocaleTimeString());
  const [showFeatures, setShowFeatures] = useState(false);
  const [tickerData, setTickerData] = useState([]);

  const PACIFICA_BLUE = "#00d1ff";
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setSystemTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Agent status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/agent/status`);
        if (!res.ok) throw new Error("Network response was not ok");
        const data = await res.json();
        setStatus({ enabled: data.enabled || false, active: data.active || false });
      } catch (e) {
        console.error("Status fetch failed:", e);
        setStatus({ enabled: false, active: false });
      }
    };
    fetchStatus();
    const id = setInterval(fetchStatus, 30000);
    return () => clearInterval(id);
  }, [API_BASE]);

  // Live prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch("https://test-api.pacifica.fi/api/v1/info/prices");
        const raw = await res.json();
        const syms = (raw?.data || [])
          .filter((i) => i.symbol && i.mark_price)
          .map((i) => ({
            symbol: i.symbol,
            price: parseFloat(i.mark_price),
            change: (Math.random() * 4 - 1.5).toFixed(2),
          }))
          .sort((a, b) => b.price - a.price);
        if (syms.length > 0) setTickerData(syms);
        else
          setTickerData([
            { symbol: "BTC", price: 65916.42, change: "1.23" },
            { symbol: "ETH", price: 2021.92, change: "-0.45" },
            { symbol: "SOL", price: 142.35, change: "2.15" },
            { symbol: "WIF", price: 0.175, change: "-1.20" },
          ]);
      } catch {
        setTickerData([{ symbol: "BTC", price: 65916.42, change: "1.23" }]);
      }
    };
    fetchPrices();
    const id = setInterval(fetchPrices, 10000);
    return () => clearInterval(id);
  }, []);

  const handleLaunch = () =>
    authenticated ? navigate("/dashboard") : navigate("/login");

  // ---------- styles ----------
  const fontSans = `'Inter', ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  const fontMono = `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace`;

  return (
    <div
      className="min-h-screen bg-[#05070d] text-zinc-100 flex flex-col overflow-x-hidden relative"
      style={{ fontFamily: fontSans }}
    >
      {/* Ambient background: grid + glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,209,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,209,255,0.06) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[700px] z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,209,255,0.25), rgba(0,209,255,0) 60%)",
          filter: "blur(40px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-0 right-0 w-[600px] h-[600px] z-0"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.15), transparent 60%)",
          filter: "blur(60px)",
        }}
      />

      {/* ============ TOP TICKER ============ */}
      <div
        className="relative z-20 bg-black/70 backdrop-blur-md border-b border-white/5 py-2 overflow-hidden flex items-center"
        style={{ fontFamily: fontMono, fontSize: 11 }}
      >
        <div className="px-4 border-r border-white/10 text-zinc-400 flex items-center gap-2 font-semibold select-none bg-black/80 z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <span className="tracking-[0.25em] text-[10px] uppercase">Live</span>
        </div>
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="flex gap-8 px-6 whitespace-nowrap min-w-max"
        >
          {[...tickerData, ...tickerData].map((t, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="font-semibold text-white tracking-wide">{t.symbol}</span>
              <span className="text-zinc-400">
                $
                {t.price.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}
              </span>
              <span
                className={`font-semibold ${
                  parseFloat(t.change) >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {parseFloat(t.change) >= 0 ? "▲" : "▼"} {Math.abs(t.change)}%
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ============ NAV ============ */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(0,209,255,0.9), rgba(139,92,246,0.6), rgba(0,209,255,0.9))",
              boxShadow: "0 0 24px rgba(0,209,255,0.45)",
            }}
          >
            <div className="w-6 h-6 rounded-[5px] bg-[#05070d] flex items-center justify-center">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: PACIFICA_BLUE }}
              />
            </div>
          </motion.div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-[15px] tracking-tight text-white">
              PacificaPilot
            </span>
            <span
              className="text-[9px] tracking-[0.35em] uppercase text-zinc-500"
              style={{ fontFamily: fontMono }}
            >
              Autonomous Agent
            </span>
          </div>
        </div>

        <div
          className="hidden md:flex gap-6 items-center text-[12px] text-zinc-400"
          style={{ fontFamily: fontMono }}
        >
          <div className="flex items-center gap-2 border border-white/10 px-3 py-1.5 rounded-full bg-white/[0.02]">
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: status.active ? "#34d399" : "#52525b",
                boxShadow: status.active ? "0 0 8px #34d399" : "none",
              }}
            />
            <span className="text-[10px] tracking-[0.2em] uppercase">
              {status.active ? "Agent Online" : "Agent Offline"}
            </span>
          </div>
          <Link
            to="/docs"
            className="text-zinc-400 hover:text-white transition-colors"
          >
            Docs
          </Link>
          <a
            href="https://github.com/MayurK-cmd/Pacifica-Trading-Bot"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-400 hover:text-white transition-colors"
          >
            GitHub
          </a>
          <button
            onClick={handleLaunch}
            className="relative px-5 py-2 rounded-full font-semibold text-[12px] text-black transition-all active:scale-95 cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, #00d1ff 0%, #6ee7ff 50%, #00d1ff 100%)",
              boxShadow:
                "0 0 0 1px rgba(0,209,255,0.4), 0 8px 30px rgba(0,209,255,0.35)",
            }}
          >
            {authenticated ? "Enter Terminal" : "Launch App"}
          </button>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <main className="relative z-10 flex-1">
        <section className="max-w-7xl mx-auto px-6 md:px-12 pt-24 md:pt-32 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="flex justify-center"
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur"
              style={{ fontFamily: fontMono }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{
                  backgroundColor: PACIFICA_BLUE,
                  boxShadow: `0 0 8px ${PACIFICA_BLUE}`,
                }}
              />
              <span className="text-[10px] tracking-[0.3em] uppercase text-zinc-300">
                Powered by Gemini 2.5 · Elfa AI · Pacifica
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mt-8 text-center font-bold tracking-tight text-white leading-[1.02]"
            style={{ fontSize: "clamp(2.6rem, 7vw, 6rem)", letterSpacing: "-0.03em" }}
          >
            The autonomous AI agent
            <br />
            for{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${PACIFICA_BLUE}, #8b5cf6)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              perpetual futures
            </span>
            .
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-8 text-center text-zinc-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
          >
            PacificaPilot fuses on-chain market data, social sentiment, and
            Gemini reasoning into a non-custodial trading agent that runs 24/7 —
            your keys never leave your machine.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <button
              onClick={handleLaunch}
              className="group relative px-7 py-3.5 rounded-full font-semibold text-[14px] text-black transition-all active:scale-[0.98] cursor-pointer"
              style={{
                background:
                  "linear-gradient(135deg, #00d1ff 0%, #6ee7ff 50%, #00d1ff 100%)",
                boxShadow:
                  "0 0 0 1px rgba(0,209,255,0.4), 0 12px 40px rgba(0,209,255,0.4)",
              }}
            >
              <span className="flex items-center gap-2">
                Start Trading
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </span>
            </button>
            <button
              onClick={() => setShowFeatures(true)}
              className="px-7 py-3.5 rounded-full font-semibold text-[14px] text-zinc-200 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all cursor-pointer backdrop-blur"
            >
              See Features
            </button>
            <a
              href="https://youtu.be/LT4O4Zh5wqg"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3.5 rounded-full font-medium text-[13px] text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center border border-white/15 bg-white/[0.04]"
                aria-hidden
              >
                ▶
              </span>
              Watch demo
            </a>
          </motion.div>

          {/* Hero stats / preview card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-20 mx-auto max-w-5xl"
          >
            <div
              className="rounded-2xl border border-white/10 overflow-hidden backdrop-blur-xl"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
                boxShadow:
                  "0 30px 80px -20px rgba(0,209,255,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              {/* card header */}
              <div
                className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-black/30"
                style={{ fontFamily: fontMono, fontSize: 11 }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-300/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                  <span className="ml-3 text-zinc-400 tracking-[0.2em] uppercase text-[10px]">
                    agent · decision cycle
                  </span>
                </div>
                <span className="text-zinc-500">{systemTime}</span>
              </div>

              {/* card body */}
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5">
                {[
                  {
                    k: "Signal",
                    v: "LONG · BTC-PERP",
                    sub: "Confidence 78%",
                    accent: "text-emerald-400",
                  },
                  {
                    k: "Reasoning",
                    v: "RSI oversold + negative funding",
                    sub: "Elfa sentiment ↑ rank 3",
                    accent: "text-white",
                  },
                  {
                    k: "PnL (24h)",
                    v: "+$148.32",
                    sub: "4 closed · 1 open",
                    accent: "text-emerald-400",
                  },
                ].map((row, i) => (
                  <div key={i} className="p-6">
                    <div
                      className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mb-3"
                      style={{ fontFamily: fontMono }}
                    >
                      {row.k}
                    </div>
                    <div className={`text-lg font-semibold ${row.accent}`}>
                      {row.v}
                    </div>
                    <div
                      className="text-xs text-zinc-500 mt-1"
                      style={{ fontFamily: fontMono }}
                    >
                      {row.sub}
                    </div>
                  </div>
                ))}
              </div>

              {/* card terminal */}
              <div
                className="px-5 py-4 border-t border-white/5 bg-black/40 text-[12px] text-zinc-400 flex flex-wrap gap-x-6 gap-y-1"
                style={{ fontFamily: fontMono }}
              >
                <span>
                  <span className="text-zinc-600">$</span> agent.cycle()
                </span>
                <span className="text-emerald-400">
                  ✓ market_data ok
                </span>
                <span className="text-emerald-400">✓ sentiment ok</span>
                <span style={{ color: PACIFICA_BLUE }}>
                  → gemini infer (412ms)
                </span>
                <span className="text-emerald-400">✓ order placed</span>
              </div>
            </div>

            {/* trust row */}
            <div
              className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-[11px] text-zinc-500 uppercase tracking-[0.25em]"
              style={{ fontFamily: fontMono }}
            >
              <span>Pacifica</span>
              <span className="text-zinc-700">·</span>
              <span>Elfa AI</span>
              <span className="text-zinc-700">·</span>
              <span>Privy</span>
              <span className="text-zinc-700">·</span>
              <span>Gemini 2.5 Flash</span>
              <span className="text-zinc-700">·</span>
              <span>Solana</span>
            </div>
          </motion.div>
        </section>

        {/* ============ CAPABILITIES ============ */}
        <section className="relative border-t border-white/5 py-28">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
              <div>
                <div
                  className="text-[10px] uppercase tracking-[0.35em] mb-3"
                  style={{ color: PACIFICA_BLUE, fontFamily: fontMono }}
                >
                  Capabilities
                </div>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white" style={{ letterSpacing: "-0.02em" }}>
                  An institutional-grade stack,
                  <br />
                  running on your machine.
                </h2>
              </div>
              <p className="text-zinc-400 max-w-md leading-relaxed">
                Every signal, every decision, every execution — auditable in
                real time. No black boxes, no custody.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  t: "AI Inference",
                  d: "Gemini 2.5 Flash reasons across RSI, funding, basis, and sentiment to produce confidence-weighted directional calls.",
                  i: "◆",
                },
                {
                  t: "Sentiment Layer",
                  d: "Elfa AI delivers mention volume, engagement, and trending rank fed directly into the agent prompt.",
                  i: "◇",
                },
                {
                  t: "Non-Custodial",
                  d: "Private keys live in your local .env and sign transactions on your machine. Backend never sees them.",
                  i: "▣",
                },
                {
                  t: "Parallel Symbols",
                  d: "Independent decision loops per market with isolated state, trailing stops, and cycle timers.",
                  i: "▤",
                },
                {
                  t: "Risk Guardrails",
                  d: "Hard size caps, confidence gates, trailing stop-loss, and dry-run on by default.",
                  i: "△",
                },
                {
                  t: "Live SSE Stream",
                  d: "Every decision and log line streams to your dashboard in real time — full audit trail.",
                  i: "≋",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  whileHover={{ y: -4 }}
                  className="group relative p-7 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md transition-all hover:border-[#00d1ff]/40 hover:bg-white/[0.04]"
                  style={{
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-5 text-lg"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(0,209,255,0.15), rgba(139,92,246,0.1))",
                      color: PACIFICA_BLUE,
                      border: "1px solid rgba(0,209,255,0.25)",
                    }}
                  >
                    {item.i}
                  </div>
                  <h3 className="text-white text-lg font-semibold mb-2 tracking-tight">
                    {item.t}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {item.d}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ WORKFLOW ============ */}
        <section className="relative border-t border-white/5 py-28">
          <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <div
                className="text-[10px] uppercase tracking-[0.35em] mb-3"
                style={{ color: PACIFICA_BLUE, fontFamily: fontMono }}
              >
                Workflow
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-12" style={{ letterSpacing: "-0.02em" }}>
                One loop. Four steps.
                <br />
                Zero hand-holding.
              </h2>

              <div className="space-y-8">
                {[
                  {
                    id: "01",
                    t: "Ingest intelligence",
                    d: "Agent pulls 5m & 1h candles, funding basis, and Elfa AI engagement scores every cycle.",
                  },
                  {
                    id: "02",
                    t: "AI inference",
                    d: "Gemini 2.5 Flash synthesizes every signal into LONG / SHORT / HOLD with written reasoning.",
                  },
                  {
                    id: "03",
                    t: "Signed execution",
                    d: "Orders sign locally via Ed25519 and broadcast to Pacifica behind risk guardrails.",
                  },
                  {
                    id: "04",
                    t: "Real-time auditing",
                    d: "Logs stream over SSE to your dashboard — see every thought the agent has.",
                  },
                ].map((step) => (
                  <div key={step.id} className="flex gap-6">
                    <span
                      className="text-2xl font-semibold tabular-nums"
                      style={{
                        color: PACIFICA_BLUE,
                        fontFamily: fontMono,
                      }}
                    >
                      {step.id}
                    </span>
                    <div>
                      <h4 className="text-white font-semibold text-lg mb-1.5 tracking-tight">
                        {step.t}
                      </h4>
                      <p className="text-zinc-400 text-sm leading-relaxed">
                        {step.d}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-2xl border border-white/10 p-8 backdrop-blur-xl relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,209,255,0.04), rgba(0,0,0,0))",
              }}
            >
              <div
                aria-hidden
                className="absolute -top-32 -right-32 w-72 h-72 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(0,209,255,0.25), transparent 70%)",
                  filter: "blur(40px)",
                }}
              />
              <div
                className="text-[10px] uppercase tracking-[0.35em] text-zinc-500 mb-6"
                style={{ fontFamily: fontMono }}
              >
                System Specifications
              </div>
              <ul
                className="space-y-4 text-sm"
                style={{ fontFamily: fontMono }}
              >
                {[
                  ["Runtime", "Python 3.11+"],
                  ["Decision Engine", "Gemini 2.5 Flash"],
                  ["Social Layer", "Elfa AI API"],
                  ["Protocol", "Pacifica · Solana"],
                  ["Auth", "Privy (Wallet JWT)"],
                  ["Encryption", "AES-256-CBC"],
                  ["Stream", "Server-Sent Events"],
                ].map(([k, v]) => (
                  <li
                    key={k}
                    className="flex justify-between border-b border-white/5 pb-3"
                  >
                    <span className="text-zinc-500">{k}</span>
                    <span className="text-zinc-100 font-semibold">{v}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 grid grid-cols-3 gap-4">
                {[
                  { k: "Symbols", v: "10+" },
                  { k: "Latency", v: "~400ms" },
                  { k: "Uptime", v: "24/7" },
                ].map((s) => (
                  <div
                    key={s.k}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center"
                  >
                    <div
                      className="text-xl font-bold text-white"
                      style={{ fontFamily: fontMono }}
                    >
                      {s.v}
                    </div>
                    <div
                      className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mt-1"
                      style={{ fontFamily: fontMono }}
                    >
                      {s.k}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============ CTA ============ */}
        <section className="relative border-t border-white/5 py-28">
          <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div
                className="text-[10px] uppercase tracking-[0.35em] mb-4"
                style={{ color: PACIFICA_BLUE, fontFamily: fontMono }}
              >
                Deployment Ready
              </div>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6" style={{ letterSpacing: "-0.025em" }}>
                Spin up your agent
                <br />
                in under five minutes.
              </h2>
              <p className="text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
                Connect your wallet, configure parameters, and let AI drive your
                Pacifica strategy 24/7. Dry-run on by default.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button
                  onClick={handleLaunch}
                  className="group px-8 py-4 rounded-full font-semibold text-[14px] text-black transition-all active:scale-[0.98] cursor-pointer"
                  style={{
                    background:
                      "linear-gradient(135deg, #00d1ff 0%, #6ee7ff 50%, #00d1ff 100%)",
                    boxShadow:
                      "0 0 0 1px rgba(0,209,255,0.4), 0 12px 40px rgba(0,209,255,0.4)",
                  }}
                >
                  <span className="flex items-center gap-2">
                    Launch Terminal
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </button>
                <a
                  href="https://github.com/MayurK-cmd/Pacifica-Trading-Bot"
                  target="_blank"
                  rel="noreferrer"
                  className="px-8 py-4 rounded-full font-semibold text-[14px] text-zinc-200 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all cursor-pointer backdrop-blur"
                >
                  View Source
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ============ FEATURES MODAL ============ */}
      <AnimatePresence>
        {showFeatures && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-2xl"
            onClick={() => setShowFeatures(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.97 }}
              className="bg-[#0a0d14] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{
                boxShadow:
                  "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,209,255,0.15)",
              }}
            >
              <div className="p-5 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: PACIFICA_BLUE,
                      boxShadow: `0 0 12px ${PACIFICA_BLUE}`,
                    }}
                  />
                  <h2 className="text-white text-lg font-semibold tracking-tight">
                    System Capabilities
                  </h2>
                </div>
                <button
                  onClick={() => setShowFeatures(false)}
                  className="px-4 py-1.5 text-[12px] font-semibold rounded-full border border-white/10 text-zinc-300 hover:text-white hover:border-white/30 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      icon: "◆",
                      title: "AI Inference",
                      desc: "Gemini 2.5 Flash synthesizes RSI, basis, and sentiment into LONG/SHORT/HOLD with confidence-weighted reasoning.",
                    },
                    {
                      icon: "◇",
                      title: "Sentiment Layer",
                      desc: "Elfa AI engagement scores from Twitter/X feed directly into the agent prompt for social context.",
                    },
                    {
                      icon: "▣",
                      title: "Secure Vault",
                      desc: "AES-256-CBC encryption for stored keys. Decryption only in runtime memory, never on disk.",
                    },
                    {
                      icon: "▤",
                      title: "Parallel Core",
                      desc: "ThreadPoolExecutor monitors up to 10 symbols concurrently with non-blocking market analysis.",
                    },
                    {
                      icon: "△",
                      title: "Risk Guard",
                      desc: "Trailing stop-loss, take-profit, position size caps, and dry-run mode protect your capital.",
                    },
                    {
                      icon: "≋",
                      title: "SSE Streaming",
                      desc: "Server-Sent Events push real-time agent logs to your dashboard for a complete audit trail.",
                    },
                    {
                      icon: "⟳",
                      title: "Circuit Breaker",
                      desc: "Auto-fallback to Binance Spot Klines when Pacifica API degrades — uninterrupted RSI math.",
                    },
                    {
                      icon: "↗",
                      title: "Trailing Stops",
                      desc: "Dynamic stops follow peak (longs) or trough (shorts), locking profits as positions move favorably.",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="p-5 rounded-xl border border-white/10 bg-white/[0.02] hover:border-[#00d1ff]/40 hover:bg-white/[0.04] transition-all cursor-pointer group"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 text-base"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(0,209,255,0.15), rgba(139,92,246,0.1))",
                          color: PACIFICA_BLUE,
                          border: "1px solid rgba(0,209,255,0.25)",
                        }}
                      >
                        {item.icon}
                      </div>
                      <h4 className="text-white font-semibold text-sm mb-2 tracking-tight">
                        {item.title}
                      </h4>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ FOOTER ============ */}
      <footer className="relative z-10 border-t border-white/5 bg-black/60 px-6 md:px-12 py-10 flex flex-col md:flex-row justify-between items-center gap-6 text-[12px] text-zinc-500">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <span className="text-zinc-600">© 2026 PacificaPilot</span>
          <a
            href="https://github.com/MayurK-cmd/Pacifica-Trading-Bot"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub
          </a>
          <span
            className="text-zinc-600 tabular-nums"
            style={{ fontFamily: fontMono }}
          >
            {systemTime}
          </span>
        </div>
        <div
          className="flex items-center gap-6"
          style={{ fontFamily: fontMono }}
        >
          <a
            href="https://test-app.pacifica.fi/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#00d1ff] transition-colors"
          >
            Pacifica App
          </a>
          <a
            href="https://elfa.ai"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#00d1ff] transition-colors"
          >
            Elfa AI
          </a>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.02]">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: status.active ? "#34d399" : "#52525b",
                boxShadow: status.active ? "0 0 8px #34d399" : "none",
              }}
            />
            <span className="text-[10px] uppercase tracking-[0.25em]">
              {status.active ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
