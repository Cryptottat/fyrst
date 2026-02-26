import { Router, Request, Response } from "express";

const launchesRouter = Router();

launchesRouter.get("/", (_req: Request, res: Response) => {
  res.json({ message: "TODO: implement GET /api/launches" });
});

export { launchesRouter };
