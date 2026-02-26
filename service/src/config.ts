import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "8000", 10),
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000").split(","),
  nodeEnv: process.env.NODE_ENV || "development",
  // Solana
  solanaRpc: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  heliusApiKey: process.env.HELIUS_API_KEY || "",
  // Database
  databaseUrl: process.env.DATABASE_URL || "",
  redisUrl: process.env.REDIS_URL || "",
};
