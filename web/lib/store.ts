import { create } from "zustand";
import type { Token } from "@/types";
import type { ApiToken, ApiTrade } from "@/lib/api";

// ---------------------------------------------------------------------------
// Price snapshot — tracks previous price for change % calculation
// ---------------------------------------------------------------------------

export interface PriceSnapshot {
  price: number;
  previousPrice: number;
  marketCap: number;
  supply: number;
  bondingCurveProgress: number;
  updatedAt: number; // Date.now()
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface AppState {
  // Active token data
  selectedToken: Token | null;
  setSelectedToken: (token: Token | null) => void;

  // Token list (dashboard / live launches)
  tokens: ApiToken[];
  setTokens: (tokens: ApiToken[]) => void;
  prependToken: (token: ApiToken) => void;
  updateTokenInList: (mint: string, patch: Partial<ApiToken>) => void;

  // Trades (token detail page)
  trades: ApiTrade[];
  setTrades: (trades: ApiTrade[]) => void;
  appendTrade: (trade: ApiTrade) => void;

  // Real-time price feed
  prices: Map<string, PriceSnapshot>;
  updatePrice: (
    mint: string,
    data: {
      price: number;
      marketCap: number;
      supply: number;
      bondingCurveProgress: number;
    },
  ) => void;

  // WebSocket connection status
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;

  // SOL price (from heartbeat)
  solPrice: number;
  setSolPrice: (price: number) => void;

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

  // -- Tokens ---------------------------------------------------------------
  tokens: [],
  setTokens: (tokens) => set({ tokens }),
  prependToken: (token) =>
    set((state) => ({
      tokens: [token, ...state.tokens.filter((t) => t.mint !== token.mint)],
    })),
  updateTokenInList: (mint, patch) =>
    set((state) => ({
      tokens: state.tokens.map((t) =>
        t.mint === mint ? { ...t, ...patch } : t,
      ),
    })),

  // -- Trades ---------------------------------------------------------------
  trades: [],
  setTrades: (trades) => set({ trades }),
  appendTrade: (trade) =>
    set((state) => ({
      trades: [...state.trades, trade],
    })),

  // -- Prices ---------------------------------------------------------------
  prices: new Map<string, PriceSnapshot>(),
  updatePrice: (mint, data) =>
    set((state) => {
      const next = new Map(state.prices);
      const prev = next.get(mint);
      next.set(mint, {
        price: data.price,
        previousPrice: prev?.price ?? data.price,
        marketCap: data.marketCap,
        supply: data.supply,
        bondingCurveProgress: data.bondingCurveProgress,
        updatedAt: Date.now(),
      });
      return { prices: next };
    }),

  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),

  solPrice: 0,
  setSolPrice: (price) => set({ solPrice: price }),

  features: {
    trading: process.env.NEXT_PUBLIC_FEATURE_TRADING !== "false",
    wallet: process.env.NEXT_PUBLIC_FEATURE_WALLET !== "false",
    refund: process.env.NEXT_PUBLIC_FEATURE_REFUND !== "false",
  },
}));
