import { useMemo } from "react";
import type { ReactNode } from "react";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";

// RPC used for read-only Solana reads (e.g. SOL balance). Override with
// VITE_SOLANA_RPC_URL. No keys, no signing — connection is address-only.
export function getSolanaEndpoint(): string {
  const custom = import.meta.env.VITE_SOLANA_RPC_URL as string | undefined;
  if (custom && custom.length > 0) return custom;
  return clusterApiUrl(WalletAdapterNetwork.Mainnet);
}

export function WalletProviders({ children }: { children: ReactNode }) {
  const endpoint = useMemo(() => getSolanaEndpoint(), []);

  const wallets = useMemo(
    () => [
      // Explicit adapters: guaranteed listing even where standard
      // auto-detection lags.
      new PhantomWalletAdapter(),
      new BackpackWalletAdapter(),
      // MetaMask (Solana), Jupiter, Solflare, Coinbase, Ledger and any
      // other Wallet Standard wallet are picked up automatically by
      // WalletProvider via window standard-wallet discovery — no extra
      // package needed. They appear in the same connect modal.
    ],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
