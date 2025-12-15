// Renders contribution heatmap as SVG.

import type { ContributionDay } from "../domain/contributions";
import type { HeatmapConfig, Dimensions } from "./svgTypes";
import { defaultHeatmapConfig } from "./svgTypes";
import { getContributionColor } from "./colorScale";

export type HeatmapInput = {
  days: ContributionDay[];
  config?: Partial<HeatmapConfig>;
};

/**
 * Groups contribution days by week for grid layout.
 * Weeks start on Sunday (GitHub convention).
 */
function groupByWeek(days: ContributionDay[]): ContributionDay[][] {
  if (days.length === 0) return [];

  const sorted = [...days].sort(
    (a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime()
  );

  const weeks: ContributionDay[][] = [];
  let currentWeek: ContributionDay[] = [];

  for (const day of sorted) {
    const date = new Date(day.dateIso);
    const dayOfWeek = date.getUTCDay(); // 0 = Sunday

    // Start new week on Sunday
    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    currentWeek.push(day);
  }

  // Push the last week if not empty
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
}

/**
 * Calculates SVG dimensions based on data and config.
 */
function calculateDimensions(
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
function formatDateForTooltip(dateIso: string): string {
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
function createTooltipText(day: ContributionDay): string {
  const dateStr = formatDateForTooltip(day.dateIso);
  const countText = day.count === 1 ? "1 contribution" : `${day.count} contributions`;
  return `${countText} on ${dateStr}`;
}

/**
 * Renders a single cell (rect) element.
 */
function renderCell(
  day: ContributionDay,
  x: number,
  y: number,
  config: HeatmapConfig
): string {
  const color = getContributionColor(day.count);
  const tooltip = createTooltipText(day);

  return `    <rect 
      x="${x}" 
      y="${y}" 
      width="${config.cellSize}" 
      height="${config.cellSize}" 
      rx="${config.cornerRadius}" 
      fill="${color}"
      data-date="${day.dateIso}"
      data-count="${day.count}">
      <title>${tooltip}</title>
    </rect>`;
}

/**
 * Renders the complete heatmap SVG.
 */
export function renderHeatmapSvg(input: HeatmapInput): string {
  const config: HeatmapConfig = { ...defaultHeatmapConfig, ...input.config };
  const weeks = groupByWeek(input.days);
  const dimensions = calculateDimensions(weeks, config);

  const cells: string[] = [];

  weeks.forEach((week, weekIndex) => {
    week.forEach((day) => {
      const date = new Date(day.dateIso);
      const dayOfWeek = date.getUTCDay();

      const x =
        config.margin.left + weekIndex * (config.cellSize + config.cellGap);
      const y =
        config.margin.top + dayOfWeek * (config.cellSize + config.cellGap);

      cells.push(renderCell(day, x, y, config));
    });
  });

  // TODO: Add month labels at top
  // TODO: Add day-of-week labels on left (Mon, Wed, Fri)
  // TODO: Add color legend at bottom

  return `<svg 
  xmlns="http://www.w3.org/2000/svg" 
  width="${dimensions.width}" 
  height="${dimensions.height}" 
  viewBox="0 0 ${dimensions.width} ${dimensions.height}"
  role="img"
  aria-label="Contribution heatmap">
  <g class="heatmap-cells">
${cells.join("\n")}
  </g>
</svg>`;
}
