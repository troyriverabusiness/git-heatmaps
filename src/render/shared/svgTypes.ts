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
