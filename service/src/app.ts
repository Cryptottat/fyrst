import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import { router } from "./routes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(helmet());
app.use(morgan("dev"));
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: "10mb" }));

app.use("/", router);
app.use(errorHandler);

export { app };
