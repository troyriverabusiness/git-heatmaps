// HTTP controller for art endpoint.
// Orchestrates: Request → Art Pattern → Art Renderer → Heatmap Renderer → Response.

import type { Request, Response } from "express";

import { renderHeatmapSvg } from "../render";
import { badRequest } from "../utils/appError";
import { isValidTheme, VALID_THEMES, type HeatmapTheme } from "../render/shared/colorScale";
import { getArtPatternById, getArtPatternCount } from "../render/art";
import { patternToContributionDaysGrid } from "../render/art/artRenderer";
import { sendSVGResponse } from "../utils/network";

type ArtQueryParams = {
  pattern: number;
  theme: HeatmapTheme;
};

/**
 * Returns date range for a regular rectangle heatmap.
 * Starts on the first Sunday of 2026 and ends on the last Saturday of 2026.
 * This creates a complete rectangle with full weeks (51 weeks = 357 days).
 */
function getDateRange(): { fromDate: string; toDate: string } {
  // Jan 1, 2026 is a Thursday (day 4)
  // First Sunday of 2026 is Jan 4, 2026
  // Dec 31, 2026 is a Thursday (day 4)
  // Last Saturday of 2026 is Dec 26, 2026
  // This gives us 51 complete weeks (357 days) - a clean rectangle
  return {
    fromDate: "2026-01-04", // First Sunday of 2026
    toDate: "2026-12-26",   // Last Saturday of 2026 (51 weeks = 357 days)
  };
}

/**
 * Parses query parameters for art request.
 */
function parseQueryParams(req: Request): ArtQueryParams {
  const { pattern, theme } = req.query;

  // Pattern is required and must be a number
  if (!pattern || typeof pattern !== "string" || !pattern.trim()) {
    throw badRequest(
      `Pattern is required. Available patterns: 1-${getArtPatternCount()}`
    );
  }

  const patternNum = parseInt(pattern.trim(), 10);
  if (isNaN(patternNum) || patternNum < 1 || patternNum > getArtPatternCount()) {
    throw badRequest(
      `Invalid pattern "${pattern}". Must be a number between 1 and ${getArtPatternCount()}.`
    );
  }

  // Validate theme parameter, default to "default" if not provided
  let parsedTheme: HeatmapTheme = "default";
  if (typeof theme === "string") {
    const trimmedTheme = theme.trim().toLowerCase();
    if (trimmedTheme && !isValidTheme(trimmedTheme)) {
      throw badRequest(
        `Invalid theme "${theme}". Valid options: ${VALID_THEMES.join(", ")}`
      );
    }
    if (trimmedTheme && isValidTheme(trimmedTheme)) {
      parsedTheme = trimmedTheme;
    }
  }

  return {
    pattern: patternNum,
    theme: parsedTheme,
  };
}

/**
 * Creates the art request handler.
 */
export function createArtController(): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response): Promise<void> => {
    const params = parseQueryParams(req);
    const { fromDate, toDate } = getDateRange();

    const artPattern = getArtPatternById(params.pattern);
    if (!artPattern) {
      throw badRequest(`Pattern "${params.pattern}" not found`);
    }

    // Convert pattern to contribution days
    const days = patternToContributionDaysGrid(artPattern, fromDate, toDate);

    // Render as heatmap
    const svg = renderHeatmapSvg({ 
      days,
      options: { theme: params.theme },
    });

    sendSVGResponse(res, svg);
  };
}

