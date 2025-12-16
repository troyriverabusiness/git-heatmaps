// Re-exports for render module.

// Heatmap
export { renderHeatmapSvg, type HeatmapInput } from "./heatmap";
export { type HeatmapConfig, type HeatmapOptions, createHeatmapConfig } from "./heatmap";

// Line chart
export { renderLineChartSvg, type LineChartInput } from "./linechart";
export { type LineChartConfig, defaultLineChartConfig } from "./linechart";

// Shared utilities
export {
  getContributionColor,
  createAdaptiveColorScale,
  getColorPalette,
  getThemeColorStops,
  isValidTheme,
  VALID_THEMES,
  type HeatmapTheme,
} from "./shared";
export {
  type Dimensions,
  type Margin,
  type Point,
  type ColorStop,
} from "./shared";
