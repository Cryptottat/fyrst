import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

let prisma: PrismaClient;
let isConnected = false;

try {
  prisma = new PrismaClient({
    log: [
      { level: "error", emit: "event" },
      { level: "warn", emit: "event" },
    ],
  });

  prisma.$on("error" as never, (e: unknown) => {
    logger.error("Prisma error", e);
  });

  prisma.$on("warn" as never, (e: unknown) => {
    logger.warn("Prisma warning", e);
  });
} catch (err) {
  logger.warn("Prisma client could not be instantiated. Using mock mode.", err);
  prisma = null as unknown as PrismaClient;
}

/**
 * Attempt to connect to the database. Returns true if connected, false if not.
 */
export async function connectDb(): Promise<boolean> {
  if (!prisma) return false;
  try {
    await prisma.$connect();
    isConnected = true;
    logger.info("Database connected successfully");
    return true;
  } catch (err) {
    isConnected = false;
    logger.warn("Database connection failed. Running in mock mode.", err);
    return false;
  }
}

/**
 * Returns true if the database is connected.
 */
export function dbConnected(): boolean {
  return isConnected;
}

/**
 * Seed the database with demo data if empty. Runs once on startup.
 */
export async function seedIfEmpty(): Promise<void> {
  if (!isConnected || !prisma) return;
  try {
    const count = await prisma.token.count();
    if (count > 0) return; // Already has data

    logger.info("Database empty — seeding demo data...");

    const now = Date.now();
    const deployers = [
      { address: "8xrt4kLmNpQvW7zY3jDcBnUoFh9sMeKd2rTw5vX1mK4d", reputationScore: 82, reputationRank: "A", totalLaunches: 3, successfulLaunches: 2, rugPulls: 0, collateralLocked: 25, collateralTier: "Diamond", createdAt: new Date(now - 30 * 86400000) },
      { address: "Dk3fR7pQnW2xY9jLcBvUoFh8sMeKd1rTw4vX6mK9pQw", reputationScore: 71, reputationRank: "B", totalLaunches: 1, successfulLaunches: 1, rugPulls: 0, collateralLocked: 5, collateralTier: "Silver", createdAt: new Date(now - 20 * 86400000) },
      { address: "Jk2mR8pQnW5xY7jLcBvUoFh3sMeKd6rTw9vX4mKxR8e", reputationScore: 55, reputationRank: "C", totalLaunches: 1, successfulLaunches: 0, rugPulls: 0, collateralLocked: 1, collateralTier: "Bronze", createdAt: new Date(now - 5 * 86400000) },
      { address: "Pp4nR3pQnW8xY1jLcBvUoFh7sMeKd4rTw2vX9mKkL7a", reputationScore: 94, reputationRank: "A", totalLaunches: 1, successfulLaunches: 1, rugPulls: 0, collateralLocked: 20, collateralTier: "Gold", createdAt: new Date(now - 60 * 86400000) },
      { address: "Mn8rR5pQnW6xY2jLcBvUoFh1sMeKd3rTw7vX8mKvQ2z", reputationScore: 45, reputationRank: "C", totalLaunches: 1, successfulLaunches: 0, rugPulls: 1, collateralLocked: 1, collateralTier: "Bronze", createdAt: new Date(now - 3 * 86400000) },
    ];

    for (const d of deployers) {
      await prisma.deployer.upsert({ where: { address: d.address }, update: {}, create: d });
    }

    const tokens = [
      { mint: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", name: "SolGuard", symbol: "GUARD", description: "Community-first security token on Solana.", deployerAddress: "8xrt4kLmNpQvW7zY3jDcBnUoFh9sMeKd2rTw5vX1mK4d", marketCap: 42069, currentPrice: 0.000142, totalSupply: 1000000000, collateralTier: "Gold", bondingCurveProgress: 67, createdAt: new Date(now - 2 * 3600000) },
      { mint: "3Kz9QKhf7xJbDvMYrmY6B8oGVvHcVKJc4cXm3cBpTqnR", name: "ArcadeDAO", symbol: "ARCADE", description: "Governance token for the arcade revolution.", deployerAddress: "Dk3fR7pQnW2xY9jLcBvUoFh8sMeKd1rTw4vX6mK9pQw", marketCap: 28500, currentPrice: 0.000089, totalSupply: 500000000, collateralTier: "Silver", bondingCurveProgress: 43, createdAt: new Date(now - 5 * 3600000) },
      { mint: "9RvnMqNnhFJKBLSHGPCnhqkJGmNaCTkhXBSwhtxJcfNp", name: "BusterCoin", symbol: "BUSTER", description: "The official token of Buster, the arcade dog.", deployerAddress: "8xrt4kLmNpQvW7zY3jDcBnUoFh9sMeKd2rTw5vX1mK4d", marketCap: 15800, currentPrice: 0.000034, totalSupply: 2000000000, collateralTier: "Diamond", bondingCurveProgress: 82, createdAt: new Date(now - 1 * 3600000) },
      { mint: "5FbDB2315678afecb367f032d93F642f64180aa3", name: "NeonPup", symbol: "NPUP", description: "Neon lights and pixel vibes. Built for degens who care.", deployerAddress: "Jk2mR8pQnW5xY7jLcBvUoFh3sMeKd6rTw9vX4mKxR8e", marketCap: 8200, currentPrice: 0.000012, totalSupply: 750000000, collateralTier: "Bronze", bondingCurveProgress: 21, createdAt: new Date(now - 12 * 3600000) },
      { mint: "2FnEXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgBB", name: "SafeYield", symbol: "SAFE", description: "DeFi yields without the rug. Collateral-backed launches only.", deployerAddress: "Pp4nR3pQnW8xY1jLcBvUoFh7sMeKd4rTw2vX9mKkL7a", marketCap: 63400, currentPrice: 0.000298, totalSupply: 500000000, collateralTier: "Gold", bondingCurveProgress: 91, createdAt: new Date(now - 48 * 3600000) },
      { mint: "4HnMXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgCC", name: "PixelDog", symbol: "PXDOG", description: "Every pixel tells a story. Community-driven meme coin.", deployerAddress: "Mn8rR5pQnW6xY2jLcBvUoFh1sMeKd3rTw7vX8mKvQ2z", marketCap: 5600, currentPrice: 0.000008, totalSupply: 1000000000, collateralTier: "Bronze", bondingCurveProgress: 12, createdAt: new Date(now - 0.5 * 3600000) },
    ];

    for (const t of tokens) {
      await prisma.token.create({ data: t });
    }

    logger.info(`Seeded ${deployers.length} deployers + ${tokens.length} tokens`);
  } catch (err) {
    logger.warn("Seed failed (tables may not exist yet)", err);
  }
}

export { prisma };
