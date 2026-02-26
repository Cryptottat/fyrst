import { RefundRecord } from "../types";
import { logger } from "../utils/logger";
import { prisma, dbConnected } from "../lib/prisma";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Refund safe period: 24 hours in milliseconds */
const SAFE_PERIOD_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

/**
 * Check whether a holder is eligible for a refund.
 * Eligibility rules:
 *  1. The token must have been created within the safe period (24h).
 *  2. The holder must have a buyer record with a positive balance.
 *  3. The holder must not already have a pending/completed refund.
 */
export async function checkRefundEligibility(
  tokenMint: string,
  holderAddress: string
): Promise<{ eligible: boolean; amountSol: number; reason?: string }> {
  logger.info(
    `Checking refund eligibility: token=${tokenMint} holder=${holderAddress}`
  );

  if (!dbConnected()) {
    logger.warn("DB not connected -- returning ineligible");
    return { eligible: false, amountSol: 0, reason: "Service unavailable" };
  }

  try {
    // 1. Fetch token
    const token = await prisma.token.findUnique({
      where: { mint: tokenMint },
    });

    if (!token) {
      return { eligible: false, amountSol: 0, reason: "Token not found" };
    }

    // 2. Check safe period
    const tokenAge = Date.now() - token.createdAt.getTime();
    if (tokenAge > SAFE_PERIOD_MS) {
      return {
        eligible: false,
        amountSol: 0,
        reason: "Safe period (24h) has expired",
      };
    }

    // 3. Check buyer record
    const buyerRecord = await prisma.buyerRecord.findUnique({
      where: {
        buyerAddress_tokenMint: {
          buyerAddress: holderAddress,
          tokenMint,
        },
      },
    });

    if (!buyerRecord || buyerRecord.totalBought - buyerRecord.totalSold <= 0) {
      return {
        eligible: false,
        amountSol: 0,
        reason: "No holdings found for this token",
      };
    }

    // 4. Check for existing refund
    const existingRefund = await prisma.refund.findFirst({
      where: {
        tokenMint,
        claimantAddress: holderAddress,
        status: { in: ["pending", "processing", "completed"] },
      },
    });

    if (existingRefund) {
      return {
        eligible: false,
        amountSol: 0,
        reason: "Refund already claimed or in progress",
      };
    }

    // 5. Calculate pro-rata refund amount
    const holdingBalance = buyerRecord.totalBought - buyerRecord.totalSold;
    const refundSol = holdingBalance * buyerRecord.avgPrice;

    return { eligible: true, amountSol: refundSol };
  } catch (err) {
    logger.error("Failed to check refund eligibility", err);
    return { eligible: false, amountSol: 0, reason: "Internal error" };
  }
}

// ---------------------------------------------------------------------------
// Processing
// ---------------------------------------------------------------------------

/**
 * Create a refund record and queue it for processing.
 *
 * TODO (Phase 6): Integrate with BullMQ worker for actual on-chain refund
 * transactions.
 */
export async function requestRefund(
  tokenMint: string,
  claimantAddress: string,
  amountSol: number
): Promise<RefundRecord | null> {
  logger.info(
    `Requesting refund: token=${tokenMint} claimant=${claimantAddress} amount=${amountSol} SOL`
  );

  if (!dbConnected()) {
    logger.warn("DB not connected -- cannot process refund");
    return null;
  }

  try {
    const refund = await prisma.refund.create({
      data: {
        tokenMint,
        claimantAddress,
        amountSol,
        status: "pending",
      },
    });

    // TODO (Phase 6): Queue refund job via BullMQ
    // const queue = new Queue("refund-processing", { connection: redis });
    // await queue.add("process-refund", { refundId: refund.id });

    return {
      id: refund.id,
      tokenMint: refund.tokenMint,
      claimantAddress: refund.claimantAddress,
      amountSol: refund.amountSol,
      status: refund.status as RefundRecord["status"],
      createdAt: refund.createdAt.toISOString(),
      processedAt: refund.processedAt?.toISOString(),
      txSignature: refund.txSignature ?? undefined,
    };
  } catch (err) {
    logger.error("Failed to create refund record", err);
    return null;
  }
}

/**
 * Process refunds for a token that has been flagged.
 * Iterates over all holders and creates refund records.
 *
 * TODO (Phase 6): Actual on-chain refund transactions.
 */
export async function processRefund(tokenMint: string): Promise<void> {
  logger.info(`Processing refunds for token: ${tokenMint}`);

  if (!dbConnected()) {
    logger.warn("DB not connected -- skipping refund processing");
    return;
  }

  try {
    // Fetch all buyer records for this token with positive balance
    const buyerRecords = await prisma.buyerRecord.findMany({
      where: { tokenMint },
    });

    for (const record of buyerRecords) {
      const balance = record.totalBought - record.totalSold;
      if (balance <= 0) continue;

      const refundAmount = balance * record.avgPrice;
      await requestRefund(tokenMint, record.buyerAddress, refundAmount);
    }

    logger.info(`Refund records created for token: ${tokenMint}`);
  } catch (err) {
    logger.error("Failed to process refunds", err);
  }
}

/**
 * Get all refund records for a wallet address.
 */
export async function getRefundsForWallet(
  walletAddress: string
): Promise<RefundRecord[]> {
  if (!dbConnected()) {
    return [];
  }

  try {
    const refunds = await prisma.refund.findMany({
      where: { claimantAddress: walletAddress },
      orderBy: { createdAt: "desc" },
    });

    return refunds.map((r) => ({
      id: r.id,
      tokenMint: r.tokenMint,
      claimantAddress: r.claimantAddress,
      amountSol: r.amountSol,
      status: r.status as RefundRecord["status"],
      createdAt: r.createdAt.toISOString(),
      processedAt: r.processedAt?.toISOString(),
      txSignature: r.txSignature ?? undefined,
    }));
  } catch (err) {
    logger.error("Failed to fetch refunds for wallet", err);
    return [];
  }
}
