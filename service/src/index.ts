import { createServer } from "http";
import { Server } from "socket.io";
import { app } from "./app";
import { config } from "./config";
import { logger } from "./utils/logger";

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: config.corsOrigins, credentials: true },
});

io.on("connection", (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(config.port, () => {
  logger.info(`FYRST API server running on port ${config.port}`);
});

export { io };
