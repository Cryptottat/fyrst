"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import { mockTokens } from "@/lib/mockData";
import {
  formatCompact,
  formatTimeAgo,
  getReputationGrade,
  getCollateralTier,
} from "@/lib/utils";
import { Search } from "lucide-react";
import type { Token } from "@/types";

type SortKey = "newest" | "marketCap" | "reputation";

function TokenRow({ token }: { token: Token }) {
  const grade = getReputationGrade(token.reputationScore);
  const tier = getCollateralTier(token.collateral);

  return (
    <Link href={`/token/${token.mint}`}>
      <Card hover className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-base font-semibold text-text-primary truncate">
              {token.name}
            </h3>
            <span className="text-sm font-mono text-text-muted">
              ${token.symbol}
            </span>
          </div>
          <p className="text-xs text-text-muted truncate">
            {token.description}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Badge label={grade} variant="reputation" />
          <Badge label={tier} variant="collateral" />
        </div>

        <div className="w-32 shrink-0">
          <ProgressBar value={token.bondingCurveProgress} />
        </div>

        <div className="text-right shrink-0 w-24">
          <p className="text-sm font-mono text-text-primary">
            ${formatCompact(token.marketCap)}
          </p>
          <p className="text-xs text-text-muted font-mono">
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

  const filtered = useMemo(() => {
    let tokens = [...mockTokens];

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      tokens = tokens.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.symbol.toLowerCase().includes(q),
      );
    }

    // Sort
    switch (sort) {
      case "newest":
        tokens.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
      case "marketCap":
        tokens.sort((a, b) => b.marketCap - a.marketCap);
        break;
      case "reputation":
        tokens.sort((a, b) => b.reputationScore - a.reputationScore);
        break;
    }

    return tokens;
  }, [search, sort]);

  return (
    <main className="min-h-screen bg-bg pt-24 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
            Dashboard
          </h1>
          <p className="text-text-secondary">
            Browse and discover live token launches on FYRST.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search tokens..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Sort */}
          <div className="flex gap-2">
            {(
              [
                { key: "newest", label: "Newest" },
                { key: "marketCap", label: "Market Cap" },
                { key: "reputation", label: "Reputation" },
              ] as const
            ).map((option) => (
              <button
                key={option.key}
                onClick={() => setSort(option.key)}
                className={`px-4 py-2 text-xs rounded-lg border transition-colors cursor-pointer ${
                  sort === option.key
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-text-muted hover:border-text-muted"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Token list */}
        <div className="space-y-4">
          {filtered.length > 0 ? (
            filtered.map((token) => (
              <TokenRow key={token.mint} token={token} />
            ))
          ) : (
            <div className="text-center py-16 text-text-muted">
              No tokens match your search.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
