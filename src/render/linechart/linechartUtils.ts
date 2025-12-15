// Utility functions for line chart data processing.

import type { ContributionHistoryPoint } from "../../domain/contributions";
import type { Point } from "../shared/svgTypes";
import type { LineChartConfig } from "./linechartConfig";

/**
 * Calculates the drawable area dimensions.
 */
export function getDrawableArea(config: LineChartConfig): { width: number; height: number } {
  return {
    width: config.width - config.margin.left - config.margin.right,
    height: config.height - config.margin.top - config.margin.bottom,
  };
}

/**
 * Calculates the max contribution count from data.
 */
export function getMaxCount(data: ContributionHistoryPoint[]): number {
  return Math.max(...data.map((p) => p.count), 1);
}

/**
 * Maps data points to SVG coordinates.
 */
export function mapToSvgPoints(
  data: ContributionHistoryPoint[],
  config: LineChartConfig
): Point[] {
  if (data.length === 0) return [];

  const sorted = [...data].sort(
    (a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime()
  );

  const drawable = getDrawableArea(config);
  const maxCount = getMaxCount(sorted);

  const minTime = new Date(sorted[0].dateIso).getTime();
  const maxTime = new Date(sorted[sorted.length - 1].dateIso).getTime();
  const timeRange = maxTime - minTime || 1; // Avoid division by zero

  return sorted.map((point) => {
    const time = new Date(point.dateIso).getTime();
    const x = config.margin.left + ((time - minTime) / timeRange) * drawable.width;
    const y =
      config.margin.top + drawable.height - (point.count / maxCount) * drawable.height;

    return { x, y };
  });
}

/**
 * Creates an SVG path string from points.
 */
export function createLinePath(points: Point[]): string {
  if (points.length === 0) return "";

  const [first, ...rest] = points;
  const moveTo = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
  const lineTo = rest.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");

  return `${moveTo} ${lineTo}`;
}

/**
 * Creates a closed path for the fill area under the line.
 */
export function createFillPath(points: Point[], config: LineChartConfig): string {
  if (points.length === 0) return "";

  const drawable = getDrawableArea(config);
  const baseline = config.margin.top + drawable.height;

  const first = points[0];
  const last = points[points.length - 1];

  const linePath = createLinePath(points);
  const closePath = `L ${last.x.toFixed(2)} ${baseline} L ${first.x.toFixed(2)} ${baseline} Z`;

  return `${linePath} ${closePath}`;
}

/**
 * Generates nice tick values for the Y axis.
 */
export function generateYTicks(maxValue: number, tickCount: number): number[] {
  if (maxValue <= 0) return [0];

  // Find a nice step value
  const roughStep = maxValue / (tickCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / magnitude;

  let niceStep: number;
  if (residual <= 1.5) niceStep = magnitude;
  else if (residual <= 3) niceStep = 2 * magnitude;
  else if (residual <= 7) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  const ticks: number[] = [];
  for (let i = 0; i <= maxValue; i += niceStep) {
    ticks.push(i);
  }
  
  // Ensure we have the max value or close to it
  if (ticks[ticks.length - 1] < maxValue) {
    ticks.push(ticks[ticks.length - 1] + niceStep);
  }

  return ticks;
}

/**
 * Generates date ticks for the X axis.
 */
export function generateXTicks(
  data: ContributionHistoryPoint[],
  config: LineChartConfig
): { date: Date; x: number }[] {
  if (data.length === 0) return [];

  const sorted = [...data].sort(
    (a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime()
  );

  const drawable = getDrawableArea(config);
  const minTime = new Date(sorted[0].dateIso).getTime();
  const maxTime = new Date(sorted[sorted.length - 1].dateIso).getTime();
  const timeRange = maxTime - minTime || 1;

  // Find month boundaries within the data range
  const ticks: { date: Date; x: number }[] = [];
  const startDate = new Date(sorted[0].dateIso);
  const endDate = new Date(sorted[sorted.length - 1].dateIso);

  // Start from the first day of the month after start date
  const current = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 1));

  while (current <= endDate) {
    const time = current.getTime();
    const x = config.margin.left + ((time - minTime) / timeRange) * drawable.width;
    ticks.push({ date: new Date(current), x });
    current.setUTCMonth(current.getUTCMonth() + 1);
  }

  return ticks;
}
