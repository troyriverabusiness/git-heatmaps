import express, { type Express, type Request } from "express";
import { type Router } from "express";

import { isAppError } from "../utils/appError";

import rateLimit from 'express-rate-limit';

/**
 * Generates a rate limit key based on token instead of IP.
 *
 * This is critical because SVGs embedded in GitHub READMEs are fetched by GitHub's servers,
 * so all requests appear to come from the same IP (GitHub's CDN).
 * Instead, we rate limit by token to prevent individual users from abusing the service.
 */
function getRateLimitKey(req: Request): string {
  const githubToken = (req.query.githubtoken as string) || '';
  const gitlabToken = (req.query.gitlabtoken as string) || '';

  // If no token provided, fall back to IP (for health check, etc.)
  if (!githubToken && !gitlabToken) {
    return req.ip || 'unknown';
  }

  // Use hash of tokens as key (for privacy in logs)
  // Simple hash: first 8 chars of token (enough for rate limiting)
  const key = githubToken ? githubToken.substring(0, 8) : gitlabToken.substring(0, 8);
  return `token:${key}`;
}

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 requests per token per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getRateLimitKey,
  skip: (req) => req.path === '/health',
});

type CreateServerArgs = {
  router: Router;
};

export function createServer({ router }: CreateServerArgs): Express {
  const app = express();

  app.disable("x-powered-by");

  app.use(limiter);

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


