import { config } from "../config";
import { logger } from "../utils/logger";
import {
  Connection,
  Keypair,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";
import { sendAlert } from "./telegram";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let totalBuybackSol = 0;
let totalBuybackCount = 0;
/** Balance snapshot after last buyback — new fees = current balance - this */
let lastSnapshotLamports: number | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTreasuryKeypair(): Keypair | null {
  if (!config.treasuryPrivateKey) return null;
  try {
    const secretKey = bs58.decode(config.treasuryPrivateKey);
    return Keypair.fromSecretKey(secretKey);
  } catch (err) {
    logger.error("Invalid TREASURY_PRIVATE_KEY", err);
    return null;
  }
}

function getConnection(): Connection {
  const rpc = config.solanaRpc;
  return new Connection(rpc, "confirmed");
}

// ---------------------------------------------------------------------------
// Jupiter Swap
// ---------------------------------------------------------------------------

const SOL_MINT = "So11111111111111111111111111111111111111112";

/**
 * Execute a Jupiter swap: SOL → target token.
 * Uses Jupiter v6 swap API.
 */
async function jupiterSwap(
  keypair: Keypair,
  outputMint: string,
  amountLamports: number,
): Promise<string | null> {
  const jupiterBase = config.jupiterApiUrl;

  // 1. Get quote
  const quoteUrl =
    `${jupiterBase}/quote?inputMint=${SOL_MINT}` +
    `&outputMint=${outputMint}` +
    `&amount=${amountLamports}` +
    `&slippageBps=300` +
    `&swapMode=ExactIn`;

  logger.info(`Buyback: fetching Jupiter quote for ${amountLamports} lamports`);

  const quoteRes = await fetch(quoteUrl);
  if (!quoteRes.ok) {
    const body = await quoteRes.text();
    logger.error(`Jupiter quote failed: ${quoteRes.status}`, { body });
    return null;
  }
  const quoteData = await quoteRes.json();

  // 2. Get swap transaction
  const swapRes = await fetch(`${jupiterBase}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quoteData,
      userPublicKey: keypair.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto",
    }),
  });

  if (!swapRes.ok) {
    const body = await swapRes.text();
    logger.error(`Jupiter swap failed: ${swapRes.status}`, { body });
    return null;
  }

  const { swapTransaction } = (await swapRes.json()) as { swapTransaction: string };

  // 3. Deserialize, sign, send
  const connection = getConnection();
  const txBuf = Buffer.from(swapTransaction, "base64");
  const tx = VersionedTransaction.deserialize(txBuf);
  tx.sign([keypair]);

  const txSig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  // Wait for confirmation
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    { signature: txSig, blockhash, lastValidBlockHeight },
    "confirmed",
  );

  logger.info(`Buyback TX confirmed: ${txSig}`);
  return txSig;
}

// ---------------------------------------------------------------------------
// Buyback Logic
// ---------------------------------------------------------------------------

async function executeBuyback(): Promise<void> {
  const { buybackTokenMint, buybackPct, buybackMinSol } = config;

  if (!buybackTokenMint) {
    logger.debug("Buyback: BUYBACK_TOKEN_MINT not set, skipping");
    return;
  }

  const keypair = getTreasuryKeypair();
  if (!keypair) {
    logger.warn("Buyback: no valid treasury keypair, skipping");
    return;
  }

  const connection = getConnection();

  try {
    // Check treasury SOL balance
    const balanceLamports = await connection.getBalance(keypair.publicKey);

    // First run: snapshot current balance, don't buyback yet
    if (lastSnapshotLamports === null) {
      lastSnapshotLamports = balanceLamports;
      logger.info(
        `Buyback: initial snapshot = ${(balanceLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`
      );
      return;
    }

    // Only buyback from NEW fees (balance increase since last snapshot)
    const newFeeLamports = balanceLamports - lastSnapshotLamports;
    if (newFeeLamports <= 0) {
      logger.info("Buyback: no new fees since last snapshot, skipping");
      return;
    }

    const newFeeSol = newFeeLamports / LAMPORTS_PER_SOL;
    const buybackSol = newFeeSol * (buybackPct / 100);

    if (buybackSol < buybackMinSol) {
      logger.info(
        `Buyback: new fees too small (new=${newFeeSol.toFixed(4)} SOL, ` +
        `buyback=${buybackSol.toFixed(4)} SOL, min=${buybackMinSol} SOL)`
      );
      return;
    }

    const buybackLamports = Math.floor(buybackSol * LAMPORTS_PER_SOL);

    logger.info(
      `Buyback: executing ${buybackSol.toFixed(4)} SOL (${buybackPct}% of ${newFeeSol.toFixed(4)} SOL new fees) → $FYRST`
    );

    const txSig = await jupiterSwap(keypair, buybackTokenMint, buybackLamports);

    if (txSig) {
      // Update snapshot: new baseline = current balance after buyback
      lastSnapshotLamports = balanceLamports - buybackLamports;
      totalBuybackSol += buybackSol;
      totalBuybackCount++;

      logger.info(
        `Buyback SUCCESS: ${buybackSol.toFixed(4)} SOL → $FYRST | TX: ${txSig} | Total: ${totalBuybackSol.toFixed(4)} SOL (${totalBuybackCount} swaps)`
      );

      // Notify via Telegram
      sendAlert(
        "BUYBACK EXECUTED",
        `Amount: ${buybackSol.toFixed(4)} SOL\n` +
        `Token: $FYRST\n` +
        `TX: https://solscan.io/tx/${txSig}\n` +
        `Total buyback: ${totalBuybackSol.toFixed(4)} SOL (${totalBuybackCount} swaps)`,
      ).catch(() => {});
    }
  } catch (err) {
    logger.error("Buyback execution error", err);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Start the periodic buyback scheduler */
export function startBuyback(): void {
  if (!config.buybackTokenMint) {
    logger.info("Buyback: BUYBACK_TOKEN_MINT not configured, buyback disabled");
    return;
  }

  if (!config.treasuryPrivateKey) {
    logger.warn("Buyback: TREASURY_PRIVATE_KEY not configured, buyback disabled");
    return;
  }

  logger.info(
    `Buyback: starting scheduler (interval=${config.buybackIntervalMs}ms, ` +
    `pct=${config.buybackPct}%, min=${config.buybackMinSol} SOL, ` +
    `token=${config.buybackTokenMint})`
  );

  // Run once on startup after a short delay
  setTimeout(() => executeBuyback(), 10_000);

  // Then run on interval
  intervalHandle = setInterval(() => executeBuyback(), config.buybackIntervalMs);
}

/** Stop the buyback scheduler */
export function stopBuyback(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info("Buyback: scheduler stopped");
  }
}

/** Get buyback stats */
export function getBuybackStats() {
  return {
    enabled: !!config.buybackTokenMint && !!config.treasuryPrivateKey,
    tokenMint: config.buybackTokenMint || null,
    buybackPct: config.buybackPct,
    totalBuybackSol,
    totalBuybackCount,
  };
}
