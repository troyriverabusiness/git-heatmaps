// HTTP controller for history (line chart) endpoint.
// Orchestrates: Request → ContributionService → lineChartRenderer → Response.

import type { Request, Response } from "express";

import type { ContributionService } from "../services/contributionService";
import type { ContributionHistoryPoint } from "../domain/contributions";
import { renderLineChartSvg } from "../render";
import { badRequest, upstreamError } from "../utils/appError";

export type HistoryControllerDependencies = {
  contributionService: ContributionService;
};

type HistoryQueryParams = {
  githubUsername?: string;
  gitlabUsername?: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
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
 * Parses query parameters for history request.
 */
function parseQueryParams(req: Request): HistoryQueryParams {
  const { githubUsername, gitlabUsername, year } = req.query;

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

  return {
    githubUsername: typeof githubUsername === "string" ? githubUsername.trim() : undefined,
    gitlabUsername: typeof gitlabUsername === "string" ? gitlabUsername.trim() : undefined,
    fromDate,
    toDate,
  };
}


/**
 * Transforms unified contributions to ContributionHistoryPoint array for renderer.
 */
function toHistoryPoints(
  contributions: { date: string; total: number }[]
): ContributionHistoryPoint[] {
  return contributions.map((c) => ({
    dateIso: c.date,
    count: c.total,
  }));
}

/**
 * Creates the history (line chart) request handler.
 */
export function createHistoryController(
  deps: HistoryControllerDependencies
): (req: Request, res: Response) => Promise<void> {
  const { contributionService } = deps;

  return async (req: Request, res: Response): Promise<void> => {
    const params = parseQueryParams(req);

    const result = await contributionService.fetchAggregatedContributions({
      githubUsername: params.githubUsername,
      gitlabUsername: params.gitlabUsername,
      fromDate: params.fromDate,
      toDate: params.toDate,
    });

    // Check for upstream errors - report as 502
    if (result.errors.length > 0 && result.contributions.length === 0) {
      const errorMessages = result.errors
        .map((e) => `${e.source}: ${e.message}`)
        .join("; ");
      throw upstreamError(`Failed to fetch contributions: ${errorMessages}`);
    }

    const points = toHistoryPoints(result.contributions);
    const svg = renderLineChartSvg({ points });

    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  };
}
