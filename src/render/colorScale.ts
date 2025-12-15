// GitHub-like color scale logic for contribution heatmaps.

import type { ColorStop } from "./svgTypes";

// GitHub's contribution colors (light theme)
// TODO: Add dark theme color palette
const githubColorStops: ColorStop[] = [
  { threshold: 0, color: "#ebedf0" },   // no contributions
  { threshold: 1, color: "#9be9a8" },   // low
  { threshold: 4, color: "#40c463" },   // medium-low
  { threshold: 8, color: "#30a14e" },   // medium-high
  { threshold: 12, color: "#216e39" },  // high
];

/**
 * Returns the appropriate color for a given contribution count.
 * Uses GitHub-like color scale by default.
 */
export function getContributionColor(count: number, stops: ColorStop[] = githubColorStops): string {
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
 * Creates a custom color scale based on the max contribution count.
 * Distributes thresholds evenly across the range.
 */
export function createAdaptiveColorScale(maxCount: number): ColorStop[] {
  if (maxCount <= 0) {
    return [{ threshold: 0, color: "#ebedf0" }];
  }

  const colors = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
  const step = maxCount / (colors.length - 1);

  return colors.map((color, index) => ({
    threshold: Math.floor(index * step),
    color,
  }));
}

/**
 * Returns the default GitHub color palette for legend display.
 */
export function getDefaultColorPalette(): string[] {
  return githubColorStops.map(stop => stop.color);
}
