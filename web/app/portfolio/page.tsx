"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { fetchPortfolio, type ApiPortfolio, type ApiPortfolioHolding } from "@/lib/api";
import { useAnchorProgram, fetchBondingCurve, fetchBuyerRecord } from "@/lib/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { formatSol, formatCompact, formatAddress } from "@/lib/utils";
import { Loader2, TrendingUp, TrendingDown, Wallet } from "lucide-react";

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

      // Enrich with on-chain data
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
              const onChainPnl = costBasis > 0
                ? ((currentValue - costBasis) / costBasis) * 100
                : 0;

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
      setError(err instanceof Error ? err.message : "Failed to load portfolio");
      setLoading(false);
    }
  }, [publicKey, program]);

  useEffect(() => {
    if (connected) loadPortfolio();
  }, [connected, loadPortfolio]);

  const totalValue = holdings.reduce(
    (sum, h) => sum + (h.currentPrice ?? h.avgBuyPrice) * (h.onChainBalance ?? h.balance),
    0,
  );

  if (!connected) {
    return (
      <main className="min-h-screen bg-bg pt-24 pb-16 px-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Wallet className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Connect Your Wallet
          </h1>
          <p className="text-text-secondary mb-6">
            Connect your Solana wallet to view your portfolio and holdings.
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => setVisible(true)}
          >
            Connect Wallet
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg pt-24 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
            Portfolio
          </h1>
          <p className="text-text-secondary font-mono">
            {formatAddress(publicKey?.toBase58() ?? "", 8)}
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card padding="sm">
            <p className="text-xs text-text-muted mb-1">Total Value</p>
            <p className="text-xl font-mono font-bold text-text-primary">
              {formatSol(totalValue)}
            </p>
          </Card>
          <Card padding="sm">
            <p className="text-xs text-text-muted mb-1">Holdings</p>
            <p className="text-xl font-mono font-bold text-text-primary">
              {holdings.length}
            </p>
          </Card>
          <Card padding="sm">
            <p className="text-xs text-text-muted mb-1">Wallet</p>
            <p className="text-sm font-mono text-primary truncate">
              {publicKey?.toBase58()}
            </p>
          </Card>
        </div>

        {/* Holdings list */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-text-muted">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading portfolio...
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-error mb-2">Failed to load portfolio</p>
            <p className="text-text-muted text-sm">{error}</p>
          </div>
        ) : holdings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-muted mb-4">No holdings yet.</p>
            <Link href="/dashboard">
              <Button variant="outline">Browse Launches</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {holdings.map((h) => {
              const pnl = h.onChainPnl ?? h.pnlPercent;
              const isPositive = pnl >= 0;

              return (
                <Link key={h.tokenMint} href={`/token/${h.tokenMint}`}>
                  <Card hover className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base font-semibold text-text-primary">
                          {h.tokenName}
                        </h3>
                        <span className="text-sm font-mono text-text-muted">
                          ${h.tokenSymbol}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted font-mono">
                        {formatAddress(h.tokenMint)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono text-text-primary">
                        {formatCompact(h.onChainBalance ?? h.balance)} tokens
                      </p>
                      <p className="text-xs text-text-muted font-mono">
                        {formatSol((h.currentPrice ?? h.avgBuyPrice) * (h.onChainBalance ?? h.balance))}
                      </p>
                    </div>

                    <div className={`flex items-center gap-1 shrink-0 ${
                      isPositive ? "text-success" : "text-error"
                    }`}>
                      {isPositive ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span className="text-sm font-mono font-semibold">
                        {isPositive ? "+" : ""}{pnl.toFixed(1)}%
                      </span>
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
