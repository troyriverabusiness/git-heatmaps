import express, { type Express } from "express";
import { type Router } from "express";

import { isAppError } from "../utils/appError";

type CreateServerArgs = {
  router: Router;
};

export function createServer({ router }: CreateServerArgs): Express {
  const app = express();

  app.disable("x-powered-by");

  // Request/response with logging, no middleware yet.
  app.use((req, res, next) => {
    const start = Date.now();
    const { method, url } = req;
    
    console.log(`[request] ${method} ${url}`);
    
    res.on("finish", () => {
      const duration = Date.now() - start;
      console.log(`[response] ${method} ${url} → ${res.statusCode} (${duration}ms)`);
    });
    
    next();
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use(router);

  // Minimal error handler to keep controllers small.
  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (isAppError(err)) {
      console.error(`[error] ${req.method} ${req.url} → ${err.statusCode} ${err.code}: ${err.message}`);
      res.status(err.statusCode).json({ error: err.code, message: err.message });
      return;
    }

    console.error(`[error] ${req.method} ${req.url} → 500 internalError:`, err);
    res.status(500).json({ error: "internalError", message: "Unexpected error" });
  });

  return app;
}


