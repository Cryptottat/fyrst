import type { ApiToken, ApiDeployer, FetchLaunchesResult } from "./api";

const MOCK_DEPLOYER: ApiDeployer = {
  address: "8xrt4kLmNpQvW7zY3jDcBnUoFh9sMeKd2rTw5vX1mK4d",
  reputationScore: 82,
  reputationRank: "A",
  totalLaunches: 5,
  successfulLaunches: 4,
  rugPulls: 0,
  collateralLocked: 15,
  collateralTier: "Gold",
  createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
};

const MOCK_TOKENS: ApiToken[] = [
  {
    mint: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    name: "SolGuard",
    symbol: "GUARD",
    description: "Community-first security token on Solana.",
    imageUrl: "",
    deployerAddress: "8xrt4kLmNpQvW7zY3jDcBnUoFh9sMeKd2rTw5vX1mK4d",
    marketCap: 42069,
    currentPrice: 0.000142,
    totalSupply: 1000000000,
    collateralTier: "Gold",
    graduated: false,
    bondingCurveProgress: 67,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    deployer: MOCK_DEPLOYER,
  },
  {
    mint: "3Kz9QKhf7xJbDvMYrmY6B8oGVvHcVKJc4cXm3cBpTqnR",
    name: "ArcadeDAO",
    symbol: "ARCADE",
    description: "Governance token for the arcade revolution.",
    imageUrl: "",
    deployerAddress: "Dk3fR7pQnW2xY9jLcBvUoFh8sMeKd1rTw4vX6mK9pQw",
    marketCap: 28500,
    currentPrice: 0.000089,
    totalSupply: 500000000,
    collateralTier: "Silver",
    graduated: false,
    bondingCurveProgress: 43,
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    deployer: { ...MOCK_DEPLOYER, address: "Dk3fR7pQnW2xY9jLcBvUoFh8sMeKd1rTw4vX6mK9pQw", reputationScore: 71, reputationRank: "B", totalLaunches: 3, rugPulls: 0, collateralLocked: 5, collateralTier: "Silver" },
  },
  {
    mint: "9RvnMqNnhFJKBLSHGPCnhqkJGmNaCTkhXBSwhtxJcfNp",
    name: "BusterCoin",
    symbol: "BUSTER",
    description: "The official token of Buster, the arcade dog.",
    imageUrl: "",
    deployerAddress: "8xrt4kLmNpQvW7zY3jDcBnUoFh9sMeKd2rTw5vX1mK4d",
    marketCap: 15800,
    currentPrice: 0.000034,
    totalSupply: 2000000000,
    collateralTier: "Diamond",
    graduated: false,
    bondingCurveProgress: 82,
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    deployer: { ...MOCK_DEPLOYER, collateralTier: "Diamond", collateralLocked: 25 },
  },
  {
    mint: "5FbDB2315678afecb367f032d93F642f64180aa3",
    name: "NeonPup",
    symbol: "NPUP",
    description: "Neon lights and pixel vibes. Built for degens who care.",
    imageUrl: "",
    deployerAddress: "Jk2mR8pQnW5xY7jLcBvUoFh3sMeKd6rTw9vX4mKxR8e",
    marketCap: 8200,
    currentPrice: 0.000012,
    totalSupply: 750000000,
    collateralTier: "Bronze",
    graduated: false,
    bondingCurveProgress: 21,
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    deployer: { ...MOCK_DEPLOYER, address: "Jk2mR8pQnW5xY7jLcBvUoFh3sMeKd6rTw9vX4mKxR8e", reputationScore: 55, reputationRank: "C", totalLaunches: 1, collateralLocked: 1, collateralTier: "Bronze" },
  },
  {
    mint: "2FnEXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgBB",
    name: "SafeYield",
    symbol: "SAFE",
    description: "DeFi yields without the rug. Collateral-backed launches only.",
    imageUrl: "",
    deployerAddress: "Pp4nR3pQnW8xY1jLcBvUoFh7sMeKd4rTw2vX9mKkL7a",
    marketCap: 63400,
    currentPrice: 0.000298,
    totalSupply: 500000000,
    collateralTier: "Gold",
    graduated: false,
    bondingCurveProgress: 91,
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    deployer: { ...MOCK_DEPLOYER, address: "Pp4nR3pQnW8xY1jLcBvUoFh7sMeKd4rTw2vX9mKkL7a", reputationScore: 94, reputationRank: "A", totalLaunches: 8, successfulLaunches: 8, collateralLocked: 20 },
  },
  {
    mint: "4HnMXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgCC",
    name: "PixelDog",
    symbol: "PXDOG",
    description: "Every pixel tells a story. Community-driven meme coin.",
    imageUrl: "",
    deployerAddress: "Mn8rR5pQnW6xY2jLcBvUoFh1sMeKd3rTw7vX8mKvQ2z",
    marketCap: 5600,
    currentPrice: 0.000008,
    totalSupply: 1000000000,
    collateralTier: "Bronze",
    graduated: false,
    bondingCurveProgress: 12,
    createdAt: new Date(Date.now() - 0.5 * 3600000).toISOString(),
    deployer: { ...MOCK_DEPLOYER, address: "Mn8rR5pQnW6xY2jLcBvUoFh1sMeKd3rTw7vX8mKvQ2z", reputationScore: 45, reputationRank: "D", totalLaunches: 2, rugPulls: 1, collateralLocked: 1, collateralTier: "Bronze" },
  },
];

export function getMockLaunches(sort: string, limit: number, offset: number): FetchLaunchesResult {
  let sorted = [...MOCK_TOKENS];

  if (sort === "marketcap") {
    sorted.sort((a, b) => b.marketCap - a.marketCap);
  } else if (sort === "reputation") {
    sorted.sort((a, b) => (b.deployer?.reputationScore ?? 0) - (a.deployer?.reputationScore ?? 0));
  } else {
    sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return {
    tokens: sorted.slice(offset, offset + limit),
    total: sorted.length,
    limit,
    offset,
  };
}

export function getMockToken(mint: string): ApiToken | null {
  return MOCK_TOKENS.find((t) => t.mint === mint) ?? null;
}

export function getMockDeployer(address: string): ApiDeployer | null {
  const token = MOCK_TOKENS.find((t) => t.deployerAddress === address);
  return token?.deployer ?? null;
}
