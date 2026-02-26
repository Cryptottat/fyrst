// ---------------------------------------------------------------------------
// FYRST Core Type Definitions
// ---------------------------------------------------------------------------

/** Represents a launched token on the FYRST platform. */
export interface Token {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  deployer: string;
  collateral: number;
  reputationScore: number;
  bondingCurveProgress: number;
  marketCap: number;
  holders: number;
  volume24h: number;
  createdAt: string;
}

/** Deployer reputation profile. */
export interface Deployer {
  address: string;
  reputationScore: number;
  rank: string;
  pastLaunches: number;
  rugCount: number;
  avgTokenLifespan: number;
}

/** A single trade event. */
export interface Trade {
  type: "buy" | "sell";
  tokenMint: string;
  amount: number;
  price: number;
  timestamp: string;
}

/** A portfolio position for the connected wallet. */
export interface Portfolio {
  token: Token;
  bought: number;
  current: number;
  pnl: number;
  safetyRank: string;
}

/** Record of a refund issued during the safe period. */
export interface RefundRecord {
  tokenMint: string;
  amount: number;
  timestamp: string;
}

/** Tier definition for holder benefits. */
export interface Tier {
  name: string;
  requiredAmount: number;
  benefits: string[];
}
