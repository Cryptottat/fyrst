import { create } from "zustand";
import type { Token } from "@/types";

interface AppState {
  // Active token data
  selectedToken: Token | null;
  setSelectedToken: (token: Token | null) => void;

  // Real-time price feed
  prices: Map<string, number>;
  updatePrice: (mint: string, price: number) => void;

  // WebSocket connection status
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;

  // Feature flags from env
  features: {
    trading: boolean;
    wallet: boolean;
    refund: boolean;
  };
}

export const useAppStore = create<AppState>()((set) => ({
  selectedToken: null,
  setSelectedToken: (token) => set({ selectedToken: token }),

  prices: new Map<string, number>(),
  updatePrice: (mint, price) =>
    set((state) => {
      const next = new Map(state.prices);
      next.set(mint, price);
      return { prices: next };
    }),

  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),

  features: {
    trading: process.env.NEXT_PUBLIC_FEATURE_TRADING !== "false",
    wallet: process.env.NEXT_PUBLIC_FEATURE_WALLET !== "false",
    refund: process.env.NEXT_PUBLIC_FEATURE_REFUND !== "false",
  },
}));
