import { Router, Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { prisma, dbConnected } from "../lib/prisma";
import { logger } from "../utils/logger";
import { validateBody, validateQuery } from "../middleware/validate";
import { createLaunchSchema, launchesQuerySchema } from "../schemas";
import { assignTier, validateCollateral } from "../services/escrow";
import { computeScore, scoreToRank } from "../services/reputation";
import { spotPrice } from "../services/bondingCurve";
import { getIo } from "../socketManager";
import { CollateralTier, ReputationRank } from "../types";

const launchesRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/launches
// ---------------------------------------------------------------------------

launchesRouter.get(
  "/",
  validateQuery(launchesQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = res.locals.parsedQuery as {
        sort: string;
        limit: string;
        offset: string;
      };

      const sort = parsed.sort || "newest";
      const limit = parseInt(parsed.limit, 10) || 20;
      const offset = parseInt(parsed.offset, 10) || 0;

      // Fallback mock data when DB is unavailable
      if (!dbConnected()) {
        const mockTokens = [
          {
            mint: "mock_mint_111",
            name: "MockToken",
            symbol: "MOCK",
            description: "A mock token for development",
            imageUrl: "",
            deployerAddress: "mock_deployer_111",
            marketCap: 1000,
            currentPrice: 0.0001,
            totalSupply: 10000000,
            collateralTier: CollateralTier.Bronze,
            graduated: false,
            bondingCurveProgress: 5,
            createdAt: new Date().toISOString(),
            deployer: {
              address: "mock_deployer_111",
              reputationScore: 50,
              reputationRank: ReputationRank.C,
              totalLaunches: 1,
              successfulLaunches: 0,
              rugPulls: 0,
              collateralLocked: 1,
              collateralTier: CollateralTier.Bronze,
              createdAt: new Date().toISOString(),
            },
          },
        ];
        res.json({
          success: true,
          data: { tokens: mockTokens, total: 1, limit, offset },
        });
        return;
      }

      // Build order-by clause
      type OrderBy = Record<string, "asc" | "desc">;
      let orderBy: OrderBy = { createdAt: "desc" };
      if (sort === "marketcap") {
        orderBy = { marketCap: "desc" };
      }

      // When sorting by reputation we sort after fetching (requires join)
      const tokens = await prisma.token.findMany({
        take: sort === "reputation" ? undefined : limit,
        skip: sort === "reputation" ? undefined : offset,
        orderBy: sort !== "reputation" ? orderBy : { createdAt: "desc" },
        include: { deployer: true },
      });

      type TokenWithDeployer = (typeof tokens)[number];

      let results: TokenWithDeployer[] = tokens;

      // Client-side sort by reputation score
      if (sort === "reputation") {
        results = [...tokens].sort(
          (a, b) => b.deployer.reputationScore - a.deployer.reputationScore
        );
        results = results.slice(offset, offset + limit);
      }

      const total = await prisma.token.count();

      const mapped = results.map((t) => ({
        mint: t.mint,
        name: t.name,
        symbol: t.symbol,
        description: t.description,
        imageUrl: t.imageUrl,
        deployerAddress: t.deployerAddress,
        marketCap: t.marketCap,
        currentPrice: t.currentPrice,
        totalSupply: t.totalSupply,
        collateralTier: t.collateralTier,
        graduated: t.graduated,
        bondingCurveProgress: t.bondingCurveProgress,
        createdAt: t.createdAt.toISOString(),
        deployer: {
          address: t.deployer.address,
          reputationScore: t.deployer.reputationScore,
          reputationRank: t.deployer.reputationRank,
          totalLaunches: t.deployer.totalLaunches,
          successfulLaunches: t.deployer.successfulLaunches,
          rugPulls: t.deployer.rugPulls,
          collateralLocked: t.deployer.collateralLocked,
          collateralTier: t.deployer.collateralTier,
          createdAt: t.deployer.createdAt.toISOString(),
        },
      }));

      res.json({
        success: true,
        data: { tokens: mapped, total, limit, offset },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/launches/:mint
// ---------------------------------------------------------------------------

launchesRouter.get(
  "/:mint",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mint = req.params.mint as string;

      if (!dbConnected()) {
        res.json({
          success: true,
          data: {
            mint,
            name: "MockToken",
            symbol: "MOCK",
            description: "Mock token (DB unavailable)",
            imageUrl: "",
            deployerAddress: "mock_deployer",
            marketCap: 0,
            currentPrice: 0.0001,
            totalSupply: 0,
            collateralTier: CollateralTier.Bronze,
            graduated: false,
            bondingCurveProgress: 0,
            createdAt: new Date().toISOString(),
            deployer: null,
            tradeCount: 0,
          },
        });
        return;
      }

      const token = await prisma.token.findUnique({
        where: { mint },
        include: { deployer: true },
      });

      if (!token) {
        res.status(404).json({ success: false, error: "Token not found" });
        return;
      }

      const tradeCount = await prisma.trade.count({
        where: { tokenMint: mint },
      });

      res.json({
        success: true,
        data: {
          mint: token.mint,
          name: token.name,
          symbol: token.symbol,
          description: token.description,
          imageUrl: token.imageUrl,
          deployerAddress: token.deployerAddress,
          marketCap: token.marketCap,
          currentPrice: token.currentPrice,
          totalSupply: token.totalSupply,
          collateralTier: token.collateralTier,
          graduated: token.graduated,
          bondingCurveProgress: token.bondingCurveProgress,
          createdAt: token.createdAt.toISOString(),
          deployer: {
            address: token.deployer.address,
            reputationScore: token.deployer.reputationScore,
            reputationRank: token.deployer.reputationRank,
            totalLaunches: token.deployer.totalLaunches,
            successfulLaunches: token.deployer.successfulLaunches,
            rugPulls: token.deployer.rugPulls,
            collateralLocked: token.deployer.collateralLocked,
            collateralTier: token.deployer.collateralTier,
            createdAt: token.deployer.createdAt.toISOString(),
          },
          tradeCount,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/launches
// ---------------------------------------------------------------------------

launchesRouter.post(
  "/",
  validateBody(createLaunchSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        name,
        symbol,
        description,
        imageUrl,
        deployerAddress,
        collateralAmount,
      } = req.body;

      // Validate collateral
      const collateralCheck = validateCollateral(collateralAmount);
      if (!collateralCheck.valid) {
        res.status(400).json({
          success: false,
          error: collateralCheck.error,
        });
        return;
      }

      const tier = assignTier(collateralAmount);
      // Generate a mock mint address (in Phase 6 this comes from on-chain token creation)
      const mint = `mint_${uuidv4().replace(/-/g, "").slice(0, 32)}`;

      if (!dbConnected()) {
        const mockToken = {
          mint,
          name,
          symbol,
          description,
          imageUrl,
          deployerAddress,
          marketCap: 0,
          currentPrice: spotPrice(0),
          totalSupply: 0,
          collateralTier: tier,
          graduated: false,
          bondingCurveProgress: 0,
          createdAt: new Date().toISOString(),
        };

        // Emit socket event
        try {
          const io = getIo();
          if (io) {
            io.emit("launch:new", mockToken);
          }
        } catch {
          // Socket not initialized yet
        }

        res.status(201).json({ success: true, data: mockToken });
        return;
      }

      // Upsert deployer
      const deployer = await prisma.deployer.upsert({
        where: { address: deployerAddress },
        update: {
          totalLaunches: { increment: 1 },
          collateralLocked: { increment: collateralAmount },
          collateralTier: tier,
        },
        create: {
          address: deployerAddress,
          totalLaunches: 1,
          collateralLocked: collateralAmount,
          collateralTier: tier,
          reputationScore: 50,
          reputationRank: "C",
        },
      });

      // Recalculate reputation
      const score = computeScore({
        totalLaunches: deployer.totalLaunches,
        successfulLaunches: deployer.successfulLaunches,
        rugPulls: deployer.rugPulls,
        collateralTier: deployer.collateralTier,
        createdAt: deployer.createdAt,
      });
      const rank = scoreToRank(score);

      await prisma.deployer.update({
        where: { address: deployerAddress },
        data: { reputationScore: score, reputationRank: rank },
      });

      // Create token
      const token = await prisma.token.create({
        data: {
          mint,
          name,
          symbol,
          description: description || "",
          imageUrl: imageUrl || "",
          deployerAddress,
          currentPrice: spotPrice(0),
          collateralTier: tier,
        },
      });

      const responseData = {
        mint: token.mint,
        name: token.name,
        symbol: token.symbol,
        description: token.description,
        imageUrl: token.imageUrl,
        deployerAddress: token.deployerAddress,
        marketCap: token.marketCap,
        currentPrice: token.currentPrice,
        totalSupply: token.totalSupply,
        collateralTier: token.collateralTier,
        graduated: token.graduated,
        bondingCurveProgress: token.bondingCurveProgress,
        createdAt: token.createdAt.toISOString(),
      };

      // Emit socket event
      try {
        const io = getIo();
        if (io) {
          io.emit("launch:new", responseData);
        }
      } catch {
        // Socket not initialized yet
      }

      res.status(201).json({ success: true, data: responseData });
    } catch (err) {
      next(err);
    }
  }
);

export { launchesRouter };
