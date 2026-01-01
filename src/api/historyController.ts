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
  year: number;
};

/**
 * Parses query parameters for history request.
 */
function parseQueryParams(req: Request): HistoryQueryParams {
  const { githubUsername, gitlabUsername, year } = req.query;

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

  return {
    githubUsername: typeof githubUsername === "string" ? githubUsername.trim() : undefined,
    gitlabUsername: typeof gitlabUsername === "string" ? gitlabUsername.trim() : undefined,
    year: parsedYear,
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
      year: params.year,
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
