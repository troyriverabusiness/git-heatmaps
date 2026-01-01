// Re-exports for shared render utilities.

export {
  type Dimensions,
  type Margin,
  type Point,
  type ColorStop,
} from "./svgTypes";

export {
  getContributionColor,
  getDefaultThemeColor,
  getContributionSource,
  createAdaptiveColorScale,
  getColorPalette,
  getDefaultThemePalettes,
  getThemeColorStops,
  isValidTheme,
  VALID_THEMES,
  DEFAULT_THEME_PALETTES,
  type HeatmapTheme,
  type ContributionSource,
} from "./colorScale";
