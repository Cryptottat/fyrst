"use client";

import { useState, useEffect, useMemo } from "react";
import type { ApiToken } from "@/lib/api";

export interface PressureEntry {
  mint: string;
  name: string;
  symbol: string;
  collateralAmount: number;
  deadlineTimestamp: number; // unix ms
  remainingMs: number;
  pressureScore: number;
  graduated: boolean;
}

/**
 * Calculate Pressure Score for a list of tokens.
 * Formula: (escrowSOL / max(remainingSeconds, 1)) * 100
 *
 * Updates every second via setInterval (client-side only).
 */
export function usePressureScores(tokens: ApiToken[]): PressureEntry[] {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    return tokens
      .filter((t) => t.deadlineTimestamp && !t.graduated)
      .map((t) => {
        const deadlineMs = new Date(t.deadlineTimestamp!).getTime();
        const remainingMs = Math.max(deadlineMs - now, 0);
        const remainingSec = Math.max(remainingMs / 1000, 1); // prevent division by zero
        const pressureScore = (t.collateralAmount / remainingSec) * 100;

        return {
          mint: t.mint,
          name: t.name,
          symbol: t.symbol,
          collateralAmount: t.collateralAmount,
          deadlineTimestamp: deadlineMs,
          remainingMs,
          pressureScore,
          graduated: t.graduated,
        };
      })
      .sort((a, b) => b.pressureScore - a.pressureScore);
  }, [tokens, now]);
}

/**
 * Format remaining time as HH:MM:SS
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "EXPIRED";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
