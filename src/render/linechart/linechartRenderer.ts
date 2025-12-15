// Main line chart SVG rendering.

import type { ContributionHistoryPoint } from "../../domain/contributions";
import type { Point } from "../shared/svgTypes";
import type { LineChartConfig } from "./linechartConfig";
import { defaultLineChartConfig } from "./linechartConfig";
import { mapToSvgPoints, createLinePath, createFillPath } from "./linechartUtils";
import { renderGridLines, renderAxes, renderAxisLabels } from "./linechartAxes";

export type LineChartInput = {
  points: ContributionHistoryPoint[];
  config?: Partial<LineChartConfig>;
};

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
      class="data-point"
      data-date="${dataPoint.dateIso}"
      data-count="${dataPoint.count}">
      <title>${tooltip}</title>
    </circle>`;
  });

  return `  <g class="data-points">\n${circles.join("\n")}\n  </g>`;
}

/**
 * Renders CSS styles for hover interactions.
 */
function renderStyles(config: LineChartConfig): string {
  return `  <style>
    .data-point {
      transition: r 0.15s ease-in-out, opacity 0.15s ease-in-out;
      cursor: pointer;
    }
    .data-point:hover {
      r: 5;
      opacity: 0.8;
    }
    .chart-line {
      transition: stroke-width 0.15s ease-in-out;
    }
    .chart-area:hover .chart-line {
      stroke-width: ${config.strokeWidth + 0.5};
    }
  </style>`;
}

/**
 * Renders the complete line chart SVG.
 */
export function renderLineChartSvg(input: LineChartInput): string {
  const config: LineChartConfig = { ...defaultLineChartConfig, ...input.config };
  const svgPoints = mapToSvgPoints(input.points, config);

  const linePath = createLinePath(svgPoints);
  const fillPath = createFillPath(svgPoints, config);

  const styles = renderStyles(config);
  const gridLines = renderGridLines(input.points, config);
  const axes = renderAxes(input.points, config);
  const axisLabels = renderAxisLabels(input.points, config);
  const dataPoints = renderDataPoints(input.points, svgPoints, config);

  // Use viewBox for responsive scaling
  const viewBox = `0 0 ${config.width} ${config.height}`;
  const widthAttr = config.responsive ? '100%' : config.width;
  const heightAttr = config.responsive ? '100%' : config.height;
  const preserveAspectRatio = config.responsive ? 'xMidYMid meet' : 'none';

  return `<svg 
  xmlns="http://www.w3.org/2000/svg" 
  width="${widthAttr}" 
  height="${heightAttr}" 
  viewBox="${viewBox}"
  preserveAspectRatio="${preserveAspectRatio}"
  role="img"
  aria-label="Contribution history chart">
${styles}
${gridLines}
${axes}
${axisLabels}
  <g class="chart-area">
    <path 
      d="${fillPath}" 
      fill="${config.fillColor}" 
      stroke="none" />
    <path 
      class="chart-line"
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
