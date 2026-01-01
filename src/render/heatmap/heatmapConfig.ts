// Configuration types and defaults for heatmap rendering.

import type { Margin } from "../shared/svgTypes";
import type { HeatmapTheme } from "../shared/colorScale";

// User-configurable options
export type HeatmapOptions = {
  showMonthLabels?: boolean;
  showDayLabels?: boolean;
  showLegend?: boolean;
  labelColor?: string;
  theme?: HeatmapTheme;
};

// Internal full config with all values resolved
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
  theme: HeatmapTheme;
};

const defaultValues = {
  cellSize: 11,
  cellGap: 3,
  margin: { top: 20, right: 20, bottom: 30, left: 40 },
  cornerRadius: 2,
  fontSize: 10,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
} as const;

const defaultOptions: Required<HeatmapOptions> = {
  showMonthLabels: true,
  showDayLabels: true,
  showLegend: true,
  labelColor: "#57606a",
  theme: "default",
};

export function createHeatmapConfig(options: HeatmapOptions = {}): HeatmapConfig {
  return {
    ...defaultValues,
    ...defaultOptions,
    ...options,
  };
}
