// Configuration types and defaults for line chart rendering.

import type { Margin } from "../shared/svgTypes";

export type LineChartConfig = {
  width: number;
  height: number;
  margin: Margin;
  strokeWidth: number;
  strokeColor: string;
  fillColor: string;
  showGridLines: boolean;
  showAxisLabels: boolean;
  showTickMarks: boolean;
  gridColor: string;
  axisColor: string;
  fontSize: number;
  fontFamily: string;
  labelColor: string;
  tickCount: number;
  responsive: boolean;
};

export const defaultLineChartConfig: LineChartConfig = {
  width: 800,
  height: 200,
  margin: { top: 20, right: 20, bottom: 40, left: 50 },
  strokeWidth: 2,
  strokeColor: "#2563eb",
  fillColor: "rgba(37, 99, 235, 0.1)",
  showGridLines: true,
  showAxisLabels: true,
  showTickMarks: true,
  gridColor: "#e5e7eb",
  axisColor: "#9ca3af",
  fontSize: 11,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  labelColor: "#57606a",
  tickCount: 5,
  responsive: true,
};
