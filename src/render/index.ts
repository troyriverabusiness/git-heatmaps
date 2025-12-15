// Re-exports for render module.

// Heatmap
export { renderHeatmapSvg, type HeatmapInput } from "./heatmap";
export { type HeatmapConfig, defaultHeatmapConfig } from "./heatmap";

// Line chart
export { renderLineChartSvg, type LineChartInput } from "./linechart";
export { type LineChartConfig, defaultLineChartConfig } from "./linechart";

// Shared utilities
export {
  getContributionColor,
  createAdaptiveColorScale,
  getDefaultColorPalette,
} from "./shared";
export {
  type Dimensions,
  type Margin,
  type Point,
  type ColorStop,
} from "./shared";
