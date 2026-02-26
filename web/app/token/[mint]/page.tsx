"use client";

import { use, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { getTokenByMint, getDeployerByAddress } from "@/lib/mockData";
import {
  formatSol,
  formatCompact,
  formatAddress,
  formatTimeAgo,
  getReputationGrade,
  getCollateralTier,
} from "@/lib/utils";

export default function TokenDetailPage({
  params,
}: {
  params: Promise<{ mint: string }>;
}) {
  const { mint } = use(params);
  const token = getTokenByMint(mint);
  const deployer = token ? getDeployerByAddress(token.deployer) : undefined;

  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");

  if (!token) {
    return (
      <main className="min-h-screen bg-bg pt-24 pb-16 px-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Token Not Found
          </h1>
          <p className="text-text-secondary mb-6">
            The token with mint address {formatAddress(mint, 8)} could not be
            found.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </main>
    );
  }

  const grade = getReputationGrade(token.reputationScore);
  const tier = getCollateralTier(token.collateral);

  return (
    <main className="min-h-screen bg-bg pt-24 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Token header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-text-primary">
                {token.name}
              </h1>
              <p className="text-lg font-mono text-text-muted">
                ${token.symbol}
              </p>
            </div>
            <div className="flex gap-2 sm:ml-auto">
              <Badge label={grade} variant="reputation" />
              <Badge label={tier} variant="collateral" />
            </div>
          </div>
          <p className="text-text-secondary mb-4">{token.description}</p>
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span>Deployer:</span>
            <Link
              href={`/deployer/${token.deployer}`}
              className="font-mono text-primary hover:text-primary/80 transition-colors"
            >
              {formatAddress(token.deployer)}
            </Link>
            <span className="mx-2">|</span>
            <span>Launched {formatTimeAgo(token.createdAt)}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - chart + info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chart placeholder */}
            <Card padding="lg">
              <h3 className="text-sm font-semibold text-text-secondary mb-4">
                Price Chart
              </h3>
              <div className="w-full h-64 bg-bg rounded-lg border border-border flex items-center justify-center">
                <p className="text-text-muted text-sm font-mono">
                  Chart coming soon
                </p>
              </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card padding="sm">
                <p className="text-xs text-text-muted mb-1">Market Cap</p>
                <p className="text-lg font-mono font-bold text-text-primary">
                  ${formatCompact(token.marketCap)}
                </p>
              </Card>
              <Card padding="sm">
                <p className="text-xs text-text-muted mb-1">24h Volume</p>
                <p className="text-lg font-mono font-bold text-text-primary">
                  ${formatCompact(token.volume24h)}
                </p>
              </Card>
              <Card padding="sm">
                <p className="text-xs text-text-muted mb-1">Holders</p>
                <p className="text-lg font-mono font-bold text-text-primary">
                  {token.holders.toLocaleString()}
                </p>
              </Card>
              <Card padding="sm">
                <p className="text-xs text-text-muted mb-1">Collateral</p>
                <p className="text-lg font-mono font-bold text-text-primary">
                  {formatSol(token.collateral)}
                </p>
              </Card>
            </div>

            {/* Bonding curve */}
            <Card>
              <h3 className="text-sm font-semibold text-text-secondary mb-4">
                Bonding Curve Progress
              </h3>
              <ProgressBar value={token.bondingCurveProgress} />
              <p className="text-xs text-text-muted mt-2">
                {token.bondingCurveProgress >= 100
                  ? "Bonding curve completed. Token is now fully launched."
                  : `${100 - token.bondingCurveProgress}% remaining until graduation to DEX.`}
              </p>
            </Card>
          </div>

          {/* Right column - trade */}
          <div className="space-y-6">
            {/* Buy */}
            <Card>
              <h3 className="text-sm font-semibold text-text-secondary mb-4">
                Buy
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">
                    Amount (SOL)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <Button variant="primary" className="w-full">
                  Buy ${token.symbol}
                </Button>
              </div>
            </Card>

            {/* Sell */}
            <Card>
              <h3 className="text-sm font-semibold text-text-secondary mb-4">
                Sell
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">
                    Amount (Tokens)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <Button variant="outline" className="w-full">
                  Sell ${token.symbol}
                </Button>
              </div>
            </Card>

            {/* Deployer card */}
            {deployer && (
              <Card>
                <h3 className="text-sm font-semibold text-text-secondary mb-4">
                  Deployer
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Address</span>
                    <Link
                      href={`/deployer/${deployer.address}`}
                      className="font-mono text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      {formatAddress(deployer.address)}
                    </Link>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">
                      Reputation Score
                    </span>
                    <span className="font-mono text-sm text-text-primary">
                      {deployer.reputationScore}/100
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">
                      Past Launches
                    </span>
                    <span className="font-mono text-sm text-text-primary">
                      {deployer.pastLaunches}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Rug Count</span>
                    <span
                      className={`font-mono text-sm ${deployer.rugCount > 0 ? "text-error" : "text-success"}`}
                    >
                      {deployer.rugCount}
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
