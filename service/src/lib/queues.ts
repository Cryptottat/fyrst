import { Queue } from "bullmq";
import { getRedis } from "./redis";
import { logger } from "../utils/logger";

let refundQueue: Queue | null = null;
let rugDetectionQueue: Queue | null = null;

export function initQueues() {
  const redis = getRedis();
  if (!redis) {
    logger.warn("Redis not available — queues disabled");
    return;
  }

  const connection = { host: redis.options.host, port: redis.options.port };

  refundQueue = new Queue("refund-processing", { connection });
  rugDetectionQueue = new Queue("rug-detection", { connection });

  logger.info("BullMQ queues initialized");
}

export function getRefundQueue(): Queue | null { return refundQueue; }
export function getRugDetectionQueue(): Queue | null { return rugDetectionQueue; }
