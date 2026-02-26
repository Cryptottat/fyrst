import { Router, Request, Response } from "express";

const tradeRouter = Router();

tradeRouter.get("/", (_req: Request, res: Response) => {
  res.json({ message: "TODO: implement GET /api/trade" });
});

export { tradeRouter };
