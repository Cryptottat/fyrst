"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { fetchLaunches, type ApiToken } from "@/lib/api";
import { usePressureScores, formatCountdown } from "@/hooks/usePressureScore";
import { formatSol, formatAddress } from "@/lib/utils";

export default function BountyPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { tokens: t } = await fetchLaunches("newest", 100);
        if (!cancelled) setTokens(t);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const entries = usePressureScores(tokens);

  return (
    <main className="min-h-screen pt-20 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xs md:text-sm font-display text-text-primary mb-3 leading-relaxed">
            BOUNTY BOARD
          </h1>
          <p className="text-sm text-text-secondary font-mono">
            <span className="text-primary">&gt; </span>
            Tokens ranked by Pressure Score. Higher score = more collateral + less time remaining.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <p className="text-[10px] font-display text-text-muted animate-pulse">
              SCANNING TARGETS...
            </p>
          </div>
        ) : entries.length === 0 ? (
          <Card padding="lg">
            <div className="text-center py-12">
              <p className="text-xs font-display text-text-muted">NO ACTIVE BOUNTIES</p>
              <p className="text-[10px] font-mono text-text-muted mt-2">
                All tokens have graduated or expired.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[8px] font-display text-text-muted tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-3">TOKEN</div>
              <div className="col-span-2 text-right">COLLATERAL</div>
              <div className="col-span-2 text-right">REMAINING</div>
              <div className="col-span-2 text-right">PRESSURE</div>
              <div className="col-span-2 text-right">TIER</div>
            </div>

            {entries.map((entry, i) => {
              const token = tokens.find((t) => t.mint === entry.mint);
              const isExpired = entry.remainingMs <= 0;
              const isUrgent = entry.remainingMs > 0 && entry.remainingMs < 3_600_000;

              return (
                <Link key={entry.mint} href={`/token/${entry.mint}`}>
                  <Card padding="sm" className={`hover:border-primary/30 transition-colors cursor-pointer ${isUrgent ? "border-error/30" : ""}`}>
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-1 text-[10px] font-display text-text-muted">
                        {i + 1}
                      </div>
                      <div className="col-span-3">
                        <div className="text-[10px] font-display text-text-primary">${entry.symbol}</div>
                        <div className="text-[9px] font-mono text-text-muted">{entry.name}</div>
                      </div>
                      <div className="col-span-2 text-right text-[10px] font-mono text-primary">
                        {formatSol(entry.collateralAmount)}
                      </div>
                      <div className={`col-span-2 text-right text-[10px] font-mono ${isExpired ? "text-error" : isUrgent ? "text-error animate-pulse" : "text-text-secondary"}`}>
                        {formatCountdown(entry.remainingMs)}
                      </div>
                      <div className="col-span-2 text-right text-[10px] font-mono text-secondary font-bold">
                        {entry.pressureScore.toFixed(1)}
                      </div>
                      <div className="col-span-2 text-right">
                        <Badge label={token?.collateralTier || "Iron"} variant="collateral" />
                      </div>
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
