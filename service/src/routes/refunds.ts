import { Router, Request, Response, NextFunction } from "express";
import { getRefundsForWallet, checkRefundEligibility, requestRefund } from "../services/refund";

const refundsRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/refunds/:wallet
// ---------------------------------------------------------------------------

refundsRouter.get(
  "/:wallet",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const wallet = req.params.wallet as string;
      const refunds = await getRefundsForWallet(wallet);

      res.json({
        success: true,
        data: refunds,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/refunds/:wallet/eligibility?tokenMint=xxx
// ---------------------------------------------------------------------------

refundsRouter.get(
  "/:wallet/eligibility",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const wallet = req.params.wallet as string;
      const tokenMint = req.query.tokenMint as string | undefined;

      if (!tokenMint) {
        res.status(400).json({
          success: false,
          error: "tokenMint query parameter is required",
        });
        return;
      }

      const result = await checkRefundEligibility(tokenMint, wallet);

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/refunds/:wallet/claim
// ---------------------------------------------------------------------------

refundsRouter.post(
  "/:wallet/claim",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const wallet = req.params.wallet as string;
      const { tokenMint } = req.body as { tokenMint?: string };

      if (!tokenMint) {
        res.status(400).json({
          success: false,
          error: "tokenMint is required in request body",
        });
        return;
      }

      // Check eligibility first
      const eligibility = await checkRefundEligibility(tokenMint, wallet);

      if (!eligibility.eligible) {
        res.status(400).json({
          success: false,
          error: eligibility.reason || "Not eligible for refund",
        });
        return;
      }

      const refund = await requestRefund(tokenMint, wallet, eligibility.amountSol);

      if (!refund) {
        res.status(500).json({
          success: false,
          error: "Failed to create refund record",
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: refund,
      });
    } catch (err) {
      next(err);
    }
  }
);

export { refundsRouter };
