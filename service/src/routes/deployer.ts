import { Router, Request, Response, NextFunction } from "express";
import { prisma, dbConnected } from "../lib/prisma";
import { mockStore } from "../lib/mockStore";
import { logger } from "../utils/logger";
import { calculateReputationScore } from "../services/reputation";
import { CollateralTier, ReputationRank } from "../types";

const deployerRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/deployer/:address
// ---------------------------------------------------------------------------

deployerRouter.get(
  "/:address",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const address = req.params.address as string;

      if (!dbConnected()) {
        const deployer = mockStore.getDeployer(address);
        res.json({ success: true, data: deployer });
        return;
      }

      const deployer = await prisma.deployer.findUnique({
        where: { address },
        include: {
          tokens: {
            orderBy: { createdAt: "desc" },
            select: {
              mint: true,
              name: true,
              symbol: true,
              marketCap: true,
              currentPrice: true,
              graduated: true,
              bondingCurveProgress: true,
              createdAt: true,
            },
          },
        },
      });

      if (!deployer) {
        res.status(404).json({ success: false, error: "Deployer not found" });
        return;
      }

      res.json({
        success: true,
        data: {
          address: deployer.address,
          reputationScore: deployer.reputationScore,
          reputationRank: deployer.reputationRank,
          totalLaunches: deployer.totalLaunches,
          successfulLaunches: deployer.successfulLaunches,
          rugPulls: deployer.rugPulls,
          collateralLocked: deployer.collateralLocked,
          collateralTier: deployer.collateralTier,
          createdAt: deployer.createdAt.toISOString(),
          launchHistory: deployer.tokens.map((t) => ({
            mint: t.mint,
            name: t.name,
            symbol: t.symbol,
            marketCap: t.marketCap,
            currentPrice: t.currentPrice,
            graduated: t.graduated,
            bondingCurveProgress: t.bondingCurveProgress,
            createdAt: t.createdAt.toISOString(),
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/deployer/:address/score
// ---------------------------------------------------------------------------

deployerRouter.get(
  "/:address/score",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const address = req.params.address as string;

      const { score, rank } = await calculateReputationScore(address);

      res.json({
        success: true,
        data: {
          address,
          score,
          rank,
          breakdown: {
            baseScore: 50,
            cleanHistoryBonus: "+20 if no rug pulls",
            launchBonus: "+10 per successful launch (max +30)",
            rugPenalty: "-20 per rug pull",
            collateralBonus: "+10 if Gold/Diamond tier",
            ageBonus: "+5 if account > 30 days",
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export { deployerRouter };
