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
  year: number;
  theme?: HeatmapTheme;
};

/**
 * Parses query parameters for heatmap request.
 */
function parseQueryParams(req: Request): HeatmapQueryParams {
  const { githubUsername, gitlabUsername, year, theme } = req.query;

  // Parse and validate year parameter (defaults to current year)
  let parsedYear: number;
  if (typeof year === "string" && year.trim()) {
    const yearNum = parseInt(year.trim(), 10);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > new Date().getFullYear()) {
      throw badRequest(
        `Invalid year "${year}". Must be a valid year between 2000 and ${new Date().getFullYear()}.`
      );
    }
    parsedYear = yearNum;
  } else {
    parsedYear = new Date().getFullYear();
  }

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
    year: parsedYear,
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
      year: params.year,
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
