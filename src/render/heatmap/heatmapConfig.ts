// Configuration types and defaults for heatmap rendering.

import type { Margin } from "../shared/svgTypes";

export type HeatmapConfig = {
  cellSize: number;
  cellGap: number;
  margin: Margin;
  cornerRadius: number;
  showMonthLabels: boolean;
  showDayLabels: boolean;
  showLegend: boolean;
  fontSize: number;
  fontFamily: string;
  labelColor: string;
};

export const defaultHeatmapConfig: HeatmapConfig = {
  cellSize: 11,
  cellGap: 3,
  margin: { top: 20, right: 20, bottom: 30, left: 40 },
  cornerRadius: 2,
  showMonthLabels: true,
  showDayLabels: true,
  showLegend: true,
  fontSize: 10,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  labelColor: "#57606a",
};
