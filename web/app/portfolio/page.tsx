"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { fetchPortfolio, type ApiPortfolio, type ApiPortfolioHolding } from "@/lib/api";
import { useAnchorProgram, fetchBondingCurve, fetchBuyerRecord } from "@/lib/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { formatSol, formatCompact, formatAddress } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface EnrichedHolding extends ApiPortfolioHolding {
  onChainBalance?: number;
  currentPrice?: number;
  onChainPnl?: number;
}

export default function PortfolioPage() {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { program } = useAnchorProgram();

  const [portfolio, setPortfolio] = useState<ApiPortfolio | null>(null);
  const [holdings, setHoldings] = useState<EnrichedHolding[]>([]);
  const [loading, setLoading] = useState(false);
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
              const record = await fetchBuyerRecord(program, publicKey, mintPubkey);
              const currentPrice = curve
                ? curve.basePrice.add(curve.slope.mul(curve.currentSupply)).toNumber() / 1e9
                : h.avgBuyPrice;
              const onChainBalance = record ? record.totalBought.toNumber() : h.balance;
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
            <Link href="/dashboard">
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
