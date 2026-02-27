"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import { fetchLaunches, type ApiToken } from "@/lib/api";
import { useAppStore, type PriceSnapshot } from "@/lib/store";
import {
  formatCompact,
  formatTimeAgo,
  getReputationGrade,
} from "@/lib/utils";
import { Search } from "lucide-react";

type SortKey = "newest" | "marketCap" | "reputation";

function PriceFlash({ snapshot, fallbackMcap }: { snapshot: PriceSnapshot | undefined; fallbackMcap: number }) {
  const mcap = snapshot?.marketCap ?? fallbackMcap;
  const changePercent =
    snapshot && snapshot.previousPrice > 0
      ? ((snapshot.price - snapshot.previousPrice) / snapshot.previousPrice) * 100
      : 0;

  const isRecent = snapshot ? Date.now() - snapshot.updatedAt < 2000 : false;
  const isUp = changePercent > 0;
  const isDown = changePercent < 0;

  return (
    <div className="text-right shrink-0 w-28">
      <p
        className={`text-sm font-score neon-text-subtle transition-colors duration-500 ${
          isRecent && isUp
            ? "text-success"
            : isRecent && isDown
              ? "text-error"
              : "text-text-primary"
        }`}
      >
        ${formatCompact(mcap)}
      </p>
      {changePercent !== 0 && (
        <p
          className={`text-[9px] font-mono ${
            isUp ? "text-success" : "text-error"
          }`}
        >
          {isUp ? "+" : ""}
          {changePercent.toFixed(2)}%
        </p>
      )}
    </div>
  );
}

function TokenRow({ token, index }: { token: ApiToken; index: number }) {
  const score = token.deployer?.reputationScore ?? 50;
  const grade = getReputationGrade(score);
  const tier = token.collateralTier || "Bronze";
  const snapshot = useAppStore((s) => s.prices.get(token.mint));
  const liveProgress = snapshot?.bondingCurveProgress ?? token.bondingCurveProgress;

  return (
    <Link href={`/token/${token.mint}`}>
      <Card hover className="flex flex-col sm:flex-row sm:items-center gap-4 relative group">
        {/* P1 cursor on hover */}
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[8px] font-display text-primary animate-p1 neon-text">P1</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[8px] font-display text-text-muted">
              #{String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="text-[10px] font-display text-text-primary truncate leading-relaxed">
              {token.name}
            </h3>
            <span className="text-xs font-mono text-text-muted">
              ${token.symbol}
            </span>
          </div>
          <p className="text-[10px] text-text-muted truncate">
            {token.description}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge label={grade} variant="reputation" />
          <Badge label={tier} variant="collateral" />
        </div>

        <div className="w-28 shrink-0">
          <ProgressBar value={liveProgress} />
        </div>

        <PriceFlash snapshot={snapshot} fallbackMcap={token.marketCap} />

        <div className="text-right shrink-0 w-16">
          <p className="text-[9px] text-text-muted font-mono">
            {formatTimeAgo(token.createdAt)}
          </p>
        </div>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tokens = useAppStore((s) => s.tokens);
  const setTokens = useAppStore((s) => s.setTokens);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchLaunches(sort === "marketCap" ? "marketcap" : sort, 50, 0)
      .then((result) => {
        if (!cancelled) {
          setTokens(result.tokens);
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
  }, [sort, setTokens]);

  const filtered = useMemo(() => {
    if (!search.trim()) return tokens;
    const q = search.toLowerCase();
    return tokens.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q),
    );
  }, [search, tokens]);

  return (
    <main className="min-h-screen pt-20 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xs md:text-sm font-display text-text-primary mb-3 leading-relaxed">
            PLAYER SELECT
          </h1>
          <p className="text-sm text-text-secondary font-mono">
            <span className="text-primary">&gt; </span>
            Browse and discover live token launches.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-card arcade-border pl-9 pr-4 py-2.5 text-xs text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex gap-2">
            {(
              [
                { key: "newest", label: "NEW" },
                { key: "marketCap", label: "MCAP" },
                { key: "reputation", label: "REP" },
              ] as const
            ).map((option) => (
              <button
                key={option.key}
                onClick={() => setSort(option.key)}
                className={`px-3 py-2.5 text-[8px] font-display border-2 transition-colors cursor-pointer ${
                  sort === option.key
                    ? "border-primary text-primary bg-primary/10 neon-text-subtle"
                    : "border-border text-text-muted hover:border-border-hover"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Token list */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted">
              <p className="text-[10px] font-display animate-blink">LOADING...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-xs font-display text-error neon-text-subtle mb-2">CONNECTION ERROR</p>
              <p className="text-xs text-text-muted font-mono">{error}</p>
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((token, i) => (
              <TokenRow key={token.mint} token={token} index={i} />
            ))
          ) : (
            <div className="text-center py-16">
              <p className="text-[10px] font-display text-text-muted">
                {search.trim()
                  ? "NO MATCH FOUND."
                  : "NO PLAYERS YET. BE THE FIRST!"}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
