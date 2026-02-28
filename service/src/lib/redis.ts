import Redis from "ioredis";
import { config } from "../config";
import { logger } from "../utils/logger";

let redis: Redis | null = null;

export function connectRedis(): Redis | null {
  if (!config.redisUrl) {
    logger.warn("REDIS_URL not set — running without cache");
    return null;
  }
  try {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    redis.on("error", (err) => logger.error("Redis error", { error: err.message }));
    redis.connect().catch(() => logger.warn("Redis connection failed — running without cache"));
    return redis;
  } catch {
    return null;
  }
}

export function getRedis(): Redis | null {
  return redis;
}
