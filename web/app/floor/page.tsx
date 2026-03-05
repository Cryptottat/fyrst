"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import { fetchLaunches, type ApiToken } from "@/lib/api";
import { useAppStore, type PriceSnapshot } from "@/lib/store";
import {
  formatCompact,
  formatTimeAgo,
  getReputationGrade,
  formatSol,
  fetchSolPrice,
} from "@/lib/utils";
import { Search, Clock, Shield } from "lucide-react";

type SortKey = "lastTrade" | "newest" | "marketCap" | "reputation" | "pressure" | "deadline" | "collateral";

/** Format remaining time as compact string (with seconds when < 1h) */
function formatRemaining(deadlineStr: string | null, now: number): string {
  if (!deadlineStr) return "--";
  const remaining = new Date(deadlineStr).getTime() - now;
  if (remaining <= 0) return "EXPIRED";
  const hours = Math.floor(remaining / 3600000);
  const mins = Math.floor((remaining % 3600000) / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m ${String(secs).padStart(2, "0")}s`;
}

function TokenCard({ token, index, flash, now }: { token: ApiToken; index: number; flash: boolean; now: number }) {
  const score = token.deployer?.reputationScore ?? 50;
  const grade = getReputationGrade(score);
  const tier = token.collateralTier || "Bronze";
  const snapshot: PriceSnapshot | undefined = useAppStore((s) => s.prices.get(token.mint));
  const solPrice = useAppStore((s) => s.solPrice);
  const liveMcapSol = snapshot?.marketCap ?? token.marketCap;
  const liveMcap = solPrice > 0 ? liveMcapSol * solPrice : liveMcapSol;
  const liveProgress = snapshot?.bondingCurveProgress ?? token.bondingCurveProgress;

  const changePercent =
    snapshot && snapshot.previousPrice > 0
      ? ((snapshot.price - snapshot.previousPrice) / snapshot.previousPrice) * 100
      : 0;
  const isRecent = snapshot ? Date.now() - snapshot.updatedAt < 2000 : false;
  const isUp = changePercent > 0;
  const isDown = changePercent < 0;

  return (
    <Link href={`/token/${token.mint}`}>
      <div
        className={`arcade-border bg-bg-card p-4 relative group hover:border-primary hover:shadow-[0_0_20px_rgba(167,139,250,0.2)] transition-all h-full ${
          flash ? "animate-card-flash" : ""
        }`}
      >
        {/* P1 cursor on hover */}
        <div className="absolute -top-2.5 -left-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[8px] font-display text-primary animate-p1 neon-text">P1</span>
        </div>

        {/* Slot number */}
        <div className="absolute top-2 right-3">
          <span className="text-[8px] font-display text-text-muted">
            #{String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Image + Name */}
        <div className="flex items-start gap-3 mb-3 mt-1">
          {token.imageUrl && (
            <img
              src={token.imageUrl}
              alt={token.name}
              className="w-12 h-12 object-cover arcade-border flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-[10px] font-display text-text-primary leading-relaxed truncate">
              {token.name}
            </h3>
            <p className="text-xs font-mono text-text-muted mt-0.5">
              ${token.symbol}
            </p>
            <div className="flex gap-1.5 mt-1.5">
              <Badge label={grade} variant="reputation" />
              <Badge label={tier} variant="collateral" />
            </div>
          </div>
        </div>

        <ProgressBar value={liveProgress} className="mb-3" />

        <div className="flex items-center justify-between text-xs mb-2">
          <div>
            <span className="text-text-muted font-display text-[8px]">MCap </span>
            <span
              className={`font-score text-sm neon-text-subtle transition-colors duration-500 ${
                isRecent && isUp
                  ? "text-success"
                  : isRecent && isDown
                    ? "text-error"
                    : "text-text-secondary"
              }`}
            >
              {solPrice > 0 ? `$${formatCompact(liveMcap)}` : `${formatCompact(liveMcapSol)} SOL`}
            </span>
            {changePercent !== 0 && (
              <span
                className={`ml-1 text-[9px] font-mono ${
                  isUp ? "text-success" : "text-error"
                }`}
              >
                {isUp ? "+" : ""}{changePercent.toFixed(1)}%
              </span>
            )}
          </div>
          <span className="text-[9px] text-text-muted font-mono">
            {formatTimeAgo(token.createdAt)}
          </span>
        </div>

        {/* Deadline + Escrow */}
        <div className="flex items-center justify-between font-mono border-t border-border/40 pt-2 mt-1">
          <span className="flex items-center gap-1.5 text-xs">
            <Clock className="w-3.5 h-3.5 text-warning" />
            <span className="text-text-secondary font-display">{formatRemaining(token.deadlineTimestamp, now)}</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="text-text-secondary font-score">{formatSol(token.collateralAmount)}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("lastTrade");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashMint, setFlashMint] = useState<string | null>(null);
  const prevFirstRef = useRef<string | null>(null);

  const tokens = useAppStore((s) => s.tokens);
  const setTokens = useAppStore((s) => s.setTokens);
  const solPrice = useAppStore((s) => s.solPrice);
  const setSolPrice = useAppStore((s) => s.setSolPrice);

  // Fetch SOL price: Jupiter → CoinGecko → Binance → Helius fallback chain
  useEffect(() => {
    if (solPrice > 0) return;
    fetchSolPrice().then((p) => { if (p) setSolPrice(p); });
  }, [solPrice, setSolPrice]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Client-side sorts don't need server ordering
    const clientSideSorts = ["pressure", "deadline", "collateral"];
    const apiSort = clientSideSorts.includes(sort) ? "newest" :
      sort === "marketCap" ? "marketcap" :
      sort === "lastTrade" ? "lastTrade" :
      sort;

    fetchLaunches(apiSort, 50, 0)
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

  // Tick every second for countdown timers
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    let list = tokens;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.symbol.toLowerCase().includes(q),
      );
    }

    // Client-side sorts for pressure / deadline / collateral
    if (sort === "pressure") {
      list = [...list].sort((a, b) => {
        const remA = Math.max((new Date(a.deadlineTimestamp || 0).getTime() - now) / 1000, 1);
        const remB = Math.max((new Date(b.deadlineTimestamp || 0).getTime() - now) / 1000, 1);
        const pA = a.graduated ? -1 : (a.collateralAmount / remA) * 100;
        const pB = b.graduated ? -1 : (b.collateralAmount / remB) * 100;
        return pB - pA;
      });
    } else if (sort === "deadline") {
      list = [...list].sort((a, b) => {
        const remA = a.deadlineTimestamp ? new Date(a.deadlineTimestamp).getTime() - now : Infinity;
        const remB = b.deadlineTimestamp ? new Date(b.deadlineTimestamp).getTime() - now : Infinity;
        return remA - remB; // most urgent first
      });
    } else if (sort === "collateral") {
      list = [...list].sort((a, b) => b.collateralAmount - a.collateralAmount);
    } else if (sort === "newest") {
      list = [...list].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return list;
  }, [search, tokens, sort, now]);

  // Flash effect when any token has a trade (from socket price:update)
  const lastTradedMint = useAppStore((s) => s.lastTradedMint);
  const setLastTradedMint = useAppStore((s) => s.setLastTradedMint);
  useEffect(() => {
    if (!lastTradedMint) return;
    setFlashMint(lastTradedMint);
    setLastTradedMint(null);
    const timer = setTimeout(() => setFlashMint(null), 1500);
    return () => clearTimeout(timer);
  }, [lastTradedMint, setLastTradedMint]);

  return (
    <main className="min-h-screen pt-20 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
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

          <div className="flex gap-2 flex-wrap">
            {(
              [
                { key: "lastTrade", label: "LAST TRADE" },
                { key: "newest", label: "NEW" },
                { key: "marketCap", label: "MCAP" },
                { key: "reputation", label: "REP" },
                { key: "pressure", label: "PRESSURE" },
                { key: "deadline", label: "DEADLINE" },
                { key: "collateral", label: "ESCROW" },
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

        {/* Token card grid */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((token, i) => (
              <TokenCard
                key={token.mint}
                token={token}
                index={i}
                flash={flashMint === token.mint}
                now={now}
              />
            ))}
          </div>
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
    </main>
  );
}
