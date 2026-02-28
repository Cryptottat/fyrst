"use client";

import { useEffect, useRef } from "react";
import {
  getSocket,
  subscribeToken,
  unsubscribeToken,
  type PriceUpdatePayload,
  type TradeExecutedPayload,
  type LaunchNewPayload,
} from "@/lib/socket";
import { useAppStore } from "@/lib/store";

// ---------------------------------------------------------------------------
// useSocketInit — call once at app root (via SocketProvider)
// ---------------------------------------------------------------------------

export function useSocketInit() {
  const setWsConnected = useAppStore((s) => s.setWsConnected);
  const updatePrice = useAppStore((s) => s.updatePrice);
  const prependToken = useAppStore((s) => s.prependToken);
  const updateTokenInList = useAppStore((s) => s.updateTokenInList);
  const setSolPrice = useAppStore((s) => s.setSolPrice);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const socket = getSocket();

    socket.on("connect", () => {
      setWsConnected(true);
    });

    socket.on("disconnect", () => {
      setWsConnected(false);
    });

    // Global: new token launched
    socket.on("launch:new", (payload: LaunchNewPayload) => {
      prependToken(payload);
    });

    // Global: heartbeat (extract solPrice if present)
    socket.on("heartbeat", (payload: { timestamp: string; solPrice?: number }) => {
      if (payload.solPrice != null && payload.solPrice > 0) {
        setSolPrice(payload.solPrice);
      }
    });

    // Global: price update (broadcast for dashboard)
    socket.on("price:update", (payload: PriceUpdatePayload) => {
      updatePrice(payload.tokenMint, {
        price: payload.price,
        marketCap: payload.marketCap,
        supply: payload.supply,
        bondingCurveProgress: payload.bondingCurveProgress,
      });

      // Also patch the token list so sorting/display stays current
      updateTokenInList(payload.tokenMint, {
        currentPrice: payload.price,
        marketCap: payload.marketCap,
        totalSupply: payload.supply,
        bondingCurveProgress: payload.bondingCurveProgress,
      });
    });

    socket.connect();

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("launch:new");
      socket.off("heartbeat");
      socket.off("price:update");
      socket.disconnect();
      initRef.current = false;
    };
  }, [setWsConnected, updatePrice, prependToken, updateTokenInList, setSolPrice]);
}

// ---------------------------------------------------------------------------
// useTokenSubscription — call on token detail page
// ---------------------------------------------------------------------------

export function useTokenSubscription(mint: string) {
  const appendTrade = useAppStore((s) => s.appendTrade);

  useEffect(() => {
    const socket = getSocket();

    const handleTrade = (payload: TradeExecutedPayload) => {
      if (payload.tokenMint === mint) {
        appendTrade({
          id: payload.id,
          tokenMint: payload.tokenMint,
          traderAddress: payload.traderAddress,
          side: payload.side,
          amount: payload.amount,
          price: payload.price,
          totalSol: payload.totalSol,
          txSignature: payload.txSignature,
          createdAt: payload.createdAt,
        });
      }
    };

    socket.on("trade:executed", handleTrade);
    subscribeToken(mint);

    return () => {
      socket.off("trade:executed", handleTrade);
      unsubscribeToken(mint);
    };
  }, [mint, appendTrade]);
}
