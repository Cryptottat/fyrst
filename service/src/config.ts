import dotenv from "dotenv";
dotenv.config();

// ---------------------------------------------------------------------------
// Derive Solana RPC URL from SOLANA_NETWORK + HELIUS_API_KEY
// Priority: explicit SOLANA_RPC_URL > Helius-derived > public fallback
// ---------------------------------------------------------------------------
const solanaNetwork = (process.env.SOLANA_NETWORK || "devnet") as "devnet" | "mainnet";
const heliusApiKey = process.env.HELIUS_API_KEY || "";

function deriveSolanaRpc(): string {
  if (process.env.SOLANA_RPC_URL) return process.env.SOLANA_RPC_URL;
  if (heliusApiKey) {
    const host = solanaNetwork === "mainnet" ? "mainnet" : "devnet";
    return `https://${host}.helius-rpc.com/?api-key=${heliusApiKey}`;
  }
  return solanaNetwork === "mainnet"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com";
}

export const config = {
  port: parseInt(process.env.PORT || "8000", 10),
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000").split(","),
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  // Solana
  solanaNetwork,
  solanaRpc: deriveSolanaRpc(),
  heliusApiKey,
  heliusRpcUrl: process.env.HELIUS_RPC_URL || "",
  quicknodeRpcUrl: process.env.QUICKNODE_RPC_URL || "",
  jupiterApiUrl: process.env.JUPITER_API_URL || "https://api.jup.ag",
  // Telegram
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
  // Database
  databaseUrl: process.env.DATABASE_URL || "",
  redisUrl: process.env.REDIS_URL || "",
  // Buyback
  buybackTokenMint: process.env.BUYBACK_TOKEN_MINT || "", // $FYRST pump.fun CA
  treasuryPrivateKey: process.env.TREASURY_PRIVATE_KEY || "", // treasury wallet keypair (base58)
  buybackPct: parseInt(process.env.BUYBACK_PCT || "30", 10), // % of treasury fees used for buyback
  buybackIntervalMs: parseInt(process.env.BUYBACK_INTERVAL_MS || "60000", 10), // 1 minute default
  buybackMinSol: parseFloat(process.env.BUYBACK_MIN_SOL || "0.01"), // min SOL threshold to trigger buyback
  // Program
  programId: process.env.PROGRAM_ID || "CcyByKGzRDK17icyNGAgdUN4q7WzbL1BPi4BNzqytyMP",
};
