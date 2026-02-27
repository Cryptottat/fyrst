import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { logger } from "../utils/logger";

export function errorHandler(
  err: Error & { type?: string; status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Payload too large (body-parser)
  if (err.type === "entity.too.large") {
    logger.error("Payload too large", { message: err.message });
    res.status(413).json({ success: false, error: "Payload too large. Max 10MB." });
    return;
  }

  // Prisma unique constraint violation
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    const target = (err.meta?.target as string[])?.join(", ") || "unknown";
    logger.error("Prisma error", { message: err.message, target, timestamp: new Date().toISOString() });
    res.status(409).json({ success: false, error: `Already exists (${target})` });
    return;
  }

  logger.error("Unhandled error:", { message: err.message, stack: err.stack });
  res.status(500).json({ error: "Internal server error" });
}
