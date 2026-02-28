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
  logger.error("Prisma client could not be instantiated", err);
  process.exit(1);
}

/**
 * Connect to the database. Exits the process if DATABASE_URL is missing or
 * the connection fails — the service cannot run without a database.
 */
export async function connectDb(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    logger.error("DATABASE_URL is not set — cannot start without a database");
    process.exit(1);
  }

  try {
    await prisma.$connect();
    isConnected = true;
    logger.info("Database connected successfully");
  } catch (err) {
    logger.error("Database connection failed", err);
    process.exit(1);
  }
}

/**
 * Returns true if the database is connected.
 */
export function dbConnected(): boolean {
  return isConnected;
}

export { prisma };
