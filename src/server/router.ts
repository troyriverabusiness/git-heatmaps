import express, { type Router } from "express";

import { type HeatmapController } from "../api/heatmapController";
import { type HistoryController } from "../api/historyController";

type CreateRouterArgs = {
  heatmapController: HeatmapController;
  historyController: HistoryController;
};

export function createRouter({ heatmapController, historyController }: CreateRouterArgs): Router {
  const router = express.Router();

  router.get("/heatmap", heatmapController.getHeatmap);
  router.get("/history", historyController.getHistory);

  return router;
}


