"use client";

import { use } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import {
  getDeployerByAddress,
  getTokensByDeployer,
} from "@/lib/mockData";
import {
  formatAddress,
  formatCompact,
  formatTimeAgo,
  getReputationGrade,
  getCollateralTier,
} from "@/lib/utils";

function ReputationGauge({ score }: { score: number }) {
  const grade = getReputationGrade(score);
  const rotation = (score / 100) * 180 - 90; // -90 to 90 degrees

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-20 overflow-hidden">
        {/* Background arc */}
        <div className="absolute inset-0 rounded-t-full border-8 border-bg-elevated" />
        {/* Colored arc overlay */}
        <div
          className="absolute inset-0 rounded-t-full border-8 border-transparent"
          style={{
            borderTopColor:
              score >= 80
                ? "#10B981"
                : score >= 60
                  ? "#D97706"
                  : "#DC2626",
            borderLeftColor:
              score >= 50
                ? score >= 80
                  ? "#10B981"
                  : "#D97706"
                : "transparent",
            borderRightColor: "transparent",
          }}
        />
        {/* Needle */}
        <div
          className="absolute bottom-0 left-1/2 origin-bottom w-0.5 h-16 bg-text-primary rounded-full"
          style={{
            transform: `translateX(-50%) rotate(${rotation}deg)`,
            transition: "transform 1s ease-out",
          }}
        />
        {/* Center dot */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-text-primary rounded-full" />
      </div>
      <div className="mt-3 text-center">
        <span className="text-3xl font-mono font-bold text-text-primary">
          {score}
        </span>
        <span className="text-lg text-text-muted">/100</span>
      </div>
      <Badge label={grade} variant="reputation" className="mt-2" />
    </div>
  );
}

export default function DeployerPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const deployer = getDeployerByAddress(address);
  const tokens = getTokensByDeployer(address);

  if (!deployer) {
    return (
      <main className="min-h-screen bg-bg pt-24 pb-16 px-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Deployer Not Found
          </h1>
          <p className="text-text-secondary mb-6">
            No deployer profile found for {formatAddress(address, 8)}.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </main>
    );
  }

  const grade = getReputationGrade(deployer.reputationScore);

  return (
    <main className="min-h-screen bg-bg pt-24 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Profile header */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
            Deployer Profile
          </h1>
          <p className="font-mono text-text-secondary">
            {formatAddress(address, 8)}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {/* Reputation gauge */}
          <Card padding="lg" className="flex items-center justify-center">
            <ReputationGauge score={deployer.reputationScore} />
          </Card>

          {/* Stats */}
          <Card padding="lg" className="md:col-span-2">
            <h3 className="text-sm font-semibold text-text-secondary mb-6">
              Statistics
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-text-muted mb-1">Past Launches</p>
                <p className="text-2xl font-mono font-bold text-text-primary">
                  {deployer.pastLaunches}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Rug Count</p>
                <p
                  className={`text-2xl font-mono font-bold ${deployer.rugCount > 0 ? "text-error" : "text-success"}`}
                >
                  {deployer.rugCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">
                  Avg Token Lifespan
                </p>
                <p className="text-2xl font-mono font-bold text-text-primary">
                  {deployer.avgTokenLifespan}
                  <span className="text-sm text-text-muted ml-1">days</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Grade</p>
                <p className="text-2xl font-bold">
                  <Badge
                    label={grade}
                    variant="reputation"
                    className="text-lg px-3 py-1"
                  />
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Launch history */}
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-6">
            Launch History
          </h2>
          {tokens.length > 0 ? (
            <div className="space-y-4">
              {tokens.map((token) => {
                const tokenGrade = getReputationGrade(token.reputationScore);
                const tier = getCollateralTier(token.collateral);
                return (
                  <Link key={token.mint} href={`/token/${token.mint}`}>
                    <Card
                      hover
                      className="flex flex-col sm:flex-row sm:items-center gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-base font-semibold text-text-primary">
                            {token.name}
                          </h3>
                          <span className="text-sm font-mono text-text-muted">
                            ${token.symbol}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted">
                          Launched {formatTimeAgo(token.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge label={tokenGrade} variant="reputation" />
                        <Badge label={tier} variant="collateral" />
                      </div>
                      <div className="w-28 shrink-0">
                        <ProgressBar value={token.bondingCurveProgress} />
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-mono text-text-primary">
                          ${formatCompact(token.marketCap)}
                        </p>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-text-muted">
              No launches found for this deployer.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
