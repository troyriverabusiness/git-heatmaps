// Shared SVG-related types for renderers.

export type Dimensions = {
  width: number;
  height: number;
};

export type Margin = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type Point = {
  x: number;
  y: number;
};

export type ColorStop = {
  threshold: number; // minimum count to use this color
  color: string;
};

// TODO: Add theme support (light/dark mode)
export type HeatmapConfig = {
  cellSize: number;
  cellGap: number;
  margin: Margin;
  cornerRadius: number;
  // TODO: Add font settings for labels
  // TODO: Add responsive scaling options
};

// TODO: Add theme support (light/dark mode)
export type LineChartConfig = {
  width: number;
  height: number;
  margin: Margin;
  strokeWidth: number;
  strokeColor: string;
  fillColor: string;
  // TODO: Add axis styling options
  // TODO: Add grid line options
  // TODO: Add responsive scaling options
};

export const defaultHeatmapConfig: HeatmapConfig = {
  cellSize: 11,
  cellGap: 3,
  margin: { top: 20, right: 20, bottom: 20, left: 20 },
  cornerRadius: 2,
};

export const defaultLineChartConfig: LineChartConfig = {
  width: 800,
  height: 200,
  margin: { top: 20, right: 20, bottom: 30, left: 40 },
  strokeWidth: 2,
  strokeColor: "#2563eb",
  fillColor: "rgba(37, 99, 235, 0.1)",
};
