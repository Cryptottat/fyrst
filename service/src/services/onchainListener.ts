import { Connection, PublicKey, Logs } from "@solana/web3.js";
import { config } from "../config";
import { logger } from "../utils/logger";
import { prisma, dbConnected } from "../lib/prisma";
import { spotPrice, calculateProgress } from "./bondingCurve";
import { getIo } from "../socketManager";

// ---------------------------------------------------------------------------
// On-chain Event Listener (Section 5 — On-chain Data Sync)
//
// Listens to FYRST program logs via WebSocket (connection.onLogs) and
// parses buy/sell events to update the DB. This replaces the client-
// authoritative POST /api/trade approach.
// ---------------------------------------------------------------------------

const PROGRAM_ID = new PublicKey(config.programId);

let subscriptionId: number | null = null;
let rpcConnection: Connection | null = null;

/**
 * Start listening to on-chain program events.
 * Uses Solana RPC WebSocket `onLogs` to watch for all transactions
 * involving the FYRST program.
 */
export function startOnchainListener(): void {
  const rpcUrl = config.solanaRpc;
  if (!rpcUrl) {
    logger.warn("No RPC URL configured — on-chain listener disabled");
    return;
  }

  // Convert HTTP URL to WebSocket for subscription
  const wsUrl = rpcUrl.replace("https://", "wss://").replace("http://", "ws://");
  rpcConnection = new Connection(rpcUrl, { wsEndpoint: wsUrl, commitment: "confirmed" });

  logger.info(`Starting on-chain listener for program ${config.programId}`);

  subscriptionId = rpcConnection.onLogs(
    PROGRAM_ID,
    async (logs: Logs) => {
      try {
        await processLogs(logs);
      } catch (err) {
        logger.error("Error processing on-chain logs", err);
      }
    },
    "confirmed",
  );

  logger.info(`On-chain listener subscribed (id=${subscriptionId})`);
}

/**
 * Stop listening to on-chain events.
 */
export async function stopOnchainListener(): Promise<void> {
  if (subscriptionId !== null && rpcConnection) {
    await rpcConnection.removeOnLogsListener(subscriptionId);
    subscriptionId = null;
    logger.info("On-chain listener stopped");
  }
}

/**
 * Parse FYRST program logs and extract trade events.
 *
 * Actual Rust msg!() log formats:
 *   "Buy: buyer=ADDR, sol=AMOUNT, tokens=AMOUNT, new_supply=AMOUNT"
 *   "Sell: seller=ADDR, tokens=AMOUNT, sol=AMOUNT, new_supply=AMOUNT"
 *   "Token auto-graduated: mint=ADDR"
 *   "Escrow created: deployer=ADDR, mint=ADDR, collateral=AMOUNT, deadline=AMOUNT"
 *   "Refund: buyer=ADDR, tokens_burned=AMOUNT, sol_refunded=AMOUNT"
 */
