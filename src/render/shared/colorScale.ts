// Color scale logic for contribution heatmaps with theme support.

import type { ColorStop } from "./svgTypes";
import type { ContributionDay } from "../../domain/contributions";

// Theme definitions
export type HeatmapTheme = "default" | "github" | "gitlab" | "ice" | "fire" | "candy" | "rainbow" | "neon";

export const VALID_THEMES: HeatmapTheme[] = ["default", "github", "gitlab", "ice", "fire", "candy", "rainbow", "neon"];

// "default" theme palettes - uses different colors based on contribution source
export const DEFAULT_THEME_PALETTES = {
  /** GitHub-only contributions: green shades */
  github: [
    { threshold: 0, color: "#ebedf0" },
    { threshold: 1, color: "#9be9a8" },
    { threshold: 4, color: "#40c463" },
    { threshold: 8, color: "#30a14e" },
    { threshold: 12, color: "#216e39" },
  ],
  /** GitLab-only contributions: orange shades */
  gitlab: [
    { threshold: 0, color: "#ebedf0" },
    { threshold: 1, color: "#fcd9b6" },
    { threshold: 4, color: "#faaa61" },
    { threshold: 8, color: "#e57435" },
    { threshold: 12, color: "#C24E00" },
  ],
  /** Mixed contributions (both platforms): pink shades */
  mixed: [
    { threshold: 0, color: "#ebedf0" },
    { threshold: 1, color: "#f8bbd9" },
    { threshold: 4, color: "#f06292" },
    { threshold: 8, color: "#e91e8b" },
    { threshold: 12, color: "#ad1457" },
  ],
} as const;

// Theme color palettes
const themePalettes: Record<HeatmapTheme, ColorStop[]> = {
  // "default" uses GitHub palette as base; actual coloring is handled by getDefaultThemeColor
  default: [
    { threshold: 0, color: "#ebedf0" },
    { threshold: 1, color: "#9be9a8" },
    { threshold: 4, color: "#40c463" },
    { threshold: 8, color: "#30a14e" },
    { threshold: 12, color: "#216e39" },
  ],
  github: [
    { threshold: 0, color: "#ebedf0" },
    { threshold: 1, color: "#9be9a8" },
    { threshold: 4, color: "#40c463" },
    { threshold: 8, color: "#30a14e" },
    { threshold: 12, color: "#216e39" },
  ],
  gitlab: [
    { threshold: 0, color: "#ededed" },
    { threshold: 1, color: "#fcd9b6" },
    { threshold: 4, color: "#faaa61" },
    { threshold: 8, color: "#e57435" },
    { threshold: 12, color: "#C24E00" },
  ],
  ice: [
    { threshold: 0, color: "#f0f4f8" },
    { threshold: 1, color: "#b8d4e8" },
    { threshold: 4, color: "#7ab8db" },
    { threshold: 8, color: "#3d9dd0" },
    { threshold: 12, color: "#1a6fa8" },
  ],
  fire: [
    { threshold: 0, color: "#f5f5f5" },
    { threshold: 1, color: "#ffeb3b" },
    { threshold: 4, color: "#ff9800" },
    { threshold: 8, color: "#ff5722" },
    { threshold: 12, color: "#DD0606" },
  ],
  candy: [
    { threshold: 0, color: "#D2F3F8" },
    { threshold: 1, color: "#D992E3" },
    { threshold: 4, color: "#E87BD1" },
    { threshold: 8, color: "#BB52DE" },
    { threshold: 12, color: "#631B9B" },
  ],
  rainbow: [
    { threshold: 0, color: "#C4FDCD" },
    { threshold: 1, color: "#feca57" },
    { threshold: 4, color: "#ff6b6b" },
    { threshold: 8, color: "#9b59b6" },
    { threshold: 12, color: "#1821D4" },
  ],
  neon: [
    { threshold: 0, color: "#1a1a2e" },
    { threshold: 1, color: "#16213e" },
    { threshold: 4, color: "#103654" },
    { threshold: 8, color: "#00ff88" },
    { threshold: 12, color: "#00ffff" },
  ],
};

/**
 * Returns the color stops for a given theme.
 */
export function getThemeColorStops(theme: HeatmapTheme = "github"): ColorStop[] {
  return themePalettes[theme] || themePalettes.github;
}

/**
 * Validates if a string is a valid theme name.
 */
export function isValidTheme(theme: string): theme is HeatmapTheme {
  return VALID_THEMES.includes(theme as HeatmapTheme);
}

/**
 * Returns the appropriate color for a given contribution count.
 * Uses GitHub-like color scale by default.
 */
export function getContributionColor(count: number, stops: ColorStop[] = themePalettes.github): string {
  // Find the highest threshold that the count meets or exceeds
  let color = stops[0].color;
  
  for (const stop of stops) {
    if (count >= stop.threshold) {
      color = stop.color;
    } else {
      break;
    }
  }
  
  return color;
}

/**
 * Determines the contribution source type for a day.
 */
export type ContributionSource = "none" | "github" | "gitlab" | "mixed";

/**
 * Gets the contribution source based on platform-specific counts.
 */
export function getContributionSource(day: ContributionDay): ContributionSource {
  const hasGithub = (day.github ?? 0) > 0;
  const hasGitlab = (day.gitlab ?? 0) > 0;

  if (hasGithub && hasGitlab) return "mixed";
  if (hasGithub) return "github";
  if (hasGitlab) return "gitlab";
  return "none";
}

/**
 * Returns the color for the "default" theme based on contribution source.
 * - GitHub-only: green shades
 * - GitLab-only: orange shades
 * - Mixed (both platforms): pink shades
 */
export function getDefaultThemeColor(day: ContributionDay): string {
  const source = getContributionSource(day);
  
  if (source === "none") {
    return DEFAULT_THEME_PALETTES.github[0].color; // Empty day color
  }

  const palette = source === "mixed" 
    ? DEFAULT_THEME_PALETTES.mixed 
    : DEFAULT_THEME_PALETTES[source];
  
  return getContributionColor(day.count, [...palette]);
}

/**
 * Creates a custom color scale based on the max contribution count.
 * Distributes thresholds evenly across the range.
 */
export function createAdaptiveColorScale(maxCount: number, theme: HeatmapTheme = "github"): ColorStop[] {
  const themeStops = getThemeColorStops(theme);
  
  if (maxCount <= 0) {
    return [{ threshold: 0, color: themeStops[0].color }];
  }

  const colors = themeStops.map(stop => stop.color);
  const step = maxCount / (colors.length - 1);

  return colors.map((color, index) => ({
    threshold: Math.floor(index * step),
    color,
  }));
}

/**
 * Returns the color palette for a given theme for legend display.
 */
export function getColorPalette(theme: HeatmapTheme = "github"): string[] {
  return getThemeColorStops(theme).map(stop => stop.color);
}

/**
 * Returns all three color palettes for the "default" theme legend.
 * Used to display a multi-row legend showing GitHub/GitLab/Mixed colors.
 */
export function getDefaultThemePalettes(): { 
  github: string[]; 
  gitlab: string[]; 
  mixed: string[]; 
} {
  return {
    github: DEFAULT_THEME_PALETTES.github.map(stop => stop.color),
    gitlab: DEFAULT_THEME_PALETTES.gitlab.map(stop => stop.color),
    mixed: DEFAULT_THEME_PALETTES.mixed.map(stop => stop.color),
  };
}
