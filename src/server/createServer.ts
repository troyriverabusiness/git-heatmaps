import express, { type Express } from "express";
import { type Router } from "express";

import { isAppError } from "../utils/appError";

type CreateServerArgs = {
  router: Router;
};

export function createServer({ router }: CreateServerArgs): Express {
  const app = express();

  // TODO: Add request logging (pino/morgan) if/when needed. Keep minimal deps for now.
  app.disable("x-powered-by");

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use(router);

  // Minimal error handler to keep controllers small.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (isAppError(err)) {
      res.status(err.statusCode).json({ error: err.code, message: err.message });
      return;
    }

    res.status(500).json({ error: "internalError", message: "Unexpected error" });
  });

  return app;
}


