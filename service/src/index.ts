import { createServer } from "http";
import { Server } from "socket.io";
import { app } from "./app";
import { config } from "./config";
import { logger } from "./utils/logger";
import { setIo } from "./socketManager";
import { connectDb } from "./lib/prisma";

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
// Periodic price broadcast (every 10 seconds)
// ---------------------------------------------------------------------------

setInterval(() => {
  // TODO (Phase 6): Fetch live prices from on-chain data and broadcast
  // For now this is a heartbeat so clients know the connection is alive
  io.emit("heartbeat", { timestamp: new Date().toISOString() });
}, 10_000);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

async function start(): Promise<void> {
  // Attempt DB connection (non-fatal if it fails)
  await connectDb();

  httpServer.listen(config.port, () => {
    logger.info(`FYRST API server running on port ${config.port}`);
  });
}

start().catch((err) => {
  logger.error("Failed to start server", err);
  process.exit(1);
});

export { io };
