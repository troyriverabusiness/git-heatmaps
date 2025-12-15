// Re-exports for render module.

export { renderHeatmapSvg, type HeatmapInput } from "./heatmapRenderer";
export { renderLineChartSvg, type LineChartInput } from "./lineChartRenderer";
export {
  getContributionColor,
  createAdaptiveColorScale,
  getDefaultColorPalette,
} from "./colorScale";
export {
  type Dimensions,
  type Margin,
  type Point,
  type ColorStop,
  type HeatmapConfig,
  type LineChartConfig,
  defaultHeatmapConfig,
  defaultLineChartConfig,
} from "./svgTypes";
