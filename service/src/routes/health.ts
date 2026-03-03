import { Router, Request, Response } from "express";
import { dbConnected } from "../lib/prisma";
import { getRedis } from "../lib/redis";
import { getIo } from "../socketManager";

const healthRouter = Router();

healthRouter.get("/", async (_req: Request, res: Response) => {
  const db = dbConnected();

  let redisOk = false;
  try {
    const redis = getRedis();
    if (redis) {
      await redis.ping();
      redisOk = true;
    }
  } catch { /* redis unavailable */ }

  let wsConnections = 0;
  try {
    const io = getIo();
    if (io) {
      const sockets = await io.fetchSockets();
      wsConnections = sockets.length;
    }
  } catch { /* io not initialized */ }

  const allOk = db; // DB is required, Redis/WS are optional
  const status = allOk ? "ok" : "degraded";

  res.status(allOk ? 200 : 503).json({
    status,
    service: "fyrst-api",
    timestamp: new Date().toISOString(),
    checks: {
      database: db ? "connected" : "disconnected",
      redis: redisOk ? "connected" : "unavailable",
      websocket: `${wsConnections} connections`,
    },
  });
});

export { healthRouter };
