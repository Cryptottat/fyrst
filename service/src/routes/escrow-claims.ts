import { Router, Request, Response, NextFunction } from "express";
import { prisma, dbConnected } from "../lib/prisma";


const escrowClaimsRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/escrow-claims
// ---------------------------------------------------------------------------

escrowClaimsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
      const offset = parseInt(req.query.offset as string, 10) || 0;

      if (!dbConnected()) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const [claims, total] = await Promise.all([
        prisma.escrowClaim.findMany({
          take: limit,
          skip: offset,
          orderBy: { timestamp: "desc" },
        }),
        prisma.escrowClaim.count(),
      ]);

      const mapped = claims.map((c) => ({
        id: c.id,
        signature: c.signature,
        tokenMint: c.tokenMint,
        claimerWallet: c.claimerWallet,
        amountSol: c.amountSol.toString(),
        tokensBurned: c.tokensBurned.toString(),
        timestamp: c.timestamp.toISOString(),
        createdAt: c.createdAt.toISOString(),
      }));

      res.json({ claims: mapped, total, limit, offset });
    } catch (err) {
      next(err);
    }
  }
);

export { escrowClaimsRouter };
