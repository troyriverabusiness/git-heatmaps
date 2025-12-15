// Renders contribution history as a line chart SVG.

import type { ContributionHistoryPoint } from "../domain/contributions";
import type { LineChartConfig, Point } from "./svgTypes";
import { defaultLineChartConfig } from "./svgTypes";

export type LineChartInput = {
  points: ContributionHistoryPoint[];
  config?: Partial<LineChartConfig>;
};

/**
 * Calculates the drawable area dimensions.
 */
function getDrawableArea(config: LineChartConfig): { width: number; height: number } {
  return {
    width: config.width - config.margin.left - config.margin.right,
    height: config.height - config.margin.top - config.margin.bottom,
  };
}

/**
 * Maps data points to SVG coordinates.
 */
function mapToSvgPoints(
  data: ContributionHistoryPoint[],
  config: LineChartConfig
): Point[] {
  if (data.length === 0) return [];

  const sorted = [...data].sort(
    (a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime()
  );

  const drawable = getDrawableArea(config);
  const maxCount = Math.max(...sorted.map((p) => p.count), 1);

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
function createLinePath(points: Point[]): string {
  if (points.length === 0) return "";

  const [first, ...rest] = points;
  const moveTo = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
  const lineTo = rest.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");

  return `${moveTo} ${lineTo}`;
}

/**
 * Creates a closed path for the fill area under the line.
 */
function createFillPath(points: Point[], config: LineChartConfig): string {
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
 * Renders simple X and Y axes.
 */
function renderAxes(config: LineChartConfig): string {
  const drawable = getDrawableArea(config);
  const left = config.margin.left;
  const top = config.margin.top;
  const bottom = top + drawable.height;
  const right = left + drawable.width;

  // TODO: Add tick marks
  // TODO: Add axis labels
  // TODO: Add grid lines

  return `  <g class="axes" stroke="#e5e7eb" stroke-width="1">
    <line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" />
    <line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" />
  </g>`;
}

/**
 * Renders data points as small circles for interactivity.
 */
function renderDataPoints(
  data: ContributionHistoryPoint[],
  svgPoints: Point[],
  config: LineChartConfig
): string {
  if (svgPoints.length === 0) return "";

  const sorted = [...data].sort(
    (a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime()
  );

  const circles = svgPoints.map((point, index) => {
    const dataPoint = sorted[index];
    const tooltip = `${dataPoint.count} contributions on ${dataPoint.dateIso}`;

    return `    <circle 
      cx="${point.x.toFixed(2)}" 
      cy="${point.y.toFixed(2)}" 
      r="3" 
      fill="${config.strokeColor}"
      data-date="${dataPoint.dateIso}"
      data-count="${dataPoint.count}">
      <title>${tooltip}</title>
    </circle>`;
  });

  return `  <g class="data-points">
${circles.join("\n")}
  </g>`;
}

/**
 * Renders the complete line chart SVG.
 */
export function renderLineChartSvg(input: LineChartInput): string {
  const config: LineChartConfig = { ...defaultLineChartConfig, ...input.config };
  const svgPoints = mapToSvgPoints(input.points, config);

  const linePath = createLinePath(svgPoints);
  const fillPath = createFillPath(svgPoints, config);

  const axes = renderAxes(config);
  const dataPoints = renderDataPoints(input.points, svgPoints, config);

  // TODO: Add hover interactions via CSS/JS
  // TODO: Add responsive viewBox scaling

  return `<svg 
  xmlns="http://www.w3.org/2000/svg" 
  width="${config.width}" 
  height="${config.height}" 
  viewBox="0 0 ${config.width} ${config.height}"
  role="img"
  aria-label="Contribution history chart">
${axes}
  <g class="chart-area">
    <path 
      d="${fillPath}" 
      fill="${config.fillColor}" 
      stroke="none" />
    <path 
      d="${linePath}" 
      fill="none" 
      stroke="${config.strokeColor}" 
      stroke-width="${config.strokeWidth}" 
      stroke-linecap="round" 
      stroke-linejoin="round" />
  </g>
${dataPoints}
</svg>`;
}
