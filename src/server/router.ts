import express, { type Router, type Request, type Response, type NextFunction } from "express";

export type RequestHandler = (req: Request, res: Response) => Promise<void>;

// Router currently contains only 2 controllers
type CreateRouterArgs = {
  heatmapController: RequestHandler;
  historyController: RequestHandler;
};

function asyncHandler(
  fn: RequestHandler
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

export function createRouter({ heatmapController, historyController }: CreateRouterArgs): Router {
  const router = express.Router();

  router.get("/heatmap", asyncHandler(heatmapController));
  router.get("/history", asyncHandler(historyController));

  return router;
}


