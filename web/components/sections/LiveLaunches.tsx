"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import { fetchLaunches, type ApiToken } from "@/lib/api";
import {
  formatCompact,
  formatTimeAgo,
  getReputationGrade,
} from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface TokenCardProps {
  token: ApiToken;
  index: number;
}

function TokenCard({ token, index }: TokenCardProps) {
  const score = token.deployer?.reputationScore ?? 50;
  const grade = getReputationGrade(score);
  const tier = token.collateralTier || "Bronze";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Link href={`/token/${token.mint}`}>
        <Card hover className="h-full">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-text-primary">
                {token.name}
              </h3>
              <p className="text-sm font-mono text-text-muted">
                ${token.symbol}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge label={grade} variant="reputation" />
              <Badge label={tier} variant="collateral" />
            </div>
          </div>

          <ProgressBar value={token.bondingCurveProgress} className="mb-4" />

          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-text-muted">MCap </span>
              <span className="font-mono text-text-secondary">
                ${formatCompact(token.marketCap)}
              </span>
            </div>
            <span className="text-xs text-text-muted font-mono">
              {formatTimeAgo(token.createdAt)}
            </span>
          </div>
        </Card>
      </Link>
    </motion.div>
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
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="flex items-center justify-between mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
              Live Launches
            </h2>
            <p className="text-text-secondary">
              Tokens currently in their bonding curve phase.
            </p>
          </div>
          {showViewAll && (
            <Link
              href="/dashboard"
              className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
            >
              View All &rarr;
            </Link>
          )}
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-text-muted">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading...
          </div>
        ) : tokens.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tokens.map((token, i) => (
              <TokenCard key={token.mint} token={token} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-text-muted">
            No launches yet. Be the first to launch a token!
          </div>
        )}
      </div>
    </section>
  );
}
