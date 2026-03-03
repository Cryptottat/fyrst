import { Router, Request, Response, NextFunction } from "express";
import { prisma, dbConnected } from "../lib/prisma";
import nacl from "tweetnacl";
import bs58 from "bs58";

const commentsRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/comments/:mint — list comments for a token
// ---------------------------------------------------------------------------

commentsRouter.get(
  "/:mint",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mint = req.params.mint as string;

      if (!dbConnected()) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const comments = await prisma.comment.findMany({
        where: { tokenMint: mint },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      const mapped = comments.map((c) => ({
        id: c.id,
        tokenMint: c.tokenMint,
        walletAddress: c.walletAddress,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
      }));

      res.json({ success: true, data: mapped });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/comments — create a comment (wallet-signed)
// ---------------------------------------------------------------------------

commentsRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tokenMint, walletAddress, content, signature } = req.body as {
        tokenMint: string;
        walletAddress: string;
        content: string;
        signature: string;
      };

      if (!tokenMint || !walletAddress || !content || !signature) {
        res.status(400).json({ success: false, error: "Missing required fields" });
        return;
      }

      if (content.length > 500) {
        res.status(400).json({ success: false, error: "Comment too long (max 500 chars)" });
        return;
      }

      if (!dbConnected()) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      // Verify wallet signature
      const message = `FYRST comment on ${tokenMint}: ${content}`;
      const messageBytes = new TextEncoder().encode(message);

      let verified = false;
      try {
        const signatureBytes = bs58.decode(signature);
        const publicKeyBytes = bs58.decode(walletAddress);
        verified = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
      } catch {
        verified = false;
      }

      if (!verified) {
        res.status(401).json({ success: false, error: "Invalid wallet signature" });
        return;
      }

      const comment = await prisma.comment.create({
        data: {
          tokenMint,
          walletAddress,
          content,
          signature,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          id: comment.id,
          tokenMint: comment.tokenMint,
          walletAddress: comment.walletAddress,
          content: comment.content,
          createdAt: comment.createdAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export { commentsRouter };
