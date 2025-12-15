import type { RequestHandler } from "express";

import type { ContributionsService } from "../services/contributionsService";
import { asyncHandler } from "../utils/asyncHandler";
import { parseHeatmapRequest } from "./requestParsers";

export type HeatmapController = {
  getHeatmap: RequestHandler;
};

type CreateHeatmapControllerArgs = {
  contributionsService: ContributionsService;
};

export function createHeatmapController({ contributionsService }: CreateHeatmapControllerArgs): HeatmapController {
  return {
    getHeatmap: asyncHandler(async (req, res) => {
      const parsed = parseHeatmapRequest(req);
      const doc = await contributionsService.getHeatmapSvg(parsed);
      res.status(200).type(doc.contentType).send(doc.svg);
    })
  };
}


