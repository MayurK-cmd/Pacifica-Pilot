import { Outlet } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { Navbar } from "./Navbar";

export function AppShell() {
  const { publicKey } = useWallet();
  const account = publicKey ? publicKey.toBase58() : "";

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <main className="pt-16 min-h-[calc(100vh-4rem)]">
        <Outlet context={{ account }} />
      </main>
    </div>
  );
}

export interface ShellContext {
  account: string;
}
