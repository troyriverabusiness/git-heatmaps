// Label and legend rendering for heatmaps.

import type { ContributionDay } from "../../domain/contributions";
import type { Dimensions } from "../shared/svgTypes";
import { getDefaultColorPalette } from "../shared/colorScale";
import type { HeatmapConfig } from "./heatmapConfig";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Renders month labels at the top of the heatmap.
 */
export function renderMonthLabels(
  weeks: ContributionDay[][],
  config: HeatmapConfig
): string {
  if (!config.showMonthLabels || weeks.length === 0) return "";

  const labels: string[] = [];
  let lastMonth = -1;

  weeks.forEach((week, weekIndex) => {
    if (week.length === 0) return;

    // Use the first day of the week to determine month
    const firstDay = week[0];
    const date = new Date(firstDay.dateIso);
    const month = date.getUTCMonth();

    // Only render label when month changes
    if (month !== lastMonth) {
      const x = config.margin.left + weekIndex * (config.cellSize + config.cellGap);
      const y = config.margin.top - 6;

      labels.push(
        `    <text x="${x}" y="${y}" font-size="${config.fontSize}" font-family="${config.fontFamily}" fill="${config.labelColor}">${MONTH_LABELS[month]}</text>`
      );
      lastMonth = month;
    }
  });

  return `  <g class="month-labels">\n${labels.join("\n")}\n  </g>`;
}

/**
 * Renders day-of-week labels on the left side (Mon, Wed, Fri).
 */
export function renderDayLabels(config: HeatmapConfig): string {
  if (!config.showDayLabels) return "";

  // Only show Mon, Wed, Fri to avoid crowding
  const daysToShow = [1, 3, 5]; // Mon, Wed, Fri
  const labels: string[] = [];

  for (const dayIndex of daysToShow) {
    const y = config.margin.top + dayIndex * (config.cellSize + config.cellGap) + config.cellSize / 2 + 3;
    const x = config.margin.left - 8;

    labels.push(
      `    <text x="${x}" y="${y}" font-size="${config.fontSize}" font-family="${config.fontFamily}" fill="${config.labelColor}" text-anchor="end">${DAY_LABELS[dayIndex]}</text>`
    );
  }

  return `  <g class="day-labels">\n${labels.join("\n")}\n  </g>`;
}

/**
 * Renders the color legend at the bottom of the heatmap.
 */
export function renderLegend(
  dimensions: Dimensions,
  config: HeatmapConfig
): string {
  if (!config.showLegend) return "";

  const colors = getDefaultColorPalette();
  const legendCellSize = config.cellSize;
  const legendGap = 3;
  const legendWidth = colors.length * (legendCellSize + legendGap) - legendGap;

  // Position legend at bottom right
  const startX = dimensions.width - config.margin.right - legendWidth - 40;
  const y = dimensions.height - config.margin.bottom + 12;

  const cells: string[] = [];

  // "Less" label
  cells.push(
    `    <text x="${startX - 6}" y="${y + legendCellSize / 2 + 3}" font-size="${config.fontSize}" font-family="${config.fontFamily}" fill="${config.labelColor}" text-anchor="end">Less</text>`
  );

  // Color cells
  colors.forEach((color, index) => {
    const x = startX + index * (legendCellSize + legendGap);
    cells.push(
      `    <rect x="${x}" y="${y}" width="${legendCellSize}" height="${legendCellSize}" rx="${config.cornerRadius}" fill="${color}" />`
    );
  });

  // "More" label
  const moreX = startX + legendWidth + 6;
  cells.push(
    `    <text x="${moreX}" y="${y + legendCellSize / 2 + 3}" font-size="${config.fontSize}" font-family="${config.fontFamily}" fill="${config.labelColor}">More</text>`
  );

  return `  <g class="legend">\n${cells.join("\n")}\n  </g>`;
}
