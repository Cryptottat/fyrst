"use client";

import { useMemo, type ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
} from "@solana/wallet-adapter-wallets";

import "@solana/wallet-adapter-react-ui/styles.css";

// ---------------------------------------------------------------------------
// Derive Solana RPC from NEXT_PUBLIC_SOLANA_NETWORK + NEXT_PUBLIC_HELIUS_API_KEY
// Priority: explicit NEXT_PUBLIC_SOLANA_RPC > Helius-derived > public fallback
// ---------------------------------------------------------------------------
function getDefaultEndpoint(): string {
  const explicit = process.env.NEXT_PUBLIC_SOLANA_RPC;
  if (explicit) return explicit;

  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
  const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  if (heliusKey) {
    const host = network === "mainnet" ? "mainnet" : "devnet";
    return `https://${host}.helius-rpc.com/?api-key=${heliusKey}`;
  }

  return clusterApiUrl(network === "mainnet" ? "mainnet-beta" : "devnet");
}

interface Props {
  children: ReactNode;
  rpcEndpoint?: string;
}

export default function WalletProvider({ children, rpcEndpoint }: Props) {
  const endpoint = useMemo(
    () => rpcEndpoint || getDefaultEndpoint(),
    [rpcEndpoint],
  );

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
    ],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
