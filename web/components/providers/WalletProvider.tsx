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
// Single switch: NEXT_PUBLIC_DEVNET=true (default) or false for mainnet
// Helius key from NEXT_PUBLIC_HELIUS_API_KEY — same key works for both networks
// ---------------------------------------------------------------------------
function getDefaultEndpoint(): string {
  const isDevnet = process.env.NEXT_PUBLIC_DEVNET !== "false";
  const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  if (heliusKey) {
    return `https://${isDevnet ? "devnet" : "mainnet"}.helius-rpc.com/?api-key=${heliusKey}`;
  }
  return clusterApiUrl(isDevnet ? "devnet" : "mainnet-beta");
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
