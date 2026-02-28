import { CollateralTier } from "../types";
import { logger } from "../utils/logger";
import { prisma, dbConnected } from "../lib/prisma";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MINIMUM_COLLATERAL_SOL = 0.01;

const TIER_THRESHOLDS: { min: number; tier: CollateralTier }[] = [
  { min: 25, tier: CollateralTier.Diamond },
  { min: 10, tier: CollateralTier.Gold },
  { min: 5, tier: CollateralTier.Silver },
  { min: 0.01, tier: CollateralTier.Bronze },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Determine the collateral tier for a given SOL amount.
 */
export function assignTier(amountSol: number): CollateralTier {
  for (const { min, tier } of TIER_THRESHOLDS) {
    if (amountSol >= min) return tier;
  }
  return CollateralTier.Bronze;
}

/**
 * Validate that the collateral amount meets the minimum requirement.
 */
export function validateCollateral(amountSol: number): {
  valid: boolean;
  error?: string;
} {
  if (amountSol < MINIMUM_COLLATERAL_SOL) {
    return {
      valid: false,
      error: `Minimum collateral is ${MINIMUM_COLLATERAL_SOL} SOL. Provided: ${amountSol} SOL.`,
    };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Escrow operations (placeholders for on-chain interaction in Phase 6)
// ---------------------------------------------------------------------------

/**
 * Create a new escrow account for a token launch.
 * The deployer locks collateral that can be slashed if conditions are violated.
 *
 * TODO (Phase 6): Build and send an actual Solana transaction to create the
 * escrow PDA and transfer collateral SOL.
 */
export async function createEscrow(
  deployerAddress: string,
  tokenMint: string,
  amountSol: number
): Promise<{ escrowAddress: string; tier: CollateralTier }> {
  logger.info(
    `Creating escrow: deployer=${deployerAddress} token=${tokenMint} amount=${amountSol} SOL`
  );

  const validation = validateCollateral(amountSol);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const tier = assignTier(amountSol);

  // TODO (Phase 6): On-chain escrow creation
  // 1. Derive escrow PDA from deployer + token mint
  // 2. Build ix to create escrow account
  // 3. Build ix to transfer SOL from deployer to escrow
  // 4. Send and confirm transaction
  const escrowAddress = `escrow_${tokenMint.slice(0, 8)}_${Date.now()}`;

  // Track in DB
  if (dbConnected()) {
    try {
      await prisma.deployer.update({
        where: { address: deployerAddress },
        data: {
          collateralLocked: { increment: amountSol },
          collateralTier: tier,
        },
      });
    } catch (err) {
      logger.error("Failed to update deployer collateral in DB", err);
    }
  }

  return { escrowAddress, tier };
}

/**
 * Release escrowed collateral back to the deployer after successful graduation.
 *
 * TODO (Phase 6): Build and send actual release transaction.
 */
export async function releaseEscrow(
  escrowAddress: string,
  deployerAddress: string
): Promise<string> {
  logger.info(
    `Releasing escrow: escrow=${escrowAddress} deployer=${deployerAddress}`
  );

  // TODO (Phase 6): On-chain escrow release
  // 1. Verify graduation conditions are met
  // 2. Build release transaction
  // 3. Return collateral to deployer
  const txSignature = `tx_release_${Date.now()}`;

  return txSignature;
}

/**
 * Get the current balance held in an escrow account.
 *
 * TODO (Phase 6): Fetch balance from Solana RPC.
 */
export async function getEscrowBalance(
  escrowAddress: string
): Promise<number> {
  logger.info(`Fetching escrow balance: escrow=${escrowAddress}`);
  // TODO (Phase 6): Fetch actual on-chain balance
  return 0;
}
