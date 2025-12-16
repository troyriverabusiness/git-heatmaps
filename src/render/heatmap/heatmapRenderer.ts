// Main heatmap SVG rendering.

import type { ContributionDay } from "../../domain/contributions";
import { getContributionColor, getThemeColorStops } from "../shared/colorScale";
import type { HeatmapConfig, HeatmapOptions } from "./heatmapConfig";
import { createHeatmapConfig } from "./heatmapConfig";
import { groupByWeek, calculateDimensions, createTooltipText } from "./heatmapUtils";
import { renderMonthLabels, renderDayLabels, renderLegend } from "./heatmapLabels";

export type HeatmapInput = {
  days: ContributionDay[];
  options?: HeatmapOptions;
};

/**
 * Renders a single cell (rect) element.
 */
function renderCell(
  day: ContributionDay,
  x: number,
  y: number,
  config: HeatmapConfig
): string {
  const colorStops = getThemeColorStops(config.theme);
  const color = getContributionColor(day.count, colorStops);
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
  const config: HeatmapConfig = createHeatmapConfig(input.options);
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

  const monthLabels = renderMonthLabels(weeks, config);
  const dayLabels = renderDayLabels(config);
  const legend = renderLegend(dimensions, config);

  return `<svg 
  xmlns="http://www.w3.org/2000/svg" 
  width="${dimensions.width}" 
  height="${dimensions.height}" 
  viewBox="0 0 ${dimensions.width} ${dimensions.height}"
  role="img"
  aria-label="Contribution heatmap">
${monthLabels}
${dayLabels}
  <g class="heatmap-cells">
${cells.join("\n")}
  </g>
${legend}
</svg>`;
}
