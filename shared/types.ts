// ---------------------------------------------------------------------------
// FYRST Shared Type Definitions
// Used by both web/ and service/ -- single source of truth
// ---------------------------------------------------------------------------

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum ReputationRank {
  A = "A",
  B = "B",
  C = "C",
  D = "D",
  F = "F",
}

export enum CollateralTier {
  Bronze = "Bronze",
  Silver = "Silver",
  Gold = "Gold",
  Diamond = "Diamond",
}

export enum TradeSide {
  Buy = "buy",
  Sell = "sell",
}

export enum RefundStatus {
  Pending = "pending",
  Processing = "processing",
  Completed = "completed",
  Failed = "failed",
}

export enum HolderTier {
  Free = "Free",
  Basic = "Basic",
  Pro = "Pro",
  Elite = "Elite",
  Whale = "Whale",
}

// ─── Core Interfaces ────────────────────────────────────────────────────────

export interface Token {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  deployerAddress: string;
  createdAt: string;
  marketCap: number;
  currentPrice: number;
  totalSupply: number;
  collateralTier: CollateralTier;
  graduated: boolean;
  bondingCurveProgress: number; // 0-100
  holders: number;
  volume24h: number;
}

export interface Deployer {
  address: string;
  reputationScore: number; // 0-100
  reputationRank: ReputationRank;
  totalLaunches: number;
  successfulLaunches: number;
  rugPulls: number;
  collateralLocked: number; // SOL
  collateralTier: CollateralTier;
  avgTokenLifespan: number; // hours
  createdAt: string;
}

export interface Trade {
  id: string;
  tokenMint: string;
  traderAddress: string;
  side: TradeSide;
  amount: number;
  price: number;
  totalSol: number;
  timestamp: string;
  txSignature: string;
}

export interface Portfolio {
  ownerAddress: string;
  holdings: PortfolioHolding[];
  totalValueSol: number;
}

export interface PortfolioHolding {
  tokenMint: string;
  tokenSymbol: string;
  tokenName: string;
  balance: number;
  valueSol: number;
  avgBuyPrice: number;
  pnlPercent: number;
}

export interface RefundRecord {
  id: string;
  tokenMint: string;
  claimantAddress: string;
  amountSol: number;
  status: RefundStatus;
  createdAt: string;
  processedAt?: string;
  txSignature?: string;
}

export interface BondingCurveState {
  tokenMint: string;
  currentSupply: number;
  currentPrice: number;
  reserveBalance: number;
  graduated: boolean;
}

// ─── API Response ───────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  offset: number;
  limit: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const MIN_COLLATERAL = 1; // SOL
export const SAFE_PERIOD = 24 * 60 * 60; // 24 hours in seconds
export const DEPLOY_FEE = 0.02; // SOL
export const PROTOCOL_FEE = 0.005; // 0.5%
export const TRADE_FEE = 0.01; // 1% (0.5% buyback + 0.5% refund pool)

export const COLLATERAL_TIERS: Record<CollateralTier, number> = {
  [CollateralTier.Bronze]: 1,
  [CollateralTier.Silver]: 5,
  [CollateralTier.Gold]: 10,
  [CollateralTier.Diamond]: 25,
};

export const HOLDER_TIERS: Record<HolderTier, number> = {
  [HolderTier.Free]: 0,
  [HolderTier.Basic]: 10_000,
  [HolderTier.Pro]: 50_000,
  [HolderTier.Elite]: 200_000,
  [HolderTier.Whale]: 500_000,
};

export const REPUTATION_THRESHOLDS: Record<ReputationRank, number> = {
  [ReputationRank.A]: 80,
  [ReputationRank.B]: 60,
  [ReputationRank.C]: 40,
  [ReputationRank.D]: 20,
  [ReputationRank.F]: 0,
};
