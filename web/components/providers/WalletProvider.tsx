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

const RPC_PROXY_PATH = "/api/rpc";

function getEndpoint(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${RPC_PROXY_PATH}`;
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) return `${site.replace(/\/$/, "")}${RPC_PROXY_PATH}`;
  return RPC_PROXY_PATH;
}

function getWsEndpoint(): string {
  const isDevnet = process.env.NEXT_PUBLIC_DEVNET !== "false";
  const cluster = isDevnet ? "devnet" : "mainnet-beta";
  return clusterApiUrl(cluster).replace(/^http/, "ws");
}

interface Props {
  children: ReactNode;
  rpcEndpoint?: string;
}

export default function WalletProvider({ children, rpcEndpoint }: Props) {
  const endpoint = useMemo(() => rpcEndpoint || getEndpoint(), [rpcEndpoint]);
  const wsEndpoint = useMemo(() => getWsEndpoint(), []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
    ],
    [],
  );

  return (
    <ConnectionProvider
      endpoint={endpoint}
      config={{ commitment: "confirmed", wsEndpoint }}
    >
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
