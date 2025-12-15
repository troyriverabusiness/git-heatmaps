// HTTP controller for history (line chart) endpoint.
// Orchestrates: Request → ContributionService → lineChartRenderer → Response.

import type { Request, Response } from "express";

import type { ContributionService } from "../services/contributionService";
import type { ContributionHistoryPoint } from "../domain/contributions";
import { renderLineChartSvg } from "../render";
import { upstreamError } from "../utils/appError";

export type HistoryControllerDependencies = {
  contributionService: ContributionService;
};

type HistoryQueryParams = {
  githubUsername?: string;
  gitlabUsername?: string;
  from?: string;
  to?: string;
};

/**
 * Parses query parameters for history request.
 */
function parseQueryParams(req: Request): HistoryQueryParams {
  const { githubUsername, gitlabUsername, from, to } = req.query;

  return {
    githubUsername: typeof githubUsername === "string" ? githubUsername.trim() : undefined,
    gitlabUsername: typeof gitlabUsername === "string" ? gitlabUsername.trim() : undefined,
    from: typeof from === "string" ? from.trim() : undefined,
    to: typeof to === "string" ? to.trim() : undefined,
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
      fromDateIso: params.from,
      toDateIso: params.to,
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
