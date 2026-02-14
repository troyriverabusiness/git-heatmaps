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
  githubToken?: string;
  gitlabToken?: string;
  gitlabBaseUrl?: string;
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

/** Read optional string query param (all query params are lowercase). */
function q(req: Request, key: string): string | undefined {
  const raw = req.query[key] as string | undefined;
  return typeof raw === "string" ? raw.trim() || undefined : undefined;
}

/**
 * Parses query parameters for heatmap request.
 * All query parameter names are lowercase.
 */
function parseQueryParams(req: Request): HeatmapQueryParams {
  const parsedGithubToken = q(req, "githubtoken");
  const parsedGitlabToken = q(req, "gitlabtoken");
  const gitlabBaseUrl = q(req, "gitlabbaseurl");
  const year = q(req, "year");
  const theme = q(req, "theme");

  // Validate token format (if provided, must be non-empty)
  if (parsedGithubToken !== undefined && parsedGithubToken === "") {
    throw badRequest("Invalid GitHub token format");
  }
  if (parsedGitlabToken !== undefined && parsedGitlabToken === "") {
    throw badRequest("Invalid GitLab token format");
  }

  // Parse and validate year parameter (optional - if not provided, uses rolling year)
  let parsedYear: number | undefined;
  if (year) {
    const yearNum = parseInt(year, 10);
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
  if (theme) {
    const trimmedTheme = theme.toLowerCase();
    if (trimmedTheme && !isValidTheme(trimmedTheme)) {
      throw badRequest(
        `Invalid theme "${theme}". Valid options: ${VALID_THEMES.join(", ")}`
      );
    }
    parsedTheme = isValidTheme(trimmedTheme) ? trimmedTheme : undefined;
  }

  return {
    githubToken: parsedGithubToken,
    gitlabToken: parsedGitlabToken,
    gitlabBaseUrl: gitlabBaseUrl || undefined,
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
    githubCount: c.github,
    gitlabCount: c.gitlab,
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

    // Require at least one token
    if (!params.githubToken && !params.gitlabToken) {
      throw badRequest(
        "At least one token is required. Provide githubtoken and/or gitlabtoken."
      );
    }

    const result = await contributionService.fetchAggregatedContributions({
      githubToken: params.githubToken,
      gitlabToken: params.gitlabToken,
      gitlabBaseUrl: params.gitlabBaseUrl,
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
    res.setHeader("Referrer-Policy", "no-referrer");
    res.send(svg);
  };
}
