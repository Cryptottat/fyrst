import { Server } from "socket.io";

let io: Server | null = null;

/**
 * Store the Socket.IO server instance so it can be accessed from routes/services.
 */
export function setIo(server: Server): void {
  io = server;
}

/**
 * Retrieve the Socket.IO server instance.
 * Returns null if not yet initialized.
 */
export function getIo(): Server | null {
  return io;
}
