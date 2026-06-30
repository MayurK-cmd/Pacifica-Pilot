import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PacificaPilot — Terminal AI trading agent for Pacifica Perpetuals" },
      {
        name: "description",
        content:
          "A fully terminal-based, non-custodial AI trading agent for Pacifica Perpetuals on Solana. Your keys, your machine, your rules.",
      },
      { property: "og:title", content: "PacificaPilot" },
      {
        property: "og:description",
        content: "Open-source, non-custodial AI trading agent CLI for Pacifica Perpetual Futures.",
      },
    ],
  }),
  component: LandingPage,
});
