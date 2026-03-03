"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { fetchLaunches, type ApiToken } from "@/lib/api";
import { usePressureScores, formatCountdown } from "@/hooks/usePressureScore";
import { formatSol } from "@/lib/utils";

/**
 * Top Marquee: DEADLINE APPROACHING — tokens with < 1 hour remaining,
 * sorted by remaining time ascending (most urgent first).
 * Scrolls left-to-right.
 */
export function TopMarquee() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { tokens: t } = await fetchLaunches("newest", 50);
        if (!cancelled) setTokens(t);
      } catch {
        // silent
      }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const entries = usePressureScores(tokens);

  // Only show tokens with < 1 hour remaining
  const urgent = useMemo(
    () => entries.filter((e) => e.remainingMs > 0 && e.remainingMs < 3_600_000)
      .sort((a, b) => a.remainingMs - b.remainingMs),
    [entries],
  );

  if (urgent.length === 0) return null;

  const items = urgent.map((e) => (
    <Link
      key={e.mint}
      href={`/token/${e.mint}`}
      className="inline-flex items-center gap-2 px-4 text-[10px] font-mono whitespace-nowrap hover:text-primary transition-colors"
    >
      <span className="text-error animate-pulse">&#x25CF;</span>
      <span className="text-text-primary font-display">${e.symbol}</span>
      <span className="text-error font-bold">{formatCountdown(e.remainingMs)}</span>
      <span className="text-text-muted">|</span>
      <span className="text-secondary">{formatSol(e.collateralAmount)}</span>
    </Link>
  ));

  return (
    <div className="w-full bg-bg-elevated border-b border-border overflow-hidden">
      <div className="flex items-center h-7">
        <span className="shrink-0 px-3 text-[9px] font-display text-error tracking-wider bg-error/10 h-full flex items-center">
          DEADLINE APPROACHING
        </span>
        <div className="overflow-hidden flex-1">
          <div className="marquee-left flex items-center">
            {items}
            {items}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Bottom Marquee: TOP BOUNTY — tokens with highest collateral,
 * scrolling right-to-left.
 */
export function BottomMarquee() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { tokens: t } = await fetchLaunches("newest", 50);
        if (!cancelled) setTokens(t);
      } catch {
        // silent
      }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const topBounty = useMemo(
    () => [...tokens]
      .filter((t) => !t.graduated && t.collateralAmount > 0)
      .sort((a, b) => b.collateralAmount - a.collateralAmount)
      .slice(0, 20),
    [tokens],
  );

  if (topBounty.length === 0) return null;

  const items = topBounty.map((t, i) => (
    <Link
      key={t.mint}
      href={`/token/${t.mint}`}
      className="inline-flex items-center gap-2 px-4 text-[10px] font-mono whitespace-nowrap hover:text-primary transition-colors"
    >
      <span className="text-secondary font-display">#{i + 1}</span>
      <span className="text-text-primary font-display">${t.symbol}</span>
      <span className="text-primary font-bold">{formatSol(t.collateralAmount)}</span>
    </Link>
  ));

  return (
    <div className="w-full bg-bg-elevated border-t border-border overflow-hidden fixed bottom-0 left-0 z-40">
      <div className="flex items-center h-7">
        <span className="shrink-0 px-3 text-[9px] font-display text-primary tracking-wider bg-primary/10 h-full flex items-center">
          TOP BOUNTY
        </span>
        <div className="overflow-hidden flex-1">
          <div className="marquee-right flex items-center">
            {items}
            {items}
          </div>
        </div>
      </div>
    </div>
  );
}