async function processLogs(logs: Logs): Promise<void> {
  if (logs.err) return; // Skip failed transactions

  if (!dbConnected()) return;

  const signature = logs.signature;
  const logMessages = logs.logs;

  for (const log of logMessages) {
    // Match buy event: "Buy: buyer=ADDR, sol=AMOUNT, tokens=AMOUNT, new_supply=AMOUNT"
    const buyMatch = log.match(
      /Buy: buyer=(\S+), sol=(\d+), tokens=(\d+), new_supply=(\d+)/,
    );
    if (buyMatch) {
      const solLamports = parseInt(buyMatch[2], 10);
      const tokenAmount = parseInt(buyMatch[3], 10);
      await recordTradeFromChain(signature, "buy", tokenAmount, solLamports, logMessages);
      continue;
    }

    // Match sell event: "Sell: seller=ADDR, tokens=AMOUNT, sol=AMOUNT, new_supply=AMOUNT"
    const sellMatch = log.match(
      /Sell: seller=(\S+), tokens=(\d+), sol=(\d+), new_supply=(\d+)/,
    );
    if (sellMatch) {
      const tokenAmount = parseInt(sellMatch[2], 10);
      const solLamports = parseInt(sellMatch[3], 10);
      await recordTradeFromChain(signature, "sell", tokenAmount, solLamports, logMessages);
      continue;
    }

    // Match graduation: "Token auto-graduated: mint=ADDR"
    const gradMatch = log.match(/Token auto-graduated: mint=(\S+)/);
    if (gradMatch) {
      await handleGraduation(signature, logMessages);
      continue;
    }

    // Match escrow creation: "Escrow created: deployer=ADDR, mint=ADDR, collateral=AMOUNT, deadline=AMOUNT"
    const escrowMatch = log.match(
      /Escrow created: deployer=(\S+), mint=(\S+), collateral=(\d+), deadline=(\d+)/,
    );
    if (escrowMatch) {
      logger.info(
        `On-chain escrow creation detected: deployer=${escrowMatch[1]}, mint=${escrowMatch[2]}, collateral=${escrowMatch[3]}, tx=${signature}`,
      );
      continue;
    }

    // Match DEX migration: "DEX migration: mint=ADDR, pool=ADDR, sol=AMOUNT, tokens=AMOUNT"
    const dexMatch = log.match(
      /DEX migration: mint=(\S+), pool=(\S+), sol=(\d+), tokens=(\d+)/,
    );
    if (dexMatch) {
      await handleDexMigration(dexMatch[1], dexMatch[2], signature);
      continue;
    }

    // Match refund: "Refund: buyer=ADDR, tokens_burned=AMOUNT, sol_refunded=AMOUNT"
    const refundMatch = log.match(
      /Refund: buyer=(\S+), tokens_burned=(\d+), sol_refunded=(\d+)/,
    );
    if (refundMatch) {
      logger.info(
        `On-chain refund detected: buyer=${refundMatch[1]}, tokens_burned=${refundMatch[2]}, sol_refunded=${refundMatch[3]} lamports, tx=${signature}`,
      );
      continue;
    }
  }
}

/**
 * Record a trade detected from on-chain logs into the DB.
 * Extracts the token mint from the transaction accounts.
 */
async function recordTradeFromChain(
  signature: string,
  side: "buy" | "sell",
  tokenAmount: number,
  solLamports: number,
  _logMessages: string[],
): Promise<void> {
  // Avoid duplicate trades
  const existing = await prisma.trade.findFirst({
    where: { txSignature: signature },
  });
  if (existing) return;

  // Fetch full transaction to get accounts (token mint, trader)
  if (!rpcConnection) return;

  try {
    const tx = await rpcConnection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx?.meta || !tx.transaction) return;

    const accountKeys = tx.transaction.message.accountKeys;
    // Account 0 = signer (buyer/seller), Account 1 = bonding curve PDA
    const traderAddress = accountKeys[0].pubkey.toBase58();

    // Find the token mint by looking up which token we have in DB that matches
    // the bonding curve PDA. The curve PDA is derived from [CURVE_SEED, token_mint]
    // so we look for the curve account among the transaction accounts.
    // For simplicity, find a Token record where we have an active trade happening
    const solAmount = solLamports / 1e9;

    // Try to find the token by checking bonding curve PDA in our known tokens
    // The token_mint is typically account index 2 or can be found in inner instructions
    // For now, use a heuristic: find the most recently created non-graduated token
    // associated with one of the accounts in this transaction
    const accountAddresses = accountKeys.map((k) => k.pubkey.toBase58());

    // Check if any of the accounts match a known token mint
    const token = await prisma.token.findFirst({
      where: { mint: { in: accountAddresses } },
    });

    if (!token) {
      // Fallback: try to find by deployer who has a token
      const tokenByDeployer = await prisma.token.findFirst({
        where: {
          deployerAddress: { in: accountAddresses },
          graduated: false,
        },
        orderBy: { createdAt: "desc" },
      });
      if (!tokenByDeployer) {
        logger.warn(`On-chain trade detected but no matching token found: tx=${signature}`);
        return;
      }
      await upsertTradeRecord(tokenByDeployer.mint, traderAddress, side, tokenAmount, solAmount, signature);
      return;
    }

    await upsertTradeRecord(token.mint, traderAddress, side, tokenAmount, solAmount, signature);
  } catch (err) {
    logger.error(`Failed to process on-chain trade: tx=${signature}`, err);
  }
}

