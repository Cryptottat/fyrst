import { ReputationRank } from "../types";
import { logger } from "../utils/logger";

/**
 * Calculate the reputation score for a deployer based on their on-chain history.
 *
 * Factors considered:
 * - Number of successful launches vs total launches
 * - Rug pull history (heavily penalized)
 * - Collateral locked
 * - Community engagement metrics
 *
 * @param deployerAddress - Solana wallet address of the deployer
 * @returns Reputation score between 0 and 100
 */
export async function calculateReputationScore(
  deployerAddress: string
): Promise<number> {
  // TODO: Implement reputation score calculation
  // 1. Fetch deployer history from on-chain data
  // 2. Calculate weighted score from multiple factors
  // 3. Apply penalties for rug pulls
  // 4. Return normalized score 0-100
  logger.info(`Calculating reputation score for ${deployerAddress}`);
  return 50; // Placeholder default score
}

/**
 * Convert a numeric reputation score to a letter rank.
 *
 * @param score - Numeric score 0-100
 * @returns ReputationRank enum value
 */
export function scoreToRank(score: number): ReputationRank {
  if (score >= 90) return ReputationRank.A;
  if (score >= 75) return ReputationRank.B;
  if (score >= 60) return ReputationRank.C;
  if (score >= 40) return ReputationRank.D;
  return ReputationRank.F;
}
