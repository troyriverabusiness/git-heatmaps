// HTTP controller for heatmap endpoint.
// Orchestrates: Request → ContributionService → heatmapRenderer → Response.

import type { Request, Response } from "express";

import type { ContributionService } from "../services/contributionService";
import type { ContributionDay } from "../domain/contributions";
import { renderHeatmapSvg } from "../render";
import { badRequest, upstreamError } from "../utils/appError";
import { isValidTheme, VALID_THEMES, type HeatmapTheme } from "../render/shared/colorScale";

export type HeatmapControllerDependencies = {
  contributionService: ContributionService;
};

type HeatmapQueryParams = {
  githubUsername?: string;
  gitlabUsername?: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
  theme?: HeatmapTheme;
};

/**
 * Formats a Date as YYYY-MM-DD string.
 */
function formatDateIso(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Calculates date range based on year parameter.
 * - If year is provided: returns Jan 1 to Dec 31 of that year
 * - If no year: returns rolling year (today - 1 year to today, like GitHub)
 */
function getDateRange(year?: number): { fromDate: string; toDate: string } {
  if (year !== undefined) {
    return {
      fromDate: `${year}-01-01`,
      toDate: `${year}-12-31`,
    };
  }

  // Rolling year: from today - 1 year to today
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  oneYearAgo.setDate(oneYearAgo.getDate() + 1); // Start day after, so we get exactly 365/366 days

  return {
    fromDate: formatDateIso(oneYearAgo),
    toDate: formatDateIso(today),
  };
}

/**
 * Parses query parameters for heatmap request.
 */
function parseQueryParams(req: Request): HeatmapQueryParams {
  const { githubUsername, gitlabUsername, year, theme } = req.query;

  // Parse and validate year parameter (optional - if not provided, uses rolling year)
  let parsedYear: number | undefined;
  if (typeof year === "string" && year.trim()) {
    const yearNum = parseInt(year.trim(), 10);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > new Date().getFullYear()) {
      throw badRequest(
        `Invalid year "${year}". Must be a valid year between 2000 and ${new Date().getFullYear()}.`
      );
    }
    parsedYear = yearNum;
  }

  const { fromDate, toDate } = getDateRange(parsedYear);

  // Validate theme parameter
  let parsedTheme: HeatmapTheme | undefined;
  if (typeof theme === "string") {
    const trimmedTheme = theme.trim().toLowerCase();
    if (trimmedTheme && !isValidTheme(trimmedTheme)) {
      throw badRequest(
        `Invalid theme "${theme}". Valid options: ${VALID_THEMES.join(", ")}`
      );
    }
    parsedTheme = isValidTheme(trimmedTheme) ? trimmedTheme : undefined;
  }

  return {
    githubUsername: typeof githubUsername === "string" ? githubUsername.trim() : undefined,
    gitlabUsername: typeof gitlabUsername === "string" ? gitlabUsername.trim() : undefined,
    fromDate,
    toDate,
    theme: parsedTheme,
  };
}


/**
 * Transforms unified contributions to ContributionDay array for renderer.
 * Includes per-platform breakdown for the "default" theme.
 */
function toContributionDays(
  contributions: { date: string; total: number; github: number; gitlab: number }[]
): ContributionDay[] {
  return contributions.map((c) => ({
    dateIso: c.date,
    count: c.total,
    github: c.github,
    gitlab: c.gitlab,
  }));
}

/**
 * Creates the heatmap request handler.
 */
export function createHeatmapController(
  deps: HeatmapControllerDependencies
): (req: Request, res: Response) => Promise<void> {
  const { contributionService } = deps;

  return async (req: Request, res: Response): Promise<void> => {
    const params = parseQueryParams(req);

    // Require at least one username
    if (!params.githubUsername && !params.gitlabUsername) {
      throw badRequest(
        "At least one username is required. Provide githubUsername and/or gitlabUsername."
      );
    }

    const result = await contributionService.fetchAggregatedContributions({
      githubUsername: params.githubUsername,
      gitlabUsername: params.gitlabUsername,
      fromDate: params.fromDate,
      toDate: params.toDate,
    });

    // Check for upstream errors - report as 502 if ALL requested sources failed
    if (result.sourcesRequested > 0 && result.sourcesSucceeded === 0) {
      const errorMessages = result.errors
        .map((e) => `${e.source}: ${e.message}`)
        .join("; ");
      throw upstreamError(`Failed to fetch contributions: ${errorMessages}`);
    }

    // Log partial failures for debugging (some sources worked, some didn't)
    if (result.errors.length > 0 && result.sourcesSucceeded > 0) {
      console.warn(
        `[heatmap] Partial failure - ${result.sourcesSucceeded}/${result.sourcesRequested} sources succeeded. Errors:`,
        result.errors
      );
    }

    const days = toContributionDays(result.contributions);
    const svg = renderHeatmapSvg({ 
      days,
      options: params.theme ? { theme: params.theme } : undefined,
    });

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Vary", "Accept-Encoding");
    res.send(svg);
  };
}
