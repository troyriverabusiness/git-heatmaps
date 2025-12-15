// Axes, grid lines, and labels for line charts.

import type { ContributionHistoryPoint } from "../../domain/contributions";
import type { LineChartConfig } from "./linechartConfig";
import { getDrawableArea, getMaxCount, generateYTicks, generateXTicks } from "./linechartUtils";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Renders horizontal grid lines.
 */
export function renderGridLines(
  data: ContributionHistoryPoint[],
  config: LineChartConfig
): string {
  if (!config.showGridLines) return "";

  const drawable = getDrawableArea(config);
  const maxCount = getMaxCount(data);
  const yTicks = generateYTicks(maxCount, config.tickCount);
  const actualMax = yTicks[yTicks.length - 1];

  const lines: string[] = [];
  const left = config.margin.left;
  const right = left + drawable.width;

  for (const tick of yTicks) {
    const y = config.margin.top + drawable.height - (tick / actualMax) * drawable.height;
    lines.push(
      `    <line x1="${left}" y1="${y.toFixed(2)}" x2="${right}" y2="${y.toFixed(2)}" stroke="${config.gridColor}" stroke-width="1" stroke-dasharray="4,4" />`
    );
  }

  return `  <g class="grid-lines">\n${lines.join("\n")}\n  </g>`;
}

/**
 * Renders X and Y axes with tick marks.
 */
export function renderAxes(
  data: ContributionHistoryPoint[],
  config: LineChartConfig
): string {
  const drawable = getDrawableArea(config);
  const left = config.margin.left;
  const top = config.margin.top;
  const bottom = top + drawable.height;
  const right = left + drawable.width;

  const elements: string[] = [];

  // Main axis lines
  elements.push(
    `    <line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="${config.axisColor}" stroke-width="1" />`
  );
  elements.push(
    `    <line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="${config.axisColor}" stroke-width="1" />`
  );

  // Y-axis tick marks
  if (config.showTickMarks) {
    const maxCount = getMaxCount(data);
    const yTicks = generateYTicks(maxCount, config.tickCount);
    const actualMax = yTicks[yTicks.length - 1];

    for (const tick of yTicks) {
      const y = config.margin.top + drawable.height - (tick / actualMax) * drawable.height;
      elements.push(
        `    <line x1="${left - 4}" y1="${y.toFixed(2)}" x2="${left}" y2="${y.toFixed(2)}" stroke="${config.axisColor}" stroke-width="1" />`
      );
    }

    // X-axis tick marks (at month boundaries)
    const xTicks = generateXTicks(data, config);
    for (const tick of xTicks) {
      elements.push(
        `    <line x1="${tick.x.toFixed(2)}" y1="${bottom}" x2="${tick.x.toFixed(2)}" y2="${bottom + 4}" stroke="${config.axisColor}" stroke-width="1" />`
      );
    }
  }

  return `  <g class="axes">\n${elements.join("\n")}\n  </g>`;
}

/**
 * Renders axis labels (values on Y, dates on X).
 */
export function renderAxisLabels(
  data: ContributionHistoryPoint[],
  config: LineChartConfig
): string {
  if (!config.showAxisLabels) return "";

  const drawable = getDrawableArea(config);
  const labels: string[] = [];

  // Y-axis labels
  const maxCount = getMaxCount(data);
  const yTicks = generateYTicks(maxCount, config.tickCount);
  const actualMax = yTicks[yTicks.length - 1];

  for (const tick of yTicks) {
    const y = config.margin.top + drawable.height - (tick / actualMax) * drawable.height;
    labels.push(
      `    <text x="${config.margin.left - 8}" y="${y.toFixed(2)}" dy="0.35em" font-size="${config.fontSize}" font-family="${config.fontFamily}" fill="${config.labelColor}" text-anchor="end">${tick}</text>`
    );
  }

  // X-axis labels (month names)
  const xTicks = generateXTicks(data, config);
  const bottom = config.margin.top + drawable.height;

  for (const tick of xTicks) {
    const monthLabel = MONTH_LABELS[tick.date.getUTCMonth()];
    labels.push(
      `    <text x="${tick.x.toFixed(2)}" y="${bottom + 16}" font-size="${config.fontSize}" font-family="${config.fontFamily}" fill="${config.labelColor}" text-anchor="middle">${monthLabel}</text>`
    );
  }

  return `  <g class="axis-labels">\n${labels.join("\n")}\n  </g>`;
}
