// Utility functions for heatmap data processing.

import type { ContributionDay } from "../../domain/contributions";
import type { Dimensions } from "../shared/svgTypes";
import type { HeatmapConfig } from "./heatmapConfig";

/**
 * Groups contribution days by week for grid layout.
 * Weeks start on Sunday (GitHub convention).
 * Returns weeks with proper alignment - partial first/last weeks are filled to Sunday-Saturday.
 */
export function groupByWeek(days: ContributionDay[]): ContributionDay[][] {
  if (days.length === 0) return [];

  const sorted = [...days].sort(
    (a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime()
  );

  // Use a Map to group days by their week's Sunday date
  const weekMap = new Map<string, ContributionDay[]>();

  for (const day of sorted) {
    const date = new Date(day.dateIso);
    const dayOfWeek = date.getUTCDay(); // 0 = Sunday

    // Calculate the Sunday of this week
    const sundayDate = new Date(date);
    sundayDate.setUTCDate(date.getUTCDate() - dayOfWeek);
    const sundayKey = sundayDate.toISOString().split('T')[0];

    // Add day to the appropriate week
    if (!weekMap.has(sundayKey)) {
      weekMap.set(sundayKey, []);
    }
    weekMap.get(sundayKey)!.push(day);
  }

  // Convert map to sorted array of weeks
  const weeks = Array.from(weekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([_, week]) => week);

  return weeks;
}

/**
 * Calculates SVG dimensions based on data and config.
 */
export function calculateDimensions(
  weeks: ContributionDay[][],
  config: HeatmapConfig
): Dimensions {
  const numWeeks = weeks.length;
  const numDays = 7; // Always 7 rows for days of week

  const width =
    config.margin.left +
    numWeeks * (config.cellSize + config.cellGap) -
    config.cellGap +
    config.margin.right;

  const height =
    config.margin.top +
    numDays * (config.cellSize + config.cellGap) -
    config.cellGap +
    config.margin.bottom;

  return { width, height };
}

/**
 * Formats a date for tooltip display.
 */
export function formatDateForTooltip(dateIso: string): string {
  const date = new Date(dateIso);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Creates tooltip text for a contribution cell.
 */
export function createTooltipText(day: ContributionDay): string {
  const dateStr = formatDateForTooltip(day.dateIso);
  const countText = day.count === 1 ? "1 contribution" : `${day.count} contributions`;
  return `${countText} on ${dateStr}`;
}
