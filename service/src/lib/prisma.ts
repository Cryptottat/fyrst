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

export { prisma };
