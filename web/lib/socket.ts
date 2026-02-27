import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "./api";
import type { ApiToken, ApiTrade } from "./api";

// ---------------------------------------------------------------------------
// Socket event payload types
// ---------------------------------------------------------------------------

export interface PriceUpdatePayload {
  tokenMint: string;
  price: number;
  marketCap: number;
  supply: number;
  bondingCurveProgress: number;
}

export interface TradeExecutedPayload extends ApiTrade {
  slippage?: number;
  newPrice?: number;
  newSupply?: number;
  bondingCurveProgress?: number;
  graduated?: boolean;
}

export type LaunchNewPayload = ApiToken;

// ---------------------------------------------------------------------------
// Singleton socket instance
// ---------------------------------------------------------------------------

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

// ---------------------------------------------------------------------------
// Room subscription helpers
// ---------------------------------------------------------------------------

export function subscribeToken(mint: string): void {
  const s = getSocket();
  if (s.connected) {
    s.emit("subscribe:token", mint);
  }
}

export function unsubscribeToken(mint: string): void {
  const s = getSocket();
  if (s.connected) {
    s.emit("unsubscribe:token", mint);
  }
}
