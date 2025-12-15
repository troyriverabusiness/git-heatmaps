// Main line chart SVG rendering.

import type { ContributionHistoryPoint } from "../../domain/contributions";
import type { LineChartConfig } from "./linechartConfig";
import { defaultLineChartConfig } from "./linechartConfig";
import { mapToSvgPoints, createLinePath, createFillPath } from "./linechartUtils";
import { renderGridLines, renderAxes, renderAxisLabels } from "./linechartAxes";

export type LineChartInput = {
  points: ContributionHistoryPoint[];
  config?: Partial<LineChartConfig>;
};

/**
 * Renders CSS styles for hover interactions.
 */
function renderStyles(config: LineChartConfig): string {
  return `  <style>
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
</svg>`;
}
