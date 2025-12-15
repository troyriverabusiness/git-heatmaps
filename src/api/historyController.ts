import type { RequestHandler } from "express";

import type { ContributionsService } from "../services/contributionsService";
import { asyncHandler } from "../utils/asyncHandler";
import { parseHistoryRequest } from "./requestParsers";

export type HistoryController = {
  getHistory: RequestHandler;
};

type CreateHistoryControllerArgs = {
  contributionsService: ContributionsService;
};

export function createHistoryController({ contributionsService }: CreateHistoryControllerArgs): HistoryController {
  return {
    getHistory: asyncHandler(async (req, res) => {
      const parsed = parseHistoryRequest(req);
      const doc = await contributionsService.getHistorySvg(parsed);
      res.status(200).type(doc.contentType).send(doc.svg);
    })
  };
}


