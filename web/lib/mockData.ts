import type { Token, Deployer, Portfolio } from "@/types";

// ---------------------------------------------------------------------------
// Mock Deployers
// ---------------------------------------------------------------------------

export const mockDeployers: Deployer[] = [
  {
    address: "DpLr1Gk5NzFJ9qM3rXkVjEPjFzGprhacfZSwawMorkZ5",
    reputationScore: 95,
    rank: "A",
    pastLaunches: 12,
    rugCount: 0,
    avgTokenLifespan: 90,
  },
  {
    address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    reputationScore: 82,
    rank: "B",
    pastLaunches: 8,
    rugCount: 0,
    avgTokenLifespan: 60,
  },
  {
    address: "FZc6kh3G4iAHVqb4mLzBxszMFPWKqYBxCz3Q7u9Dj2Kp",
    reputationScore: 73,
    rank: "C",
    pastLaunches: 5,
    rugCount: 1,
    avgTokenLifespan: 30,
  },
  {
    address: "Bx9wLFR3PnKqhVGXMdJR2oHGUGfbS6NxCVfgJQmL7k3Y",
    reputationScore: 61,
    rank: "D",
    pastLaunches: 3,
    rugCount: 2,
    avgTokenLifespan: 14,
  },
  {
    address: "9sT7Nd3cWMGEADfS1cBjTYGRKWzLtpGojmzRxkY3h2Fa",
    reputationScore: 42,
    rank: "F",
    pastLaunches: 7,
    rugCount: 5,
    avgTokenLifespan: 3,
  },
];

// ---------------------------------------------------------------------------
// Mock Tokens
// ---------------------------------------------------------------------------

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600 * 1000).toISOString();
}

export const mockTokens: Token[] = [
  {
    mint: "So11111111111111111111111111111111111111112",
    name: "SolGuard",
    symbol: "GUARD",
    description: "On-chain safety protocol for Solana DeFi.",
    image: "",
    deployer: mockDeployers[0].address,
    collateral: 25,
    reputationScore: 95,
    bondingCurveProgress: 78,
    marketCap: 245_000,
    holders: 1_842,
    volume24h: 89_500,
    createdAt: hoursAgo(2),
  },
  {
    mint: "So11111111111111111111111111111111111111113",
    name: "VaultNet",
    symbol: "VAULT",
    description: "Decentralized vault infrastructure for yield generation.",
    image: "",
    deployer: mockDeployers[1].address,
    collateral: 10,
    reputationScore: 82,
    bondingCurveProgress: 62,
    marketCap: 128_000,
    holders: 920,
    volume24h: 45_200,
    createdAt: hoursAgo(5),
  },
  {
    mint: "So11111111111111111111111111111111111111114",
    name: "ChainForge",
    symbol: "FORGE",
    description: "Automated token forge for verified launches.",
    image: "",
    deployer: mockDeployers[0].address,
    collateral: 25,
    reputationScore: 95,
    bondingCurveProgress: 91,
    marketCap: 512_000,
    holders: 3_100,
    volume24h: 198_000,
    createdAt: hoursAgo(8),
  },
  {
    mint: "So11111111111111111111111111111111111111115",
    name: "NexusDAO",
    symbol: "NXS",
    description: "Governance-first DAO framework on Solana.",
    image: "",
    deployer: mockDeployers[2].address,
    collateral: 5,
    reputationScore: 73,
    bondingCurveProgress: 34,
    marketCap: 67_400,
    holders: 410,
    volume24h: 18_700,
    createdAt: hoursAgo(12),
  },
  {
    mint: "So11111111111111111111111111111111111111116",
    name: "IronLayer",
    symbol: "IRON",
    description: "Institutional-grade execution layer for Solana.",
    image: "",
    deployer: mockDeployers[1].address,
    collateral: 10,
    reputationScore: 82,
    bondingCurveProgress: 55,
    marketCap: 98_200,
    holders: 680,
    volume24h: 32_100,
    createdAt: hoursAgo(18),
  },
  {
    mint: "So11111111111111111111111111111111111111117",
    name: "CipherPay",
    symbol: "CPAY",
    description: "Privacy-first payment rail for Solana.",
    image: "",
    deployer: mockDeployers[3].address,
    collateral: 1,
    reputationScore: 61,
    bondingCurveProgress: 22,
    marketCap: 34_100,
    holders: 215,
    volume24h: 8_400,
    createdAt: hoursAgo(24),
  },
  {
    mint: "So11111111111111111111111111111111111111118",
    name: "BoltSwap",
    symbol: "BOLT",
    description: "Lightning-fast DEX aggregator on Solana.",
    image: "",
    deployer: mockDeployers[0].address,
    collateral: 25,
    reputationScore: 95,
    bondingCurveProgress: 88,
    marketCap: 410_000,
    holders: 2_560,
    volume24h: 155_000,
    createdAt: hoursAgo(1),
  },
  {
    mint: "So11111111111111111111111111111111111111119",
    name: "ShieldFi",
    symbol: "SHLD",
    description: "DeFi insurance protocol for Solana users.",
    image: "",
    deployer: mockDeployers[2].address,
    collateral: 5,
    reputationScore: 73,
    bondingCurveProgress: 45,
    marketCap: 76_300,
    holders: 530,
    volume24h: 22_800,
    createdAt: hoursAgo(36),
  },
  {
    mint: "So11111111111111111111111111111111111111120",
    name: "OmniStake",
    symbol: "OMNI",
    description: "Multi-asset staking protocol for maximum yield.",
    image: "",
    deployer: mockDeployers[1].address,
    collateral: 10,
    reputationScore: 82,
    bondingCurveProgress: 70,
    marketCap: 156_000,
    holders: 1_200,
    volume24h: 61_000,
    createdAt: hoursAgo(48),
  },
  {
    mint: "So11111111111111111111111111111111111111121",
    name: "PixelMint",
    symbol: "PXM",
    description: "NFT minting infrastructure for Solana creators.",
    image: "",
    deployer: mockDeployers[4].address,
    collateral: 1,
    reputationScore: 42,
    bondingCurveProgress: 12,
    marketCap: 15_800,
    holders: 92,
    volume24h: 3_200,
    createdAt: hoursAgo(72),
  },
];

// ---------------------------------------------------------------------------
// Mock Portfolio
// ---------------------------------------------------------------------------

export const mockPortfolio: Portfolio[] = [
  {
    token: mockTokens[0],
    bought: 2.5,
    current: 3.8,
    pnl: 52,
    safetyRank: "A",
  },
  {
    token: mockTokens[2],
    bought: 1.2,
    current: 1.9,
    pnl: 58.3,
    safetyRank: "A",
  },
  {
    token: mockTokens[4],
    bought: 0.8,
    current: 0.65,
    pnl: -18.75,
    safetyRank: "B",
  },
];

/**
 * Helper: find a deployer by address.
 */
export function getDeployerByAddress(address: string): Deployer | undefined {
  return mockDeployers.find((d) => d.address === address);
}

/**
 * Helper: find a token by mint.
 */
export function getTokenByMint(mint: string): Token | undefined {
  return mockTokens.find((t) => t.mint === mint);
}

/**
 * Helper: get tokens for a deployer.
 */
export function getTokensByDeployer(address: string): Token[] {
  return mockTokens.filter((t) => t.deployer === address);
}
