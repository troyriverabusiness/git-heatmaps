import type { HeatmapRequest, HistoryRequest } from "../api/requestParsers";
import type { Cache } from "../cache";
import type { SvgRenderer } from "../render/svgRenderer";
import type { ContributionsSource } from "../sources/contributionsSource";
import type { SvgDocument } from "../domain/svg";
import { notImplemented } from "../utils/appError";

export type ContributionsService = {
  getHeatmapSvg(request: HeatmapRequest): Promise<SvgDocument>;
  getHistorySvg(request: HistoryRequest): Promise<SvgDocument>;
};

type CreateContributionsServiceArgs = {
  cache: Cache;
  svgRenderer: SvgRenderer;
  githubSource: ContributionsSource;
  gitlabSource: ContributionsSource;
};

export function createContributionsService(_args: CreateContributionsServiceArgs): ContributionsService {
  return {
    async getHeatmapSvg(_request) {
      // TODO:
      // - Validate/normalize request (date bounds, supported providers, etc)
      // - Build cache key
      // - Try cache.get
      // - Fetch contributions via selected source
      // - Render SVG via svgRenderer.renderHeatmap
      // - cache.set result
      throw notImplemented("Heatmap generation is not implemented yet.");
    },
    async getHistorySvg(_request) {
      // TODO:
      // - Validate/normalize request
      // - Build cache key
      // - Try cache.get
      // - Fetch history via selected source
      // - Render SVG via svgRenderer.renderHistory
      // - cache.set result
      throw notImplemented("History generation is not implemented yet.");
    }
  };
}


