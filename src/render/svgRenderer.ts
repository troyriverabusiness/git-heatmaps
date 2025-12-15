import type { ContributionData, ContributionHistory } from "../domain/contributions";
import type { SvgDocument } from "../domain/svg";
import { renderHeatmapSvg } from "./heatmapRenderer";
import { renderLineChartSvg } from "./lineChartRenderer";
import type { HeatmapConfig, LineChartConfig } from "./svgTypes";

export type HeatmapRenderOptions = Partial<HeatmapConfig>;

export type HistoryRenderOptions = Partial<LineChartConfig>;

export type SvgRenderer = {
  renderHeatmap(args: { data: ContributionData; options?: HeatmapRenderOptions }): Promise<SvgDocument>;
  renderHistory(args: { history: ContributionHistory; options?: HistoryRenderOptions }): Promise<SvgDocument>;
};

type CreateSvgRendererArgs = {
  // TODO: Allow swapping render engines (pure string templates vs SVG library).
  // TODO: Add default theme configuration.
};

export function createSvgRenderer(_args: CreateSvgRendererArgs = {}): SvgRenderer {
  return {
    async renderHeatmap({ data, options }) {
      const svg = renderHeatmapSvg({
        days: data.days,
        config: options,
      });

      return {
        contentType: "image/svg+xml",
        svg,
      };
    },

    async renderHistory({ history, options }) {
      const svg = renderLineChartSvg({
        points: history.points,
        config: options,
      });

      return {
        contentType: "image/svg+xml",
        svg,
      };
    },
  };
}


