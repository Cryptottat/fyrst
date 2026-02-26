import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "8000", 10),
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000").split(","),
  nodeEnv: process.env.NODE_ENV || "development",
  // Solana
  solanaRpc: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  heliusApiKey: process.env.HELIUS_API_KEY || "",
  heliusRpcUrl: process.env.HELIUS_RPC_URL || "",
  quicknodeRpcUrl: process.env.QUICKNODE_RPC_URL || "",
  jupiterApiUrl: process.env.JUPITER_API_URL || "https://api.jup.ag",
  // Telegram
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
  // Database
  databaseUrl: process.env.DATABASE_URL || "",
  redisUrl: process.env.REDIS_URL || "",
};
