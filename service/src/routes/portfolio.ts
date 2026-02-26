import { Router, Request, Response } from "express";

const portfolioRouter = Router();

portfolioRouter.get("/", (_req: Request, res: Response) => {
  res.json({ message: "TODO: implement GET /api/portfolio" });
});

export { portfolioRouter };
