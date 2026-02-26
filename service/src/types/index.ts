// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Core Interfaces
// ---------------------------------------------------------------------------

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
  createdAt: string;
}

export interface Trade {
  id: string;
  tokenMint: string;
  traderAddress: string;
  side: "buy" | "sell";
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
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
  processedAt?: string;
  txSignature?: string;
}

// ---------------------------------------------------------------------------
// API Response Wrappers
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ---------------------------------------------------------------------------
// Bonding Curve
// ---------------------------------------------------------------------------

export interface BondingCurveState {
  tokenMint: string;
  currentSupply: number;
  currentPrice: number;
  reserveBalance: number;
  graduated: boolean;
}
