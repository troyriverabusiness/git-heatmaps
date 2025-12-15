import express, { type Express, type Request, type Response, type NextFunction } from "express";

import { createHeatmapController, type HeatmapControllerDependencies } from "../api/heatmapController";
import { createHistoryController, type HistoryControllerDependencies } from "../api/historyController";
import { isAppError } from "../utils/appError";

export type ServerDependencies = HeatmapControllerDependencies & HistoryControllerDependencies;

export function createServer(deps: ServerDependencies): Express {
  const app = express();

  app.use(express.json());
  app.use(requestLogger);
  app.disable("x-powered-by");

  const heatmapHandler = createHeatmapController(deps);
  const historyHandler = createHistoryController(deps);

  app.get("/heatmap", asyncHandler(heatmapHandler));
  app.get("/history", asyncHandler(historyHandler));

  app.use(errorHandler);

  return app;
}

export function startServer(app: Express): void {
  const port = Number(process.env.PORT ?? 3000);

  app.listen(port, () => {
    console.log(`[server] listening on :${port}`);
  });
}

function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
}

function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (isAppError(err)) {
    res.status(err.statusCode).json({ error: err.code, message: err.message });
    return;
  }

  console.error("[error]", err);
  res.status(500).json({ error: "internalError", message: "Unexpected error" });
}

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}
