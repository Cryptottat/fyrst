"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { fetchPortfolio, fetchDeployer, type ApiPortfolio, type ApiPortfolioHolding } from "@/lib/api";
import {
  useAnchorProgram,
  fetchBondingCurve,
  getEscrowPDA,
  getCurvePDA,
} from "@/lib/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Connection } from "@solana/web3.js";
import { formatSol, formatCompact, formatAddress } from "@/lib/utils";
import { TrendingUp, TrendingDown, Shield, Coins, Loader2 } from "lucide-react";
import { useConnection } from "@solana/wallet-adapter-react";

interface EnrichedHolding extends ApiPortfolioHolding {
  onChainBalance?: number;
  currentPrice?: number;
  onChainPnl?: number;
}

interface ClaimableItem {
  mint: string;
  name: string;
  symbol: string;
  escrowLamports: number;
  claimableFeeLamports: number;
  graduated: boolean;
}

async function fetchClaimableItems(
  connection: Connection,
  wallet: PublicKey,
  programId: PublicKey,
): Promise<ClaimableItem[]> {
  try {
    const deployer = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "https://fyrst-production.up.railway.app"}/api/deployer/${wallet.toBase58()}`
    );
    if (!deployer.ok) return [];
    const data = await deployer.json();
    const tokens = data.data?.launchHistory ?? [];

    const items: ClaimableItem[] = [];
    for (const t of tokens) {
      const mintPubkey = new PublicKey(t.mint);
      const [escrowPDA] = getEscrowPDA(wallet, mintPubkey);
      const [curvePDA] = getCurvePDA(mintPubkey);

      const [escrowInfo, curveInfo] = await Promise.all([
        connection.getAccountInfo(escrowPDA).catch(() => null),
        connection.getAccountInfo(curvePDA).catch(() => null),
      ]);

      const escrowLamports = escrowInfo?.lamports ?? 0;

      // Read claimable_fees from curve account (offset depends on struct layout)
      let claimableFeeLamports = 0;
      if (curveInfo?.data) {
        // BondingCurve struct: 8(discriminator) + 32(deployer) + 32(token_mint) + 8*5(reserves) + 8(reserve_balance) + 8(total_deployer_fees) + 8(claimed_deployer_fees) + ...
        // total_deployer_fees at offset 8+32+32+40+8 = 120
        // claimed_deployer_fees at offset 128
        // max_reserve_reached at offset 136
        // graduated at offset 144 (bool)
        const buf = curveInfo.data;
        if (buf.length >= 144) {
          const totalFees = Number(buf.readBigUInt64LE(120));
          const claimedFees = Number(buf.readBigUInt64LE(128));
          const maxReserve = Number(buf.readBigUInt64LE(136));
          const graduated = buf[144] === 1;
          const GRAD_THRESHOLD = 5_000_000_000; // 5 SOL devnet
          const unlockRatio = graduated ? 1.0 : Math.min(maxReserve / GRAD_THRESHOLD, 1.0);
          const unlocked = Math.floor(totalFees * unlockRatio);
          claimableFeeLamports = Math.max(unlocked - claimedFees, 0);
        }
      }

      if (escrowLamports > 0 || claimableFeeLamports > 0) {
        items.push({
          mint: t.mint,
          name: t.name,
          symbol: t.symbol,
          escrowLamports,
          claimableFeeLamports,
          graduated: t.graduated,
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

export default function PortfolioPage() {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { program } = useAnchorProgram();
  const { connection } = useConnection();

  const [portfolio, setPortfolio] = useState<ApiPortfolio | null>(null);
  const [holdings, setHoldings] = useState<EnrichedHolding[]>([]);
  const [claimables, setClaimables] = useState<ClaimableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPortfolio = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchPortfolio(publicKey.toBase58());
      setPortfolio(data);

      if (program && data.holdings.length > 0) {
        const enriched: EnrichedHolding[] = await Promise.all(
          data.holdings.map(async (h) => {
            try {
              const mintPubkey = new PublicKey(h.tokenMint);
              const curve = await fetchBondingCurve(program, mintPubkey);
              const currentPrice = curve
                ? (curve.virtualSolReserves.toNumber() / 1e9) / (curve.virtualTokenReserves.toNumber() / 1e6)
                : h.avgBuyPrice;
              const onChainBalance = h.balance;
              const costBasis = onChainBalance * h.avgBuyPrice;
              const currentValue = onChainBalance * currentPrice;
              const onChainPnl = costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0;
              return { ...h, onChainBalance, currentPrice, onChainPnl };
            } catch {
              return { ...h };
            }
          }),
        );
        setHoldings(enriched);
      } else {
        setHoldings(data.holdings.map((h) => ({ ...h })));
      }
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setLoading(false);
    }
  }, [publicKey, program]);

  // Load claimable escrows & fees
  useEffect(() => {
    if (!publicKey || !connection) return;
    setClaimLoading(true);
    const programId = new PublicKey("CcyByKGzRDK17icyNGAgdUN4q7WzbL1BPi4BNzqytyMP");
    fetchClaimableItems(connection, publicKey, programId).then((items) => {
      setClaimables(items);
      setClaimLoading(false);
    });
  }, [publicKey, connection]);

  useEffect(() => {
    if (connected) loadPortfolio();
  }, [connected, loadPortfolio]);

  const totalValue = holdings.reduce(
    (sum, h) => sum + (h.currentPrice ?? h.avgBuyPrice) * (h.onChainBalance ?? h.balance), 0,
  );

  if (!connected) {
    return (
      <main className="min-h-screen pt-20 pb-16 px-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-xs font-display text-text-primary mb-3 leading-relaxed">
            CONNECT WALLET
          </h1>
          <p className="text-xs text-text-secondary font-mono mb-6">
            <span className="text-primary">&gt; </span>
            Insert your player card to view your inventory.
          </p>
          <Button variant="primary" size="lg" onClick={() => setVisible(true)}>
            [ CONNECT ]
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-20 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xs md:text-sm font-display text-text-primary mb-3 leading-relaxed">
            INVENTORY
          </h1>
          <p className="text-xs font-mono text-text-secondary">
            {formatAddress(publicKey?.toBase58() ?? "", 8)}
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          <Card padding="sm">
            <p className="text-[8px] font-display text-text-muted mb-1 tracking-wider">TOTAL VALUE</p>
            <p className="text-lg font-score text-text-primary neon-text-subtle">{formatSol(totalValue)}</p>
          </Card>
          <Card padding="sm">
            <p className="text-[8px] font-display text-text-muted mb-1 tracking-wider">HOLDINGS</p>
            <p className="text-lg font-score text-text-primary neon-text-subtle">{holdings.length}</p>
          </Card>
          <Card padding="sm">
            <p className="text-[8px] font-display text-text-muted mb-1 tracking-wider">WALLET</p>
            <p className="text-[10px] font-mono text-primary truncate neon-text-subtle">{publicKey?.toBase58()}</p>
          </Card>
        </div>

        {/* Claimable Escrows & Fees */}
        {claimables.length > 0 && (
          <div className="mb-8">
            <h2 className="text-[10px] font-display text-primary mb-3 neon-text-subtle tracking-wider">
              CLAIMABLE REWARDS
            </h2>
            <div className="space-y-2">
              {claimables.map((item) => (
                <Link key={item.mint} href={`/token/${item.mint}`}>
                  <Card hover className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-[10px] font-display text-text-primary leading-relaxed">{item.name}</h3>
                        <span className="text-xs font-mono text-text-muted">${item.symbol}</span>
                        {item.graduated && (
                          <span className="text-[7px] font-display px-1.5 py-0.5 bg-success/20 text-success">GRADUATED</span>
                        )}
                      </div>
                      <p className="text-[10px] text-text-muted font-mono">{formatAddress(item.mint)}</p>
                    </div>
                    <div className="flex gap-4 shrink-0">
                      {item.escrowLamports > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-accent" />
                          <div className="text-right">
                            <p className="text-[8px] text-text-muted font-display">ESCROW</p>
                            <p className="text-sm font-score text-accent neon-text-subtle">
                              {formatSol(item.escrowLamports / 1e9)}
                            </p>
                          </div>
                        </div>
                      )}
                      {item.claimableFeeLamports > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-success" />
                          <div className="text-right">
                            <p className="text-[8px] text-text-muted font-display">FEES</p>
                            <p className="text-sm font-score text-success neon-text-subtle">
                              {formatSol(item.claimableFeeLamports / 1e9)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
        {claimLoading && (
          <div className="mb-8 flex items-center gap-2 text-text-muted">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-[10px] font-display">SCANNING CLAIMABLE REWARDS...</span>
          </div>
        )}

        {/* Holdings */}
        <h2 className="text-[10px] font-display text-text-muted mb-3 tracking-wider">
          TOKEN HOLDINGS
        </h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-[10px] font-display text-text-muted animate-blink">LOADING SAVE FILE...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-[10px] font-display text-error neon-text-subtle">{error}</p>
          </div>
        ) : holdings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[10px] font-display text-text-muted mb-4">INVENTORY EMPTY.</p>
            <Link href="/floor">
              <Button variant="outline">[ BROWSE LAUNCHES ]</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {holdings.map((h) => {
              const pnl = h.onChainPnl ?? h.pnlPercent;
              const isPositive = pnl >= 0;
              return (
                <Link key={h.tokenMint} href={`/token/${h.tokenMint}`}>
                  <Card hover className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-[10px] font-display text-text-primary leading-relaxed">{h.tokenName}</h3>
                        <span className="text-xs font-mono text-text-muted">${h.tokenSymbol}</span>
                      </div>
                      <p className="text-[10px] text-text-muted font-mono">{formatAddress(h.tokenMint)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono text-text-primary">{formatCompact(h.onChainBalance ?? h.balance)} tokens</p>
                      <p className="text-[10px] text-text-muted font-mono">
                        {formatSol((h.currentPrice ?? h.avgBuyPrice) * (h.onChainBalance ?? h.balance))}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1 shrink-0 ${isPositive ? "text-success neon-text-subtle" : "text-error neon-text-subtle"}`}>
                      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span className="text-sm font-score font-bold">{isPositive ? "+" : ""}{pnl.toFixed(1)}%</span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
