"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { fetchRaydiumPoolPrice, type RaydiumPoolPrice } from "@/lib/anchor";
import { fetchJupiterPrice } from "@/lib/raydium-data";
import type { DexCandle } from "@/lib/raydium-data";

const MAX_HISTORY = 500;

interface UseRaydiumPriceOptions {
  connection: Connection | null;
  tokenMint: string;
  enabled: boolean;
  intervalMs?: number;
}

interface UseRaydiumPriceResult {
  raydiumPrice: number | null;
  wsolReserve: number | null;
  tokenReserve: number | null;
  priceHistory: DexCandle[];
}

export function useRaydiumPrice({
  connection,
  tokenMint,
  enabled,
  intervalMs = 5_000,
}: UseRaydiumPriceOptions): UseRaydiumPriceResult {
  const [price, setPrice] = useState<number | null>(null);
  const [wsolReserve, setWsolReserve] = useState<number | null>(null);
  const [tokenReserve, setTokenReserve] = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<DexCandle[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    if (!connection || !tokenMint) return;

    try {
      const mintPk = new PublicKey(tokenMint);
      const result = await fetchRaydiumPoolPrice(connection, mintPk);

      if (result) {
        setPrice(result.price);
        setWsolReserve(result.wsolReserve);
        setTokenReserve(result.tokenReserve);

        // Accumulate price history for devnet chart
        const now = Math.floor(Date.now() / 1000);
        setPriceHistory((prev) => {
          const candle: DexCandle = {
            time: now,
            open: result.price,
            high: result.price,
            low: result.price,
            close: result.price,
            volume: 0,
          };
          const next = [...prev, candle];
          return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
        });
        return;
      }
    } catch {
      // on-chain failed, try Jupiter fallback
    }

    // Jupiter fallback (mainnet only, returns SOL-denominated price)
    try {
      const jupPrice = await fetchJupiterPrice(tokenMint);
      if (jupPrice !== null) {
        setPrice(jupPrice);
      }
    } catch {
      // silent
    }
  }, [connection, tokenMint]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial poll
    poll();

    intervalRef.current = setInterval(poll, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, poll, intervalMs]);

  return { raydiumPrice: price, wsolReserve, tokenReserve, priceHistory };
}
