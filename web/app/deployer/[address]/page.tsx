"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { fetchDeployer, type ApiDeployer } from "@/lib/api";
import {
  formatAddress,
  formatCompact,
  formatTimeAgo,
  getReputationGrade,
} from "@/lib/utils";

function ReputationGauge({ score }: { score: number }) {
  const grade = getReputationGrade(score);
  const barWidth = Math.min(100, Math.max(0, score));
  const barColor =
    score >= 80
      ? "bg-success"
      : score >= 60
        ? "bg-warning"
        : "bg-error";
  const glowColor =
    score >= 80
      ? "rgba(52,211,153,0.4)"
      : score >= 60
        ? "rgba(251,191,36,0.4)"
        : "rgba(248,113,113,0.4)";

  return (
    <div className="flex flex-col items-center w-full">
      <div className="text-2xl font-score text-text-primary neon-text mb-1">
        {score}<span className="text-sm text-text-muted">/100</span>
      </div>
      <Badge label={grade} variant="reputation" className="mb-3" />
      <div className="w-full arcade-border p-1">
        <div
          className={`h-2.5 ${barColor} transition-all duration-700`}
          style={{ width: `${barWidth}%`, boxShadow: `0 0 8px ${glowColor}` }}
        />
      </div>
      <p className="text-[9px] font-display text-text-muted mt-2">
        {score >= 80 ? "TRUSTED" : score >= 60 ? "DECENT" : "CAUTION"}
      </p>
    </div>
  );
}

export default function DeployerPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const [deployer, setDeployer] = useState<ApiDeployer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchDeployer(address)
      .then((d) => {
        if (!cancelled) {
          setDeployer(d);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [address]);

  if (loading) {
    return (
      <main className="min-h-screen pt-20 pb-16 px-6 flex items-center justify-center">
        <p className="text-[10px] font-display text-text-muted animate-blink">LOADING PLAYER PROFILE...</p>
      </main>
    );
  }

  if (error || !deployer) {
    return (
      <main className="min-h-screen pt-20 pb-16 px-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xs font-display text-error neon-text-subtle mb-3 leading-relaxed">
            PLAYER NOT FOUND
          </h1>
          <p className="text-xs text-text-muted font-mono mb-6">
            <span className="text-primary">&gt; </span>
            No profile for {formatAddress(address, 8)}.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">[ BACK TO DASHBOARD ]</Button>
          </Link>
        </div>
      </main>
    );
  }

  const grade = getReputationGrade(deployer.reputationScore);
  const tokens = deployer.launchHistory ?? [];

  return (
    <main className="min-h-screen pt-20 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xs md:text-sm font-display text-text-primary mb-3 leading-relaxed">
            PLAYER PROFILE
          </h1>
          <p className="text-xs font-mono text-text-secondary">
            {formatAddress(address, 8)}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card padding="lg" className="flex items-center justify-center">
            <ReputationGauge score={deployer.reputationScore} />
          </Card>

          <Card padding="lg" className="md:col-span-2">
            <h3 className="text-[8px] font-display text-text-muted mb-4 tracking-wider">STATISTICS</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[8px] font-display text-text-muted mb-1 tracking-wider">LAUNCHES</p>
                <p className="text-2xl font-score text-text-primary neon-text-subtle">
                  {deployer.totalLaunches}
                </p>
              </div>
              <div>
                <p className="text-[8px] font-display text-text-muted mb-1 tracking-wider">RUG COUNT</p>
                <p
                  className={`text-2xl font-score ${deployer.rugPulls > 0 ? "text-error neon-text-subtle" : "text-success neon-text-subtle"}`}
                >
                  {deployer.rugPulls}
                </p>
              </div>
              <div>
                <p className="text-[8px] font-display text-text-muted mb-1 tracking-wider">COLLATERAL</p>
                <p className="text-2xl font-score text-text-primary neon-text-subtle">
                  {deployer.collateralLocked}
                  <span className="text-xs text-text-muted ml-1">SOL</span>
                </p>
              </div>
              <div>
                <p className="text-[8px] font-display text-text-muted mb-1 tracking-wider">GRADE</p>
                <Badge
                  label={grade}
                  variant="reputation"
                  className="mt-1"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Launch history */}
        <div>
          <h2 className="text-[10px] font-display text-text-primary mb-4 leading-relaxed tracking-wider">
            LAUNCH HISTORY
          </h2>
          {tokens.length > 0 ? (
            <div className="space-y-3">
              {tokens.map((token) => (
                <Link key={token.mint} href={`/token/${token.mint}`}>
                  <Card
                    hover
                    className="flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-[10px] font-display text-text-primary leading-relaxed">
                          {token.name}
                        </h3>
                        <span className="text-xs font-mono text-text-muted">
                          ${token.symbol}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-muted font-mono">
                        {formatTimeAgo(token.createdAt)}
                      </p>
                    </div>
                    <div className="w-28 shrink-0">
                      <ProgressBar value={token.bondingCurveProgress} />
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-score text-text-primary neon-text-subtle">
                        ${formatCompact(token.marketCap)}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-[10px] font-display text-text-muted">
                NO LAUNCHES YET.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
