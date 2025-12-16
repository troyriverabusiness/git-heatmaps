// Re-exports for shared render utilities.

export {
  type Dimensions,
  type Margin,
  type Point,
  type ColorStop,
} from "./svgTypes";

export {
  getContributionColor,
  createAdaptiveColorScale,
  getColorPalette,
  getThemeColorStops,
  isValidTheme,
  VALID_THEMES,
  type HeatmapTheme,
} from "./colorScale";
