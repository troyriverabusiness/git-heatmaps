// Pixel art definitions for text patterns.
// Each pattern is a 2D array where:
// - 0 = empty cell
// - 1-4 = filled cell with gradient strength (1 = lightest, 4 = darkest)

export type PixelArtPattern = {
  name: string;
  pattern: number[][]; // Values: 0 (empty) or 1-4 (gradient strength)
};

/**
 * Pixel art pattern for "VIBE CODER"
 */
const vibeCoderPattern: PixelArtPattern = {
  name: "vibe coder",
  pattern: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Sun (day 0) - 51 cols
    [0, 4, 1, 0, 4, 1, 0, 4, 1, 0, 4, 4, 4, 1, 0, 0, 4, 4, 4, 1, 0, 0, 0, 0, 4, 4, 1, 0, 4, 4, 4, 4, 1, 0, 4, 4, 4, 1, 0, 0, 4, 4, 4, 1, 0, 4, 4, 4, 1, 0, 0], // Mon (day 1) - V I B E   C O D E R - 51 cols
    [0, 4, 1, 0, 4, 1, 0, 4, 1, 0, 4, 1, 0, 4, 1, 0, 4, 1, 0, 0, 0, 0, 0, 4, 1, 0, 0, 0, 4, 1, 0, 4, 1, 0, 4, 1, 0, 4, 1, 0, 4, 1, 0, 0, 0, 4, 1, 0, 4, 1, 0], // Tue (day 2) - 51 cols
    [0, 4, 1, 0, 4, 1, 0, 4, 1, 0, 4, 4, 4, 1, 0, 0, 4, 4, 1, 0, 0, 0, 0, 4, 1, 0, 0, 0, 4, 1, 0, 4, 1, 0, 4, 1, 0, 4, 1, 0, 4, 4, 1, 0, 0, 4, 4, 4, 1, 0, 0], // Wed (day 3) - 51 cols
    [0, 0, 4, 1, 4, 1, 0, 4, 1, 0, 4, 1, 0, 4, 1, 0, 4, 1, 0, 0, 0, 0, 0, 4, 1, 0, 0, 0, 4, 1, 0, 4, 1, 0, 4, 1, 0, 4, 1, 0, 4, 1, 0, 0, 0, 4, 1, 4, 1, 0, 0], // Thu (day 4) - 51 cols
    [0, 0, 0, 4, 1, 0, 0, 4, 1, 0, 4, 4, 4, 1, 0, 0, 4, 4, 4, 1, 0, 0, 0, 0, 4, 4, 1, 0, 4, 4, 4, 4, 1, 0, 4, 4, 4, 1, 0, 0, 4, 4, 4, 1, 0, 4, 1, 0, 4, 1, 0], // Fri (day 5) - 51 cols
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Sat (day 6) - 51 cols
  ],
};

// Patterns indexed by numeric ID (1, 2, 3, ...)
export const ART_PATTERNS: PixelArtPattern[] = [
  vibeCoderPattern,  // ID: 1
];

/**
 * Gets an art pattern by numeric ID (1-based).
 */
export function getArtPatternById(id: number): PixelArtPattern | undefined {
  if (id < 1 || id > ART_PATTERNS.length) {
    return undefined;
  }
  return ART_PATTERNS[id - 1];
}

/**
 * Gets the total number of available patterns.
 */
export function getArtPatternCount(): number {
  return ART_PATTERNS.length;
}

