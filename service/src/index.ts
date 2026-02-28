import { createServer } from "http";
import { Server } from "socket.io";
import { app } from "./app";
import { config } from "./config";
import { logger } from "./utils/logger";
import { setIo } from "./socketManager";
import { connectDb } from "./lib/prisma";
import { connectRedis } from "./lib/redis";
import { initQueues } from "./lib/queues";

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: config.corsOrigins, credentials: true },
});

// Store io instance globally so routes can emit events
setIo(io);

// ---------------------------------------------------------------------------
// Socket.IO connection handling
// ---------------------------------------------------------------------------

io.on("connection", (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // Allow clients to subscribe to specific token price feeds
  socket.on("subscribe:token", (tokenMint: string) => {
    socket.join(`token:${tokenMint}`);
    logger.debug(`Client ${socket.id} subscribed to token:${tokenMint}`);
  });

  socket.on("unsubscribe:token", (tokenMint: string) => {
    socket.leave(`token:${tokenMint}`);
    logger.debug(`Client ${socket.id} unsubscribed from token:${tokenMint}`);
  });

  socket.on("disconnect", () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// ---------------------------------------------------------------------------
// SOL price helper
// ---------------------------------------------------------------------------

const SOL_MINT = "So11111111111111111111111111111111111111112";
let lastSolPrice: number | null = null;

async function fetchSolPrice(): Promise<number | null> {
  try {
    const resp = await fetch(`https://api.jup.ag/price/v2?ids=${SOL_MINT}`);
    if (!resp.ok) return lastSolPrice;
    const json = (await resp.json()) as { data?: Record<string, { price?: string }> };
    const price = json?.data?.[SOL_MINT]?.price;
    if (price) {
      lastSolPrice = parseFloat(price);
    }
    return lastSolPrice;
  } catch {
    return lastSolPrice;
  }
}

// ---------------------------------------------------------------------------
// Periodic heartbeat (every 10 seconds) — includes SOL price
// ---------------------------------------------------------------------------

setInterval(async () => {
  try {
    const solPrice = await fetchSolPrice();
    io.emit("heartbeat", {
      timestamp: new Date().toISOString(),
      solPrice,
    });
  } catch {
    io.emit("heartbeat", {
      timestamp: new Date().toISOString(),
      solPrice: lastSolPrice,
    });
  }
}, 10_000);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

async function start(): Promise<void> {
  // Database is required — process.exit(1) if connection fails
  await connectDb();

  // Redis + queues are optional — they degrade gracefully
  connectRedis();
  initQueues();

  httpServer.listen(config.port, () => {
    logger.info(`FYRST API server running on port ${config.port}`);
  });
}

start().catch((err) => {
  logger.error("Failed to start server", err);
  process.exit(1);
});

export { io };
