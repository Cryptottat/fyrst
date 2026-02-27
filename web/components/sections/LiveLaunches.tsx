"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import { fetchLaunches, type ApiToken } from "@/lib/api";
import {
  formatCompact,
  formatTimeAgo,
  getReputationGrade,
} from "@/lib/utils";

interface TokenCardProps {
  token: ApiToken;
  index: number;
}

function TokenCard({ token, index }: TokenCardProps) {
  const score = token.deployer?.reputationScore ?? 50;
  const grade = getReputationGrade(score);
  const tier = token.collateralTier || "Bronze";

  return (
    <Link href={`/token/${token.mint}`}>
      <div className="arcade-border bg-bg-card p-5 relative group hover:border-primary hover:shadow-[0_0_20px_rgba(167,139,250,0.2)] transition-all h-full">
        {/* P1 cursor on hover */}
        <div className="absolute -top-2.5 -left-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[8px] font-display text-primary animate-p1 neon-text">P1</span>
        </div>

        {/* Player slot number */}
        <div className="absolute top-2 right-3">
          <span className="text-[8px] font-display text-text-muted">
            #{String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <div className="flex items-start justify-between mb-3 mt-1">
          <div>
            <h3 className="text-[10px] font-display text-text-primary leading-relaxed">
              {token.name}
            </h3>
            <p className="text-xs font-mono text-text-muted mt-1">
              ${token.symbol}
            </p>
          </div>
          <div className="flex gap-1.5 mt-0.5">
            <Badge label={grade} variant="reputation" />
            <Badge label={tier} variant="collateral" />
          </div>
        </div>

        <ProgressBar value={token.bondingCurveProgress} className="mb-3" />

        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="text-text-muted font-display text-[8px]">MCap </span>
            <span className="font-score text-sm text-text-secondary neon-text-subtle">
              ${formatCompact(token.marketCap)}
            </span>
          </div>
          <span className="text-[9px] text-text-muted font-mono">
            {formatTimeAgo(token.createdAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}

interface LiveLaunchesProps {
  limit?: number;
  showViewAll?: boolean;
}

export default function LiveLaunches({ limit = 6, showViewAll = true }: LiveLaunchesProps) {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLaunches("newest", limit, 0)
      .then((result) => {
        setTokens(result.tokens);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [limit]);

  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-xs md:text-sm font-display text-text-primary mb-3 leading-relaxed">
              CHALLENGER APPROACHING
            </h2>
            <p className="text-sm text-text-secondary font-mono">
              <span className="text-primary">&gt; </span>
              Tokens in bonding curve phase.
            </p>
          </div>
          {showViewAll && (
            <Link
              href="/dashboard"
              className="text-[9px] font-display text-primary hover:text-primary/80 transition-colors neon-text-subtle"
            >
              [ VIEW ALL CHALLENGERS ]
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <div className="text-xs font-display animate-blink">LOADING...</div>
          </div>
        ) : tokens.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tokens.map((token, i) => (
              <TokenCard key={token.mint} token={token} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-[10px] font-display text-text-muted animate-blink">
              NO CHALLENGERS YET. BE THE FIRST!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
