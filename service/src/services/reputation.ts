import { ReputationRank, CollateralTier } from "../types";
import { logger } from "../utils/logger";
import { prisma, dbConnected } from "../lib/prisma";

// ---------------------------------------------------------------------------
// Reputation scoring
// ---------------------------------------------------------------------------

export interface ReputationInput {
  totalLaunches: number;
  successfulLaunches: number;
  rugPulls: number;
  collateralTier: string;
  createdAt: Date;
}

/**
 * Calculate reputation score from deployer stats.
 *
 * Formula:
 * - Base score: 50
 * - +20 if no rug pulls ever
 * - +10 per successful launch (max +30)
 * - -20 per rug pull
 * - +10 if collateral tier >= Gold
 * - +5 if account age > 30 days
 * - Capped at 0..100
 */
export function computeScore(input: ReputationInput): number {
  let score = 50;

  // Clean history bonus
  if (input.rugPulls === 0) {
    score += 20;
  }

  // Successful launches (max +30)
  score += Math.min(input.successfulLaunches * 10, 30);

  // Rug pull penalty
  score -= input.rugPulls * 20;

  // Collateral tier bonus
  if (
    input.collateralTier === CollateralTier.Gold ||
    input.collateralTier === CollateralTier.Diamond
  ) {
    score += 10;
  }

  // Account age bonus
  const ageMs = Date.now() - input.createdAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays > 30) {
    score += 5;
  }

  // Clamp
  return Math.max(0, Math.min(100, score));
}

/**
 * Convert a numeric reputation score to a letter rank.
 *
 * A: 80+  B: 60+  C: 40+  D: 20+  F: <20
 */
export function scoreToRank(score: number): ReputationRank {
  if (score >= 80) return ReputationRank.A;
  if (score >= 60) return ReputationRank.B;
  if (score >= 40) return ReputationRank.C;
  if (score >= 20) return ReputationRank.D;
  return ReputationRank.F;
}

/**
 * Calculate and persist the reputation score for a deployer.
 * Falls back to a default score of 50 when the DB is unavailable.
 */
export async function calculateReputationScore(
  deployerAddress: string
): Promise<{ score: number; rank: ReputationRank }> {
  logger.info(`Calculating reputation score for ${deployerAddress}`);

  if (!dbConnected()) {
    logger.warn("DB not connected -- returning default reputation");
    return { score: 50, rank: ReputationRank.C };
  }

  try {
    const deployer = await prisma.deployer.findUnique({
      where: { address: deployerAddress },
    });

    if (!deployer) {
      return { score: 50, rank: ReputationRank.C };
    }

    const score = computeScore({
      totalLaunches: deployer.totalLaunches,
      successfulLaunches: deployer.successfulLaunches,
      rugPulls: deployer.rugPulls,
      collateralTier: deployer.collateralTier,
      createdAt: deployer.createdAt,
    });

    const rank = scoreToRank(score);

    // Persist updated score
    await prisma.deployer.update({
      where: { address: deployerAddress },
      data: {
        reputationScore: score,
        reputationRank: rank,
      },
    });

    return { score, rank };
  } catch (err) {
    logger.error("Failed to calculate reputation score", err);
    return { score: 50, rank: ReputationRank.C };
  }
}
