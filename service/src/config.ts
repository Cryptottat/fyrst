import dotenv from "dotenv";
dotenv.config();

// ---------------------------------------------------------------------------
// Network switch: DEVNET=true (default) or DEVNET=false for mainnet.
// RPC layout (Helius $999/mo plan):
//   HELIUS_DEVNET_URL       — devnet HTTP RPC (read + DAS + sendTransaction)
//   HELIUS_MAINNET_URL      — mainnet HTTP RPC
//   HELIUS_WS_DEVNET_URL    — devnet WebSocket
//   HELIUS_WS_MAINNET_URL   — mainnet WebSocket
//   HELIUS_GATEKEEPER_URL   — mainnet beta gatekeeper (high-throughput send)
//   LASERSTREAM_URL +
//   LASERSTREAM_API_KEY     — mainnet laserstream (ultra-low latency)
//   HELIUS_RPC_URL          — explicit override (wins over both mode URLs)
//   HELIUS_API_KEY          — legacy fallback to derive URLs if no mode URL set
// Server-side only — never expose to client.
// ---------------------------------------------------------------------------

const isDevnet = process.env.DEVNET !== "false";
const heliusApiKey = process.env.HELIUS_API_KEY || "";

function pickByMode(mainnet: string | undefined, devnet: string | undefined): string | undefined {
  return isDevnet ? devnet : mainnet;
}

function deriveHttp(): string {
  if (process.env.HELIUS_RPC_URL) return process.env.HELIUS_RPC_URL;
  const fromMode = pickByMode(process.env.HELIUS_MAINNET_URL, process.env.HELIUS_DEVNET_URL);
  if (fromMode) return fromMode;
  if (heliusApiKey) {
    return `https://${isDevnet ? "devnet" : "mainnet"}.helius-rpc.com/?api-key=${heliusApiKey}`;
  }
  return isDevnet
    ? "https://api.devnet.solana.com"
    : "https://api.mainnet-beta.solana.com";
}

function deriveWs(): string {
  if (process.env.HELIUS_WS_URL) return process.env.HELIUS_WS_URL;
  const fromMode = pickByMode(process.env.HELIUS_WS_MAINNET_URL, process.env.HELIUS_WS_DEVNET_URL);
  if (fromMode) return fromMode;
  if (heliusApiKey) {
    return `wss://${isDevnet ? "devnet" : "mainnet"}.helius-rpc.com/?api-key=${heliusApiKey}`;
  }
  return deriveHttp().replace(/^http/, "ws");
}

function deriveGatekeeper(): string {
  // Gatekeeper is mainnet-only; on devnet, fall back to the main HTTP URL.
  if (process.env.HELIUS_GATEKEEPER_URL) return process.env.HELIUS_GATEKEEPER_URL;
  if (!isDevnet && heliusApiKey) {
    return `https://beta.helius-rpc.com/?api-key=${heliusApiKey}`;
  }
  return deriveHttp();
}

export const config = {
  port: parseInt(process.env.PORT || "8000", 10),
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000").split(","),
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === "production" ? "info" : "debug"),

  // Network mode
  isDevnet,

  // Helius RPC endpoints (server-side only)
  solanaRpc: deriveHttp(),
  heliusGatekeeperUrl: deriveGatekeeper(),
  heliusWsUrl: deriveWs(),
  laserstreamUrl: process.env.LASERSTREAM_URL || "",
  laserstreamApiKey: process.env.LASERSTREAM_API_KEY || heliusApiKey,
  heliusApiKey,

  jupiterApiUrl: process.env.JUPITER_API_URL || "https://api.jup.ag",

  // Telegram
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",

  // Database
  databaseUrl: process.env.DATABASE_URL || "",
  redisUrl: process.env.REDIS_URL || "",

  // Buyback
  buybackTokenMint: process.env.BUYBACK_TOKEN_MINT || "",
  treasuryPrivateKey: process.env.TREASURY_PRIVATE_KEY || "",
  buybackPct: parseInt(process.env.BUYBACK_PCT || "30", 10),
  buybackIntervalMs: parseInt(process.env.BUYBACK_INTERVAL_MS || "60000", 10),
  buybackMinSol: parseFloat(process.env.BUYBACK_MIN_SOL || "0.01"),

  // Program
  programId:
    process.env.PROGRAM_ID || "CcyByKGzRDK17icyNGAgdUN4q7WzbL1BPi4BNzqytyMP",

  // Cranker
  crankerPrivateKey: process.env.CRANKER_PRIVATE_KEY || "",
};
