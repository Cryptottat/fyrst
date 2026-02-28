import { getRedis } from "./redis";
import { logger } from "../utils/logger";

export async function getCached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached) as T;
    } catch (err) {
      logger.warn("Cache read failed", { key, error: (err as Error).message });
    }
  }

  const data = await fetcher();

  if (redis) {
    try {
      await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
    } catch (err) {
      logger.warn("Cache write failed", { key, error: (err as Error).message });
    }
  }

  return data;
}
