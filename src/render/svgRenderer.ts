import type { ContributionData, ContributionHistory } from "../domain/contributions";
import type { SvgDocument } from "../domain/svg";
import { notImplemented } from "../utils/appError";

export type HeatmapRenderOptions = {
  // TODO: Add theme, cell size, margins, labels, etc.
};

export type HistoryRenderOptions = {
  // TODO: Add chart size, padding, line style, axes, etc.
};

export type SvgRenderer = {
  renderHeatmap(args: { data: ContributionData; options?: HeatmapRenderOptions }): Promise<SvgDocument>;
  renderHistory(args: { history: ContributionHistory; options?: HistoryRenderOptions }): Promise<SvgDocument>;
};

type CreateSvgRendererArgs = {
  // TODO: Allow swapping render engines (pure string templates vs SVG library).
};

export function createSvgRenderer(_args: CreateSvgRendererArgs = {}): SvgRenderer {
  return {
    async renderHeatmap() {
      // TODO: Implement SVG heatmap rendering.
      throw notImplemented("SVG heatmap rendering is not implemented yet.");
    },
    async renderHistory() {
      // TODO: Implement SVG line chart rendering.
      throw notImplemented("SVG history rendering is not implemented yet.");
    }
  };
}


