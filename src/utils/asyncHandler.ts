import type { RequestHandler } from "express";

// Express v4 doesn't automatically forward async errors. This wrapper keeps controllers clean.
export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}


