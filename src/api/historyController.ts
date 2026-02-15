// HTTP controller for history (line chart) endpoint.
// Orchestrates: Request → ContributionService → lineChartRenderer → Response.

import type { Request, Response } from "express";

import type { ContributionService } from "../services/contributionService";
import type { ContributionHistoryPoint } from "../domain/contributions";
import { renderLineChartSvg } from "../render";
import { badRequest, upstreamError } from "../utils/appError";
import { sendSVGResponse } from "../utils/network";

export type HistoryControllerDependencies = {
  contributionService: ContributionService;
};

type HistoryQueryParams = {
  githubToken?: string;
  gitlabToken?: string;
  gitlabBaseUrl?: string;
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

/** Read optional string query param (all query params are lowercase). */
function q(req: Request, key: string): string | undefined {
  const raw = req.query[key] as string | undefined;
  return typeof raw === "string" ? raw.trim() || undefined : undefined;
}

/**
 * Parses query parameters for history request.
 * All query parameter names are lowercase.
 */
function parseQueryParams(req: Request): HistoryQueryParams {
  const parsedGithubToken = q(req, "githubtoken");
  const parsedGitlabToken = q(req, "gitlabtoken");
  const gitlabBaseUrl = q(req, "gitlabbaseurl");
  const year = q(req, "year");

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

  return {
    githubToken: parsedGithubToken,
    gitlabToken: parsedGitlabToken,
    gitlabBaseUrl: gitlabBaseUrl || undefined,
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

    // Check for upstream errors - report as 502
    if (result.errors.length > 0 && result.contributions.length === 0) {
      const errorMessages = result.errors
        .map((e) => `${e.source}: ${e.message}`)
        .join("; ");
      throw upstreamError(`Failed to fetch contributions: ${errorMessages}`);
    }

    const points = toHistoryPoints(result.contributions);
    const svg = renderLineChartSvg({ points });

    sendSVGResponse(res, svg);
  };
}
