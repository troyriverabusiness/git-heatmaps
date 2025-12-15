// HTTP controller for heatmap endpoint.
// Orchestrates: Request → ContributionService → heatmapRenderer → Response.

import type { Request, Response } from "express";

import type { ContributionService } from "../services/contributionService";
import type { ContributionDay } from "../domain/contributions";
import { renderHeatmapSvg } from "../render";
import { badRequest, upstreamError } from "../utils/appError";

export type HeatmapControllerDependencies = {
  contributionService: ContributionService;
};

type HeatmapQueryParams = {
  githubUsername?: string;
  gitlabUsername?: string;
  from?: string;
  to?: string;
};

/**
 * Parses query parameters for heatmap request.
 */
function parseQueryParams(req: Request): HeatmapQueryParams {
  const { githubUsername, gitlabUsername, from, to } = req.query;

  return {
    githubUsername: typeof githubUsername === "string" ? githubUsername.trim() : undefined,
    gitlabUsername: typeof gitlabUsername === "string" ? gitlabUsername.trim() : undefined,
    from: typeof from === "string" ? from.trim() : undefined,
    to: typeof to === "string" ? to.trim() : undefined,
  };
}


/**
 * Transforms unified contributions to ContributionDay array for renderer.
 */
function toContributionDays(
  contributions: { date: string; total: number }[]
): ContributionDay[] {
  return contributions.map((c) => ({
    dateIso: c.date,
    count: c.total,
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
      fromDateIso: params.from,
      toDateIso: params.to,
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
    const svg = renderHeatmapSvg({ days });

    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  };
}
