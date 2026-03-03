import dotenv from "dotenv";
dotenv.config();

// ---------------------------------------------------------------------------
// Single switch: DEVNET=true (default) or DEVNET=false for mainnet
// Everything else derived automatically from HELIUS_API_KEY
// ---------------------------------------------------------------------------
const isDevnet = process.env.DEVNET !== "false";
const heliusApiKey = process.env.HELIUS_API_KEY || "";

function deriveSolanaRpc(): string {
  if (heliusApiKey) {
    return `https://${isDevnet ? "devnet" : "mainnet"}.helius-rpc.com/?api-key=${heliusApiKey}`;
  }
  return isDevnet
    ? "https://api.devnet.solana.com"
    : "https://api.mainnet-beta.solana.com";
}

export const config = {
  port: parseInt(process.env.PORT || "8000", 10),
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000").split(","),
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  // Solana
  isDevnet,
  solanaRpc: deriveSolanaRpc(),
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
  programId: process.env.PROGRAM_ID || "CcyByKGzRDK17icyNGAgdUN4q7WzbL1BPi4BNzqytyMP",
};