async function upsertTradeRecord(
  tokenMint: string,
  traderAddress: string,
  side: "buy" | "sell",
  tokenAmount: number,
  solAmount: number,
  txSignature: string,
): Promise<void> {
  const token = await prisma.token.findUnique({ where: { mint: tokenMint } });
  if (!token) return;

  // tokenAmount from on-chain is in atomic units (6 decimals) — convert to whole tokens
  const wholeTokens = tokenAmount / 1e6;

  const currentSupply = token.totalSupply;
  const newSupply = side === "buy" ? currentSupply + wholeTokens : Math.max(currentSupply - wholeTokens, 0);
  const newPrice = spotPrice(newSupply);
  const newMarketCap = newSupply * newPrice;
  const progress = calculateProgress(newSupply, newPrice);
  const graduated = progress >= 100;

  // Record trade (amount = whole tokens, totalSol = SOL)
  const trade = await prisma.trade.create({
    data: {
      tokenMint,
      traderAddress,
      side,
      amount: wholeTokens,
      price: newPrice,
      totalSol: solAmount,
      txSignature,
    },
  });

  // Update token state
  await prisma.token.update({
    where: { mint: tokenMint },
    data: {
      totalSupply: newSupply,
      currentPrice: newPrice,
      marketCap: newMarketCap,
      bondingCurveProgress: progress,
      graduated,
      lastTradeAt: new Date(),
    },
  });

  // Update buyer record
  if (side === "buy") {
    await prisma.buyerRecord.upsert({
      where: {
        buyerAddress_tokenMint: { buyerAddress: traderAddress, tokenMint },
      },
      update: {
        totalBought: { increment: wholeTokens },
        avgPrice: newPrice,
      },
      create: {
        buyerAddress: traderAddress,
        tokenMint,
        totalBought: wholeTokens,
        avgPrice: newPrice,
      },
    });
  } else {
    try {
      await prisma.buyerRecord.update({
        where: {
          buyerAddress_tokenMint: { buyerAddress: traderAddress, tokenMint },
        },
        data: { totalSold: { increment: wholeTokens } },
      });
    } catch {
      // Buyer record might not exist for direct on-chain sells
    }
  }

  // Emit socket events
  const tradeResult = {
    id: trade.id,
    tokenMint,
    traderAddress,
    side,
    amount: wholeTokens,
    price: newPrice,
    totalSol: solAmount,
    txSignature,
    createdAt: trade.createdAt.toISOString(),
    newPrice,
    newSupply,
    bondingCurveProgress: progress,
    graduated,
  };

  try {
    const io = getIo();
    if (io) {
      io.to(`token:${tokenMint}`).emit("trade:executed", tradeResult);
      io.emit("price:update", {
        tokenMint,
        price: newPrice,
        marketCap: newMarketCap,
        supply: newSupply,
        bondingCurveProgress: progress,
      });

      if (graduated) {
        io.to(`token:${tokenMint}`).emit("token:graduated", { tokenMint });
      }
    }
  } catch {
    // Socket not initialized
  }

  logger.info(
    `On-chain ${side} recorded: ${tokenAmount} tokens, ${solAmount} SOL, tx=${txSignature}`,
  );
}

async function handleDexMigration(
  tokenMint: string,
  poolAddress: string,
  signature: string,
): Promise<void> {
  try {
    await prisma.token.update({
      where: { mint: tokenMint },
      data: {
        graduated: true,
        dexMigrated: true,
        raydiumPool: poolAddress,
      },
    });

    const io = getIo();
    if (io) {
      io.to(`token:${tokenMint}`).emit("token:dex_migrated", {
        tokenMint,
        pool: poolAddress,
      });
      io.emit("token:dex_migrated", { tokenMint, pool: poolAddress });
    }

    logger.info(
      `DEX migration recorded: mint=${tokenMint}, pool=${poolAddress}, tx=${signature}`,
    );
  } catch (err) {
    logger.error(`Failed to record DEX migration: mint=${tokenMint}`, err);
  }
}

async function handleGraduation(signature: string, logMessages: string[]): Promise<void> {
  logger.info(`On-chain graduation detected: tx=${signature}`);

  // The graduation happens inside buy_tokens, so we've already
  // handled it via the trade processing above. This is just a log confirmation.
  try {
    const io = getIo();
    if (io) {
      io.emit("graduation:detected", { txSignature: signature });
    }
  } catch {
    // Socket not initialized
  }
}
